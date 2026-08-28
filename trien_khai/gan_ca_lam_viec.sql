-- ============================================================================
-- GAN CA LAM VIEC CHO TOAN BO NHAN VIEN
--   + khung gio rieng cho thu Bay
--   + ha `phut_du_cong` cua ca tu 480 xuong 420
--
-- MAC DINH ROLLBACK. Doc phan KIEM TRA, dung roi thi doi dong cuoi thanh `commit;`.
--
-- Truoc script nay: 0 nguoi co ca (tru 3 nguoi dang gan nham ca seed 'Hanh chinh').
-- Nhanh 6 cua `quy_tac_tinh_cong.ts` xu ly nguoi chua co ca bang cach lay min->max
-- KHONG TRU GIO NGHI TRUA, va dung NGAY_LAM_MAC_DINH [T2..T6] — nen moi thu Bay bi xep
-- 'nghi_tuan': 0 cong va toan bo gio lam chuyen thanh OT.
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off
\timing on

begin;

-- ============================================================ THAM SO — SUA O DAY
--
-- Bon gia tri duoi day la QUYET DINH CHINH SACH, khong suy ra duoc tu log. Script co hang rao
-- doi chieu voi gio quet THUC TE va se DUNG neu lech qua 60 phut, kem theo so that de sua.
create temp table tham_so as select
  'Hành chính (theo HĐLĐ)'::text as ten_ca,   -- ca se gan cho moi nguoi
  420::int       as phut_du_cong_moi,         -- nguong du 1 cong cho T2-T6 (xem ghi chu duoi)
  '08:00'::time  as t7_gio_vao,               -- thu Bay: gio vao
  '12:00'::time  as t7_gio_ra,                -- thu Bay: gio ra
  420::int       as t7_phut_du_cong,          -- thu Bay: nguong nua cong = 210 phut
  60::int        as lech_cho_phep_phut;       -- nguong hang rao
--
-- VI SAO 420 CHU KHONG PHAI 480:
--   Ca 08:00-17:30 nghi 12:00-13:30 => khung 570 phut, tru 90 nghi = TOI DA DUNG 480 phut.
--   `quy_ra_cong` tra 1 cong khi phut_lam >= nguong. De nguong = 480 nghia la chi ai vao dung
--   08:00:00 va ra dung 17:30 moi du cong; vao luc 08:06 thi phut_lam = 474 -> 0,5 cong.
--   Dung sai di muon KHONG cuu duoc: no chi tru vao cot `phut_muon`, con `phut_lam` van kep
--   theo gio quet that. Gio vao trung vi cua cong ty la 08:05:50.
--
-- VI SAO THU BAY CUNG 420:
--   Khung T7 08:00-12:00 cho toi da 240 phut = dung nua nguong 480, nen di muon 5 phut la 235
--   phut va ra 0 cong cho ca buoi sang. Voi 420 thi nguong nua cong la 210, con tran van la 0,5
--   vi 240 khong bao gio cham 420.

-- ============================================================ HANG RAO

-- 1. Ky luong da duyet trong khoang du lieu thi DUNG.
do $$
declare ke text;
begin
  if to_regclass('public.ky_luong') is null then
    raise exception 'Khong thay bang ky_luong. Dung lai.';
  end if;
  select string_agg(thang || ' (' || trang_thai || ')', ', ') into ke
    from ky_luong where trang_thai in ('da_duyet','da_tra')
     and thang between '2026-04' and '2026-08';
  if ke is not null then
    raise exception 'Da co ky luong duyet/tra: %. Doi ca lam bang cong doi theo — '
      'phai huy duyet ky luong truoc.', ke;
  end if;
end $$;

-- 2. Ca phai ton tai va phai co thu Bay trong cac ngay lam.
do $$
declare c record; ts record;
begin
  select * into ts from tham_so;
  select * into c from ca_lam where ten = ts.ten_ca;
  if c is null then
    raise exception 'Khong thay ca ten "%". Sua `ten_ca` trong khoi THAM SO.', ts.ten_ca;
  end if;
  if not (6 = any(c.cac_ngay_lam)) then
    raise exception 'Ca "%" khong co thu Bay trong cac_ngay_lam (%). Du lieu quet cho thay '
      'cong ty CO lam thu Bay: 20 ngay T7 deu co ~26 nguoi quet.', ts.ten_ca, c.cac_ngay_lam;
  end if;
  if c.qua_dem then
    raise exception 'Ca "%" la ca qua dem — khong khai duoc khung gio rieng theo thu.', ts.ten_ca;
  end if;
end $$;

-- 3. HANG RAO DU LIEU: gio ra thuc te T2-T6 phai khop gio_ra cua ca.
do $$
declare tv time; c record; ts record; n int; lech int;
begin
  select * into ts from tham_so;
  select * into c from ca_lam where ten = ts.ten_ca;
  select count(*), percentile_disc(0.5) within group (order by cuoi) into n, tv
    from (select nv.id, (lq.thoi_diem + interval '7 hours')::date as ngay,
                 max((lq.thoi_diem + interval '7 hours')::time) as cuoi
            from lan_quet lq join nhan_vien nv on nv.id = lq.nhan_vien_id
           where lq.nguon = 'may'
             and extract(dow from (lq.thoi_diem + interval '7 hours')) between 1 and 5
           group by 1, 2) d;
  if n < 100 then
    raise exception 'Chi co % ngay-nguoi T2-T6 da gan — qua it de kiem. Gan PIN truoc.', n;
  end if;
  lech := abs(extract(epoch from (tv - c.gio_ra))/60)::int;
  raise notice 'T2-T6: gio ra trung vi THUC TE = %, ca khai = %, lech % phut (% ngay-nguoi)',
    tv, c.gio_ra, lech, n;
  if lech > ts.lech_cho_phep_phut then
    raise exception 'Gio ra cua ca "%" la % nhung thuc te trung vi la % — lech % phut. '
      'Chon ca khac hoac sua gio ca. Khong tu doan.', ts.ten_ca, c.gio_ra, tv, lech;
  end if;
end $$;

-- 4. HANG RAO DU LIEU: gio ra thuc te THU BAY phai khop `t7_gio_ra` khai o tren.
do $$
declare tv time; ts record; n int; lech int;
begin
  select * into ts from tham_so;
  select count(*), percentile_disc(0.5) within group (order by cuoi) into n, tv
    from (select nv.id, (lq.thoi_diem + interval '7 hours')::date as ngay,
                 max((lq.thoi_diem + interval '7 hours')::time) as cuoi
            from lan_quet lq join nhan_vien nv on nv.id = lq.nhan_vien_id
           where lq.nguon = 'may'
             and extract(dow from (lq.thoi_diem + interval '7 hours')) = 6
           group by 1, 2) d;
  if n < 30 then
    raise exception 'Chi co % ngay-nguoi thu Bay da gan — qua it de kiem.', n;
  end if;
  lech := abs(extract(epoch from (tv - ts.t7_gio_ra))/60)::int;
  raise notice 'THU BAY: gio ra trung vi THUC TE = %, khai = %, lech % phut (% ngay-nguoi)',
    tv, ts.t7_gio_ra, lech, n;
  if lech > ts.lech_cho_phep_phut then
    raise exception E'Thu Bay khai gio ra % nhung THUC TE trung vi la % — lech % phut.\n'
      '  * Neu so that gan 12:00  -> giu 12:00, dung nay la loi khac.\n'
      '  * Neu so that gan gio_ra cua ca (vd 17:30) -> thu Bay lam CA NGAY: XOA HAN phan\n'
      '    khai ca_lam_theo_thu ben duoi, vi ca goc da bao thu Bay roi.\n'
      '  * Con lai -> sua `t7_gio_ra` trong khoi THAM SO cho khop.',
      ts.t7_gio_ra, tv, lech;
  end if;
end $$;

-- ============================================================ MO PHONG TRUOC KHI DOI
-- In phan bo so cong tren DU LIEU QUET THAT, voi nguong cu va nguong moi. Doc hai bang nay
-- roi hay commit — dung tin loi ghi chu, tin con so.
\echo ''
\echo '--- MO PHONG so cong T2-T6: nguong CU (480) vs nguong MOI (tham so) ---'
with ngay_nguoi as (
  select nv.id, (lq.thoi_diem + interval '7 hours')::date as ngay,
         min((lq.thoi_diem + interval '7 hours')::time) as dau,
         max((lq.thoi_diem + interval '7 hours')::time) as cuoi
    from lan_quet lq join nhan_vien nv on nv.id = lq.nhan_vien_id
   where lq.nguon = 'may'
     and extract(dow from (lq.thoi_diem + interval '7 hours')) between 1 and 5
   group by 1, 2
), lam as (
  select greatest(0, extract(epoch from (
             least(cuoi, time '17:30') - greatest(dau, time '08:00')))/60
           - greatest(0, extract(epoch from (
               least(least(cuoi, time '17:30'), time '13:30')
             - greatest(greatest(dau, time '08:00'), time '12:00')))/60))::int as phut_lam
    from ngay_nguoi
   where least(cuoi, time '17:30') > greatest(dau, time '08:00')
)
select case when phut_lam >= 480 then '1,0 cong' when phut_lam >= 240 then '0,5 cong'
            else '0 cong' end as nguong_cu_480,
       count(*) as so_ngay_nguoi,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram,
       (select case when max(phut_lam) >= ts.phut_du_cong_moi then '1,0 cong' end
          from tham_so ts limit 1) as _
  from lam group by 1 order by 1 desc;

\echo ''
with ngay_nguoi as (
  select nv.id, (lq.thoi_diem + interval '7 hours')::date as ngay,
         min((lq.thoi_diem + interval '7 hours')::time) as dau,
         max((lq.thoi_diem + interval '7 hours')::time) as cuoi
    from lan_quet lq join nhan_vien nv on nv.id = lq.nhan_vien_id
   where lq.nguon = 'may'
     and extract(dow from (lq.thoi_diem + interval '7 hours')) between 1 and 5
   group by 1, 2
), lam as (
  select greatest(0, extract(epoch from (
             least(cuoi, time '17:30') - greatest(dau, time '08:00')))/60
           - greatest(0, extract(epoch from (
               least(least(cuoi, time '17:30'), time '13:30')
             - greatest(greatest(dau, time '08:00'), time '12:00')))/60))::int as phut_lam
    from ngay_nguoi
   where least(cuoi, time '17:30') > greatest(dau, time '08:00')
)
select case when l.phut_lam >= ts.phut_du_cong_moi then '1,0 cong'
            when l.phut_lam >= ts.phut_du_cong_moi / 2 then '0,5 cong'
            else '0 cong' end as nguong_moi,
       count(*) as so_ngay_nguoi,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram
  from lam l, tham_so ts group by 1 order by 1 desc;

-- ============================================================ VIEC 1: nguong du cong cua ca
update ca_lam c set phut_du_cong = ts.phut_du_cong_moi
  from tham_so ts where c.ten = ts.ten_ca and c.phut_du_cong <> ts.phut_du_cong_moi;

\echo ''
\echo '--- VIEC 1: ca sau khi sua ---'
select ten, gio_vao, gio_ra, nghi_tu, nghi_den, cac_ngay_lam,
       phut_du_cong, dung_sai_muon_phut, nguong_ot_phut
  from ca_lam order by ten;

-- ============================================================ VIEC 2: khung gio thu Bay
-- Khong khai `nghi_tu`/`nghi_den`: buoi sang thu Bay khong co nghi trua.
insert into ca_lam_theo_thu (ca_lam_id, thu, gio_vao, gio_ra, nghi_tu, nghi_den, phut_du_cong)
select c.id, 6, ts.t7_gio_vao, ts.t7_gio_ra, null, null, ts.t7_phut_du_cong
  from ca_lam c, tham_so ts where c.ten = ts.ten_ca
on conflict (ca_lam_id, thu) do update set
  gio_vao = excluded.gio_vao, gio_ra = excluded.gio_ra,
  nghi_tu = excluded.nghi_tu, nghi_den = excluded.nghi_den,
  phut_du_cong = excluded.phut_du_cong;

\echo ''
\echo '--- VIEC 2: khung gio rieng theo thu ---'
select c.ten, ct.thu, ct.gio_vao, ct.gio_ra, ct.phut_du_cong
  from ca_lam_theo_thu ct join ca_lam c on c.id = ct.ca_lam_id order by c.ten, ct.thu;

-- ============================================================ VIEC 3: gan ca cho moi nguoi
-- Loai ERP134 'He thong' — day la tai khoan he thong, khong phai nguoi di lam. Gan ca cho no
-- se sinh dong bang cong vang moi ngay cho mot thu khong ton tai.
create temp table da_gan_ca as
with u as (
  update nhan_vien nv set ca_lam_id = c.id, cap_nhat_luc = now()
    from ca_lam c, tham_so ts
   where c.ten = ts.ten_ca
     and nv.dang_hoat_dong = true
     and nv.ma_nv <> 'ERP134'
     and nv.ca_lam_id is distinct from c.id
  returning nv.id, nv.ma_nv, nv.ho_ten
)
select * from u;

\echo ''
\echo '--- VIEC 3: so nguoi vua duoc gan / doi ca ---'
select count(*) as so_nguoi from da_gan_ca;

\echo ''
\echo '--- VIEC 3: ho so KHONG duoc gan (de biet con ai ngoai) ---'
select nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong,
       coalesce(cl.ten, '(khong co ca)') as ca_hien_tai
  from nhan_vien nv left join ca_lam cl on cl.id = nv.ca_lam_id
 where nv.id not in (select id from da_gan_ca)
 order by nv.ma_nv;

-- ============================================================ KIEM TRA
\echo ''
\echo '=== KIEM TRA 1: ai dang dung ca nao ==='
select coalesce(cl.ten, '>>> CHUA CO CA <<<') as ca_lam,
       cl.gio_vao, cl.gio_ra, cl.cac_ngay_lam, cl.phut_du_cong, count(*) as so_nguoi
  from nhan_vien nv left join ca_lam cl on cl.id = nv.ca_lam_id
 where nv.dang_hoat_dong = true
 group by 1, cl.gio_vao, cl.gio_ra, cl.cac_ngay_lam, cl.phut_du_cong order by count(*) desc;

\echo ''
\echo '=== KIEM TRA 2: ca seed "Hanh chinh" con ai dung khong (nen la 0) ==='
select count(*) as so_nguoi_con_dung_ca_seed
  from nhan_vien where ca_lam_id = (select id from ca_lam where ten = 'Hanh chinh');

\echo ''
\echo '=== KIEM TRA 3: bang cong hien co — SE DOI sau khi tinh lai ==='
select trang_thai, count(*) as so_dong from bang_cong_ngay group by 1 order by count(*) desc;

\echo ''
\echo '################################################################'
\echo '#  DANG LA ROLLBACK — CHUA GHI GI CA.'
\echo '#  Doc hai dong NOTICE ve gio trung vi, va hai bang MO PHONG so cong.'
\echo '#  Dung roi thi doi dong cuoi thanh  commit;  va chay lai.'
\echo '#'
\echo '#  SAU KHI COMMIT moi bam "Tinh lai bang cong" — chia hai lan vi moi lan toi da'
\echo '#  92 ngay: 03/04-30/06 va 01/07-27/08.'
\echo '#  OT chi tinh khi co don `lam_them` da duyet, nen tinh lai se KHONG sinh OT tu'
\echo '#  cac lan quet luc roi toa nha.'
\echo '################################################################'

rollback;
-- Doi dong tren thanh:  commit;
