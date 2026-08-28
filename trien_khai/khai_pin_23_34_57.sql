-- ============================================================================
-- KHAI PIN 23 (Tran Minh Khanh), 34 (Tran Duc Hoang), 57 (Hoang Minh Ngoc)
-- VA GAN NGUOC LAN QUET
--
-- MAC DINH ROLLBACK. Doc phan KIEM TRA, dung roi thi doi dong cuoi thanh `commit;`.
--
-- Ba PIN nay bi bo lai khoi dot khai 29 PIN vi BA LY DO KHAC NHAU:
--
--   PIN 23 — may khai ten "Tran Thi Minh Khanh", ho so trong he thong ghi "Tran Minh Khanh".
--            Lech mot chu dem nen phep noi theo ten khop tuyet doi truot. 115 ngay quet dang
--            mo coi trong `lan_quet`, khong mat.
--   PIN 34 — KHONG co trong so HSNS (so do chi co 40 dong), nen doi chieu tu dong khong the
--            ra ten. Chinh chu da xac nhan truc tiep day la PIN cua minh. 72 ngay quet deu tu
--            13/04, thang 8 co 14 ngay — khop voi mot nguoi di lam that.
--   PIN 57 — trong `nhan_vien` co HAI ho so trung ten "Hoang Minh Ngoc". Script cu tu choi
--            chon ho, va tu choi dung: gan nham mot trong hai la cong cua nguoi nay chay sang
--            ho so kia.
--
-- VI SAO SCRIPT NAY KHONG HARDCODE `ma_nv` (khac script 29 PIN):
--   Dung hai cho nay la hai cho ten khong dang tin, nen hardcode mot ma la gia vo rang toi da
--   biet chac. Thay vao do script DO ra ung vien, IN HET ra, va chi khai khi ket qua khong con
--   cho nao de chon nham:
--     * dung 1 ung vien            -> khai
--     * nhieu ung vien, dung 1 nguoi DANG HOAT DONG -> khai nguoi do
--     * con lai (0 ung vien, hay >=2 nguoi dang hoat dong) -> BO LAI, in ro ly do, KHONG doan
--   Ban mac dinh la rollback nen anh doc bang "DOI CHIEU" o duoi truoc, roi moi commit.
--
-- Sau khi commit PHAI bam "Tinh lai bang cong" — script nay khong tinh lai (do la
-- `tinh_lai_khoang` ben TypeScript).
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off
\timing on

begin;

-- Hai dau doc cua MOT cua (xem lap luan day du trong khai_pin_tu_so_hsns.sql). Lan quet tren
-- may ngoai danh sach nay duoc BO LAI chu khong gan, vi so PIN do tung may cap.
create temp table may_dung_chung (serial text primary key);
insert into may_dung_chung values ('8116254600435'), ('8116254600440');

-- Chuan hoa ten truoc khi so: bo khoang trang thua, ha chu thuong. Khong bo dau — hai nguon
-- (so HSNS va `nhan_vien`) cung mot bang ma, lech la lech chu chu khong phai lech dau.
create temp table ung_vien (pin text primary key, nhan text, mo_ta text);
insert into ung_vien values
  ('23', 'trần%minh khánh', 'may khai "Trần Thị Minh Khánh" — ho so ghi "Trần Minh Khánh"'),
  ('34', 'trần đức hoàng',  'khong co trong so HSNS — chinh chu xac nhan day la PIN cua minh'),
  ('57', 'hoàng minh ngọc', 'may khai "Hoàng Minh Ngọc" — he thong co ho so trung ten');

create temp table doi_chieu as
select uv.pin, uv.mo_ta, nv.id, nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong,
       nv.ngay_vao, nv.ngay_nghi_viec, nv.pin_may as pin_dang_co,
       coalesce(cl.ten, '(chua gan ca)') as ca_lam,
       (select count(*) from bang_cong_ngay bc where bc.nhan_vien_id = nv.id)  as dong_bang_cong,
       (select count(*) from lan_quet lq   where lq.nhan_vien_id = nv.id)      as lan_quet_da_co
  from ung_vien uv
  join nhan_vien nv
    on lower(regexp_replace(btrim(coalesce(nv.ho_ten, '')), '\s+', ' ', 'g')) like uv.nhan
  left join ca_lam cl on cl.id = nv.ca_lam_id;

\echo ''
\echo '=== DOI CHIEU: PIN nay dang co nhung ho so nao khop ten ==='
select pin, ma_nv, ho_ten, dang_hoat_dong, ngay_vao, ngay_nghi_viec,
       coalesce(pin_dang_co, '-') as pin_dang_co, ca_lam, dong_bang_cong, lan_quet_da_co
  from doi_chieu order by pin::int, dang_hoat_dong desc, ma_nv;

-- Luat chon, viet mot lan o day chu khong rai trong nhieu cau:
--   dung 1 ung vien -> lay. Nhieu ung vien nhung dung 1 nguoi dang hoat dong -> lay nguoi do.
--   Con lai -> khong lay.
create temp table khai (pin text primary key, ma_nv text unique not null);
insert into khai (pin, ma_nv)
select pin, ma_nv from (
  select pin, ma_nv, dang_hoat_dong,
         count(*)                                  over (partition by pin) as so_ung_vien,
         count(*) filter (where dang_hoat_dong)     over (partition by pin) as so_dang_hd
    from doi_chieu
) t
 where so_ung_vien = 1
    or (so_dang_hd = 1 and dang_hoat_dong);

\echo ''
\echo '=== SE KHAI: PIN -> ho so ==='
select k.pin, k.ma_nv, nv.ho_ten, nv.dang_hoat_dong,
       (select count(*) from lan_quet lq
         where lq.pin_may = k.pin and lq.nguon = 'may' and lq.nhan_vien_id is null
           and lq.thiet_bi_serial in (select serial from may_dung_chung)) as se_gan_bao_nhieu_quet
  from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
 order by k.pin::int;

\echo ''
\echo '=== BO LAI: PIN khong khai duoc, va ly do ==='
select uv.pin, uv.mo_ta,
       (select count(*) from doi_chieu d where d.pin = uv.pin) as so_ho_so_khop_ten,
       (select count(*) from doi_chieu d where d.pin = uv.pin and d.dang_hoat_dong)
         as so_ho_so_dang_hoat_dong,
       case when (select count(*) from doi_chieu d where d.pin = uv.pin) = 0
              then 'KHONG co ho so nao khop ten — kiem lai ten trong nhan_vien'
            else 'NHIEU ho so cung dang hoat dong — chay `npm run gop_trung` gop ho so trung '
                 'truoc, roi chay lai script nay' end as phai_lam_gi
  from ung_vien uv
 where uv.pin not in (select pin from khai);

-- ============================================================ HANG RAO

-- 1. Ky luong da duyet trong khoang du lieu thi DUNG. Gan nguoc lan quet lam bang cong doi,
--    ma bang luong tinh TU bang cong. Bang khong ton tai cung dung: fail-closed.
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
      'Gan lai tren web, no chan tung thang thay vi chan ca lan chay.', ke;
  end if;
end $$;

-- 2. Khong khai duoc PIN nao thi DUNG — de khong ai commit mot lan chay rong roi tuong da xong.
do $$
declare n int;
begin
  select count(*) into n from khai;
  if n = 0 then
    raise exception 'Khong khai duoc PIN nao. Doc bang "BO LAI" o tren de biet phai lam gi.';
  end if;
  raise notice 'Se khai % PIN.', n;
end $$;

-- 3. PIN dang hieu luc cho NGUOI KHAC thi DUNG. Thu hoi phai la mot hanh dong co y, lam tren
--    web, chu khong phai tac dung phu cua mot script khai.
do $$
declare xung text;
begin
  select string_agg(format('PIN %s dang thuoc %s', md.ma_chuan, nv.ma_nv), '; ') into xung
    from ma_dinh_danh md
    join nhan_vien nv on nv.id = md.nhan_vien_id
    join khai k on k.pin = md.ma_chuan
   where md.he_thong = 'may_cham_cong' and md.hieu_luc_den is null and nv.ma_nv <> k.ma_nv;
  if xung is not null then
    raise exception 'Xung dot: %. Phai thu hoi co y tren web.', xung;
  end if;
end $$;

-- 4. Lan quet cua hai PIN nay tren may NGOAI danh sach dung chung: bao ra, va BO LAI.
\echo ''
\echo '--- HANG RAO 4: lan quet cua PIN nay tren may NGOAI danh sach -> BO LAI (khong gan) ---'
select lq.thiet_bi_serial, tb.ten, tb.vi_tri, lq.pin_may, count(*) as so_lan,
       min((lq.thoi_diem + interval '7 hours')::date) as tu,
       max((lq.thoi_diem + interval '7 hours')::date) as den
  from lan_quet lq
  join khai k on k.pin = lq.pin_may
  left join thiet_bi tb on tb.serial = lq.thiet_bi_serial
 where lq.nguon = 'may'
   and (lq.thiet_bi_serial is null
        or lq.thiet_bi_serial not in (select serial from may_dung_chung))
 group by lq.thiet_bi_serial, tb.ten, tb.vi_tri, lq.pin_may
 order by lq.pin_may::int, lq.thiet_bi_serial;

-- PIN 34 se hien 'XEM LAI' o bang duoi: no quet o ca hai may khoang 79% so ngay, duoi nguong
-- 90%. Nguong do la mot phep DO GIAN TIEP, dung khi khong biet chu PIN la ai — o day chinh chu
-- da xac nhan, tuc la co bang chung manh hon con so. Dang quet thua o mot may cung khop voi
-- PIN 39 (Giam doc): nguoi hay ra vao le gio thi khong quet du doi cong vao/cong ra moi ngay.
\echo ''
\echo '--- Can cu: PIN nay quet o ca hai may trong bao nhieu ngay ---'
select k.pin, d.ngay_ca_hai_may, d.ngay_mot_may, d.tong_ngay,
       case when d.ngay_mot_may = 0 then 'ca hai may MOI ngay'
            when d.ngay_ca_hai_may::numeric / d.tong_ngay >= 0.9 then 'ca hai may >=90% ngay'
            else 'XEM LAI' end as danh_gia
  from khai k
  join (select pin_may as pin,
               count(*) filter (where so_may = 2) as ngay_ca_hai_may,
               count(*) filter (where so_may = 1) as ngay_mot_may,
               count(*) as tong_ngay
          from (select pin_may, (thoi_diem + interval '7 hours')::date as ngay,
                       count(distinct thiet_bi_serial) as so_may
                  from lan_quet
                 where nguon = 'may'
                   and thiet_bi_serial in (select serial from may_dung_chung)
                 group by 1, 2) x
         group by pin_may) d on d.pin = k.pin
 order by (k.pin::int);

-- ============================================================ VIEC 1: dong ma_dinh_danh
-- `hieu_luc_tu` lay lan quet dau tien cua chinh PIN do. Khong can lui them: luat 1 cua
-- `tra_pin` mo khoang dau tien ve phia truoc, nen dong duy nhat nay om het lich su cua PIN.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, hieu_luc_tu, nguon, ghi_chu)
select nv.id, 'may_cham_cong', k.pin, k.pin,
       coalesce((select min(lq.thoi_diem) from lan_quet lq
                  where lq.pin_may = k.pin and lq.nguon = 'may'
                    and lq.thiet_bi_serial in (select serial from may_dung_chung)), now()),
       'nhap_csv', 'Khai bu PIN 23/34/57 sau dot 29 PIN — 28/08/2026'
  from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
 where not exists (
   select 1 from ma_dinh_danh md
    where md.he_thong = 'may_cham_cong' and md.ma_chuan = k.pin
      and md.hieu_luc_den is null and md.nhan_vien_id = nv.id);

\echo ''
\echo '--- VIEC 1: dong ma_dinh_danh vua them ---'
select nv.ma_nv, nv.ho_ten, md.ma_chuan as pin, md.hieu_luc_tu::date as hieu_luc_tu
  from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
 where md.ghi_chu = 'Khai bu PIN 23/34/57 sau dot 29 PIN — 28/08/2026'
 order by md.ma_chuan::int;

-- ============================================================ VIEC 2: cot nhan_vien.pin_may
-- `pin_may` la UNIQUE. Chi ghi khi dang trong VA khong ai khac dang giu so do.
update nhan_vien nv
   set pin_may = k.pin, cap_nhat_luc = now()
  from khai k
 where nv.ma_nv = k.ma_nv
   and coalesce(nv.pin_may, '') = ''
   and not exists (select 1 from nhan_vien x where x.pin_may = k.pin and x.id <> nv.id);

\echo ''
\echo '--- VIEC 2: cot pin_may cua nhung nguoi vua khai ---'
select nv.ma_nv, nv.ho_ten, coalesce(nv.pin_may, '(VAN TRONG)') as pin_may
  from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv order by k.pin::int;

-- ============================================================ VIEC 3: gan nguoc lan quet
create temp table da_gan as
with u as (
  update lan_quet lq
     set nhan_vien_id = nv.id
    from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
   where lq.pin_may = k.pin and lq.nguon = 'may' and lq.nhan_vien_id is null
     and lq.thiet_bi_serial in (select serial from may_dung_chung)
  returning lq.id, nv.id as nhan_vien_id, lq.pin_may, lq.thoi_diem
)
select id, nhan_vien_id, pin_may, (thoi_diem + interval '7 hours')::date as ngay from u;

\echo ''
\echo '--- VIEC 3: lan quet vua duoc gan, theo tung nguoi ---'
select d.pin_may as pin, nv.ma_nv, nv.ho_ten,
       count(*) as so_lan_quet, count(distinct d.ngay) as so_ngay,
       min(d.ngay) as tu_ngay, max(d.ngay) as den_ngay
  from da_gan d join nhan_vien nv on nv.id = d.nhan_vien_id
 group by d.pin_may, nv.ma_nv, nv.ho_ten order by d.pin_may::int;

\echo ''
\echo '--- VIEC 3: cac thang phai tinh lai bang cong ---'
select to_char(ngay, 'YYYY-MM') as thang, count(*) as so_lan_quet,
       count(distinct ngay) as so_ngay, count(distinct nhan_vien_id) as so_nguoi
  from da_gan group by 1 order by 1;

-- ============================================================ KIEM TRA
\echo ''
\echo '=== KIEM TRA 1: lan quet may — bao nhieu da biet cua ai ==='
select count(*) filter (where nhan_vien_id is null)     as chua_biet,
       count(*) filter (where nhan_vien_id is not null) as da_biet,
       count(*)                                          as tong
  from lan_quet where nguon = 'may';

\echo ''
\echo '=== KIEM TRA 2: PIN con treo, 15 cai nhieu lan nhat ==='
select pin_may, count(*) as so_lan,
       string_agg(distinct thiet_bi_serial, ' | ') as cac_may,
       max((thoi_diem + interval '7 hours')::date) as quet_cuoi
  from lan_quet where nguon = 'may' and nhan_vien_id is null
 group by pin_may order by count(*) desc limit 15;

\echo ''
\echo '=== KIEM TRA 3: cot va bang noi cung mot chuyen (PHAI RONG) ==='
select nv.ma_nv, nv.ho_ten, nv.pin_may as cot
  from nhan_vien nv
 where nv.pin_may is not null
   and not exists (
     select 1 from ma_dinh_danh md
      where md.nhan_vien_id = nv.id and md.he_thong = 'may_cham_cong'
        and md.hieu_luc_den is null and md.ma_chuan = nv.pin_may);

\echo ''
\echo '=== KIEM TRA 4: mot ma dang hieu luc chi thuoc mot nguoi (PHAI RONG) ==='
select ma_chuan, count(*) as so_nguoi from ma_dinh_danh
 where he_thong = 'may_cham_cong' and hieu_luc_den is null
 group by ma_chuan having count(*) > 1;

\echo ''
\echo '=== KIEM TRA 5: ho da co ca lam viec chua (khong co ca thi bang cong sai) ==='
select nv.ma_nv, nv.ho_ten, coalesce(cl.ten, '>>> CHUA CO CA <<<') as ca_lam,
       nv.dang_hoat_dong
  from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
  left join ca_lam cl on cl.id = nv.ca_lam_id
 order by k.pin::int;

\echo ''
\echo '################################################################'
\echo '#  GHI HAY KHONG LA DO DONG CUOI CUNG CUA FILE NAY:'
\echo '#     rollback;   -> chay thu, khong ghi gi ca'
\echo '#     commit;     -> ghi that'
\echo '#'
\echo '#  Truoc khi doi sang commit, doc ba thu:'
\echo '#   1. Bang "DOI CHIEU" — ho so duoc chon co dung nguoi khong.'
\echo '#   2. Bang "BO LAI" — PIN nao khong khai duoc va vi sao.'
\echo '#   3. KIEM TRA 3 va 4 phai RONG.'
\echo '#'
\echo '#  SAU KHI COMMIT phai bam "Tinh lai bang cong" cho khoang co lan quet vua gan'
\echo '#  (xem bang "cac thang phai tinh lai"), moi lan toi da 92 ngay.'
\echo '################################################################'

rollback;
-- Doi dong tren thanh:  commit;
