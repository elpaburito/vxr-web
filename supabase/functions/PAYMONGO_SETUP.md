# PayMongo Setup

Sandbox / test-mode setup for the ViewxRent payment module. Replaces the
old Stripe integration.

## 1. Get keys

Sign up at [paymongo.com](https://www.paymongo.com), go to
**Developers → API Keys**, and copy:
- Public key  `pk_test_...`
- Secret key  `sk_test_...`

## 2. Set Supabase secrets

```sh
supabase secrets set PAYMONGO_SECRET_KEY=sk_test_...
```

## 3. Deploy Edge Functions

```sh
supabase functions deploy paymongo-create-payment-intent
supabase functions deploy paymongo-attach-payment-method
supabase functions deploy paymongo-record-payment
supabase functions deploy paymongo-add-method
supabase functions deploy paymongo-delete-method
supabase functions deploy paymongo-set-default-method
supabase functions deploy paymongo-webhook --no-verify-jwt
```

`paymongo-webhook` MUST be deployed with `--no-verify-jwt` because
PayMongo does not send a Supabase JWT. The webhook signing secret
protects the endpoint instead.

## 4. Register webhook

PayMongo dashboard → **Webhooks → Add endpoint**:

- URL: `https://<your-project>.supabase.co/functions/v1/paymongo-webhook`
- Events: `payment.paid`, `payment.failed`, `payment.refunded`

Copy the signing secret PayMongo returns and store it:

```sh
supabase secrets set PAYMONGO_WEBHOOK_SECRET=whsec_...
```

## 5. Frontend env

Add to `.env`:

```
VITE_PAYMONGO_PUBLIC_KEY=pk_test_...
```

The publishable key is safe to ship to the browser. The secret key
must never appear in client code.

## 6. Apply schema

```sh
psql "$DATABASE_URL" -f supabase/paymongo_payment_module.sql
```

This is additive — it does not drop the existing `payment.stripe_payment_intent_id`
column, so the mobile app continues to work unchanged during the
transition.

## 7. Test instruments (sandbox)

### Cards
- Success (no 3DS):    `4343 4343 4343 4345`
- Success with 3DS:    `4120 0000 0000 0007`
- Mastercard success:  `5555 4444 4444 4457`
- Generic decline:     `4571 7360 0000 0014`
- Insufficient funds:  `4400 0000 0000 0016`

Use any future expiry, any 3-digit CVC.

### E-wallets (GCash / Maya / GrabPay)
PayMongo redirects to a sandbox simulator page. Click
**"Authorize Test Payment"** to succeed or **"Fail Test Payment"**
to fail. The user is bounced back to `return_url` with the PI id
appended as a query param.

### Bank transfer
Use the dashboard's "simulate paid" button. The webhook is the
source of truth; the ledger row moves to `succeeded` once the
event arrives.

## 8. Local webhook testing

PayMongo has no CLI equivalent of `stripe listen`. Use ngrok:

```sh
ngrok http 54321
# copy the https URL and register it as a webhook in the PayMongo dashboard,
# then trigger real test-mode payments. ngrok forwards them to your local
# Supabase functions emulator.
```

## Mock mode (school-demo)

Set `MOCK_PAYMENTS_ENABLED=true` server-side AND `VITE_MOCK_PAYMENTS_ENABLED=true`
client-side to expose a **"Mock (demo only)"** toggle on the Add Payment Method
modal. Mock methods bypass PayMongo entirely and complete payments instantly
when the user clicks Pay at checkout. Both flags must be true for mock to work
— leave both unset/false in production.

```sh
supabase secrets set MOCK_PAYMENTS_ENABLED=true
# .env: VITE_MOCK_PAYMENTS_ENABLED=true
supabase functions deploy paymongo-add-method paymongo-record-mock-payment
```

Behavior:
- Mock methods show a purple **MOCK** badge in the picker and Profile list.
- Picking one at checkout writes a synthetic `pi_mock_<uuid>` payment row and
  ledger row, then flips the contract to paid — no redirect, no PayMongo call.
- Ledger row's `raw_response` is `{"source":"mock"}` so mock payments are
  identifiable in data audits.
- The Edge Function refuses if `MOCK_PAYMENTS_ENABLED` isn't `'true'`, so a
  client tweak can't smuggle mock methods into a production DB.

## Reference

- API docs: https://developers.paymongo.com/reference
- Test cards: https://developers.paymongo.com/docs/testing
- Webhook signature format: `t=<unix>,te=<hex>,li=<hex>` —
  `te` is HMAC-SHA256(secret, `${t}.${rawBody}`) in test mode;
  `li` is the same in live mode.
