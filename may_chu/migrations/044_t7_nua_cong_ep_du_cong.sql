-- Module: NỬA CÔNG THỨ BẢY (toàn công ty) + ÉP ĐỦ CÔNG (từng phiếu, chỉ admin).
--
-- Hai yêu cầu của ban giám đốc về bảng lương:
--
--   1. Thứ Bảy làm NỬA NGÀY thì tính NỬA công. Trước đây một ngày làm việc (kể cả thứ Bảy)
--      đều tính 1 công, nên công chuẩn của tháng bị đếm dư (vd 26 thay vì 23,5). Nay thứ Bảy
--      tính 0,5 công ở CẢ hai vế: mẫu số (công chuẩn của tháng) VÀ tử số (công thực đã làm),
--      để lương theo công không bị lệch. Bật/tắt bằng cờ dưới đây, MẶC ĐỊNH BẬT theo chính
--      sách hiện hành của công ty. Gắn vào tham_so_luong (đã hiệu-lực-hóa theo mốc) nên bảng
--      lương tháng cũ tính lại vẫn ra đúng con số cũ nếu sau này chính sách đổi.
--
--   2. Trong "Sửa phiếu", một ô tích ÉP ĐỦ CÔNG: coi công thực = công chuẩn để trả ĐỦ lương
--      tháng cho người đó, bất kể chấm công thực tế (dùng cho trường hợp đặc biệt: giám đốc
--      duyệt trả đủ). CHỈ ADMIN được tích — kiểm soát ở tầng route. Lưu trên từng phiếu để
--      tính lại kỳ vẫn giữ (giống thưởng / trừ khác).

-- ------------------------------------------------------------------ nửa công thứ Bảy
alter table tham_so_luong
  add column if not exists t7_nua_cong boolean not null default true;

comment on column tham_so_luong.t7_nua_cong is
  'Thứ Bảy tính 0,5 công (cả công chuẩn lẫn công thực). Mặc định bật.';

-- ------------------------------------------------------------------ ép đủ công từng phiếu
alter table phieu_luong
  add column if not exists ep_du_cong boolean not null default false;

comment on column phieu_luong.ep_du_cong is
  'Admin ép công thực = công chuẩn để trả đủ lương tháng, bất kể chấm công. Chỉ admin sửa được.';
