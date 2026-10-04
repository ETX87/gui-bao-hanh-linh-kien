import { useState } from "react";
import { Modal } from "../ui/Modal";
import { usePwaInstall, isIosSafari, isStandalonePwa } from "../hooks/usePwaInstall";

// Nut "Cai dat vao man hinh chinh" - port dung InstallAppButton.tsx cua linh-kien-app (05/09/2026,
// nguoi dung: "check lại bản mobile, không thấy chức năng tạo shortcut... hãy làm theo chức năng
// giống bên linh-kien-app"). CHI render khi CHUA cai dat (isStandalonePwa() false luc mount, khong
// theo doi thay doi realtime vi nguoi dung phai dong/mo lai app moi chuyen standalone). Android/
// Chrome: bam la trigger prompt() that. iOS Safari (va moi truong hop khong bat duoc prompt): hien
// Modal huong dan thao tac thu cong (Chia se > Them vao MH chinh).
// Khac ban linh-kien-app o cho: Modal cua suachua khong co prop "open" (dieu khien qua conditional
// render, dung nguyen tac chung cua toan bo modal khac trong app nay).
export function InstallAppButton({ onDark = false }: { onDark?: boolean } = {}) {
  const { available, promptInstall } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isStandalonePwa()) return null;

  async function handleClick() {
    if (available) {
      await promptInstall();
      return;
    }
    // Fallback: van hien huong dan chung khi khong bat duoc prompt (iOS Safari, hoac da tu choi
    // truoc do nen trinh duyet khong con phat lai su kien beforeinstallprompt).
    setShowIosGuide(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Cài đặt vào màn hình chính"
        className={`focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${onDark ? "text-white/90 hover:bg-white/10" : "text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]"}`}
      >
        <span className="text-base leading-none">📲</span>
        <span className="hidden sm:inline">Cài đặt</span>
      </button>
      {showIosGuide && (
        <Modal title="📲 Cài đặt vào màn hình chính" onClose={() => setShowIosGuide(false)} maxWidthClass="max-w-sm">
          <div className="space-y-3 text-sm text-[var(--ink-body)]">
            <p>Trình duyệt này không hỗ trợ cài đặt tự động. Làm theo hướng dẫn thủ công:</p>
            <div className="space-y-1.5 bg-[var(--surface-2)] rounded-lg p-3">
              <div className="font-semibold text-[var(--accent)]">iPhone/iPad (Safari)</div>
              <div>
                1. Bấm nút Chia sẻ <span className="font-mono">⬆️</span> ở thanh trình duyệt.
              </div>
              <div>2. Chọn "Thêm vào Màn hình chính" (Add to Home Screen).</div>
            </div>
            <div className="space-y-1.5 bg-[var(--surface-2)] rounded-lg p-3">
              <div className="font-semibold text-[var(--accent)]">Android (Chrome)</div>
              <div>1. Bấm menu ⋮ ở góc trên bên phải.</div>
              <div>2. Chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính".</div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
