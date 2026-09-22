# Webhook ERP1 — sự kiện nhân sự sang ERP mới

> Trạng thái: **ĐÃ TRIỂN KHAI** (v1.104.8: `erp1.nhan_su.nghi_viec`; v1.105.0: thêm
> `erp1.nhan_su.da_tao`) — 2026-09-22
>
> Mục tiêu: hệ thống chấm công gửi webhook sang **ERP1** khi có sự kiện nhân sự để ERP1 tự xử
> lý tài khoản — **nghỉ việc** thì ERP1 vô hiệu hóa tài khoản, **tạo hồ sơ mới** thì ERP1 tự
> thiết lập tài khoản. Không cần nhân sự thao tác tay bên ERP1.

## 1. Kiến trúc hiện tại (tóm tắt)

Hệ thống đã có outbox `hop_thu_di` (một hộp thư, nhiều đích) với 3 đích quyết định theo **loại
sự kiện**:

| Tiền tố loại sự kiện | Đích | Dùng cho |
| --- | --- | --- |
| `ms365.*` | Microsoft Graph | nghỉ việc + tạo tài khoản khi tạo hồ sơ mới |
| `nhan_su.*` | Cổng phân quyền | đã tạo / đổi tên / nghỉ việc / quay lại |
| `erp1.*` | ERP1 (ERP mới) | `erp1.nhan_su.nghi_viec`, `erp1.nhan_su.da_tao` |
| còn lại (`lan_quet.da_ghi`, `bang_cong.da_chot`, …) | ERP cũ | đồng bộ chấm công |

Outbox có sẵn: nhận việc nguyên tử (`for update skip locked`), backoff lũy tiến (trần 1 giờ),
chống trùng bằng `su_kien_id`, chữ ký HMAC cho ERP cũ. **Webhook ERP1 kế thừa toàn bộ cơ chế này
— không viết lại.**

Nghiệp vụ nghỉ việc có **một chỗ duy nhất** là `cho_nghi_viec()` (`may_chu/src/nhan_su/nghi_viec.ts`),
dùng chung cho cả nút thủ công lẫn lịch chạy đêm — nên chỉ cần ghi thêm **một sự kiện** ở đây là
cả hai đường đều được báo.

## 2. Thay đổi thiết kế

### 2.1 Loại sự kiện

```
erp1.nhan_su.nghi_viec     # nghi viec -> ERP1 vo hieu hoa tai khoan
```

```
erp1.nhan_su.da_tao       # tao ho so nhan su moi -> ERP1 thiet lap tai khoan
```

Chọn tiền tố `erp1.` (không phải `nhan_su.`): router hiện tại gửi `nhan_su.*` sang **cổng** —
đặt tên lẫn vào đó sẽ làm sự kiện đi nhầm đích. Thêm một nhánh `di_sang_erp1()` kiểm tra tiền tố
`erp1.` **trước** nhánh ERP cũ trong `gui_mot()`.

### 2.2 Hợp đồng webhook (phía ERP1 nhận)

- **Method**: `POST`
- **URL**: từ biến môi trường `ERP1_WEBHOOK_URL` (khai trống = tính năng tắt, sự kiện nằm lại
  hộp thư chờ — giống hệt ERP cũ).
- **Headers**:
  - `content-type: application/json`
  - `x-cham-cong-signature`: HMAC-SHA256 của **thân JSON** với `ERP1_WEBHOOK_SECRET`, mã hóa
    hex. (ERP1 dùng nó để chắc sự kiện thật sự đến từ hệ thống chấm công; không khai secret thì
    không gửi header này — phòng môi trường nội bộ không cần.)
- **Body** (định danh đầy đủ để ERP1 khớp tài khoản, ERP1 tự chọn trường nó quản lý):

```json
{
  "su_kien_id": "chamcong-18234",
  "loai_su_kien": "erp1.nhan_su.nghi_viec",
  "ma_nv": "NV0123",
  "ma_erp": "THVN-0456",
  "email": "nguyenvana@tranhoangvietnam.com",
  "ngay_nghi_viec": "2026-09-22",
  "luc": "2026-09-22T01:05:00+07:00"
}
```

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `su_kien_id` | string | `chamcong-<id dong outbox>` — **ổn định** qua mọi lần gửi lại; ERP1 chống trùng bằng `unique(su_kien_id) + on conflict do nothing` (cùng mẫu cổng phân quyền đang dùng) |
| `ma_nv` | string | mã nhân viên nội bộ — luôn có |
| `ma_erp` | string \| null | "Mã bên ERP" đã khai trong hồ sơ nhân viên (nếu có) |
| `email` | string \| null | email hồ sơ (nếu có) |
| `ngay_nghi_viec` | string | `YYYY-MM-DD` |
| `luc` | string | thời điểm hệ thống thực hiện (ISO-8601) |

ERP1 nhận `200` (hoặc 2xx) là xong. Trả 4xx/5xx thì hệ thống coi là thất bại và gửi lại theo
backoff — hợp đồng **không** yêu cầu ERP1 trả về nội dung cụ thể.

### 2.2b Hợp đồng `erp1.nhan_su.da_tao`

Cùng method / URL / headers / chống trùng như trên. Thân:

```json
{
  "su_kien_id": "chamcong-21991",
  "loai_su_kien": "erp1.nhan_su.da_tao",
  "ma_nv": "NV0156",
  "ma_erp": "THVN-0789",
  "email": "tranthib@tranhoangvietnam.com",
  "ho_ten": "Trần Thị Bình",
  "so_dien_thoai": "0912345678",
  "ngay_vao": "2026-09-22",
  "pin_may": "1013"
}
```

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `su_kien_id` | string | `chamcong-<id dong outbox>` — ổn định qua mọi lần gửi lại |
| `loai_su_kien` | string | `erp1.nhan_su.da_tao` |
| `ma_nv` | string | mã nhân viên nội bộ — luôn có |
| `ma_erp` | string \| null | "Mã bên ERP" đã khai trong hồ sơ (nếu có) |
| `email` | string \| null | email hồ sơ (nếu có) |
| `ho_ten` | string | họ tên đầy đủ |
| `so_dien_thoai` | string \| null | số điện thoại (nếu có) |
| `ngay_vao` | string \| null | `YYYY-MM-DD` (nếu khai) |
| `pin_may` | string \| null | PIN máy chấm công (kể cả PIN vừa tự cấp) |

Điểm ghi: `POST /api/nhan-vien` (`may_chu/src/tuyen/danh_muc.ts`), cùng transaction với dòng
nhân viên. Chi tiết luồng xem `tai_lieu/TAO-HO-SO-NHAN-SU.md`.

### 2.3 Cấu hình

Thêm nhánh `erp1` trong `may_chu/src/cau_hinh.ts`:

```ts
erp1: {
  webhook_url: chu('ERP1_WEBHOOK_URL', ''),
  webhook_secret: chu('ERP1_WEBHOOK_SECRET', ''),
},
```

Thêm vào `.env.example` (kèm chú thích như hai dòng `ERP_WEBHOOK_*`). Không đụng cấu hình ERP
cũ — hai ERP chạy song song độc lập.

### 2.4 Điểm ghi sự kiện

Trong `cho_nghi_viec()` (cùng transaction), sau khi khóa nhân viên:

```ts
await ghi_su_kien('erp1.nhan_su.nghi_viec', {
  ma_nv: dong.ma_nv,
  ma_erp: dong.ma_erp,
  email: dong.email,
  ngay_nghi_viec: <ngay da ap dung>,
  luc: <gio dia phuong, ISO>,
}, khach);
```

Câu UPDATE hiện tại đang `returning ma_nv` — mở rộng `returning ma_nv, ma_erp, email`. Ghi cùng
transaction nên **không bao giờ mất** sự kiện kể cả khi máy chủ sập ngay sau đó.

### 2.5 Đích và lịch đẩy

- `co_dich()` thêm điều kiện `cau_hinh.erp1.webhook_url !== ''`.
- `gui_mot()` thêm nhánh: `if (di_sang_erp1(loai)) return gui_sang_erp1(d);`
- `gui_sang_erp1()`: copy mẫu của `gui_sang_erp1` ERP cũ (timeout 15s, HMAC, ném lỗi rõ khi 4xx/5xx
  để outbox giữ lại và thử lại). Nếu `ERP1_WEBHOOK_URL` trống thì **ném lỗi** (sự kiện nằm chờ),
  không đánh dấu đã gửi.

### 2.6 Điều gì KHÔNG đổi

- Bảng `hop_thu_di` giữ nguyên (loại sự kiện là text tự do).
- Cổng phân quyền vẫn nhận `nhan_su.*` như cũ.
- Microsoft Graph vẫn nhận `ms365.*` như cũ.
- ERP cũ vẫn nhận đúng 5 loại như cũ.
- Web vẫn có nút "Cho nghỉ việc" / quyết định nghỉ việc — hành vi không đổi, chỉ thêm một đích báo.

## 3. Danh sách tệp đã sửa

| Tệp | Việc |
| --- | --- |
| `may_chu/src/cau_hinh.ts` | nhánh `erp1` (v1.104.8) |
| `may_chu/src/su_kien/hop_thu_di.ts` | `di_sang_erp1()`, `gui_sang_erp1()`, `dung_than_erp1()` + `dung_than_erp1_da_tao()` (v1.105.0) |
| `may_chu/src/nhan_su/nghi_viec.ts` | ghi sự kiện `erp1.nhan_su.nghi_viec` (v1.104.8) |
| `may_chu/src/tuyen/danh_muc.ts` | ghi sự kiện `erp1.nhan_su.da_tao` khi tạo nhân viên (v1.105.0) |
| `.env.example` | `ERP1_WEBHOOK_URL`, `ERP1_WEBHOOK_SECRET` |
| `may_chu/test/erp1_webhook.test.ts` | test đơn vị: khuôn cả hai loại + định tuyến |
| `tai_lieu/WEBHOOK-ERP1.md` | tài liệu này |
| `CHANGELOG.md` | mục mới + tăng phiên bản |

## 4. Kiểm thử

1. **Đơn vị**: payload đúng hình dạng (cả hai loại); `di_sang_erp1('erp1.*') === true` và
   `nhan_su.*` KHÔNG bị bắt nhầm; khi `ERP1_WEBHOOK_URL` trống thì ném lỗi (không nuốt).
2. **E2E cục bộ/VPS**: dựng một máy nhận webhook tạm (hoặc `webhook.site`), cho một nhân viên thử
   nghỉ việc / tạo hồ sơ mới → kiểm tra nhận đúng JSON + chữ ký khớp; gửi lại thủ công →
   `su_kien_id` không đổi.
3. **Bên ERP1**: xác minh chữ ký, `unique(su_kien_id)`, map `ma_erp`/`email` → tài khoản. Cần
   phía ERP1 cung cấp URL nhận + cách họ khớp tài khoản (mã gì).

## 5. Câu hỏi cần chốt trước khi code

1. ERP1 khớp tài khoản bằng trường nào: `ma_erp`, `email`, hay `ma_nv`? (Thiết kế gửi cả ba —
   nhưng nếu ERP1 chỉ quản lý một trường thì cần xác nhận để tài liệu ghi rõ trường bắt buộc.)
2. Có cần chữ ký HMAC không, hay nội bộ bỏ qua? (Mặc định thiết kế: có, nếu khai secret.)
3. URL webhook ERP1 đã có chưa, hay đang chờ phía ERP1 dựng endpoint?
