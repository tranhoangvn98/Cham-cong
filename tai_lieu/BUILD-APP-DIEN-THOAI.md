# Build app điện thoại

App dùng **Expo SDK 57**. Camera, GPS và SecureStore là module native, nên **không chạy
được trên Expo Go bản thường** — phải build ra APK/IPA hoặc development build.

---

## 1. Chạy thử khi phát triển

```bash
cd dien_thoai
npx expo start
```

Quét mã QR bằng Expo Go. Xem được toàn bộ giao diện, bảng công, đơn từ; riêng **chấm
công GPS + selfie sẽ lỗi** vì thiếu module native. Muốn thử luôn phần đó thì làm
development build (mục 3).

Máy chủ mặc định lấy từ biến `EXPO_PUBLIC_API_URL`, hoặc nhân viên tự nhập ở màn hình
đăng nhập lần đầu:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080 npx expo start
```

## 2. Build APK cho Android

```bash
npm install -g eas-cli
cd dien_thoai

eas login          # cần tài khoản Expo (miễn phí)
eas init           # tạo projectId, ghi vào app.json
eas build --platform android --profile preview
```

`eas init` là bắt buộc: không có `projectId` thì app không đăng ký được thông báo đẩy
(app vẫn chạy, chỉ mất tính năng nhắc khi đơn được duyệt — màn Cá nhân sẽ báo rõ).

Build xong EAS cho một liên kết tải `.apk`. Gửi liên kết đó cho nhân viên, hoặc đưa file
APK vào MDM của công ty.

Nếu chưa có `eas.json`, tạo:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_API_URL": "https://chamcong.congty.vn" }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_API_URL": "https://chamcong.congty.vn" }
    }
  }
}
```

> Đặt `EXPO_PUBLIC_API_URL` trong `eas.json` để nhân viên không phải tự nhập địa chỉ máy
> chủ. Họ vẫn đổi được ở màn hình đăng nhập nếu cần.

## 3. Development build (thử chấm công GPS/selfie)

```bash
eas build --platform android --profile development
# hoặc build ngay trên máy nếu đã có Android SDK:
npx expo run:android
```

## 4. Build cho iOS

Cần tài khoản Apple Developer (99 USD/năm).

```bash
eas build --platform ios --profile preview
```

Phân phối nội bộ: TestFlight, hoặc Ad Hoc nếu đã đăng ký UDID của các máy.

## 5. Quyền app xin và lý do

| Quyền | Dùng để | Bắt buộc? |
|---|---|---|
| Camera | Chụp ảnh xác nhận khi chấm công | Chỉ khi chấm công bằng điện thoại |
| Vị trí (khi dùng app) | Đối chiếu với địa điểm công ty đã khai | Chỉ khi chấm công bằng điện thoại |
| Thông báo | Nhắc khi đơn được duyệt | Không |

App **không** xin quyền vị trí nền và **không** xin quyền ghi âm (đã chặn tường minh
trong `app.json`). Chỉ xem bảng công / xin nghỉ phép thì app không xin quyền nào.

## 6. Nhân viên dùng lần đầu

1. Nhân sự tạo tài khoản: webapp → **Nhân viên** → cột Tài khoản → **Tạo**.
2. Đọc cho nhân viên tên đăng nhập + mật khẩu tạm.
3. Nhân viên cài app, mở lên, nhập địa chỉ máy chủ (nếu app chưa có sẵn) rồi đăng nhập.
4. App **bắt buộc đổi mật khẩu** ở lần đăng nhập đầu.
5. Muốn dùng chấm công bằng điện thoại: nhân sự phải bật riêng cho từng người ở trang
   Nhân viên, và khai ít nhất một **địa điểm** để đối chiếu GPS.

## 7. Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| "Không kết nối được máy chủ" | Điện thoại không cùng mạng với máy chủ, hoặc địa chỉ sai. Thử mở `http://<địa chỉ>/health` bằng trình duyệt trên chính điện thoại đó. |
| "Tài khoản của bạn chưa được bật chấm công bằng điện thoại" | Đúng như vậy — nhân sự phải bật ở trang Nhân viên. |
| "Định vị của điện thoại đang tắt" | Bật GPS trong Cài đặt điện thoại. |
| "Quyền vị trí đã bị chặn" | Nhân viên đã từ chối vĩnh viễn. Vào Cài đặt › Ứng dụng › Chấm công › Quyền. |
| Luôn báo "ngoài phạm vi" dù đang ở công ty | Bán kính địa điểm đặt quá nhỏ. GPS trong nhà lệch 10–50m; nên đặt 100–300m. |
| Không nhận thông báo đẩy | Chưa chạy `eas init`, hoặc nhân viên từ chối quyền thông báo. Màn Cá nhân hiện lý do cụ thể. |

## 8. Giới hạn đã biết

- **Chấm công bằng điện thoại không thay được máy chấm công.** GPS có thể bị giả lập;
  hệ thống phát hiện được cờ giả lập trên Android nhưng không phải mọi trường hợp. Vì
  vậy chấm công ngoài phạm vi luôn phải qua người duyệt.
- **Không có chế độ ngoại tuyến.** Mất mạng thì không chấm công được bằng điện thoại.
  Máy chấm công thì vẫn lưu nội bộ và đẩy bù khi có mạng.
- **Ô nhập ngày là ô chữ** dạng `YYYY-MM-DD`, chưa dùng bộ chọn ngày của hệ điều hành.
