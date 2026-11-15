import { buildPushPayload, type PushSubscription as WebPushSubscription } from "@block65/webcrypto-web-push";
import type { Env } from "../types";

// 15/11/2026: Web Push (port tu linh-kien-app/backend/src/lib/webPush.ts). Dung cho thong bao tong hop 12h
// (lib/thongBao.ts). Subscription het han (404/410) tu xoa; loi khac LUON console.error de chan doan duoc
// khi nguoi dung bao "bat roi ma khong nhan".
export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

interface SubRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Gui toi moi thiet bi da dang ky cua 1 nguoi. Tra so thiet bi gui thanh cong. */
export async function sendPushToUser(env: Env, email: string, payload: PushPayload): Promise<number> {
  if (!env.VAPID_SERVER_PRIVATE_KEY || !env.VAPID_SERVER_PUBLIC_KEY) return 0;
  const { results } = await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions_bh WHERE email = ?").bind(email).all<SubRow>();
  if (!results.length) return 0;
  let ok = 0;
  await Promise.all(
    results.map(async (row) => {
      const sub: WebPushSubscription = { endpoint: row.endpoint, expirationTime: null, keys: { p256dh: row.p256dh, auth: row.auth } };
      try {
        const init = await buildPushPayload(
          { data: JSON.stringify(payload), options: { ttl: 6 * 3600, urgency: "normal" } },
          sub,
          { subject: env.VAPID_SUBJECT || "mailto:smarttrade.vp@gmail.com", publicKey: env.VAPID_SERVER_PUBLIC_KEY!, privateKey: env.VAPID_SERVER_PRIVATE_KEY! },
        );
        const res = await fetch(row.endpoint, init);
        if (res.status === 404 || res.status === 410) {
          await env.DB.prepare("DELETE FROM push_subscriptions_bh WHERE id = ?").bind(row.id).run();
        } else if (!res.ok) {
          console.error("[webPush]", email, res.status, (await res.text().catch(() => "")).slice(0, 200));
        } else ok++;
      } catch (e) {
        console.error("[webPush]", email, e instanceof Error ? e.message : e);
      }
    }),
  );
  return ok;
}
