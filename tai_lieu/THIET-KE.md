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

## 1. Font: Be Vietnam Pro, **không** phải Poppins

Kế hoạch v2 ghi token `Font: Poppins`. Đã kiểm và **Poppins không dùng được cho app tiếng
Việt**:

| Nguồn | Số glyph | Ký tự tiếng Việt thiếu |
|---|---|---|
| 8 tệp Poppins trong kit Compose Boltuix | 471 | **88 / 133** |
| Poppins bản chính thức trên `google/fonts` | 471 | **88 / 133** |

Thiếu cả `ơ ư` và **toàn bộ khối `U+1EA0–1EF9`**: ạ ả ấ ầ ẩ ẫ ậ ắ ằ ẳ ẵ ặ ẹ ẻ ẽ ế ề ể ễ ệ ỉ ị
ọ ỏ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ụ ủ ứ ừ ử ữ ự ỳ ỷ ỹ ỵ. Nghĩa là kit không bị cắt — **Poppins vốn
không hỗ trợ tiếng Việt.** Dùng nó thì gần như mọi nhãn tiếng Việt bị tụt sang font dự phòng,
chữ lẫn font ngay giữa một từ.

Thay bằng **Be Vietnam Pro**: sans hình học cùng cảm giác, phủ **133/133** ký tự Việt, dấu do
foundry Việt thiết kế riêng, hẹp hơn Montserrat nên vừa ô bảng. Giấy phép **SIL OFL 1.1** nên
phát hành kèm được (`web/public/font/OFL.txt`).

Bốn trọng số: 400 / 500 / 600 / 700 — woff2 cho web (155 KB), TTF cho app (546 KB). Tự chứa
font, **không gọi Google Fonts**: không rò rỉ IP nhân viên sang bên thứ ba và chạy được trong
LAN không ra Internet.

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

## 2. Màu: `chinh` để tô mảng, `chinh_dam` cho chữ

Màu thương hiệu `#4285F4` (khớp `Color.kt` của kit: `composeThemeColor = Color(0xFF4285f4)`)
**chỉ đạt 3,56:1 trên nền trắng** — không đủ 4,5:1 của WCAG AA cho chữ, và **chữ trắng trên
nút màu đó cũng chỉ 3,56:1**.

| Token | Dùng cho |
|---|---|
| `chinh` `#4285F4` | **chỉ mảng to không có chữ đè lên**: thanh tiến độ, cột biểu đồ, gạch chân tab, viền nhấn |
| `chinh_dam` `#1967D2` | **chữ, liên kết, nền nút đặc** (5,17:1 trên trắng; chữ trắng trên nó đạt AA) |

Đây là cách Material xử lý: blue-500 tô mảng, blue-700 cho chữ.

Màu nhấn spec ghi `#EB4658` cũng chỉ 3,6:1 nên chế độ sáng dùng `#C1273A` cùng họ.

`thiet_ke/token.test.mjs` kiểm **21 cặp màu ở cả hai chế độ sáng/tối**. Thêm màu mới mà không
đạt tỷ lệ là test đỏ — không phải chuyện thẩm mỹ, một token đọc được ở chế độ sáng nhưng mờ ở
chế độ tối là lỗi.

Bảng màu trạng thái iOS mà spec liệt kê theo cặp *(đậm cho chế độ tối | đậm hơn cho chế độ
sáng)* được giữ đúng tinh thần; chỉ nâng những giá trị không đạt 4,5:1.

---

## 3. Bo góc: 12px

Kit gốc `Shape.kt` là **4dp**:

```kotlin
val Shapes = Shapes(
    small  = RoundedCornerShape(4.dp),
    medium = RoundedCornerShape(4.dp),
    large  = RoundedCornerShape(0.dp),
)
```

Mockup CEO duyệt dùng ~13px. **Đã chốt 12px** — làm tròn từ 13, chia hết cho thang 4dp nên thẻ
lồng trong thẻ vẫn đều góc.

---

## 4. Breakpoint web

| Nguỡng | Thay đổi |
|---|---|
| ≥ 1280 | lưới chỉ số cố định 4 cột, lề rộng hơn |
| 1024–1279 | thanh bên thu còn 200px |
| ≤ 1023 | thanh bên thành thanh ngang trên đỉnh |
| ≤ 768 | điều hướng thành **một hàng cuộn ngang**, lưới 2 cột, bảng chữ nhỏ hơn, hộp thoại gần full |
| ≤ 420 | lưới 1 cột, ô lịch thấp hơn |

Ở ≤768px thanh điều hướng phải là **một hàng**, không cho xuống dòng: 10 mục xuống dòng chiếm
340–430px chiều cao, đẩy tiêu đề trang xuống dưới màn hình. Các nhóm menu dùng
`display: contents` để lọt vào hàng của `nav` thay vì thành ba khối dọc cạnh nhau.

Đã kiểm bằng trình duyệt thật ở 1440 / 1280 (tối) / 768 / 390 — không trang nào tràn ngang.
