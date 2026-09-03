# Nợ kỹ thuật đã chấp nhận

Sổ đăng ký các khoản nợ kỹ thuật **được chấp nhận có ý thức**, kèm hạn xử lý và người chịu
trách nhiệm — theo mục C2.3 của `CHECKLIST KIỂM TRA KIẾN TRÚC HỆ THỐNG` số `01/2026/CL-CNTT`.

Một khoản nợ chỉ được nằm ở đây nếu **đã có người quyết định chấp nhận nó**. Ghi vào đây không
làm nó biến mất; ghi vào đây là để nó không bị quên.

Cột **Người chịu trách nhiệm** ghi theo vai trò. Ban điều hành điền tên cụ thể khi phê duyệt —
một khoản nợ mà người chịu trách nhiệm là "cả đội" là một khoản nợ không ai xử lý.

## Bảng tổng hợp

| Mã | Nội dung | Mức | Hạn | Người chịu trách nhiệm |
|---|---|---|---|---|
| ND-01 | `chi_vuot_han_muc` không triển khai được — ERP 1 không lưu giá trị hạn mức | Trung bình | 31.12.2026 | Trưởng nhóm phát triển ERP 1 |
| ND-02 | **Mật khẩu tài khoản `powerbi` phải xoay vòng** — đã đi qua kênh không kiểm soát | **Cao** | **Trong 7 ngày kể từ khi triển khai** | Quản trị CSDL ERP 1 |
| ND-03 | Chấm công tự phát hành JWT HS256 (B6.1 / R03) | Cao | 31.03.2027 | Trưởng nhóm phát triển Chấm công |
| ND-04 | Schema ERP 1 chưa được kiểm chứng trên CSDL thật | Cao | Trước khi bật điều kiện đầu tiên | Quản trị hệ thống Chấm công |
| ND-05 | Chưa chạy `EXPLAIN ANALYZE` cho truy vấn phép đo nặng (B2.3) | Trung bình | Trước nghiệm thu K5 | Đội phát triển Chấm công |
| ND-06 | CI không kiểm kiểu `dien_thoai` | Thấp | 31.12.2026 | Đội phát triển Chấm công |
| ND-07 | Lỗ hổng đã phát hiện trong ERP 1 chưa được vá | **Cao** | Quyết định riêng của Ban điều hành | Trưởng nhóm phát triển ERP 1 |
| ND-08 | Sai lệch nhịp giao so với Mục 2.3 checklist AI | Đã đóng | — | — |

---

## ND-01 — `chi_vuot_han_muc` không triển khai được

**Hiện trạng.** Danh mục lỗi có mục "Chi vượt hạn mức" và điều kiện tương ứng, nhưng phép đo
`chi_vuot_han_muc` **từ chối chạy** và trả về thông điệp giải thích lý do.

**Nguyên nhân đã xác minh trên mã nguồn ERP 1.** Entity `HanMucChi` khai một trường
`MoneyValue Value`, nhưng bảng thật `chi.tbl_han_muc_chi` chỉ có
`Id / CreatedDate / Fk_Approve_id / IsDeleted / LastUpdateTime`. **Giá trị tiền của hạn mức
không được persist.** Không có nguồn nào trong CSDL để so `So_tien_chi` với hạn mức.

**Vì sao không tự khắc phục.** Ba phương án đều tệ hơn việc để nguyên:
tự chế một bảng hạn mức bên ERP 2 (tạo dữ liệu chủ trùng lặp, vi phạm C1.8);
đoán hạn mức từ dữ liệu lịch sử (kết tội người bằng một con số không ai duyệt);
âm thầm trả 0 dòng (kiểu hỏng tệ nhất — nhìn y hệt "không có vi phạm nào").

**Điều kiện đóng.** ERP 1 bổ sung cột lưu giá trị hạn mức và điền dữ liệu. Sau đó bỏ cờ
`chua_trien_khai` trong `may_chu/src/giam_sat/phep_do/giao_dich.ts`, viết SQL so sánh, thêm
test, chạy `doi_chieu_schema`, chạy thử rồi mới bật.

---

## ND-02 — Xoay vòng mật khẩu tài khoản `powerbi`

**Mức: Cao. Đây là hạng mục (B) bắt buộc đang KHÔNG ĐẠT.**

**Hiện trạng.** Mật khẩu tài khoản đọc CSDL sản xuất ERP 1 đã được cung cấp qua một kênh trao
đổi không kiểm soát trong quá trình xây dựng module. Mật khẩu **không** nằm trong mã nguồn,
**không** trong CSDL, **không** trong tài liệu và **không** hiển thị trên giao diện — nó chỉ ở
`.env` của máy chủ. Nhưng nó đã tồn tại ở một nơi ngoài tầm kiểm soát của công ty, nên phải
coi như đã lộ.

**Đây là điểm không đạt mục I1.6** của `QUY TRÌNH & CHECKLIST YÊU CẦU AI CODE`: *"Không dán dữ
liệu thật (khách hàng, giá, hợp đồng, thông tin cá nhân) vào công cụ AI — dùng dữ liệu giả."*
Ghi nhận thẳng ở đây thay vì bỏ qua.

**Khắc phục bắt buộc, hai việc:**

1. **Xoay vòng mật khẩu** theo thủ tục ở `tai_lieu/RUNBOOK-GIAM-SAT.md` mục 5.2, trong vòng 7
   ngày kể từ khi triển khai.
2. **Siết quyền tài khoản** theo `tai_lieu/RUNBOOK-GIAM-SAT.md` mục 1.1 — chỉ `GRANT SELECT` +
   `ALTER ROLE powerbi SET default_transaction_read_only = on`. Kiểm chứng bằng câu
   `create table` phải bị Postgres từ chối.

Việc 2 làm giảm thiệt hại nếu mật khẩu cũ đã bị dùng: tài khoản chỉ đọc được, không sửa được
gì.

**Phòng ngừa lặp lại.** Lần sau cần cung cấp thông tin kết nối cho một phiên làm việc với công
cụ AI: cấp một tài khoản dùng một lần, chỉ đọc, hết hạn sau phiên — đừng cấp tài khoản đang
dùng thật.

**Điều kiện đóng.** Mật khẩu đã đổi; câu `create table` bằng tài khoản `powerbi` báo lỗi
read-only; có ghi nhận ngày thực hiện.

---

## ND-03 — Chấm công tự phát hành JWT HS256

**Hiện trạng.** `may_chu/src/bao_mat/jwt.ts` là một cài đặt JWT HS256 tự viết bằng
`node:crypto`. Checklist kiến trúc mục B6.1 và rủi ro R03 yêu cầu *"không còn HS256
self-issued trong toàn bộ repo"*.

**Quan hệ với module Giám sát.** Module này **không thêm** token nào, không sửa một dòng nào
trong lớp xác thực — nhưng nó chạy trên hệ xác thực đó, nên khoản nợ này chặn nghiệm thu của
nó. Mục I1.2 của checklist AI cấm để AI tự sửa lớp xác thực, nên phần này cố ý không đụng tới.

**Giảm thiểu áp dụng ngay (khuyến nghị cho production):**

```
CONG_SSO_BO_DANG_NHAP_RIENG=1
```

Đường đăng nhập nội bộ bị vô hiệu, toàn bộ token đến từ cổng SSO (RS256 + JWKS). Đạt B6.1
**bằng cấu hình** — mã cũ vẫn còn trong repo nhưng không còn đường vào.

**Xử lý dứt điểm.** Gỡ hẳn `jwt.ts` và đường đăng nhập nội bộ. Đây là một dự án riêng ảnh
hưởng toàn hệ thống (web, app điện thoại, tích hợp), phải có người review từng dòng, không
nằm trong phạm vi module Giám sát.

**Điều kiện đóng.** `jwt.ts` bị gỡ, hoặc Ban điều hành ký chấp nhận rủi ro có thời hạn kèm
`CONG_SSO_BO_DANG_NHAP_RIENG=1` bật ở production.

---

## ND-04 — Schema ERP 1 chưa kiểm chứng trên CSDL thật

**Hiện trạng.** Môi trường xây dựng module không nối được TCP 5432 tới máy chủ CSDL ERP 1
(chính sách mạng của môi trường, không phải sai thông tin kết nối). Toàn bộ SQL của 39 phép đo
được viết theo schema **suy ra từ mã nguồn ERP 1** — cụ thể `WriteDbContextModelSnapshot.cs`
của `erp_logistic` và các tệp EF configuration / migration snapshot của `erp_manager`.

Nguồn này đáng tin ở mức khá cao (EF sinh ra chính DDL đó) nhưng **không thay thế** việc soi
CSDL thật: cột thêm tay, view, đổi tên sau này đều không phản ánh trong mã nguồn.

**Giảm thiểu đã làm.** Công cụ `doi_chieu_schema` (REQ-36) đọc `information_schema` của các
database ERP 1 và so với schema mà từng phép đo tuyên bố nó cần; thoát mã 1 khi có lệch ở bảng
mà phép đo **đang bật** dùng tới. Ngoài ra **mọi điều kiện được cài đặt ở trạng thái tắt**, nên
đến lúc này không có rủi ro sinh cảnh báo sai trên dữ liệu thật.

**Khắc phục.** Chạy `npm --workspace may_chu run doi_chieu_schema` trên máy có mạng tới ERP 1
(`RUNBOOK-GIAM-SAT.md` mục 1.6), sửa các phép đo bị lệch, rồi mới bật điều kiện đầu tiên. Chạy
lại sau mỗi lần ERP 1 nâng cấp (mục 5.4).

**Điều kiện đóng.** Có một báo cáo đối chiếu thoát mã 0 trên môi trường thật, lưu lại kèm ngày
chạy.

---

## ND-05 — Chưa đo hiệu năng truy vấn phép đo

**Hiện trạng.** Mục B2.3 của checklist yêu cầu chạy `EXPLAIN ANALYZE` cho 10 truy vấn nặng
nhất và đính kèm kết quả vào tài liệu. Không thực hiện được từ môi trường xây dựng (cùng lý do
ND-04) — `EXPLAIN ANALYZE` cần chạy trên dữ liệu thật với thống kê thật.

**Giảm thiểu đã làm.** `statement_timeout` 20 giây và pool tối đa 3 kết nối cho mỗi database:
một truy vấn tồi bị Postgres cắt trước khi nó kịp làm nghẽn ERP 1. Mỗi lần quét ghi `mili_giay`
vào `lan_quet_giam_sat` nên chậm dần là nhìn thấy được.

**Khắc phục.** Sau khi bật các điều kiện, lấy 10 phép đo có `mili_giay` cao nhất từ nhật ký
quét, chạy `EXPLAIN ANALYZE` cho SQL của chúng trên ERP 1, đính kết quả vào
`tai_lieu/GIAM-SAT-GIAN-LAN.md`. Truy vấn nào cần chỉ mục thì đề nghị ERP 1 bổ sung — **không**
tự tạo chỉ mục trên CSDL của hệ thống khác.

**Điều kiện đóng.** Kết quả `EXPLAIN ANALYZE` của 10 truy vấn nặng nhất nằm trong tài liệu.

---

## ND-06 — CI không kiểm kiểu `dien_thoai`

**Hiện trạng.** Cổng 4 của `.github/workflows/kiem_tra.yml` chạy `kiem_tra_kieu` cho `may_chu`
và `web`, không cho `dien_thoai`.

**Lý do.** `dien_thoai` cài phụ thuộc riêng ngoài npm workspace (Expo/Metro không hoạt động
tốt trong workspace), nên kiểm nó trong CI đòi thêm một bước `npm --prefix dien_thoai ci`
nặng. Module Giám sát **không chạm** vào `dien_thoai` — module này không dành cho nhân viên.

**Rủi ro chấp nhận.** Lỗi kiểu trong `dien_thoai` lọt qua CI, chỉ bị bắt khi chạy
`npm run kiem_tra_kieu` tại máy.

**Khắc phục.** Thêm một job riêng có cache `dien_thoai/node_modules`, chỉ chạy khi PR chạm vào
`dien_thoai/**`.

---

## ND-07 — Lỗ hổng đã phát hiện trong ERP 1 chưa vá

**Hiện trạng.** Trong lúc dò schema ERP 1 để viết phép đo, phát hiện các vấn đề dưới đây trong
`erp_manager` và `erp_logistic`. **Không tự ý vá** — chúng thuộc hệ thống khác, ngoài phạm vi
module này, và cần quyết định riêng của Ban điều hành.

| Phát hiện | Vị trí | Mức |
|---|---|---|
| Không gọi `UseAuthentication()`, không controller nào có `[Authorize]` | `xnk.Logistic/Program.cs` | **Rất cao** |
| SQL injection qua tham số tìm kiếm vào CSDL hải quan, chạy bằng tài khoản `sa` | `SearchEcusQueryHandler.cs` | **Rất cao** |
| Chuỗi kết nối `sa` hard-code trong mã nguồn; nhiều secret trong `appsettings.*.json` và `docker-compose.override.yml` | `ECusService.cs` và các tệp cấu hình | Cao |
| Khóa tờ khai (`IsLock`) không chặn sửa/xóa dòng tiền | `Tax.Update` vs `TaxRowItem.UpdateV2` | Cao |
| Kiểm quyền `KCB_EDITING` viết sai nên không bao giờ chặn | `UpdateGoodsCommandHandler.cs` | Cao |
| CORS `AllowAnyOrigin()` | `xnk.Logistic/Program.cs` | Trung bình |
| `SetLevel(int)` cho đặt tay sao cơ hội 0–5 không kiểm tra gì, trong khi sao tính điểm KPI | `SaleOpportunity.cs` | Trung bình |
| Thiếu `ModifiedBy`/`ModifiedDate` trên các bảng tiền | cả hai repo ERP 1 | Cao |

**Quan hệ với module Giám sát.** Chính những lỗ hổng này là lý do module tồn tại: khi hàng rào
**phòng ngừa** ở ERP 1 còn yếu, lớp **phát hiện** ở ERP 2 là biện pháp bù đắp. Nhưng phát hiện
**không thay thế** phòng ngừa — một khoản chi sai vẫn đã chi xong trước khi cảnh báo tới.

Riêng dòng cuối (thiếu `ModifiedBy`/`ModifiedDate`) là lý do phải có cơ chế vân tay
`anh_chup_erp`: xem `tai_lieu/adr/0004-van-tay-phat-hien-sua-len.md`. Hệ quả cần nói thẳng —
vân tay cho biết **cái gì đổi và khi nào**, **không** cho biết **ai đổi**. ERP 1 bổ sung
`ModifiedBy` thì mới trả lời được câu đó.

---

## ND-08 — Sai lệch nhịp giao so với Mục 2.3 checklist AI *(đã đóng)*

**Ghi nhận.** Mục 2.3 của checklist AI yêu cầu *"KHÔNG yêu cầu code cả dự án 1 lần — làm từng
module → nghiệm thu xong mới sang module kế"*. Giai đoạn đầu của lần giao này chạy theo nhịp
"làm hết M0→M7 rồi báo cáo một lần", tức làm nhiều module trước khi có nghiệm thu nào.

**Đã sửa trong lúc thực hiện.** Chuyển sang đẩy từng khối lên PR kèm báo cáo ngắn sau mỗi
khối, đúng Mục 2.3 và I1.8. Ghi lại ở đây vì mục 4.3 yêu cầu liệt kê **riêng** mọi phần chưa
làm hoặc làm thiếu — kể cả phần đã khắc phục xong.

---

## Nguyên tắc bảo trì sổ này

- Thêm một khoản nợ **cùng PR** tạo ra nó, không bổ sung hồi tố.
- Không có "hạn: khi nào rảnh". Không đặt được hạn nghĩa là chưa có ai thực sự nhận.
- Đóng một khoản nợ thì ghi ngày và bằng chứng đã xử lý, **giữ lại mục** — xóa là mất bài học.
