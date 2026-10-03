-- Module: LAY Y KIEN DU THAO 7 NGAY — them han lay y kien cho van ban AI.
--
-- Khi nhan su mo "lay y kien" (thong_bao_nhap_ai chuyen sang 'dang_lay_y_kien'), he thong
-- dat `han_lay_y_kien` = luc mo + N ngay (mac dinh 7, xem cau hinh VAN_BAN_LAY_Y_KIEN_NGAY).
-- Qua han thi lich chay tu dong dua van ban ve 'cho_duyet' de nhan su sua doi hoac ban hanh;
-- cac endpoint gui y kien cung tu choi khi qua han (an toan kep).
--
-- Cot de nullable: ban nhap mo lay y kien TRUOC migration nay khong co han nen van duoc gop y.

alter table thong_bao_nhap_ai add column if not exists han_lay_y_kien timestamptz;
