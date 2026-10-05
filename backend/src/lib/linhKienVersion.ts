import { nowVN } from "./vnTime";

// Phien ban danh muc linh kien (05/10/2026 muc 8): client tai TOAN BO danh sach 1 lan, luu cache tren
// may, moi lan mo app chi hoi GET /linh-kien/version (1 dong) - khac phien ban moi tai lai. Tang so nay
// o MOI cho ghi linh_kien_bh/linh_kien_top_bh.
export async function bumpLinhKienVersion(db: D1Database): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sync_state (key, value, updated_at) VALUES ('linh_kien_version', '1', ?) ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = excluded.updated_at",
    )
    .bind(nowVN())
    .run();
}

export async function getLinhKienVersion(db: D1Database): Promise<string> {
  const r = await db.prepare("SELECT value FROM sync_state WHERE key = 'linh_kien_version'").first<{ value: string }>();
  return r?.value ?? "0";
}
