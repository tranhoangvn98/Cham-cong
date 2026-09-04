-- ============================================================================
-- LAP HO SO cho 3 nguoi con lai co quet nhung CHUA CO HO SO, roi gan PIN + gan nguoc lan quet.
--
--   PIN 14  Ngô Trung Kiên   — co trong so HSNS, quet ~120 ngay
--   PIN 31  Phan Song Hào     — ten lech dau/chinh ta giua hai nguon (may vs so)
--   PIN 37  Trần Văn Định     — co trong so HSNS, quet ~109 ngay
--
-- Ba nguoi nay bi `khai_pin_con_lai.sql` BO LAI vi khong tim thay ho so. Script nay tao ho so
-- toi thieu (ho ten + ma tam + ca Hanh chinh + dang hoat dong) roi lam not phan gan PIN.
--
-- MA TAM (TAM14/TAM31/TAM37): chi de he thong co cho gan. Nhan su vao Nhan vien -> sua lai
-- ma NV / phong ban / ngay vao / CCCD cho dung. KHI nhap so HSNS sau nay, bo doi chieu KHOP
-- THEO TEN nen se cap nhat dung ho so nay, KHONG tao ho so trung.
--
-- MAC DINH ROLLBACK. Doc DOI CHIEU + KIEM TRA, dung roi doi dong cuoi thanh `commit;`.
-- Sau khi commit PHAI bam "Tinh lai bang cong".
--
--   docker compose exec -T postgres psql -U chamcong -d chamcong < trien_khai/lap_ho_so_pin_14_31_37.sql
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off
\timing on

begin;

create temp table may_dung_chung (serial text primary key);
insert into may_dung_chung values ('8116254600435'), ('8116254600440');

-- Ca Hanh chinh (moi nguoi deu dung ca nay); du phong lay ca dau tien neu ten khac.
create temp table ca_mac_dinh as
select coalesce(
  (select id from ca_lam where ten ilike 'Hành chính%' order by tao_luc limit 1),
  (select id from ca_lam order by tao_luc limit 1)
) as id;

create temp table nguoi_moi (pin text primary key, ho_ten text, ma_nv text);
insert into nguoi_moi values
  ('14', 'Ngô Trung Kiên', 'TAM14'),
  ('31', 'Phan Song Hào',  'TAM31'),
  ('37', 'Trần Văn Định',  'TAM37');

-- ---------------------------------------------------------------- HANG RAO truoc khi tao
-- 1. Ky luong da duyet/tra trong khoang du lieu thi DUNG — gan nguoc lan quet lam bang cong doi.
do $$
declare n int; ke text;
begin
  if to_regclass('public.ky_luong') is null then
    raise exception 'Khong thay bang ky_luong. Dung lai.';
  end if;
  select count(*), string_agg(thang || ' (' || trang_thai || ')', ', ') into n, ke
    from ky_luong
   where trang_thai in ('da_duyet','da_tra') and thang between '2026-04' and '2026-09';
  if n > 0 then
    raise exception 'Da co ky luong duyet/tra trong khoang du lieu: %. Dung trang Lan quet -> '
      'Gan lai tren web thay vi script nay.', ke;
  end if;
end $$;

-- 2. Ten sap tao KHONG duoc trung ten nguoi da co (tranh tao ho so trung). Neu trung -> DUNG,
--    vi luc do phai GAN vao ho so co san chu khong tao moi.
do $$
declare trung text;
begin
  select string_agg(nm.ho_ten, ', ') into trung
    from nguoi_moi nm
   where exists (select 1 from nhan_vien nv
                  where lower(btrim(nv.ho_ten)) = lower(btrim(nm.ho_ten)));
  if trung is not null then
    raise exception 'Da co ho so trung ten: %. Dung script nay; gan PIN cho ho so san co bang '
      'khai_pin_con_lai.sql thay vi tao moi.', trung;
  end if;
end $$;

-- 3. PIN dang hieu luc cho NGUOI KHAC thi DUNG.
do $$
declare xung text;
begin
  select string_agg(format('PIN %s dang thuoc %s', md.ma_chuan, nv.ma_nv), '; ') into xung
    from ma_dinh_danh md
    join nhan_vien nv on nv.id = md.nhan_vien_id
    join nguoi_moi k on k.pin = md.ma_chuan
   where md.he_thong = 'may_cham_cong' and md.hieu_luc_den is null;
  if xung is not null then
    raise exception 'Xung dot: %. Phai thu hoi co y tren web.', xung;
  end if;
end $$;

-- ---------------------------------------------------------------- VIEC 1: tao ho so
insert into nhan_vien (ma_nv, ho_ten, ca_lam_id, ngay_vao, dang_hoat_dong)
select nm.ma_nv, nm.ho_ten, (select id from ca_mac_dinh),
       (select min((lq.thoi_diem + interval '7 hours')::date) from lan_quet lq
         where lq.pin_may = nm.pin and lq.nguon = 'may'
           and lq.thiet_bi_serial in (select serial from may_dung_chung)),
       true
  from nguoi_moi nm;

\echo ''
\echo '=== VIEC 1: ho so vua tao ==='
select nv.ma_nv, nv.ho_ten, coalesce(cl.ten,'(khong co ca)') as ca_lam,
       nv.ngay_vao, nv.dang_hoat_dong
  from nhan_vien nv
  join nguoi_moi nm on nm.ma_nv = nv.ma_nv
  left join ca_lam cl on cl.id = nv.ca_lam_id
 order by nm.pin::int;

-- ---------------------------------------------------------------- VIEC 2: ma_dinh_danh
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, hieu_luc_tu, nguon, ghi_chu)
select nv.id, 'may_cham_cong', nm.pin, nm.pin,
       coalesce((select min(lq.thoi_diem) from lan_quet lq
                  where lq.pin_may = nm.pin and lq.nguon = 'may'
                    and lq.thiet_bi_serial in (select serial from may_dung_chung)), now()),
       'nhap_csv', 'Lap ho so + khai PIN 14/31/37 — 28/08/2026'
  from nguoi_moi nm join nhan_vien nv on nv.ma_nv = nm.ma_nv;

-- ---------------------------------------------------------------- VIEC 3: cot pin_may
update nhan_vien nv
   set pin_may = nm.pin, cap_nhat_luc = now()
  from nguoi_moi nm
 where nv.ma_nv = nm.ma_nv
   and coalesce(nv.pin_may,'') = ''
   and not exists (select 1 from nhan_vien x where x.pin_may = nm.pin and x.id <> nv.id);

-- ---------------------------------------------------------------- VIEC 4: gan nguoc lan quet
create temp table da_gan as
with u as (
  update lan_quet lq
     set nhan_vien_id = nv.id
    from nguoi_moi nm join nhan_vien nv on nv.ma_nv = nm.ma_nv
   where lq.pin_may = nm.pin and lq.nguon = 'may' and lq.nhan_vien_id is null
     and lq.thiet_bi_serial in (select serial from may_dung_chung)
  returning lq.id, nv.id as nhan_vien_id, lq.pin_may, lq.thoi_diem
)
select id, nhan_vien_id, pin_may, (thoi_diem + interval '7 hours')::date as ngay from u;

\echo ''
\echo '=== VIEC 4: lan quet vua gan, theo tung nguoi ==='
select d.pin_may as pin, nv.ma_nv, nv.ho_ten,
       count(*) as so_lan_quet, count(distinct d.ngay) as so_ngay,
       min(d.ngay) as tu_ngay, max(d.ngay) as den_ngay
  from da_gan d join nhan_vien nv on nv.id = d.nhan_vien_id
 group by d.pin_may, nv.ma_nv, nv.ho_ten order by d.pin_may::int;

\echo ''
\echo '=== Cac thang phai tinh lai bang cong ==='
select to_char(ngay,'YYYY-MM') as thang, count(*) as so_lan_quet,
       count(distinct ngay) as so_ngay, count(distinct nhan_vien_id) as so_nguoi
  from da_gan group by 1 order by 1;

-- ---------------------------------------------------------------- KIEM TRA
\echo ''
\echo '=== KIEM TRA 1: cot pin_may <-> ma_dinh_danh (PHAI RONG) ==='
select nv.ma_nv, nv.ho_ten, nv.pin_may
  from nhan_vien nv join nguoi_moi nm on nm.ma_nv = nv.ma_nv
 where nv.pin_may is not null
   and not exists (select 1 from ma_dinh_danh md
                    where md.nhan_vien_id = nv.id and md.he_thong = 'may_cham_cong'
                      and md.hieu_luc_den is null and md.ma_chuan = nv.pin_may);

\echo ''
\echo '=== KIEM TRA 2: mot PIN dang hieu luc chi thuoc mot nguoi (PHAI RONG) ==='
select ma_chuan, count(*) from ma_dinh_danh
 where he_thong = 'may_cham_cong' and hieu_luc_den is null
 group by ma_chuan having count(*) > 1;

\echo ''
\echo '=== KIEM TRA 3: con lan quet chua gan cua 3 PIN nay khong (nen ve 0) ==='
select pin_may, count(*) from lan_quet
 where nguon = 'may' and nhan_vien_id is null and pin_may in ('14','31','37')
 group by pin_may order by pin_may;

\echo ''
\echo '################################################################'
\echo '#  rollback; = chay thu.   commit; = ghi that (doi dong cuoi).'
\echo '#  Doc VIEC 1 (dung 3 nguoi, dung ca) va KIEM TRA 1/2/3 (deu rong) truoc khi commit.'
\echo '#  SAU commit: Bang cong -> "Tinh lai bang cong" cho cac thang o tren.'
\echo '#  Roi vao Nhan vien sua ma tam TAM14/TAM31/TAM37 thanh ma that + phong ban.'
\echo '################################################################'

rollback;
-- Doi dong tren thanh:  commit;
