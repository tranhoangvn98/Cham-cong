# ADR-0003: SQL nằm trong mã nguồn, không nằm trong CSDL

- **Ngày:** 02.09.2026
- **Trạng thái:** Đã quyết
- **Người quyết:** phụ trách CNTT

## Bối cảnh

Yêu cầu: Ban điều hành tự khai báo được danh mục lỗi kèm điều kiện qua giao diện, không cần
lập trình viên. Câu hỏi: "điều kiện" được lưu ở dạng gì.

## Các phương án đã cân nhắc

**A. Lưu câu SQL trong CSDL, admin nhập qua UI.** Linh hoạt tối đa — thêm quy tắc mới không
cần deploy.

**B. Cây biểu thức cấu hình được** (bảng + cột + toán tử, lồng nhau, AND/OR). Không cho nhập
SQL, nhưng vẫn linh hoạt.

**C. Danh sách đóng các "phép đo" khai trong TypeScript; CSDL chỉ lưu ngưỡng và tham số.**

## Quyết định

Chọn **C**.

Phương án A bị loại thẳng: nó biến màn hình cấu hình thành **cổng thực thi SQL trên CSDL sản
xuất của hệ thống khác**. Bất kỳ ai chiếm được một tài khoản `kiem_soat` đều chạy được câu
lệnh tùy ý trên dữ liệu tài chính của công ty. Không có mức phân quyền nào bù được điều đó.

Phương án B loại vì hai lý do: một cây biểu thức lồng nhau cấu hình qua UI là thứ không ai
đọc lại được sau sáu tháng; và nó vẫn phải sinh SQL từ dữ liệu người dùng nhập, tức vẫn phải
giải quyết đúng bài toán an toàn của A, chỉ khó hơn.

Phương án C đúng tiền lệ sẵn có của repo: `quy_tac_vi_pham.chi_so` (`013_vi_pham.sql`) cũng
là một danh sách đóng, với chính lý do này ghi trong comment: *"danh sách đóng (không phải tự
do) để không bao giờ phải nối chuỗi vào SQL"*.

## Hệ quả

**Tích cực**
- Không có đường nào để dữ liệu người dùng đi vào câu SQL. Tham số qua `$1,$2`.
- Đổi ngưỡng không cần deploy — đúng yêu cầu ban đầu.
- Mã phép đo là hợp đồng ổn định giữa code và cấu hình.
- Giao diện tự dựng form từ khai báo `tham_so`, nên thêm phép đo không phải sửa UI.

**Tiêu cực**
- Thêm một **loại** quy tắc mới phải deploy. Chấp nhận được: 39 phép đo đã phủ 6 nhóm nghiệp
  vụ, và thêm phép đo là việc vài tháng một lần chứ không phải hàng tuần.
- Nhiều điều kiện của một loại lỗi chỉ nối bằng AND. Cần OR thì tạo hai loại lỗi — kém tinh
  tế nhưng đọc lại được.

## Cưỡng chế

`thiet_ke/kien_truc.test.mjs` chặn nối chuỗi vào SQL trong module, chạy ở cổng CI số 5.
