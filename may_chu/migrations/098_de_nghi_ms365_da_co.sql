-- ============================================================================
-- 098 — Đề nghị thêm nhân sự từ danh sách Microsoft 365 đã có giấy phép.
--
-- HR có thể chọn người ĐÃ CÓ sẵn tài khoản + giấy phép trong Entra thay vì nhập
-- tay rồi hệ thống tạo tài khoản mới. Khi duyệt, hệ thống KHÔNG gửi sự kiện
-- `ms365.tao_tai_khoan` nữa (tài khoản đã tồn tại — tạo lại sẽ đụng độ UPN và
-- cấp nhầm giấy phép), mục checklist "Tạo tài khoản MS365 + cấp giấy phép"
-- được tick sẵn vì không còn việc gì phải làm.
-- ============================================================================

alter table de_nghi_them_nhan_su
  add column if not exists ms365_da_co boolean not null default false,
  add column if not exists ms365_oid  text;   -- object id trong Entra, để đối soát
