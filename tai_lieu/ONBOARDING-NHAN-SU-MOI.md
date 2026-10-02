# Onboarding nhân sự mới tự động (DTKT 02/2026/ĐTKT-IT)

> Trạng thái: **ĐÃ TRIỂN KHAI** (1.109.0) — 2026-09-26
>
> HR/quản lý tạo **đề nghị thêm nhân sự** → Admin duyệt **đúng 1 bước** → hệ thống tự chạy
> toàn bộ khởi tạo và tự gán checklist nhập việc vào Công việc cho người phụ trách nhân sự.

## 1. Luồng

```
HR/quản lý                                Admin                            Hệ thống (1 transaction)
  tạo đề nghị ──cho_duyet──►  sửa mã/PIN/chức danh nếu cần
                             Duyệt ──────────────────────────────────►  insert nhan_vien + cấp PIN
                             (Từ chối + lý do → da_tu_choi)                outbox: nhan_su.da_tao (cổng)
                                                                           outbox: erp1.nhan_su.da_tao (ERP1)
                                                                           outbox: ms365.tao_tai_khoan (nếu cap_ms365)
                                                                           nguoi_dung (tài khoản hệ thống, nếu bật)
                                                                           lệnh DATA UPDATE USERINFO → máy cửa
                                                                           công việc "Nhập việc" + 15 mục checklist
                                                                           de_nghi → da_khoi_tao + nhan_vien_id
```

- Trạng thái: `cho_duyet` → `da_khoi_tao` / `da_tu_choi` (CHECK trong migration 092).
- **Một transaction duy nhất** cho cả khối (REQ-OB-03): máy chết giữa chừng là cuốn hết —
  không có trạng thái "có người, không có tài khoản".
- Chống duyệt trùng: câu UPDATE đề nghị có `where trang_thai='cho_duyet'` ngay trong
  transaction — duyệt hai lần / hai instance chỉ khởi tạo một lần (REQ-TEST-06).

## 2. API

| Route | Quyền | Ý nghĩa |
| --- | --- | --- |
| `GET /api/de-nghi-nhan-su/ms365-da-cap-phep` | nhân sự | Danh sách người Microsoft 365 đã có giấy phép (Graph app-only) — loại bỏ người đã có hồ sơ và người đã có đề nghị chờ duyệt |
| `POST /api/de-nghi-nhan-su` | nhân sự | Tạo đề nghị (nhân sự mới chưa được khởi tạo) |
| `GET /api/de-nghi-nhan-su?trang_thai=` | nhân sự | Danh sách đề nghị |
| `PATCH /api/de-nghi-nhan-su/:id` | nhân sự | Sửa đề nghị đang chờ duyệt |
| `POST /api/de-nghi-nhan-su/:id/duyet` | **admin** | Duyệt → chạy khởi tạo; nhận thêm `ma_nv`, `pin_may`, `chuc_danh`, `sku_id`, `serial_may_cua` (REQ-G-01) |
| `POST /api/de-nghi-nhan-su/:id/tu-choi` | **admin** | Từ chối + lý do bắt buộc |

Phản hồi duyệt gồm `nhan_vien_id`, `pin_may`, `viec_id`, `tai_khoan_ms365` (mật khẩu khởi
tạo **chỉ hiện một lần**, REQ-SC-07), `tai_khoan_he_thong`, `canh_bao`.

Kiểm trước khi chạy (REQ-G-03): email/UPN hợp lệ; `cap_ms365=true` mà chưa khai SKU thì
**chặn duyệt** với lỗi rõ — khác luồng thêm nhân viên tay (ở đó chỉ cảnh báo).

## 2b. Đề nghị từ danh sách Microsoft 365 đã có giấy phép

HR có thể **chọn người có sẵn tài khoản Microsoft 365 kèm giấy phép** (danh sách đọc từ
Graph, chỉ gồm tài khoản đang bật + có ≥ 1 giấy phép + không phải guest `#EXT#`, đã loại
người có hồ sơ / đề nghị chờ duyệt) thay vì nhập tay. Khi chọn, đề nghị lưu kèm
`ms365_da_co = true` và `ms365_oid` (object id trong Entra để đối soát):

- Khi duyệt, hệ thống **không** gửi sự kiện `ms365.tao_tai_khoan` — tạo lại sẽ đụng độ UPN
  và có thể cấp nhầm giấy phép cho người khác. Các phần còn lại (ERP1, cổng, PIN, việc
  nhập việc) chạy bình thường.
- Mục checklist 1 "Tạo tài khoản MS365 + cấp giấy phép" được **tick sẵn** (không còn việc
  gì phải làm); phản hồi duyệt trả `ms365_da_co: true`, không có mật khẩu khởi tạo nào.
- Thiếu email mà `ms365_da_co = true` thì **chặn duyệt** (email chính là UPN để đối chiếu).
- Route danh sách yêu cầu cấu hình Graph (`MS_MAIL_TENANT_ID` / `CLIENT_ID` /
  `CLIENT_SECRET`, dùng chung creds với mail — app đã có `User.ReadWrite.All` nên đọc được
  danh sách). Chưa cấu hình thì trả lỗi rõ ràng, form vẫn nhập tay được.

### Nguồn danh sách: ảnh chụp + quét định kỳ + đồng bộ ngay

Danh sách không đọc Graph mỗi lần mở form nữa — hệ thống giữ **ảnh chụp** trong bảng
`ms365_nguoi_da_cap_phep` (migration 099) và cập nhật bằng:

- **Lịch quét 08:00 và 13:00** mỗi ngày (giờ máy chấm công, `su_kien/lich_chay.ts`);
- **Nút "Đồng bộ ngay"** cạnh ô chọn trong form (route
  `POST /api/de-nghi-nhan-su/ms365-da-cap-phep/dong-bo`, quyền nhân sự).

Khi phát hiện tài khoản **mới được cấp phép** (oid chưa từng có trong ảnh chụp), hệ thống
báo Nhân sự qua chuông thông báo kèm tên người mới, bấm vào mở thẳng trang đề nghị.
Lần đầu mở form mà ảnh chụp còn trống thì hệ thống tự quét một lần để khởi danh sách.

## 3. Cấu hình

```bash
# Bắt buộc khi bật tạo tài khoản Microsoft (chặn duyệt nếu thiếu SKU):
MS365_TAO_TAI_KHOAN_BAT=1
MS365_SKU_BASIC=<skuId Business Basic>
MS365_SKU_STANDARD=<skuId Business Standard>

# Bắt buộc khi bật tạo tài khoản ERP1 (sự kiện nằm chờ tới khi khai):
ERP1_WEBHOOK_URL=
ERP1_WEBHOOK_SECRET=

# Onboarding:
NHAP_VIEC_NHAN_SU_ID=        # nhan_vien id HOAC ma_nv cua nguoi phu trach nhan su
SERIAL_MAY_CUA_MAC_DINH=     # serial may cua de day user+PIN khi de nghi khong chon may
EMAIL_DICH_VU_BHXH=          # hien thi trong checklist muc bao tang BHXH
```

Người phụ trách nhân sự ưu tiên chọn qua **Công việc → Workflow hệ thống →
"Nhập việc nhân sự mới"** (dòng `cong_viec_workflow` `nhap_viec_nhan_su`, REQ-CL-03) — đổi
người chỉ sửa một dòng cấu hình, không sửa code. Thiếu cả hai thì hệ thống vẫn khởi tạo
nhân sự nhưng báo cảnh báo "chưa giao được việc nhập việc".

## 4. Checklist nhập việc (15 mục)

Mục 1 "Tạo tài khoản MS365 + cấp giấy phép" tick sẵn khi `cap_ms365`; mục 2 "Tạo tài khoản
ERP1" luôn tick sẵn; mục 3 "Cấp số PIN + đẩy xuống máy cửa" chỉ tick khi **máy cửa xác nhận**
lệnh thành công (devicecmd `Return=0`). 12 mục còn lại là việc của con người (enroll sinh
trắc học, hồ sơ, HĐLĐ, BHXH, thuế, bàn giao tài sản, đào tạo…).

## 5. Đẩy PIN xuống máy cửa (3 lớp tự động)

| Lớp | Trạng thái |
| --- | --- |
| Cấp số PIN + ghi hệ thống (`goi_y_pin` + `gan_ma`) | Tự động, chống trùng vòng 5 lần |
| Gửi PIN sang ERP1 (`erp1.nhan_su.da_tao.pin_may`) | Tự động |
| Lệnh `DATA UPDATE USERINFO` (user + PIN + quyền) xuống máy kiểm soát ra vào | **Cần đối chiếu máy thật** — lệnh soạn theo khuôn bang USERINFO máy đẩy lên (`PIN / Name / Pri / Passwd / Card / Grp / TZ`), có `khoa_chong_trung` không đẩy trùng, nằm chờ khi máy offline |

⚠️ **Vân tay/khuôn mặt không đẩy từ xa được** — luôn phải enroll tại máy; đó là mục
checklist của nhân sự (mục 4). Trước khi lệnh chạy được trên máy thật, mục checklist
"enroll tại máy" đảm nhận cả PIN.

## 6. Kiểm thử

```bash
npm test                                   # đơn vị: nhap_viec.test.ts (checklist + khuôn lệnh máy)
npm --workspace may_chu run test_e2e       # de_nghi_e2e.test.ts: 9 tình huống REQ-TEST-01..06
```

E2E bao phủ: duyệt → nhân viên + 3 sự kiện + PIN + lệnh máy + việc nhập việc; trưởng phòng
→ SKU Standard; `cap_ms365=false`; dải PIN còn 1 số; thiếu email chặn duyệt; duyệt trùng
chỉ 1 lần; từ chối + phân quyền admin; workflow ưu tiên hơn env.

## 7. Ghi chú bảo mật

- Mật khẩu khởi tạo MS365 hiện một lần cho Admin ở phản hồi duyệt, xóa khỏi outbox sau khi
  tạo (giữ cơ chế hiện có). Không log ra file.
- Sự kiện outbox + lệnh máy + việc nhập việc ghi **cùng transaction** với `nhan_vien`.
- Nhật ký kiểm toán: `tao_de_nghi_nhan_su`, `sua_de_nghi_nhan_su`, `duyet_de_nghi_nhan_su`,
  `tu_choi_de_nghi_nhan_su` + `tao_nhan_vien` (như cũ).
