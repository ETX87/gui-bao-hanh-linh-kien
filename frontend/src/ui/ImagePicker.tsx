import { useEffect, useId, useState } from "react";

// O chon/chup anh (DESIGN_SYSTEM.md §6.9): o bam LON (vien net dut brand-300, nen accent-soft) thay cho nut
// "Choose Files" mac dinh. API giu kieu FileList | null nhu <input type="file"> cu.
// 05/11/2026 - "ấn chọn ảnh trên điện thoại nhưng chỉ hiện chức năng chụp ảnh, không chọn ảnh được": thuoc tinh
// capture="environment" ep mo thang camera tren Android -> tach 2 nut: "Chụp ảnh" (co capture) va "Chọn ảnh có sẵn"
// (khong capture, mo thu vien). Anh tu 2 nguon cong don; co nut xoa tung anh.

function toFileList(files: File[]): FileList | null {
  if (files.length === 0) return null;
  try {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    return dt.files;
  } catch {
    return null;
  }
}

export function ImagePicker({ onChange, label = "Ảnh", compact = false }: { onChange: (files: FileList | null) => void; label?: string; compact?: boolean }) {
  const camId = useId();
  const libId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const apply = (next: File[], fallback: FileList | null) => {
    setFiles(next);
    // Trinh duyet khong ho tro DataTransfer thi dung FileList vua chon (khong cong don duoc).
    const list = toFileList(next) ?? (next.length ? fallback : null);
    onChange(list);
  };

  const add = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    apply([...files, ...Array.from(list)], list);
  };

  const btn = `focus-within:ring-[3px] focus-within:ring-[rgba(21,128,63,0.15)] flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--brand-300)] bg-[var(--accent-soft)] px-3 text-[var(--accent-ink)] transition-colors hover:border-[var(--accent)] ${
    compact ? "min-h-[56px] py-2" : "min-h-[72px] py-2.5"
  }`;

  return (
    <div>
      <div className="flex gap-2">
        <label htmlFor={camId} className={btn} title={label}>
          <span className="text-xl leading-none">📷</span>
          <span className="text-sm font-semibold">Chụp ảnh</span>
          <input id={camId} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </label>
        <label htmlFor={libId} className={btn} title={label}>
          <span className="text-xl leading-none">🖼</span>
          <span className="text-sm font-semibold">Chọn ảnh có sẵn</span>
          <input id={libId} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      <p className="mt-1 text-xs text-[var(--ink-soft)]">{files.length > 0 ? `Đã chọn ${files.length} ảnh` : "Có thể chụp hoặc chọn nhiều ảnh"}</p>
      {previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((u, i) => (
            <div key={u} className="relative">
              <img src={u} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-[var(--line)]" />
              <button
                type="button"
                title="Bỏ ảnh này"
                onClick={() => apply(files.filter((_, k) => k !== i), null)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--red-600)] text-[11px] font-bold text-white shadow"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
