import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload, AlertCircle } from "lucide-react";
import { Button } from "./vxr";

/**
 * Reusable webcam capture with a file-upload fallback for desktops without
 * cameras and for browsers where getUserMedia is blocked.
 *
 *   <CameraCapture
 *     facingMode="environment" | "user"
 *     label="ID Front"
 *     helperText="Position the ID so all four corners are visible."
 *     onCapture={(file: File) => ...}
 *   />
 */
export default function CameraCapture({
  facingMode = "environment",
  label,
  helperText,
  onCapture,
  fileLabel = "capture",
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [state, setState] = useState("starting"); // starting | live | error
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("error");
        setError("Camera not available in this browser. Use file upload instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setState("live");
      } catch (err) {
        setState("error");
        setError(
          err?.name === "NotAllowedError"
            ? "Camera permission denied. Use file upload instead, or allow camera access in your browser."
            : err?.message ||
              "Couldn't start the camera. Use file upload instead."
        );
      }
    }
    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (facingMode === "user") {
      // un-mirror selfies so the saved photo matches what the user "sees"
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) return;
    const file = new File([blob], `${fileLabel}.jpg`, { type: "image/jpeg" });
    onCapture?.(file);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onCapture?.(f);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
          {label}
        </div>
      )}
      <div className="rounded-vxr-md overflow-hidden border border-vxr-border bg-vxr-text/95 relative aspect-[4/3]">
        {state === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 font-body text-xs">
            Starting camera…
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/85 px-6 text-center">
            <AlertCircle size={22} />
            <p className="font-body text-xs">{error}</p>
          </div>
        )}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          } ${state !== "live" ? "opacity-0" : ""}`}
        />
        {/* Subtle ID-frame overlay for rear-camera captures */}
        {state === "live" && facingMode === "environment" && (
          <div className="pointer-events-none absolute inset-6 border-2 border-white/40 rounded-vxr-md" />
        )}
      </div>

      {helperText && (
        <p className="font-body text-[11px] text-vxr-text-muted">{helperText}</p>
      )}

      <div className="flex gap-2">
        {state === "live" && (
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={Camera}
            onClick={captureFrame}
            className="flex-1"
          >
            Take photo
          </Button>
        )}
        {state === "error" && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={RefreshCw}
            onClick={() => {
              setError("");
              setState("starting");
              // re-trigger effect by toggling facingMode same key —
              // easiest: reload page. Instead, just retry getUserMedia.
              (async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode },
                    audio: false,
                  });
                  streamRef.current = stream;
                  if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                  }
                  setState("live");
                } catch (err) {
                  setState("error");
                  setError(err?.message || "Camera still unavailable.");
                }
              })();
            }}
          >
            Retry camera
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={Upload}
          onClick={() => fileInputRef.current?.click()}
          className={state === "live" ? "" : "flex-1"}
        >
          Upload file
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={facingMode === "user" ? "user" : "environment"}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
