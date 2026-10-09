# Nhân sự outsource — trả lương qua bảng lương, lệnh chi riêng

Câu hỏi vận hành (07/10/2026): nhân sự outsource chuyển tiền thế nào — cho vào bảng lương
trả cùng nhân sự công ty hay làm lệnh chuyển riêng?

## Quyết định

Chốt: **nhân sự outsource vào chung bảng lương** (có phiếu lương, đối soát được, lưu hồ sơ
tiền trả) nhưng **xuất lệnh chi ngân hàng RIÊNG** theo cơ chế `don_vi_chi_luong` có sẵn:

- Phiếu lương của họ nằm trong kỳ lương như mọi người — kế toán vẫn nhập thưởng/phụ cấp,
  duyệt và gửi phiếu bình thường.
- `ho_so_ca_nhan.don_vi_chi_luong` = tên đơn vị chi trả riêng (vd "Nhân sự outsource").
- Nút **Lập Lệnh Chi** ở Bảng lương tự tách mỗi đơn vị chi trả ra MỘT file ngân hàng riêng
  (đúng mẫu 8 cột) — đơn vị nào chuyển tiền từ tài khoản nguồn của đơn vị đó.

## Các bước thiết lập (một lần)

1. Khai đơn vị chi trả + tài khoản nguồn (chạy trong container may_chu, thay số tài khoản thật):

   ```sql
   insert into don_vi_chi_tra (ten, tai_khoan_nguon) values
     ('Nhân sự outsource', '<SO_TAI_KHOAN_NGUON>')
   on conflict (ten) do nothing;
   ```

2. Gán đơn vị chi trả cho từng người outsource (một trong hai cách):

   - Web: mở hồ sơ cá nhân của người đó, sửa mục "Đơn vị chi trả lương" thành
     `Nhân sự outsource`. (Trường `don_vi_chi_luong` trong hồ sơ cá nhân.)
   - SQL (hàng loạt):

     ```sql
     update ho_so_ca_nhan h
        set don_vi_chi_luong = 'Nhân sự outsource'
      where h.nhan_vien_id in (
        select nv.id from nhan_vien nv
         where nv.ma_nv = any(array['<MA_NV_1>', '<MA_NV_2>'])
      );
     ```

     Người chưa có dòng `ho_so_ca_nhan` thì thêm dòng trước khi update.

3. Bấm **Tính lương** kỳ liên quan. Phiếu của họ vẫn nằm trong bảng lương chung.

4. Sau khi kỳ đã duyệt: Bảng lương → **Lập Lệnh Chi** → hệ thống tải về các file, trong đó có
   `lenh_chi_Nhân sự outsource_<tháng>.xlsx` — đem file này chuyển khoản riêng.

## Lưu ý nghiệp vụ

- **Thuế TNCN**: nhân sự outsource (cá nhân ký HĐ dịch vụ, không phải HĐLĐ) thường chịu thuế
  TNCN 10% trên thu nhập, không tính giảm trừ gia cảnh — khác công thức lũy tiến của nhân viên.
  Kế toán cần rà trước khi duyệt kỳ; nếu áp thuế riêng thì dùng nút "Miễn thuế"/điều chỉnh trên
  phiếu hoặc thống nhất quy tắc trước khi chốt kỳ đầu.
- Nếu "outsource" là **nhà cung cấp có hóa đơn** (thanh toán hợp đồng, không phải trả lương cá
  nhân) thì KHÔNG đưa vào bảng lương — lập hóa đơn riêng ngoài hệ thống chấm công.
- Người outsource vẫn cần hồ sơ `nhan_vien` để có phiếu lương; nếu họ không chấm công thì dùng
  "tính đủ công" hoặc ghi công tay theo thỏa thuận.
