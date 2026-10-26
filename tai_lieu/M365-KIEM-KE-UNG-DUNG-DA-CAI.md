# Kiểm kê ứng dụng đã cài bằng Microsoft Graph — API nào dùng được?

Tài liệu này trả lời câu hỏi: *“Microsoft có API trả danh sách ứng dụng **đã cài** trên máy
tính/điện thoại không?”* — **Có**, nhưng chỉ trong **Intune** hoặc **Microsoft Defender XDR**,
không nằm trong báo cáo sử dụng Microsoft 365.

Trạng thái tenant ngày 26/10/2026 được ghi ở mục 4: **cả hai nguồn đều chưa sẵn sàng**, nên thẻ
trong Hồ sơ nhân sự hiện dùng bằng chứng đăng nhập/đồng bộ (báo cáo M365).

## 1. Intune — “Discovered apps” (nguồn chính thức để kiểm kê đã cài)

### 1.1. API danh sách ứng dụng phát hiện được

| Việc cần làm | Graph API | Quyền ứng dụng |
| --- | --- | --- |
| Liệt kê toàn bộ ứng dụng phát hiện được trong tenant | `GET /deviceManagement/detectedApps` | `DeviceManagementManagedDevices.Read.All` |
| Xem một ứng dụng + số thiết bị đã cài | `GET /deviceManagement/detectedApps/{id}` | như trên |
| Danh sách thiết bị đã cài một ứng dụng | `GET /deviceManagement/detectedApps/{id}/managedDevices` | như trên |
| Ứng dụng trên **một thiết bị** | `GET /deviceManagement/managedDevices/{id}?$expand=detectedApps` (beta; v1.0 có thể trả 400) | như trên |

`detectedApp` trả: `displayName`, `version`, `publisher`, `sizeInByte`, `deviceCount`,
`platform` (`windows`, `iOS`, `macOS`, `androidWorkProfile`, …).

Tài liệu:
- <https://learn.microsoft.com/en-us/graph/api/intune-devices-detectedapp-list>
- <https://learn.microsoft.com/en-us/graph/api/resources/intune-devices-detectedapp>
- <https://learn.microsoft.com/en-us/graph/api/resources/intune-devices-manageddevice>

**Điều kiện bắt buộc:**
- Tenant có **giấy phép Intune đang hoạt động** (Intune Plan 1).
- Thiết bị **đã đăng ký (enroll) vào Intune**. Thiết bị cá nhân không enroll chỉ hiện **ứng
  dụng được quản lý (MAM)**, không hiện toàn bộ ứng dụng đã cài.
- Ứng dụng không do Intune quản lý chỉ hiện với thiết bị **thuộc sở hữu công ty**.

### 1.2. Báo cáo export — phù hợp để đổ vào bảng của Chấm công

Intune có báo cáo **Discovered apps** xuất qua Graph (beta):

```http
POST https://graph.microsoft.com/beta/deviceManagement/reports/exportJobs
Content-Type: application/json

{ "reportName": "AppInvRawData", "format": "csv" }
```

Sau đó:
1. `GET /deviceManagement/reports/exportJobs('{id}')` cho tới khi `status = complete`.
2. Tải `url` trong phản hồi (zip CSV).

Các cột có sẵn: `ApplicationName`, `ApplicationVersion`, `ApplicationPublisher`, `DeviceId`,
`DeviceName`, `Platform`, `UserName`, `EmailAddress`, `OSDescription`, `OSVersion`.

Các báo cáo liên quan: `AppInvAggregate`, `AppInvByDevice`, `DevicesByAppInv`.
Tài liệu: <https://learn.microsoft.com/en-us/intune/device-management/reports/ref-graph-available-reports>

## 2. Microsoft Defender XDR — bảng `DeviceTvmSoftwareInventory`

Nếu công ty có **Defender for Endpoint/Defender for Business** và thiết bị đã onboard, có thể
truy vấn phần mềm đã cài bằng Advanced Hunting:

```http
POST https://graph.microsoft.com/v1.0/security/runHuntingQuery
Content-Type: application/json

{ "Query": "DeviceTvmSoftwareInventory | where SoftwareName has 'Outlook' | project DeviceName, OSPlatform, SoftwareVendor, SoftwareName, SoftwareVersion" }
```

Quyền ứng dụng: **`ThreatHunting.Read.All`**.

Cột: `DeviceId`, `DeviceName`, `OSPlatform`, `OSVersion`, `OSArchitecture`, `SoftwareVendor`,
`SoftwareName`, `SoftwareVersion`, `EndOfSupportStatus`, `EndOfSupportDate`.

Tài liệu:
- <https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-devicetvmsoftwareinventory-table>
- <https://learn.microsoft.com/en-us/graph/api/security-security-runhuntingquery>

**Giới hạn:** chỉ dữ liệu 30 ngày gần nhất; chỉ thiết bị có sensor Defender; **không có điện
thoại** (TVM hiện tập trung Windows/macOS/Linux); cần license Defender for Endpoint.

## 3. Authenticator — đăng ký phương thức, không phải “đã cài”

Authenticator không nằm trong báo cáo ứng dụng. Cách gần nhất là đọc **phương thức xác thực đã
đăng ký**:

- `GET /users/{id}/authentication/methods` — quyền `UserAuthenticationMethod.Read.All`.
- `GET /reports/authenticationMethods/userRegistrationDetails` — quyền `AuditLog.Read.All`
  (báo cáo này yêu cầu Entra ID P1/P2).

Nếu có `microsoftAuthenticatorPush` / `microsoftAuthenticatorOTP` / `microsoftAuthenticatorPasswordless`
thì tài khoản **đã đăng ký Authenticator** (suy ra ứng dụng đã được cài và thiết lập trên ít nhất
một điện thoại). Đây là bằng chứng mạnh hơn báo cáo sử dụng, nhưng vẫn không phải danh sách cài đặt.

## 4. Trạng thái tenant Chấm công (kiểm tra thật 26/10/2026)

| Nguồn | Kết quả | Nguyên nhân |
| --- | --- | --- |
| `GET /deviceManagement/managedDevices` | **400** `Request not applicable to target tenant.` | Intune chưa được kích hoạt (MDM authority chưa thiết lập) |
| `POST /security/runHuntingQuery` | **403** `Account is not provisioned.` | Tenant không có Defender for Endpoint/Defender XDR |
| `userRegistrationDetails` | **403** `doesn't have premium license` | Không có Entra ID P1/P2 |
| `getM365AppUserDetail` | **200** (CSV) | Đang dùng cho thẻ hiện tại |
| `getOneDriveActivityUserDetail` | **200** (CSV) | Đang dùng cho OneDrive máy tính |

Giấy phép:
- `O365_BUSINESS_ESSENTIALS` (43 người): service plan `INTUNE_O365` ở trạng thái
  **PendingActivation** — đây là Basic Mobility and Security, **không** phải Intune Plan 1 đầy đủ.
- `O365_BUSINESS_PREMIUM` (10 người): có **Intune Plan 1**, nhưng cũng **PendingActivation**.
- Không có SKU nào chứa `DEFENDER`/`ATP`.

## 5. Muốn có “đã cài” thật thì làm gì

### Phương án A — Intune cho toàn bộ nhân viên (chính xác nhất)
1. Nâng 43 giấy phép Business Basic → Business Premium (hoặc mua Intune Plan 1 add-on).
2. Vào Intune admin center → **Tenant administration → Tenant status** đặt **MDM authority =
   Intune**; cấu hình auto-enrollment cho Windows/Android/iOS.
3. Enroll toàn bộ máy tính + điện thoại công ty (BYOD có thể dùng MAM nhưng sẽ **không** thấy
   toàn bộ ứng dụng đã cài).
4. Cấp quyền ứng dụng `DeviceManagementManagedDevices.Read.All` cho app Chấm công.
5. Chấm công đọc `AppInvRawData`/`detectedApps`, map `ApplicationName` → 8 ứng dụng bắt buộc,
   ghi trạng thái **Đã cài** kèm tên thiết bị.

### Phương án B — Chỉ 10 người Business Premium
Làm như A nhưng chỉ cho 10 người đó; 43 người còn lại vẫn dùng bằng chứng báo cáo M365.

### Phương án C — Defender XDR (nếu đã có Defender for Endpoint)
Cấp `ThreatHunting.Read.All`; chạy KQL `DeviceTvmSoftwareInventory`; chỉ áp dụng cho máy tính,
không có điện thoại.

### Phương án D — Giữ hiện trạng
Báo cáo sử dụng 30 ngày + ghi rõ “chưa kiểm tra được” cho Authenticator/OneDrive/SharePoint trên
điện thoại. Không tốn thêm giấy phép.

## 6. Chỉ dùng báo cáo M365 thì trích được gì (đo thật 26/10/2026)

Đã tải 5 báo cáo về và đọc **toàn bộ danh sách cột** (script
`trien_khai/kiem_tra_cot_bao_cao_m365.mjs`):

| Báo cáo | Số cột | Cột đáng dùng |
| --- | --- | --- |
| `getM365AppUserDetail` | 39 | `Outlook (Windows)`, `Teams (Windows)`, `Outlook (Mobile)`, `Teams (Mobile)`, `Outlook (Web)`, `Teams (Web)` |
| `getOneDriveActivityUserDetail` | 11 | `Synced File Count`, `Viewed Or Edited File Count` |
| `getSharePointActivityUserDetail` | 12 | `Synced File Count`, `Viewed Or Edited File Count`, `Visited Page Count` |
| `getTeamsDeviceUsageUserDetail` | 16 | `Used Windows`, `Used Mac`, `Used iOS`, `Used Android Phone`, `Used Web` |
| `getEmailAppUsageUserDetail` | 16 | `Outlook For Windows`, `Outlook For Mobile`, `Other For Mobile` |

**Không báo cáo nào có cột OneDrive/SharePoint tách riêng điện thoại**, và không có cột nào
liên quan Authenticator.

### 6.1. Phủ được 5/8 ứng dụng bắt buộc

| Ứng dụng | Bằng chứng lấy từ | Kết luận |
| --- | --- | --- |
| Outlook (máy tính) | `Outlook (Windows)` | Được |
| Teams (máy tính) | `Teams (Windows)` | Được |
| OneDrive (máy tính) | `Synced File Count` > 0 | Được |
| Outlook (điện thoại) | `Outlook (Mobile)` | Được |
| Teams (điện thoại) | `Teams (Mobile)`, hoặc `Used iOS`/`Used Android Phone` | Được |
| OneDrive (điện thoại) | — | **Không** |
| SharePoint (điện thoại) | — (`getSharePointActivityUserDetail` chỉ có đồng bộ trên máy tính) | **Không** |
| Authenticator | — (cần Entra ID P1/P2) | **Không** |

### 6.2. Hai báo cáo từng nghĩ là bù được — đo thì không

- `getEmailAppUsageUserDetail`: cột `Outlook For Mobile` **không trả `Yes`/`No`** mà trả
  `Undetermined` (53 người để trống, 13 người `Undetermined`). Tập 13 người này **trùng khớp
  100%** với 13 người có `Outlook (Mobile) = Yes` ở báo cáo M365 Apps → **không thêm thông tin**,
  ngữ nghĩa giá trị lại không rõ nên **không nên dùng**.
- `getTeamsDeviceUsageUserDetail`: 57 người có `Used iOS`/`Used Android Phone`, so với 58 người
  `Teams (Mobile) = Yes` ở báo cáo M365 Apps → nếu dùng thì phải **hợp hai nguồn**; lợi ích duy
  nhất là tách được iOS/Android. Không cần cho yêu cầu hiện tại.

### 6.3. Giới hạn phải nói rõ với nhân sự

“Chưa thấy dùng” nghĩa là **không có hoạt động trong 30 ngày**, **không phải** “chưa cài”. Người
đã cài Outlook nhưng 30 ngày không mở sẽ hiện “Chưa thấy dùng”. Vì vậy thẻ này dùng để **nhắc
nhở**, không dùng để kỷ luật.

## 7. Script kiểm tra nhanh sau khi kích hoạt

`trien_khai/kiem_tra_api_kiem_ke_ung_dung.mjs` — chạy trong container `may_chu`, in HTTP status
của 3 API trên. Dùng để xác nhận Intune/Defender đã sẵn sàng trước khi bật chế độ kiểm kê chính xác.

```bash
scp trien_khai/kiem_tra_api_kiem_ke_ung_dung.mjs vps:/root/Cham-cong/trien_khai/
ssh vps 'cd /root/Cham-cong && docker compose cp trien_khai/kiem_tra_api_kiem_ke_ung_dung.mjs may_chu:/app/ \
  && docker compose exec -T may_chu node /app/kiem_tra_api_kiem_ke_ung_dung.mjs'
```

## 8. Kết luận

- **Không có API “installed apps” ngoài Intune/Defender.** Báo cáo M365 (`Reports.Read.All`) chỉ
  có hoạt động/kích hoạt, không có danh sách cài đặt.
- Tenant hiện **chưa bật Intune**, **không có Defender**, **không có Entra P1** → chưa thể gọi
  API kiểm kê. Thẻ hiện tại vẫn là phương án trung thực và miễn phí.
- Muốn kiểm kê chính xác: chọn A/B/C và báo IT thực hiện các bước ở mục 5. Sau đó có thể nối
  vào tính năng trong 1 buổi làm việc (đã có sẵn điểm nối dữ liệu và giao diện).
