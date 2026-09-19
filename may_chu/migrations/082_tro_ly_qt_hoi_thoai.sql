-- Lich su hoi thoai tro ly QUAN TRI: luu lau dai theo NGUOI DUNG (tai khoan quan tri),
-- tach bang rieng khoi tro_ly_hoi_thoai (theo nhan_vien) de hoi thoai hai kenh khong lan vao
-- nhau. Chi chu tai khoan doc/xoa duoc cua minh.
create table if not exists tro_ly_qt_hoi_thoai (
  id           uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references nguoi_dung(id) on delete cascade,
  cau_hoi      text not null,
  tra_loi      text not null,
  y_dinh       text not null default 'khong_ro',
  tao_luc      timestamptz not null default now()
);

create index if not exists tro_ly_qt_hoi_thoai_nd_idx
  on tro_ly_qt_hoi_thoai (nguoi_dung_id, tao_luc desc);
