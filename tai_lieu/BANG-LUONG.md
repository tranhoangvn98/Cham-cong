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

## Ba tầng, đọc từ dưới lên

```
khoan_luong            DANH MỤC — công ty có những khoản nào
   (Cài đặt → Tham số lương → Danh mục khoản lương, chỉ admin)
        ↓
chinh_sach_phu_cap     CHÍNH SÁCH — ai được hưởng khoản nào, từ ngày nào
   (Quản trị nhân sự → Phụ cấp)
        ↓
phieu_luong_khoan      SỐ TIỀN THẬT của một người trong một kỳ
   (Bảng lương → nút "Khoản" trên từng dòng)
```

Tầng giữa là thứ khiến nhân sự **không phải gõ lại mỗi tháng**. Tầng dưới cùng chỉ dành cho
những gì thực sự thay đổi trong tháng: thưởng KPI, doanh số, tạm ứng.

---

## Các khoản

Bảng lương thật của công ty có 9 khoản thu nhập và 5 khoản trừ, và danh sách đó đổi gần như
hàng tháng. Nên chúng **không phải cột** trong `phieu_luong` mà là **dòng** trong
`phieu_luong_khoan`, mỗi dòng trỏ về một dòng danh mục `khoan_luong`.

Thêm một khoản mới = thêm một dòng dữ liệu, làm ngay trên giao diện
(*Cài đặt → Tham số lương → Danh mục khoản lương*, chỉ admin).

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

## Chính sách phụ cấp của từng người

*Quản trị nhân sự → Phụ cấp*

> "Chị A được hỗ trợ gửi xe 200.000/tháng từ 01/8" là một **thỏa thuận**, không phải một ô trên
> bảng lương tháng 8.

Nên nó có **hiệu lực từ – đến**, và kỳ lương tự sinh dòng khoản từ đó. Khai một lần, dùng mãi
cho đến khi có quyết định khác.

### Số lượng lấy từ đâu

| `nguon_so_luong` | Nghĩa | Dùng cho |
|---|---|---|
| `co_dinh` | số lượng ghi trong chính sách | hỗ trợ gửi xe 1 lần/tháng |
| `theo_cong` | = **số ngày công thực tế** của kỳ | hỗ trợ ăn trưa |

`theo_cong` bám theo chấm công: đi làm ít ngày thì hưởng ít, không ai phải sửa tay. Không đi làm
ngày nào thì **không sinh dòng nào** — bảng lương không có dòng 0 đồng để người đọc phải tự hiểu.

Với khoản `cach_tinh = 'nhap_tay'`, chính sách nói thẳng **số tiền mỗi tháng**.

### Đơn giá riêng

`chinh_sach_phu_cap.don_gia` để trống thì lấy đơn giá danh mục. Điền thì đó là mức riêng của
người này — chỗ để một người hưởng khác cả công ty **mà không phải tạo một khoản mới chỉ cho một
người**.

### Đổi mức: không sửa tại chỗ

Gán lại với ngày hiệu lực mới. Dòng cũ **tự đóng** vào ngày trước đó và ở lại làm lịch sử:

```
pc_trang_diem  300.000 đ/tháng   01/08/2026 → 14/08/2026   (tự đóng)
pc_trang_diem  500.000 đ/tháng   15/08/2026 → nay          "Tăng mức"
```

Nhờ vậy tính lại lương tháng cũ vẫn ra đúng số cũ, và câu *"từ bao giờ người này hưởng mức
này"* luôn có câu trả lời. Ngày hiệu lực mới phải **sau** ngày của dòng đang mở — không sau thì
hệ thống từ chối chứ không lặng lẽ đè.

Người thôi hưởng: bấm **Đóng** và điền ngày hưởng đến hết. Kỳ lương nào còn **giao** với khoảng
hiệu lực thì vẫn được hưởng — người vào làm hoặc nghỉ giữa tháng đều tính đúng.

Chính sách đã sinh ra khoản trên phiếu nào thì **không xóa được**, chỉ đóng. Số tiền đã trả phải
giữ được căn cứ. Nút *Xóa* chỉ để sửa một dòng vừa gõ nhầm.

### Ghi đè cho riêng một kỳ

Trên *Bảng lương → nút "Khoản"*, dòng do chính sách sinh ra mang nhãn **theo chính sách** và tự
tính lại mỗi kỳ. Bấm **Ghi đè** nếu riêng kỳ này khác — dòng đó thành dòng gõ tay
(`tu_chinh_sach = false`) và chính sách thôi điều khiển nó:

- Ghi đè là **ghi đè**, không cộng dồn — chính sách không sinh thêm dòng thứ hai.
- Tính lại kỳ **không** đè lên con số đã gõ tay.
- Bấm **Bỏ** để trả về theo chính sách; lần tính sau dòng chính sách quay lại.

### Chính sách không tự sửa bảng lương đang mở

Khai chính sách xong phải bấm **Tính lương** ở kỳ liên quan thì khoản mới xuất hiện. Đó là chủ
ý: số liệu không được đổi dưới chân người đang làm việc trên nó.

### Gán hàng loạt

53 người cùng hưởng phụ cấp ăn trưa thì không ai nên phải mở 53 hộp thoại. Lọc theo tên / mã /
phòng ban rồi chọn cả nhóm. Mỗi người vẫn ra **một dòng riêng có hiệu lực riêng** — đây chỉ là
cách nhập nhanh, không phải một tầng "chính sách chung" thứ hai để sau này không biết số của ai
đến từ đâu.

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
| `GET` | `/api/chinh-sach-phu-cap` (`?nhan_vien_id=`, `?con_hieu_luc=false`) | nhân sự |
| `POST` | `/api/chinh-sach-phu-cap` | nhân sự |
| `POST` | `/api/chinh-sach-phu-cap/hang-loat` | nhân sự |
| `POST` | `/api/chinh-sach-phu-cap/:id/dong` | nhân sự |
| `DELETE` | `/api/chinh-sach-phu-cap/:id` (chỉ khi chưa từng sinh khoản) | nhân sự |
| `PUT` | `/api/phieu-luong/:id/khoan` | nhân sự |

`PUT .../khoan` nhận **cả danh sách** — nhưng phạm vi của nó chỉ là các khoản **gõ tay** cho
riêng kỳ này. Khoản gõ tay không có trong danh sách gửi lên sẽ bị gỡ; dòng do chính sách sinh
ra không nằm trong phạm vi và được `tinh_ky_luong` dựng lại mỗi lần tính. Đưa một khoản vào danh
sách này *chính là* hành động ghi đè. Gửi xong hệ thống tính lại cả kỳ.

`loai` và `cach_tinh` của một khoản **không sửa được** sau khi tạo: các phiếu đã tính đang mang số
tiền ra theo cách cũ, đổi ở đây là lặng lẽ biến một khoản cộng thành một khoản trừ trong lịch sử.
Muốn đổi thì tắt khoản cũ và tạo khoản mới.
