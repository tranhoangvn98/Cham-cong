# Chạy trên tên miền + HTTPS

Mục tiêu: bỏ hẳn `localhost` khỏi cấu hình, để mở webapp và gọi API từ **bất kỳ máy nào**
bằng một tên miền cố định, có HTTPS thật.

Kết quả sau khi làm xong:

| Đường | Giao thức | Phục vụ |
|---|---|---|
| `https://chamcong.congty.vn/` | HTTPS | webapp cho nhân sự |
| `https://chamcong.congty.vn/api/*` | HTTPS | API cho webapp và app điện thoại |
| `http://chamcong.congty.vn/iclock/*` | **HTTP thường** | máy chấm công ZKTeco |

Webapp và API **cùng một origin**, nên không còn CORS, và `VITE_API_URL` để trống — webapp
gọi đường dẫn tương đối `/api/...`. Đổi tên miền sau này không phải build lại webapp.

`/iclock` giữ HTTP thường vì firmware ZKTeco không làm được TLS, và gặp chuyển hướng
301/302 thì nhiều bản coi là lỗi rồi bỏ luôn lô dữ liệu. Đây là lý do phải chặn đường đó
theo IP.

---

## 1. Trỏ tên miền về máy chủ

Ở nơi quản lý DNS của tên miền, thêm bản ghi:

```
Loại: A     Tên: chamcong     Giá trị: 103.81.87.47     TTL: 300
```

Kiểm tra đã trỏ đúng chưa **trước khi** sang bước 2 — Caddy không xin được chứng chỉ nếu
tên miền chưa về đúng máy:

```bash
dig +short chamcong.congty.vn      # phải in ra IP máy chủ
```

Bản ghi DNS mới có thể mất vài phút đến vài giờ để lan. Đừng bật Caddy trước khi `dig` trả
đúng IP: Let's Encrypt có giới hạn số lần xin hỏng, thử sai nhiều lần sẽ bị khoá vài giờ.

**Nếu tên miền đi qua Cloudflare** thì tắt proxy (đám mây màu cam → xám) cho bản ghi này.
Để bật, Cloudflare sẽ chặn `/iclock` vì máy chấm công nói HTTP thường và không có SNI như
trình duyệt.

## 2. Bật cổng vào

Trong `.env`:

```bash
COMPOSE_PROFILES=ten_mien
TEN_MIEN=chamcong.congty.vn
EMAIL_TLS=it@congty.vn

# Webapp và API cùng origin -> gọi đường dẫn tương đối, không cần CORS
VITE_API_URL=
CORS_ORIGIN=

# Caddy đứng trước, nên phải khai dải mạng của nó
PROXY_TIN_CAY=172.16.0.0/12

# Khoá hai cổng cũ lại trong máy: mọi luồng vào đi qua Caddy
CONG_MAY_CHU=127.0.0.1:8080
CONG_WEB=127.0.0.1:8081
```

Rồi dựng lại. `VITE_API_URL` được nhúng lúc build nên **bắt buộc** có `--build`:

```bash
docker compose up -d --build
docker compose logs -f cong_vao        # theo dõi lúc xin chứng chỉ
```

Xin chứng chỉ xong sẽ có dòng `certificate obtained successfully`. Mở
`https://chamcong.congty.vn` là thấy trang đăng nhập, có ổ khoá trên thanh địa chỉ.

`COMPOSE_PROFILES` nằm trong `.env` nên từ giờ mọi lệnh `docker compose` quen thuộc vẫn
chạy như cũ, không phải thêm cờ gì.

## 3. Mở tường lửa

```bash
firewall-cmd --permanent --add-service=http --add-service=https
firewall-cmd --permanent --remove-port=8080/tcp --remove-port=8081/tcp
firewall-cmd --reload
```

Gỡ 8080/8081 được vì hai cổng đó giờ chỉ mở trong máy. Cổng 80 phải mở — vừa để Let's
Encrypt xác thực, vừa để máy chấm công đẩy dữ liệu.

## 4. Chuyển máy chấm công sang tên miền

Trên máy: **Menu › Comm › Cloud Server / ADMS**

| Mục | Giá trị |
|---|---|
| Server Address | `chamcong.congty.vn` |
| Server Port | **80** (không phải 8080 nữa) |
| HTTPS / SSL | OFF |
| Enable Proxy | OFF |

Firmware cũ chỉ nhận IP chứ không nhận tên miền thì cứ để nguyên IP máy chủ với cổng 80 —
Caddy vẫn nhận, chỉ là không có chứng chỉ cho IP nên `/iclock` vẫn đi HTTP như thường.

Kiểm tra đường này sống chưa, không cần máy thật:

```bash
curl -s "http://chamcong.congty.vn/iclock/cdata?SN=KHONG-CO-THAT"
# Mong đợi: 401 (serial chưa khai báo) — nghĩa là đã qua được Caddy tới máy chủ.
# Nếu ra 403 thì IP của bạn không nằm trong ICLOCK_IP_CHO_PHEP.
# Nếu bị chuyển sang https:// thì cấu hình Caddy sai — máy chấm công sẽ hỏng vì lý do này.
```

## 5. App điện thoại

Đặt trong `dien_thoai/.env` rồi build lại app:

```bash
EXPO_PUBLIC_API_URL=https://chamcong.congty.vn
```

App đã cài trên máy nhân viên đổi được trực tiếp trong màn **Cá nhân → Địa chỉ máy chủ**,
không cần cài lại.

---

## Vì sao phải khai `PROXY_TIN_CAY`

`X-Forwarded-For` là header **do phía gửi tự đặt** — bất kỳ ai cũng ghi được giá trị tuỳ ý.
Nếu máy chủ tin nó vô điều kiện thì `ICLOCK_IP_CHO_PHEP` mất sạch tác dụng: kẻ tấn công chỉ
cần gửi kèm `X-Forwarded-For: <IP văn phòng>` là qua được danh sách trắng và đẩy được lần
quẹt giả vào bảng công.

Nên mặc định là **không tin ai**: lấy địa chỉ thật của kết nối. Khi đặt sau Caddy thì phải
khai đúng dải mạng của Caddy — với Docker là `172.16.0.0/12`. Không khai thì mọi request đều
mang IP của Caddy và danh sách trắng chặn nhầm tất cả.

Tuyệt đối không điền `0.0.0.0/0`: như vậy là quay lại đúng lỗ hổng ở trên. Máy chủ ghi cảnh
báo lúc khởi động nếu phát hiện giá trị này.

## Sự cố thường gặp

| Hiện tượng | Nguyên nhân |
|---|---|
| Caddy lặp lại `obtaining certificate` rồi hỏng | DNS chưa trỏ về đúng IP, hoặc cổng 80 bị tường lửa chặn |
| `too many failed authorizations` | Đã thử xin chứng chỉ hỏng quá nhiều lần; đợi 1 giờ và sửa DNS trước khi thử lại |
| Webapp mở được nhưng mọi lời gọi API lỗi | Còn `VITE_API_URL` cũ nhúng trong bản build — chạy lại với `--build` |
| Máy chấm công báo lỗi kết nối sau khi đổi sang tên miền | Còn để Server Port 8080; qua Caddy phải là 80 |
| `/iclock` trả 403 với mọi IP | `PROXY_TIN_CAY` chưa khai nên request nào cũng mang IP của Caddy |
| `/iclock` trả 403 riêng máy chấm công | IP công khai của văn phòng đổi (mạng IP động) — xem `TRIEN-KHAI.md` |
