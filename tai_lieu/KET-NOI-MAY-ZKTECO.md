# Kết nối máy chấm công ZKTeco

Hệ thống nhận dữ liệu bằng **giao thức ADMS Push**: máy tự gọi lên máy chủ, không phải
máy chủ đi hỏi máy. Ưu điểm là máy nằm sau NAT/không có IP tĩnh vẫn hoạt động, và dữ
liệu về gần như tức thời.

Đã kiểm chứng với dòng SenseFace / SpeedFace (firmware ZKTeco 8.x). Các dòng khác dùng
cùng giao thức nên thường chạy được, nhưng nên chạy thử một máy trước khi triển khai.

---

## 1. Cấu hình trên máy

**Menu › Comm (Kết nối) › Cloud Server Setting / ADMS**

Điền khác nhau tùy máy chủ đặt ở đâu. Chọn đúng **một** trong hai cột dưới.

| Mục trên máy | A. Máy chủ trong LAN | B. Máy chủ trên VPS (qua tên miền) |
|---|---|---|
| Server Mode | `ADMS` | `ADMS` |
| Enable Domain Name | **Tắt** | **Bật** |
| Server Address | `192.168.1.10` | `chamcong.congty.vn` |
| Server Port | `8080` | `80` |
| Enable Proxy Server | **Tắt** | **Tắt** |
| HTTPS | **Tắt** | **Tắt** |

Đúng cho cả hai cột:

- Server Address **không kèm** `http://`, không kèm `/` ở cuối, không kèm số cổng.
- `Enable Domain Name` là công tắc quyết định máy hiểu ô địa chỉ là IP hay tên miền. Điền
  tên miền mà để tắt thì máy không phân giải DNS và im lặng không gọi được — đây là lỗi
  cấu hình hay gặp nhất khi chuyển từ LAN sang VPS.
- Cổng ở cột B là **80**, không phải 8080: reverse proxy trên VPS nghe cổng 80 rồi chuyển
  tiếp `/iclock/*` vào máy chủ chấm công. Cổng 8080 chỉ tồn tại bên trong VPS.
- `Enable Proxy Server` phải **tắt**. Bật lên thì máy không gửi thẳng tới `Server Address`
  nữa mà đẩy toàn bộ qua proxy đã khai — mà ô proxy thường để trống thành `0.0.0.0`, tức
  là không đi đâu cả. Triệu chứng giống hệt cấu hình đúng: máy im lặng, không báo lỗi, và
  máy chủ không nhận được gì. Bản dịch tiếng Việt ghi là "Cho phép máy chủ ủy nhiệm".
- HTTPS luôn tắt, kể cả cột B — xem mục 6 để biết vì sao và bù lại bằng cách nào.

Firmware cài tiếng Việt đặt tên khác, màn hình tên là **"Cài đặt máy chủ đám mây"**:

| Trên bảng ở trên | Firmware tiếng Việt |
|---|---|
| Server Mode = ADMS | Kiểu máy chủ = **Tự động tải dữ liệu** |
| Enable Domain Name | Khởi động tên miền |
| Server Address | Địa chỉ máy chủ |
| Server Port | Cổng máy chủ |
| Enable Proxy Server | Cho phép máy chủ ủy nhiệm |

Khi `Khởi động tên miền` bật, nhiều firmware **tự thêm** `http://` và dấu `/` vào ô địa chỉ
rồi hiển thị nguyên URL (`http://chamcong.congty.vn/`). Đó là bình thường — chỉ gõ phần tên
miền, để firmware tự ghép, đừng gõ tay `http://`.

**Menu › Comm › Ethernet** (hoặc Wi-Fi): đặt IP tĩnh hoặc DHCP reservation cho máy, để
địa chỉ máy không đổi sau khi mất điện.

Sau khi lưu, máy thường tự khởi động lại phần kết nối. Không cần bật/tắt máy.

## 2. Khai máy vào hệ thống

Webapp → **Máy chấm công** → **+ Khai báo máy**:

- **Serial máy**: lấy ở **Menu › Hệ thống › Thông tin thiết bị › Số sê ri** *trên chính máy
  đó*, ví dụ `NYU7261300256`. Phải khớp tuyệt đối, **phân biệt chữ hoa/thường**.
- **Tên gợi nhớ**: ví dụ "Cửa chính".

> Đừng lấy số dán sau lưng máy hay số trên hộp. Nhiều lô máy có mã hộp / mã bảo hành khác
> với số sê ri firmware, mà giao thức ADMS chỉ gửi lên số sê ri firmware. Khai nhầm số thì
> máy gọi lên bao nhiêu lần cũng nhận 401 và trong log chỉ thấy `may chua khai bao goi cdata`.

Máy chưa khai serial sẽ nhận HTTP **401** cho mọi yêu cầu. Đây là lớp chặn máy lạ đẩy
dữ liệu giả vào bảng công, không phải lỗi cấu hình.

Sau khoảng 10 giây, trạng thái máy trong webapp chuyển thành **Kết nối**.

## 3. Đăng ký nhân viên lên máy

Có hai việc khác nhau, phải làm cả hai:

1. **Trên webapp**: thêm nhân viên và điền **PIN máy** — đúng bằng số ID (User ID) của
   người đó trên máy.
2. **Tại máy**: nhân viên phải **đăng ký khuôn mặt / vân tay trực tiếp**. Sinh trắc học
   không thể nạp từ xa.

Nút **"Nạp NV"** trong webapp chỉ tạo sẵn user (PIN + tên) trên máy để nhân viên khỏi
phải tự tạo — vẫn phải ra máy đăng ký khuôn mặt.

Tên hiển thị trên máy bị bỏ dấu tự động vì màn hình máy ZKTeco chỉ hiện được ASCII.

### Nhiều văn phòng, nhiều máy

Dữ liệu **liên thông sẵn**: máy chỉ đẩy lên PIN + mốc giờ, hệ thống tra PIN ra nhân viên
trên phạm vi toàn công ty chứ không lọc theo máy; bộ tính công cũng chỉ gom theo nhân viên
và ngày. Một người vào ca ở VP1 và tan ca ở VP3 vẫn được ghép thành **một ngày công liền
mạch**. Serial máy chỉ dùng để biết quẹt ở đâu và để chống trùng. Thêm văn phòng = khai
thêm serial vào bảng Thiết bị, trỏ về cùng tên miền.

Đúng **một điều** phải kiểm soát: **PIN của một người phải giống nhau trên mọi máy.**

PIN chính là danh tính; serial máy không tham gia việc nhận diện. Nếu VP2 khai anh A là
PIN 1 trong khi VP1 đã có anh B là PIN 1, mọi lần quẹt của anh A ở VP2 sẽ cộng vào công
của anh B — hệ thống không có cách nào biết. Ràng buộc `pin_may unique` chỉ chặn được việc
gán trùng *trong phần mềm*, không chặn được người khai máy bấm nhầm.

→ Chia dải PIN theo văn phòng ngay từ đầu: VP1 `1001–1999`, VP2 `2001–2999`, VP3
`3001–3999`. Người đi công tác giữ nguyên PIN gốc ở mọi máy.

Hai điểm nữa khi mở thêm máy:

- Khuôn mặt / vân tay **không** liên thông — mỗi máy giữ template riêng, nên người làm liên
  văn phòng phải đăng ký sinh trắc ở từng máy (hoặc copy template bằng phần mềm ZKTeco).
  Nút "Nạp NV" chạy từng máy một: ba văn phòng là ba lần nạp.
- Bấm **"Đồng bộ giờ"** cho từng máy. Lệch đồng hồ giữa các máy là nguyên nhân sai công
  phổ biến nhất, và càng nguy hiểm khi giờ vào / giờ ra do hai máy khác nhau ghi.

## 4. Các endpoint máy gọi tới

Chỉ để tham khảo khi soi log — người dùng không cần gọi tay.

| Endpoint | Ý nghĩa |
|---|---|
| `POST /iclock/registry?SN=..` | Đăng ký máy. Chỉ firmware PUSH 3.x gọi — xem ghi chú dưới |
| `GET /iclock/cdata?SN=..&options=all` | Handshake. Máy chủ trả block cấu hình + `Realtime=1` |
| `POST /iclock/cdata?SN=..&table=ATTLOG` | Đẩy log chấm công |
| `POST /iclock/cdata?SN=..&table=OPTIONS` | Báo thông tin máy (firmware, IP) |
| `GET /iclock/getrequest?SN=..` | Máy hỏi có lệnh gì không (firmware PUSH 2.x) |
| `POST /iclock/push?SN=..` | Máy hỏi có lệnh gì không (firmware PUSH 3.x) |
| `POST /iclock/devicecmd?SN=..` | Máy báo kết quả thực thi lệnh |

> **Firmware PUSH 3.x** (chuỗi truy vấn có `pushver=3.x` và `DeviceType=acc` — dòng SenseFace
> 2A chẳng hạn) **bắt buộc** gọi `POST /iclock/registry` thành công trước khi chịu làm việc.
> Máy chủ trả `RegistryCode=<mã>`. Thiếu endpoint này thì máy lặp vô tận
> `cdata → registry → chờ → lặp lại` mỗi `ErrorDelay` giây và **không bao giờ đẩy ATTLOG** —
> nhìn log chỉ thấy máy gọi đều đặn nên rất dễ tưởng là đã chạy tốt.
>
> Firmware PUSH 3.x cũng **không gọi `getrequest`** — nó hỏi lệnh bằng `POST /iclock/push`.
> Hai đường dùng chung hàng đợi nên một lệnh chỉ đi xuống đúng một lần.

Dữ liệu ATTLOG là **text thô phân tách bằng TAB**, không phải JSON:

```
PIN⇥yyyy-MM-dd HH:mm:ss⇥Status⇥Verify⇥WorkCode
1001⇥2026-08-06 08:03:12⇥0⇥15⇥0
```

- **Status**: `0` vào · `1` ra · `2` ra nghỉ · `3` vào sau nghỉ · `4` vào tăng ca · `5` ra tăng ca
- **Verify**: `1` vân tay · `4` thẻ · `15` khuôn mặt · `25` lòng bàn tay

Máy gửi **giờ địa phương không kèm múi giờ**. Máy chủ gắn múi giờ theo
`DEVICE_TZ_OFFSET_HOURS` (mặc định `7`). Đặt sai biến này thì toàn bộ giờ công lệch.

## 5. Xử lý sự cố

### Máy hiện "Mất kết nối" trong webapp

Theo thứ tự:

1. **Ping thử từ máy chủ đến máy**: `ping <IP máy>`.
2. **Kiểm tra máy chủ có nhận được gì không**:
   ```bash
   docker compose logs -f may_chu | grep iclock
   ```
   - Thấy dòng `may chua khai bao goi cdata` → **serial khai sai**. So lại từng ký tự.
   - Không thấy gì cả → máy không gọi tới được. Sang bước 3.
3. **Firewall / cổng**: từ một máy khác cùng mạng chạy
   `curl http://<IP máy chủ>:8080/health`. Không ra JSON thì cổng 8080 đang bị chặn.
4. **Trên máy**: xem lại Server Address có bị nhập kèm `http://` hoặc dấu `/` ở cuối.

Máy chấm công **vẫn lưu log nội bộ khi mất kết nối** và tự đẩy bù khi kết nối lại, nên
mất mạng vài giờ không làm mất dữ liệu chấm công.

### Log về nhưng không vào bảng công của ai

Webapp → **Nhật ký quẹt** → khối "PIN chưa gán cho nhân viên nào".

Nguyên nhân: PIN trên máy khác PIN khai trong hệ thống. Cách xử lý:

1. Sửa PIN của nhân viên ở trang **Nhân viên** cho khớp máy.
2. Về **Nhật ký quẹt**, bấm **"Gán lại"** — hệ thống chuyển toàn bộ lần quẹt cũ của PIN
   đó sang nhân viên và tính lại bảng công những ngày liên quan.

### Giờ công lệch so với thực tế

Nguyên nhân phổ biến nhất là **đồng hồ máy chạy sai**. Webapp → **Máy chấm công** →
**"Đồng bộ giờ"**. Máy nhận lệnh ở lần kết nối kế tiếp (dưới 10 giây).

Nếu lệch đúng một số giờ tròn (ví dụ đúng 7 tiếng) thì kiểm tra
`DEVICE_TZ_OFFSET_HOURS` trong `.env`.

### Nghi mất dữ liệu của một khoảng thời gian

Webapp → **Máy chấm công** → **"Gửi lại log"**. Máy sẽ đẩy lại các bản ghi nó còn giữ.
Bản ghi đã có sẽ tự bị bỏ qua nhờ khóa chống trùng, nên chạy nhiều lần vẫn an toàn.

### Lệnh gửi xuống máy không thực thi

**Máy chấm công** → **"Lịch sử lệnh"**:

- `đang chờ` quá lâu → máy chưa kết nối lại. Xử lý mất kết nối trước.
- `lỗi <mã>` → máy từ chối lệnh. Thường do PIN đã tồn tại hoặc bộ nhớ máy đầy.

## 6. Vì sao đường máy đẩy dữ liệu không dùng HTTPS

Nhiều firmware ZKTeco không hỗ trợ TLS, hoặc hỗ trợ nhưng từ chối chứng chỉ tự ký. Vì
vậy cổng nhận dữ liệu máy để HTTP thường. Cách bù lại tùy kiểu triển khai.

### A. Máy chủ trong LAN — an toàn sẵn

- Đặt máy chủ **cùng mạng LAN** với máy chấm công, **không** mở cổng 8080 ra Internet.
- Chỉ đưa **webapp** ra ngoài qua reverse proxy có HTTPS (Nginx/Caddy).
- Nhân viên dùng app điện thoại từ ngoài công ty thì đi qua chính reverse proxy HTTPS đó,
  không phải cổng 8080.

### B. Máy chủ trên VPS — phải khóa bằng danh sách IP

Máy ở văn phòng, máy chủ ở VPS thì `/iclock/*` **bắt buộc** phải mở ra Internet, và mở
bằng HTTP thường. Nghĩa là log chấm công đi qua Internet không mã hóa, và bất kỳ ai đoán
đúng số sê ri đều đẩy được bản ghi giả vào bảng công.

Hai lớp chặn, phải bật **cả hai**:

1. Số sê ri phải được khai trước (mục 2). Đây chỉ là bí mật yếu — số sê ri in trên máy.
2. **`ICLOCK_IP_CHO_PHEP` trong `.env`** — chốt chặn thật. Điền IP tĩnh công cộng của văn
   phòng; `/iclock/*` sẽ từ chối mọi nguồn khác:

   ```
   ICLOCK_IP_CHO_PHEP=203.0.113.45,198.51.100.0/24
   ```

   Nhận nhiều giá trị ngăn cách bằng dấu phẩy — đủ để khai nhiều văn phòng. Mỗi giá trị
   là một IPv4 kèm hoặc không kèm tiền tố CIDR, hoặc một IPv6 khớp chính xác (IPv6 chưa
   hỗ trợ CIDR). Điền sai định dạng thì máy chủ **không khởi động**, báo lỗi ngay — cố ý
   như vậy để cấu hình sai ở lớp bảo mật không im lặng trôi qua.

   Đổi `.env` xong chạy `docker compose up -d` là có hiệu lực; không cần `--build` vì đây
   chỉ là biến môi trường.

Để trống biến này thì `/iclock/*` nhận request từ **mọi địa chỉ IP**; máy chủ có ghi cảnh
báo vào log lúc khởi động, nhưng vẫn chạy.

Nếu văn phòng dùng Internet cáp quang hộ gia đình có IP động thì không dùng được cách này
— khi đó nên đặt VPN site-to-site giữa văn phòng và VPS, rồi trỏ máy chấm công vào IP nội
bộ của VPS qua VPN (quay về trường hợp A).

> Cảnh báo kèm theo: `ICLOCK_IP_CHO_PHEP` chỉ có tác dụng khi `PROXY_TIN_CAY` được đặt hẹp.
> Tin proxy ở dải quá rộng thì ai cũng gửi kèm `X-Forwarded-For: <IP văn phòng>` để đi qua
> danh sách trắng. Xem `.env.example` mục `PROXY_TIN_CAY`.

Xem [`TRIEN-KHAI.md`](TRIEN-KHAI.md) mục "Reverse proxy" để có cấu hình mẫu.
