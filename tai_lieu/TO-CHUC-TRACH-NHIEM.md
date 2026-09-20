# Tổ chức – Vị trí – Trách nhiệm (JD phân tầng 3 cấp + RACI + PDCA)

Phiên bản: 1.101.0 (2026-09-20)

## 1. Mô hình

Công ty quản lý công việc theo 4 tầng, lưu toàn bộ trong PostgreSQL:

```
Nhóm trách nhiệm (23)          → bảng nhom_trach_nhiem
└── Trách nhiệm chi tiết (67)  → bảng tn_chi_tiet  (mỗi khối có NGƯỜI QUẢN TRỊ = thường là trưởng phòng)
    └── Đầu việc / Task (296)  → bảng dau_viec    (gắn vị trí thực thi, tần suất, SLA, KPI, mã BC, ngưỡng phân cấp)
        └── Step công việc     → bảng dau_viec_buoc (checklist mẫu — nhập tay)
```

- Một nhân sự **kiêm nhiệm nhiều vị trí** (`nhan_vien_vi_tri`, n-n); mỗi vị trí thực thi
  các đầu việc thuộc nhiều trách nhiệm chi tiết khác nhau.
- **RACI theo vai trò** (`dau_viec_raci`): R = thực hiện · A = chịu trách nhiệm cuối
  (duyệt) · C = tham vấn · I = được thông báo. Vai trò: CEO, TP (trưởng phòng), TN
  (người quản trị trách nhiệm chi tiết), NV/CV (người giữ vị trí thực thi), TBKS.
- Dữ liệu nạp tự động lúc máy chủ khởi động từ `may_chu/src/to_chuc/du_lieu_jd*.ts`
  (nguồn: file “Sổ làm việc số 01 – Phân tầng 3 cấp trách nhiệm – Task 20.09.2026”).
  Nạp **idempotent** — chạy lại không sinh trùng; muốn nạp lại sạch: xóa các bảng
  `dau_viec*`, `tn_chi_tiet`, `vi_tri`, `nhom_trach_nhiem`, `bao_cao_mau` rồi khởi động lại.

## 2. Luồng hoạt động (PDCA)

- **P — Plan**: gán vị trí cho nhân viên → hệ thống tự tạo mẫu việc định kỳ
  (`nguon='jd'`) cho từng đầu việc theo tần suất (ngày/tuần/2 tuần/tháng/quý/năm/6 tháng).
  Tần suất **Phát sinh / Liên tục** KHÔNG sinh tự động — chỉ làm căn cứ khi giao tay.
- **D — Do**: lịch chạy đêm (`sinh_viec_dinh_ky`) sinh việc, gắn `dau_viec_id`, copy step
  checklist; nhân viên bắt đầu → tick step → nộp kết quả.
- **C — Check**: người A (theo RACI) duyệt kết quả; việc có mã BC hiển thị yêu cầu nộp
  báo cáo, báo cáo nộp gắn `ma_bc` + `cong_viec_id` + `dau_viec_id` để đối chiếu.
- **A — Act**: duyệt hoặc yêu cầu làm lại (phản hồi); trưởng phòng chủ trách nhiệm chi
  tiết điều chỉnh rule (tần suất, SLA, KPI, RACI) → mẫu định kỳ đồng bộ theo.

## 3. Trang web

| Trang | Ai dùng | Nội dung |
|---|---|---|
| `/to-chuc` | Nhân sự / admin | 5 tab: Cơ cấu & bao phủ · Vị trí & JD · Nhân viên · Đo lường · Mã báo cáo |
| `/cong-viec` → tab **Trách nhiệm của tôi** | Mọi nhân viên | Nhóm TN → TN chi tiết → đầu việc; trạng thái kỳ hiện tại + thanh % đã làm đủ |

- **Cơ cấu & bao phủ**: cây nhóm → trách nhiệm chi tiết → đầu việc; đèn đỏ = đầu việc
  chưa có người thực hiện (vị trí chưa gán cho ai đang làm).
- **Vị trí & JD**: xem JD từng đầu việc; nhân sự sửa **RACI + step** (tự điền), bật/tắt
  sinh việc, **thêm vị trí mới**, **thêm đầu việc bám trách nhiệm chi tiết có sẵn** hoặc
  **SAO CHÉP** từ đầu việc đã có (kéo theo RACI + checklist).
- **Đo lường trách nhiệm**: theo nhân sự — tỷ lệ hoàn thành, chờ duyệt, quá hạn trong kỳ.
- **Mã báo cáo**: 208 mã BC sinh tự động từ JD + số báo cáo đã nộp 30 ngày gần nhất.

## 4. Phân quyền

- Nhân sự / admin: toàn quyền danh mục (vị trí, đầu việc, gán vị trí).
- **Trưởng phòng quản lý trách nhiệm chi tiết** (ghi ở `tn_chi_tiet.nguoi_quan_tri_vi_tri_id`)
  được sửa rule của đầu việc thuộc khối đó; không đụng được khối khác.
- Nhân viên: xem trách nhiệm của chính mình, không sửa danh mục.

## 5. API

- `/api/to-chuc/*`: vi-tri, nhom, dau-viec (+ `:id/sao-chep`, `:id/raci`, `:id/buoc`,
  `:id/bat-tat`), bao-phu, do-luong, ma-bc, nhan-vien/:id/vi-tri (gán/gỡ), toi/trach-nhiem.
- `/api/toi/trach-nhiem`: trách nhiệm của chính người đang đăng nhập (dùng cho app sau này).

## 6. Lưu ý

- 15 đầu việc chưa gán trách nhiệm chi tiết cấp 2 (file gốc để trống) nằm trong khối
  "(chưa gán)" của nhóm tương ứng — nhân sự gán lại ở tab Vị trí & JD.
- 68 đầu việc có ghi chú "cần review" và mã BC trạng thái "Đề xuất" — hệ thống vẫn sinh
  việc bình thường; rà và chuyển mã BC sang "Chuẩn" khi chốt.
- Sửa rule đầu việc có tần suất tổ hợp (VD "Tuần + Tháng") sinh theo chu kỳ ngắn nhất;
  chuỗi gốc lưu ở `tan_suat_tho`.
- Sửa logic tính công/parser ADMS thì thêm test; ở đây sửa `sinh_viec_dinh_ky` hay
  `phan_giai_raci` cũng phải chạy `npm --workspace may_chu run test_e2e` (cần DB `chamcong_test*`).
