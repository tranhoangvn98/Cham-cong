# Tạo hồ sơ nhân sự mới — tự cấp PIN, tự cấp tài khoản hệ thống + Microsoft, báo cổng + ERP1

Khi nhân sự bấm **+ Thêm nhân viên** (trang Nhân viên) và lưu, hệ thống thực hiện trọn một
chuỗi tích hợp mà không cần thao tác tay thêm:

1. **Lưu hồ sơ** (mã NV, họ tên, chức danh, vị trí, phòng ban, ca làm, email, …).
2. **Tự cấp PIN máy chấm công** (nếu đánh dấu "Tự cấp PIN theo dãy của máy").
3. **Tạo tài khoản hệ thống** (`nguoi_dung`, đăng nhập app điện thoại) — vai trò tự suy từ
   ô **Vị trí**.
4. **Báo cổng phân quyền** — sự kiện `nhan_su.da_tao` (đã có sẵn từ trước): cổng tự tạo bản
   ghi danh tính cho người này.
5. **Báo ERP1** — sự kiện `erp1.nhan_su.da_tao` kèm chức danh + phòng ban: ERP1 nhận và tự
   thiết lập tài khoản, tự phân quyền theo vị trí.
6. **Tạo tài khoản Microsoft 365** (nếu đánh dấu): tạo user Entra với UPN = email + cấp giấy
   phép theo chức danh.

Bước 3 được tạo **ngay cùng transaction** với dòng nhân viên; các bước báo ra ngoài (4, 5, 6)
đi qua bảng `hop_thu_di` **cùng transaction** rồi tiến trình nền đẩy đi với cơ chế thử lại
(backoff). Nghĩa là: dù cổng, ERP1 hay Microsoft đang chết, sự kiện vẫn nằm chờ và sẽ đi khi
hệ thống kia sống lại — không mất.

---

## 1. Tự cấp PIN

- Trên form chọn máy chấm công (danh sách máy đang bật). Hệ thống chọn **số PIN còn trống đầu
  tiên trong dải** của máy đó (`pin_tu`–`pin_den`, xem trang Thiết bị), ghi vào bảng mã định
  danh (`ma_dinh_danh`) và vào cột `nhan_vien.pin_may`.
- Hai nhân sự bấm cùng lúc được gợi ý cùng một số: unique index chặn người thứ hai, hệ thống
  **tự thử lại với số kế tiếp** (tối đa 5 lần) thay vì báo lỗi.
- Nhân sự vẫn phải khai đúng số PIN đó lên máy ZKTeco (như trước — hệ thống chỉ chọn số, không
  tự cài lên máy).
- Để trống tùy chọn này thì nhập PIN bằng tay như cũ.

## 2. Tài khoản hệ thống (đăng nhập app điện thoại)

Khi đánh dấu **Tạo tài khoản hệ thống** (chế độ "Thêm nhân viên tự động" luôn bật), hệ thống
tạo luôn tài khoản `nguoi_dung` **cùng transaction** với hồ sơ:

- **Tên đăng nhập** sinh từ mã nhân viên (hạ chữ thường, bỏ dấu, chỉ giữ chữ/số/`. _ -`),
  ví dụ `NV0156` → `nv0156`. Trùng tên đăng nhập đã có thì báo lỗi rõ, không đè lên.
- **Mật khẩu khởi tạo 12 ký tự** đủ 4 nhóm (hoa/thường/số/ký tự đặc biệt), chỉ hiện **một
  lần** ngay sau khi lưu kèm nút sao chép. Nhân viên buộc đổi mật khẩu ở lần đăng nhập đầu.
- **Vai trò tự suy từ ô Vị trí** (7 bậc chọn sẵn):

  | Vị trí | Vai trò hệ thống |
  | --- | --- |
  | Tổng Giám Đốc, Giám đốc | `nhan_su` — quản trị chấm công toàn công ty |
  | Trưởng phòng | `truong_phong` — xem và duyệt đơn của phòng mình |
  | Trưởng nhóm, Nhân viên, Thử việc, Học việc | `nhan_vien` — chỉ xem công của mình |

  Chưa chọn vị trí thì mặc định `nhan_vien` (an toàn — không tự nâng quyền).
- Email hồ sơ (nếu có) được điền vào `email_microsoft` của tài khoản để nối danh tính.

Quy tắc nằm trong hàm thuần `vai_tro_theo_vi_tri()` (`may_chu/src/nhan_su/vi_tri.ts`), có
test khóa — muốn đổi quy tắc thì sửa ở đó kèm test.

---

## 3. Tài khoản Microsoft 365

### 2.1 Luồng

- Điều kiện: hồ sơ **phải có email hợp lệ** (email chính là UPN) và email **không trùng** người
  khác. Thiếu email hoặc trùng thì từ chối lưu với lỗi rõ ràng.
- Hệ thống sinh **mật khẩu khởi tạo 16 ký tự** (đủ chữ hoa, chữ thường, chữ số, ký tự đặc biệt)
  và hiển thị **đúng một lần** ngay sau khi lưu, kèm nút sao chép. HR chép lại rồi bàn giao cho
  nhân viên. Đóng hộp thoại là không xem lại được.
- Tài khoản được tạo với `forceChangePasswordNextSignIn = true` — nhân viên buộc đổi mật khẩu
  ở lần đăng nhập đầu.
- Sau khi tài khoản được tạo thành công, mật khẩu bị **xóa khỏi bảng `hop_thu_di`** (không nằm
  lại trong dữ liệu).

### 2.2 Giấy phép theo chức danh

| Chức danh | Giấy phép |
| --- | --- |
| chứa **trưởng** (trưởng phòng, trưởng bộ phận…) và không chứa **phó** | `MS365_SKU_STANDARD` |
| còn lại | `MS365_SKU_BASIC` |

Quy tắc nằm trong hàm thuần `la_truong_phong()` (`may_chu/src/nhan_su/ms365.ts`), có test khóa
— muốn đổi quy tắc thì sửa ở đó kèm test.

### 2.3 Cấu hình

```bash
# 1 = bật. Mặc định 0: sự kiện vẫn được ghi vào hộp thư đi và nằm chờ, bật lên là đi.
MS365_TAO_TAI_KHOAN_BAT=1
MS365_SKU_BASIC=<skuId Business Basic>
MS365_SKU_STANDARD=<skuId Business Standard>
```

Lấy `skuId` bằng Graph `GET /subscribedSkus` hoặc trang **Giấy phép** trong Entra admin center.

Dùng **chung tài khoản ứng dụng** với email (`MS_MAIL_*`) như bước nghỉ việc — ứng dụng đó phải
được admin Entra consent thêm quyền ứng dụng:

- `User.ReadWrite.All` — `POST /users` (tạo tài khoản) + `assignLicense` (cấp giấy phép)

Xem thêm `tai_lieu/DANG-NHAP-MICROSOFT.md` mục 3.

### 2.4 Khi chưa bật / chưa khai SKU

Hồ sơ vẫn lưu bình thường. Phản hồi có **cảnh báo** rõ ràng ("chưa bật …", "chưa khai SKU…").
Sự kiện `ms365.tao_tai_khoan` nằm chờ trong `hop_thu_di`; bật tính năng / khai đủ SKU là nó đi
ngay. Mật khẩu khởi tạo vẫn được hiển thị cho HR — lưu ý tài khoản chỉ thực sự tồn tại sau khi
sự kiện được đẩy thành công.

## 4. Webhook ERP1 — thiết lập tài khoản nhân sự mới

Khi lưu hồ sơ mới, hệ thống ghi sự kiện:

```
erp1.nhan_su.da_tao
```

với thân:

```json
{
  "su_kien_id": "chamcong-21991",
  "loai_su_kien": "erp1.nhan_su.da_tao",
  "ma_nv": "NV0156",
  "ma_erp": "THVN-0789",
  "email": "tranthib@tranhoangvietnam.com",
  "ho_ten": "Trần Thị Bình",
  "so_dien_thoai": "0912345678",
  "ngay_vao": "2026-09-22",
  "pin_may": "1013",
  "chuc_danh": "Trưởng phòng Kinh doanh",
  "phong_ban": "Kinh doanh"
}
```

`chuc_danh` + `phong_ban` (tên phòng) kèm theo để ERP1 **tự phân quyền theo vị trí** thay vì
nhân sự thao tác tay bên ERP1. Trường trống trả `null`. Chữ ký HMAC và chống trùng
`su_kien_id` giống hệt sự kiện nghỉ việc —
xem `tai_lieu/WEBHOOK-ERP1.md`. Chưa khai `ERP1_WEBHOOK_URL` thì sự kiện nằm chờ trong hộp thư.

## 5. Giám sát

- Bảng `hop_thu_di`: các sự kiện `nhan_su.da_tao`, `erp1.nhan_su.da_tao`, `ms365.tao_tai_khoan`
  chưa gửi được nằm đây với `so_lan` và `loi_cuoi` — cột `loi_cuoi` nói rõ bên kia trả lỗi gì.
- Nhật ký thao tác: mỗi lượt tạo hồ sơ ghi `tao_nhan_vien` (như cũ).
- Tài khoản Microsoft được tạo xong thì không còn `mat_khau` trong `du_lieu` của sự kiện.

## 6. Kiểm thử

```bash
npm test                                   # đơn vị, gồm vi_tri.test.ts + ms365.test.ts + erp1_webhook.test.ts
npm --workspace may_chu run test_e2e       # e2e luồng tạo hồ sơ (DB chamcong_test*)
```
