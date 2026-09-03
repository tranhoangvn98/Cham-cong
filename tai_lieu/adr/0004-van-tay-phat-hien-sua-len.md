# ADR-0004: Tự chụp vân tay để phát hiện sửa dữ liệu

- **Ngày:** 02.09.2026
- **Trạng thái:** Đã quyết
- **Người quyết:** phụ trách CNTT

## Bối cảnh

Một trong những rủi ro chính cần phát hiện: **sửa số tiền sau khi chứng từ đã duyệt**.

Đã kiểm chứng trên mã nguồn ERP 1: nhiều bảng tiền **không có** cột `ModifiedDate` hay
`ModifiedBy`.

- `xnk.Logistic.Core/SharedKernel/BaseEntity.cs` chỉ có `Id`, `CreatedUtcDate`, `IsDeleted`.
- `DatabaseCore.Domain/Entities/Base/BaseEntity.cs` chỉ có `CreatedDate`, `LastUpdateTime`,
  `IsDeleted`.

Nghĩa là việc sửa một số tiền **không để lại dấu vết nào trong CSDL để truy vấn**. Không có
câu SELECT nào phát hiện được, dù viết khéo đến đâu.

## Các phương án đã cân nhắc

**A. Đọc `xnk_logs."EmployeeActionLog"`.** ERP 1 có bảng nhật ký thao tác. Nhưng nó chỉ được
ghi ở một số luồng (`HolaEventLogFactory` chỉ được gọi ở vài handler), và `XnkLogEvent` —
cơ chế log chéo service — được đăng ký nhưng **không bao giờ được publish**. Không phủ đủ.

**B. Xin ERP 1 bổ sung cột `ModifiedBy`/`ModifiedDate`.** Đúng gốc rễ nhất. Nhưng nằm ngoài
tầm quyết của module, và cho tới khi làm xong thì không phát hiện được gì.

**C. Tự chụp vân tay các trường trọng yếu mỗi vòng quét, so với lần trước.**

## Quyết định

Chọn **C**, và **đồng thời** kiến nghị B như một hạng mục riêng cho ERP 1.

Vân tay là SHA-256 của các trường theo dõi, khóa sắp xếp trước khi băm. Vân tay đổi giữa hai
vòng quét ⇒ có người sửa trong khoảng đó.

## Hệ quả

**Tích cực**
- Phát hiện được điều mà không câu SELECT nào phát hiện được.
- Không cần ERP 1 thay đổi gì.
- Kết hợp với `tbl_OrderHistory` cho ra tín hiệu mạnh hơn: đơn đổi dữ liệu mà **không** có
  dòng lịch sử tương ứng = sửa thẳng vào CSDL, vòng qua ứng dụng.

**Tiêu cực — phải in ra giao diện và tài liệu, không được giấu**
- **Không biết AI sửa.** ERP 1 không lưu. Module trả lời được *cái gì đổi* và *trong khoảng
  nào*, không trả lời được *ai*. Bằng chứng của mỗi cảnh báo loại này ghi thẳng câu đó.
- **Độ phân giải bằng chu kỳ quét.** Ô 60 phút nghĩa là khoảng thời gian nghi vấn rộng 60
  phút. Quét dày hơn thì hẹp hơn nhưng đọc CSDL ERP 1 dày hơn.
- **Sửa rồi sửa lại về cũ trong cùng một ô sẽ lọt.** Chấp nhận: hạ chu kỳ không loại bỏ được
  hoàn toàn, chỉ thu hẹp cửa sổ.
- Bảng `anh_chup_erp` lớn dần theo số bản ghi theo dõi. Chỉ ghi lại khi vân tay đổi.

## Ba tính chất của hàm băm, đều có test

1. Dữ liệu không đổi ⇒ vân tay không đổi (nếu không: báo động giả mỗi vòng quét).
2. Trường theo dõi đổi ⇒ vân tay đổi (nếu không: bỏ sót chính cái cần bắt).
3. **Thứ tự khóa đổi ⇒ vân tay KHÔNG đổi.** Thứ tự cột Postgres trả về đổi khi ai đó sửa câu
   SELECT; nếu vân tay phụ thuộc thứ tự thì một lần sửa truy vấn sẽ báo "toàn bộ bản ghi vừa
   bị sửa" — hàng nghìn cảnh báo giả trong một vòng quét.
