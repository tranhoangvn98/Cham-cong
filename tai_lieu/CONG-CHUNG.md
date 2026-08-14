# Cổng chung: gộp bốn hệ thống thành một giao diện

Tài liệu **thiết kế**, chưa phải hướng dẫn đã kiểm chứng trên VPS. Đọc và duyệt trước, rồi
mới làm theo mục 7.

Mục tiêu: nhân viên mở **một địa chỉ**, đăng nhập **một lần**, thấy **một thanh điều hướng**
dẫn sang mọi hệ thống nội bộ — thay vì nhớ bốn địa chỉ và bốn tài khoản.

| Hệ thống | Kho mã | Trạng thái giao diện hôm nay |
|---|---|---|
| Chấm công | `Cham-cong` | Web 12 trang (React + Vite) + app Expo. **Có thật.** |
| AI Agent | `ai_agent` | Python CLI + systemd timer. **Không có giao diện web** — giao diện của nó là chat Teams qua `openclaw`. |
| RF-ID | `RF-ID` | Chỉ có `README.md`. |
| TOOL | `TOOL` | Chỉ có `README.md`. |

Nói thẳng ngay từ đầu để không ai kỳ vọng sai: việc này là **dựng khung cổng và gắn Chấm
công vào**, chừa sẵn chỗ cho ba hệ còn lại. Bấm vào mục RF-ID hay TOOL hôm nay sẽ không ra
gì, vì hai kho đó chưa có dòng mã nào.

---

## 1. Phần khó đã làm xong rồi

Không phải bắt đầu từ số không. Bốn mảnh nền tảng đã có sẵn:

| Đã có | Ở đâu |
|---|---|
| Một tên miền, một Caddy giữ cổng 80/443 | `ai_agent/openclaw-teams/caddy/Caddyfile` — `teams.tranhoangvietnam.com`, `/dev/*` → 3979, còn lại → 3978 |
| Chấm công chạy được dưới tiền tố đường dẫn | `web/vite.config.ts` (`base`), `web/src/dinh_tuyen.tsx` (hằng `GOC`), `web/src/api.ts` — `VITE_API_URL` để trống thì API tự đi tới `/chamcong/api/...` |
| Đăng nhập bằng Microsoft Entra ID | `may_chu/src/bao_mat/microsoft.ts`; redirect trong `tai_lieu/DANG-NHAP-MICROSOFT.md` đã là `https://teams.tranhoangvietnam.com/chamcong/api/xac-thuc/microsoft/goi-ve` |
| Phiên đăng nhập + 5 vai trò | `may_chu/src/bao_mat/jwt.ts`, `may_chu/src/bao_mat/xac_thuc.ts` |

Thứ còn thiếu chỉ là **một trang chủ** và **một thanh điều hướng dùng chung**.

---

## 2. Kiến trúc: một origin, chia theo đường dẫn

```
https://teams.tranhoangvietnam.com/
  /                     trang chủ cổng                        (mới, tệp tĩnh)
  /chung/*              thanh điều hướng + CSS dùng chung     (mới, tệp tĩnh)
  /chamcong/*           webapp chấm công        -> 127.0.0.1:8081   (đã có)
  /chamcong/api/*       API chấm công           -> 127.0.0.1:8080   (đã có)
  /chamcong/health      kiểm tra sức khỏe       -> 127.0.0.1:8080   (đã có)
  /agent/*              xem báo cáo AI Agent                  (giai đoạn 3)
  /rfid/*  /tool/*      chỗ trống                             (chưa có nội dung)
  /dev/*                bot Teams bản dev       -> 127.0.0.1:3979   (GIỮ NGUYÊN)
  còn lại               bot Teams production    -> 127.0.0.1:3978   (GIỮ NGUYÊN)

http://teams.tranhoangvietnam.com/
  /iclock/*             máy chấm công ZKTeco    -> 127.0.0.1:8080   (HTTP thường)
  còn lại               chuyển hướng sang HTTPS
```

### Vì sao chung một origin, không phải mỗi hệ một subdomain

Chấm công lưu phiên trong `localStorage` khóa `cham_cong_phien` (`web/src/api.ts`).
`localStorage` phân vùng theo **origin**, không theo đường dẫn. Cùng origin nghĩa là mọi app
trên cổng đọc được cùng một phiên: **đăng nhập một lần là xong, không phải viết thêm dòng
nào.**

Đi subdomain riêng (`chamcong.…`, `agent.…`) thì mỗi origin một kho `localStorage`, phải:

- đổi Chấm công sang cookie `HttpOnly` `Domain=.tranhoangvietnam.com`,
- viết lại tầng token của **cả** web lẫn app điện thoại (`dien_thoai/nguon/api.ts`),
- mở CORS trở lại — thứ mà `cong_vao/Caddyfile` cố tình bỏ được nhờ chung origin,
- xin thêm chứng chỉ và thêm redirect URI cho từng subdomain.

Không đáng, ở quy mô bốn hệ nội bộ.

### Cái giá phải trả — phải biết trước khi duyệt

Chung origin thì trong trình duyệt **không còn ranh giới bảo mật** giữa các app. Một lỗ XSS ở
`/tool` đọc được token chấm công của cả cụm, và token đó mở được hồ sơ nhân sự.

Chấp nhận được khi cả bốn app do cùng một đội viết và cùng một quy trình rà soát. **Không**
chấp nhận được nếu sau này có app do bên thứ ba viết hoặc nhúng mã của bên thứ ba — lúc đó
app ấy phải ra subdomain riêng, không được vào chung origin.

Ghi nhớ kèm theo: `web/nginx.conf` đang đặt CSP `default-src 'self'`. Thanh điều hướng chung
phải phục vụ **cùng origin** thì mới tải được — thêm một lý do nữa để không tách subdomain.

---

## 3. Danh tính và phiên đăng nhập

**Chấm công làm nơi cấp danh tính cho cả cụm.** Nó là hệ duy nhất đã có bảng `nguoi_dung`,
bảng vai trò, luồng Entra ID hoàn chỉnh và cơ chế thu hồi token làm mới.

Luồng của một app bất kỳ trên cổng:

1. Đọc `localStorage['cham_cong_phien']`. Không có → chuyển sang `/chamcong/` để đăng nhập,
   kèm `?quay_lai=` đường dẫn hiện tại.
2. Có → gọi `GET /chamcong/api/xac-thuc/toi` với `Authorization: Bearer <token_truy_cap>`.
3. Nhận về `vai_tro` (`admin` / `nhan_su` / `truong_phong` / `nhan_vien` / `cho_duyet`) rồi
   tự quyết hiển thị gì.

Không app nào tự xác minh chữ ký JWT. Chỉ Chấm công giữ `JWT_SECRET`; các app khác **hỏi**
nó. Như vậy đổi khóa, thu hồi phiên, khóa tài khoản chỉ làm ở một chỗ.

> **Không chia sẻ `JWT_SECRET` sang app khác.** Đưa khóa ký đi là biến mỗi app thành một nơi
> có thể tự phát hành token quản trị. Bốn bản sao của một bí mật thì mất một bản là mất cả
> bốn.

### Vì sao không dùng thẳng token của Entra ID

Đúng chuẩn hơn thì mỗi app tự xác minh `id_token` của Entra bằng JWKS (RS256). Nhưng như vậy
phải viết lại xác thực ở mọi ngôn ngữ trong cụm — kể cả Python cho AI Agent — và Entra không
biết gì về vai trò `truong_phong` hay ánh xạ tài khoản sang `nhan_vien_id`. Chưa đáng ở quy
mô này. Nếu sau này số app tăng hoặc có app ngoài đội, đây là bước nâng cấp tiếp theo, và
đổi được mà không phải viết lại giao diện.

---

## 4. Thanh điều hướng dùng chung

Một tệp JavaScript thuần (không framework) phục vụ tại `/chung/thanh_dieu_huong.js`, kèm
`/chung/thanh_dieu_huong.css`. Mỗi app chèn đúng một thẻ `<script defer>`.

Script tự làm hết: đọc phiên → gọi `/chamcong/api/xac-thuc/toi` → vẽ thanh trên cùng với các
mục đúng vai trò → đánh dấu mục đang mở theo `location.pathname`. Sửa menu một lần, cả cụm
đổi theo.

Viết bằng JS thuần chứ không phải component React vì AI Agent (Python) và hai hệ chưa có mã
gần như chắc chắn không dùng React. Một component React chỉ dùng lại được ở đúng một app.

### CSS phải sinh từ `token.json`, không viết tay

CLAUDE.md cấm hard-code màu / font / bo góc. Thanh điều hướng cũng không ngoại lệ. Nghĩa là
`thiet_ke/sinh_token.mjs` phải sinh thêm tệp thứ ba, và `thiet_ke/token.test.mjs` phải kiểm
tệp đó — nếu không, quên chạy `npm run sinh_token` sẽ trôi qua mà test vẫn xanh.

Dùng nhánh `web` của `token.json` (Inter, `#3B82F6`, bo góc 8px): thanh điều hướng chỉ chạy
trên trình duyệt. Nhánh `mobile` giữ nguyên cho app Expo, không đụng tới.

Bốn luật màu ở `tai_lieu/THIET-KE.md` vẫn áp dụng nguyên vẹn — đặc biệt là **`chinh` chỉ tô
mảng, chữ dùng `chinh_dam`**, và **chữ trên `chinh_dam` dùng `var(--tren-chinh)`**.

### Vì sao không dùng iframe

Nhúng mỗi app vào một iframe nghe có vẻ nhanh hơn, nhưng:

- `web/nginx.conf` đang đặt `X-Frame-Options: DENY` và CSP `frame-ancestors 'none'`. Nhúng
  iframe sẽ ra khung trắng. Muốn làm được thì phải tự tay gỡ một lớp phòng thủ chống
  clickjacking — đổi một lớp bảo mật lấy một trải nghiệm tệ hơn.
- Vỡ deep link: gửi cho đồng nghiệp đường dẫn tới hồ sơ một nhân viên sẽ ra trang chủ.
- Vỡ nút Back của trình duyệt.
- Tải tệp hồ sơ và mở ảnh chấm công trong iframe lồng nhau là nguồn lỗi triền miên.

---

## 5. Bốn hệ thống gắn vào cổng thế nào

### Chấm công — gắn được ngay

Đổi biến build và Caddy, không sửa mã nguồn:

```
VITE_BASE=/chamcong/
VITE_API_URL=            # để TRỐNG — api.ts tự lấy tiền tố từ BASE_URL
CONG_MAY_CHU=127.0.0.1:8080
CONG_WEB=127.0.0.1:8081
PROXY_TIN_CAY=172.16.0.0/12
MS_REDIRECT_URI=https://teams.tranhoangvietnam.com/chamcong/api/xac-thuc/microsoft/goi-ve
MS_GOC_WEBAPP=https://teams.tranhoangvietnam.com/chamcong
```

Việc duy nhất phải sửa mã: thêm bộ chuyển app vào đầu sidebar (`web/src/App.tsx`, mảng
`MENU`) để từ Chấm công nhảy sang hệ khác được.

### AI Agent — **đừng** làm lại giao diện

Nó đã có giao diện rồi: chat Teams. Dựng thêm một trang hỏi đáp trên web là làm hai lần cùng
một việc, và bản web sẽ luôn tụt lại sau bản Teams.

Mục đúng cho nó trên cổng là **"Báo cáo"**: liệt kê những báo cáo mà
`ma_nguon/agent_vps/agent/reporting.py` đã sinh ra, cho xem lại và tải về, kèm nút mở cuộc
chat Teams. Việc này cần thêm một tầng HTTP mỏng vào `ai_agent` — hôm nay `grep` không tìm
thấy `fastapi`, `flask`, `uvicorn` hay `aiohttp` nào trong kho.

Giữ nguyên hai điều bất biến của `openclaw-teams`: cổng bind `127.0.0.1`, `tools.profile` =
`messaging`. Cổng chung không được nới hai thứ này.

### RF-ID và TOOL — chỗ trống có chủ đích

Chưa có mã thì chưa có gì để gắn. Hai lựa chọn, chọn một và ghi rõ vào trang chủ:

1. **Không hiện mục nào** cho tới khi có nội dung — đúng với tiền lệ đã ghi trong
   `web/src/App.tsx`: *"một mục menu dẫn tới trang trống thì tệ hơn là không có mục đó"*.
2. Hiện mục kèm nhãn **"Đang xây dựng"**, bấm vào ra một trang nói rõ trạng thái.

Đề xuất: lựa chọn 1. Tiền lệ trong chính kho này đã chốt như vậy khi bỏ 4 màn hình chưa có
backend ra khỏi menu.

---

## 6. Caddyfile hợp nhất

Thay `/etc/caddy/Caddyfile` trên VPS (bản hiện tại nằm ở
`ai_agent/openclaw-teams/caddy/Caddyfile`). Caddy chạy trực tiếp trên máy chủ, không trong
Docker — mọi đích đến đều là `127.0.0.1`.

```caddyfile
# ---------------------------------------------------------------- HTTP (cổng 80)
# CHỈ phục vụ máy chấm công. Firmware ZKTeco không làm được TLS, và gặp 301/302 thì
# nhiều bản coi là lỗi rồi bỏ luôn cả lô dữ liệu — nên đường này KHÔNG chuyển hướng.
http://teams.tranhoangvietnam.com {
	handle /iclock/* {
		reverse_proxy 127.0.0.1:8080
	}
	# Mọi thứ còn lại vào bằng trình duyệt -> ép sang HTTPS.
	handle {
		redir https://{host}{uri} permanent
	}
}

# ---------------------------------------------------------------- HTTPS (cổng 443)
teams.tranhoangvietnam.com {
	encode gzip

	# ---- Bot Teams bản dev: GIỮ NGUYÊN ----
	handle_path /dev/* {
		reverse_proxy 127.0.0.1:3979
	}

	# ---- Chấm công: API ----
	# Chỉ cắt '/chamcong', GIỮ LẠI '/api' vì máy chủ đăng ký route ở tiền tố đó.
	# Dùng handle_path ở đây là sai: nó cắt cả '/api' và mọi lời gọi thành 404.
	handle /chamcong/api/* {
		uri strip_prefix /chamcong
		reverse_proxy 127.0.0.1:8080
	}
	handle /chamcong/health {
		uri strip_prefix /chamcong
		reverse_proxy 127.0.0.1:8080
	}

	# ---- Chấm công: webapp tĩnh ----
	# nginx trong container phục vụ ở gốc, còn Vite đã nhúng sẵn tiền tố vào đường dẫn
	# tệp tĩnh, nên ở đây cắt cả tiền tố là đúng.
	handle_path /chamcong/* {
		reverse_proxy 127.0.0.1:8081
	}
	# Vào '/chamcong' thiếu gạch chéo cuối thì đường dẫn tương đối của Vite trỏ sai chỗ.
	redir /chamcong /chamcong/ permanent

	# ---- Máy chấm công gọi bằng HTTPS: chỉ để thử bằng curl ----
	handle /iclock/* {
		reverse_proxy 127.0.0.1:8080
	}

	# ---- Tài nguyên dùng chung của cổng ----
	handle_path /chung/* {
		root * /srv/cong/chung
		file_server
	}

	# ---- Trang chủ cổng (khớp đúng '/', không khớp gì khác) ----
	handle / {
		root * /srv/cong
		file_server
	}

	# ---- Còn lại: bot Teams production (/api/messages, ...) GIỮ NGUYÊN ----
	handle {
		reverse_proxy 127.0.0.1:3978
	}
}
```

Ba điểm cần kiểm bằng mắt sau khi dán:

- `handle /chamcong/api/*` phải thắng `handle_path /chamcong/*`. Caddy xếp các khối `handle`
  theo độ cụ thể của đường dẫn (dài hơn thắng), nên đúng theo lý thuyết — nhưng **vẫn phải
  kiểm bằng `curl`** ở mục 7, đừng tin suông.
- Khối `http://` làm **tắt** cơ chế tự chuyển HTTP → HTTPS của Caddy cho toàn bộ site. Vì
  thế phải tự viết lại `redir` — thiếu dòng đó là bot Teams và webapp bị phục vụ qua HTTP
  thường.
- `PROXY_TIN_CAY=172.16.0.0/12` chứ không phải `127.0.0.1/32`: Caddy chạy trên máy chủ nối
  vào cổng đã publish của Docker, nên container thấy địa chỉ nguồn là gateway của mạng
  Docker. Khai sai thì `ICLOCK_IP_CHO_PHEP` mất tác dụng vì mọi request trông như đến từ
  cùng một IP.

---

## 7. Runbook triển khai

Làm tuần tự. Mỗi bước có điều kiện hoàn thành (DoD) và cách lùi lại.

### Bước 0 — Ghi nhớ trạng thái bot trước khi đụng gì

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://teams.tranhoangvietnam.com/
cp /etc/caddy/Caddyfile /root/Caddyfile.truoc-cong-chung
ss -tlnp | grep -E ':(80|443|3978|3979|8080|8081)\b'
```

Ghi lại mã HTTP của bot. Cuối mỗi bước đối chiếu lại — bot Teams đang phục vụ người thật,
làm hỏng nó là hỏng ngay lập tức chứ không đợi ai phát hiện.

`trien_khai/cap_nhat_vps.sh` đã có sẵn đoạn đo này; đọc lại phần đầu script để làm cho đúng.

### Bước 1 — Thêm redirect URI vào Entra ID

`az ad app update --web-redirect-uris` **ghi đè cả danh sách**, phải liệt kê lại địa chỉ cũ:

```bash
az ad app update --id "<APP_ID>" --web-redirect-uris \
  "https://teams.tranhoangvietnam.com/chamcong/api/xac-thuc/microsoft/goi-ve" \
  "<mọi địa chỉ cũ đang dùng>"
```

**DoD:** `az ad app show --id "<APP_ID>" --query "web.redirectUris"` in ra đủ cả cũ lẫn mới.
**Lùi:** chạy lại lệnh trên với đúng danh sách cũ.

### Bước 2 — Build lại webapp với tiền tố

`VITE_BASE` là biến lúc **build**, Vite thay thế lúc biên dịch chứ không đọc lúc chạy. Sửa
`.env` rồi restart là không đủ:

```bash
docker compose build web
docker compose up -d may_chu web
```

**DoD:** `docker compose exec web grep -o '/chamcong/assets' /usr/share/nginx/html/index.html`
có kết quả.
**Lùi:** đặt lại `VITE_BASE=/`, build lại.

### Bước 3 — Đổi Caddyfile

```bash
caddy validate --config /etc/caddy/Caddyfile     # kiểm cú pháp TRƯỚC khi nạp
systemctl reload caddy
```

**DoD** — cả sáu lệnh phải đúng:

```bash
curl -s -o /dev/null -w 'bot        %{http_code}\n' https://teams.tranhoangvietnam.com/
curl -s -o /dev/null -w 'webapp     %{http_code}\n' https://teams.tranhoangvietnam.com/chamcong/
curl -s -o /dev/null -w 'assets     %{http_code}\n' https://teams.tranhoangvietnam.com/chamcong/assets/
curl -s              -w '\nhealth   %{http_code}\n' https://teams.tranhoangvietnam.com/chamcong/health
curl -s -o /dev/null -w 'iclock     %{http_code}\n' http://teams.tranhoangvietnam.com/iclock/cdata
curl -s -o /dev/null -w 'redir 80   %{http_code}\n' http://teams.tranhoangvietnam.com/chamcong/
```

`health` phải trả JSON `{"trang_thai":"ok",...}` — nếu trả HTML của bot thì thứ tự khối
`handle` sai, quay lại mục 6. `redir 80` phải là 301, `iclock` **không** được là 301.

**Lùi:** `cp /root/Caddyfile.truoc-cong-chung /etc/caddy/Caddyfile && systemctl reload caddy`.

### Bước 4 — Kiểm bằng người thật

Đăng nhập bằng tài khoản Microsoft, mở bảng công, mở một hồ sơ nhân viên, tải một tệp đính
kèm. Bốn việc này đi qua bốn cơ chế khác nhau (OAuth redirect, API thường, route có tham số,
route phục vụ tệp có phân quyền).

### Bước 5 — Xác nhận máy chấm công vẫn đẩy log

Đây là bước hay bị quên và hỏng âm thầm nhất: máy ZKTeco không báo lỗi, chỉ là bảng công
thiếu dữ liệu, và vài ngày sau mới có người phát hiện.

```bash
node trien_khai/kiem_tra.mjs --may-chu http://teams.tranhoangvietnam.com
node trien_khai/gia_lap_may.mjs --may-chu http://teams.tranhoangvietnam.com
```

**DoD:** lần quẹt giả lập hiện trên trang `/chamcong/lan-quet`.

---

## 8. Rủi ro đã biết

| # | Rủi ro | Vì sao xảy ra | Cách chặn |
|---|---|---|---|
| 1 | Đụng đường `/api` | Caddyfile của bot đang `handle { reverse_proxy 3978 }` bắt tất, kể cả `/api/*`. Chấm công cũng dùng `/api/*`. | Chấm công **bắt buộc** nằm dưới `/chamcong/api/*`. Kiểm bằng lệnh `health` ở bước 3. |
| 2 | `handle_path` cắt nhầm | `handle_path /chamcong/api/*` cắt cả `/api`, máy chủ trả 404 cho mọi lời gọi. | Dùng `handle` + `uri strip_prefix /chamcong` cho đường API. |
| 3 | Máy chấm công ngừng đẩy log | Thêm khối `http://` tắt chuyển hướng tự động; hoặc `/iclock` vô tình bị ép sang HTTPS. | Bước 5. `iclock` phải trả 200, không phải 301. |
| 4 | Nút "Đăng nhập bằng Microsoft" chết | `--web-redirect-uris` ghi đè cả danh sách. | Bước 1, liệt kê lại địa chỉ cũ. |
| 5 | Đổi tiền tố mà không build lại | `VITE_BASE` là biến lúc build. | Bước 2 và DoD của nó. |
| 6 | Tranh cổng 80/443 | Bật `COMPOSE_PROFILES=ten_mien` của Chấm công sẽ dựng Caddy thứ hai, cướp cổng và làm chết bot. | **Không bao giờ** bật profile đó trên VPS này. Dùng Caddy đang chạy. |
| 7 | `ICLOCK_IP_CHO_PHEP` mất tác dụng | Khai sai `PROXY_TIN_CAY` thì mọi request trông như đến từ cùng một IP. | `PROXY_TIN_CAY=172.16.0.0/12`. |
| 8 | XSS ở một app lộ token cả cụm | Hệ quả trực tiếp của việc chung origin (mục 2). | Không cho app bên thứ ba vào chung origin. Giữ CSP `default-src 'self'`. |
| 9 | Secret Entra hết hạn | `--years 2` là hạn dài nhất Entra cho phép, hết hạn thì đăng nhập chết không báo trước. | Ghi ngày hết hạn vào lịch ngay khi làm bước 1. |

---

## 9. Khối lượng

| GĐ | Nội dung | Ước lượng |
|---|---|---|
| 1 | Caddyfile hợp nhất, đưa Chấm công lên `/chamcong`, redirect URI Entra, trang chủ cổng tối giản | 1–2 ngày |
| 2 | Thanh điều hướng chung (`/chung/*`), sinh CSS từ `token.json` + test, bộ chuyển app trong sidebar Chấm công | 2–3 ngày |
| 3 | Trang `/agent` xem báo cáo (cần thêm tầng HTTP mỏng cho `ai_agent`) | tùy phạm vi |
| — | `/rfid`, `/tool` | khi hai kho có nội dung |

---

## 10. Còn phải quyết

1. **Tên miền của cổng.** `teams.tranhoangvietnam.com` là tên của bot, không phải tên của
   một cổng nội bộ. Đổi sang `noibo.` hoặc `portal.` thì rõ nghĩa hơn — nhưng phải thêm bản
   ghi DNS, thêm redirect URI, và cấu hình lại webhook Teams. Đề xuất: giữ nguyên ở giai
   đoạn 1, đổi tên ở giai đoạn 3 khi đã có đủ ba mục để cổng đáng có tên riêng.
2. **RF-ID và TOOL** — ẩn hẳn hay hiện kèm nhãn "Đang xây dựng" (mục 5).
3. **Sổ tay của `openclaw-teams`** ghi Caddyfile là tài sản có version. Đổi nó thì phải cập
   nhật `ai_agent/openclaw-teams/caddy/Caddyfile` trong kho `ai_agent` cho khớp bản live,
   nếu không lần chạy `scripts/drift.sh` tiếp theo sẽ báo lệch.
