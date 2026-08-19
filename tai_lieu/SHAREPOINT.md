# Đồng bộ kho tệp hồ sơ sang SharePoint (thư viện HCNS)

Một chiều: **máy chủ là bản gốc, SharePoint là bản sao.** Gỡ tệp bên này thì bản bên đó bị
xóa theo (vào thùng rác của site, giữ 93 ngày).

Đích là thư viện HCNS **đang dùng thật**, có người đang xếp tay hồ sơ vào đó. Toàn bộ thiết
kế dưới đây xoay quanh một điều: ứng dụng không bao giờ chạm vào tệp của người khác.

---

## 1. Hai quy ước tên, cố ý khác nhau

| | Đường dẫn |
|---|---|
| Trên đĩa máy chủ | `HR-01_Hoang-Minh-Ngoc/hop_dong/2026-08-18_hop-dong_HDLD_a1b2c3d4.pdf` |
| Trên SharePoint | `01 HỒ SƠ NHÂN SỰ (201)/HR-01-HOANG MINH NGOC/HĐLĐ SỐ 07-2026 - Hoàng Minh Ngọc - 18-08-2026.pdf` |

Tên trên đĩa phải đi qua `tar`, `scp`, `rsync`, WinSCP và header `Content-Disposition` nên bỏ
dấu và bỏ dấu cách. SharePoint xử lý Unicode tốt, và quy ước của HCNS viết **cho người đọc**.

Nguồn sự thật của quy ước SharePoint **không phải tài liệu này**. Nó là tệp

> `DANH MỤC HỆ THỐNG FILE HCNS - SHAREPOINT (BỔ SUNG THEO BC 11) - 15-07-2026_2.xlsx`

nằm ngay trong thư viện HCNS, sheet *Cây thư mục* và sheet *Quy ước & phân loại*. Mỗi hàng
trong bảng `NHANH` của `may_chu/src/sharepoint/anh_xa.ts` tra về được một dòng trong tệp đó.

Hai chi tiết của đặc tả dễ bị "sửa cho gọn" và không được sửa:

- **Ngày dùng gạch nối**, không dùng dấu chấm. Đặc tả ghi rõ lý do: *"để iOS không hiểu nhầm
  đuôi file"*. `... - 15.07.2026.pdf` bị iOS đọc thành đuôi `.2026.pdf`.
- **Tên nhánh khớp từng ký tự** với thư mục thật, kể cả dấu gạch ngang dài `–` (U+2013) trong
  `Quan hệ lao động – HĐLĐ`. Đổi nó thành dấu trừ thường là Graph **tạo một thư mục mới** nằm
  ngay cạnh thư mục thật, và hồ sơ bay vào chỗ không ai mở.

`ho_so_tep.ten_luu` vẫn là khóa đọc. Không chỗ nào trong hệ thống đọc tệp bằng đường dẫn
SharePoint.

## 2. Nhóm nào đi vào nhánh nào

| Nhóm trong hệ thống | Nhánh HCNS |
|---|---|
| `thong_tin`, `tai_lieu` | `01 HỒ SƠ NHÂN SỰ (201)` |
| `tai_lieu` mã `KHAM_SUC_KHOE` | `09 AN TOÀN – SỨC KHỎE (ATVSLĐ)` |
| `hop_dong`, `bien_ban` loại `phu_luc` | `02.1 [A] Quan hệ lao động – HĐLĐ` |
| `bien_ban` (thỏa thuận, cam kết) | `02.3 [C] Thỏa thuận bổ trợ (ký kèm)` |
| `bien_ban` loại `ky_luat`, `khen_thuong` | `08 KHEN THƯỞNG – KỶ LUẬT` |
| `bien_ban` loại `ban_giao`, `thiet_bi` | `12 HÀNH CHÍNH – VĂN THƯ` |
| `bhxh` (tăng/giảm/điều chỉnh) | `03.1 Tăng, giảm & đối chiếu` |
| `bhxh` (ốm đau, thai sản, dưỡng sức, TNLĐ) | `03.2 Hồ sơ hưởng chế độ` |
| `bhxh` loại `chot_so` | `03.3 Xử lý nợ – Chốt sổ & tờ rời` |
| `luong` | `04.1 Thang bảng lương & Bảng lương` |
| `nguoi_phu_thuoc` | `04.2 Thuế TNCN` |
| `cong_viec`, `bao_cao` | `07 ĐÀO TẠO & ĐÁNH GIÁ` |
| **`khieu_nai`** | **không đồng bộ** |

Giấy khám sức khỏe đi sang `09` chứ không vào `01` vì nhánh `09` khai đúng việc đó, còn `01`
liệt kê "SYLL, CCCD, văn bằng". Theo đặc tả, không theo tiện tay. Và theo NĐ 13/2023 dữ liệu
sức khỏe là dữ liệu cá nhân **nhạy cảm**, không phải "nội bộ".

`khieu_nai` không đồng bộ **không phải vì quên**. Khiếu nại nhân sự được quyết định xây dựng ở
giai đoạn sau — xem [KE-HOACH-TRIEN-KHAI.md mục 3.1](KE-HOACH-TRIEN-KHAI.md). Đặc tả HCNS cũng
chưa có nhánh nào cho nó, và lý do quan trọng hơn: khiếu nại có thể là **về chính người có
quyền đọc thư mục đích**. Đẩy nó vào một thư mục đoán bừa là loại sai tệ nhất, nên hàm ánh xạ
trả `null` và trên trang quản trị nó hiện ở mục *Không đồng bộ* kèm lý do.

### Hai nhánh có người phụ trách riêng

`05 CHẤM CÔNG – NGHỈ PHÉP` và `06 TUYỂN DỤNG & THỬ VIỆC` đang được **triển khai song song bằng
tay**, có người phụ trách. Ứng dụng **không ghi vào và không xóa trong** hai nhánh đó.

Đây là một **quyết định**, không phải một thiếu sót — nên nó được ghi thành bảng có tên
`NHANH_NGUOI_KHAC` trong `anh_xa.ts`. Hàm `duong_dan_an_toan_de_ghi` là danh sách **cho phép**
nên nó đã từ chối hai nhánh này mà không cần bảng đó; giá trị của bảng nằm ở bài kiểm: nó bắt
buộc việc thêm một trong hai nhánh vào `NHANH` phải **kèm** việc gỡ nó khỏi `NHANH_NGUOI_KHAC`.
Tức là một hành động có ý, có đối chiếu với người phụ trách, chứ không phải một dòng thêm vào
lúc dọn dẹp.

## 3. Ba hàng rào

Nằm **bên trong** `may_chu/src/sharepoint/khach.ts`, không ở tầng gọi: một chỗ gọi quên kiểm
là một chỗ có thể xóa tệp của người khác.

1. **Ghi tệp** — `duong_dan_an_toan_de_ghi`: đúng ba cấp `<nhánh>/<[Mã NV]-[Họ tên]>/<tên
   tệp>`, nhánh phải có trong bảng `NHANH`, không `..`, không quá 400 ký tự.
2. **Tạo thư mục** — `thu_muc_an_toan_de_tao`: chỉ được là chính một nhánh, hoặc một cấp nhân
   viên trong nhánh đó. Quy tắc **khác** quy tắc ghi tệp, và phải khác — dùng lại hàm kia thì
   phải nới lỏng chính cái hàng rào.
3. **Xóa** — ngoài hàng rào đường dẫn, còn kiểm đối tượng là **một tệp**. Hàng rào đường dẫn
   không bắt được trường hợp đường dẫn ba cấp trỏ vào một thư mục, và `DELETE` một thư mục
   trên SharePoint kéo theo **mọi** tệp bên trong.

Thêm vào đó, tạo thư mục dùng `conflictBehavior: 'fail'` và coi `409` là thành công. Dùng
`'replace'` trên một thư mục là **xóa sạch nội dung bên trong** — và các nhánh của HCNS đang
có dữ liệu thật.

## 4. Bảng trạng thái, không phải hàng đợi

`sharepoint_tep` giữ hai cột: tệp **nên** ở đường dẫn nào (`duong_dan_muon`) và tệp **đang** ở
đường dẫn nào (`duong_dan_da_day`). Mỗi vòng quét chỉ làm một việc: cho hai cột bằng nhau.

Có **bốn** chỗ đổi được `ma_nv` hay `ho_ten` (nhân sự sửa tay, nhập CSV, đồng bộ ERP, API
`/api/v1`). Mã đổi thì tên thư mục đổi, tức là đường dẫn mong muốn đổi. Với hàng đợi, một chỗ
quên phát sự kiện là một tệp nằm sai chỗ **vĩnh viễn** và không ai biết. Với hai cột thì vòng
quét hằng ngày tự tìm ra, và lệch tối đa một ngày.

Kéo theo: chạy lại bao nhiêu lần cũng cho cùng một kết quả.

**Bảng này cố ý không có khóa ngoại sang `ho_so_tep`.** Nếu có `on delete cascade` thì lúc gỡ
một tệp, dòng này bị xóa theo — cùng với thông tin duy nhất cho biết còn một bản sao trên
SharePoint cần xóa. Bản đó sẽ sống mãi ở đó và không ai biết. Đổi lại, bảng có thể có dòng mà
`tep_id` không còn trong `ho_so_tep`: đó chính là các dòng đang chờ lệnh xóa.

Trong một lượt đổi chỗ, thứ tự là **đẩy bản mới trước, xóa bản cũ sau**. Ngược lại thì giữa
hai bước trên SharePoint không còn bản nào, và nếu máy chủ chết đúng lúc đó thì hồ sơ biến
mất. Đẩy trước thì trường hợp xấu nhất là có **hai** bản — thấy được và sửa được.

## 5. Cấu hình

Dùng **một app đăng ký riêng**, không dùng lại app đăng nhập Microsoft. App đăng nhập chỉ cần
`openid profile email`; gắn thêm quyền ghi tệp vào nó là mở rộng bề mặt của chính lớp đăng
nhập.

Quyền cần là **`Sites.Selected`** — nó chỉ có hiệu lực trên những site được cấp tên đích danh,
hẹp hơn `Sites.ReadWrite.All` rất nhiều.

```bash
# 1) Đăng ký app
az ad app create --display-name "cham-cong-sharepoint-sync" \
  --sign-in-audience AzureADMyOrg --query appId -o tsv
```

Đặt `APP` bằng giá trị vừa in, rồi:

```bash
GRAPH=00000003-0000-0000-c000-000000000000
SEL=$(az ad sp show --id $GRAPH --query "appRoles[?value=='Sites.Selected'].id | [0]" -o tsv)
az ad sp create --id $APP
az ad app permission add --id $APP --api $GRAPH --api-permissions $SEL=Role
```

**`az ad app permission admin-consent` có thể không chạy trong Azure Cloud Shell** — nó gọi
qua endpoint Azure AD Graph cũ mà managed identity của Cloud Shell không lấy được token cho
audience đó (`Audience 74658136-... is not a supported MSI token audience`). Admin consent cho
một application permission thực chất chỉ là tạo một `appRoleAssignment`, và việc đó làm được
qua Microsoft Graph:

```bash
APPSP=$(az ad sp show --id $APP --query id -o tsv)
GRAPHSP=$(az ad sp show --id $GRAPH --query id -o tsv)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$APPSP/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body "{\"principalId\":\"$APPSP\",\"resourceId\":\"$GRAPHSP\",\"appRoleId\":\"$SEL\"}"
```

### Cấp quyền trên site

`Sites.Selected` chưa cho quyền gì tới khi có một bản ghi permission trên site, và bản ghi đó
chỉ tạo được bằng token **app-only có `Sites.FullControl.All`**. Token uỷ quyền của Azure CLI
không có scope đó, nên `az rest` trả `403 accessDenied`.

Cách vòng: cấp **tạm** FullControl cho chính app này, dùng token của nó để tự cấp quyền site,
rồi **gỡ FullControl ngay**.

```bash
FULL=$(az ad sp show --id $GRAPH --query "appRoles[?value=='Sites.FullControl.All'].id | [0]" -o tsv)
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$APPSP/appRoleAssignments" \
  --headers "Content-Type=application/json" \
  --body "{\"principalId\":\"$APPSP\",\"resourceId\":\"$GRAPHSP\",\"appRoleId\":\"$FULL\"}"

read -rs -p "Client secret: " SECRET; echo
TENANT=$(az account show --query tenantId -o tsv)
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT/oauth2/v2.0/token" \
  -d "client_id=$APP" -d "client_secret=$SECRET" \
  -d "scope=https://graph.microsoft.com/.default" -d "grant_type=client_credentials" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -s -X POST "https://graph.microsoft.com/v1.0/sites/$SITE/permissions" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"roles\":[\"write\"],\"grantedToIdentities\":[{\"application\":{\"id\":\"$APP\",\"displayName\":\"cham-cong-sharepoint-sync\"}}]}"
```

App role assignment mất 1–2 phút để lan trong tenant. Nếu `POST /permissions` vẫn `403` thì
chờ một phút rồi chạy lại — chưa phải là sai.

**Gỡ FullControl — bước bắt buộc, không phải tuỳ chọn:**

```bash
ASSIGN=$(az rest --method get \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$APPSP/appRoleAssignments" \
  --query "value[?appRoleId=='$FULL'].id | [0]" -o tsv)
az rest --method delete \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$APPSP/appRoleAssignments/$ASSIGN"
az ad app permission delete --id $APP --api $GRAPH --api-permissions $FULL

# Phải chỉ còn Sites.Selected:
az rest --method get \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$APPSP/appRoleAssignments" \
  --query "value[].appRoleId" -o tsv
```

Nếu còn `$FULL` thì app vẫn có toàn quyền trên **mọi** site của tenant — đúng thứ mà
`Sites.Selected` sinh ra để tránh.

### Biến môi trường

```
SHAREPOINT_SITE_ID=thvn23.sharepoint.com,<siteId>,<webId>
SHAREPOINT_DRIVE_ID=            # biết sẵn thì khỏi một lượt gọi Graph mỗi lần khởi động
SHAREPOINT_THU_VIEN=HCNS
SHAREPOINT_TENANT_ID=           # để trống = dùng MS_TENANT_ID
SHAREPOINT_CLIENT_ID=
SHAREPOINT_CLIENT_SECRET=
SHAREPOINT_BAT_DAY=0
```

Lấy `SHAREPOINT_SITE_ID`:

```bash
az rest --method get --url \
  'https://graph.microsoft.com/v1.0/sites/thvn23.sharepoint.com:/sites/hcns?$select=id,displayName'
```

`SHAREPOINT_GOC_GRAPH` và `SHAREPOINT_GOC_TOKEN` **để trống**. Chúng chỉ tồn tại để bộ kiểm
dựng một máy chủ Graph giả tại chỗ. Đặt giá trị là nộp client secret cho máy chủ đó — nên khi
`NODE_ENV=production`, máy chủ từ chối mọi giá trị không phải `graph.microsoft.com` /
`login.microsoftonline.com`, kiểm theo **tên máy** chứ không theo tiền tố (vì
`graph.microsoft.com.ke-tan-cong.vn` bắt đầu đúng bằng tiền tố thật).

## 6. Thứ tự bật

`SHAREPOINT_BAT_DAY=0` là mặc định, và đó là cố ý: cấu hình xong thì hệ thống vẫn **chỉ tính
đường dẫn và ghi vào bảng**, chưa chạm vào SharePoint.

1. Khai `SHAREPOINT_*` (trừ `BAT_DAY`), `docker compose up -d`.
2. Vào **Hệ thống → Kho tệp hồ sơ → Đồng bộ SharePoint**, bấm **Tính lại đường dẫn**.
3. Đọc cột *Đường dẫn trên SharePoint*. Nhánh đúng chưa, thư mục nhân viên đúng chưa, tên tệp
   đọc được chưa.
4. Thấy đúng rồi thì đặt `SHAREPOINT_BAT_DAY=1` và `docker compose up -d`.
5. Bấm **Đồng bộ ngay**, hoặc chờ vòng quét hằng ngày (sau 01:00 giờ máy chấm công).

Vòng quét hằng ngày chạy **sau** việc sắp xếp kho tệp, và thứ tự đó là cố ý: việc sắp xếp đổi
tên thư mục **trên đĩa**, còn việc này tính đường dẫn **trên SharePoint** từ `ma_nv`/`ho_ten`.
Làm ngược lại thì đường dẫn vừa tính sẽ lệch ngay trong cùng một vòng.

## 7. Giới hạn đã biết

- **Chưa chạy thật lần nào.** Toàn bộ 29 bài kiểm chạy trên một máy chủ Graph giả tại chỗ:
  phiên làm việc viết mã này không kết nối được SharePoint thật. Bộ kiểm chứng minh client gọi
  đúng những gì tài liệu Graph nói — **không** chứng minh SharePoint thật sẽ nhận. Lần chạy
  thật đầu tiên là bước 5 ở trên, và nó nên được làm với `SHAREPOINT_BAT_DAY=1` trên một vài
  tệp trước khi mở cho cả kho.
- Tệp lớn hơn 4 MB đi qua `createUploadSession`, chia khúc 3,2 MB. Mỗi khúc (trừ khúc cuối)
  phải là bội số của 320 KiB — Graph từ chối kích thước khác bằng một thông báo không hề nhắc
  đến ràng buộc này.
- Một tệp lỗi được thử tối đa 5 lần rồi bỏ lại, để nó không làm cả vòng quét dừng ở đó mỗi
  ngày. Dòng bỏ lại hiện trên trang quản trị ở ô *Lỗi* kèm số *đã hết lượt thử*, và có nút cho
  thử lại sau khi đã sửa nguyên nhân.
- Đồng bộ **một chiều**. Sửa hay xóa tệp trực tiếp trên SharePoint không phản ánh về máy chủ,
  và vòng quét kế tiếp sẽ đẩy lại bản gốc.
