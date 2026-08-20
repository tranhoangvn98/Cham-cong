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
| **bản chốt bảng lương tháng** | `04.1` — cấp công ty, không có thư mục nhân viên |
| **bản chốt bảng chấm công tháng** | `05.1 Bảng chấm công tháng` — cấp công ty |
| `nguoi_phu_thuoc` | `04.2 Thuế TNCN` |
| `tai_lieu` mã `cv_ung_vien` | `06.1 Yêu cầu tuyển & CV ứng viên` |
| `tai_lieu` mã `danh_gia_thu_viec` | `06.2 Đánh giá phỏng vấn & thử việc` |
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

### Nhánh `05` và `06` — ghi vào thư mục con, không vào thư mục cha

Tên bốn thư mục con đã lấy từ SharePoint thật và khớp từng ký tự:

```
05 CHẤM CÔNG – NGHỈ PHÉP/05.1 Bảng chấm công tháng
05 CHẤM CÔNG – NGHỈ PHÉP/05.2 Đơn từ & Theo dõi phép
06 TUYỂN DỤNG & THỬ VIỆC/06.1 Yêu cầu tuyển & CV ứng viên
06 TUYỂN DỤNG & THỬ VIỆC/06.2 Đánh giá phỏng vấn & thử việc
```

Ứng dụng ghi vào **thư mục con**, không bao giờ ghi thẳng vào `05` hay `06`. Hai thư mục cha
đó đang có người dùng thật; thả một tệp vào giữa khu vực của họ thì lượt xóa lan theo cũng
không biết tệp đó là của ai. Có bài kiểm chặn ở cả tầng ánh xạ và tầng client, và kiểm rằng
client từ chối **trước khi** gọi Graph.

**`06.1` và `06.2` đã có nguồn tệp.** Di trú `021` thêm hai mục vào danh mục tài liệu:
`cv_ung_vien` → `06.1`, `danh_gia_thu_viec` → `06.2`. Trước đó hệ thống không có loại tệp nào
thuộc về hai thư mục đó, nên khai nhánh mà không thêm danh mục là khai một chỗ không bao giờ
nhận tệp.

Cả hai đặt `bat_buoc = false`, và **không được đổi thành `true` mà không nghĩ lại**: hệ thống
đang có 53 người nhập từ ERP, nên đặt bắt buộc là ngày hôm sau toàn bộ 53 hồ sơ hiện "thiếu tài
liệu" — không phải vì ai làm sai, mà vì ta vừa đổi thước đo.

**Hợp đồng thử việc vẫn ở `02.1`, không sang `06.2`.** `06.2` tên là *"Đánh giá phỏng vấn & thử
việc"* — là văn bản **đánh giá**, còn hợp đồng thử việc là một **hợp đồng**. Nó cũng nằm trong
luồng nhắc hạn hợp đồng (BLLĐ 2019 Điều 27 về thông báo kết quả thử việc), nên tách nó ra khỏi
nhánh hợp đồng là tách một văn bản khỏi đúng chỗ nó đang được quản lý. Đây là một quyết định
có thể đảo bằng một dòng trong `chon_nhanh` nếu người phụ trách muốn khác.

**Bằng cấp và chứng chỉ KHÔNG sang `06`.** Chúng là giấy tờ lúc ứng tuyển, nhưng là hồ sơ 201
lâu dài — nằm trong `01` cả đời làm việc.

**`05.1 Bảng chấm công tháng` nhận bản chốt tháng** — xem mục 5 dưới đây.

**`05.2 Đơn từ & Theo dõi phép` chưa có nguồn tệp.** `don_nghi_phep` và `don_giai_trinh`
**không có tệp đính kèm** trong lược đồ hiện tại, nên nó được khai trong
`NHANH_CHUA_CO_NGUON` kèm lý do. Xem [KE-HOACH-TRIEN-KHAI.md mục 3.2](KE-HOACH-TRIEN-KHAI.md).

Có một bài kiểm bắt buộc điều này phải trung thực: **mọi nhánh trong `NHANH` phải hoặc trả về
được từ `chon_nhanh`, hoặc nằm trong `NHANH_CHUA_CO_NGUON`** — và ngược lại, một nhánh đã có
tệp đi vào thì không được khai là chưa có nguồn. Thêm một nhánh rồi quên nối nguồn sẽ làm bộ
kiểm đỏ, thay vì nằm im trong bảng mãi mãi.

### Nhãn loại trong tên tệp

`NHAN_TAI_LIEU` cho từng mã danh mục một nhãn riêng: `CV`, `ĐÁNH GIÁ THỬ VIỆC`, `CCCD`, `SYLL`,
`QĐ TĂNG LƯƠNG`… Không có nhãn riêng thì dùng nhãn của nhóm. Lý do rất thực dụng: một thư mục
có ba tệp `HỒ SƠ - Nguyễn Văn A - ...` thì phải mở từng tệp ra mới biết cái nào là gì.

## 3. Bản chốt cấp công ty — sau khi được duyệt

Bảng chấm công và bảng lương **không phải hồ sơ của một nhân viên**, nên chúng là ngoại lệ duy
nhất của quy tắc ba cấp: tệp nằm **thẳng trong nhánh**, không có thư mục nhân viên.

```
04 TIỀN LƯƠNG – THUẾ TNCN/04.1 Thang bảng lương & Bảng lương/
  BẢNG LƯƠNG - THÁNG 08-2026 - 31-08-2026.xlsx
05 CHẤM CÔNG – NGHỈ PHÉP/05.1 Bảng chấm công tháng/
  BẢNG CHẤM CÔNG - THÁNG 08-2026 - 31-08-2026.xlsx
```

Ngoại lệ này **hẹp có chủ đích**: chỉ hai nhánh khai trong `NHANH_CAP_CONG_TY` nhận được tệp
hai cấp. Ở mọi nhánh khác, một tệp không có thư mục nhân viên là một tệp không thuộc về ai — có
bài kiểm chạy qua **toàn bộ** bảng `NHANH` và xác nhận đúng hai nhánh đó cho phép, còn lại từ
chối. Và hai nhánh đó **vẫn** nhận tệp ba cấp bình thường (`04.1` giữ cả quyết định lương của
từng người).

### Thời điểm sinh: lúc kỳ lương được duyệt, không sớm hơn

Một lần duyệt sinh ra **cả hai** bảng. Người duyệt bảng lương đang duyệt luôn bảng chấm công mà
bảng lương được tính *từ đó*; tách thành hai lần duyệt riêng nghĩa là có thể tồn tại một bảng
lương đã duyệt dựa trên một bảng công chưa duyệt — không ai giải thích được trạng thái đó cho
thanh tra lao động.

Kèm theo, lúc duyệt hệ thống **khóa cứng bảng công của tháng đó**, và `mo-chot-thang` cho tháng
đã có bảng lương duyệt bị **từ chối** (`409`). Mở lại nghĩa là có thể tồn tại một bảng lương đã
chốt — đã có người ký, đã có bản kết xuất trên SharePoint — dựa trên những con số giờ không còn
như thế. Muốn sửa thì phải hủy kỳ lương trước, và đó là việc phải có người chịu trách nhiệm.

### Bản gốc pháp lý không phải tệp XLSX

Bản gốc là dữ liệu trong `bang_cong_ngay` / `phieu_luong` cộng với hai cột `duyet_boi` và
`duyet_luc` trong bảng `ban_chot` — chúng trả lời được *"ai chốt con số này, lúc nào"*. Tệp chỉ
là bản kết xuất, sinh lại được từ cùng dữ liệu.

Đó là lý do tệp bản chốt **được phép ghi đè** (một kỳ bị trả lại rồi duyệt lại thì bản mới thay
bản cũ), khác hẳn kho tệp hồ sơ nơi bản scan CCCD và hợp đồng không bao giờ được ghi đè. Và
`ban_chot` có ràng buộc `unique (loai, ky)`: hai bản chốt cùng một tháng là hai con số cùng
"chính thức", và không ai biết tin bản nào.

### Trên đĩa: `_ban_chot/`

```
_ban_chot/bang_cong/2026-08_bang_cong_<hex>.xlsx
_ban_chot/bang_luong/2026-08_bang_luong_<hex>.xlsx
```

Bắt đầu bằng `_` là **cố ý**: đường dẫn hồ sơ nhân viên phải bắt đầu bằng chữ hoặc số, nên
`_ban_chot` không thể trùng với thư mục của bất kỳ nhân viên nào — kể cả một mã nhân viên tình
cờ đặt tên là `ban_chot`. Trong đường dẫn này không có một ký tự nào đến từ người dùng: loại lấy
từ một tập đóng, kỳ là `YYYY-MM`, hex do máy chủ sinh. An toàn theo cấu trúc, không phải an
toàn nhờ lọc.

### Tệp XLSX tự sinh, không dùng thư viện

`may_chu/src/tien_ich/ghi_xlsx.ts`. Bộ **đọc** XLSX đã tự viết rồi, nên bộ kiểm là một **vòng
kín**: sinh bằng `ghi_xlsx` rồi đọc lại bằng `trich_xlsx`. Nói rõ giới hạn: nó không chứng minh
Excel thật mở được, vì hai bộ cùng một người viết nên có thể sai giống nhau — nên có thêm bài
kiểm cấu trúc ZIP bằng byte.

Tệp **tái lập được** (không ghi thời điểm vào ZIP): cùng dữ liệu vào thì ra đúng cùng byte. Nhờ
thế một bản chốt không đổi không bị coi là bản mới mỗi lần sinh lại, và lịch sử phiên bản trên
SharePoint không đầy bản trùng nhau.

Lưu ý cho bộ san bằng: với bản chốt, điều kiện cập nhật gồm **cả `so_byte`**, khác nguồn hồ sơ
nhân viên. Lý do: một bản chốt duyệt lại có *cùng* đường dẫn (cùng kỳ) nhưng nội dung khác. Chỉ
so đường dẫn thì bản mới không bao giờ được đẩy lên, và trên SharePoint mãi mãi là bản duyệt lần
đầu.

## 4. Ba hàng rào

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

## 5. Bảng trạng thái, không phải hàng đợi

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

## 6. Cấu hình

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

### Ai chạy được, và đăng nhập bằng gì

Cấp **application permission của Microsoft Graph** cần vai trò **Global Administrator** (hoặc
Privileged Role Administrator). *Application Administrator* / *Cloud Application Administrator*
có thể **không đủ** cho riêng nhóm quyền này — nếu admin của anh chỉ có vai trò đó và lệnh trả
`Insufficient privileges`, đó là lý do, không phải lệnh sai.

Và phải đăng nhập bằng **tài khoản người thật**, không phải managed identity của Cloud Shell:

```bash
az login --allow-no-subscriptions       # đăng nhập bằng tài khoản admin
az account show --query user -o json    # phải ra "user", KHÔNG phải "servicePrincipal"
```

Managed identity của Cloud Shell không lấy được token cho các audience cần thiết — đó là nguồn
của cả hai lỗi dưới đây.

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

> **Rủi ro của cách vòng, nói thẳng:** trong khoảng vài phút giữa hai bước, app có toàn quyền
> đọc/ghi/xóa trên **mọi** site SharePoint của tenant — kể cả site tài chính, site ban giám đốc.
> Nên chạy liền một mạch, đừng để qua đêm, và bước gỡ ở dưới là **bắt buộc**. Nếu tenant có
> chính sách không cho phép cửa sổ đó, dùng PnP PowerShell
> (`Grant-PnPAzureADAppSitePermission`) — nhưng cách đó cần app *PnP Management Shell* được
> consent trong tenant, bản thân nó cũng là một app có quyền rộng, nên không hẳn ít rủi ro hơn.

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

## 7. Thứ tự bật

`SHAREPOINT_BAT_DAY=0` là mặc định, và đó là cố ý: cấu hình xong thì hệ thống vẫn **chỉ tính
đường dẫn và ghi vào bảng**, chưa chạm vào SharePoint.

0. **Dọn dữ liệu trước.** Thư viện HCNS đang có người dùng, nên mỗi hồ sơ rác đẩy lên là một thư
   mục phải dọn tay trong thư viện của họ. Hai việc:
   - Xóa nhân viên demo (`NVDEMO01`–`08`) và máy `THU001` nếu còn.
   - Gộp hồ sơ trùng — `npm run gop_trung` để liệt kê, xem
     [`GOP-HO-SO-TRUNG.md`](GOP-HO-SO-TRUNG.md). Một người có hai hồ sơ sẽ thành **hai thư mục
     nhân viên** trên SharePoint với tệp chia đôi giữa hai thư mục đó.
1. Khai `SHAREPOINT_*` (trừ `BAT_DAY`), `docker compose up -d`.
2. Vào **Cài đặt → Kho tệp hồ sơ → Đồng bộ SharePoint**, bấm **Tính lại đường dẫn**.
3. Đọc cột *Đường dẫn trên SharePoint*. Nhánh đúng chưa, thư mục nhân viên đúng chưa, tên tệp
   đọc được chưa.
4. Thấy đúng rồi thì đặt `SHAREPOINT_BAT_DAY=1` và `docker compose up -d`.
5. Bấm **Đồng bộ ngay**, hoặc chờ vòng quét hằng ngày (sau 01:00 giờ máy chấm công).

Vòng quét hằng ngày chạy **sau** việc sắp xếp kho tệp, và thứ tự đó là cố ý: việc sắp xếp đổi
tên thư mục **trên đĩa**, còn việc này tính đường dẫn **trên SharePoint** từ `ma_nv`/`ho_ten`.
Làm ngược lại thì đường dẫn vừa tính sẽ lệch ngay trong cùng một vòng.

## 8. "Chưa thấy tệp nào trên SharePoint" — soi ở đâu

Trạng thái **bình thường** của tính năng này là *không đẩy gì cả*: có **hai công tắc** và cả hai
tắt mặc định. Nhìn từ ngoài thì giống hỏng, nên chỗ đầu tiên phải xem là dòng `sharepoint` của
`/health` — kịch bản triển khai in nguyên thân `/health` sau mỗi lần cập nhật:

```bash
curl -s http://127.0.0.1:8080/health | python3 -m json.tool
```

| Dòng `sharepoint` | Nghĩa | Làm gì |
|---|---|---|
| `tat — chua khai SHAREPOINT_SITE_ID / …` | **Công tắc 1 đang tắt.** Chưa có credential nào trong `.env` | Khai `SHAREPOINT_*` rồi `docker compose up -d` |
| `chi dem — chua dat SHAREPOINT_BAT_DAY=1 …` | **Công tắc 2 đang tắt.** Đã kết nối được nhưng cố ý chưa đẩy | Xem bảng đường dẫn, đúng rồi thì đặt `SHAREPOINT_BAT_DAY=1` |
| `bat — N tep cho, 0 loi` | Đang chạy thật | Bấm **Đồng bộ ngay**, hoặc chờ vòng quét sau 01:00 |
| `bat — N tep cho, M loi` | Có dòng lỗi | Mở **Cài đặt → Kho tệp hồ sơ**, đọc cột *Lý do* |

Dòng này chỉ đọc trạng thái **cục bộ** — nó **không** gọi Graph. `/health` bị trình giám sát và
kịch bản triển khai gọi liên tục; một lượt gọi mạng mỗi lần là thêm độ trễ và thêm một đường
chạm trần giới hạn của Microsoft. Muốn biết credential có dùng được thật hay không thì mở
**Cài đặt → Kho tệp hồ sơ → Đồng bộ SharePoint** — trang đó gọi Graph một lần và in lỗi ra màn
hình.

`/health` **không** in giá trị của biến nào (nó không đòi đăng nhập). Có bài kiểm e2e đối chiếu
theo giá trị thật trong cấu hình, nên bài đó còn đúng cả khi máy thật đã khai đầy đủ.

### Kiểm nhanh trên VPS

```bash
cd /root/Cham-cong

# 1) Có dòng SHAREPOINT_ nào chưa? (chỉ in TÊN biến, không in giá trị)
grep -o '^SHAREPOINT_[A-Z_]*' .env || echo 'KHONG CO DONG SHAREPOINT_ NAO'

# 2) Máy chủ đang thấy gì
curl -s http://127.0.0.1:8080/health | python3 -m json.tool

# 3) Bảng trạng thái: mỗi tệp đang ở đâu
docker compose exec -T postgres psql -U chamcong -d chamcong -c \
  "select ket_qua, count(*), count(*) filter (where duong_dan_da_day is not null) as da_len
     from sharepoint_tep group by ket_qua order by ket_qua;"
```

Ở bước 3, `duong_dan_da_day is not null` là **bằng chứng duy nhất** rằng một tệp thật sự đã lên
SharePoint. Cột `ket_qua = 'xong'` mà `da_len = 0` nghĩa là dòng đó "xong" theo nghĩa *không có
việc gì phải làm* — ví dụ tệp đã bị gỡ ở cả hai bên — chứ không phải đã đẩy lên.

---

## 9. Giới hạn đã biết

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
