import { Field, Select } from "../../ui/primitives";
import { XU_LY_XAC_LABELS } from "../../lib/constants";

// 05/10/2026: huong "Doi moi" chon cach xu ly xac linh kien loi ngay luc phan loai (don le / hang loat
// / nut nhanh) - Admin chon 1 lan, ap cho tat ca don dang xu ly.
export function XuLyXacField({ value, onChange, count }: { value: string; onChange: (v: string) => void; count?: number }) {
  return (
    <Field label={count && count > 1 ? `Xử lý xác linh kiện lỗi (áp cho cả ${count} đơn)` : "Xử lý xác linh kiện lỗi"} required>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Chọn phương án xử lý xác —</option>
        {Object.entries(XU_LY_XAC_LABELS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </Field>
  );
}
