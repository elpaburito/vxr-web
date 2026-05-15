import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ShieldCheck, ShieldAlert, Clock,
  RefreshCw, Loader2, IdCard,
} from "lucide-react";
import { Modal, Button, Card, Badge } from "./vxr";
import CameraCapture from "./CameraCapture.jsx";
import {
  ID_TYPES, getIdTypeMeta, getIdTypeDisplayName, submitVerification,
} from "../lib/verificationService.js";

const STEP = {
  PICK_ID: 0,
  FRONT: 1,
  BACK: 2,
  SELFIE: 3,
  REVIEW: 4,
  SUBMITTING: 5,
  RESULT: 6,
};

function pct(n) {
  if (n == null) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return "—";
  return `${(num * 100).toFixed(1)}%`;
}

export default function IdentityVerificationModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(STEP.PICK_ID);
  const [idType, setIdType] = useState(null);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Reset when (re-)opened
  useEffect(() => {
    if (!open) return;
    setStep(STEP.PICK_ID);
    setIdType(null);
    setFrontFile(null);
    setBackFile(null);
    setSelfieFile(null);
    setResult(null);
    setError("");
  }, [open]);

  const meta = idType ? getIdTypeMeta(idType) : null;
  const requiresBack = !!meta?.requiresBack;

  const next = () => {
    setError("");
    if (step === STEP.PICK_ID) {
      if (!idType) return setError("Pick an ID type first.");
      setStep(STEP.FRONT);
    } else if (step === STEP.FRONT) {
      if (!frontFile) return setError("Capture or upload the ID front.");
      setStep(requiresBack ? STEP.BACK : STEP.SELFIE);
    } else if (step === STEP.BACK) {
      if (!backFile) return setError("Capture or upload the ID back.");
      setStep(STEP.SELFIE);
    } else if (step === STEP.SELFIE) {
      if (!selfieFile) return setError("Capture or upload your selfie.");
      setStep(STEP.REVIEW);
    }
  };

  const back = () => {
    setError("");
    if (step === STEP.FRONT) setStep(STEP.PICK_ID);
    else if (step === STEP.BACK) setStep(STEP.FRONT);
    else if (step === STEP.SELFIE) setStep(requiresBack ? STEP.BACK : STEP.FRONT);
    else if (step === STEP.REVIEW) setStep(STEP.SELFIE);
  };

  const submit = async () => {
    setError("");
    setStep(STEP.SUBMITTING);
    try {
      const res = await submitVerification({ idType, frontFile, backFile, selfieFile });
      setResult(res);
      setStep(STEP.RESULT);
      // Flip the in-context profile.is_verified so gates and UI update.
      if (res.decision === "approved") onDone?.();
    } catch (e) {
      setError(e?.message || "Submission failed. Please try again.");
      setStep(STEP.REVIEW);
    }
  };

  const retry = () => {
    setStep(STEP.PICK_ID);
    setIdType(null);
    setFrontFile(null);
    setBackFile(null);
    setSelfieFile(null);
    setResult(null);
    setError("");
  };

  const handleClose = () => {
    // Don't allow closing mid-submission
    if (step === STEP.SUBMITTING) return;
    onClose?.();
  };

  const title =
    step === STEP.RESULT
      ? "Verification result"
      : step === STEP.SUBMITTING
      ? "Submitting…"
      : "Verify your identity";

  return (
    <Modal open={open} onClose={handleClose} size="lg" title={title}>
      <div className="space-y-4">
        {step < STEP.SUBMITTING && <ProgressBar step={step} requiresBack={requiresBack} />}

        {step === STEP.PICK_ID && (
          <PickIdStep idType={idType} setIdType={setIdType} />
        )}

        {step === STEP.FRONT && (
          <CameraCapture
            facingMode="environment"
            label="ID FRONT"
            helperText="Hold the ID steady so the four corners and the photo are visible."
            fileLabel="front"
            onCapture={(f) => {
              setFrontFile(f);
              setStep(requiresBack ? STEP.BACK : STEP.SELFIE);
            }}
          />
        )}

        {step === STEP.BACK && (
          <CameraCapture
            facingMode="environment"
            label="ID BACK"
            helperText="Capture the back of your ID — the address and signature panel should be readable."
            fileLabel="back"
            onCapture={(f) => {
              setBackFile(f);
              setStep(STEP.SELFIE);
            }}
          />
        )}

        {step === STEP.SELFIE && (
          <CameraCapture
            facingMode="user"
            label="SELFIE"
            helperText="Hold your phone or laptop at eye level. Make sure your face is well lit."
            fileLabel="selfie"
            onCapture={(f) => {
              setSelfieFile(f);
              setStep(STEP.REVIEW);
            }}
          />
        )}

        {step === STEP.REVIEW && (
          <ReviewStep
            idType={idType}
            requiresBack={requiresBack}
            frontFile={frontFile}
            backFile={backFile}
            selfieFile={selfieFile}
            onEditFront={() => setStep(STEP.FRONT)}
            onEditBack={() => setStep(STEP.BACK)}
            onEditSelfie={() => setStep(STEP.SELFIE)}
          />
        )}

        {step === STEP.SUBMITTING && <SubmittingStep />}

        {step === STEP.RESULT && (
          <ResultStep result={result} onRetry={retry} onClose={onClose} />
        )}

        {error && step !== STEP.SUBMITTING && (
          <p className="font-body text-xs text-vxr-danger bg-vxr-danger-soft border border-vxr-danger/20 rounded-vxr-md px-3 py-2">
            {error}
          </p>
        )}

        {step < STEP.SUBMITTING && (
          <div className="flex justify-between gap-2 pt-2">
            {step > STEP.PICK_ID ? (
              <Button variant="secondary" icon={ArrowLeft} onClick={back}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step === STEP.REVIEW ? (
              <Button variant="primary" icon={ShieldCheck} onClick={submit}>
                Submit for verification
              </Button>
            ) : step === STEP.PICK_ID ? (
              <Button variant="primary" iconRight={ArrowRight} onClick={next}>
                Continue
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ───────── Step components ──────────────────────────────────────────────────

function ProgressBar({ step, requiresBack }) {
  // Steps shown to the user: Pick → Front → (Back?) → Selfie → Review
  const labels = requiresBack
    ? ["ID type", "Front", "Back", "Selfie", "Review"]
    : ["ID type", "Front", "Selfie", "Review"];
  const adjustedStep = (() => {
    if (step === STEP.PICK_ID) return 0;
    if (step === STEP.FRONT) return 1;
    if (step === STEP.BACK) return 2;
    if (step === STEP.SELFIE) return requiresBack ? 3 : 2;
    if (step === STEP.REVIEW) return requiresBack ? 4 : 3;
    return labels.length - 1;
  })();

  return (
    <div className="flex items-center gap-1.5">
      {labels.map((l, i) => {
        const done = i < adjustedStep;
        const active = i === adjustedStep;
        return (
          <div key={l} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1 w-full rounded-full ${
                done
                  ? "bg-vxr-success"
                  : active
                  ? "bg-vxr-accent"
                  : "bg-vxr-surface2"
              }`}
            />
            <span
              className={`font-body text-[10px] uppercase tracking-wider ${
                active
                  ? "text-vxr-accent font-bold"
                  : done
                  ? "text-vxr-success"
                  : "text-vxr-text-muted"
              }`}
            >
              {l}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PickIdStep({ idType, setIdType }) {
  return (
    <div>
      <p className="font-body text-sm text-vxr-text-sub mb-3">
        Choose the government-issued ID you'd like to use. Make sure the original
        is on hand — we'll ask you to photograph it.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {ID_TYPES.map((t) => {
          const selected = idType === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setIdType(t.key)}
              className={`text-left px-3.5 py-3 rounded-vxr-md border-2 transition-colors flex items-start gap-2.5 ${
                selected
                  ? "border-vxr-accent bg-vxr-accent-soft"
                  : "border-vxr-border bg-vxr-surface hover:border-vxr-border-strong"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-vxr-sm flex items-center justify-center shrink-0 ${
                  selected
                    ? "bg-vxr-accent text-white"
                    : "bg-vxr-surface2 text-vxr-text-sub"
                }`}
              >
                <IdCard size={16} />
              </div>
              <div className="min-w-0">
                <p
                  className={`font-display text-sm font-bold leading-tight ${
                    selected ? "text-vxr-accent" : "text-vxr-text"
                  }`}
                >
                  {t.displayName}
                </p>
                <p className="font-body text-[10.5px] text-vxr-text-muted mt-0.5">
                  {t.requiresBack ? "Front + back" : "Front only"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStep({
  idType, requiresBack, frontFile, backFile, selfieFile,
  onEditFront, onEditBack, onEditSelfie,
}) {
  return (
    <div className="space-y-3">
      <p className="font-body text-sm text-vxr-text-sub">
        Review your submission. Tap any photo to retake it.
      </p>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-vxr-text-muted">
              ID type
            </p>
            <p className="font-display font-bold text-vxr-text">
              {getIdTypeDisplayName(idType)}
            </p>
          </div>
          <Badge tone="neutral" icon={IdCard}>
            {requiresBack ? "Front + back" : "Front only"}
          </Badge>
        </div>
        <div className={`grid ${requiresBack ? "grid-cols-3" : "grid-cols-2"} gap-2.5`}>
          <Thumb label="Front" file={frontFile} onEdit={onEditFront} />
          {requiresBack && <Thumb label="Back" file={backFile} onEdit={onEditBack} />}
          <Thumb label="Selfie" file={selfieFile} onEdit={onEditSelfie} />
        </div>
      </Card>
      <p className="font-body text-[11px] text-vxr-text-muted">
        On submit, our AI checks the images against your profile name and runs a
        face match between the ID photo and your selfie. You'll see the result
        within a few seconds.
      </p>
    </div>
  );
}

function Thumb({ label, file, onEdit }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <button
      type="button"
      onClick={onEdit}
      className="rounded-vxr-md border border-vxr-border overflow-hidden bg-vxr-surface2 hover:border-vxr-border-strong transition-colors"
    >
      <div className="aspect-[4/3] flex items-center justify-center bg-vxr-text/95">
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="font-body text-[11px] text-white/60">
            No {label.toLowerCase()}
          </span>
        )}
      </div>
      <div className="px-2.5 py-1.5 flex items-center justify-between bg-vxr-surface">
        <span className="font-body text-[11px] font-semibold text-vxr-text">
          {label}
        </span>
        <span className="font-body text-[10px] text-vxr-accent">Retake</span>
      </div>
    </button>
  );
}

function SubmittingStep() {
  return (
    <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
      <Loader2 size={32} className="animate-spin text-vxr-accent" />
      <p className="font-display font-bold text-vxr-text">Running AI checks…</p>
      <p className="font-body text-xs text-vxr-text-sub max-w-md">
        We're extracting your ID data, matching the face on the ID to your
        selfie, and cross-checking your name with your profile. This usually
        takes about 5–15 seconds.
      </p>
    </div>
  );
}

function ResultStep({ result, onRetry, onClose }) {
  const decision = result?.decision || "pending";
  const visual = (() => {
    if (decision === "approved")
      return {
        tone: "success",
        Icon: ShieldCheck,
        title: "Identity verified!",
        sub: "You can now apply for listings and unlock the full ViewxRent experience.",
        bg: "bg-vxr-success-soft",
        text: "text-vxr-success",
      };
    if (decision === "rejected")
      return {
        tone: "danger",
        Icon: ShieldAlert,
        title: "Verification rejected",
        sub:
          result?.decisionReason ||
          "Your submission didn't pass our automated checks. Please retry with clearer photos.",
        bg: "bg-vxr-danger-soft",
        text: "text-vxr-danger",
      };
    return {
      tone: "warning",
      Icon: Clock,
      title:
        decision === "manual_review"
          ? "Under admin review"
          : "Submission received",
      sub:
        decision === "manual_review"
          ? "Our AI flagged your submission for manual review. An admin will look at it shortly."
          : result?.decisionReason ||
            "Your submission has been received and will be reviewed shortly.",
      bg: "bg-vxr-warning-soft",
      text: "text-vxr-warning",
    };
  })();

  return (
    <div className="space-y-4">
      <div
        className={`flex items-start gap-3 px-4 py-4 rounded-vxr-md ${visual.bg} ${visual.text}`}
      >
        <visual.Icon size={22} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-display font-bold">{visual.title}</p>
          <p className="font-body text-sm mt-0.5 opacity-90">{visual.sub}</p>
        </div>
      </div>

      <Card className="p-4">
        <p className="font-body text-[11px] uppercase tracking-wider text-vxr-text-muted mb-2">
          AI scores
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ScoreTile label="OCR confidence" value={result?.ocrConfidence} />
          <ScoreTile label="Face match" value={result?.faceMatchScore} />
          <ScoreTile label="Name match" value={result?.nameMatchScore} />
        </div>
      </Card>

      <div className="flex justify-end gap-2 pt-1">
        {decision === "rejected" && (
          <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
            Retry verification
          </Button>
        )}
        <Button
          variant="primary"
          icon={decision === "approved" ? Check : Clock}
          onClick={onClose}
        >
          {decision === "approved" ? "Done" : "Close"}
        </Button>
      </div>
    </div>
  );
}

function ScoreTile({ label, value }) {
  return (
    <div className="bg-vxr-surface2 border border-vxr-border rounded-vxr-sm px-3 py-2">
      <p className="font-body text-[10px] uppercase tracking-wider text-vxr-text-muted">
        {label}
      </p>
      <p className="font-display font-bold text-vxr-text mt-0.5">
        {pct(value)}
      </p>
    </div>
  );
}
