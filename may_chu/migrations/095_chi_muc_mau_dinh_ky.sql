-- ============================================================================
-- 095 — Bổ sung chỉ mục UNIQUE một phần cho cong_viec_mau_dinh_ky
--
-- Migration 084 da khai index nay nhung ban chay tren production thoi diem do
-- chua co dong nay (tep 084 duoc bo sung sau) — nen production bi thieu index
-- va moi lan gan vi tri JD (sinh mau dinh ky) nem 42P10 "no unique or exclusion
-- constraint matching the ON CONFLICT specification".
--
-- Da kiem du lieu production: khong co dong trung (nhan_vien_id, dau_viec_id).
-- ============================================================================

create unique index if not exists cong_viec_mau_dinh_ky_mot_mau_idx
  on cong_viec_mau_dinh_ky(nhan_vien_id, dau_viec_id) where dau_viec_id is not null;
