import { Hono } from "hono";
import type { Env } from "../types";
import {
  HUONG_XU_LY_LABELS_VI,
  TRANG_THAI_CHA_VI,
  TRANG_THAI_GUI_VI,
  TRANG_THAI_TRA_VI,
  TRANG_THAI_UNIT_VI,
  GIAI_DOAN_VI,
} from "../lib/partnerCaseLabels";
import { LBL } from "../lib/constants";
import { tinhLuong, logThuocDon, type RawLog } from "../lib/partnerCaseFlow";

// 06/11/2026: API doi tac cho dvbh (CaseDetail tab "Gui BH") - "lien ket luong thong tin gui bao hanh,
// keo api tu app gui-bao-hanh-linh-kien ve hien thi tren UI". dvbh goi THEO YEU CAU khi mo 1 ca (khong
// luu D1 ben dvbh, khong cron) qua Service Binding SUACHUA_APP, cung khuon linh-kien-app
// GET /api/partner/v1/case-timeline. Chi DOC. Xac thuc X-API-Key = secret rieng DVBH_PARTNER_API_KEY
// (khong dung chung CASE_LOOKUP_API_KEY - key do la cua suachua goi SANG dvbh, chieu nguoc lai).
//
// Tra TEN nguoi thao tac, KHONG tra email nhan vien (cung quy uoc popup Lada ben dvbh). Nhan tieng Viet
// tinh san o day de dvbh khong phai chep lai state machine cua suachua.
// Chi phi D1: 1 lan tra theo idx_psc_case_id + don vi theo idx_psc_ct_parent + phieu gui/tra theo PK +
// log theo idx_logs_bh_entity - vai chuc dong/lan mo ca.
const partnerCase = new Hono<{ Bindings: Env }>();

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

partnerCase.use("*", async (c, next) => {
  const key = c.req.header("X-API-Key") ?? "";
  const expected = c.env.DVBH_PARTNER_API_KEY;
  if (!expected || !key || !safeEqual(key, expected)) return c.json({ error: "INVALID_KEY" }, 401);
  await next();
});

type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null || v === "" ? null : String(v));

function inList(n: number) {
  return Array.from({ length: n }, () => "?").join(",");
}

async function allIn<T>(db: D1Database, sql: (ph: string) => string, ids: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const { results } = await db.prepare(sql(inList(chunk.length))).bind(...chunk).all<T>();
    out.push(...results);
  }
  return out;
}

partnerCase.get("/case-timeline", async (c) => {
  const caseId = (c.req.query("id") ?? "").trim();
  if (!caseId || caseId.length > 64) return c.json({ error: "INVALID_ID" }, 400);
  const db = c.env.DB;

  const { results: parents } = await db
    .prepare(
      `SELECT p.id, p.phieu_gui_id, p.odoo_id, p.ma_lk, lk.ten_lk, p.mo_ta_loi, p.so_luong_khai, p.so_luong_thuc_nhan,
              p.ly_do_chenh_lech_sl, p.loai_doi_tru_de_xuat, p.nguon_tao, p.trang_thai_cha, p.created_at
       FROM phieu_sua_chua_bh p LEFT JOIN linh_kien_bh lk ON lk.ma_lk = p.ma_lk
       WHERE p.case_id = ? ORDER BY p.created_at, p.id`,
    )
    .bind(caseId)
    .all<Row>();
  if (parents.length === 0) return c.json({ case_id: caseId, don: [] });

  const parentIds = parents.map((p) => String(p.id));
  const guiIds = [...new Set(parents.map((p) => s(p.phieu_gui_id)).filter((x): x is string => !!x))];

  const [units, guis] = await Promise.all([
    allIn<Row>(
      db,
      (ph) => `SELECT u.id, u.parent_id, u.so_thu_tu, COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan) AS ma_lk_thuc_te, lk.ten_lk AS ten_lk_thuc_te,
                      u.loai_bao_hanh, u.huong_xu_ly, u.loai_doi_tru, u.ket_qua_nv, u.ket_qua_chan_doan, u.xu_ly_xac, u.trang_thai,
                      u.ly_do_tu_choi, u.ghi_chu_admin, u.ghi_chu_nv, u.phieu_tra_id, u.that_lac, u.updated_at, u.created_at,
                      COALESCE(nv.ten, CASE WHEN u.nguoi_sua_chua IS NOT NULL THEN 'NV sửa chữa' END) AS nv_sua_chua
               FROM phieu_sua_chua_bh_ct u
               LEFT JOIN linh_kien_bh lk ON lk.ma_lk = COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan)
               LEFT JOIN users nv ON nv.email = u.nguoi_sua_chua
               WHERE u.parent_id IN (${ph}) ORDER BY u.parent_id, u.so_thu_tu`,
      parentIds,
    ),
    guiIds.length
      ? allIn<Row>(
          db,
          (ph) => `SELECT g.id, g.trang_thai, g.ngay_tao, g.ngay_gui_xe, g.hinh_thuc_gui, g.don_vi_van_chuyen, g.ma_van_don, g.ma_xe_hoac_tai_xe,
                          g.thoi_gian_nhan_kho, g.admin_tiep_nhan, g.admin_thoi_gian_nhan, g.su_co_tiep_nhan, g.su_co_ly_do, g.su_co_ghi_chu,
                          COALESCE(k.ten_hien_thi, ut.ten) AS ktv_ten, k.ma_ktv,
                          COALESCE(uk.ten, CASE WHEN g.nguoi_nhan_kho IS NOT NULL THEN 'Kho' END) AS kho_nhan_ten,
                          COALESCE(ua.ten, CASE WHEN g.admin_nguoi_nhan IS NOT NULL THEN 'Admin BH' END) AS admin_nhan_ten
                   FROM phieu_gui_bh g
                   LEFT JOIN ktv_lien_he_bh k ON k.email_dang_nhap = g.nguoi_tao
                   LEFT JOIN users ut ON ut.email = g.nguoi_tao
                   LEFT JOIN users uk ON uk.email = g.nguoi_nhan_kho
                   LEFT JOIN users ua ON ua.email = g.admin_nguoi_nhan
                   WHERE g.id IN (${ph})`,
          guiIds,
        )
      : Promise.resolve([] as Row[]),
  ]);

  const traIds = [...new Set(units.map((u) => s(u.phieu_tra_id)).filter((x): x is string => !!x))];
  const unitIds = units.map((u) => String(u.id));
  const [tras, logs] = await Promise.all([
    traIds.length
      ? allIn<Row>(
          db,
          (ph) => `SELECT t.id, t.trang_thai, t.loai_doi_tru, t.ma_don_hang, t.ma_misa, t.ma_van_don, t.danh_gia_ktv, t.khong_nhan_duoc_ghi_chu,
                          t.ly_do_tu_choi_kt, t.created_at, t.updated_at
                   FROM phieu_tra_bh t WHERE t.id IN (${ph})`,
          traIds,
        )
      : Promise.resolve([] as Row[]),
    // Log cua don cha + don vi + phieu gui + phieu tra lien quan (1 phieu gui/tra co the chua don cua ca khac -
    // log cap phieu chi la moc chung cua thung, khong lo noi dung don khac vi ghi_chu cap phieu la cua thung).
    (async () => {
      const groups: [string, string[]][] = [
        ["phieu_sc", parentIds],
        ["phieu_sc_ct", unitIds],
        ["phieu_gui", guiIds],
        ["phieu_tra", traIds],
      ];
      const out: Row[] = [];
      for (const [type, ids] of groups) {
        if (ids.length === 0) continue;
        const rows = await allIn<Row>(
          db,
          (ph) => `SELECT l.id, l.entity_type, l.entity_id, l.tu_trang_thai, l.den_trang_thai, l.thoi_gian, l.ghi_chu,
                          COALESCE(u.ten, k.ten_hien_thi, CASE WHEN l.nguoi_thuc_hien LIKE '%@%' THEN NULL ELSE l.nguoi_thuc_hien END) AS nguoi
                   FROM logs_bh l LEFT JOIN users u ON u.email = l.nguoi_thuc_hien
                   LEFT JOIN ktv_lien_he_bh k ON k.email_dang_nhap = l.nguoi_thuc_hien
                   WHERE l.entity_type = '${type}' AND l.entity_id IN (${ph})`,
          ids,
        );
        out.push(...rows);
      }
      return out;
    })(),
  ]);

  const guiMap = new Map(guis.map((g) => [String(g.id), g]));
  const traMap = new Map(tras.map((t) => [String(t.id), t]));
  const lbl = (m: Record<string, string>, v: unknown) => (v == null ? null : (m[String(v)] ?? LBL[String(v)] ?? String(v)));

  const don = parents.map((p) => {
    const g = p.phieu_gui_id ? guiMap.get(String(p.phieu_gui_id)) : undefined;
    const us = units.filter((u) => u.parent_id === p.id);
    const giaiDoanCha = !g
      ? null
      : g.trang_thai === "nhap"
        ? "thung_nhap"
        : g.trang_thai === "da_gui"
          ? "thung_dang_gui"
          : g.trang_thai === "da_tiep_nhan" && !g.admin_tiep_nhan
            ? "thung_cho_admin_nhan"
            : "cho_xac_nhan_so_luong";
    // Nhat ky lien quan: don cha + don vi + thung + phieu tra; cap thung/phieu tra dung chung chi giu dong doi
    // trang thai hoac nhac dung ma don nay (06/11/2026 vong 2: TR-000506 hien log "gop them" cua ca khac).
    const maDon = [String(p.id), ...us.map((u) => String(u.id))];
    const relIds = new Set<string>(maDon);
    if (g) relIds.add(String(g.id));
    for (const u of us) if (u.phieu_tra_id) relIds.add(String(u.phieu_tra_id));
    const rawLogs = (logs as unknown as RawLog[])
      .filter((l) => relIds.has(String(l.entity_id)) && logThuocDon(l, maDon))
      .sort((a, b) => String(a.thoi_gian).localeCompare(String(b.thoi_gian)) || Number(a.id) - Number(b.id));
    const vanChuyen = g
      ? [lbl(HINH_THUC_GUI_VI, g.hinh_thuc_gui), s(g.don_vi_van_chuyen), g.ma_van_don ? `Vận đơn ${g.ma_van_don}` : null, s(g.ma_xe_hoac_tai_xe)].filter(Boolean).join(" · ") || null
      : null;
    const guiFlow = g
      ? {
          id: String(g.id),
          trang_thai: String(g.trang_thai),
          ngay_gui_xe: s(g.ngay_gui_xe),
          thoi_gian_nhan_kho: s(g.thoi_gian_nhan_kho),
          admin_thoi_gian_nhan: s(g.admin_thoi_gian_nhan),
          ktv_ten: s(g.ktv_ten),
          kho_nhan_ten: s(g.kho_nhan_ten),
          admin_nhan_ten: s(g.admin_nhan_ten),
          van_chuyen: vanChuyen,
        }
      : null;
    const parentFlow = { id: String(p.id), created_at: s(p.created_at), trang_thai_cha: String(p.trang_thai_cha) };
    const donVi = us.map((u) => {
      const t = u.phieu_tra_id ? traMap.get(String(u.phieu_tra_id)) : undefined;
      const gd = t ? `tra_${t.trang_thai}` : String(u.trang_thai);
      const luong = tinhLuong({
        parent: parentFlow,
        gui: guiFlow,
        unit: {
          id: String(u.id),
          trang_thai: String(u.trang_thai),
          giai_doan: gd,
          created_at: s(u.created_at),
          huong_xu_ly: s(u.huong_xu_ly),
          huong_label: lbl(HUONG_XU_LY_LABELS_VI, u.huong_xu_ly),
          nv_sua_chua: s(u.nv_sua_chua),
          ket_qua: lbl({}, u.ket_qua_nv ?? u.ket_qua_chan_doan),
          ly_do_tu_choi: s(u.ly_do_tu_choi),
        },
        tra: t ? { id: String(t.id), trang_thai: String(t.trang_thai), created_at: s(t.created_at), ma_van_don: s(t.ma_van_don), khong_nhan_duoc_ghi_chu: s(t.khong_nhan_duoc_ghi_chu) } : null,
        giaiDoanCha: null,
        logs: rawLogs.filter((l) => l.entity_type !== "phieu_sc_ct" || l.entity_id === String(u.id)).filter((l) => l.entity_type !== "phieu_tra" || l.entity_id === s(u.phieu_tra_id)),
      });
      return {
        luong,
        id: u.id,
        so_thu_tu: u.so_thu_tu,
        giai_doan: gd,
        giai_doan_label: GIAI_DOAN_VI[gd] ?? lbl(TRANG_THAI_UNIT_VI, u.trang_thai),
        trang_thai: u.trang_thai,
        trang_thai_label: lbl(TRANG_THAI_UNIT_VI, u.trang_thai),
        ma_lk_thuc_te: s(u.ma_lk_thuc_te),
        ten_lk_thuc_te: s(u.ten_lk_thuc_te),
        loai_bao_hanh: lbl({}, u.loai_bao_hanh),
        huong_xu_ly: s(u.huong_xu_ly),
        huong_xu_ly_label: lbl(HUONG_XU_LY_LABELS_VI, u.huong_xu_ly),
        loai_doi_tru: lbl({}, u.loai_doi_tru),
        ket_qua: lbl({}, u.ket_qua_nv ?? u.ket_qua_chan_doan),
        xu_ly_xac: lbl({}, u.xu_ly_xac),
        nv_sua_chua: s(u.nv_sua_chua),
        ly_do_tu_choi: s(u.ly_do_tu_choi),
        ghi_chu_admin: s(u.ghi_chu_admin),
        ghi_chu_nv: s(u.ghi_chu_nv),
        that_lac: Number(u.that_lac) === 1,
        cap_nhat: s(u.updated_at),
        phieu_tra: t
          ? {
              id: t.id,
              trang_thai: t.trang_thai,
              trang_thai_label: lbl(TRANG_THAI_TRA_VI, t.trang_thai),
              loai_doi_tru: lbl({}, t.loai_doi_tru),
              ma_don_hang: s(t.ma_don_hang),
              ma_misa: s(t.ma_misa),
              ma_van_don: s(t.ma_van_don),
              danh_gia_ktv: s(t.danh_gia_ktv),
              khong_nhan_duoc_ghi_chu: s(t.khong_nhan_duoc_ghi_chu),
              ly_do_tu_choi_kt: s(t.ly_do_tu_choi_kt),
              tao_luc: s(t.created_at),
              cap_nhat: s(t.updated_at),
            }
          : null,
      };
    });
    const timeline = rawLogs
      .map((l) => {
        const map = l.entity_type === "phieu_gui" ? TRANG_THAI_GUI_VI : l.entity_type === "phieu_tra" ? TRANG_THAI_TRA_VI : l.entity_type === "phieu_sc" ? TRANG_THAI_CHA_VI : TRANG_THAI_UNIT_VI;
        return {
          at: s(l.thoi_gian), // gio VN local "YYYY-MM-DD HH:MM:SS" (nowVN() ben suachua)
          doi_tuong: l.entity_type,
          ma: l.entity_id,
          tu: lbl(map, l.tu_trang_thai),
          den: lbl(map, l.den_trang_thai),
          nguoi: s(l.nguoi),
          ghi_chu: s(l.ghi_chu),
        };
      });
    return {
      id: p.id,
      odoo_id: p.odoo_id ?? null,
      ma_lk: s(p.ma_lk),
      ten_lk: s(p.ten_lk),
      mo_ta_loi: s(p.mo_ta_loi),
      so_luong_khai: p.so_luong_khai,
      so_luong_thuc_nhan: p.so_luong_thuc_nhan ?? null,
      ly_do_chenh_lech_sl: s(p.ly_do_chenh_lech_sl),
      loai_doi_tru_de_xuat: lbl({}, p.loai_doi_tru_de_xuat),
      nguon_tao: p.nguon_tao,
      trang_thai_cha: p.trang_thai_cha,
      trang_thai_cha_label: lbl(TRANG_THAI_CHA_VI, p.trang_thai_cha),
      giai_doan: donVi.length === 0 ? giaiDoanCha : null,
      giai_doan_label: donVi.length === 0 && giaiDoanCha ? GIAI_DOAN_VI[giaiDoanCha] : null,
      tao_luc: s(p.created_at),
      // Don chua tach don vi: luong cap don (toi buoc xac nhan so luong). Co don vi -> xem luong tung don vi.
      luong: donVi.length === 0 ? tinhLuong({ parent: parentFlow, gui: guiFlow, unit: null, tra: null, giaiDoanCha, logs: rawLogs }) : null,
      phieu_gui: g
        ? {
            id: g.id,
            trang_thai: g.trang_thai,
            trang_thai_label: lbl(TRANG_THAI_GUI_VI, g.trang_thai),
            ktv: s(g.ktv_ten),
            ma_ktv: s(g.ma_ktv),
            tao_luc: s(g.ngay_tao),
            gui_xe_luc: s(g.ngay_gui_xe),
            hinh_thuc_gui: lbl(HINH_THUC_GUI_VI, g.hinh_thuc_gui),
            don_vi_van_chuyen: s(g.don_vi_van_chuyen),
            ma_van_don: s(g.ma_van_don),
            ma_xe_hoac_tai_xe: s(g.ma_xe_hoac_tai_xe),
            kho_nhan: s(g.kho_nhan_ten),
            kho_nhan_luc: s(g.thoi_gian_nhan_kho),
            admin_nhan: s(g.admin_nhan_ten),
            admin_nhan_luc: s(g.admin_thoi_gian_nhan),
            su_co: Number(g.su_co_tiep_nhan) === 1 ? [s(g.su_co_ly_do), s(g.su_co_ghi_chu)].filter(Boolean).join(" — ") || "Có sự cố" : null,
          }
        : null,
      don_vi: donVi,
      timeline,
    };
  });

  return c.json({ case_id: caseId, don });
});

const HINH_THUC_GUI_VI: Record<string, string> = {
  xe_noi_bo: "Xe nội bộ",
  nha_xe: "Nhà xe / vận chuyển",
  buu_dien: "Bưu điện / chuyển phát",
  giao_truc_tiep: "Giao trực tiếp",
};

export default partnerCase;
