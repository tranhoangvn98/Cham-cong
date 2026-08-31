-- Hai muc tai lieu cho nhanh 06 TUYỂN DỤNG & THỬ VIỆC tren SharePoint.
--
-- VI SAO CAN CHUNG: thu vien HCNS co san hai thu muc `06.1 Yêu cầu tuyển & CV ứng viên` va
-- `06.2 Đánh giá phỏng vấn & thử việc`, va da thong nhat la ho so cua he thong nam trong do.
-- Nhung truoc di tru nay, he thong KHONG CO loai tep nao thuoc ve hai thu muc do — nen khai
-- nhanh vao bang anh xa la khai mot cho khong bao gio nhan tep nao.
--
-- Hai muc nay la nguon tep cho hai thu muc do:
--   cv_ung_vien        -> 06.1
--   danh_gia_thu_viec  -> 06.2
--
-- `bat_buoc = false` CO Y, va khong duoc doi thanh true ma khong nghi lai: he thong dang co
-- 53 nguoi da nhap tu ERP. Dat bat_buoc = true la ngay hom sau toan bo 53 ho so hien "thieu
-- tai lieu", va con so tien do tren dashboard tu binh thuong thanh do — khong phai vi ai lam
-- sai, ma vi ta vua doi thuoc do.
--
-- `chi_khi_nghi_viec = false`: ca hai deu phat sinh luc VAO lam, khong phai luc nghi.
--
-- Nhom 'A' (tai lieu tung nguoi) chu khong phai nhom moi: chung la giay to gan voi mot nguoi
-- cu the, dung nhu CCCD hay bang cap. `yeu_cau_tuyen` (yeu cau tuyen dung cua phong ban) thi
-- KHONG khai o day — no gan voi mot vi tri can tuyen, khong gan voi mot nhan vien, nen
-- `tai_lieu_nhan_vien` khong phai cho cua no.

insert into danh_muc_tai_lieu (ma, ten, nhom, mo_ta, bat_buoc, chi_khi_nghi_viec, thu_tu) values
  ('cv_ung_vien',       'CV / Đơn xin việc',            'A',
   'Hồ sơ ứng tuyển lúc vào làm. Lưu ở nhánh 06.1 trên SharePoint.',        false, false, 5),
  ('danh_gia_thu_viec', 'Biên bản đánh giá thử việc',   'A',
   'Kết quả thử việc — BLLĐ 2019 Điều 27 buộc phải thông báo. Nhánh 06.2.', false, false, 45)
on conflict (ma) do nothing;

comment on table danh_muc_tai_lieu is
  'Danh muc tai lieu trong ho so tung nguoi. Ma (`ma`) duoc dung de chon nhanh SharePoint '
  'trong may_chu/src/sharepoint/anh_xa.ts — doi `ma` o day thi phai doi ca ben do.';
