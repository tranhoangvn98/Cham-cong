-- Gan phan loai NHAN SU OUTSOURCE cho lengoc (Le Thi Ngoc) cho dong bo voi ERP2 (Nguyen Viet
-- Minh Tien) va ERP32 (Nguyen Quynh Trang) — HR chot 24/10/2026.
--
-- So sanh 3 nguoi truoc khi sua:
--   * Chinh sach phu cap 0d (pc_an_trua + pc_trang_phuc tu 01/09/2026) — lengoc DA CO, giong.
--   * Phieu luong mien BH (muc_dong_bh = 0) + sua tay so cong moi ky — lengoc DA CO, giong.
--   * Khong co hop dong lao dong — giong.
--   * THIEU: dong `ho_so_ca_nhan` -> `don_vi_chi_luong` rong, nen khi Lap Lenh Chi nguoi nay
--     roi vao nhom mac dinh '(Cong ty chinh)' thay vi 'Cong ty Tien Phong' nhu hai nguoi kia.
--
-- Script nay chi lap phan CON THIEU (don vi chi luong + don vi dong BHXH + quoc tich). Cac
-- truong dinh danh ca nhan (CCCD, so tai khoan, ma so thue) KHONG tu dien — cho HR cung cap,
-- khong duoc bia.
--
-- Chay tren VPS:
--   docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 -f -

\set ON_ERROR_STOP on

begin;

insert into ho_so_ca_nhan (nhan_vien_id, quoc_tich, don_vi_chi_luong, don_vi_dong_bhxh, cap_nhat_luc)
select nv.id, 'Việt Nam', 'Công ty Tiên Phong', 'Công ty Tiên Phong', now()
  from nhan_vien nv
 where nv.ma_nv = 'lengoc'
on conflict (nhan_vien_id) do update
   set don_vi_chi_luong = excluded.don_vi_chi_luong,
       don_vi_dong_bhxh = excluded.don_vi_dong_bhxh,
       cap_nhat_luc = now();

insert into nhat_ky_thao_tac (nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, dia_chi_ip)
select null, 'gan_phan_loai_outsource', 'nhan_vien', nv.id,
       jsonb_build_object(
         'ma_nv', nv.ma_nv,
         'ho_ten', nv.ho_ten,
         'don_vi_chi_luong', 'Công ty Tiên Phong',
         'ly_do', 'HR chot: Le Ngoc cung nhom outsource voi ERP2 Nguyen Viet Minh Tien va ERP32 Nguyen Quynh Trang'),
       null
  from nhan_vien nv
 where nv.ma_nv = 'lengoc';

commit;

-- Kiem chung: 3 nguoi outsource phai cung bo dau hieu.
select nv.ma_nv, nv.ho_ten, h.don_vi_chi_luong, h.don_vi_dong_bhxh,
       (select count(*) from chinh_sach_phu_cap cs
         where cs.nhan_vien_id = nv.id and cs.hieu_luc_den is null and cs.so_tien = 0) as so_phu_cap_0d,
       (select count(*) from hop_dong_lao_dong hd where hd.nhan_vien_id = nv.id) as so_hop_dong
  from nhan_vien nv
  left join ho_so_ca_nhan h on h.nhan_vien_id = nv.id
 where nv.ma_nv in ('lengoc', 'ERP2', 'ERP32')
 order by nv.ma_nv;
