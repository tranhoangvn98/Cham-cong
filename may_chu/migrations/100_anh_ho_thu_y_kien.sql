-- ============================================================================
-- 100 — Ảnh đính kèm trong hòm thư ý kiến.
--
-- Nhân sự trả lời hòm thư ý kiến có thể đính kèm ảnh minh chứng. Ảnh lưu trong
-- `ho_so_tep` với nhom mới `ho_thu_y_kien`, `thuoc_id` = id hòm thư. Người lao
-- động xem được ảnh của hòm thư CỦA MÌNH qua route có phân quyền riêng — xem
-- tuyen/ho_thu_y_kien.ts (không phục vụ tĩnh, kiểm magic byte như mọi tệp hồ sơ).
-- ============================================================================

alter table ho_so_tep drop constraint if exists ho_so_tep_nhom_check;
alter table ho_so_tep add constraint ho_so_tep_nhom_check check (nhom in (
  'hop_dong','bien_ban','luong','cong_viec','bao_cao','khieu_nai','thiet_bi',
  'thong_tin','tai_lieu','nguoi_phu_thuoc','bhxh','don_tu','ot_tai_lieu','ot_ket_qua',
  'ho_thu_y_kien','khac'
));
