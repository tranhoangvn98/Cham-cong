# Bắt đầu nhanh — dựng để hứng log máy chấm công

Mục tiêu của tài liệu này: **máy ZKTeco đẩy được log về và bảng công tự tính**, càng nhanh càng
tốt, để chạy thử trước khi triển khai thật. Vận hành lâu dài (HTTPS, sao lưu, giám sát) xem
[`TRIEN-KHAI.md`](TRIEN-KHAI.md).

Đặt máy chủ **trong cùng mạng LAN với máy chấm công** là phương án đơn giản và an toàn nhất.
Chế độ Cloud Server/ADMS vốn cho phép máy đẩy dữ liệu qua Internet lên máy chủ đặt ở xa (VPS),
và cách đó chạy được — nhưng máy ZKTeco chỉ nói **HTTP thường, không TLS**, nên dữ liệu chấm
công đi trần. Chọn đường đó thì **bắt buộc** điền `ICLOCK_IP_CHO_PHEP` bằng IP công khai của
văn phòng, xem mục 5.

---

## 1. Dựng (5 phút)

```bash
git clone <repo> /opt/cham-cong
cd /opt/cham-cong

cp .env.example .env
nano .env
```

Điền **4 giá trị bắt buộc** — thiếu là `docker compose up` dừng ngay với thông báo rõ tên biến:

```bash
POSTGRES_PASSWORD=<chuỗi mạnh bất kỳ>
JWT_SECRET=<sinh bằng lệnh dưới>
ADMIN_MAT_KHAU=<mật khẩu admin đầu tiên>
VITE_API_URL=http://192.168.1.10:8080     # IP THỰC của máy chủ, không phải localhost
CORS_ORIGIN=http://192.168.1.10:8081      # nơi mở webapp
```

```bash
# Sinh JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> `VITE_API_URL` được **nhúng vào mã JavaScript lúc build**, không đọc lúc chạy. Điền
> `localhost` thì chỉ mở webapp được trên chính máy chủ — điện thoại và máy khác sẽ không gọi
> được API. Đổi giá trị này phải build lại: `docker compose up -d --build web`.

```bash
docker compose up -d
docker compose ps                                      # cả 3 service phải "healthy"
docker compose exec may_chu node dist/csdl/seed.js     # tạo admin + ca hành chính + ngày lễ
```

## 2. Kiểm trước khi cắm máy

```bash
node trien_khai/kiem_tra.mjs --mat-khau <ADMIN_MAT_KHAU>
```

Lệnh này kiểm máy chủ, cơ sở dữ liệu, tài khoản admin, múi giờ, danh sách máy đã khai báo,
nhân viên đã gán PIN — rồi in **đúng những giá trị phải bấm vào menu máy ZKTeco**, kèm IP LAN
thật của máy chủ.

Chạy được trên Windows / Linux / macOS, chỉ cần Node.

## 3. Khai báo máy (bắt buộc)

Máy **chưa khai báo sẽ bị trả 401 và không đẩy được gì**. Đây là chủ ý: whitelist theo serial
để không ai giả mạo được thiết bị.

1. Mở webapp `http://<ip máy chủ>:8081`, đăng nhập bằng `admin`.
2. **Thiết bị** → **Đăng ký máy**.
3. Serial lấy ở mặt sau máy, hoặc trên máy bấm **Menu › System Info › Device Info › Serial
   Number**. Phải khớp **từng ký tự**, kể cả chữ hoa và dấu gạch.

## 4. Thử toàn bộ đường đi mà **không cần máy thật**

```bash
node trien_khai/gia_lap_may.mjs --serial <serial vừa khai báo>
```

Script giả lập một máy ZKTeco: handshake → báo firmware → đẩy ATTLOG → gửi lại đúng lô đó để
kiểm chống trùng → xin lệnh. Chạy xanh hết nghĩa là phần mềm đã đúng; việc còn lại chỉ là cấu
hình mạng.

Muốn để nó chạy như một máy đang hoạt động (quẹt ngẫu nhiên mỗi 20 giây):

```bash
node trien_khai/gia_lap_may.mjs --serial <serial> --lien-tuc
```

## 5. Cấu hình máy thật

Trên máy bấm **Menu › Comm › Cloud Server / ADMS**:

| Mục | Giá trị |
|---|---|
| Server Mode | **ADMS** |
| Server Address | **IP máy chủ** — IP LAN (ví dụ `192.168.1.10`) nếu máy chủ trong văn phòng, hoặc IP công khai của VPS. Không dùng `localhost` |
| Server Port | **8080** |
| Enable Proxy | OFF |
| HTTPS / SSL | OFF |

Rồi mở tường lửa trên máy chủ cho cổng 8080 **trong LAN**:

```bash
# ufw
sudo ufw allow from 192.168.1.0/24 to any port 8080 proto tcp

# firewalld
sudo firewall-cmd --permanent --add-rich-rule='rule family=ipv4 source address=192.168.1.0/24 port port=8080 protocol=tcp accept'
sudo firewall-cmd --reload
```

**Máy chủ đặt ở địa chỉ công khai (VPS) thì bắt buộc thêm một bước:** điền
`ICLOCK_IP_CHO_PHEP` bằng IP công khai của văn phòng rồi `docker compose up -d` lại. Cổng 8080
phục vụ cả `/api/*` cho điện thoại ở mọi nơi lẫn `/iclock/*` cho máy chấm công, nên tường lửa
không tách được hai đường; để trống nghĩa là ai biết serial máy cũng đẩy được lần quẹt giả vào
bảng công. Lấy IP bằng cách mở `https://api.ipify.org` **từ một máy trong văn phòng** — chạy
trên chính VPS chỉ ra IP của VPS.

```bash
sed -i "s|^ICLOCK_IP_CHO_PHEP=.*|ICLOCK_IP_CHO_PHEP=203.0.113.45|" .env
docker compose up -d
```

Điền sai định dạng thì máy chủ ném lỗi ngay lúc khởi động chứ không im lặng bỏ qua — gặp
`may_chu` không lên được sau khi sửa dòng này thì kiểm lại đúng giá trị đã điền.

Chi tiết từng dòng menu theo firmware và cách xử lý sự cố: [`KET-NOI-MAY-ZKTECO.md`](KET-NOI-MAY-ZKTECO.md).

## 6. Xác nhận log đã về

```bash
# Xem máy chủ nhận được gì, ngay khi có người quẹt
docker compose logs -f may_chu | grep iclock
```

Đúng thì mỗi lần quẹt hiện một dòng `nhan ATTLOG` kèm `da_nhan: 1`.

Trên webapp: **Chấm công** hiện lần quẹt thô từ máy; **Tổng quan** hiện trạng thái máy
online/offline.

```sql
-- Đếm số lần quẹt theo máy, theo ngày
docker compose exec postgres psql -U chamcong chamcong -c \
  "select thiet_bi_serial, date(thoi_diem), count(*) from lan_quet group by 1,2 order by 2 desc limit 10;"
```

---

## Ba việc phải làm để số liệu đúng

Log về được **không có nghĩa** bảng công đã đúng. Ba thứ dưới đây quyết định con số:

1. **Gán PIN máy cho từng nhân viên.** Webapp → **Nhân viên** → cột PIN máy. PIN chưa gán thì
   lần quẹt vẫn được lưu (không mất dữ liệu) nhưng **công không được tính** — webapp liệt kê ở
   mục "PIN chưa map nhân viên" trong màn Chấm công.

2. **Gán ca làm việc.** Không có ca thì chỉ tính tổng giờ có mặt, **không** tính được đi muộn,
   về sớm hay OT. Ca mặc định làm **T2–T6**; công ty làm cả T7 mà không sửa ca thì T7 bị coi
   là nghỉ tuần và giờ làm dồn hết vào OT.

3. **Khai ngày lễ.** Chỉ có sẵn ngày lễ dương lịch cố định. **Tết Nguyên đán và ngày nghỉ bù
   theo lịch âm phải tự thêm mỗi năm** — không thêm thì những ngày đó bị tính là *Vắng*.

Và một điều về múi giờ: `DEVICE_TZ_OFFSET_HOURS` là múi giờ **nơi đặt máy**, không phải của máy
chủ. Máy chủ chạy UTC vẫn đúng. Đặt sai làm lệch toàn bộ giờ công.

### Nạp sẵn ca và ngày lễ

Ba việc trên làm bằng tay trên webapp cũng được, nhưng có script nạp sẵn cho chế độ làm việc
phổ biến nhất ở Việt Nam — **T2–T6 cả ngày + sáng thứ Bảy**:

```bash
node trien_khai/nap_du_lieu_demo.mjs --mat-khau <ADMIN_MAT_KHAU>

# chỉ nạp ca + ngày lễ, không tạo nhân viên giả
node trien_khai/nap_du_lieu_demo.mjs --mat-khau <mk> --khong-nhan-vien
```

Nạp ba nhóm dữ liệu:

- **Ca `Hành chính (theo HĐLĐ)`** — T2–T6 `08:00–17:30` nghỉ trưa `12:00–13:30` (480 phút → 1
  công), riêng **T7 `08:00–12:00`** (240 phút → 0,5 công). Tuần 44 giờ, dưới trần 48 giờ/tuần
  của Điều 105 BLLĐ.
- **23 dòng ngày lễ cho 2026 và 2027** — 11 ngày/năm theo Điều 112 BLLĐ 2019, ngày âm lịch đã quy
  đổi sẵn (Tết Bính Ngọ mùng 1 = 17/02/2026; Tết Đinh Mùi mùng 1 = 06/02/2027; Giỗ Tổ
  26/04/2026 và 16/04/2027). Giỗ Tổ 2026 rơi vào Chủ nhật nên có thêm ngày nghỉ bù 27/04.
- **8 nhân viên demo** mã `NVDEMO01–08`, PIN `9001–9008`, chia 4 phòng ban — chỉ để xem giao
  diện có số liệu. Xoá bằng `--xoa-nhan-vien-demo` trước khi vào vận hành thật.

**Phải rà soát lại hằng năm:** phương án nghỉ Tết (chọn 5 ngày nào) và ngày liền kề của Quốc
khánh do Chính phủ thông báo từng năm; doanh nghiệp chọn phương án khác phải thông báo trước
30 ngày (Điều 112 khoản 3). Ngày lễ trùng ngày nghỉ hằng tuần thì được nghỉ bù ngày làm việc
kế tiếp (Điều 111 khoản 3) — phải tự thêm dòng nghỉ bù.

### Sáng thứ Bảy: khung giờ riêng theo thứ

Một ca có **một** khung giờ dùng chung cho mọi ngày làm. Công ty làm sáng thứ Bảy mà khai
`08:00–17:30` cho cả T7 thì mỗi thứ Bảy toàn công ty bị ghi *về sớm 325 phút*.

Vì vậy ca có thêm **khung giờ riêng theo thứ**: webapp → **Ca làm việc** → Sửa → *Khung giờ
riêng theo thứ* → bật T7 → `08:00–12:00`. Thứ không bật thì dùng khung giờ chung phía trên.

Ô **"Đủ công (phút)"** của dòng T7 quyết định thứ Bảy được tính mấy công: để `480` thì 240
phút làm thật ra đúng **0,5 công** (thông lệ 5,5 công/tuần); muốn thứ Bảy tính tròn 1 công thì
để `240`.

Ca qua đêm không dùng được cơ chế này — giờ ra thuộc ngày hôm sau nên "thứ" của khung giờ
không xác định được một cách không nhập nhằng.

## Sự cố thường gặp

| Hiện tượng | Nguyên nhân |
|---|---|
| `docker compose up` dừng, báo thiếu tên biến | Chưa điền giá trị bắt buộc trong `.env` |
| Máy báo kết nối thất bại | Không cùng LAN, hoặc tường lửa chặn 8080, hoặc điền `localhost` vào Server Address |
| Log máy chủ có `may chua khai bao` kèm 401 | Serial trên máy khác serial đã khai báo — kiểm từng ký tự |
| Máy báo thành công nhưng webapp không có gì | Xem `docker compose logs may_chu \| grep iclock`. Có `nhan ATTLOG` mà không thấy nhân viên → PIN chưa gán |
| Webapp mở được nhưng đăng nhập lỗi mạng | `VITE_API_URL` sai. Đổi rồi phải `docker compose up -d --build web` |
| Giờ hiển thị lệch 7 tiếng | `DEVICE_TZ_OFFSET_HOURS` sai, hoặc webapp build từ trước khi sửa |
| Đăng nhập admin sai mật khẩu | Chưa chạy seed, hoặc `.env` thiếu `ADMIN_MAT_KHAU` lúc chạy seed |
