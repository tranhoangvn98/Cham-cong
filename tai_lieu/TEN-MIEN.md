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

## 2a. Máy chủ ĐÃ CÓ Caddy/Nginx phục vụ dịch vụ khác

Kiểm tra trước, vì cổng 80/443 chỉ một tiến trình giữ được:

```bash
ss -tlnp | grep -E ':(80|443)\b'
```

Có sẵn `caddy` hoặc `nginx` thì **đừng bật profile `ten_mien`** — dựng cổng vào thứ hai sẽ
không bind được cổng, hoặc cướp cổng và làm chết dịch vụ đang chạy. Thay vào đó thêm một
khối vào cấu hình sẵn có.

Với Caddy (`/etc/caddy/Caddyfile`), thêm nguyên khối dưới đây, thay `chamcong.congty.vn`
bằng tên miền của bạn:

```caddyfile
# ---------------------------------------------------------- he thong cham cong
# HTTP: chi phuc vu may cham cong. KHONG chuyen huong sang HTTPS — firmware ZKTeco
# khong lam duoc TLS, va gap 301/302 thi nhieu ban bo luon lo du lieu.
http://chamcong.congty.vn {
	handle /iclock/* {
		reverse_proxy 127.0.0.1:8080
	}
	handle {
		redir https://{host}{uri} permanent
	}
}

# HTTPS: webapp va API chung mot origin nen khong can CORS.
chamcong.congty.vn {
	encode gzip
	handle /api/* {
		reverse_proxy 127.0.0.1:8080
	}
	handle /health {
		reverse_proxy 127.0.0.1:8080
	}
	handle /iclock/* {
		reverse_proxy 127.0.0.1:8080
	}
	handle {
		reverse_proxy 127.0.0.1:8081
	}
}
```

Sao lưu, kiểm cú pháp, rồi mới nạp lại — nạp file sai cú pháp là **mọi** site trong đó tắt
theo, kể cả dịch vụ đang chạy:

```bash
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)
caddy validate --config /etc/caddy/Caddyfile     # phải in "Valid configuration"
systemctl reload caddy
```

Rồi trong `.env` khai như mục 2 nhưng **để `COMPOSE_PROFILES` trống** (không cần cổng vào
của compose) và khoá hai cổng cũ lại trong máy:

```bash
COMPOSE_PROFILES=
VITE_API_URL=
CORS_ORIGIN=
PROXY_TIN_CAY=172.16.0.0/12
CONG_MAY_CHU=127.0.0.1:8080
CONG_WEB=127.0.0.1:8081
```

`PROXY_TIN_CAY=172.16.0.0/12` đúng cho cả trường hợp Caddy chạy thẳng trên máy: nó gọi vào
`127.0.0.1:8080`, và container nhìn thấy nguồn là cổng vào mạng Docker (`172.x.0.1`).

```bash
docker compose up -d --build     # --build vì VITE_API_URL nhúng lúc build
```

## 2b. Dùng CHUNG một tên miền với dịch vụ khác

Khi không tạo được tên miền con riêng, đặt hệ thống chấm công dưới một tiền tố đường dẫn
của tên miền đang dùng, ví dụ `https://teams.congty.vn/chamcong/`.

**Một chỗ không nhét vào tiền tố được: `/iclock`.** Firmware ZKTeco chỉ cho khai *host* và
*port* rồi gọi cứng `/iclock/cdata` — không có ô nào nhập đường dẫn. Nên `/iclock/*` buộc
phải nằm ở **gốc** tên miền. Chấp nhận được vì dịch vụ khác hiếm khi dùng đường này, nhưng
phải biết để không đặt nhầm.

### Caddy

```caddyfile
# HTTP: chỉ phục vụ máy chấm công. KHÔNG chuyển hướng đường này sang HTTPS.
http://teams.congty.vn {
	handle /iclock/* {
		reverse_proxy 127.0.0.1:8080
	}
	handle {
		redir https://{host}{uri} permanent
	}
}

teams.congty.vn {
	encode gzip

	# route giữ ĐÚNG thứ tự viết ở đây, không để Caddy tự sắp xếp theo độ dài đường dẫn.
	route {
		# 1. Máy chấm công — firmware gọi cứng /iclock/cdata nên phải ở gốc tên miền.
		handle /iclock/* {
			reverse_proxy 127.0.0.1:8080
		}

		# 2. API chấm công. Bỏ tiền tố rồi mới chuyển tiếp, để máy chủ vẫn thấy /api/...
		handle /chamcong/api/* {
			uri strip_prefix /chamcong
			reverse_proxy 127.0.0.1:8080
		}
		handle /chamcong/health {
			uri strip_prefix /chamcong
			reverse_proxy 127.0.0.1:8080
		}

		# 3. Webapp chấm công.
		redir /chamcong /chamcong/ permanent
		handle_path /chamcong/* {
			reverse_proxy 127.0.0.1:8081
		}

		# 4. Còn lại: dịch vụ cũ — giữ nguyên các khối đang có.
		handle {
			reverse_proxy 127.0.0.1:3978
		}
	}
}
```

`route` là bắt buộc: ngoài `route`, Caddy tự sắp xếp các `handle` theo độ dài đường dẫn, và
khi trộn `handle` với `handle_path` thì thứ tự khó đoán. Trong `route`, thứ tự đúng như viết.

### `.env`

```bash
COMPOSE_PROFILES=
VITE_API_URL=
VITE_BASE=/chamcong/
CORS_ORIGIN=
PROXY_TIN_CAY=172.16.0.0/12
CONG_MAY_CHU=127.0.0.1:8080
CONG_WEB=127.0.0.1:8081
```

`VITE_BASE` phải có dấu gạch chéo ở **cả hai đầu**. Nó quyết định ba thứ cùng lúc, tất cả
đều nhúng lúc build nên đổi là phải `--build`:

- đường dẫn tệp tĩnh trong `index.html` (`/chamcong/assets/...`)
- đường dẫn font và icon trong CSS
- tiền tố mà router và lớp gọi API tự thêm vào

Nhờ vậy `VITE_API_URL` để trống là đủ: lớp gọi API lấy tiền tố từ `VITE_BASE` nên tự gọi
đúng `/chamcong/api/...`, không phải khai hai lần.

### App điện thoại

```bash
EXPO_PUBLIC_API_URL=https://teams.congty.vn/chamcong
```

### Máy chấm công

Server Address là **tên miền gốc**, không kèm tiền tố: `teams.congty.vn`, Port `80`.

### Kiểm tra sau khi reload

```bash
curl -s https://teams.congty.vn/chamcong/health; echo
curl -s -o /dev/null -w '%{http_code}\n' "http://teams.congty.vn/iclock/cdata?SN=KHONG-CO-THAT"
curl -s -o /dev/null -w '%{http_code}\n' https://teams.congty.vn/     # dịch vụ cũ phải còn sống
```

## 2. Bật cổng vào (máy chủ chưa có proxy nào)

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
