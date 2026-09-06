-- Module: KHỐI LƯƠNG TRUNG QUỐC (CNY) — tính riêng, không BHXH/thuế Việt Nam.
--
-- Nhân sự che_do_luong = 'tq' đã bị loại khỏi bảng lương VND (migration 046). Khối này tính
-- lương cho họ bằng CNY:
--   lương theo công = (lương cơ bản CNY + phụ cấp CNY) × (công thực / công chuẩn)
-- Dùng CHUNG chấm công (bang_cong_ngay) và CHUNG quy tắc công chuẩn của VND (kể cả thứ Bảy
-- nửa công) — chỉ khác ở chỗ tiền tính bằng CNY và KHÔNG khấu trừ bảo hiểm / thuế TNCN.
--
-- Dùng CHUNG kỳ lương (ky_luong) theo tháng, chỉ tách bảng phiếu riêng — để một tháng vẫn là
-- một kỳ, xem cạnh nhau ở hai tab.

-- ---------------------------------------------------------------- quyết định lương CNY
-- Mức lương cứng bằng CNY của từng người, hiệu-lực-hóa theo mốc (giống quyet_dinh_luong VND
-- nhưng đơn vị CNY). Tính tháng nào lấy bản hiệu lực mới nhất <= cuối tháng đó.
create table if not exists quyet_dinh_luong_cny (
  id            uuid primary key default gen_random_uuid(),
  nhan_vien_id  uuid not null references nhan_vien(id) on delete cascade,
  hieu_luc_tu   date not null,
  luong_co_ban  numeric(14,2) not null default 0 check (luong_co_ban >= 0),
  phu_cap       numeric(14,2) not null default 0 check (phu_cap >= 0),
  ly_do         text,
  tao_boi       uuid references nguoi_dung(id) on delete set null,
  tao_luc       timestamptz not null default now(),
  unique (nhan_vien_id, hieu_luc_tu)
);
create index if not exists quyet_dinh_luong_cny_nv_idx
  on quyet_dinh_luong_cny(nhan_vien_id, hieu_luc_tu desc);

-- ---------------------------------------------------------------- phiếu lương CNY
create table if not exists phieu_luong_cny (
  id                  uuid primary key default gen_random_uuid(),
  ky_luong_id         uuid not null references ky_luong(id) on delete cascade,
  nhan_vien_id        uuid not null references nhan_vien(id) on delete cascade,

  luong_co_ban        numeric(14,2) not null default 0,
  phu_cap             numeric(14,2) not null default 0,
  so_ngay_cong_chuan  numeric(6,2)  not null default 0,
  so_ngay_cong_thuc   numeric(6,2)  not null default 0,

  luong_theo_cong     numeric(14,2) not null default 0,
  -- Điều chỉnh tay riêng kỳ (giữ khi tính lại), đơn vị CNY. KHÔNG dùng để phạt tiền.
  thuong              numeric(14,2) not null default 0,
  phu_cap_khac        numeric(14,2) not null default 0,
  tru_khac            numeric(14,2) not null default 0,
  ly_do_tru_khac      text,

  tong_thu_nhap       numeric(14,2) not null default 0,
  thuc_linh           numeric(14,2) not null default 0,

  ghi_chu             text,
  sua_boi             uuid references nguoi_dung(id) on delete set null,
  sua_luc             timestamptz,
  tinh_luc            timestamptz not null default now(),

  unique (ky_luong_id, nhan_vien_id)
);
create index if not exists phieu_luong_cny_nv_idx on phieu_luong_cny(nhan_vien_id);
