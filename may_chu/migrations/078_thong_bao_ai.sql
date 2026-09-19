-- Module: THONG BAO CONG TY BANG AI (DTKT 01, ban 2).
--
-- 1. Mo rong bang `thong_bao`: pham vi 'ca_nhan', cot nhan_vien_id, cot luu tep docx.
-- 2. Bang `thong_bao_nhap_ai`: ban nhap vong doi AI (tach khoi `thong_bao` de ban chua
--    duyet khong lo ra cho nhan vien).
-- 3. Bang `bo_dem_so_vb`: cap so ky hieu bang UPDATE nguyen tu, so khong thung khi
--    rollback (khong dung nextval).
--
-- KHONG pha du lieu cu: moi cot moi deu nullable / co mac dinh, cac rang buoc cu giu hanh vi
-- nhu truoc chi them nhanh ca_nhan.

-- ---------------------------------------------------------------- 1. thong_bao
alter table thong_bao add column if not exists nhan_vien_id uuid references nhan_vien(id);
alter table thong_bao add column if not exists ten_luu text;
alter table thong_bao add column if not exists mime text;
alter table thong_bao add column if not exists kich_thuoc bigint;

-- Bo hai rang buoc pham_vi cu (check cot + check bang) de lap lai voi nhanh ca_nhan.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'thong_bao'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%phong_ban%'
  loop
    execute format('alter table thong_bao drop constraint %I', c);
  end loop;
end $$;

alter table thong_bao add constraint thong_bao_pham_vi_check
  check (pham_vi in ('toan_cong_ty', 'phong_ban', 'ca_nhan'));

-- Ba nhanh loai tru nhau: ca_nhan => nhan_vien_id not null va phong_ban_id null;
-- phong_ban => nguoc lai; toan_cong_ty => ca hai null.
alter table thong_bao add constraint thong_bao_pham_vi_nhat_quan_check check (
  (pham_vi = 'ca_nhan' and nhan_vien_id is not null and phong_ban_id is null)
  or (pham_vi = 'phong_ban' and phong_ban_id is not null and nhan_vien_id is null)
  or (pham_vi = 'toan_cong_ty' and nhan_vien_id is null and phong_ban_id is null)
);

create index if not exists thong_bao_nhan_vien_idx on thong_bao(nhan_vien_id);

-- ---------------------------------------------------------------- 2. thong_bao_nhap_ai
create sequence if not exists seq_ma_thong_bao_nhap_ai;

create table if not exists thong_bao_nhap_ai (
  id            uuid primary key default gen_random_uuid(),
  ma            text,
  loai          text not null check (loai in ('thong_bao', 'quyet_dinh', 'cong_van')),
  pham_vi       text not null default 'toan_cong_ty'
                  check (pham_vi in ('ca_nhan', 'phong_ban', 'toan_cong_ty')),
  quan_he       text not null default 'noi_bo' check (quan_he in ('noi_bo', 'doi_ngoai')),
  phong_ban_id  uuid references phong_ban(id),
  nhan_vien_id  uuid references nhan_vien(id),
  -- Dinh huong giong cho AI (nguoi tao chon tren form). KHONG in vao docx.
  muc_dich      text not null default 'pho_bien'
                  check (muc_dich in ('nhac_nho', 'yeu_cau', 'pho_bien', 'moi_hop', 'phoi_hop')),
  -- Mang sang bang `thong_bao` khi ban hanh.
  muc_do        text not null default 'thuong'
                  check (muc_do in ('thuong', 'quan_trong', 'khan')),
  can_giai_trinh boolean not null default false,
  het_han       timestamptz,
  -- Noi dung tho van tat nguoi tao nhap. Che do tu_soan: noi dung tho CHINH la van xuoi.
  noi_dung_tho  text not null,
  che_do        text not null default 'ai' check (che_do in ('ai', 'tu_soan')),
  spec_json     jsonb,
  ten_luu_docx  text,
  mime          text,
  kich_thuoc    bigint,
  trang_thai    text not null default 'dang_soan'
                  check (trang_thai in ('dang_soan', 'cho_duyet', 'cho_ky', 'loi',
                                        'da_phat_hanh', 'huy')),
  ket_qua_gate  jsonb,
  so_lan_thu    int not null default 0,
  -- Dien o buoc ban hanh. So da cap la VINH VIEN — huy chi ghi so, khong cap lai.
  so_ban_hanh   int,
  so_ky_hieu    text,
  -- Chua id thong bao da ban hanh. UNIQUE chong ban hanh trung (on conflict do nothing).
  thong_bao_id  uuid references thong_bao(id),
  nguoi_tao     uuid references nguoi_dung(id) on delete set null,
  -- Worker nhan viec: danh dau dang xu ly, stale sau 5 phut thi worker khac duoc lay lai.
  dang_xu_ly    timestamptz,
  tao_luc       timestamptz not null default now(),
  cap_nhat_luc  timestamptz not null default now(),
  check (
    (pham_vi = 'ca_nhan' and nhan_vien_id is not null and phong_ban_id is null)
    or (pham_vi = 'phong_ban' and phong_ban_id is not null and nhan_vien_id is null)
    or (pham_vi = 'toan_cong_ty' and nhan_vien_id is null and phong_ban_id is null)
  )
);

create or replace function gan_ma_thong_bao_nhap_ai() returns trigger as $$
begin
  if new.ma is null then
    new.ma := 'TBN-' || lpad(nextval('seq_ma_thong_bao_nhap_ai')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_thong_bao_nhap_ai on thong_bao_nhap_ai;
create trigger trg_ma_thong_bao_nhap_ai before insert on thong_bao_nhap_ai
  for each row execute function gan_ma_thong_bao_nhap_ai();

create unique index if not exists thong_bao_nhap_ai_ma_idx on thong_bao_nhap_ai(ma);
create unique index if not exists thong_bao_nhap_ai_thong_bao_idx
  on thong_bao_nhap_ai(thong_bao_id) where thong_bao_id is not null;
create index if not exists thong_bao_nhap_ai_nguoi_tao_idx
  on thong_bao_nhap_ai(nguoi_tao, cap_nhat_luc desc);
-- Worker quet: nhanh dang_soan chua bi ai giu (hoac giu qua 5 phut).
create index if not exists thong_bao_nhap_ai_cho_xu_ly_idx
  on thong_bao_nhap_ai(tao_luc) where trang_thai = 'dang_soan';

-- ---------------------------------------------------------------- 3. bo_dem_so_vb
-- Cap so bang UPDATE nguyen tu (khong dung sequence de so khong thung khi rollback).
create table if not exists bo_dem_so_vb (
  loai    text not null check (loai in ('thong_bao', 'quyet_dinh', 'cong_van')),
  nam     int  not null,
  gia_tri int  not null default 0,
  primary key (loai, nam)
);
