-- 14/11/2026 (toi uu D1): menu KTV / dem qua han / tra cuu theo giai doan loc truoc don vi CHUA vao phieu tra theo
-- trang_thai (traCuu.ts locTruocDonVi). Index thuong idx_psc_ct_trang_thai phai duyet ca ~4.4k don vi da vao phieu tra
-- (van giu trang_thai 'san_sang_gom_phieu_tra'); index mot phan nay chi chua don vi chua co phieu tra (vai tram dong).
CREATE INDEX IF NOT EXISTS idx_psc_ct_chua_tra ON phieu_sua_chua_bh_ct(trang_thai) WHERE phieu_tra_id IS NULL;
