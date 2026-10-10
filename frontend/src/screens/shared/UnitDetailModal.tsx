import { useEffect, useState } from "react";
import { StatusBadge } from "../../ui/StatusBadge";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { Modal } from "../../ui/Modal";
import { Btn, Badge, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { HUONG_XU_LY_LABELS, LOAI_BAO_HANH_LABELS, LOAI_DOI_TRU_LABELS, KET_QUA_CHAN_DOAN_LABELS, XU_LY_XAC_LABELS, TRANG_THAI_UNIT_LABELS } from "../../lib/constants";
import { LogTimeline } from "./LogTimeline";
import { useLkName } from "../../hooks/useLinhKien";
import { CaseSnapshotPanel } from "./CaseSnapshotPanel";
import { PhanLoaiModal } from "./PhanLoaiModal";
import { FastActionsModal } from "./FastActionsModal";
import { YeuCauBoSungModal } from "./YeuCauBoSungModal";
import { BaoCaoSaiModal } from "./BaoCaoSaiModal";
import { XacNhanHoanTatModal } from "./XacNhanHoanTatModal";
import { TraTrucTiepModal } from "./TraTrucTiepModal";
import { ChanDoanModal } from "./ChanDoanModal";
import type { AppUser, DonCha, DonVi, LogRow } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

interface DetailResponse {
  don_vi: DonVi;
  don_cha: DonCha;
  logs: { don_vi: LogRow[]; don_cha: LogRow[]; phieu_gui: LogRow[]; phieu_tra: LogRow[] };
  anh: { don_vi: { id: number; loai: string; anh_url: string }[]; don_cha: { id: number; anh_url: string }[] };
  bao_cao_sai_thong_tin: unknown[];
  // 10/10/2026: cac don vi cung don cha (lo xN).
  anh_em?: { id: string; so_thu_tu: number; trang_thai: string }[];
}

type SubModal = "phan-loai" | "fast" | "bo-sung" | "bao-cao-sai" | "xac-nhan" | "tra-ktv" | "tra-kho" | "chan-doan" | null;

// "UI chi tiet" don vi bao hanh. Nut thao tac o footer theo dung vai tro dang dang nhap + trang thai
// hien tai cua don (dong bo 1-doi-1 voi dieu kien o PhanLoai.tsx/ViecCuaToi.tsx).
//
// Thiet ke lai 10/10/2026 (phan hoi "UI chi tiet xem don bao hanh dang trong va thua qua nhieu vung"):
// truoc day modal tran kin man hinh, truong xep luoi 4 cot cach nhau hang tram px, 4 hop nhat ky rieng
// de trong, phan duoi trang trong. Nay modal cao theo noi dung (rong toi da max-w-6xl), 2 cot: trai =
// khoi tom tat (linh kien, loi, chip case/KTV/phieu) + khoi "Xu ly" chi hien truong co gia tri + case +
// don vi cung lo + anh; phai = nhat ky gop 1 dong thoi gian co tab loc theo nguon (LogTimeline).

function Kv({ k, v, wide }: { k: string; v: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-full" : ""}`}>
      <dt className="text-[11px] text-[var(--ink-faint)]">{k}</dt>
      <dd className="text-[13px] text-[var(--ink)] break-words">{v}</dd>
    </div>
  );
}

function Chip({ icon, children, title }: { icon: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex max-w-full items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs text-[var(--ink-body)] ring-1 ring-[var(--line)]">
      <span>{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function SectionTitle({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "red" }) {
  return <p className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${tone === "red" ? "text-[var(--red-700)]" : "text-[var(--accent-ink)]"}`}>{children}</p>;
}

export function UnitDetailModal({ unitId, user, onClose, onChanged }: { unitId: string; user: AppUser; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const { nameOf: lkName, phanLoaiOf } = useLkName();
  const [sub, setSub] = useState<SubModal>(null);

  const load = () => api.get<DetailResponse>(`/admin/don-vi/${unitId}`).then(setData);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const afterAction = () => {
    setSub(null);
    onChanged();
    load();
  };

  if (!data) {
    return (
      <Modal title="Chi tiết đơn bảo hành" onClose={onClose} maxWidthClass="max-w-6xl">
        <Spinner />
      </Modal>
    );
  }

  const { don_vi: u, don_cha: p, logs, anh, bao_cao_sai_thong_tin, anh_em = [] } = data;
  const isKhachLe = !p.phieu_gui_id;
  const effLk = u.ma_lk_thuc_te || p.ma_lk;
  const daDoiLk = !!(u.ma_lk_thuc_te && u.ma_lk_thuc_te !== p.ma_lk);
  const phanLoai = phanLoaiOf(effLk);

  const buttons: { label: string; onClick: () => void; variant?: "primary" | "success" | "danger" }[] = [];
  if (user.la_admin_bh) {
    if (u.trang_thai === "cho_phan_loai" || u.trang_thai === "admin_can_xem_lai") {
      buttons.push({ label: u.trang_thai === "cho_phan_loai" ? "Phân loại" : "Phân loại lại", onClick: () => setSub("phan-loai"), variant: "primary" });
      if (u.trang_thai === "cho_phan_loai") buttons.push({ label: "⚡ Xử lý nhanh", onClick: () => setSub("fast") });
      if (!isKhachLe) {
        if (u.trang_thai === "cho_phan_loai") buttons.push({ label: "Yêu cầu bổ sung", onClick: () => setSub("bo-sung") });
        buttons.push({ label: "🐞 Báo cáo sai", onClick: () => setSub("bao-cao-sai") });
      }
    }
    if (u.trang_thai === "cho_admin_xac_nhan") {
      buttons.push({ label: "✔️ Xác nhận hoàn tất / Yêu cầu làm lại", onClick: () => setSub("xac-nhan"), variant: "success" });
    }
    if (u.trang_thai === "san_sang_gom_phieu_tra" && !u.phieu_tra_id) {
      if (!isKhachLe) buttons.push({ label: "⚡ Trả trực tiếp KTV", onClick: () => setSub("tra-ktv") });
      buttons.push({ label: "⚡ Giao trực tiếp Kho", onClick: () => setSub("tra-kho") });
    }
  }
  if (user.la_nv_sua_chua && u.trang_thai === "cho_chan_doan" && u.nguoi_sua_chua === user.email) {
    buttons.push({ label: "🔧 Chẩn đoán", onClick: () => setSub("chan-doan"), variant: "primary" });
  }

  const daPhanLoai = !!(u.loai_bao_hanh || u.huong_xu_ly);
  const soAnh = anh.don_cha.length + anh.don_vi.length;

  return (
    <>
      <Modal
        title={u.id}
        onClose={onClose}
        maxWidthClass="max-w-6xl"
        headerActions={
          <div className="flex items-center gap-2">
            <StatusBadge kind="unit" value={u.trang_thai} />
            <SlaBadge since={u.updated_at} entityType="phieu_sc_ct" entityId={u.id} clickable={user.la_admin_bh || user.la_nv_sua_chua || user.la_qtri} />
          </div>
        }
        footerActions={
          buttons.length > 0 ? (
            <>
              {buttons.map((b) => (
                <Btn key={b.label} variant={b.variant} onClick={b.onClick}>
                  {b.label}
                </Btn>
              ))}
            </>
          ) : undefined
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3 min-w-0">
            {/* Tom tat */}
            <section className="rounded-xl bg-[var(--surface-2)] px-3.5 py-3 space-y-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[15px] font-bold text-[var(--ink)] leading-snug">🔩 {lkName(effLk)}</p>
                {phanLoai && <Badge tone="gray">{phanLoai}</Badge>}
                {daDoiLk && (
                  <span title={`KTV gửi: ${lkName(p.ma_lk)}`}>
                    <Badge tone="blue">Đã đổi LK</Badge>
                  </span>
                )}
              </div>
              {daDoiLk && <p className="text-xs text-[var(--ink-soft)]">KTV gửi: {lkName(p.ma_lk)}</p>}
              <p className="text-[13.5px] text-[var(--ink-body)] whitespace-pre-line">
                <span className="text-[var(--ink-faint)]">Mô tả lỗi: </span>
                {p.mo_ta_loi || "—"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.case_id && (
                  <Chip icon="📋" title="Mã case">
                    {p.case_id}
                  </Chip>
                )}
                {isKhachLe ? (
                  <Chip icon="🧑" title="Khách lẻ">
                    {p.ten_khach_hang || "Khách lẻ"}
                    {p.sdt_khach_hang ? ` · ${p.sdt_khach_hang}` : ""}
                  </Chip>
                ) : (
                  p.ktv && (
                    <Chip icon="👷" title="KTV gửi hàng">
                      <UserName email={p.ktv} />
                    </Chip>
                  )
                )}
                {isKhachLe && p.san_pham_bh && (
                  <Chip icon="📦" title="Sản phẩm bảo hành">
                    {p.san_pham_bh}
                  </Chip>
                )}
                {p.phieu_gui_id && (
                  <Chip icon="🚚" title="Phiếu gửi">
                    {p.phieu_gui_id}
                  </Chip>
                )}
                {u.phieu_tra_id && (
                  <Chip icon="↩️" title="Phiếu trả">
                    {u.phieu_tra_id}
                  </Chip>
                )}
                <Chip icon="🔢" title="Số lượng của đơn cha">
                  SL khai {p.so_luong_khai}
                  {p.so_luong_thuc_nhan != null && p.so_luong_thuc_nhan !== p.so_luong_khai ? ` · thực nhận ${p.so_luong_thuc_nhan}` : ""}
                </Chip>
                {p.nguon_tao === "admin_dich_vu" && <Badge tone="violet">Đơn dịch vụ</Badge>}
                {p.odoo_id ? <Badge tone="blue">Odoo</Badge> : null}
              </div>
              {p.ly_do_chenh_lech_sl && <p className="text-xs text-[var(--amber-800)]">Lý do lệch SL: {p.ly_do_chenh_lech_sl}</p>}
              {isKhachLe && p.dia_chi_khach_hang && <p className="text-xs text-[var(--ink-soft)]">Địa chỉ: {p.dia_chi_khach_hang}</p>}
            </section>

            {p.xac_nhan_khac_ktv && (
              <p className="rounded-lg bg-[var(--amber-100)] text-[var(--amber-800)] text-xs font-bold px-3 py-2">
                ⚠ Đơn được tạo thay: case thuộc KTV khác trên hệ thống ({p.ktv_tren_case || "không xác định"}) — <UserName email={p.xac_nhan_khac_ktv} /> đã xác nhận khi tạo hộ.
              </p>
            )}

            {/* Xu ly - chi hien truong co gia tri */}
            <section className="rounded-xl border border-[var(--line)] px-3 py-2.5">
              <SectionTitle>🛠 Xử lý</SectionTitle>
              {daPhanLoai ? (
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                  {u.loai_bao_hanh && <Kv k="Loại bảo hành" v={LOAI_BAO_HANH_LABELS[u.loai_bao_hanh] ?? u.loai_bao_hanh} />}
                  {u.huong_xu_ly && <Kv k="Hướng xử lý" v={HUONG_XU_LY_LABELS[u.huong_xu_ly] ?? u.huong_xu_ly} />}
                  {(u.loai_doi_tru || p.loai_doi_tru_de_xuat) && (
                    <Kv
                      k="Loại đối trừ"
                      v={
                        <>
                          {u.loai_doi_tru ? LOAI_DOI_TRU_LABELS[u.loai_doi_tru] : "—"}
                          {p.loai_doi_tru_de_xuat && u.loai_doi_tru !== p.loai_doi_tru_de_xuat && (
                            <span className="text-[11px] text-[var(--ink-faint)]"> (KTV đề xuất: {LOAI_DOI_TRU_LABELS[p.loai_doi_tru_de_xuat]})</span>
                          )}
                        </>
                      }
                    />
                  )}
                  {u.nguoi_sua_chua && <Kv k="NV phụ trách" v={<UserName email={u.nguoi_sua_chua} />} />}
                  {u.ket_qua_chan_doan && <Kv k="Kết quả chẩn đoán" v={KET_QUA_CHAN_DOAN_LABELS[u.ket_qua_chan_doan] ?? u.ket_qua_chan_doan} />}
                  {u.xu_ly_xac && <Kv k="Xử lý xác" v={XU_LY_XAC_LABELS[u.xu_ly_xac] ?? u.xu_ly_xac} />}
                  {u.thong_tin_mail_pd && <Kv k="Mail phê duyệt" v={u.thong_tin_mail_pd} />}
                  {u.ma_phe_duyet && <Kv k="Mã phê duyệt" v={u.ma_phe_duyet} />}
                  {u.ly_do_tu_choi && <Kv k="Lý do huỷ" v={u.ly_do_tu_choi} wide />}
                </dl>
              ) : (
                <p className="text-[13px] text-[var(--ink-soft)]">
                  Chưa phân loại
                  {p.loai_doi_tru_de_xuat ? ` · KTV đề xuất đối trừ: ${LOAI_DOI_TRU_LABELS[p.loai_doi_tru_de_xuat]}` : ""}
                  {buttons.length > 0 ? " — dùng các nút bên dưới để xử lý." : "."}
                </p>
              )}
            </section>

            {p.case_id && <CaseSnapshotPanel caseId={p.case_id} canSync={user.la_admin_bh || user.la_qtri} />}

            {anh_em.length > 1 && (
              <section className="rounded-xl border border-[var(--line)] px-3 py-2.5">
                <SectionTitle>
                  🗂️ Cùng đơn {p.id} · {anh_em.length} đơn vị
                </SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {anh_em.map((x) => (
                    <span
                      key={x.id}
                      title={x.id}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs ring-1 ${x.id === u.id ? "bg-[var(--accent-soft)] ring-[var(--brand-300)] font-bold text-[var(--accent-ink)]" : "ring-[var(--line)] text-[var(--ink-soft)]"}`}
                    >
                      <span className="font-mono">#{x.so_thu_tu}</span>
                      <span>{TRANG_THAI_UNIT_LABELS[x.trang_thai] ?? x.trang_thai}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {soAnh > 0 && (
              <section className="rounded-xl border border-[var(--line)] px-3 py-2.5">
                <SectionTitle>🖼 Ảnh ({soAnh})</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {anh.don_cha.map((a) => (
                    <a key={`p${a.id}`} href={a.anh_url} target="_blank" rel="noreferrer">
                      <img src={a.anh_url} className="w-20 h-20 object-cover rounded-lg border border-[var(--line)] hover:opacity-85" title="Ảnh lỗi lúc gửi hàng" />
                    </a>
                  ))}
                  {anh.don_vi.map((a) => (
                    <a key={`u${a.id}`} href={a.anh_url} target="_blank" rel="noreferrer">
                      <img src={a.anh_url} className="w-20 h-20 object-cover rounded-lg border border-[var(--line)] hover:opacity-85" title={a.loai} />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {bao_cao_sai_thong_tin.length > 0 && (
              <section className="rounded-xl border border-[var(--red-100)] px-3 py-2.5">
                <SectionTitle tone="red">🐞 Ghi nhận nội bộ — KTV báo cáo sai thông tin</SectionTitle>
                <div className="space-y-1.5">
                  {(bao_cao_sai_thong_tin as { id: number; tac_gia: string; thoi_gian: string; noi_dung: string }[]).map((b) => (
                    <div key={b.id} className="text-xs bg-[var(--red-100)] text-[var(--red-700)] rounded-lg px-2.5 py-1.5">
                      <p>{b.noi_dung}</p>
                      <p className="mt-0.5 text-[10px] font-mono opacity-70">
                        <UserName email={b.tac_gia} /> · {fmtDate(b.thoi_gian)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Nhat ky gop: cot phai (desktop), xuong duoi (mobile) */}
          <aside className="min-w-0 lg:border-l lg:border-[var(--line)] lg:pl-4 flex flex-col">
            <SectionTitle>🕘 Nhật ký</SectionTitle>
            <LogTimeline
              className="lg:max-h-[62vh]"
              sources={[
                { key: "dv", label: "Đơn vị", icon: "📦", logs: logs.don_vi },
                { key: "dc", label: "Đơn cha", icon: "🗂️", logs: logs.don_cha },
                { key: "pg", label: "Phiếu gửi", icon: "🚚", logs: logs.phieu_gui },
                { key: "pt", label: "Phiếu trả", icon: "↩️", logs: logs.phieu_tra },
              ]}
            />
          </aside>
        </div>
      </Modal>

      {sub === "phan-loai" && <PhanLoaiModal unit={u} onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "fast" && (
        <FastActionsModal
          unit={u}
          isKhachLe={isKhachLe}
          onClose={() => setSub(null)}
          onDone={afterAction}
          onNavigate={(special) => setSub(special === "bo_sung_tt" ? "bo-sung" : "bao-cao-sai")}
        />
      )}
      {sub === "bo-sung" && <YeuCauBoSungModal parentId={p.id} onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "bao-cao-sai" && <BaoCaoSaiModal parentId={p.id} onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "xac-nhan" && <XacNhanHoanTatModal unit={u} onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "tra-ktv" && <TraTrucTiepModal unitId={u.id} mode="ktv" onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "tra-kho" && <TraTrucTiepModal unitId={u.id} mode="kho" onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "chan-doan" && <ChanDoanModal unit={u} onClose={() => setSub(null)} onDone={afterAction} />}
    </>
  );
}
