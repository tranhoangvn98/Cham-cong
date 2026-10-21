-- Module: DONG BO MAY CHAM CONG (dong bo khuon mat giua hai may + khoa nguoi da nghi).
--
-- `oplog_may`: nhat ky su kien tu may (them/xoa user, enroll...) — nguon phat hien DANG KY MOI
-- ngay khi xay ra de dong bo sang may con lai. Dong trung (may day lai) bi bo qua.
--
-- `lenh_thiet_bi.hoi_userinfo_luc`: danh dau lenh `DATA QUERY USERINFO` (anh chup DAY DU user).
-- Khi may day USERINFO sau lenh do, he thong xoa cac dong user da bi xoa tren may — neu khong
-- `may_nguoi_dung` giu ma mai moi dong cu (bang nay upsert, khong bao gio tu xoa).

create table if not exists oplog_may (
  id               bigserial primary key,
  thiet_bi_serial  text not null references thiet_bi(serial) on delete cascade,
  chi_muc          int,           -- so thu tu may dat
  hanh_dong        int,           -- ma hanh dong (them/xoa user, enroll...)
  thoi_diem        text,          -- chuoi gio DIA PHUONG may ghi (khong phai moc tuyet doi)
  pin              text not null default '0',
  the              text not null default '0',
  khac             text,          -- cac truong con lai, ghep bang dau phay
  nhan_luc         timestamptz not null default now(),
  -- Chong trung khi may day lai cung ban ghi (Stamp=None thi day lai nhieu lan).
  unique (thiet_bi_serial, chi_muc, hanh_dong, thoi_diem, pin, the)
);
create index if not exists oplog_may_moi_idx on oplog_may(thiet_bi_serial, nhan_luc desc);

alter table lenh_thiet_bi
  add column if not exists hoi_userinfo_luc timestamptz;
create index if not exists lenh_thiet_bi_hoi_userinfo_idx
  on lenh_thiet_bi(thiet_bi_serial, hoi_userinfo_luc desc)
  where hoi_userinfo_luc is not null;
