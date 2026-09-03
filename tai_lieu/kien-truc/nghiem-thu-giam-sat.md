# Biên bản nghiệm thu — Module Giám sát gian lận

Lập theo Mục 4.3 của `QUY TRÌNH & CHECKLIST YÊU CẦU AI CODE`: bảng đối chiếu REQ, bảng audit
class, và mục liệt kê **riêng** mọi phần chưa làm hoặc làm thiếu.

Ngày lập: 03.09.2026 · Nhánh: `claude/fraud-monitoring-erp2-pf8ua9` ·
PR: [Cham-cong#7](https://github.com/tranhoangvn98/Cham-cong/pull/7)

Ký hiệu: **✓** đạt · **◐** một phần (nêu rõ thiếu gì) · **✗** chưa làm

---

## 1. Bảng đối chiếu REQ

### M0 — Nền tảng kết nối và phân quyền

| REQ | Trạng thái | File · hàm | Ghi chú |
|---|---|---|---|
| REQ-01 Kết nối chỉ-đọc ERP 1 | ✓ | `giam_sat/ket_noi_erp.ts` · `doc()`, `doc_tren_database()` | Pool riêng từng DB, `max 3`, timeout 20s, `application_name=chamcong_giam_sat`; mọi truy vấn trong `begin read only` |
| REQ-02 Dò tìm database | ✓ | `ket_noi_erp.ts` · `do_tim_database()`; `tuyen/giam_sat.ts` · `POST /nguon/do-tim` | Không tên DB nào trong mã nguồn — có test CI cưỡng chế |
| REQ-03 Vai trò `kiem_soat` | ✓ | `migrations/030_vai_tro_kiem_soat.sql`; `bao_mat/xac_thuc.ts` · `can_kiem_soat`; `bao_mat/quyen_ho_so.ts` · `la_kiem_soat`; `bao_mat/cong_sso.ts` | Ngoài phạm vi trả **404**, không phải 403 |
| REQ-04 Lược đồ CSDL | ✓ | `migrations/031_giam_sat_gian_lan.sql` | 8 bảng; chạy sạch trên DB trắng và DB đã có dữ liệu |

### M1 — Danh mục cấu hình động

| REQ | Trạng thái | File · hàm | Ghi chú |
|---|---|---|---|
| REQ-05 CRUD danh mục cảnh báo | ✓ | `tuyen/giam_sat.ts` · `/giam-sat/loai-canh-bao*` | Xóa bị chặn khi còn `loai_loi` tham chiếu, thông điệp tiếng Việt nói rõ phải làm gì |
| REQ-06 CRUD danh mục lỗi | ✓ | `tuyen/giam_sat.ts` · `/giam-sat/loai-loi*` | `ma` duy nhất; bắt buộc thuộc một loại cảnh báo |
| REQ-07 CRUD điều kiện | ✓ | `tuyen/giam_sat.ts` · `/giam-sat/dieu-kien*` | `phep_do` sai ⇒ 422 kèm danh sách mã hợp lệ |
| REQ-08 Danh mục phép đo | ✓ | `tuyen/giam_sat.ts` · `GET /giam-sat/phep-do` | Trả khai báo tham số đủ để UI tự dựng form |
| REQ-09 Seed danh mục | ✓ | `migrations/031_*.sql` | 6 nhóm · 39 loại lỗi · 39 điều kiện, **toàn bộ `dang_bat = false`**; có test khẳng định |

### M2 — Máy quét

| REQ | Trạng thái | File · hàm | Ghi chú |
|---|---|---|---|
| REQ-10 Khung phép đo | ✓ | `phep_do/kieu.ts`, `phep_do/chi_muc.ts` | `chi_muc.ts` ném lỗi ngay lúc nạp nếu có mã trùng |
| REQ-11 Rule engine | ✓ | `giam_sat/danh_gia.ts` · `chay_dieu_kien()`, `quet_mot_loi()` | Tái dùng `thoa_man()` của `vi_pham/phat_hien.ts`; toán tử lạ ⇒ không khớp |
| REQ-12 Vân tay phát hiện sửa lén | ✓ | `giam_sat/anh_chup.ts` · `van_tay()`, `doi_chieu_va_chup()` | `bang_chung` chứa `{truoc, sau, doi_luc}` |
| REQ-13 Chống trùng cảnh báo | ✓ | `migrations/031_*.sql` · chỉ mục `canh_bao_mot_lan` | UNIQUE + `on conflict do nothing`; kết luận đã ghi không bị đè |
| REQ-14 Chạy thử không ghi | ✓ | `tuyen/giam_sat.ts` · `POST /giam-sat/thu-quy-tac` | Test đếm số dòng `canh_bao` trước/sau bằng nhau |
| REQ-15 Lịch quét + nhật ký | ✓ | `giam_sat/lich_quet.ts` · `chay_mot_vong()` | Nhận việc qua `cong_viec_da_chay`; quét lỗi ghi `thanh_cong = false` |

### M3 — Phép đo nghiệp vụ (39 mã)

| REQ | Trạng thái | File | Số mã | Ghi chú |
|---|---|---|---|---|
| REQ-16 SLA | ✓ | `phep_do/sla.ts` | 7 | Giờ tính qua `tien_ich/thoi_gian.ts` |
| REQ-17 Trùng lặp | ✓ | `phep_do/trung_lap.ts` | 5 | `chuan_hoa_dien_thoai()`, `sao_tu_tinh()` có test riêng |
| REQ-18 Đơn hàng | ✓ | `phep_do/don_hang.ts` | 8 | `doc_tong_tien()` an toàn với JSON hỏng |
| REQ-19 Giao dịch | ◐ | `phep_do/giao_dich.ts` | 10 (9 chạy được) | `chi_vuot_han_muc` khai `chua_trien_khai` — ERP 1 không lưu giá trị hạn mức. **ND-01** |
| REQ-20 Chi phí & công nợ | ✓ | `phep_do/chi_phi_cong_no.ts` | 7 | Mẫu số 0 ⇒ bỏ qua bản ghi |
| REQ-21 Chéo chấm công | ✓ | `phep_do/cheo_cham_cong.ts` | 2 | Đối chiếu qua `nhan_vien.erp_user_id`; chưa map thì bỏ qua, không đoán theo tên |

### M4 — Xử lý cảnh báo

| REQ | Trạng thái | File · hàm | Ghi chú |
|---|---|---|---|
| REQ-22 Danh sách + lọc | ◐ | `tuyen/giam_sat.ts` · `GET /giam-sat/canh-bao` | Lọc và phân trang đủ. **Chỉ tiêu P95 < 1s với 100.000 bản ghi chưa đo** — cần dữ liệu thật (ND-05) |
| REQ-23 Chi tiết + bằng chứng | ✓ | `GET /giam-sat/canh-bao/:id` | Hiển thị kèm giá trị đo và ngưỡng đã dùng |
| REQ-24 Vòng đời xử lý | ✓ | `POST /giam-sat/canh-bao/:id/xu-ly` | Máy chỉ đặt được `moi`; mọi lần đổi ghi `canh_bao_xu_ly` |
| REQ-25 Tổng quan | ✓ | `GET /giam-sat/tong-quan` | Bấm vào con số mở danh sách đã lọc |

### M5 — Giao diện web

| REQ | Trạng thái | File | Ghi chú |
|---|---|---|---|
| REQ-26 Trang `/giam-sat` | ✓ | `web/src/trang/giam_sat.tsx` | Dùng `dung_nap`, `dung_hanh_dong`, `dung_xac_nhan`, `HopThoai`, `Trong`, `DangTai` |
| REQ-27 Trang danh mục | ✓ | `web/src/trang/giam_sat_danh_muc.tsx` | 3 tab; form điều kiện dựng động từ khai báo tham số; nút **Chạy thử** cạnh nút **Bật** |
| REQ-28 Trang nguồn ERP | ✓ | `web/src/trang/nguon_erp.tsx` | Không hiển thị mật khẩu ở bất kỳ đâu |
| REQ-29 Điều hướng & hướng dẫn | ✓ | `App.tsx`, `huong_dan.ts`, `api.ts`, `thanh_phan.tsx` | Bài đối chiếu ba chiều xanh |

### M6 — Kênh báo

| REQ | Trạng thái | File · hàm | Ghi chú |
|---|---|---|---|
| REQ-30 Xuất CSV | ✓ | `GET /giam-sat/canh-bao.csv`; `tien_ich/csv.ts` · `o_csv()` | BOM UTF-8; ô `= + - @` bị vô hiệu hóa; có test injection |
| REQ-31 Email hằng ngày | ◐ | `giam_sat/ban_tin.ts` · `gui_ban_tin()` | Một email/ngày, tắt sạch khi thiếu SMTP, HTML thoát ký tự. **Không có backoff riêng** — khóa ngày được nhả khi gửi lỗi nên vòng quét sau (15 phút) thử lại; đơn giản hơn và đủ cho nhịp 1 email/ngày |

### M7 — Quản trị, CI và bàn giao

| REQ | Trạng thái | File | Ghi chú |
|---|---|---|---|
| REQ-32 Năm cổng CI | ✓ | `.github/workflows/kiem_tra.yml`, `thiet_ke/kien_truc.test.mjs` | Đủ 5 cổng, mỗi cổng thất bại chặn merge |
| REQ-33 Bộ tài liệu kiến trúc | ✓ | `tai_lieu/kien-truc/`, `tai_lieu/adr/` | C4 L1/L2 + luồng dữ liệu dạng Mermaid **trong repo**; 4 ADR |
| REQ-34 Đặc tả là nguồn sự thật | ✓ | `tai_lieu/GIAM-SAT-GIAN-LAN.md` | Đủ quy tắc nghiệp vụ để dựng lại module |
| REQ-35 Bàn giao | ◐ | Tài liệu này + `TECH_DEBT.md` | Bảng REQ và bảng audit class xong; **K4 (ký nhận bảo trì) là việc của người, chưa thực hiện** |
| REQ-36 Công cụ đối chiếu schema | ✓ | `giam_sat/doi_chieu_schema.ts`, `chay_doi_chieu.ts` | Thoát mã 1 khi lệch ở bảng mà phép đo **đang bật** dùng tới |

**Tổng: 31 ✓ · 5 ◐ · 0 ✗** trên 36 yêu cầu.

---

## 2. Bảng audit class (Mục 3 — ràng buộc giao diện)

24 class được dùng trong 3 trang mới, đối chiếu với `web/src/kieu.css`:

| Class đã dùng | Có trong `kieu.css`? | Nếu ✗ thay bằng gì |
|---|---|---|
| `bang-gon` | ✓ | — |
| `bo-loc` | ✓ | — |
| `canh-phai` | ✓ | — |
| `chu-mo` | ✓ | — |
| `chu-nho` | ✓ | — |
| `dau-trang` | ✓ | — |
| `goi-y` | ✓ | — |
| `hang-bam` | ✓ | — |
| `hang-nut` | ✓ | — |
| `hop-loi` | ✓ | — |
| `nhan-cot` | ✓ | — |
| `nhan-mo` | ✓ | — |
| `nhan-tot` | ✓ | — |
| `nhan-xau` | ✓ | — |
| `nut-chinh` | ✓ | — |
| `nut-light` | ✓ | — |
| `nut-nho` | ✓ | — |
| `o-nhap` | ✓ | — |
| `so` | ✓ | — |
| `thanh-tab` | ✓ | — |
| `the` | ✓ | — |
| `the-mong` | ✓ | — |
| `vo-bang` | ✓ | — |
| `xem-van-ban` | ✓ | — |

**24/24 đạt · 0 vi phạm.** Không thêm dòng CSS nào vào `kieu.css`, không đặt class mới, không hard-code màu/font/bo góc — `npm test` có bài kiểm bắt được nếu vi phạm.

---

## 3. Definition of Done — đối chiếu chung (Mục 2.2)

| Điều kiện | Trạng thái | Bằng chứng |
|---|---|---|
| Xử lý lỗi: ERP 1 chết, truy vấn hết giờ, dữ liệu sai kiểu | ✓ | `ket_noi_erp.ts` · `thong_diep_loi()` dịch mã lỗi PG sang tiếng Việt kèm hành động; vòng quét ghi `thanh_cong = false` và thử lại |
| Validate input ở **máy chủ** | ✓ | `tuyen/giam_sat.ts` · `doc_tham_so()` lọc tham số theo khai báo của phép đo; ẩn nút ở giao diện không được tính là phân quyền |
| Test đường thành công **và** đường thất bại | ✓ | 5 tệp test của module; mỗi endpoint có test 401/403/404 trong `giam_sat_e2e.test.ts` |
| Cập nhật tài liệu **cùng PR** | ✓ | Toàn bộ `tai_lieu/` trong cùng PR, không cập nhật hồi tố |
| Đúng ràng buộc giao diện | ✓ | Mục 2 ở trên |

---

## 4. Kết quả kiểm chứng

| Hạng mục | Kết quả |
|---|---|
| Test đơn vị + test thiết kế | **716 đạt / 0 hỏng** |
| Test e2e | **418 + 16 đạt / 0 hỏng** |
| Kiểm tra kiểu (`may_chu`, `web`) | Sạch |
| Build web | Sạch |
| `npm audit` | **0 lỗ hổng** |

Ba lỗi tự phát hiện và sửa trong lúc chạy kiểm chứng:

1. `doi_chieu_schema` trỏ vào `src/` — sẽ hỏng trong ảnh Docker. Đổi sang `dist/` + bản `_ma_nguon`.
2. `ra_vao.test.ts` chưa được khai trong `npm test` nên **chưa chạy lần nào** (17 test). Đã đăng ký.
3. Test e2e mở chốt bảng công dùng `${ky}-31`: Postgres từ chối `"2026-09-31"` nên bài kiểm đó **sập trong tháng 4, 6, 9, 11**. Đổi sang mốc đầu tháng sau.

Lỗi 2 và 3 có sẵn trên `main`, không do lần giao này sinh ra — nhưng chúng làm cổng CI mới đỏ ngay ngày đầu, nên phải sửa để cổng có nghĩa.

---

## 5. Những phần **chưa làm hoặc làm thiếu** (liệt kê riêng theo Mục 4.3)

| # | Nội dung | Vì sao | Xử lý |
|---|---|---|---|
| 1 | `chi_vuot_han_muc` không chạy được | `chi.tbl_han_muc_chi` không persist giá trị tiền | ND-01 — cần ERP 1 bổ sung cột |
| 2 | Schema ERP 1 **chưa kiểm chứng trên CSDL thật** | Môi trường xây dựng không nối được TCP 5432 tới ERP 1 | ND-04 — chạy `doi_chieu_schema` tại chỗ **trước khi bật điều kiện đầu tiên** |
| 3 | Chưa đo P95 danh sách cảnh báo (B2.1) và chưa chạy `EXPLAIN ANALYZE` (B2.3) | Cần dữ liệu thật với thống kê thật | ND-05 |
| 4 | B6.1 / R03 — JWT HS256 tự phát hành vẫn còn trong repo | Mục I1.2 cấm để AI tự sửa lớp xác thực | ND-03 — giảm thiểu ngay bằng `CONG_SSO_BO_DANG_NHAP_RIENG=1` |
| 5 | I1.6 — dữ liệu thật (mật khẩu) đã đi qua công cụ AI | Đã xảy ra, không thu hồi được | ND-02 — **xoay vòng mật khẩu trong 7 ngày** + siết quyền |
| 6 | CI không kiểm kiểu `dien_thoai` | Ngoài npm workspace, module này không chạm tới | ND-06 |
| 7 | Lỗ hổng ERP 1 chưa vá | Hệ thống khác, ngoài phạm vi | ND-07 — cần quyết định của Ban điều hành |
| 8 | Email không có backoff riêng | Nhả khóa cho vòng quét sau thử lại, đủ cho nhịp 1 email/ngày | Chấp nhận, không ghi nợ |
| 9 | K4 (ký nhận bảo trì), K6 (diễn tập phục hồi) | Việc của người, không phải của code | Tài liệu và mẫu biên bản đã sẵn sàng |

Bốn mục 1–5 và 7 là hạng mục **(B) bắt buộc** hoặc mức Cao — chi tiết kèm hạn và người chịu
trách nhiệm ở `TECH_DEBT.md`.

---

## 6. Ai bảo trì cái gì (REQ-35)

| Phần | Người bảo trì | Đụng vào khi nào |
|---|---|---|
| SQL của 39 phép đo (`giam_sat/phep_do/*.ts`) | Đội phát triển Chấm công | ERP 1 đổi schema (`doi_chieu_schema` báo lệch) |
| Ngưỡng, bật/tắt điều kiện, danh mục | Kiểm soát nội bộ (`kiem_soat`) — **qua giao diện, không cần lập trình viên** | Khi quy chế nội bộ đổi |
| Trỏ nguồn dữ liệu, `.env`, gán vai trò | Quản trị hệ thống Chấm công (`admin`) | ERP 1 đổi tên DB, xoay vòng mật khẩu |
| Quyền tài khoản `powerbi` | Quản trị CSDL ERP 1 | Xoay vòng mật khẩu, thêm database mới |
| Quyết định ngưỡng nào phù hợp quy chế | **Ban điều hành** | Trước mỗi lần bật một điều kiện |

Dòng cuối không phải phân công cho có: ngưỡng là **tiêu chí đánh giá người**, và người đặt nó
phải là người có thẩm quyền ban hành tiêu chí đó.
