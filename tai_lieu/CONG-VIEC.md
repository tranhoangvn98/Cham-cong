# Quản lý công việc (module Công việc)

Phiên bản: 1.100.0 (2026-09-20)

## Vị trí

- Web quản trị: menu **Công việc** (`/cong-viec`) — dành cho Giám đốc (admin), Nhân sự,
  Trưởng phòng.
- Web cá nhân: tab **Công việc** trong **Khu vực của tôi** (`/ca-nhan/viec`) — mọi người.
- App di động: tab **Công việc** (danh sách + lịch gantt 14 ngày).

## Hai giao diện chính

1. **Danh sách (checklist)** — việc kèm hạn, nguồn giao, ưu tiên; mở chi tiết để tick các
   bước con và nộp kết quả.
2. **Gantt** — toàn cảnh việc theo ngày (quản trị: cả đội/phòng; cá nhân: việc của mình).
   Tự dựng bằng CSS, không phụ thuộc thư viện.

## Luồng một công việc

```
giao việc (moi) -> bắt đầu (dang_lam) -> nộp kết quả (cho_duyet)
    -> người giao xác nhận (hoan_thanh) | yêu cầu làm lại (dang_lam) | hủy (huy)
hết hạn chưa nộp -> KHONG HOAN THANH (tự động, không có gia hạn)
```

- Chỉ **người nhận** được bắt đầu, tick bước con, nộp kết quả.
- Chỉ **người giao** (hoặc Nhân sự/admin) được xác nhận hoàn thành, yêu cầu làm lại (kèm lý
  do), hủy (kèm lý do).
- Không có chế độ gia hạn: quá hạn là quá hạn, chuyển `khong_hoan_thanh` và đi vào KPI.

## Nguồn công việc (thứ tự ưu tiên)

| Nguồn | Ý nghĩa | Ai tạo |
|---|---|---|
| `giam_doc` | Giám đốc giao — ưu tiên cao nhất | admin |
| `he_thong` | Hệ thống giao qua workflow | lịch chạy / giám sát máy |
| `truong_phong` | Trưởng phòng giao người trong phòng | trưởng phòng |
| `lien_phong` | Việc liên phòng ban | trưởng phòng giao người phòng khác |
| `tu_tao` | Tự tạo việc cho chính mình | nhân viên |
| `ho_so` | Di sản tab Công việc trong hồ sơ nhân sự | route hồ sơ |

Danh sách sắp xếp: quá hạn → hạn gần → ưu tiên nguồn → mức ưu tiên.

## Việc định kỳ (lặp đi lặp lại)

- Trưởng phòng / Nhân sự / admin tạo mẫu ở tab **Định kỳ**: hằng ngày, hằng tuần (chọn thứ),
  hằng tháng (chọn ngày, ngày 31 = cuối tháng), hoặc mỗi N ngày; kèm giờ hạn và khoảng
  bắt đầu–kết thúc.
- Hằng đêm sau 01:00 (giờ máy chấm công) hệ thống sinh các việc đến hạn trong ngày. Sinh
  theo **lịch cố định**, không chờ bản trước hoàn thành (không có gia hạn).
- Mỗi lần sinh có khóa chống trùng `dinh_ky:<mau>:<ngay>` — nhiều máy chủ chạy song song
  cũng không sinh đúp.

## Workflow hệ thống (tab Workflow, chỉ Nhân sự/admin)

Sự kiện nội bộ → tự động giao việc theo cấu hình (bật/tắt, người nhận, hạn sau N giờ):

| Mã | Sự kiện | Người nhận khả dụng |
|---|---|---|
| `may_mat_ket_noi` | Máy chấm công mất kết nối | người cố định |
| `don_cho_duyet_qua_han` | Đơn chờ duyệt quá lâu (quét hằng đêm) | người cố định hoặc trưởng phòng liên quan |
| `hop_dong_sap_het_han` | Có hợp đồng sắp hết hạn (quét nhắc hạn) | người cố định |

Chống trùng: mỗi việc sinh ra có khóa theo bối cảnh (ví dụ `may_mat_ket_noi:<serial>:<ngày>`)
— một máy mất kết nối nhiều lần trong ngày chỉ ra một việc.

## KPI xếp loại

Việc quá hạn đi thẳng vào chỉ số KPI nguồn **Công việc**:

- `so_cong_viec_hoan_thanh` / `so_cong_viec_dung_han` / `ty_le_dung_han` (có sẵn),
- `so_cong_viec_khong_hoan_thanh` (mới) — đếm việc chuyển `khong_hoan_thanh` trong kỳ.

Chỉ số mới khai trong danh mục KPI như các chỉ số khác (trang KPI → Danh mục).

## Quyền

- Nhân viên: xem/tạo việc của chính mình, nộp kết quả.
- Trưởng phòng: giao việc cho phòng mình và phòng khác, duyệt việc mình giao, xem việc của
  phòng mình, tạo nhóm/định kỳ.
- Nhân sự: xem tất cả, cấu hình workflow.
- Admin (Giám đốc): như nhân sự, nguồn việc là `giam_doc` (ưu tiên cao nhất).

Việc ngoài phạm vi trả **404** (không tiết lộ sự tồn tại).

## Tách bạch với tab Công việc trong hồ sơ nhân sự

Bảng `cong_viec` dùng chung. Dòng do module này quản lý (`nguon != 'ho_so'`) **không** sửa
được qua tab hồ sơ nhân sự — phải xử lý ở trang Công việc (nộp → duyệt). Dòng cũ
(`nguon = 'ho_so'`) giữ nguyên hành vi: trưởng phòng/nhân sự nhập tay, nhân viên tự cập
nhật trạng thái/kết quả của mình.

## Lịch chạy liên quan

- Mỗi vòng lịch chạy: quét việc quá hạn (`han_moc < now()`) → `khong_hoan_thanh` + chuông
  báo cho người nhận, người giao, người duyệt.
- Sau 01:00: sinh việc định kỳ + quét đơn chờ duyệt quá hạn (workflow).

## API chính (prefix `/api/viec`)

`GET /toi` · `GET /gantt?tu&den` · `GET /:id` · `POST /` · `PATCH /:id/trang-thai` ·
`PATCH /:id/nop` · `PATCH /:id/duyet` · `PATCH /:id/huy` · `PATCH /:id/hanh-dong/:hid` ·
`GET|POST /nhom` · `GET|POST /mau-dinh-ky` · `PATCH /mau-dinh-ky/:id` ·
`GET /workflow` · `PATCH /workflow/:ma`.
