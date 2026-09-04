import QRCode from "qrcode";

// QR that (khong con la placeholder) - dung npm "qrcode" that (khong tu bundle thu cong nhu ban
// prototype offline, vi day la app Vite that co build step). Chi dung QRCode.create() de lay ma tran
// module that (co Reed-Solomon that) - tu ve SVG/Canvas, khong dung toCanvas/toDataURL cua thu vien
// (khong can, tu kiem soat duoc kich thuoc/quiet zone giong het prototype da xac minh quet duoc).

export interface QrModules {
  size: number;
  get(row: number, col: number): boolean;
}

export function qrModulesOf(text: string): QrModules {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  return { size: qr.modules.size, get: (r, c) => !!qr.modules.get(r, c) };
}

// SVG string cho 1 ma QR - quiet zone 4-module chuan, moi module = 1 <rect>.
export function renderQrSvg(text: string, sizePx = 120): string {
  try {
    const { size, get } = qrModulesOf(text);
    const quiet = 4;
    const total = size + quiet * 2;
    const scale = sizePx / total;
    let rects = "";
    for (let r = 0; r < size; r++) {
      for (let cIdx = 0; cIdx < size; cIdx++) {
        if (get(r, cIdx)) {
          const x = (cIdx + quiet) * scale;
          const y = (r + quiet) * scale;
          rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${scale.toFixed(2)}" height="${scale.toFixed(2)}" fill="#000"/>`;
        }
      }
    }
    return `<svg viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" xmlns="http://www.w3.org/2000/svg"><rect width="${sizePx}" height="${sizePx}" fill="#fff"/>${rects}</svg>`;
  } catch (err) {
    console.error("[qr] renderQrSvg loi", err);
    return `<svg viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" xmlns="http://www.w3.org/2000/svg"><text x="4" y="20" font-size="10" fill="red">Lỗi tạo QR</text></svg>`;
  }
}

// Tai anh QR ve may de in tem - ve lai bang Canvas (do phan giai cao hon man hinh, co ghi kem chu ma
// phia duoi) - dung CHUNG 1 nguon module (qrModulesOf) voi renderQrSvg nen chac chan khop 1:1.
export function downloadQrLabel(text: string, filename?: string) {
  try {
    const { size, get } = qrModulesOf(text);
    const moduleSize = 12;
    const quiet = 4;
    const total = size + quiet * 2;
    const qrPx = total * moduleSize;
    const labelHeight = 40;
    const canvas = document.createElement("canvas");
    canvas.width = qrPx;
    canvas.height = qrPx + labelHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    for (let r = 0; r < size; r++) {
      for (let cIdx = 0; cIdx < size; cIdx++) {
        if (get(r, cIdx)) {
          ctx.fillRect((cIdx + quiet) * moduleSize, (r + quiet) * moduleSize, moduleSize, moduleSize);
        }
      }
    }
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, qrPx / 2, qrPx + 28);
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename || `QR_${text}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error("[qr] downloadQrLabel loi", err);
    alert("Không tạo được ảnh QR để tải — thử lại sau.");
  }
}
