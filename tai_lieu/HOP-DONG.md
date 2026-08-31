# Hợp đồng lao động: nội dung, hạn, và OCR bản scan

Tài liệu này nói về hai việc:

1. **Trích nội dung hợp đồng sang văn bản** để tìm kiếm và đối chiếu — kể cả bản scan.
2. **Nhắc hạn hợp đồng**, vì hết hạn hợp đồng là mốc không có gì tự kích hoạt.

Hợp đồng điện tử (ký số qua vContract) nằm ở tài liệu riêng:
[`HOP-DONG-DIEN-TU-VCONTRACT.md`](HOP-DONG-DIEN-TU-VCONTRACT.md).

---

## 1. Trích nội dung hợp đồng

### Điều quan trọng nhất, nói trước

**Văn bản trích ra KHÔNG có giá trị pháp lý.** Bản có giá trị pháp lý luôn là **tệp gốc**
trong hồ sơ (`ho_so_tep`). Văn bản chỉ để:

- **tìm kiếm** — "hợp đồng nào có điều khoản bảo mật?"
- **đối chiếu** — mở nhanh xem điều khoản viết gì mà không phải tải tệp về

Với bản OCR thì điều này còn quan trọng hơn nữa: OCR **đọc sai chữ và số được**. Một hợp
đồng ghi `12.500.000` có thể ra `12.500.00O`. Vì thế hệ thống luôn ghi lại **cách trích**
và hiện nó ngay cạnh nội dung.

### Ba đường trích, và độ tin cậy khác nhau

| `cach_trich` | Nguồn chữ | Độ tin cậy | Cần gì trên máy chủ |
|---|---|---|---|
| `docx` | XML trong chính tệp `.docx` | Chữ gốc, chính xác tuyệt đối | không cần gì |
| `pdf_text` | Lớp chữ của PDF (`pdftotext`) | Chữ gốc, chính xác tuyệt đối | `poppler-utils` |
| `ocr` | Máy đọc từ ảnh (`tesseract -l vie`) | **Máy đoán — có lỗi** | `tesseract-ocr`, `tesseract-ocr-data-vie`, `poppler-utils` |
| `nhap_tay` | Người gõ vào | tùy người gõ | không cần gì |

Hệ thống **tự chọn đường**:

```
.docx                       -> docx
.pdf có lớp chữ             -> pdf_text
.pdf chỉ là ảnh (bản scan)  -> pdf_text thử trước, không ra chữ thì tự chuyển sang ocr
.jpg / .jpeg / .png         -> ocr
```

Ngưỡng phân biệt "PDF có lớp chữ" với "PDF chỉ là ảnh" là **40 ký tự**. PDF scan không hoàn
toàn rỗng — `pdftotext` vẫn trả về dấu ngắt trang và có khi vài ký tự rác từ watermark.

### Cách dùng trên giao diện

**Hồ sơ nhân viên → mục Hợp đồng → nút "Nội dung"** trên dòng hợp đồng.

Hộp thoại đó:

- nói ngay **máy chủ này trích được gì** — chưa cài `tesseract` thì nó bảo trước, không để
  bấm nút rồi mới nhận lỗi
- cho chọn một trong các **tệp đã đính kèm** vào mục Hợp đồng
- hiện **cách trích** và **thời điểm trích** cạnh nội dung
- hỏi lại trước khi **ghi đè** nội dung đang có

**Bản scan phải qua OCR nên có thể mất đến một phút.** Đừng đóng hộp thoại giữa lúc chạy.

### Tìm trong nội dung

**Hợp đồng → tab "Tìm trong nội dung"**. Chỉ tìm được trong những hợp đồng **đã trích**.

Đường tìm này **chỉ nhân sự** dùng được: nó tìm xuyên qua mọi nhân viên, và nội dung hợp
đồng có lương cùng điều khoản riêng, nên quyền theo từng hồ sơ không gác được cho nó.

Từ khóa được so khớp bằng `position()` chứ không phải `ilike '%...%'` — nghĩa là `%` và `_`
là **ký tự thường**, không phải ký tự đại diện. Gõ dấu `%` vào ô tìm sẽ không khớp mọi hợp
đồng.

### Khi trích không ra chữ

Hệ thống **không bao giờ ghi một chuỗi rỗng** vào `noi_dung_text`. Một ô trống im lặng sẽ
bị đọc là *"hợp đồng này không có nội dung"*, trong khi sự thật là *"máy chưa đọc được"*.

Thay vào đó nó trả về `da_luu: false` kèm câu giải thích. Các câu hay gặp:

| Thông báo | Nghĩa là gì | Làm gì |
|---|---|---|
| `Máy chủ chưa cài "tesseract"` | Ảnh Docker thiếu gói OCR | xem mục 3 dưới đây |
| `PDF này không có lớp chữ (bản scan) và máy chủ chưa cài "pdftoppm"` | thiếu `poppler-utils` | xem mục 3 |
| `OCR không đọc được chữ nào từ ảnh này` | ảnh mờ / chụp nghiêng / phân giải thấp | scan lại ở 300 dpi, để phẳng |
| `Tệp .docx không có đoạn văn nào` | nội dung nằm trong ảnh chèn vào tài liệu | xuất tệp đó ra PDF rồi trích lại |
| `Chưa trích được nội dung từ "..."` | định dạng không đọc được (vd `.xlsx`, `.doc` cũ) | lưu lại thành `.docx` hoặc `.pdf` |

### Giới hạn

| Giới hạn | Giá trị | Vì sao |
|---|---|---|
| Số ký tự lưu | 400.000 | dài hơn mọi hợp đồng lao động thực tế |
| Số trang OCR mỗi lần | 30 | ~1–3 giây/trang; hơn nữa thì gần như chắc chắn là gắn sai tệp |
| Độ phân giải rasterise | 200 dpi | dưới mức này dấu tiếng Việt bắt đầu mất |
| Hạn `pdftotext` | 60 giây | |
| Hạn `pdftoppm` | 180 giây | |
| Hạn `tesseract` mỗi trang | 120 giây | |

---

## 2. Nhắc hạn hợp đồng

### Vì sao phải tự động

Hết hạn hợp đồng là mốc **không có gì kích hoạt**. Không ai quét thẻ, không ai nộp đơn,
không sự kiện nào xảy ra vào ngày đó. Không có việc này thì cách duy nhất để biết là có
người nhớ ra mà mở hồ sơ lên xem.

Và bỏ sót có hệ quả pháp lý thật:

- **Điều 45 BLLĐ 2019** — phải **thông báo bằng văn bản** cho người lao động về việc chấm
  dứt hợp đồng, **chậm nhất 15 ngày** trước ngày hợp đồng xác định thời hạn hết hạn. Mốc
  15 ngày không phải lựa chọn của công ty; đó là hạn luật.
- **Điều 20.2** — hợp đồng hết hạn mà người lao động **vẫn làm việc**, quá **30 ngày** không
  ký hợp đồng mới thì hợp đồng đã giao kết **trở thành không xác định thời hạn**.
- **Điều 27** — hết thời gian thử việc phải thông báo kết quả.

> **Thông báo đẩy trên điện thoại KHÔNG PHẢI "văn bản" theo Điều 45.** Nó chỉ để nhân sự
> không bỏ sót hạn. Văn bản thông báo vẫn phải làm và vẫn phải giao thật.

### Các mốc nhắc

| Loại hợp đồng | Mốc (số ngày còn lại) |
|---|---|
| `thu_viec`, `hoc_viec` | 7, 3, 0 |
| còn lại | 45, 30, 15, 7, 0 |

Thử việc dùng bộ mốc riêng vì nó chỉ tính bằng tuần — mốc 45 ngày sẽ rơi vào trước cả khi
hợp đồng bắt đầu.

Mốc đã nhắc được ghi vào `hop_dong_lao_dong.da_nhac_han` (mảng số nguyên). **Đã nhắc rồi
thì không nhắc lại.** Đó là ranh giữa "nhắc" và "spam": nhắc lại mỗi vòng 15 phút sẽ làm
người nhận tắt thông báo, và từ đó không nhắc hạn nào đến được ai.

Hợp đồng **nhập vào hệ thống muộn** (ví dụ chỉ còn 3 ngày) sẽ gửi **một** thông báo và ghi
nhận **cả** các mốc 45/30/15/7 là đã qua — nếu chỉ ghi mốc 7 thì vòng sau lại thấy 15 chưa
nhắc và nhắc tiếp, rồi 30, rồi 45.

### Ai nhận

Người có quyền duyệt của nhân viên đó: **trưởng phòng của phòng ban** + **mọi tài khoản
nhân sự / admin**. Gửi cả cho nhân sự chứ không chỉ trưởng phòng, vì phòng chưa gán trưởng
phòng thì nhắc sẽ không đến tay ai.

Nhân viên **không** nhận thông báo này — thông báo cho người lao động là văn bản theo Điều
45, không phải push.

### Việc chạy khi nào

Bộ lịch (`may_chu/src/su_kien/lich_chay.ts`) quét **mỗi ngày một lần**, cùng khung giờ với
việc chốt bảng công cuối ngày. Mã việc là `nhac_han_hop_dong:YYYY-MM-DD` trong bảng
`cong_viec_da_chay`, nên nhiều instance chạy song song thì đúng một instance làm việc, và
triển khai lại trong ngày không gửi lại.

### Danh sách "Sắp hết hạn" — mặt đối diện của việc nhắc

**Hợp đồng → tab "Sắp hết hạn"**.

Thông báo đẩy có thể bị tắt, điện thoại có thể mất, người nhận có thể đã nghỉ việc. Danh
sách này thì luôn ở đó và luôn đầy đủ.

Hợp đồng **đã hết hạn luôn hiện**, không phụ thuộc khoảng đang xem. Một hợp đồng hết hạn ba
tháng trước mà chưa ai xử lý là thứ cần thấy nhất, và nó không còn "sắp" nữa nên mọi bộ lọc
theo số ngày còn lại đều sẽ làm nó biến mất.

Hợp đồng **không xác định thời hạn** không xuất hiện — không có ngày hết hạn thì không có
hạn để nhắc.

---

## 3. Cài công cụ đọc PDF và OCR trên máy chủ

Ảnh Docker của máy chủ (`may_chu/Dockerfile`) đã cài sẵn:

```dockerfile
RUN apk add --no-cache poppler-utils tesseract-ocr tesseract-ocr-data-vie
```

- `poppler-utils` → `pdftotext` (đọc lớp chữ PDF) + `pdftoppm` (rasterise để OCR)
- `tesseract-ocr` → OCR
- `tesseract-ocr-data-vie` → **dữ liệu tiếng Việt**. Thiếu gói này thì OCR vẫn chạy nhưng
  đọc bằng tiếng Anh: chữ tiếng Việt sẽ mất dấu.

### Kiểm tra máy chủ đang có gì

```bash
# 🖥️ Trên VPS
curl -s http://127.0.0.1:8080/health   # máy chủ còn sống chứ?
docker compose exec may_chu pdftotext -v
docker compose exec may_chu tesseract --list-langs   # phải có 'vie'
```

Hoặc gọi API — cần token đăng nhập:

```
GET /api/ho-so/cong-cu-trich
-> { "docx": true, "pdf": true, "ocr": true, "pdf_sang_anh": true }
```

Giao diện đọc chính đường này để báo trước khi người dùng bấm nút.

### Nếu `apk add` lỗi vì tên gói đổi

Alpine đổi tên gói giữa các bản. Nếu `docker build` dừng ở dòng `apk add` đó:

1. Tìm tên đúng trên https://pkgs.alpinelinux.org
2. Sửa một dòng trong `may_chu/Dockerfile`

**Máy chủ vẫn chạy bình thường khi thiếu cả ba gói** — chỉ riêng việc trích nội dung sẽ báo
`Máy chủ chưa cài ...`. Trích `.docx` không cần gói nào nên vẫn hoạt động.

---

## 4. An toàn: chạy chương trình ngoài với tệp người lạ tải lên

`pdftotext`, `pdftoppm`, `tesseract` đều viết bằng C và đều từng có lỗ hổng đọc bộ nhớ.
Đưa tệp người dùng tải lên cho chúng là một bề mặt tấn công thật.

Bốn ràng buộc trong `may_chu/src/tien_ich/lenh_ngoai.ts`, và đều là ràng buộc **cứng**:

1. **Không bao giờ qua shell.** `spawn` với mảng đối số, `shell: false`. Tên tệp do người
   dùng đặt không thể biến thành câu lệnh.
2. **Có hạn giờ**, và hết giờ thì `SIGKILL` — không phải `SIGTERM`, vì chương trình đang
   treo thì không xử lý tín hiệu.
3. **Có trần dữ liệu trả về.** Một tệp nhỏ có thể bung ra hàng GB chữ.
4. **Nhóm tiến trình riêng.** Giết cả nhóm chứ không chỉ tiến trình đầu — con cháu để lại
   vẫn giữ đầu ra, và khi đó sự kiện `close` không bao giờ đến, biến hạn giờ thành treo
   vĩnh viễn. Đã gặp thật trong lúc viết bài kiểm.

Thêm nữa: **biến môi trường của máy chủ không được truyền sang tiến trình con.** Trong đó
có mật khẩu CSDL và khóa JWT; một bộ OCR không cần biết. Có bài kiểm cho riêng điều này.

Máy chủ trong Docker chạy bằng người dùng `node`, không phải `root`.

---

## 5. Các đường API

| Đường | Quyền | Việc |
|---|---|---|
| `GET /api/ho-so/cong-cu-trich` | đăng nhập | máy chủ trích được gì |
| `GET /api/ho-so/hop-dong/sap-het-han?trong_ngay=45` | nhân sự | danh sách sắp/đã hết hạn |
| `GET /api/ho-so/hop-dong/tim?q=...` | nhân sự | tìm trong nội dung đã trích |
| `GET /api/ho-so/hop-dong/:id/noi-dung` | quyền **đọc** hợp đồng của nhân viên đó | đọc nội dung |
| `POST /api/ho-so/hop-dong/:id/trich-noi-dung` | quyền **sửa** hợp đồng | thân: `{ "tep_id": "..." }` |
| `DELETE /api/ho-so/hop-dong/:id/noi-dung` | quyền **sửa** hợp đồng | xóa nội dung, tệp gốc vẫn còn |

Hai ranh giới được kiểm bằng bài kiểm e2e:

- **Tệp phải thuộc chính nhân viên đó.** Thiếu ràng buộc này thì ai sửa được một hợp đồng
  sẽ đọc được nội dung tệp của bất kỳ ai, chỉ bằng cách đoán mã tệp.
- **Quyền đi theo nhóm `hop_dong`.** Trưởng phòng không đọc được hợp đồng thì cũng không
  đọc được nội dung hợp đồng — nội dung hợp đồng **có lương**.

---

## 6. Lược đồ CSDL liên quan

Di trú [`015_hop_dong_dien_tu.sql`](../may_chu/migrations/015_hop_dong_dien_tu.sql) thêm vào
`hop_dong_lao_dong`:

| Cột | Kiểu | Nghĩa |
|---|---|---|
| `noi_dung_text` | `text` | nội dung đã trích, để tìm kiếm |
| `trich_tu_tep_id` | `uuid` | trích từ tệp nào trong `ho_so_tep` |
| `cach_trich` | `text` | `docx` / `pdf_text` / `ocr` / `nhap_tay` |
| `trich_luc` | `timestamptz` | trích lúc nào |
| `da_nhac_han` | `int[]` | các mốc ngày đã nhắc, để không nhắc lại |
