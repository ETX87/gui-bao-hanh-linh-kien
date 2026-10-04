import { useEffect, useId, useState } from "react";

// O chon/chup anh (DESIGN_SYSTEM.md §6.9): o bam LON (vien net dut brand-300, nen accent-soft, icon +
// chu + dem so anh) thay cho nut "Choose Files" mac dinh cua trinh duyet - de bam tren dien thoai,
// nguoi lon tuoi nhan ra ngay. Hien anh xem truoc nho de biet da chon dung anh. API giu nguyen kieu
// FileList | null nhu <input type="file"> cu de khong phai sua logic doc anh o noi goi.

export function ImagePicker({ onChange, label = "Chụp hoặc chọn ảnh", compact = false }: { onChange: (files: FileList | null) => void; label?: string; compact?: boolean }) {
  const id = useId();
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  return (
    <div>
      <label
        htmlFor={id}
        className={`focus-within:ring-[3px] focus-within:ring-[rgba(21,128,63,0.15)] flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--brand-300)] bg-[var(--accent-soft)] px-4 text-[var(--accent-ink)] transition-colors hover:border-[var(--accent)] ${
          compact ? "min-h-[64px] py-2" : "min-h-[100px] lg:min-h-[76px] py-3"
        }`}
      >
        <span className="text-2xl leading-none">📷</span>
        <span className="text-left">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block text-xs text-[var(--ink-soft)]">{previews.length > 0 ? `Đã chọn ${previews.length} ảnh — bấm để chọn lại` : "Có thể chọn nhiều ảnh"}</span>
        </span>
        <input
          id={id}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const files = e.target.files;
            setPreviews(files ? Array.from(files).map((f) => URL.createObjectURL(f)) : []);
            onChange(files);
          }}
        />
      </label>
      {previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((u) => (
            <img key={u} src={u} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-[var(--line)]" />
          ))}
        </div>
      )}
    </div>
  );
}
