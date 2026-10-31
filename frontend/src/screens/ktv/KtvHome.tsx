import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useRoute } from "../../router/Router";
import { useWorkload } from "../../hooks/useWorkload";
import { Btn, Spinner } from "../../ui/primitives";
import { fmtDateOnly, hoursSince } from "../../lib/format";
import { HINH_THUC_GUI_LABELS } from "../../lib/constants";
import { KtvDonCard, KtvPhieuTraCard, openKtvDon, ChonPhieuTraModal, type KtvDon, type KtvPhieuTra } from "./KtvCards";
import { KtvBoSungModal } from "./KtvBoSungModal";
import { PhieuGuiDetailModal } from "./PhieuGuiDetailModal";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, DonVi, PhieuGui } from "../../lib/types";

// 30/10/2026 (ra soat UX mobile KTV, de xuat 1): Trang chu cua KTV = "Việc của tôi" - 1 danh sach the
// xep theo do gap (can bo sung -> hang ve cho nhan -> thung nhap chua gui -> don Odoo moi), moi the 1
// nut lam ngay; ben duoi "Đang theo dõi" cac don dang di kem dong tien trinh. Thay cho hero + canh bao
// don ton + luoi KPI (3 khoi lap cung 1 thong tin) - chi ap cho tai khoan CHI la KTV/Ve tinh.

const TRACK_LIMIT = 6;

export function KtvHomeScreen({ user }: { user: AppUser }) {
  const { nav } = useRoute();
  const { counts, refresh } = useWorkload();
  const [don, setDon] = useState<KtvDon[] | null>(null);
  const [soDang, setSoDang] = useState(0);
  const [tra, setTra] = useState<KtvPhieuTra[]>([]);
  const [nhap, setNhap] = useState<PhieuGui[]>([]);
  const [boSung, setBoSung] = useState<DonVi | null>(null);
  const [guiId, setGuiId] = useState<string | null>(null);
  const [traId, setTraId] = useState<string | null>(null);
  const [chon, setChon] = useState<{ id: string; n: number }[] | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api.get<{ don: KtvDon[]; so_dang: number }>("/phieu-gui/don-cua-toi?nhom=dang&limit=30"),
      api.get<{ phieu_tra: KtvPhieuTra[] }>("/phieu-tra?trang_thai=da_gui&kem_don=1&limit=10"),
      api.get<{ phieu_gui: PhieuGui[] }>("/phieu-gui?trang_thai=nhap&limit=10"),
    ])
      .then(([d, t, g]) => {
        setDon(d.don);
        setSoDang(d.so_dang);
        setTra(t.phieu_tra);
        setNhap(g.phieu_gui);
      })
      .catch(() => setDon([]));
  }, []);
  useEffect(load, [load]);
  const after = () => {
    load();
    refresh();
  };

  if (!don) return <Spinner />;

  const canBoSung = don.filter((d) => d.can_bo_sung);
  const theoDoi = don.filter((d) => !d.can_bo_sung && d.gui_trang_thai !== "nhap").slice(0, TRACK_LIMIT);
  const odoo = counts.ktv_odoo_cho_gui || 0;
  const tongViec = canBoSung.length + tra.length + nhap.length + (odoo > 0 ? 1 : 0);

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 flex items-baseline gap-2 text-lg font-bold text-[var(--ink)]">
          {tongViec > 0 ? "🔥 Việc cần làm" : "✨ Không có việc nào đang chờ bạn"}
        </h2>
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {canBoSung.map((d) => (
            <KtvDonCard key={d.id} don={d} onOpen={() => openKtvDon(d, { gui: setGuiId, tra: setTraId, chon: setChon })} onBoSung={setBoSung} />
          ))}
          {tra.map((t) => (
            <KtvPhieuTraCard key={t.id} pt={t} onDone={after} onOpen={() => setTraId(t.id)} />
          ))}
          {nhap.map((g) => {
            const soDon = (g as PhieuGui & { so_don?: number }).so_don ?? 0;
            const cu = hoursSince(g.created_at) > 24;
            return (
              <div key={g.id} className="rounded-xl border border-[var(--amber-200)] bg-[var(--surface)] p-3 shadow-card">
                <p className="text-[15px] font-bold text-[var(--ink)]">📦 Thùng chưa gửi · {soDon} đơn</p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {g.id} · tạo {fmtDateOnly(g.created_at)}
                  {g.hinh_thuc_gui && ` · ${HINH_THUC_GUI_LABELS[g.hinh_thuc_gui] || g.hinh_thuc_gui}`}
                  {cu && <b className="text-[var(--red-700)]"> · để quá 24h</b>}
                </p>
                <p className="mt-1 text-[13px] text-[var(--ink-body)]">{soDon === 0 ? "Còn bước: thêm đơn vào thùng." : "Còn 1 bước: xác nhận đã gửi xe."}</p>
                <Btn variant="primary" size="touch" className="mt-2 w-full" onClick={() => setGuiId(g.id)}>
                  {soDon === 0 ? "Mở thùng, thêm đơn" : "Mở thùng & gửi"}
                </Btn>
              </div>
            );
          })}
          {odoo > 0 && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-card">
              <p className="text-[15px] font-bold text-[var(--ink)]">🧾 {odoo} đơn Odoo mới chờ gửi sửa</p>
              <p className="text-xs text-[var(--ink-soft)]">Chọn đơn để đóng thùng — mã ca, linh kiện, số lượng đã điền sẵn.</p>
              <Btn variant="primary" size="touch" className="mt-2 w-full" onClick={() => nav("/ktv/tao-phieu")}>
                Chọn đơn & tạo thùng
              </Btn>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-bold text-[var(--ink)]">📍 Đang theo dõi</h2>
          {soDang > 0 && (
            <button className="text-xs font-semibold text-[var(--link)] hover:underline" onClick={() => nav("/ktv/tra-cuu")}>
              Xem tất cả {soDang} đơn ›
            </button>
          )}
        </div>
        {theoDoi.length === 0 ? (
          <p className="rounded-xl bg-[var(--surface-2)] py-6 text-center text-sm text-[var(--ink-faint)]">Không có đơn nào đang trên đường hoặc đang xử lý.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {theoDoi.map((d) => (
              <KtvDonCard key={d.id} don={d} onOpen={() => openKtvDon(d, { gui: setGuiId, tra: setTraId, chon: setChon })} />
            ))}
          </div>
        )}
      </section>

      {boSung && (
        <KtvBoSungModal
          unit={boSung}
          onClose={() => setBoSung(null)}
          onDone={() => {
            setBoSung(null);
            after();
          }}
        />
      )}
      {guiId && <PhieuGuiDetailModal guiId={guiId} onClose={() => setGuiId(null)} onChanged={after} />}
      {chon && <ChonPhieuTraModal list={chon} onClose={() => setChon(null)} onPick={(id) => { setChon(null); setTraId(id); }} />}
      {traId && <PhieuTraDetailModal traId={traId} user={user} onClose={() => setTraId(null)} onChanged={after} />}
    </div>
  );
}
