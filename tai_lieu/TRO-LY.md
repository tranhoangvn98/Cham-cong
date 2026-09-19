# Trợ lý nhân sự (chatbot) cho nhân viên

Nút tròn góc phải dưới ở **góc nhìn Cá nhân** mở trợ lý. Hỏi bằng tiếng Việt thường, trợ lý
 trả lời từ dữ liệu của chính người hỏi và tri thức công ty — **không gửi dữ liệu ra dịch vụ
 AI bên ngoài** (tuân thủ NĐ 13/2023 về bảo vệ dữ liệu cá nhân).

## Trợ lý làm được gì

**Chào hỏi, hỏi thăm như người thật**

- Chào theo buổi (sáng/trưa/chiều/tối) neo theo **múi giờ máy chấm công** — mở widget là
  chào đúng buổi chứ không phải câu khuôn mẫu.
- Cảm ơn, tạm biệt, hỏi thăm sức khỏe, hỏi tên, "ăn cơm chưa"… đều có lời đáp riêng,
  không rơi vào câu "mình chưa hiểu". Câu nào kèm cả việc cần làm ("chào, tôi còn bao
  nhiêu phép") thì ưu tiên trả lời việc trước.

**Ghi nhớ lịch sử theo từng nhân sự**

- Mọi lượt hỏi/đáp được lưu **lâu dài** vào bảng `tro_ly_hoi_thoai` theo từng nhân viên —
  mở ở máy nào cũng thấy lịch sử của mình; nút **Xóa** ở đầu khung xóa toàn bộ của chính
  mình (`DELETE /api/toi/tro-ly/lich-su`).
- Trợ lý dùng **tối đa 4 lượt gần nhất của chính người hỏi** làm ngữ cảnh để hiểu câu nối
  tiếp ("ngày đó", "như lần trước"); lời chào gọi đúng tên và nhắc lại chủ đề lần trước
  (trong 7 ngày) — để hiểu từng nhân sự hơn.
- Lịch sử là dữ liệu cá nhân: chỉ chủ dữ liệu đọc/xóa được của mình; thẻ xác nhận đơn
  **không** được lưu — tránh gửi nhầm đơn cũ sau khi tải lại trang.

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
  và loại nghỉ (ốm, không lương, hiếu, cưới, thai sản). "Xin nghỉ việc", "xin nghỉ làm"
  cũng hiểu là xin nghỉ một buổi/ngày — chỉ "xin **thôi** việc" mới là đơn thôi việc.
- Đơn giải trình quên quẹt (`/api/toi/giai-trinh`) — đề xuất giờ theo ca của người hỏi.
- Đề xuất / kiến nghị (`/api/toi/de-xuat`).
- Hủy đơn đang chờ duyệt (`/api/toi/nghi-phep/:id/huy`, `/don/:id/huy`, `/de-xuat/:id/huy`).
- **Đăng ký OT / làm thêm giờ** (`/api/toi/don`, loại `lam_them`) — hiểu ngày + giờ bắt
  đầu/kết thúc ("từ 18:00 đến 20:00", "6 giờ tối đến 8 giờ tối"). Đơn đi qua hai cấp
  duyệt (trưởng bộ phận rồi TBKS) theo chuỗi sẵn có.
- **Đơn xin đi muộn** (`/api/toi/don`, loại `di_muon`) — ngày + giờ dự kiến có mặt + lý do.
- **Đơn xin đổi ca** (`/api/toi/don`, loại `doi_ca`) — khoảng ngày + ca đề nghị (nói kèm
  tên ca, trợ lý đối chiếu danh mục ca làm việc), giữ ca hiện tại từ hồ sơ.
- **Đơn xin đi công tác** (`/api/toi/don`, loại `cong_tac`) — khoảng ngày + nơi đến + nội
  dung công tác; chặn khoảng ngày đã chốt bảng công.
- **Đơn xin thôi việc** (`/api/toi/don`, loại `thoi_viec`) — ngày làm việc cuối cùng + lý
  do; máy chủ trả kèm cảnh báo pháp lý (số ngày báo trước theo BLLĐ) và giao diện hiển thị
  nguyên văn sau khi gửi.
- **Khiếu nại phiếu lương** (`/api/toi/khieu-nai-luong`) — tự lấy phiếu lương đã duyệt mới
  nhất của người hỏi, chỉ cần nội dung khiếu nại.
- **Khiếu nại kỷ luật** (`/api/toi/khieu-nai`) — liệt kê hồ sơ kỷ luật của chính người hỏi,
  nói kèm mã hồ sơ là điền sẵn.
- **Ứng lương**: chưa mở tự phục vụ (route chỉ cho nhân sự/quản trị) — trợ lý hướng dẫn
  liên hệ nhân sự thay vì hứa điền đơn.

## Nguyên tắc "nhân sự tự xác nhận"

1. Trợ lý **chỉ tính toán payload**, không bao giờ tự ghi CSDL.
2. Giao diện hiện thẻ tóm tắt + hai nút: **Gửi** (xác nhận) và **Bỏ**.
3. Chỉ khi nhân viên bấm nút xác nhận, **trình duyệt của chính họ** mới gọi route POST có
   sẵn với token đăng nhập của họ. Không bấm = không có gì được gửi.
4. Các kiểm tra nghiệp vụ (trùng đơn, ngày đã chốt công…) chạy ở cả hai lớp: trợ lý chặn
   sớm để báo lỗi dễ hiểu, và route POST chặn lại lần cuối — không ai qua được tầng sau.

Vì vậy không có đường nào để AI (hoặc người khác mượn tài khoản) tự ý tạo/hủy đơn thay
nhân viên mà nhân viên không nhìn thấy và không bấm nút.

## Chính sách AI (DeepSeek)

Trợ lý dùng chung khóa `DEEPSEEK_API_KEY` của phân hệ (đã dùng cho soạn văn bản). AI chỉ
đảm nhận **giọng nói và hiểu câu**, không phải nguồn sự thật:

- **Hiểu câu ngoài luật**: câu hỏi không khớp luật từ khóa được AI trò chuyện và gợi ý cách
  hỏi lại — không tự bịa số liệu. Khi cần hiểu câu nối tiếp ("ngày đó"), AI chỉ nhận thêm
  tối đa 4 lượt hỏi/đáp gần nhất của **chính người hỏi**, không bao giờ lịch sử người khác.
- **Trò chuyện ngoài lề trong giới hạn**: chuyện phiếm lành mạnh (hỏi thăm, khuyên chung,
  vui đùa nhẹ) được trò chuyện tự nhiên 1-3 câu rồi gợi lại việc chấm công. Thông tin thực
  tế cần cập nhật (thời tiết, tin tức, giá cả…) thì **nói thật không tra được** và gợi ý
  nguồn chính thống. Không bàn chính trị/tôn giáo/nội dung người lớn, không bịa số liệu.
- **Trích ngày xin nghỉ** từ câu nói tự nhiên khi bộ phân tích không tìm thấy; kết quả được
  kiểm lại bằng hàm thuần `ngay_hop_le` trước khi dùng (dùng chung cho nghỉ phép, OT, đổi
  ca, công tác, đi muộn).
- **Viết lại câu trả lời** cho các số liệu cá nhân (phép, công, đi muộn, ca, đơn chờ duyệt)
  từ bối cảnh **tối thiểu** — chỉ con số, không tên/email/ID (NĐ 13/2023). Lỗi mạng hay hết
  khóa thì trợ lý tự rơi về lời có sẵn, không bao giờ chết vì AI.
- **Không cho AI**: diễn giải chế tài nội quy (giữ nguyên văn), sửa payload hành động, chạm
  hồ sơ cá nhân. Chưa khai `DEEPSEEK_API_KEY` = trợ lý chạy thuần luật như trước.

## Thêm luật / sửa luật

- Intent mới: sửa `nhan_dang_y_dinh` và thêm nhánh trong `tra_loi_tro_ly`
  (`may_chu/src/ca_nhan/tro_ly.ts`).
- Hàm phân tích câu (ngày, loại nghỉ, lý do) là **hàm thuần** — mọi thay đổi phải có test
  trong `may_chu/test/tro_ly.test.ts`.
- Giao diện thẻ xác nhận: `web/src/trang/tro_ly.tsx` + lớp CSS `troly-hd-*` trong
  `web/src/kieu.css`.
