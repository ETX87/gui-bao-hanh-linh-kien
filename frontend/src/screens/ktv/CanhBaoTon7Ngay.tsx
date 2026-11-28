import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useRoute } from "../../router/Router";
import { Modal } from "../../ui/Modal";
import { Btn, Badge } from "../../ui/primitives";
import { PhieuGuiDetailModal } from "./PhieuGuiDetailModal";
import type { AppUser } from "../../lib/types";

// 28/11/2026 (v1.172): "với linh kiện gửi bảo hành đã có trên hệ thống quá 7 ngày (đơn kéo từ odoo) hoặc tạo nháp trong
// thùng chưa gửi. mỗi lần ktv vào sẽ hiện popup cảnh báo nhắc nhở. yêu cầu xử lý gấp. Đặc biệt lưu ý với các đơn hãng
// không phải Karofi, Livotec, Korihome (là hãng khác). có link ấn đến vị trí các vùng cần xử lý)"
// Popup hien 1 lan moi phien mo app (sessionStorage) cho tai khoan KTV / CTV / Tram; API GET /api/odoo-don/canh-bao-7-ngay.

type OdooTon = { odoo_id: number; ma_don: string | null; case_id: string | null; ma_linh_kien: string | null; ten_linh_kien: string | null; so_luong: number | null; moc: string; hang: string | null; hang_khac: boolean };
type NhapTon = { id: string; phieu_gui_id: string; case_id: string | null; ma_lk: string | null; ten_lk: string | null; so_luong_khai: number; moc: string; hang: string | null; hang_khac: boolean };
type Resp = { so_ngay: number; odoo: OdooTon[]; nhap: NhapTon[] };

const soNgay = (moc: string) => {
  const t = Date.parse(moc.replace(" ", "T") + "+07:00");
  return Number.isNaN(t) ? 0 : Math.floor((Date.now() - t) / 86400_000);
};
const KEY = "canh_bao_ton_7_ngay_da_xem";
const MAX_DONG = 6;

function HangBadge({ hang, khac }: { hang: string | null; khac: boolean }) {
  if (!hang) return <Badge tone="gray">Chưa rõ hãng</Badge>;
  return <Badge tone={khac ? "red-solid" : "gray"}>{khac ? `⚠ Hãng khác: ${hang}` : hang}</Badge>;
}

function Dong({ ma, ten, sl, caseId, hang, khac, moc }: { ma: string | null; ten: string | null; sl: number | null; caseId: string | null; hang: string | null; khac: boolean; moc: string }) {
  const n = soNgay(moc);
  return (
    <li className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2 text-[13px] ${khac ? "bg-[var(--red-50)]" : "bg-[var(--surface-2)]"}`}>
      <span className="font-mono text-xs font-semibold text-[var(--ink)]">{ma || "—"}</span>
      <span className="min-w-0 flex-1 basis-[55%] truncate text-[var(--ink-body)]">{ten || ""}{sl ? ` ×${sl}` : ""}</span>
      <span className="text-xs text-[var(--ink-soft)]">Case {caseId || "—"}</span>
      <HangBadge hang={hang} khac={khac} />
      <b className="tabular-nums text-xs text-[var(--red-700)]">tồn {n} ngày</b>
    </li>
  );
}

export function CanhBaoTon7Ngay({ user }: { user: AppUser }) {
  const { nav } = useRoute();
  const laKtv = !!(user.la_ktv_dvbh || user.la_ve_tinh);
  const [data, setData] = useState<Resp | null>(null);
  const [open, setOpen] = useState(false);
  const [guiId, setGuiId] = useState<string | null>(null);

  useEffect(() => {
    if (!laKtv) return;
    const k = `${KEY}:${user.email}`;
    if (sessionStorage.getItem(k)) return;
    api
      .get<Resp>("/odoo-don/canh-bao-7-ngay")
      .then((r) => {
        sessionStorage.setItem(k, "1");
        setData(r);
        if (r.odoo.length + r.nhap.length > 0) setOpen(true);
      })
      .catch(() => undefined);
  }, [laKtv, user.email]);

  const thung = useMemo(() => {
    const m = new Map<string, NhapTon[]>();
    for (const d of data?.nhap ?? []) m.set(d.phieu_gui_id, [...(m.get(d.phieu_gui_id) ?? []), d]);
    // Thung co hang khac len dau, roi thung ton lau nhat.
    return [...m.entries()].sort((a, b) => Number(b[1].some((x) => x.hang_khac)) - Number(a[1].some((x) => x.hang_khac)) || a[1][0].moc.localeCompare(b[1][0].moc));
  }, [data]);

  if (!data) return null;
  const odooSorted = [...data.odoo].sort((a, b) => Number(b.hang_khac) - Number(a.hang_khac) || a.moc.localeCompare(b.moc));
  const soKhac = data.odoo.filter((d) => d.hang_khac).length + data.nhap.filter((d) => d.hang_khac).length;
  const tong = data.odoo.length + data.nhap.length;
  const denOdoo = () => {
    setOpen(false);
    nav(`/ktv/tao-phieu?tab=odoo&chon=${data.odoo.map((d) => d.odoo_id).join(",")}`);
  };

  return (
    <>
      {open && (
        <Modal
          title={`⚠️ ${tong} linh kiện tồn quá ${data.so_ngay} ngày — cần xử lý gấp`}
          onClose={() => setOpen(false)}
          maxWidthClass="max-w-3xl"
          footerActions={
            <Btn variant="secondary" size="touch" onClick={() => setOpen(false)}>
              Để sau
            </Btn>
          }
        >
          <div className="space-y-4">
            <p className="rounded-xl bg-[var(--amber-50)] px-3 py-2 text-[13px] text-[var(--amber-700)]">
              Các linh kiện dưới đây đã nằm trên hệ thống quá {data.so_ngay} ngày mà <b>chưa gửi về kho</b>. Vui lòng đóng thùng và xác nhận gửi xe ngay
              (đơn tạo nhầm trên Odoo thì bấm "Không gửi" ở danh sách đơn Odoo).
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-[var(--surface-2)] p-3">
                <p className="tabular-nums text-2xl font-bold text-[var(--ink)]">{data.odoo.length}</p>
                <p className="text-xs text-[var(--ink-soft)]">Đơn Odoo chưa đưa vào thùng</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-2)] p-3">
                <p className="tabular-nums text-2xl font-bold text-[var(--ink)]">{data.nhap.length}</p>
                <p className="text-xs text-[var(--ink-soft)]">Đơn trong {thung.length} thùng nháp chưa gửi</p>
              </div>
              <div className={`rounded-2xl p-3 ${soKhac ? "bg-[var(--red-50)]" : "bg-[var(--surface-2)]"}`}>
                <p className={`tabular-nums text-2xl font-bold ${soKhac ? "text-[var(--red-700)]" : "text-[var(--ink)]"}`}>{soKhac}</p>
                <p className="text-xs text-[var(--ink-soft)]">Hãng khác (không phải Karofi, Livotec, Korihome)</p>
              </div>
            </div>
            {soKhac > 0 && (
              <p className="rounded-xl border-l-4 border-[var(--red-500)] bg-[var(--red-50)] px-3 py-2 text-[13px] font-semibold text-[var(--red-700)]">
                🚨 Đặc biệt lưu ý {soKhac} linh kiện HÃNG KHÁC — ưu tiên gửi trước (đã xếp lên đầu, tô đỏ).
              </p>
            )}

            {data.odoo.length > 0 && (
              <section className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-[15px] font-bold text-[var(--ink)]">🧾 Đơn Odoo chưa đưa vào thùng ({data.odoo.length})</h4>
                  <Btn variant="primary" size="touch" onClick={denOdoo}>
                    Đến danh sách đơn Odoo › chọn sẵn
                  </Btn>
                </div>
                <ul className="space-y-1.5">
                  {odooSorted.slice(0, MAX_DONG).map((d) => (
                    <Dong key={d.odoo_id} ma={d.ma_linh_kien} ten={d.ten_linh_kien} sl={d.so_luong} caseId={d.case_id} hang={d.hang} khac={d.hang_khac} moc={d.moc} />
                  ))}
                </ul>
                {odooSorted.length > MAX_DONG && <p className="text-xs text-[var(--ink-soft)]">… và {odooSorted.length - MAX_DONG} đơn khác — xem đủ ở danh sách đơn Odoo.</p>}
              </section>
            )}

            {thung.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-[15px] font-bold text-[var(--ink)]">📦 Thùng nháp chưa gửi ({thung.length} thùng · {data.nhap.length} đơn)</h4>
                {thung.map(([id, ds]) => (
                  <div key={id} className="space-y-1.5 rounded-2xl bg-[var(--surface)] p-3 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[14px] font-bold text-[var(--ink)]">
                        Thùng <span className="font-mono">{id}</span> · {ds.length} đơn quá hạn
                      </p>
                      <Btn variant={ds.some((x) => x.hang_khac) ? "danger" : "primary"} size="touch" onClick={() => setGuiId(id)}>
                        Mở thùng & gửi
                      </Btn>
                    </div>
                    <ul className="space-y-1.5">
                      {[...ds].sort((a, b) => Number(b.hang_khac) - Number(a.hang_khac)).slice(0, MAX_DONG).map((d) => (
                        <Dong key={d.id} ma={d.ma_lk} ten={d.ten_lk} sl={d.so_luong_khai} caseId={d.case_id} hang={d.hang} khac={d.hang_khac} moc={d.moc} />
                      ))}
                    </ul>
                    {ds.length > MAX_DONG && <p className="text-xs text-[var(--ink-soft)]">… và {ds.length - MAX_DONG} đơn khác trong thùng.</p>}
                  </div>
                ))}
              </section>
            )}
          </div>
        </Modal>
      )}
      {guiId && <PhieuGuiDetailModal guiId={guiId} onClose={() => setGuiId(null)} onChanged={() => api.get<Resp>("/odoo-don/canh-bao-7-ngay").then(setData).catch(() => undefined)} />}
    </>
  );
}
