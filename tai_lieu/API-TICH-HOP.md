# API tích hợp — `/api/v1`

Cổng dành cho **hệ thống ngoài** gọi vào: ERP/kế toán, phần mềm nhân sự khác, cổng thông tin
nội bộ tự viết. Máy gọi máy, không có ai ngồi trước màn hình.

Khác với `/api/*` (dành cho webapp và app điện thoại của chính hệ thống này) ở ba điểm, và
cả ba đều có lý do:

| | `/api/*` | `/api/v1/*` |
|---|---|---|
| Xác thực | JWT, sống 15 phút, gắn với **một người** | **Khóa API**, sống lâu, gắn với **một bên tích hợp** |
| Phiên bản | không — đổi được bất cứ lúc nào | có `/v1` — đổi hình dạng phải mở `/v2` |
| Hình dạng phản hồi | tùy từng đường | **cố định**, xem dưới |

Định danh đối ngoại là **`ma_nv`**, không phải `id`. UUID nội bộ không được lộ ra ngoài — bên
tích hợp gắn vào UUID rồi ta đổi cơ sở dữ liệu là họ hỏng hết.

---

## 0. Tài liệu máy đọc được

| Thứ | Đường dẫn |
|---|---|
| **Swagger UI** — bấm thử được ngay trên trình duyệt | `<GỐC>/api/v1/tai-lieu/` |
| **Spec OpenAPI 3.1** — dán vào bộ sinh client | `<GỐC>/api/v1/openapi.json` |

> **`<GỐC>` là gì:** tùy cách triển khai. Đặt webapp dưới một tiền tố (ví dụ `/chamcong/`)
> thì gốc là `https://tên-miền/chamcong`; đặt ở gốc tên miền thì là `https://tên-miền`.
> Không phải đoán: mở trang **Khóa API** trên webapp, ở đó hiện sẵn hai đường dẫn đầy đủ để
> chép đi. Chép nhầm thiếu tiền tố là nhận 404.

Cả hai **không cần khóa**: chúng chỉ bày ra hợp đồng (tên đường dẫn, tham số, ý nghĩa), không
bày ra dữ liệu. Muốn gọi thật vẫn phải có khóa API. Đưa đường dẫn cho bên tích hợp là họ tự
đọc được, không phải gửi file qua lại. Không muốn lộ cả hợp đồng ra Internet thì đặt
`API_TAI_LIEU_CONG_KHAI=0` trong `.env`.

Từ spec sinh sẵn thư viện gọi API:

**Cách không cần cài gì** — dùng Docker:

```bash
docker run --rm -v "$PWD:/local" openapitools/openapi-generator-cli generate \
  -i https://tên-miền/chamcong/api/v1/openapi.json \
  -g java -o /local/client-cham-cong
```

**Cách qua npx** — cần **Java 11+** đã cài sẵn trên máy, vì `openapi-generator` là công cụ
Java; `npx` chỉ tải phần vỏ gọi:

```bash
java -version   # không ra gì thì cài JDK trước
npx @openapitools/openapi-generator-cli generate \
  -i https://tên-miền/chamcong/api/v1/openapi.json \
  -g java -o ./client-cham-cong
```

Thay `-g java` bằng `csharp`, `python`, `go`, `php`, `typescript-axios`… tùy ngôn ngữ bên kia.

Chạy ở đâu: **trên máy của bên tích hợp**, không phải trên VPS chấm công. VPS chỉ cần phục vụ
file spec; sinh mã là việc của phía họ.

Postman và Insomnia nhập trực tiếp được URL spec, không cần Java lẫn Docker.

**Tài liệu sinh từ chính mã nguồn, không viết tay.** Thêm đường dẫn mới vào `/api/v1` mà quên
mô tả thì **máy chủ không khởi động** — nên spec không thể trôi khỏi thực tế.

---

## 1. Lấy khóa API

Webapp → **Tài khoản** → **Khóa API** → tạo mới. Chỉ **admin** làm được — cấp khóa API ngang
với cấp tài khoản quản trị.

Khi tạo phải chọn **phạm vi**. Không có phạm vi nào thì khóa không gọi được gì.

| Phạm vi | Cho phép |
|---|---|
| `nhan_vien:doc` | Đọc danh sách và chi tiết nhân viên |
| `nhan_vien:ghi` | Tạo / cập nhật nhân viên |
| `bang_cong:doc` | Đọc bảng công theo ngày và tổng hợp tháng |
| `lan_quet:doc` | Đọc log quẹt thô |
| `nghi_phep:doc` | Đọc đơn nghỉ phép đã duyệt |
| `ho_so:doc` | Đọc hồ sơ nhân sự |
| `su_kien:doc` | Đọc dòng sự kiện |

**Không có phạm vi ghi cho bảng công và lần quẹt.** Đây là bản ghi gốc để tính lương; cho hệ
thống ngoài ghi đè vào đó là mở đường sửa sổ chấm công từ bên ngoài mà không qua duyệt.

> **Khóa gốc chỉ hiện đúng một lần** lúc tạo. Cơ sở dữ liệu chỉ giữ mã băm SHA-256, không lấy
> lại được. Mất thì thu hồi và tạo cái mới.

Nên tạo **mỗi bên tích hợp một khóa riêng** với phạm vi tối thiểu. Dùng chung một khóa cho ba
hệ thống thì khi phải thu hồi, cả ba cùng chết.

Có thể khai thêm **`ip_cho_phep`** (danh sách IP hoặc dải CIDR, ngăn cách bằng dấu phẩy) — khóa
đó chỉ dùng được từ những địa chỉ ấy.

## 2. Gọi API

```
Authorization: Bearer ck_xxxxxxxxxxxxxxxxxxxx
```

Client cũ không đặt được header `Authorization` thì dùng `X-API-Key: ck_...`.

Kiểm tra khóa còn sống:

```bash
curl -H "Authorization: Bearer ck_..." \
  https://tên-miền/chamcong/api/v1/toi
```

```json
{ "du_lieu": { "ten": "ERP kế toán",
               "pham_vi": ["bang_cong:doc", "nhan_vien:doc"],
               "may_chu_luc": "2026-08-14T09:12:00.000Z" } }
```

## 3. Hình dạng phản hồi

**Danh sách** — luôn có `du_lieu` và `phan_trang`:

```json
{ "du_lieu": [ … ], "phan_trang": { "gioi_han": 100, "bo_qua": 0, "tong": 248 } }
```

Phân trang bằng `?gioi_han=&bo_qua=`.

**Một bản ghi**: `{ "du_lieu": { … } }`

**Lỗi** — luôn có `ma` và `thong_diep`:

```json
{ "loi": { "ma": "thieu_pham_vi",
           "thong_diep": "Khóa thiếu phạm vi: bang_cong:doc. …" } }
```

Đối chiếu bằng **`ma`**, đừng đối chiếu `thong_diep` — chữ tiếng Việt có thể sửa lại cho dễ
hiểu hơn mà không báo trước.

| `ma` | HTTP | Nghĩa |
|---|---|---|
| `thieu_khoa` | 401 | Không gửi header xác thực |
| `khoa_sai` | 401 | Khóa không tồn tại hoặc đã bị xóa |
| `khoa_da_tat` | 401 | Khóa bị tắt |
| `khoa_het_han` | 401 | Quá hạn dùng |
| `ip_khong_cho_phep` | 403 | Gọi từ IP ngoài danh sách của khóa |
| `thieu_pham_vi` | 403 | Khóa hợp lệ nhưng không đủ quyền cho đường này |
| `khong_co_duong_dan` | 404 | Đường dẫn không có trong v1 |

## 4. Các đường dẫn

### Nhân viên

```
GET  /api/v1/nhan-vien?tim=&gom_da_nghi=false&gioi_han=100&bo_qua=0
GET  /api/v1/nhan-vien/{ma_nv}
PUT  /api/v1/nhan-vien/{ma_nv}
```

`GET` mặc định **chỉ trả người đang làm**. Thêm `gom_da_nghi=true` để lấy cả người đã nghỉ —
hệ thống lương lấy nhầm người đã nghỉ là tính lương cho người không còn làm việc.

`PUT` là **upsert theo `ma_nv`**: chưa có thì tạo (bắt buộc `ho_ten`), có rồi thì cập nhật. Gọi
lại cùng một bản ghi không tạo thêm người mới, nên bên kia chạy lại lô đồng bộ thoải mái.

**Trường không gửi thì giữ nguyên**, không bị xóa trắng. Hệ thống nhân sự bên kia thường chỉ
biết một phần thông tin; gửi thiếu mà bị xóa mất `pin_may` là mất chấm công của người đó.

**Không có đường xóa.** Xóa nhân viên kéo theo toàn bộ lần quẹt và bảng công. Cho nghỉ việc thì
đặt `dang_hoat_dong: false` — dữ liệu cũ vẫn còn để đối chiếu về sau.

### Bảng công — đường ERP dùng nhiều nhất

```
GET /api/v1/bang-cong?tu=2026-08-01&den=2026-08-31&ma_nv=&gom_chua_chot=false
GET /api/v1/bang-cong/tong-hop?thang=2026-08&gom_chua_chot=false
```

Mặc định **chỉ trả ngày đã chốt**. Bảng công chưa chốt còn có thể đổi — nhân sự sửa tay, hoặc
có đơn nghỉ được duyệt muộn. Lấy bản chưa chốt về tính lương thì tính xong số liệu mới đổi.

`/bang-cong` trả **theo từng ngày** để bên kia tự áp quy tắc lương của họ.
`/bang-cong/tong-hop` cộng sẵn theo tháng cho ai không muốn tự cộng.

### Log quẹt thô

```
GET /api/v1/lan-quet?tu=&den=&ma_nv=
```

Khoảng ngày tối đa **92 ngày** một lần gọi — dữ liệu này rất dày.

### Nghỉ phép đã duyệt

```
GET /api/v1/nghi-phep?tu=&den=
```

Chỉ trả đơn **`da_duyet`**. Đơn chờ duyệt chưa phải sự thật.

### Dòng sự kiện (kéo về)

```
GET /api/v1/su-kien?tu_id=0&loai=&gioi_han=100
```

```json
{ "du_lieu": [ { "id": "1042", "loai_su_kien": "bang_cong.da_chot", "du_lieu": { … } } ],
  "id_cuoi": "1042", "con_nua": false }
```

Bên tích hợp tự lưu `id_cuoi` rồi lần sau truyền vào `tu_id`. Hệ thống **không giữ con trỏ cho
từng bên**, nên nhiều hệ thống cùng đọc một dòng sự kiện mà không đạp nhau.

Các loại sự kiện: `lan_quet.da_ghi`, `bang_cong.da_chot`, `nghi_phep.da_duyet`,
`thiet_bi.mat_ket_noi`, `thiet_bi.ket_noi_lai`.

Hết dữ liệu thì `id_cuoi` là `null` — **giữ nguyên con trỏ cũ**, đừng nhảy về 0.

## 5. Webhook đẩy ra (thay cho kéo về)

Đặt `ERP_WEBHOOK_URL` trong `.env` là hệ thống tự đẩy sự kiện sang, ký bằng HMAC. Cơ chế
**outbox**: sự kiện ghi cùng transaction với dữ liệu nghiệp vụ, một tiến trình nền đẩy sau —
bên nhận chết thì sự kiện nằm chờ chứ không mất.

Hiện chỉ hỗ trợ **một** URL. Nhiều bên nhận thì dùng `/api/v1/su-kien` ở trên, hoặc đặt một
dịch vụ trung gian nhận rồi phát tiếp.

## 6. Vận hành

**Mọi lần gọi vào `/api/v1` đều được ghi nhật ký**, kể cả lần bị từ chối 401/403. Xem ở
Webapp → **Tài khoản → Khóa API → Nhật ký**: đường dẫn, mã trả về, IP, thời gian phản hồi.
Bên tích hợp báo "hôm qua không lấy được dữ liệu" thì tra ở đây, không phải đôi co.

**Giới hạn tần suất** dùng chung với `/api/*`. Đồng bộ lô lớn thì chia nhỏ theo `gioi_han` và
gọi tuần tự, đừng bắn song song hàng trăm yêu cầu.

**Múi giờ**: mọi mốc thời gian trả về theo ISO 8601 có kèm offset. Trường `ngay` là ngày địa
phương dạng `YYYY-MM-DD`, không kèm giờ.

## 7. Thay đổi về sau

`/api/v1` là **hợp đồng**. Trong cùng `v1` chỉ được:

- **Thêm** trường mới vào phản hồi
- **Thêm** đường dẫn mới
- **Thêm** tham số truy vấn có giá trị mặc định

Xóa trường, đổi kiểu dữ liệu, đổi ý nghĩa mặc định — phải mở `/api/v2` và chạy song song hai
bản một thời gian. Vì vậy client nên **bỏ qua trường lạ** thay vì báo lỗi khi gặp trường chưa
biết.
