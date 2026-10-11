-- 11/10/2026: chia he thong thanh 2 MIEN (Bac / Nam) + "Khu vuc chua khai bao" (mien NULL).
-- Nguyen van: "MB = cac khu vuc co chua ky tu MB, mien Nam bao gom cac khu vuc co chua ky tu MN) co the
-- bo sung them, ngoai ra cac khu vuc hoac KTV chua xac dinh duoc khu vuc se o khu vuc chua khai bao
-- (khu vuc nay KHO, Admin sua chua, NV sua chua, KT 2 mien se deu nhin thay)".
-- (Luu y: 0001 da bo cot "mien" cu cua prototype - day la khai niem MOI, suy tu ma khu vuc KTV.)

-- Mien cua nguoi xu ly (Kho/Admin BH/NV/Ke toan): 'MB' | 'MN' | 'ALL' (ca 2) | NULL (chua gan = thay tat ca).
ALTER TABLE users ADD COLUMN mien TEXT CHECK (mien IN ('MB', 'MN', 'ALL'));

-- Mien cua don: NULL = "Khu vuc chua khai bao". Tu xac dinh luc tao theo nguoi tao, sua lai duoc.
ALTER TABLE phieu_gui_bh ADD COLUMN mien TEXT CHECK (mien IN ('MB', 'MN'));
ALTER TABLE phieu_sua_chua_bh ADD COLUMN mien TEXT CHECK (mien IN ('MB', 'MN'));
ALTER TABLE phieu_tra_bh ADD COLUMN mien TEXT CHECK (mien IN ('MB', 'MN'));
CREATE INDEX idx_pg_mien ON phieu_gui_bh(mien);
CREATE INDEX idx_psc_mien ON phieu_sua_chua_bh(mien);
CREATE INDEX idx_ptb_mien ON phieu_tra_bh(mien);

-- Mien GAN TAM cho 1 KTV (uu tien hon suy tu khu_vuc_ma): dat khi nguoi xu ly doi mien 1 don "chua khai
-- bao" va dong y chuyen luon KTV do. Cot rieng (khong ghi de khu_vuc_ma) de khong mat ma khu vuc goc
-- (dung cho Giam sat) va khong bi dong bo tu linh-kien-app ghi de. Admin he thong sua lai o Danh sach KTV.
ALTER TABLE ktv_lien_he_bh ADD COLUMN mien_gan TEXT CHECK (mien_gan IN ('MB', 'MN'));

-- Tu khoa nhan dien mien tu ma khu vuc KTV (chua chuoi, khong phan biet hoa thuong). Admin he thong
-- bo sung them (VD "PTDV" -> MB) o Cai dat he thong.
CREATE TABLE mien_tu_khoa_bh (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    mien        TEXT NOT NULL CHECK (mien IN ('MB', 'MN')),
    tu_khoa     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (mien, tu_khoa)
);
INSERT INTO mien_tu_khoa_bh (mien, tu_khoa) VALUES ('MB', 'MB'), ('MN', 'MN');

-- Gan mien cho du lieu cu theo khu vuc cua KTV tao thung (chi khop 1 mien moi gan).
UPDATE phieu_gui_bh SET mien = (
  SELECT CASE
    WHEN instr(upper(k.khu_vuc_ma), 'MB') > 0 AND instr(upper(k.khu_vuc_ma), 'MN') = 0 THEN 'MB'
    WHEN instr(upper(k.khu_vuc_ma), 'MN') > 0 AND instr(upper(k.khu_vuc_ma), 'MB') = 0 THEN 'MN'
  END
  FROM ktv_lien_he_bh k WHERE k.email_dang_nhap = phieu_gui_bh.nguoi_tao LIMIT 1
);
UPDATE phieu_sua_chua_bh SET mien = (SELECT g.mien FROM phieu_gui_bh g WHERE g.id = phieu_sua_chua_bh.phieu_gui_id)
WHERE phieu_gui_id IS NOT NULL;
UPDATE phieu_tra_bh SET mien = (
  SELECT p.mien FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
  WHERE u.phieu_tra_id = phieu_tra_bh.id AND p.mien IS NOT NULL LIMIT 1
);
