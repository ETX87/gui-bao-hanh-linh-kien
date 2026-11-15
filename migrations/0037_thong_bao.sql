-- 15/11/2026: thong bao tong hop 1 lan / ngay (12h trua) theo vai tro - Web Push + chuong trong app.
CREATE TABLE IF NOT EXISTS push_subscriptions_bh (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  email     TEXT NOT NULL REFERENCES users(email),
  endpoint  TEXT NOT NULL UNIQUE,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  ngay_tao  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_bh_email ON push_subscriptions_bh(email);

-- 1 ban tong hop / nguoi / ngay. noi_dung = JSON {nhom:[{vai, muc:[{nhan, so, link, gap}]}], giai_trinh, qua_sla}.
CREATE TABLE IF NOT EXISTS thong_bao_bh (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,
  ngay        TEXT NOT NULL,   -- YYYY-MM-DD gio VN
  tieu_de     TEXT NOT NULL,
  tom_tat     TEXT NOT NULL,
  noi_dung    TEXT NOT NULL,
  tong        INTEGER NOT NULL DEFAULT 0,
  da_doc      INTEGER NOT NULL DEFAULT 0,
  da_push     INTEGER NOT NULL DEFAULT 0,  -- 0 chua gui / 1 da gui / 2 khong co thiet bi hoac khong co viec
  created_at  TEXT NOT NULL,
  UNIQUE(email, ngay)
);
CREATE INDEX IF NOT EXISTS idx_thong_bao_bh_ngay ON thong_bao_bh(ngay, da_push);
