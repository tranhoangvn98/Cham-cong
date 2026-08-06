# Quy ước dự án Chấm công

## Cấu trúc

```
may_chu/      Backend: cổng ADMS cho máy ZKTeco + REST API   (Node + TS + Fastify + PostgreSQL)
web/          Webapp cho nhân sự                              (React 19 + Vite)
dien_thoai/   App cho nhân viên                               (Expo SDK 57)
tai_lieu/     Tài liệu vận hành
```

`may_chu` và `web` là npm workspace của repo gốc. `dien_thoai` cài phụ thuộc riêng
(`npm --prefix dien_thoai install`) vì Expo/Metro không hoạt động tốt trong workspace.

## Đặt tên

- **Thư mục, tệp, biến, hàm, tên bảng/cột CSDL**: tiếng Việt **không dấu**
  (`tinh_cong.ts`, `bang_cong_ngay`, `phut_ve_som`).
- **Comment trong code**: tiếng Việt **không dấu**.
- **Chuỗi hiển thị cho người dùng** (thông báo lỗi API, nhãn giao diện, tiêu đề CSV):
  tiếng Việt **có dấu, đúng chính tả**. Nhân viên đọc những chuỗi này.
- Giữ tên chuẩn quốc tế: `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `Dockerfile`, `.gitignore`.
- Ngoại lệ: định danh do framework/giao thức quy định giữ nguyên
  (`onPress`, `className`, `SN`, `ATTLOG`, `PIN`, `Status`, `Verify`).

## Nguyên tắc kỹ thuật bắt buộc

### Múi giờ

Toàn hệ thống neo theo **múi giờ nơi đặt máy chấm công** (`DEVICE_TZ_OFFSET_HOURS`),
**không** theo múi giờ máy chủ, **không** theo múi giờ thiết bị người xem.

- Máy chủ: dùng `tien_ich/thoi_gian.ts`, không dùng `getHours()`/`toLocaleString()` trực tiếp.
- Web / app: format qua `gio_ngan()` / `ngay_gio()` — lấy offset từ phản hồi đăng nhập.

Đây là lỗi đã từng xảy ra: dùng `toLocaleTimeString()` làm bảng công hiển thị 01:00 thay
vì 08:00 khi xem từ máy đặt múi giờ khác.

### Chống trùng dữ liệu

Chống trùng bằng **ràng buộc UNIQUE + `on conflict do nothing`**, không dùng
"select trước rồi insert" — hai lô đến cùng lúc sẽ lọt qua khe đó.

### Nhận việc / nhận lệnh

Nhận việc từ hàng đợi bằng **một câu UPDATE nguyên tử** (`update ... where id in (select
... for update skip locked) returning ...`), không giữ transaction trong lúc gọi HTTP.
Nhờ vậy nhiều instance chạy song song không xử lý trùng.

### Ghi sự kiện ra ngoài

Sự kiện gửi sang ERP ghi vào bảng `hop_thu_di` **cùng transaction** với dữ liệu nghiệp vụ,
rồi một tiến trình riêng đẩy đi. Không gọi HTTP ra ngoài trong luồng xử lý request.

### Tính lại bảng công

Người **vắng cả ngày không có lần quẹt nào**, nên không có gì kích hoạt tính công cho họ.
`su_kien/lich_chay.ts` chạy sau 01:00 để chốt ngày hôm trước cho **toàn bộ** nhân viên.
Đừng bỏ tiến trình này — bỏ là ngày vắng không xuất hiện trên bảng công.

### Bảo mật

- Không bao giờ commit `.env`. Chạy `git status` bằng mắt trước commit đầu.
- Mật khẩu băm bằng `scrypt` của `node:crypto` (không phụ thuộc gói native).
- Ảnh selfie là **dữ liệu cá nhân**: chỉ qua route có xác thực + phân quyền, tên tệp do
  máy chủ sinh, kiểm magic byte, chặn path traversal. **Không phục vụ tĩnh.**
- Dữ liệu ngoài phạm vi của người dùng trả **404** (không phải 403) để không tiết lộ sự
  tồn tại.
- Ô xuất CSV bắt đầu bằng `= + - @` phải bị vô hiệu hóa (CSV injection).

## Kiểm thử

```bash
npm test                    # 60 test đơn vị: parser ADMS, tính công, JWT, geofence
npm --workspace may_chu run test_e2e   # 41 test end-to-end (cần DB tên chamcong_test*)
npm run kiem_tra_kieu       # kiểm tra kiểu cả may_chu và web
```

Quy tắc: **sửa logic tính công hoặc parser ADMS thì phải thêm test**. Hai phần này sinh ra
tiền lương; sai là sai lương cả công ty.

Test e2e xóa sạch dữ liệu nên nó **từ chối chạy** nếu tên DB không bắt đầu bằng
`chamcong_test`.

## Khi thêm phụ thuộc

Chạy `npm audit` sau mỗi lần thêm. Mục tiêu là **0 lỗ hổng** trên cả ba workspace. Đã có
tiền lệ phải bỏ `@fastify/static` (4 CVE path traversal) và `react-router` (CVE chưa có
bản vá) — thay bằng code tự viết ngắn hơn.

`dien_thoai` phải khớp phiên bản của Expo SDK: lấy từ
`dien_thoai/node_modules/expo/bundledNativeModules.json`, đừng cài bản mới nhất.
