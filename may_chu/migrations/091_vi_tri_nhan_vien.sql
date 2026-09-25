-- ============================================================================
-- 091 — Vi tri (bac) nhan vien de tu phan quyen tai khoan he thong
--
-- Khi HR them nhan vien moi va chon "tao tai khoan he thong", vai tro cua tai
-- khoan (nhan_su / truong_phong / nhan_vien) duoc suy tu vi tri nay thay vi chon
-- tay. Bay bac theo quyet dinh cua cong ty:
--
--   tong_giam_doc  Tong Giam Doc
--   giam_doc       Giam doc
--   truong_phong   Truong phong
--   truong_nhom    Truong nhom (Leader/Chuyen vien)
--   nhan_vien      Nhan vien
--   thu_viec       Thu viec
--   hoc_viec       Hoc viec (Thuc tap sinh)
--
-- Cot nay KHAC bang `vi_tri` cua module to chuc (084): day la BAC cong viec
-- cua con nguoi, khong phai vi tri trong so do to chuc (nhan_vien_vi_tri).
-- ============================================================================

alter table nhan_vien
  add column if not exists vi_tri text
  check (vi_tri in ('tong_giam_doc', 'giam_doc', 'truong_phong', 'truong_nhom',
                    'nhan_vien', 'thu_viec', 'hoc_viec'));
