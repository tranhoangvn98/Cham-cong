-- ============================================================================
-- KHAI NOT 9 PIN CON LAI CUA NGUOI DANG DI LAM, VA GAN NGUOC LAN QUET
--
-- MAC DINH ROLLBACK. Doc phan DOI CHIEU va BO LAI, dung roi thi doi dong cuoi thanh `commit;`.
--
-- Thay cho `khai_pin_23_34_57.sql`: cung co che, nhung phu het 9 PIN thay vi 3, de khong ai
-- phai chay hai script chong nhau len cung mot bang.
--
-- Dot khai dau (`khai_pin_tu_so_hsns.sql`) lam 29 PIN. Sheet "Khai ngay" cua file doi chieu co
-- 36 PIN, cong them PIN 34 va 43 do HR tra loi ve sau. Con lai dung 9 cai duoi day, moi cai
-- rot vi mot ly do rieng:
--
--   PIN  4 (Tran Hoang Anh Vinh)  — trong `nhan_vien` co HAI ho so trung ten.
--   PIN 14 (Ngo Trung Kien)       — co trong so HSNS, quet 120 ngay, chua ro da co ho so chua.
--   PIN 23 (Tran Thi Minh Khanh)  — may khai co chu dem "Thi", ho so ghi khong co.
--   PIN 31 (Phan Song Hao)        — nghi lech dau / lech chinh ta giua hai nguon.
--   PIN 32 (Dao Thanh Binh)       — ho so co the ghi DAO NGUOC thu tu tu ("Thanh Binh Dao").
--   PIN 34 (Tran Duc Hoang)       — khong co trong so HSNS. May chi hien "Sep". Chinh chu xac
--                                   nhan la minh; va PIN 4 (anh Vinh) quet SONG SONG lien tuc
--                                   ca 5 thang voi PIN 34, nen hai PIN nay khong the cung mot
--                                   nguoi — loai tru duoc kha nang "Sep" la anh Vinh.
--   PIN 37 (Tran Van Dinh)        — co trong so HSNS, quet 109 ngay, chua ro da co ho so chua.
--   PIN 43 (Than Thi Van Anh)     — khong co trong so HSNS. HR cho ten, va cho biet chi lam kho
--                                   Trung Quoc — giai thich duoc dang quet thua hai dao roi
--                                   nhau ma du lieu khong tu phan giai duoc.
--   PIN 57 (Hoang Minh Ngoc)      — trong `nhan_vien` co HAI ho so trung ten.
--
-- VI SAO KHONG HARDCODE `ma_nv` (khac script 29 PIN):
--   Chin cho nay dung la chin cho ten khong dang tin — lech chu dem, lech dau, dao thu tu tu,
--   trung ten, hoac khong co trong so. Hardcode mot ma o day la gia vo rang toi da biet chac.
--   Script DO ung vien theo TUNG TU (moi tu trong ten phai xuat hien, khong ke thu tu), IN HET
--   ra, va chi khai khi khong con cho chon nham:
--     * dung 1 ung vien                              -> khai
--     * nhieu ung vien nhung dung 1 nguoi DANG HOAT DONG -> khai nguoi do
--     * con lai (0 ung vien, hay >=2 nguoi dang hoat dong) -> BO LAI, in ro ly do
--   Bang "BO LAI" chinh la danh sach ho so ma nhan su phai lap / phai gop, khong phai loi.
--
-- LUU Y ve file Excel doi chieu: cau #5/#6/#7 trong sheet "Can hoi" bao "lap ho so" cho PIN 14,
-- 23, 37. File do dung TEN KHOP TUYET DOI va duoc sinh TRUOC khi doi chieu voi bang `nhan_vien`,
-- nen voi PIN 23 (va co the 31, 32) no bao thieu ho so trong khi ho so da co duoi mot cach viet
-- khac. Lap them la tao ho so trung. Bang DOI CHIEU duoi day moi la cau tra loi that.
--
-- Sau khi commit PHAI bam "Tinh lai bang cong" — script nay khong tinh lai.
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off
\timing on

begin;

-- Hai dau doc cua MOT cua (lap luan day du trong khai_pin_tu_so_hsns.sql). Lan quet tren may
-- ngoai danh sach nay duoc BO LAI chu khong gan, vi so PIN do TUNG MAY cap.
create temp table may_dung_chung (serial text primary key);
insert into may_dung_chung values ('8116254600435'), ('8116254600440');

-- Khop theo TUNG TU chu khong theo ca chuoi: moi tu phai xuat hien o dau do trong ho ten, khong
-- ke thu tu. Chiu duoc ca ba kieu lech gap o day — thieu chu dem ("Tran Thi Minh Khanh" vs
-- "Tran Minh Khanh"), dao thu tu ("Dao Thanh Binh" vs "Thanh Binh Dao"), va thua khoang trang.
-- Long hon LIKE ca chuoi, nhung long o day la an toan: luat chon ben duoi tu chan khi ra nhieu
-- nguoi, con chan sai thi chi mat mot vong hoi lai.
create temp table ung_vien (pin text primary key, tu text[], mo_ta text);
insert into ung_vien values
  ('4',  array['trần','hoàng','anh','vinh'],  'ho so trung ten'),
  ('14', array['ngô','trung','kiên'],         'co trong so HSNS, quet 120 ngay'),
  ('23', array['trần','minh','khánh'],        'may khai them chu dem "Thị"'),
  ('31', array['phan','song','hào'],          'nghi lech dau/chinh ta giua hai nguon'),
  ('32', array['đào','thanh','bình'],         'ho so co the dao thu tu tu'),
  ('34', array['trần','đức','hoàng'],         'may chi hien "Sep" — chinh chu xac nhan'),
  ('37', array['trần','văn','định'],          'co trong so HSNS, quet 109 ngay'),
  ('43', array['thân','vân','anh'],           'HR cho ten; chi lam kho Trung Quoc'),
  ('57', array['hoàng','minh','ngọc'],        'ho so trung ten');

create temp table nv_chuan as
select nv.id, nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong, nv.ngay_vao, nv.ngay_nghi_viec,
       nv.pin_may, nv.ca_lam_id,
       lower(regexp_replace(btrim(coalesce(nv.ho_ten, '')), '\s+', ' ', 'g')) as ten_chuan
  from nhan_vien nv;

create temp table doi_chieu as
select uv.pin, uv.mo_ta, n.id, n.ma_nv, n.ho_ten, n.dang_hoat_dong,
       n.ngay_vao, n.ngay_nghi_viec, n.pin_may as pin_dang_co,
       coalesce(cl.ten, '(chua gan ca)') as ca_lam,
       (select count(*) from bang_cong_ngay bc where bc.nhan_vien_id = n.id) as dong_bang_cong,
       (select count(*) from lan_quet lq   where lq.nhan_vien_id = n.id)     as lan_quet_da_co
  from ung_vien uv
  join nv_chuan n
    on not exists (select 1 from unnest(uv.tu) t where n.ten_chuan not like '%' || t || '%')
  left join ca_lam cl on cl.id = n.ca_lam_id;

\echo ''
\echo '=== DOI CHIEU: moi PIN dang khop voi nhung ho so nao ==='
select pin, ma_nv, ho_ten, dang_hoat_dong, ngay_vao, ngay_nghi_viec,
       coalesce(pin_dang_co, '-') as pin_dang_co, ca_lam, dong_bang_cong, lan_quet_da_co
  from doi_chieu order by pin::int, dang_hoat_dong desc, ma_nv;

-- Luat chon, viet mot lan o day chu khong rai trong nhieu cau.
create temp table khai (pin text primary key, ma_nv text unique not null);
insert into khai (pin, ma_nv)
select pin, ma_nv from (
  select pin, ma_nv, dang_hoat_dong,
         count(*)                              over (partition by pin) as so_ung_vien,
         count(*) filter (where dang_hoat_dong) over (partition by pin) as so_dang_hd
    from doi_chieu
) t
 where so_ung_vien = 1
    or (so_dang_hd = 1 and dang_hoat_dong);

\echo ''
\echo '=== SE KHAI ==='
select k.pin, k.ma_nv, nv.ho_ten, nv.dang_hoat_dong,
       (select count(*) from lan_quet lq
         where lq.pin_may = k.pin and lq.nguon = 'may' and lq.nhan_vien_id is null
           and lq.thiet_bi_serial in (select serial from may_dung_chung)) as se_gan_bao_nhieu_quet
  from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
 order by k.pin::int;

\echo ''
\echo '=== BO LAI: PIN khong khai duoc, va viec phai lam ==='
\echo '    Day la DANH SACH VIEC cho nhan su, khong phai loi cua script.'
select uv.pin, uv.mo_ta,
       (select count(*) from doi_chieu d where d.pin = uv.pin) as so_ho_so_khop,
       (select count(*) from doi_chieu d where d.pin = uv.pin and d.dang_hoat_dong)
         as so_ho_so_dang_hoat_dong,
       case when (select count(*) from doi_chieu d where d.pin = uv.pin) = 0
              then 'CHUA CO HO SO — lap ho so nhan su cho nguoi nay roi chay lai script'
            else 'HO SO TRUNG, ca hai deu dang hoat dong — chay `npm run gop_trung` gop truoc, '
                 'roi chay lai script' end as phai_lam_gi
  from ung_vien uv
 where uv.pin not in (select pin from khai)
 order by uv.pin::int;

-- ============================================================ HANG RAO

-- 1. Ky luong da duyet trong khoang du lieu thi DUNG. Gan nguoc lan quet lam bang cong doi, ma
--    bang luong tinh TU bang cong. Bang khong ton tai cung dung: fail-closed.
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
  raise notice 'Se khai % / 9 PIN.', n;
end $$;

-- 3. PIN dang hieu luc cho NGUOI KHAC thi DUNG. Thu hoi phai la hanh dong co y tren web, chu
--    khong phai tac dung phu cua mot script khai.
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

-- 4. Lan quet cua cac PIN nay tren may NGOAI danh sach dung chung: bao ra, va BO LAI.
\echo ''
\echo '--- HANG RAO 4: lan quet tren may NGOAI danh sach -> BO LAI (khong gan) ---'
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

-- PIN 34 va 43 se hien 'XEM LAI' o bang duoi vi ty le quet du doi cong-vao/cong-ra thap.
-- Nguong 90% la phep DO GIAN TIEP, dung khi khong biet chu PIN la ai. Voi hai PIN nay da co
-- cau tra loi truc tiep tu nguoi that, tuc bang chung manh hon con so — bo qua nhan do.
-- PIN 43 (lam kho Trung Quoc) va PIN 34 (Sep) deu thuoc dang ra vao le gio, khong quet du doi
-- moi ngay, y het PIN 39 (Giam doc) da kiem rieng o dot truoc.
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
-- `hieu_luc_tu` lay lan quet dau tien cua chinh PIN do. Khong can lui them: luat 1 cua `tra_pin`
-- mo khoang dau tien ve phia truoc, nen dong duy nhat nay om het lich su cua PIN.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, hieu_luc_tu, nguon, ghi_chu)
select nv.id, 'may_cham_cong', k.pin, k.pin,
       coalesce((select min(lq.thoi_diem) from lan_quet lq
                  where lq.pin_may = k.pin and lq.nguon = 'may'
                    and lq.thiet_bi_serial in (select serial from may_dung_chung)), now()),
       'nhap_csv', 'Khai bu 9 PIN con lai theo tra loi cua HR — 28/08/2026'
  from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
 where not exists (
   select 1 from ma_dinh_danh md
    where md.he_thong = 'may_cham_cong' and md.ma_chuan = k.pin
      and md.hieu_luc_den is null and md.nhan_vien_id = nv.id);

\echo ''
\echo '--- VIEC 1: dong ma_dinh_danh vua them ---'
select nv.ma_nv, nv.ho_ten, md.ma_chuan as pin, md.hieu_luc_tu::date as hieu_luc_tu
  from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
 where md.ghi_chu = 'Khai bu 9 PIN con lai theo tra loi cua HR — 28/08/2026'
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
\echo '=== KIEM TRA 2: PIN con treo, 25 cai nhieu lan nhat ==='
\echo '    Sau lan chay nay, phan lon phai la 20 PIN nguoi da nghi (sheet "Da nghi") + PIN 1.'
select pin_may, count(*) as so_lan,
       max((thoi_diem + interval '7 hours')::date) as quet_cuoi
  from lan_quet where nguon = 'may' and nhan_vien_id is null
 group by pin_may order by count(*) desc limit 25;

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
select nv.ma_nv, nv.ho_ten, coalesce(cl.ten, '>>> CHUA CO CA <<<') as ca_lam, nv.dang_hoat_dong
  from khai k join nhan_vien nv on nv.ma_nv = k.ma_nv
  left join ca_lam cl on cl.id = nv.ca_lam_id
 order by k.pin::int;

\echo ''
\echo '=== KIEM TRA 6: PIN 1 — quet gion hay nguoi that? ==='
\echo '    HR tra loi "khong biet la ai, cung khong phai van tay admin". 13 lan quet trong dung'
\echo '    2 ngay. Neu cac lan quet don cum trong vai phut thi la thu van tay luc dang ky;'
\echo '    neu rai deu ca ngay thi la nguoi that va phai di tim ten.'
select (thoi_diem + interval '7 hours')::date as ngay,
       count(*) as so_lan,
       min((thoi_diem + interval '7 hours')::time) as som_nhat,
       max((thoi_diem + interval '7 hours')::time) as muon_nhat,
       extract(epoch from (max(thoi_diem) - min(thoi_diem)))/60 as trai_dai_phut
  from lan_quet where nguon = 'may' and pin_may = '1'
 group by 1 order by 1;

\echo ''
\echo '################################################################'
\echo '#  GHI HAY KHONG LA DO DONG CUOI CUNG CUA FILE NAY:'
\echo '#     rollback;   -> chay thu, khong ghi gi ca'
\echo '#     commit;     -> ghi that'
\echo '#'
\echo '#  Truoc khi doi sang commit, doc ba thu:'
\echo '#   1. Bang DOI CHIEU — ho so duoc chon co dung nguoi khong.'
\echo '#   2. Bang BO LAI   — day la danh sach viec cho nhan su (lap ho so / gop ho so).'
\echo '#   3. KIEM TRA 3 va 4 phai RONG.'
\echo '#'
\echo '#  SAU KHI COMMIT phai bam "Tinh lai bang cong" cho khoang co lan quet vua gan.'
\echo '################################################################'

rollback;
-- Doi dong tren thanh:  commit;
