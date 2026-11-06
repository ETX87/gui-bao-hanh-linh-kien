// Mo thang 1 don / don vi / thung / phieu tra theo ID tu duong dan (06/11/2026, vd
// https://suachua.dichvu3t.workers.dev/DH-002957-1) - DVBH (CaseDetail tab "Bảo hành") gan link nay cho moi ma.
// lib/deepLink.ts ghi nho ID tu lan tai trang dau (song sot qua vong dang nhap Google); o day (da dang nhap) hoi
// backend ID thuoc loai nao (GET /tra-cuu/mo-theo-id/:id) roi mo dung modal chi tiet SAN CO - quyen xem do chinh
// route chi tiet cua modal do kiem tra (khong mo rong quyen).
import { useEffect, useState } from "react";
import type { AppUser } from "../../lib/types";
import { api, errorMessage } from "../../lib/api";
import { consumePendingOpenId } from "../../lib/deepLink";
import { UnitDetailModal } from "./UnitDetailModal";
import { PhieuTraDetailModal } from "./PhieuTraDetailModal";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";

type Target = { loai: "don_vi" | "phieu_gui" | "phieu_tra"; id: string };

export function MoTheoId({ user }: { user: AppUser }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    const id = consumePendingOpenId();
    if (!id) return;
    api
      .get<Target>(`/tra-cuu/mo-theo-id/${encodeURIComponent(id)}`)
      .then(setTarget)
      .catch((e) => setLoi(`Không mở được ${id}: ${errorMessage(e)}`));
  }, []);

  const close = () => {
    setTarget(null);
    // Bo ID khoi thanh dia chi de tai lai trang khong mo lai modal.
    if (/^\/[A-Z]{2}-/i.test(window.location.pathname)) window.history.replaceState(null, "", "/" + window.location.hash);
  };

  if (loi)
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-[var(--surface)] border border-[var(--line)] shadow-pop rounded-xl px-4 py-3 text-sm flex items-center gap-3">
        <span className="text-[var(--danger,#b23a3a)]">{loi}</span>
        <button type="button" className="text-xs font-semibold underline" onClick={() => setLoi(null)}>
          Đóng
        </button>
      </div>
    );
  if (!target) return null;
  if (target.loai === "don_vi") return <UnitDetailModal unitId={target.id} user={user} onClose={close} onChanged={() => undefined} />;
  if (target.loai === "phieu_tra") return <PhieuTraDetailModal traId={target.id} user={user} onClose={close} onChanged={() => undefined} />;
  return <PhieuGuiDetailModal guiId={target.id} onClose={close} onChanged={() => undefined} />;
}
