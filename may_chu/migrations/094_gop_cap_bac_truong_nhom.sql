-- ============================================================================
-- 094 — Gộp cấp bậc "Chuyên viên" vào "Trưởng nhóm"
--
-- Quyết định công ty: Trưởng nhóm và Chuyên viên là MỘT vị trí. Các vị trí JD
-- cấp bậc `chuyen_vien` (BE, FE, CV-*) chuyển về `truong_nhom`, ràng buộc CHECK
-- bỏ giá trị `chuyen_vien` — bảng tổng quan "Vị trí theo cấp bậc" còn 4 cấp.
-- ============================================================================

update vi_tri set cap_bac = 'truong_nhom' where cap_bac = 'chuyen_vien';

-- Bo rang buoc CHECK cu theo ten tu dong sinh (tim qua pg_constraint, nhu migration 087).
do $$
declare c_name text;
begin
  select conname into c_name
    from pg_constraint
   where conrelid = 'vi_tri'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) like '%cap_bac%'
   limit 1;
  if c_name is not null then
    execute format('alter table vi_tri drop constraint %I', c_name);
  end if;
end $$;

alter table vi_tri
  add constraint vi_tri_cap_bac_hop_le
  check (cap_bac in ('cap_cao','truong_phong','truong_nhom','nhan_vien'));
