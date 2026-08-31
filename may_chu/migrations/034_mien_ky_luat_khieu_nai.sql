-- Module: MIEN KY LUAT + KHIEU NAI + MA TRACKING.
--
-- Ba viec (chu cong ty chot):
--   1. MA TRACKING: moi ho so ky luat va moi khieu nai co mot ma ngan (KL-000001 / KN-000001) de
--      theo doi, tra cuu, doi chieu. Ma sinh tu sequence, gan bang trigger truoc khi chen — nen
--      upsert (on conflict do update) khi quet lai KHONG doi ma da co.
--   2. MIEN KY LUAT: trang thai moi 'mien'. CHI admin duoc chuyen mot/nhieu ho so 'da_ap_dung'
--      hoac 'cho_duyet' sang 'mien'. Ho so 'mien' khong con tinh vao tong giam thuong -> khoan
--      giam thuong tu go khoi phieu luong (qua dong_bo_giam_thuong). Khac 'bac_bo' o cho: bac bo
--      = quyet dinh sai/rut lai; mien = quyet dinh dung nhung cong ty khoan hong cho nguoi lao dong.
--   3. KHIEU NAI: nguoi lao dong khieu nai mot quyet dinh ky luat (hoac giai trinh mot vi pham).
--      Co ma, trang thai, phan hoi. Khi con khieu nai mo tren mot ho so -> dong ho so do bao do.
--
-- RANH GIOI PHAP LY giu nguyen: che tai tai chinh la GIAM THUONG P3 (Dieu 104 BLLD), khong phai
-- phat tien (Dieu 127). Mien ky luat CHI go giam thuong, khong dong den luong co ban.

-- ---------------------------------------------------------------- 1. ma tracking cho ho so ky luat
create sequence if not exists seq_ma_ky_luat;

alter table ho_so_ky_luat add column if not exists ma text;

-- Gan ma cho cac ho so da co (di tru chay tren CSDL dang co du lieu).
update ho_so_ky_luat
   set ma = 'KL-' || lpad(nextval('seq_ma_ky_luat')::text, 6, '0')
 where ma is null;

create unique index if not exists ho_so_ky_luat_ma_idx on ho_so_ky_luat(ma);

create or replace function gan_ma_ky_luat() returns trigger as $$
begin
  if new.ma is null then
    new.ma := 'KL-' || lpad(nextval('seq_ma_ky_luat')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_ky_luat on ho_so_ky_luat;
create trigger trg_ma_ky_luat before insert on ho_so_ky_luat
  for each row execute function gan_ma_ky_luat();

-- ---------------------------------------------------------------- 2. trang thai 'mien'
alter table ho_so_ky_luat drop constraint if exists ho_so_ky_luat_trang_thai_check;
alter table ho_so_ky_luat add constraint ho_so_ky_luat_trang_thai_check
  check (trang_thai in ('moi','da_nhac','cho_duyet','da_ap_dung','bac_bo','huy','mien'));

alter table ho_so_ky_luat add column if not exists ly_do_mien text;
alter table ho_so_ky_luat add column if not exists nguoi_mien uuid
  references nguoi_dung(id) on delete set null;
alter table ho_so_ky_luat add column if not exists mien_luc timestamptz;

comment on column ho_so_ky_luat.ly_do_mien is
  'Ly do admin mien ky luat cho nguoi lao dong. Mien = go giam thuong nhung khong xoa ho so '
  '(van luu de theo doi lich su).';

-- ---------------------------------------------------------------- 3. khieu nai & giai trinh
create sequence if not exists seq_ma_khieu_nai;

-- Mot khieu nai gan voi MOT ho so ky luat (khieu nai quyet dinh giam thuong) HOAC mot vi pham
-- (giai trinh / khieu nai ban ghi vi pham). It nhat mot trong hai phai co.
create table if not exists khieu_nai (
  id                uuid primary key default gen_random_uuid(),
  ma                text,
  ho_so_ky_luat_id  uuid references ho_so_ky_luat(id) on delete cascade,
  vi_pham_id        uuid references vi_pham(id) on delete cascade,
  nhan_vien_id      uuid not null references nhan_vien(id) on delete cascade,

  -- 'khieu_nai'  : khong dong y quyet dinh (ky luat/giam thuong) — de nghi xem lai.
  -- 'giai_trinh' : trinh bay ly do, khong nhat thiet phan doi.
  loai              text not null default 'khieu_nai' check (loai in ('khieu_nai','giai_trinh')),
  noi_dung          text not null check (length(btrim(noi_dung)) >= 5),

  -- moi -> dang_xem -> chap_nhan | tu_choi.
  trang_thai        text not null default 'moi'
                    check (trang_thai in ('moi','dang_xem','chap_nhan','tu_choi')),
  phan_hoi          text,
  nguoi_xu_ly       uuid references nguoi_dung(id) on delete set null,
  xu_ly_luc         timestamptz,

  tao_luc           timestamptz not null default now(),
  cap_nhat_luc      timestamptz not null default now(),

  constraint khieu_nai_co_doi_tuong
    check (ho_so_ky_luat_id is not null or vi_pham_id is not null)
);
create unique index if not exists khieu_nai_ma_idx on khieu_nai(ma);
create index if not exists khieu_nai_ho_so_idx on khieu_nai(ho_so_ky_luat_id)
  where trang_thai in ('moi','dang_xem');
create index if not exists khieu_nai_nhan_vien_idx on khieu_nai(nhan_vien_id, tao_luc desc);

create or replace function gan_ma_khieu_nai() returns trigger as $$
begin
  if new.ma is null then
    new.ma := 'KN-' || lpad(nextval('seq_ma_khieu_nai')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_khieu_nai on khieu_nai;
create trigger trg_ma_khieu_nai before insert on khieu_nai
  for each row execute function gan_ma_khieu_nai();
