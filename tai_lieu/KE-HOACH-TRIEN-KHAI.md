# Kế hoạch triển khai

Cái gì đang chạy, cái gì đang chờ ai, và cái gì cố ý để lại sau.

Mỗi mục ghi rõ **ai làm** và **thế nào là xong**. Mục nào tôi không tự kiểm được thì nói thẳng
là không kiểm được, thay vì để nó nằm trong danh sách "đã xong" cho đủ.

Ngày cập nhật: 19-08-2026 — bản 1.26.2.

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

### 3.2 Hai nhánh sẽ ghi vào nhưng chưa mở: `05` và `06`

`05 CHẤM CÔNG – NGHỈ PHÉP` và `06 TUYỂN DỤNG & THỬ VIỆC` đang có người dùng thật. Đã thống nhất
là hồ sơ của hệ thống sẽ nằm trong đó, **theo đúng phân loại sẵn có của nhánh** — không tạo cấu
trúc riêng.

Ứng dụng **chưa ghi vào**, vì còn thiếu hai thứ và thiếu một trong hai là chưa được ghi:

1. **Tên thư mục con, chính xác từng ký tự.** Đoán tên là Graph tạo mới một thư mục nằm cạnh
   thư mục thật, hồ sơ bay vào chỗ không ai mở.
2. **Chốt phân loại** với người đang phụ trách: nhóm nào của hệ thống thuộc thư mục con nào.

Lấy tên thư mục con (chạy trong Azure Cloud Shell):

```bash
D='<SHAREPOINT_DRIVE_ID>'
for F in '05 CHẤM CÔNG – NGHỈ PHÉP' '06 TUYỂN DỤNG & THỬ VIỆC'; do
  P=$(python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))" "$F")
  echo "=== $F"
  az rest --method get --url "https://graph.microsoft.com/v1.0/drives/$D/root:/$P:/children?\$select=name,folder,file" \
    --query 'value[].{ten:name, la_thu_muc:folder!=null}' -o table
done
```

#### Hệ thống hiện có tệp nào cho hai nhánh này

**`06 TUYỂN DỤNG & THỬ VIỆC` — có.** Đang nằm ở nhánh khác:

| Tệp | Hiện đi vào | Có thể thuộc `06` |
|---|---|---|
| `hop_dong` loại `thu_viec` (HĐ thử việc) | `02.1 Quan hệ lao động – HĐLĐ` | hợp đồng thử việc là văn bản thử việc |
| `tai_lieu` mã `so_yeu_ly_lich` | `01 HỒ SƠ NHÂN SỰ (201)` | sơ yếu lý lịch là hồ sơ ứng tuyển |
| `tai_lieu` mã `qd_tiep_nhan` | `01` | quyết định tiếp nhận là kết quả thử việc |
| `tai_lieu` mã `bang_cap`, `chung_chi` | `01` | tài liệu ứng tuyển, nhưng cũng là hồ sơ 201 lâu dài |

Bốn dòng này **phải người phụ trách quyết**, không tự quyết được: cùng một tệp có thể thuộc
`06` (giai đoạn tuyển dụng) hoặc `01`/`02.1` (hồ sơ nhân sự lâu dài), và đặc tả không nói rõ.
Đưa hợp đồng thử việc ra khỏi `02.1` đặc biệt cần xác nhận.

**`05 CHẤM CÔNG – NGHỈ PHÉP` — hiện KHÔNG có tệp nào.** `don_nghi_phep` và `don_giai_trinh`
**không có tệp đính kèm** trong lược đồ hiện tại, và bảng công là dữ liệu tính ra chứ không phải
tệp. Ánh xạ `05` bây giờ chỉ tạo ra một loạt thư mục rỗng.

Muốn `05` có nội dung thì cần **thêm việc mới**, chọn một trong hai (hoặc cả hai):

- **Đơn nghỉ phép có tệp đính kèm** — thêm cột `tep_id` vào `don_nghi_phep` / `don_giai_trinh`,
  thêm nhóm hồ sơ mới, sửa giao diện đơn từ. Dùng cho giấy nghỉ ốm, giấy tờ chứng minh.
- **Xuất bảng công hằng tháng thành tệp** (PDF hoặc XLSX) và đẩy lên. Việc này chưa có.

Cả hai đều là công việc riêng, không nằm trong phạm vi đồng bộ SharePoint.

#### Khi mở nhánh ra, việc phải làm trong code

1. Gỡ nhánh khỏi `NHANH_CHUA_MO` trong `may_chu/src/sharepoint/anh_xa.ts`.
2. Khai đường dẫn thư mục con vào `NHANH` (khớp từng ký tự) và khai `MUC_NHAY_CAM` cho nó.
3. Thêm nhánh tương ứng vào `chon_nhanh`.
4. Chạy **Tính lại đường dẫn** với `BAT_DAY=0`, đọc bảng, đối chiếu với người phụ trách, rồi
   mới bật.

Bốn bài kiểm hiện đang chặn hai nhánh này, và một trong số đó bắt buộc bước 1 phải đi cùng
bước 2 — không thể lặng lẽ thêm một dòng vào `NHANH`.

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
