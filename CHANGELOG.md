# Nhật ký thay đổi

Theo [SemVer](https://semver.org/lang/vi/).

## [1.14.1] — 2026-08-10

**Tài liệu kết nối máy ZKTeco: bổ sung trường hợp máy chủ đặt trên VPS.**

Bản trước chỉ mô tả kiểu triển khai máy chủ nằm cùng LAN với máy chấm công. Thực tế đang
chạy là máy chủ trên VPS, máy chấm công ở văn phòng gọi ra Internet — làm theo tài liệu cũ
thì máy không kết nối được.

### Sửa

- `tai_lieu/KET-NOI-MAY-ZKTECO.md` mục 1: bảng cấu hình tách thành **hai cột** (LAN / VPS).
  Khác biệt quan trọng: qua tên miền thì `Enable Domain Name` phải **bật** (bản cũ ghi tắt,
  làm theo là máy không phân giải DNS và im lặng không gọi được), và cổng là **80** chứ
  không phải 8080 — 8080 chỉ tồn tại bên trong VPS, bên ngoài là reverse proxy.
- Mục 2: nói rõ số sê ri phải lấy ở **Menu › Thông tin thiết bị › Số sê ri** trên máy, không
  lấy số dán sau lưng máy hay số trên hộp. Hai số này khác nhau ở nhiều lô máy, mà ADMS chỉ
  gửi lên số sê ri firmware — khai nhầm thì máy nhận 401 vĩnh viễn.
- Mục 6: bản cũ chỉ có một lời khuyên "đừng mở cổng ra Internet", vô dụng với triển khai VPS
  vì ở đó `/iclock/*` **bắt buộc** phải mở. Nay ghi thẳng rủi ro (log đi qua Internet không
  mã hóa; ai đoán đúng số sê ri là đẩy được bản ghi giả) và chốt chặn thật là
  `ICLOCK_IP_CHO_PHEP`, kèm cảnh báo nó chỉ có tác dụng khi `PROXY_TIN_CAY` đặt hẹp.

## [1.14.0] — 2026-08-10

**Xem nhanh tệp đính kèm và bảng truy xuất kho tệp.**

### Thêm mới

- **Popup xem nhanh** ngay trong hồ sơ: bấm tên tệp là mở xem, không phải tải về rồi mở bằng
  phần mềm ngoài. Ba đường cho ba loại rủi ro khác nhau:
  - **Ảnh** (JPG/PNG): tải về blob rồi vẽ bằng `<img>`.
  - **PDF**: nhúng trong khung, dùng bộ đọc dựng sẵn của trình duyệt.
  - **Word / Excel**: trình duyệt không vẽ được, nên **máy chủ bóc chữ ra** và giao diện chỉ
    vẽ chữ — DOCX thành các đoạn văn, XLSX thành bảng. Không tệp nào được nhúng vào trang.
- **Kho tệp hồ sơ** (menu Hệ thống, nhân sự trở lên): bảng truy xuất toàn bộ tệp đính kèm kèm
  **đường dẫn đã lưu trên đĩa** (`ho_so_tep.ten_luu`), thư mục gốc trên máy chủ, dung lượng,
  ai tải lên và lúc nào. Dùng để đối chiếu hai bên khi sao lưu hoặc phục hồi — cơ sở dữ liệu
  chỉ giữ đường dẫn, bản gốc nằm trên đĩa, và lệch nhau thì phải tra ra được chỗ lệch.
- Bộ bóc nội dung Office **tự đọc ZIP bằng `node:zlib`**, không kéo thư viện Office: chỉ cần
  chữ để liếc qua, còn một thư viện đầy đủ kéo theo hàng chục MB vào ảnh Docker. Có chặn zip
  bomb (trần giải nén 40 MB, tối đa 500 mục) và cắt bớt ở 400 đoạn / 200 dòng.

### Một đánh đổi về bảo mật, nói rõ ra

Khung xem PDF **không đặt `sandbox`**. Đã đo trên Chromium: cả `sandbox=""` lẫn
`sandbox="allow-scripts"` đều làm `contentDocument` thành `null` và khung chỉ hiện icon tài
liệu hỏng, dù `navigator.pdfViewerEnabled` là `true` — bộ đọc PDF dựng sẵn bị sandbox chặn
hoàn toàn. Giữ sandbox nghĩa là bỏ hẳn tính năng xem PDF.

Thứ thay thế nó không phải là hy vọng:

1. Máy chủ nhận dạng tệp bằng **magic byte** lúc tải lên, nên thứ nằm trong khung chắc chắn
   là PDF. Rủi ro kinh điển — HTML đội lốt `.pdf` rồi chạy script trong gốc của webapp — bị
   chặn ngay từ cửa vào.
2. PDF được vẽ bởi **tiến trình xem PDF riêng** của trình duyệt; JavaScript trong PDF không
   với được DOM, cookie hay `localStorage` của trang bọc ngoài.
3. Đường tải xuống vẫn `attachment`, và `/xem` vẫn gắn CSP `sandbox` cho trường hợp có ai mở
   thẳng địa chỉ.

DOCX/XLSX vẫn **không** được trả inline dù đã bóc được nội dung: bóc chữ thì an toàn, trả
nguyên tệp inline thì trình duyệt có thể đoán nhầm kiểu.

### Sửa

- Bộ bóc DOCX **giải mã thực thể XML hai lần**, nên `&amp;amp;lt;` ra `&lt;` thay vì
  `&amp;lt;`. Một test viết riêng cho đúng bẫy này đã bắt được ngay lần chạy đầu.
- Bốn đường tệp (tải về, xem, bóc nội dung, xóa) nay dùng **chung một hàm kiểm quyền**. Trước
  đó đường tải về tự kiểm riêng; thêm đường mới mà quên kiểm là mở cửa sau cho cả kho tệp.

### Đã kiểm chứng

Dựng tệp thật cho cả bốn định dạng — PNG, PDF hợp lệ có bảng xref, DOCX và XLSX ZIP thật —
rồi lái Chromium mở từng cái: ảnh vẽ được, khung PDF nạp được bộ đọc, DOCX ra đúng hai đoạn
văn, XLSX ra đúng bảng với ô trống giữ nguyên vị trí cột. Kho tệp hiện đúng đường dẫn dạng
`YYYY-MM/<uuid>.<đuôi>`.

Lần chạy đầu PDF hiện icon hỏng; đã tách hai nguyên nhân bằng thí nghiệm riêng (PDF thiếu
xref, hay sandbox chặn) thay vì đoán — hóa ra là cả hai, và chỉ sau khi loại trừ cái thứ nhất
mới kết luận được về sandbox.
Tổng: 142 test đơn vị + 5 proxy + 115 e2e + 12 design token, tất cả xanh.

## [1.13.1] — 2026-08-10

### Sửa

- **Hộp thoại phân quyền vỡ bố cục.** Quy tắc chung `input { width: 100% }` — vốn dành cho ô
  nhập văn bản — áp cả vào **radio và checkbox**, nên nút tròn chiếm trọn một hàng và đẩy chữ
  ra ngoài khung: ô cao ngoẵng, rỗng ruột, chữ bị ép xuống hai ký tự mỗi dòng và hộp thoại
  tràn ngang. Sửa ở gốc (`input[type="radio"], input[type="checkbox"] { width: auto }`) thay
  vì vá riêng hộp thoại này — có **11 chỗ** dùng nút chọn và tất cả đều đang dính.
- **Cấp quyền trả "Lỗi hệ thống".** Vai trò `nhan_vien` / `truong_phong` bắt buộc gắn với một
  hồ sơ nhân viên (phạm vi dữ liệu của họ tính từ đó). Câu UPDATE đi thẳng xuống CSDL, ràng
  buộc CHECK nổ ra lỗi `23514` không ai bắt, và người dùng nhận thông báo lỗi hệ thống cho
  một tình huống hoàn toàn đoán trước được. Nay kiểm trước khi ghi và trả 400 kèm hướng dẫn,
  có nêu đúng email cần khai.
- **Hướng dẫn trên màn hình vốn sai.** Nó bảo "tạo hồ sơ ở trang Nhân viên rồi quay lại",
  nhưng tài khoản Microsoft **đã tồn tại** thì không bao giờ được nối vào hồ sơ tạo sau —
  luồng đăng nhập tìm thấy tài khoản theo `email_microsoft` là trả về luôn. Làm đúng hướng
  dẫn vẫn tắc. Nay nối được ở **cả hai đường**:
  - Lúc cấp quyền: tự đối chiếu email của tài khoản với email nhân viên; cũng nhận
    `nhan_vien_id` chỉ định thẳng.
  - Lúc đăng nhập: tài khoản chưa gắn hồ sơ sẽ được nối lại nếu tìm thấy nhân viên trùng
    email — rất hay gặp vì người ta đăng nhập lần đầu trước khi nhân sự kịp khai hồ sơ.
- **Thông báo trùng khóa nói sai lý do.** Mọi lỗi `23505` trên bảng `nguoi_dung` đều trả
  "Email Microsoft này đã gán cho tài khoản khác", kể cả khi thật ra **nhân viên đó đã có
  tài khoản** — sửa mãi không ra. Nay nhận dạng theo tên ràng buộc.

## [1.13.0] — 2026-08-10

**Hồ sơ nhân sự cho đủ checklist HCNS–BHXH.** Bổ sung theo đặc tả của phòng HCNS: thông tin
cá nhân, checklist tài liệu bắt buộc, người phụ thuộc, và hồ sơ BHXH — kèm hai lớp bảo vệ dữ
liệu cá nhân theo Nghị định 13/2023/NĐ-CP.

### Thêm mới

- **Tab Thông tin chung** (Nhóm A + C + E): CCCD (số, ngày cấp, nơi cấp), ngày sinh, giới
  tính, dân tộc, quốc tịch, tình trạng hôn nhân, địa chỉ thường trú / hiện tại, **người liên
  hệ khẩn cấp**, mã số thuế, ngân hàng và số tài khoản, **số BHXH / thẻ BHYT / nơi KCB ban
  đầu**, và đợt khám sức khỏe gần nhất.
- **Tab Tài liệu — checklist hồ sơ** (Nhóm A): mỗi tài liệu một dòng có **ô kéo-thả riêng**,
  mục bắt buộc đánh dấu `*`, thanh tiến độ "x/y tài liệu bắt buộc". Ba mức trạng thái đúng
  theo checklist gốc (*đã có dữ liệu → đã số hóa → đã lên phần mềm*), kèm **người phụ trách**
  và **hạn hoàn thành**.
  - Thả tệp vào một dòng là **tải lên và gắn vào đúng mục đó trong một thao tác**. Tách hai
    bước thì người dùng phải nhớ "tải xong rồi gắn vào mục nào", và cái nhớ đó chính là chỗ
    hồ sơ bị gắn nhầm mục.
  - Danh mục nằm trong bảng `danh_muc_tai_lieu`, **không hard-code** — HCNS tự thêm bớt được
    khi quy định đổi. Đã nạp sẵn 14 mục theo checklist.
- **Người phụ thuộc** (Nhóm C): quan hệ, ngày sinh, MST, khoảng thời gian giảm trừ, đã đăng
  ký hay chưa.
- **Hồ sơ BHXH – BHYT** (Nhóm E): báo tăng / báo giảm / điều chỉnh / chốt sổ / cấp thẻ, và
  các chế độ ốm đau – thai sản – dưỡng sức – tai nạn lao động. Lưu dạng **bản ghi theo thời
  gian**, không ghi đè: có tranh chấp với cơ quan BHXH thì phải chứng minh được từng mốc.
- **Nhóm B**: chức danh, người quản lý trực tiếp, ngày chính thức (hết thử việc).

### Bảo vệ dữ liệu cá nhân — Nghị định 13/2023/NĐ-CP

- **Che ở máy chủ, không phải ở giao diện.** Che ở giao diện là che giả: dữ liệu đầy đủ vẫn
  đi qua đường truyền và vẫn hiện trong tab Network của trình duyệt.
  - Số hiệu (CCCD, MST, số BHXH, số tài khoản): giữ vài ký tự cuối, còn lại thay bằng dấu chấm.
  - Địa chỉ và kết luận sức khỏe: **ẩn hẳn**. Che một nửa địa chỉ thì vẫn đoán ra được, còn
    kết luận sức khỏe không có "một phần" nào vô hại — đây là dữ liệu cá nhân *nhạy cảm*.
  - Chuỗi quá ngắn để che cho tử tế thì che hết, kể cả độ dài.
- **Ghi nhật ký** mỗi lần ai đó đọc bản đầy đủ **của người khác**. Đọc hồ sơ của chính mình,
  hoặc đọc bản đã che, thì không ghi — ghi cả thì nhật ký đầy rác và thứ cần truy vết chìm mất.
- **Trưởng phòng đọc được bản đã che** của cấp dưới: họ cần người liên hệ khẩn cấp khi có sự
  cố, nhưng không cần số CCCD hay số tài khoản. Còn tài liệu, người phụ thuộc và BHXH thì
  không đọc được.

### Sửa

- Lớp che dữ liệu ban đầu là **code chết**: mọi vai trò đọc được `thong_tin` đều nằm trong
  nhóm được xem bản đầy đủ, nên nhánh che không bao giờ chạy. Phát hiện khi lái trình duyệt
  và đối chiếu lại bảng phân quyền. Đã mở cho trưởng phòng đọc bản đã che — vừa đúng nhu cầu
  thật, vừa làm lớp che trở thành mã sống có test.
- Một test cũ đếm cứng "đúng 7 nhóm hồ sơ"; nay đối chiếu thẳng với danh sách nhóm trong mã
  nguồn nên thêm nhóm mới không phải sửa test theo.

### Ràng buộc ở tầng CSDL

- Một số CCCD / mã số thuế / số BHXH chỉ thuộc về **một người**. Trùng nhau gần như chắc chắn
  là nhập nhầm, mà nhầm ở đây thì bảo hiểm và thuế đều sai theo.
- `ho_so_ca_nhan` tách khỏi `nhan_vien` **vì phân quyền chứ không phải vì chuẩn hóa**: để
  chung thì mọi truy vấn nhân viên (danh sách, bảng công, log quẹt) đều kéo theo dữ liệu cá
  nhân và sớm muộn lộ ra một chỗ nào đó.

### Còn để lại đợt sau

Chấm điểm, KPI, Thu nhập (phiếu lương) và báo cáo thống kê Nhóm G — cần chốt công thức tính
với HCNS trước khi dựng, làm mò thì ra một cái vòng tròn phần trăm không ai tin.

### Đã kiểm chứng

Lái Chromium bằng hai vai trò: nhân sự thấy `001199987654` và toàn bộ 11 tab; **trưởng phòng
cùng phòng ban** thấy `••••••••7654`, số tài khoản và kết luận sức khỏe hiện "(đã ẩn)", nhưng
người liên hệ khẩn cấp vẫn đọc được — đúng thứ họ cần khi có sự cố. Checklist hiển thị đủ 14
mục kèm 14 ô kéo-thả, tiến độ 1/7 (đã trừ tài liệu chỉ phát sinh khi nghỉ việc).
Tổng: 132 test đơn vị + 5 proxy + 104 e2e + 12 design token, tất cả xanh.

## [1.12.3] — 2026-08-10

### Sửa

- `cap_nhat_vps.sh` đọc `TEN_MIEN` bằng `grep` nên nếu `.env` có khóa đó **khai lặp** (rất
  dễ xảy ra khi thêm tay nhiều lần) thì biến ôm cả hai dòng kèm ký tự xuống dòng, và mọi URL
  dựng từ nó đều hỏng — ba phép kiểm tra sau cập nhật đều trả `loi` mà không rõ vì sao. Nay
  lấy dòng **cuối**, đúng như cách Docker Compose xử lý khóa trùng.

### Tài liệu

- `.env.example`: cảnh báo **không bật `COMPOSE_PROFILES=ten_mien` khi máy chủ đã có sẵn
  reverse proxy riêng**. Caddy trong compose cũng đòi cổng 80/443 mà proxy của máy chủ đang
  giữ; Docker không cướp được cổng đang bị chiếm nên `cong_vao` chỉ đơn giản là không khởi
  động được ("port is already allocated") — dịch vụ kia vẫn sống, nhưng lần triển khai thất
  bại giữa chừng. Kèm chỉ dẫn cách đúng: để proxy của máy chủ dẫn vào `CONG_MAY_CHU` /
  `CONG_WEB`.
- Nói rõ vẫn **nên điền `TEN_MIEN` dù không bật profile**: một mình nó không khởi động gì,
  chỉ để `trien_khai/cap_nhat_vps.sh` biết đường mà kiểm tra sau khi cập nhật. Bản triển
  khai thật không có dòng này nên lần chạy đầu tiên đã bỏ qua cả ba phép kiểm tra qua tên
  miền, gồm cả phép so sánh trạng thái chatbot trước/sau.

## [1.12.1] — 2026-08-08

### Thêm mới

- **`trien_khai/cap_nhat_vps.sh`** — một lệnh duy nhất để cập nhật VPS: sao lưu → kéo mã →
  dựng lại ảnh → chờ máy chủ lên → kiểm tra. Viết thành script thay vì để dán từng lệnh, vì
  hai lần trước đã có sự cố do dán nhầm (một lần dán nguyên chuỗi giữ chỗ
  `<mật khẩu admin>`, một lần dán `<ip văn phòng>` vào `ICLOCK_IP_CHO_PHEP` làm máy chủ
  không khởi động được). Script không có chỗ để dán nhầm.
  - Đo mã HTTP của **chatbot Teams trước và sau** khi cập nhật rồi báo động nếu con số đổi —
    hai dịch vụ dùng chung tên miền nên đây là rủi ro thật, và phải biết ngay chứ không đợi
    người dùng phát hiện.
  - Sao lưu **cả volume `ho_so`**, không chỉ CSDL: hợp đồng scan nằm trên đĩa, dump CSDL
    không cứu được.
  - In sẵn mã bản cũ để lùi lại.
- **`tai_lieu/TRIEN-KHAI-TU-POWERSHELL.md`** — hướng dẫn cập nhật từ máy Windows, bắt đầu
  bằng ba cái bẫy hay mất thời gian nhất: `curl` trong PowerShell 5.1 là bí danh của
  `Invoke-WebRequest` chứ không phải curl thật, `&&` không chạy trên 5.1, và nháy kép nuốt
  mất `$` khi truyền lệnh bash qua `ssh`.

## [1.12.0] — 2026-08-08

**Hồ sơ từng nhân sự** — mở một người ra là thấy đủ: hợp đồng, biên bản, lương, công việc,
báo cáo, khiếu nại, thiết bị được cấp. Vào từ trang Nhân viên (bấm tên người, hoặc nút
"Hồ sơ"), địa chỉ `/nhan-vien/<id>`.

### Thêm mới

- **Hợp đồng lao động** — số HĐ, loại, chức danh, nơi làm việc, ngày ký, khoảng hiệu lực,
  lương ghi trên hợp đồng, trạng thái.
- **Biên bản / thỏa thuận** — phụ lục, cam kết, kỷ luật, khen thưởng, biên bản họp, bàn giao.
  Phụ lục gắn được vào một hợp đồng cụ thể; biên bản rời thì để trống.
- **Lương** — lịch sử các mức lương theo ngày hiệu lực, kèm lý do và số quyết định. Đây là
  mức lương *theo hợp đồng / quyết định*, không phải bảng lương thực trả hằng tháng (phần đó
  vẫn do ERP tính, xem cột `nhan_vien.ma_erp`).
- **Công việc** — giao việc, hạn, ưu tiên, trạng thái, kết quả. Chuyển sang "hoàn thành" thì
  hệ thống tự đóng mốc thời gian.
- **Báo cáo** — theo ngày / tuần / tháng / quý / năm / đột xuất, có ô phản hồi của quản lý.
- **Khiếu nại** — nhân viên tự gửi, phân loại và mức độ, có vòng đời xử lý và phản hồi.
- **Thiết bị cấp phát** — laptop, điện thoại, SIM, thẻ từ… kèm **số sê-ri, địa chỉ IP và
  MAC**, ngày cấp, ngày thu hồi, tình trạng.
- **Tệp đính kèm** cho cả bảy nhóm: PDF, JPG, PNG, DOCX, XLSX tối đa 15 MB.

### Phân quyền — phần quan trọng nhất của thay đổi này

Hồ sơ nhân sự chứa thứ nhạy cảm nhất hệ thống, nên quy tắc được gom vào **một bảng duy nhất**
(`bao_mat/quyen_ho_so.ts`) có test riêng cho từng ô, thay vì rải rác trong hai chục route.
Các đường API cũng được sinh từ một bảng đặc tả chung — viết tay bảy lần thì sớm muộn có một
lần quên gọi kiểm quyền, và cái quên đó im lặng: không lỗi, không test đỏ, chỉ là lương của
người khác hiện ra trên màn hình ai đó.

- **Trưởng phòng không đọc được khiếu nại**, kể cả của cấp dưới mình. Khiếu nại rất thường
  nhắm vào chính người quản lý trực tiếp; cho họ đọc được thì không ai dám gửi, và kênh khiếu
  nại thành một cái hộp rỗng mà nhìn vào tưởng mọi việc đều ổn.
- **Trưởng phòng không đọc được lương, hợp đồng, biên bản.** Họ cần biết cấp dưới *làm gì*
  (công việc, báo cáo, thiết bị), không cần biết cấp dưới *được trả bao nhiêu*.
- **Nhân viên xem được toàn bộ hồ sơ của chính mình** nhưng không tự sửa hợp đồng, lương hay
  danh sách thiết bị — đó là hồ sơ do công ty lập. Ngược lại họ **phải** tự gửi được khiếu nại
  và báo cáo, nếu không hai mục đó không còn ý nghĩa gì.
- Người gửi không tự kết luận khiếu nại của mình là "đã giải quyết", không tự viết phản hồi
  của công ty, và **không xóa được** — xóa được thì một khiếu nại biến mất không để lại vết.
- Tổng quan hồ sơ **không đếm** nhóm mà người gọi không được xem: "nhân viên này có 3 khiếu
  nại" tự nó đã là một thông tin.

### Ràng buộc đặt ở tầng CSDL

Dữ liệu này sống lâu hơn mã nguồn và đường nhập liệu không chỉ có một, nên các ràng buộc nằm
ở CSDL chứ không chỉ ở ứng dụng:

- Hợp đồng **không xác định thời hạn** không được có ngày hết hạn (BLLĐ 2019 Điều 20) — điền
  vào là mâu thuẫn pháp lý, không phải chuyện để ứng dụng tự nhớ.
- Một ngày hiệu lực chỉ được một mức lương; hai dòng cùng ngày thì không ai biết dòng nào
  đang áp dụng.
- Hai thiết bị **đang dùng** không được trùng IP tĩnh (trùng IP là lỗi thật trong mạng, không
  phải chuyện ghi chép); thu hồi máy cũ rồi thì IP dùng lại được. IP lưu kiểu `inet` nên
  Postgres tự chặn địa chỉ sai định dạng.

### Bảo mật tệp đính kèm

- Loại tệp nhận dạng bằng **magic byte**, không tin `content-type` lẫn đuôi tên: một tệp
  `.exe` đổi tên thành `.pdf` vẫn là `.exe`.
- Tải về **luôn** ở dạng `attachment`, kèm `nosniff` và CSP sandbox. Webapp và tệp dùng chung
  một gốc, nên một PDF mở inline chạy được JavaScript trong ngữ cảnh của chính webapp — tức
  XSS với đầy đủ quyền của người đang đăng nhập.
- Quyền của tệp đi theo quyền của nhóm chứa nó, nên không tải vòng qua đường tệp được.
- Thêm volume Docker `ho_so`: tệp nằm trên đĩa, CSDL chỉ giữ siêu dữ liệu, mất volume là mất
  bản gốc hợp đồng.

### Sửa

- Biên bản trước đó **bắt buộc** phải gắn vào một hợp đồng, do đọc trường tùy chọn bằng hàm
  bắt buộc. Form trên web không gửi trường đó nên mọi biên bản đều hỏng. Lái Chromium mới lộ
  ra — API đọc riêng thì vẫn "đúng".
- `test/quyen_ho_so.test.ts` lại rơi vào đúng cái bẫy của `csv.test.ts` lần trước: viết xong
  nhưng không khai trong `npm test` nên không chạy lần nào. Lần này thêm hẳn
  `test/moi_test_deu_chay.test.ts` tự quét thư mục và bắt lỗi nếu còn tệp nào chưa được khai —
  đã thử gỡ một tệp ra để chắc là nó thật sự đỏ.

### Đã kiểm chứng

Ngoài test tự động: dựng dữ liệu thật cho một nhân viên đủ bảy nhóm rồi lái Chromium hai lần
— một lần bằng tài khoản nhân sự (thấy đủ 7 tab), một lần bằng **trưởng phòng cùng phòng ban**
(chỉ thấy 3 tab: Công việc, Báo cáo, Thiết bị; ô "Lương hiện tại" ghi *không có quyền xem*).
Ràng buộc CSDL cũng được thử trực tiếp bằng SQL, gồm cả các trường hợp hợp lệ phải đi qua được
để chắc ràng buộc không quá tay.
Tổng: 118 test đơn vị + 5 proxy + 91 e2e + 12 design token, tất cả xanh.

## [1.11.1] — 2026-08-08

### Tài liệu

- Nói rõ quy tắc **nhiều văn phòng** ở đúng chỗ người ta sẽ khai sai: ô nhập PIN trong hồ sơ
  nhân viên, hộp thoại nhập hàng loạt, và mục mới "Nhiều văn phòng, nhiều máy" trong
  `KET-NOI-MAY-ZKTECO.md`.

  Dữ liệu giữa các máy vốn đã liên thông — đã dựng ba máy khác serial cho cùng một PIN quẹt
  trong một ngày và xác nhận cả ba đều ra đúng một người, bảng công gộp thành một ngày công
  liền mạch (vào 08:02 ở máy 1, ra 17:41 ở máy 3 → `co_mat`, 579 phút, 1 công).

  Nhưng liên thông đó đứng trên một giả định chưa hề được viết ra ở đâu: **PIN của một người
  phải giống nhau trên mọi máy**. PIN là danh tính, serial máy không tham gia nhận diện — nếu
  VP2 khai anh A là PIN 1 trong khi VP1 đã có anh B là PIN 1, công của anh A sẽ chạy sang anh
  B mà không có gì báo. `pin_may unique` chỉ chặn gán trùng trong phần mềm, không chặn được
  người khai máy bấm nhầm. Kèm khuyến nghị chia dải PIN theo văn phòng.

## [1.11.0] — 2026-08-08

**Nhập hàng loạt từ file** — khai từng nhân viên bằng tay thì được vài chục người, không
được vài trăm; và lịch sử chấm công cũ đang nằm trong file USB / ERP chứ không nằm trong máy.

### Thêm mới

- **Nhập nhân viên từ CSV** (trang Nhân viên → *Nhập từ file*). Đối chiếu theo mã nhân viên:
  có rồi thì cập nhật, chưa có thì tạo — **không bao giờ xóa ai**, người nghỉ vẫn phải xử lý
  bằng nút "Cho nghỉ việc" để giữ bảng công cũ. Ô để trống nghĩa là *giữ nguyên* giá trị cũ,
  không phải xóa: nhân sự hay xuất một phần cột ra sửa rồi nhập lại.
  - Chặn trước khi ghi: mã lặp trong chính tệp, PIN lặp trong tệp, PIN đang thuộc người khác,
    ngày không đọc được, phòng ban / ca làm chưa có.
  - Tự tạo phòng ban chưa có là **tùy chọn, mặc định tắt** — một lỗi chính tả sẽ để lại một
    phòng ban rác mà không ai để ý. Ca làm thì luôn phải khai tay vì còn giờ vào / ra / nghỉ.
- **Nhập lịch sử chấm công từ file** (trang Chấm công → *Nhập lịch sử từ file*), cho dữ liệu
  cũ xuất qua USB hoặc từ ERP đang chạy. Đi qua **đúng đường tiếp nhận của máy thật**: cùng bộ
  chống trùng, cùng cách map PIN, cùng bước tính lại bảng công — nên nhập file và máy đẩy
  trực tiếp không thể ra hai kết quả khác nhau. Nhập lại cùng một file không nhân đôi công.
  - Nhận cả ATTLOG thô của máy lẫn CSV/Excel có dòng tiêu đề, kể cả khi ngày và giờ nằm ở
    hai cột riêng.
- **Luôn đi hai bước**: đọc file → *xem trước* (máy chủ kiểm hết nhưng không ghi gì, báo từng
  dòng sai vì sao) → mới bấm *Nhập thật*. Nhập mù vào dữ liệu lương là đường nhanh nhất đến
  một bảng công sai mà không ai biết sai từ đâu.
  - Xem trước lịch sử chấm công **báo sẵn những PIN chưa ai nhận** — biết trước thì khai PIN
    rồi nhập một lần là xong, thay vì nhập xong mới phải quay lại "Gán lại".
  - Đổi tùy chọn thì bản xem trước cũ bị bỏ, bắt kiểm lại — nếu không sẽ bấm "Nhập thật" dựa
    trên một bản xem trước tính bằng bộ tùy chọn khác.
- **Tải tệp mẫu** ngay trong hộp thoại, có sẵn BOM UTF-8 để Excel trên Windows mở không vỡ dấu.

### Chi tiết dễ vấp đã xử lý

- Excel bản tiếng Việt xuất CSV bằng dấu **chấm phẩy**, không phải dấu phẩy — bộ đọc tự nhận
  ra cả `,` `;` và TAB.
- Tên cột đối chiếu sau khi bỏ dấu tiếng Việt và bỏ hoa/thường: `Mã NV`, `ma_nv`, `MÃ NV `
  ra cùng một cột. Cột không tìm thấy thì báo rõ, **không đoán bừa**.
- Ngày ưu tiên đọc `dd/mm/yyyy` (thông lệ Việt Nam) trước `mm/dd/yyyy`.

### Sửa

- `test/csv.test.ts` viết ra từ trước nhưng **chưa được khai trong `npm test`** nên chưa hề
  chạy lần nào. Đã đưa vào; 9 test đó giờ chạy thật.

### Đã kiểm chứng

Lái Chromium qua cả hai hộp thoại: chọn file → xem trước hiện đúng số dòng, đổi tùy chọn thì
xem trước biến mất, cảnh báo PIN chưa gán hiện đúng, không lỗi JS. Việc lái trình duyệt này
bắt được một lỗi mà TypeScript không thấy: `dung_hanh_dong().chay` chỉ trả về `true/false`
chứ không trả thân phản hồi, nên bản xem trước **không bao giờ hiện** — ép kiểu đã che mất.
Tổng: 103 test đơn vị + 5 proxy + 70 e2e + 12 design token, tất cả xanh.

## [1.10.0] — 2026-08-08

Trang **Chấm công** trước đây chỉ là chỗ xem: lọc được mỗi khoảng ngày, tối đa 300 dòng, và
không xuất được gì. Nay thành chỗ quản lý được log thật.

### Thêm mới

- **Bốn bộ lọc** ngoài khoảng ngày: nhân viên, máy chấm công, nguồn (máy / điện thoại /
  nhập tay), và trạng thái duyệt. Máy chủ từ chối giá trị lạ thay vì im lặng bỏ qua bộ lọc —
  bỏ qua âm thầm thì người dùng tưởng đã lọc mà thực ra đang xem tất cả.
- **Xem thêm** theo từng 200 dòng, thay cho trần cứng 300 dòng.
- **Xuất CSV** toàn bộ khoảng đã chọn (trần 50.000 dòng), kèm cả bộ lọc đang áp. Có BOM
  UTF-8 để Excel đọc đúng tiếng Việt và chặn CSV injection như bản xuất bảng công.
  - Mốc thời gian xuất theo **giờ nơi đặt máy**, không phải giờ máy chủ. Máy chủ chạy UTC
    vẫn ra đúng con số nhìn thấy trên máy chấm công.
  - Chỉ nhân sự trở lên xuất được.

### Đã kiểm chứng

Test e2e cho từng bộ lọc (gồm trường hợp lọc ra rỗng và giá trị lạ bị từ chối), và cho bản
CSV: có BOM, mốc giờ đúng giờ máy, nhân viên thường bị chặn. Lái Chromium qua trang: bốn ô
lọc hiện đủ, lọc theo nguồn cắt đúng số dòng, khối cảnh báo PIN chưa gán vẫn nguyên, không
lỗi JS. Tổng: 94 test đơn vị + 5 proxy + 61 e2e + 12 design token, tất cả xanh.

## [1.9.0] — 2026-08-08

**Cả công ty đăng nhập được, nhưng phải qua bước duyệt** — cùng tên miền thì xác thực được,
còn vào được hệ thống hay không do admin quyết định.

### Thêm mới

- **Trạng thái `cho_duyet`.** Khai `MS_TEN_MIEN_CHO_PHEP=congty.vn` thì ai có email thuộc
  tên miền đó cũng đăng nhập được, và hệ thống tự tạo tài khoản ở trạng thái chờ. Tài khoản
  đó **không vào được màn nào**: máy chủ từ chối mọi API nghiệp vụ, kể cả đường chỉ đọc.
  Người ngoài tên miền vẫn bị từ chối ngay, không tạo tài khoản.
  - Chặn ở **một chỗ duy nhất** (`can_dang_nhap`) nên không route nghiệp vụ nào phải tự nhớ
    kiểm tra. Chỉ `/toi` và đổi mật khẩu cho tài khoản chờ đi qua, đủ để webapp hiện màn
    hình giải thích.
  - Phản hồi 403 kèm cờ `cho_duyet: true` để webapp phân biệt với "không đủ quyền".
- **Trang phân quyền cho admin.** Tài khoản chờ được đẩy lên đầu danh sách **Tài khoản**,
  có nhãn *chờ phân quyền* và nút **Phân quyền** chọn một trong bốn cấp: Quản trị → Nhân sự
  (HR) → Trưởng phòng → Nhân viên, mỗi cấp kèm mô tả làm được gì. Hệ thống ghi lại **ai cấp
  và lúc nào**, hiện ngay dưới vai trò.
- **Nút "Tôi đã được cấp quyền — kiểm tra lại"** trên màn hình chờ. Vai trò nằm trong token
  nên token đang cầm vẫn là `cho_duyet` cho tới khi làm mới; nút này làm mới thay vì bắt
  người dùng đăng xuất rồi đăng nhập lại.

### Ràng buộc giữ nguyên

`cho_duyet` **không phải một cấp quyền** mà là trạng thái chưa có quyền, nên API tạo tài
khoản từ chối nếu ai đó cố đặt vai trò này bằng tay. Hai vai trò *Trưởng phòng* và *Nhân
viên* vẫn bắt buộc gắn hồ sơ nhân viên — người tự tạo mà không khớp hồ sơ nào thì ở lại
trạng thái chờ, kể cả khi bật `MS_TU_DONG_TAO`.

### Đã kiểm chứng

Test e2e đi hết vòng đời: tài khoản chờ đăng nhập được, `/toi` qua được, **5 đường nghiệp vụ
khác nhau đều trả 403** kèm cờ lý do; admin cấp quyền; token cũ **vẫn bị chặn** (vai trò nằm
trong token); làm mới token thì vào được; và bản ghi *ai duyệt, lúc nào* đúng. Kèm test chặn
tạo tài khoản `cho_duyet` bằng tay. Tổng: 94 test đơn vị + 5 proxy + 59 e2e + 12 design
token, tất cả xanh.

## [1.8.1] — 2026-08-08

### Sửa

- **Không nối được tài khoản Microsoft từ giao diện.** Cột `email_microsoft` có trong CSDL
  nhưng không lộ ra API lẫn webapp, nên cách duy nhất để nối một tài khoản cụ thể là chạy
  `UPDATE` thẳng vào CSDL. Nay trang **Tài khoản** có cột *Đăng nhập Microsoft* và nút
  **Nối Microsoft**; để trống rồi lưu là gỡ liên kết. Email trùng với tài khoản khác bị từ
  chối kèm thông báo rõ thay vì lỗi CSDL.
- Tài liệu bổ sung mục nói rõ đăng nhập Microsoft **không** thay đổi phân quyền: nó chỉ
  thay chỗ xác thực danh tính, còn vai trò và quyền vào hệ thống vẫn do tài khoản trong hệ
  thống quyết định.

## [1.8.0] — 2026-08-07

**Đăng nhập bằng tài khoản Microsoft (Entra ID)** — nhân viên dùng chính tài khoản
Microsoft 365 của công ty, không phải nhớ thêm mật khẩu.

### Thêm mới

- Luồng OpenID Connect **Authorization Code + PKCE**, tự viết thay vì kéo thư viện OIDC:
  chỉ cần một luồng, và thêm phụ thuộc lớn vào lớp xác thực là thêm bề mặt tấn công.
- Nút **Đăng nhập bằng Microsoft** trên trang đăng nhập. Máy chủ quyết định có hiện hay
  không qua `GET /api/xac-thuc/cau-hinh` — chưa khai cấu hình Entra thì ẩn hẳn, thay vì
  hiện một nút bấm vào chỉ báo lỗi.
- Đối chiếu người dùng theo **email**: trường đã nối sẵn ở tài khoản, rồi tới email trong
  hồ sơ nhân viên (khớp lần đầu thì ghi nhớ để lần sau khỏi dò lại). Không khớp ai thì từ
  chối kèm thông báo rõ, trừ khi bật `MS_TU_DONG_TAO`.
- **`tai_lieu/DANG-NHAP-MICROSOFT.md`** — đăng ký ứng dụng bên Entra, tạo client secret,
  bảng sự cố thường gặp, và phần cân nhắc trước khi bật tự động tạo tài khoản.

### Bảo mật

Xác minh `id_token` là chỗ một lỗi nhỏ biến thành "ai cũng đăng nhập được bằng email tùy
chọn", nên kiểm **chữ ký trước**, mọi trường khác chỉ được tin sau đó. 15 test tự động phủ
các đường tấn công thật: chữ ký giả, `alg: none`, `alg: HS256` (*algorithm confusion*), sai
`nonce`, sai `aud`/`tid`/`iss`, token hết hạn, và tình huống Microsoft xoay khóa.

Ngoài ra: PKCE S256, `state` dùng đúng một lần rồi xóa khỏi CSDL trong cùng câu lệnh, token
trả về qua **phần neo** của URL nên không lọt vào log truy cập của reverse proxy, và tham số
`quay_lai` chỉ nhận đường dẫn nội bộ để không thành *open redirect*.

`MS_TU_DONG_TAO` mặc định **tắt**: bật lên nghĩa là danh sách người truy cập hệ thống chấm
công do danh bạ Microsoft quyết định chứ không do nhân sự quyết định nữa.

### Đã kiểm chứng

15 test đơn vị cho phần xác minh token + 3 test e2e cho các đầu mối API. Lái Chromium qua
trang đăng nhập: nút hiện đúng khi máy chủ báo bật, ẩn khi tắt, bấm vào đi đúng
`/api/xac-thuc/microsoft/bat-dau`, ô đăng nhập bằng mật khẩu vẫn còn nguyên. Tổng: 94 test
đơn vị + 5 test proxy + 56 e2e + 12 test design token, tất cả xanh.

## [1.7.0] — 2026-08-07

Đặt webapp dưới một **tiền tố đường dẫn** để dùng chung tên miền với dịch vụ khác.

### Thêm mới

- **`VITE_BASE`** — build webapp cho một tiền tố, ví dụ `VITE_BASE=/chamcong/` để chạy ở
  `https://teams.congty.vn/chamcong/`. Một biến điều khiển cả ba chỗ từng phải sửa tay:
  đường dẫn tệp tĩnh trong `index.html`, đường dẫn font/icon trong CSS, và tiền tố mà
  router cùng lớp gọi API tự thêm vào. `VITE_API_URL` để trống là đủ — lớp gọi API lấy
  tiền tố từ `VITE_BASE` nên tự gọi đúng `/chamcong/api/...`.
  - Router đọc `import.meta.env.BASE_URL`, cắt tiền tố khi đọc URL và thêm lại khi đẩy
    `history.pushState`, nên danh sách tuyến bên trong vẫn dùng đường dẫn sạch
    (`/bang-cong`) và không cần biết nó được đặt ở đâu.
  - `href` của `<LienKet>` là đường dẫn thật, để Ctrl-click mở tab mới và "sao chép địa chỉ
    liên kết" vẫn ra đúng URL.
- **`tai_lieu/TEN-MIEN.md` mục 2b** — cấu hình Caddy dùng chung tên miền, kèm lý do phải bọc
  trong `route`: ngoài `route`, Caddy tự sắp xếp `handle` theo độ dài đường dẫn và khi trộn
  với `handle_path` thì thứ tự khó đoán.

### Giới hạn đã biết

`/iclock/*` **không** đặt được dưới tiền tố: firmware ZKTeco chỉ cho khai host và port rồi
gọi cứng `/iclock/cdata`. Đường này luôn phải nằm ở gốc tên miền.

### Đã kiểm chứng

Chạy Caddy thật với upstream giả, đối chiếu 9 đường dẫn: `/iclock/*` giữ nguyên đường dẫn
sang máy chủ chấm công; `/chamcong/api/*` và `/chamcong/health` được cắt tiền tố; webapp và
tệp tĩnh về đúng nginx; `/chamcong` không dấu gạch cuối trả 301; còn `/api/messages`, `/dev/*`
và `/` vẫn về dịch vụ cũ **không đổi hành vi**. Đường HTTP `/iclock` trả 200 thẳng, không
chuyển hướng — nếu bị 301 là máy chấm công mất dữ liệu.

Lái Chromium qua bản build `VITE_BASE=/chamcong/`: trang đăng nhập hiện đúng, font tải được
qua tiền tố, deep link `/chamcong/bang-cong` giữ nguyên tiền tố, `pushState` không nhảy ra
gốc tên miền, lớp gọi API trỏ tới `/chamcong/api/...`, và không có request nào hỏng.

## [1.6.0] — 2026-08-07

Chạy trên tên miền + HTTPS, và **vá một lỗ hổng vượt danh sách trắng IP** phát hiện khi rà
lại phần đặt sau reverse proxy.

### Sửa — bảo mật

- **`X-Forwarded-For` được tin vô điều kiện khi chạy production**, nên `ICLOCK_IP_CHO_PHEP`
  có thể bị vượt hoàn toàn: chỉ cần gửi kèm `X-Forwarded-For: <IP văn phòng>` là qua được
  danh sách trắng và đẩy được lần quẹt giả vào bảng công. Header này do phía gửi tự đặt,
  ai cũng ghi giá trị tuỳ ý được. Ảnh hưởng mọi bản triển khai có cổng 8080 mở ra Internet
  — đúng cấu hình VPS đang chạy.
  - Nay có `PROXY_TIN_CAY`: chỉ tin header chuyển tiếp khi request đến từ dải mạng đã khai.
    Mặc định trống = không tin ai, lấy địa chỉ thật của kết nối.
  - Máy chủ ghi cảnh báo lúc khởi động nếu `PROXY_TIN_CAY` chứa `0.0.0.0/0`.
  - 5 test hồi quy trong `test/proxy_tin_cay.test.ts`, gồm chuỗi nhiều chặng
    `"IP giả, IP thật"`. Đã xác nhận hai trong số đó **thất bại trên mã cũ**.

### Thêm mới

- **Cổng vào Caddy có tên miền và HTTPS tự động** (`cong_vao/Caddyfile`, dịch vụ
  `cong_vao`). Webapp và API dùng **một origin duy nhất** nên không còn CORS, và
  `VITE_API_URL` để trống được — webapp gọi đường dẫn tương đối, đổi tên miền không phải
  build lại. `/iclock/*` giữ HTTP thường và **không** bị chuyển hướng sang HTTPS: firmware
  ZKTeco không làm được TLS và gặp 301/302 thì nhiều bản bỏ luôn lô dữ liệu.
- Bật bằng `COMPOSE_PROFILES=ten_mien` trong `.env`, nên mọi lệnh `docker compose` quen
  thuộc vẫn chạy như cũ.
- Cổng mở ra ngoài máy nay cấu hình được (`CONG_MAY_CHU`, `CONG_WEB`) để khoá 8080/8081 lại
  trong máy khi đã có cổng vào.
- **`tai_lieu/TEN-MIEN.md`** — trỏ DNS, xin chứng chỉ, chuyển máy chấm công sang cổng 80,
  đổi địa chỉ cho app điện thoại, và bảng sự cố thường gặp.

## [1.5.0] — 2026-08-07

Chế độ làm việc **T2–T6 cả ngày + sáng thứ Bảy** — mô hình ca cũ không diễn đạt được, và cứ
mỗi thứ Bảy là cả công ty bị ghi sai.

### Thêm mới

- **Khung giờ riêng theo thứ cho ca làm** (`ca_lam_theo_thu`). Một ca vốn chỉ có **một** khung
  giờ dùng chung cho mọi ngày làm. Hợp đồng lao động phổ biến ở Việt Nam lại quy định sáng thứ
  Bảy **vẫn là giờ chuẩn** (08:00–12:00), nên khai T7 vào ca `08:00–17:30` thì mỗi thứ Bảy toàn
  bộ nhân viên bị chấm *về sớm 325 phút* — sai cả về kỷ luật lẫn số công. Nay mỗi thứ khai
  được giờ vào/ra, giờ nghỉ và ngưỡng đủ công riêng; thứ không khai thì dùng khung giờ gốc,
  tức hành vi y hệt trước đây. Ca qua đêm bị chặn ở cả API lẫn CSDL vì giờ ra thuộc ngày hôm
  sau nên "thứ" không xác định được.
  - Số công thứ Bảy điều khiển bằng ô *đủ công*: để `480` thì 240 phút làm ra 0,5 công (thông
    lệ 5,5 công/tuần); để `240` thì tính tròn 1 công.
  - Sửa trực tiếp trên webapp: **Ca làm việc → Sửa → Khung giờ riêng theo thứ**.
- **`trien_khai/nap_du_lieu_demo.mjs`** (`npm run nap_du_lieu_demo`) — nạp ca theo hợp đồng,
  **23 dòng ngày lễ cho 2026–2027** (11 ngày/năm theo Điều 112 BLLĐ 2019, ngày âm lịch đã quy đổi:
  Tết Bính Ngọ mùng 1 = 17/02/2026, Tết Đinh Mùi mùng 1 = 06/02/2027, Giỗ Tổ 26/04/2026 và
  16/04/2027, kèm ngày nghỉ bù 27/04/2026 do Giỗ Tổ rơi vào Chủ nhật), và 8 nhân viên demo
  (`NVDEMO01–08`, PIN `9001–9008`) để xem giao diện có số liệu. Chạy lại nhiều lần được; xoá
  nhân viên demo bằng `--xoa-nhan-vien-demo`.

### Đã kiểm chứng

6 test đơn vị cho quy tắc mới + 4 test end-to-end có CSDL thật: khai ca qua API, máy đẩy ATTLOG
sáng thứ Bảy → bảng công ra `co_mat`, 240 phút làm, **0 phút về sớm**, 0,5 công. Kèm test chặn
khai khung giờ cho thứ không đi làm và chặn khai trên ca qua đêm. Tổng: 79 test đơn vị + 52
test e2e + 12 test design token, tất cả xanh.

## [1.4.1] — 2026-08-07

### Sửa

- **`docker compose up` hỏng ở bước cuối của ảnh `may_chu`**: `COPY --from=build
  /app/may_chu/node_modules` báo `"/app/may_chu/node_modules": not found`. npm workspaces kéo
  (hoist) toàn bộ phụ thuộc lên `node_modules` ở thư mục gốc; thư mục con chỉ tồn tại khi có
  xung đột phiên bản buộc phải lồng vào trong — bộ phụ thuộc của `may_chu` không có xung đột
  nào nên thư mục đó **chưa bao giờ được tạo**. Tạo sẵn thư mục rỗng ở tầng build để lệnh COPY
  luôn chạy được, đồng thời vẫn giữ được phụ thuộc lồng nếu sau này phát sinh. Lỗi lọt lưới vì
  đường Docker không chạy thử được lúc phát triển (proxy chặn tải image gốc): kiểm tĩnh chỉ đối
  chiếu đường dẫn `COPY` với **mã nguồn trong repo**, không đối chiếu với thứ tầng build thật
  sự sinh ra.

## [1.4.0] — 2026-08-06

Bộ công cụ triển khai để hứng log từ máy chấm công thật, và **hai lỗi chặn ngay bước đầu** phát
hiện được khi chạy thử đúng đường triển khai.

### Sửa

- **`.env.example` thiếu `POSTGRES_PASSWORD`** — `cp .env.example .env` rồi `docker compose up`
  là dừng ngay. Đã viết lại `.env.example`: gom 4 giá trị bắt buộc lên đầu, ghi rõ `VITE_API_URL`
  được nhúng lúc build nên điền `localhost` thì điện thoại và máy khác không gọi được API, và
  tách hẳn phần chỉ dùng khi chạy không qua Docker.
- **`docker-compose.yml` không truyền `ADMIN_TEN_DANG_NHAP` / `ADMIN_MAT_KHAU`** vào container,
  nên `docker compose exec may_chu node dist/csdl/seed.js` không tạo được tài khoản admin đầu
  tiên.
- nginx cache font 7 ngày (tên tệp không có băm nên không thể cache 1 năm, nhưng vẫn hơn tải
  lại 180 KB mỗi lần mở trang).

### Thêm mới

- **`trien_khai/gia_lap_may.mjs`** — giả lập một máy ZKTeco nói giao thức ADMS Push: handshake,
  báo firmware, đẩy ATTLOG, gửi lại đúng lô đó để kiểm chống trùng, xin lệnh. Kiểm được toàn bộ
  đường đi của dữ liệu **trước khi có hardware**. Có `--lien-tuc` để chạy như máy đang hoạt động.
- **`trien_khai/kiem_tra.mjs`** — kiểm máy chủ, CSDL, tài khoản admin, múi giờ, danh sách máy đã
  khai báo, nhân viên đã gán PIN/ca; rồi in đúng những giá trị phải bấm vào menu máy ZKTeco kèm
  **IP LAN thật** của máy chủ (nhắc rõ không dùng `localhost`).
- `npm run kiem_tra_trien_khai` và `npm run gia_lap_may`. Cả hai viết bằng Node nên chạy y hệt
  trên Windows / Linux / macOS.
- **`tai_lieu/BAT-DAU-NHANH.md`** — đường ngắn nhất từ `git clone` đến "log máy về tới bảng
  công", kèm bảng sự cố thường gặp và ba việc bắt buộc để số liệu đúng (gán PIN, gán ca, khai
  ngày lễ).

### Đã kiểm chứng

Chạy giả lập máy đối chiếu với máy chủ thật: quẹt 08:00 và 17:30 giờ Việt Nam → lưu đúng
`01:00`/`10:30` UTC → bảng công tự sinh `co_mat`, 450 phút làm (540 phút trong ca trừ 90 phút
nghỉ), 0 phút muộn, 1 công; gửi lại cùng lô trả `OK: 0` đúng như chống trùng phải làm.

Đường Docker **chưa chạy thử được trong môi trường này** (proxy chặn tải image gốc từ Docker
Hub). Đã kiểm tĩnh thay thế: nội suy biến của `docker compose config`, toàn bộ đường dẫn `COPY`
trong hai Dockerfile, và `web/dist/font/` có đủ font sau khi build.

## [1.3.0] — 2026-08-06

Áp theme **Metronic v9** cho webapp theo demo 11 màn đã duyệt. Từ nay web và app dùng **hai bộ
theme riêng** như kế hoạch v2 mục 4.5 chốt.

### Thêm mới

- `thiet_ke/token.json` tách thành hai nhánh `web` (Metronic: Inter, `#3B82F6`, bo góc 8px) và
  `mobile` (Compose Boltuix: Be Vietnam Pro, `#4285F4`, bo góc 12px). Khoảng cách, breakpoint và
  `y_nghia_mau` vẫn dùng chung để một ngày "đủ công" không ra hai màu ở hai nơi — có test kiểm.
- **Font Inter tự chứa**, bản biến thiên đã cắt còn trục `wght` 400–700 và ghim `opsz`: một tệp
  **171 KB** phủ liên tục 400–700, nhỏ hơn 4 tệp tĩnh và độ đậm mượt hơn. Không gọi Google Fonts
  CDN như demo — chạy được trong LAN kín và không rò rỉ IP nhân viên.
- **Biểu tượng Tabler Icons cắt subset**: bộ đầy đủ 840 KB cho 5.800 icon → **7,5 KB** cho 33
  icon đang dùng. Tự chứa thay vì gọi CDN jsDelivr.
- **Bố cục Metronic**: thanh bên mảng tối cố định 232px + header (tiêu đề động, nút sáng/tối,
  avatar). Nhóm menu theo demo: nhóm đầu không nhãn · Quản trị nhân sự · Hệ thống.
- **Nút chuyển sáng/tối** ba trạng thái (theo máy / sáng / tối), lưu ở `localStorage`. Kế hoạch
  đòi "bật/tắt trên web" nên không thể chỉ dựa vào `prefers-color-scheme`.
- Ở ≤1023px thanh bên **trượt vào từ bên trái** kèm màn che, thay vì nằm đè trên đỉnh trang.

### Sửa

- Demo đặt chữ/nhãn nút lên `#3B82F6` ở 4 chỗ (`.lnk`, `.btn-p`, `.nav.on`, `.tab.on`) — màu này
  chỉ đạt **3,68:1** trên nền trắng và chữ trắng trên nó cũng 3,68:1. Đã tách vai trò như bên
  mobile: `chinh` tô mảng, `chinh_dam` (`#2563EB`, 5,17:1) cho chữ và nền nút đặc.
- Nhãn nhóm sidebar của demo dùng zinc-600 `#52525B` trên `#18181B` — chỉ **2,29:1**, đọc rất
  khó. Nâng lên `#8E8E97`.
- Ở chế độ tối, viền `#27272A` trên thẻ `#18181B` chỉ đạt **1,19:1** nên gần như vô hình. Nâng
  lên zinc-700.
- Liên kết trong thanh bên tối dùng `chinh_dam` `#2563EB` trên `#18181B` chỉ **2,3:1** → thêm
  token `lien_ket_ben` (`#93C5FD`, 9,8:1).
- Bỏ 13 thẻ `<h1>` trùng: tiêu đề trang nay nằm một chỗ duy nhất trên header. Trang đăng nhập
  nằm ngoài vỏ app nên giữ nguyên `<h1>`.
- Test tương phản nay kiểm **cả hai nền tảng × cả hai chế độ**, gồm cặp riêng của thanh bên tối.

### Đã biết còn thiếu

4 trong 11 màn của demo chưa có backend nên chưa đưa vào menu: Bảng lương (Module C), Hợp đồng
(Module D), Vi phạm (Module G), Cấu hình pháp lý (Module C). Màn Báo cáo mới có xuất CSV. Xem
`tai_lieu/THIET-KE.md` mục 7.

## [1.2.0] — 2026-08-06

### Thêm mới

- **Cảnh báo máy chấm công mất kết nối** (`su_kien/giam_sat_may.ts`). Trước đây trạng thái máy
  chỉ hiện trên trang Tổng quan — thông tin **bị động**, phải có người mở trang lên xem. Nay
  máy chủ kiểm tra mỗi phút, ghi log mức `warn` và đẩy sự kiện `thiet_bi.mat_ket_noi` /
  `thiet_bi.ket_noi_lai` vào hộp thư đi.

  Cảnh báo **đúng một lần** mỗi lần chuyển online → offline (cột `thiet_bi.da_canh_bao_offline`), không
  lặp mỗi chu kỳ. Cả hai câu `UPDATE ... where <trạng thái> returning` đều nguyên tử nên nhiều
  instance chạy song song không gửi trùng. Máy `dang_bat = false` (đã tháo ra) không sinh cảnh
  báo. Bao gồm cả máy **chưa bao giờ** báo hiệu — khai báo máy mà không nói được với máy chủ là
  lỗi cấu hình, cần biết ngay.
- Di trú `005_canh_bao_may.sql`: `thiet_bi.da_canh_bao_offline`.
- 2 test e2e: mất kết nối phát đúng 1 cảnh báo qua 3 chu kỳ, kết nối lại phát sự kiện phục hồi
  rồi lần mất kết nối sau lại được cảnh báo; máy đã tắt không sinh cảnh báo.

## [1.1.0] — 2026-08-06

Áp bộ nhận diện của công ty (theme Compose Boltuix) lên cả web và app, và dựng bộ màn hình
self-service theo Phụ lục B của kế hoạch v2 (Module F1–F3).

### Thêm mới

**Design token (`thiet_ke/`)**
- `token.json` là nguồn duy nhất cho màu / font / bo góc / khoảng cách / breakpoint;
  `npm run sinh_token` sinh ra biến CSS cho web và bảng màu TS cho app. `npm test` đối chiếu
  hai tệp sinh ra với nguồn nên không thể lệch âm thầm.
- Font **Be Vietnam Pro** (SIL OFL) tự chứa trong repo, 4 trọng số — woff2 cho web, TTF cho
  app. Không gọi Google Fonts nên không rò rỉ IP nhân viên và chạy được trong LAN kín.
- 8 test mới: 21 cặp tương phản màu đạt WCAG AA ở **cả** chế độ sáng và tối, đồng bộ tệp sinh
  ra, và quét mã nguồn app tìm ký tự mà font thiếu glyph.

**App điện thoại**
- Thanh tab theo Phụ lục B: **Trang chủ · Bảng công · Lương · Cá nhân**. Màn Đơn từ rời thanh
  tab, vào từ thẻ trên Trang chủ có số đếm đơn chờ duyệt.
- Trang chủ (Màn 1): dải tuần T2–CN, 4 chỉ số tháng, thanh chuyên cần, mục "Cần chú ý".
- Bảng công (Màn 2): 4 chỉ số phân loại, thanh công thực tế/công chuẩn, lịch tháng dạng
  heatmap có chú thích màu.
- Màn **Lương** (Màn 3): hiện cơ sở tính lương từ dữ liệu chấm công. **Không** bày số tiền —
  Module C chưa triển khai và theo lộ trình v2 còn chờ kế toán xác nhận tham số pháp lý.

**Máy chủ**
- `GET /api/toi/luong` — cơ sở tính lương của một kỳ. Trả `phieu_luong: null` kèm lý do.
- `/api/toi/hom-nay` bổ sung dải tuần, tổng hợp tháng, quỹ phép, việc cần chú ý.
- Di trú `004_quy_phep.sql`: `nhan_vien.so_ngay_phep_nam` (mặc định 12 — Điều 113 BLLĐ 2019,
  HR tăng theo thâm niên/nghề theo Điều 114).
- 3 test e2e mới: dải tuần neo đúng thứ Hai, quỹ phép (nghỉ ốm không trừ, nửa ngày tính 0,5),
  và màn Lương không được trả bất kỳ trường tiền lương nào.

### Sửa

- **Không dùng Poppins** như token spec đề xuất: cả 8 tệp trong kit **và** bản chính thức trên
  `google/fonts` đều chỉ có 471 glyph và **thiếu 88/133 ký tự tiếng Việt** (mất `ơ ư` và toàn
  bộ khối `U+1EA0–1EF9`). Thay bằng Be Vietnam Pro phủ đủ 133/133.
- Màu thương hiệu `#4285F4` chỉ đạt **3,56:1** trên nền trắng — không đủ WCAG AA cho chữ, kể cả
  chữ trắng trên nút màu đó. Tách vai trò: `chinh` chỉ tô mảng, `chinh_dam` (`#1967D2`) cho
  chữ / liên kết / nền nút đặc.
- `→` và `✓` không có trong Be Vietnam Pro nên trên máy thật ra ô vuông rỗng (trên web thì
  không thấy vì trình duyệt tự tìm font dự phòng). Đổi sang ký tự font có, hoặc vẽ qua
  `<KyHieu>` dùng font hệ thống.
- Web dùng `font-weight: 550 / 650 / 680` — không tồn tại trong font tĩnh. Đổi về 500/600/700.
- Ở ≤768px thanh điều hướng xuống dòng thành 3 khối dọc cao 340–430px, đẩy tiêu đề trang xuống
  dưới màn hình. Đổi thành một hàng cuộn ngang (nav 202px → 50px ở 390px).

### Đổi

- Nhãn OT đổi thành **"OT ghi nhận"** kèm ghi chú *chưa duyệt*. Tiền làm thêm giờ chỉ trả theo
  số phút OT đã có đơn duyệt — `phut_ot` hiện tại là số máy ghi nhận, dùng để đối chiếu.
- Bo góc 8px → **12px** (chốt từ mockup ~13px; kit gốc `Shape.kt` là 4dp).

## [1.0.0] — 2026-08-06

Bản đầu tiên. Xây từ bản thiết kế microservice `ChamCong` (.NET 8), viết lại bằng
Node/TypeScript để web, app và backend dùng chung một ngôn ngữ và kiểm chứng được bằng test.

### Thêm mới

**Máy chủ (`may_chu/`)**
- Cổng ADMS Push nhận log trực tiếp từ máy ZKTeco (`/iclock/*`), whitelist theo serial máy.
- Bộ tính công: giờ vào/ra, kẹp giờ trong khung ca, đi muộn/về sớm có dung sai, ngưỡng OT,
  ca đêm qua nửa đêm, ngày lễ, ngày nghỉ tuần theo cấu hình từng ca.
- Xác thực JWT HS256 tự cài bằng `node:crypto`, băm mật khẩu scrypt; phân quyền 4 vai trò.
- Token làm mới có xoay, khóa tài khoản sau 8 lần sai mật khẩu.
- Hàng đợi lệnh xuống máy bền vững trong CSDL (nạp nhân viên, đồng bộ giờ, gửi lại log).
- Đơn nghỉ phép, đơn giải trình quên quẹt, chốt/mở chốt tháng, xuất CSV cho kế toán.
- Chấm công bằng điện thoại: GPS + ảnh selfie, geofence haversine, phát hiện GPS giả lập.
- Hộp thư đi (outbox) đồng bộ sang ERP kèm chữ ký HMAC, tự gửi lại với backoff.
- Bộ lịch chốt bảng công ngày hôm trước cho toàn bộ nhân viên (để ngày vắng xuất hiện).
- Nhật ký thao tác cho mọi thay đổi dữ liệu chấm công.

**Webapp (`web/`)**
- 11 trang: tổng quan, bảng công (tổng hợp + chi tiết + xuất CSV + chốt tháng), nhật ký
  quẹt thô, duyệt đơn, nhân viên, máy chấm công, ca làm, địa điểm, ngày lễ, tài khoản,
  nhật ký thao tác.
- Giao diện sáng/tối theo cài đặt máy, dùng được trên điện thoại.

**App điện thoại (`dien_thoai/`)**
- Expo SDK 57 + expo-router, 4 tab: Hôm nay, Bảng công, Đơn từ, Cá nhân.
- Chấm công GPS + selfie; token lưu trong SecureStore.

### Khác so với bản thiết kế .NET gốc

- Hàng đợi lệnh xuống máy: chuyển từ in-memory sang bảng CSDL — không mất lệnh khi restart,
  không gửi trùng khi chạy nhiều instance.
- Chống trùng lần quẹt: dùng ràng buộc UNIQUE + `on conflict do nothing` thay vì
  "select rồi insert" (hai lô đến cùng lúc sẽ lọt qua khe đó).
- Thay publish RabbitMQ trực tiếp bằng bảng outbox ghi cùng transaction — ERP sập không
  làm mất sự kiện.

### Bảo mật

- Bỏ `@fastify/static` (4 CVE path traversal) — ảnh selfie đi qua route có xác thực.
- Bỏ `react-router` (CVE chưa có bản vá) — tự viết router ~60 dòng.
- `npm audit` = 0 lỗ hổng trên cả ba workspace.
- Chặn CSV injection khi xuất bảng công.

### Kiểm chứng

- 101 test tự động: 60 đơn vị + 41 end-to-end có CSDL thật (gồm giả lập máy ZKTeco đẩy
  ATTLOG qua giao thức ADMS rồi đối chiếu bảng công sinh ra).
- Lái Chromium qua toàn bộ webapp (11 trang, giao diện tối, cỡ 390×844) và app điện thoại.
