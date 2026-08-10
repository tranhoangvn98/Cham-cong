-- Quy phep nam de man "Nghi phep" hien duoc thanh % (Phu luc B Man 4).
--
-- Muc 12 ngay/nam la muc toi thieu cua Dieu 113 Bo luat Lao dong 2019 cho nguoi lam du
-- 12 thang trong dieu kien binh thuong. Nguoi lam nghe nang nhoc / doc hai duoc 14-16
-- ngay, va cu du 5 nam lam viec them 1 ngay (Dieu 114) — vi vay day la CAU HINH THEO
-- TUNG NGUOI, khong phai hang so trong code: HR dat lai cho tung nhan vien.
alter table nhan_vien
  add column if not exists so_ngay_phep_nam numeric(4,1) not null default 12
    check (so_ngay_phep_nam >= 0 and so_ngay_phep_nam <= 60);

comment on column nhan_vien.so_ngay_phep_nam is
  'Quy phep nam cua rieng nhan vien nay. Mac dinh 12 (Dieu 113 BLLD 2019). HR tang theo tham nien (Dieu 114) hoac theo nghe.';
