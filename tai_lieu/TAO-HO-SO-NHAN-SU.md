# Tạo hồ sơ nhân sự mới — tự cấp PIN, tự cấp tài khoản hệ thống + Microsoft, báo cổng + ERP1

> Tệp này mô tả luồng **đang chạy**. Từ 26/10/2026 đây là **luồng DUY NHẤT** — form
> "+ Thêm nhân viên" gộp cả phần của luồng đề nghị cũ (checklist nhập việc, máy cửa, chọn
> người Microsoft 365 đã có giấy phép); không còn bước "đề nghị — Admin duyệt". Chi tiết mã
> nhân sự và cấu hình: [`LUONG-TAO-NHAN-SU-TU-DONG.md`](LUONG-TAO-NHAN-SU-TU-DONG.md).

Khi nhân sự bấm **+ Thêm nhân viên** (trang Nhân viên) và lưu, hệ thống thực hiện trọn một
chuỗi tích hợp mà không cần thao tác tay thêm:

> **Ô đầu tiên của form là "Loại lao động"** (từ 27/10/2026) — chọn trước để form mở đúng
> phần cần điền. Chọn *Outsource (cộng tác viên)* thì hệ thống tự đặt **Chế độ lương = Không
> theo bảng lương**, bật **Miễn chấm công** và **ẩn** PIN, máy cửa, ca làm việc, công chuẩn
> riêng, chấm công điện thoại — bước 3 dưới đây không chạy. Xem
> [`NHAN-SU-OUTSOURCE.md`](NHAN-SU-OUTSOURCE.md).

1. **Sinh mã nhân viên** — `NV` + mã ngắn khối + MMYY + số thứ tự (`NVKHN05260001`). Không
   nhập tay.
2. **Lưu hồ sơ** (họ tên, chức danh, vị trí, phòng ban, ca làm, email, …).
3. **Tự cấp PIN máy chấm công** theo dải của máy thuộc **khối** đã chọn.
4. **Tạo tài khoản hệ thống** (`nguoi_dung`, đăng nhập app điện thoại) — vai trò tự suy từ
   ô **Vị trí**.
5. **Báo cổng phân quyền** — sự kiện `nhan_su.da_tao` (đã có sẵn từ trước): cổng tự tạo bản
   ghi danh tính cho người này.
6. **Báo ERP1** — sự kiện `erp1.nhan_su.da_tao` kèm chức danh + phòng ban: ERP1 nhận và tự
   thiết lập tài khoản, tự phân quyền theo vị trí.
7. **Tạo tài khoản Microsoft 365** (nếu đánh dấu): tạo user Entra với UPN = email + cấp giấy
   phép **Basic**. Chọn người từ danh sách M365 đã có giấy phép thì **không tạo lại** tài khoản
   (`ms365_da_co`). **Người lập hồ sơ nhận chuông "Tài khoản Microsoft 365 của <họ tên>: <UPN>"
   kèm mật khẩu khởi tạo** để bàn giao; nhân viên **bắt buộc đổi mật khẩu** ở lần đăng nhập
   Microsoft đầu tiên (`forceChangePasswordNextSignIn`).
8. **Giao việc "Nhập việc" + 15 mục checklist** cho người phụ trách nhân sự
   (workflow `nhap_viec_nhan_su` hoặc `NHAP_VIEC_NHAN_SU_ID`) — cùng transaction.
9. **Báo quản trị viên** qua chuông "Có nhân sự mới: <họ tên>" (`gui_ngam`, màn Nhân viên).
   Đây là thông báo, **không phải yêu cầu duyệt** — hồ sơ đã hoàn tất khi lưu.
10. **Gán vị trí trong Tổ chức & trách nhiệm** (nếu người lập chọn): ghi `nhan_vien_vi_tri`,
    vị trí chọn đầu tiên thành **vị trí chính** (điền chức danh nếu ô đó trống), và **sinh mẫu
    việc định kỳ** từ các `dau_viec` của vị trí — tất cả trong cùng transaction. Bỏ trống nếu
    chưa khai cấu hình; có thể gán/gỡ sau ở trang Tổ chức & trách nhiệm.
11. **Tạo hợp đồng lao động** khi chọn Loại hợp đồng: `hoc_viec` · `cong_tac_vien` (Outsource)
    · `thu_viec` · `xac_dinh` (bắt buộc kì hạn 6/12 tháng) · `khong_xac_dinh`. Hiệu lực từ ngày
    vào làm; chính thức có hạn = +6/+12 tháng - 1 ngày. Checklist nhập việc nhắc đúng loại.

Bước 4 được tạo **ngay cùng transaction** với dòng nhân viên; các bước báo ra ngoài (5, 6, 7)
đi qua bảng `hop_thu_di` **cùng transaction** rồi tiến trình nền đẩy đi với cơ chế thử lại
(backoff). Nghĩa là: dù cổng, ERP1 hay Microsoft đang chết, sự kiện vẫn nằm chờ và sẽ đi khi
hệ thống kia sống lại — không mất.

---

## 1. Mã nhân sự và PIN

- **Mã nhân sự do hệ thống sinh**: `NV` + mã ngắn khối + `MMYY` (tháng năm vào làm) + số thứ tự
  4 chữ số, ví dụ `NVKHN05260001`. Số thứ tự đếm theo (khối, tháng) và **không tái dùng**. Mã
  cũ khai tay vẫn được giữ nguyên — chỉ hồ sơ mới mới sinh tự động.
- Trên form chọn **khối** — hệ thống tự biết máy chấm công nào phục vụ khối đó
  (`thiet_bi.khoi_id`) và chọn **số PIN còn trống đầu tiên trong dải** của máy
  (`pin_tu`–`pin_den`, xem trang Thiết bị), ghi vào bảng mã định danh (`ma_dinh_danh`) và vào
  cột `nhan_vien.pin_may`.
- Hai nhân sự bấm cùng lúc được gợi ý cùng một số: unique index chặn người thứ hai, hệ thống
  **tự thử lại với số kế tiếp** (tối đa 5 lần) thay vì báo lỗi.
- **Lệnh `DATA UPDATE USERINFO` được xếp cho mọi máy đang bật của khối ngay trong transaction**
  — nhân sự không phải khai tay PIN lên máy nữa (vân tay/khuôn mặt vẫn phải enroll tại máy).
- Muốn nhập PIN có sẵn trên máy thì tắt ô "Tự cấp PIN theo dãy của máy thuộc khối" và gõ số.

## 2. Tài khoản hệ thống (đăng nhập app điện thoại)

Khi đánh dấu **Tạo tài khoản hệ thống** (chế độ "Thêm nhân viên tự động" luôn bật), hệ thống
tạo luôn tài khoản `nguoi_dung` **cùng transaction** với hồ sơ:

- **Tên đăng nhập** sinh từ mã nhân viên (hạ chữ thường, bỏ dấu, chỉ giữ chữ/số/`. _ -`),
  ví dụ `NVKHN05260001` → `nvkhn05260001`. Trùng tên đăng nhập đã có thì báo lỗi rõ, không đè
  lên.
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

### 2.2 Giấy phép

Tài khoản Microsoft mới nhận **Business Basic** (`MS365_SKU_BASIC`) — chốt 10/2026. Standard chỉ
khi người có thẩm quyền chọn đích danh lúc duyệt đề nghị (`sku_id_tuy_chon`).

Hai điều kiện bắt buộc để bước cấp giấy phép chạy được (thiếu là sự kiện nằm chờ mãi):

- **`usageLocation`** phải có trước khi `assignLicense` — hệ thống tự đặt theo `MS365_QUOC_GIA`
  (mặc định `VN`) cho tài khoản chưa có.
- **Tài khoản chưa có giấy phép nào khác.** Đang dùng gói khác (ví dụ Business Standard) thì hệ
  thống **không** cấp chồng Basic mà gửi chuông cho nhân sự biết để quyết — cấp chồng là trả
  tiền hai lần cho cùng một người.

Tài khoản **đã tồn tại** (quản trị tạo tay trong trung tâm quản trị, hoặc lần trước đứt giữa
chừng) không phải lỗi: hệ thống đọc lại tài khoản rồi đi tiếp bước cấp giấy phép. Entra trả
**HTTP 400** (không phải 409) khi trùng UPN — đừng dựa vào mã 409.

Hàm `la_truong_phong()` (`may_chu/src/nhan_su/ms365.ts`) chỉ còn để gợi ý trên giao diện khi
Admin chọn Standard thủ công; nó **không** còn là quy tắc mặc định.

### 2.3 Cấu hình

```bash
# 1 = bật. Mặc định 0: sự kiện vẫn được ghi vào hộp thư đi và nằm chờ, bật lên là đi.
MS365_TAO_TAI_KHOAN_BAT=1
MS365_SKU_BASIC=<skuId Business Basic>
MS365_SKU_STANDARD=<skuId Business Standard>
# Quốc gia sử dụng gán cho tài khoản mới — Graph bắt buộc có trước khi cấp giấy phép.
MS365_QUOC_GIA=VN
```

Lấy `skuId` bằng Graph `GET /subscribedSkus` hoặc trang **Giấy phép** trong Entra admin center.

Dùng **chung tài khoản ứng dụng** với email (`MS_MAIL_*`) như bước nghỉ việc — ứng dụng đó phải
được admin Entra consent thêm các quyền ứng dụng:

- `User.ReadWrite.All` — `POST /users` (tạo tài khoản)
- `LicenseAssignment.ReadWrite.All` — `assignLicense` (cấp/rút giấy phép). Thiếu quyền này thì
  Graph trả **403** `Insufficient privileges` dù `User.ReadWrite.All` đã có trong token (đã kiểm
  29/10/2026: PATCH user trả 204 nhưng `assignLicense` vẫn 403).

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
  "ma_nv": "NVKHN05260001",
  "ma_erp": "THVN-0789",
  "email": "tranthib@tranhoangvietnam.com",
  "ho_ten": "Trần Thị Bình",
  "so_dien_thoai": "0912345678",
  "ngay_vao": "2026-05-22",
  "pin_may": "1013",
  "chuc_danh": "Trưởng phòng Kinh doanh",
  "phong_ban": "Kinh doanh"
}
```

`ma_erp1` (mã bên ERP1) được đọc từ bảng mã định danh **lúc gửi**, nên chỉ cần khai ô
"Mã nhân viên bên ERP1" trên form là webhook mang theo — không phải sửa thân sự kiện.

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
