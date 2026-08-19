# Bảng lương

Bảng lương được tính từ dữ liệu chấm công, không gõ tay. Tài liệu này giải thích cách các
**khoản** (phụ cấp và khoản trừ) hoạt động, và những chỗ dễ sai tiền.

---

## Quy trình một kỳ

```
Bảng chấm công đúng
        ↓
Tạo kỳ lương (một tháng một kỳ)
        ↓
Tính lương ────────────► sinh phiếu cho mọi người đang làm việc
        ↓
Nhập các khoản của từng người (nút "Khoản")
        ↓
Tính lương lại ────────► số tiền từng khoản được tính lại theo công thức
        ↓
Gửi duyệt  ────────────► KHÓA sửa
        ↓
Admin duyệt ───────────► khóa luôn bảng công tháng đó,
                          sinh bản chốt XLSX, đẩy lên SharePoint
        ↓
Đánh dấu đã trả
```

Sửa sau khi duyệt thì phải **trả lại** kỳ về nháp — không có đường tắt, và mọi bước vào nhật ký.

---

## Các khoản

Bảng lương thật của công ty có 9 khoản thu nhập và 5 khoản trừ, và danh sách đó đổi gần như
hàng tháng. Nên chúng **không phải cột** trong `phieu_luong` mà là **dòng** trong
`phieu_luong_khoan`, mỗi dòng trỏ về một dòng danh mục `khoan_luong`.

Thêm một khoản mới = thêm một dòng dữ liệu, làm ngay trên giao diện
(*Hệ thống → Tham số lương → Danh mục khoản lương*, chỉ admin).

### Ba cách ra tiền

| `cach_tinh` | Người nhập gì | Máy làm gì |
|---|---|---|
| `nhap_tay` | số tiền | lấy nguyên |
| `so_luong_x_don_gia` | **số lượng** | `số lượng × đơn giá` |
| `nua_ngay_luong` | **số lần** | `số lần × (lương một ngày ÷ 2)` |

Với hai cách sau, **đừng gõ tiền tay** — ô nhập là số lượng. Số tiền được tính lại mỗi lần bấm
*Tính lương*, nên một con số gõ thẳng vào sẽ bị ghi đè ở lần tính sau.

`nua_ngay_luong` lấy theo lương của **chính người đó**: hai người đi muộn cùng số lần mà lương
khác nhau thì số tiền phải khác nhau. Đó là thứ một đơn giá chung không làm được.

### Đơn giá được chụp lại

`phieu_luong_khoan.don_gia` lưu đơn giá **tại thời điểm tính**, không join lại lúc xem. Đổi đơn
giá trong danh mục về sau không làm đổi số tiền của phiếu đã trả.

### Ngừng dùng ≠ xóa

Tắt `dang_dung` chỉ chặn **thêm mới** vào phiếu. Các phiếu đã tính vẫn giữ nguyên khoản đó và vẫn
sửa được — tắt một khoản là để không dùng tiếp, không phải để xóa lịch sử.

---

## Thuế TNCN: khoản miễn thuế

Mỗi khoản mang cờ `chiu_thue`. Phần **miễn thuế** bị trừ khỏi cơ sở tính thuế **trước** giảm trừ
gia cảnh:

```
thu nhập chịu thuế = tổng thu nhập − các khoản miễn thuế
thu nhập tính thuế = thu nhập chịu thuế − giảm trừ gia cảnh − bảo hiểm bắt buộc
```

Khoản miễn thuế **vẫn được trả** — người lao động nhận thêm đúng số đó, chỉ là nó không làm tăng
thuế.

Ba khoản được gieo sẵn là miễn thuế, không khoản nào khác:

| Khoản | Căn cứ |
|---|---|
| Phụ cấp ăn trưa | Thông tư 111/2013; mức bữa ăn giữa ca theo Thông tư 26/2016/TT-BLĐTBXH |
| Phụ cấp trang phục quý | Thông tư 111/2013 Điều 2 — trong hạn mức 5 triệu/người/năm |
| Tiền ứng cho công ty | không phải thu nhập, là hoàn lại tiền đã chi hộ |

> **Đánh dấu sai ô này là tính sai thuế của cả công ty.** Chỉ chọn *miễn thuế* khi có căn cứ, và
> nhớ các miễn trừ trên đều **có hạn mức** — phần vượt hạn mức thì chịu thuế.

---

## Điều 127 — trừ tiền vì đi muộn

Bảng tính cũ của công ty trừ **50.000 đ mỗi lần đi muộn** và trừ **nửa ngày lương** cho người
**đã đi làm**.

> **Bộ luật Lao động 2019, Điều 127 khoản 3** cấm *"phạt tiền, cắt lương thay việc xử lý kỷ luật
> lao động"*.

Hệ thống **vẫn cho ghi nhận** hai khoản này (`tru_di_muon`, `tru_nua_ngay`) — vì việc đang diễn ra
thật và giấu nó đi không làm nó biến mất. Nhưng cả hai mang `canh_bao` hiện **ngay cạnh ô nhập**.

**Cách hợp pháp** cho thời gian không làm việc: ghi giảm **công** trên bảng chấm công. Nửa buổi
không làm thì bảng công ghi 0,5 công, và lương theo ngày công tự ra ít hơn — cùng kết quả kinh
tế, nhưng là *trả lương theo thời gian làm việc thực tế* chứ không phải *phạt*.

Khoản trừ hợp pháp: bồi thường thiệt hại theo Điều 129, đã có biên bản. Dùng `tru_phat` cho việc
đó, và ghi rõ lý do.

---

## Công chuẩn tháng

`tham_so_luong.cong_chuan_thang`:

- **0 (mặc định)** — đếm số ngày làm việc thật của từng tháng theo ca làm, trừ ngày lễ đã khai.
  Tháng 28 ngày và tháng 31 ngày ra công chuẩn khác nhau.
- **> 0** — ấn định một số cố định (bảng cũ dùng 25) cho mọi tháng và mọi người.

Bảng tính cũ dùng **bốn cách trong cùng một bảng**: có dòng chia cho `$D$3` (tuyệt đối), có dòng
chia cho `D3` (tương đối, trượt theo dòng), có dòng chia `26` cứng, có dòng chia `30` cứng, có
dòng chia cho chính số công thực tế. Bốn người cùng chức danh nghỉ cùng số ngày có thể ra bốn số
tiền khác nhau. Ở đây chỉ có **một** cách, và nó là dữ liệu khai một lần.

## Làm tròn

`tham_so_luong.lam_tron_den` — bảng cũ làm tròn đến 100 đ (`ROUND(...,-2)`) và trả theo số đã làm
tròn. Phiếu giữ **cả hai**: `thuc_linh` (số gốc, để đối chiếu với từng khoản) và
`thuc_linh_lam_tron` (số trả thật). 0 = không làm tròn.

---

## Xuất bảng

| Đường dẫn | Định dạng |
|---|---|
| `GET /api/ky-luong/:id/xuat-xlsx` | Excel |
| `GET /api/ky-luong/:id/xuat-csv` | CSV (BOM UTF-8, mở được bằng Excel trên Windows) |

Cả hai — **và bản chốt sinh lúc duyệt** — dựng từ cùng một hàm `bang_luong_xuat()`. Đó là chủ ý:
nếu bản được duyệt và bản kế toán tải về là hai danh sách cột khác nhau thì có hai "bảng lương
tháng 7" mang cùng một tên.

Mỗi khoản **có dùng trong kỳ** thành một cột riêng, đúng thứ tự danh mục. Khoản không ai dùng
không sinh ra cột rỗng.

---

## API

| Phương thức | Đường dẫn | Quyền |
|---|---|---|
| `GET` | `/api/khoan-luong` (`?ca=true` để thấy cả khoản đã tắt) | nhân sự |
| `POST` | `/api/khoan-luong` | admin |
| `PATCH` | `/api/khoan-luong/:ma` | admin |
| `PUT` | `/api/phieu-luong/:id/khoan` | nhân sự |

`PUT .../khoan` nhận **cả danh sách** — đó là trạng thái mong muốn của dòng đó. Khoản không có
trong danh sách gửi lên sẽ bị gỡ khỏi phiếu. Gửi xong hệ thống tính lại cả kỳ.

`loai` và `cach_tinh` của một khoản **không sửa được** sau khi tạo: các phiếu đã tính đang mang số
tiền ra theo cách cũ, đổi ở đây là lặng lẽ biến một khoản cộng thành một khoản trừ trong lịch sử.
Muốn đổi thì tắt khoản cũ và tạo khoản mới.
