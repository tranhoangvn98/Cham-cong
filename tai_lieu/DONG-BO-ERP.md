# Đồng bộ người dùng từ ERP cũ

Kéo danh sách người dùng từ hệ thống ERP **Trần Hoàng Việt Nam** sang hệ thống chấm công,
và nối với **Microsoft 365**.

Căn cứ: *Hướng dẫn tích hợp & đồng bộ dữ liệu qua API — Trần Hoàng Việt Nam*, endpoint
`GET /api/v1/external/users`.

---

## 1. Email là khóa nối ba hệ thống

```
ERP.email  ==  nhan_vien.email  ==  UPN của Microsoft 365
```

Đăng nhập Microsoft ở hệ thống này tìm người theo `lower(nhan_vien.email)`. Nên **đồng bộ
đúng email là nhân viên đăng nhập được bằng tài khoản công ty ngay** — không phải khai báo
gì thêm ở bước thứ ba.

Hệ quả: bản ghi ERP **không có email thì bị bỏ qua**. Nó không nối được với M365, và gần
như chắc chắn là tài khoản hệ thống chứ không phải người thật.

---

## 2. Bật tính năng

```bash
ERP_API_URL=https://tranhoangvn.com/api/v1
ERP_API_KEY=<xin key riêng từ team Backend bên ERP>
```

Rồi `docker compose up -d` (không phải `restart` — biến môi trường chỉ đọc lại khi dựng
lại container).

> ⚠️ Khóa UAT trong tài liệu tích hợp **dùng chung cho cả ba service** và không được dùng ở
> production. Xin khóa riêng.

Xác thực bằng header `X-Api-Key`, **không phải** Bearer token.

---

## 3. Cách chạy

Vào **Hệ thống → Đồng bộ ERP** (chỉ admin).

1. **Chạy thử** — đọc ERP, tính ra sẽ tạo/sửa ai, **không ghi gì**. Xem kỹ bảng kết quả.
2. **Đồng bộ thật** — mới ghi vào hệ thống.

Bắt buộc có bước chạy thử là có chủ đích: đồng bộ này **tạo và sửa nhân viên hàng loạt**,
không nên là thao tác lỡ tay một cái là xong.

Nút **"Ai chưa có email?"** liệt kê nhân viên không đăng nhập M365 được. Đây là thứ dễ bỏ
sót nhất — không có gì báo lỗi cho tới khi chính họ thử đăng nhập.

---

## 4. Bốn quy tắc an toàn

Đây là dữ liệu **người thật**, nên đồng bộ cố tình dè dặt:

| Tình huống | Hệ thống làm gì |
|---|---|
| Bản ghi ERP không có email | **Bỏ qua** — không nối được M365 |
| Người biến mất khỏi kết quả ERP | **Không xóa, không tự tắt** |
| PIN máy, ca làm, phòng ban, ngày vào | **Không đụng tới** |
| Email đã thuộc về người đang nối ERP khác | **Bỏ qua và báo** |

**Vì sao không tự tắt người vắng mặt:** tài liệu ERP mục 4.3 nói rõ API không báo bản ghi
bị xóa. Suy *"không thấy = đã nghỉ việc"* là cách chắc chắn nhất để một ngày ERP lỗi giữa
chừng thì cả công ty bị tắt.

**Vì sao không đụng PIN máy / ca làm:** đó là dữ liệu do nhân sự ở đây quản lý. ERP không
biết và không được phép dẫm vào.

**Xung đột email:** nếu một bản ghi ERP mới mang email của người đã nối với `erp_user_id`
khác, hệ thống **không tự ghi đè**. Ghi đè sẽ làm bản ghi cũ đổi chủ và người cũ mất đường
truy ngược về ERP. Đây là xung đột thật, cần người xử lý.

---

## 5. Trường nào được đồng bộ

ERP là **nguồn** của ba trường:

| Trường ERP | Trường ở đây |
|---|---|
| `name` | `ho_ten` |
| `email` | `email` (hạ về chữ thường) |
| `phoneNumber` | `so_dien_thoai` (để trống thì giữ số đang có) |
| `userId` | `erp_user_id` |
| `username` | `erp_username` |

Nhân viên tạo mới nhận mã `ERP<userId>` — ERP không có trường mã nhân viên, chỉ có `userId`
và `username`.

---

## 6. Nhật ký

Mọi lượt đồng bộ được ghi vào bảng `dong_bo_erp`: thời điểm, chế độ, số đọc/tạo/sửa/bỏ qua,
và **chi tiết từng bản ghi**. Khi ai đó hỏi *"vì sao họ tên người này đổi"*, thứ trả lời
được là nhật ký.

---

## 7. Chạy định kỳ

API ERP **không có webhook**, nên đồng bộ là kéo định kỳ. Tài liệu tích hợp gợi ý mỗi giờ
cho dữ liệu vận hành; với danh sách nhân sự thì **mỗi ngày một lần là đủ**.

Hiện chưa có lịch tự động — chạy tay từ giao diện. Muốn tự động, gọi API bằng cron:

```bash
curl -X POST https://<tên-miền>/chamcong/api/dong-bo-erp/nhan-vien \
  -H "authorization: Bearer <token admin>" \
  -H "content-type: application/json" \
  -d '{"che_do":"that"}'
```

---

## 8. Kiểm thử

15 bài e2e dựng một **máy chủ ERP giả** trên `127.0.0.1:39218` trả đúng "phong bì"
`{ success, result: { items, totalCount } }` có phân trang. Kiểm cả:

- chạy thử không ghi gì
- chạy lại không nhân đôi
- email hạ chữ thường để khớp M365
- bỏ qua bản ghi thiếu email
- không xóa người vắng mặt
- không cho bản ghi mới chiếm email của người đã nối ERP khác
- sai API key báo lỗi rõ, **không** báo "0 bản ghi"
