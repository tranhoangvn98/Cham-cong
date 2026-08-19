-- Module KPI: danh muc chi so + tu lay du lieu tinh diem theo thang.
--
-- Nguon du lieu (theo lua chon cua chu doanh nghiep): cham cong, vi pham, cong viec,
-- bao cao. Moi chi so khai RO lay so tu dau, de nguoi bi cham diem doi chieu duoc.
--
-- Diem KPI KHONG dong vao bang luong. BLLD 2019 Dieu 127 cam cat luong thay ky luat;
-- muon gan KPI voi thu nhap thi phai la quy che THUONG rieng, do nguoi quyet dinh, va
-- di qua o "thuong" trong phieu luong — khong phai mot phep nhan tu dong o day.

-- ---------------------------------------------------------------- danh muc chi so
create table if not exists danh_muc_kpi (
  id              uuid primary key default gen_random_uuid(),
  ma              text not null unique,
  ten             text not null,
  mo_ta           text,
  nhom            text not null default 'khac'
                  check (nhom in ('cham_cong','ky_luat','cong_viec','bao_cao','khac')),

  -- Lay so o dau. 'nhap_tay' = quan ly tu cham, he thong khong tu tinh.
  nguon           text not null check (nguon in ('cham_cong','vi_pham','cong_viec','bao_cao','nhap_tay')),
  -- Chi so cu the trong nguon do. Danh sach dong: khong bao gio noi chuoi vao SQL.
  chi_so          text check (chi_so is null or chi_so in (
                    'ty_le_du_cong','so_ngay_co_mat','so_ngay_vang','so_lan_di_muon',
                    'tong_phut_muon','so_lan_ve_som','gio_ot','so_ngay_nghi_phep',
                    'so_vi_pham','diem_tru_vi_pham',
                    'so_cong_viec_hoan_thanh','so_cong_viec_dung_han','ty_le_dung_han',
                    'so_bao_cao_da_nop')),

  -- cao_tot: gia tri cang cao cang tot (vd ty le du cong).
  -- thap_tot: cang thap cang tot (vd so lan di muon).
  chieu           text not null default 'cao_tot' check (chieu in ('cao_tot','thap_tot')),
  don_vi          text,

  -- Cham diem tuyen tinh giua hai moc: dat muc_toi_thieu = 0 diem, dat muc_muc_tieu =
  -- diem_toi_da. Ngoai khoang thi kep lai. Don gian, giai thich duoc cho nguoi bi cham.
  muc_toi_thieu   numeric(12,2) not null default 0,
  muc_muc_tieu    numeric(12,2) not null default 100,
  diem_toi_da     numeric(6,2) not null default 100 check (diem_toi_da > 0),
  -- Trong so khi gop thanh tong diem. Tong trong so khong bat buoc bang 1 — he thong
  -- chuan hoa theo tong thuc te de them/bot chi so khong lam vo thang diem cu.
  trong_so        numeric(6,2) not null default 1 check (trong_so >= 0),

  ap_dung_phong_ban uuid references phong_ban(id) on delete cascade,
  dang_bat        boolean not null default true,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now(),

  constraint kpi_hai_moc_khac_nhau check (muc_muc_tieu <> muc_toi_thieu),
  -- Chi so tu dong BAT BUOC khai `chi_so`; nhap tay thi khong duoc khai.
  constraint kpi_nguon_khop_chi_so check (
    (nguon = 'nhap_tay' and chi_so is null) or (nguon <> 'nhap_tay' and chi_so is not null)
  )
);

-- ---------------------------------------------------------------- ky KPI
create table if not exists ky_kpi (
  id              uuid primary key default gen_random_uuid(),
  thang           text not null unique check (thang ~ '^\d{4}-\d{2}$'),
  trang_thai      text not null default 'nhap' check (trang_thai in ('nhap','da_chot')),
  tinh_luc        timestamptz,
  chot_luc        timestamptz,
  nguoi_chot      uuid references nguoi_dung(id) on delete set null,
  ghi_chu         text,
  tao_luc         timestamptz not null default now()
);

-- ---------------------------------------------------------------- ket qua tung chi so
create table if not exists ket_qua_kpi (
  id              uuid primary key default gen_random_uuid(),
  ky_kpi_id       uuid not null references ky_kpi(id) on delete cascade,
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  danh_muc_kpi_id uuid not null references danh_muc_kpi(id) on delete cascade,

  -- Gia tri THO lay tu nguon (vd 3 lan di muon). Giu lai de nguoi bi cham doi chieu duoc
  -- voi du lieu goc, chu khong chi thay mot con diem tu tren troi roi xuong.
  gia_tri         numeric(12,2),
  diem            numeric(6,2) not null default 0,
  -- Quan ly ghi de diem may tinh. Giu ca hai de con biet ai doi va doi bao nhieu.
  diem_sua_tay    numeric(6,2),
  ly_do_sua       text,
  sua_boi         uuid references nguoi_dung(id) on delete set null,
  sua_luc         timestamptz,
  tinh_luc        timestamptz not null default now(),

  unique (ky_kpi_id, nhan_vien_id, danh_muc_kpi_id)
);
create index if not exists ket_qua_kpi_nhan_vien_idx on ket_qua_kpi(nhan_vien_id);

-- ---------------------------------------------------------------- tong hop moi nguoi
create table if not exists tong_hop_kpi (
  id              uuid primary key default gen_random_uuid(),
  ky_kpi_id       uuid not null references ky_kpi(id) on delete cascade,
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  tong_diem       numeric(6,2) not null default 0,
  xep_loai        text,
  ghi_chu         text,
  tinh_luc        timestamptz not null default now(),
  unique (ky_kpi_id, nhan_vien_id)
);

-- ---------------------------------------------------------------- thang xep loai
create table if not exists thang_xep_loai_kpi (
  id              uuid primary key default gen_random_uuid(),
  ten             text not null,
  tu_diem         numeric(6,2) not null,
  dang_bat        boolean not null default true,
  unique (tu_diem)
);

insert into thang_xep_loai_kpi (ten, tu_diem)
select * from (values
  ('Xuất sắc', 90::numeric), ('Tốt', 75::numeric), ('Đạt', 60::numeric),
  ('Cần cải thiện', 40::numeric), ('Không đạt', 0::numeric)
) as t(ten, tu_diem)
where not exists (select 1 from thang_xep_loai_kpi);

-- ---------------------------------------------------------------- chi so mac dinh
-- Bo khoi dau chi tu CHAM CONG va VI PHAM — hai nguon chac chan co du lieu ngay. Chi so
-- cong viec/bao cao de san trong danh muc nhung TAT, vi chung chi dung neu nhan vien
-- thuc su dung hai muc do; bat san se cham diem 0 cho ca cong ty mot cach oan uong.
insert into danh_muc_kpi (
  ma, ten, mo_ta, nhom, nguon, chi_so, chieu, don_vi,
  muc_toi_thieu, muc_muc_tieu, diem_toi_da, trong_so, dang_bat
)
select * from (values
  ('DU_CONG', 'Tỷ lệ đủ công', 'Ngày công thực chia ngày công chuẩn của tháng.',
   'cham_cong', 'cham_cong', 'ty_le_du_cong', 'cao_tot', '%',
   80::numeric, 100::numeric, 100::numeric, 3::numeric, true),
  ('DI_MUON', 'Số lần đi muộn', 'Càng ít càng tốt. 0 lần đạt điểm tối đa.',
   'cham_cong', 'cham_cong', 'so_lan_di_muon', 'thap_tot', 'lần',
   5::numeric, 0::numeric, 100::numeric, 2::numeric, true),
  ('VANG', 'Số ngày vắng', 'Vắng không có đơn nghỉ được duyệt.',
   'cham_cong', 'cham_cong', 'so_ngay_vang', 'thap_tot', 'ngày',
   3::numeric, 0::numeric, 100::numeric, 2::numeric, true),
  ('KY_LUAT', 'Điểm trừ vi phạm', 'Tổng điểm trừ của các vi phạm đã xác nhận trong tháng.',
   'ky_luat', 'vi_pham', 'diem_tru_vi_pham', 'thap_tot', 'điểm',
   30::numeric, 0::numeric, 100::numeric, 3::numeric, true),
  ('CV_DUNG_HAN', 'Tỷ lệ công việc đúng hạn', 'Chỉ có ý nghĩa nếu công ty dùng mục Công việc.',
   'cong_viec', 'cong_viec', 'ty_le_dung_han', 'cao_tot', '%',
   50::numeric, 100::numeric, 100::numeric, 2::numeric, false),
  ('BAO_CAO', 'Số báo cáo đã nộp', 'Chỉ có ý nghĩa nếu công ty dùng mục Báo cáo.',
   'bao_cao', 'bao_cao', 'so_bao_cao_da_nop', 'cao_tot', 'báo cáo',
   0::numeric, 4::numeric, 100::numeric, 1::numeric, false)
) as t(ma, ten, mo_ta, nhom, nguon, chi_so, chieu, don_vi,
       muc_toi_thieu, muc_muc_tieu, diem_toi_da, trong_so, dang_bat)
where not exists (select 1 from danh_muc_kpi);
