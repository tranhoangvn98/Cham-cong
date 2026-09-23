# Yêu cầu cấp token dịch vụ — phân hệ Chấm công gửi sự kiện nhân sự sang Cổng

> Kính gửi: Đội quản trị Cổng nội bộ
> Từ: Quản trị phân hệ Chấm công
> Ngày: 2026-09-24
> Mức ưu tiên: Cao — dữ liệu nhân sự đang chờ đồng bộ.

## 1. Vấn đề

Phân hệ Chấm công cần **đẩy sự kiện nhân sự sang Cổng** (chiều ra). Hiện thiếu
`CONG_TOKEN_DICH_VU` — token dịch vụ để Cổng xác thực máy chủ Chấm công khi nhận sự kiện.
Vì thiếu token, các sự kiện đang nằm chờ trong hộp thư đi của Chấm công và không được gửi:

| Sự kiện | Số lượng | Nội dung |
|---|---|---|
| `nhan_su.da_tao` | 4 | Tạo hồ sơ nhân sự mới ngày 2026-09-23: `minhhuyenkd` (Nguyễn Minh Huyền), `hoangvietkd` (Vũ Hoàng Việt), `maianhkd` (Phạm Mai Anh), `khanhlykd` (Trần Khánh Ly) |
| `nhan_su.nghi_viec` | 1 | Nguyễn Quỳnh Anh (`ERP153`) nghỉ việc từ 2026-06-20 |

## 2. Yêu cầu

Cổng cấp cho phân hệ Chấm công **một token dịch vụ** (loại `dv`) với các thông số:

- **Loại token:** `loai = "dv"` (token dịch vụ, không phải token người dùng `tc`).
- **Ký:** RS256 bằng khóa riêng của Cổng (khóa công khai đã có trong JWKS mà Chấm công nạp).
- **`iss`:** đúng giá trị Cổng đang phát (Chấm công đối chiếu).
- **`aud`:** `cong-noi-bo`.
- **Thời hạn:** dài hạn (khuyến nghị không có hạn dùng tới khi bị thu hồi), vì đây là token
  chạy nền của máy chủ, không phải phiên của một người.
- **Quyền:** không cần vai trò gì đặc biệt — token chỉ được dùng cho đúng một việc dưới đây.

## 3. Token dùng vào việc gì (để Cổng đối chiếu)

Chấm công gửi sự kiện tới đúng một endpoint:

- **Method:** `POST`
- **URL:** `https://teams.tranhoangvietnam.com/cong/api/su-kien-nhan-su`
- **Header:** `Authorization: Bearer <token>` và `Content-Type: application/json`
- **Thân:**

```json
{
  "su_kien_id": "chamcong-<id dong hop thu di>",
  "loai": "nhan_su.da_tao",
  "nhan_su_ma": "minhhuyenkd",
  "than": { "ho_ten": "Nguyễn Minh Huyền" }
}
```

- **Các loại sự kiện** Chấm công có thể gửi (Cổng đã định nghĩa hợp đồng này):
  `nhan_su.da_tao`, `nhan_su.doi_ten`, `nhan_su.nghi_viec`, `nhan_su.quay_lai`.
- **`su_kien_id`** có tiền tố `chamcong-` và ổn định qua các lần gửi lại — Cổng chống trùng
  bằng `unique(su_kien_id)` + `on conflict do nothing`. Cổng vui lòng giữ nguyên cơ chế này.
- Token **không** được dùng cho bất kỳ việc nào khác ngoài endpoint trên.

## 4. Cách bàn giao

Gửi chuỗi token qua kênh riêng cho quản trị Chấm công (không gửi qua nhóm chung, không commit
vào mã nguồn). Chấm công sẽ khai vào biến `CONG_TOKEN_DICH_VU` trong cấu hình máy chủ và khởi
động lại dịch vụ.

## 5. Kiểm tra chấp nhận

Sau khi Chấm công khai token:

1. Cổng nhận đủ 5 sự kiện đang chờ (mục 1), mỗi `su_kien_id` xuất hiện **đúng một lần**.
2. Hộp thư đi của Chấm công hết 5 sự kiện chờ (đã đánh dấu gửi xong).
3. Sự kiện `nhan_su.nghi_viec` của `ERP153` có hiệu lực: phiên đăng nhập của người đó tại
   Cổng bị thu hồi theo quy trình Cổng hiện có.
