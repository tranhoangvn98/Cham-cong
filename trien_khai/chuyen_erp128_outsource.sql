-- Chuyen ERP128 Dao Thai Binh sang NHAN SU OUTSOURCE (HR chot 26/10/2026).
--
-- Ho so dang o trang thai nghi viec tu 08/08/2026, nhung chi ay lam viec theo dang outsource
-- (khong cham cong, tra luong khoan) — giong ERP2 Nguyen Viet Minh Tien, ERP32 Nguyen Quynh
-- Trang va lengoc Le Thi Ngoc. Bo dau hieu cua nhom nay:
--   * chinh sach phu cap CA NHAN 0d (pc_an_trua + pc_trang_phuc) de chan phu cap khoi;
--   * khong co hop dong lao dong;
--   * `ho_so_ca_nhan.don_vi_chi_luong` / `don_vi_dong_bhxh` = 'Cong ty Tien Phong';
--   * phieu luong mien BH, so cong sua tay theo thoa thuan.
--
-- Ngay hieu luc phu cap 0d: 01/09/2026 — dong bo voi ba nguoi kia va KHONG dung vao thang 8
-- (ky 8/2026 da duyet). Ho so duoc mo lai (dang_hoat_dong = true) de bang luong va cac luong
-- thong bao tinh den chi ay nhu mot nguoi dang lam.
--
-- Chay tren VPS:
--   Get-Content trien_khai/chuyen_erp128_outsource.sql | ssh vps 'cd /root/Cham-cong && docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 -f -'

-- 1) Mo lai ho so.
update nhan_vien
   set dang_hoat_dong = true, ngay_nghi_viec = null, cap_nhat_luc = now()
 where ma_nv = 'ERP128' and dang_hoat_dong = false;

-- 2) Mo lai tai khoan dang nhap neu co (hien khong co — vo hai).
update nguoi_dung nd
   set dang_hoat_dong = true
  from nhan_vien nv
 where nv.id = nd.nhan_vien_id and nv.ma_nv = 'ERP128';

-- 3) Chan phu cap khoi bang chinh sach ca nhan 0d (KHONG dung dong go tay 0d).
insert into chinh_sach_phu_cap
       (nhan_vien_id, khoan_ma, nguon_so_luong, so_luong, so_tien, hieu_luc_tu, ly_do)
select nv.id, k.khoan_ma, 'co_dinh', 0, 0, '2026-09-01',
       'Nhân sự outsource không hưởng phụ cấp khối (chốt 26/10/2026)'
  from nhan_vien nv
  cross join (values ('pc_an_trua'), ('pc_trang_phuc')) as k(khoan_ma)
 where nv.ma_nv = 'ERP128'
on conflict (nhan_vien_id, khoan_ma) where hieu_luc_den is null do nothing;

-- 4) Don vi chi tra + don vi dong BHXH (giong ERP2/ERP32/lengoc).
update ho_so_ca_nhan h
   set don_vi_chi_luong = 'Công ty Tiên Phong',
       don_vi_dong_bhxh = 'Công ty Tiên Phong',
       cap_nhat_luc = now()
  from nhan_vien nv
 where nv.id = h.nhan_vien_id and nv.ma_nv = 'ERP128';

-- 5) Bao cong phan quyen la nguoi nay quay lai (su kien nam cho den khi cong duoc cau hinh).
insert into hop_thu_di (loai_su_kien, du_lieu)
select 'nhan_su.quay_lai', jsonb_build_object('ma_nv', nv.ma_nv)
  from nhan_vien nv
 where nv.ma_nv = 'ERP128';

-- 6) Nhat ky.
insert into nhat_ky_thao_tac (nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, dia_chi_ip)
select null, 'chuyen_outsource', 'nhan_vien', nv.id,
       jsonb_build_object(
         'ma_nv', nv.ma_nv, 'ho_ten', nv.ho_ten,
         'mo_lai_ho_so', true,
         'phu_cap_0d_tu', '2026-09-01',
         'don_vi_chi_luong', 'Công ty Tiên Phong',
         'ly_do', 'HR chot 26/10/2026: Dao Thai Binh la nhan su outsource'),
       null
  from nhan_vien nv
 where nv.ma_nv = 'ERP128';

-- Kiem chung.
select nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong, nv.ngay_nghi_viec,
       h.don_vi_chi_luong, h.don_vi_dong_bhxh,
       (select count(*) from chinh_sach_phu_cap cs
         where cs.nhan_vien_id = nv.id and cs.hieu_luc_den is null and cs.so_tien = 0) as phu_cap_0d,
       (select count(*) from hop_dong_lao_dong hd where hd.nhan_vien_id = nv.id) as so_hop_dong
  from nhan_vien nv
  left join ho_so_ca_nhan h on h.nhan_vien_id = nv.id
 where nv.ma_nv in ('ERP128', 'ERP2', 'ERP32', 'lengoc')
 order by nv.ma_nv;
