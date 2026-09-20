-- ============================================================================
-- 083 — Quan ly cong viec: mo rong bang cong_viec hien co (trong ho so nhan su)
-- thanh module cong viec day du — nguon giao viec, han gio, chien dich, dinh ky,
-- workflow he thong, checklist con.
--
-- Bang cong_viec da co tu 009: nhan_vien_id (nguoi nhan), giao_boi (nguoi giao),
-- tieu_de, mo_ta, han (date), uu_tien, trang_thai, ket_qua, hoan_thanh_luc.
-- GIU NGUYEN ten cot cu de ho so nhan su va KPI chay khong dut.
--
-- Phan luong quan ly:
--   - Dong co `nguon = 'ho_so'` (mac dinh, toan bo du lieu cu): van do route ho so
--     nhan su quan ly nhu truoc.
--   - Dong co `nguon != 'ho_so'`: do module moi quan ly (route /api/viec) — route
--     ho so bi chan khong sua/xoa duoc.
--
-- Thu tu uu tien nguon (de hien thi va sap xep):
--   giam_doc > he_thong > truong_phong > lien_phong > tu_tao > ho_so
-- ============================================================================

-- ---------------------------------------------------------------- nhom viec (chien dich / viec chung lien phong)
create table if not exists cong_viec_nhom (
  id              uuid primary key default gen_random_uuid(),
  -- 'chien_dich': giao viec hang loat theo dot (vd chien dich don Tet).
  -- 'viec_chung': mot dau viec chung nhieu nguoi nhieu phong ban.
  loai            text not null default 'viec_chung'
                  check (loai in ('chien_dich','viec_chung')),
  ten             text not null,
  mo_ta           text,
  ngay_bat_dau    date,
  ngay_ket_thuc   date,
  tao_boi         uuid references nguoi_dung(id) on delete set null,
  trang_thai      text not null default 'dang_chay'
                  check (trang_thai in ('dang_chuan_bi','dang_chay','ket_thuc')),
  tao_luc         timestamptz not null default now(),
  constraint cong_viec_nhom_khoang_hop_le check (
    ngay_bat_dau is null or ngay_ket_thuc is null or ngay_ket_thuc >= ngay_bat_dau
  )
);

-- ---------------------------------------------------------------- mau viec dinh ky (lap di lap lai)
create table if not exists cong_viec_mau_dinh_ky (
  id               uuid primary key default gen_random_uuid(),
  ten              text not null,
  mo_ta            text,
  nguoi_giao       uuid references nguoi_dung(id) on delete set null,
  nhan_vien_id     uuid not null references nhan_vien(id) on delete cascade,
  -- Nguon cua cac viec duoc sinh ra tu mau nay (chot luc tao mau, theo nguoi tao).
  nguon            text not null default 'truong_phong'
                   check (nguon in ('giam_doc','truong_phong','lien_phong')),
  quy_tac          text not null
                   check (quy_tac in ('hang_ngay','hang_tuan','hang_thang','khoang_ngay')),
  -- hang_tuan: cac thu trong tuan (0=CN, 1=T2 ... 6=T7). hang_thang: cac ngay trong thang.
  cac_thu          smallint[] not null default '{1,2,3,4,5}',
  ngay_trong_thang int[] not null default '{1}',
  -- khoang_ngay: moi N ngay mot lan.
  so_ngay          int,
  gio_han          time not null default '18:00',
  bat_dau          date not null default current_date,
  ket_thuc         date,
  uu_tien          text not null default 'thuong'
                   check (uu_tien in ('thap','thuong','cao','khan')),
  dang_bat         boolean not null default true,
  -- Moc da sinh: lich chay sinh cac ngay lap tu sau ngay nay tro di.
  sinh_den         date not null default current_date,
  tao_luc          timestamptz not null default now(),
  constraint cong_viec_mau_khoang_hop_le check (
    (quy_tac <> 'khoang_ngay' or (so_ngay is not null and so_ngay >= 1))
    and (ket_thuc is null or ket_thuc >= bat_dau)
  )
);

-- ---------------------------------------------------------------- workflow he thong (su kien -> viec)
create table if not exists cong_viec_workflow (
  id               uuid primary key default gen_random_uuid(),
  -- Ma su kien co dinh trong code (xem viec/workflow.ts): may_mat_ket_noi,
  -- don_cho_duyet_qua_han, hop_dong_sap_het_han.
  ma               text not null unique,
  dang_bat         boolean not null default true,
  -- 'co_dinh': giao cho dung nguoi khai o nhan_vien_id.
  -- 'truong_phong_lien_quan': giao cho truong phong cua phong ban lien quan su kien.
  nguoi_nhan_kieu  text not null default 'co_dinh'
                   check (nguoi_nhan_kieu in ('co_dinh','truong_phong_lien_quan')),
  nhan_vien_id     uuid references nhan_vien(id) on delete set null,
  -- Deadline tinh tu luc su kien xay ra (gio).
  han_sau_gio      float8 not null default 4 check (han_sau_gio >= 0),
  uu_tien          text not null default 'cao'
                   check (uu_tien in ('thap','thuong','cao','khan')),
  ghi_chu          text,
  tao_luc          timestamptz not null default now(),
  constraint cong_viec_workflow_hop_le check (
    nguoi_nhan_kieu = 'truong_phong_lien_quan' or nhan_vien_id is not null
  )
);

-- ---------------------------------------------------------------- checklist con cua mot viec
create table if not exists cong_viec_hanh_dong (
  id              uuid primary key default gen_random_uuid(),
  cong_viec_id    uuid not null references cong_viec(id) on delete cascade,
  ten             text not null,
  xong            boolean not null default false,
  xong_luc        timestamptz,
  thu_tu          int not null default 0,
  tao_luc         timestamptz not null default now()
);
create index if not exists cong_viec_hanh_dong_viec_idx
  on cong_viec_hanh_dong(cong_viec_id, thu_tu);

-- ---------------------------------------------------------------- mo rong bang cong_viec
alter table cong_viec
  add column if not exists nguon           text not null default 'ho_so'
                  check (nguon in ('ho_so','giam_doc','he_thong','truong_phong',
                                   'lien_phong','tu_tao')),
  add column if not exists han_gio         time not null default '18:00',
  -- Moc het han tuyet doi (han + han_gio theo mui gio may cham cong). Backend tinh khi
  -- ghi du lieu; null voi viec cu khong co gio han. Lich chay quet han theo cot nay.
  add column if not exists han_moc         timestamptz,
  add column if not exists bat_dau         timestamptz,
  add column if not exists nhom_id         uuid references cong_viec_nhom(id) on delete set null,
  add column if not exists mau_dinh_ky_id  uuid references cong_viec_mau_dinh_ky(id) on delete set null,
  add column if not exists phan_hoi        text,
  add column if not exists ly_do_huy       text,
  add column if not exists nop_luc         timestamptz,
  add column if not exists duyet_boi       uuid references nguoi_dung(id) on delete set null,
  -- Chong trung khi workflow sinh viec (vd 'may_mat_ket_noi:<serial>:<ngay>'). Null
  -- duoc phep trung — chi cac dong module moi moi dat khoa.
  add column if not exists khoa_chong_trung text;

create unique index if not exists cong_viec_khoa_chong_trung_idx
  on cong_viec(khoa_chong_trung) where khoa_chong_trung is not null;

-- Them trang thai 'khong_hoan_thanh': viec khong nop khi het han thi lich chay tu chuyen.
alter table cong_viec drop constraint if exists cong_viec_trang_thai_check;
alter table cong_viec
  add constraint cong_viec_trang_thai_check check (
    trang_thai in ('moi','dang_lam','cho_duyet','hoan_thanh','khong_hoan_thanh','huy')
  );

-- Lich chay quet qua han: chi cham nhung dong con moi/dang_lam va co han_moc.
create index if not exists cong_viec_han_moc_idx
  on cong_viec(han_moc) where han_moc is not null and trang_thai in ('moi','dang_lam');
create index if not exists cong_viec_nhom_idx on cong_viec(nhom_id);
create index if not exists cong_viec_nguoi_giao_idx on cong_viec(giao_boi);
create index if not exists cong_viec_mau_idx on cong_viec(mau_dinh_ky_id);
