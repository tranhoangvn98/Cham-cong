# Nhật ký thay đổi

Theo [SemVer](https://semver.org/lang/vi/).

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
  **22 ngày lễ cho 2026–2027** (11 ngày/năm theo Điều 112 BLLĐ 2019, ngày âm lịch đã quy đổi:
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
