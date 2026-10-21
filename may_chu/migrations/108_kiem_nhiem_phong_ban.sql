-- ============================================================================
-- 108 — Kiêm nhiệm phòng ban: một nhân sự thuộc nhiều phòng ban.
--
-- Phòng ban CHÍNH vẫn ở `nhan_vien.phong_ban_id`. Bảng này chứa các phòng ban
-- PHỤ (kiêm nhiệm) — dùng khi giải người nhận thông báo/văn bản phạm vi phòng
-- ban: người kiêm nhiệm nhận thông báo của CẢ phòng chính lẫn phòng phụ.
-- ============================================================================

create table if not exists phong_ban_kiem_nhiem (
  id            uuid primary key default gen_random_uuid(),
  nhan_vien_id  uuid not null references nhan_vien(id) on delete cascade,
  phong_ban_id  uuid not null references phong_ban(id) on delete cascade,
  tao_luc       timestamptz not null default now(),
  -- Một người không kiêm nhiệm hai lần cùng một phòng.
  constraint phong_ban_kiem_nhiem_duy_nhat unique (nhan_vien_id, phong_ban_id)
);

create index if not exists phong_ban_kiem_nhiem_nv_idx
  on phong_ban_kiem_nhiem(nhan_vien_id);

create index if not exists phong_ban_kiem_nhiem_pb_idx
  on phong_ban_kiem_nhiem(phong_ban_id);
