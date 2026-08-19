# Mã định danh: một người, nhiều hệ thống

Dữ liệu nhân sự vào hệ thống này từ nhiều nguồn, và **mỗi nguồn gọi cùng một người bằng một mã
khác**:

| Nguồn | Mã |
|---|---|
| Hệ thống chấm công này | `ma_nv` — `HR-01` |
| Máy chấm công ZKTeco | PIN — `7` |
| ERP cũ (`erp_logistic`) | `userId` — `147`, tài khoản `vinh`, mã nhân viên `E147` |
| Microsoft 365 (Entra ID) | Object ID — `3f2504e0-…`, email/UPN — `vinh@…` |

Trước bản `1.32.0`, mỗi mã là **một cột** trên `nhan_vien`. Cách đó vỡ ở bốn chỗ, và cả bốn đều
đã xảy ra trên dữ liệu thật:

1. **Một người một mã.** `pin_may` là một cột, nên một người không thể có PIN ở hai máy, và đăng
   ký lại PIN là ghi đè — mất dấu vết.
2. **Không có lịch sử.** PIN 1 chuyển từ người cũ sang người mới thì không còn vết nào nói những
   lần quẹt cũ thuộc ai.
3. **Mã Microsoft ổn định bị bỏ đi.** `id_token` có `oid` — mã không bao giờ đổi — và hệ thống
   trích nó ra rồi *không lưu*. Khớp người bằng `lower(email)`, nên đổi email trong Entra là mất
   khớp, và nếu tên miền nằm trong danh sách cho phép thì lần đăng nhập kế tiếp **tạo một tài
   khoản thứ hai** cho cùng một người.
4. **Thêm nguồn mới = thêm cột** + sửa mọi chỗ join. Nguồn nào chưa có cột thì không có chỗ lưu,
   nên nó nằm trong đầu người phụ trách.

Hậu quả thấy được: `ERP147` và `HR-01` là một người, `BGD` và `ERP4` là một người, và cả hai cặp
phải gộp bằng tay (xem [`GOP-HO-SO-TRUNG.md`](GOP-HO-SO-TRUNG.md)).

## Một dòng = một mã, ở một hệ thống, của một người, trong một khoảng thời gian

```sql
create table ma_dinh_danh (
  nhan_vien_id  uuid not null references nhan_vien(id) on delete cascade,
  he_thong      text not null,   -- 'may_cham_cong' | 'erp_cu' | 'microsoft_oid' | ...
  ma            text not null,   -- NGUYÊN VĂN như hệ thống kia trả về
  ma_chuan      text not null,   -- đã chuẩn hóa, chỉ dùng để so sánh
  hieu_luc_tu   timestamptz not null default now(),
  hieu_luc_den  timestamptz,     -- null = đang hiệu lực
  nguon         text not null,   -- ai/cái gì ghi dòng này
  ghi_chu       text
);

create unique index ma_dinh_danh_dang_hieu_luc_idx
  on ma_dinh_danh(he_thong, ma_chuan) where hieu_luc_den is null;
```

**Chống trùng do cơ sở dữ liệu bảo đảm.** Index bộ phận trên `hieu_luc_den is null`: một mã
*đang hiệu lực* thuộc đúng một người. Các dòng đã đóng lại thì tự do trùng nhau — đúng thế mới kể
lại được lịch sử một PIN đã qua tay ba người.

Đây là **index** chứ không phải **constraint**, vì Postgres không cho `unique constraint` có
`where`. Hệ quả cần biết: nó không xuất hiện trong `pg_constraint`, nên bộ gộp hồ sơ không "thấy"
nó. Không sao — bộ gộp chỉ đổi chủ sở hữu, và vì index này bảo đảm hai người không thể cùng mang
một mã đang hiệu lực, nên chuyển cả hai sang một người không thể chạm nhau.

**Hai cột `ma` và `ma_chuan`** chứ không một, vì hiển thị và so sánh là hai việc khác nhau:
`Vinh@THVN.com` phải hiện nguyên văn nhưng phải khớp với `vinh@thvn.com`.

## Bảng đặc tả các hệ thống

Khai một chỗ trong `may_chu/src/dinh_danh/he_thong.ts`, cả tầng dưới dùng theo. Thêm một hệ thống
là **thêm một mục trong bảng đó**, không phải một di trú.

| Hệ thống | Nhiều mã? | Ổn định? | Chuẩn hóa | Kiểm |
|---|---|---|---|---|
| `noi_bo` | không | không | chữ hoa | không rỗng |
| `may_cham_cong` | **có** | không | trim | chỉ chữ số |
| `erp_cu` | không | **có** | trim | số nguyên dương |
| `erp_cu_tai_khoan` | không | không | chữ thường | không rỗng |
| `erp_cu_ma` | không | không | chữ hoa | không rỗng |
| `microsoft_oid` | không | **có** | chữ thường | UUID |
| `microsoft_email` | **có** | không | chữ thường | dạng `a@b.c` |

**Nhiều mã là ngoại lệ, không phải mặc định.** Một người một mã ERP, một mã nội bộ. Còn PIN máy
(nhiều máy) và email Microsoft (alias trong Entra) thì nhiều là bình thường.

**Ổn định** nghĩa là mã không đổi, nên tin được để khớp người. `microsoft_oid` và `erp_cu` ổn
định; email và PIN thì đổi được nên chỉ dùng để tìm.

## Quy tắc quan trọng nhất: không âm thầm lấy mã của người khác

Đó là cách "trùng" xuất hiện — một mã đi từ người này sang người kia trong một lần chạy tự động,
và ba tháng sau không ai biết vì sao lần quẹt của ông A lại tính cho bà B.

Nên `gan_ma` **từ chối** khi mã đang thuộc người khác, và thông điệp nói rõ *ai*:

> PIN máy chấm công "1" đang thuộc HR-07 — Phan Song Hào. Một mã đang hiệu lực chỉ thuộc một
> người. Nếu đúng là cần chuyển sang người này, hãy xác nhận thu hồi.

Chỉ khi người gọi nói rõ là có ý (`thu_hoi_cua_nguoi_khac`) thì mã mới đổi chủ — và dòng cũ được
**đóng lại kèm ghi chú**, không bị xóa. Câu hỏi *"những lần quẹt tháng 6 bằng PIN 1 là của ai"*
trả lời được.

Với hệ thống **một mã**, gán mã mới cho *chính người đó* thì mã cũ được đóng lại — đổi email, đổi
mã nhân viên đều là chuyện thường, và mã cũ thành lịch sử chứ không biến mất.

## Mã bị dùng lại hoặc trùng thì xử lý thế nào

Bốn tình huống khác nhau, bốn cách xử lý khác nhau.

### 1. Cấp lại mã cho người khác (PIN 1 của người đã nghỉ → người mới)

Hệ thống **từ chối** lần đầu và nói rõ ai đang giữ. Xác nhận *Thu hồi mã này từ người đang giữ*
thì:

| Thứ | Sau khi thu hồi |
|---|---|
| Dòng của người cũ | **Đóng lại** (`hieu_luc_den = now()`) kèm ghi chú, **không xóa** |
| Dòng của người mới | Mở mới, đang hiệu lực |
| Cột `nhan_vien.pin_may` của người cũ | **Được gỡ** |
| Cột `nhan_vien.pin_may` của người mới | **Được ghi** |
| Lần quẹt **cũ** | Vẫn thuộc người cũ — lịch sử chấm công không bị viết lại |
| Lần quẹt **mới** | Thuộc người mới |
| Tra cứu `78003` | Ra **hai dòng**: người mới (đang dùng), người cũ (đã đóng) |

Hai dòng cột trong bảng là chỗ dễ bỏ sót nhất, và cũng là hậu quả nặng nhất nếu bỏ sót: bộ tiếp
nhận ADMS vẫn đọc `pin_may`, nên nếu cột còn trỏ người cũ thì **máy chấm công vẫn ghi công cho
người cũ, không báo gì**, và chỉ lộ ra vào ngày chốt lương. Từ bản `1.32.1` việc gỡ/ghi cột là
tự động trong cùng giao dịch với việc đổi mã.

**Lần quẹt cũ không bị đổi chủ, và đó là cố ý.** Chủ của một lần quẹt được xác định *lúc nhận*,
nên bảng công tháng trước không tự viết lại khi PIN sang tay người khác.

### 2. Một người có nhiều mã cùng lúc (PIN ở hai máy, email alias)

Chỉ `may_cham_cong` và `microsoft_email` cho phép. Cả hai mã **cùng hiệu lực**, và cả hai đều
khớp được người:

- Bộ tiếp nhận ADMS đọc **bảng trước, cột sau**, nên PIN thứ hai — thứ mà cột `pin_may` không
  chứa nổi — vẫn chấm công đúng người.
- Cột `pin_may` giữ **mã mới nhất**, chỉ còn là đường dự phòng.
- Với `microsoft_email`, thêm một alias **không** ghi đè cột `email`: cột chỉ được ghi khi đang
  trống, vì email chính là khóa đăng nhập Microsoft đường dự phòng.

### 3. Bảng và cột nói khác nhau

Không được phép, nhưng có thể xảy ra — một lần sửa tay trên cơ sở dữ liệu, hay một đường ghi còn
sót. Quy tắc: **bảng thắng**, và hệ thống ghi một dòng cảnh báo vào log:

```
[adms] PIN 5: bang dinh danh noi HR-01, cot pin_may noi ERP147. Dung bang.
       Chay doi soat ma dinh danh de biet vi sao lech.
```

Rồi **Hệ thống → Mã định danh → Đối soát** liệt kê mọi chỗ lệch, hai chiều. Mọi đường ghi đã biết
(form hồ sơ, đồng bộ ERP, nhập CSV, đăng nhập Microsoft) đều ghi cả hai nơi, nên báo cáo này sạch
là trạng thái bình thường — có dòng nào là có việc phải tìm.

### 4. Hai người thật cùng một mã trong dữ liệu cũ

`ma_erp` và `email` **không** có ràng buộc UNIQUE trên cột, nên trước khi có bảng này hai người
có thể cùng mang một mã ERP mà không ai biết. Lúc backfill, index bộ phận chỉ nhận **một** trong
hai, người còn lại không có mã đang hiệu lực — và **đối soát báo đúng chỗ đó**. Ai đúng thì người
xem quyết: gán lại cho người đúng (có xác nhận thu hồi), hoặc gộp hai hồ sơ nếu chúng thật ra là
một người ([`GOP-HO-SO-TRUNG.md`](GOP-HO-SO-TRUNG.md)).

Trường hợp `ma_erp` trùng khi **sửa hồ sơ**: cột vẫn lưu (không có ràng buộc), mã định danh không
gán được, và phản hồi kèm `canh_bao` nói rõ ai đang giữ. Hồ sơ **không** bị coi là lưu thất bại —
nó đã lưu xong.

### Việc gì hệ thống KHÔNG tự làm

- **Không tự chuyển mã** khi thấy trùng. Chuyển danh tính giữa hai con người luôn cần một người
  xác nhận.
- **Không viết lại lịch sử chấm công** khi mã sang tay.
- **Không xóa dòng mã** — chỉ đóng lại.
- **Không tự xóa mã rác trong cột cũ** (ví dụ họ tên nằm trong ô điện thoại): xóa dữ liệu đang có
  không phải việc nó tự quyết.

## Ai ghi vào bảng này

| Đường | Ghi mã gì | Khi nào |
|---|---|---|
| Nhân sự sửa hồ sơ | `noi_bo`, `may_cham_cong`, `erp_cu_ma`, `microsoft_email` | Tạo / sửa nhân viên |
| Đồng bộ ERP | `erp_cu`, `erp_cu_tai_khoan`, `microsoft_email` | Mỗi lượt Đồng bộ thật |
| Đăng nhập Microsoft | `microsoft_oid`, `microsoft_email` | Mỗi lần đăng nhập thành công |
| Di trú 025 | tất cả, từ các cột cũ | Một lần, lúc cập nhật |
| Nhập CSV nhân viên | `noi_bo`, `may_cham_cong`, `microsoft_email` | Mỗi lần nhập tệp |
| Trang Mã định danh | mọi hệ thống trừ `noi_bo` | Nhân sự gán tay |

Hai đường tự động (đồng bộ ERP, đăng nhập Microsoft) **không bao giờ được làm hỏng việc chính của
chúng** vì một mã trùng:

- Đồng bộ ERP chạy cả trăm người trong **một** giao dịch, nên xung đột một mã được **báo ra** ở
  cột *Chi tiết* của bảng kết quả rồi đi tiếp — nếm lỗi ở đó là rollback cả lượt đồng bộ.
- Đăng nhập Microsoft: người ta đã xác thực xong với Microsoft. Một mã trùng hay một lỗi cơ sở dữ
  liệu ở bước ghi nhớ danh tính **không** được biến thành "không đăng nhập được". Ghi log rồi đi
  tiếp.

## Đăng nhập Microsoft khớp `oid` trước email

Thứ tự: `oid` đã ghi nhớ → email đã gắn ở tài khoản → email của hồ sơ nhân viên.

`oid` đi ra từ `id_token` đã qua `kiem_id_token` (chữ ký, issuer, audience, nonce) nên nó đáng tin
ngang email — thật ra hơn, vì không ai đổi được nó. Xem
[`DANG-NHAP-MICROSOFT.md`](DANG-NHAP-MICROSOFT.md).

`oid` **chỉ lấy được lúc đăng nhập**. Người chưa đăng nhập Microsoft lần nào thì ô đó trống, và
đó là trạng thái bình thường — không phải lỗi.

## Các cột cũ vẫn còn, và có báo cáo đối soát

Di trú 025 **không đổi đường đọc**. `nhan_vien.pin_may` vẫn là đường máy chấm công khớp người,
`nhan_vien.email` vẫn là đường dự phòng của đăng nhập Microsoft. Đổi một lần cả ba đường khớp
người là cách chắc chắn nhất để một sai sót trong backfill làm máy chấm công **ngừng khớp người
một cách im lặng** — và lần quẹt không khớp thì không ai thấy gì, nó chỉ nằm đó với
`nhan_vien_id = null`.

Nên trong giai đoạn này cả hai cùng tồn tại, và **Hệ thống → Mã định danh → Đối soát** so hai
chiều:

- Cột cũ có giá trị mà bảng không có mã đang hiệu lực nào → backfill bỏ sót, hoặc hai người trùng
  mã nên dòng thứ hai bị index chặn.
- Bảng có mã mà cột cũ để trống → có đường ghi vào bảng mà quên ghi vào cột.

Khi báo cáo này sạch thì mới bỏ được các cột cũ. Bỏ sớm hơn là đoán.

## Tra cứu theo mã

**Hệ thống → Mã định danh → Tra cứu**: gõ một mã bất kỳ, không cần biết nó thuộc hệ thống nào.
Tìm cả **mã đã đóng**, và đó là công dụng chính — một bảng công in tháng trước ghi PIN cũ, một
công văn ghi mã `ERP147`.

```
GET  /api/ma-dinh-danh/tim?q=147
GET  /api/ma-dinh-danh/he-thong
GET  /api/ma-dinh-danh/doi-soat
GET  /api/nhan-vien/:id/ma-dinh-danh?ca_lich_su=1
POST /api/nhan-vien/:id/ma-dinh-danh     { he_thong, ma, ghi_chu, thu_hoi_cua_nguoi_khac }
DELETE /api/ma-dinh-danh/:id             { ghi_chu }     -- đóng lại, KHÔNG xóa
```

`DELETE` **đóng mã lại**, không xóa dòng. Lịch sử là lý do bảng này tồn tại.

## Thêm một hệ thống mới

1. Thêm một mục vào `CAC_HE_THONG` trong `may_chu/src/dinh_danh/he_thong.ts`: tên, nhóm hiển thị,
   nhiều mã hay không, ổn định hay không, cách chuẩn hóa, cách kiểm.
2. Thêm khóa vào `MaHeThong`.
3. Nếu có cột cũ tương ứng thì khai `cot_cu` và thêm một cặp vào `DOI_CHIEU` của `doi_soat`.
4. Gọi `gan_ma` ở chỗ hệ thống đó cho biết mã.

Không cần di trú. Bài kiểm trong `test/dinh_danh.test.ts` đòi mọi hệ thống có tên, có nhóm, và
hàm chuẩn hóa phải **ổn định khi gọi hai lần** (`f(f(x)) === f(x)`) — thiếu điều đó thì một mã
lưu vào rồi đọc ra chuẩn hóa lại sẽ khác chính nó, và không khớp với gì cả.
