-- Module: KHÔI PHỤC RÀNG BUỘC "ĐƠN LÀM THÊM PHẢI CÓ ĐỦ GIỜ".
--
-- Di trú 042 (bản cũ) khi thêm loại 'di_muon' đã quét các ràng buộc trên `don_tu` bằng bộ lọc
--   pg_get_constraintdef(oid) like '%lam_them%' and like '%loai%'
-- rồi drop hết những cái trúng, chỉ thêm lại ràng buộc DANH SÁCH LOẠI. Bộ lọc đó trúng CẢ
-- `don_tu_lam_them` — ràng buộc "đơn làm thêm phải có cả giờ bắt đầu lẫn giờ kết thúc, và giờ
-- kết thúc phải sau giờ bắt đầu" (024_don_tu.sql) — nên ràng buộc này bị xoá trong im lặng.
--
-- Hệ quả: trên mọi CSDL đã chạy bản 042 cũ (gồm cả VPS đang chạy), một đơn `lam_them` chỉ có
-- giờ bắt đầu — hoặc giờ kết thúc trước giờ bắt đầu — được CSDL chấp nhận. `nghiep_vu.ts` không
-- tự kiểm điều này vì vốn dựa vào ràng buộc CSDL.
--
-- Bản 042 đã được sửa để không đụng `don_tu_lam_them` nữa (CSDL mới sẽ giữ nguyên nó từ 024),
-- nhưng di trú chỉ chạy MỘT LẦN nên CSDL cũ cần bản vá này để dựng lại ràng buộc.
--
-- Thêm dạng NOT VALID: ràng buộc áp cho MỌI insert/update MỚI (đúng cái ta cần chặn) mà không
-- quét lại dòng cũ — nên không có nguy cơ một dòng rác cũ (nếu lỡ có) làm chết khởi động.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'don_tu'::regclass and conname = 'don_tu_lam_them'
  ) then
    alter table don_tu add constraint don_tu_lam_them check (
      loai <> 'lam_them'
      or (gio_bat_dau is not null and gio_ket_thuc is not null and gio_ket_thuc > gio_bat_dau)
    ) not valid;
  end if;
end $$;
