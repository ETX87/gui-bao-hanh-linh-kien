-- 21/11/2026 (v1.153): giai trinh them phan loai loi + bang chung.
-- loai_loi: noi_bo (loi noi bo) | doi_tac (loi doi tac) | ban_than (loi cua toi) | khac. NULL = giai trinh cu / tu cong SLA.
-- bang_chung: mo ta bang chung (bat buoc co bang chung - chu hoac anh - khi loai_loi khac ban_than).
-- bang_chung_anh: JSON mang link Google Drive (anh luu tren Drive, khong luu D1).
ALTER TABLE giai_trinh_bh ADD COLUMN loai_loi TEXT;
ALTER TABLE giai_trinh_bh ADD COLUMN bang_chung TEXT;
ALTER TABLE giai_trinh_bh ADD COLUMN bang_chung_anh TEXT;
