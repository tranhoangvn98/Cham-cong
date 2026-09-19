-- Don vi / phap nhan CHI TRA luong va DONG BHXH cho tung nguoi (chi tra da phap nhan).
-- Vd: mot so nhan su duoc chi luong + dong BHXH tu "Cong ty Thong Nhat" thay vi cong ty chinh.
-- Trong (null) = cong ty chinh (mac dinh). Luu trong ho_so_ca_nhan cung nhom "Thue & ngan hang".
alter table ho_so_ca_nhan
  add column if not exists don_vi_chi_luong text,
  add column if not exists don_vi_dong_bhxh text;

comment on column ho_so_ca_nhan.don_vi_chi_luong is
  'Phap nhan/cong ty chi tra luong cho nguoi nay (vd Cong ty Thong Nhat). Trong = cong ty chinh.';
comment on column ho_so_ca_nhan.don_vi_dong_bhxh is
  'Phap nhan/cong ty dong BHXH cho nguoi nay. Trong = cong ty chinh.';
