import { Modal } from "../../ui/Modal";
import { Btn } from "../../ui/primitives";
import { ADMIN_COLS_DEF, type AdminColKey } from "../../hooks/useAdminCols";

// Modal "Tuy chinh cot" - port dung openAdminColSettingsModal() cua prototype: tick de hien/an, huong
// dan keo tieu de/canh phai de doi vi tri/do rong (thao tac lam truc tiep tren <th> cua bang, khong
// lam o day).

export function AdminColSettingsModal({
  order,
  hidden,
  onToggle,
  onReset,
  onClose,
}: {
  order: AdminColKey[];
  hidden: Set<AdminColKey>;
  onToggle: (k: AdminColKey, visible: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Tuỳ chỉnh cột hiển thị" onClose={onClose} maxWidthClass="max-w-sm">
      <div className="space-y-4">
        <p className="text-xs text-[var(--ink-soft)]">Tick để hiện/ẩn cột. Kéo tiêu đề cột trên bảng để đổi vị trí, kéo cạnh phải tiêu đề để đổi độ rộng.</p>
        <div className="divide-y divide-[var(--line)]">
          {order.map((k) => (
            <label key={k} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={!hidden.has(k)} onChange={(e) => onToggle(k, e.target.checked)} />
              {ADMIN_COLS_DEF[k].label}
            </label>
          ))}
        </div>
        <Btn onClick={onReset}>↺ Khôi phục mặc định</Btn>
      </div>
    </Modal>
  );
}
