import { Modal } from "../../ui/Modal";
import { GhiChuLogPanel } from "./GhiChuLogPanel";

export function GhiChuLogModal({ guiId, onClose }: { guiId: string; onClose: () => void }) {
  return (
    <Modal title={`Ghi chú / phản hồi — ${guiId}`} onClose={onClose} maxWidthClass="max-w-lg">
      <GhiChuLogPanel guiId={guiId} />
    </Modal>
  );
}
