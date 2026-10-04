import { useMemo } from "react";
import { renderQrSvg, downloadQrLabel } from "../lib/qr";
import { Btn } from "./primitives";

// Ma QR that (tem dan thung) - port lai tinh nang da bo o Giai doan 4 ("QA vong 2", muc case-lookup +
// QR). Dung npm "qrcode" that qua lib/qr.ts.
export function QrCode({ text, sizePx = 120, withDownload = true }: { text: string; sizePx?: number; withDownload?: boolean }) {
  const svg = useMemo(() => renderQrSvg(text, sizePx), [text, sizePx]);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-lg border border-[var(--line)] p-2 bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="font-mono text-xs text-[var(--ink-soft)]">{text}</span>
      {withDownload && (
        <Btn onClick={() => downloadQrLabel(text)} className="!py-1 !px-2 !text-xs">
          ⬇ Tải ảnh QR (in tem)
        </Btn>
      )}
    </div>
  );
}
