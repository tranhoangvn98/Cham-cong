# Luồng tạo nhân sự mới — hệ thống tự sinh mã, tự đẩy máy, tự cấp Microsoft 365

> Trạng thái: **ĐÃ TRIỂN KHAI** (1.127.0) — 2026-10-26 — **luồng DUY NHẤT**.
>
> Tệp này là bản luồng chuẩn của việc tạo hồ sơ nhân sự. Mọi thay đổi sau này đối chiếu với
> đây trước khi sửa. Hai luồng cũ (form thêm tay và "đề nghị → Admin duyệt") đã **gộp làm một**:
> người có quyền nhân sự tự thêm hồ sơ, hệ thống tự khởi tạo, Admin **không duyệt** mà chỉ nhận
> thông báo "có nhân sự mới". Luồng cũ (HR gõ mã nhân viên, tự chọn máy, giấy phép theo chức
> danh) cũng đã bỏ.

## 0. Yêu cầu gốc

> "Mã nhân sự của hệ thống erp2 chấm công sẽ do hệ thống tự sinh, khi thêm nhân sự mới thì chỉ
> khai báo mã ERP1 và khối văn phòng để khai mã PIN, khai tên email để làm M365 thôi. Sẽ có
> script tự truyền vào máy chấm công và script tự động tạo và cấp phép giấy phép M365 Basic cho
> tài khoản mới đó."

> "mã hệ thống sẽ cấu trúc NV + mã khối + tháng năm vào + số thứ tự. Ví dụ NVKHN05260001."

**Quy ước tên gọi.** "ERP2" trong yêu cầu = hệ thống này (`may_chu` + `web`). Trong code nó là
`noi_bo` / "hệ thống chấm công".

## 1. Khuôn mã nhân sự

```
NV + <mã ngắn khối> + <MMYY> + <số thứ tự 4 chữ số>

NVKHN05260001   Khối Kho Hà Nội, vào tháng 5/2026, người thứ 1
NVVP10260007    Khối Văn Phòng,  vào tháng 10/2026, người thứ 7
```

| Phần | Lấy từ | Ghi chú |
| --- | --- | --- |
| `NV` | hằng số | tiền tố chung của hệ thống chấm công |
| mã ngắn khối | `khoi.ma_ngan` | `VP`, `KHN`, `VPLS`, `KTQ` — chỉ chữ HOA, 1–6 ký tự |
| `MMYY` | `nhan_vien.ngay_vao` | không có ngày vào thì lấy **hôm nay theo giờ máy chấm công** |
| số thứ tự | bảng `dem_ma_nhan_su` | đếm **theo (khối, tháng)**, mỗi khối đếm lại từ `0001` khi sang tháng |

### Vì sao mã mang nghĩa

Mã nhân viên đi vào **tên thư mục kho tệp**, **phiếu lương in ra**, và câu hỏi "người này thuộc
đâu". Một dãy tăng dần thuần tuý (`NV0001`, `NV0002`…) chỉ trả lời được "ai vào trước". Mã có
khối + tháng trả lời được ba câu, và vẫn giữ thứ tự trong tháng của từng khối.

### Vì sao không tái dùng số

Mã nhân viên là danh tính trong hồ sơ lưu trữ. Cấp lại số của người đã nghỉ cho người mới nghĩa
là hai người cùng một mã trong lịch sử, không có gì phân biệt. Bộ đếm chỉ tăng.

Khác với **PIN máy chấm công**: PIN **có** thu hồi khi nghỉ việc (`thu_hoi_ma`) để dải PIN của
máy — hữu hạn — dùng lại được. Hai thứ này cố ý khác nhau.

### Chống trùng và chống tranh chấp

- Số thứ tự cấp bằng **một câu UPSERT** (`insert … on conflict … do update … returning`) ngay
  trong transaction tạo hồ sơ. Postgres giữ khóa dòng đến lúc COMMIT, nên hai người lưu cùng lúc
  nhận hai số khác nhau. Transaction cuộn lại thì số cũng cuộn theo — số chưa in ra ở đâu nên
  cấp lại không phải tái dùng.
- Lưới thứ hai: unique index `ma_dinh_danh(he_thong, ma_chuan)` của bảng mã định danh.
- Số quá `9999` **không bị cắt** (`NVKHN052610000`) — cắt là mất tính duy nhất.

## 2. Luồng

```
HR nhập: Họ tên · Khối · Email        (+ Mã ERP1 · Chức danh · Phòng ban: tuỳ chọn)
         (+ chọn người từ danh sách Microsoft 365 đã có giấy phép: điền sẵn họ tên + email)
         (+ Loại hợp đồng: để checklist nhắc đúng loại · Máy cửa: nếu cần quẹt ra vào)
         (+ Vị trí trong Tổ chức & trách nhiệm: chọn = giao luôn đầu việc của vị trí)
─────────────────────────────────────────────────────────────────────────────────
Hệ thống, TRONG MỘT TRANSACTION:
  1. sinh mã NV      NV + mã ngắn khối + MMYY + số thứ tự
  2. cấp PIN         dải của máy thuộc khối, chống tranh chấp 5 lần thử
  3. insert nhan_vien
  4. ghi ma_dinh_danh: noi_bo · may_cham_cong · erp1 · erp_cu_ma · microsoft_email
  5. nguoi_dung      tài khoản app, vai trò suy từ Vị trí
  6. xếp lệnh        DATA UPDATE USERINFO → MỌI máy đang bật của khối (+ máy cửa)
  7. outbox          nhan_su.da_tao · erp1.nhan_su.da_tao · ms365.tao_tai_khoan
  8. công việc       "Nhập việc" + 15 mục checklist → người phụ trách nhân sự
  9. vị trí JD       gán nhan_vien_vi_tri + sinh mẫu việc định kỳ từ đầu việc của vị trí
 10. hợp đồng        hop_dong_lao_dong: loại + kì hạn (6/12 tháng / không xác định), hiệu lực từ ngày vào
─────────────────────────────────────────────────────────────────────────────────
Sau khi commit (không chặn phản hồi):
  · chuông cho MỌI tài khoản admin: "Có nhân sự mới: <họ tên>" (không phải yêu cầu duyệt)
  · chuông cho chính nhân viên: số PIN của họ
─────────────────────────────────────────────────────────────────────────────────
Hiện MỘT LẦN sau khi lưu: mã nhân viên · PIN · máy đã nhận lệnh · viec_id
                          + số vị trí/đầu việc đã giao
                          + mật khẩu khởi tạo M365 / hệ thống (nếu có tạo)
```

Máy chết giữa chừng thì cuộn hết — không có trạng thái "có người, không có tài khoản" hay
"có người, máy không có lệnh".

## 3. Chi tiết từng bước

### 3.1. Chọn máy và cấp PIN

- Khai **khối** là đủ. `thiet_bi.khoi_id` cho biết máy nào phục vụ khối nào; hệ thống lấy máy
  `dang_bat` có thứ tự ổn định (`tao_luc`, `serial`) để **đề nghị** PIN, rồi xếp lệnh cho
  **tất cả** máy đang bật của khối.
- PIN vẫn cấp theo **dải** (`pin_tu`–`pin_den`) chứ không theo khối: PIN là danh tính ở phạm vi
  **toàn công ty** — bộ tiếp nhận ADMS tra PIN ra người, không lọc theo máy. Hai khối cùng đánh
  số từ 1 là hai người trùng danh tính và không có gì báo.
- Khối chưa gắn máy nào mà vẫn bật "tự cấp PIN" thì **báo lỗi rõ** thay vì âm thầm tạo người
  không quẹt được. Tắt ô đó để nhập PIN có sẵn trên máy.
- Vẫn cho nhập PIN tay (ô "Nhập PIN có sẵn trên máy") cho người đã có PIN từ trước.

### 3.2. Đẩy xuống máy chấm công

Hàm `day_pin_xuong_may()` (`may_chu/src/nhan_su/day_pin_may.ts`) là đường duy nhất đẩy user
xuống máy — mọi lối tạo hồ sơ đều đi qua đây.

| Điều bắt buộc | Vì sao |
| --- | --- |
| Lệnh nằm trong **cùng transaction** | máy chết giữa chừng không để lại hồ sơ thiếu lệnh |
| Khóa chống trùng `nhap_viec_pin:<nv>:<serial>` | mỗi máy một lệnh; khóa chỉ theo nhân viên thì máy thứ hai không bao giờ nhận được |
| Tên ASCII (`bo_dau`) | máy cắt dấu theo bảng mã của nó |
| Máy offline thì lệnh **chờ** | `lenh_thiet_bi` giữ lệnh, phát khi máy Online trở lại |

⚠️ **Vân tay / khuôn mặt KHÔNG đẩy từ xa được.** Máy chỉ nhận template qua `BIODATA`, và
template chỉ có sau khi enroll **tại máy**. Hệ quả vận hành: ca đầu nhân viên vẫn phải enroll
tại máy (hoặc quẹt bằng PIN trong lúc chờ). Đừng hứa "có tài khoản là quẹt bằng mặt ngay".

Job 07:30 (`dong_bo_hang_ngay`) **không** phải đường đẩy người mới — nó chỉ chép user đã có trên
máy này sang máy kia, và cặp serial bị ghim trong `CAP_MAY_DONG_BO`. Người chưa có mặt ở máy nào
thì không có gì để chép; đó chính là lỗ mà bước 3.2 bịt.

### 3.3. Microsoft 365 — mặc định Basic

- Điều kiện: hồ sơ có **email hợp lệ**; email **chính là** UPN; không trùng người khác (trùng
  thì Graph trả 409 và có thể cấp giấy phép nhầm người).
- **Giấy phép mặc định: `MS365_SKU_BASIC`** cho mọi tài khoản mới. Standard chỉ khi người có
  thẩm quyền chọn đích danh (`sku_id_tuy_chon`).
- Mật khẩu khởi tạo 16 ký tự đủ 4 nhóm, **chỉ hiện một lần**, `forceChangePasswordNextSignIn`
  bật — nhân viên **bắt buộc đổi mật khẩu** ở lần đăng nhập Microsoft đầu tiên. Tạo xong thì
  mật khẩu bị xóa khỏi `hop_thu_di`.
- **Người lập hồ sơ nhận chuông** "Tài khoản Microsoft 365 của <họ tên>: <UPN>" kèm **mật khẩu
  khởi tạo** (chỉ tài khoản đó đọc được) để bàn giao cho nhân viên — không gửi qua email hay
  kênh công khai.
- Đi qua outbox `ms365.tao_tai_khoan`: chưa bật `MS365_TAO_TAI_KHOAN_BAT` hoặc chưa khai
  `MS365_SKU_BASIC` thì **hồ sơ vẫn lưu**, sự kiện nằm chờ và tự đi khi cấu hình đủ.

### 3.4. Mã ERP1

Ô **Mã nhân viên bên ERP1** ghi thẳng vào `ma_dinh_danh` hệ thống `erp1` — không thêm cột mới
trên `nhan_vien`. Nhờ vậy webhook `erp1.nhan_su.da_tao` tự mang `ma_erp1` (nó đọc
`ma_theo_he_thong(ma_nv, 'erp1')` lúc gửi), không phải sửa thân sự kiện.

### 3.5. Tài khoản hệ thống và cổng

Tên đăng nhập suy từ mã nhân viên (`sinh_ten_dang_nhap`), nay cũng do hệ thống sinh. Vai trò
suy từ **Vị trí** (`vai_tro_theo_vi_tri`). Sự kiện `nhan_su.da_tao` báo cổng như cũ.

### 3.6. Nhân viên biết số PIN của mình

Số PIN do **hệ thống** chọn trong dải của máy, nên người lập hồ sơ không biết trước và người
vào làm càng không. Không ai nói thì ca đầu không quẹt được và bảng công trống — im lặng, không
có lỗi nào báo.

Hai đường bảo đảm người mới biết số:

1. **Chuông báo cho chính nhân viên** — `bao_pin_cho_nhan_vien()` (`nhan_su/bao_pin.ts`), gửi
   cho **mọi tài khoản đang hoạt động** của người đó, chia theo `nguoi_dung.ngon_ngu` qua
   `gui_chuong_ngon_ngu()`. Nội dung nêu đúng số PIN, tên máy đã nhận lệnh, và việc phải dùng
   số đó để đăng ký vân tay/khuôn mặt/thẻ. Thông báo **lưu lại** trong web nên người vào làm
   đăng nhập lần đầu là thấy, kể cả khi lúc đó chưa cài app.
2. **Trong hồ sơ cá nhân** — `GET /api/toi/ho-so` trả `pin_may`; trang Cá nhân hiển thị ở ô
   chỉ số "PIN máy" và ở mục "Tài khoản và chấm công".

**Khi nhân viên chưa có tài khoản** (`tao_tk_he_thong = false`) thì không có đường nào gửi —
hàm trả `false` và phản hồi lưu hồ sơ kèm **cảnh báo nêu đúng số PIN**, để người lập hồ sơ báo
trực tiếp. Cảnh báo này cố ý mang số PIN: một câu "chưa gửi được thông báo" mà không có số thì
người đọc vẫn phải mở hồ sơ ra tra.

Với luồng có checklist nhập việc, **mục 3 mang luôn số PIN**
(`Cấp số PIN 1013 + đẩy xuống máy cửa`) — người đi cài máy không phải mở lại hồ sơ. Vì số PIN
khác nhau từng người, `tick_pin_may_cua_nhan()` khớp mục này theo **tiền tố** (`Cấp số PIN`),
không khớp nguyên văn.

## 4. Cấu hình

```bash
# Microsoft 365
MS365_TAO_TAI_KHOAN_BAT=1
MS365_SKU_BASIC=<skuId Business Basic>       # bắt buộc
MS365_SKU_STANDARD=<skuId Business Standard> # chỉ dùng khi chọn đích danh

# ERP1
ERP1_WEBHOOK_URL=
ERP1_WEBHOOK_SECRET=
```

Cần thêm cột `thiet_bi.khoi_id` cho **từng máy** — migration 112 gán sẵn cặp máy Văn Phòng; máy
của khối kho phải gán tay ở trang Thiết bị.

## 5. Nơi cài đặt

| Việc | Tệp |
| --- | --- |
| Khuôn mã, đếm số thứ tự, phần MMYY | `may_chu/src/dinh_danh/ma_nhan_su.ts` |
| Migration: `khoi.ma_ngan`, `dem_ma_nhan_su`, `thiet_bi.khoi_id` | `may_chu/migrations/112_ma_nhan_su_tu_sinh.sql` |
| Chọn máy theo khối + đẩy lệnh | `may_chu/src/nhan_su/day_pin_may.ts` |
| Luồng tạo hồ sơ (kể cả việc nhập việc) | `may_chu/src/nhan_su/tao_ho_so.ts` |
| Gán vị trí Tổ chức & trách nhiệm khi tạo | `may_chu/src/to_chuc/ghi.ts` (`gan_vi_tri_khi_tao_ho_so`) |
| Loại/kì hạn hợp đồng + tính ngày hết hạn | `may_chu/src/nhan_su/hop_dong_khoi_tao.ts` |
| Checklist nhập việc | `may_chu/src/nhan_su/nhap_viec.ts` |
| Cấp lại mã cho người đã có hồ sơ (lệnh IT) | `may_chu/src/dinh_danh/cap_lai_ma.ts` · `chay_cap_lai_ma.ts` |
| Chuông "có nhân sự mới" | `may_chu/src/nhan_su/bao_nhan_su_moi.ts` |
| Chuông "PIN của bạn là …" | `may_chu/src/nhan_su/bao_pin.ts` |
| Chia người nhận theo ngôn ngữ | `may_chu/src/su_kien/gui_chuong_ngon_ngu.ts` |
| Nguồn danh sách Microsoft 365 | `may_chu/src/tuyen/nguon_ms365.ts` |
| API | `POST /api/nhan-vien` (`may_chu/src/tuyen/danh_muc.ts`) |
| Form | `web/src/trang/nhan_vien.tsx` |

## 6. Kiểm thử

```bash
npm --workspace may_chu test          # gồm test/ma_nhan_su.test.ts (khuôn mã + bẫy múi giờ)
npm --workspace may_chu run test_e2e  # cần DB chamcong_test*
```

`ma_nhan_su.test.ts` khóa: khuôn mã; số quá 4 chữ số không bị cắt; mã cũ (`NV0156`, `ERP69`,
`TAM14`) **không** khớp khuôn mới; và bẫy múi giờ — 18:00 UTC ngày 31/05 là 01/06 **giờ máy chấm
công**, nên phải ra `0626` chứ không phải `0526`.

`tao_ho_so_e2e.test.ts` khóa thêm: nhân viên nhận được chuông mang **đúng số PIN** và tên máy;
người **chưa có tài khoản** thì phản hồi kèm cảnh báo nêu số PIN; mục 3 của checklist mang số
PIN; **cấp lại mã** thì mã cũ đóng lại (giữ lịch sử), cột `ma_nv` đổi theo, số thứ tự tăng, và
người chưa gán khối bị bỏ qua kèm lý do rõ. `song_ngu.test.ts` khóa nội dung thông báo PIN có đủ hai
ngôn ngữ và không sót tham số; `cap_lai_ma.test.ts` khóa khuôn mã và cách chọn ngày sinh mã.

## 7. Cấp lại mã cho người đã có hồ sơ — việc của IT

Người vào trước còn mã kiểu cũ (`ERP69`, `NV0156`, `TAM14`, `BGD`…). Ô `ma_nv` trên form cho gõ
tay, nhưng gõ tay nghĩa là người lập hồ sơ **phải tự bịa số** — và sẽ bịa trùng.

**Không có nút trên giao diện.** Cấp lại mã là đổi danh tính của cả một tập hồ sơ cùng lúc, nên
nó là một **lệnh chạy có chủ đích** trong lúc bảo trì, không phải một cái bấm trong lúc đang làm
việc khác.

### 7.1. Chạy

```bash
# Chạy thử: in ai sẽ đổi thành mã gì, KHÔNG ghi gì
npm --workspace may_chu run cap_lai_ma

# Ghi thật
npm --workspace may_chu run cap_lai_ma -- --that

# Người chưa gán khối: gán luôn khối này rồi cấp mã (chỉ khi tất cả đều thuộc khối đó)
npm --workspace may_chu run cap_lai_ma -- --that --khoi-mac-dinh vp

# Ghi lý do vào lịch sử mã định danh
npm --workspace may_chu run cap_lai_ma -- --that --ly-do "Chuẩn hoá mã 10/2026"
```

Trên VPS (bản đã build):

```bash
docker compose exec -T may_chu node dist/dinh_danh/chay_cap_lai_ma.js            # chạy thử
docker compose exec -T may_chu node dist/dinh_danh/chay_cap_lai_ma.js --that     # ghi thật
```

Chạy thử **tính cả `--khoi-mac-dinh`**: người chưa gán khối hiện đúng mã sẽ được cấp, nên thứ tự
đúng là chạy thử với đủ tham số, đọc danh sách, rồi mới thêm `--that`. Chạy thử **không** ghi khối
vào hồ sơ — chỉ bước `--that` mới gán.

Chỉ đụng tới người **còn mã kiểu cũ**. Người đã có mã đúng khuôn không bị sửa, nên **chạy lại
bao nhiêu lần cũng an toàn** — đó cũng là cách chắc chắn không ai bị đổi mã hai lần.

### 7.2. Cấp lại KHÔNG phải sửa một ô nhập liệu

Ba hệ quả được xử lý trong cùng một chỗ (`may_chu/src/dinh_danh/cap_lai_ma.ts`):

1. **Mã cũ được đóng lại, không xóa** — dòng `noi_bo` cũ nhận `hieu_luc_den`, dòng mới được thêm.
   Câu hỏi "lần quẹt tháng 6 bằng mã `ERP69` là của ai" vẫn trả lời được.
2. **Tên thư mục kho tệp đổi theo** (`dong_bo_thu_muc_nhan_vien`). Đổi thất bại **không** cuộn
   mã vừa cấp: `ho_so_tep.ten_luu` vẫn trỏ đúng chỗ cũ nên tệp vẫn mở được, lần quét định kỳ
   sửa tên sau.
3. **Bản ghi bên cổng phân quyền vẫn mang mã cũ** — hợp đồng với cổng không có động từ đổi mã.
   Lệnh in ra **việc còn lại** ở cuối để người chạy cập nhật tay; hệ thống **không** bịa sự kiện
   (`da_tao` với mã mới sẽ tạo bản ghi mồ côi, `nghi_viec` + `da_tao` thì đá người ta ra khỏi
   cổng — cả hai đã cân nhắc và bỏ).

### 7.3. Ngày dùng để sinh phần `MMYY`

| Có gì | Lấy gì |
| --- | --- |
| `ngay_vao` | ngày vào làm |
| không có `ngay_vao` | ngày **tạo hồ sơ** (`tao_luc`) |
| không có cả hai | hôm nay, theo **giờ máy chấm công** |

Không lấy "hôm nay" khi còn `tao_luc`: mã sẽ mang tháng của lúc cấp lại, không phải lúc vào làm,
và sai vĩnh viễn (`ngay_de_sinh_ma`).

### 7.4. Một người một transaction

Lệnh chạy từng người, không gom cả lo vào một transaction: một cái tên thư mục hỏng không được
làm cuộn cả trăm mã vừa cấp. Người lỗi được in ra riêng ở cuối để xử lý tiếp.

Người **chưa gán khối** bị **bỏ qua** (không đoán khối từ tên phòng ban — đoán sai thì mã sai
vĩnh viễn). Hai cách xử lý: gán khối cho họ ở hồ sơ, hoặc chạy lại với `--khoi-mac-dinh`.

## 8. Việc còn để ngỏ

1. **Khối mới** phải được khai `ma_ngan` — chưa khai thì tạo hồ sơ báo lỗi, và lệnh cấp lại mã
   bỏ qua người thuộc khối đó kèm lý do rõ ràng.
2. **Máy của khối kho** chưa được gán `khoi_id`; gán xong mới đẩy được lệnh cho khối đó.
