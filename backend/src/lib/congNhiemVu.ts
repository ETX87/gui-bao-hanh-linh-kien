// 23/11/2026 - Lien thong App Nhiem vu eOffice (Cong nhiem vu taskFeedNhan, ma app "bao-hanh-quan-tri").
// Khoa nam o secret TASK_FEED_KEY (khong ghi vao code / vars / tai lieu). Chua nap khoa -> bo qua, khong nem loi.

const CONG = "https://asia-southeast1-etx-nhan-su.cloudfunctions.net/taskFeedNhan";
export const APP_CONG = "bao-hanh-quan-tri";

export interface ViecCong { id: string; title: string; tag?: string; link?: string; han?: string; khan?: boolean; count?: number; gd?: boolean; xem?: boolean }
export type KetQuaCong = { ok: boolean; nguoi?: number; viecMoi?: number; boChoGD?: number; khongRo?: unknown[]; loi?: string; chiTiet?: string };

async function guiCong(env: { TASK_FEED_KEY?: string }, body: Record<string, unknown>): Promise<KetQuaCong> {
  if (!env.TASK_FEED_KEY) return { ok: false, loi: "CHUA_CO_KHOA" };
  for (let lan = 0; lan < 3; lan++) {
    try {
      const r = await fetch(CONG, {
        method: "POST",
        headers: { "X-Api-Key": env.TASK_FEED_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ app: APP_CONG, ...body }),
      });
      if (r.ok) return (await r.json()) as KetQuaCong;
      if (r.status < 500) {
        const chiTiet = (await r.text()).slice(0, 300);
        console.error("[congNhiemVu]", r.status, chiTiet);
        return { ok: false, loi: `HTTP_${r.status}`, chiTiet };
      }
    } catch (e) {
      console.error("[congNhiemVu] mang", e instanceof Error ? e.message : e);
    }
    await new Promise((s) => setTimeout(s, 1000 * (lan + 1)));
  }
  return { ok: false, loi: "HTTP_5XX" };
}

/** Anh chup du: ds = MOI nguoi co (hoac vua het) viec. Thieu nguoi = cong xoa viec cua ho. */
export const guiAnhChupDu = (env: { TASK_FEED_KEY?: string }, ds: { email: string; items: ViecCong[] }[]) =>
  guiCong(env, { toanBo: true, nguoi: ds.map((d) => ({ email: d.email.toLowerCase(), items: d.items.slice(0, 200) })) });

export const xongViec = (env: { TASK_FEED_KEY?: string }, ids: string[]) =>
  guiCong(env, ids.length === 1 ? { hanhDong: "xong", id: ids[0] } : { hanhDong: "xong", ids });

export const thuKhoa = (env: { TASK_FEED_KEY?: string }) => guiCong(env, { hanhDong: "thu" });
