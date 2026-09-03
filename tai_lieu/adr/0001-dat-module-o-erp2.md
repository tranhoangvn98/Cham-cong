# ADR-0001: Đặt module giám sát ở ERP 2 thay vì ERP 1

- **Ngày:** 02.09.2026
- **Trạng thái:** Đã quyết
- **Người quyết:** CEO (yêu cầu ban đầu) · phụ trách CNTT (thiết kế)

## Bối cảnh

Cần một cơ chế phát hiện dấu hiệu bất thường trên dữ liệu nghiệp vụ của ERP 1 (bán hàng,
chi/thu, công nợ, kho, tờ khai). Câu hỏi kiến trúc đầu tiên: đặt nó ở đâu.

## Các phương án đã cân nhắc

**A. Xây trong ERP 1.** Gần dữ liệu nhất, không cần kết nối chéo, join được trong cùng CSDL.

**B. Một hệ thống thứ ba mới.** Sạch về ranh giới, nhưng thêm một hệ thống phải vận hành,
sao lưu, phân quyền và bảo trì — với đội IT hiện tại là quá sức.

**C. Đặt trong ERP 2 (Chấm công).** Hệ thống đã có sẵn rule-engine (`loai_vi_pham` +
`quy_tac_vi_pham` + `vi_pham`), scheduler, phân quyền, xuất CSV chống injection.

## Quyết định

Chọn **C**.

Hai lý do, lý do thứ nhất mang tính nguyên tắc:

1. **Tách biệt nhiệm vụ.** Người bị giám sát không được quản trị nơi ghi nhận cảnh báo. Đặt
   module trong ERP 1 nghĩa là quản trị viên ERP 1 — chính những người có quyền sửa dữ liệu
   bị giám sát — cũng sửa được cảnh báo về mình.
2. **ERP 2 là hệ thống duy nhất có đồng thời bảng công và dữ liệu nghiệp vụ.** Đối chiếu
   chéo "nhân viên nghỉ nhưng vẫn thao tác trên ERP 1" chỉ làm được ở đây.

## Hệ quả

**Tích cực**
- Tái dùng được rule-engine, scheduler, phân quyền, xuất CSV đã có và đã kiểm chứng.
- Vai trò `kiem_soat` tách hẳn khỏi `nhan_su` và `truong_phong`.
- Mở được nhóm phép đo chéo chấm công.

**Tiêu cực — phải chấp nhận**
- Phải kết nối chéo tới CSDL của hệ thống khác. Postgres không join chéo database được, nên
  phép đo cần hai nguồn phải ghép trong Node (xem ADR-0002).
- Module phụ thuộc vào schema **nội bộ** của ERP 1, không phải một hợp đồng API. ERP 1 đổi
  bảng thì module vỡ — và vỡ *im lặng*. Bù bằng lệnh `doi_chieu_schema`.
- ERP 2 giờ giữ dữ liệu tài chính (số tiền chứng từ, mã khách). Phạm vi dữ liệu nhạy cảm của
  ERP 2 rộng ra, nên `bang_chung` chỉ lưu trường cần để đối chiếu, không sao chép nguyên bản ghi.

## Ranh giới với chức năng cảnh báo sẵn có của ERP 1

ERP 1 đã có bảng `usr.tbl_warning` (`Warning`, `WarningType`, `WarningController`). Đó là
**thông báo cho người dùng nghiệp vụ**, và bộ quét duy nhất định đổ dữ liệu vào đó —
`ScanTransactionToWarningConsumer.Consume()` — có thân hàm chỉ là `return;`, tức đã chết.

Ranh giới: `tbl_warning` = nhắc việc cho người làm nghiệp vụ; `canh_bao` (ERP 2) = sổ đăng ký
kiểm soát nội bộ, có vòng đời xử lý và người xử lý thuộc tuyến kiểm soát. Nếu ERP 1 hồi sinh
bộ quét đó, phải xem lại ranh giới này (điều C1.8 của checklist kiến trúc).
