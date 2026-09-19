-- YC 02 — PHAN B (GD1): KPI da cap + tach khoan thuong.
--
-- (B1) Pham vi ap KPI: ca_nhan | phong_ban | cap_trong_phong | toan_cong_ty. GD1 chi THEM cot
-- (nen tang); viec tinh theo pham vi la GD2 (T9). Mac dinh 'ca_nhan' cho khop hanh vi hien tai.
alter table danh_muc_kpi
  add column if not exists pham_vi text not null default 'ca_nhan'
    check (pham_vi in ('ca_nhan', 'phong_ban', 'cap_trong_phong', 'toan_cong_ty'));

-- (B2) Tach khoan thuong theo loai — truoc day chi mot khoan `pc_kpi` dung chung nen phieu khong
-- phan biet duoc. Them cac khoan rieng; `pc_doanh_so` da co tu 027.
insert into khoan_luong (ma, ten, loai, cach_tinh, don_gia, chiu_thue, thu_tu, canh_bao, ghi_chu)
values
  ('thuong_kpi_ca_nhan', 'Thưởng KPI cá nhân',      'thu_nhap', 'nhap_tay', null, true, 61, null, null),
  ('thuong_kpi_phong',   'Thưởng KPI phòng/khối',   'thu_nhap', 'nhap_tay', null, true, 62, null, null),
  ('hoa_hong_cskh',      'Hoa hồng CSKH',           'thu_nhap', 'nhap_tay', null, true, 63, null, null)
on conflict (ma) do nothing;
