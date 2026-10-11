import { useEffect, useState, type ReactNode } from "react";
import { StatusBadge } from "../../ui/StatusBadge";
import { api, errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { Modal } from "../../ui/Modal";
import { Btn, Badge, Spinner, Textarea } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { useToast } from "../../ui/Toast";
import {
  HUONG_XU_LY_LABELS,
  LOAI_BAO_HANH_LABELS,
  LOAI_DOI_TRU_LABELS,
  KET_QUA_CHAN_DOAN_LABELS,
  XU_LY_XAC_LABELS,
  TRANG_THAI_UNIT_LABELS,
  TRANG_THAI_PHIEU_GUI_LABELS,
  TRANG_THAI_PHIEU_TRA_LABELS,
  HINH_THUC_GUI_LABELS,
} from "../../lib/constants";
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
import { PhieuTraDetailModal } from "./PhieuTraDetailModal";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import type { AppUser, DonCha, DonVi, GhiChuLog, LogRow } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";
import { Kv, SectionTitle, Section, SummaryBox, CopyBtn, DETAIL_MAX_W } from "../../ui/DetailParts";

interface PhieuGuiTomTat {
  id: string;
  nguoi_tao: string;
  nguoi_tao_ho: string | null;
  trang_thai: string;
  ngay_gui_xe: string | null;
  hinh_thuc_gui: string | null;
  ma_xe_hoac_tai_xe: string | null;
  don_vi_van_chuyen: string | null;
  ma_van_don: string | null;
  su_co_tiep_nhan: number;
  su_co_ly_do: string | null;
  nguoi_nhan_kho: string | null;
  thoi_gian_nhan_kho: string | null;
  admin_tiep_nhan: number;
  admin_nguoi_nhan: string | null;
  admin_thoi_gian_nhan: string | null;
  created_at: string;
  so_don: number;
  thoi_gian_gui: string | null;
}
interface PhieuTraTomTat {
  id: string;
  ktv_nhan: string;
  trang_thai: string;
  loai_doi_tru: string;
  ma_don_hang: string | null;
  ma_misa: string | null;
  ma_van_don: string | null;
  created_at: string;
  updated_at: string;
  so_don_vi: number;
}
interface OdooTomTat {
  odoo_id: number;
  ma_don: string | null;
  trang_thai: string | null;
  tinh_trang_loi: string | null;
  ngay_tao: string | null;
  last_status: string | null;
  last_sent_at: string | null;
  last_error: string | null;
}
interface KtvInfo {
  ma_ktv?: string;
  ten_hien_thi?: string | null;
  sdt?: string | null;
  khu_vuc_ma?: string | null;
  vai_tro_ktv?: string | null;
  email_gs?: string | null;
}

interface DetailResponse {
  don_vi: DonVi;
  don_cha: DonCha;
  logs: { don_vi: LogRow[]; don_cha: LogRow[]; phieu_gui: LogRow[]; phieu_tra: LogRow[] };
  anh: { don_vi: { id: number; loai: string; anh_url: string }[]; don_cha: { id: number; anh_url: string }[] };
  bao_cao_sai_thong_tin: unknown[];
  anh_em?: { id: string; so_thu_tu: number; trang_thai: string }[];
  // 11/10/2026: UI chi tiet "tat ca trong mot".
  lien_ket?: { phieu_gui: PhieuGuiTomTat | null; phieu_tra: PhieuTraTomTat | null; odoo: OdooTomTat | null };
  ktv_info?: KtvInfo | null;
  ghi_chu?: GhiChuLog[];
  co_the_trao_doi?: boolean;
}

type SubModal = "phan-loai" | "fast" | "bo-sung" | "bao-cao-sai" | "xac-nhan" | "tra-ktv" | "tra-kho" | "chan-doan" | null;
type QuickKey = "pg" | "dc" | "pt" | "odoo" | null;

const ODOO_SC_LABELS: Record<string, string> = {
  cho_gui: "Chờ gửi (thùng nháp)",
  dang_gui: "Đang gửi",
  kho_da_nhan: "Kho đã nhận",
  dang_xu_ly: "Đang xử lý",
  cho_tra: "Chờ trả",
  dang_tra: "Đang trả",
  hoan_tat: "Hoàn tất",
  tu_choi: "Từ chối",
  khong_gui: "Hủy đơn lỗi",
};
const SAU_PHAN_LOAI = ["cho_chan_doan", "cho_admin_xac_nhan", "san_sang_gom_phieu_tra", "ket_thuc_tu_choi", "ket_thuc_chuyen_kho"];
const DA_XONG = ["san_sang_gom_phieu_tra", "ket_thuc_tu_choi", "ket_thuc_chuyen_kho"];

// "UI chi tiet" don vi bao hanh - thiet ke "tat ca trong mot" (11/10/2026, yeu cau: "xem duoc tat ca cac
// thong tin cua don hang, cac lien ket lien quan co the click vao xem nhanh, + lich su log, cac thong tin
// co phan chia ro rang thanh cac vung du lieu"). Bo cuc: thanh tien trinh + "dang o" -> trai: tom tat /
// lien ket (xem nhanh tai cho, "Mo phieu" chong toi da 2 lop) / khach hang & case / nguoi lien quan / xu
// ly / anh / bao cao sai; phai: nhat ky gop + tab "Trao doi" (viet duoc ngay tai day).
// Toan bo du lieu tra ve trong 1 lan GET /admin/don-vi/:id - bam chip KHONG goi them API.
// Nut thao tac o footer theo dung vai tro + trang thai (dong bo voi PhanLoai.tsx/ViecCuaToi.tsx).
// nested = mo tu ben trong chi tiet phieu gui / phieu tra -> an nut "Mo phieu" (tranh chong 3+ lop).

export function UnitDetailModal({ unitId, user, onClose, onChanged, nested }: { unitId: string; user: AppUser; onClose: () => void; onChanged: () => void; nested?: boolean }) {
  const toast = useToast();
  const [curId, setCurId] = useState(unitId);
  const [data, setData] = useState<DetailResponse | null>(null);
  const { nameOf: lkName, phanLoaiOf, soThangOf } = useLkName();
  const [sub, setSub] = useState<SubModal>(null);
  const [quick, setQuick] = useState<QuickKey>(null);
  const [openPg, setOpenPg] = useState(false);
  const [openPt, setOpenPt] = useState(false);
  const [chat, setChat] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => api.get<DetailResponse>(`/admin/don-vi/${curId}`).then(setData);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curId]);

  const afterAction = () => {
    setSub(null);
    onChanged();
    load();
  };

  if (!data) {
    return (
      <Modal title="Chi tiết đơn bảo hành" onClose={onClose} maxWidthClass={DETAIL_MAX_W}>
        <Spinner />
      </Modal>
    );
  }

  const { don_vi: u, don_cha: p, logs, anh, bao_cao_sai_thong_tin, anh_em = [], lien_ket, ktv_info, ghi_chu = [], co_the_trao_doi } = data;
  const pg = lien_ket?.phieu_gui ?? null;
  const pt = lien_ket?.phieu_tra ?? null;
  const odoo = lien_ket?.odoo ?? null;
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
  const tt = u.trang_thai;
  const ketThuc = tt === "ket_thuc_tu_choi" || tt === "ket_thuc_chuyen_kho";

  // ---- Nguoi lien quan: lay nguoi lam GAN NHAT cua tung loai hanh dong ----
  const newest = (arr: LogRow[], f: (l: LogRow) => boolean) => [...arr].sort((a, b) => (b.thoi_gian > a.thoi_gian ? 1 : b.thoi_gian < a.thoi_gian ? -1 : b.id - a.id)).find(f) ?? null;
  // Phan loai = chuyen tu cho_phan_loai/admin_can_xem_lai sang 1 trang thai sau phan loai (khop ca log cu khong dau).
  const plLog = newest(logs.don_vi, (l) => ["cho_phan_loai", "admin_can_xem_lai"].includes(l.tu_trang_thai || "") && SAU_PHAN_LOAI.includes(l.den_trang_thai || ""));
  const ndLog = newest(logs.don_vi, (l) => l.tu_trang_thai === "cho_chan_doan" && l.den_trang_thai === "cho_admin_xac_nhan");
  const htLog = newest(logs.don_vi, (l) => l.tu_trang_thai === "cho_admin_xac_nhan" && l.den_trang_thai === "san_sang_gom_phieu_tra");
  const ktLog = newest(logs.phieu_tra, (l) => l.den_trang_thai === "da_duyet_ke_toan");
  const khoGuiLog = newest(logs.phieu_tra, (l) => l.den_trang_thai === "da_gui");
  const nhanLog = newest(logs.phieu_tra, (l) => l.den_trang_thai === "ktv_da_nhan");
  const needNv = !!u.huong_xu_ly && ["sua_chua", "dich_vu_tinh_phi"].includes(u.huong_xu_ly);

  // ---- Thanh tien trinh ----
  type Step = { label: string; at?: string | null; done: boolean; skip?: boolean; red?: boolean };
  const steps: Step[] = [];
  if (isKhachLe) steps.push({ label: "Tạo đơn dịch vụ", at: p.created_at, done: true });
  else {
    steps.push({ label: "KTV gửi", at: pg?.thoi_gian_gui || pg?.ngay_gui_xe, done: !!pg && pg.trang_thai !== "nhap" });
    steps.push({ label: "Kho nhận", at: pg?.thoi_gian_nhan_kho, done: pg?.trang_thai === "da_tiep_nhan" });
    steps.push({ label: "Admin nhận", at: pg?.admin_thoi_gian_nhan, done: !!pg?.admin_tiep_nhan });
  }
  steps.push({ label: "Phân loại", at: plLog?.thoi_gian, done: SAU_PHAN_LOAI.includes(tt) || !!u.phieu_tra_id });
  if (ketThuc) {
    steps.push({ label: tt === "ket_thuc_tu_choi" ? "Đã huỷ" : "Chuyển kho", at: plLog?.thoi_gian, done: true, red: true });
  } else {
    steps.push({ label: "Sửa chữa", at: ndLog?.thoi_gian, done: needNv && !!ndLog && tt !== "cho_chan_doan", skip: daPhanLoai && !needNv && SAU_PHAN_LOAI.includes(tt) });
    steps.push({ label: "Hoàn tất", at: htLog?.thoi_gian, done: tt === "san_sang_gom_phieu_tra" || !!u.phieu_tra_id });
    steps.push({ label: "Phiếu trả", at: pt?.created_at, done: !!pt && ["da_gui", "ktv_da_nhan", "khieu_nai_van_chuyen", "ket_thuc_khong_gui"].includes(pt.trang_thai) });
    steps.push({ label: isKhachLe ? "Khách nhận" : "KTV nhận", at: nhanLog?.thoi_gian, done: pt?.trang_thai === "ktv_da_nhan" || pt?.trang_thai === "ket_thuc_khong_gui" });
  }
  const curIdx = steps.findIndex((s) => !s.done && !s.skip);

  // ---- "Dang o" ai ----
  const ktvEmail = p.ktv || pg?.nguoi_tao || null;
  let dangO: ReactNode;
  if (ketThuc) dangO = "Đã kết thúc";
  else if (tt === "cho_bo_sung_tt") dangO = <>KTV {ktvEmail ? <UserName email={ktvEmail} /> : ""} — bổ sung thông tin</>;
  else if (tt === "cho_chan_doan") dangO = <>NV {u.nguoi_sua_chua ? <UserName email={u.nguoi_sua_chua} /> : ""} — chẩn đoán / sửa</>;
  else if (tt === "cho_phan_loai" || tt === "admin_can_xem_lai") dangO = "Admin bảo hành — phân loại";
  else if (tt === "cho_admin_xac_nhan") dangO = "Admin bảo hành — xác nhận hoàn tất";
  else if (!pt) dangO = "Admin bảo hành — gộp phiếu trả";
  else if (pt.trang_thai === "nhap") dangO = "Admin bảo hành — nhập mã, gửi duyệt phiếu trả";
  else if (pt.trang_thai === "cho_ke_toan_duyet") dangO = "Kế toán — duyệt phiếu trả";
  else if (pt.trang_thai === "da_duyet_ke_toan") dangO = "Kho — đóng gói, gửi hàng";
  else if (pt.trang_thai === "da_gui") dangO = isKhachLe ? "Đang giao cho khách" : <>KTV {ktvEmail ? <UserName email={ktvEmail} /> : ""} — xác nhận đã nhận</>;
  else if (pt.trang_thai === "khieu_nai_van_chuyen") dangO = "Khiếu nại vận chuyển";
  else dangO = "Đã hoàn tất";

  // ---- Quyen mo phieu (chong toi da 2 lop: an khi nested) ----
  const canOpenPg = !nested && (user.la_kho || user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view);
  const canOpenPt = !nested;

  const sendChat = async () => {
    if (!chat.trim() || !p.phieu_gui_id) return;
    setSending(true);
    try {
      await api.post(`/phieu-gui/${p.phieu_gui_id}/ghi-chu`, { noi_dung: chat.trim() });
      setChat("");
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSending(false);
    }
  };
  const chatLogs = ghi_chu.map(
    (g) => ({ id: g.id, entity_type: "phieu_gui", entity_id: g.phieu_gui_id, tu_trang_thai: null, den_trang_thai: null, nguoi_thuc_hien: g.tac_gia, thoi_gian: g.thoi_gian, ghi_chu: "💬 " + g.noi_dung }) as unknown as LogRow,
  );

  const chipCls = (on: boolean) =>
    `focus-ring inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs ring-1 transition-colors ${on ? "bg-[var(--accent-soft)] ring-[var(--brand-300)] text-[var(--accent-ink)] font-semibold" : "bg-white ring-[var(--line)] text-[var(--link)] hover:bg-[var(--accent-soft)]"}`;
  const toggle = (k: QuickKey) => setQuick((q) => (q === k ? null : k));
  const soXong = anh_em.filter((x) => DA_XONG.includes(x.trang_thai) || x.id === u.id && !!u.phieu_tra_id).length;

  const quickBox = (children: ReactNode, action?: ReactNode) => (
    <div className="mt-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--ink-body)]">
      {children}
      {action && <div className="mt-1.5 flex justify-end">{action}</div>}
    </div>
  );

  // Nguoi lien quan - chi hien dong co gia tri.
  const nguoi: [string, ReactNode][] = [];
  if (!isKhachLe && ktvEmail)
    nguoi.push([
      "KTV gửi",
      <span className="inline-flex flex-wrap items-center gap-x-1">
        <UserName email={ktvEmail} />
        {ktv_info?.sdt && (
          <a href={`tel:${ktv_info.sdt}`} className="text-[var(--link)] hover:underline">
            · {ktv_info.sdt}
          </a>
        )}
      </span>,
    ]);
  if (ktv_info?.ma_ktv) nguoi.push(["Mã KTV · khu vực", `${ktv_info.ma_ktv}${ktv_info.khu_vuc_ma ? " · " + ktv_info.khu_vuc_ma : ""}`]);
  if (ktv_info?.email_gs) nguoi.push(["Giám sát", <UserName email={ktv_info.email_gs} />]);
  if (pg?.nguoi_tao_ho) nguoi.push(["Tạo hộ bởi", <UserName email={pg.nguoi_tao_ho} />]);
  if (pg?.nguoi_nhan_kho) nguoi.push(["Kho nhận thùng", <UserName email={pg.nguoi_nhan_kho} />]);
  if (pg?.admin_nguoi_nhan) nguoi.push(["Admin nhận nội bộ", <UserName email={pg.admin_nguoi_nhan} />]);
  if (plLog) nguoi.push(["Admin phân loại", <UserName email={plLog.nguoi_thuc_hien} />]);
  if (u.nguoi_sua_chua) nguoi.push(["NV sửa chữa", <UserName email={u.nguoi_sua_chua} />]);
  if (htLog) nguoi.push(["Admin xác nhận hoàn tất", <UserName email={htLog.nguoi_thuc_hien} />]);
  if (ktLog) nguoi.push(["Kế toán duyệt", <UserName email={ktLog.nguoi_thuc_hien} />]);
  if (khoGuiLog) nguoi.push(["Kho gửi trả", <UserName email={khoGuiLog.nguoi_thuc_hien} />]);

  return (
    <>
      <Modal
        title={u.id}
        onClose={onClose}
        maxWidthClass={DETAIL_MAX_W}
        headerActions={
          <div className="flex items-center gap-2">
            <CopyBtn text={u.id} title="Sao chép mã đơn" />
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
        {/* Tien trinh + "dang o" */}
        <div className="mb-3 rounded-xl border border-[var(--line)] px-3 py-2">
          <ol className="hidden md:flex items-start">
            {steps.map((s, i) => {
              const cur = i === curIdx;
              const dot = s.red ? "bg-[var(--red-500)]" : s.done ? "bg-[var(--brand-500)]" : cur ? "bg-[var(--blue-500)] ring-4 ring-[var(--blue-100)]" : s.skip ? "bg-white border border-dashed border-[var(--ink-faint)]" : "bg-[var(--line)]";
              return (
                <li key={s.label} className="relative flex-1 text-center">
                  {i > 0 && <span className={`absolute left-0 right-1/2 top-[5px] h-0.5 ${s.done || cur ? "bg-[var(--brand-300)]" : "bg-[var(--line)]"}`} />}
                  {i < steps.length - 1 && <span className={`absolute left-1/2 right-0 top-[5px] h-0.5 ${steps[i + 1].done || i + 1 === curIdx ? "bg-[var(--brand-300)]" : "bg-[var(--line)]"}`} />}
                  <span className={`relative mx-auto block h-3 w-3 rounded-full ${dot}`} />
                  <p className={`mt-1 text-[11.5px] leading-tight ${cur ? "font-bold text-[var(--ink)]" : s.red ? "font-bold text-[var(--red-700)]" : s.skip ? "text-[var(--ink-faint)] line-through" : s.done ? "text-[var(--ink-body)]" : "text-[var(--ink-faint)]"}`}>{s.label}</p>
                  <p className="text-[10.5px] font-mono text-[var(--ink-faint)]">{s.done && s.at ? fmtDate(s.at).slice(0, 11) : cur ? "đang" : s.skip ? "bỏ qua" : ""}</p>
                </li>
              );
            })}
          </ol>
          <p className="md:mt-1.5 text-[13px] text-[var(--ink-body)]">
            <span className="md:hidden font-bold text-[var(--ink)]">
              Bước {curIdx < 0 ? steps.length : curIdx + 1}/{steps.length} · {curIdx < 0 ? steps[steps.length - 1].label : steps[curIdx].label} —{" "}
            </span>
            <span className="text-[var(--ink-faint)]">Đang ở: </span>
            <span className="font-semibold">{dangO}</span>
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3 min-w-0">
            {/* Tom tat san pham & loi */}
            <SummaryBox>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[15px] font-bold text-[var(--ink)] leading-snug">🔩 {lkName(effLk)}</p>
                {phanLoai && <Badge tone="gray">{phanLoai}</Badge>}
                {daDoiLk && <Badge tone="blue">Đã đổi LK</Badge>}
                {p.nguon_tao === "admin_dich_vu" && <Badge tone="violet">Đơn dịch vụ</Badge>}
              </div>
              {daDoiLk && <p className="text-xs text-[var(--ink-soft)]">KTV gửi: {lkName(p.ma_lk)}</p>}
              <p className="text-[13.5px] text-[var(--ink-body)] whitespace-pre-line">
                <span className="text-[var(--ink-faint)]">Mô tả lỗi: </span>
                {p.mo_ta_loi || "—"}
              </p>
              <p className="text-xs text-[var(--ink-soft)]">
                SL khai {p.so_luong_khai}
                {p.so_luong_thuc_nhan != null && p.so_luong_thuc_nhan !== p.so_luong_khai ? ` · thực nhận ${p.so_luong_thuc_nhan}` : ""}
                {anh_em.length > 1 ? ` · đơn vị #${u.so_thu_tu}/${anh_em.length}` : ""}
                {p.ly_do_chenh_lech_sl ? ` · lý do lệch: ${p.ly_do_chenh_lech_sl}` : ""}
              </p>
              {isKhachLe && (
                <p className="text-xs text-[var(--ink-soft)]">
                  🧑 {p.ten_khach_hang || "Khách lẻ"}
                  {p.sdt_khach_hang ? ` · ${p.sdt_khach_hang}` : ""}
                  {p.san_pham_bh ? ` · ${p.san_pham_bh}` : ""}
                  {p.dia_chi_khach_hang ? ` · ${p.dia_chi_khach_hang}` : ""}
                </p>
              )}
            </SummaryBox>

            {p.xac_nhan_khac_ktv && (
              <p className="rounded-lg bg-[var(--amber-100)] text-[var(--amber-800)] text-xs font-bold px-3 py-2">
                ⚠ Đơn được tạo thay: case thuộc KTV khác trên hệ thống ({p.ktv_tren_case || "không xác định"}) — <UserName email={p.xac_nhan_khac_ktv} /> đã xác nhận khi tạo hộ.
              </p>
            )}
            {pg && !!pg.su_co_tiep_nhan && (
              <p className="rounded-lg bg-[var(--red-100)] text-[var(--red-700)] text-xs font-bold px-3 py-2">⚠ Kho báo sự cố khi tiếp nhận thùng {pg.id}: {pg.su_co_ly_do || "—"}</p>
            )}

            {/* Lien ket - xem nhanh tai cho */}
            <Section title="🔗 Liên kết">
              <div className="flex flex-wrap gap-1.5">
                {pg && (
                  <button className={chipCls(quick === "pg")} onClick={() => toggle("pg")}>
                    🚚 Phiếu gửi {pg.id}
                  </button>
                )}
                <button className={chipCls(quick === "dc")} onClick={() => toggle("dc")}>
                  🗂️ Đơn cha {p.id}
                  {anh_em.length > 1 ? ` ×${anh_em.length} · ${soXong}/${anh_em.length} xong` : ""}
                </button>
                {pt ? (
                  <button className={chipCls(quick === "pt")} onClick={() => toggle("pt")}>
                    ↩️ Phiếu trả {pt.id}
                  </button>
                ) : (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs text-[var(--ink-faint)] border border-dashed border-[var(--line)]">↩️ Phiếu trả: chưa có</span>
                )}
                {odoo && (
                  <button className={chipCls(quick === "odoo")} onClick={() => toggle("odoo")}>
                    🧾 Odoo {odoo.ma_don || odoo.odoo_id}
                  </button>
                )}
              </div>
              {quick === "pg" &&
                pg &&
                quickBox(
                  <>
                    <p>
                      <b>{pg.id}</b> · {TRANG_THAI_PHIEU_GUI_LABELS[pg.trang_thai] ?? pg.trang_thai}
                      {pg.admin_tiep_nhan ? " · Admin đã nhận nội bộ" : pg.trang_thai === "da_tiep_nhan" ? " · chờ bàn giao Admin" : ""} · {pg.so_don} đơn
                    </p>
                    <p className="text-xs text-[var(--ink-soft)]">
                      {[HINH_THUC_GUI_LABELS[pg.hinh_thuc_gui || ""] ?? pg.hinh_thuc_gui, pg.don_vi_van_chuyen, pg.ma_xe_hoac_tai_xe, pg.ma_van_don ? `vận đơn ${pg.ma_van_don}` : null, pg.ngay_gui_xe ? `gửi ${pg.ngay_gui_xe}` : null]
                        .filter(Boolean)
                        .join(" · ") || "Chưa có thông tin vận chuyển"}
                    </p>
                  </>,
                  canOpenPg ? (
                    <Btn size="sm" onClick={() => setOpenPg(true)}>
                      Mở phiếu gửi
                    </Btn>
                  ) : undefined,
                )}
              {quick === "dc" &&
                quickBox(
                  <>
                    <p className="mb-1">
                      <b>{p.id}</b> · tạo {fmtDate(p.created_at)}
                      {p.case_id ? ` · case ${p.case_id}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {anh_em.map((x) => (
                        <button
                          key={x.id}
                          title={x.id === u.id ? "Đang xem" : `Mở ${x.id}`}
                          disabled={x.id === u.id}
                          onClick={() => {
                            setQuick(null);
                            setCurId(x.id);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs ring-1 ${x.id === u.id ? "bg-[var(--accent-soft)] ring-[var(--brand-300)] font-bold text-[var(--accent-ink)]" : "bg-white ring-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--accent-soft)]"}`}
                        >
                          <span className="font-mono">#{x.so_thu_tu}</span>
                          <span>{TRANG_THAI_UNIT_LABELS[x.trang_thai] ?? x.trang_thai}</span>
                        </button>
                      ))}
                    </div>
                  </>,
                )}
              {quick === "pt" &&
                pt &&
                quickBox(
                  <>
                    <p>
                      <b>{pt.id}</b> · {TRANG_THAI_PHIEU_TRA_LABELS[pt.trang_thai] ?? pt.trang_thai} · {LOAI_DOI_TRU_LABELS[pt.loai_doi_tru] ?? pt.loai_doi_tru} · {pt.so_don_vi} đơn vị
                    </p>
                    <p className="text-xs text-[var(--ink-soft)]">
                      {[pt.ma_don_hang ? `ĐH ${pt.ma_don_hang}` : null, pt.ma_misa ? `MISA ${pt.ma_misa}` : null, pt.ma_van_don ? `vận đơn ${pt.ma_van_don}` : null].filter(Boolean).join(" · ") || "Chưa có mã chứng từ"} · cập nhật {fmtDate(pt.updated_at)}
                    </p>
                  </>,
                  canOpenPt ? (
                    <Btn size="sm" onClick={() => setOpenPt(true)}>
                      Mở phiếu trả
                    </Btn>
                  ) : undefined,
                )}
              {quick === "odoo" &&
                odoo &&
                quickBox(
                  <>
                    <p>
                      <b>{odoo.ma_don || odoo.odoo_id}</b> · Odoo: {odoo.trang_thai || "—"}
                      {odoo.ngay_tao ? ` · tạo ${odoo.ngay_tao}` : ""}
                    </p>
                    {odoo.tinh_trang_loi && <p className="text-xs text-[var(--ink-soft)]">Lỗi trên Odoo: {odoo.tinh_trang_loi}</p>}
                    <p className="text-xs text-[var(--ink-soft)]">
                      Báo về DVBH: {odoo.last_status ? ODOO_SC_LABELS[odoo.last_status] ?? odoo.last_status : "chưa báo"}
                      {odoo.last_sent_at ? ` · lúc ${fmtDate(odoo.last_sent_at)}` : ""}
                      {odoo.last_error ? ` · lỗi: ${odoo.last_error}` : ""}
                    </p>
                  </>,
                )}
            </Section>

            {p.case_id && <CaseSnapshotPanel caseId={p.case_id} canSync={user.la_admin_bh || user.la_qtri} soThangBh={soThangOf(effLk)} />}

            {nguoi.length > 0 && (
              <Section title="👥 Người liên quan">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                  {nguoi.map(([k, v]) => (
                    <Kv key={k} k={k} v={v} />
                  ))}
                </dl>
              </Section>
            )}

            {/* Xu ly - chi hien truong co gia tri */}
            <Section title="🛠 Xử lý">
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
                            <span className="text-[11px] text-[var(--amber-800)]"> (KTV đề xuất: {LOAI_DOI_TRU_LABELS[p.loai_doi_tru_de_xuat]})</span>
                          )}
                        </>
                      }
                    />
                  )}
                  {u.ket_qua_chan_doan && <Kv k="Kết quả chẩn đoán" v={KET_QUA_CHAN_DOAN_LABELS[u.ket_qua_chan_doan] ?? u.ket_qua_chan_doan} />}
                  {u.xu_ly_xac && <Kv k="Xử lý xác" v={XU_LY_XAC_LABELS[u.xu_ly_xac] ?? u.xu_ly_xac} />}
                  {u.thong_tin_mail_pd && <Kv k="Mail phê duyệt" v={u.thong_tin_mail_pd} />}
                  {u.ma_phe_duyet && <Kv k="Mã phê duyệt" v={u.ma_phe_duyet} />}
                  {u.so_lan_yeu_cau_lam_lai > 0 && <Kv k="Số lần làm lại" v={u.so_lan_yeu_cau_lam_lai} />}
                  {u.ly_do_tu_choi && <Kv k="Lý do huỷ" v={u.ly_do_tu_choi} wide />}
                </dl>
              ) : (
                <p className="text-[13px] text-[var(--ink-soft)]">
                  Chưa phân loại
                  {p.loai_doi_tru_de_xuat ? ` · KTV đề xuất đối trừ: ${LOAI_DOI_TRU_LABELS[p.loai_doi_tru_de_xuat]}` : ""}
                  {u.ly_do_bo_sung ? ` · Yêu cầu bổ sung: ${u.ly_do_bo_sung}` : ""}
                  {buttons.length > 0 ? " — dùng các nút bên dưới để xử lý." : "."}
                </p>
              )}
            </Section>

            {soAnh > 0 && (
              <Section title={`🖼 Ảnh (${soAnh})`}>
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
              </Section>
            )}

            {bao_cao_sai_thong_tin.length > 0 && (
              <Section title="🐞 Ghi nhận nội bộ — KTV báo cáo sai thông tin" tone="red">
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
              </Section>
            )}
          </div>

          {/* Nhat ky gop + trao doi: cot phai (desktop), xuong duoi (mobile) */}
          <aside className="min-w-0 lg:border-l lg:border-[var(--line)] lg:pl-4 flex flex-col">
            <SectionTitle className="mb-1.5">🕘 Nhật ký & trao đổi</SectionTitle>
            <LogTimeline
              className="lg:max-h-[62vh]"
              alwaysTabs={co_the_trao_doi ? ["td"] : []}
              sources={[
                { key: "td", label: "Trao đổi", icon: "💬", logs: chatLogs },
                { key: "dv", label: "Đơn vị", icon: "📦", logs: logs.don_vi },
                { key: "dc", label: "Đơn cha", icon: "🗂️", logs: logs.don_cha },
                { key: "pg", label: "Phiếu gửi", icon: "🚚", logs: logs.phieu_gui },
                { key: "pt", label: "Phiếu trả", icon: "↩️", logs: logs.phieu_tra },
              ]}
              footer={(tab) =>
                co_the_trao_doi && (tab === "all" || tab === "td") ? (
                  <div className="mt-2 flex gap-2 border-t border-[var(--line)] pt-2">
                    <Textarea
                      value={chat}
                      onChange={(e) => setChat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendChat();
                      }}
                      rows={2}
                      placeholder={`Trao đổi về thùng ${p.phieu_gui_id} (KTV, Kho, Admin cùng đọc)…`}
                      className="flex-1"
                    />
                    <Btn variant="primary" disabled={!chat.trim() || sending} onClick={sendChat}>
                      Gửi
                    </Btn>
                  </div>
                ) : null
              }
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
      {openPg && pg && <PhieuGuiDetailModal guiId={pg.id} nested onClose={() => setOpenPg(false)} onChanged={() => { onChanged(); load(); }} />}
      {openPt && pt && <PhieuTraDetailModal traId={pt.id} user={user} nested onClose={() => setOpenPt(false)} onChanged={() => { onChanged(); load(); }} />}
    </>
  );
}
