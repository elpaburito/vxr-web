# Stripe — Sandbox Setup

The web app uses three Supabase Edge Functions to talk to Stripe:

| Function                  | Caller             | Purpose                                                          |
| ------------------------- | ------------------ | ---------------------------------------------------------------- |
| `create-payment-intent`   | Browser (tenant)   | Creates a PaymentIntent server-side; price computed from contract |
| `record-payment`          | Browser (tenant)   | After client confirms, verifies the intent with Stripe and writes the `payment` row |
| `stripe-webhook`          | Stripe (server)    | Source-of-truth fulfillment; catches payments confirmed off-page |

The browser only ever sees the publishable key (`pk_test_…`). The secret
key lives in the Edge Function environment.

---

## 1. Stripe dashboard

1. Sign in at <https://dashboard.stripe.com/test>. Make sure the
   "Viewing test data" toggle is on.
2. **Developers → API keys** — copy the **Publishable key** (`pk_test_…`)
   and the **Secret key** (`sk_test_…`).

## 2. Frontend

In your local `.env` (next to `package.json`):

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

Restart `npm run dev` so Vite re-reads env vars.

## 3. Supabase CLI

You need the Supabase CLI installed and logged in:

```bash
npm i -g supabase             # or: scoop install supabase, brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
```

(`<your-project-ref>` is the subdomain of your Supabase URL — the bit
before `.supabase.co`.)

## 4. Set Edge Function secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
# Webhook signing secret — added in step 6 below; you can come back and
# set it then. Until then the webhook will reject all events as a 400.
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
provided automatically by Supabase to deployed functions — you do NOT
need to set them.

## 5. Deploy the functions

```bash
supabase functions deploy create-payment-intent
supabase functions deploy record-payment
supabase functions deploy stripe-webhook --no-verify-jwt
```

`--no-verify-jwt` on the webhook is required because Stripe doesn't send
a Supabase JWT — the signature header (`Stripe-Signature`) is what
authenticates the call.

## 6. Register the webhook with Stripe

1. Stripe dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL:
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Listen for events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Save. Stripe shows the **Signing secret** (`whsec_…`) — copy it.
5. `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx`
6. `supabase functions deploy stripe-webhook --no-verify-jwt` again to
   pick up the new secret.

To test the webhook locally without going through the cloud:

```bash
stripe listen --forward-to https://<project-ref>.supabase.co/functions/v1/stripe-webhook
# Then trigger an event:
stripe trigger payment_intent.succeeded
```

## 7. End-to-end test

1. Sign in as a landlord; create a listing with valid rent in the
   financials.
2. Sign in as a tenant; apply.
3. Landlord approves → both parties sign the contract.
4. Tenant clicks "Proceed to Payment" → enters a Stripe test card:
   - **Success:** `4242 4242 4242 4242`, any future date, any CVC, any ZIP
   - **Requires 3DS:** `4000 0025 0000 3155` (will redirect)
   - **Declined:**   `4000 0000 0000 0002`
5. After success the payment shows up at:
   - Stripe dashboard → Payments
   - Your DB: `payment` table has a row with the real `pi_…` ID
   - Your DB: `contract.status = 'paid'`

## Troubleshooting

**"Stripe is not configured"** — `VITE_STRIPE_PUBLISHABLE_KEY` is
missing from `.env`. Add it and restart the dev server.

**"Edge Function returned a non-2xx status"** — open the Supabase
dashboard → **Edge Functions → logs** for the failing function. Common
causes:
- `STRIPE_SECRET_KEY` not set (`supabase secrets list`)
- The contract isn't `fully_signed` yet
- The signed-in user isn't the contract's tenant

**Webhook returns 400 "Webhook signature failed"** — the secret in
`STRIPE_WEBHOOK_SECRET` doesn't match what Stripe is sending. Re-copy
the signing secret from the Stripe webhook page and re-deploy.

**Payment succeeds in Stripe but contract still shows "fully_signed"** —
the `record-payment` call from the browser failed (network drop, tab
closed). The webhook will reconcile within a few seconds; refresh the
page. If it stays unpaid, check the `stripe-webhook` logs.
