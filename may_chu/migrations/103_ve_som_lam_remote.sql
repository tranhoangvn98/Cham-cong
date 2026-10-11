-- ============================================================================
-- 103 — Đơn xin về sớm (ve_som) và đơn xin làm Remote (lam_remote).
--
-- Hai loại mới trong bảng dùng chung `don_tu`:
--   - ve_som:      một ngày, `gio_bat_dau` = giờ dự kiến RA VỀ (tùy chọn). Đơn
--                  được duyệt thì ngày đó miễn luật "về sớm quá 30 phút mất nửa
--                  ngày công" (xem cong/quy_tac_tinh_cong.ts).
--   - lam_remote:  một hoặc nhiều ngày làm việc từ xa. Đơn được duyệt thì ngày đó
--                  tính MỘT CÔNG TRÒN, không bị ghi vắng vì không quẹt máy — trạng
--                  thái ngày mới `lam_remote` trên bảng công.
-- ============================================================================

-- ---------------------------------------------------------------- don_tu: thêm hai loại
--
-- CHỈ thay ràng buộc DANH SÁCH LOẠI (`loai in (...)`), KHÔNG đụng các ràng buộc theo
-- từng loại (`don_tu_lam_them`, `don_tu_cong_tac`, ...) — đúng cách mà di trú 042 đã
-- làm khi thêm `di_muon`.
alter table don_tu drop constraint if exists don_tu_loai_check;
alter table don_tu add constraint don_tu_loai_check
  check (loai in ('lam_them','doi_ca','cong_tac','thoi_viec','di_muon','ve_som','lam_remote'));

-- ---------------------------------------------------------------- bang_cong_ngay: trạng thái mới
alter table bang_cong_ngay drop constraint if exists bang_cong_ngay_trang_thai_check;
alter table bang_cong_ngay add constraint bang_cong_ngay_trang_thai_check
  check (trang_thai in
    ('vang','co_mat','nghi_phep','nghi_khong_luong','ngay_le','nghi_tuan','cong_tac',
     'lam_bu','ngoai_le','lam_remote'));

-- ---------------------------------------------------------------- chỉ mục cho tính công hằng ngày
-- `tinh_cong.ts` đọc don da duyet trum từng ngày — chỉ mục bộ phận như don_tu_cong_tac_idx.
create index if not exists don_tu_lam_remote_idx on don_tu(nhan_vien_id, tu_ngay, den_ngay)
  where loai = 'lam_remote' and trang_thai = 'da_duyet';
create index if not exists don_tu_ve_som_idx on don_tu(nhan_vien_id, tu_ngay)
  where loai = 've_som' and trang_thai = 'da_duyet';
