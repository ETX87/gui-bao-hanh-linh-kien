import { pushPhanLoaiPending } from "./lib/linhKienPush";
import { dayCapLkCho } from "./lib/capLkPush";
import { dongBoDonSc } from "./lib/donScLinhKien";
import { dayTruCongNo, dongBoTruCongNo } from "./lib/truCongNo";
import { maybeComputeTopLinhKien } from "./lib/topLinhKien";
import { Hono } from "hono";
import type { Env } from "./types";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import phieuGuiRoutes from "./routes/phieuGui";
import khoRoutes from "./routes/kho";
import adminBHRoutes from "./routes/adminBH";
import nvSuaChuaRoutes from "./routes/nvSuaChua";
import phieuTraRoutes from "./routes/phieuTra";
import settingsRoutes from "./routes/settings";
import doiTacBhRoutes from "./routes/doiTacBh";
import linhKienRoutes from "./routes/linhKien";
import traCuuRoutes from "./routes/traCuu";
import buocRoutes from "./routes/buoc";
import logsRoutes from "./routes/logs";
import syncRoutes from "./routes/sync";
import caseLookupRoutes from "./routes/caseLookup";
import ktvLienHeRoutes from "./routes/ktvLienHe";
import khovanLookupRoutes from "./routes/khovanLookup";
import khuVucRoutes from "./routes/khuVuc";
import partnerKhoRoutes from "./routes/partnerKho";
import partnerCaseRoutes from "./routes/partnerCase";
import workloadRoutes from "./routes/workload";
import odooDonRoutes from "./routes/odooDon";
import mienRoutes from "./routes/mien";
import canhBaoRoutes from "./routes/canhBao";
import lichSuRoutes from "./routes/lichSu";
import baoCaoBoRoutes from "./routes/baoCaoBo";
import baoCaoKpiRoutes from "./routes/baoCaoKpi";
import deXuatRoutes from "./routes/deXuat";
import xacRoutes from "./routes/xac";
import thongBaoRoutes from "./routes/thongBao";
import baoCaoNghenRoutes from "./routes/baoCaoNghen";
import { maybeRunDigest } from "./lib/thongBao";
import { maybeDayGiaiTrinhLenCong } from "./lib/viecGiaiTrinhCong";
import { maybeComputeGiaiDoanTb } from "./lib/canhBao";
import { runOdooSync } from "./lib/odooSync";
import { maybeRunEtxSync } from "./lib/etxSync";
import { dongBoTaiKhoan } from "./lib/taiKhoan";
import tuChoiThungRoutes from "./routes/tuChoiThung";
import khachHangRoutes from "./routes/khachHang";
import { tuHuyThungQuaHan } from "./lib/tuChoiThung";
import { tuDongXacNhanNhanHang } from "./lib/tuDongNhanHang";
import { maybeRunUserKhuVucSync } from "./lib/userKhuVucSync";
import { backfillCaseSnapshots, verifyPendingCases, refreshSnapshotsThieuNsx } from "./lib/caseSnapshot";
import { capNhatTimKiem } from "./lib/timKiem";
import etxRoutes from "./routes/etx";
import thieuHangRoutes from "./routes/thieuHang";
import anhRoutes from "./routes/anh";
import { chuyenAnhCuSangDrive } from "./lib/anhDrive";
import { dongBoThieuHang, guiThieuHangCho, layVaXoaCoYeuCauMoi } from "./lib/thieuHang";
import { layCuaSoThongTin } from "./lib/cuaSoThongTin";

// He doc lap "Sua chua bao hanh" (Worker "suachua"). Giai doan 3: mount toan bo route nghiep vu (KTV/
// Kho/Admin BH/NV sua chua/Ke toan/Giam sat/View), port dung tu prototype-html/index.html - xem
// CLAUDE.md "Trien khai day du Giai doan 3-6". Cron 15 phut dong bo don Odoo (lib/odooSync.ts); Worker nay cung la BEN NHAN cua co che
// day tu linh-kien-app, xem routes/sync.ts).
const app = new Hono<{ Bindings: Env }>();

// 04/11/2026: thao tac vua tao yeu cau thieu hang (ly do cham "Khong co linh kien" / "Het hang ton kho", ghi qua addLog) -> gui sang
// linh-kien-app ngay sau khi tra loi, khong cho cron 15 phut. Loi thi cron gui lai.
// Cua so thong tin eOffice (2026-11-24, lib/cuaSoThongTin.ts): khong can dang nhap - hien ca o man dang nhap.
app.get("/api/cua-so", async (c) => c.json(await layCuaSoThongTin(c.env.CUA_SO_KHOA)));

app.use("/api/*", async (c, next) => {
  await next();
  if (c.req.method !== "GET" && layVaXoaCoYeuCauMoi()) {
    c.executionCtx.waitUntil(guiThieuHangCho(c.env).then(() => undefined).catch((e) => console.error("[thieuHang gui]", e instanceof Error ? e.message : e)));
  }
  // 12/11/2026 (v1.112): doi phieu cap linh kien (Ke toan xac nhan / Kho in / xuat / sua PXK) -> day ngay sang linh-kien-app.
  if (c.req.method !== "GET" && c.req.path.startsWith("/api/de-xuat") && c.res.status < 400) {
    c.executionCtx.waitUntil(dayCapLkCho(c.env).then(() => undefined).catch((e) => console.error("[capLk day]", e instanceof Error ? e.message : e)));
  }
});

app.route("/api/auth", authRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/phieu-gui", phieuGuiRoutes);
app.route("/api/kho", khoRoutes);
app.route("/api/admin", adminBHRoutes);
app.route("/api/nv", nvSuaChuaRoutes);
app.route("/api/phieu-tra", phieuTraRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/doi-tac", doiTacBhRoutes);
app.route("/api/linh-kien", linhKienRoutes);
app.route("/api/tra-cuu", traCuuRoutes);
app.route("/api/buoc", buocRoutes);
app.route("/api/logs", logsRoutes);
app.route("/api/partner/sync", syncRoutes);
app.route("/api/case-lookup", caseLookupRoutes);
app.route("/api/ktv-lien-he", ktvLienHeRoutes);
app.route("/api/partner/box-lookup", khovanLookupRoutes);
app.route("/api/khu-vuc", khuVucRoutes);
app.route("/api/partner/kho-action", partnerKhoRoutes);
// 06/11/2026: dvbh doc luong gui bao hanh cua 1 ca (CaseDetail tab "Gui BH") - routes/partnerCase.ts.
app.route("/api/partner/v1", partnerCaseRoutes);
app.route("/api/workload", workloadRoutes);
app.route("/api/odoo-don", odooDonRoutes);
app.route("/api/mien", mienRoutes);
app.route("/api/canh-bao", canhBaoRoutes);
app.route("/api/lich-su", lichSuRoutes);
app.route("/api/bao-cao-bo", baoCaoBoRoutes);
app.route("/api/bao-cao-kpi", baoCaoKpiRoutes);
app.route("/api/de-xuat", deXuatRoutes);
// 13/11/2026: module tra xac linh kien (thung tra xac cho nha may) - routes/xac.ts.
app.route("/api/tra-xac", xacRoutes);
app.route("/api/etx", etxRoutes);
app.route("/api/thieu-hang", thieuHangRoutes);
app.route("/api/anh", anhRoutes);
app.route("/api/tu-choi-thung", tuChoiThungRoutes);
app.route("/api/khach-hang", khachHangRoutes);
// 15/11/2026: chuong thong bao tong hop 12h + dang ky Web Push.
app.route("/api/thong-bao", thongBaoRoutes);
app.route("/api/bao-cao-nghen", baoCaoNghenRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  // Cron 15 phut (wrangler.jsonc triggers) - keo don bao hanh Odoo tu dvbh + day trang thai gui sua
  // nguoc ve dvbh (lib/odooSync.ts, CLAUDE.md muc "Keo don bao hanh Odoo").
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runOdooSync(env).then(() => undefined));
    // 15/11/2026: tu 12h, day ban tong hop viec ton cho nguoi da bat thong bao (moi lan 25 nguoi).
    ctx.waitUntil(maybeRunDigest(env).then(() => undefined).catch((e) => console.error("[thongBao]", e instanceof Error ? e.message : e)));
    // 23/11/2026: viec can giai trinh qua han -> App Nhiem vu eOffice (anh chup du, 30 phut / lan).
    ctx.waitUntil(maybeDayGiaiTrinhLenCong(env).catch((e) => console.error("[congNhiemVu]", e instanceof Error ? e.message : e)));
    // 12/11/2026: chuyen dan anh cu (base64 trong D1) sang Google Drive, moi lan toi da 25 anh.
    ctx.waitUntil(chuyenAnhCuSangDrive(env, 25, 120000).then(() => undefined).catch((e) => console.error("[anhDrive]", e instanceof Error ? e.message : e)));
    // 04/11/2026: thieu hang bao hanh - gui yeu cau con cho + keo trang thai ticket ben linh-kien-app.
    ctx.waitUntil(dongBoThieuHang(env).then(() => undefined).catch((e) => console.error("[thieuHang]", e instanceof Error ? e.message : e)));
    ctx.waitUntil(pushPhanLoaiPending(env).then(() => undefined).catch(() => undefined));
    // 12/11/2026: phieu cap linh kien -> don "SỬA CHỮA TẠI KHO" ben linh-kien-app (gui lai dong loi / bi lo).
    ctx.waitUntil(dayCapLkCho(env).then(() => undefined).catch((e) => console.error("[capLk]", e instanceof Error ? e.message : e)));
    // 16/11/2026 (v1.133): keo trang thai don cap linh kien sua chua (CÔNG NỢ SỬA CHỮA) ben linh-kien-app - ca don NV dat thang ben do.
    ctx.waitUntil(dongBoDonSc(env).then((r) => { if (r.loi) console.error("[donSc]", r.loi); }).catch((e) => console.error("[donSc]", e instanceof Error ? e.message : e)));
    // 16/11/2026: tru cong no sua chua - gui lai don tru / tra loi + keo trang thai ve.
    ctx.waitUntil(
      dayTruCongNo(env)
        .then(() => dongBoTruCongNo(env))
        .then((r) => { if (r.loi) console.error("[truCongNo]", r.loi); })
        .catch((e) => console.error("[truCongNo]", e instanceof Error ? e.message : e)),
    );
    // Top linh kien 30 ngay - tinh 1 lan/ngay o khung gio cai dat (05/10/2026 muc 7).
    // Thoi gian xu ly trung binh tung giai doan (30 ngay) - tinh lai toi da 1 lan/gio (12/10/2026).
    ctx.waitUntil(maybeComputeGiaiDoanTb(env.DB).catch((e) => console.error("[giaiDoanTb]", e instanceof Error ? e.message : e)));
    // 13/11/2026: thung bi tu choi, KTV qua 7 ngay khong phan hoi -> tu huy.
    ctx.waitUntil(tuHuyThungQuaHan(env).then(() => undefined).catch((e) => console.error("[tuHuyThung]", e instanceof Error ? e.message : e)));
    // 16/11/2026: phieu tra "Đang gửi KTV" qua 14 ngay KTV khong xac nhan / khong bao thieu -> tu xac nhan da nhan.
    ctx.waitUntil(tuDongXacNhanNhanHang(env).then(() => undefined).catch((e) => console.error("[tuDongNhanHang]", e instanceof Error ? e.message : e)));
    ctx.waitUntil(maybeRunEtxSync(env).catch((e) => console.error("[etxSync]", e instanceof Error ? e.message : e)).then(() => dongBoTaiKhoan(env.DB)).then(() => undefined).catch((e) => console.error("[dongBoTaiKhoan]", e instanceof Error ? e.message : e)));
    ctx.waitUntil(maybeRunUserKhuVucSync(env).catch((e) => console.error("[userKhuVucSync]", e instanceof Error ? e.message : e)));
    ctx.waitUntil(maybeComputeTopLinhKien(env.DB).catch((e) => console.error("[topLinhKien]", e instanceof Error ? e.message : e)));
    // 20/10/2026: bo sung bang chung case (dvbh) cho don chua co - toi da 40 case / lan.
    ctx.waitUntil(verifyPendingCases(env).then(() => undefined).catch((e) => console.error("[caseVerify]", e instanceof Error ? e.message : e)));
    // 31/10/2026: sau khi bo sung bang chung case -> tinh lai chuoi tim kiem khong dau cho don moi / co thay doi.
    ctx.waitUntil(backfillCaseSnapshots(env).catch(() => undefined).then(() => refreshSnapshotsThieuNsx(env).catch(() => undefined)).then(() => capNhatTimKiem(env.DB)).then(() => undefined).catch((e) => console.error("[timKiem]", e instanceof Error ? e.message : e)));
  },
};
