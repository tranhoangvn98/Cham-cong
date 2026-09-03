# ADR-0002: Đọc trực tiếp CSDL ERP 1 thay vì qua REST hoặc RabbitMQ

- **Ngày:** 02.09.2026
- **Trạng thái:** Đã quyết
- **Người quyết:** CEO

## Bối cảnh

Module cần đọc dữ liệu nghiệp vụ của ERP 1. ERP 1 có ba đường ra: REST API, RabbitMQ
(MassTransit), và CSDL PostgreSQL.

## Các phương án đã cân nhắc

**A. REST API.** `erp_manager` có `GET /v1/external/users`, `external/list-thu`,
`external/list-chi`, `external/list-wld`; `erp_logistic` có `GET /external_logistic/packinglist`.
Sạch về ranh giới. Nhưng: các endpoint đó **không phủ** phần lớn dữ liệu module cần (lịch sử
sửa đơn, bước duyệt chi, cơ hội bán hàng, công nợ), nên phải xin ERP 1 mở endpoint mới cho
gần như mọi phép đo.

**B. RabbitMQ.** Realtime nhất và đúng kiến trúc. Nhưng ERP 1 **không publish sự kiện nào**
cho Tax, PackingList, RepositoryCheck, RepositoryExporting, DX_Chi — nên sự kiện đơn thuần
không dựng lại được vết nghiệp vụ. Và cần sửa cả ba repo.

**C. Đọc trực tiếp CSDL, chỉ đọc.** ERP 1 đã cấp sẵn tài khoản `powerbi` cho mục đích báo cáo.

## Quyết định

Chọn **C**, với ba lớp chặn ghi (xem đặc tả mục 4.2).

Lý do quyết định: phương án A đòi hỏi đội ERP 1 mở khoảng 20 endpoint mới trước khi module
chạy được dòng đầu tiên, và mỗi lần thêm một phép đo lại phải xin thêm một endpoint. Với
đội IT hiện tại, đó là một phụ thuộc làm module không bao giờ khởi động được.

## Hệ quả

**Tích cực**
- Chạy được ngay, không chặn bởi tiến độ của đội khác.
- Viết được phép đo phức tạp (join, group by, window) mà API không cho.
- Không thêm tải lên tầng ứng dụng của ERP 1.

**Tiêu cực — phải chấp nhận và ghi rõ**
- **Phụ thuộc schema nội bộ.** ERP 1 đổi tên bảng hoặc cột là module vỡ, và vỡ *im lặng*:
  truy vấn trả 0 dòng chứ không báo lỗi. Đây là kiểu hỏng nguy hiểm nhất của module vì nó
  nhìn y hệt "không có cảnh báo nào". Bù bằng `npm --workspace may_chu run doi_chieu_schema`,
  phải chạy sau mỗi lần ERP 1 nâng cấp.
- **Không join chéo database.** Postgres không cho. Phép đo cần hai nguồn (đơn hàng ở `sale`,
  packing list ở `kho`) phải chạy hai truy vấn rồi ghép trong Node. Không dùng `postgres_fdw`
  hay `dblink` — cả hai đòi quyền vượt mức chỉ-đọc.
- **Tài khoản có quyền đọc rộng.** Rủi ro rò rỉ nếu `.env` lộ. Bù bằng: cổng CI quét secret,
  mật khẩu không vào CSDL và không vào giao diện, và khuyến nghị siết quyền tài khoản xuống
  đúng các bảng cần đọc.

## Điều kiện xem lại quyết định này

Nếu ERP 1 xây một API báo cáo phủ đủ dữ liệu module cần, chuyển sang phương án A: nó bền
hơn trước thay đổi schema. Cho tới lúc đó, `doi_chieu_schema` là lớp bảo vệ.
