-- ============================================================================
-- KHAI 29 PIN DA XAC NHAN + GAN NGUOC CAC LAN QUET
--
-- MAC DINH ROLLBACK — chay lan dau khong ghi gi. Doc phan KIEM TRA, dung roi thi doi dong
-- cuoi cung tu `rollback;` thanh `commit;` va chay lai.
--
-- Khoa theo ma_nv, KHONG theo ho ten. Ho ten khong dang tin: hai Tran Minh Anh, hai Hoang
-- Minh Ngoc, va ba ten lech chinh ta (Phan Song Hao / Thanh Binh Dao / Tran Minh Khanh).
--
-- Sao lai dung hai viec `gan_ma` lam: them dong `ma_dinh_danh` + ghi cot `nhan_vien.pin_may`.
-- Phan TINH LAI bang cong KHONG lam o day — bam "Tinh lai bang cong" tren web sau khi commit.
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off
\timing on

begin;

create temp table khai (pin text primary key, ma_nv text unique not null);
insert into khai (pin, ma_nv)
select * from unnest(
  array[
      '3', '5', '6', '7', '8', '12', '16', '19', '20', '22', '24', '28', '30', '33', '35',
      '36', '38', '39', '44', '47', '49', '50', '51', '54', '55', '60', '61', '62', '63'
  ]::text[],
  array[
      'ERP16', 'ERP114', 'ERP2', 'ERP105', 'ERP109', 'ERP107', 'ERP100', 'ERP106',
      'ERP120', 'ERP67', 'ERP123', 'ERP69', 'ERP115', 'ERP128', 'ERP131', 'ERP129',
      'ERP130', 'ERP10', 'ERP135', 'ERP137', 'ERP151', 'ERP140', 'ERP150', 'ERP142',
      'ERP144', 'ERP153', 'ERP154', 'ERP155', 'ERP156'
  ]::text[]
);

-- ============================================================ HANG RAO
-- Bon hang rao. Ba cai dau sao lai luat cua ung dung; cai thu tu la luat cua di tru 026.

-- 1. KY LUONG DA DUYET trong khoang du lieu (2026-04 .. 2026-08).
--    Gan nguoc lan quet lam bang cong doi, ma bang luong tinh TU bang cong — so da tra se
--    khong con khop can cu. Dung luat cua `ky_da_chot_luong()`.
--    Bang khong ton tai thi cung DUNG: fail-closed, khong doan.
do $$
declare n int; ke text;
begin
  if to_regclass('public.ky_luong') is null then
    raise exception 'Khong thay bang ky_luong. Dung lai — bao lai de kiem dung ten bang.';
  end if;
  select count(*), string_agg(thang || ' (' || trang_thai || ')', ', ')
    into n, ke
    from ky_luong
   where trang_thai in ('da_duyet','da_tra')
     and thang between '2026-04' and '2026-08';
  if n > 0 then
    raise exception 'Da co ky luong duyet/tra trong khoang du lieu: %. '
      'Dung trang Lan quet -> Gan lai tren web, no chan tung thang thay vi chan ca lan chay.', ke;
  end if;
end $$;

-- 2. ma_nv phai co that.
do $$
declare thieu text;
begin
  select string_agg(k.ma_nv, ', ') into thieu
    from khai k left join nhan_vien nv on nv.ma_nv = k.ma_nv
   where nv.id is null;
  if thieu is not null then raise exception 'Khong tim thay ma_nv: %', thieu; end if;
end $$;

-- 3. PIN dang hieu luc cho NGUOI KHAC thi DUNG. `gan_ma` tu choi truong hop nay va bat nguoi
--    goi noi ro la co y thu hoi; script khong duoc tu quyet.
do $$
declare xung text;
begin
  select string_agg(format('PIN %s dang thuoc %s', md.ma_chuan, nv.ma_nv), '; ') into xung
    from ma_dinh_danh md
    join nhan_vien nv on nv.id = md.nhan_vien_id
    join khai k on k.pin = md.ma_chuan
   where md.he_thong = 'may_cham_cong' and md.hieu_luc_den is null and nv.ma_nv <> k.ma_nv;
  if xung is not null then
    raise exception 'Xung dot: %. Phai thu hoi co y tren web, khong de script lam am tham.', xung;
  end if;
end $$;

-- 4. PIN o NHIEU MAY thi BO QUA lan nay, khong doan. Di tru 026: so PIN do TUNG MAY cap, nen
--    cung mot so o hai may co the la hai nguoi khac nhau.
create temp table nhieu_may as
select k.pin, count(distinct lq.thiet_bi_serial) as so_may,
       string_agg(distinct lq.thiet_bi_serial, ' | ') as cac_may,
       count(*) as tong_lan
  from khai k join lan_quet lq on lq.pin_may = k.pin and lq.nguon = 'may'
 group by k.pin having count(distinct lq.thiet_bi_serial) > 1;

\echo ''
\echo '--- HANG RAO 4: PIN o nhieu may -> BO QUA (rong la tot) ---'
select * from nhieu_may order by (pin::int);

delete from khai where pin in (select pin from nhieu_may);

\echo ''
\echo '--- So PIN se khai trong lan chay nay ---'
select count(*) as so_pin from khai;

-- ============================================================ VIEC 1: dong ma_dinh_danh
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, hieu_luc_tu, nguon, ghi_chu)
select nv.id, 'may_cham_cong', k.pin, k.pin,
       coalesce((select min(lq.thoi_diem) from lan_quet lq
                  where lq.pin_may = k.pin and lq.nguon = 'may'), now()),
       'nhap_csv', 'Doi chieu so HSNS voi log may 27/08/2026'
  from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
 where not exists (
   select 1 from ma_dinh_danh md
    where md.he_thong = 'may_cham_cong' and md.ma_chuan = k.pin
      and md.hieu_luc_den is null and md.nhan_vien_id = nv.id);

\echo ''
\echo '--- VIEC 1: dong ma_dinh_danh vua them ---'
select count(*) as so_dong from ma_dinh_danh
 where nguon = 'nhap_csv' and ghi_chu = 'Doi chieu so HSNS voi log may 27/08/2026';

-- ============================================================ VIEC 2: cot cu nhan_vien.pin_may
-- `pin_may` la UNIQUE. Chi ghi khi dang trong VA khong ai khac dang giu so do.
update nhan_vien nv
   set pin_may = k.pin, cap_nhat_luc = now()
  from khai k
 where nv.ma_nv = k.ma_nv
   and coalesce(nv.pin_may, '') = ''
   and not exists (select 1 from nhan_vien x where x.pin_may = k.pin and x.id <> nv.id);

\echo ''
\echo '--- VIEC 2: ho so co cot pin_may ---'
select count(*) as so_ho_so from nhan_vien where pin_may is not null;

-- ============================================================ VIEC 3: gan nguoc lan quet
-- `UPDATE ... RETURNING` phai boc trong CTE — `create table as update` khong hop le.
create temp table da_gan as
with u as (
  update lan_quet lq
     set nhan_vien_id = nv.id
    from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
   where lq.pin_may = k.pin and lq.nguon = 'may' and lq.nhan_vien_id is null
  returning lq.id, nv.id as nhan_vien_id, lq.thoi_diem
)
select id, nhan_vien_id, (thoi_diem + interval '7 hours')::date as ngay from u;

\echo ''
\echo '--- VIEC 3: lan quet vua duoc gan ---'
select count(*) as so_lan_quet, count(distinct nhan_vien_id) as so_nguoi,
       count(distinct ngay) as so_ngay, min(ngay) as tu_ngay, max(ngay) as den_ngay
  from da_gan;

\echo ''
\echo '--- VIEC 3: cac thang bi anh huong (dung de biet phai tinh lai nhung thang nao) ---'
select to_char(ngay, 'YYYY-MM') as thang, count(*) as so_lan_quet,
       count(distinct ngay) as so_ngay, count(distinct nhan_vien_id) as so_nguoi
  from da_gan group by 1 order by 1;

-- ============================================================ KIEM TRA
\echo ''
\echo '=== KIEM TRA 1: lan quet may — bao nhieu da biet cua ai ==='
select count(*) filter (where nhan_vien_id is null)     as chua_biet,
       count(*) filter (where nhan_vien_id is not null)  as da_biet,
       count(*)                                          as tong
  from lan_quet where nguon = 'may';

\echo ''
\echo '=== KIEM TRA 2: PIN con treo, 15 cai nhieu lan nhat ==='
select pin_may, count(*) as so_lan,
       count(distinct (thoi_diem + interval '7 hours')::date) as so_ngay,
       max((thoi_diem + interval '7 hours')::date) as quet_cuoi
  from lan_quet where nguon = 'may' and nhan_vien_id is null
 group by pin_may order by count(*) desc limit 15;

\echo ''
\echo '=== KIEM TRA 3: cot va bang co noi cung mot chuyen (PHAI RONG) ==='
-- `may_cham_cong` cho phep NHIEU ma, nen cot chi can nam TRONG tap ma dang hieu luc.
select nv.ma_nv, nv.ho_ten, nv.pin_may as cot,
       coalesce((select string_agg(md.ma_chuan, ',' order by md.ma_chuan)
                   from ma_dinh_danh md
                  where md.nhan_vien_id = nv.id and md.he_thong = 'may_cham_cong'
                    and md.hieu_luc_den is null), '(khong co)') as bang
  from nhan_vien nv
 where nv.pin_may is not null
   and not exists (
     select 1 from ma_dinh_danh md
      where md.nhan_vien_id = nv.id and md.he_thong = 'may_cham_cong'
        and md.hieu_luc_den is null and md.ma_chuan = nv.pin_may);

\echo ''
\echo '=== KIEM TRA 4: mot ma dang hieu luc chi thuoc mot nguoi (PHAI RONG) ==='
select ma_chuan, count(*) as so_nguoi
  from ma_dinh_danh
 where he_thong = 'may_cham_cong' and hieu_luc_den is null
 group by ma_chuan having count(*) > 1;

\echo ''
\echo '=== KIEM TRA 5: bang cong ngay — chua tinh lai, con la so cu ==='
select count(*) as so_dong_bang_cong from bang_cong_ngay;

\echo ''
\echo '################################################################'
\echo '#  DANG LA ROLLBACK — CHUA GHI GI CA.'
\echo '#  Kiem tra 3 va 4 phai RONG. Kiem tra 1 phai thay chua_biet giam manh.'
\echo '#  Dung roi: doi dong cuoi thanh  commit;  roi chay lai.'
\echo '#  Sau khi commit: vao web bam "Tinh lai bang cong" cho 04-06/2026 va 07-08/2026'
\echo '#  (moi lan toi da 92 ngay nen phai chia hai lan).'
\echo '################################################################'

rollback;
-- Doi dong tren thanh:  commit;
