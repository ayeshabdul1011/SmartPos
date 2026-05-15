import { useEffect, useRef, useState } from "react";
import { Camera, X, Keyboard } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

/**
 * BarcodeScanner: tries native BarcodeDetector via the camera.
 * Falls back gracefully when API is missing. Also supports
 * manual entry (and works with USB hardware scanners that type
 * into the input and press Enter).
 */
export default function BarcodeScanner({ onDetected, onClose, manualOnly = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [mode, setMode] = useState(manualOnly ? "manual" : "camera");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (mode !== "camera") return;
    if (!("BarcodeDetector" in window)) {
      setSupported(false);
      setMode("manual");
      return;
    }
    let active = true;
    const detector = new window.BarcodeDetector({
      formats: [
        "ean_13",
        "ean_8",
        "code_128",
        "code_39",
        "upc_a",
        "upc_e",
        "qr_code",
        "itf",
      ],
    });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              const value = codes[0].rawValue;
              if (value) {
                onDetected?.(value);
                cleanup();
                return;
              }
            }
          } catch {}
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setError("Camera access denied or unavailable.");
        setMode("manual");
      }
    })();

    function cleanup() {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const submitManual = (e) => {
    e?.preventDefault?.();
    if (!manual.trim()) return;
    onDetected?.(manual.trim());
    setManual("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4" data-testid="scanner-modal">
      <div className="w-full max-w-lg overflow-hidden rounded-sm border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-bold tracking-tight">Scan barcode</div>
            <div className="label-cap text-[10px]">
              {mode === "camera" ? "Camera mode" : "Manual / hardware scanner"}
            </div>
          </div>
          <button onClick={onClose} aria-label="close" data-testid="scanner-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === "camera" ? (
          <div className="relative aspect-video w-full bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-6 rounded-sm border-2 border-primary/80" />
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/80 px-4 text-center text-sm text-background">
                {error}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={submitManual} className="space-y-3 p-4">
            <div className="label-cap">Enter barcode</div>
            <Input
              autoFocus
              data-testid="manual-barcode-input"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="USB scanner types here, or type manually + Enter"
              className="mono"
            />
            <Button type="submit" data-testid="manual-barcode-submit" className="w-full rounded-sm">
              Submit barcode
            </Button>
            {!supported && (
              <div className="text-xs text-muted-foreground">
                Native camera barcode detection not available in this browser. Use a hardware
                scanner or type the code.
              </div>
            )}
          </form>
        )}

        <div className="flex items-center justify-between gap-2 border-t bg-secondary px-4 py-3">
          {!manualOnly && (
            <>
              <Button
                data-testid="scanner-mode-camera"
                variant={mode === "camera" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("camera")}
                className="gap-2 rounded-sm"
              >
                <Camera className="h-4 w-4" /> Camera
              </Button>
              <Button
                data-testid="scanner-mode-manual"
                variant={mode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("manual")}
                className="gap-2 rounded-sm"
              >
                <Keyboard className="h-4 w-4" /> Manual
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto rounded-sm" data-testid="scanner-cancel">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
