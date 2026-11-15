import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { useRoute } from "../router/Router";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { isIosSafari, isStandalonePwa } from "../hooks/usePwaInstall";

// 15/11/2026 - Chuong thong bao: ban tong hop viec ton 1 lan / ngay luc 12h theo tung vai tro (backend lib/thongBao.ts).
// Cung noi dung voi thong bao day (Web Push) cho nguoi da bat tren may.

interface Muc {
  nhan: string;
  so: number;
  link: string;
  gap?: boolean;
}
interface Nhom {
  vai: string;
  muc: Muc[];
}
interface TbItem {
  id: number;
  ngay: string;
  tieu_de: string;
  tom_tat: string;
  tong: number;
  da_doc: boolean;
  created_at: string;
  nhom: Nhom[];
}
interface TbRes {
  items: TbItem[];
  chua_doc: number;
  gio_bao: number;
  da_toi_gio: boolean;
  so_thiet_bi: number;
}

const ddmm = (ngay: string) => `${ngay.slice(8, 10)}/${ngay.slice(5, 7)}/${ngay.slice(0, 4)}`;

function NhomList({ nhom, onGo }: { nhom: Nhom[]; onGo: (link: string) => void }) {
  if (!nhom.length) return <p className="text-sm text-[var(--ink-soft)]">Không có việc nào đang chờ bạn. 🎉</p>;
  return (
    <div className="space-y-2.5">
      {nhom.map((n) => (
        <div key={n.vai}>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)] mb-1">{n.vai}</p>
          <ul className="space-y-1">
            {n.muc.map((m, i) => (
              <li key={i}>
                <button
                  onClick={() => onGo(m.link)}
                  className={`focus-ring w-full text-left flex items-start gap-2 rounded-lg px-2.5 py-1.5 border transition-colors ${
                    m.gap ? "border-[var(--red-200)] bg-[var(--red-50)] hover:bg-[var(--red-100)]" : "border-[var(--line)] bg-white hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  <span className={`shrink-0 min-w-[2rem] text-right font-bold tabular-nums ${m.gap ? "text-[var(--red-700)]" : "text-[var(--accent-ink)]"}`}>{m.so}</span>
                  <span className="text-sm text-[var(--ink-body)] flex-1">
                    {m.gap && "⚠ "}
                    {m.nhan}
                  </span>
                  <span className="text-[var(--ink-faint)] text-xs shrink-0 mt-0.5">›</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PushBox({ soThietBi, onChanged }: { soThietBi: number; onChanged: () => void }) {
  const push = usePushNotifications();
  const toast = useToast();
  const [thu, setThu] = useState(false);
  if (!push.checked) return null;
  if (!push.supported) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink-soft)]">
        {isIosSafari() && !isStandalonePwa()
          ? "📱 iPhone: bấm Chia sẻ → “Thêm vào Màn hình chính”, mở app từ màn hình chính rồi bật thông báo ở đây (cần iOS 16.4 trở lên)."
          : "Trình duyệt này không hỗ trợ thông báo đẩy — bạn vẫn xem được bản tổng hợp tại chuông này."}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-[var(--brand-200)] bg-[var(--accent-soft)] px-3 py-2 flex flex-wrap items-center gap-2">
      <p className="text-xs text-[var(--ink-body)] flex-1 min-w-[12rem]">
        {push.subscribed ? (
          <>
            🔔 <b>Đang bật</b> thông báo trên máy này — 12h trưa mỗi ngày (trừ Chủ nhật) sẽ có 1 thông báo tổng hợp.
            {soThietBi > 1 && ` (${soThietBi} thiết bị)`}
          </>
        ) : (
          <>🔕 Chưa bật thông báo trên máy này. Bật để nhận 1 thông báo tổng hợp lúc 12h trưa mỗi ngày.</>
        )}
      </p>
      {push.subscribed ? (
        <>
          <button
            disabled={thu}
            onClick={async () => {
              setThu(true);
              try {
                await api.post("/thong-bao/push/thu");
                toast("Đã gửi thông báo thử — kiểm tra khay thông báo.", "ok");
              } catch (e) {
                toast(errorMessage(e), "error");
              } finally {
                setThu(false);
              }
            }}
            className="focus-ring rounded-lg border border-[var(--line-strong)] bg-white px-2.5 py-1 text-xs font-semibold"
          >
            {thu ? "Đang gửi…" : "Gửi thử"}
          </button>
          <button
            disabled={push.busy}
            onClick={() => push.unsubscribe().then(onChanged).catch((e) => toast(errorMessage(e), "error"))}
            className="focus-ring rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--ink-soft)] hover:bg-white"
          >
            Tắt
          </button>
        </>
      ) : (
        <button
          disabled={push.busy}
          onClick={() =>
            push
              .subscribe()
              .then(() => {
                toast("Đã bật thông báo trên máy này.", "ok");
                onChanged();
              })
              .catch((e) => toast(e instanceof Error ? e.message : errorMessage(e), "error"))
          }
          className="focus-ring rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white"
        >
          {push.busy ? "Đang bật…" : "🔔 Bật thông báo trên máy này"}
        </button>
      )}
    </div>
  );
}

function ThongBaoPanel({ data, onClose, reload }: { data: TbRes | null; onClose: () => void; reload: () => void }) {
  const { nav } = useRoute();
  const toast = useToast();
  const [xemTruoc, setXemTruoc] = useState<{ tieu_de: string; nhom: Nhom[] } | null>(null);
  const [dangXem, setDangXem] = useState(false);
  const go = (link: string) => {
    onClose();
    nav(link);
  };
  const homNay = data?.items[0]?.ngay === new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10) ? data.items[0] : null;
  return (
    <Modal title="🔔 Thông báo tổng hợp" onClose={onClose} maxWidthClass="max-w-lg">
      <div className="space-y-3">
        <PushBox soThietBi={data?.so_thiet_bi ?? 0} onChanged={reload} />
        {!data ? (
          <p className="text-sm text-[var(--ink-soft)]">Đang tải…</p>
        ) : (
          <>
            {!homNay && (
              <div className="rounded-lg border border-dashed border-[var(--line-strong)] px-3 py-2 text-sm text-[var(--ink-body)]">
                {data.da_toi_gio ? "Hôm nay chưa có bản tổng hợp." : `Bản tổng hợp hôm nay sẽ có lúc ${data.gio_bao}:00 (trừ Chủ nhật).`}{" "}
                <button
                  disabled={dangXem}
                  className="font-semibold text-[var(--link)] hover:underline"
                  onClick={async () => {
                    setDangXem(true);
                    try {
                      setXemTruoc(await api.get<{ tieu_de: string; nhom: Nhom[] }>("/thong-bao/xem-truoc"));
                    } catch (e) {
                      toast(errorMessage(e), "error");
                    } finally {
                      setDangXem(false);
                    }
                  }}
                >
                  {dangXem ? "Đang tính…" : "Xem số liệu ngay bây giờ"}
                </button>
              </div>
            )}
            {xemTruoc && (
              <div className="rounded-xl border border-[var(--brand-200)] p-3">
                <p className="font-semibold text-[var(--ink)] mb-2">Bây giờ: {xemTruoc.tieu_de.replace(/^\S+\s/, "")}</p>
                <NhomList nhom={xemTruoc.nhom} onGo={go} />
              </div>
            )}
            {data.items.length === 0 && !xemTruoc && <p className="text-sm text-[var(--ink-soft)]">Chưa có bản tổng hợp nào.</p>}
            {data.items.map((it, i) => (
              <details key={it.id} open={i === 0} className="rounded-xl border border-[var(--line)] bg-white">
                <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2">
                  {!it.da_doc && it.tong > 0 && <span className="w-2 h-2 rounded-full bg-[var(--red-600)] shrink-0" />}
                  <span className="font-semibold text-sm text-[var(--ink)] flex-1">{it.tieu_de}</span>
                  <span className="text-xs text-[var(--ink-faint)] shrink-0">{ddmm(it.ngay)}</span>
                </summary>
                <div className="px-3 pb-3">
                  <NhomList nhom={it.nhom} onGo={go} />
                  {i === 0 && <p className="text-[11px] text-[var(--ink-faint)] mt-2">Số liệu chốt lúc {it.created_at.slice(11, 16)} — mở từng màn để xem số mới nhất.</p>}
                </div>
              </details>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

export function ThongBaoBell({ onDark }: { onDark?: boolean }) {
  const [data, setData] = useState<TbRes | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => {
    api
      .get<TbRes>("/thong-bao")
      .then(setData)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    // Tai lai moi 15 phut khi tab dang hien + khi quay lai tab (bat duoc ban 12h ma khong can F5).
    const t = setInterval(() => document.visibilityState === "visible" && load(), 15 * 60_000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    // Bam thong bao day -> mo app o #/home?thong_bao=1 -> tu mo chuong.
    if (/thong_bao=1/.test(location.hash)) setOpen(true);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);
  const chuaDoc = data?.chua_doc ?? 0;
  const mo = () => {
    setOpen(true);
    if (chuaDoc > 0) api.post("/thong-bao/doc-het").then(load).catch(() => undefined);
  };
  return (
    <>
      <button
        onClick={mo}
        title={chuaDoc ? `${chuaDoc} bản tổng hợp chưa đọc` : "Thông báo tổng hợp"}
        className={`focus-ring relative shrink-0 rounded-lg px-2 py-1 text-base leading-none ${onDark ? "hover:bg-white/10" : "hover:bg-[var(--accent-soft)]"}`}
      >
        🔔
        {chuaDoc > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--red-600)] ring-2 ring-white" />}
      </button>
      {open && <ThongBaoPanel data={data} onClose={() => setOpen(false)} reload={load} />}
    </>
  );
}
