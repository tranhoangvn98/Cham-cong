-- ============================================================================
-- KHAI 29 PIN DA XAC NHAN + GAN NGUOC CAC LAN QUET
--
-- MAC DINH ROLLBACK. Doc phan KIEM TRA, dung roi thi doi dong cuoi thanh `commit;`.
--
-- Khoa theo ma_nv, KHONG theo ho ten. Ho ten khong dang tin: hai Tran Minh Anh, hai Hoang
-- Minh Ngoc (deu la ho so trung can gop), ba ten lech chinh ta so voi so HSNS.
--
-- Sao lai dung hai viec `gan_ma` lam: them dong `ma_dinh_danh` + ghi cot `nhan_vien.pin_may`.
-- KHONG tinh lai `bang_cong_ngay` — do la `tinh_lai_khoang` trong TypeScript.
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off
\timing on

begin;

-- ============================================================ HAI MAY DUNG CHUNG MOT DANH SACH
--
-- VI SAO LIET KE CUNG THAY VI CHO PHEP MOI MAY: di tru 026 noi SO PIN do TUNG MAY cap, nen cung
-- mot so o hai may co the la hai nguoi. Danh sach duoi day la mot KHANG DINH ve thuc te, va
-- can cu la:
--
--   * `thiet_bi` goi chung la 'VP - Cong vao' va 'VP - Cong ra', cung dia chi
--     'Tang 4, 39 Galaxy 5, Ha Dong, Ha Noi', cung firmware. Hai dau doc cua MOT cua.
--   * Gan nhu moi PIN quet o CA HAI may trong gan nhu MOI NGAY no xuat hien: PIN 14 la 120/120
--     ngay, PIN 22 la 117/117, PIN 24 la 110/110. Hai nguoi khac nhau tinh co dung chung mot so
--     khong the trung nhip hang ngay suot 120 ngay.
--
-- KHONG dung khe thoi gian giua hai may lam can cu. Hai dau doc nam sat nhau nen mot nguoi quet
-- qua ca hai trong vai giay la binh thuong — phep kiem do khong phan biet duoc gi o day.
--
-- May thu ba `NYU7261300256` ('VP1 - Cua chinh', 69 To Huu, firmware khac, 1 lan quet) KHONG
-- nam trong danh sach: chua biet dai PIN cua no co trung he danh so nay khong. Lan quet cua no
-- duoc BO LAI, khong gan, va se hien o phan "PIN con treo".
create temp table may_dung_chung (serial text primary key);
insert into may_dung_chung values ('8116254600435'), ('8116254600440');

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

-- 1. KY LUONG DA DUYET trong khoang du lieu thi DUNG. Gan nguoc lan quet lam bang cong doi, ma
--    bang luong tinh TU bang cong. Dung luat cua `ky_da_chot_luong()`.
--    Bang khong ton tai cung DUNG: fail-closed.
do $$
declare n int; ke text;
begin
  if to_regclass('public.ky_luong') is null then
    raise exception 'Khong thay bang ky_luong. Dung lai — bao lai de kiem dung ten bang.';
  end if;
  select count(*), string_agg(thang || ' (' || trang_thai || ')', ', ') into n, ke
    from ky_luong
   where trang_thai in ('da_duyet','da_tra') and thang between '2026-04' and '2026-08';
  if n > 0 then
    raise exception 'Da co ky luong duyet/tra trong khoang du lieu: %. Dung trang Lan quet -> '
      'Gan lai tren web, no chan tung thang thay vi chan ca lan chay.', ke;
  end if;
end $$;

-- 2. ma_nv phai co that.
do $$
declare thieu text;
begin
  select string_agg(k.ma_nv, ', ') into thieu
    from khai k left join nhan_vien nv on nv.ma_nv = k.ma_nv where nv.id is null;
  if thieu is not null then raise exception 'Khong tim thay ma_nv: %', thieu; end if;
end $$;

-- 3. PIN dang hieu luc cho NGUOI KHAC thi DUNG. `gan_ma` bat noi ro la co y thu hoi.
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

-- 4. Lan quet tren may NGOAI danh sach dung chung: bao ra, va BO LAI (khong gan). Bo lai chu
--    khong dung ca lan chay — mot lan quet thu tren may moi khong duoc chan 40 nghin lan kia.
\echo ''
\echo '--- HANG RAO 4: lan quet cua 29 PIN nay tren may NGOAI danh sach -> BO LAI ---'
select lq.thiet_bi_serial, tb.ten, tb.vi_tri, count(*) as so_lan,
       min((lq.thoi_diem + interval '7 hours')::date) as tu,
       max((lq.thoi_diem + interval '7 hours')::date) as den
  from lan_quet lq
  join khai k on k.pin = lq.pin_may
  left join thiet_bi tb on tb.serial = lq.thiet_bi_serial
 where lq.nguon = 'may'
   and (lq.thiet_bi_serial is null
        or lq.thiet_bi_serial not in (select serial from may_dung_chung))
 group by lq.thiet_bi_serial, tb.ten, tb.vi_tri
 order by lq.thiet_bi_serial;

\echo ''
\echo '--- Can cu: moi PIN quet o ca hai may trong bao nhieu ngay ---'
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
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, hieu_luc_tu, nguon, ghi_chu)
select nv.id, 'may_cham_cong', k.pin, k.pin,
       coalesce((select min(lq.thoi_diem) from lan_quet lq
                  where lq.pin_may = k.pin and lq.nguon = 'may'
                    and lq.thiet_bi_serial in (select serial from may_dung_chung)), now()),
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

-- ============================================================ VIEC 2: cot nhan_vien.pin_may
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
-- Chi tren hai may dung chung danh sach. `UPDATE ... RETURNING` phai boc trong CTE.
create temp table da_gan as
with u as (
  update lan_quet lq
     set nhan_vien_id = nv.id
    from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
   where lq.pin_may = k.pin and lq.nguon = 'may' and lq.nhan_vien_id is null
     and lq.thiet_bi_serial in (select serial from may_dung_chung)
  returning lq.id, nv.id as nhan_vien_id, lq.thoi_diem
)
select id, nhan_vien_id, (thoi_diem + interval '7 hours')::date as ngay from u;

\echo ''
\echo '--- VIEC 3: lan quet vua duoc gan ---'
select count(*) as so_lan_quet, count(distinct nhan_vien_id) as so_nguoi,
       count(distinct ngay) as so_ngay, min(ngay) as tu_ngay, max(ngay) as den_ngay
  from da_gan;

\echo ''
\echo '--- VIEC 3: cac thang phai tinh lai bang cong ---'
select to_char(ngay, 'YYYY-MM') as thang, count(*) as so_lan_quet,
       count(distinct ngay) as so_ngay, count(distinct nhan_vien_id) as so_nguoi
  from da_gan group by 1 order by 1;

-- ============================================================ KIEM TRA
\echo ''
\echo '=== KIEM TRA 1: lan quet may — bao nhieu da biet cua ai ==='
select count(*) filter (where nhan_vien_id is null)    as chua_biet,
       count(*) filter (where nhan_vien_id is not null) as da_biet,
       count(*)                                         as tong
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
\echo '=== KIEM TRA 5: bang cong hien co — TAT CA dang la vang vi chua tinh lai ==='
select trang_thai, count(*) as so_dong, min(ngay) as tu, max(ngay) as den
  from bang_cong_ngay group by trang_thai order by count(*) desc;

\echo ''
\echo '################################################################'
\echo '#  DANG LA ROLLBACK — CHUA GHI GI CA.'
\echo '#  Kiem tra 3 va 4 phai RONG. Kiem tra 1: chua_biet phai tut manh.'
\echo '#  Dung roi: doi dong cuoi thanh  commit;  roi chay lai.'
\echo '#'
\echo '#  SAU KHI COMMIT phai bam "Tinh lai bang cong" tren web cho ca khoang'
\echo '#  03/04/2026 -> 27/08/2026, chia hai lan vi moi lan toi da 92 ngay.'
\echo '#  Truoc khi tinh lai, 305 dong bang cong hien co dang la VANG cho ca 51 nguoi.'
\echo '################################################################'

rollback;
-- Doi dong tren thanh:  commit;
