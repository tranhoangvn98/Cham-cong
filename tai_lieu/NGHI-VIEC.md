# Quy trình thôi việc tự động (đặc tả kỹ thuật 01/2026/ĐTKT-IT)

Hệ thống chạy **MỘT luồng nghỉ việc duy nhất** cho mọi trường hợp, chia nhánh theo **loại
hợp đồng** (đặc tả chi tiết + bảng căn cứ pháp lý: `tai_lieu/THIET-KE-LUONG-NGHI-VIEC.md`).
Mọi cách vào — đơn nhân viên, quyết định nghỉ việc của công ty, nghỉ không bàn giao khẩn cấp —
đều tạo/cập nhật đúng một `quy_trinh_thoi_viec`; **một người chỉ có một quy trình đang mở**.

Chỉ 3 chủ thể: **Admin** (duyệt 2 lần), **Nhân viên** (làm checklist), **Hệ thống** (mọi việc
còn lại).

## Máy trạng thái

```
đơn thôi việc (cho_duyet) ─┐
quyết định nghỉ việc ──────┼─► quy_trinh_thoi_viec (checklist theo loại HĐ) ─► dang_thuc_hien
nghỉ không bàn giao ───────┘        (quy trình đã đóng, mọi mục bỏ qua kèm lý do)

dang_thuc_hien
  ├─ nhân viên tick mục 'nhan_vien' (trang /thoi-viec/huong-dan)
  ├─ tiến trình nền tự tick mục 'tu_dong' (lương, phép, trợ cấp, hạn báo trước, bàn giao việc)
  └─ mọi mục bắt buộc = xong ──► san_sang_chot (tự động)
san_sang_chot
  └─►[CỔNG 2] Admin duyệt cuối + chốt lastday + "Chạy dừng hoạt động"
        └─ chay_dung_hoat_dong() ──► da_khoa
bất kỳ trạng thái ──[Admin hủy]──► da_huy
```

Bất biến chống mất dữ liệu: script dừng hoạt động **chỉ chạy được** khi mọi mục checklist
bắt buộc đã `xong`/`bo_qua` và lastday đã chốt. Không có đường nào cắt truy cập trước khi
bàn giao xong — điều kiện nằm trong **cả** code (`kiem_dieu_kien_chay`) lẫn ràng buộc CSDL.

## Cổng 1 — duyệt đơn thôi việc

Duyệt đơn `thoi_viec` trên trang **Duyệt đơn** như mọi đơn khác. Ngay trong cùng một
transaction, hệ thống:

1. Sinh 1 bản ghi `quy_trinh_thoi_viec` (unique theo `don_tu_id`), chụp `loai_hop_dong`
   (HĐ đang hiệu lực mới nhất), `chuc_danh`, `ngay_lam_viec_cuoi = don_tu.tu_ngay`.
   Nếu người đó đã có quy trình đang mở thì **cập nhật lastday** của quy trình đó, không tạo
   quy trình thứ hai.
2. Phát sinh checklist từ `khuon_checklist` theo **loại hợp đồng** — mỗi nhánh chỉ nhận mục
   thực sự áp dụng (thực tập sinh không có BHXH/trợ cấp/phép năm/Đ.48).
3. Phát sinh bàn giao từ `khuon_ban_giao` theo **chức danh** (Sale/CSKH, vận hành, thủ tục
   hải quan, thủ kho, kế toán, IT/ERP, quản lý).
4. Nhân viên nhận chuông báo mở hướng dẫn thủ tục.

Thêm loại HĐ / mục mới / vị trí mới chỉ bằng **seed**, không sửa code luồng.

## Luồng 1 — đơn xin nghỉ việc → quyết định → bàn giao

1. Nhân viên nộp đơn `thoi_viec`; Admin duyệt (Cổng 1) → quy trình mở, checklist theo loại HĐ.
2. HR ban hành **quyết định nghỉ việc** trên hệ văn bản AI (nút *Quyết định nghỉ việc* ở hồ sơ
   hoặc nút *Soạn QĐ nghỉ việc* ngay trong mục checklist). QĐ được **liên kết vào quy trình**
   (số, ngày, tệp); lastday chốt theo QĐ.
3. Nhân viên bàn giao theo checklist; tiến trình nền tự tick các mục tự động.
4. Admin mở Cổng 2: dùng lại đúng QĐ đã ban hành (không sinh văn bản thứ hai), khóa tài khoản.

Mục `ban_hanh_qd` là **bắt buộc**: chưa ban hành QĐ thì quy trình không chuyển `san_sang_chot`
— Cổng 2 bị chặn. Quy trình cũ đã qua lastday được đánh `bo_qua` mục này khi di trú (không truy
thu thủ tục).

## Luồng 2 — quyết định nghỉ việc trực tiếp, không cần đơn

QĐ phát hành → hệ thống tạo đơn `thoi_viec` (đã duyệt, tài khoản hệ thống) + quy trình, chốt
lastday theo QĐ và **mở ngay mục bàn giao**. Không cần nhân viên nộp đơn.

## Luồng 3 — nghỉ ngay, không bàn giao (chỉ Admin)

Nút **Nghỉ việc không bàn giao** ở hồ sơ nhân sự chỉ hiện với vai trò `admin`. Hệ thống khóa
tài khoản ngay và ghi một quy trình **đã đóng**, mọi mục còn mở bỏ qua kèm lý do.

## Quyết định nghỉ việc của công ty

HR phát hành QĐ nghỉ việc trên hệ văn bản AI (có ngày nghỉ việc). Trong **cùng transaction
phát hành**, hệ thống tạo (hoặc tái dùng) đơn + quy trình, **liên kết QĐ vào quy trình**, chốt
lastday theo QĐ và **mở ngay mục bàn giao** để nhân viên làm trong thời hạn báo trước. QĐ đã
quá ngày thì đánh dấu **hồi tố**: bỏ qua mục nhân viên kèm lý do, không truy thu thủ tục.

## Phần giữa — nhân viên + hệ thống

- **Nhân viên** làm mục `nhan_vien` ở `/thoi-viec/huong-dan`: xác nhận lastday, đọc hướng
  dẫn, trả tài sản (đính kèm ảnh), thanh lý tạm ứng, sao lưu dữ liệu, ký cam kết bảo mật
  (ký điện tử trong hệ thống — ghi danh tính tài khoản + thời điểm), bàn giao hồ sơ, ký
  biên bản bàn giao **hai chiều** (người giao ↔ người nhận do Admin chỉ định).
- **Tiến trình nền** (mỗi chu kỳ lịch, nhận việc nguyên tử `for update skip locked`) tự
  tick mục `tu_dong`:
  - `ban_giao_cong_viec_do` — chuyển mọi việc đang mở sang quản lý phòng; tick xong khi 0 việc mở.
  - `kiem_tra_bao_truoc` — so lastday với ngưỡng **chính sách công ty**: thử việc 14 ngày,
    thời vụ 3 ngày, HĐ xác định thời hạn **30 ngày** (kể cả dưới 12 tháng), không xác định
    45 ngày, quản lý DN 120 ngày (Điều 7 NĐ145/2020). Thiếu hạn → **cảnh báo** "nghỉ ngang,
    rủi ro Điều 40" cho Admin, **không chặn**.
  - `quyet_toan_luong`, `thanh_toan_phep` (Điều 113.3), `tinh_tro_cap` (Điều 46, trừ thời
    gian đóng BHTN), `hen_quyet_toan_14n` (lastday + 14 ngày làm việc — Điều 48.1).
- Mục bắt buộc cuối cùng xong → quy trình **tự chuyển** `san_sang_chot` + chuông báo Admin.
- **Widget trợ lý đỏ** (vòng tròn góc phải-dưới mọi trang): chấm đỏ + số mục bắt buộc chưa
  xong; hết mục thì chuyển xanh; bấm mở bảng tối thiểu + nút mở trang hướng dẫn.

## Cổng 2 — Admin duyệt cuối + dừng hoạt động

Chỉ mở khi `san_sang_chot`. Admin: (a) duyệt cuối, (b) ấn định `ngay_lam_viec_cuoi` +
`lastday_da_chot = true`, (c) bấm **"Chạy dừng hoạt động"**. `chay_dung_hoat_dong()` chạy
một transaction đúng thứ tự:

1. **Kiểm điều kiện** — mọi mục bắt buộc xong, lastday chốt, email cấu hình đủ **cho các mục
   BHXH/thuế có trong nhánh** (thực tập sinh không có mục BHXH nên không bị đòi email). Sai →
   dừng sạch, báo lý do (REQ-CH-02: thiếu `email_dich_vu_bhxh` thì chặn).
2. **Thu giữ dữ liệu** — ghi mốc chuyển quyền OneDrive/SharePoint, xoay mật khẩu dùng chung.
3. **Sinh & gửi văn bản** — Nếu quy trình đã liên kết **quyết định nghỉ việc** đã ban hành
   (luồng đơn → QĐ, hoặc QĐ trực tiếp) thì dùng lại đúng quyết định đó, **không sinh văn bản
   thứ hai**. Chưa có QĐ thì sinh quyết định kết thúc/chấm dứt **theo nhánh hợp đồng** (thực
   tập → kết thúc học việc/thực tập; thử việc → kết thúc thử việc; cộng tác viên → chấm dứt
   hợp đồng dịch vụ; HĐLĐ → chấm dứt HĐLĐ), giấy xác nhận BHXH-BHTN, hồ sơ báo giảm/chốt sổ
   BHXH (email đơn vị dịch vụ), chứng từ khấu trừ thuế TNCN (NĐ126/2020), bảng quyết toán —
   lưu hồ sơ nhân viên. Chỉ sinh chứng từ khi mục tương ứng **có trong khuôn của nhánh**
   (thực tập sinh không có quyết định chấm dứt HĐLĐ, không có giấy BHXH).
4. **Cắt truy cập (cuối cùng)** — tái dùng `cho_nghi_viec()`: khóa login, thu hồi token,
   sự kiện `nhan_su.nghi_viec` (cổng phân quyền) + `erp1.nhan_su.nghi_viec` + `ms365.nghi_viec`.
5. Đặt `da_khoa` + nhật ký ai bấm lúc nào.

Mọi email/sự kiện ra ngoài ghi vào `hop_thu_di` **cùng transaction** (kể cả email — loại sự
kiện `gui_email` có đính kèm), tiến trình nền đẩy đi với backoff. Cổng 2 không kẹt khi mail
lỗi; mục `chot_bhxh`/`chung_tu_thue` tick xong khi tệp đã sinh + đã xếp hàng gửi (trách
nhiệm hệ thống dừng ở "đã gửi hồ sơ", phần chốt với cơ quan thuộc đơn vị dịch vụ).

`chay_dung_hoat_dong` **idempotent**: chạy lần hai trả `da_chay = true`, không khóa lại,
không sinh sự kiện trùng.

## Tới lastday mà chưa chốt

Lịch đêm **KHÔNG tự khóa**. Thay vào đó:

- Cảnh báo đỏ cho Admin mỗi ngày: "Tới ngày nghỉ, bàn giao chưa xong — dữ liệu đang rủi ro".
- Quyết định nghỉ việc đã phát hành nhưng chưa có quy trình (QĐ cũ, lỗi hệ thống, dữ liệu nhập
  muộn) được **quét lại và đưa vào luồng**: tạo đơn `thoi_viec` nếu thiếu, tạo/tái dùng quy
  trình. Nếu ngày làm việc cuối đã qua thì đánh dấu **hồi tố**: bỏ qua mục `nhan_vien`, chờ
  Admin bấm Cổng 2.
- Nút **Nghỉ không bàn giao** (khẩn cấp) khóa tài khoản ngay nhưng vẫn để lại một quy trình
  **đã đóng** (nguồn `nghi_khong_ban_giao`), mọi mục còn mở bỏ qua kèm lý do — báo cáo không
  còn lỗ hổng "nghỉ việc mà không có quy trình".

## Cấu hình

Admin sửa trong app (trang **Thôi việc → Cấu hình**), không cần deploy:

| Khóa | Ý nghĩa | Mặc định |
|---|---|---|
| `email_dich_vu_bhxh` | Email đơn vị dịch vụ BHXH nhận hồ sơ báo giảm/chốt sổ | env `EMAIL_DICH_VU_BHXH` |
| `email_dich_vu_bhxh_cc` | CC nội bộ (HR) | env `EMAIL_DICH_VU_BHXH_CC` |
| `email_chung_tu_thue` | Email nhận chứng từ khấu trừ thuế TNCN | env `EMAIL_CHUNG_TU_THUE` (rỗng = dùng chung email BHXH) |
| `han_bao_truoc_<loai>` | Ngưỡng báo trước theo loại HĐ (ngày; trống = theo hợp đồng) | seed theo chính sách công ty |

Bảng lưu: `cau_hinh_thoi_viec` (email) và `khuon_han_bao_truoc` (ngưỡng). Giá trị trong bảng
ưu tiên hơn env.

## Giám sát

- Trang **Thôi việc** (admin): danh sách theo trạng thái, chi tiết checklist + số liệu tự
  tính, bàn giao, Cổng 2, cấu hình.
- Trang **`/thoi-viec/huong-dan`** (nhân viên): checklist, đính kèm bằng chứng, ký điện tử.
- Bảng `hop_thu_di`: sự kiện `nhan_su.nghi_viec`, `erp1.nhan_su.nghi_viec`, `ms365.nghi_viec`,
  `gui_email` chưa gửi được nằm đây với `so_lan` và `loi_cuoi`.
- Log máy chủ: `[thoi-viec] ...` (vòng quét, cảnh báo đến hạn, lỗi).

## Kiểm thử

```bash
npm test                                        # test đơn vị, gồm thoi_viec.test.ts
npm --workspace may_chu run test_e2e            # e2e, gồm thong_bao_ai_e2e (hồi tố + Cổng 2)
npm run kiem_tra_kieu                           # kiểm tra kiểu may_chu + web + dien_thoai
```

Các ca bắt buộc: thử việc nghỉ nhanh (báo trước 14 ngày, checklist rút gọn, không trợ cấp),
HĐ xác định dưới 1 năm đúng 30 ngày, HĐ không xác định đúng 45 ngày (đầy đủ + email
BHXH/thuế), nghỉ ngang (cảnh báo Điều 40, không tự khóa), tới lastday dở checklist (không
khóa, báo đỏ), chạy Cổng 2 thiếu điều kiện (dừng sạch), có/không tài khoản Microsoft,
idempotent.
