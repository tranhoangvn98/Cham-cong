-- ============================================================================
-- 003 — Ghi nhan dau hieu GPS gia lap khi cham cong bang dien thoai
--
-- Android bao cho ung dung biet toa do co phai do app gia lap vi tri tao ra hay khong
-- (LocationObject.mocked). Day la cach gian lan cham cong pho bien nhat tren dien thoai,
-- nen phai luu lai va KHONG BAO GIO tu dong tinh cong cho ban ghi nhu vay.
-- ============================================================================

alter table lan_quet
  add column if not exists gps_gia_lap boolean not null default false;

-- Nhan su can loc nhanh cac ban ghi dang nghi van.
create index if not exists lan_quet_gps_gia_lap_idx
  on lan_quet(thoi_diem desc) where gps_gia_lap = true;
