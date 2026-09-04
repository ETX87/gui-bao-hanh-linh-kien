import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Modal } from "../../ui/Modal";
import { Btn } from "../../ui/primitives";

// Quet ma QR that bang camera (jsQR that, khong con la UI mo phong) - port lai tinh nang da bo o Giai
// doan 4 ("QA vong 2"). Doc khung hinh video moi ~150ms (khong dung requestAnimationFrame - khong can
// 60fps de doc QR), ha do phan giai xuong toi da 480px chieu rong de giai ma nhanh hon. Logic khop
// phieu (resolveScannedGuiId) o component cha (KhoTiepNhanScreen) - component nay CHI doc duoc chuoi
// text, khong tu quyet dinh phieu co hop le khong (giu tach biet nhu prototype).
export function CameraScanModal({ onClose, onScanned }: { onClose: () => void; onScanned: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không mở được camera — kiểm tra quyền truy cập camera của trình duyệt.");
      }
    }
    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const scale = Math.min(1, 480 / video.videoWidth);
        const w = Math.max(1, Math.round(video.videoWidth * scale));
        const h = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, w, h);
          if (code && code.data) {
            onScanned(code.data);
            return; // dung vong lap, cha se dong/mo modal ke tiep
          }
        }
      }
      timerRef.current = window.setTimeout(tick, 150);
    }
    start();
    return () => {
      stopped = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="Quét mã QR phiếu gửi" onClose={onClose} maxWidthClass="max-w-sm">
      <div className="space-y-3">
        {error ? (
          <p className="text-sm text-[var(--coral-700)] bg-[var(--coral-100)] rounded-lg px-3 py-2">{error}</p>
        ) : (
          <div className="rounded-lg overflow-hidden bg-black">
            <video ref={videoRef} className="w-full" muted playsInline />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <p className="text-xs text-[var(--ink-500)]">Đưa mã QR trên thùng hàng vào giữa khung hình.</p>
        <Btn onClick={onClose} className="w-full">
          Huỷ
        </Btn>
      </div>
    </Modal>
  );
}
