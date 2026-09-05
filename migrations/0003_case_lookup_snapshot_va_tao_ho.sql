-- Bang cache "bang chung" 1 lan tra cuu case tu he DVBH goc - dung CHUNG cho moi don tham chieu cung
-- 1 case_id (khong phai rieng tung don), dung mau case_lookup_snapshot cua linh-kien-app. Muc dich
-- (yeu cau 05/09/2026 muc 2): "tránh việc phải gọi API liên tục cho 1 ca sự cố mỗi khi có người xem
-- thông tin" - Admin bao hanh chu dong bam "dong bo lai" khi can lam moi (xem routes/caseLookup.ts).
CREATE TABLE case_lookup_snapshot (
    case_id     TEXT PRIMARY KEY,
    data        TEXT NOT NULL,
    synced_at   TEXT NOT NULL
);

-- Ho tro "GS khu vuc cua KTV hoac Admin bao hanh tao ho don bao hanh" (yeu cau 05/09/2026 muc 1):
-- nguoi_tao GIU NGUYEN y nghia cu ("KTV so huu thung nay", dung cho moi truy van/quyen da co san) -
-- nguoi_tao_ho la email nguoi THAT SU bam tao ho (GS/Admin bao hanh), NULL neu chinh KTV tu tao lay.
ALTER TABLE phieu_gui_bh ADD COLUMN nguoi_tao_ho TEXT;
