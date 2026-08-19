-- Module D: hop dong dien tu qua vContract (Viettel), va noi dung hop dong dang van ban.
--
-- Can cu: "Tai lieu dac ta API tich hop he thong hop dong dien tu vContract" v1.0.11.
--
-- Hai thu bang nay phai giu bang duoc, vi hop dong lao dong la chung cu phap ly:
--   1. Toan bo lich su trao doi voi vContract (goi di va callback nhan ve). Khi co tranh
--      chap ve "ai ky luc nao", cai duy nhat tra loi duoc la nhat ky, khong phai trang
--      thai hien tai.
--   2. Ban PDF da ky. vContract giu ban goc nhung dia chi tai co han; mat quyen truy cap
--      dich vu la mat hop dong neu khong tu giu mot ban.

-- ---------------------------------------------------------------- noi dung hop dong
-- Yeu cau "quet noi dung hop dong chuyen sang text de luu tru".
alter table hop_dong_lao_dong
  -- Noi dung da trich tu tep (DOCX/PDF chu) hoac OCR (ban scan). Dung de TIM KIEM va doi
  -- chieu, KHONG thay the ban goc: OCR co the doc sai, va ban co gia tri phap ly luon la
  -- tep goc trong ho_so_tep.
  add column if not exists noi_dung_text     text,
  add column if not exists trich_tu_tep_id   uuid references ho_so_tep(id) on delete set null,
  -- 'docx' | 'pdf_text' | 'ocr' | 'nhap_tay' — de nguoi doc biet do tin cay den dau.
  add column if not exists cach_trich        text,
  add column if not exists trich_luc         timestamptz,
  -- Nhac han: ghi lai da nhac nhung moc nao de khong nhac lai moi ngay.
  add column if not exists da_nhac_han       int[] not null default '{}';

comment on column hop_dong_lao_dong.noi_dung_text is
  'Noi dung da trich de tim kiem. Ban co gia tri phap ly la tep goc trong ho_so_tep.';

-- ---------------------------------------------------------------- ho so ky dien tu
create table if not exists hop_dong_dien_tu (
  id                  uuid primary key default gen_random_uuid(),
  hop_dong_id         uuid not null references hop_dong_lao_dong(id) on delete cascade,

  -- Ma ta sinh ra va gui sang vContract. requestCode gom nhieu contractCode, nhung o day
  -- moi hop dong lao dong la mot yeu cau rieng nen hai ma bang nhau — van tach hai cot vi
  -- giao thuc tach, va co the sau nay gui theo lo.
  request_code        text not null unique,
  contract_code       text not null unique,
  contract_type       text,
  contract_name       text,

  -- Trang thai ben vContract. null = chua gui.
  trang_thai          text check (trang_thai in ('DRAFT','PROCESSING','FINISHED','REJECTED','CANCEL')),
  -- Thong bao gan nhat (type/status trong callback) de hien "dang cho ai".
  loai_thong_bao      text,
  trang_thai_thong_bao text,
  ma_loi              text,
  mo_ta               text,

  -- Dia chi tai ban da ky do vContract cap. CO HAN — phai tai ve va luu vao ho_so_tep.
  url_tai_ve          text,
  tep_da_ky_id        uuid references ho_so_tep(id) on delete set null,
  tai_ve_luc          timestamptz,

  gui_luc             timestamptz,
  bat_dau_ky_luc      timestamptz,
  hoan_tat_luc        timestamptz,
  nguoi_gui           uuid references nguoi_dung(id) on delete set null,
  tao_luc             timestamptz not null default now(),
  cap_nhat_luc        timestamptz not null default now()
);
create index if not exists hop_dong_dien_tu_hop_dong_idx on hop_dong_dien_tu(hop_dong_id);
create index if not exists hop_dong_dien_tu_trang_thai_idx on hop_dong_dien_tu(trang_thai);

-- ---------------------------------------------------------------- nhat ky trao doi
-- Ghi CA hai chieu: ta goi vContract, va vContract goi callback ve ta.
create table if not exists nhat_ky_vcontract (
  id                  bigserial primary key,
  hop_dong_dien_tu_id uuid references hop_dong_dien_tu(id) on delete set null,
  -- 'goi_di' = ta goi sang vContract | 'nhan_ve' = vContract goi callback sang ta.
  chieu               text not null check (chieu in ('goi_di','nhan_ve')),
  duong_dan           text not null,
  -- Ma HTTP cua lan goi. null khi loi mang truoc khi co phan hoi.
  ma_http             int,
  thanh_cong          boolean,
  -- Than yeu cau / phan hoi da giai base64. Luu jsonb de con truy van duoc.
  --
  -- KHONG luu than cua login: no chua mat khau. Tang goi phai tu cat truoc khi ghi.
  du_lieu             jsonb,
  thong_diep          text,
  mili_giay           int,
  tao_luc             timestamptz not null default now()
);
create index if not exists nhat_ky_vcontract_hd_idx
  on nhat_ky_vcontract(hop_dong_dien_tu_id, tao_luc desc);
create index if not exists nhat_ky_vcontract_luc_idx on nhat_ky_vcontract(tao_luc desc);
