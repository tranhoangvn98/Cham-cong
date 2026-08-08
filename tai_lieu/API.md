# REST API

Máy chủ mặc định ở `http://localhost:8080`.

## Xác thực

Đăng nhập trả về **hai** token:

- `token_truy_cap` — gửi ở header `Authorization: Bearer <token>` cho mọi yêu cầu. Sống
  15 phút.
- `token_lam_moi` — chỉ dùng cho `POST /api/xac-thuc/lam-moi`. Sống 30 ngày.

Token làm mới **có xoay**: mỗi lần làm mới, token cũ bị thu hồi và bạn nhận token mới.
Dùng lại token đã thu hồi bị coi là dấu hiệu bị đánh cắp — hệ thống thu hồi **toàn bộ**
phiên của người đó. Client phải bảo đảm nhiều yêu cầu 401 song song chỉ làm mới **một
lần** (cả webapp và app điện thoại đều làm vậy).

Token làm mới **không** dùng được để gọi API — bị trả 401.

### Múi giờ

Phản hồi đăng nhập chứa `mui_gio_offset_gio` (mặc định `7`). Mọi mốc thời gian trong API
là ISO 8601 UTC; client **phải** hiển thị theo offset này, **không** theo múi giờ của
thiết bị. Giờ chấm công là giờ tại nơi đặt máy — nhân viên đi công tác sang múi giờ khác
vẫn phải thấy đúng giờ công ty.

### Lỗi

Mọi lỗi trả về `{ "loi": "<thông điệp tiếng Việt hiển thị được cho người dùng>" }`.

| Mã | Ý nghĩa |
|---|---|
| 400 | Dữ liệu gửi lên không hợp lệ |
| 401 | Chưa đăng nhập / token hết hạn |
| 403 | Không có quyền |
| 404 | Không tìm thấy (cũng dùng để **không tiết lộ** dữ liệu ngoài phạm vi của bạn) |
| 409 | Xung đột (trùng dữ liệu, đơn trùng khoảng ngày, chấm công quá nhanh) |
| 429 | Vượt giới hạn tốc độ |
| 500 | Lỗi hệ thống (chi tiết chỉ ghi vào log máy chủ, không trả ra ngoài) |

### Vai trò

`admin` › `nhan_su` › `truong_phong` › `nhan_vien`. Cột "Quyền" dưới đây là **mức tối
thiểu**.

---

## 1. Xác thực — `/api/xac-thuc`

| Method | Đường dẫn | Quyền | Ghi chú |
|---|---|---|---|
| POST | `/dang-nhap` | — | `{ten_dang_nhap, mat_khau, thiet_bi?}`. Giới hạn 10 lần/phút/IP |
| POST | `/lam-moi` | — | `{token_lam_moi}` |
| POST | `/dang-xuat` | — | `{token_lam_moi?}` |
| GET | `/toi` | mọi vai trò | Thông tin phiên hiện tại |
| POST | `/doi-mat-khau` | mọi vai trò | `{mat_khau_cu, mat_khau_moi}`. Thu hồi mọi phiên |

```bash
curl -X POST http://localhost:8080/api/xac-thuc/dang-nhap \
  -H 'content-type: application/json' \
  -d '{"ten_dang_nhap":"admin","mat_khau":"..."}'
```

## 2. Danh mục — `/api`

### Phòng ban

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/phong-ban` | mọi vai trò |
| POST | `/phong-ban` | nhan_su |
| PATCH | `/phong-ban/:id` | nhan_su |

### Ca làm việc

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/ca-lam` | mọi vai trò |
| POST | `/ca-lam` | nhan_su |
| PUT | `/ca-lam/:id` | nhan_su |
| DELETE | `/ca-lam/:id` | nhan_su (chỉ vô hiệu hóa, không xóa thật) |

```json
{
  "ten": "Hành chính",
  "gio_vao": "08:00", "gio_ra": "17:00",
  "nghi_tu": "12:00", "nghi_den": "13:30",
  "dung_sai_muon_phut": 5, "dung_sai_som_phut": 5,
  "nguong_ot_phut": 30, "phut_du_cong": 420,
  "qua_dem": false,
  "cac_ngay_lam": [1, 2, 3, 4, 5]
}
```

`cac_ngay_lam`: `0` = Chủ nhật … `6` = Thứ 7.
`qua_dem`: bật cho ca đêm có `gio_ra` thuộc ngày hôm sau.

> Sửa ca **không** tự tính lại bảng công cũ — gọi `POST /bang-cong/tinh-lai` sau đó.

### Nhân viên

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/nhan-vien?tim=&chi_dang_lam=` | mọi vai trò (đã lọc theo phạm vi) |
| POST | `/nhan-vien` | nhan_su |
| PUT | `/nhan-vien/:id` | nhan_su |
| POST | `/nhan-vien/:id/nghi-viec` | nhan_su |

`pin_may` là **khóa nối máy chấm công với nhân viên** — chỉ chữ số, phải khớp User ID
trên máy. Không có PIN thì log về không map được vào ai.

`duoc_cham_cong_dien_thoai` mặc định `false`; chỉ bật cho người đi công tác.

### Máy chấm công

| Method | Đường dẫn | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/thiet-bi` | mọi vai trò | Kèm `dang_online`, `lenh_cho` |
| POST | `/thiet-bi` | nhan_su | `{serial, ten, vi_tri?}` |
| PATCH | `/thiet-bi/:id` | nhan_su | Bật/tắt máy |
| POST | `/thiet-bi/:serial/nap-nhan-vien` | nhan_su | Tạo user trên máy theo PIN |
| DELETE | `/thiet-bi/:serial/nhan-vien/:pin` | nhan_su | Xóa user trên máy |
| POST | `/thiet-bi/:serial/dong-bo-gio` | nhan_su | Đồng bộ đồng hồ máy |
| POST | `/thiet-bi/:serial/gui-lai-log` | nhan_su | Yêu cầu máy đẩy lại log |
| GET | `/thiet-bi/:serial/lenh` | nhan_su | Lịch sử lệnh + mã trả về |

Lệnh vào hàng đợi bền vững trong CSDL; máy nhận ở lần poll kế tiếp (thường dưới 10 giây).

### Địa điểm (geofence), ngày lễ, tài khoản

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET / POST | `/dia-diem` | GET: mọi vai trò · POST: nhan_su |
| PATCH | `/dia-diem/:id` | nhan_su |
| GET | `/ngay-le?nam=2026` | mọi vai trò |
| POST | `/ngay-le` | nhan_su (tự tính lại ngày đó) |
| DELETE | `/ngay-le/:ngay` | nhan_su (tự tính lại ngày đó) |
| GET / POST | `/nguoi-dung` | **admin** |
| POST | `/nguoi-dung/:id/dat-lai-mat-khau` | **admin** |
| PATCH | `/nguoi-dung/:id` | **admin** |
| GET | `/nhat-ky?gioi_han=100` | **admin** |

## 3. Bảng công — `/api`

| Method | Đường dẫn | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/bang-cong?tu=&den=&nhan_vien_id=&phong_ban_id=` | mọi vai trò | Tối đa 92 ngày |
| GET | `/bang-cong/tong-hop?thang=YYYY-MM&phong_ban_id=` | mọi vai trò | Tổng hợp theo người |
| GET | `/bang-cong/xuat-csv?thang=YYYY-MM` | nhan_su | CSV có BOM UTF-8 |
| POST | `/bang-cong/tinh-lai` | nhan_su | `{tu, den, nhan_vien_id?}` |
| PATCH | `/bang-cong/:nhan_vien_id/:ngay` | nhan_su | Sửa tay `{so_cong?, phut_ot?, ghi_chu?, da_chot?}` |
| POST | `/bang-cong/chot-thang` | nhan_su | `{thang}` |
| POST | `/bang-cong/mo-chot-thang` | nhan_su | `{thang}` |
| GET | `/lan-quet?tu=&den=&nhan_vien_id=&thiet_bi_serial=&nguon=&trang_thai_duyet=` | mọi vai trò | Dữ liệu thô, tối đa 31 ngày |
| GET | `/lan-quet/xuat-csv?tu=&den=&...` | nhan_su | CSV có BOM UTF-8, giữ nguyên bộ lọc |
| GET | `/lan-quet/chua-map` | nhan_su | PIN chưa gán nhân viên nào |
| POST | `/lan-quet/gan-lai` | nhan_su | `{pin_may, nhan_vien_id}` — gán bù và tính lại |
| GET | `/dashboard` | mọi vai trò | Tổng quan hôm nay + trạng thái máy |

Phạm vi dữ liệu tự lọc theo vai trò: `nhan_vien` chỉ thấy của mình, `truong_phong` chỉ
thấy phòng mình.

**Ngày đã chốt (`da_chot = true`) không bị tính lại**, kể cả khi có lần quẹt mới về.

### 3.1. Nhập hàng loạt từ file — `/api`

| Method | Đường dẫn | Quyền | Trần thân yêu cầu |
|---|---|---|---|
| POST | `/nhap/nhan-vien` | nhan_su | 6 MB · tối đa 5.000 dòng |
| POST | `/nhap/lan-quet` | nhan_su | 24 MB |

Thân: `{ noi_dung, xem_truoc, ... }`. `noi_dung` là nguyên văn tệp CSV/TSV/ATTLOG.

**`xem_truoc` mặc định `true`.** Ở chế độ này máy chủ kiểm toàn bộ tệp và trả về kết quả
từng dòng nhưng **không ghi gì**. Phải gọi lại với `xem_truoc: false` mới ghi thật.

- Bộ đọc tự nhận dấu phân cách (`,` `;` TAB), bỏ BOM, chấp nhận ô bọc trong dấu nháy.
  Tên cột đối chiếu sau khi bỏ dấu tiếng Việt, nên `Mã NV` / `ma_nv` / `MÃ NV` như nhau.
- `/nhap/nhan-vien` đối chiếu theo `ma_nv`: có rồi thì cập nhật, chưa có thì tạo — **không
  bao giờ xóa ai**. Ô để trống nghĩa là *giữ nguyên*, không phải xóa. Bắt buộc có cột mã
  nhân viên và họ tên. `tao_thieu: true` cho phép tự tạo phòng ban chưa có; ca làm thì
  luôn phải khai tay vì còn giờ vào/ra.
  - Trả về: `{tong, se_tao, se_cap_nhat, loi, dong: [...]}`.
- `/nhap/lan-quet` nhận cả ATTLOG thô của máy lẫn CSV có dòng tiêu đề (ngày và giờ tách
  làm hai cột cũng được), rồi đẩy qua **đúng đường tiếp nhận của máy thật** — cùng bộ chống
  trùng, cùng cách map PIN, cùng bước tính lại bảng công. Nhập lại cùng một tệp không nhân
  đôi công. `serial` (mặc định `NHAP-TU-TEP`) tham gia khóa chống trùng, nên chọn đúng máy
  nếu tệp do chính máy đó xuất ra.
  - Xem trước trả về: `{ban_ghi, dong_bo_qua, som_nhat, muon_nhat, so_pin, chua_map_pin}`.
  - Ghi thật trả về: `{tong, da_nhan, trung, dong_loi, chua_map_pin}`.

Cả hai đều ghi nhật ký kiểm toán khi ghi thật.

## 4. Duyệt đơn — `/api/duyet`

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/nghi-phep?trang_thai=cho_duyet` | truong_phong |
| POST | `/nghi-phep/:id/quyet` | truong_phong |
| GET | `/giai-trinh?trang_thai=` | truong_phong |
| POST | `/giai-trinh/:id/quyet` | truong_phong |
| GET | `/quet-dien-thoai` | truong_phong |
| POST | `/quet-dien-thoai/:id/quyet` | truong_phong |

Thân yêu cầu: `{ "quyet_dinh": "da_duyet" | "tu_choi", "ghi_chu": "..." }`

Duyệt xong hệ thống **tự tính lại** bảng công của những ngày liên quan. Trưởng phòng chỉ
quyết được đơn của nhân viên trong phòng mình — ngoài phạm vi trả **404** (không tiết lộ
đơn đó tồn tại). Đơn đã xử lý không quyết lại được (400).

## 5. Self-service cho app — `/api/toi`

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET | `/hom-nay` | Bảng công hôm nay + lần quẹt + ca + dải tuần T2–CN + tổng hợp tháng + quỹ phép + việc cần chú ý |
| GET | `/bang-cong?thang=YYYY-MM` | Bảng công tháng của chính mình |
| GET | `/luong?thang=YYYY-MM` | Cơ sở tính lương của kỳ — xem dưới |
| GET | `/lan-quet?tu=&den=` | Lần quẹt của chính mình, tối đa 62 ngày |
| GET | `/dia-diem` | Các địa điểm đang dùng |
| POST | `/cham-cong` | **multipart** — xem dưới |
| GET | `/anh/:id` | Ảnh selfie (chỉ chủ ảnh / nhân sự / trưởng phòng cùng phòng) |
| GET / POST | `/nghi-phep` | Xem / gửi đơn nghỉ phép |
| POST | `/nghi-phep/:id/huy` | Hủy đơn của mình |
| GET / POST | `/giai-trinh` | Xem / gửi đơn giải trình quên quẹt |
| POST / DELETE | `/token-push` | Đăng ký / bỏ token thông báo đẩy |

### `GET /api/toi/luong`

Trả **dữ liệu chấm công làm căn cứ tính lương**, không trả số tiền:

```json
{
  "thang": "2026-08",
  "co_so_tinh_luong": { "tong_cong": "4.0", "tong_phut_lam": 1800, "tong_phut_ot": 130, "...": "..." },
  "phep": { "quy": 12, "da_dung": 1, "con_lai": 11, "cho_duyet": 0 },
  "da_chot": false,
  "phieu_luong": null,
  "ghi_chu_ot": "Số phút OT ở đây là OT máy ghi nhận, chưa qua duyệt...",
  "ly_do_chua_co_phieu_luong": "Phiếu lương sẽ hiển thị sau khi kế toán cấu hình kỳ lương..."
}
```

`phieu_luong` là `null` cho tới khi Module C (tính lương + BHXH + thuế TNCN) được triển khai.
Endpoint này **không** được trả số tiền ước tính — bày số lương sai sinh ra kỳ vọng sai về thu
nhập, tác hại lớn hơn tiện lợi của một màn hình đầy đủ. Có test e2e chặn việc thêm trường tiền
lương vào đây.

`co_so_tinh_luong` dùng **cùng một câu truy vấn** với `tong_hop` của `/bang-cong`, nên hai màn
không bao giờ ra hai con số khác nhau (có test e2e đối chiếu).

### `POST /api/toi/cham-cong`

`multipart/form-data`, giới hạn 12 lần/giờ/IP:

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `vi_do`, `kinh_do` | có | Toạ độ GPS |
| `do_chinh_xac_m` | không | Độ chính xác máy báo |
| `trang_thai` | không | `0` chấm vào (mặc định), `1` chấm ra |
| `gps_gia_lap` | không | `true` nếu máy báo toạ độ do app giả lập tạo ra |
| `anh` | có | Ảnh selfie JPEG/PNG, tối đa 3 MB |

Điều kiện: nhân viên phải được bật `duoc_cham_cong_dien_thoai`, và cách lần chấm công
trước ít nhất 60 giây.

Phản hồi có `trang_thai_duyet`:

- `tu_dong` — trong bán kính địa điểm và không có dấu hiệu giả lập GPS → **tính công ngay**
- `cho_duyet` — ngoài bán kính, hoặc GPS bị giả lập, hoặc chưa khai địa điểm nào →
  **chưa tính công** cho tới khi nhân sự duyệt

Ảnh được kiểm **magic byte** (không tin `content-type` client gửi), tên tệp do máy chủ
sinh hoàn toàn, và không bao giờ phục vụ tĩnh.

## 6. Giao thức máy — `/iclock`

Máy ZKTeco gọi, **không dùng JWT** — xác thực bằng whitelist serial. Không nên đưa nhóm
đường dẫn này ra Internet.

| Method | Đường dẫn |
|---|---|
| GET | `/cdata?SN=..&options=all` |
| POST | `/cdata?SN=..&table=ATTLOG\|OPTIONS\|OPERLOG` |
| GET | `/getrequest?SN=..` |
| POST | `/devicecmd?SN=..` |
| GET | `/ping?SN=..` |

Chi tiết định dạng: [`KET-NOI-MAY-ZKTECO.md`](KET-NOI-MAY-ZKTECO.md).

## 7. Sức khỏe hệ thống

```
GET /health   →  { "trang_thai": "ok", "csdl": "ok", "luc": "..." }
```

HTTP 503 khi không kết nối được cơ sở dữ liệu.
