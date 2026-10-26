# Kiểm tra ứng dụng bắt buộc qua Microsoft 365

Tính năng trong **Hồ sơ nhân sự → Thông tin chung**: thẻ “Ứng dụng bắt buộc trên máy tính và
điện thoại”, tự cập nhật hằng ngày.

## 1. Công ty bắt buộc những ứng dụng nào

| Nền tảng | Ứng dụng |
| --- | --- |
| Máy tính | Outlook, Microsoft Teams, OneDrive for Business |
| Điện thoại | Microsoft Authenticator, Outlook, Microsoft Teams, OneDrive, SharePoint |

Danh sách khai **một chỗ duy nhất**: `UNG_DUNG_BAT_BUOC` trong
`may_chu/src/nhan_su/ung_dung_ms365.ts`. Thêm/bớt ứng dụng thì sửa mảng đó rồi deploy.

## 2. Điều quan trọng nhất: đây là **bằng chứng sử dụng**, không phải danh sách cài đặt

Microsoft Graph **không có API “liệt kê ứng dụng đã cài”** nếu công ty không dùng **Intune** quản
lý thiết bị. Vì vậy thẻ này trả lời câu “người đó **đã đăng nhập / đồng bộ** ứng dụng chưa”, chứ
không khẳng định “ứng dụng đã được cài”.

| Ứng dụng | Nguồn dữ liệu | Ý nghĩa thực tế |
| --- | --- | --- |
| Outlook (máy tính) | `getM365AppUserDetail` cột `Outlook (Windows)` | Có kích hoạt Outlook trên Windows trong 30 ngày |
| Teams (máy tính) | cùng báo cáo, cột `Teams (Windows)` | Có kích hoạt Teams trên Windows |
| OneDrive (máy tính) | `getOneDriveActivityUserDetail` cột `Synced File Count` | Có đồng bộ tệp — chỉ bản máy tính mới đồng bộ được |
| Authenticator (điện thoại) | **Chưa lấy được** | Cần Entra ID P1 (tenant hiện trả 403 “không có premium license”) hoặc Intune |
| Outlook (điện thoại) | `Outlook (Mobile)` | Có dùng app di động |
| Teams (điện thoại) | `Teams (Mobile)` | Có dùng app di động |
| OneDrive (điện thoại) | **Chưa lấy được** | Báo cáo M365 không tách riêng bản di động |
| SharePoint (điện thoại) | **Chưa lấy được** | Báo cáo M365 không tách riêng bản di động |

Giao diện ghi đúng các trạng thái:

- **Đã dùng** — có hoạt động trong kỳ báo cáo 30 ngày.
- **Chỉ dùng bản web** — Outlook/Teams chỉ thấy trên web (máy tính), hoặc OneDrive chỉ xem/sửa
  trên web. Đây là tín hiệu *chưa cài bản desktop/mobile*, nhưng **không** phải bằng chứng chắc
  chắn là chưa cài.
- **Chưa thấy dùng** — báo cáo đọc được nhưng không có hoạt động.
- **Chưa kiểm tra được** — nguồn không trả dữ liệu (giấy phép/quyền/không tách được thiết bị).
  Lỗi kỹ thuật **không bao giờ** bị ghi thành lỗi của nhân viên.
- **Chưa có tài khoản M365** — hồ sơ chưa có email/UPN Microsoft, **hoặc** email có nhưng chưa
  được cấp giấy phép (đối chiếu ảnh chụp `ms365_nguoi_da_cap_phep` — người không có giấy phép
  thì không thể cài ứng dụng công ty, nên không bị ghi là “chưa thấy dùng”).

> Khi cần bằng chứng để nhắc nhở hay kỷ luật, phải kiểm tra thêm trên máy thật. Thẻ này chỉ là
> danh sách gợi ý để nhân sự rà soát.

## 3. Cách chạy

- **Tự động**: lịch chạy 08:00 và 13:00 mỗi ngày (giờ máy chấm công), khóa
  `kiem_tra_ung_dung_ms365:<ngày>:<giờ>` trong `cong_viec_da_chay`. Cửa sổ thứ hai để một lần lỗi
  mạng tạm thời không làm mất cả ngày dữ liệu.
- **Thủ công**: nút **Đồng bộ ngay** trên thẻ, hoặc
  `POST /api/nhan-vien/ms365-ung-dung/dong-bo` (quyền `can_nhan_su`).
- **Chạy ngay một vòng trong container** (không cần chờ lịch):
  `docker compose exec -T may_chu node /app/chay_kiem_tra_ung_dung_ms365.mjs`
  (chép `trien_khai/chay_kiem_tra_ung_dung_ms365.mjs` vào container trước).
- Chỉ chạy khi đã cấu hình Microsoft Graph (`MS_MAIL_TENANT_ID` / `CLIENT_ID` / `CLIENT_SECRET`).

Báo cáo Microsoft **cập nhật theo tuần**, nên thẻ hiển thị thêm dòng “báo cáo M365 đến …” để
người đọc biết dữ liệu cũ đến đâu. Không được hiểu là “số liệu tính đến hôm nay”.

## 4. Quyền Microsoft Graph

App `cham-cong-sharepoint-sync` cần **một** quyền ứng dụng đọc:

| Quyền | Dùng để |
| --- | --- |
| `Reports.Read.All` | Đọc báo cáo sử dụng M365 và OneDrive |

Đã cấp + admin consent ngày 26/10/2026. Cách cấp lại (Azure CLI đăng nhập tài khoản quản trị):

```bash
az ad app permission add --id 9d4adda5-7174-4862-b7e0-eed2758c2943 \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions 230c1aed-a721-4c5d-9cb4-a90514e508ef=Role
az ad app permission admin-consent --id 9d4adda5-7174-4862-b7e0-eed2758c2943
```

`AuditLog.Read.All` **không cấp**: API đăng ký MFA/Authenticator trả
`Authentication_RequestFromNonPremiumTenantOrB2CTenant` vì tenant không có Entra ID P1/P2. Quyền
này đã được gỡ để giữ tối thiểu quyền.

Kiểm tra quyền + dữ liệu thật (chỉ đọc), chạy trong container `may_chu`:

```bash
scp trien_khai/kiem_tra_bao_cao_ms365.mjs vps:/root/Cham-cong/trien_khai/
ssh vps 'cd /root/Cham-cong && docker compose cp trien_khai/kiem_tra_bao_cao_ms365.mjs may_chu:/app/ \
  && docker compose exec -T may_chu node /app/kiem_tra_bao_cao_ms365.mjs'
```

## 5. Muốn kiểm kê chính xác ứng dụng đã cài thì cần gì

Chọn một trong hai hướng:

1. **Intune** (khuyến nghị về dài hạn) — máy Windows và điện thoại phải được đăng ký (enroll),
   bật MDM authority, rồi đọc `deviceManagement/managedDevices/{id}/detectedApps` (máy tính) và
   `mobileApps`/app protection (điện thoại). Điều kiện: mỗi người cần giấy phép có Intune Plan 1
   — hiện **chỉ 10/46 người có Business Premium**; 43 người còn lại dùng Business Basic (không
   có Intune). Đồng thời Intune chưa được kích hoạt cho tenant
   (`deviceManagement` trả “Request not applicable to target tenant”).
2. **Phần mềm quản lý thiết bị khác** (MDM/EDR) và đẩy dữ liệu vào bảng
   `ms365_ung_dung_kiem_tra` — không cần đổi giao diện.

Khi có Intune, chỉ cần thay hàm `danh_gia_ung_dung` (hoặc bổ sung nguồn) và thêm trạng thái
“đã cài” thật; phần hiển thị và lịch chạy giữ nguyên.

## 6. Dữ liệu và API

Bảng `ms365_ung_dung_kiem_tra` (migration 114) là **ảnh chụp** lần quét gần nhất, mỗi người 8
dòng (3 máy tính + 5 điện thoại). Mỗi lần quét **xóa và ghi đè** trong một transaction; dòng của
người đã nghỉ cũng bị dọn.

| Phương thức | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/nhan-vien/:id/ms365-ung-dung` | nhóm hồ sơ `thiet_bi` | Ảnh chụp của một người + mốc đồng bộ |
| POST | `/api/nhan-vien/ms365-ung-dung/dong-bo` | `can_nhan_su` | Quét lại toàn công ty |

Kết quả lần chạy tự động nằm ở `cong_viec_da_chay.ket_qua` với khóa
`kiem_tra_ung_dung_ms365:<ngày>:<giờ>`; nhật ký thao tác thủ công ghi `dong_bo_ms365_ung_dung`.

## 7. Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
| --- | --- |
| `HTTP 400 JSON format is not supported` | Tenant này chỉ trả CSV cho báo cáo. Code đang dùng `$format=text/csv` — đừng đổi sang JSON. |
| `HTTP 403` khi đọc báo cáo | Thiếu `Reports.Read.All` hoặc chưa admin consent. Chạy lại mục 4. |
| `Authentication_RequestFromNonPremiumTenantOrB2CTenant` | Tenant không có Entra ID P1/P2 — không đọc được trạng thái Authenticator. Đây là lý do Authenticator luôn “chưa kiểm tra được”. |
| Mọi người đều “Chưa thấy dùng” | Xem “báo cáo M365 đến …” trên thẻ. Nếu ngày cũ hơn 7 ngày, Microsoft chưa làm mới báo cáo; chờ hoặc mở Microsoft 365 admin center → Reports để kiểm tra. |
| Một người “Chưa có tài khoản M365” | Hồ sơ thiếu `nguoi_dung.email_microsoft`/`nhan_vien.email`, **hoặc** email chưa được cấp giấy phép Microsoft 365. Bổ sung/cấp giấy phép rồi đồng bộ lại. |
| Báo cáo lỗi một nguồn | Thẻ ghi “Chưa kiểm tra được” cho các ứng dụng của nguồn đó; nguồn còn lại vẫn hiển thị. Xem `cong_viec_da_chay.ket_qua` để biết lỗi cụ thể. |
