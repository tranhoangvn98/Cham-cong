# Từ điển thuật ngữ — Giám sát gian lận ERP

Tài liệu này tồn tại vì một lý do cụ thể: **module Giám sát ghép ba vốn từ vốn không nói
chuyện với nhau** — nghiệp vụ thương mại biên giới Việt–Trung, kế toán/kiểm soát nội bộ, và
kỹ thuật phần mềm. Cùng một từ mang nghĩa khác nhau ở ba nơi, và một câu hiểu sai trong lúc
đặt ngưỡng cảnh báo sẽ sinh ra cảnh báo nhắm vào người thật.

Quy ước đọc: cột **Trong code** là định danh tiếng Việt **không dấu** dùng trong mã nguồn và
tên bảng CSDL (theo `CLAUDE.md`); cột **Trên giao diện** là chuỗi **có dấu** hiển thị cho
người dùng.

---

## 1. Thuật ngữ nghiệp vụ thương mại biên giới

| Thuật ngữ chuẩn | Tiếng Trung | Viết SAI thường gặp | Nghĩa |
|---|---|---|---|
| **Wuliu** | 物流 | ~~U Liễu~~, ~~Ú Liu~~ | Dịch vụ logistics/vận tải phía Trung Quốc. **Trong mọi văn bản chính thức viết là "Wuliu"**, không phiên âm. |
| **ủy thác XNK** | 代理进出口 | ~~ủy thác xuất nhập khẩu~~ (dài), ~~ủy thác XNK dịch vụ~~ | Dịch vụ đứng tên pháp nhân làm thủ tục xuất/nhập khẩu thay chủ hàng. Viết tắt cố định là **"ủy thác XNK"**. |
| Lô hàng | 批货 | | Đơn vị gom hàng đi cùng một chuyến/một tờ khai. Trong ERP 1 ứng với `container` / `Fk_container_id`. |
| Tờ khai | 报关单 | | Tờ khai hải quan. Bảng `Tax` trong `erp_logistic`. |
| Kiện | 件 | | Đơn vị đóng gói nhỏ nhất đếm được khi giao nhận. |
| Biên mậu | 边贸 | | Thương mại qua cửa khẩu biên giới đất liền, khác đường biển/hàng không về thủ tục và về SLA. |

### Chữ viết tắt nội bộ

| Viết tắt | Đầy đủ | Nằm ở đâu trong ERP 1 |
|---|---|---|
| **PKL** | Packing list — bảng kê đóng gói | `inventorydb`, bảng `PackingList` |
| **NKCT** | Nhập kho chứng từ — phiếu nhập kho theo chứng từ | `inventorydb`, `RepositoryCheck` |
| **KCB** | Kiểm chứng bãi — nghiệp vụ kiểm hàng tại bãi | `erp_logistic`, quyền `KCB_EDITING` |
| **DX chi / DX thu** | Đề xuất chi / Đề xuất thu | `cms*`, `usr.tbl_DX_chi`, `thu.tbl_dx_thu` |
| **SLA** | Service Level Agreement — cam kết thời hạn xử lý | cột `SlaStatus` trên `Tax`; và `loai_canh_bao.sla_xu_ly_gio` bên ERP 2 |

> **Bẫy:** "SLA" trong module này mang **hai nghĩa** ở hai chỗ. `SlaStatus` của ERP 1 là cam
> kết xử lý **tờ khai**. `sla_xu_ly_gio` của ERP 2 là hạn để **người kiểm soát xử lý một cảnh
> báo**. Không phải một thứ.

---

## 2. Thuật ngữ của module Giám sát

Bốn khái niệm dưới đây là xương sống của module. Hiểu lẫn lộn giữa chúng là hiểu sai toàn bộ
màn hình cấu hình.

| Trong code | Trên giao diện | Là gì | Ví dụ |
|---|---|---|---|
| `loai_canh_bao` | Danh mục cảnh báo | **Nhóm rủi ro**. Cấp phân loại cao nhất, gom các lỗi cùng bản chất; mang mức độ mặc định, SLA xử lý và hướng dẫn xử lý. | "Giao dịch bất thường" |
| `loai_loi` | Danh mục lỗi | **Một dấu hiệu cụ thể** thuộc một nhóm. Mang bộ phận chịu trách nhiệm, hậu quả, hướng khắc phục, căn cứ quy chế. | "Người đề xuất chi trùng người duyệt chi" |
| `dieu_kien_loi` | Điều kiện | **Ngưỡng để một lỗi được coi là phát hiện.** Nhiều điều kiện của cùng một lỗi nối bằng **AND**. Cần OR thì tạo hai lỗi. | `chi_duyet_sieu_toc` `<` `5` (phút) |
| `phep_do` | Phép đo | **Câu truy vấn đã viết sẵn trong mã nguồn** trả về một con số cho mỗi bản ghi ERP 1. Admin **không** sửa được phép đo, chỉ chọn phép đo nào và đặt tham số/ngưỡng. | `chi_duyet_sieu_toc` |

Quan hệ: một `loai_canh_bao` chứa nhiều `loai_loi`; một `loai_loi` có nhiều `dieu_kien_loi`;
mỗi `dieu_kien_loi` trỏ tới đúng một `phep_do`.

### Các khái niệm còn lại

| Trong code | Trên giao diện | Nghĩa |
|---|---|---|
| `canh_bao` | Dấu hiệu cần kiểm tra | Một bản ghi do máy sinh khi tất cả điều kiện của một lỗi cùng thỏa. **Không phải kết luận** — xem mục 4. |
| `bang_chung` | Bằng chứng | Các trường số liệu làm căn cứ, lưu dạng JSON. Chỉ lưu trường cần để đối chiếu, **không** sao chép nguyên bản ghi ERP 1. |
| `anh_chup_erp` | Ảnh chụp | Vân tay SHA-256 của các trường trọng yếu, chụp mỗi vòng quét. Vân tay đổi = có người sửa. |
| `van_tay` | Vân tay | Chuỗi SHA-256 tính từ các trường theo dõi, sắp khóa theo thứ tự cố định. |
| `lan_quet_giam_sat` | Nhật ký quét | Một dòng cho mỗi lần quét một loại lỗi: đọc bao nhiêu bản ghi, sinh bao nhiêu cảnh báo, hết bao nhiêu mili giây, thành công hay không. |
| `nguon_du_lieu` | Nguồn dữ liệu | Ánh xạ từ mã nguồn phẳng (`hola`, `sale`, `debt`, `logs`, `kho`) sang **tên database thật** của ERP 1. Tên database do màn hình dò tìm điền, không chết cứng trong code. |
| `ky` | Kỳ | Chuỗi `YYYY-MM` cho cảnh báo theo tháng; `null` với cảnh báo tức thời. Tham gia khóa chống trùng. |

### Mã nguồn dữ liệu

| Mã | Nội dung | Repo ERP 1 tương ứng |
|---|---|---|
| `hola` | Chi, thu, ví, giao dịch ngân hàng | `erp_manager` |
| `sale` | Đơn hàng, cơ hội bán hàng, lịch sử sửa đơn | `erp_manager` |
| `debt` | Công nợ khách hàng, nhân viên, nhà cung cấp | `erp_manager` |
| `logs` | Nhật ký thao tác người dùng | `erp_manager` |
| `kho` | Packing list, phiếu nhập kho, tờ khai, hóa đơn VAT | `erp_logistic` |

Đây là **danh sách đóng** khai trong `may_chu/src/giam_sat/nguon.ts`. Thêm nguồn phải sửa code
— có chủ đích, vì mỗi nguồn là một pool kết nối vào CSDL sản xuất của hệ thống khác.

---

## 3. Trạng thái và mức độ

**Vòng đời một cảnh báo** (`canh_bao.trang_thai`):

| Mã | Nhãn | Ai đặt |
|---|---|---|
| `moi` | Mới | **Máy** — và đây là trạng thái duy nhất máy được đặt |
| `dang_kiem_tra` | Đang kiểm tra | Người kiểm soát |
| `xac_nhan` | Đã xác nhận | Người kiểm soát |
| `bo_qua` | Bỏ qua | Người kiểm soát |
| `da_xu_ly` | Đã xử lý | Người kiểm soát |

**Mức độ** (`muc_do`): `thap` (Thấp) · `trung` (Trung bình) · `cao` (Cao) ·
`nghiem_trong` (Nghiêm trọng).

**Vai trò**: `kiem_soat` (Kiểm soát nội bộ) — xem và xử lý cảnh báo, sửa danh mục và điều
kiện. Tách khỏi `nhan_su` và khỏi trưởng bộ phận **vì nhân sự và trưởng bộ phận nằm trong số
những người bị giám sát**.

---

## 4. Ba cặp từ dễ nhầm — mỗi cặp là một sự cố đã lường trước

**"Dấu hiệu" ≠ "kết luận".** Giao diện, email và tài liệu đều dùng từ *dấu hiệu cần kiểm tra*.
Một cảnh báo nói rằng số liệu khớp một mẫu đáng ngờ, không nói rằng có người làm sai. Người bị
nêu tên có quyền giải trình trước khi có kết luận (Bộ luật Lao động 2019, Điều 122). Đây
không phải câu chữ cho đẹp: `may_chu/src/vi_pham/phat_hien.ts` đã có tiền lệ này, và test
`giam_sat_ban_tin.test.ts` sẽ đỏ nếu câu "KHÔNG phải kết luận" biến mất khỏi email.

**"Lỗi" (`loai_loi`) ≠ "lỗi kỹ thuật".** Trong module này `loai_loi` là một **loại sai phạm
nghiệp vụ** trong danh mục kiểm soát, không phải exception hay bug. Lỗi kỹ thuật của vòng quét
ghi vào `lan_quet_giam_sat.thanh_cong = false`.

**"Phép đo" ≠ "quy tắc".** Phép đo trả về **một con số**. Quy tắc là con số đó **so với một
ngưỡng**. Cùng một phép đo `chi_duyet_sieu_toc` phục vụ được nhiều quy tắc khác ngưỡng cho
các hạn mức tiền khác nhau.

---

## 5. Từ khóa kỹ thuật hay gặp trong mã nguồn module

| Từ | Nghĩa trong repo này |
|---|---|
| `doc()` | Đọc ERP 1 — luôn bọc trong `begin read only` |
| `doc_noi_bo()` | Đọc CSDL Chấm công (ERP 2) |
| `ngu_canh` / `NguCanh` | Bộ công cụ truyền vào phép đo: hai hàm đọc + mốc thời gian. Có nó thì test tiêm được dữ liệu giả mà không cần CSDL thật. |
| `chi_muc.ts` | Danh sách đóng các phép đo. Phép đo không có trong đây là phép đo **không bao giờ chạy**. |
| `thoa_man()` | Hàm so ngưỡng dùng chung với module Vi phạm nội quy. Toán tử lạ ⇒ **không khớp** (thà bỏ sót còn hơn bắt oan). |
| `o_csv()` | Vô hiệu hóa ô CSV bắt đầu bằng `= + - @` (CSV injection). |
| `chua_trien_khai` | Cờ trên một phép đo tuyên bố ERP 1 chưa có dữ liệu để đo. Phép đo **từ chối chạy kèm lý do**, thay vì trả 0 dòng im lặng. |

> **Bẫy đã xác minh trên mã nguồn ERP 1:** `Tax.TaxStatus` và `Tax.SlaStatus` lưu **kèm dấu
> nháy kép** (`"APPROVED"`) vì EF cấu hình `HasConversion` sang JSON. Câu
> `where "TaxStatus" = 'APPROVED'` luôn trả 0 dòng — và nhìn y hệt "không có cảnh báo nào".
> Mọi so sánh trong module đã bọc qua `replace(cot, '"', '')`.

---

Xem thêm: `tai_lieu/GIAM-SAT-GIAN-LAN.md` (đặc tả đầy đủ) ·
`tai_lieu/RUNBOOK-GIAM-SAT.md` (vận hành) · `tai_lieu/adr/` (lý do của các quyết định).
