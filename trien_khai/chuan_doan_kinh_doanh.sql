-- ============================================================================
-- Chuan doan "danh sach kinh doanh" trong phan he Cham cong
-- (thong bao pham vi phong ban gui theo nhan_vien.phong_ban_id).
-- Chi SELECT — khong sua du lieu.
-- ============================================================================
\pset pager off

\echo '=== 1. PHONG BAN VA SO NGUOI ==='
select pb.ten,
       count(nv.id) filter (where nv.dang_hoat_dong) as dang_lam,
       count(nv.id) as tat_ca
from phong_ban pb
left join nhan_vien nv on nv.phong_ban_id = pb.id
group by pb.id, pb.ten
order by pb.ten;

\echo '=== 2. NV DANG HOAT DONG CHUA GAN PHONG BAN ==='
select ma_nv, ho_ten, email
from nhan_vien
where dang_hoat_dong and phong_ban_id is null
order by ho_ten;

\echo '=== 3. NV CO VI TRI KINH DOANH (NVKD / TP-KD) — NGUON TO CHUC ==='
select nv.ma_nv, nv.ho_ten,
       string_agg(vt.ma || ':' || case when nvv.la_chinh then 'chinh' else 'phu' end,
                  ', ' order by vt.ma) as vi_tri,
       coalesce(pb.ten, '(chua gan phong)') as phong_ban,
       nv.email
from nhan_vien nv
join nhan_vien_vi_tri nvv on nvv.nhan_vien_id = nv.id
join vi_tri vt on vt.id = nvv.vi_tri_id
left join phong_ban pb on pb.id = nv.phong_ban_id
where vt.ma in ('NVKD', 'TP-KD')
  and nv.dang_hoat_dong
group by nv.id, nv.ma_nv, nv.ho_ten, pb.ten, nv.email
order by nv.ho_ten;

\echo '=== 4. TAT CA NV DANG HOAT DONG THEO PHONG ==='
select nv.ma_nv, nv.ho_ten, coalesce(pb.ten, '(chua gan)') as phong_ban
from nhan_vien nv
left join phong_ban pb on pb.id = nv.phong_ban_id
where nv.dang_hoat_dong
order by coalesce(pb.ten, '(chua gan)'), nv.ho_ten;

\echo '=== 5. TAI KHOAN QUAN TRI (admin / nhan_su) ==='
select nd.ten_dang_nhap, nd.vai_tro, nd.dang_hoat_dong as nd_hoat_dong,
       nv.ma_nv, nv.ho_ten, nv.email, nv.dang_hoat_dong as nv_hoat_dong,
       coalesce(pb.ten, '(chua gan)') as phong_ban
from nguoi_dung nd
left join nhan_vien nv on nv.id = nd.nhan_vien_id
left join phong_ban pb on pb.id = nv.phong_ban_id
where nd.vai_tro in ('admin', 'nhan_su')
order by nd.vai_tro, nd.ten_dang_nhap;

\echo '=== 6. TIM HOANG THI THU HIEN ==='
select nv.ma_nv, nv.ho_ten, nv.email, nv.dang_hoat_dong,
       (select ten from phong_ban pb where pb.id = nv.phong_ban_id) as phong_ban
from nhan_vien nv
where nv.ho_ten ilike '%hiền%'
   or (nv.ho_ten ilike '%thu%' and nv.ho_ten ilike '%hien%')
order by nv.ho_ten;
