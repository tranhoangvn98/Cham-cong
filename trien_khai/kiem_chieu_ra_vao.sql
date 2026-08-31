-- ============================================================================
-- CHI DOC. Kiem mot gia dinh truoc khi xay logic ra/vao van phong.
--
-- Toan bo yeu cau "log o cua ra = roi van phong, log o cua vao = vao lai" dua tren MOT gia
-- dinh: nguoi ta quet DAU DOC VAO khi vao va DAU DOC RA khi ra. Neu that thi lan quet dau
-- ngay phai o may 'Cong vao' va lan cuoi ngay phai o may 'Cong ra'.
--
-- CO MOT KHA NANG KHAC, va no pha huy toan bo logic: hai dau doc nam sat nhau nen nguoi ta
-- di qua CA HAI trong vai giay moi lan ra vao. Luc do "may nao" khong noi len chieu nao ca,
-- va moi canh bao "ra vao khong quet" sinh ra se la canh bao GIA hang loat.
--
-- Ba phep do duoi day phan biet duoc hai kha nang do. Doc ket qua roi moi quyet.
--
--   Chay: psql ... -f trien_khai/kiem_chieu_ra_vao.sql
-- ============================================================================
\pset pager off

create temp table may_cua as
select serial, ten,
       case when ten ilike '%vào%' or ten ilike '%vao%' then 'vao'
            when ten ilike '%ra%'                       then 'ra'
            else 'khong_ro' end as chieu
  from thiet_bi;

\echo ''
\echo '=== 0. May nao duoc coi la cua vao / cua ra ==='
\echo '    Cot `chieu` suy tu TEN may. Sai o day thi moi phep do duoi deu sai.'
select serial, ten, chieu,
       (select count(*) from lan_quet lq where lq.thiet_bi_serial = m.serial) as so_lan_quet
  from may_cua m order by chieu, serial;

-- Chi xet ngay-nguoi co du lieu that: da gan nguoi, va co quet o may co chieu ro rang.
create temp table ngay_nguoi as
select lq.nhan_vien_id,
       (lq.thoi_diem + interval '7 hours')::date as ngay,
       min(lq.thoi_diem) filter (where m.chieu = 'vao') as vao_som_nhat,
       max(lq.thoi_diem) filter (where m.chieu = 'ra')  as ra_muon_nhat,
       min(lq.thoi_diem) as dau_tien,
       max(lq.thoi_diem) as cuoi_cung,
       (array_agg(m.chieu order by lq.thoi_diem))[1] as chieu_dau,
       (array_agg(m.chieu order by lq.thoi_diem desc))[1] as chieu_cuoi,
       count(*) as so_lan
  from lan_quet lq
  join may_cua m on m.serial = lq.thiet_bi_serial
 where lq.nguon = 'may' and lq.nhan_vien_id is not null and m.chieu <> 'khong_ro'
 group by 1, 2;

\echo ''
\echo '=== 1. Lan quet DAU ngay o may nao, lan CUOI ngay o may nao ==='
\echo '    Neu gia dinh dung: chieu_dau = vao va chieu_cuoi = ra, chiem da so.'
\echo '    Neu ra lung tung thi "may nao" KHONG noi len chieu.'
select chieu_dau, chieu_cuoi, count(*) as so_ngay_nguoi,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram
  from ngay_nguoi
 group by 1, 2 order by count(*) desc;

\echo ''
\echo '=== 2. Khoang cach giua HAI lan quet lien tiep o HAI may KHAC nhau ==='
\echo '    Day la phep do quyet dinh. Neu nguoi ta di qua ca hai dau doc trong mot lan buoc'
\echo '    chan, cac cap nay se dong o duoi 60 giay. Neu la vao/ra that thi chung cach nhau'
\echo '    hang gio.'
with lien_tiep as (
  select lq.nhan_vien_id,
         (lq.thoi_diem + interval '7 hours')::date as ngay,
         m.chieu,
         lag(m.chieu)      over (partition by lq.nhan_vien_id,
                                              (lq.thoi_diem + interval '7 hours')::date
                                 order by lq.thoi_diem) as chieu_truoc,
         lq.thoi_diem,
         lag(lq.thoi_diem) over (partition by lq.nhan_vien_id,
                                              (lq.thoi_diem + interval '7 hours')::date
                                 order by lq.thoi_diem) as truoc
    from lan_quet lq join may_cua m on m.serial = lq.thiet_bi_serial
   where lq.nguon = 'may' and lq.nhan_vien_id is not null and m.chieu <> 'khong_ro'
)
select case when giay <    60 then 'a. duoi 1 phut'
            when giay <   300 then 'b. 1-5 phut'
            when giay <  1800 then 'c. 5-30 phut'
            when giay <  7200 then 'd. 30 phut - 2 gio'
            else                   'e. tren 2 gio' end as khoang_cach,
       count(*) as so_cap,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram
  from (select extract(epoch from (thoi_diem - truoc)) as giay
          from lien_tiep where truoc is not null and chieu <> chieu_truoc) x
 group by 1 order by 1;

\echo ''
\echo '=== 3. Cung mot may hai lan lien tiep (vao->vao hoac ra->ra) ==='
\echo '    Day chinh la thu ma yeu cau goi la "ra vao khong quet ma". Con so nay cho biet'
\echo '    tinh nang canh bao se sinh ra bao nhieu dong MOI NGAY.'
with lien_tiep as (
  select lq.nhan_vien_id,
         (lq.thoi_diem + interval '7 hours')::date as ngay,
         m.chieu,
         lag(m.chieu) over (partition by lq.nhan_vien_id,
                                         (lq.thoi_diem + interval '7 hours')::date
                            order by lq.thoi_diem) as chieu_truoc
    from lan_quet lq join may_cua m on m.serial = lq.thiet_bi_serial
   where lq.nguon = 'may' and lq.nhan_vien_id is not null and m.chieu <> 'khong_ro'
)
select case when chieu = chieu_truoc then 'LAP LAI (' || chieu || '->' || chieu || ')'
            else 'doi chieu (' || chieu_truoc || '->' || chieu || ')' end as kieu,
       count(*) as so_cap,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram
  from lien_tiep where chieu_truoc is not null
 group by 1 order by count(*) desc;

\echo ''
\echo '=== 4. So lan quet moi ngay-nguoi ==='
\echo '    Vao/ra that thi phan lon la 2 lan (vao 1, ra 1). Neu phan lon la 4+ thi nguoi ta'
\echo '    dang quet nhieu hon mot lan moi luot di qua.'
select case when so_lan = 1 then '1 lan' when so_lan = 2 then '2 lan'
            when so_lan = 3 then '3 lan' when so_lan <= 5 then '4-5 lan'
            else '6+ lan' end as so_lan_quet,
       count(*) as so_ngay_nguoi,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram
  from ngay_nguoi group by 1 order by 1;

\echo ''
\echo '=== 5. Vi du 3 ngay-nguoi gan day, xem tan mat ==='
select nv.ma_nv, nv.ho_ten,
       (lq.thoi_diem + interval '7 hours')::date as ngay,
       to_char(lq.thoi_diem + interval '7 hours', 'HH24:MI:SS') as gio,
       m.ten as may, m.chieu
  from lan_quet lq
  join may_cua m on m.serial = lq.thiet_bi_serial
  join nhan_vien nv on nv.id = lq.nhan_vien_id
 where lq.nguon = 'may'
   and (lq.nhan_vien_id, (lq.thoi_diem + interval '7 hours')::date) in (
     select nhan_vien_id, ngay from ngay_nguoi
      where so_lan between 2 and 6 order by ngay desc limit 3)
 order by nv.ma_nv, lq.thoi_diem;

\echo ''
\echo '################################################################'
\echo '#  DOC KET QUA THE NAO:'
\echo '#'
\echo '#  Muc 2 la phep do quyet dinh.'
\echo '#    * Phan lon o "e. tren 2 gio"  -> hai may DUNG la cong vao / cong ra.'
\echo '#      Logic ra/vao lam duoc, canh bao "ra vao khong quet" co nghia.'
\echo '#    * Phan lon o "a. duoi 1 phut" -> nguoi ta di qua ca hai dau doc trong mot buoc'
\echo '#      chan. "May nao" KHONG noi len chieu, va moi canh bao sinh ra se la bao gia.'
\echo '#      Luc do phai doi cach lam: hoac cau hinh lai may, hoac suy chieu tu thu tu quet.'
\echo '#'
\echo '#  Muc 3 cho biet tinh nang canh bao se sinh bao nhieu dong. Neu "LAP LAI" tren 30%'
\echo '#  thi truoc khi bao cho HR phai xem lai mo hinh, khong phai xem lai nhan vien.'
\echo '################################################################'
