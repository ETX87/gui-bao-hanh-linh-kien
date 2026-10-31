import { useLinhKien, lkLabel, refreshLinhKien } from "../../hooks/useLinhKien";
import { SuaDonModal, type DonSua } from "./SuaDonModal";
import { DoiMienBadge } from "../../ui/MienBadge";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StatusBadge } from "../../ui/StatusBadge";
import { api, errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select, Badge, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { LOAI_DOI_TRU_LABELS, HINH_THUC_GUI_OPTIONS, TRANG_THAI_UNIT_LABELS } from "../../lib/constants";
import { GhiChuLogPanel } from "../shared/GhiChuLogPanel";
import { LogTimeline } from "../shared/LogTimeline";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { AddDonModal } from "./AddDonModal";
import { AddDonMobileSheet } from "./AddDonMobileSheet";
import { OdooDonPickerModal } from "./OdooDonPicker";
import { QrCode } from "../../ui/QrCode";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useAuth } from "../../auth/AuthContext";
import { DetailGrid, SummaryBox, Section, Kv, Chip, Banner, SectionTitle, DETAIL_MAX_W } from "../../ui/DetailParts";
import type { DonCha, LogRow, PhieuGui } from "../../lib/types";
import { UserName, displayName, useUserNames } from "../../hooks/useUserNames";
import { readNhaXe, saveNhaXe, sortHinhThuc } from "../../lib/nhaXeCache";
import { isPureKtv } from "../../layout/routes";
import { ktvGuiStage, ktvUnitStage } from "../../lib/ktvStage";
import { StageBadge } from "./KtvCards";

const HINH_THUC_OPTIONS = HINH_THUC_GUI_OPTIONS;

interface DetailResponse {
  phieu_gui: PhieuGui;
  don_cha: DonCha[];
  goi_y?: { ma_xe: string[]; dvvc: string[] };
  logs?: LogRow[];
  tien_do?: { parent_id: string; trang_thai: string; tra_trang_thai?: string | null; n: number }[];
  mien_ktv?: string | null;
}
const MIEN_TEN = (m: string | null | undefined) => (m === "MB" ? "Miền Bắc" : m === "MN" ? "Miền Nam" : "Chưa khai báo");

// Chi tiet phieu gui: sua thong tin van chuyen (khi con "nhap"), them/xoa don, xac nhan gui xe, xoa
// phieu (khi con "nhap" va rong), trao doi, QR dan thung (ma hoa g.id).
//
// Thiet ke lai 10/10/2026 ("xu ly lai toan bo cac giao dien UI chi tiet"): bo modal kin man hinh, cung
// khuon 2 cot voi UI chi tiet don bao hanh (ui/DetailParts.tsx) - trai: tom tat (KTV, so don, ngay gui,
// kho nhan), van chuyen, danh sach don gon kem TIEN DO tung don (dem don vi theo trang thai - moi);
// phai: QR + trao doi + nhat ky phieu gui (moi - truoc day man nay khong co nhat ky).

// actions (21/10/2026): nut thao tac cua man goi (VD Kho "Xác nhận tiếp nhận", Admin "Xác nhận đã nhận") hien o
// footer khi thung khong con nhap - mo thung xem ben trong roi tiep nhan ngay trong chi tiet.
export function PhieuGuiDetailModal({ guiId, onClose, onChanged, nested, actions }: { guiId: string; onClose: () => void; onChanged: () => void; nested?: boolean; actions?: ReactNode }) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  const [data, setData] = useState<DetailResponse | null>(null);
  const { items: lkItems } = useLinhKien();
  const lkName = (ma: string | null) => (ma ? lkLabel(lkItems.find((l) => l.ma_lk === ma)?.ten_lk, ma) : "Cả sản phẩm");
  const [hinhThuc, setHinhThuc] = useState("");
  const [maXe, setMaXe] = useState("");
  const [dvvc, setDvvc] = useState("");
  const [maVanDon, setMaVanDon] = useState("");
  const [ngayGuiXe, setNgayGuiXe] = useState("");
  // 30/10/2026 (UX mobile KTV): khoi van chuyen thu gon 1 dong, bam "Sửa" moi mo form.
  const [vcOpen, setVcOpen] = useState(false);
  // 31/10/2026: thong tin xe tu dien tu lan gui truoc -> nhac KTV kiem tra lai cho toi khi mo sua / doi.
  const [vcChecked, setVcChecked] = useState(false);
  // "" = gui ve kho theo khu vuc cua KTV; "MB"/"MN" = chon tay mien kho nhan (KTV MB gui ra MN sua...).
  const [mienGui, setMienGui] = useState("");
  const [addDonOpen, setAddDonOpen] = useState(false);
  const [odooOpen, setOdooOpen] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [suaDon, setSuaDon] = useState<DonSua | null>(null);
  const [busy, setBusy] = useState(false);
  useUserNames();
  // O van chuyen chi khoi tao 1 LAN khi mo phieu - cac lan tai lai sau thao tac (them don, xoa don...)
  // khong ghi de thong tin KTV dang go do (truoc 12/10/2026 them 1 don la mat thong tin chua luu).
  const inited = useRef(false);

  const load = () =>
    api.get<DetailResponse>(`/phieu-gui/${guiId}`).then((r) => {
      setData(r);
      if (inited.current) return;
      inited.current = true;
      const g0 = r.phieu_gui;
      let ht = g0.hinh_thuc_gui || "xe_noi_bo";
      let mx = g0.ma_xe_hoac_tai_xe || "";
      let dv = g0.don_vi_van_chuyen || "";
      // Bo nho tren may (12/10/2026): thung nhap moi (chua co don) -> uu tien lua chon + thong tin lan
      // truoc cua KTV nay; thung nhap dang lam do -> chi dien vao o con trong.
      if (g0.trang_thai === "nhap") {
        const c = readNhaXe(g0.nguoi_tao);
        if (c && r.don_cha.length === 0) {
          ht = c.last;
          mx = c.by[c.last]?.maXe ?? mx;
          dv = c.by[c.last]?.dvvc ?? dv;
        } else if (c?.by[ht]) {
          mx = mx || c.by[ht].maXe;
          dv = dv || c.by[ht].dvvc;
        }
        // Giao truc tiep: nguoi giao = chinh KTV so huu thung.
        if (ht === "giao_truc_tiep") {
          mx = displayName(g0.nguoi_tao);
          dv = "";
        }
      }
      setHinhThuc(ht);
      setMaXe(mx);
      setDvvc(dv);
      setMaVanDon(g0.ma_van_don || "");
      setNgayGuiXe(g0.ngay_gui_xe || "");
      setMienGui(g0.mien && g0.mien !== (r.mien_ktv ?? null) ? g0.mien : "");
    });
  // Don Odoo vua them co the mang linh kien moi tu them vao danh muc -> danh sach cache tren may chua
  // co ten; tai lai danh muc 1 lan (server da tang version).
  const missingLk = !!data && lkItems.length > 0 && data.don_cha.some((d) => d.ma_lk && !lkItems.some((l) => l.ma_lk === d.ma_lk));
  useEffect(() => {
    if (missingLk) refreshLinhKien();
  }, [missingLk]);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guiId]);

  const run = async (fn: () => Promise<void>, refreshOuter = true) => {
    setBusy(true);
    try {
      await fn();
      if (refreshOuter) onChanged();
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // Dong modal ma phieu con "nhap" VA chua co don nao -> tu dong xoa luon (yeu cau 07/09/2026 "không
  // tạo ra phiếu nháp thừa"), trung dieu kien nut "Xoá phiếu" thu cong.
  const handleClose = () => {
    if (data && data.phieu_gui.trang_thai === "nhap" && data.don_cha.length === 0) {
      api
        .delete(`/phieu-gui/${data.phieu_gui.id}`)
        .then(() => {
          toast("Đã tự động xoá phiếu nháp trống (chưa có đơn nào).", "ok");
          onChanged();
        })
        .catch(() => {});
    }
    onClose();
  };

  if (!data) {
    return (
      <Modal title="Chi tiết phiếu gửi" onClose={handleClose} maxWidthClass={DETAIL_MAX_W}>
        <Spinner />
      </Modal>
    );
  }
  const g = data.phieu_gui;
  const isNhap = g.trang_thai === "nhap";
  const canOpenUnit = !nested && !!user && (user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view);
  const tienDoOf = (parentId: string) => (data.tien_do ?? []).filter((x) => x.parent_id === parentId);
  // 30/10/2026 (ra soat UX mobile KTV, de xuat 4): KTV / dien thoai -> danh sach don len dau, van chuyen
  // thu gon 1 dong, chi 1 nut luu (o day), nhan trang thai theo goc nhin KTV, an Mien / SLA / doi tru.
  const ktvView = !!user && isPureKtv(user);
  const gon = ktvView || isMobile;

  const giaoTrucTiep = hinhThuc === "giao_truc_tiep";
  const cache = isNhap ? readNhaXe(g.nguoi_tao) : null;
  const options = sortHinhThuc(HINH_THUC_OPTIONS, cache);
  // 12/10/2026: "giao trực tiếp, người giao = KTV đang báo tạo đơn bảo hành" - tu dien ten KTV so huu
  // thung, khong cho sua.
  const nguoiGiao = giaoTrucTiep ? displayName(g.nguoi_tao) : maXe;
  const header = { hinh_thuc_gui: hinhThuc, ma_xe_hoac_tai_xe: nguoiGiao, don_vi_van_chuyen: giaoTrucTiep ? "" : dvvc, ma_van_don: giaoTrucTiep ? "" : maVanDon, mien_gui: mienGui };
  const nhoCache = () => saveNhaXe(g.nguoi_tao, hinhThuc, nguoiGiao, giaoTrucTiep ? "" : dvvc);
  // Doi hinh thuc gui: lay lai thong tin da nhap rieng cho hinh thuc do (neu co tren may nay).
  const doiHinhThuc = (v: string) => {
    const prev = hinhThuc;
    setVcChecked(true);
    setHinhThuc(v);
    if (v === "giao_truc_tiep") return;
    const c = cache?.by[v];
    if (c) {
      setMaXe(c.maXe);
      setDvvc(c.dvvc);
    } else if (prev === "giao_truc_tiep") {
      setMaXe("");
    }
  };
  const tuDienNote =
    isNhap && !vcChecked && !giaoTrucTiep && (maXe || dvvc) ? (
      <p className="mb-2 rounded-lg bg-[var(--amber-100)] px-3 py-1.5 text-xs font-semibold text-[var(--amber-800)]">
        ↺ Thông tin xe được tự điền theo lần gửi trước — kiểm tra lại đúng xe / nhà xe hôm nay trước khi gửi.
      </p>
    ) : null;
  const saveHeader = () =>
    run(async () => {
      setVcChecked(true);
      await api.patch(`/phieu-gui/${g.id}`, header);
      nhoCache();
      toast("Đã lưu.", "ok");
      load();
    }, false);
  // "Luu nhap, gui sau" (12/10/2026 - tra loi "nếu ktv thực tế chưa gửi xe mà mới chỉ tạo ra để đó thì
  // sao?"): luu thong tin roi dong - thung van la NHAP, Kho chua thay, KTV mo lai xac nhan khi gui that.
  const luuNhapDong = () =>
    run(async () => {
      await api.patch(`/phieu-gui/${g.id}`, header);
      nhoCache();
      toast("Đã lưu nháp — thùng CHƯA gửi. Khi giao hàng thật, mở lại và bấm “Xác nhận đã gửi xe”.", "ok");
      onClose();
    });
  // "Xac nhan da gui xe" tu PATCH thong tin van chuyen truoc roi moi POST (Phat hien 9 ra soat UX).
  const xacNhanGui = () =>
    run(async () => {
      await api.patch(`/phieu-gui/${g.id}`, header);
      nhoCache();
      const r = await api.post<{ tu_tiep_nhan?: boolean; so_don_vi?: number }>(`/phieu-gui/${g.id}/xac-nhan-gui`, { ngay_gui_xe: ngayGuiXe });
      if (r.tu_tiep_nhan) toast(`Thùng do Admin BH tạo — đã tự bỏ qua Kho + tiếp nhận nội bộ, ${r.so_don_vi ?? 0} đơn vị vào thẳng hàng chờ phân loại.`, "ok");
      else toast(giaoTrucTiep ? "Đã lưu thông tin & xác nhận đã giao hàng." : "Đã lưu thông tin & xác nhận gửi xe.", "ok");
    });
  const goiYMaXe = [...new Set([...(cache?.recentMaXe ?? []), ...(data.goi_y?.ma_xe ?? [])])];
  const goiYDvvc = [...new Set([...(cache?.recentDvvc ?? []), ...(data.goi_y?.dvvc ?? [])])];
  const xoaPhieu = () =>
    run(async () => {
      await api.delete(`/phieu-gui/${g.id}`);
      toast("Đã xoá phiếu.", "ok");
      onClose();
    });
  const xoaDon = (donId: string) => run(async () => { await api.delete(`/phieu-gui/don/${donId}`); toast("Đã xoá đơn.", "ok"); });

  return (
    <>
      <Modal
        title={g.id}
        onClose={handleClose}
        maxWidthClass={DETAIL_MAX_W}
        headerActions={ktvView ? <StageBadge stage={ktvGuiStage(g.trang_thai)} /> : <StatusBadge kind="gui" value={g.trang_thai} />}
        footerActions={
          isNhap ? (
            <>
              {data.don_cha.length === 0 && (
                <Btn variant="danger" disabled={busy} onClick={xoaPhieu}>
                  Xoá phiếu
                </Btn>
              )}
              {data.don_cha.length > 0 && (
                <Btn disabled={busy} onClick={luuNhapDong} title="Thùng vẫn là nháp, Kho chưa thấy. Mở lại để xác nhận khi đã gửi thật.">
                  💾 Lưu nháp, gửi sau
                </Btn>
              )}
              <Btn variant="primary" disabled={busy || data.don_cha.length === 0} onClick={xacNhanGui}>
                {giaoTrucTiep ? "Xác nhận đã giao hàng" : "Xác nhận đã gửi xe"}
              </Btn>
            </>
          ) : (
            actions
          )
        }
      >
        <DetailGrid
          side={
            <>
              <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-2.5">
                <QrCode text={g.id} sizePx={84} />
                <p className="text-xs text-[var(--ink-soft)]">Mã QR dán lên thùng — Kho quét để tiếp nhận nhanh.</p>
              </div>
              <GhiChuLogPanel guiId={g.id} />
              {(data.logs?.length ?? 0) > 0 && (
                <div>
                  <SectionTitle className="mb-1.5">🕘 Nhật ký phiếu gửi</SectionTitle>
                  <LogTimeline className="lg:max-h-[40vh]" sources={[{ key: "pg", label: "Phiếu gửi", icon: "🚚", logs: data.logs ?? [] }]} />
                </div>
              )}
            </>
          }
        >
          {g.nguoi_tao_ho && (
            <Banner tone="blue">
              Được tạo hộ bởi <UserName email={g.nguoi_tao_ho} /> cho KTV <UserName email={g.nguoi_tao} />
            </Banner>
          )}

          <SummaryBox>
            <p className="text-[15px] font-bold text-[var(--ink)]">
              👷 <UserName email={g.nguoi_tao} />
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Chip icon="📦" title="Số đơn trong phiếu">
                {data.don_cha.length} đơn
              </Chip>
              <Chip icon="🕒" title="Tạo lúc">
                Tạo {fmtDate(g.created_at)}
              </Chip>
              {g.ngay_gui_xe && !isNhap && (
                <Chip icon="🚚" title="Ngày gửi xe">
                  Gửi xe {g.ngay_gui_xe}
                </Chip>
              )}
              {g.thoi_gian_nhan_kho && (
                <Chip icon="📥" title="Kho tiếp nhận lúc">
                  Kho nhận {fmtDate(g.thoi_gian_nhan_kho)}
                </Chip>
              )}
              {g.thoi_gian_nhan_kho && !ktvView && <SlaBadge since={g.thoi_gian_nhan_kho} />}
              {!ktvView && <DoiMienBadge kind="phieu-gui" id={g.id} mien={g.mien} ktvEmail={g.nguoi_tao} onDone={load} />}
            </div>
          </SummaryBox>

          {isNhap && data.don_cha.length > 0 && ktvView && (
            <Banner tone="amber">📝 Thùng chưa gửi — Kho chưa thấy. Chỉ bấm “{giaoTrucTiep ? "Xác nhận đã giao hàng" : "Xác nhận đã gửi xe"}” khi hàng đã giao cho xe.</Banner>
          )}
          {isNhap && data.don_cha.length > 0 && !ktvView && (
            <Banner tone="amber">
              📝 Thùng đang là <b>nháp</b> — Kho chưa thấy thùng này. Nếu chưa gửi hàng thật, bấm “💾 Lưu nháp, gửi sau”; chỉ bấm “
              {giaoTrucTiep ? "Xác nhận đã giao hàng" : "Xác nhận đã gửi xe"}” khi hàng đã được giao cho xe / mang tới Kho.
            </Banner>
          )}

          {!!g.su_co_tiep_nhan && (
            <Banner tone="red">
              ⚠ Kho báo sự cố tiếp nhận: {g.su_co_ly_do} {g.su_co_ghi_chu && `— ${g.su_co_ghi_chu}`}
            </Banner>
          )}

          {gon ? (
            <>
          <Section
            title={gon ? `📦 Đơn trong thùng (${data.don_cha.length})` : `📦 Đơn bảo hành trong phiếu (${data.don_cha.length})`}
            right={
              isNhap ? (
                <>
                  <Btn size="sm" onClick={() => setOdooOpen(true)}>
                    🧾 <span className="hidden sm:inline">Chọn đơn </span>Odoo
                  </Btn>
                  <Btn size="sm" variant="primary" onClick={() => setAddDonOpen(true)}>
                    + Thêm<span className="hidden sm:inline"> đơn</span>
                  </Btn>
                </>
              ) : undefined
            }
          >
            {data.don_cha.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-faint)]">Chưa có đơn nào — bấm “+ Thêm đơn” hoặc “Chọn đơn Odoo” trước khi xác nhận gửi.</p>
            ) : (
              <div className="divide-y divide-[var(--line)] -mx-1">
                {data.don_cha.map((d) => {
                  const td = tienDoOf(d.id);
                  const clickable = (canOpenUnit && td.length > 0) || isNhap;
                  return (
                    <div
                      key={d.id}
                      onClick={clickable ? () => (isNhap ? setSuaDon(d) : setOpenUnit(`${d.id}-1`)) : undefined}
                      className={`px-1 py-1.5 text-[13px] ${clickable ? "cursor-pointer rounded-md hover:bg-[var(--surface-2)]" : ""}`}
                      title={isNhap ? "Bấm để sửa linh kiện, số lượng, mô tả lỗi, loại đối trừ" : clickable ? "Mở chi tiết đơn" : undefined}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.id}</span>
                        <span className="min-w-0 max-w-full truncate font-medium text-[var(--ink)]" title={lkName(d.ma_lk)}>
                          {lkName(d.ma_lk)}
                        </span>
                        <span className="text-xs text-[var(--ink-soft)]">×{d.so_luong_khai}</span>
                        {!!d.odoo_id && <Badge tone="blue">Odoo</Badge>}
                        {d.loai_doi_tru_de_xuat && !ktvView && <Badge tone="gray">{LOAI_DOI_TRU_LABELS[d.loai_doi_tru_de_xuat]}</Badge>}
                        {td.map((x) => (
                          <Badge key={x.trang_thai} tone="gray" className="!font-medium">
                            {x.n} {ktvView ? ktvUnitStage({ id: "", trang_thai: x.trang_thai, tra_trang_thai: x.tra_trang_thai }).label : TRANG_THAI_UNIT_LABELS[x.trang_thai] ?? x.trang_thai}
                          </Badge>
                        ))}
                        {isNhap && (
                          <span className="ml-auto text-xs font-semibold text-[var(--link)]">✎ Sửa</span>
                        )}
                        {isNhap && (
                          <Btn
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              xoaDon(d.id);
                            }}
                            disabled={busy}
                            className="!text-[var(--red-600)] hover:!bg-[var(--red-50)]"
                          >
                            ✕ Xoá
                          </Btn>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--ink-soft)]" title={d.mo_ta_loi || ""}>
                        {d.case_id && <span className="font-mono">{d.case_id} · </span>}
                        {d.mo_ta_loi}
                      </p>
                      {d.case_xac_minh === 1 && <p className="mt-0.5 text-[11px] font-semibold text-[var(--amber-800)]">⏳ Mã case chưa xác minh (hệ DVBH không phản hồi lúc tạo) — hệ thống sẽ tự kiểm tra lại</p>}
                      {d.case_xac_minh === 2 && <p className="mt-0.5 text-[11px] font-semibold text-[var(--red-700)]">✖ Xác minh mã case thất bại: {d.case_xac_minh_loi || "sai mã case"}</p>}
                      {d.xac_nhan_khac_ktv && <p className="mt-0.5 text-[11px] font-semibold text-[var(--amber-800)]">⚠ Tạo thay — case thuộc KTV khác ({d.ktv_tren_case || "không xác định"})</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
          <Section
            title="🚚 Vận chuyển"
            right={
              isNhap && !gon ? (
                <Btn size="sm" onClick={saveHeader} disabled={busy}>
                  Lưu nháp
                </Btn>
              ) : isNhap && gon ? (
                <Btn size="sm" onClick={() => { setVcOpen((v) => !v); setVcChecked(true); }}>
                  {vcOpen ? "Thu gọn" : "✎ Sửa"}
                </Btn>
              ) : undefined
            }
          >
            {tuDienNote}
            {isNhap && gon && !vcOpen ? (
              <button type="button" className="w-full text-left text-[13px] text-[var(--ink-body)]" onClick={() => { setVcOpen(true); setVcChecked(true); }}>
                <b>{options.find((o) => o.value === hinhThuc)?.label || "Chưa chọn cách gửi"}</b>
                {[nguoiGiao, giaoTrucTiep ? "" : dvvc, giaoTrucTiep ? "" : maVanDon, ngayGuiXe && `${giaoTrucTiep ? "giao" : "gửi"} ${ngayGuiXe}`].filter(Boolean).map((x) => ` · ${x}`).join("")}
                {!giaoTrucTiep && !maXe && <span className="ml-1 font-semibold text-[var(--amber-700)]">· chưa nhập mã xe / tài xế</span>}
              </button>
            ) : isNhap ? (
              <>
                {/* 11/10/2026: hang 1 = Hinh thuc gui + Ngay gui lien nhau; hang 2 = 3 thong tin con lai. */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                  <div className="sm:col-span-2">
                    <Field label="Hình thức gửi">
                      <Select value={hinhThuc} onChange={(e) => doiHinhThuc(e.target.value)}>
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label={hinhThuc === "giao_truc_tiep" ? "Ngày giao" : "Ngày gửi xe"}>
                      <Input type="date" value={ngayGuiXe} onChange={(e) => setNgayGuiXe(e.target.value)} />
                    </Field>
                  </div>
                  {/* 21/10/2026: khu vuc gui hang dong - KTV mien nay gui ve kho mien kia sua chua. */}
                  <div className="sm:col-span-2">
                    <Field label={ktvView ? "Gửi về kho" : "Gửi về kho miền"}>
                      <Select value={mienGui} onChange={(e) => setMienGui(e.target.value)} title="Thùng sẽ do Kho / Admin BH của miền này xử lý">
                        <option value="">Theo khu vực của KTV ({MIEN_TEN(data.mien_ktv)})</option>
                        {data.mien_ktv !== "MB" && <option value="MB">Miền Bắc (gửi khác khu vực)</option>}
                        {data.mien_ktv !== "MN" && <option value="MN">Miền Nam (gửi khác khu vực)</option>}
                      </Select>
                    </Field>
                  </div>
                  <div className={hinhThuc === "giao_truc_tiep" ? "sm:col-span-6" : "sm:col-span-2"}>
                    <Field label={hinhThuc === "giao_truc_tiep" ? "Người giao hàng" : "Mã xe / Tài xế"}>
                      {giaoTrucTiep ? (
                        <Input value={nguoiGiao} readOnly title="Giao trực tiếp: người giao là chính KTV của thùng" />
                      ) : (
                        <Input value={maXe} onChange={(e) => { setMaXe(e.target.value); setVcChecked(true); }} list="goiy-ma-xe" autoComplete="off" />
                      )}
                    </Field>
                  </div>
                  {hinhThuc !== "giao_truc_tiep" && (
                    <>
                      <div className="sm:col-span-2">
                        <Field label="Đơn vị vận chuyển">
                          <Input value={dvvc} onChange={(e) => { setDvvc(e.target.value); setVcChecked(true); }} list="goiy-dvvc" autoComplete="off" />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Mã vận đơn">
                          <Input value={maVanDon} onChange={(e) => setMaVanDon(e.target.value)} />
                        </Field>
                      </div>
                    </>
                  )}
                </div>
                {/* Goi y go nhanh tu cac lan gui truoc cua KTV (05/10/2026 muc 4). */}
                <datalist id="goiy-ma-xe">
                  {goiYMaXe.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <datalist id="goiy-dvvc">
                  {goiYDvvc.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">Lựa chọn + thông tin lần trước được nhớ trên máy này. Bấm xác nhận sẽ tự lưu toàn bộ thông tin vận chuyển.</p>
              </>
            ) : (
              <dl className="grid grid-cols-2 sm:grid-cols-6 gap-x-4 gap-y-1.5">
                <div className="sm:col-span-2">
                  <Kv k="Hình thức gửi" v={HINH_THUC_OPTIONS.find((o) => o.value === g.hinh_thuc_gui)?.label || g.hinh_thuc_gui || "—"} />
                </div>
                <div className="sm:col-span-2">
                  <Kv k={g.hinh_thuc_gui === "giao_truc_tiep" ? "Ngày giao" : "Ngày gửi xe"} v={g.ngay_gui_xe || "—"} />
                </div>
                <div className="sm:col-span-2">
                  <Kv k="Gửi về kho miền" v={MIEN_TEN(g.mien) + (g.mien && data.mien_ktv && g.mien !== data.mien_ktv ? ` (KTV thuộc ${MIEN_TEN(data.mien_ktv)})` : "")} />
                </div>
                <div className="sm:col-span-2">
                  <Kv k={g.hinh_thuc_gui === "giao_truc_tiep" ? "Người giao hàng" : "Mã xe / Tài xế"} v={g.ma_xe_hoac_tai_xe || "—"} />
                </div>
                {g.hinh_thuc_gui !== "giao_truc_tiep" && (
                  <>
                    <div className="sm:col-span-2">
                      <Kv k="Đơn vị vận chuyển" v={g.don_vi_van_chuyen || "—"} />
                    </div>
                    <div className="sm:col-span-2">
                      <Kv k="Mã vận đơn" v={g.ma_van_don || "—"} />
                    </div>
                  </>
                )}
              </dl>
            )}
          </Section>

            </>
          ) : (
            <>
          <Section
            title="🚚 Vận chuyển"
            right={
              isNhap && !gon ? (
                <Btn size="sm" onClick={saveHeader} disabled={busy}>
                  Lưu nháp
                </Btn>
              ) : isNhap && gon ? (
                <Btn size="sm" onClick={() => { setVcOpen((v) => !v); setVcChecked(true); }}>
                  {vcOpen ? "Thu gọn" : "✎ Sửa"}
                </Btn>
              ) : undefined
            }
          >
            {tuDienNote}
            {isNhap && gon && !vcOpen ? (
              <button type="button" className="w-full text-left text-[13px] text-[var(--ink-body)]" onClick={() => { setVcOpen(true); setVcChecked(true); }}>
                <b>{options.find((o) => o.value === hinhThuc)?.label || "Chưa chọn cách gửi"}</b>
                {[nguoiGiao, giaoTrucTiep ? "" : dvvc, giaoTrucTiep ? "" : maVanDon, ngayGuiXe && `${giaoTrucTiep ? "giao" : "gửi"} ${ngayGuiXe}`].filter(Boolean).map((x) => ` · ${x}`).join("")}
                {!giaoTrucTiep && !maXe && <span className="ml-1 font-semibold text-[var(--amber-700)]">· chưa nhập mã xe / tài xế</span>}
              </button>
            ) : isNhap ? (
              <>
                {/* 11/10/2026: hang 1 = Hinh thuc gui + Ngay gui lien nhau; hang 2 = 3 thong tin con lai. */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                  <div className="sm:col-span-2">
                    <Field label="Hình thức gửi">
                      <Select value={hinhThuc} onChange={(e) => doiHinhThuc(e.target.value)}>
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label={hinhThuc === "giao_truc_tiep" ? "Ngày giao" : "Ngày gửi xe"}>
                      <Input type="date" value={ngayGuiXe} onChange={(e) => setNgayGuiXe(e.target.value)} />
                    </Field>
                  </div>
                  {/* 21/10/2026: khu vuc gui hang dong - KTV mien nay gui ve kho mien kia sua chua. */}
                  <div className="sm:col-span-2">
                    <Field label={ktvView ? "Gửi về kho" : "Gửi về kho miền"}>
                      <Select value={mienGui} onChange={(e) => setMienGui(e.target.value)} title="Thùng sẽ do Kho / Admin BH của miền này xử lý">
                        <option value="">Theo khu vực của KTV ({MIEN_TEN(data.mien_ktv)})</option>
                        {data.mien_ktv !== "MB" && <option value="MB">Miền Bắc (gửi khác khu vực)</option>}
                        {data.mien_ktv !== "MN" && <option value="MN">Miền Nam (gửi khác khu vực)</option>}
                      </Select>
                    </Field>
                  </div>
                  <div className={hinhThuc === "giao_truc_tiep" ? "sm:col-span-6" : "sm:col-span-2"}>
                    <Field label={hinhThuc === "giao_truc_tiep" ? "Người giao hàng" : "Mã xe / Tài xế"}>
                      {giaoTrucTiep ? (
                        <Input value={nguoiGiao} readOnly title="Giao trực tiếp: người giao là chính KTV của thùng" />
                      ) : (
                        <Input value={maXe} onChange={(e) => { setMaXe(e.target.value); setVcChecked(true); }} list="goiy-ma-xe" autoComplete="off" />
                      )}
                    </Field>
                  </div>
                  {hinhThuc !== "giao_truc_tiep" && (
                    <>
                      <div className="sm:col-span-2">
                        <Field label="Đơn vị vận chuyển">
                          <Input value={dvvc} onChange={(e) => { setDvvc(e.target.value); setVcChecked(true); }} list="goiy-dvvc" autoComplete="off" />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Mã vận đơn">
                          <Input value={maVanDon} onChange={(e) => setMaVanDon(e.target.value)} />
                        </Field>
                      </div>
                    </>
                  )}
                </div>
                {/* Goi y go nhanh tu cac lan gui truoc cua KTV (05/10/2026 muc 4). */}
                <datalist id="goiy-ma-xe">
                  {goiYMaXe.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <datalist id="goiy-dvvc">
                  {goiYDvvc.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">Lựa chọn + thông tin lần trước được nhớ trên máy này. Bấm xác nhận sẽ tự lưu toàn bộ thông tin vận chuyển.</p>
              </>
            ) : (
              <dl className="grid grid-cols-2 sm:grid-cols-6 gap-x-4 gap-y-1.5">
                <div className="sm:col-span-2">
                  <Kv k="Hình thức gửi" v={HINH_THUC_OPTIONS.find((o) => o.value === g.hinh_thuc_gui)?.label || g.hinh_thuc_gui || "—"} />
                </div>
                <div className="sm:col-span-2">
                  <Kv k={g.hinh_thuc_gui === "giao_truc_tiep" ? "Ngày giao" : "Ngày gửi xe"} v={g.ngay_gui_xe || "—"} />
                </div>
                <div className="sm:col-span-2">
                  <Kv k="Gửi về kho miền" v={MIEN_TEN(g.mien) + (g.mien && data.mien_ktv && g.mien !== data.mien_ktv ? ` (KTV thuộc ${MIEN_TEN(data.mien_ktv)})` : "")} />
                </div>
                <div className="sm:col-span-2">
                  <Kv k={g.hinh_thuc_gui === "giao_truc_tiep" ? "Người giao hàng" : "Mã xe / Tài xế"} v={g.ma_xe_hoac_tai_xe || "—"} />
                </div>
                {g.hinh_thuc_gui !== "giao_truc_tiep" && (
                  <>
                    <div className="sm:col-span-2">
                      <Kv k="Đơn vị vận chuyển" v={g.don_vi_van_chuyen || "—"} />
                    </div>
                    <div className="sm:col-span-2">
                      <Kv k="Mã vận đơn" v={g.ma_van_don || "—"} />
                    </div>
                  </>
                )}
              </dl>
            )}
          </Section>

          <Section
            title={gon ? `📦 Đơn trong thùng (${data.don_cha.length})` : `📦 Đơn bảo hành trong phiếu (${data.don_cha.length})`}
            right={
              isNhap ? (
                <>
                  <Btn size="sm" onClick={() => setOdooOpen(true)}>
                    🧾 <span className="hidden sm:inline">Chọn đơn </span>Odoo
                  </Btn>
                  <Btn size="sm" variant="primary" onClick={() => setAddDonOpen(true)}>
                    + Thêm<span className="hidden sm:inline"> đơn</span>
                  </Btn>
                </>
              ) : undefined
            }
          >
            {data.don_cha.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-faint)]">Chưa có đơn nào — bấm “+ Thêm đơn” hoặc “Chọn đơn Odoo” trước khi xác nhận gửi.</p>
            ) : (
              <div className="divide-y divide-[var(--line)] -mx-1">
                {data.don_cha.map((d) => {
                  const td = tienDoOf(d.id);
                  const clickable = (canOpenUnit && td.length > 0) || isNhap;
                  return (
                    <div
                      key={d.id}
                      onClick={clickable ? () => (isNhap ? setSuaDon(d) : setOpenUnit(`${d.id}-1`)) : undefined}
                      className={`px-1 py-1.5 text-[13px] ${clickable ? "cursor-pointer rounded-md hover:bg-[var(--surface-2)]" : ""}`}
                      title={isNhap ? "Bấm để sửa linh kiện, số lượng, mô tả lỗi, loại đối trừ" : clickable ? "Mở chi tiết đơn" : undefined}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.id}</span>
                        <span className="min-w-0 max-w-full truncate font-medium text-[var(--ink)]" title={lkName(d.ma_lk)}>
                          {lkName(d.ma_lk)}
                        </span>
                        <span className="text-xs text-[var(--ink-soft)]">×{d.so_luong_khai}</span>
                        {!!d.odoo_id && <Badge tone="blue">Odoo</Badge>}
                        {d.loai_doi_tru_de_xuat && !ktvView && <Badge tone="gray">{LOAI_DOI_TRU_LABELS[d.loai_doi_tru_de_xuat]}</Badge>}
                        {td.map((x) => (
                          <Badge key={x.trang_thai} tone="gray" className="!font-medium">
                            {x.n} {ktvView ? ktvUnitStage({ id: "", trang_thai: x.trang_thai, tra_trang_thai: x.tra_trang_thai }).label : TRANG_THAI_UNIT_LABELS[x.trang_thai] ?? x.trang_thai}
                          </Badge>
                        ))}
                        {isNhap && (
                          <span className="ml-auto text-xs font-semibold text-[var(--link)]">✎ Sửa</span>
                        )}
                        {isNhap && (
                          <Btn
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              xoaDon(d.id);
                            }}
                            disabled={busy}
                            className="!text-[var(--red-600)] hover:!bg-[var(--red-50)]"
                          >
                            ✕ Xoá
                          </Btn>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--ink-soft)]" title={d.mo_ta_loi || ""}>
                        {d.case_id && <span className="font-mono">{d.case_id} · </span>}
                        {d.mo_ta_loi}
                      </p>
                      {d.case_xac_minh === 1 && <p className="mt-0.5 text-[11px] font-semibold text-[var(--amber-800)]">⏳ Mã case chưa xác minh (hệ DVBH không phản hồi lúc tạo) — hệ thống sẽ tự kiểm tra lại</p>}
                      {d.case_xac_minh === 2 && <p className="mt-0.5 text-[11px] font-semibold text-[var(--red-700)]">✖ Xác minh mã case thất bại: {d.case_xac_minh_loi || "sai mã case"}</p>}
                      {d.xac_nhan_khac_ktv && <p className="mt-0.5 text-[11px] font-semibold text-[var(--amber-800)]">⚠ Tạo thay — case thuộc KTV khác ({d.ktv_tren_case || "không xác định"})</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
            </>
          )}
        </DetailGrid>
      </Modal>
      {odooOpen && (
        <OdooDonPickerModal
          guiId={g.id}
          ktvEmail={g.nguoi_tao}
          onClose={() => setOdooOpen(false)}
          onDone={(msg) => {
            setOdooOpen(false);
            toast(msg, "ok");
            load();
            onChanged();
          }}
        />
      )}
      {addDonOpen &&
        (isMobile ? (
          <AddDonMobileSheet guiId={g.id} ktvEmail={g.nguoi_tao} onClose={() => setAddDonOpen(false)} onDone={() => { setAddDonOpen(false); load(); onChanged(); }} />
        ) : (
          <AddDonModal guiId={g.id} ktvEmail={g.nguoi_tao} onClose={() => setAddDonOpen(false)} onDone={() => { setAddDonOpen(false); load(); onChanged(); }} />
        ))}
      {suaDon && <SuaDonModal don={suaDon} onClose={() => setSuaDon(null)} onDone={() => { setSuaDon(null); onChanged(); load(); }} />}
      {openUnit && user && <UnitDetailModal unitId={openUnit} user={user} nested onClose={() => setOpenUnit(null)} onChanged={() => { onChanged(); load(); }} />}
    </>
  );
}
