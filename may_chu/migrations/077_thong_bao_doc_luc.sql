-- Chuong bao: ghi lai thoi diem nguoi dung doc tung thong bao rieng, de giao dien hien
-- "Đã xem · 19/09 11:52" thay vi chi co trang thai da_doc true/false.

alter table thong_bao_rieng add column if not exists doc_luc timestamptz;
