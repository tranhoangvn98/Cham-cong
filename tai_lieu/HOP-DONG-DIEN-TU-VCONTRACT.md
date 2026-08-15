# Hợp đồng điện tử — vContract (Viettel)

Căn cứ: *Tài liệu đặc tả API tích hợp hệ thống hợp đồng điện tử vContract*, phiên bản
**v1.0.11**, Tổng công ty Viễn thông Viettel.

> Tài liệu gốc của Viettel ghi **"lưu hành nội bộ"** nên **không** được sao chép vào kho mã
> này. Đây là bản ghi lại những gì mã nguồn phụ thuộc, để người bảo trì sau hiểu được hệ
> thống mà không phải đọc lại toàn bộ đặc tả. Khi Viettel phát hành bản mới, đối chiếu
> phần "Những chỗ dễ sai" bên dưới trước tiên.

---

## 1. Bật tính năng

Khai trong `.env` rồi `docker compose up -d` (không phải `restart` — biến môi trường chỉ
đọc lại khi dựng lại container):

```bash
VCONTRACT_URL=https://hopdongdientu.viettel.vn/scontract-web-api
VCONTRACT_USERNAME=<Viettel cấp>
VCONTRACT_PASSWORD=<Viettel cấp>
VCONTRACT_CP_CODE=<mã hệ thống Viettel cấp>
VCONTRACT_CP_ACCOUNT_CODE=VCONTRACT
VCONTRACT_TOKEN_CALLBACK=<tự sinh, xem dưới>
```

Để trống `VCONTRACT_URL` là **tắt hẳn** tính năng — phần còn lại của hệ thống chạy bình thường.

| Môi trường | Địa chỉ |
|---|---|
| Thật | `https://hopdongdientu.viettel.vn/scontract-web-api` |
| Thử | `https://chungtudientu.viettel.vn/scontract-web-api` |

`VCONTRACT_CP_ACCOUNT_CODE` nhận `VCONTRACT` (có chứng thực) hoặc `SCONTRACT` (không chứng
thực). Khai sai thì **vẫn đăng nhập được** nhưng hợp đồng vào nhầm phiên bản — lỗi này chỉ
lộ ra khi đã lập hợp đồng thật.

### Token callback

vContract gọi ngược về hệ thống này để báo trạng thái. Đường `/vcontract/*` nằm **ngoài**
lớp đăng nhập nên phải tự bảo vệ bằng một token dùng chung:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Khai cùng giá trị đó với Viettel. **Để trống = từ chối mọi callback** — cố ý: không có
token thì bất kỳ ai cũng đổi được trạng thái hợp đồng lao động.

Hai đường phải khai với Viettel:

```
POST https://<tên-miền>/chamcong/vcontract/receive-result-request
POST https://<tên-miền>/chamcong/vcontract/receive-result-contract
```

---

## 2. Những chỗ dễ sai

Bốn điều dưới đây là lý do mã nguồn trông "thừa" ở vài chỗ. Đừng dọn chúng đi.

### 2.1. Mọi phản hồi bọc base64

vContract **không** trả JSON. Nó trả một chuỗi base64; giải ra mới được JSON. Và trong JSON
đó, trường `data` lại là **một chuỗi JSON nữa** — hai lần phải giải.

Tệ hơn: tài liệu đưa ví dụ `data` ở dạng **không phải JSON hợp lệ** (khoá không có nháy kép):

```
{token: eyJhbGci...,tenantId:NTRm...,permissions:[0,1,2]}
```

Nên `doc_data()` có đường dự phòng `doc_cap_tho()`. Bỏ nó đi thì đăng nhập hỏng ngay bước đầu.

### 2.2. Phản hồi callback của **ta** cũng phải bọc base64

Khi vContract gọi về, hệ thống phải trả **base64 của** `{"message":"OK","success":true}`.

Trả JSON trần thì vContract coi là thất bại, **retry đúng 3 lần rồi bỏ**. Hợp đồng kẹt ở
trạng thái cũ và không có gì báo. Đây là lỗi im lặng nguy hiểm nhất của tích hợp này.

### 2.3. Thông báo đến theo **từng phần**

Một thông báo "khách hàng đã ký" **không** kèm `urlDownloadFile`. Ghi đè `null` lên là xoá
mất địa chỉ tệp đã nhận từ thông báo trước. Vì vậy mọi cột đều cập nhật bằng
`coalesce($n, cột)`.

### 2.4. `contractStatus` không phải lúc nào cũng có

Nhiều thông báo chỉ có `status` (`CUSTOMER_SIGNED`, `NEED_SIGN`…). `suy_trang_thai()` suy
ra trạng thái từ `status` khi thiếu, và **trả `null` khi không suy được** — giữ trạng thái
cũ còn hơn ghi đè bằng một phỏng đoán.

---

## 3. Luồng ký

```
1. Tải tệp hợp đồng lên      POST /api/integration/upload/files      -> path
2. Lập hợp đồng              POST /api/integration/input-contract    -> DRAFT
3. Bắt đầu luồng ký          GET  /api/integration/start-sign-flow   -> PROCESSING
4. Các bên ký                (vContract gửi thư mời, gọi callback về ta)
5. Hoàn tất                  callback status=MOIT_DONE               -> FINISHED
6. Tải bản đã ký             GET  /api/integration/get-files
```

Bước 4 có thể kéo dài nhiều ngày. Hệ thống **không** hỏi liên tục; nó chờ callback. Nếu
nghi callback thất lạc, có đường hỏi chủ động:

```
GET /api/integration/get-contract-result?requestCode=..&contractCode=..
```

### Trạng thái hợp đồng

| Mã | Nghĩa |
|---|---|
| `DRAFT` | Đã lập, chưa bắt đầu ký |
| `PROCESSING` | Đang trong luồng ký |
| `FINISHED` | Hoàn tất — hợp đồng lao động tự chuyển sang **hiệu lực** |
| `REJECTED` | Có bên từ chối ký |
| `CANCEL` | Đã huỷ hoặc bị xoá |

---

## 4. Lưu trữ

| Bảng | Giữ gì |
|---|---|
| `hop_dong_dien_tu` | Mã yêu cầu, mã hợp đồng, trạng thái, địa chỉ tải bản đã ký |
| `nhat_ky_vcontract` | **Toàn bộ** trao đổi hai chiều: ta gọi đi và vContract gọi về |

Nhật ký giữ đầy đủ là có chủ đích. Hợp đồng lao động là chứng cứ pháp lý; khi có tranh chấp
về *"ai ký lúc nào"*, thứ trả lời được là nhật ký chứ không phải trạng thái hiện tại của
một dòng trong bảng.

**Thân yêu cầu đăng nhập không bao giờ được ghi** — nó chứa mật khẩu. Chỗ đó ghi
`(đã ẩn: chứa mật khẩu)`.

> ⚠️ **Địa chỉ tải bản đã ký có hạn.** vContract giữ bản gốc, nhưng mất quyền truy cập dịch
> vụ là mất hợp đồng nếu không tự giữ một bản. Sau khi ký xong phải tải về và lưu vào
> `ho_so_tep` — cột `tep_da_ky_id`.

---

## 5. Kiểm thử

Bộ giải mã giao thức có 16 bài kiểm thuần (`may_chu/test/vcontract.test.ts`). Chuỗi base64
trong bài *"login thật"* **chép nguyên từ đặc tả v1.0.11 mục III.1** — đọc được chuỗi đó
nghĩa là đọc được phản hồi thật.

Luồng callback có 13 bài e2e: xác thực token, phản hồi base64, cập nhật từng phần, trạng
thái lạ, mã không khớp hồ sơ nào.

Chạy:

```bash
npm test                                   # gồm bộ giải mã giao thức
npm --workspace may_chu run test_e2e       # gồm luồng callback
```
