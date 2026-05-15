// Payment method icons. One source of truth for brand visuals across the
// add-method modal, saved-method lists, transaction rows, and the checkout
// method picker.
//
// Strategy:
//   • GCash — hand-coded SVG of the iconic G + signal-wave arcs.
//   • Maya — wordmark "maya" in mint green on a near-black tile.
//   • GrabPay — wordmark "GrabPay" in white on the green tile.
//   • Visa / Mastercard — real brand SVGs from react-icons/si.
//   • bank_transfer / card — Lucide glyphs.
//   • The `bare` variant (used inline in transaction rows) always falls
//     back to a monochrome Lucide icon that inherits currentColor.

import { CreditCard, Landmark, Wallet } from "lucide-react";
import { SiVisa, SiMastercard } from "react-icons/si";

const BRAND = {
  gcash:         { bg: "#007DFE", fg: "#FFFFFF", label: "GCash" },
  paymaya:       { bg: "#0F1419", fg: "#5BE5A0", label: "Maya" },
  grab_pay:      { bg: "#00B14F", fg: "#FFFFFF", label: "GrabPay" },
  bank_transfer: { bg: "#475569", fg: "#FFFFFF", label: "Bank" },
  card:          { bg: "#1F2937", fg: "#FFFFFF", label: "Card" },
  visa:          { bg: "#1A1F71", fg: "#FFFFFF", label: "Visa" },
  mastercard:    { bg: "#FFFFFF", fg: "#1F2937", label: "Mastercard" },
};

const SIZE_PX = { sm: 28, md: 36, lg: 44 };
const RADIUS  = { sm: 7,  md: 9,  lg: 11 };

// Bare-variant fallback: monochrome glyph that inherits currentColor.
function bareGlyph(type, px) {
  if (type === "bank_transfer") return <Landmark size={px - 8} />;
  if (type === "card" || type === "visa" || type === "mastercard")
    return <CreditCard size={px - 8} />;
  return <Wallet size={px - 8} />;
}

// GCash icon — circular G with a right-side gap and two signal-wave arcs.
function GCashMark({ fg }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
      {/* G — circular stroke open on the right + inner horizontal bar */}
      <path
        d="M 13 8 A 5 5 0 1 0 13 16"
        stroke={fg}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M 13 12 H 10.2"
        stroke={fg}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Signal arcs to the right */}
      <path
        d="M 16.5 9.5 A 3 3 0 0 1 16.5 14.5"
        stroke={fg}
        strokeOpacity="0.55"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M 18.8 8 A 4.8 4.8 0 0 1 18.8 16"
        stroke={fg}
        strokeOpacity="0.55"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Maya wordmark — soft rounded "maya" in mint green.
function MayaMark({ fg, px }) {
  const isSmall = px <= 28;
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24">
      <text
        x="12" y="12"
        dominantBaseline="central"
        textAnchor="middle"
        fill={fg}
        fontFamily='ui-rounded, "SF Pro Rounded", "Nunito", ui-sans-serif, system-ui, sans-serif'
        fontWeight={800}
        fontSize={isSmall ? 14 : 9}
        letterSpacing="-0.4"
      >{isSmall ? "m" : "maya"}</text>
    </svg>
  );
}

// GrabPay wordmark — bold white "GrabPay" (or "Grab" at sm).
function GrabPayMark({ fg, px }) {
  const isSmall = px <= 28;
  const text = isSmall ? "Grab" : "GrabPay";
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24">
      <text
        x="12" y="12"
        dominantBaseline="central"
        textAnchor="middle"
        fill={fg}
        fontFamily='ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
        fontWeight={800}
        fontSize={isSmall ? 8.5 : 6.4}
        letterSpacing="-0.3"
      >{text}</text>
    </svg>
  );
}

// Inner mark for the tile variant. Renders inside a `px - 8` square.
function TileMark({ type, brand, px }) {
  switch (type) {
    case "gcash":
      return <GCashMark fg={brand.fg} />;
    case "paymaya":
      return <MayaMark fg={brand.fg} px={px} />;
    case "grab_pay":
      return <GrabPayMark fg={brand.fg} px={px} />;
    case "visa":
      return <SiVisa size={px - 8} color={brand.fg} />;
    case "mastercard":
      // Real multi-color logo — keep its native colors.
      return <SiMastercard size={px - 8} />;
    case "bank_transfer":
      return <Landmark size={px - 8} color={brand.fg} />;
    case "card":
    default:
      return <CreditCard size={px - 8} color={brand.fg} />;
  }
}

export default function PaymentMethodIcon({
  type = "card",
  size = "md",
  variant = "tile",
  className = "",
  title,
}) {
  const brand = BRAND[type] ?? BRAND.card;
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  const r  = RADIUS[size]  ?? RADIUS.md;

  if (variant === "bare") {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: px, height: px }}
        role={title ? "img" : "presentation"}
        aria-label={title || brand.label}
      >
        {bareGlyph(type, px)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 shadow-vxr-sm ${className}`}
      style={{
        width: px,
        height: px,
        borderRadius: r,
        background: brand.bg,
        border: type === "mastercard" ? "1px solid #E5E7EB" : "none",
      }}
      role="img"
      aria-label={title || brand.label}
    >
      <TileMark type={type} brand={brand} px={px} />
    </span>
  );
}

export const PAYMENT_METHOD_BRANDS = BRAND;
