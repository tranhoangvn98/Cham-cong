-- ============================================================================
-- CHI DOC. Vong 2: do lai tren luong da LOC BAM-DUP, va ap chieu DA SUA (ten may bi dao).
--
-- Vong 1 cho hai ket luan:
--   * Hai may CO tinh chieu that (muc 2: khoang cach trai deu, khong don o duoi 1 phut).
--   * Ten may bi DAO: nguoi ta di lam buoi sang bang cach quet "Cong ra".
--       serial 8116254600440 ("VP - Cong ra")  -> chieu THUC TE = 'vao'
--       serial 8116254600435 ("VP - Cong vao")  -> chieu THUC TE = 'ra'
--   * Nhung LAP LAI (cung may hai lan lien tiep) = 47%, phan lon la bam-dup 1-2 giay.
--
-- Cau hoi quyet dinh cua vong 2: SAU KHI loc bam-dup, LAP LAI co tut duoi 30% khong?
-- Neu co -> mo hinh chieu dung duoc. Neu khong -> con chuyen khac, chua bat canh bao.
--
--   Chay: docker compose exec -T postgres psql -U chamcong -d chamcong < trien_khai/kiem_chieu_ra_vao_2.sql
-- ============================================================================
\pset pager off

-- Chieu DA SUA, khai thang theo serial (khong doc ten nua vi ten bi dao).
create temp table may_cua as
select serial, ten,
       case serial when '8116254600440' then 'vao'   -- "Cong ra"  thuc te la VAO
                   when '8116254600435' then 'ra'    -- "Cong vao" thuc te la RA
                   else 'khong_ro' end as chieu
  from thiet_bi;

\echo ''
\echo '=== A. Phan bo khoang cach giua HAI lan quet CUNG MAY lien tiep (chon nguong loc) ==='
\echo '    Bam-dup that thi nam o duoi vai giay. Con so nay giup chon cua so loc.'
with lt as (
  select lq.nhan_vien_id, lq.thiet_bi_serial,
         extract(epoch from (lq.thoi_diem - lag(lq.thoi_diem) over (
           partition by lq.nhan_vien_id, lq.thiet_bi_serial,
                        (lq.thoi_diem + interval '7 hours')::date
           order by lq.thoi_diem))) as giay
    from lan_quet lq join may_cua m on m.serial = lq.thiet_bi_serial
   where lq.nguon = 'may' and lq.nhan_vien_id is not null and m.chieu <> 'khong_ro'
)
select case when giay <=  3 then 'a. <= 3 giay'  when giay <= 10 then 'b. <= 10 giay'
            when giay <= 30 then 'c. <= 30 giay' when giay <= 60 then 'd. <= 60 giay'
            when giay <= 120 then 'e. <= 120 giay' else 'f. > 120 giay' end as khoang,
       count(*) as so_cap
  from lt where giay is not null
 group by 1 order by 1;

-- Luong DA LOC: bo lan quet neu lan LIEN TRUOC (bat ke may) cung nguoi, CUNG may, trong 120 giay.
-- Dedup xap xi mot buoc (dung lag) — du de gop chuoi bam-dup 2-3 nhip.
create temp table sach as
with danh_so as (
  select lq.nhan_vien_id, lq.thiet_bi_serial, lq.thoi_diem, m.chieu,
         (lq.thoi_diem + interval '7 hours')::date as ngay,
         lag(lq.thiet_bi_serial) over w as serial_truoc,
         lag(lq.thoi_diem)       over w as t_truoc
    from lan_quet lq join may_cua m on m.serial = lq.thiet_bi_serial
   where lq.nguon = 'may' and lq.nhan_vien_id is not null and m.chieu <> 'khong_ro'
  window w as (partition by lq.nhan_vien_id, (lq.thoi_diem + interval '7 hours')::date
              order by lq.thoi_diem)
)
select nhan_vien_id, thiet_bi_serial, thoi_diem, chieu, ngay
  from danh_so
 where serial_truoc is null
    or serial_truoc <> thiet_bi_serial
    or extract(epoch from (thoi_diem - t_truoc)) > 120;

\echo ''
\echo '=== B. So lan quet moi ngay-nguoi SAU KHI loc bam-dup ==='
\echo '    So sanh voi muc 4 vong 1 (80.7% co 6+). Neu 2 lan tro thanh da so -> luong sach.'
select case when so_lan = 1 then '1 lan' when so_lan = 2 then '2 lan'
            when so_lan = 3 then '3 lan' when so_lan <= 5 then '4-5 lan'
            else '6+ lan' end as so_lan_quet,
       count(*) as so_ngay_nguoi,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram
  from (select nhan_vien_id, ngay, count(*) as so_lan from sach group by 1, 2) x
 group by 1 order by 1;

\echo ''
\echo '=== C. LAP LAI vs doi chieu SAU KHI loc — con so QUYET DINH ==='
\echo '    Nguong cua ke hoach: LAP LAI < 30% thi mo hinh chieu dung duoc.'
with lt as (
  select chieu, lag(chieu) over (partition by nhan_vien_id, ngay order by thoi_diem) as truoc
    from sach
)
select case when chieu = truoc then 'LAP LAI (' || chieu || '->' || chieu || ')'
            else 'doi chieu (' || truoc || '->' || chieu || ')' end as kieu,
       count(*) as so_cap,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram
  from lt where truoc is not null
 group by 1 order by count(*) desc;

\echo ''
\echo '=== D. Mau ngay-nguoi SAU KHI loc va AP CHIEU DA SUA ==='
\echo '    Ngay lanh manh = vao ... ra. Dem xem bao nhieu ngay bat dau bang vao va ket bang ra.'
with dn as (
  select nhan_vien_id, ngay,
         (array_agg(chieu order by thoi_diem))[1] as chieu_dau,
         (array_agg(chieu order by thoi_diem desc))[1] as chieu_cuoi,
         count(*) as so_lan
    from sach group by 1, 2
)
select chieu_dau, chieu_cuoi, count(*) as so_ngay_nguoi,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as phan_tram
  from dn group by 1, 2 order by count(*) desc;

\echo ''
\echo '=== E. Vi du 3 ngay-nguoi SAU KHI loc (doi chieu voi muc 5 vong 1) ==='
select nv.ma_nv, nv.ho_ten, s.ngay,
       to_char(s.thoi_diem + interval '7 hours', 'HH24:MI:SS') as gio,
       t.ten as ten_may, s.chieu as chieu_da_sua
  from sach s
  join nhan_vien nv on nv.id = s.nhan_vien_id
  join thiet_bi t  on t.serial = s.thiet_bi_serial
 where (s.nhan_vien_id, s.ngay) in (
     select nhan_vien_id, ngay from (
        select nhan_vien_id, ngay, count(*) c from sach group by 1,2) z
      where c between 2 and 6 order by ngay desc limit 3)
 order by nv.ma_nv, s.thoi_diem;

\echo ''
\echo '################################################################'
\echo '#  Muc C la con so quyet dinh:'
\echo '#    * LAP LAI < 30%  -> ten may bi dao la ket luan cuoi. Sua chieu theo serial,'
\echo '#      loc bam-dup khi tiep nhan, roi noi ra_vao.ts vao bang cong.'
\echo '#    * LAP LAI van >= 30% -> con nguoi ra/vao khong quet nhieu that. Bat canh bao'
\echo '#      o che do "quan sat" truoc, chua dua vao luong.'
\echo '#  Muc D cho biet ty le ngay "vao...ra" lanh manh sau khi sua + loc.'
\echo '################################################################'
