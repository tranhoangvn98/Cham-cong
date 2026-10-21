-- ============================================================================
-- Gop cac phong ban ten kinh doanh TRUNG LAP ve DUY NHAT "Phòng Kinh doanh".
--
-- Loi 21/10/2026: he thong co 4 phong "kinh doanh" song song ("Kinh doanh",
-- "Kinh doanh Hà Nội", "Kinh doanh Sài Gòn", "KD") — van ban 05/2026/TB-THVN da
-- ban hanh nham phong "Kinh doanh" RONG (0 nguoi) vi vay khong ai nhan duoc.
-- Sau lan nay chi con DUNG MOT phong "Phòng Kinh doanh".
--
-- Chay TRONG container:  docker compose exec -T postgres psql -U chamcong -d chamcong -f -
-- ============================================================================
begin;

create temp table pb_kd_nguon as
  select id from phong_ban
   where ten in ('Kinh doanh', 'Kinh doanh Hà Nội', 'Kinh doanh Sài Gòn', 'KD');

create temp table pb_kd_dich as
  select id from phong_ban where ten = 'Phòng Kinh doanh';

-- 1) Chuyen moi tham chieu tu cac phong trung sang "Phòng Kinh doanh".
--    THU TU QUAN TRONG: `thong_bao` xoa CASCADE khi mat phong — phai doi truoc.

update thong_bao tb
   set phong_ban_id = (select id from pb_kd_dich)
 where tb.phong_ban_id in (select id from pb_kd_nguon);

update thong_bao_nhap_ai n
   set phong_ban_id = (select id from pb_kd_dich)
 where n.phong_ban_id in (select id from pb_kd_nguon);

update van_ban_cong_ty vb
   set phong_ban_id = (select id from pb_kd_dich)
 where vb.phong_ban_id in (select id from pb_kd_nguon);

update vi_tri vt
   set phong_ban_id = (select id from pb_kd_dich)
 where vt.phong_ban_id in (select id from pb_kd_nguon);

update dau_viec dv
   set phong_ban_id = (select id from pb_kd_dich)
 where dv.phong_ban_id in (select id from pb_kd_nguon);

update de_nghi_them_nhan_su dn
   set phong_ban_id = (select id from pb_kd_dich)
 where dn.phong_ban_id in (select id from pb_kd_nguon);

update danh_muc_kpi dk
   set ap_dung_phong_ban = (select id from pb_kd_dich)
 where dk.ap_dung_phong_ban in (select id from pb_kd_nguon);

update nhan_vien nv
   set phong_ban_id = (select id from pb_kd_dich)
 where nv.phong_ban_id in (select id from pb_kd_nguon);

-- Kiem nhiem: xoa dong trung cap (nguoi da kiem nhiem dich) truoc, roi chuyen con lai.
delete from phong_ban_kiem_nhiem pbk
 using pb_kd_nguon s
 where pbk.phong_ban_id = s.id
   and exists (
     select 1 from phong_ban_kiem_nhiem x
      where x.nhan_vien_id = pbk.nhan_vien_id
        and x.phong_ban_id = (select id from pb_kd_dich)
   );

update phong_ban_kiem_nhiem pbk
   set phong_ban_id = (select id from pb_kd_dich)
 where pbk.phong_ban_id in (select id from pb_kd_nguon);

-- 2) Xoa cac phong trung (gio rong hoan toan).
delete from phong_ban where id in (select id from pb_kd_nguon);

commit;

-- ================================ doi chieu ket qua
\pset pager off
\echo '=== PHONG BAN CON TIN "KINH DOANH" TRONG TEN ==='
select ten, (select count(*) from nhan_vien nv
              where nv.phong_ban_id = pb.id and nv.dang_hoat_dong) as dang_lam
  from phong_ban pb
 where pb.ten ilike '%kinh doanh%'
 order by pb.ten;

\echo '=== THONG BAO TRUOC DAY NHAM PHONG (da ve dung noi) ==='
select tb.ma, pb.ten as phong_ban
  from thong_bao tb left join phong_ban pb on pb.id = tb.phong_ban_id
 where tb.phong_ban_id = (select id from pb_kd_dich)
 order by tb.tao_luc desc limit 5;
