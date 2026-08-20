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

**Hệ thống cấp số, máy làm theo — không bao giờ ngược lại.**

Trước bản `1.32.3`, nhân sự tự nghĩ ra PIN rồi gõ vào phần mềm và hy vọng nó khớp với số đã khai
trên máy. Với một máy thì không sao; với nhiều máy thì đó là đường chắc chắn đến chấm công sai
tên, vì PIN **là** danh tính và hệ thống tra PIN ra người trên phạm vi toàn công ty chứ không lọc
theo máy.

Ba việc, đúng thứ tự:

1. **Trên webapp** — mở hồ sơ nhân viên → thẻ *Mã ở các hệ thống* → **Cấp PIN** → chọn máy. Hệ
   thống lấy **số còn trống đầu tiên trong dải của máy đó**, cho xem trước rồi mới ghi.
2. **Tại máy** — tạo user với đúng `User ID` = số vừa cấp. Hoặc bấm **Nạp NV** ở trang Thiết bị
   để hệ thống tạo sẵn user (PIN + tên) trên máy.
3. **Tại máy** — nhân viên **đăng ký khuôn mặt / vân tay trực tiếp**. Sinh trắc học không thể nạp
   từ xa.

Nút **"Nạp NV"** chỉ tạo sẵn user (PIN + tên) trên máy để nhân viên khỏi phải tự tạo — vẫn
phải ra máy đăng ký khuôn mặt.

### Dải PIN của từng máy

Khai lúc thêm máy (**Thiết bị → Khai báo máy → Dải PIN**): VP1 `1001–1999`, VP2 `2001–2999`.
Nhìn PIN là biết máy nào, và hai nơi không bao giờ cấp trùng số cho hai người khác nhau. Để
trống thì cấp từ 1 trở lên.

Bộ cấp phát lấy **số còn trống đầu tiên**, không phải `lớn nhất + 1`: PIN của người đã nghỉ được
thu hồi sẽ để lại lỗ trống, và tái sử dụng lỗ đó là đúng — dải PIN của một văn phòng hữu hạn. Nó
cũng tránh cả số đang nằm ở cột cũ `nhan_vien.pin_may`, không chỉ số trong bảng mã định danh.

Dải đầy thì báo rõ và **không tràn sang dải máy khác** — tràn ra là dẫm vào đúng thứ mà dải sinh
ra để tránh.

Tên hiển thị trên máy bị bỏ dấu tự động vì màn hình máy ZKTeco chỉ hiện được ASCII.

### Nhiều văn phòng, nhiều máy

Dữ liệu **liên thông sẵn**: máy chỉ đẩy lên PIN + mốc giờ, hệ thống tra PIN ra nhân viên
trên phạm vi toàn công ty chứ không lọc theo máy; bộ tính công cũng chỉ gom theo nhân viên
và ngày. Một người vào ca ở VP1 và tan ca ở VP3 vẫn được ghép thành **một ngày công liền
mạch**. Serial máy chỉ dùng để biết quẹt ở đâu và để chống trùng. Thêm văn phòng = khai
thêm serial vào bảng Thiết bị, trỏ về cùng tên miền.

Đúng **một điều** phải kiểm soát: **PIN phải duy nhất trên phạm vi TOÀN CÔNG TY**, không
phải trên từng máy.

PIN chính là danh tính; serial máy không tham gia việc nhận diện. Nếu VP2 khai anh A là
PIN 1 trong khi VP1 đã có anh B là PIN 1, mọi lần quẹt của anh A ở VP2 sẽ cộng vào công
của anh B — hệ thống không có cách nào biết đó là hai người.

→ Chia dải PIN theo văn phòng ngay từ đầu: VP1 `1001–1999`, VP2 `2001–2999`, VP3
`3001–3999`.

**Một người ĐƯỢC nhiều PIN** (từ bản `1.32.0`): bảng mã định danh giữ nhiều PIN cho cùng một
người, mỗi máy một PIN nếu dải số đã chia sẵn. Cả hai PIN đều chấm công đúng người, và bảng
công vẫn gộp thành một ngày liền mạch. Trước đó cột `pin_may` chỉ chứa được một, nên PIN thứ
hai quẹt vào không khớp ai.

Khi nạp nhân viên xuống máy, hộp thoại **"Nạp NV"** hỏi **nạp PIN nào** nếu người đó có nhiều
PIN — nạp nhầm PIN của máy khác thì họ quẹt vào máy này sẽ không khớp được ai, và không có gì
báo: lần quẹt nằm đó với `nhan_vien_id` trống.

Ai đang giữ một PIN thì tra ở **Cài đặt → Mã định danh → Tra cứu** — kể cả PIN đã đóng lại.
Xem [`MA-DINH-DANH.md`](MA-DINH-DANH.md).

Hai điểm nữa khi mở thêm máy:

- Khuôn mặt / vân tay **không** liên thông — mỗi máy giữ template riêng, nên người làm liên
  văn phòng phải đăng ký sinh trắc ở từng máy (hoặc copy template bằng phần mềm ZKTeco).
  Nút "Nạp NV" chạy từng máy một: ba văn phòng là ba lần nạp.
- Bấm **"Đồng bộ giờ"** cho từng máy. Lệch đồng hồ giữa các máy là nguyên nhân sai công
  phổ biến nhất, và càng nguy hiểm khi giờ vào / giờ ra do hai máy khác nhau ghi.

## 3b. Kiểm tra cấu hình đã tới VPS chưa

Điền thông tin máy trên web **là ghi thẳng vào cơ sở dữ liệu trên VPS** — không có hàng đợi,
không có bước đồng bộ nào ở giữa. Ba cách kiểm, từ nhẹ đến chắc:

**1. Xem trên web.** Trang **Thiết bị** hiện dòng máy vừa khai. Có dòng đó nghĩa là VPS đã
nhận — trang này đọc trực tiếp từ cơ sở dữ liệu, không có cache.

**2. Hỏi thẳng cơ sở dữ liệu trên VPS:**

```bash
cd /root/Cham-cong && docker compose exec -T postgres psql -U chamcong -d chamcong -c \
  "select serial, ten, vi_tri, dang_bat, dia_chi_ip, thay_lan_cuoi,
          (select count(*) from lenh_thiet_bi l
            where l.thiet_bi_serial = t.serial and l.gui_luc is null) as lenh_cho
     from thiet_bi t order by ten;"
```

- `thay_lan_cuoi` **trống** = máy chưa gọi tới VPS lần nào → việc còn lại là **cấu hình trên
  chính máy** (Menu › Comm › Cloud Server), không phải trên web.
- `dia_chi_ip` cho biết máy ra Internet bằng IP nào — chính con số cần thêm vào
  `ICLOCK_IP_CHO_PHEP`.
- `lenh_cho > 0` = có lệnh đang chờ máy đến lấy. Máy online thì con số này về 0 trong khoảng
  10 giây.

**3. Giả lập một máy, không cần cắm máy thật.** Đây là cách chắc nhất — nó đi hết chặng
handshake → đẩy log → tính bảng công → lấy lệnh:

```bash
# Khai serial GIA-LAP-001 trên web trước, rồi:
node trien_khai/gia_lap_may.mjs --may-chu https://<tên-miền>/chamcong --serial GIA-LAP-001 --pin 1001
```

Chạy xanh nghĩa là toàn bộ đường dữ liệu đã thông; phần còn lại chỉ là cấu hình mạng của máy
thật.

### Cái gì đi từ VPS xuống máy, cái gì không

Đây là chỗ hay hiểu ngược. Giao thức ADMS là **máy tự gọi lên**, VPS không gọi xuống được:

| Thông tin | Có xuống máy không |
|---|---|
| Tên máy, vị trí, bật/tắt (điền trên web) | **Không.** Chỉ dùng ở phía hệ thống — máy không cần biết |
| Địa chỉ máy chủ, cổng, chế độ ADMS, Realtime | **Không.** Phải gõ **trên chính máy** |
| Nhịp gửi, `Realtime`, múi giờ (khối OPTIONS) | **Có**, tự động ở mỗi lần máy handshake |
| Đồng hồ máy (nút *Đồng bộ giờ*) | **Có**, qua hàng đợi lệnh |
| User + tên theo PIN (nút *Nạp NV*) | **Có**, qua hàng đợi lệnh |
| Khuôn mặt / vân tay | **Không bao giờ.** Phải đăng ký tại từng máy |

Lệnh không đi ngay: nó nằm ở `lenh_thiet_bi` và máy **đến lấy** ở lần kết nối kế tiếp — dưới
10 giây với máy đang online, và **nằm chờ mãi** nếu máy đang tắt. Nút *Xem lệnh* trong trang
Thiết bị cho biết lệnh nào đã gửi, mã trả về là bao nhiêu.

### Thêm máy thứ hai: đúng bốn việc

1. **Trên web**: Thiết bị → khai serial (số SN dán sau lưng máy).
2. **Trên máy**: Menu › Comm › Cloud Server — địa chỉ VPS, cổng `8080`, Server Mode `ADMS`,
   Realtime **bật**, Proxy **tắt**.
3. **Trong `.env` của VPS**: thêm IP ra Internet của nơi đặt máy vào `ICLOCK_IP_CHO_PHEP`
   (danh sách, phân cách bằng dấu phẩy), rồi `docker compose up -d`. Bỏ trống ô này nghĩa là
   **không chặn IP nào** — ai biết serial cũng đẩy được lần quẹt giả vào cơ sở tính lương.
4. **Bấm *Đồng bộ giờ*** cho máy mới. Lệch đồng hồ giữa hai máy là nguyên nhân sai công phổ
   biến nhất, và nguy hiểm hơn khi giờ vào / giờ ra do hai máy khác nhau ghi.

### Nạp lại dữ liệu từ một máy cũ

Đấu một máy **đã dùng ở nơi khác** vào hệ thống để lấy log cũ còn trong bộ nhớ nó. Khác hẳn "thêm
máy thứ hai": máy này mang theo **dãy PIN của riêng nó**, và đó là chỗ hỏng được.

**PIN 5 trên máy cũ không phải PIN 5 trên máy đang chạy.** Số PIN do từng máy cấp; hệ thống chỉ
thấy chuỗi `"5"`. Nạp mà không đối chiếu trước là cộng công của người này cho người kia — và
không có gì báo, vì với phần mềm thì cả hai đều là "PIN 5".

Thứ tự đúng, **đối chiếu trước khi cắm**:

1. **Lấy danh sách người trên máy cũ trước.** Ngay trên máy: Menu › User Mgt — đọc từng PIN và
   tên. Hoặc xuất ra USB: Menu › USB › Download › User Data. Cần một bảng *PIN cũ → người thật*
   **do người biết việc xác nhận**, không phải suy từ số.
2. **Khai máy cũ vào hệ thống** (Thiết bị → serial của nó). Chưa khai thì `/iclock` trả `401` và
   máy không đẩy được gì — đó là hàng rào, không phải lỗi.
3. **Thêm IP nơi đặt máy vào `ICLOCK_IP_CHO_PHEP`** nếu ô này đang có giá trị, rồi
   `docker compose up -d`.
4. **Đồng bộ giờ** cho máy cũ **trước khi** nó đẩy log. Đồng hồ máy cũ có thể lệch hàng tháng;
   log về với dấu thời gian sai thì bảng công sai theo và sửa rất mệt.
5. **Cắm mạng.** Máy tự đẩy: handshake trả `ATTLOGStamp=None` nên nó gửi lại mọi bản ghi nó cho
   là chưa đồng bộ. Không thấy gì thì bấm **Gửi lại log**, rồi **Lấy log cũ** — xem ngay dưới.
6. **Đối chiếu ở *Nhật ký quẹt* → "PIN chưa gán cho nhân viên nào".** Bảng liệt kê theo từng
   **(PIN, máy)** kèm *lần đầu* / *lần cuối* — đối chiếu với bảng ở bước 1.
7. **Gán từng dòng.** Hộp thoại *Gán lại* nói rõ nó chỉ chuyển lần quẹt **của máy đó**. Cùng số
   PIN ở máy khác không bị ảnh hưởng.

Hai điều làm việc này an toàn hơn nó trông:

- **Khóa chống trùng có cả serial** (`may|<serial>|<PIN>|<thời điểm>|<trạng thái>`). Nên log của
  máy cũ không đè log máy đang chạy, và **đẩy lại nhiều lần vẫn an toàn**.
- **PIN chưa map thì lần quẹt VẪN được lưu**, chỉ là `nhan_vien_id` để trống. Không mất dữ liệu
  vì chưa khai kịp; gán sau vẫn tính bù được bảng công.

Điều **không** an toàn: gán sai người rồi phát hiện muộn. Lúc đó lần quẹt đã mang `nhan_vien_id`
nên nó không còn nằm trong danh sách "chưa gán" để sửa bằng một cú bấm nữa.

> `POST /api/lan-quet/gan-lai` **từ chối** khi cùng một PIN đang có bản ghi chưa gán ở nhiều máy
> mà không nói rõ máy nào — thay vì đoán. Thông báo lỗi liệt kê từng máy kèm số lần.

#### "Gửi lại log" trả về 0 bản ghi — vì sao, và làm gì

**Con trỏ *đã đồng bộ tới đâu* nằm TRONG MÁY, không nằm ở hệ thống này.** Nút *Gửi lại log* gửi
lệnh `CHECK`, tức là hỏi máy *"còn gì CHƯA GỬI không"*. Một máy từng nối vào máy chủ ADMS khác có
thể đã đánh dấu toàn bộ log là **đã gửi** — lúc đó `CHECK` trả về 0 bản ghi. Không phải hỏng: máy
tin rằng nó không còn gì. Đổi địa chỉ máy chủ thường làm máy quên con trỏ đó, nhưng **tùy
firmware**, không có gì bảo đảm.

Cho đúng trường hợp này có nút **Lấy log cũ** (Thiết bị → máy → *Lấy log cũ*). Nó gửi
`DATA QUERY ATTLOG StartTime=… EndTime=…` — **không** hỏi "còn gì chưa gửi" mà hỏi *"đưa tôi log
từ ngày A đến ngày B"*, nên không phụ thuộc con trỏ.

Chọn khoảng rộng cũng được: bản ghi trùng tự bị bỏ qua nhờ khóa chống trùng, nên chạy nhiều lần
vẫn an toàn.

Hỗ trợ **tùy firmware**. Máy không hiểu thì *Lịch sử lệnh* hiện `lỗi <mã>` — khi đó dùng đường USB
ở dưới.

> Không có đường API nào gửi **lệnh tự do** xuống máy, và đó là cố ý: hai mốc ngày đi qua bộ kiểm
> `YYYY-MM-DD` rồi mới được ghép vào chuỗi lệnh. Một route "gửi lệnh bất kỳ" sẽ tiện hơn nhiều, và
> cũng là một đường cho phép đặt `CLEAR DATA` xuống máy chấm công. Có bài kiểm soi mã nguồn để
> `xep_lenh` không bao giờ nhận chuỗi lấy từ thân yêu cầu.

**Nếu máy cũ vẫn không chịu đẩy** (firmware quá cũ, hoặc bộ nhớ đã bị xóa): xuất log ra USB —
Menu › USB › Download › Attendance Data — rồi *Nhật ký quẹt* → **Nhập lịch sử từ file**, và ở ô
*"Ghi nhận là của máy"* **chọn đúng máy cũ**. Chọn đúng máy thì khóa chống trùng khớp với bản ghi
máy đã đẩy (nếu sau này nó đẩy được), nên không tạo bản sao.

### Bỏ một máy đã ngừng dùng

**Tắt trước, rồi Xóa** — nút Xóa chỉ hiện khi máy đã tắt. Hai bước là cố ý: xóa một máy đang chạy
thì nó bắt đầu ăn `401` và không ai biết vì sao.

Xóa **giữ nguyên lịch sử lần quẹt**: `lan_quet.thiet_bi_serial` là chữ tự do không có khóa ngoại,
nên bảng công cũ không đổi và vẫn trả lời được *"lần quẹt này từ máy nào"*. Chỉ bản ghi khai báo
máy và các lệnh chưa gửi bị xóa — đúng những thứ hết nghĩa khi máy không còn.

## 4. Các endpoint máy gọi tới

Chỉ để tham khảo khi soi log — người dùng không cần gọi tay.

| Endpoint | Ý nghĩa |
|---|---|
| `POST /iclock/registry?SN=..` | Đăng ký máy. Chỉ firmware PUSH 3.x gọi — xem ghi chú dưới |
| `GET /iclock/cdata?SN=..&options=all` | Handshake. Máy chủ trả block cấu hình + `Realtime=1` |
| `POST /iclock/cdata?SN=..&table=ATTLOG` | Đẩy log chấm công (firmware PUSH 2.x) |
| `POST /iclock/cdata?SN=..&table=rtlog` | Đẩy log chấm công (firmware PUSH 3.x) |
| `POST /iclock/cdata?SN=..&table=rtstate` | Nhịp tim trạng thái máy — bỏ qua |
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
>
> Và nó **không đẩy `ATTLOG`** — chấm công về bằng `table=rtlog`, định dạng cặp
> `khoa=giá trị` chứ không phải cột phân tách bằng TAB:
> `time=2026-08-14 15:28:03⇥pin=123456⇥inoutstatus=0⇥verifytype=15`.
> Dòng có `pin=0` là sự kiện của cửa (mở bằng nút, báo động), không phải người quẹt.

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
2. Về **Nhật ký quẹt**, bấm **"Gán lại"** — hệ thống chuyển lần quẹt cũ của PIN đó **trên đúng
   máy bạn bấm** sang nhân viên, và tính lại bảng công những ngày liên quan. Cùng số PIN ở máy
   khác **không** bị ảnh hưởng: mỗi máy cấp số PIN riêng nên cùng một số có thể là hai người.

### Giờ công lệch so với thực tế

Nguyên nhân phổ biến nhất là **đồng hồ máy chạy sai**. Webapp → **Máy chấm công** →
**"Đồng bộ giờ"**. Máy nhận lệnh ở lần kết nối kế tiếp (dưới 10 giây).

Nếu lệch đúng một số giờ tròn (ví dụ đúng 7 tiếng) thì kiểm tra
`DEVICE_TZ_OFFSET_HOURS` trong `.env`.

### Nghi mất dữ liệu của một khoảng thời gian

Webapp → **Máy chấm công** → **"Gửi lại log"**. Máy sẽ đẩy lại các bản ghi nó cho là chưa đồng bộ.
Bản ghi đã có sẽ tự bị bỏ qua nhờ khóa chống trùng, nên chạy nhiều lần vẫn an toàn.

Trả về **0 bản ghi** thì dùng **"Lấy log cũ"** với khoảng ngày cụ thể: `CHECK` hỏi *"còn gì chưa
gửi"* và con trỏ đó nằm trong máy, còn `DATA QUERY ATTLOG` hỏi thẳng theo ngày. Chi tiết ở mục
*Nạp lại dữ liệu từ một máy cũ*.

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
