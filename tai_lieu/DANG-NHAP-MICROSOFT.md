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
một màn hình hỏi đồng ý. Cần vai trò Global Administrator:

```bash
az ad app permission admin-consent --id "$APP_ID"
```

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

Mặc định ứng dụng đã có `User.Read` — đủ dùng. Hệ thống chỉ cần `openid profile email`, tất
cả đều là quyền cơ bản, **không cần admin consent**.

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

## 5. Nối tài khoản với nhân viên

Hệ thống đối chiếu **email** của tài khoản Microsoft với dữ liệu đang có, theo thứ tự:

1. Trường `email_microsoft` của tài khoản đăng nhập, nếu đã nối trước đó
2. Email trong hồ sơ **Nhân viên** (webapp → Nhân viên → cột Email)

Khớp ở bước 2 thì hệ thống tự ghi nhớ để lần sau khỏi dò lại.

Nên làm: nhân sự điền đúng email công ty vào hồ sơ từng nhân viên, và tạo tài khoản đăng
nhập cho họ. Người chưa có tài khoản trong hệ thống sẽ bị từ chối kèm thông báo rõ ràng —
đây là chủ ý, không phải lỗi.

## 6. `MS_TU_DONG_TAO` — cân nhắc kỹ

Bật lên (`=1`) thì **bất kỳ ai trong tổ chức Microsoft của bạn** đăng nhập lần đầu cũng tự
có tài khoản, vai trò `nhan_vien`, chỉ xem được dữ liệu của chính mình.

Tiện khi công ty đông và mọi người đều cần xem bảng công của mình. Nhưng nghĩa là danh sách
người truy cập hệ thống chấm công do danh bạ Microsoft quyết định, không do nhân sự quyết
định nữa. Người mới vào công ty, tài khoản khách, hộp thư dùng chung — tất cả đều vào được
nếu chúng đăng nhập được vào Microsoft 365.

Để `0` thì nhân sự kiểm soát hoàn toàn: ai được khai mới vào được.

Dù bật hay tắt, tài khoản tự tạo **không** có hồ sơ nhân viên nếu email không khớp ai — tức
không có PIN máy, không tính được công. Nó chỉ đăng nhập được vào chỗ trống.

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
