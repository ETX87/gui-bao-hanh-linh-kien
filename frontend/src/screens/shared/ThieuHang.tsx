import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Badge, Btn, Field, Input, Textarea } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { Section } from "../../ui/DetailParts";
import { useLinhKien, lkOptions, useLkName } from "../../hooks/useLinhKien";
import { UserName } from "../../hooks/useUserNames";
import { fmtDate } from "../../lib/format";
import type { AppUser } from "../../lib/types";

// THIEU HANG BAO HANH (04/11/2026, backend routes/thieuHang.ts) - yeu cau thieu linh kien gui sang app Dat mua linh kien de Kho / Mua
// hang xu ly. Tu tao khi ly do cham la "Không có linh kiện" / "Hết hàng tồn kho", hoac bam tay. Trang thai ticket bao ve tu dong.

export interface ThieuHangRow {
  id: number;
  unit_id: string;
  parent_id: string;
  ma_lk: string;
  ten_lk: string | null;
  so_luong: number;
  ly_do: string | null;
  ghi_chu: string | null;
  nguon: string;
  nguoi_bao: string;
  ngay_bao: string;
  ticket_id: string | null;
  trang_thai: string;
  ngay_du_kien: string | null;
  ma_eo_mua: string | null;
  ghi_chu_xu_ly: string | null;
  nguoi_xu_ly: string | null;
  loi_gui: string | null;
  da_xem: number;
  case_id: string | null;
  ktv: string | null;
  mien: string | null;
  // v1.164: 1 = hang da ve, don vi dang sua, chua de xuat dung ma LK nay (backend HANG_VE_CHO_DX_SQL).
  cho_de_xuat?: number;
}

const TT: Record<string, { label: string; tone: "amber" | "blue" | "green" | "red" | "gray" | "orange" }> = {
  "Cho gui": { label: "Chưa gửi được sang Kho", tone: "orange" },
  "Cho kho xu ly": { label: "Chờ Kho xử lý", tone: "amber" },
  "Kho da tiep nhan": { label: "Kho tiếp nhận — chờ hàng về", tone: "blue" },
  "Cho mua hang": { label: "Chờ Mua hàng đặt", tone: "amber" },
  "Mua hang da dat": { label: "Mua hàng đã đặt", tone: "blue" },
  "Kho xac nhan hang da ve": { label: "Hàng đã về", tone: "green" },
  "Kho tu choi": { label: "Kho từ chối", tone: "red" },
  "Mua hang tu choi": { label: "Không mua được", tone: "red" },
  "Da huy": { label: "Đã rút lại", tone: "gray" },
};
export const THIEU_HANG_MO = ["Cho gui", "Cho kho xu ly", "Kho da tiep nhan", "Cho mua hang", "Mua hang da dat"];

export function ThieuHangBadge({ tt }: { tt: string }) {
  const s = TT[tt];
  return (
    <Badge tone={s?.tone || "gray"} dot={THIEU_HANG_MO.includes(tt)}>
      {s?.label || tt}
    </Badge>
  );
}

export function ChiTietDong({ r }: { r: ThieuHangRow }) {
  return (
    <span className="text-xs text-[var(--ink-soft)]">
      {r.ticket_id ? <span className="font-mono">{r.ticket_id}</span> : null}
      {r.ngay_du_kien ? ` · Dự kiến có hàng ${fmtDate(r.ngay_du_kien)}` : ""}
      {r.ma_eo_mua ? ` · EO ${r.ma_eo_mua}` : ""}
      {r.ghi_chu_xu_ly ? ` · ${r.ghi_chu_xu_ly}` : ""}
      {r.trang_thai === "Cho gui" && r.loi_gui ? ` · Lỗi gửi: ${r.loi_gui} (hệ thống tự gửi lại)` : ""}
    </span>
  );
}

// Khoi trong UI chi tiet don vi bao hanh.
export function ThieuHangSection({ unitId, defaultLk, user, nguoiSuaChua, onChanged }: { unitId: string; defaultLk: string | null; user: AppUser; nguoiSuaChua: string | null; onChanged?: () => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [rows, setRows] = useState<ThieuHangRow[] | null>(null);
  const [form, setForm] = useState(false);
  const [huy, setHuy] = useState<ThieuHangRow | null>(null);
  const quanLy = user.la_admin_bh || user.la_qtri;
  const coTheBao = quanLy || (user.la_nv_sua_chua && nguoiSuaChua === user.email);
  const load = () =>
    api
      .get<{ rows: ThieuHangRow[] }>(`/thieu-hang/don-vi/${encodeURIComponent(unitId)}`)
      .then((r) => setRows(r.rows))
      .catch(() => setRows([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);
  if (!rows) return null;
  if (!rows.length && !coTheBao) return null;
  const daNam = async (ids: number[]) => {
    try {
      await api.post("/thieu-hang/da-xem", { ids });
      load();
      onChanged?.();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const choDx = rows.filter((r) => r.cho_de_xuat);
  const chuaXem = rows.filter((r) => !r.da_xem && !THIEU_HANG_MO.includes(r.trang_thai) && r.trang_thai !== "Da huy");
  return (
    <Section
      title={`📦 Thiếu hàng (${rows.length})`}
      right={
        <>
          {quanLy && chuaXem.length > 0 && (
            <Btn size="sm" onClick={() => daNam(chuaXem.map((r) => r.id))}>
              ✔ Đã nắm
            </Btn>
          )}
          {coTheBao && (
            <Btn size="sm" onClick={() => setForm(true)}>
              + Báo thiếu hàng
            </Btn>
          )}
        </>
      }
    >
      {choDx.length > 0 && (
        <div className="mb-2 rounded-lg border border-[var(--green-200)] bg-[var(--green-50)] text-[var(--green-700)] px-3 py-2 text-[13px]">
          <b>✅ Hàng đã về — có thể đặt linh kiện để sửa chữa:</b> {choDx.map((r) => `${r.ten_lk || nameOf(r.ma_lk)} × ${r.so_luong}`).join(", ")}.
          <span className="text-[var(--ink-soft)]"> Bấm "+ Đề xuất linh kiện" (khối Đề xuất linh kiện ở trên) để tạo đơn cấp linh kiện. Cảnh báo tự hết khi đã đề xuất đúng mã này.</span>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-soft)]">Chưa báo thiếu hàng. Khi chọn lý do chậm "Không có linh kiện" / "Hết hàng tồn kho", hệ thống tự gửi yêu cầu sang Kho / Mua hàng.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {rows.map((r) => (
            <li key={r.id} className="py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13px] font-semibold truncate max-w-[60%]">
                {r.ten_lk || nameOf(r.ma_lk)} <span className="text-[var(--ink-soft)] font-normal">× {r.so_luong}</span>
              </span>
              <ThieuHangBadge tt={r.trang_thai} />
              {!!r.cho_de_xuat && <Badge tone="green">Chờ đề xuất LK</Badge>}
              {!r.da_xem && !THIEU_HANG_MO.includes(r.trang_thai) && r.trang_thai !== "Da huy" && <Badge tone="red">Mới</Badge>}
              {quanLy && THIEU_HANG_MO.includes(r.trang_thai) && (
                <Btn size="sm" variant="ghost" className="ml-auto" onClick={() => setHuy(r)}>
                  Rút lại
                </Btn>
              )}
              <div className="w-full">
                <ChiTietDong r={r} />
                <span className="text-xs text-[var(--ink-faint)]">
                  {" "}
                  · Báo {fmtDate(r.ngay_bao)} bởi <UserName email={r.nguoi_bao} />
                  {r.nguon === "tu_dong" ? " (tự động theo lý do chậm)" : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {form && (
        <BaoThieuModal
          unitId={unitId}
          defaultLk={defaultLk}
          onClose={() => setForm(false)}
          onDone={() => {
            setForm(false);
            load();
            onChanged?.();
          }}
        />
      )}
      {huy && (
        <RutLaiModal
          row={huy}
          onClose={() => setHuy(null)}
          onDone={() => {
            setHuy(null);
            load();
            onChanged?.();
          }}
        />
      )}
    </Section>
  );
}

function BaoThieuModal({ unitId, defaultLk, onClose, onDone }: { unitId: string; defaultLk: string | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items } = useLinhKien();
  const opts = lkOptions(items);
  const [maLk, setMaLk] = useState(defaultLk || "");
  const [sl, setSl] = useState("1");
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ tao: number; da_gui: number; loi?: string }>(`/thieu-hang/don-vi/${encodeURIComponent(unitId)}`, {
        items: [{ ma_lk: maLk, so_luong: Math.max(1, Math.round(Number(sl) || 1)) }],
        ghi_chu: ghiChu,
      });
      if (!r.tao) toast("Linh kiện này đã có yêu cầu thiếu hàng đang mở.", "info");
      else if (r.da_gui) toast("Đã gửi yêu cầu thiếu hàng sang Kho / Mua hàng.", "ok");
      else toast(`Đã ghi nhận — chưa gửi được sang Kho (${r.loi || "lỗi kết nối"}), hệ thống sẽ tự gửi lại.`, "error");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Báo thiếu hàng — ${unitId}`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!maLk || busy || Number(sl) < 1} onClick={submit}>
            Gửi sang Kho / Mua hàng
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-body)]">Yêu cầu sẽ thành ticket "Thiếu hàng bảo hành" bên app Đặt mua linh kiện. Kho / Mua hàng xử lý tới đâu, đơn này cập nhật tới đó.</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2">
          <Field label="Linh kiện thiếu" required>
            <SearchableSelect options={opts} value={maLk} onChange={setMaLk} placeholder="Chọn linh kiện" />
          </Field>
          <Field label="Số lượng" required>
            <Input type="number" min={1} value={sl} onChange={(e) => setSl(e.target.value)} />
          </Field>
        </div>
        <Field label="Ghi chú (tuỳ chọn)">
          <Textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function RutLaiModal({ row, onClose, onDone }: { row: ThieuHangRow; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/thieu-hang/${row.id}/huy`, { ly_do: lyDo });
      toast("Đã rút lại báo thiếu hàng.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Rút lại báo thiếu ${row.ticket_id ?? ""}`}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Đóng</Btn>
          <Btn variant="danger" disabled={busy} onClick={submit}>
            Rút lại
          </Btn>
        </>
      }
    >
      <Field label="Lý do (tuỳ chọn)">
        <Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: Đã tìm được hàng, dùng linh kiện thay thế …" autoFocus />
      </Field>
    </Modal>
  );
}

