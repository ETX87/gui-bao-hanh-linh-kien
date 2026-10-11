import { useLinhKien, lkLabel, refreshLinhKien } from "../../hooks/useLinhKien";
import { useEffect, useState } from "react";
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
import { DetailGrid, SummaryBox, Section, KvGrid, Kv, Chip, Banner, SectionTitle, DETAIL_MAX_W } from "../../ui/DetailParts";
import type { DonCha, LogRow, PhieuGui } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

const HINH_THUC_OPTIONS = HINH_THUC_GUI_OPTIONS;

interface DetailResponse {
  phieu_gui: PhieuGui;
  don_cha: DonCha[];
  goi_y?: { ma_xe: string[]; dvvc: string[] };
  logs?: LogRow[];
  tien_do?: { parent_id: string; trang_thai: string; n: number }[];
}

// Chi tiet phieu gui: sua thong tin van chuyen (khi con "nhap"), them/xoa don, xac nhan gui xe, xoa
// phieu (khi con "nhap" va rong), trao doi, QR dan thung (ma hoa g.id).
//
// Thiet ke lai 10/10/2026 ("xu ly lai toan bo cac giao dien UI chi tiet"): bo modal kin man hinh, cung
// khuon 2 cot voi UI chi tiet don bao hanh (ui/DetailParts.tsx) - trai: tom tat (KTV, so don, ngay gui,
// kho nhan), van chuyen, danh sach don gon kem TIEN DO tung don (dem don vi theo trang thai - moi);
// phai: QR + trao doi + nhat ky phieu gui (moi - truoc day man nay khong co nhat ky).

export function PhieuGuiDetailModal({ guiId, onClose, onChanged, nested }: { guiId: string; onClose: () => void; onChanged: () => void; nested?: boolean }) {
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
  const [addDonOpen, setAddDonOpen] = useState(false);
  const [odooOpen, setOdooOpen] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get<DetailResponse>(`/phieu-gui/${guiId}`).then((r) => {
      setData(r);
      setHinhThuc(r.phieu_gui.hinh_thuc_gui || "xe_noi_bo");
      setMaXe(r.phieu_gui.ma_xe_hoac_tai_xe || "");
      setDvvc(r.phieu_gui.don_vi_van_chuyen || "");
      setMaVanDon(r.phieu_gui.ma_van_don || "");
      setNgayGuiXe(r.phieu_gui.ngay_gui_xe || "");
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

  const header = { hinh_thuc_gui: hinhThuc, ma_xe_hoac_tai_xe: maXe, don_vi_van_chuyen: dvvc, ma_van_don: maVanDon };
  const saveHeader = () => run(async () => { await api.patch(`/phieu-gui/${g.id}`, header); toast("Đã lưu.", "ok"); }, false);
  // "Xac nhan da gui xe" tu PATCH thong tin van chuyen truoc roi moi POST (Phat hien 9 ra soat UX).
  const xacNhanGui = () =>
    run(async () => {
      await api.patch(`/phieu-gui/${g.id}`, header);
      await api.post(`/phieu-gui/${g.id}/xac-nhan-gui`, { ngay_gui_xe: ngayGuiXe });
      toast("Đã lưu thông tin & xác nhận gửi xe.", "ok");
    });
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
        headerActions={<StatusBadge kind="gui" value={g.trang_thai} />}
        footerActions={
          isNhap ? (
            <>
              {data.don_cha.length === 0 && (
                <Btn variant="danger" disabled={busy} onClick={xoaPhieu}>
                  Xoá phiếu
                </Btn>
              )}
              <Btn variant="primary" disabled={busy || data.don_cha.length === 0} onClick={xacNhanGui}>
                Xác nhận đã gửi xe
              </Btn>
            </>
          ) : undefined
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
              <div>
                <SectionTitle className="mb-1.5">🕘 Nhật ký phiếu gửi</SectionTitle>
                <LogTimeline className="lg:max-h-[40vh]" sources={[{ key: "pg", label: "Phiếu gửi", icon: "🚚", logs: data.logs ?? [] }]} />
              </div>
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
              {g.thoi_gian_nhan_kho && <SlaBadge since={g.thoi_gian_nhan_kho} />}
            </div>
          </SummaryBox>

          {!!g.su_co_tiep_nhan && (
            <Banner tone="red">
              ⚠ Kho báo sự cố tiếp nhận: {g.su_co_ly_do} {g.su_co_ghi_chu && `— ${g.su_co_ghi_chu}`}
            </Banner>
          )}

          <Section
            title="🚚 Vận chuyển"
            right={
              isNhap ? (
                <Btn size="sm" onClick={saveHeader} disabled={busy}>
                  Lưu nháp
                </Btn>
              ) : undefined
            }
          >
            {isNhap ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  <Field label="Hình thức gửi">
                    <Select value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)}>
                      {HINH_THUC_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Mã xe / Tài xế">
                    <Input value={maXe} onChange={(e) => setMaXe(e.target.value)} list="goiy-ma-xe" autoComplete="off" />
                  </Field>
                  <Field label="Đơn vị vận chuyển">
                    <Input value={dvvc} onChange={(e) => setDvvc(e.target.value)} list="goiy-dvvc" autoComplete="off" />
                  </Field>
                  <Field label="Mã vận đơn">
                    <Input value={maVanDon} onChange={(e) => setMaVanDon(e.target.value)} />
                  </Field>
                  <Field label="Ngày gửi xe">
                    <Input type="date" value={ngayGuiXe} onChange={(e) => setNgayGuiXe(e.target.value)} />
                  </Field>
                </div>
                {/* Goi y go nhanh tu cac lan gui truoc cua KTV (05/10/2026 muc 4). */}
                <datalist id="goiy-ma-xe">
                  {(data.goi_y?.ma_xe ?? []).map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <datalist id="goiy-dvvc">
                  {(data.goi_y?.dvvc ?? []).map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">Bấm “Xác nhận đã gửi xe” sẽ tự lưu toàn bộ thông tin vận chuyển.</p>
              </>
            ) : (
              <KvGrid>
                <Kv k="Hình thức gửi" v={HINH_THUC_OPTIONS.find((o) => o.value === g.hinh_thuc_gui)?.label || g.hinh_thuc_gui || "—"} />
                <Kv k="Mã xe / Tài xế" v={g.ma_xe_hoac_tai_xe || "—"} />
                <Kv k="Đơn vị vận chuyển" v={g.don_vi_van_chuyen || "—"} />
                {g.ma_van_don && <Kv k="Mã vận đơn" v={g.ma_van_don} />}
                <Kv k="Ngày gửi xe" v={g.ngay_gui_xe || "—"} />
              </KvGrid>
            )}
          </Section>

          <Section
            title={`📦 Đơn bảo hành trong phiếu (${data.don_cha.length})`}
            right={
              isNhap ? (
                <>
                  <Btn size="sm" onClick={() => setOdooOpen(true)}>
                    🧾 Chọn đơn Odoo
                  </Btn>
                  <Btn size="sm" variant="primary" onClick={() => setAddDonOpen(true)}>
                    + Thêm đơn
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
                  const clickable = canOpenUnit && td.length > 0;
                  return (
                    <div
                      key={d.id}
                      onClick={clickable ? () => setOpenUnit(`${d.id}-1`) : undefined}
                      className={`px-1 py-1.5 text-[13px] ${clickable ? "cursor-pointer rounded-md hover:bg-[var(--surface-2)]" : ""}`}
                      title={clickable ? "Mở chi tiết đơn" : undefined}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.id}</span>
                        <span className="min-w-0 max-w-full truncate font-medium text-[var(--ink)]" title={lkName(d.ma_lk)}>
                          {lkName(d.ma_lk)}
                        </span>
                        <span className="text-xs text-[var(--ink-soft)]">×{d.so_luong_khai}</span>
                        {!!d.odoo_id && <Badge tone="blue">Odoo</Badge>}
                        {d.loai_doi_tru_de_xuat && <Badge tone="gray">{LOAI_DOI_TRU_LABELS[d.loai_doi_tru_de_xuat]}</Badge>}
                        {td.map((x) => (
                          <Badge key={x.trang_thai} tone="gray" className="!font-medium">
                            {x.n} {TRANG_THAI_UNIT_LABELS[x.trang_thai] ?? x.trang_thai}
                          </Badge>
                        ))}
                        {isNhap && (
                          <Btn
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              xoaDon(d.id);
                            }}
                            disabled={busy}
                            className="ml-auto !text-[var(--red-600)] hover:!bg-[var(--red-50)]"
                          >
                            ✕ Xoá
                          </Btn>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--ink-soft)]" title={d.mo_ta_loi || ""}>
                        {d.case_id && <span className="font-mono">{d.case_id} · </span>}
                        {d.mo_ta_loi}
                      </p>
                      {d.xac_nhan_khac_ktv && <p className="mt-0.5 text-[11px] font-semibold text-[var(--amber-800)]">⚠ Tạo thay — case thuộc KTV khác ({d.ktv_tren_case || "không xác định"})</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
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
      {openUnit && user && <UnitDetailModal unitId={openUnit} user={user} nested onClose={() => setOpenUnit(null)} onChanged={() => { onChanged(); load(); }} />}
    </>
  );
}
