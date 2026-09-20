-- ============================================================================
-- 084 — Quan ly co cau to chuc – vi tri – trach nhiem (JD phan tang).
--
-- Mo hinh 4 tang: nhom_trach_nhiem (cap 1) -> tn_chi_tiet (cap 2, co nguoi quan
-- tri) -> dau_viec (cap 3, template task theo vi tri) -> dau_viec_buoc (cap 4,
-- step checklist). Cong viec dinh ky sinh tu dau_viec qua cong_viec_mau_dinh_ky.
--
-- Mot nhan su kiem nhiem NHIEU vi tri (nhan_vien_vi_tri, n-n) — moi vi tri thuc
-- thi dau viec thuoc nhieu tn_chi_tiet khac nhau. RACI luu theo VAI TRO (ceo /
-- tp / tn / nv_cv / tbks), khong phai theo vi tri cu the.
-- ============================================================================

-- ---------------------------------------------------------------- vi tri cong viec (JD)
create table if not exists vi_tri (
  id              uuid primary key default gen_random_uuid(),
  -- Ma viet tat de seed idempotent va de doi chieu voi file JD (vd 'CEO', 'NVKD').
  ma              text not null unique,
  ten             text not null,
  cap_bac         text not null default 'nhan_vien'
                  check (cap_bac in ('cap_cao','truong_phong','truong_nhom',
                                     'chuyen_vien','nhan_vien')),
  -- Pham vi ap dung: cu_the = phong ghi o phong_ban_id; toan_cong_ty / moi_phong
  -- = ap dung rong (vi tri chung nhu 'Truong phong (chung)').
  pham_vi         text not null default 'cu_the'
                  check (pham_vi in ('cu_the','toan_cong_ty','moi_phong')),
  phong_ban_id    uuid references phong_ban(id) on delete set null,
  mo_ta           text,
  dang_hoat_dong  boolean not null default true,
  tao_luc         timestamptz not null default now(),
  constraint vi_tri_pham_vi_hop_le check (
    pham_vi = 'cu_the' or phong_ban_id is null
  )
);
create index if not exists vi_tri_phong_idx on vi_tri(phong_ban_id);

-- ---------------------------------------------------------------- nhom trach nhiem (cap 1)
create table if not exists nhom_trach_nhiem (
  id        uuid primary key default gen_random_uuid(),
  -- Ma theo file JD (vd '1', '23') — dung de nhom va sap xep.
  ma        text not null unique,
  ten       text not null unique,
  tao_luc   timestamptz not null default now()
);

-- ---------------------------------------------------------------- trach nhiem chi tiet (cap 2)
create table if not exists tn_chi_tiet (
  id                        uuid primary key default gen_random_uuid(),
  nhom_id                   uuid not null references nhom_trach_nhiem(id) on delete cascade,
  -- Ma cap 2 theo file JD (vd '1.1', '23.9'). Task chua phan cap 2 thi de trong.
  ma                        text,
  ten                       text not null,
  -- Nguoi QUAN TRI trach nhiem chi tiet (thuong la truong phong) — duoc quyen sua
  -- rule cua moi dau viec thuoc tn_chi_tiet nay.
  nguoi_quan_tri_vi_tri_id  uuid references vi_tri(id) on delete set null,
  mo_ta                      text,
  tao_luc                   timestamptz not null default now(),
  constraint tn_chi_tiet_trong_nhom_duy_nhat unique (nhom_id, ten)
);
create index if not exists tn_chi_tiet_nhom_idx on tn_chi_tiet(nhom_id);
create index if not exists tn_chi_tiet_quan_tri_idx on tn_chi_tiet(nguoi_quan_tri_vi_tri_id);

-- ---------------------------------------------------------------- dau viec (cap 3 — template task theo vi tri)
create table if not exists dau_viec (
  id                uuid primary key default gen_random_uuid(),
  vi_tri_id         uuid not null references vi_tri(id) on delete cascade,
  ten               text not null,
  mo_ta             text,
  nhom_id           uuid not null references nhom_trach_nhiem(id) on delete restrict,
  -- Task chua phan cap 2 (file JD de trong) thi null.
  tn_chi_tiet_id    uuid references tn_chi_tiet(id) on delete set null,
  phong_ban_id      uuid references phong_ban(id) on delete set null,
  input             text,
  output            text,
  kpi               text,
  co_bc             boolean not null default false,
  -- Ma bao cao (vd CPTP-QUY-CSGKM). De trong khi task khong co bao cao.
  ma_bc             text,
  trang_thai_ma_bc  text check (trang_thai_ma_bc in ('de_xuat','chuan')),
  -- Tan suat CHUAN HOA de sinh viec dinh ky. `phat_sinh`/`lien_tuc` khong sinh tu
  -- dong — chi lam co so giao viec tay. Chuoi goc cua file JD luu o tan_suat_tho.
  tan_suat          text not null default 'phat_sinh'
                    check (tan_suat in ('hang_ngay','hang_tuan','hai_tuan','hang_thang',
                                        'hang_quy','hang_nam','6_thang',
                                        'phat_sinh','lien_tuc')),
  tan_suat_tho      text,
  -- SLA hoan thanh (chuoi goc, vd '8 gio/SP') + con so gio (neu tach duoc) de
  -- tinh han khi giao viec.
  sla               text,
  sla_gio           float8 check (sla_gio is null or sla_gio >= 0),
  -- Nguong phan cap xu ly (text, 57 dong trong file JD).
  phan_cap_xu_ly    text,
  muc_do_quan_trong text not null default 'cao'
                    check (muc_do_quan_trong in ('cao','rat_cao','trung_binh')),
  ghi_chu           text,
  -- Cong tac bat/tat sinh viec tu dong cho tung dau viec.
  dang_bat          boolean not null default true,
  thu_tu            int not null default 0,
  tao_luc           timestamptz not null default now(),
  -- Chong trung khi nap lai file JD: mot vi tri khong co hai dau viec trung ten.
  constraint dau_viec_vi_tri_ten_duy_nhat unique (vi_tri_id, ten)
);
create index if not exists dau_viec_tn_idx on dau_viec(tn_chi_tiet_id);
create index if not exists dau_viec_nhom_idx on dau_viec(nhom_id);
create index if not exists dau_viec_ma_bc_idx on dau_viec(ma_bc) where ma_bc is not null;
create index if not exists dau_viec_phong_idx on dau_viec(phong_ban_id);

-- ---------------------------------------------------------------- RACI theo vai tro
create table if not exists dau_viec_raci (
  id             uuid primary key default gen_random_uuid(),
  dau_viec_id    uuid not null references dau_viec(id) on delete cascade,
  -- R = thuc hien, A = chiu trach nhiem cuoi (duyet), C = tham van, I = duoc bao.
  vai_tro        text not null check (vai_tro in ('R','A','C','I')),
  kieu_nguoi     text not null check (kieu_nguoi in ('ceo','tp','tn','nv_cv','tbks')),
  tao_luc        timestamptz not null default now(),
  constraint dau_viec_raci_duy_nhat unique (dau_viec_id, vai_tro, kieu_nguoi)
);
create index if not exists dau_viec_raci_dv_idx on dau_viec_raci(dau_viec_id);

-- ---------------------------------------------------------------- step cong viec (cap 4)
create table if not exists dau_viec_buoc (
  id           uuid primary key default gen_random_uuid(),
  dau_viec_id  uuid not null references dau_viec(id) on delete cascade,
  ten          text not null,
  mo_ta        text,
  thu_tu       int not null default 0,
  tao_luc      timestamptz not null default now()
);
create index if not exists dau_viec_buoc_dv_idx on dau_viec_buoc(dau_viec_id, thu_tu);

-- ---------------------------------------------------------------- danh muc mau bao cao theo ma BC
create table if not exists bao_cao_mau (
  id        uuid primary key default gen_random_uuid(),
  -- Ma bao cao nhu file JD (vd 'CPTP-QUY-CSGKM') — la khoa lien ket mem cua dau_viec.
  ma        text not null unique,
  ten       text,
  -- Trang thai ma bao cao theo file JD: 'de_xuat' (moi) hoac 'chuan'.
  trang_thai text not null default 'de_xuat' check (trang_thai in ('de_xuat','chuan')),
  tao_luc   timestamptz not null default now()
);

-- ---------------------------------------------------------------- kiem nhiem vi tri (n-n)
create table if not exists nhan_vien_vi_tri (
  id             uuid primary key default gen_random_uuid(),
  nhan_vien_id   uuid not null references nhan_vien(id) on delete cascade,
  vi_tri_id      uuid not null references vi_tri(id) on delete cascade,
  -- Vi tri chinh de hien thi chuc danh (dong bo nhan_vien.chuc_danh).
  la_chinh       boolean not null default false,
  bat_dau        date,
  ket_thuc       date,
  tao_luc        timestamptz not null default now(),
  constraint nhan_vien_vi_tri_duy_nhat unique (nhan_vien_id, vi_tri_id),
  constraint nhan_vien_vi_tri_khoang_hop_le check (
    bat_dau is null or ket_thuc is null or ket_thuc >= bat_dau
  )
);
create index if not exists nhan_vien_vi_tri_nv_idx on nhan_vien_vi_tri(nhan_vien_id);
create unique index if not exists nhan_vien_vi_tri_mot_chinh_idx
  on nhan_vien_vi_tri(nhan_vien_id) where la_chinh;

alter table nhan_vien
  add column if not exists vi_tri_chinh_id uuid references vi_tri(id) on delete set null;

-- ---------------------------------------------------------------- noi dau viec vao he thong cong viec hien co
alter table cong_viec
  add column if not exists dau_viec_id uuid references dau_viec(id) on delete set null;
create index if not exists cong_viec_dau_viec_idx on cong_viec(dau_viec_id);

-- Mau dinh ky sinh tu JD: them nguon 'jd' + dau_viec_id + tan suat dai (quy, nam...).
alter table cong_viec_mau_dinh_ky
  add column if not exists dau_viec_id uuid references dau_viec(id) on delete set null;
create index if not exists cong_viec_mau_dau_viec_idx
  on cong_viec_mau_dinh_ky(dau_viec_id);

alter table cong_viec_mau_dinh_ky drop constraint if exists cong_viec_mau_dinh_ky_nguon_check;
alter table cong_viec_mau_dinh_ky
  add constraint cong_viec_mau_dinh_ky_nguon_check
  check (nguon in ('giam_doc','truong_phong','lien_phong','jd'));

alter table cong_viec_mau_dinh_ky drop constraint if exists cong_viec_mau_dinh_ky_quy_tac_check;
alter table cong_viec_mau_dinh_ky
  add constraint cong_viec_mau_dinh_ky_quy_tac_check
  check (quy_tac in ('hang_ngay','hang_tuan','hang_thang','khoang_ngay',
                     'hai_tuan','hang_quy','hang_nam','6_thang'));

-- ---------------------------------------------------------------- bao cao gan ma BC + nguon
alter table bao_cao
  add column if not exists ma_bc          text,
  add column if not exists dau_viec_id    uuid references dau_viec(id) on delete set null,
  add column if not exists cong_viec_id   uuid references cong_viec(id) on delete set null;
create index if not exists bao_cao_ma_bc_idx on bao_cao(ma_bc) where ma_bc is not null;
create index if not exists bao_cao_dau_viec_idx on bao_cao(dau_viec_id);
