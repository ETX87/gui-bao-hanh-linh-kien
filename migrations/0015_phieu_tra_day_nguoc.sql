-- Migration 0015 (19/10/2026): Kho / Ke toan "day nguoc" phieu tra da duyet ve Admin BH (phieu len nham).
-- Luu ly do + nguoi + vai tro + thoi diem lan day nguoc gan nhat de hien banner cho Admin BH; lich su day du
-- nam trong logs_bh. Xoa khi Admin BH gui duyet lai.
ALTER TABLE phieu_tra_bh ADD COLUMN ly_do_day_nguoc TEXT;
ALTER TABLE phieu_tra_bh ADD COLUMN day_nguoc_boi TEXT;
ALTER TABLE phieu_tra_bh ADD COLUMN day_nguoc_vai_tro TEXT; -- 'kho' | 'ke_toan'
ALTER TABLE phieu_tra_bh ADD COLUMN day_nguoc_luc TEXT;
