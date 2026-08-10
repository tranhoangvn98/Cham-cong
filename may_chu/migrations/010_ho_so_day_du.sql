-- Bo sung ho so nhan su cho du checklist HCNS-BHXH: thong tin ca nhan, danh muc tai lieu
-- bat buoc, nguoi phu thuoc, va cac su kien BHXH.
--
-- Tach `ho_so_ca_nhan` ra khoi `nhan_vien` khong phai vi chuan hoa cho dep, ma vi PHAN
-- QUYEN: CCCD, ma so thue, so BHXH la du lieu ca nhan theo Nghi dinh 13/2023/ND-CP. De
-- chung bang nhan_vien thi moi truy van nhan vien (danh sach, bang cong, log quet...) deu
-- keo theo chung, va som muon lo ra mot cho nao do. De rieng bang thi chi duong nao co
-- chu dinh moi cham toi.

-- ---------------------------------------------------------------- nhom B: qua trinh
alter table nhan_vien
  add column if not exists chuc_danh       text,
  add column if not exists nguoi_quan_ly_id uuid references nhan_vien(id) on delete set null,
  -- Ngay het thu viec. Khac ngay_vao: thu viec toi da 60 ngay (BLLD 2019 Dieu 25).
  add column if not exists ngay_chinh_thuc date;

create index if not exists nhan_vien_quan_ly_idx on nhan_vien(nguoi_quan_ly_id);

-- ---------------------------------------------------------------- nhom A + C + E: thong tin ca nhan
create table if not exists ho_so_ca_nhan (
  nhan_vien_id      uuid primary key references nhan_vien(id) on delete cascade,

  -- --- Can cuoc (nhom A) ---
  cccd_so           text,
  cccd_ngay_cap     date,
  cccd_noi_cap      text,
  ngay_sinh         date,
  gioi_tinh         text check (gioi_tinh is null or gioi_tinh in ('nam','nu','khac')),
  noi_sinh          text,
  dan_toc           text,
  quoc_tich         text default 'Việt Nam',
  tinh_trang_hon_nhan text check (tinh_trang_hon_nhan is null
                       or tinh_trang_hon_nhan in ('doc_than','da_ket_hon','khac')),

  -- --- Lien he (nhom A) ---
  dia_chi_thuong_tru text,
  dia_chi_hien_tai   text,
  lien_he_khan_ten   text,
  lien_he_khan_quan_he text,
  lien_he_khan_sdt   text,

  -- --- Thue va ngan hang (nhom C) ---
  ma_so_thue        text,
  ngan_hang         text,
  so_tai_khoan      text,

  -- --- Bao hiem (nhom E) ---
  so_bhxh           text,
  so_the_bhyt       text,
  co_quan_bhxh      text,
  noi_kham_chua_benh text,

  -- --- Suc khoe (nhom A) ---
  kham_suc_khoe_ngay date,
  kham_suc_khoe_noi  text,
  kham_suc_khoe_ket_luan text,

  cap_nhat_luc      timestamptz not null default now(),
  cap_nhat_boi      uuid references nguoi_dung(id) on delete set null
);

-- Mot so CCCD / ma so thue / so BHXH chi thuoc ve mot nguoi. Trung nhau gan nhu chac chan
-- la nhap nham, va nham o day thi bao hiem va thue deu sai theo.
create unique index if not exists ho_so_cccd_idx    on ho_so_ca_nhan(cccd_so)   where cccd_so is not null;
create unique index if not exists ho_so_mst_idx     on ho_so_ca_nhan(ma_so_thue) where ma_so_thue is not null;
create unique index if not exists ho_so_so_bhxh_idx on ho_so_ca_nhan(so_bhxh)    where so_bhxh is not null;

-- ---------------------------------------------------------------- nhom A: danh muc tai lieu
-- Danh sach tai lieu MOT nhan vien phai co. Dat thanh bang chu khong hard-code trong ma
-- nguon: HCNS con them bot theo quy dinh moi, va ho phai tu sua duoc.
create table if not exists danh_muc_tai_lieu (
  id              uuid primary key default gen_random_uuid(),
  ma              text not null unique,
  ten             text not null,
  nhom            text not null default 'A' check (nhom in ('A','B','C','D','E','F','G')),
  mo_ta           text,
  bat_buoc        boolean not null default false,
  -- Tai lieu chi phat sinh khi nghi viec (vd Quyet dinh nghi viec). Voi nguoi dang lam,
  -- thieu no KHONG tinh la thieu — neu khong bang tien do luc nao cung do.
  chi_khi_nghi_viec boolean not null default false,
  thu_tu          int not null default 100,
  dang_dung       boolean not null default true
);

-- ---------------------------------------------------------------- nhom A: tai lieu tung nguoi
create table if not exists tai_lieu_nhan_vien (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  danh_muc_id     uuid not null references danh_muc_tai_lieu(id) on delete cascade,
  -- Ba muc theo dung checklist goc cua HCNS: co du lieu -> da scan -> da len phan mem.
  trang_thai      text not null default 'thieu'
                  check (trang_thai in ('thieu','da_co_du_lieu','da_so_hoa','da_len_phan_mem')),
  tep_id          uuid references ho_so_tep(id) on delete set null,
  nguoi_phu_trach text,
  han_hoan_thanh  date,
  ghi_chu         text,
  cap_nhat_luc    timestamptz not null default now(),

  constraint tai_lieu_mot_dong unique (nhan_vien_id, danh_muc_id)
);
create index if not exists tai_lieu_nhan_vien_idx on tai_lieu_nhan_vien(nhan_vien_id);

-- ---------------------------------------------------------------- nhom C: nguoi phu thuoc
create table if not exists nguoi_phu_thuoc (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  ho_ten          text not null,
  quan_he         text not null default 'con'
                  check (quan_he in ('con','vo_chong','cha','me','anh_chi_em','khac')),
  ngay_sinh       date,
  ma_so_thue      text,
  so_cccd         text,
  -- Khoang thoi gian duoc tinh giam tru. De trong den_ngay = con hieu luc.
  tu_thang        date,
  den_thang       date,
  da_dang_ky      boolean not null default false,
  ghi_chu         text,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now(),

  constraint npt_khoang_hop_le check (den_thang is null or tu_thang is null or den_thang >= tu_thang)
);
create index if not exists nguoi_phu_thuoc_idx on nguoi_phu_thuoc(nhan_vien_id);

-- ---------------------------------------------------------------- nhom E: su kien BHXH
-- Bao tang, bao giam, dieu chinh muc dong, chot so. Luu dang BAN GHI THEO THOI GIAN chu
-- khong ghi de: co tranh chap voi co quan BHXH thi phai chung minh duoc tung moc.
create table if not exists bhxh_su_kien (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  loai            text not null
                  check (loai in ('bao_tang','bao_giam','dieu_chinh','chot_so','cap_the_bhyt',
                                  'om_dau','thai_san','duong_suc','tai_nan_lao_dong')),
  -- Thang ap dung, luu ngay dau thang cho de so sanh.
  thang           date not null,
  muc_dong        numeric(14,2) check (muc_dong is null or muc_dong >= 0),
  ty_le_phan_tram numeric(5,2) check (ty_le_phan_tram is null or ty_le_phan_tram between 0 and 100),
  so_ho_so        text,
  trang_thai      text not null default 'moi'
                  check (trang_thai in ('moi','da_nop','co_quan_duyet','tu_choi','hoan_thanh')),
  ngay_nop        date,
  ngay_ket_qua    date,
  ghi_chu         text,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now()
);
create index if not exists bhxh_su_kien_idx on bhxh_su_kien(nhan_vien_id, thang desc);

-- ---------------------------------------------------------------- nap danh muc theo checklist HCNS
-- Nhom A theo dung bang trong ke hoach HCNS-BHXH. `on conflict do nothing` de chay lai
-- di tru khong ghi de phan HCNS da tu sua.
insert into danh_muc_tai_lieu (ma, ten, nhom, mo_ta, bat_buoc, chi_khi_nghi_viec, thu_tu) values
  ('cccd',           'CCCD (scan 2 mặt)',            'A', 'Số, ngày cấp, nơi cấp, ngày sinh, giới tính', true,  false, 10),
  ('so_yeu_ly_lich', 'Sơ yếu lý lịch',               'A', 'Bản khai thông tin cá nhân',                  true,  false, 20),
  ('kham_suc_khoe',  'Giấy khám sức khỏe',           'A', 'Ngày khám, cơ sở, kết luận — theo dõi thời hạn', true, false, 30),
  ('bang_cap',       'Bằng cấp',                     'A', 'ĐH/CĐ/TC, scan công chứng nếu có',            true,  false, 40),
  ('hop_dong',       'Hợp đồng lao động',            'A', 'Xác định / không xác định thời hạn',          true,  false, 50),
  ('chung_chi',      'Chứng chỉ',                    'A', 'Ngoại ngữ, tin học, chuyên môn',              false, false, 60),
  ('phu_luc_hd',     'Phụ lục HĐLĐ',                 'A', 'Thay đổi lương / chức danh',                  false, false, 70),
  ('qd_tiep_nhan',   'Quyết định tiếp nhận',         'A', 'Nhận việc / bổ nhiệm',                        false, false, 80),
  ('qd_dieu_chuyen', 'Quyết định điều chuyển',       'A', 'Điều chuyển phòng ban / chức vụ',             false, false, 90),
  ('qd_tang_luong',  'Quyết định tăng lương',        'A', 'Điều chỉnh lương',                            false, false, 100),
  ('qd_nghi_viec',   'Quyết định nghỉ việc',         'A', 'Chấm dứt HĐLĐ',                               true,  true,  110),
  -- Nhom F: ban giao. Bien ban ban giao khi nhan viec va checklist khi nghi viec.
  ('bien_ban_ban_giao', 'Biên bản bàn giao tài sản', 'F', 'Khi nhận việc / chuyển việc / nghỉ việc',     true,  false, 200),
  ('checklist_offboarding', 'Checklist bàn giao khi nghỉ việc', 'F', 'Bàn giao công việc, tài sản, hồ sơ', true, true, 210),
  -- Nhom E: ho so bao hiem.
  ('to_khai_bhxh',   'Tờ khai tham gia BHXH (TK1-TS)', 'E', 'Khi báo tăng lần đầu',                      true,  false, 300)
on conflict (ma) do nothing;
