import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Clock, RefreshCw } from "lucide-react";
import { Card, Badge, Button } from "./vxr";
import { getMyVerificationStatus, getIdTypeDisplayName } from "../lib/verificationService.js";

/**
 * Renders the user's identity-verification state on ProfilePage.
 * 4 states bound to profile.is_verified + the latest verifications row.
 */
export default function VerificationStatusCard({ profile, onVerifyClick }) {
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyVerificationStatus()
      .then((s) => { if (!cancelled) setLatest(s); })
      .catch(() => { /* swallow — status card falls back to profile flags */ });
    return () => { cancelled = true; };
  }, [profile?.is_verified, profile?.verification_decision]);

  const isVerified = !!profile?.is_verified;
  const decision = latest?.latestDecision || profile?.verification_decision || null;
  const reason   = latest?.rejectionReason || profile?.verification_rejection_reason || null;
  const idType   = profile?.verification_id_type || latest?.latestRow?.id_type || null;

  const isLandlord = profile?.is_landlord || profile?.role === "landlord";
  const isAdmin    = profile?.role === "admin";
  const roleLabel  = isAdmin ? "Admin" : isLandlord ? "Landlord" : "Tenant";

  const visual = (() => {
    if (isVerified) {
      return {
        Icon: ShieldCheck,
        bg: "bg-vxr-success-soft",
        text: "text-vxr-success",
        title: "Identity verified",
        sub: idType
          ? `Verified with ${getIdTypeDisplayName(idType)}.`
          : "Your identity has been verified.",
        cta: null,
      };
    }
    if (decision === "pending" || decision === "manual_review") {
      return {
        Icon: Clock,
        bg: "bg-vxr-warning-soft",
        text: "text-vxr-warning",
        title: "Verification in progress",
        sub: "Your submission is being reviewed. You'll be notified once it's complete.",
        cta: null,
      };
    }
    if (decision === "rejected") {
      return {
        Icon: ShieldAlert,
        bg: "bg-vxr-danger-soft",
        text: "text-vxr-danger",
        title: "Verification rejected",
        sub: reason || "Your last submission didn't pass our checks. Please retry.",
        cta: { label: "Retry verification", Icon: RefreshCw },
      };
    }
    return {
      Icon: ShieldAlert,
      bg: "bg-vxr-warning-soft",
      text: "text-vxr-warning",
      title: "Unverified account",
      sub: "Verify your identity to apply for listings and unlock the full app.",
      cta: { label: "Verify now", Icon: ShieldCheck },
    };
  })();

  return (
    <Card className="p-4 mb-4 flex items-center gap-3">
      <div
        className={`w-11 h-11 rounded-vxr-md flex items-center justify-center shrink-0 ${visual.bg} ${visual.text}`}
      >
        <visual.Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-display font-bold text-sm ${visual.text}`}>
          {visual.title}
        </p>
        <p className="font-body text-xs text-vxr-text-sub mt-0.5">
          {visual.sub}
        </p>
      </div>
      {visual.cta && (
        <Button
          size="sm"
          variant="primary"
          icon={visual.cta.Icon}
          onClick={onVerifyClick}
        >
          {visual.cta.label}
        </Button>
      )}
      <Badge tone={isAdmin ? "info" : isLandlord ? "accent" : "neutral"}>
        {roleLabel}
      </Badge>
    </Card>
  );
}
