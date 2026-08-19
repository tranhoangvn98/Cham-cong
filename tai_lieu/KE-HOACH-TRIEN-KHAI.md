# Kế hoạch triển khai

Cái gì đang chạy, cái gì đang chờ ai, và cái gì cố ý để lại sau.

Mỗi mục ghi rõ **ai làm** và **thế nào là xong**. Mục nào tôi không tự kiểm được thì nói thẳng
là không kiểm được, thay vì để nó nằm trong danh sách "đã xong" cho đủ.

Ngày cập nhật: 19-08-2026 — bản 1.26.0.

---

## 1. Đang chạy thật

| Phần | Trạng thái |
|---|---|
| Tiếp nhận log máy ZKTeco (ADMS) | chạy thật, có log máy vào |
| Bộ tính công + chốt ngày tự động | chạy thật |
| Web nhân sự + app điện thoại | chạy thật |
| Hồ sơ nhân sự (11 nhóm) + tệp đính kèm | chạy thật |
| Cây thư mục kho tệp trên đĩa | chạy thật, có vòng quét hằng ngày |
| Trích nội dung hợp đồng (DOCX / PDF / OCR) | chạy thật |
| Nhắc hạn hợp đồng (BLLĐ Điều 45, Điều 20.2) | chạy thật |
| Bảng lương từ chấm công + BHXH + thuế TNCN | chạy thật |
| Vi phạm + KPI | chạy thật |
| Dashboard theo vai trò | chạy thật |
| Đăng nhập Microsoft (Entra ID) | chạy thật |
| Đồng bộ người dùng từ ERP cũ | chạy thật, đọc được 53 người |

## 2. Đang chờ bạn

Những việc này tôi đã viết xong code nhưng **không thể tự hoàn tất** — chúng cần quyền, cần
tài khoản, hoặc cần một quyết định của bạn.

### 2.1 Xoay client secret Microsoft — GẤP

Client secret cũ **đã từng lộ trong log hội thoại**. Trước khi bật đồng bộ SharePoint (tức là
trước khi cấp thêm quyền ghi), phải xoay nó.

**Xong khi:** secret mới trong `.env` trên VPS, secret cũ đã xóa ở Entra portal, đăng nhập
Microsoft vẫn hoạt động.

### 2.2 Cấp quyền `Sites.Selected` trên site HCNS

App `cham-cong-sharepoint-sync` đã tạo (`appId 9d4adda5-7174-4862-b7e0-eed2758c2943`), service
principal đã có, quyền đã vào manifest. Còn thiếu: gán app role và cấp quyền `write` trên site.

Lệnh cụ thể ở [SHAREPOINT.md mục 5](SHAREPOINT.md).

**Xong khi:** `az rest GET .../appRoleAssignments` chỉ in ra `883ea226-...` (Sites.Selected, và
KHÔNG còn FullControl), và `POST /sites/{id}/permissions` đã trả về `roles: ["write"]`.

### 2.3 Chạy thật đồng bộ SharePoint lần đầu

**Đây là lần chạy thật đầu tiên.** Toàn bộ 29 bài kiểm của client chạy trên một máy chủ Graph
giả tại chỗ, vì phiên làm việc viết mã không kết nối được SharePoint thật. Bộ kiểm chứng minh
client gọi đúng những gì tài liệu Graph nói — **không** chứng minh SharePoint thật sẽ nhận.

Thứ tự: khai `SHAREPOINT_*` với `BAT_DAY=0` → **Tính lại đường dẫn** → đọc bảng → `BAT_DAY=1`
→ đẩy thử vài tệp → mở cho cả kho.

**Xong khi:** mở thư viện HCNS trên trình duyệt và thấy hồ sơ nằm đúng nhánh, đúng thư mục
`[Mã NV]-[Họ tên]`, tên tệp đọc được.

### 2.4 Đăng ký vContract (hợp đồng điện tử)

Module hợp đồng điện tử viết xong nhưng chỉ chạy được với **máy chủ giả tại chỗ** — proxy chặn
cả `hopdongdientu.viettel.vn` và `chungtudientu.viettel.vn`, và bạn đang trong quá trình đăng
ký. Hai câu tôi vẫn chưa có câu trả lời:

- **Ai ký phía công ty?** Cần họ tên, email, số điện thoại của người đại diện.
- **Môi trường nào?** `chungtudientu.viettel.vn` (thử) hay `hopdongdientu.viettel.vn` (thật).

Còn thiếu sau khi có tài khoản: gửi hợp đồng đi ký, và tải bản đã ký về `ho_so_tep`.

### 2.5 Việc vận hành tồn đọng

| Việc | Xong khi |
|---|---|
| Đặt `ICLOCK_IP_CHO_PHEP=14.224.235.232` | máy chấm công vẫn đẩy log, IP khác bị chặn |
| Bấm **Gán lại** cho PIN `1` → Phan Song Hào | 4 lượt quét mồ côi ngày 14/08 vào đúng người |
| Xóa nhân viên demo `NVDEMO01`–`08`, thiết bị `THU001` | danh sách nhân viên chỉ còn người thật |
| Gán vai trò **Trưởng phòng nhân sự** cho tài khoản HR | tài khoản đó thay/gỡ được tệp đã nạp |
| Xoay `Viettel@#123` nếu là mật khẩu thật | mật khẩu cũ không đăng nhập được nữa |
| Kéo bản sao lưu về máy khác, hằng tháng | có bản sao ngoài VPS |
| Diễn tập phục hồi, hằng quý | bung một bản sao ra máy khác và đăng nhập được |

### 2.6 Trùng hồ sơ: `ERP147` và `HR-01`

Cùng một người — Hoàng Minh Ngọc — đang có **hai** hồ sơ. Hậu quả:

- Đếm sai "tổng nhân viên" và "vắng hôm nay" trên dashboard.
- Trên SharePoint sẽ tách tệp của một người thành **hai** thư mục.

Tôi đã đề xuất một công cụ gộp (giữ PIN, ca làm và lịch sử quét của bản ghi cũ) và đang chờ
bạn đồng ý. **Nên xử lý trước khi đẩy tệp lên SharePoint** — gộp sau thì phải dọn cả thư mục
đã tạo bên đó.

## 3. Giai đoạn sau

### 3.1 Khiếu nại nhân sự

Bạn quyết định xây dựng sau. Hiện trạng: bảng `khieu_nai` và giao diện đã có và dùng được, tệp
đính kèm lưu bình thường **trên máy chủ**.

**Cố ý KHÔNG đồng bộ sang SharePoint.** Hai lý do, và lý do thứ hai quan trọng hơn:

1. Đặc tả thư mục của HCNS chưa có nhánh nào cho khiếu nại.
2. Khiếu nại có thể là **về chính người có quyền đọc thư mục đích**. Đẩy nó vào một nhánh đoán
   bừa là loại sai tệ nhất có thể — nên hàm ánh xạ trả `null` và trên trang quản trị nó hiện ở
   mục *Không đồng bộ* kèm lý do đọc được, thay vì lặng lẽ không có gì.

**Khi triển khai, cần quyết ba việc:**

- Nhánh nào trên SharePoint, và **ai** được đọc nhánh đó. Đây là câu khó nhất: người phụ trách
  thư mục HCNS có thể chính là người bị khiếu nại.
- Quy trình: ai nhận, ai xử lý, thời hạn phản hồi.
- Có cần chế độ **ẩn danh** không. Nếu có thì phải tính lại từ tầng dữ liệu, không chắp thêm
  được: một bảng có `nhan_vien_id` thì không ẩn danh nổi bằng cách che ở giao diện.

**Việc phải làm trong code, khi tới lúc:** khai nhánh vào `NHANH` trong
`may_chu/src/sharepoint/anh_xa.ts` và bỏ `khieu_nai` khỏi đường `default` của `chon_nhanh`.
Không cần đổi gì khác — bộ san bằng sẽ tự đẩy các tệp đang chờ.

### 3.2 Hai nhánh có người phụ trách riêng

`05 CHẤM CÔNG – NGHỈ PHÉP` và `06 TUYỂN DỤNG & THỬ VIỆC` đang được **triển khai song song bằng
tay**, có người phụ trách. Ứng dụng **không ghi vào và không xóa trong** hai nhánh này.

Đây là một **quyết định**, không phải một thiếu sót — nên nó được ghi thành bảng có tên
`NHANH_NGUOI_KHAC` trong mã nguồn, và có ba bài kiểm chặn: không ghi, không xóa, không tạo thư
mục. Một bài kiểm nữa bắt buộc rằng thêm một trong hai nhánh vào `NHANH` phải **kèm** việc gỡ
nó khỏi `NHANH_NGUOI_KHAC` — tức là một hành động có ý, có đối chiếu với người phụ trách, chứ
không phải một dòng thêm vào lúc dọn dẹp.

Hệ thống **đang có** dữ liệu khớp tự nhiên với hai nhánh đó (chấm công, đơn nghỉ phép, hồ sơ
thử việc). Nếu sau này thống nhất chuyển sang hệ thống thì việc cần làm là:

1. Người phụ trách xác nhận cấu trúc thư mục con hiện tại.
2. Gỡ nhánh khỏi `NHANH_NGUOI_KHAC`, khai vào `NHANH`, thêm `chon_nhanh` cho nhóm tương ứng.
3. Chạy **Tính lại đường dẫn** với `BAT_DAY=0`, đọc bảng, đối chiếu với người phụ trách, rồi
   mới bật.

### 3.3 App điện thoại v2

Hai bộ design token (`web` dùng Inter/`#0F62FE`, `mobile` dùng Be Vietnam Pro/`#4285F4`) cố ý
để riêng cho kế hoạch v2. Xem `CLAUDE.md`.

## 4. Nợ kỹ thuật đã biết

| Mục | Ghi chú |
|---|---|
| Đồng bộ SharePoint chưa chạy thật lần nào | mục 2.3 |
| vContract chỉ chạy với máy chủ giả | proxy chặn cả hai tên miền của Viettel |
| Đồng bộ ERP: đọc được, chưa ghi ngược | ERP cũ là nguồn đọc, không nhận ghi |
| Đồng bộ SharePoint là **một chiều** | sửa hay xóa trực tiếp trên SharePoint không phản ánh về máy chủ, và vòng quét kế tiếp đẩy lại bản gốc |
| `noi_dung_text` của hợp đồng không có giá trị pháp lý | bản có giá trị là tệp gốc trong `ho_so_tep`; text chỉ để tìm kiếm |
