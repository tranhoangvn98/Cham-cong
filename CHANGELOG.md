# Nhật ký thay đổi

Theo [SemVer](https://semver.org/lang/vi/).

## [1.0.0] — 2026-08-06

Bản đầu tiên. Xây từ bản thiết kế microservice `ChamCong` (.NET 8), viết lại bằng
Node/TypeScript để web, app và backend dùng chung một ngôn ngữ và kiểm chứng được bằng test.

### Thêm mới

**Máy chủ (`may_chu/`)**
- Cổng ADMS Push nhận log trực tiếp từ máy ZKTeco (`/iclock/*`), whitelist theo serial máy.
- Bộ tính công: giờ vào/ra, kẹp giờ trong khung ca, đi muộn/về sớm có dung sai, ngưỡng OT,
  ca đêm qua nửa đêm, ngày lễ, ngày nghỉ tuần theo cấu hình từng ca.
- Xác thực JWT HS256 tự cài bằng `node:crypto`, băm mật khẩu scrypt; phân quyền 4 vai trò.
- Token làm mới có xoay, khóa tài khoản sau 8 lần sai mật khẩu.
- Hàng đợi lệnh xuống máy bền vững trong CSDL (nạp nhân viên, đồng bộ giờ, gửi lại log).
- Đơn nghỉ phép, đơn giải trình quên quẹt, chốt/mở chốt tháng, xuất CSV cho kế toán.
- Chấm công bằng điện thoại: GPS + ảnh selfie, geofence haversine, phát hiện GPS giả lập.
- Hộp thư đi (outbox) đồng bộ sang ERP kèm chữ ký HMAC, tự gửi lại với backoff.
- Bộ lịch chốt bảng công ngày hôm trước cho toàn bộ nhân viên (để ngày vắng xuất hiện).
- Nhật ký thao tác cho mọi thay đổi dữ liệu chấm công.

**Webapp (`web/`)**
- 11 trang: tổng quan, bảng công (tổng hợp + chi tiết + xuất CSV + chốt tháng), nhật ký
  quẹt thô, duyệt đơn, nhân viên, máy chấm công, ca làm, địa điểm, ngày lễ, tài khoản,
  nhật ký thao tác.
- Giao diện sáng/tối theo cài đặt máy, dùng được trên điện thoại.

**App điện thoại (`dien_thoai/`)**
- Expo SDK 57 + expo-router, 4 tab: Hôm nay, Bảng công, Đơn từ, Cá nhân.
- Chấm công GPS + selfie; token lưu trong SecureStore.

### Khác so với bản thiết kế .NET gốc

- Hàng đợi lệnh xuống máy: chuyển từ in-memory sang bảng CSDL — không mất lệnh khi restart,
  không gửi trùng khi chạy nhiều instance.
- Chống trùng lần quẹt: dùng ràng buộc UNIQUE + `on conflict do nothing` thay vì
  "select rồi insert" (hai lô đến cùng lúc sẽ lọt qua khe đó).
- Thay publish RabbitMQ trực tiếp bằng bảng outbox ghi cùng transaction — ERP sập không
  làm mất sự kiện.

### Bảo mật

- Bỏ `@fastify/static` (4 CVE path traversal) — ảnh selfie đi qua route có xác thực.
- Bỏ `react-router` (CVE chưa có bản vá) — tự viết router ~60 dòng.
- `npm audit` = 0 lỗ hổng trên cả ba workspace.
- Chặn CSV injection khi xuất bảng công.

### Kiểm chứng

- 101 test tự động: 60 đơn vị + 41 end-to-end có CSDL thật (gồm giả lập máy ZKTeco đẩy
  ATTLOG qua giao thức ADMS rồi đối chiếu bảng công sinh ra).
- Lái Chromium qua toàn bộ webapp (11 trang, giao diện tối, cỡ 390×844) và app điện thoại.
