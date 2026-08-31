-- ============================================================================
-- BON NGUOI HR XAC NHAN DA NGHI: dong ma dinh danh, ghi ngay nghi, tat hoat dong
--
-- MAC DINH ROLLBACK. Doc phan KIEM TRA, dung roi thi doi dong cuoi thanh `commit;`.
--
-- Ngay nghi lay TU CAU TRA LOI CUA HR trong file doi chieu (cau #11-#14), khong suy tu log:
--
--   PIN 52  Tran Minh Anh (XNK / VP Ha Noi)   nghi 25/07/2026
--   PIN 56  Nguyen Bach Tuan Dung (Kinh doanh) nghi 06/07/2026
--   PIN 58  Do Vu Mai Duong (Kinh doanh)       nghi 10/07/2026
--   PIN 59  Nguyen Thi Bich Ngoc (Thuc tap)    nghi 31/07/2026
--
-- Ca bon ngay deu trung voi ngay quet cuoi cung tren may, nen log va HR khop nhau.
--
-- VI SAO PHAI TAT `dang_hoat_dong` CHU KHONG CHI DONG MA:
--   `gan_ca_lam_viec.sql` gan ca cho MOI nguoi `dang_hoat_dong = true`. Ai con bat co ma da nghi
--   that thi bo tinh cong van sinh dong bang cong "Vang" cho ho MOI NGAY tu ngay nghi tro di —
--   lam so lieu vang cua ca cong ty phong len, va neu ky luong doc theo cong thi con ra tien.
--
-- VI SAO KHONG XOA LAN QUET CU:
--   Cong va luong thang 6-7 cua ho la that. Dong ma dinh danh giu nguyen phan lich su do va chi
--   chan viec PIN nay bi coi la cua ho o cac lan quet SAU ngay nghi — dung luc mot nguoi moi
--   duoc cap lai chinh so PIN ay.
--
-- PIN 52 co mot cho de nham: trong `nhan_vien` co HAI nguoi ten "Tran Minh Anh". Nguoi con lai
-- (Phong ke toan) da duoc khai PIN 51 o dot 29 PIN va DANG DI LAM. Script nay chi dong nguoi
-- KHONG giu PIN 51, va se DUNG neu khong tach duoc hai nguoi.
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off
\timing on

begin;

create temp table nghi (pin text primary key, tu text[], ngay_nghi date, mo_ta text);
insert into nghi values
  ('52', array['trần','minh','anh'],           '2026-07-25', 'Tran Minh Anh (XNK) — KHONG phai nguoi giu PIN 51'),
  ('56', array['nguyễn','bạch','tuấn','dũng'], '2026-07-06', 'Nguyen Bach Tuan Dung'),
  ('58', array['đỗ','vũ','mai','dương'],       '2026-07-10', 'Do Vu Mai Duong'),
  ('59', array['nguyễn','thị','bích','ngọc'],  '2026-07-31', 'Nguyen Thi Bich Ngoc — thuc tap sinh');

create temp table nv_chuan as
select nv.id, nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong, nv.ngay_nghi_viec, nv.pin_may,
       lower(regexp_replace(btrim(coalesce(nv.ho_ten, '')), '\s+', ' ', 'g')) as ten_chuan
  from nhan_vien nv;

-- Khop theo tung tu, roi LOAI nguoi dang giu mot PIN khac — do la cach tach hai "Tran Minh Anh".
create temp table doi_chieu as
select n2.pin, n2.mo_ta, n2.ngay_nghi, n.id, n.ma_nv, n.ho_ten, n.dang_hoat_dong,
       n.ngay_nghi_viec, n.pin_may,
       (select count(*) from ma_dinh_danh md
         where md.nhan_vien_id = n.id and md.he_thong = 'may_cham_cong'
           and md.hieu_luc_den is null) as ma_dang_mo
  from nghi n2
  join nv_chuan n
    on not exists (select 1 from unnest(n2.tu) t where n.ten_chuan not like '%' || t || '%')
 where coalesce(n.pin_may, '') = '' or n.pin_may = n2.pin;

\echo ''
\echo '=== DOI CHIEU: moi PIN dang khop voi ho so nao ==='
select pin, ngay_nghi, ma_nv, ho_ten, dang_hoat_dong,
       coalesce(pin_may, '-') as pin_dang_co, ngay_nghi_viec, ma_dang_mo, mo_ta
  from doi_chieu order by pin::int, ma_nv;

create temp table dong (pin text primary key, id uuid unique not null, ngay_nghi date not null);
insert into dong (pin, id, ngay_nghi)
select pin, id, ngay_nghi from (
  select pin, id, ngay_nghi, dang_hoat_dong,
         count(*)                              over (partition by pin) as so_ung_vien,
         count(*) filter (where dang_hoat_dong) over (partition by pin) as so_dang_hd
    from doi_chieu
) t
 where so_ung_vien = 1
    or (so_dang_hd = 1 and dang_hoat_dong);

\echo ''
\echo '=== SE DONG ==='
select d.pin, nv.ma_nv, nv.ho_ten, d.ngay_nghi
  from dong d join nhan_vien nv on nv.id = d.id order by d.pin::int;

\echo ''
\echo '=== BO LAI: PIN khong tach duoc ho so, phai lam tay ==='
select n.pin, n.mo_ta,
       (select count(*) from doi_chieu d where d.pin = n.pin) as so_ho_so_khop,
       (select count(*) from doi_chieu d where d.pin = n.pin and d.dang_hoat_dong)
         as so_dang_hoat_dong
  from nghi n where n.pin not in (select pin from dong) order by n.pin::int;

-- ============================================================ HANG RAO
do $$
declare n int; ke text;
begin
  if to_regclass('public.ky_luong') is null then
    raise exception 'Khong thay bang ky_luong. Dung lai.';
  end if;
  select count(*), string_agg(thang || ' (' || trang_thai || ')', ', ') into n, ke
    from ky_luong
   where trang_thai in ('da_duyet','da_tra') and thang between '2026-06' and '2026-09';
  if n > 0 then
    raise exception 'Da co ky luong duyet/tra: %. Dong nguoi la doi bang cong — huy duyet truoc.', ke;
  end if;
end $$;

-- Khong duoc dong nham nguoi dang giu PIN 51 (Tran Minh Anh Phong ke toan, dang di lam).
do $$
declare ten text;
begin
  select string_agg(nv.ma_nv, ', ') into ten
    from dong d join nhan_vien nv on nv.id = d.id
   where nv.pin_may = '51';
  if ten is not null then
    raise exception 'Dinh dong ho so dang giu PIN 51 (%). Day la nguoi DANG DI LAM. Dung lai.', ten;
  end if;
end $$;

-- Khoang hieu luc NGUOC (hieu_luc_tu > hieu_luc_den) thi DUNG.
--
-- CSDL khong co rang buoc nao chan viec nay, va mot dong nhu the khong bao loi o dau ca: no chi
-- lam `tra_pin` khong khop gi, tuc lan quet cua nguoi do lang le tro thanh "khong biet la ai".
-- Xay ra khi ngay HR bao nghi nam TRUOC lan quet dau tien cua chinh PIN do — nghia la hoac ngay
-- nghi sai, hoac PIN dang gan cho nham nguoi. Ca hai deu phai hoi lai chu khong duoc ghi bua.
do $$
declare xau text;
begin
  select string_agg(format('PIN %s: quet dau %s nhung HR bao nghi %s',
                           d.pin, q.dau::date, d.ngay_nghi), E'\n  ') into xau
    from dong d
    join lateral (select min((lq.thoi_diem + interval '7 hours')::date) as dau
                    from lan_quet lq where lq.pin_may = d.pin and lq.nguon = 'may') q on true
   where q.dau is not null and q.dau > d.ngay_nghi;
  if xau is not null then
    raise exception E'Khoang hieu luc se bi nguoc:\n  %\nNgay nghi nam truoc lan quet dau tien '
      'cua PIN. Kiem lai ngay nghi hoac kiem lai PIN co dung nguoi khong.', xau;
  end if;
end $$;

-- ============================================================ VIEC 1: KHAI roi DONG
-- Bon nguoi nay chua tung duoc khai PIN (ho khong nam trong dot 29 PIN), nen KHONG co dong nao
-- de dong. Chi dong khong thi ho so bi tat nhung cong thang 6-7 cua ho van mo coi — dung cai
-- ma "khai dong" trong file doi chieu nham tranh.
--
-- Nen lam hai buoc: them mot dong DA DONG SAN cho ai chua co, roi dong not dong dang mo cua ai
-- da co. Vien phai la `ngay_nghi + 1` chu khong phai `ngay_nghi`: `hieu_luc_den` la moc chan
-- tren, de dung ngay nghi thi chinh ngay lam viec cuoi cung cua ho roi ra ngoai khoang.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan,
                          hieu_luc_tu, hieu_luc_den, nguon, ghi_chu)
select d.id, 'may_cham_cong', d.pin, d.pin,
       coalesce((select min(lq.thoi_diem) from lan_quet lq
                  where lq.pin_may = d.pin and lq.nguon = 'may'), now()),
       (d.ngay_nghi + 1)::timestamptz,
       'nhap_csv',
       'Khai dong theo xac nhan cua HR 28/08/2026: nghi ' || d.ngay_nghi
  from dong d
 where not exists (
   select 1 from ma_dinh_danh md
    where md.he_thong = 'may_cham_cong' and md.ma_chuan = d.pin
      and md.nhan_vien_id = d.id);

update ma_dinh_danh md
   set hieu_luc_den = (d.ngay_nghi + 1)::timestamptz,
       ghi_chu = coalesce(md.ghi_chu || ' | ', '')
                 || 'Dong theo xac nhan cua HR 28/08/2026: nghi ' || d.ngay_nghi
  from dong d
 where md.nhan_vien_id = d.id and md.he_thong = 'may_cham_cong'
   and md.ma_chuan = d.pin and md.hieu_luc_den is null;

\echo ''
\echo '--- VIEC 1: ma dinh danh cua bon nguoi nay sau khi sua ---'
select nv.ma_nv, nv.ho_ten, md.ma_chuan as pin,
       md.hieu_luc_tu::date as tu, md.hieu_luc_den::date as den,
       case when md.hieu_luc_den is null then '>>> VAN DANG MO <<<' else 'da dong' end as trang_thai
  from ma_dinh_danh md join dong d on d.id = md.nhan_vien_id and d.pin = md.ma_chuan
  join nhan_vien nv on nv.id = md.nhan_vien_id
 order by md.ma_chuan::int;

-- ============================================================ VIEC 2: ho so nhan su
-- `ngay_nghi_viec` chi ghi khi dang trong: neu nhan su da ghi ngay khac thi do la so lieu that
-- cua ho, script khong duoc de len.
update nhan_vien nv
   set ngay_nghi_viec = d.ngay_nghi, dang_hoat_dong = false, cap_nhat_luc = now()
  from dong d
 where nv.id = d.id and nv.ngay_nghi_viec is null;

-- Ai da co ngay_nghi_viec san thi chi tat hoat dong, giu nguyen ngay cua nhan su.
update nhan_vien nv
   set dang_hoat_dong = false, cap_nhat_luc = now()
  from dong d
 where nv.id = d.id and nv.dang_hoat_dong = true;

\echo ''
\echo '--- VIEC 2: ho so sau khi sua ---'
select nv.ma_nv, nv.ho_ten, nv.ngay_nghi_viec, nv.dang_hoat_dong, d.ngay_nghi as hr_bao,
       case when nv.ngay_nghi_viec is distinct from d.ngay_nghi
            then '>>> ngay trong ho so KHAC ngay HR bao — giu ngay cu, kiem lai <<<'
            else 'khop' end as doi_chieu_ngay
  from dong d join nhan_vien nv on nv.id = d.id order by d.pin::int;

-- ============================================================ VIEC 3: gan nguoc lan quet
-- Chi gan lan quet TU NGAY NGHI TRO VE TRUOC. Sau ngay nghi thi so PIN co the da duoc cap lai
-- cho nguoi khac, va do la dung ly do `ma_dinh_danh` co chieu thoi gian.
create temp table da_gan as
with u as (
  update lan_quet lq
     set nhan_vien_id = d.id
    from dong d
   where lq.pin_may = d.pin and lq.nguon = 'may' and lq.nhan_vien_id is null
     and (lq.thoi_diem + interval '7 hours')::date <= d.ngay_nghi
  returning lq.id, lq.nhan_vien_id, lq.pin_may, lq.thoi_diem
)
select id, nhan_vien_id, pin_may, (thoi_diem + interval '7 hours')::date as ngay from u;

\echo ''
\echo '--- VIEC 3: lan quet lich su vua duoc gan ---'
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
\echo '=== KIEM TRA 1: bang cong SAU ngay nghi cua ho (se bi xoa khi tinh lai) ==='
\echo '    Day la nhung dong "Vang" sinh ra vi ho so con bat hoat dong. Con so cang lon thi'
\echo '    viec tat hoat dong cang dang gia.'
select nv.ma_nv, nv.ho_ten, count(*) as so_dong_sau_ngay_nghi,
       min(bc.ngay) as tu, max(bc.ngay) as den
  from dong d join nhan_vien nv on nv.id = d.id
  join bang_cong_ngay bc on bc.nhan_vien_id = nv.id and bc.ngay > d.ngay_nghi
 group by nv.ma_nv, nv.ho_ten order by nv.ma_nv;

\echo ''
\echo '=== KIEM TRA 2: lan quet cua ho SAU ngay nghi (nen la 0) ==='
\echo '    Khac 0 nghia la ho van quet sau ngay HR bao nghi — hoi lai truoc khi commit.'
select nv.ma_nv, nv.ho_ten, count(*) as so_lan_quet_sau_ngay_nghi,
       max((lq.thoi_diem + interval '7 hours')::date) as quet_cuoi
  from dong d join nhan_vien nv on nv.id = d.id
  join lan_quet lq on lq.nhan_vien_id = nv.id
   and (lq.thoi_diem + interval '7 hours')::date > d.ngay_nghi
 group by nv.ma_nv, nv.ho_ten order by nv.ma_nv;

\echo ''
\echo '=== KIEM TRA 3: con bao nhieu nguoi dang hoat dong ==='
select count(*) filter (where dang_hoat_dong)     as dang_hoat_dong,
       count(*) filter (where not dang_hoat_dong) as da_tat,
       count(*)                                    as tong
  from nhan_vien;

\echo ''
\echo '=== KIEM TRA 4: mot ma dang hieu luc chi thuoc mot nguoi (PHAI RONG) ==='
select ma_chuan, count(*) as so_nguoi from ma_dinh_danh
 where he_thong = 'may_cham_cong' and hieu_luc_den is null
 group by ma_chuan having count(*) > 1;

\echo ''
\echo '################################################################'
\echo '#  GHI HAY KHONG LA DO DONG CUOI CUNG CUA FILE NAY:'
\echo '#     rollback;   -> chay thu, khong ghi gi ca'
\echo '#     commit;     -> ghi that'
\echo '#'
\echo '#  Truoc khi doi sang commit:'
\echo '#   1. Bang DOI CHIEU — dung bon nguoi do khong, nhat la PIN 52.'
\echo '#   2. KIEM TRA 2 phai RONG — con quet sau ngay nghi thi ngay HR bao co van de.'
\echo '#   3. Cot doi_chieu_ngay o VIEC 2 phai la "khop".'
\echo '#'
\echo '#  SAU KHI COMMIT bam "Tinh lai bang cong" de xoa cac dong Vang sinh nham.'
\echo '################################################################'

rollback;
-- Doi dong tren thanh:  commit;
