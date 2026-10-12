import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { HUONG_XU_LY_LABELS, KET_QUA_CHAN_DOAN_LABELS } from "../../lib/constants";
import { useLinhKien, lkLabel } from "../../hooks/useLinhKien";
import { UserName } from "../../hooks/useUserNames";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../ui/StatusBadge";
import { Badge, Btn, Card, Input, Spinner } from "../../ui/primitives";
import { Banner, Section } from "../../ui/DetailParts";
import { UnitDetailModal } from "./UnitDetailModal";

// Lich su sua chua bao hanh theo ma Serial hoac ID case (12/10/2026, yeu cau "thêm lịch sử sửa chữa bảo
// hành theo mã Serial hoặc ID case từng xử lý trên hệ thống"). Du lieu: GET /api/lich-su (routes/lichSu.ts).
// Dung o 2 noi: man tra cuu rieng (#/lich-su) va khoi "Lich su san pham" trong UI chi tiet don.

interface DonRow {
  id: string;
  case_id: string | null;
  ma_lk: string | null;
  mo_ta_loi: string | null;
  so_luong_khai: number;
  so_luong_thuc_nhan: number | null;
  nguon_tao: string | null;
  ten_khach_hang: string | null;
  san_pham_bh: string | null;
  phieu_gui_id: string | null;
  trang_thai_cha: string;
  created_at: string;
  ktv: string | null;
  odoo_id: number | null;
}
interface UnitRow {
  id: string;
  parent_id: string;
  so_thu_tu: number;
  trang_thai: string;
  huong_xu_ly: string | null;
  ket_qua_chan_doan: string | null;
  ma_lk_thuc_te: string | null;
  phieu_tra_id: string | null;
  updated_at: string;
}
interface CaseInfo {
  case_id: string;
  seri: string | null;
  khach_hang: string | null;
  san_pham: string | null;
  ngay_mua: string | null;
  link_crm: string | null;
  hang: string | null;
}
export interface LichSuResp {
  don: DonRow[];
  don_vi: UnitRow[];
  case_info: CaseInfo[];
  serial: string | null;
}

function LichSuList({ data, onOpenUnit }: { data: LichSuResp; onOpenUnit?: (id: string) => void }) {
  const { items } = useLinhKien();
  const lk = (ma: string | null) => (ma ? lkLabel(items.find((l) => l.ma_lk === ma)?.ten_lk, ma) : "Cả sản phẩm");
  const info = new Map(data.case_info.map((c) => [c.case_id, c]));
  return (
    <div className="space-y-2">
      {data.don.map((d, i) => {
        const ci = d.case_id ? info.get(d.case_id) : undefined;
        const units = data.don_vi.filter((x) => x.parent_id === d.id);
        return (
          <div key={d.id} className="rounded-lg border border-[var(--line)] px-3 py-2 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded-full bg-[var(--surface-2)] px-2 text-xs font-bold text-[var(--ink-soft)]">Lần {data.don.length - i}</span>
              <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.id}</span>
              <span className="text-xs text-[var(--ink-soft)]">{fmtDate(d.created_at)}</span>
              {d.ktv ? (
                <span className="text-xs">
                  👷 <UserName email={d.ktv} />
                </span>
              ) : (
                <Badge tone="violet">Khách lẻ</Badge>
              )}
              {!!d.odoo_id && <Badge tone="blue">Odoo</Badge>}
            </div>
            <p className="mt-0.5 font-medium text-[var(--ink)]">
              🔩 {lk(d.ma_lk)} <span className="text-xs font-normal text-[var(--ink-soft)]">×{d.so_luong_thuc_nhan ?? d.so_luong_khai}</span>
            </p>
            {d.mo_ta_loi && <p className="truncate text-xs text-[var(--ink-soft)]" title={d.mo_ta_loi}>Lỗi: {d.mo_ta_loi}</p>}
            <p className="text-xs text-[var(--ink-faint)]">
              {d.case_id && <span className="font-mono">{d.case_id}</span>}
              {ci?.seri && <> · Serial <b className="font-mono text-[var(--ink-soft)]">{ci.seri}</b></>}
              {(ci?.san_pham || d.san_pham_bh) && <> · {ci?.san_pham || d.san_pham_bh}</>}
              {(ci?.khach_hang || d.ten_khach_hang) && <> · KH {ci?.khach_hang || d.ten_khach_hang}</>}
              {ci?.link_crm && (
                <>
                  {" · "}
                  <a href={ci.link_crm} target="_blank" rel="noreferrer" className="text-[var(--link)] underline">
                    CRM ↗
                  </a>
                </>
              )}
            </p>
            {units.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {units.map((x) => (
                  <button
                    key={x.id}
                    disabled={!onOpenUnit}
                    onClick={onOpenUnit ? () => onOpenUnit(x.id) : undefined}
                    className={`inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-1.5 py-0.5 text-xs ${onOpenUnit ? "hover:bg-[var(--surface-2)]" : "cursor-default"}`}
                    title={onOpenUnit ? "Mở chi tiết" : undefined}
                  >
                    #{x.so_thu_tu}
                    <StatusBadge kind="unit" value={x.trang_thai} />
                    {x.huong_xu_ly && <span className="text-[var(--ink-soft)]">{HUONG_XU_LY_LABELS[x.huong_xu_ly] ?? x.huong_xu_ly}</span>}
                    {x.ket_qua_chan_doan && <span className="text-[var(--ink-faint)]">· {KET_QUA_CHAN_DOAN_LABELS[x.ket_qua_chan_doan] ?? x.ket_qua_chan_doan}</span>}
                    {x.ma_lk_thuc_te && x.ma_lk_thuc_te !== d.ma_lk && <span className="text-[var(--ink-faint)]">· thay {lk(x.ma_lk_thuc_te)}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-0.5 text-xs text-[var(--ink-faint)]">Chưa tách đơn vị (đang chờ xác nhận số lượng / chưa gửi).</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function useCanOpen() {
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  return { user, canOpen: !!user && (user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view) };
}

// Man tra cuu rieng: go Serial hoac ma case.
export function LichSuScreen() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<LichSuResp | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const { user, canOpen } = useCanOpen();
  const tim = async () => {
    const k = q.trim();
    if (k.length < 3) {
      setErr("Nhập ít nhất 3 ký tự.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      setData(await api.get<LichSuResp>(`/lich-su?q=${encodeURIComponent(k)}`));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const soDonVi = data ? data.don_vi.length : 0;
  return (
    <div className="space-y-3">
      <Card className="p-3" title="🔁 Lịch sử bảo hành theo Serial / ID case">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tim()}
            placeholder="Nhập số Serial sản phẩm hoặc ID case (VD 1001040549)"
            className="sm:max-w-md"
            autoFocus
          />
          <Btn variant="primary" disabled={busy} onClick={tim}>
            🔍 Tra cứu
          </Btn>
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">
          Tìm trong các đơn đã từng gửi bảo hành trên hệ thống. Serial lấy từ thông tin case lưu lúc tạo đơn; tìm gần đúng khi nhập từ 5 ký tự.
        </p>
        {err && <p className="mt-1 text-sm text-[var(--red-600)]">{err}</p>}
      </Card>
      {busy && <Spinner />}
      {data && !busy && (
        <Card className="p-3" title={data.don.length ? `Đã gửi bảo hành ${data.don.length} lần · ${soDonVi} đơn vị` : "Không tìm thấy"}>
          {data.don.length ? (
            <LichSuList data={data} onOpenUnit={canOpen ? setOpenUnit : undefined} />
          ) : (
            <p className="text-sm text-[var(--ink-faint)]">Chưa có đơn bảo hành nào khớp “{q.trim()}”.</p>
          )}
        </Card>
      )}
      {openUnit && user && <UnitDetailModal unitId={openUnit} user={user} onClose={() => setOpenUnit(null)} onChanged={() => tim()} />}
    </div>
  );
}

// Khoi trong UI chi tiet don: cac lan bao hanh KHAC cua cung san pham (cung case hoac cung serial).
export function LichSuSanPhamPanel({ caseId, parentId, onOpenUnit }: { caseId: string; parentId: string; onOpenUnit?: (id: string) => void }) {
  const [data, setData] = useState<LichSuResp | null>(null);
  useEffect(() => {
    setData(null);
    api
      .get<LichSuResp>(`/lich-su?case_id=${encodeURIComponent(caseId)}&exclude=${encodeURIComponent(parentId)}`)
      .then(setData)
      .catch(() => setData({ don: [], don_vi: [], case_info: [], serial: null }));
  }, [caseId, parentId]);
  if (!data || data.don.length === 0) return null;
  return (
    <Section title={`🔁 Lịch sử bảo hành sản phẩm (${data.don.length} lần khác)`}>
      <Banner tone="amber">
        Sản phẩm này đã gửi bảo hành {data.don.length} lần khác
        {data.serial ? (
          <>
            {" "}
            (cùng case hoặc cùng Serial <b className="font-mono">{data.serial}</b>)
          </>
        ) : (
          " (cùng case)"
        )}
        — kiểm tra có phải sửa lại lần 2 không.
      </Banner>
      <div className="mt-2">
        <LichSuList data={data} onOpenUnit={onOpenUnit} />
      </div>
    </Section>
  );
}
