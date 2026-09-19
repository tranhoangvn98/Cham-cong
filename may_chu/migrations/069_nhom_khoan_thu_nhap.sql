-- NHOM khoan thu nhap: tach PHU CAP va THUONG.
--
-- Chu cong ty: "KPI khong thuoc phu cap". Truoc day moi khoan loai 'thu_nhap' (an trua, trang
-- diem, KPI, doanh so, hoa hong...) deu bi gop chung vao cot/muc "Phu cap" tren bang luong ->
-- khong dong nhat voi trang quan ly Phu cap. Them cot `nhom` de phan biet:
--   - 'phu_cap' : an trua, trang diem, trang phuc, dia diem, gui xe, hoan ung... (mac dinh)
--   - 'thuong'  : KPI, doanh so, hoa hong CSKH — hien o muc "Thuong", KHONG nam trong Phu cap.
-- Chi co y nghia voi khoan loai 'thu_nhap'; khoan 'tru' bo qua cot nay.

alter table khoan_luong add column if not exists nhom text
  check (nhom is null or nhom in ('phu_cap', 'thuong'));
alter table khoan_luong alter column nhom set default 'phu_cap';

-- Khoan thu nhap chua gan nhom -> mac dinh phu cap.
update khoan_luong set nhom = 'phu_cap' where loai = 'thu_nhap' and nhom is null;

-- KPI / doanh so / hoa hong -> thuong (khong phai phu cap).
update khoan_luong set nhom = 'thuong'
 where ma in ('pc_kpi', 'thuong_kpi_ca_nhan', 'thuong_kpi_phong', 'pc_doanh_so', 'hoa_hong_cskh');
