# Chấm công

Hệ thống chấm công lấy dữ liệu **trực tiếp từ máy chấm công ZKTeco** (giao thức ADMS Push),
gồm ba phần:

| Phần | Thư mục | Dành cho | Công nghệ |
|---|---|---|---|
| **Máy chủ** | `may_chu/` | Nhận log từ máy, tính công, REST API | Node 22 + TypeScript + Fastify + PostgreSQL 16 |
| **Webapp** | `web/` | Nhân sự: bảng công, duyệt đơn, quản lý máy | React 19 + Vite |
| **App điện thoại** | `dien_thoai/` | Nhân viên: xem công, xin nghỉ, chấm công khi đi công tác | Expo SDK 57 (React Native) |

Máy chấm công tự đẩy dữ liệu về máy chủ ngay khi có người quẹt (Realtime), không cần
ai xuất file thủ công.

```
   Máy ZKTeco ──ADMS push──►  may_chu  ──REST──►  web (nhân sự)
   (mặt/vân tay/thẻ)            │                 dien_thoai (nhân viên)
                                └──outbox──► ERP (tùy chọn)
```

---

## 1. Chạy thử trên máy của bạn

Cần: **Node 20.11+** (khuyến nghị 22), **PostgreSQL 16+**.

```bash
# 1. Tạo cơ sở dữ liệu
createdb chamcong
psql -c "CREATE USER chamcong WITH PASSWORD 'mat_khau_cua_ban';"
psql -c "ALTER DATABASE chamcong OWNER TO chamcong;"

# 2. Cấu hình
cp .env.example .env
# Mở .env và sửa: DATABASE_URL, JWT_SECRET, ADMIN_MAT_KHAU
# Sinh JWT_SECRET:  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Cài phụ thuộc
npm install                    # may_chu + web
npm --prefix dien_thoai install  # app điện thoại

# 4. Tạo bảng + tài khoản admin + ca hành chính + ngày lễ
npm run seed

# 5. Chạy
npm run may_chu    # http://localhost:8080
npm run web        # http://localhost:5173
npm run dien_thoai # Expo — quét mã QR bằng app Expo Go
```

Đăng nhập webapp bằng tài khoản `admin` và mật khẩu bạn đặt ở `ADMIN_MAT_KHAU`.
Hệ thống sẽ bắt đổi mật khẩu ngay lần đầu.

## 2. Triển khai lên máy chủ

```bash
cp .env.example .env      # điền POSTGRES_PASSWORD, JWT_SECRET, VITE_API_URL
docker compose up -d
docker compose exec may_chu node dist/csdl/seed.js   # tạo admin lần đầu
```

Webapp ở cổng `8081`, API ở cổng `8080`.

> **Cổng 8080 phải vào được từ mạng có máy chấm công.** Nhiều firmware ZKTeco không làm
> được TLS, nên thường đặt máy chủ trong cùng mạng LAN với máy chấm công, và chỉ đưa
> webapp ra ngoài qua reverse proxy có HTTPS.

Chi tiết: [`tai_lieu/TRIEN-KHAI.md`](tai_lieu/TRIEN-KHAI.md).

## 3. Kết nối máy chấm công

Trên máy ZKTeco: **Menu › Comm › Cloud Server / ADMS**

| Mục | Giá trị |
|---|---|
| Server Mode | `ADMS` |
| Server Address | IP máy chủ (ví dụ `192.168.1.10`) |
| Server Port | `8080` |
| Enable Proxy Server | Tắt |
| Realtime | **Bật** |

Sau đó vào webapp → **Máy chấm công** → khai serial máy (số SN dán sau lưng máy).

**Máy chưa khai serial sẽ bị hệ thống từ chối (401)** — đây là lớp chặn máy lạ, không
phải lỗi. Máy đã khai sẽ hiện "Kết nối" trong vòng khoảng 10 giây.

Hướng dẫn đầy đủ kèm cách xử lý sự cố: [`tai_lieu/KET-NOI-MAY-ZKTECO.md`](tai_lieu/KET-NOI-MAY-ZKTECO.md).

## 4. Việc nhân sự phải làm sau khi cài

Thứ tự này quan trọng — làm sai thứ tự thì log về sẽ không map được vào ai:

1. **Ca làm việc** — sửa ca "Hành chính" cho khớp giờ thật và **các ngày phải đi làm**
   (mặc định T2–T6; công ty làm cả T7 phải tự thêm).
2. **Nhân viên** — thêm từng người, điền **PIN máy** đúng bằng số ID đã khai trên máy.
3. **Máy chấm công** — khai serial, rồi bấm "Đồng bộ giờ" (lệch giờ máy là nguyên nhân
   sai công phổ biến nhất).
4. **Ngày lễ** — chỉ có sẵn ngày lễ dương lịch cố định. **Tết Nguyên đán và ngày nghỉ
   bù theo lịch âm phải tự thêm mỗi năm.**
5. **Địa điểm** — chỉ cần nếu dùng chấm công bằng điện thoại.
6. **Tài khoản** — tạo tài khoản cho nhân viên nào cần dùng app điện thoại.

## 5. Cách tính công

Tính lại tự động mỗi khi có lần quẹt mới, không cần chờ cuối ngày.

- **Giờ vào** = lần quẹt sớm nhất, **giờ ra** = lần quẹt muộn nhất trong ngày.
- **Giờ làm** = thời gian trong khung ca, trừ giờ nghỉ giữa ca.
  Đến sớm hơn giờ vào ca **không** được tính thêm công.
- **Đi muộn** = số phút vào sau giờ ca, trừ dung sai của ca.
- **Về sớm** = số phút ra trước giờ tan ca, trừ dung sai.
- **Tăng ca** = số phút làm sau giờ tan ca, chỉ tính khi vượt ngưỡng OT của ca.
- **Số công** = 1 nếu giờ làm đạt ngưỡng "đủ công"; 0,5 nếu đạt nửa ngưỡng; còn lại 0.

Thứ tự ưu tiên khi xác định trạng thái ngày:

1. Đơn nghỉ phép **đã duyệt** → `Nghỉ phép` (nghỉ không lương = 0 công)
2. Ngày lễ → `Ngày lễ` (hưởng lương = 1 công dù không đi làm)
3. Không thuộc ngày làm của ca → `Nghỉ tuần`
4. Có lần quẹt → `Có mặt`
5. Còn lại → `Vắng`

Làm việc vào ngày lễ / nghỉ tuần / đang nghỉ phép: **toàn bộ thời gian tính vào OT**,
không tính đi muộn (vì không có giờ chuẩn để đối chiếu).

### Ba điều cần biết trước khi dùng cho tính lương

- **Ca đêm qua nửa đêm** phải khai bằng ca có bật "qua đêm". Ca ngày làm OT qua 0h sẽ
  **không** được tính vào ngày hôm trước — đó là giới hạn đã biết, đổi lấy việc không
  bao giờ đếm trùng một lần quẹt cho hai ngày.
- **Đổi quy tắc ca không tự tính lại bảng công cũ.** Sau khi sửa ca, phải bấm
  "Tính lại tháng" cho các tháng cần cập nhật.
- **Chốt tháng** làm các ngày trong tháng không bị tính lại nữa. Muốn sửa phải mở chốt.

## 6. Chấm công bằng điện thoại

Chỉ bật cho người thường xuyên đi công tác (bật từng người ở trang Nhân viên).

Nhân viên bấm chấm công → app lấy GPS → chụp một ảnh → gửi lên. Kết quả:

| Tình huống | Kết quả |
|---|---|
| Trong bán kính địa điểm đã khai | Tính công **ngay** |
| Ngoài bán kính | Ghi nhận nhưng **chờ nhân sự duyệt**, chưa tính công |
| Điện thoại bật app giả lập vị trí | Ghi nhận + **cảnh báo**, luôn phải duyệt |
| Chưa khai địa điểm nào | Luôn phải duyệt (không có gì để đối chiếu) |

Nhân sự xem ảnh và khoảng cách ở webapp → **Duyệt đơn → Chấm công điện thoại**.

Ảnh là dữ liệu cá nhân: chỉ chủ ảnh, nhân sự/quản trị, và trưởng phòng cùng phòng xem
được. Ảnh không bao giờ được phục vụ tĩnh.

## 7. Phân quyền

| Vai trò | Phạm vi |
|---|---|
| `admin` | Toàn quyền, gồm quản lý tài khoản và nhật ký thao tác |
| `nhan_su` | Toàn bộ dữ liệu chấm công, khai máy, chốt tháng, xuất CSV |
| `truong_phong` | Xem và duyệt đơn của **nhân viên trong phòng mình** |
| `nhan_vien` | Chỉ dữ liệu của chính mình (dùng app điện thoại) |

## 8. Đồng bộ sang ERP (tùy chọn)

Điền `ERP_WEBHOOK_URL` trong `.env`. Máy chủ POST từng sự kiện kèm chữ ký HMAC ở header
`x-cham-cong-signature` (khóa `ERP_WEBHOOK_SECRET`):

| Sự kiện | Khi nào |
|---|---|
| `lan_quet.da_ghi` | Có lần quẹt mới đã map được nhân viên |
| `bang_cong.da_chot` | Bảng công một ngày được tính lại |
| `nghi_phep.da_duyet` | Đơn nghỉ phép được duyệt |

Sự kiện ghi vào bảng `hop_thu_di` **cùng transaction** với dữ liệu nghiệp vụ, nên ERP
sập không làm mất sự kiện — máy chủ tự gửi lại với backoff tăng dần.

Nối nhân viên hai bên bằng trường **Mã bên ERP** ở trang Nhân viên.

## 9. Kiểm thử

```bash
npm test                              # 181 test: parser ADMS, tính công, JWT, geofence
createdb chamcong_test
DATABASE_URL=postgres://chamcong:...@localhost:5432/chamcong_test \
  npm --workspace may_chu run test_e2e   # 151 test end-to-end, có CSDL thật
npm run kiem_tra_kieu                 # kiểm tra kiểu TypeScript
```

Test end-to-end **giả lập máy ZKTeco thật** đẩy ATTLOG/RTLOG qua giao thức ADMS rồi đối
chiếu bảng công sinh ra, gồm cả chống trùng, hàng đợi lệnh, chấm công điện thoại, khóa
API `/api/v1`, và thông báo đẩy (dựng máy chủ Expo giả trên `127.0.0.1:39217`, không gọi
ra Internet).

> Test e2e **xóa sạch dữ liệu** trước khi chạy, nên nó từ chối chạy nếu tên cơ sở dữ
> liệu không bắt đầu bằng `chamcong_test`.

Chạy được ngay trên VPS mà không đụng dữ liệu thật — chốt chặn tên CSDL ở trên đảm bảo
điều đó:

```bash
cd /root/Cham-cong
docker compose exec -T postgres psql -U chamcong -d postgres -c 'CREATE DATABASE chamcong_test;'
docker run --rm -v /root/Cham-cong:/app -w /app --network cham-cong_default \
  -e DATABASE_URL="postgres://chamcong:$(grep -E '^POSTGRES_PASSWORD=' .env | tail -1 | cut -d= -f2-)@postgres:5432/chamcong_test" \
  node:22-alpine sh -c 'npm ci --silent && npm run --workspace may_chu test_e2e'
```

## 10. Bảo mật

- `.env` **không bao giờ** được commit (`.gitignore` đã chặn). Đổi `JWT_SECRET` trước
  khi lên production — máy chủ từ chối khởi động nếu còn dùng giá trị mẫu.
- Mật khẩu băm bằng scrypt (`node:crypto`, không phụ thuộc gói native).
- Token làm mới **có xoay**: dùng lại token đã thu hồi bị coi là dấu hiệu bị đánh cắp và
  hệ thống thu hồi **toàn bộ** phiên của người đó.
- Khóa tài khoản 15 phút sau 8 lần sai mật khẩu. Thông báo đăng nhập sai giống nhau dù
  tài khoản có tồn tại hay không.
- Mọi thao tác sửa dữ liệu chấm công đều ghi vào `nhat_ky_thao_tac` (ai, làm gì, lúc nào,
  từ IP nào) — cần cho tranh chấp bảng công.
- Xuất CSV chặn CSV injection (ô bắt đầu bằng `= + - @` bị vô hiệu hóa).

## 11. Tài liệu

| Tệp | Nội dung |
|---|---|
| [`tai_lieu/BAT-DAU-NHANH.md`](tai_lieu/BAT-DAU-NHANH.md) | **Dựng để hứng log máy chấm công** — đọc trước |
| [`tai_lieu/KET-NOI-MAY-ZKTECO.md`](tai_lieu/KET-NOI-MAY-ZKTECO.md) | Cấu hình máy, giao thức ADMS, xử lý sự cố |
| [`tai_lieu/TRIEN-KHAI.md`](tai_lieu/TRIEN-KHAI.md) | Triển khai VPS, reverse proxy, giám sát |
| [`tai_lieu/SAO-LUU-VA-PHUC-HOI.md`](tai_lieu/SAO-LUU-VA-PHUC-HOI.md) | Sao lưu, kéo về máy khác, phục hồi, diễn tập |
| [`tai_lieu/TRIEN-KHAI-TU-POWERSHELL.md`](tai_lieu/TRIEN-KHAI-TU-POWERSHELL.md) | Cập nhật VPS từ máy Windows bằng PowerShell |
| [`tai_lieu/BUILD-APP-DIEN-THOAI.md`](tai_lieu/BUILD-APP-DIEN-THOAI.md) | Build APK / iOS bằng EAS |
| [`tai_lieu/TEN-MIEN.md`](tai_lieu/TEN-MIEN.md) | Trỏ tên miền, chứng chỉ HTTPS, Caddy |
| [`tai_lieu/DANG-NHAP-MICROSOFT.md`](tai_lieu/DANG-NHAP-MICROSOFT.md) | Đăng nhập bằng tài khoản Microsoft (Entra ID) |
| [`tai_lieu/API.md`](tai_lieu/API.md) | Toàn bộ endpoint REST |
| [`tai_lieu/API-TICH-HOP.md`](tai_lieu/API-TICH-HOP.md) | API `/api/v1` cho hệ thống ngoài: khoá API, Swagger, sinh client |
| [`tai_lieu/THIET-KE.md`](tai_lieu/THIET-KE.md) | Design token: màu, font, bo góc, breakpoint |
| [`CLAUDE.md`](CLAUDE.md) | Quy ước code của dự án |
