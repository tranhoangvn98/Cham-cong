# Kế hoạch triển khai

Cái gì đang chạy, cái gì đang chờ ai, và cái gì cố ý để lại sau.

Mỗi mục ghi rõ **ai làm** và **thế nào là xong**. Mục nào tôi không tự kiểm được thì nói thẳng
là không kiểm được, thay vì để nó nằm trong danh sách "đã xong" cho đủ.

Ngày cập nhật: 19-08-2026 — bản 1.30.0.

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
| Bản chốt bảng công / bảng lương sau khi duyệt (XLSX) | chạy thật |
| Đơn nghỉ phép / giải trình: nhân viên lên đơn, duyệt, lưu bản đơn (DOCX) | chạy thật |
| Đơn làm thêm / đổi ca / công tác / thôi việc + cảnh báo BLLĐ Điều 107, 35 | chạy thật |
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

### 2.3 Chạy thật đồng bộ SharePoint lần đầu — ĐƯỜNG ĐẨY: XONG (20-08-2026)

Đã chạy thật với 4 tệp thử: `npm run kiem_sharepoint` báo **16/16 nhánh khớp tên**, `npm run
dong_bo_sharepoint` báo **đã đẩy 4, lỗi 0**, và bảng trạng thái có `sp_item_id` (do Graph cấp)
cùng `duong_dan_da_day = duong_dan_muon` cho cả 4 dòng.

Thứ tự đã dùng, giữ lại vì sẽ cần lại khi đổi site hay đổi thư viện: khai `SHAREPOINT_*` với
`BAT_DAY=0` → `npm run kiem_sharepoint` (chỉ đọc) → xem `duong_dan_muon` trong bảng → `BAT_DAY=1`
→ `npm run dong_bo_sharepoint`. Lượt gọi Graph thật đầu tiên nên luôn là `kiem_sharepoint`: nó
chỉ đọc, nên cấu hình sai cũng không để lại gì trong thư viện của HCNS.

**Còn lại — đường XÓA chưa chạy thật lần nào**, và nó hỏng im lặng: hồ sơ đã gỡ ở hệ thống vẫn
sống trên SharePoint và không có gì báo. Thử bằng chính 4 tệp vừa đẩy: gỡ tệp trong ứng dụng →
`npm run dong_bo_sharepoint` → chờ cột `đã xóa` bằng 4 → mở lại thư viện xem PDF đã biến mất.

**Xong khi:** cột `đã xóa` khác 0 và thư viện HCNS không còn 4 tệp thử đó.

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

### 3.2 Nhánh `05.2 Đơn từ & Theo dõi phép` — cố ý để trống

Đã có câu trả lời: **bản đơn đã duyệt giữ trên hệ thống, không đẩy sang SharePoint.**

Không phải vì thiếu nhánh — `05.2` có sẵn và vừa đúng. Là một quyết định về dữ liệu: một tờ đơn
nghỉ ốm mang theo lý do nghỉ, tức là **dữ liệu sức khỏe**, dữ liệu cá nhân *nhạy cảm* theo NĐ
13/2023. Trong hệ thống, quyền đọc tính theo từng người (`quyen_ho_so.ts`); trong một thư viện
dùng chung thì không.

Bản đơn nằm trong kho hồ sơ nhóm `don_tu` — xem `CHANGELOG` bản 1.29.0. Trên trang quản trị
SharePoint nó hiện ở mục *Không đồng bộ* kèm lý do, chứ không lặng lẽ không có gì.

Nếu sau này đổi ý thì việc phải làm là một dòng trong `chon_nhanh` — và trước đó phải trả lời
được: ai đọc được `05.2`, và họ có được phép đọc lý do nghỉ ốm của người khác không.

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
