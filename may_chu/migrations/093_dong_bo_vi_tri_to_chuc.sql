-- ============================================================================
-- 093 — Dong bo vi tri (bac) tu ho so nhan su sang co cau to chuc
--
-- Bang `nhan_vien.vi_tri` (091) la BAC cong viec cua con nguoi (7 bac). Module
-- to chuc (084) co bang `vi_tri` RIENG de hien thi so do — hai ben khong noi
-- nhau nen them bac o ho so khong thay gi o man "Co cau to chuc".
--
-- Migration nay:
--   1. Tao 7 vi tri bac trong bang `vi_tri` (ma tien to `bac.` de khong trung
--      ma JD nhu CEO / TN / 6.1), pham vi toan cong ty.
--   2. Backfill: gan moi nhan vien da co bac vao vi tri bac tuong ung
--      (nhan_vien_vi_tri). Chi lam "chinh" khi nhan vien CHUA co vi tri chinh
--      nao VA chuc danh con trong — tranh ghi de chuc danh cu the da khai.
--   3. Nhan vien vua duoc gan bac lam chinh: dien vi_tri_chinh_id + chuc danh.
--
-- Tu day tro di, dong bo nay chay TU DONG o code (tao ho so / sua nhan vien);
-- migration nay chi bu phan da co san truoc do.
-- ============================================================================

insert into vi_tri(ma, ten, cap_bac, pham_vi, phong_ban_id, mo_ta)
values
  ('bac.tong_giam_doc', 'Tổng Giám Đốc', 'cap_cao', 'toan_cong_ty', null,
   'Vị trí bậc đồng bộ tự động từ hồ sơ nhân sự — đổi bậc ở màn Nhân viên.'),
  ('bac.giam_doc', 'Giám đốc', 'cap_cao', 'toan_cong_ty', null,
   'Vị trí bậc đồng bộ tự động từ hồ sơ nhân sự — đổi bậc ở màn Nhân viên.'),
  ('bac.truong_phong', 'Trưởng phòng', 'truong_phong', 'toan_cong_ty', null,
   'Vị trí bậc đồng bộ tự động từ hồ sơ nhân sự — đổi bậc ở màn Nhân viên.'),
  ('bac.truong_nhom', 'Trưởng nhóm (Leader/Chuyên viên)', 'truong_nhom', 'toan_cong_ty', null,
   'Vị trí bậc đồng bộ tự động từ hồ sơ nhân sự — đổi bậc ở màn Nhân viên.'),
  ('bac.nhan_vien', 'Nhân viên', 'nhan_vien', 'toan_cong_ty', null,
   'Vị trí bậc đồng bộ tự động từ hồ sơ nhân sự — đổi bậc ở màn Nhân viên.'),
  ('bac.thu_viec', 'Thử việc', 'nhan_vien', 'toan_cong_ty', null,
   'Vị trí bậc đồng bộ tự động từ hồ sơ nhân sự — đổi bậc ở màn Nhân viên.'),
  ('bac.hoc_viec', 'Học việc (Thực tập sinh)', 'nhan_vien', 'toan_cong_ty', null,
   'Vị trí bậc đồng bộ tự động từ hồ sơ nhân sự — đổi bậc ở màn Nhân viên.')
on conflict (ma) do nothing;

-- Backfill: gan nhan vien da co bac vao vi tri bac tuong ung.
insert into nhan_vien_vi_tri(nhan_vien_id, vi_tri_id, la_chinh)
select nv.id, vt.id,
       (not exists (
          select 1 from nhan_vien_vi_tri c where c.nhan_vien_id = nv.id and c.la_chinh)
        and coalesce(trim(nv.chuc_danh), '') = '')
  from nhan_vien nv
  join vi_tri vt on vt.ma = 'bac.' || nv.vi_tri
 where nv.vi_tri is not null
on conflict (nhan_vien_id, vi_tri_id) do nothing;

-- Nhan vien vua duoc gan bac lam chinh: dien vi_tri_chinh_id + chuc danh con trong.
update nhan_vien nv
   set vi_tri_chinh_id = nvv.vi_tri_id,
       chuc_danh = case when coalesce(trim(nv.chuc_danh), '') = '' then vt.ten else nv.chuc_danh end,
       cap_nhat_luc = now()
  from nhan_vien_vi_tri nvv
  join vi_tri vt on vt.id = nvv.vi_tri_id
 where nvv.nhan_vien_id = nv.id and nvv.la_chinh and vt.ma like 'bac.%'
   and nv.vi_tri_chinh_id is null;
