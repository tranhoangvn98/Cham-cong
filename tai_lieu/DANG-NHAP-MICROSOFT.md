# Đăng nhập bằng tài khoản Microsoft (Entra ID)

Nhân viên bấm **Đăng nhập bằng Microsoft** trên trang đăng nhập, xác thực bằng chính tài
khoản Microsoft 365 của công ty, không cần nhớ thêm mật khẩu nào.

Tính năng **mặc định tắt**. Chỉ bật khi khai đủ bốn giá trị `MS_*` trong `.env` — thiếu một
cái là tắt hẳn, không chạy nửa vời.

---

## 1. Đăng ký ứng dụng — bằng dòng lệnh (nhanh hơn)

Mở [shell.azure.com](https://shell.azure.com) (chọn **Bash**) rồi dán nguyên khối dưới đây.
`az` đã cài sẵn và đã đăng nhập bằng chính tài khoản đang mở Cloud Shell.

```bash
TEN_MIEN=teams.tranhoangvietnam.com
DUONG_DAN=/chamcong                 # để trống nếu webapp ở gốc tên miền

REDIRECT="https://$TEN_MIEN$DUONG_DAN/api/xac-thuc/microsoft/goi-ve"

APP_ID=$(az ad app create \
  --display-name "Cham cong" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "$REDIRECT" \
  --query appId -o tsv)

az ad sp create --id "$APP_ID" >/dev/null      # tạo Enterprise application tương ứng

# az KHÔNG tự thêm quyền mặc định như khi tạo qua giao diện. Thiếu bước này thì đầu mối
# admin consent trả AADSTS1003031 vì ứng dụng không khai quyền nào để duyệt.
# Bốn quyền: User.Read, openid, profile, email — đúng những gì hệ thống cần, không hơn.
az ad app permission add --id "$APP_ID" \
  --api 00000003-0000-0000-c000-000000000000 --api-permissions \
  e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope \
  37f7f235-527c-4136-accd-4a02d197296e=Scope \
  14dad69e-099b-42c9-810b-d002981feec1=Scope \
  64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0=Scope 2>/dev/null

SECRET=$(az ad app credential reset --id "$APP_ID" \
  --display-name "cham-cong-vps" --years 2 \
  --query password -o tsv)

TENANT=$(az account show --query tenantId -o tsv)

cat <<EOF

===== DÁN KHỐI NÀY VÀO .env TRÊN VPS =====
MS_TENANT_ID=$TENANT
MS_CLIENT_ID=$APP_ID
MS_CLIENT_SECRET=$SECRET
MS_REDIRECT_URI=$REDIRECT
MS_GOC_WEBAPP=https://$TEN_MIEN$DUONG_DAN
MS_TU_DONG_TAO=0
==========================================
EOF
```

`--sign-in-audience AzureADMyOrg` là "chỉ tài khoản trong tổ chức này". `--years 2` là hạn
dài nhất Entra cho phép — **ghi ngày hết hạn vào lịch**, secret hết hạn thì nút đăng nhập
Microsoft ngừng chạy mà không báo trước.

> `az ad app credential reset` **thay thế** mọi secret cũ của ứng dụng. Trên ứng dụng vừa
> tạo thì không sao, nhưng đừng chạy lại lệnh đó trên ứng dụng đang dùng.

### Ba tuỳ chọn nên cân nhắc thêm

**Bỏ màn hình xin quyền cho nhân viên.** Không làm thì mỗi người đăng nhập lần đầu sẽ thấy
một màn hình hỏi đồng ý. Cần vai trò Global Administrator.

`az ad app permission admin-consent` **không chạy được trong Cloud Shell** (token quản lý
danh tính của Cloud Shell không hợp với đầu mối consent, báo *"is not a supported MSI token
audience"*). Đừng chạy `az logout` để chữa — dễ hỏng phiên. Mở đường dẫn này trên trình
duyệt thay thế:

```
https://login.microsoftonline.com/<TENANT_ID>/adminconsent?client_id=<CLIENT_ID>
```

Bấm **Accept**. Sau đó trình duyệt nhảy về trang chấm công kèm thông báo *"Thiếu tham số
trả về từ Microsoft"* — bình thường, vì đầu mối consent trả về khác tham số so với luồng
đăng nhập. Consent vẫn được ghi nhận.

**Chỉ cho người được gán mới đăng nhập được.** Đây là cách chặn ở tầng Microsoft, chặt hơn
`MS_TU_DONG_TAO=0` vì người không được gán còn không qua nổi màn hình đăng nhập:

```bash
SP_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID" \
  --body '{"appRoleAssignmentRequired": true}'
```

Sau đó gán người dùng/nhóm trong Entra → Enterprise applications → **Cham cong** → Users
and groups.

**Thêm địa chỉ chuyển hướng khi chạy thử ở máy cá nhân:**

```bash
az ad app update --id "$APP_ID" --web-redirect-uris \
  "$REDIRECT" "http://localhost:8080/api/xac-thuc/microsoft/goi-ve"
```

Lệnh này **ghi đè** cả danh sách nên phải liệt kê lại địa chỉ cũ.

### Kiểm tra lại

```bash
az ad app show --id "$APP_ID" \
  --query "{ten:displayName, doi_tuong:signInAudience, chuyen_huong:web.redirectUris}" -o yamlc
```

### Không mở được Cloud Shell?

Cloud Shell cần một subscription Azure. Tổ chức chỉ dùng Microsoft 365 (không có
subscription) thì chạy `az` ngay trên VPS:

```bash
# Rocky/Alma/RHEL
rpm --import https://packages.microsoft.com/keys/microsoft.asc
dnf install -y https://packages.microsoft.com/config/rhel/9/packages-microsoft-prod.rpm
dnf install -y azure-cli

az login --allow-no-subscriptions --use-device-code
```

`--allow-no-subscriptions` là phần bắt buộc với tenant không có subscription. Đăng nhập
xong thì chạy đúng khối lệnh ở trên.

### Cần quyền gì

Tài khoản chạy các lệnh này phải có vai trò **Application Developer** trở lên (hoặc
Global Administrator). Thiếu quyền thì `az ad app create` trả
`Insufficient privileges to complete the operation`.

---

## 1b. Đăng ký ứng dụng — bằng giao diện web

Vào [Microsoft Entra admin center](https://entra.microsoft.com) → **Identity** →
**Applications** → **App registrations** → **New registration**.

| Mục | Điền |
|---|---|
| Name | `Chấm công` |
| Supported account types | **Accounts in this organizational directory only** (một tổ chức) |
| Redirect URI | **Web** → `https://teams.tranhoangvietnam.com/chamcong/api/xac-thuc/microsoft/goi-ve` |

Redirect URI phải khớp **từng ký tự** với `MS_REDIRECT_URI` trong `.env`, kể cả dấu gạch
chéo cuối (không có). Sai một ký tự là Microsoft trả lỗi `AADSTS50011` và không cho đăng
nhập.

Chọn *Accounts in this organizational directory only* nghĩa là chỉ tài khoản trong tổ chức
của bạn dùng được. Máy chủ còn kiểm lại `tid` trong token nên tài khoản tổ chức khác vẫn bị
từ chối, nhưng chặn ngay từ Entra thì sạch hơn.

Sau khi tạo xong, ở trang **Overview** lấy hai giá trị:

- **Application (client) ID** → `MS_CLIENT_ID`
- **Directory (tenant) ID** → `MS_TENANT_ID`

## 2. Tạo client secret

**Certificates & secrets** → **New client secret** → chọn hạn (24 tháng là mức dài nhất).

Sao chép cột **Value** ngay lúc đó — rời trang là không xem lại được, phải tạo cái mới.
Giá trị này là `MS_CLIENT_SECRET`.

> **Ghi ngày hết hạn vào lịch.** Secret hết hạn thì nút đăng nhập Microsoft ngừng hoạt động
> mà không có cảnh báo trước. Đăng nhập bằng mật khẩu vẫn chạy nên hệ thống không sập, chỉ
> là nhân viên đột nhiên không vào được bằng Microsoft.

## 3. Quyền

Ứng dụng tạo **qua giao diện** đã có sẵn `User.Read` — đủ dùng. Ứng dụng tạo **bằng `az`**
thì không có quyền nào, phải thêm bằng tay (xem khối lệnh ở mục 1).

Hệ thống chỉ cần `openid profile email`. Cả ba đều là quyền cơ bản nên nhân viên tự đồng ý
được — admin consent chỉ để họ khỏi phải bấm thêm một màn hình.

Không cấp thêm quyền nào khác. Hệ thống không đọc mail, không đọc lịch, không đọc danh bạ.

## 4. Khai vào `.env`

```bash
MS_TENANT_ID=<Directory (tenant) ID>
MS_CLIENT_ID=<Application (client) ID>
MS_CLIENT_SECRET=<Value của client secret>
MS_REDIRECT_URI=https://teams.tranhoangvietnam.com/chamcong/api/xac-thuc/microsoft/goi-ve
MS_GOC_WEBAPP=https://teams.tranhoangvietnam.com/chamcong

# Mặc định 0. Xem mục 6 trước khi bật.
MS_TU_DONG_TAO=0
```

`MS_GOC_WEBAPP` là nơi máy chủ chuyển người dùng về sau khi đăng nhập xong.

```bash
docker compose up -d
```

Không cần `--build`: các biến này đọc lúc chạy, không nhúng vào webapp.

> Đang nâng cấp một bản triển khai **có sẵn** từ phiên bản chưa có tính năng này thì phải
> lấy mã mới trước, và lần đó thì cần dựng lại ảnh:
>
> ```bash
> git pull && docker compose up -d --build
> ```
>
> Thiếu bước này thì `/api/xac-thuc/microsoft/goi-ve` trả *"Không có đường dẫn"* vì máy chủ
> đang chạy ảnh cũ.

## 5. Nối tài khoản với nhân viên

Hệ thống đối chiếu danh tính Microsoft với dữ liệu đang có, theo thứ tự:

1. **Object ID (`oid`)** đã ghi nhớ trong bảng mã định danh
2. Trường `email_microsoft` của tài khoản đăng nhập, nếu đã nối trước đó
3. Email trong hồ sơ **Nhân viên** (webapp → Nhân viên → cột Email)

Khớp ở bước 3 thì hệ thống tự ghi nhớ để lần sau khỏi dò lại.

### Vì sao `oid` đứng trước email

`oid` là mã định danh của Entra và **không bao giờ đổi**, còn email (UPN) đổi được — đổi tên
người, đổi tên miền, đổi phòng. Trước bản `1.32.0` hệ thống chỉ khớp bằng `lower(email)`: đổi
email trong Entra là mất khớp, và nếu tên miền nằm trong danh sách cho phép thì lần đăng nhập kế
tiếp **tạo một tài khoản thứ hai** cho cùng một người.

`oid` đi ra từ `id_token` đã qua kiểm chữ ký, issuer, audience và nonce, nên nó đáng tin ngang
email — thật ra hơn, vì không ai đổi được nó.

`oid` **chỉ lấy được lúc đăng nhập**, nên mỗi lần đăng nhập thành công hệ thống ghi nhớ nó vào
bảng `ma_dinh_danh` (xem [`MA-DINH-DANH.md`](MA-DINH-DANH.md)). Người chưa đăng nhập Microsoft lần
nào thì ô đó trống — bình thường, không phải lỗi.

Bước ghi nhớ này **không bao giờ làm hỏng việc đăng nhập**: người ta đã xác thực xong với
Microsoft, nên một mã trùng hay một lỗi cơ sở dữ liệu ở đó chỉ được ghi log, không được biến
thành "không đăng nhập được".

Nên làm: nhân sự điền đúng email công ty vào hồ sơ từng nhân viên, và tạo tài khoản đăng
nhập cho họ. Người chưa có tài khoản trong hệ thống sẽ bị từ chối kèm thông báo rõ ràng —
đây là chủ ý, không phải lỗi.

Nối tay khi cần (email Microsoft khác email trong hồ sơ, hoặc muốn kiểm soát từng tài
khoản): webapp → **Tài khoản** → cột *Đăng nhập Microsoft* → nút **Nối Microsoft**. Để
trống rồi lưu là gỡ liên kết, tài khoản quay lại chỉ đăng nhập được bằng mật khẩu.

### Đăng nhập Microsoft KHÔNG thay đổi phân quyền

Nó chỉ thay chỗ **xác thực danh tính**. Còn lại giữ nguyên:

| Thứ | Do đâu quyết định |
|---|---|
| Ai được vào hệ thống | Phải có tài khoản khớp email; không khớp thì bị từ chối |
| Vai trò | Trường `vai_tro` của tài khoản đó, nhân sự đặt |
| Bật/tắt một người | Nút *Vô hiệu hóa* ở trang Tài khoản — chặn cả hai đường đăng nhập |
| Xem được dữ liệu của ai | Theo vai trò, y như đăng nhập bằng mật khẩu |

Bốn vai trò: `admin` (toàn quyền, gồm quản lý tài khoản), `nhan_su` (quản trị chấm công),
`truong_phong` (duyệt đơn của phòng mình), `nhan_vien` (chỉ xem dữ liệu của chính mình).

## 6. Cho cả công ty đăng nhập, nhưng phải qua bước duyệt

Khai `MS_TEN_MIEN_CHO_PHEP` bằng tên miền email của công ty:

```bash
MS_TEN_MIEN_CHO_PHEP=congty.vn
```

Khi đó ai có email thuộc tên miền đó cũng **xác thực được**, và hệ thống tự tạo cho họ một
tài khoản ở trạng thái **chờ phân quyền**: đăng nhập xong thấy màn hình *"Tài khoản của bạn
chưa được quản trị viên phân quyền"* và **không vào được màn nào**. Máy chủ từ chối mọi API
nghiệp vụ với tài khoản này, kể cả đường chỉ đọc — màn hình kia chỉ để giải thích, không
phải lớp bảo vệ.

Người ngoài tên miền vẫn bị từ chối ngay, không tạo tài khoản.

### Admin phân quyền

Webapp → **Tài khoản**. Tài khoản chờ duyệt được đẩy lên đầu danh sách và có nhãn *chờ phân
quyền*. Bấm **Phân quyền**, chọn một trong bốn cấp:

| Cấp | Làm được gì |
|---|---|
| **Quản trị** | Toàn quyền, gồm quản lý tài khoản và phân quyền |
| **Nhân sự (HR)** | Quản trị chấm công: nhân viên, ca, thiết bị, bảng công, đơn từ |
| **Trưởng phòng** | Duyệt đơn của phòng mình, xem công nhân viên phòng mình |
| **Nhân viên** | Chỉ xem dữ liệu của chính mình |

Hệ thống ghi lại **ai cấp quyền và lúc nào**, hiện ngay dưới vai trò trong danh sách.

Hai vai trò *Trưởng phòng* và *Nhân viên* bắt buộc gắn với một hồ sơ nhân viên — chưa có
thì phải tạo ở trang **Nhân viên** (điền đúng email công ty) rồi mới cấp được.

Người vừa được cấp quyền không phải đăng xuất: trên màn hình chờ có nút **"Tôi đã được cấp
quyền — kiểm tra lại"**. Vai trò nằm trong token nên token đang cầm vẫn là `cho_duyet` cho
tới khi làm mới; nút đó làm đúng việc đó.

### Bỏ hẳn bước duyệt

`MS_TU_DONG_TAO=1` thì tài khoản tự tạo được cấp luôn vai trò `nhan_vien`. Nhanh, nhưng
danh sách người vào được hệ thống chấm công sẽ do danh bạ Microsoft quyết định chứ không do
nhân sự nữa — tài khoản khách và hộp thư dùng chung cũng vào được. Vẫn cần
`MS_TEN_MIEN_CHO_PHEP` để giới hạn tên miền.

Người không có hồ sơ nhân viên khớp email thì dù bật cờ này vẫn rơi về trạng thái chờ duyệt,
vì vai trò `nhan_vien` bắt buộc có hồ sơ.

## 7. Kiểm tra

```bash
curl -s https://teams.tranhoangvietnam.com/chamcong/api/xac-thuc/cau-hinh; echo
# Mong đợi: {"dang_nhap_microsoft":true}
```

Ra `false` nghĩa là còn thiếu một trong bốn biến `MS_*`. Rồi mở webapp — phải thấy nút
**Đăng nhập bằng Microsoft** phía trên ô tên đăng nhập.

## Sự cố thường gặp

| Thông báo | Nguyên nhân |
|---|---|
| `AADSTS50011: redirect URI does not match` | `MS_REDIRECT_URI` khác Redirect URI khai bên Entra — so từng ký tự |
| `AADSTS7000215: Invalid client secret` | Secret sai, hoặc đã hết hạn, hoặc lỡ chép cột *Secret ID* thay vì cột *Value* |
| "Tài khoản ... chưa được khai trong hệ thống" | Email Microsoft không khớp hồ sơ nhân viên nào — xem mục 5 |
| "Tài khoản không thuộc tổ chức đã cấu hình" | Đăng nhập bằng tài khoản Microsoft cá nhân, hoặc `MS_TENANT_ID` sai |
| "Phiên đăng nhập đã hết hạn" | Bấm đăng nhập rồi để quá 10 phút mới xác thực xong — thử lại |
| Không thấy nút Microsoft | Máy chủ báo tính năng đang tắt; kiểm `/api/xac-thuc/cau-hinh` như mục 7 |

## Những gì đã được kiểm

Xác minh `id_token` là chỗ một lỗi nhỏ biến thành "ai cũng đăng nhập được bằng email tùy
chọn", nên có 15 test tự động (`may_chu/test/microsoft.test.ts`), trong đó có các đường tấn
công thật:

- **Chữ ký giả** — kẻ tấn công tự ký token bằng khóa của mình → từ chối
- **`alg: none`** — token không chữ ký → từ chối
- **`alg: HS256`** — biến khóa công khai thành khóa ký (*algorithm confusion*) → từ chối
- **Sai `nonce`** — phát lại token của phiên khác → từ chối
- **Sai `aud` / `tid` / `iss`** — token của ứng dụng khác, tổ chức khác → từ chối
- **Token hết hạn** → từ chối
- **Microsoft xoay khóa** — `kid` mới xuất hiện thì nạp lại bộ khóa và chấp nhận

Ngoài ra luồng có PKCE (S256), `state` dùng **đúng một lần** rồi xóa khỏi CSDL trong cùng
câu lệnh, và tham số `quay_lai` chỉ nhận đường dẫn nội bộ để không thành *open redirect*.
