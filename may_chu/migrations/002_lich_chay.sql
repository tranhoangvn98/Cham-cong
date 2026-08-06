-- ============================================================================
-- 002 — So ghi cong viec dinh ky
--
-- Dung de bao dam moi cong viec (vd chot bang cong mot ngay) chi chay DUNG MOT LAN,
-- ke ca khi co nhieu instance may chu chay song song hoac may chu restart lien tuc.
-- ============================================================================

create table if not exists cong_viec_da_chay (
  ma_viec   text primary key,
  chay_luc  timestamptz not null default now(),
  ket_qua   text
);
