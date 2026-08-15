-- Module C: bang luong tinh tu cham cong, co BHXH va thue TNCN.
--
-- Truoc ban nay he thong co du lieu cham cong va muc luong theo quyet dinh, nhung khong
-- noi hai thu do lai voi nhau — ke toan phai tu lam ngoai Excel.
--
-- NGUYEN TAC: moi tham so phap ly (ty le trich, tran dong, bac thue, giam tru gia canh)
-- deu la DU LIEU trong bang, KHONG phai hang so trong ma nguon. Luat thay doi gan nhu
-- hang nam; sua mot con so trong giao dien phai la du, khong duoc doi trien khai lai.

-- ---------------------------------------------------------------- tham so phap ly
-- Moi dong la mot bo tham so co HIEU LUC TU mot ngay. Tinh luong thang nao thi lay bo
-- co hieu_luc_tu lon nhat ma <= ngay dau thang do. Nho vay tinh lai luong thang cu van
-- ra dung so cu, du luat da doi.
create table if not exists tham_so_luong (
  id                    uuid primary key default gen_random_uuid(),
  hieu_luc_tu           date not null unique,
  ten                   text not null,

  -- Muc luong co so (dung cho tran dong BHXH/BHYT = 20 lan muc nay).
  luong_co_so           numeric(14,2) not null check (luong_co_so > 0),
  -- Luong toi thieu vung cua dia ban cong ty (tran dong BHTN = 20 lan muc nay).
  luong_toi_thieu_vung  numeric(14,2) not null check (luong_toi_thieu_vung > 0),
  vung                  smallint not null default 1 check (vung between 1 and 4),

  -- Ty le trich, don vi PHAN TRAM. Nguoi lao dong.
  ty_le_bhxh_nld        numeric(6,3) not null default 8    check (ty_le_bhxh_nld  >= 0),
  ty_le_bhyt_nld        numeric(6,3) not null default 1.5  check (ty_le_bhyt_nld  >= 0),
  ty_le_bhtn_nld        numeric(6,3) not null default 1    check (ty_le_bhtn_nld  >= 0),
  -- Nguoi su dung lao dong (khong tru vao luong, nhung phai bao cao va hach toan).
  ty_le_bhxh_nsdld      numeric(6,3) not null default 17.5 check (ty_le_bhxh_nsdld >= 0),
  ty_le_bhyt_nsdld      numeric(6,3) not null default 3    check (ty_le_bhyt_nsdld >= 0),
  ty_le_bhtn_nsdld      numeric(6,3) not null default 1    check (ty_le_bhtn_nsdld >= 0),

  -- Thue thu nhap ca nhan.
  giam_tru_ban_than     numeric(14,2) not null check (giam_tru_ban_than >= 0),
  giam_tru_phu_thuoc    numeric(14,2) not null check (giam_tru_phu_thuoc >= 0),

  -- Nguon phap ly de nguoi sau doi chieu duoc, khong phai tra lai tu dau.
  can_cu                text,
  ghi_chu               text,
  tao_luc               timestamptz not null default now(),
  cap_nhat_luc          timestamptz not null default now()
);

-- Bieu thue luy tien tung phan. Tach bang rieng vi so bac cung co the doi.
create table if not exists bac_thue_tncn (
  id              uuid primary key default gen_random_uuid(),
  tham_so_id      uuid not null references tham_so_luong(id) on delete cascade,
  bac             smallint not null check (bac > 0),
  -- Thu nhap tinh thue THANG, tu (khong bao gom) den (bao gom). den = null la bac cuoi.
  tu_muc          numeric(14,2) not null check (tu_muc >= 0),
  den_muc         numeric(14,2),
  thue_suat       numeric(6,3) not null check (thue_suat >= 0 and thue_suat <= 100),
  unique (tham_so_id, bac),
  constraint bac_thue_khoang_hop_le check (den_muc is null or den_muc > tu_muc)
);

-- ---------------------------------------------------------------- ky luong
create table if not exists ky_luong (
  id              uuid primary key default gen_random_uuid(),
  -- 'YYYY-MM'. Mot thang mot ky.
  thang           text not null unique check (thang ~ '^\d{4}-\d{2}$'),
  ten             text,
  tham_so_id      uuid references tham_so_luong(id) on delete restrict,
  -- nhap: dang tinh, sua duoc | cho_duyet: da gui, khoa sua | da_duyet: chot so
  -- | da_tra: da chi tien | huy: bo ky nay
  trang_thai      text not null default 'nhap'
                  check (trang_thai in ('nhap','cho_duyet','da_duyet','da_tra','huy')),
  nguoi_tao       uuid references nguoi_dung(id) on delete set null,
  nguoi_duyet     uuid references nguoi_dung(id) on delete set null,
  gui_duyet_luc   timestamptz,
  duyet_luc       timestamptz,
  tra_luc         timestamptz,
  ghi_chu_duyet   text,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now()
);

-- ---------------------------------------------------------------- phieu luong tung nguoi
create table if not exists phieu_luong (
  id                  uuid primary key default gen_random_uuid(),
  ky_luong_id         uuid not null references ky_luong(id) on delete cascade,
  nhan_vien_id        uuid not null references nhan_vien(id) on delete cascade,

  -- Can cu tinh, chup lai tai thoi diem tinh. Khong join lai luc xem: hop dong co the
  -- doi sau do, ma phieu luong da tra thi khong duoc phep tu doi so.
  luong_co_ban        numeric(14,2) not null default 0,
  phu_cap             numeric(14,2) not null default 0,
  so_ngay_cong_chuan  numeric(6,2)  not null default 0,
  so_ngay_cong_thuc   numeric(6,2)  not null default 0,
  phut_ot             int           not null default 0,
  he_so_ot            numeric(5,2)  not null default 1.5,

  -- Thu nhap
  luong_theo_cong     numeric(14,2) not null default 0,
  tien_ot             numeric(14,2) not null default 0,
  thuong              numeric(14,2) not null default 0,
  phu_cap_khac        numeric(14,2) not null default 0,
  tong_thu_nhap       numeric(14,2) not null default 0,

  -- Cac khoan tru cua NGUOI LAO DONG
  muc_dong_bh         numeric(14,2) not null default 0,
  bhxh_nld            numeric(14,2) not null default 0,
  bhyt_nld            numeric(14,2) not null default 0,
  bhtn_nld            numeric(14,2) not null default 0,
  -- Phan NGUOI SU DUNG LAO DONG dong (khong tru vao luong).
  bhxh_nsdld          numeric(14,2) not null default 0,
  bhyt_nsdld          numeric(14,2) not null default 0,
  bhtn_nsdld          numeric(14,2) not null default 0,

  -- Thue TNCN
  so_nguoi_phu_thuoc  smallint      not null default 0,
  giam_tru_tong       numeric(14,2) not null default 0,
  thu_nhap_tinh_thue  numeric(14,2) not null default 0,
  thue_tncn           numeric(14,2) not null default 0,

  -- Khoan tru khac (tam ung, cong doan...). KHONG dung cho phat tien: BLLD 2019 Dieu 127
  -- cam phat tien va cam tru luong thay cho ky luat lao dong.
  tru_khac            numeric(14,2) not null default 0,
  ly_do_tru_khac      text,

  tong_tru            numeric(14,2) not null default 0,
  thuc_linh           numeric(14,2) not null default 0,

  ghi_chu             text,
  -- Nguoi sua tay dong nay (thuong, tru khac). Null = hoan toan do may tinh.
  sua_boi             uuid references nguoi_dung(id) on delete set null,
  sua_luc             timestamptz,
  tinh_luc            timestamptz not null default now(),

  unique (ky_luong_id, nhan_vien_id)
);
create index if not exists phieu_luong_nhan_vien_idx on phieu_luong(nhan_vien_id);

-- ---------------------------------------------------------------- du lieu mac dinh
-- Tham so tai thoi diem viet ban nay. PHAI cho ke toan doi chieu lai truoc khi tra luong
-- that: muc giam tru gia canh va luong co so thay doi theo nghi quyet/nghi dinh moi.
insert into tham_so_luong (
  hieu_luc_tu, ten, luong_co_so, luong_toi_thieu_vung, vung,
  giam_tru_ban_than, giam_tru_phu_thuoc, can_cu
)
select
  date '2024-07-01',
  'Mức áp dụng từ 01/7/2024',
  2340000,   -- Nghi dinh 73/2024/ND-CP
  4960000,   -- Nghi dinh 74/2024/ND-CP, vung I
  1,
  11000000,  -- Nghi quyet 954/2020/UBTVQH14
  4400000,
  'NĐ 73/2024 (lương cơ sở), NĐ 74/2024 (lương tối thiểu vùng), NQ 954/2020 (giảm trừ gia cảnh). '
  || 'KẾ TOÁN PHẢI ĐỐI CHIẾU LẠI trước khi trả lương thật — các mức này thay đổi theo năm.'
where not exists (select 1 from tham_so_luong);

-- Bieu thue luy tien tung phan 7 bac (Luat Thue TNCN 2007, Dieu 22).
insert into bac_thue_tncn (tham_so_id, bac, tu_muc, den_muc, thue_suat)
select t.id, b.bac, b.tu_muc, b.den_muc, b.thue_suat
  from tham_so_luong t
 cross join (values
   (1::smallint,        0::numeric,  5000000::numeric,  5::numeric),
   (2::smallint,  5000000::numeric, 10000000::numeric, 10::numeric),
   (3::smallint, 10000000::numeric, 18000000::numeric, 15::numeric),
   (4::smallint, 18000000::numeric, 32000000::numeric, 20::numeric),
   (5::smallint, 32000000::numeric, 52000000::numeric, 25::numeric),
   (6::smallint, 52000000::numeric, 80000000::numeric, 30::numeric),
   (7::smallint, 80000000::numeric, null::numeric,     35::numeric)
 ) as b(bac, tu_muc, den_muc, thue_suat)
 where t.hieu_luc_tu = date '2024-07-01'
   and not exists (select 1 from bac_thue_tncn where tham_so_id = t.id);
