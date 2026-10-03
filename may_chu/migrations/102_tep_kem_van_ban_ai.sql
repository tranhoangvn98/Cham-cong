-- ============================================================================
-- 102 — Tệp đính kèm cho văn bản AI.
--
-- Người soạn văn bản AI có thể đính kèm tệp (PDF/JPG/PNG/DOCX/XLSX, kiểm magic byte
-- như mọi tệp hồ sơ) ngay khi soạn. Tệp lưu trong `ho_so_tep` nhóm mới
-- `thong_bao_tep_kem`, `thuoc_id` = id bản nháp; khi BAN HÀNH thì chuyển `thuoc_id`
-- sang id thông báo (cùng transaction). Email phát hành gửi kèm cả tệp này.
-- ============================================================================

alter table ho_so_tep drop constraint if exists ho_so_tep_nhom_check;
alter table ho_so_tep add constraint ho_so_tep_nhom_check check (nhom in (
  'hop_dong','bien_ban','luong','cong_viec','bao_cao','khieu_nai','thiet_bi',
  'thong_tin','tai_lieu','nguoi_phu_thuoc','bhxh','don_tu','ot_tai_lieu','ot_ket_qua',
  'ho_thu_y_kien','thong_bao_tep_kem','khac'
));
