-- Module: HO THU Y KIEN — noi nhan su gui gop y / phan anh / yeu cau / thac mac va y kien
-- cho ban du thao van ban AI. Khac voi don tu khieu nai: day la kenh lang nghe + giai dap,
-- hoi thoai hai chieu cho den khi nhan su dong ho thu.
--
-- 1. Bang `ho_thu_y_kien`: mot ho thu = mot cuoc hoi thoai.
--    - loai='du_thao' khi la y kien cho mot BAN DU THAO van ban (`thong_bao_nhap_ai`);
--      cac loai con lai la gop y chung, khong gan van ban nao.
-- 2. Bang `ho_thu_y_kien_tra_loi`: thread trao doi hai chieu (nhan_vien <-> nhan_su).
--
-- KHONG pha du lieu cu — toan bo bang moi.

create sequence if not exists seq_ma_ho_thu_y_kien;

create table if not exists ho_thu_y_kien (
  id            uuid primary key default gen_random_uuid(),
  ma            text,
  loai          text not null check (loai in ('du_thao', 'gop_y', 'phan_anh', 'yeu_cau', 'thac_mac')),
  nhan_vien_id  uuid references nhan_vien(id) on delete set null,
  -- Chi dat khi loai='du_thao': y kien gui cho ban du thao van ban AI nay.
  nhap_ai_id    uuid references thong_bao_nhap_ai(id) on delete set null,
  tieu_de       text not null check (length(btrim(tieu_de)) >= 3),
  noi_dung      text not null check (length(btrim(noi_dung)) >= 1),
  trang_thai    text not null default 'moi' check (trang_thai in ('moi', 'dang_xem', 'da_dong')),
  nguoi_xu_ly   uuid references nguoi_dung(id) on delete set null,
  dong_luc      timestamptz,
  tao_luc       timestamptz not null default now(),
  cap_nhat_luc  timestamptz not null default now(),
  -- loai='du_thao' bat buoc gan nhap_ai_id; cac loai khac bat buoc KHONG gan.
  check ((loai = 'du_thao') = (nhap_ai_id is not null))
);

create or replace function gan_ma_ho_thu_y_kien() returns trigger as $$
begin
  if new.ma is null then
    new.ma := 'HTYK-' || lpad(nextval('seq_ma_ho_thu_y_kien')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_ho_thu_y_kien on ho_thu_y_kien;
create trigger trg_ma_ho_thu_y_kien before insert on ho_thu_y_kien
  for each row execute function gan_ma_ho_thu_y_kien();

create unique index if not exists ho_thu_y_kien_ma_idx on ho_thu_y_kien(ma);
create index if not exists ho_thu_y_kien_nhan_vien_idx
  on ho_thu_y_kien(nhan_vien_id, tao_luc desc);
create index if not exists ho_thu_y_kien_nhap_ai_idx on ho_thu_y_kien(nhap_ai_id);
create index if not exists ho_thu_y_kien_trang_thai_idx
  on ho_thu_y_kien(trang_thai, tao_luc desc);

create table if not exists ho_thu_y_kien_tra_loi (
  id             uuid primary key default gen_random_uuid(),
  ho_thu_id      uuid not null references ho_thu_y_kien(id) on delete cascade,
  vai            text not null check (vai in ('nhan_vien', 'nhan_su')),
  nguoi_dung_id  uuid references nguoi_dung(id) on delete set null,
  noi_dung       text not null check (length(btrim(noi_dung)) >= 1),
  tao_luc        timestamptz not null default now()
);

create index if not exists ho_thu_y_kien_tra_loi_idx
  on ho_thu_y_kien_tra_loi(ho_thu_id, tao_luc);
