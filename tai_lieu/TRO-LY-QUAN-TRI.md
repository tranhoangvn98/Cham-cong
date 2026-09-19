# Trợ lý quản trị (chatbot) cho nhân sự / quản trị

Nút nổi góc phải dưới ở **góc nhìn Quản trị** (chỉ hiện với nhân sự, trưởng phòng nhân sự,
quản trị viên). Hỏi bằng tiếng Việt thường, trợ lý trả lời từ **dữ liệu quản trị theo đúng
quyền của người hỏi** — số liệu lấy từ chính `dashboard_cho` (đã phân lớp vai trò), không
bao giờ lấy thừa quyền rồi giấu ở giao diện.

## Trợ lý làm được gì

**Số liệu quản trị (theo quyền)**

- **Tổng quan hôm nay**: có mặt, đi muộn, vắng, nghỉ phép, chưa quẹt ra; đơn chờ duyệt;
  việc nhân sự cần xử lý (chưa gán PIN, thiếu email, chưa gán phòng ban, thiếu tài liệu,
  hợp đồng sắp hết hạn); máy chấm công (chỉ quản trị viên thấy).
- **Ai đi muộn / vắng / chưa quẹt hôm nay** — kèm danh sách cụ thể.
- **Đơn chờ duyệt** đủ loại: nghỉ phép, giải trình, đơn tự phục vụ (OT, đổi ca…), quét
  mobile, đề xuất, khiếu nại lương.
- **Tìm nhân viên theo tên**: phòng ban, ca làm, công tháng, đi muộn tháng, phép năm,
  trạng thái.
- **Máy chấm công**: online/offline từng máy + PIN lệch (quản trị viên).

**Tri thức công ty**

- Dùng chung một nguồn với trợ lý cá nhân: nội quy/chế tài (nguyên văn), văn bản công ty,
  thông báo nội bộ.

**Chào hỏi + ghi nhớ**

- Chào theo buổi (múi giờ máy chấm công), gọi đúng tên, nhắc lại chủ đề lần trước (trong
  7 ngày); cảm ơn/tạm biệt/hỏi thăm có lời đáp riêng.
- Câu ngoài lề: AI trò chuyện tự nhiên trong giới hạn (chuyện phiếm lành mạnh), nói thật
  khi không tra được thông tin thực tế (thời tiết, tin tức) — không bịa số liệu.
- Lịch sử lưu **lâu dài theo tài khoản** ở bảng riêng `tro_ly_qt_hoi_thoai` — tách khỏi
  lịch sử trợ lý cá nhân, hai kênh không lẫn vào nhau. Nút **Xóa** xóa toàn bộ của chính
  mình. AI chỉ nhận câu hỏi + tối đa 4 lượt gần nhất của **chính người hỏi**.

## API

| Đường dẫn | Quyền | Mô tả |
|---|---|---|
| `GET /api/quan-tri/tro-ly?hoi=...` | nhân sự + | trả lời câu hỏi quản trị |
| `GET /api/quan-tri/tro-ly/lich-su` | nhân sự + | lịch sử của chính tài khoản (100 lượt gần nhất) |
| `DELETE /api/quan-tri/tro-ly/lich-su` | nhân sự + | xóa toàn bộ lịch sử của chính mình |

Nhân viên thường gọi các đường này sẽ bị **403** — bot này không dành cho họ.

## Thêm luật / sửa luật

- Intent mới: `nhan_dang_y_dinh_qt` + nhánh trong `tra_loi_tro_ly_quan_tri`
  (`may_chu/src/quan_tri/tro_ly.ts`) — hàm thuần phải có test trong
  `may_chu/test/tro_ly_qt.test.ts`.
- Giao diện: `web/src/trang/tro_ly_quan_tri.tsx` (dùng chung lớp CSS `troly-*`).
