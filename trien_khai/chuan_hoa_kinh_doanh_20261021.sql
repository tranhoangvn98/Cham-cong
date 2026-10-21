-- ============================================================================
-- Chuan hoa danh sach kinh doanh (21/10/2026) — chay TRONG container cham cong
-- SAU KHI deploy v1.122.6 (migration 108 tao bang phong_ban_kiem_nhiem).
--
--   docker compose exec -T postgres psql -U chamcong -d chamcong -f - < tep.sql
--
-- Idempotent: chay lai khong sinh trung, khong doi gi da dung.
-- ============================================================================
begin;

-- 1) Gop 5 nguoi con o "Kinh doanh Hà Nội"/"Kinh doanh Sài Gòn"/chua gan phong
--    ve "Phòng Kinh doanh" (quyet dinh 21/10: mot danh sach kinh doanh duy nhat).
update nhan_vien nv
   set phong_ban_id = pb_kd.id, cap_nhat_luc = now()
  from phong_ban pb_kd
 where pb_kd.ten = 'Phòng Kinh doanh'
   and nv.ma_nv in ('minhhuyenkd', 'maianhkd', 'hoangvietkd', 'khanhlykd', 'ERP200')
   and nv.dang_hoat_dong = true
   and nv.phong_ban_id is distinct from pb_kd.id;

-- 2) Hoàng Thị Thu Hiền (ERP69) KIÊM NHIỆM Phòng Kinh doanh — phòng chính vẫn
--    là Phòng Marketing.
insert into phong_ban_kiem_nhiem(nhan_vien_id, phong_ban_id)
select nv.id, pb_kd.id
  from nhan_vien nv, phong_ban pb_kd
 where nv.ma_nv = 'ERP69' and pb_kd.ten = 'Phòng Kinh doanh'
   and nv.dang_hoat_dong = true
on conflict do nothing;

commit;

-- ================================ doi chieu ket qua
\pset pager off
\echo '=== PHONG BAN CUA NHOM VUA CHUYEN ==='
select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
  from nhan_vien nv
  left join phong_ban pb on pb.id = nv.phong_ban_id
 where nv.dang_hoat_dong
   and nv.ma_nv in ('minhhuyenkd', 'maianhkd', 'hoangvietkd', 'khanhlykd', 'ERP200', 'ERP69')
 order by nv.ho_ten;

\echo '=== KIEM NHIEM HIEN CO ==='
select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
  from phong_ban_kiem_nhiem pbk
  join nhan_vien nv on nv.id = pbk.nhan_vien_id
  join phong_ban pb on pb.id = pbk.phong_ban_id
 order by nv.ho_ten;

\echo '=== SO NGUOI PHONG KINH DOANH SAU KHI GOM ==='
select pb.ten, count(nv.id) as dang_lam
  from phong_ban pb
  left join nhan_vien nv on nv.phong_ban_id = pb.id and nv.dang_hoat_dong
 where pb.ten in ('Phòng Kinh doanh', 'Kinh doanh Hà Nội', 'Kinh doanh Sài Gòn')
 group by pb.ten order by pb.ten;
