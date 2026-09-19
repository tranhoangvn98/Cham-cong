# Trợ lý dữ liệu (chatbot) cho nhân viên

Nút tròn góc phải dưới ở **góc nhìn Cá nhân** mở trợ lý. Hỏi bằng tiếng Việt thường, trợ lý
trả lời từ dữ liệu của chính người hỏi và tri thức công ty — **không gửi dữ liệu ra dịch vụ
AI bên ngoài** (tuân thủ NĐ 13/2023 về bảo vệ dữ liệu cá nhân).

## Trợ lý làm được gì

**Tra cứu dữ liệu của chính mình**

- Phép năm: còn bao nhiêu ngày, đã dùng bao nhiêu.
- Công tháng, số lần/phút đi muộn về sớm, ca làm việc, ngày lễ sắp tới.
- Đếm đơn đang chờ duyệt.

**Tra cứu yêu cầu / quy định của công ty**

- Nội quy lao động: hỏi hành vi thì trả **nguyên văn** chế tài + căn cứ điều khoản
  (ví dụ "Đi muộn bị xử lý thế nào?"). Không tự diễn giải — câu chữ lấy từ Nội quy đã
  ban hành.
- Văn bản công ty: nội quy, biểu mẫu, chính sách, hướng dẫn (mở tab Văn bản để đọc tệp).
- Thông báo nội bộ gần đây.

**Điền sẵn đơn — nhân viên tự xác nhận mới gửi**

Trợ lý điền sẵn payload cho các việc sau và hiện **thẻ chờ xác nhận**:

- Đơn nghỉ phép (`/api/toi/nghi-phep`) — hiểu "ngày mai", "25/09", khoảng ngày, nửa ngày,
  và loại nghỉ (ốm, không lương, hiếu, cưới, thai sản).
- Đơn giải trình quên quẹt (`/api/toi/giai-trinh`) — đề xuất giờ theo ca của người hỏi.
- Đề xuất / kiến nghị (`/api/toi/de-xuat`).
- Hủy đơn đang chờ duyệt (`/api/toi/nghi-phep/:id/huy`, `/don/:id/huy`, `/de-xuat/:id/huy`).

## Nguyên tắc "nhân sự tự xác nhận"

1. Trợ lý **chỉ tính toán payload**, không bao giờ tự ghi CSDL.
2. Giao diện hiện thẻ tóm tắt + hai nút: **Gửi** (xác nhận) và **Bỏ**.
3. Chỉ khi nhân viên bấm nút xác nhận, **trình duyệt của chính họ** mới gọi route POST có
   sẵn với token đăng nhập của họ. Không bấm = không có gì được gửi.
4. Các kiểm tra nghiệp vụ (trùng đơn, ngày đã chốt công…) chạy ở cả hai lớp: trợ lý chặn
   sớm để báo lỗi dễ hiểu, và route POST chặn lại lần cuối — không ai qua được tầng sau.

Vì vậy không có đường nào để AI (hoặc người khác mượn tài khoản) tự ý tạo/hủy đơn thay
nhân viên mà nhân viên không nhìn thấy và không bấm nút.

## Chính sách LLM

Mặc định trợ lý chạy **thuần luật từ khóa** (không tốn phí, không lộ dữ liệu). Hook `hoi_llm`
trong `may_chu/src/ca_nhan/tro_ly.ts` để sẵn cho ngày công ty muốn bật LLM (DeepSeek) cho
câu hỏi ngoài luật — khi đó phải duyệt chính sách NĐ 13 và chỉ gửi dữ liệu tối thiểu, đã
ẩn danh.

## Thêm luật / sửa luật

- Intent mới: sửa `nhan_dang_y_dinh` và thêm nhánh trong `tra_loi_tro_ly`
  (`may_chu/src/ca_nhan/tro_ly.ts`).
- Hàm phân tích câu (ngày, loại nghỉ, lý do) là **hàm thuần** — mọi thay đổi phải có test
  trong `may_chu/test/tro_ly.test.ts`.
- Giao diện thẻ xác nhận: `web/src/trang/tro_ly.tsx` + lớp CSS `troly-hd-*` trong
  `web/src/kieu.css`.
