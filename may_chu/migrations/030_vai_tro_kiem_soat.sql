-- Vai tro moi: kiem soat noi bo.
--
-- VI SAO CAN MOT VAI TRO RIENG, khong dung `admin` hay `nhan_su` san co:
--
-- Module giam sat gian lan ghi nhan dau hieu bat thuong tren du lieu nghiep vu cua ERP 1 —
-- don hang, chung tu chi, cong no, cuoc van chuyen. Nguoi bi giam sat va nguoi doc canh bao
-- PHAI la hai nguoi khac nhau, neu khong thi ca co che khong con y nghia: ai cung tu dong
-- duoc canh bao cua chinh minh.
--
--   nhan_su                 KHONG thay module nay — ho lam nhan su, khong lam kiem soat
--   truong_phong            KHONG thay — chinh ho la doi tuong bi giam sat
--   kiem_soat               doc + xu ly canh bao, sua danh muc va dieu kien
--   admin                   nhu tren, VA cau hinh duoc nguon du lieu ERP 1
--
-- Cau hinh nguon du lieu tach rieng cho admin la co y: doi mot dong `ten_database` la doi
-- toan bo tap du lieu bi quet. Do la viec ha tang, khong phai viec kiem soat.
--
-- RANH GIOI PHAP LY — giong het `vi_pham` (xem 013_vi_pham.sql): canh bao do may sinh la
-- DAU HIEU CAN KIEM TRA, khong phai ket luan. Vai tro nay khong cho ai quyen ket toi ai.

alter table nguoi_dung drop constraint if exists nguoi_dung_vai_tro_check;
alter table nguoi_dung
  add constraint nguoi_dung_vai_tro_check
  check (vai_tro in ('admin','nhan_su','truong_phong','truong_phong_nhan_su','nhan_vien',
                     'kiem_soat','cho_duyet'));

-- Kiem soat vien la mot con nguoi cu the trong cong ty, nen PHAI gan voi ho so nhan vien —
-- khong de trong nhu `admin` hay `nhan_su` (co the la tai khoan he thong). Nho vay cot
-- `canh_bao.nguoi_xu_ly` luon truy nguoc duoc ve mot nguoi that.
alter table nguoi_dung drop constraint if exists nguoi_dung_phai_gan_nhan_vien;
alter table nguoi_dung
  add constraint nguoi_dung_phai_gan_nhan_vien
  check (vai_tro in ('admin','nhan_su','cho_duyet') or nhan_vien_id is not null);

comment on column nguoi_dung.vai_tro is
  'admin | nhan_su | truong_phong | truong_phong_nhan_su (TP HR: duoc thay/go tep ho so) '
  '| kiem_soat (kiem soat noi bo: doc va xu ly canh bao giam sat) '
  '| nhan_vien | cho_duyet (dang nhap duoc, chua co quyen gi)';
