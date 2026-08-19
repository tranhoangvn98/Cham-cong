# Gộp hai hồ sơ là cùng một người

Một người có hai hồ sơ trong hệ thống là chuyện xảy ra được, và đã xảy ra: đợt đồng bộ ERP tạo
`ERP147 — HOÀNG MINH NGỌC` trong khi nhân sự đã tự nhập `HR-01` cho cùng người đó. Hai hồ sơ thì
lần quét vào một bên, hợp đồng nằm bên kia, bảng công chia đôi, và trên SharePoint sẽ mọc **hai
thư mục nhân viên** cho một người.

Công cụ này gộp chúng lại: mọi dòng đang trỏ tới hồ sơ **bỏ** được chuyển sang hồ sơ **giữ**, rồi
hồ sơ bỏ bị xóa.

```bash
# 🖥️ Trên VPS — liệt kê các cặp NGHI LÀ trùng
cd /root/Cham-cong && docker compose exec may_chu npm run gop_trung

# Chạy thử một cặp: <mã GIỮ LẠI> <mã BỎ>
cd /root/Cham-cong && docker compose exec may_chu npm run gop_trung -- HR-01 ERP147

# Gộp thật
cd /root/Cham-cong && docker compose exec may_chu npm run gop_trung -- HR-01 ERP147 --that
```

**Mặc định là chạy thử**, và ở đây điều đó quan trọng hơn mọi chỗ khác: gộp là đổi chủ hàng trăm
dòng bảng công, bảng lương, KPI của một người thật, rồi xóa một hồ sơ. Không hoàn tác được bằng
một lệnh — muốn lùi lại thì phải phục hồi từ bản sao lưu.

## Thứ tự hai mã là quan trọng, và không đoán được

Tham số thứ nhất là mã **giữ lại**, thứ hai là mã **bỏ**. Gõ ngược hai mã là gộp ngược: lần quét
của bản đúng sẽ thành của bản bị bỏ, rồi bản đúng bị xóa. Vì không đoán được nên **không có mặc
định** — thiếu tham số thì công cụ chỉ liệt kê, không làm gì.

Lệnh liệt kê có đề nghị nên giữ bản nào, kèm lý do. Nó ưu tiên bản **có PIN trên máy chấm công**
(vì đó là bản mà máy đang gửi log về), sau đó là bản có nhiều lần quét hơn. Đề nghị chỉ là đề
nghị — người xem quyết.

## Nó tự tìm bảng, không đọc một danh sách gõ tay

Công cụ đọc **khóa ngoại từ catalog Postgres** (`pg_constraint`) để biết bảng nào trỏ tới
`nhan_vien`, thay vì mang trong mình một danh sách bảng.

Lý do: danh sách gõ tay thì mỗi lần thêm bảng mới là một cơ hội quên, và quên thì không đỏ test —
chỉ là một hồ sơ không gộp hết, phát hiện ra vài tháng sau khi bảng lương lệch. Có một bài kiểm
đối chiếu số bảng mà công cụ tìm được với số khóa ngoại đếm trực tiếp từ `pg_constraint`, nên
thêm bảng mới mà công cụ không thấy thì test đỏ.

## Khóa nối ra ngoài được mang sang bản giữ

Đây là chỗ bản đầu tiên của công cụ **sai**, và cái sai đó tự huỷ việc gộp.

`nhan_vien.erp_user_id` có unique index, và bộ đồng bộ ERP khớp người theo `erp_user_id` trước,
rồi mới đến `email`. Xóa bản `ERP147` là xóa luôn số ERP đó khỏi cơ sở dữ liệu — lượt đồng bộ kế
tiếp không tìm thấy ai mang số đó, không khớp được email, nên **tạo lại một bản ghi mới**. Cặp
trùng quay về nguyên vẹn, vài giờ sau khi ai đó bấm Đồng bộ thật, không báo gì.

Nên công cụ mang các ô sau từ bản bỏ sang bản giữ, **chỉ khi bản giữ đang để trống**:

| Nhóm | Cột | Mất thì sao |
|---|---|---|
| Khóa nối ra ngoài | `erp_user_id`, `erp_username`, `erp_dong_bo_luc`, `ma_erp`, `email` | Đồng bộ ERP tạo lại đúng bản vừa xóa |
| Khóa nối vào máy | `pin_may` | Lần quẹt sau không biết là của ai |
| Thông tin nhân sự | `phong_ban_id`, `ca_lam_id`, `chuc_danh`, `nguoi_quan_ly_id`, `ngay_vao`, `ngay_chinh_thuc`, `so_dien_thoai` | Mất dữ liệu người ta đã nhập |

Hai bên **đều có** giá trị và khác nhau thì **không ghi đè** — đó là dữ liệu thật cả hai phía, máy
không chọn được. Báo cáo nói rõ chỗ lệch để sửa tay.

Và bốn cột **cố ý không mang theo**:

- `dang_hoat_dong`, `ngay_nghi_viec` — mang theo là có thể âm thầm cho một người đã nghỉ thành
  đang làm, hoặc ngược lại.
- `duoc_cham_cong_dien_thoai` — mặc định **tắt** để chống gian lận. Mang `true` từ một bản ghi
  sắp bị xóa là âm thầm mở một cửa chống gian lận, và không ai đọc lại báo cáo gộp sau ba tháng.
- `so_ngay_phep_nam` — `not null default 12`, nên "để trống" không phân biệt được với "cố ý đặt
  12".

Bốn cột này **lệch nhau thì báo**, không tự chọn. Có một bài kiểm đọc danh sách cột của
`nhan_vien` từ `information_schema` và đòi **mọi cột** phải nằm trong đúng một trong hai danh
sách — thêm cột mới mà không quyết định nó có mang theo hay không thì test đỏ, thay vì im lặng
làm mất dữ liệu ở lần gộp đầu tiên sau đó.

Thứ tự trong giao dịch là **xóa bản bỏ trước, rồi mới điền vào bản giữ**. Ngược lại là đụng chính
ràng buộc UNIQUE của bản đang bị bỏ (Postgres `23505`). Giá trị đã đọc vào bộ nhớ từ trước nên
không mất gì — và có bài kiểm giữ đúng thứ tự này.

## Dòng trùng thì mất theo hồ sơ bỏ

Vài bảng có ràng buộc UNIQUE theo `(nhan_vien_id, …)` — `bang_cong_ngay` là một ví dụ, một người
một ngày một dòng. Nếu **cả hai** hồ sơ đều có dòng của ngày 15/07, không thể chuyển dòng của bản
bỏ sang được: nó sẽ đụng ràng buộc.

Công cụ giữ dòng của bản **giữ lại** và để dòng của bản bỏ ở lại — nghĩa là dòng đó **mất khi xóa
hồ sơ bỏ**. Con số này được in riêng ở dòng `TRÙNG`, cả trong lần chạy thử. Xem trước con số đó,
và nếu nó lớn thì tính lại xem có nên giữ bản kia.

Sau khi gộp, vào **Bảng công**, chọn tháng liên quan và bấm **Tính lại tháng** — bảng công được
dựng lại từ lần quét. Dữ liệu nguồn không mất, chỉ bảng tổng hợp cần tính lại: `lan_quet` không
có ràng buộc UNIQUE nào chứa `nhan_vien_id` (khóa chống trùng của nó dựng từ số máy và thời điểm,
không dính tới hồ sơ), nên **mọi lần quét đều chuyển sang được** — không mất dòng nào.

## Nó từ chối khi nào

- **Cả hai hồ sơ đều có tài khoản đăng nhập.** Gộp sẽ để lại một tài khoản mồ côi hoặc phải xóa
  một tài khoản đang dùng — cả hai đều không phải việc của công cụ này. Xóa tài khoản dư trước.
- **Hai mã trỏ về cùng một hồ sơ**, hoặc một mã không tồn tại.

Họ tên khác nhau thì **cảnh báo, không chặn**: `HOÀNG MINH NGỌC` với `Hoàng Minh Ngọc` là cùng
người, còn hai người cùng tên thì thật sự là hai người. Máy không phân biệt được, người thì được.

## Việc còn lại sau khi gộp

Tên thư mục trên đĩa vẫn là tên cũ — thư mục lệch không làm mất tệp (đường đọc là
`ho_so_tep.ten_luu`, xem [`SAO-LUU-VA-PHUC-HOI.md`](SAO-LUU-VA-PHUC-HOI.md)), nhưng nên dọn:

```bash
cd /root/Cham-cong && docker compose exec may_chu npm run sap_xep_tep -- --that
```

## Sửa một lần gộp đã làm mất liên kết ERP (bản 1.31.0)

Bản `1.31.0` **chưa** mang khóa nối theo. Nếu bạn đã gộp bằng bản đó và bản giữ không có
`erp_user_id`, làm thế này — không cần SQL tay:

```sql
-- Ai đang thiếu liên kết ERP
select ma_nv, ho_ten, email, erp_user_id from nhan_vien where erp_user_id is null;
```

1. Vào **Hệ thống → Đồng bộ ERP**, bấm **Chạy thử**. Nó đọc ERP và cho biết sẽ tạo/sửa ai, không
   ghi gì.
2. Nếu người đó hiện ở dòng `tạo mới`, xem email ERP của họ và đặt đúng email đó cho hồ sơ giữ
   (**Hồ sơ nhân sự → Thông tin chung**).
3. Bấm **Chạy thử** lại. Giờ họ phải hiện ở dòng `cập nhật` — bộ đồng bộ khớp được theo email.
4. Bấm **Đồng bộ thật**. Nó ghi `erp_user_id` về đúng hồ sơ giữ, và liên kết nối lại.

Nếu bấm **Đồng bộ thật** trước khi làm bước 2, nó sẽ tạo lại một hồ sơ trùng — lúc đó gộp lại
bằng bản `1.31.1` là xong, và lần này khóa nối được mang theo.

## Làm việc này **trước** khi bật đẩy lên SharePoint

Đây là lý do công cụ được viết. Thư viện HCNS đang có người dùng; một hồ sơ trùng đẩy lên sẽ tạo
hai thư mục nhân viên trong thư viện thật, và dọn tay ở đó vướng người khác. Xem
[`SHAREPOINT.md`](SHAREPOINT.md) mục *Thứ tự bật*.

> Lệnh trong container chạy bản đã biên dịch (`dist/`). Trên máy lập trình dùng biến thể
> `npm run gop_trung_ma_nguon` để chạy trực tiếp từ `src`.
