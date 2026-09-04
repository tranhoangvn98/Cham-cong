-- Module: GOC NHIN CA NHAN — THONG BAO (BGD) + VAN BAN CONG TY.
--
-- Ba bang, tat ca deu co MA TRACKING nhu ky luat/khieu nai (chu cong ty chot: moi thu can ma
-- de theo doi):
--   1. thong_bao        — thong bao tu Ban giam doc / HR, pham vi toan cong ty hoac 1 phong ban.
--                         Loai 'can_giai_trinh' bat nhan vien phai giai trinh moi dong duoc.
--   2. thong_bao_da_doc — moi nhan vien xac nhan da doc mot thong bao (doc_luc), va neu thong bao
--                         yeu cau thi nhap GIAI TRINH (co ma GT- rieng, noi vao muc Khieu nai &
--                         giai trinh san co de HR quan ly mot cho).
--   3. van_ban_cong_ty  — kho van ban chung (noi quy, bieu mau, chinh sach) nhan vien xem/tai.
--
-- NĐ 13/2023: thong bao KHONG chua du lieu ca nhan nhay cam; van ban cong ty la tai lieu chung.

-- ---------------------------------------------------------------- 1. thong bao
create sequence if not exists seq_ma_thong_bao;

create table if not exists thong_bao (
  id              uuid primary key default gen_random_uuid(),
  ma              text,
  tieu_de         text not null,
  noi_dung        text not null,
  muc_do          text not null default 'thuong'
                    check (muc_do in ('thuong','quan_trong','khan')),
  -- Bat nhan vien phai NHAP GIAI TRINH (khong chi bam "da doc") moi coi la xong.
  can_giai_trinh  boolean not null default false,
  -- Pham vi nhan: ca cong ty, hoac chi mot phong ban.
  pham_vi         text not null default 'toan_cong_ty'
                    check (pham_vi in ('toan_cong_ty','phong_ban')),
  phong_ban_id    uuid references phong_ban(id) on delete cascade,
  nguoi_tao       uuid references nguoi_dung(id) on delete set null,
  tao_luc         timestamptz not null default now(),
  het_han         timestamptz,
  -- Go xuong (khong xoa cung — con luu lich su ai da doc/giai trinh).
  da_go           boolean not null default false,
  -- Pham vi 'phong_ban' bat buoc co phong_ban_id; 'toan_cong_ty' thi khong.
  check ((pham_vi = 'phong_ban') = (phong_ban_id is not null))
);

create or replace function gan_ma_thong_bao() returns trigger as $$
begin
  if new.ma is null then
    new.ma := 'TB-' || lpad(nextval('seq_ma_thong_bao')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_thong_bao on thong_bao;
create trigger trg_ma_thong_bao before insert on thong_bao
  for each row execute function gan_ma_thong_bao();

create unique index if not exists thong_bao_ma_idx on thong_bao(ma);
create index if not exists thong_bao_con_hieu_luc_idx
  on thong_bao(tao_luc desc) where da_go = false;

-- ---------------------------------------------------------------- 2. da doc + giai trinh
create sequence if not exists seq_ma_giai_trinh_tb;

create table if not exists thong_bao_da_doc (
  id              uuid primary key default gen_random_uuid(),
  -- Ma GT- CHI sinh khi co giai trinh (thong bao thuong chi bam "da doc" thi khong can ma).
  ma              text,
  thong_bao_id    uuid not null references thong_bao(id) on delete cascade,
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  doc_luc         timestamptz not null default now(),
  giai_trinh      text,
  giai_trinh_luc  timestamptz,
  unique (thong_bao_id, nhan_vien_id)
);

-- Sinh ma GT- khi giai_trinh chuyen tu rong sang co (insert hoac update). Upsert lai KHONG doi
-- ma da co.
create or replace function gan_ma_giai_trinh_tb() returns trigger as $$
begin
  if new.giai_trinh is not null and btrim(new.giai_trinh) <> '' and new.ma is null then
    new.ma := 'GT-' || lpad(nextval('seq_ma_giai_trinh_tb')::text, 6, '0');
    if new.giai_trinh_luc is null then new.giai_trinh_luc := now(); end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_giai_trinh_tb on thong_bao_da_doc;
create trigger trg_ma_giai_trinh_tb before insert or update on thong_bao_da_doc
  for each row execute function gan_ma_giai_trinh_tb();

create unique index if not exists thong_bao_da_doc_ma_idx on thong_bao_da_doc(ma)
  where ma is not null;
create index if not exists thong_bao_da_doc_nv_idx on thong_bao_da_doc(nhan_vien_id);

-- ---------------------------------------------------------------- 3. van ban cong ty
create sequence if not exists seq_ma_van_ban;

create table if not exists van_ban_cong_ty (
  id              uuid primary key default gen_random_uuid(),
  ma              text,
  tieu_de         text not null,
  mo_ta           text,
  danh_muc        text not null default 'khac'
                    check (danh_muc in ('noi_quy','bieu_mau','chinh_sach','huong_dan','khac')),
  -- Tep luu trong kho ho so (cung co che luu_tep, chan path traversal). NULL = van ban chi
  -- co noi dung mo ta / lien ket, khong dinh kem tep.
  ten_luu         text,
  ten_goc         text,
  mime            text,
  kich_thuoc      bigint,
  nguoi_tao       uuid references nguoi_dung(id) on delete set null,
  tao_luc         timestamptz not null default now(),
  da_go           boolean not null default false
);

create or replace function gan_ma_van_ban() returns trigger as $$
begin
  if new.ma is null then
    new.ma := 'VB-' || lpad(nextval('seq_ma_van_ban')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_van_ban on van_ban_cong_ty;
create trigger trg_ma_van_ban before insert on van_ban_cong_ty
  for each row execute function gan_ma_van_ban();

create unique index if not exists van_ban_cong_ty_ma_idx on van_ban_cong_ty(ma);
create index if not exists van_ban_con_hieu_luc_idx
  on van_ban_cong_ty(danh_muc, tao_luc desc) where da_go = false;
