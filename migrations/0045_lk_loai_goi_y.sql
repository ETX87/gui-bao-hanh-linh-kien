-- v1.152 (2026-11-21, app Dat LK v1.547) - "sẽ cho ktv chọn lại, nhưng trên app đổi trả và app linh kiện, sẽ hiện cảnh báo rất rõ ràng cho các
-- đơn vị, bộ phận liên quan biết linh kiện này đang được chọn loại đề xuất khác với đề xuất thực tế phải chọn": app Dat LK khong con tu ep loai
-- cap linh kien sua chua theo don bao hanh; lan cap chon KHAC loai goi y -> dong bo ve loai goi y + ly do de canh bao (NULL = khop goi y).
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_loai_goi_y TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_loai_goi_y_ly_do TEXT;
