# Runbook — Module Giám sát gian lận

Tài liệu vận hành. Đối tượng đọc: người trực hệ thống Chấm công và quản trị viên.

Đặc tả nghiệp vụ ở `tai_lieu/GIAM-SAT-GIAN-LAN.md`. Thuật ngữ ở `tai_lieu/GLOSSARY.md`.
Runbook này chỉ trả lời **"làm gì khi…"**.

---

## 0. Ba điều phải biết trước khi chạm vào module

1. **Module chỉ đọc ERP 1.** Không có đường ghi nào. Nếu có ai đó nói module đã sửa dữ liệu
   ERP 1, đó là chuyện khác — kiểm tra ngay, vì ba lớp chặn ghi (quyền Postgres, tham số
   chuỗi kết nối, `begin read only` mỗi truy vấn) đều phải cùng hỏng thì mới ghi được.
2. **Để trống `ERP1_HOST` là tắt sạch module.** Không pool nào được mở, vòng quét không
   chạy, giao diện báo "Chưa cấu hình". Đây là **cách tắt khẩn cấp** ở mục 5.1.
3. **Mọi điều kiện được cài đặt ở trạng thái TẮT.** Hệ thống mới triển khai không sinh cảnh
   báo nào cho đến khi có người bật từng điều kiện một. Đó là chủ ý — xem mục 2.

---

## 1. Triển khai lần đầu

### 1.1. Chuẩn bị phía ERP 1 (đội quản trị CSDL ERP 1 làm)

Tài khoản đọc phải bị siết đúng hai dòng dưới đây. Chạy bằng superuser trên máy chủ ERP 1:

```sql
-- Ep chi-doc o TANG POSTGRES. Day la lop chan cuoi cung va la lop duy nhat
-- ma mot loi lap trinh ben Cham cong khong the di vong.
alter role powerbi set default_transaction_read_only = on;

-- Voi TUNG database can giam sat:
grant connect on database <ten_db> to powerbi;
grant usage on schema <schema> to powerbi;
grant select on all tables in schema <schema> to powerbi;
alter default privileges in schema <schema> grant select on tables to powerbi;
```

Không cấp `INSERT`, `UPDATE`, `DELETE`, `CREATE` ở bất kỳ đâu.

**Kiểm chứng đã siết đúng** — chạy bằng chính tài khoản `powerbi`:

```sql
create table thu_ghi_xem_sao (x int);
-- PHAI bao loi: ERROR: cannot execute CREATE TABLE in a read-only transaction
```

Không báo lỗi ⇒ **dừng triển khai**, quyền chưa siết.

### 1.2. Mở đường mạng

Máy chủ Chấm công phải nối được TCP tới `ERP1_HOST:ERP1_PORT`. Kiểm nhanh từ máy chủ Chấm
công:

```bash
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/<ERP1_HOST>/5432' && echo OK || echo KHONG NOI DUOC
```

### 1.3. Cấu hình `.env`

```
ERP1_HOST=<địa chỉ máy chủ CSDL ERP 1>
ERP1_PORT=5432
ERP1_USER=powerbi
ERP1_PASSWORD=<mật khẩu>
ERP1_DB_BOOTSTRAP=postgres
ERP1_SSL=0
ERP1_STATEMENT_TIMEOUT_MS=20000
```

Mật khẩu **chỉ nằm trong tệp này**. Không đưa vào CSDL, không đưa vào tài liệu, không đưa vào
ảnh chụp màn hình gửi qua chat. `.env` nằm trong `.gitignore` và cổng CI `gitleaks` chặn merge
nếu có ai commit nhầm.

Kênh email là tùy chọn — để trống `SMTP_HOST` thì màn hình web và xuất CSV vẫn chạy đủ:

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=0
SMTP_NGUOI_GUI=giam-sat@congty.vn
GIAM_SAT_EMAIL_NHAN=ceo@congty.vn,kiemsoat@congty.vn
GIAM_SAT_EMAIL_GIO=7
```

`GIAM_SAT_EMAIL_GIO` tính theo **múi giờ nơi đặt máy chấm công**, không theo múi giờ máy chủ.

### 1.4. Chạy migration và khởi động

```bash
npm --workspace may_chu run di_tru     # 030 + 031, idempotent, chay lai duoc
npm --workspace may_chu start
```

Nhật ký khởi động phải có dòng:

```
[giam_sat] bat vong quet moi 15 phut, o thoi gian 60 phut
```

Thấy `[giam_sat] chua cau hinh ERP1_HOST — khong bat vong quet` ⇒ `.env` chưa nạp.

### 1.5. Cấp vai trò và trỏ nguồn dữ liệu

1. Bằng tài khoản `admin`: gán vai trò **Kiểm soát nội bộ** (`kiem_soat`) cho người phụ trách.
   Không gán cho nhân sự và trưởng bộ phận — họ nằm trong số người bị giám sát.
2. Vào **Cài đặt → Nguồn dữ liệu ERP**, bấm **Dò tìm**. Màn hình liệt kê các database mà tài
   khoản đọc được kèm số schema/bảng.
3. Gán từng mã nguồn (`hola`, `sale`, `debt`, `logs`, `kho`) sang đúng database, bấm
   **Kiểm tra** từng cái. Cả năm phải xanh.

### 1.6. Đối chiếu schema — **bắt buộc, không bỏ qua**

Đây là bước quan trọng nhất và là bước dễ bị bỏ nhất, vì bỏ nó thì hệ thống vẫn chạy — chỉ là
chạy sai theo kiểu im lặng.

```bash
npm --workspace may_chu run doi_chieu_schema
```

Công cụ đọc `information_schema` của các database đã trỏ và so với schema mà từng phép đo
tuyên bố nó cần. Kết quả:

| Mã thoát | Nghĩa | Làm gì |
|---|---|---|
| `0` | Không lệch ở bảng nào mà phép đo **đang bật** dùng tới | Đi tiếp |
| `1` | Có lệch ở bảng mà phép đo **đang bật** dùng tới | **Tắt các điều kiện liên quan ngay**, gửi báo cáo lệch cho đội phát triển |

Lệch ở phép đo đang **tắt** chỉ in cảnh báo, không chặn — nhưng phải sửa trước khi bật phép đo
đó.

Chạy lại lệnh này **mỗi lần ERP 1 lên phiên bản mới**. Xem mục 5.4.

---

## 2. Bật một điều kiện (quy trình bắt buộc)

Không bật thẳng. Thứ tự bốn bước, không đảo:

1. **Đọc căn cứ.** Mở loại lỗi, đọc trường "Căn cứ". Ngưỡng phải dựa trên quy chế nội bộ đã
   ban hành, không dựa trên con số do hệ thống gợi ý. Ngưỡng seed sẵn ghi rõ *"Ngưỡng gợi ý —
   phải đối chiếu quy chế nội bộ rồi mới bật"* vì đúng như thế: chúng do máy đề xuất, chưa ai
   duyệt.
2. **Chạy thử.** Nút **Chạy thử** ngay cạnh nút **Bật**, ở màn hình Danh mục → tab Điều kiện.
   Nó chạy phép đo thật trên dữ liệu thật nhưng **không ghi cảnh báo nào**, trả về số bản ghi
   sẽ khớp và 20 dòng mẫu.
3. **Đọc 20 dòng mẫu bằng mắt.** Câu hỏi phải trả lời được: *"nếu 20 dòng này thành cảnh báo
   sáng mai, tôi có sẵn sàng đi hỏi từng người trong đó không?"* Không sẵn sàng ⇒ ngưỡng chưa
   đúng.
4. **Bật.** Vòng quét gần nhất sẽ nhặt lên.

**Ngưỡng chỉ số bản ghi để dừng lại:** chạy thử ra **trên 50 dòng** cho một điều kiện là dấu
hiệu ngưỡng quá lỏng. Siết ngưỡng rồi thử lại. Một điều kiện sinh hàng trăm cảnh báo sẽ giết
cả module — không phải vì hệ thống sập, mà vì ba tuần sau không còn ai mở màn hình nữa.

---

## 3. Vận hành hằng ngày

### 3.1. Nhịp chạy

| Việc | Chu kỳ |
|---|---|
| Vòng quét | mỗi **15 phút**, mỗi loại lỗi quét tối đa 1 lần trong ô **60 phút** |
| Quét bù sau khởi động lại | 30 giây sau khi máy chủ lên |
| Bản tin email | 1 lần/ngày, lúc `GIAM_SAT_EMAIL_GIO` |
| Dọn nhật ký việc quét | tự động, giữ 7 ngày |
| Dọn cảnh báo đã đóng | tự động, giữ 365 ngày kể từ lúc đóng |

Cảnh báo **chưa xử lý không bao giờ bị dọn**, và nhật ký xử lý của chúng cũng vậy — đó là hồ
sơ kiểm soát nội bộ.

### 3.2. Kiểm tra sức khỏe

`GET /health` trả trạng thái kết nối ERP 1 và thời điểm quét thành công gần nhất.

Trên giao diện: **Giám sát → Nhật ký quét**. Ba thứ cần nhìn mỗi tuần:

- Cột **Thành công** — có dòng đỏ nào không.
- Cột **mili giây** — một phép đo tăng dần từ vài trăm ms lên vài giây là dấu hiệu dữ liệu ERP
  1 phình hoặc thiếu chỉ mục. Đừng đợi nó chạm `statement_timeout` 20 giây.
- Cột **Số bản ghi đọc** — tụt về 0 đột ngột ở một phép đo vốn luôn có dữ liệu là dấu hiệu ERP
  1 đã đổi schema hoặc đổi giá trị enum. Chạy mục 1.6.

### 3.3. Xử lý một cảnh báo

Vòng đời: `moi → dang_kiem_tra → xac_nhan | bo_qua → da_xu_ly`.

Máy **chỉ** đặt được trạng thái `moi`. Mọi lần đổi trạng thái ghi một dòng vào nhật ký xử lý
kèm người, thời điểm, trạng thái trước/sau và ghi chú — không sửa, không xóa được qua API.

Nhắc lại điều dễ quên nhất: **cảnh báo là dấu hiệu cần kiểm tra, không phải kết luận.** Đối
chiếu chứng từ gốc và hỏi người liên quan trước khi kết luận. Người lao động có quyền giải
trình (Bộ luật Lao động 2019, Điều 122).

---

## 4. Sự cố thường gặp

### 4.1. Vòng quét không chạy

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| Nhật ký khởi động không có dòng `[giam_sat] bat vong quet` | `ERP1_HOST` trống | Điền `.env`, khởi động lại |
| Có dòng bật vòng quét nhưng **Nhật ký quét** trống | Không có loại lỗi nào bật kèm điều kiện bật | Mục 2 |
| Nhật ký quét có dòng nhưng `so_ban_ghi_doc = 0` toàn bộ | Nguồn trỏ sai database, hoặc schema lệch | Kiểm tra kết nối ở màn hình Nguồn; chạy mục 1.6 |

### 4.2. Quét treo hoặc chậm

Mỗi truy vấn có `statement_timeout` 20 giây và pool tối đa 3 kết nối cho mỗi database — module
**không thể** làm nghẽn ERP 1 quá mức đó. Nếu vẫn cần dừng khẩn:

```bash
# Tren may chu ERP 1, xem module dang chay gi:
select pid, state, now() - query_start as chay_bao_lau, left(query, 120)
  from pg_stat_activity where application_name = 'chamcong_giam_sat';

# Huy mot truy van cu the (KHONG dung pg_terminate_backend tru khi can thiet):
select pg_cancel_backend(<pid>);
```

`application_name = 'chamcong_giam_sat'` đặt sẵn trên mọi kết nối đúng để lọc được như trên.

Cờ `dang_chay` chặn hai vòng chồng lên nhau: một vòng kéo dài hơn 15 phút thì vòng kế bị bỏ
qua, không xếp hàng.

### 4.3. ERP 1 chết hoặc mất mạng

Không cần làm gì. Vòng quét ghi `thanh_cong = false` kèm thông điệp, vòng sau thử lại. Máy chủ
Chấm công **không** bị ảnh hưởng — chấm công, bảng công, app nhân viên chạy bình thường.

Thông điệp lỗi đã được dịch sang tiếng Việt kèm hành động cụ thể (sai mật khẩu, không có
quyền, hết giờ, không nối được…) — đọc thẳng ở màn hình Nhật ký quét, không cần tra mã lỗi
Postgres.

### 4.4. Cảnh báo rác tràn màn hình

Đây là kiểu hỏng nguy hiểm nhất vì nó không giống hỏng. Xử lý theo thứ tự:

1. **Tắt điều kiện gây tràn ngay** (Danh mục → Điều kiện → Tắt). Tắt điều kiện **không** xóa
   cảnh báo đã sinh — dừng chảy trước, dọn sau.
2. Đóng loạt cảnh báo sai bằng trạng thái `bo_qua` kèm ghi chú nêu rõ lý do (ví dụ *"ngưỡng
   đặt sai, không phải dấu hiệu"*). Đừng xóa: nhật ký phải giữ được vết rằng đã có một lần đặt
   ngưỡng sai.
3. Đặt lại ngưỡng, **Chạy thử**, đọc 20 dòng mẫu, rồi mới bật lại.

Cảnh báo đã đóng tự rụng sau 365 ngày.

### 4.5. Email không tới

| Kiểm | Kết luận |
|---|---|
| `SMTP_HOST` hoặc `SMTP_NGUOI_GUI` hoặc `GIAM_SAT_EMAIL_NHAN` trống | Kênh email đang **tắt có chủ ý**. Đây là trạng thái hợp lệ. |
| Nhật ký có `[giam_sat] gui ban tin that bai: …` | Lỗi SMTP thật. Khóa ngày đã được nhả nên vòng sau tự thử lại. |
| Không có dòng nào về bản tin | Không có cảnh báo mới trong 24 giờ ⇒ **cố ý không gửi**. Một email "hôm nay không có gì" mỗi ngày sẽ bị lọc vào thư rác, và đến ngày có chuyện thật thì nó nằm chung ở đó. |

Bản tin chỉ gửi **một lần mỗi ngày**, khóa qua bảng `cong_viec_da_chay`, nên nhiều instance
chạy song song không gửi trùng.

---

## 5. Thủ tục thay đổi

### 5.1. Tắt khẩn cấp toàn module

```bash
# Trong .env:
ERP1_HOST=
# roi khoi dong lai may chu
```

Hiệu lực: không pool nào mở, vòng quét không chạy, giao diện báo trạng thái tắt. Dữ liệu cảnh
báo đã có **giữ nguyên**, không mất.

Tắt hẹp hơn: tắt từng `loai_loi` hoặc từng `dieu_kien_loi` trên giao diện, không cần khởi động
lại.

### 5.2. Xoay vòng mật khẩu ERP 1

Làm được không cần dừng dịch vụ, nhưng có một cửa sổ ngắn quét sẽ lỗi. Chọn khung giờ thấp
điểm.

1. Trên ERP 1, đặt mật khẩu mới cho `powerbi`:
   ```sql
   alter role powerbi with password '<mat_khau_moi>';
   ```
2. Sửa `ERP1_PASSWORD` trong `.env` của máy chủ Chấm công.
3. Khởi động lại máy chủ Chấm công. Pool cũ đóng, pool mới mở với mật khẩu mới.
4. Vào **Cài đặt → Nguồn dữ liệu ERP**, bấm **Kiểm tra** từng nguồn. Cả năm phải xanh.
5. Xem **Nhật ký quét** sau một chu kỳ (15 phút): không còn dòng lỗi xác thực.

Trong bước 1–3, vòng quét ghi `thanh_cong = false`. Không mất dữ liệu — vòng sau quét bù.

**Lần xoay vòng đầu tiên là bắt buộc**, không phải tùy chọn: mật khẩu hiện tại đã từng đi qua
kênh không kiểm soát. Xem `TECH_DEBT.md`, mục ND-02, có hạn và người chịu trách nhiệm.

### 5.3. Đổi tên database bên ERP 1

Không cần sửa code, không cần deploy. Vào **Cài đặt → Nguồn dữ liệu ERP** → **Dò tìm** → chọn
lại database cho mã nguồn tương ứng → **Kiểm tra**.

Đây chính là lý do tên database không nằm trong mã nguồn, và có một bài kiểm tra trong CI cấm
đưa nó vào.

### 5.4. ERP 1 nâng cấp / đổi schema

Làm **ngay sau** mỗi lần ERP 1 lên phiên bản, đừng đợi ai báo:

```bash
npm --workspace may_chu run doi_chieu_schema
```

- **Mã thoát 0** — không việc gì phải làm.
- **Mã thoát 1** — báo cáo liệt kê bảng/cột thiếu, sai kiểu, thừa. Xử lý theo thứ tự:
  1. Tắt ngay các điều kiện dùng bảng/cột bị lệch (báo cáo có ghi phép đo nào bị ảnh hưởng).
  2. Gửi báo cáo cho đội phát triển để sửa SQL phép đo.
  3. Sau khi có bản vá: chạy lại công cụ, đối chiếu ra 0, **Chạy thử** từng điều kiện, rồi mới
     bật lại.

Vì sao phải làm thủ công: một phép đo trỏ vào cột đã bị đổi tên **không báo lỗi ầm ĩ** — nó
chỉ trả 0 dòng, tức "không có gì bất thường". Đó là kiểu hỏng tệ nhất của một hệ thống giám
sát, và công cụ đối chiếu tồn tại chỉ để chặn đúng kiểu hỏng đó.

### 5.5. Quay lui bản triển khai

Module nằm gọn trong hai migration (`030_vai_tro_kiem_soat.sql`,
`031_giam_sat_gian_lan.sql`) và một thư mục mã nguồn. Quay lui **không cần** gỡ migration:

1. Đặt `ERP1_HOST=` (mục 5.1) — module tắt, phần còn lại của Chấm công không đổi.
2. Triển khai lại bản mã nguồn trước đó nếu cần.

Không chạy `drop table` để "dọn sạch": bảng `canh_bao` và `canh_bao_xu_ly` là hồ sơ kiểm soát
nội bộ, xóa là mất vết. Bảng để đó không tốn gì.

---

## 6. Ai chịu trách nhiệm cái gì

| Việc | Ai |
|---|---|
| Quyền và mật khẩu tài khoản `powerbi` trên ERP 1 | Quản trị CSDL ERP 1 |
| Mở đường mạng máy chủ Chấm công → ERP 1 | Hạ tầng |
| `.env` của máy chủ Chấm công, gán vai trò `kiem_soat`, trỏ nguồn dữ liệu | Quản trị hệ thống Chấm công (`admin`) |
| Đặt ngưỡng, bật/tắt điều kiện, xử lý cảnh báo | Kiểm soát nội bộ (`kiem_soat`) |
| Chạy `doi_chieu_schema` sau mỗi lần ERP 1 nâng cấp | Quản trị hệ thống Chấm công |
| Sửa SQL phép đo khi ERP 1 đổi schema | Đội phát triển |
| Quyết định ngưỡng nào phù hợp quy chế | Ban điều hành — **không phải** đội phát triển |

Dòng cuối không phải phân công cho có. Ngưỡng là **tiêu chí đánh giá người**, và người đặt nó
phải là người có thẩm quyền ban hành tiêu chí đó.
