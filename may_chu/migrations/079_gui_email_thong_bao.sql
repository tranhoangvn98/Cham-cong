-- Module: GUI EMAIL THONG BAO QUA MICROSOFT GRAPH (045).
--
-- Thong bao (ke ca van ban AI da ban hanh — cung nam trong bang `thong_bao`) duoc gui kem
-- DOCX toi ca nhan / phong ban / toan cong ty tu hop thu hcns@tranhoangvietnam.com.
--
-- Fail-soft: chua khai MS_MAIL_* trong .env thi cot `gui_email_loi` ghi ly do va co nut
-- "Gui lai email" — KHONG chan buoc ban hanh.
alter table thong_bao add column if not exists da_gui_email boolean not null default false;
alter table thong_bao add column if not exists gui_email_luc timestamptz;
alter table thong_bao add column if not exists gui_email_loi text;

-- Cho tiet trinh quet hang cho (lich_chay): nhung thong bao chua gui duoc email.
create index if not exists thong_bao_cho_gui_email_idx
  on thong_bao(tao_luc) where da_gui_email = false and da_go = false;
