# Design token: màu, font, bo góc

Nguồn duy nhất là **`thiet_ke/token.json`**. Sửa ở đó rồi chạy:

```bash
npm run sinh_token
```

Lệnh này sinh ra hai tệp (đã commit, **không sửa tay**):

| Tệp | Dùng bởi |
|---|---|
| `web/src/token_thiet_ke.css` | webapp — biến CSS + `@font-face` |
| `dien_thoai/nguon/token_thiet_ke.ts` | app điện thoại — `SANG` / `TOI` / `HO_CHU` / `BO_GOC` |

`npm test` đối chiếu hai tệp sinh ra với `token.json`. Quên chạy `sinh_token` là test đỏ ngay,
không để hai bên lệch âm thầm.

Vì sao phải sinh thay vì import chung một tệp: web dùng Vite, app dùng Metro; mỗi bên đóng
gói một kiểu và việc cho cả hai import một tệp nằm ngoài thư mục gốc của nó là nguồn lỗi cấu
hình triền miên.

---

## 1. Hai nền tảng, hai bộ theme

Kế hoạch v2 mục 4.5 chốt như vậy, nên `token.json` có hai nhánh:

| | Web | App điện thoại |
|---|---|---|
| Bộ theme | **Metronic v9.5.0** (KeenThemes) | **Compose Boltuix App Template** |
| Font | Inter | Be Vietnam Pro |
| Màu thương hiệu | `#3B82F6` (blue-500) | `#4285F4` |
| Bo góc | 8px (`--radius: 0.5rem`) | 12px |

Những thứ **không** phụ thuộc nền tảng để ở ngoài hai nhánh: khoảng cách, breakpoint, và
`y_nghia_mau` — bảng ánh xạ trạng thái nghiệp vụ sang khoá màu, để một ngày "đủ công" không
ra hai màu khác nhau ở web và app. Có test kiểm điều này.

---

## 2. Font

### Web: Inter, tự chứa, một tệp biến thiên

Inter có 2.849 glyph và phủ **133/133** ký tự tiếng Việt — dùng được.

Demo nạp Inter từ Google Fonts CDN; ta **tự chứa trong repo**: không rò rỉ IP nhân viên sang
bên thứ ba và chạy được trong LAN không ra Internet. Dùng bản **biến thiên** đã cắt còn trục
`wght` 400–700 (ghim `opsz`): **một tệp 171 KB** phủ liên tục 400–700, nhỏ hơn 4 tệp tĩnh
(180 KB) và độ đậm mượt hơn.

### App: Be Vietnam Pro, **không** phải Poppins

Kế hoạch ghi token `Font: Poppins`. Đã kiểm và **Poppins không dùng được cho app tiếng Việt**:

| Nguồn | Số glyph | Ký tự tiếng Việt thiếu |
|---|---|---|
| 8 tệp Poppins trong kit Compose Boltuix | 471 | **88 / 133** |
| Poppins bản chính thức trên `google/fonts` | 471 | **88 / 133** |

Thiếu cả `ơ ư` và **toàn bộ khối `U+1EA0–1EF9`**: ạ ả ấ ầ ẩ ẫ ậ ắ ằ ẳ ẵ ặ ẹ ẻ ẽ ế ề ể ễ ệ ỉ ị
ọ ỏ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ụ ủ ứ ừ ử ữ ự ỳ ỷ ỹ ỵ. Nghĩa là kit không bị cắt — **Poppins vốn
không hỗ trợ tiếng Việt.**

Thay bằng **Be Vietnam Pro** (SIL OFL): sans hình học cùng cảm giác, phủ **133/133**, dấu do
foundry Việt thiết kế riêng, hẹp hơn Montserrat nên vừa ô bảng.

### App: chọn độ đậm bằng `fontFamily`, không bằng `fontWeight`

React Native trên Android **không** suy ra độ đậm từ một họ font. Đặt
`fontFamily: 'BeVietnamPro'` + `fontWeight: '600'` sẽ ra chữ thường. Mỗi trọng số được đăng ký
thành một họ riêng (`nguon/font.ts`) và chọn qua `HO_CHU.thuong | vua | dam | rat_dam`.

### Ký hiệu font không có glyph

`→` (U+2192) và `✓` (U+2713) **không có** trong Be Vietnam Pro. Trình duyệt tự tìm font dự
phòng nên **chạy thử app trên trình duyệt sẽ không thấy lỗi**, nhưng trên máy thật ra ô vuông
rỗng. Hai cách xử lý:

1. Đổi sang ký tự font có (`–` `›` `·` `…` `₫` đều có).
2. Vẽ qua `<KyHieu>` — component này cố tình **không** đặt `fontFamily` nên dùng font hệ điều
   hành.

`thiet_ke/font.test.mjs` quét toàn bộ mã nguồn app và **báo đỏ** nếu có ký tự ngoài ASCII mà
font thiếu glyph. Đây là loại lỗi duy nhất chỉ test tĩnh bắt được.

---

## 3. Màu: `chinh` để tô mảng, `chinh_dam` cho chữ

**Cả hai** màu thương hiệu đều không đủ tương phản cho chữ:

| Màu | Trên nền trắng | Chữ trắng trên nó |
|---|---|---|
| `#3B82F6` (web, Metronic) | 3,68:1 ✗ | 3,68:1 ✗ |
| `#4285F4` (mobile, Boltuix) | 3,56:1 ✗ | 3,56:1 ✗ |

WCAG AA cần 4,5:1. Nên tách vai trò ở **cả hai** nền tảng:

| Token | Dùng cho |
|---|---|
| `chinh` | **chỉ mảng to không có chữ đè lên**: thanh tiến độ, cột biểu đồ, gạch chân tab, viền nhấn |
| `chinh_dam` | **chữ, liên kết, nền nút đặc** — web `#2563EB` (5,17:1), mobile `#1967D2` |

Đây là cách Material xử lý: blue-500 tô mảng, blue-700 cho chữ. `#2563EB` chính là primary
chế độ tối của Metronic nên vẫn nằm trong họ màu gốc.

Chữ trên nền `chinh_dam` phải dùng `var(--tren-chinh)`, **không** hardcode `#fff`: ở chế độ
tối `chinh_dam` là màu sáng (`#60A5FA`) nên chữ trắng chỉ còn 2,3:1.

### Những chỗ lệch khỏi demo, và vì sao

Demo đặt chữ/nhãn nút lên `#3B82F6` ở 4 chỗ (`.lnk`, `.btn-p`, `.nav.on`, `.tab.on`) — đã đổi
sang `chinh_dam`. Nhãn nhóm sidebar của demo dùng zinc-600 `#52525B` trên `#18181B` chỉ đạt
**2,29:1**, đã nâng lên `#8E8E97`. Badge của demo (`.b-green`/`.b-amber`/`.b-red`/`.b-blue`)
đã dùng bản chữ đậm sẵn nên đạt AA — giữ nguyên.

`thiet_ke/token.test.mjs` kiểm **các cặp màu ở cả hai nền tảng × cả hai chế độ sáng/tối**,
gồm cả cặp riêng của thanh bên tối. Thêm màu mới mà không đạt tỷ lệ là test đỏ — không phải
chuyện thẩm mỹ, một token đọc được ở chế độ sáng nhưng mờ ở chế độ tối là lỗi.

---

## 4. Bo góc

| | Giá trị | Nguồn |
|---|---|---|
| Web | 8px (nhỏ 6, lớn 12) | Metronic `--radius: 0.5rem`; sm = −4px, md = −2px, xl = +4px |
| App | 12px (nhỏ 8, lớn 16) | Kit gốc `Shape.kt` là 4dp, mockup đã duyệt ~13px → chốt 12 (chia hết cho thang 4dp nên thẻ lồng thẻ vẫn đều góc) |

---

## 5. Biểu tượng: Tabler Icons, cắt subset

Demo dùng `@tabler/icons-webfont` qua CDN jsDelivr. Ta **tự chứa** và **cắt subset**: bộ đầy
đủ là **840 KB** cho 5.800 icon, bản cắt còn **7,5 KB** cho 33 icon đang dùng. Giấy phép MIT,
để ở `web/public/font/Tabler-LICENSE.txt`.

Cách thêm icon mới xem đầu tệp `web/src/icon.css`. Giữ tên icon y nguyên của Tabler để tra
được trên tabler.io/icons.

---

## 6. Bố cục web: sidebar tối + header

Theo demo1 của Metronic và demo 11 màn đã duyệt: thanh bên **mảng tối cố định 232px** +
header (tiêu đề động, nút sáng/tối, avatar) + nội dung.

Tiêu đề trang nằm **một chỗ duy nhất** trên header — các trang không có `<h1>` riêng nữa để
khỏi hiện hai lần. Trang đăng nhập nằm ngoài vỏ app nên vẫn giữ `<h1>`.

### Chế độ sáng/tối

Ba trạng thái: theo máy / sáng / tối, lưu ở `localStorage`. Biến CSS đọc `data-che-do` trên
`<html>`, và `@media (prefers-color-scheme: dark)` chỉ áp dụng khi người dùng **chưa** chọn
thủ công. Kế hoạch đòi "bật/tắt trên web" nên không thể chỉ dựa vào cài đặt hệ điều hành.

### Breakpoint

| Ngưỡng | Thay đổi |
|---|---|
| ≥ 1280 | lưới chỉ số cố định 4 cột, lề rộng hơn |
| 1024–1279 | thanh bên thu còn 200px |
| ≤ 1023 | thanh bên **trượt vào từ bên trái** (off-canvas) + màn che; hiện nút menu |
| ≤ 768 | lề hẹp, lưới 2 cột, bảng chữ nhỏ hơn, hộp thoại gần full |
| ≤ 420 | lưới 1 cột, ô lịch thấp hơn |

Ở ≤1023px thanh bên **phải** off-canvas, không được nằm đè trên đỉnh trang: một mảng tối cao
200px trên trang sáng trông rất nặng, và trước đó nó đẩy tiêu đề trang xuống dưới màn hình.

Đã kiểm bằng trình duyệt thật ở 1440 / 1280 (cả hai chế độ) / 768 / 390 — không trang nào
tràn ngang, font và icon đều được áp dụng thật (đo bề rộng chuỗi, không chỉ đọc CSS).

---

## 7. Điều hướng

Thanh bên chia hai loại theo **tần suất**, không theo chủ đề:

```
(không nhãn)          Tổng quan · Chấm công · Bảng công
Quản trị nhân sự      Nhân viên · Nghỉ phép · Vi phạm · KPI · Bảng lương · Phụ cấp · Hợp đồng
Hệ thống              Cài đặt
```

**Cấu hình là thứ sửa vài lần một năm; việc hằng ngày là thứ mở vài lần một ngày.** Hai loại đó
không cùng một cấp. Nên 11 mục cấu hình nằm sau *một* mục `Cài đặt`, mở ra sub-nav bốn nhóm:
Chấm công · Nhân sự & lương · Tài khoản & bảo mật · Tích hợp & dữ liệu.

Ba ràng buộc của khu Cài đặt, mỗi cái có một bài kiểm giữ trong `thiet_ke/giao_dien.test.mjs`:

1. **Mỗi mục con có đường dẫn riêng** (`/cai-dat/thiet-bi`), không phải tab trong một trang.
   Bookmark, Ctrl-click và nút Lui đều phải chạy; tab thì cả ba đều không.
2. **Đường dẫn cũ vẫn sống.** 11 đường trước đây nằm ở cấp một tự chuyển sang đường mới. Người
   dùng đã bookmark `/tham-so-luong` và đã dán `/thiet-bi` vào ghi chú nội bộ — trả 404 cho họ là
   một lỗi tự gây ra.
3. **Phân quyền đọc một chỗ**: cột `quyen` của bảng `MENU_CAI_DAT`. Trước đây mỗi `case` tự gọi
   `la_admin()` / `la_nhan_su()`, và một `case` quên gọi thì không có gì báo.

### Icon phải riêng biệt trong từng danh sách

Hai mục cùng icon thì thanh bên mất tác dụng quét nhanh: mắt thấy hai dòng giống nhau và phải đọc
chữ mới phân biệt được. Đã từng có `fingerprint` cho cả *Chấm công* và *Mã định danh*.

Ràng buộc là trong **từng** bảng: `MENU` và `MENU_CAI_DAT` hiện ở hai chỗ khác nhau, nên một icon
dùng ở cả hai không gây nhầm lẫn. Có bài kiểm giữ.

### Tiêu đề header

Header lấy nhãn từ bảng `MENU` bằng cách khớp đường dẫn. Trang có tham số — `/nhan-vien/<uuid>` —
không khớp mục nào, nên:

- **Active khớp theo tiền tố**: `/nhan-vien/<uuid>` làm sáng *Nhân viên*, `/cai-dat/khoa-api` làm
  sáng *Cài đặt*.
- **Ngữ cảnh tiêu đề** (`web/src/tieu_de_trang.tsx`) để trang tự đặt tiêu đề + đường mòn. Dọn dẹp
  khi trang rời đi, nên trang **không** dùng hook đó thì header quay về nhãn của MENU — không cần
  mọi trang phải biết đến cơ chế này.

Dọn dẹp nằm ở hook chứ không ở `BoCuc`: hiệu ứng của con chạy **trước** hiệu ứng của cha, nên một
lệnh xóa ở cha sẽ đè lên tiêu đề mà trang mới vừa đặt.

---

## 8. Không dùng hộp thoại gốc của trình duyệt

`window.confirm` / `alert` / `prompt` không theo chế độ tối, không theo font và màu của app, không
tô đỏ được nút xóa khác nút hủy. Và ở nhiều trình duyệt có ô *"chặn trang này hiện hộp thoại"*:
người dùng tick vào thì từ đó mỗi lần bấm Xóa sẽ **không hỏi gì mà cũng không xóa**. Một thao tác
mất dữ liệu không được phép phụ thuộc vào thứ đó.

Dùng `dung_xac_nhan()` / `dung_nhap_chu()` trong `thanh_phan.tsx`. Hai quy tắc:

- **Nội dung nói rõ sẽ mất gì**, không phải "Bạn có chắc?".
- **Bấm ra ngoài hoặc Esc = KHÔNG đồng ý.** Một hộp thoại xác nhận đóng lại mà coi là đồng ý thì
  một cú bấm lạc cũng xóa được dữ liệu.

Có bài kiểm chặn `window.confirm|alert|prompt` quay lại (bỏ qua phần ghi chú, để chính đoạn giải
thích này không tự làm đỏ bài kiểm).
