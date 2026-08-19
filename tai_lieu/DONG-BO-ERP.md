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

### `phoneNumber` không phải số thì bị bỏ qua

ERP cũ trả **họ tên** trong trường `phoneNumber` với một số người — thấy trên dữ liệu thật ở
`ERP4`: `phoneNumber = "Trần Hoàng Anh Vinh"`. Trước bản `1.31.2` giá trị đó đi thẳng vào cột
`so_dien_thoai` rồi ra hồ sơ nhân sự.

Giờ giá trị phải có **ít nhất 7 chữ số** mới được nhận. Không đạt thì ô đó bị bỏ qua — số đang có
trong hệ thống **giữ nguyên**, không bị xóa — và dòng đó hiện một cảnh báo ở cột *Chi tiết* của
bảng kết quả:

> ⚠ ERP trả "Trần Hoàng Anh Vinh" trong trường số điện thoại — không phải số, đã bỏ qua ô này

Cảnh báo hiện cả ở dòng **Không đổi**, vì người bị ảnh hưởng thường nằm ở đó — mọi thứ khác đã
khớp từ lượt trước. **Sửa bên ERP**, không sửa ở đây: lượt đồng bộ sau sẽ đọc lại giá trị cũ.

Quy tắc 7 chữ số là **cố ý lỏng**: đủ để loại tên người, `N/A`, `chưa cập nhật`, dấu gạch; và
không loại `0912.345.678`, `+84 912 345 678`, `(024) 3822 1234`, hay hai số ghi cạnh nhau. Chặt
hơn nữa thì sẽ từ chối số thật của người thật, và hỏng theo hướng đó tốn hơn — không ai biết mình
vừa mất số điện thoại.

Xem những ai đang có giá trị lỗi từ trước:

```sql
select ma_nv, ho_ten, so_dien_thoai from nhan_vien
 where so_dien_thoai is not null
   and length(regexp_replace(so_dien_thoai, '\D', '', 'g')) < 7;
```

Hệ thống **không tự xóa** những giá trị này — xóa dữ liệu đang có không phải việc nó tự quyết.
Sửa ở ERP rồi đồng bộ lại, hoặc sửa tay trên hồ sơ.

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
