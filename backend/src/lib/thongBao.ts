import type { AppUser, Env } from "../types";
import { nowVN } from "./vnTime";
import { demWorkload, type Counts } from "./workload";
import { BUOC_MAP } from "./buoc";
import { demDangDung, layCanGiaiTrinh } from "../routes/buoc";
import { loadTargetUser } from "../middleware/loadUser";
import { sendPushToUser } from "./webPush";

// 15/11/2026 - Thong bao tong hop 1 lan / ngay (12h trua) theo vai tro (yeu cau: "thêm thông báo rõ ràng, chi tiết cho
// từng vai trò (chỉ gộp chung lại và báo trong 1 thông báo ví dụ 1 ngày sẽ báo 1 lần tổng hợp vào 12h trưa)").
//
// - Noi dung = so viec ton cua tung vai tro (cung cach dem voi menu, lib/workload.ts) + viec qua SLA can giai trinh
//   (routes/buoc.ts layCanGiaiTrinh) + buoc dang qua SLA nhieu nhat (BO / Giam sat / View, demDangDung).
// - Chuong trong app: tao "luoi" khi nguoi dung mo app sau 12h (GET /api/thong-bao) - khong ton luot doc cho nguoi khong mo.
// - Web Push: cron 15 phut tu 12h, chi cho nguoi da bat thong bao tren may (push_subscriptions_bh), moi lan 25 nguoi.
// - Chu nhat khong bao (SLA cung khong tinh Chu nhat).

export const GIO_BAO = 12;
const GIO_HET = 20; // sau 20h khong day push nua (tranh bao dem khuya neu cron tre)

type MucDef = { vai: string; nhan: string; link: string; gap?: boolean };
// Moi o dem -> vai tro + nhan + man mo khi bam. Thu tu = thu tu hien thi.
const MUC: Partial<Record<keyof Counts, MucDef>> = {
  ktv_thung_tu_choi: { vai: "KTV", nhan: "thùng bị Admin từ chối, chờ bạn phản hồi", link: "/home", gap: true },
  ktv_cho_bo_sung: { vai: "KTV", nhan: "đơn Admin yêu cầu bổ sung thông tin", link: "/ktv/tra-cuu", gap: true },
  ktv_nhan_hang: { vai: "KTV", nhan: "phiếu hàng trả đang về, chờ bạn xác nhận nhận", link: "/ktv/nhan-hang" },
  ktv_phieu_nhap: { vai: "KTV", nhan: "thùng nháp chưa gửi", link: "/ktv/tao-phieu" },
  ktv_odoo_cho_gui: { vai: "KTV", nhan: "đơn Odoo chờ đưa vào thùng gửi", link: "/ktv/tao-phieu" },
  kho_thung_tu_choi: { vai: "Kho", nhan: "thùng Admin từ chối, chờ Kho phản hồi", link: "/thung?tab=tu_choi", gap: true },
  kho_khieu_nai: { vai: "Kho", nhan: "khiếu nại KTV không nhận được hàng, chờ đánh giá", link: "/phieu-tra?tab=khieu_nai", gap: true },
  kho_cho_tiep_nhan: { vai: "Kho", nhan: "thùng đang về, chờ Kho tiếp nhận", link: "/thung?tab=dang_gui" },
  kho_cho_ban_giao: { vai: "Kho", nhan: "thùng chờ bàn giao cho Admin BH", link: "/thung?tab=cho_admin" },
  kho_cho_in: { vai: "Kho", nhan: "phiếu trả chờ in", link: "/phieu-tra?tab=cho_in" },
  kho_da_in: { vai: "Kho", nhan: "phiếu trả đã in, chờ gửi", link: "/phieu-tra?tab=da_in" },
  kho_lk_cho_in: { vai: "Kho", nhan: "phiếu PXK cấp linh kiện chờ in", link: "/admin/de-xuat?tab=cho_kho_in" },
  kho_lk_da_in: { vai: "Kho", nhan: "phiếu PXK cấp linh kiện chờ xuất", link: "/admin/de-xuat?tab=kho_da_in" },
  admin_phieu_tra_tu_choi: { vai: "Admin BH", nhan: "phiếu trả Kế toán trả lại", link: "/phieu-tra?tab=tu_choi_kt", gap: true },
  admin_thung_xac_tra_lai: { vai: "Admin BH", nhan: "thùng trả xác Kế toán trả lại", link: "/tra-xac", gap: true },
  admin_cho_tiep_nhan_noi_bo: { vai: "Admin BH", nhan: "thùng chờ tiếp nhận nội bộ", link: "/thung?tab=cho_admin" },
  admin_cho_xac_nhan_sl: { vai: "Admin BH", nhan: "đơn chờ xác nhận số lượng", link: "/don?tab=xu_ly" },
  admin_cho_phan_loai: { vai: "Admin BH", nhan: "đơn chờ phân loại", link: "/don?tab=xu_ly" },
  admin_cho_xac_nhan_hoan_tat: { vai: "Admin BH", nhan: "đơn chờ xác nhận hoàn tất", link: "/don?tab=hoan_tat" },
  admin_de_xuat_cho_cap: { vai: "Admin BH", nhan: "ca xin linh kiện chờ cấp", link: "/admin/de-xuat" },
  admin_thieu_hang_da_ve: { vai: "Admin BH", nhan: "yêu cầu thiếu hàng đã có kết quả", link: "/don?tab=thieu_hang" },
  admin_san_sang_gom: { vai: "Admin BH", nhan: "đơn xử lý xong chờ tạo phiếu trả", link: "/phieu-tra?tab=cho_tao" },
  nv_cho_chan_doan: { vai: "NV sửa chữa", nhan: "đơn chờ bạn sửa / nộp kết quả", link: "/don?tab=nv" },
  ketoan_cho_duyet: { vai: "Kế toán", nhan: "phiếu trả chờ duyệt", link: "/phieu-tra?tab=cho_kt" },
  ketoan_de_xuat_lk: { vai: "Kế toán", nhan: "ca cấp linh kiện chờ xác nhận MISA", link: "/phieu-tra?tab=cap_lk" },
  ketoan_thung_xac: { vai: "Kế toán", nhan: "thùng trả xác chờ duyệt", link: "/tra-xac" },
};
const THU_TU_VAI = ["KTV", "Giám sát", "Kho", "Admin BH", "NV sửa chữa", "Kế toán", "Theo dõi"];

export interface TbMuc {
  nhan: string;
  so: number;
  link: string;
  gap?: boolean;
}
export interface TbNhom {
  vai: string;
  muc: TbMuc[];
}
export interface TongHop {
  tieu_de: string;
  tom_tat: string;
  tong: number;
  nhom: TbNhom[];
}

function ddmm(ngay: string) {
  return `${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
}

/** Dung ban tong hop "ngay bay gio" cho 1 nguoi. */
export async function dungTongHop(db: D1Database, user: AppUser, now = nowVN()): Promise<TongHop> {
  const laKtvThuan = (user.la_ktv_dvbh || user.la_ve_tinh) && !(user.la_qtri || user.la_admin_bh || user.la_kho || user.la_ke_toan || user.la_nv_sua_chua || user.la_giam_sat || user.la_view);
  const [counts, gt, dd] = await Promise.all([
    demWorkload(db, user),
    layCanGiaiTrinh(db, user).catch(() => ({ items: [], len_gs: 24 })),
    laKtvThuan ? Promise.resolve([]) : demDangDung(db, user).catch(() => []),
  ]);
  const map = new Map<string, TbMuc[]>();
  const push = (vai: string, m: TbMuc) => {
    if (!map.has(vai)) map.set(vai, []);
    map.get(vai)!.push(m);
  };

  // 1) Viec can giai trinh (qua SLA, chua giai trinh) - gap nhat, dua len dau tung vai.
  const gtKtv = gt.items.filter((x) => x.vai === "ktv").length;
  const gtGs = gt.items.filter((x) => x.vai === "gs").length;
  const gtBo = gt.items.filter((x) => x.vai === "bo").length;
  if (gtKtv) push("KTV", { nhan: "việc quá SLA bạn cần giải trình", so: gtKtv, link: "/home", gap: true });
  if (gtGs) push("Giám sát", { nhan: `việc KTV khu vực quá SLA + ${gt.len_gs}h chưa giải trình — Giám sát giải trình`, so: gtGs, link: "/home", gap: true });

  // 2) Hang doi cua tung vai.
  for (const [k, def] of Object.entries(MUC) as [keyof Counts, MucDef][]) {
    const so = counts[k] ?? 0;
    if (so > 0) push(def.vai, { nhan: def.nhan, so, link: def.link, gap: def.gap });
  }
  // BO giai trinh: gan vao vai dau tien co hang doi (hoac "Theo dõi").
  if (gtBo) {
    const vaiBo = user.la_admin_bh ? "Admin BH" : user.la_kho ? "Kho" : user.la_nv_sua_chua ? "NV sửa chữa" : user.la_ke_toan ? "Kế toán" : "Admin BH";
    const ds = map.get(vaiBo) ?? [];
    ds.unshift({ nhan: "việc quá SLA ở bước bạn giữ, chưa giải trình", so: gtBo, link: "/home", gap: true });
    map.set(vaiBo, ds);
  }

  // 3) Buoc dang qua SLA nhieu nhat (theo doi chung - BO quan ly, Giam sat, View).
  const quaSla = dd.filter((r) => (r.qua_han ?? 0) > 0).sort((a, b) => b.qua_han - a.qua_han);
  const theoDoi = user.la_qtri || user.la_giam_sat || user.la_view || user.la_admin_bh;
  if (theoDoi && quaSla.length) {
    for (const r of quaSla.slice(0, 4)) {
      const b = BUOC_MAP[r.gd];
      push("Theo dõi", { nhan: `đơn quá SLA ở bước ${b ? `${b.so} · ${b.ten}` : r.gd}${r.chua_gt ? ` (${r.chua_gt} chưa giải trình)` : ""}`, so: r.qua_han, link: `/don?tab=tat_ca&trang_thai=${encodeURIComponent(r.gd)}&buoc_tt=qua_han` });
    }
  }

  const nhom: TbNhom[] = [...map.entries()]
    .sort((a, b) => THU_TU_VAI.indexOf(a[0]) - THU_TU_VAI.indexOf(b[0]))
    .map(([vai, muc]) => ({ vai, muc: [...muc].sort((x, y) => Number(!!y.gap) - Number(!!x.gap)) }));
  // Tong viec (khong cong muc "Theo dõi" de khong dem trung).
  const tong = nhom.filter((n) => n.vai !== "Theo dõi").reduce((s, n) => s + n.muc.reduce((t, m) => t + m.so, 0), 0);
  const ngay = now.slice(0, 10);
  const soGap = nhom.reduce((s, n) => s + n.muc.filter((m) => m.gap).reduce((t, m) => t + m.so, 0), 0);
  const tieu_de = tong || nhom.length ? `📋 Việc tồn ngày ${ddmm(ngay)}: ${tong} việc${soGap ? ` · ⚠ ${soGap} gấp` : ""}` : `✅ Ngày ${ddmm(ngay)}: không có việc tồn`;
  const tom_tat =
    nhom
      .map((n) => `${n.vai}: ${n.muc.slice(0, 3).map((m) => `${m.so} ${m.nhan}`).join(", ")}${n.muc.length > 3 ? "…" : ""}`)
      .join(" · ") || "Bạn không có việc nào đang chờ.";
  return { tieu_de, tom_tat, tong, nhom };
}

export interface TbRow {
  id: number;
  email: string;
  ngay: string;
  tieu_de: string;
  tom_tat: string;
  noi_dung: string;
  tong: number;
  da_doc: number;
  da_push: number;
  created_at: string;
}

function laChuNhat(ngay: string) {
  return new Date(ngay + "T00:00:00Z").getUTCDay() === 0;
}
/** Hom nay da toi gio bao chua (>= 12h, khong phai Chu nhat). */
export function denGioBao(now = nowVN()): boolean {
  return !laChuNhat(now.slice(0, 10)) && Number(now.slice(11, 13)) >= GIO_BAO;
}

/** Lay ban tong hop hom nay cua 1 nguoi; chua co va da toi gio -> tao. */
export async function layHoacTaoHomNay(db: D1Database, user: AppUser, now = nowVN()): Promise<TbRow | null> {
  const ngay = now.slice(0, 10);
  const cu = await db.prepare("SELECT * FROM thong_bao_bh WHERE email = ? AND ngay = ?").bind(user.email, ngay).first<TbRow>();
  if (cu || !denGioBao(now)) return cu ?? null;
  const th = await dungTongHop(db, user, now);
  await db
    .prepare("INSERT OR IGNORE INTO thong_bao_bh (email, ngay, tieu_de, tom_tat, noi_dung, tong, da_doc, da_push, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)")
    .bind(user.email, ngay, th.tieu_de, th.tom_tat, JSON.stringify({ nhom: th.nhom }), th.tong, now)
    .run();
  return db.prepare("SELECT * FROM thong_bao_bh WHERE email = ? AND ngay = ?").bind(user.email, ngay).first<TbRow>();
}

/** Cron 15 phut: tu 12h toi 20h, gui push ban tong hop cho nguoi da bat thong bao (moi lan toi da `max` nguoi). */
export async function maybeRunDigest(env: Env, max = 25): Promise<{ gui: number; bo_qua: number } | null> {
  // THONG_BAO_NOW_TEST: chi dung khi chay thu local (--var), production khong dat.
  const now = env.THONG_BAO_NOW_TEST || nowVN();
  if (!denGioBao(now) || Number(now.slice(11, 13)) >= GIO_HET) return null;
  if (!env.VAPID_SERVER_PRIVATE_KEY) return null;
  const ngay = now.slice(0, 10);
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT s.email FROM push_subscriptions_bh s JOIN users u ON u.email = s.email
     WHERE u.bi_khoa = 0 AND u.trang_thai_duyet = 'Da duyet'
       AND NOT EXISTS (SELECT 1 FROM thong_bao_bh t WHERE t.email = s.email AND t.ngay = ? AND t.da_push <> 0)
     LIMIT ?`,
  )
    .bind(ngay, max)
    .all<{ email: string }>();
  let gui = 0;
  let boQua = 0;
  for (const { email } of results) {
    try {
      const user = await loadTargetUser(env.DB, email);
      if (!user) {
        // Danh dau de khong lap lai trong ngay.
        await env.DB.prepare("INSERT OR IGNORE INTO thong_bao_bh (email, ngay, tieu_de, tom_tat, noi_dung, tong, da_push, created_at) VALUES (?, ?, '', '', '{}', 0, 2, ?)").bind(email, ngay, now).run();
        boQua++;
        continue;
      }
      const row = await layHoacTaoHomNay(env.DB, user, now);
      if (!row) continue;
      let trangThai = 2;
      if (row.tong > 0) {
        const ok = await sendPushToUser(env, email, { title: row.tieu_de, body: row.tom_tat.slice(0, 300), url: "/#/home?thong_bao=1" });
        if (ok > 0) {
          trangThai = 1;
          gui++;
        } else boQua++;
      } else boQua++;
      await env.DB.prepare("UPDATE thong_bao_bh SET da_push = ? WHERE id = ?").bind(trangThai, row.id).run();
    } catch (e) {
      console.error("[thongBao]", email, e instanceof Error ? e.message : e);
    }
  }
  if (results.length) console.log("[thongBao] gui", gui, "bo qua", boQua);
  return { gui, bo_qua: boQua };
}
