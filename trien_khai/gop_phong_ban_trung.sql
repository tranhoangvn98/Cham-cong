-- ============================================================================
-- GOP CAC PHONG BAN TRUNG TEN ve mot dong duy nhat (chay 27/10/2026).
--
-- Loi: bang phong_ban co 29 dong, trong do 16 dong RONG hoan toan — do du lieu
-- duoc tao qua ba dot dat ten khac nhau (07/08 ten ngan, 29/08 ten day du,
-- 20/09 ten ngan + viet tat). Man hinh "Phong ban kiem nhiem" liet ke du 29 dong
-- nen nguoi dung thay IT / Phòng IT / Phòng Công nghệ thông tin chong nhau.
--
-- NGUYEN TAC: giu TEN NGAN dang giu du lieu that (nhan vien, vi tri, dau viec,
-- van ban deu nam o ten ngan); ten day du va viet tat bi keo ve ten ngan.
-- Sau lan nay moi phong chi con DUNG MOT dong.
--
-- Chay TRONG container:
--   docker compose exec -T postgres psql -U chamcong -d chamcong -f /dev/stdin < tep.sql
-- ============================================================================
begin;

create temp table pb_gop (tu text primary key, den text not null) on commit drop;
insert into pb_gop (tu, den) values
  ('IT',                       'Phòng IT'),
  ('Phòng Công nghệ thông tin','Phòng IT'),
  ('XNK',                      'Phòng XNK'),
  ('Phòng Xuất nhập khẩu',     'Phòng XNK'),
  ('CSKH',                     'Phòng CSKH'),
  ('Phòng Chăm sóc khách hàng','Phòng CSKH'),
  ('HCNS',                     'Phòng HCNS'),
  ('Hành chính nhân sự',       'Phòng HCNS'),
  ('Phòng Hành chính nhân sự', 'Phòng HCNS'),
  ('KT',                       'Phòng Kế toán'),
  ('Kế toán',                  'Phòng Kế toán'),
  ('MKT',                      'Phòng Marketing'),
  ('Phòng Kho Trung Quốc',     'Phòng Kho TQ'),
  ('Kho vận',                  'Phòng Kho VN'),
  ('KS',                       'Ban Kiểm soát'),
  ('Phòng Kiểm soát',          'Ban Kiểm soát');

-- Chi cap (nguon -> dich) khi CA HAI dong deu ton tai va khac nhau.
create temp table pb_cap on commit drop as
select s.id as id_nguon, d.id as id_dich, s.ten as ten_nguon, d.ten as ten_dich
  from pb_gop g
  join phong_ban s on s.ten = g.tu
  join phong_ban d on d.ten = g.den
 where s.id <> d.id;

\echo '=== CAC CAP SE GOP ==='
select ten_nguon || '  ->  ' || ten_dich as cap_gop from pb_cap order by ten_dich, ten_nguon;

-- 1) Giu truong phong cua dong nguon neu dong dich chua co.
update phong_ban d
   set truong_phong_id = coalesce(d.truong_phong_id, s.truong_phong_id)
  from pb_cap c
  join phong_ban s on s.id = c.id_nguon
 where d.id = c.id_dich
   and d.truong_phong_id is null
   and s.truong_phong_id is not null;

-- 2) Chuyen MOI tham chieu sang dong dich.
--    THU TU QUAN TRONG: thong_bao va phong_ban_kiem_nhiem xoa CASCADE khi mat phong.

update thong_bao x       set phong_ban_id      = c.id_dich from pb_cap c where x.phong_ban_id = c.id_nguon;
update thong_bao_nhap_ai x set phong_ban_id    = c.id_dich from pb_cap c where x.phong_ban_id = c.id_nguon;
update van_ban_cong_ty x set phong_ban_id      = c.id_dich from pb_cap c where x.phong_ban_id = c.id_nguon;
update vi_tri x          set phong_ban_id      = c.id_dich from pb_cap c where x.phong_ban_id = c.id_nguon;
update dau_viec x        set phong_ban_id      = c.id_dich from pb_cap c where x.phong_ban_id = c.id_nguon;
update de_nghi_them_nhan_su x set phong_ban_id = c.id_dich from pb_cap c where x.phong_ban_id = c.id_nguon;
update danh_muc_kpi x    set ap_dung_phong_ban = c.id_dich from pb_cap c where x.ap_dung_phong_ban = c.id_nguon;
update nhan_vien x       set phong_ban_id      = c.id_dich from pb_cap c where x.phong_ban_id = c.id_nguon;

-- Kiem nhiem: bo dong trung cap (nguoi da kiem nhiem dong dich) truoc, roi chuyen phan con lai.
delete from phong_ban_kiem_nhiem k
 using pb_cap c
 where k.phong_ban_id = c.id_nguon
   and exists (select 1 from phong_ban_kiem_nhiem x
                where x.nhan_vien_id = k.nhan_vien_id and x.phong_ban_id = c.id_dich);

update phong_ban_kiem_nhiem k set phong_ban_id = c.id_dich
  from pb_cap c where k.phong_ban_id = c.id_nguon;

-- 3) Chan lai neu con sot tham chieu (khong bao gio nen xay ra).
do $$
declare con_lai int;
begin
  select count(*) into con_lai
    from phong_ban p
   where p.id in (select id_nguon from pb_cap)
     and (exists (select 1 from nhan_vien          x where x.phong_ban_id = p.id)
       or exists (select 1 from vi_tri             x where x.phong_ban_id = p.id)
       or exists (select 1 from dau_viec           x where x.phong_ban_id = p.id)
       or exists (select 1 from de_nghi_them_nhan_su x where x.phong_ban_id = p.id)
       or exists (select 1 from phong_ban_kiem_nhiem x where x.phong_ban_id = p.id)
       or exists (select 1 from thong_bao          x where x.phong_ban_id = p.id)
       or exists (select 1 from thong_bao_nhap_ai  x where x.phong_ban_id = p.id)
       or exists (select 1 from van_ban_cong_ty    x where x.phong_ban_id = p.id)
       or exists (select 1 from danh_muc_kpi       x where x.ap_dung_phong_ban = p.id));
  if con_lai > 0 then
    raise exception 'DUNG LAI: con % phong ban nguon chua chuyen het tham chieu', con_lai;
  end if;
end $$;

-- 4) Xoa cac dong trung (gio rong hoan toan).
delete from phong_ban where id in (select id_nguon from pb_cap);

commit;

-- ================================ doi chieu ket qua
\pset pager off
\echo '=== PHONG BAN CON LAI ==='
select pb.ten,
       (select count(*) from nhan_vien nv where nv.phong_ban_id = pb.id and nv.dang_hoat_dong) as dang_lam,
       (select count(*) from vi_tri v where v.phong_ban_id = pb.id) as vi_tri,
       (select count(*) from dau_viec d where d.phong_ban_id = pb.id) as dau_viec
  from phong_ban pb
 order by pb.ten;

\echo '=== TONG SO PHONG BAN (mong doi 13) ==='
select count(*) as so_phong_ban from phong_ban;
