-- Ho so nhan su: hop dong, bien ban thoa thuan, luong, cong viec, bao cao, khieu nai,
-- thiet bi cap phat. Cong voi mot bang tep dinh kem dung chung.
--
-- Rang buoc nghiep vu dat o TANG CSDL chu khong chi o tang ung dung: du lieu nay song
-- lau hon ma nguon, va con duong nhap lieu khong chi co mot (API, di tru, sua tay khi
-- xu ly su co). Mot hop dong "khong xac dinh thoi han" ma lai co ngay het han la mau
-- thuan phap ly, khong phai chuyen de ung dung tu nho.

-- ---------------------------------------------------------------- hop dong lao dong
create table if not exists hop_dong_lao_dong (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  so_hd           text,
  loai            text not null default 'xac_dinh'
                  check (loai in ('thu_viec','xac_dinh','khong_xac_dinh','thoi_vu','cong_tac_vien','hoc_viec')),
  chuc_danh       text,
  noi_lam_viec    text,
  ngay_ky         date,
  hieu_luc_tu     date not null,
  -- null = khong xac dinh thoi han.
  hieu_luc_den    date,
  luong_co_ban    numeric(14,2) check (luong_co_ban is null or luong_co_ban >= 0),
  trang_thai      text not null default 'hieu_luc'
                  check (trang_thai in ('nhap','hieu_luc','het_han','da_thanh_ly','da_huy')),
  ghi_chu         text,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now(),

  constraint hop_dong_thoi_han_hop_le
    check (hieu_luc_den is null or hieu_luc_den >= hieu_luc_tu),
  -- BLLD 2019 Dieu 20: hop dong khong xac dinh thoi han la loai KHONG an dinh thoi diem
  -- ket thuc. Ghi ngay het han vao day la tu mau thuan.
  constraint hop_dong_khong_xac_dinh_thi_vo_han
    check (loai <> 'khong_xac_dinh' or hieu_luc_den is null)
);
create index if not exists hop_dong_nhan_vien_idx on hop_dong_lao_dong(nhan_vien_id, hieu_luc_tu desc);

-- ---------------------------------------------------------------- bien ban / thoa thuan
create table if not exists bien_ban_thoa_thuan (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  -- Phu luc gan voi mot hop dong cu the; bien ban roi thi de trong.
  hop_dong_id     uuid references hop_dong_lao_dong(id) on delete set null,
  loai            text not null default 'thoa_thuan'
                  check (loai in ('phu_luc','thoa_thuan','cam_ket','ky_luat','khen_thuong','bien_ban_hop','ban_giao','khac')),
  tieu_de         text not null,
  ngay_ky         date,
  hieu_luc_tu     date,
  noi_dung        text,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now()
);
create index if not exists bien_ban_nhan_vien_idx on bien_ban_thoa_thuan(nhan_vien_id, ngay_ky desc);

-- ---------------------------------------------------------------- quyet dinh luong
-- Day la MUC LUONG THEO HOP DONG / quyet dinh, khong phai bang luong hang thang.
-- Bang luong thuc tra do ERP tinh (xem cot nhan_vien.ma_erp).
create table if not exists quyet_dinh_luong (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  hieu_luc_tu     date not null,
  luong_co_ban    numeric(14,2) not null check (luong_co_ban >= 0),
  phu_cap         numeric(14,2) not null default 0 check (phu_cap >= 0),
  hinh_thuc       text not null default 'thang'
                  check (hinh_thuc in ('thang','ngay','gio','san_pham','khoan')),
  so_quyet_dinh   text,
  ly_do           text,
  ghi_chu         text,
  tao_boi         uuid references nguoi_dung(id) on delete set null,
  tao_luc         timestamptz not null default now(),

  -- Mot ngay hieu luc chi duoc co mot muc luong. Hai dong cung ngay thi khong ai biet
  -- dong nao dang ap dung.
  constraint quyet_dinh_luong_mot_moc unique (nhan_vien_id, hieu_luc_tu)
);
create index if not exists quyet_dinh_luong_nhan_vien_idx
  on quyet_dinh_luong(nhan_vien_id, hieu_luc_tu desc);

-- ---------------------------------------------------------------- cong viec (task)
create table if not exists cong_viec (
  id              uuid primary key default gen_random_uuid(),
  -- Nguoi duoc giao viec.
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  tieu_de         text not null,
  mo_ta           text,
  giao_boi        uuid references nguoi_dung(id) on delete set null,
  han             date,
  uu_tien         text not null default 'thuong'
                  check (uu_tien in ('thap','thuong','cao','khan')),
  trang_thai      text not null default 'moi'
                  check (trang_thai in ('moi','dang_lam','cho_duyet','hoan_thanh','huy')),
  ket_qua         text,
  hoan_thanh_luc  timestamptz,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now()
);
create index if not exists cong_viec_nhan_vien_idx on cong_viec(nhan_vien_id, trang_thai, han);

-- ---------------------------------------------------------------- bao cao
create table if not exists bao_cao (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  ky              text not null default 'tuan'
                  check (ky in ('ngay','tuan','thang','quy','nam','dot_xuat')),
  ky_tu           date,
  ky_den          date,
  tieu_de         text not null,
  noi_dung        text,
  trang_thai      text not null default 'da_nop'
                  check (trang_thai in ('nhap','da_nop','da_xem','can_bo_sung')),
  phan_hoi        text,
  nguoi_xem       uuid references nguoi_dung(id) on delete set null,
  xem_luc         timestamptz,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now(),

  constraint bao_cao_ky_hop_le
    check (ky_tu is null or ky_den is null or ky_den >= ky_tu)
);
create index if not exists bao_cao_nhan_vien_idx on bao_cao(nhan_vien_id, ky_tu desc);

-- ---------------------------------------------------------------- khieu nai
-- CHI nhan su va admin duoc doc bang nay. Truong phong KHONG — khieu nai rat thuong
-- nham vao chinh nguoi quan ly truc tiep, cho ho doc duoc thi khong ai dam gui.
-- Quy tac do cuong che o tang ung dung (xem bao_mat/quyen_ho_so.ts).
create table if not exists khieu_nai (
  id              uuid primary key default gen_random_uuid(),
  -- Nguoi gui khieu nai.
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  tieu_de         text not null,
  noi_dung        text not null,
  loai            text not null default 'khac'
                  check (loai in ('luong_thuong','cham_cong','che_do','moi_truong','quan_ly','quay_roi','an_toan','khac')),
  muc_do          text not null default 'thuong'
                  check (muc_do in ('thap','thuong','cao','khan')),
  trang_thai      text not null default 'moi'
                  check (trang_thai in ('moi','dang_xu_ly','da_giai_quyet','tu_choi','dong')),
  nguoi_xu_ly     uuid references nguoi_dung(id) on delete set null,
  phan_hoi        text,
  giai_quyet_luc  timestamptz,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now()
);
create index if not exists khieu_nai_nhan_vien_idx on khieu_nai(nhan_vien_id, tao_luc desc);
create index if not exists khieu_nai_trang_thai_idx on khieu_nai(trang_thai, tao_luc desc);

-- ---------------------------------------------------------------- thiet bi cap phat
-- Khac hoan toan bang `thiet_bi` (may cham cong ZKTeco). Day la tai san cap cho nguoi:
-- laptop, dien thoai, SIM, the tu...
create table if not exists thiet_bi_cap_phat (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  loai            text not null default 'khac'
                  check (loai in ('laptop','may_ban','man_hinh','dien_thoai','may_tinh_bang','sim','the_tu','xe','dong_phuc','cong_cu','khac')),
  ten             text not null,
  hang            text,
  model           text,
  so_seri         text,
  dia_chi_mac     text,
  -- Kieu inet de Postgres tu chan dia chi khong hop le, thay vi luu text tuy y.
  dia_chi_ip      inet,
  ngay_cap        date,
  ngay_thu_hoi    date,
  tinh_trang      text not null default 'dang_dung'
                  check (tinh_trang in ('dang_dung','da_thu_hoi','bao_hong','mat','dang_sua')),
  gia_tri         numeric(14,2) check (gia_tri is null or gia_tri >= 0),
  ghi_chu         text,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now(),

  constraint thiet_bi_cap_phat_ngay_hop_le
    check (ngay_thu_hoi is null or ngay_cap is null or ngay_thu_hoi >= ngay_cap)
);
create index if not exists thiet_bi_cap_phat_nhan_vien_idx on thiet_bi_cap_phat(nhan_vien_id, tinh_trang);

-- Hai may DANG DUNG khong the cung mot dia chi IP tinh. Trung IP la loi that trong mang
-- chu khong phai chuyen ghi chep, nen chan tu day. Da thu hoi roi thi cap lai duoc.
create unique index if not exists thiet_bi_cap_phat_ip_dang_dung_idx
  on thiet_bi_cap_phat(dia_chi_ip)
  where dia_chi_ip is not null and tinh_trang = 'dang_dung';

-- ---------------------------------------------------------------- tep dinh kem
-- Dung chung cho ca bay nhom. Tep nam tren dia, bang nay chi giu sieu du lieu.
create table if not exists ho_so_tep (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  -- Thuoc nhom nao, va (tuy chon) thuoc ban ghi nao trong nhom do.
  nhom            text not null
                  check (nhom in ('hop_dong','bien_ban','luong','cong_viec','bao_cao','khieu_nai','thiet_bi','khac')),
  thuoc_id        uuid,
  -- Ten nguoi dung thay; KHONG bao gio dung de mo tep tren dia.
  ten_goc         text not null,
  -- Ten do may chu sinh, la thu duy nhat dung de doc tep.
  ten_luu         text not null unique,
  kieu_mime       text not null,
  kich_thuoc      int not null check (kich_thuoc > 0),
  tai_len_boi     uuid references nguoi_dung(id) on delete set null,
  tao_luc         timestamptz not null default now()
);
create index if not exists ho_so_tep_nhan_vien_idx on ho_so_tep(nhan_vien_id, nhom, tao_luc desc);
create index if not exists ho_so_tep_thuoc_idx on ho_so_tep(thuoc_id) where thuoc_id is not null;
