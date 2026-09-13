-- QUAN LY UNG LUONG (tam ung luong).
--
-- Moi khoan ung gan voi mot nhan vien + THANG luong ma no se tru vao. Quy trinh:
--   cho_duyet -> da_duyet -> da_chi (da giao tien cho nguoi ta) / huy
-- CHI khoan trang_thai = 'da_chi' moi:
--   1. Tru vao luong: khi tinh phieu, tong ung 'da_chi' cua (nguoi, thang) sinh ra khoan tru
--      'da_tam_ung' (tu_chinh_sach) -> thuc linh da net phan da ung.
--   2. Anh huong lenh chi: ai thuc linh <= 0 (da ung du/qua) thi khong ra dong chuyen khoan.
-- Khoan 'cho_duyet'/'da_duyet' chi la ghi nhan, chua tru gi (chua chi tien that).
create table if not exists ung_luong (
  id            uuid primary key default gen_random_uuid(),
  nhan_vien_id  uuid not null references nhan_vien(id) on delete cascade,
  thang         text not null check (thang ~ '^[0-9]{4}-[0-9]{2}$'),
  so_tien       numeric(14,2) not null check (so_tien > 0),
  ngay_ung      date,
  hinh_thuc     text not null default 'tien_mat'
                  check (hinh_thuc in ('tien_mat', 'chuyen_khoan')),
  trang_thai    text not null default 'cho_duyet'
                  check (trang_thai in ('cho_duyet', 'da_duyet', 'da_chi', 'huy')),
  ly_do         text,
  ghi_chu       text,
  nguoi_tao     uuid references nguoi_dung(id) on delete set null,
  nguoi_duyet   uuid references nguoi_dung(id) on delete set null,
  duyet_luc     timestamptz,
  chi_luc       timestamptz,
  tao_luc       timestamptz not null default now(),
  cap_nhat_luc  timestamptz not null default now()
);

create index if not exists ung_luong_thang_idx on ung_luong(thang, nhan_vien_id);
create index if not exists ung_luong_nv_idx on ung_luong(nhan_vien_id);
