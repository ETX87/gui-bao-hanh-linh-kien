import type { Env } from "../types";
import { nowVN } from "./vnTime";

// ANH LUU TREN GOOGLE DRIVE (12/11/2026, v1.113). Yeu cau: "Anh tren toan bo he thong phai luu tren link drive da lien ket, khong
// cho phep luu tren R2 hoac D1 cua he thong". Truoc day anh luu thang base64 trong D1 (412/462 MB database la anh). Nay:
// - suachua KHONG co ket noi Drive rieng: gui anh qua Service Binding LINHKIEN_SERVICE toi POST /api/suachua-partner/anh cua
//   linh-kien-app -> tai len CHINH tai khoan Google Drive da ket noi o Cai dat ben do, chia se cong khai theo link.
// - D1 chi luu link Drive tra ve (anh_url). MOI cho ghi anh phai qua chuanHoaAnh() - khong INSERT thang chuoi client gui.
// - Anh cu (data URL trong D1) chuyen dan sang Drive o cron 15 phut (chuyenAnhCuSangDrive).

export const ANH_TOI_DA_BYTE = 6 * 1024 * 1024; // anh da giai ma (anh goc cu toi ~3,5 MB; anh moi da nen ~150-400 KB)
export const ANH_TOI_DA_MOT_LAN = 10;
const HOST_DRIVE = new Set(["drive.google.com", "lh3.googleusercontent.com", "docs.google.com"]);

export function laLinkDrive(url: unknown): boolean {
  if (typeof url !== "string" || url.length > 1000) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && HOST_DRIVE.has(u.hostname);
  } catch {
    return false;
  }
}

function laAnhThat(b: Uint8Array): boolean {
  if (b.length < 12) return false;
  const s = (f: number, t: number) => String.fromCharCode(...b.slice(f, t));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true; // JPEG
  if (b[0] === 0x89 && s(1, 4) === "PNG") return true;
  if (s(0, 4) === "GIF8") return true;
  if (s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return true;
  if (s(4, 8) === "ftyp") return true; // HEIC/HEIF
  return false;
}

function giaiMaDataUrl(url: string): { bytes: Uint8Array; mime: string } | null {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(url.slice(0, 64));
  if (!m) return null;
  const b64 = url.slice(m[0].length);
  if (b64.length > Math.ceil((ANH_TOI_DA_BYTE * 4) / 3) + 8) return null;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, mime: m[1].toLowerCase() };
  } catch {
    return null;
  }
}

export class AnhLoi extends Error {
  constructor(public code: string, message?: string) {
    super(message || code);
  }
}

/** Tai 1 anh (bytes) len Drive qua linh-kien-app, tra link thumbnail cong khai. Nem AnhLoi neu that bai. */
export async function taiAnhLenDrive(env: Env, bytes: Uint8Array, mime: string, ten: string): Promise<string> {
  if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) throw new AnhLoi("DRIVE_CHUA_CAU_HINH");
  if (bytes.byteLength > ANH_TOI_DA_BYTE) throw new AnhLoi("ANH_QUA_LON");
  if (!laAnhThat(bytes)) throw new AnhLoi("DINH_DANG_ANH_KHONG_HO_TRO");
  const res = await Promise.race([
    env.LINHKIEN_SERVICE.fetch(`https://linhkien/api/suachua-partner/anh?ten=${encodeURIComponent(ten)}`, {
      method: "POST",
      headers: { "Content-Type": mime, "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY },
      body: bytes,
    }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new AnhLoi("DRIVE_KHONG_PHAN_HOI")), 40000)),
  ]);
  const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string; message?: string };
  if (!res.ok || !j.url || !laLinkDrive(j.url)) throw new AnhLoi(j.error || `DRIVE_HTTP_${res.status}`, j.message);
  return j.url;
}

/**
 * Chuan hoa danh sach anh client / doi tac gui len TRUOC khi ghi D1: link Drive giu nguyen; data URL anh -> tai len Drive;
 * link http(s) khac (VD anh tu khovan) -> tai ve roi dua len Drive. Tra mang link Drive (cung thu tu). Nem AnhLoi neu 1 anh
 * khong hop le / tai that bai (khong ghi gi ca - noi goi bao loi, nguoi dung gui lai).
 */
export async function chuanHoaAnh(env: Env, input: unknown, tenGoc: string): Promise<string[]> {
  if (input == null) return [];
  if (!Array.isArray(input)) throw new AnhLoi("ANH_KHONG_HOP_LE");
  const ds = input.filter((x) => typeof x === "string" && x.trim()) as string[];
  if (ds.length > ANH_TOI_DA_MOT_LAN) throw new AnhLoi("QUA_NHIEU_ANH");
  const out: string[] = [];
  for (let i = 0; i < ds.length; i++) {
    const s = ds[i].trim();
    const ten = `${tenGoc}_${Date.now()}_${i + 1}`;
    if (laLinkDrive(s)) {
      out.push(s);
      continue;
    }
    if (s.startsWith("data:")) {
      const d = giaiMaDataUrl(s);
      if (!d) throw new AnhLoi(s.length > ANH_TOI_DA_BYTE * 1.4 ? "ANH_QUA_LON" : "DINH_DANG_ANH_KHONG_HO_TRO");
      out.push(await taiAnhLenDrive(env, d.bytes, d.mime, ten));
      continue;
    }
    if (/^https?:\/\//i.test(s) && s.length <= 2000) {
      const r = await fetch(s, { signal: AbortSignal.timeout(15000) }).catch(() => null);
      if (!r || !r.ok) throw new AnhLoi("TAI_ANH_NGUON_THAT_BAI");
      const mime = (r.headers.get("Content-Type") || "image/jpeg").split(";")[0].trim().toLowerCase();
      if (!mime.startsWith("image/")) throw new AnhLoi("DINH_DANG_ANH_KHONG_HO_TRO");
      const buf = new Uint8Array(await r.arrayBuffer());
      out.push(await taiAnhLenDrive(env, buf, mime, ten));
      continue;
    }
    throw new AnhLoi("ANH_KHONG_HOP_LE");
  }
  return out;
}

// ---------- Chuyen anh cu (data URL trong D1) sang Drive ----------
const BANG_ANH = [
  { bang: "phieu_sua_chua_bh_anh", ten: "parent_id" },
  { bang: "phieu_sua_chua_bh_ct_anh", ten: "unit_id" },
  { bang: "phieu_tra_bh_anh", ten: "phieu_tra_id" },
] as const;

/** Chuyen toi da `max` anh data URL cu sang Drive (cron 15 phut). Anh loi thi bo qua (ghi nhan), lan sau thu lai. */
export async function chuyenAnhCuSangDrive(env: Env, max = 25, deadlineMs = 20000): Promise<{ chuyen: number; loi: number; con_lai: number }> {
  const batDau = Date.now();
  let chuyen = 0;
  let loi = 0;
  let loiCuoi = "";
  for (const b of BANG_ANH) {
    // id lon nhat da thu ma loi - de 1 anh hong khong chan ca hang doi
    const bo = await env.DB.prepare("SELECT value FROM sync_state WHERE key = ?").bind(`anh_drive_bo_${b.bang}`).first<{ value: string }>();
    const boQua = new Set<number>(bo?.value ? (JSON.parse(bo.value) as number[]) : []);
    while (chuyen + loi < max && Date.now() - batDau < deadlineMs) {
      const r = await env.DB.prepare(
        `SELECT id, ${b.ten} AS ref, anh_url FROM ${b.bang} WHERE anh_url LIKE 'data:%' AND id NOT IN (SELECT value FROM json_each(?)) ORDER BY id LIMIT 1`,
      )
        .bind(JSON.stringify([...boQua]))
        .first<{ id: number; ref: string; anh_url: string }>();
      if (!r) break;
      try {
        const d = giaiMaDataUrl(r.anh_url);
        if (!d) throw new AnhLoi("DATA_URL_HONG");
        const url = await taiAnhLenDrive(env, d.bytes, d.mime, `${r.ref}_cu_${r.id}`);
        await env.DB.prepare(`UPDATE ${b.bang} SET anh_url = ? WHERE id = ? AND anh_url LIKE 'data:%'`).bind(url, r.id).run();
        chuyen++;
      } catch (e) {
        loi++;
        loiCuoi = `${b.bang}#${r.id}: ${e instanceof Error ? e.message : String(e)}`;
        const code = e instanceof AnhLoi ? e.code : "";
        // Loi cua chinh anh (hong / qua lon / sai dinh dang) -> bo qua vinh vien; loi mang/Drive -> dung lan nay, lan sau thu lai.
        if (["DATA_URL_HONG", "ANH_QUA_LON", "DINH_DANG_ANH_KHONG_HO_TRO"].includes(code)) {
          boQua.add(r.id);
          await env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
            .bind(`anh_drive_bo_${b.bang}`, JSON.stringify([...boQua]), nowVN())
            .run();
        } else break;
      }
    }
  }
  const dem = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM phieu_sua_chua_bh_anh WHERE anh_url LIKE 'data:%') + (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct_anh WHERE anh_url LIKE 'data:%') + (SELECT COUNT(*) FROM phieu_tra_bh_anh WHERE anh_url LIKE 'data:%') AS n",
  ).first<{ n: number }>();
  const ketQua = { chuyen, loi, con_lai: dem?.n ?? 0 };
  if (chuyen || loi) {
    await env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('anh_drive_last', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind(JSON.stringify({ ...ketQua, loi_cuoi: loiCuoi || null, luc: nowVN() }), nowVN())
      .run();
  }
  return ketQua;
}
