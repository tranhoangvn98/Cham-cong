-- Tai khoan HE THONG cho cac quyet dinh TU DONG (khong co nguoi bam nut).
--
-- Ly do: truoc day khi he thong tu dong duyet don (di muon, nghi phep, chuyen quy phep nam)
-- thi `nguoi_duyet_id` bi de NULL. Mot don da_duyet ma khong biet AI duyet la du lieu khong ro
-- rang — khong phan biet duoc voi du lieu lo tay hay du lieu lot vao tu ngoai ung dung. Ban dieu
-- hanh chot: he thong KHONG duoc duyet tu dong duoi mot nguoi dung khong ro rang; moi quyet dinh
-- tu dong phai mang danh tinh "he thong" ro rang, tra cuu duoc.
--
-- Tai khoan nay CHI de gan cho nguoi_duyet_id (ghi nhan tac gia), KHONG dang nhap duoc:
--   - dang_hoat_dong = false  -> tang dang nhap tu choi (xem tuyen/dang_nhap.ts).
--   - mat_khau_hash = '!'      -> khong phai bcrypt hop le nen khong mat khau nao khop.
-- Vai tro 'nhan_su' de thoa rang buoc nguoi_dung_phai_gan_nhan_vien (khong can gan nhan_vien).

insert into nguoi_dung (ten_dang_nhap, mat_khau_hash, vai_tro, dang_hoat_dong, phai_doi_mat_khau)
values ('he_thong', '!', 'nhan_su', false, false)
on conflict (ten_dang_nhap) do nothing;

-- Ga lai danh tinh cho cac don DA duoc he thong tu dong quyet truoc day (dang de NULL). Chi dong
-- vao cac ban ghi co MARKER ung dung sinh ra ([auto_duyet], [auto_quy_phep], [auto]) — day la bang
-- chung ro rang do ung dung tao; KHONG dung vao du lieu nhap tay hay du lieu la khong co marker.
update don_nghi_phep
   set nguoi_duyet_id = (select id from nguoi_dung where ten_dang_nhap = 'he_thong')
 where nguoi_duyet_id is null
   and trang_thai in ('da_duyet', 'tu_choi')
   and (ghi_chu_duyet like '[auto_duyet]%' or ghi_chu_duyet like '[auto_quy_phep]%');

update don_tu
   set nguoi_duyet_id = (select id from nguoi_dung where ten_dang_nhap = 'he_thong')
 where nguoi_duyet_id is null
   and trang_thai in ('da_duyet', 'tu_choi')
   and ghi_chu_duyet like '[auto]%';
