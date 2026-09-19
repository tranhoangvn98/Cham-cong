# Quy trình nghỉ việc tự động

Khi nhân sự **ban hành Quyết định nghỉ việc** trên hệ văn bản AI, hệ thống tự chạy trọn
vòng đời nghỉ việc mà không cần ai bấm thêm nút nào:

1. **Lưu hồ sơ** — tệp DOCX của quyết định được gắn vào hồ sơ nhân viên (mục tài liệu
   "Quyết định nghỉ việc", mã `qd_nghi_viec`) và tự đồng bộ sang SharePoint như mọi tệp
   hồ sơ khác.
2. **Đến ngày nghỉ việc** (ngày ghi trong quyết định), lịch chạy đêm tự động:
   - khóa tài khoản đăng nhập + thu hồi mọi phiên (token làm mới) trong hệ thống chấm công;
   - ghi sự kiện `nhan_su.nghi_viec` sang **cổng phân quyền** — cổng chặn đăng nhập SSO,
     chuyển trạng thái nhân sự và thu hồi phiên đang mở bên đó;
   - ghi sự kiện `ms365.nghi_viec` sang **Microsoft Graph** — chặn đăng nhập tài khoản
     Entra (`accountEnabled = false`), thu hồi phiên đang mở, rút **toàn bộ** giấy phép
     đang gán.

Lịch sử chấm công và toàn bộ hồ sơ **được giữ nguyên** — đây là nghỉ việc, không phải
xóa dữ liệu.

## Luồng hoạt động

```
Nhân sự soạn văn bản AI: loại Quyết định, phạm vi Cá nhân,
đánh dấu "Đây là quyết định nghỉ việc" + ngày nghỉ việc
        │
        ▼
Phát hành (cấp số) ──► tự gắn tệp vào hồ sơ nhân viên (bước 1)
        │
        ▼ (ngày nghỉ việc trôi qua)
Lịch đêm sau 01:00:
  - khóa tài khoản + thu hồi token                     (bước 2)
  - gửi sự kiện nhan_su.nghi_viec → cổng phân quyền    (bước 4)
  - gửi sự kiện ms365.nghi_viec → Microsoft Graph      (bước 3)
```

Hai sự kiện đi ra ngoài được ghi vào bảng `hop_thu_di` **cùng transaction** với dữ liệu
nghiệp vụ, rồi tiến trình nền đẩy đi với cơ chế thử lại (backoff). Nghĩa là: dù cổng phân
quyền hay Microsoft đang chết, sự kiện vẫn nằm chờ và sẽ đi khi hệ thống kia sống lại —
không mất.

## Cấu hình

```bash
# 1 = bật bước chặn Microsoft khi nghỉ việc. Mặc định 0: sự kiện vẫn được ghi vào
# bang hop_thu_di và nằm chờ, khai xong thì tự đi.
MS365_NGHI_VIEC_BAT=1
```

Bước Microsoft dùng chung tài khoản ứng dụng với email (`MS_MAIL_TENANT_ID`,
`MS_MAIL_CLIENT_ID`, `MS_MAIL_CLIENT_SECRET`) hoặc SharePoint (`SHAREPOINT_*`) nếu không
khai MS_MAIL riêng. Ứng dụng đó phải được admin Entra consent thêm hai quyền:

- `User.ReadWrite.All` — chặn đăng nhập + rút giấy phép
- `User.RevokeSessions.All` — thu hồi phiên đang mở

Xem thêm `tai_lieu/DANG-NHAP-MICROSOFT.md` mục 3.

## Trường hợp đặc biệt

- **Nhân viên chưa có `email_microsoft`**: bỏ qua bước Microsoft (có ghi log), các bước
  còn lại chạy bình thường.
- **Nhân viên đã được cho nghỉ bằng tay** trước ngày nghỉ việc: lịch đêm phát hiện và bỏ
  qua, không gửi trùng sự kiện sang cổng.
- **Muốn chặn sớm hơn ngày nghỉ việc**: dùng nút "Cho nghỉ việc" trên trang Nhân viên —
  nút này cũng chạy đầy đủ các bước (nay gồm cả bước Microsoft).
- **Ngày nghỉ việc phải từ hôm nay trở đi** khi tạo quyết định. Cần xử lý quá khứ thì
  cho nghỉ bằng nút thủ công.

## Giám sát

- Trang **Văn bản AI**: bản quyết định hiển thị nhãn "Quyết định nghỉ việc — nghỉ
  <ngày>"; sau khi chạy, hiển thị "Đã tự khóa tài khoản lúc …".
- Bảng `hop_thu_di`: sự kiện `nhan_su.nghi_viec` và `ms365.nghi_viec` chưa gửi được nằm
  đây với `so_lan` và `loi_cuoi` — cột `loi_cuoi` nói rõ cổng/Microsoft trả lỗi gì.
- Log máy chủ: dòng `[lich] nghi viec TBN-…` ghi kết quả từng quyết định.

## Kiểm thử

```bash
npm test                                 # test đơn vị, gồm ms365.test.ts
npm --workspace may_chu run test_e2e     # e2e quyết định nghỉ việc (DB chamcong_test*)
```
