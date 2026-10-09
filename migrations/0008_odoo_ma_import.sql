-- ID import cua don bao hanh Odoo (External ID "__export__.technical_service_warranty_<id>_<hash>" = cot "ID"
-- khi xuat "tuong thich nhap" tren Odoo) - dvbh chuyen tiep qua GET /api/partner/don-bao-hanh-odoo (dvbh
-- migration 0129). Dung de xuat file ket qua (ID, Trang thai, Ngay hoan thanh, Ghi chu) import nguoc Odoo
-- (yeu cau 09/10/2026).
ALTER TABLE don_bh_odoo ADD COLUMN ma_import_odoo TEXT;
