-- 13/11/2026: users.ten_tay = 1 khi Admin he thong tu khai bao ten hien thi (tai khoan khong co tren danh ba KTV / ETX).
-- Dang nhap Google khong ghi de ten nay. Co ten tren danh ba KTV (ma CRM) / ETX thi ten do van uu tien hon.
ALTER TABLE users ADD COLUMN ten_tay INTEGER NOT NULL DEFAULT 0;
