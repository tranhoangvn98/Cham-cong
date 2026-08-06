# Nhật ký thay đổi

Theo [SemVer](https://semver.org/lang/vi/).

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
