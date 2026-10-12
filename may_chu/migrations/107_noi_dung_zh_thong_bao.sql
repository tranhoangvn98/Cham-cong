-- Ban tieng Trung cua thong bao (do AI dich) — email gui theo ngon ngu nguoi nhan.
-- Trong = chua co ban dich; email tieng Trung se dich on-the-fly truoc khi gui (fail-soft).
alter table thong_bao add column if not exists tieu_de_zh text;
alter table thong_bao add column if not exists noi_dung_zh text;
