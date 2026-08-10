-- ============================================================================
-- 001 — Khoi tao cau truc du lieu he thong cham cong
--
-- Quy uoc: ten bang/cot bang tieng Viet KHONG dau (de nhan su ke toan doc truc
-- tiep khi truy van). Rieng thuat ngu giao thuc ADMS (PIN, Status, Verify,
-- WorkCode) giu nguyen y nghia goc, chi doi ten cot cho de doc.
--
-- gen_random_uuid() la ham loi tu PostgreSQL 13 — khong can extension pgcrypto.
-- ============================================================================

-- ---------------------------------------------------------------- phong ban
create table if not exists phong_ban (
  id              uuid primary key default gen_random_uuid(),
  ten             text not null unique,
  tao_luc         timestamptz not null default now()
);

-- ---------------------------------------------------------------- ca lam viec
create table if not exists ca_lam (
  id                  uuid primary key default gen_random_uuid(),
  ten                 text not null,
  gio_vao             time not null,
  gio_ra              time not null,
  nghi_tu             time,
  nghi_den            time,
  -- Dung sai den muon / ve som khong tinh phat (phut).
  dung_sai_muon_phut  int  not null default 5  check (dung_sai_muon_phut >= 0),
  dung_sai_som_phut   int  not null default 5  check (dung_sai_som_phut  >= 0),
  -- Lam qua nguong nay sau gio tan ca moi bat dau tinh OT (phut).
  nguong_ot_phut      int  not null default 30 check (nguong_ot_phut >= 0),
  -- Ca dem: gio_ra thuoc ngay hom sau (vd 22:00 -> 06:00).
  qua_dem             boolean not null default false,
  -- So phut cong toi thieu de tinh du 1 cong; duoi nua nguong nay tinh 0.5 cong.
  phut_du_cong        int  not null default 420 check (phut_du_cong > 0),
  -- Cac ngay trong tuan phai di lam, theo chuan JS: 0=CN, 1=T2, ... 6=T7.
  -- Mac dinh T2-T6. NHAN SU PHAI SUA theo che do lam viec that cua cong ty
  -- (vd lam ca sang T7 thi them 6).
  cac_ngay_lam        smallint[] not null default '{1,2,3,4,5}',
  dang_hoat_dong      boolean not null default true,
  tao_luc             timestamptz not null default now(),
  -- Khoang nghi phai hop le: hoac ca hai null, hoac nghi_den > nghi_tu.
  constraint ca_lam_khoang_nghi_hop_le check (
    (nghi_tu is null and nghi_den is null) or (nghi_tu is not null and nghi_den is not null and nghi_den > nghi_tu)
  )
);

-- ---------------------------------------------------------------- nhan vien
create table if not exists nhan_vien (
  id                          uuid primary key default gen_random_uuid(),
  ma_nv                       text not null unique,
  ho_ten                      text not null,
  -- PIN dang ky tren may ZKTeco. Day la khoa noi log may -> nhan vien.
  pin_may                     text unique,
  -- Ma nhan vien ben ERP (erp_logistic) de dong bo bang luong.
  ma_erp                      text,
  phong_ban_id                uuid references phong_ban(id) on delete set null,
  ca_lam_id                   uuid references ca_lam(id)    on delete set null,
  ngay_vao                    date,
  ngay_nghi_viec              date,
  so_dien_thoai               text,
  email                       text,
  -- Chi bat cho nguoi thuong xuyen di cong tac; mac dinh TAT de chong gian lan.
  duoc_cham_cong_dien_thoai   boolean not null default false,
  dang_hoat_dong              boolean not null default true,
  tao_luc                     timestamptz not null default now(),
  cap_nhat_luc                timestamptz not null default now()
);
create index if not exists nhan_vien_pin_idx      on nhan_vien(pin_may) where pin_may is not null;
create index if not exists nhan_vien_phong_ban_idx on nhan_vien(phong_ban_id);

-- Truong phong: gan sau khi co nhan_vien de tranh vong tham chieu khi tao bang.
alter table phong_ban
  add column if not exists truong_phong_id uuid references nhan_vien(id) on delete set null;

-- ---------------------------------------------------------------- tai khoan
create table if not exists nguoi_dung (
  id                    uuid primary key default gen_random_uuid(),
  ten_dang_nhap         text not null unique,
  mat_khau_hash         text not null,
  -- admin: toan quyen | nhan_su: quan tri cham cong | truong_phong: duyet don cua phong
  -- | nhan_vien: chi xem cua minh (dung cho app dien thoai)
  vai_tro               text not null check (vai_tro in ('admin','nhan_su','truong_phong','nhan_vien')),
  nhan_vien_id          uuid unique references nhan_vien(id) on delete set null,
  dang_hoat_dong        boolean not null default true,
  phai_doi_mat_khau     boolean not null default true,
  -- Chong do mat khau: dem so lan sai lien tiep va khoa tam thoi.
  so_lan_sai            int not null default 0,
  khoa_den              timestamptz,
  dang_nhap_cuoi        timestamptz,
  tao_luc               timestamptz not null default now(),
  -- Vai tro nhan_vien / truong_phong BAT BUOC gan voi mot nhan vien that.
  constraint nguoi_dung_phai_gan_nhan_vien check (
    vai_tro in ('admin','nhan_su') or nhan_vien_id is not null
  )
);

-- ---------------------------------------------------------------- may cham cong
create table if not exists thiet_bi (
  id                  uuid primary key default gen_random_uuid(),
  serial              text not null unique,
  ten                 text not null,
  vi_tri              text not null default 'Van phong',
  -- Whitelist: may khong co trong bang nay (hoac dang_bat = false) bi tra 401.
  dang_bat            boolean not null default true,
  phien_ban_firmware  text,
  dia_chi_ip          text,
  thay_lan_cuoi       timestamptz,
  tao_luc             timestamptz not null default now()
);

-- ---------------------------------------------------------------- dia diem (geofence)
create table if not exists dia_diem (
  id              uuid primary key default gen_random_uuid(),
  ten             text not null,
  vi_do           double precision not null check (vi_do  between -90  and 90),
  kinh_do         double precision not null check (kinh_do between -180 and 180),
  ban_kinh_m      int not null default 200 check (ban_kinh_m between 20 and 20000),
  dang_hoat_dong  boolean not null default true,
  tao_luc         timestamptz not null default now()
);

-- ---------------------------------------------------------------- lan quet (append-only)
-- Nguon su that de tinh cong. KHONG bao gio sua/xoa ban ghi da nhan tu may.
create table if not exists lan_quet (
  id                  uuid primary key default gen_random_uuid(),
  -- may: tu may ZKTeco | dien_thoai: app (GPS+selfie) | thu_cong: nhan su nhap tay
  nguon               text not null default 'may' check (nguon in ('may','dien_thoai','thu_cong')),
  thiet_bi_serial     text,
  pin_may             text,
  nhan_vien_id        uuid references nhan_vien(id) on delete set null,
  thoi_diem           timestamptz not null,
  -- Ma Status trong ATTLOG: 0 vao, 1 ra, 2 ra-nghi, 3 vao-nghi, 4 OT-vao, 5 OT-ra
  trang_thai          smallint not null default 0 check (trang_thai between 0 and 5),
  -- Ma Verify trong ATTLOG: 1 van tay, 4 the, 15 khuon mat, 25 long ban tay...
  xac_thuc            smallint not null default 9,
  ma_cong_viec        int not null default 0,
  -- Chong trung khi may gui lai cung mot ban ghi (rat hay xay ra voi ADMS).
  khoa_chong_trung    text not null unique,
  -- Chi co gia tri khi nguon = 'dien_thoai'
  vi_do               double precision,
  kinh_do             double precision,
  do_chinh_xac_m      real,
  dia_diem_id         uuid references dia_diem(id) on delete set null,
  khoang_cach_m       int,
  -- Ten tep anh selfie (KHONG phai duong dan). Anh phuc vu qua route co xac thuc.
  anh_ten_tep         text,
  -- tu_dong: may quet, tin ngay | cho_duyet: cho nhan su xac nhan | da_duyet | tu_choi
  trang_thai_duyet    text not null default 'tu_dong'
                      check (trang_thai_duyet in ('tu_dong','cho_duyet','da_duyet','tu_choi')),
  nguoi_duyet_id      uuid references nguoi_dung(id) on delete set null,
  duyet_luc           timestamptz,
  ghi_chu             text,
  ghi_nhan_luc        timestamptz not null default now()
);
create index if not exists lan_quet_nv_thoi_diem_idx on lan_quet(nhan_vien_id, thoi_diem desc);
create index if not exists lan_quet_thoi_diem_idx    on lan_quet(thoi_diem desc);
create index if not exists lan_quet_chua_map_idx     on lan_quet(pin_may) where nhan_vien_id is null;
create index if not exists lan_quet_cho_duyet_idx    on lan_quet(trang_thai_duyet) where trang_thai_duyet = 'cho_duyet';

-- ---------------------------------------------------------------- ngay le
create table if not exists ngay_le (
  ngay          date primary key,
  ten           text not null,
  huong_luong   boolean not null default true
);

-- ---------------------------------------------------------------- don nghi phep
create table if not exists don_nghi_phep (
  id                uuid primary key default gen_random_uuid(),
  nhan_vien_id      uuid not null references nhan_vien(id) on delete cascade,
  loai              text not null check (loai in ('phep_nam','khong_luong','om','thai_san','ket_hon','hieu')),
  tu_ngay           date not null,
  den_ngay          date not null,
  nua_ngay          boolean not null default false,
  ly_do             text,
  trang_thai        text not null default 'cho_duyet'
                    check (trang_thai in ('cho_duyet','da_duyet','tu_choi','da_huy')),
  nguoi_duyet_id    uuid references nguoi_dung(id) on delete set null,
  ghi_chu_duyet     text,
  tao_luc           timestamptz not null default now(),
  quyet_luc         timestamptz,
  constraint don_nghi_phep_khoang_ngay check (den_ngay >= tu_ngay),
  -- Nua ngay chi ap dung cho don 1 ngay.
  constraint don_nghi_phep_nua_ngay check (not nua_ngay or tu_ngay = den_ngay)
);
create index if not exists don_nghi_phep_nv_idx on don_nghi_phep(nhan_vien_id, tu_ngay desc);
create index if not exists don_nghi_phep_cho_duyet_idx on don_nghi_phep(trang_thai) where trang_thai = 'cho_duyet';

-- ---------------------------------------------------------------- don giai trinh (quen quet)
create table if not exists don_giai_trinh (
  id                  uuid primary key default gen_random_uuid(),
  nhan_vien_id        uuid not null references nhan_vien(id) on delete cascade,
  ngay                date not null,
  gio_vao_de_xuat     time,
  gio_ra_de_xuat      time,
  ly_do               text not null,
  trang_thai          text not null default 'cho_duyet'
                      check (trang_thai in ('cho_duyet','da_duyet','tu_choi','da_huy')),
  nguoi_duyet_id      uuid references nguoi_dung(id) on delete set null,
  ghi_chu_duyet       text,
  tao_luc             timestamptz not null default now(),
  quyet_luc           timestamptz,
  -- Phai de xuat it nhat mot moc gio, neu khong don vo nghia.
  constraint don_giai_trinh_co_gio check (gio_vao_de_xuat is not null or gio_ra_de_xuat is not null)
);
-- Moi nhan vien chi co 1 don giai trinh dang hieu luc cho mot ngay.
create unique index if not exists don_giai_trinh_duy_nhat_idx
  on don_giai_trinh(nhan_vien_id, ngay) where trang_thai in ('cho_duyet','da_duyet');

-- ---------------------------------------------------------------- bang cong ngay
create table if not exists bang_cong_ngay (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  ngay            date not null,
  ca_lam_id       uuid references ca_lam(id) on delete set null,
  trang_thai      text not null default 'vang'
                  check (trang_thai in ('vang','co_mat','nghi_phep','ngay_le','nghi_tuan')),
  gio_vao         timestamptz,
  gio_ra          timestamptz,
  phut_lam        int  not null default 0,
  phut_muon       int  not null default 0,
  phut_ve_som     int  not null default 0,
  phut_ot         int  not null default 0,
  so_cong         numeric(4,2) not null default 0,
  -- Danh dau ngay nay co du lieu chinh sua tay / giai trinh da duyet.
  co_dieu_chinh   boolean not null default false,
  ghi_chu         text,
  -- Da chot bang cong (khoa so luong): bo tinh cong bo qua, khong ghi de.
  da_chot         boolean not null default false,
  tinh_luc        timestamptz not null default now(),
  unique (nhan_vien_id, ngay)
);
create index if not exists bang_cong_ngay_ngay_idx on bang_cong_ngay(ngay);

-- ---------------------------------------------------------------- hang doi lenh xuong may
-- Ben vung trong DB (khong de in-memory) de khong mat lenh khi restart / scale nhieu instance.
create table if not exists lenh_thiet_bi (
  id                bigserial primary key,
  thiet_bi_serial   text not null,
  lenh              text not null,
  tao_luc           timestamptz not null default now(),
  gui_luc           timestamptz,
  ma_tra_ve         int,
  bao_luc           timestamptz
);
create index if not exists lenh_thiet_bi_cho_gui_idx
  on lenh_thiet_bi(thiet_bi_serial, id) where gui_luc is null;

-- ---------------------------------------------------------------- hop thu di (outbox)
-- Su kien dong bo sang ERP. Ghi cung transaction voi du lieu nghiep vu nen khong mat.
create table if not exists hop_thu_di (
  id            bigserial primary key,
  loai_su_kien  text not null,
  du_lieu       jsonb not null,
  tao_luc       timestamptz not null default now(),
  gui_luc       timestamptz,
  so_lan        int not null default 0,
  gui_lai_sau   timestamptz not null default now(),
  loi_cuoi      text
);
create index if not exists hop_thu_di_chua_gui_idx
  on hop_thu_di(gui_lai_sau, id) where gui_luc is null;

-- ---------------------------------------------------------------- token lam moi
create table if not exists token_lam_moi (
  id              uuid primary key default gen_random_uuid(),
  nguoi_dung_id   uuid not null references nguoi_dung(id) on delete cascade,
  -- Chi luu BAM cua token, khong luu token goc — lo DB khong the mao danh.
  token_hash      text not null unique,
  het_han         timestamptz not null,
  thu_hoi_luc     timestamptz,
  mo_ta_thiet_bi  text,
  tao_luc         timestamptz not null default now()
);
create index if not exists token_lam_moi_nd_idx on token_lam_moi(nguoi_dung_id);

-- ---------------------------------------------------------------- token push (Expo)
create table if not exists token_push (
  id              uuid primary key default gen_random_uuid(),
  nguoi_dung_id   uuid not null references nguoi_dung(id) on delete cascade,
  token           text not null unique,
  nen_tang        text not null default 'unknown',
  tao_luc         timestamptz not null default now()
);

-- ---------------------------------------------------------------- nhat ky thao tac
create table if not exists nhat_ky_thao_tac (
  id              bigserial primary key,
  nguoi_dung_id   uuid references nguoi_dung(id) on delete set null,
  hanh_dong       text not null,
  thuc_the        text,
  thuc_the_id     text,
  chi_tiet        jsonb,
  dia_chi_ip      text,
  luc             timestamptz not null default now()
);
create index if not exists nhat_ky_thao_tac_luc_idx on nhat_ky_thao_tac(luc desc);
