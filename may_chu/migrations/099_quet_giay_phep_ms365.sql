-- ============================================================================
-- 099 — Quét giấy phép Microsoft 365 định kỳ + đồng bộ ngay.
--
-- Ảnh chụp danh sách người dùng Entra ĐANG CÓ giấy phép, cập nhật bởi:
--   - lịch quét 08:00 và 13:00 mỗi ngày (su_kien/lich_chay.ts),
--   - nút "Đồng bộ ngay" trên web (POST /api/de-nghi-nhan-su/ms365-da-cap-phep/dong-bo).
--
-- Ô chọn trong "Đề nghị thêm nhân sự" đọc từ bảng này (nhanh, không phụ thuộc Graph
-- mỗi lần mở form). Người mới phát hiện (oid chưa từng có) thì hệ thống báo HR.
-- ============================================================================

create table if not exists ms365_nguoi_da_cap_phep (
  oid           text primary key,               -- object id trong Entra
  ho_ten        text not null,
  upn           text not null,                  -- email = ten dang nhap Microsoft
  phat_hien_luc timestamptz not null default now(),  -- lan dau thay (moi cap phep)
  dong_bo_luc   timestamptz not null default now()   -- lan cuoi thay trong mot lan quet
);
create unique index if not exists ms365_nguoi_da_cap_phep_upn_idx
  on ms365_nguoi_da_cap_phep(lower(upn));
