-- Module: CONG BO PHAT HANH — dot cong bo gan voi BAN NHAP VAN BAN AI.
--
-- Tu 1.106.1: dot cong bo phat hanh khong con tao thong bao tho nua ma SOAN THANH VAN BAN
-- CONG TY dung luong NĐ30 (bang thong_bao_nhap_ai: worker dung docx + gate + cap so) —
-- ban hanh xong xuat hien o tab "Van ban ban hanh" cua trang Van ban cong ty.

alter table cong_bo_phat_hanh
  add column if not exists nhap_ai_id uuid references thong_bao_nhap_ai(id);

create index if not exists cong_bo_phat_hanh_nhap_ai_idx
  on cong_bo_phat_hanh(nhap_ai_id);
