-- ============================================================================
-- CHI DOC. Khong tao, khong sua, khong xoa gi.
--
-- Ba nguoi bao "khong co du lieu cham cong": Tran Minh Khanh, Hoang Minh Ngoc,
-- Tran Duc Hoang. Doi chieu voi so HSNS va danh sach PIN doc tu may, ba nguoi nay
-- roi vao BA nguyen nhan khac nhau — script in du so lieu de xac nhan tung cai.
--
-- Chay: psql ... -f trien_khai/kiem_ba_nguoi_khong_co_cham_cong.sql
-- ============================================================================
\pset pager off

-- Ba mau ten. Dung ILIKE vi ten trong `nhan_vien` (dong bo tu ERP) va ten khai tren may
-- co the lech mot chu dem — chinh cho lech do la mot trong ba nguyen nhan.
-- Khong dung `on commit drop`: psql chay moi cau lenh trong mot giao dich rieng, nen bang se
-- bi xoa ngay sau khi tao va cac cau duoi khong thay no.
create temp table can_tim(nhan text, ghi_chu text);
insert into can_tim values
  ('Trần%Minh Khánh',  'may co PIN 23 ten "Trần Thị Minh Khánh" — so HSNS ma 23'),
  ('%Hoàng Minh Ngọc%', 'may co PIN 57 ten "Hoàng Minh Ngọc" — so HSNS ma 57'),
  ('%Trần Đức Hoàng%',  'KHONG thay trong 63 PIN cua may, cung khong co trong so HSNS 40 dong');

\echo ''
\echo '=== 1. HO SO trong nhan_vien — co bao nhieu dong khop moi ten? ==='
\echo '    (2 dong tro len = ho so trung, phai gop truoc khi khai PIN)'
select ct.nhan as mau_ten,
       coalesce(nv.ma_nv, '(KHONG CO HO SO NAO)') as ma_nv,
       nv.ho_ten,
       coalesce(pb.ten, '-')            as phong_ban,
       coalesce(nv.pin_may, '(chua co)') as pin_may,
       nv.dang_hoat_dong,
       nv.ngay_vao, nv.ngay_nghi_viec,
       coalesce(cl.ten, '(chua gan ca)') as ca_lam
  from can_tim ct
  left join nhan_vien nv on nv.ho_ten ilike ct.nhan
  left join phong_ban  pb on pb.id = nv.phong_ban_id
  left join ca_lam     cl on cl.id = nv.ca_lam_id
 order by ct.nhan, nv.ma_nv;

\echo ''
\echo '=== 2. Da khai PIN cho ho chua (bang ma_dinh_danh) ==='
select nv.ma_nv, nv.ho_ten, md.ma_chuan as pin,
       md.hieu_luc_tu::date as tu, md.hieu_luc_den::date as den, md.nguon
  from can_tim ct
  join nhan_vien nv on nv.ho_ten ilike ct.nhan
  left join ma_dinh_danh md
         on md.nhan_vien_id = nv.id and md.he_thong = 'may_cham_cong'
 order by nv.ma_nv, md.hieu_luc_tu;

\echo ''
\echo '=== 3. So lan quet DA GAN cho ho, va so dong bang cong ==='
select nv.ma_nv, nv.ho_ten,
       (select count(*) from lan_quet lq where lq.nhan_vien_id = nv.id)        as lan_quet_da_gan,
       (select count(*) from bang_cong_ngay bc where bc.nhan_vien_id = nv.id)  as dong_bang_cong,
       (select count(*) from bang_cong_ngay bc
         where bc.nhan_vien_id = nv.id and bc.trang_thai = 'co_mat')           as ngay_co_mat
  from can_tim ct join nhan_vien nv on nv.ho_ten ilike ct.nhan
 order by nv.ma_nv;

\echo ''
\echo '=== 4. PIN 23 va PIN 57: du lieu quet DANG NAM CHO, chua gan cho ai ==='
\echo '    Neu hai PIN nay con hang nghin lan quet chua gan thi du lieu KHONG mat —'
\echo '    no dang mo coi vi chua khai PIN cho ho so.'
select lq.pin_may as pin,
       count(*)                                                as tong_lan_quet,
       count(*) filter (where lq.nhan_vien_id is null)         as chua_gan_ai,
       min((lq.thoi_diem + interval '7 hours')::date)          as quet_tu,
       max((lq.thoi_diem + interval '7 hours')::date)          as quet_den,
       count(distinct (lq.thoi_diem + interval '7 hours')::date) as so_ngay
  from lan_quet lq
 where lq.nguon = 'may' and lq.pin_may in ('23','57')
 group by lq.pin_may
 order by lq.pin_may::int;

\echo ''
\echo '=== 5. PIN 23 / 57 quet theo thang — de thay ho VAN DI LAM ==='
select lq.pin_may as pin,
       to_char(lq.thoi_diem + interval '7 hours', 'YYYY-MM')     as thang,
       count(distinct (lq.thoi_diem + interval '7 hours')::date) as so_ngay,
       count(*)                                                  as so_lan
  from lan_quet lq
 where lq.nguon = 'may' and lq.pin_may in ('23','57')
 group by 1, 2 order by 1::int, 2;

\echo ''
\echo '=== 6. Con nhung PIN nao chua gan cho ai (de tim Tran Duc Hoang) ==='
\echo '    Neu anh Hoang co di lam va co quet the, ten anh ay phai nam o MOT trong cac PIN duoi.'
\echo '    Cot ten khong co trong CSDL — phai mo may cham cong doc ten theo so PIN.'
select lq.pin_may as pin,
       count(*)                                                  as lan_quet_chua_gan,
       min((lq.thoi_diem + interval '7 hours')::date)            as quet_tu,
       max((lq.thoi_diem + interval '7 hours')::date)            as quet_den,
       count(distinct (lq.thoi_diem + interval '7 hours')::date) as so_ngay,
       count(distinct (lq.thoi_diem + interval '7 hours')::date)
         filter (where lq.thoi_diem >= '2026-08-01')             as so_ngay_thang_8
  from lan_quet lq
 where lq.nguon = 'may' and lq.nhan_vien_id is null
 group by lq.pin_may
 having count(*) > 0
 order by count(*) desc;

\echo ''
\echo '=== 7. Tong ket: bao nhieu lan quet con mo coi ==='
select (select count(*) from lan_quet where nguon='may' and nhan_vien_id is null) as quet_chua_biet_ai,
       (select count(distinct pin_may) from lan_quet
         where nguon='may' and nhan_vien_id is null)                              as so_pin_chua_khai,
       (select count(*) from lan_quet where nguon='may')                          as tong_lan_quet_may;
