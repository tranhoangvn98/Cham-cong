-- Module: MIỄN PHẠT (từng phiếu lương, chỉ admin).
--
-- Ô tích "miễn phạt" trong Sửa phiếu: BỎ các khoản PHẠT ĐI MUỘN tự động (tru_di_muon 50k /
-- tru_nua_ngay) cho người đó trong kỳ này — dùng khi admin duyệt miễn (vd có lý do chính đáng
-- nhưng nộp đơn muộn). CHỈ ADMIN được tích (kiểm ở tầng route). Lưu trên phiếu để tính lại kỳ
-- vẫn giữ, giống ep_du_cong / thưởng / trừ khác.
--
-- KHÔNG đụng tới khoản trừ do người dùng gõ tay hay khoản kỷ luật — chỉ chặn phần phạt đi muộn
-- do hệ thống tự sinh.
alter table phieu_luong
  add column if not exists mien_phat boolean not null default false;

comment on column phieu_luong.mien_phat is
  'Admin miễn phạt đi muộn tự động (tru_di_muon/tru_nua_ngay) cho phiếu này. Chỉ admin sửa được.';
