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

## Làm việc này **trước** khi bật đẩy lên SharePoint

Đây là lý do công cụ được viết. Thư viện HCNS đang có người dùng; một hồ sơ trùng đẩy lên sẽ tạo
hai thư mục nhân viên trong thư viện thật, và dọn tay ở đó vướng người khác. Xem
[`SHAREPOINT.md`](SHAREPOINT.md) mục *Thứ tự bật*.

> Lệnh trong container chạy bản đã biên dịch (`dist/`). Trên máy lập trình dùng biến thể
> `npm run gop_trung_ma_nguon` để chạy trực tiếp từ `src`.
