# Giám sát gian lận — đặc tả module

**Số: 01/2026/ĐT-CNTT** · Phiên bản 1.0 · Cập nhật 02.09.2026

Đây là **nguồn sự thật** của module. Nếu mất mã nguồn, tài liệu này phải đủ để dựng lại
(điều kiện B7.5 của checklist kiến trúc `01/2026/CL-CNTT`).

---

## 1. Vì sao module này tồn tại

Công ty vận hành hai hệ thống tách rời. **ERP 1** (`erp_manager` + `erp_logistic`) là nơi
phát sinh tiền và chứng từ. **ERP 2** (`Cham-cong`) là hệ thống chấm công.

Hàng rào phòng ngừa ở ERP 1 còn yếu — đã kiểm chứng trên mã nguồn:

| Phát hiện | Vị trí |
|---|---|
| Không gọi `UseAuthentication()`, không controller nào có `[Authorize]` | `xnk.Logistic/Program.cs` |
| Khóa tờ khai (`IsLock`) chỉ chặn sửa phần đầu, không chặn sửa/xóa dòng tiền | `Tax.Update` vs `TaxRowItem.UpdateV2` |
| `PackingList` sửa được vô hạn sau khi đã vào phiếu kho | `UpdatePackingListCommandHandler` |
| Nhiều bảng tiền **không có** `ModifiedDate`/`ModifiedBy` | `BaseEntity.cs` của cả hai repo |
| `SetLevel()` cho đặt sao cơ hội thủ công không kiểm gì, mà sao tính vào KPI | `SaleOpportunity.cs` |
| Ghi `Guid.Empty` khi request không mang token hợp lệ | `IdentityService.GetUserIdentity()` |

Module này **không vá** những lỗ đó. Nó là **lớp phát hiện** đặt ở hệ thống khác.

**Vì sao đặt ở ERP 2:** người bị giám sát không quản trị được nơi ghi nhận cảnh báo — nguyên
tắc tách biệt nhiệm vụ. Và ERP 2 là hệ thống duy nhất có đồng thời bảng công và dữ liệu
nghiệp vụ, nên đối chiếu chéo "nhân viên nghỉ nhưng vẫn thao tác" chỉ làm được ở đây.

---

## 2. Ranh giới pháp lý — đọc trước khi sửa bất cứ gì

Cảnh báo do máy sinh là **dấu hiệu cần kiểm tra**, không phải kết luận.

- Máy **luôn** ghi trạng thái `moi`. Không có đường nào đi thẳng từ "máy phát hiện" đến
  "kết luận gian lận". Chỉ con người đổi được trạng thái, và mỗi lần đổi đều vào
  `canh_bao_xu_ly`.
- Bảng `canh_bao` **không có cột số tiền phạt** và không nối tới bảng lương. BLLĐ 2019
  Điều 127 cấm phạt tiền và cắt lương thay cho kỷ luật lao động.
- Nếu một cảnh báo dẫn tới kỷ luật lao động thật, nó phải đi qua đường `vi_pham`
  (`013_vi_pham.sql`) với đầy đủ họp, giải trình và biên bản theo Điều 122.
- Giao diện không dùng từ ngữ buộc tội ("vi phạm", "gian lận") cho bản ghi máy sinh.

Nhóm **Chéo chấm công** có cảnh báo riêng in ngay trong bằng chứng: làm từ xa, quên quẹt thẻ,
đi công tác, tài khoản dùng chung và lệch múi giờ đều tạo ra dấu hiệu này.

---

## 3. Bên liên quan và mối quan tâm

| Bên liên quan | Mối quan tâm |
|---|---|
| CEO / Ban điều hành | Biết sớm dấu hiệu thất thoát tiền; tự đổi được ngưỡng mà không cần lập trình viên |
| Kiểm soát nội bộ | Có bằng chứng đối chiếu được, và vết xử lý không sửa được |
| Kế toán trưởng | Chứng từ chi/thu lệch sao kê, chi trùng, chi tự duyệt |
| Trưởng phòng XNK | SLA lập packing list và duyệt tờ khai |
| Phòng Kinh doanh | Trùng cơ hội, cơ hội khai khống |
| Người lao động | **Không bị kết tội bằng một dòng máy sinh**; được hỏi trước khi kết luận |
| Bộ phận CNTT | Không làm chậm ERP 1; không bao giờ ghi sang ERP 1 |

**Mối quan tâm xung đột:** Ban điều hành muốn bật nhiều quy tắc để không bỏ sót; người lao
động cần không bị nghi oan. Xử lý: mọi điều kiện **tắt sẵn**, bắt buộc Chạy thử trước khi bật,
và ngưỡng phải đối chiếu quy chế nội bộ đã ban hành.

**Ràng buộc bên ngoài:** BLLĐ 2019 (Điều 122, 124, 127); Nghị định 13/2023/NĐ-CP về bảo vệ
dữ liệu cá nhân; quyền đọc trên CSDL ERP 1 do quản trị ERP 1 nắm.

---

## 4. Nguyên tắc thiết kế bắt buộc

**4.1. SQL nằm trong mã nguồn, không nằm trong CSDL.** Admin cấu hình *ngưỡng và tham số*,
không cấu hình *câu truy vấn*. Cho phép nhập SQL tự do qua màn hình cấu hình là biến nó
thành cổng thực thi SQL trên CSDL sản xuất của hệ thống khác. Cưỡng chế bằng
`thiet_ke/kien_truc.test.mjs`.

**4.2. Chỉ-đọc ba lớp.**

| Lớp | Cơ chế | Ai kiểm soát |
|---|---|---|
| 1 | `GRANT SELECT` + `ALTER ROLE ... SET default_transaction_read_only = on` | Quản trị ERP 1 |
| 2 | `options=-c default_transaction_read_only=on` trong chuỗi kết nối | `ket_noi_erp.ts` |
| 3 | `begin read only` bọc mọi truy vấn | `ket_noi_erp.ts` |

Thừa có chủ đích: một lớp cấu hình sai không được phép thành câu UPDATE trên CSDL của hệ
thống khác. Lớp 1 ta không kiểm soát được từ đây nên **không được coi là đủ**.

**4.3. Mật khẩu chỉ ở `.env`.** Bảng `nguon_du_lieu` lưu *tên database*, không lưu thông tin
đăng nhập. Màn hình không có ô nhập mật khẩu và không hiển thị mật khẩu.

**4.4. Chống trùng bằng ràng buộc, không bằng "select trước rồi insert".** Chỉ mục duy nhất
`canh_bao_mot_lan` + `on conflict do nothing`.

---

## 5. Mô hình dữ liệu

Migration `030_vai_tro_kiem_soat.sql` và `031_giam_sat_gian_lan.sql`.

| Bảng | Vai trò |
|---|---|
| `nguon_du_lieu` | Ánh xạ mã nguồn → tên database ERP 1. **Không** chứa thông tin đăng nhập |
| `loai_canh_bao` | Danh mục cảnh báo: nhóm nghiệp vụ, mức mặc định, SLA xử lý, bộ phận |
| `loai_loi` | Danh mục lỗi: tình huống cụ thể, hậu quả, hướng khắc phục, căn cứ |
| `dieu_kien_loi` | Điều kiện: phép đo + tham số + toán tử + ngưỡng. Nhiều điều kiện nối bằng **VÀ** |
| `canh_bao` | Bản ghi dấu hiệu, kèm `bang_chung` jsonb |
| `canh_bao_xu_ly` | Nhật ký xử lý, append-only |
| `anh_chup_erp` | Vân tay SHA-256 phát hiện sửa lén |
| `lan_quet_giam_sat` | Nhật ký chạy quét |

**Vì sao `anh_chup_erp` tồn tại:** các bảng tiền của ERP 1 không có `ModifiedDate`/
`ModifiedBy`, nên sửa số tiền sau khi duyệt **không để lại dấu vết nào để truy vấn**. Module
tự chụp vân tay các trường trọng yếu mỗi vòng quét; vân tay đổi ⇒ có người sửa.

> **Giới hạn phải nói rõ:** cách này cho biết *cái gì đổi* và *trong khoảng nào*, **không**
> cho biết *ai đổi*. ERP 1 không lưu thông tin đó. Đừng để ai hiểu nhầm module trả lời được
> câu hỏi thứ ba.

---

## 6. Danh mục cảnh báo và danh mục lỗi

6 nhóm cảnh báo, 39 loại lỗi, 39 điều kiện — **toàn bộ tắt sẵn**.

| Nhóm | Số lỗi | Nội dung |
|---|---|---|
| `SLA` | 7 | Packing list chưa lập / lập muộn / treo; phiếu nhập kho lệch >10%; tờ khai duyệt chậm |
| `TRUNG_LAP` | 5 | Trùng cơ hội theo SĐT / khách; cơ hội không định danh; sao đặt tay; chốt không đơn |
| `DON_HANG` | 8 | Sửa sau chốt, sửa nhiều lần, sửa giảm tiền, giảm trừ cao, đơn trùng, sửa lén |
| `GIAO_DICH` | 10 | Tự duyệt, duyệt siêu tốc, ngoài giờ, không chứng từ, chi trùng, lệch sao kê |
| `CHI_PHI_CONG_NO` | 7 | Cước vượt định mức, cước sửa lén, công nợ vượt hạn mức, NCC nợ âm |
| `CHEO_CHAM_CONG` | 2 | Thao tác ngày nghỉ / ngoài ca (**tắt, và cần hỏi trước khi kết luận**) |

Danh sách phép đo đầy đủ ở `may_chu/src/giam_sat/phep_do/chi_muc.ts`. Mã phép đo là **hợp
đồng** giữa mã nguồn và cấu hình — đổi mã của một phép đo đã phát hành sẽ làm điều kiện đang
chạy trở thành "phép đo không tồn tại" và im lặng không bắt gì nữa.

### Phép đo chưa triển khai

`chi_vuot_han_muc` **không chạy được**: bảng `chi.tbl_han_muc_chi` của ERP 1 chỉ có
`Id / CreatedDate / Fk_Approve_id / IsDeleted / LastUpdateTime` — trường `MoneyValue Value`
của entity `HanMucChi` **không được ghi xuống CSDL**, nên không có số tiền nào để so.

Xử lý: giữ loại lỗi trong danh mục (nghiệp vụ vẫn cần), phép đo khai `chua_trien_khai` kèm lý
do, rule engine bỏ qua **có ghi nhật ký**. Trả 0 dòng im lặng nguy hiểm hơn nhiều — nó nhìn
y hệt "không có khoản chi nào vượt hạn mức". Ghi trong `TECH_DEBT.md`.

---

## 7. Hai cái bẫy đã xác minh trong ERP 1

**7.1. `Tax.TaxStatus` và `Tax.SlaStatus` lưu dạng JSON có dấu nháy kép.**
`TaxConfiguration.cs` dùng `HasConversion(v => JsonSerializer.Serialize(v, jsonOptions))` với
`JsonStringEnumConverter`, nên giá trị trong CSDL là `"APPROVED"`, `"SLA_SLOW"` — **kèm dấu
nháy**. Viết `where "TaxStatus" = 'APPROVED'` sẽ **luôn** trả 0 dòng. Mọi so sánh trong module
bọc qua `replace(cot, '"', '')`.

**7.2. Tên cột xóa mềm không đồng nhất.**

| Schema | Cột | Kiểu |
|---|---|---|
| `sale`, `manage_debt` | `IsDelete` | boolean |
| `usr`, `thu`, `Shipments` | `IsDeleted` | **int** (0/1) |
| `transaction` | `IsDeleted` | boolean |
| `erp_logistic` (public) | `IsDeleted` | boolean |

Dùng nhầm kiểu thì Postgres báo lỗi ngay (tốt); dùng nhầm **tên** thì câu vẫn chạy và lọc sai
(tệ). Công cụ `doi_chieu_schema` bắt được cái sau.

---

## 8. Threat model (OWASP ASVS Level 2)

Module chạm dữ liệu tài chính và dữ liệu cá nhân nhân viên.

| Vai trò | Quyền |
|---|---|
| `admin` | Toàn quyền, gồm cấu hình nguồn dữ liệu và chạy quét tay |
| `kiem_soat` | Xem và xử lý cảnh báo, sửa danh mục và điều kiện. **Không** cấu hình nguồn |
| Vai trò khác | Không thấy menu; mọi endpoint trả **403** |

`nhan_su` và `truong_phong` **không** có mặt, và đó không phải thiếu sót: họ nằm trong số
người bị giám sát.

| Mối đe dọa | Kiểm soát |
|---|---|
| Người bị giám sát tự đóng cảnh báo của mình | Vai trò `kiem_soat` tách khỏi nhân sự và nghiệp vụ; `canh_bao_xu_ly` không sửa/xóa được qua API |
| Sửa URL xem cảnh báo ngoài phạm vi | Lọc theo vai trò ở tầng máy chủ; test truy cập chéo hai tài khoản |
| Nhập SQL qua màn hình cấu hình | SQL trong mã nguồn; `phep_do` đối chiếu danh sách đóng; tham số qua `$1,$2`; cưỡng chế bằng test kiến trúc |
| Lộ mật khẩu ERP 1 | Chỉ ở `.env`; cổng CI 1 quét secret chặn merge |
| Module ghi nhầm vào ERP 1 | Chỉ-đọc ba lớp; test kiến trúc chặn tệp khác mở kết nối |
| Script chạy trong hộp thư người đọc | `thoat_html()` cho mọi chuỗi từ ERP 1; có test riêng |
| Công thức chạy khi mở CSV | `o_csv()` vô hiệu hóa ô bắt đầu bằng `= + - @`; có test riêng |
| Log rò dữ liệu | Nhật ký chỉ ghi mã phép đo, số đếm, thời gian |

**Endpoint công khai:** không có. Toàn bộ `/api/giam-sat/*` yêu cầu đăng nhập.

---

## 9. Vận hành

### Biến môi trường

Xem `.env.example`, khối `ERP1_*` và `SMTP_*`. Để trống `ERP1_HOST` = tắt hẳn module.
Để trống `SMTP_HOST` = không gửi email (web và CSV vẫn chạy đầy đủ).

### Quy trình bật một quy tắc

1. Cài đặt → Nguồn ERP → **Dò tìm database** → chọn database cho từng mã nguồn → **Kiểm tra**.
2. Cài đặt → Nguồn ERP → **Đối chiếu schema**. Sửa hoặc tắt điều kiện nào trỏ tới bảng thiếu.
3. Danh mục giám sát → tab Điều kiện → **Chạy thử**. Xem nó bắt bao nhiêu bản ghi thật.
4. Chốt ngưỡng với trưởng bộ phận, đối chiếu quy chế nội bộ đã ban hành.
5. Mới **Bật**.

### Lệnh

```bash
npm --workspace may_chu run doi_chieu_schema   # đối chiếu schema, thoát mã 1 nếu có vấn đề chặn
npm test                                        # test đơn vị + thiết kế + kiến trúc
npm --workspace may_chu run test_e2e            # e2e (cần DB tên chamcong_test*)
```

### Vòng quét

Chạy mỗi 15 phút, mỗi loại lỗi quét tối đa một lần trong mỗi ô 60 phút. Nhiều instance chạy
song song không quét trùng nhờ khóa việc `cong_viec_da_chay`. Một lần quét thất bại ghi
`thanh_cong = false` — **không** im lặng báo 0 cảnh báo.

---

## 10. Hạn chế đã biết

| Hạn chế | Hệ quả |
|---|---|
| Vân tay không cho biết **ai** sửa | Chỉ mở được cuộc kiểm tra, không quy trách nhiệm được |
| `chi_vuot_han_muc` chưa triển khai | Không phát hiện được chi vượt hạn mức cho tới khi ERP 1 bổ sung cột |
| SQL viết theo schema suy ra từ mã nguồn ERP 1 | Phải chạy `doi_chieu_schema` sau mỗi lần ERP 1 nâng cấp |
| Công thức tính sao cơ hội chép từ ERP 1 | ERP 1 đổi ngưỡng thì phép đo báo sai — **`doi_chieu_schema` không bắt được** vì đây là lệch *logic*, không phải lệch schema |
| Nhóm chéo chấm công nhiều dương tính giả | Tắt mặc định; bắt buộc hỏi người liên quan trước |
| Bản ghi ERP 1 mang `Guid.Empty` | Không quy trách nhiệm được cho ai — cần vá phía `erp_logistic` |

---

## 11. Phát hiện kèm theo về ERP 1 (ngoài phạm vi module)

Module không sửa `erp_manager` và `erp_logistic`. Các điểm sau cần quyết định riêng:

| Phát hiện | Vị trí | Mức theo checklist |
|---|---|---|
| Không gọi `UseAuthentication()`, không `[Authorize]` | `xnk.Logistic/Program.cs` | B6.1, B6.2 — R01 rất cao |
| SQL injection vào CSDL hải quan, chạy bằng tài khoản `sa` | `SearchEcusQueryHandler.cs` | B6.6 — rất cao |
| Chuỗi kết nối `sa` hard-code; secret trong `appsettings.*.json` | `ECusService.cs` | B6.4 — R04 |
| Khóa tờ khai không chặn sửa/xóa dòng tiền | `Tax.Update` vs `TaxRowItem.UpdateV2` | B9.1 |
| Kiểm quyền `KCB_EDITING` viết sai nên không bao giờ chặn | `UpdateGoodsCommandHandler.cs` | B6.2 |
| CORS `AllowAnyOrigin()` | `xnk.Logistic/Program.cs` | B6.10 |
| Thiếu `ModifiedBy`/`ModifiedDate` trên bảng tiền | cả hai repo | B6.7 |
| Chấm công tồn tại ở hai nơi (`construction.workers`) | `erp_manager` | C1.8 |

Lớp phát hiện ở ERP 2 là biện pháp **bù đắp**, không thay thế việc vá những lỗi trên.
