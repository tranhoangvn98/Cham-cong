-- Vai tro moi: truong phong nhan su ("TP HR").
--
-- VI SAO CAN MOT VAI TRO RIENG, khong dung `nhan_su` san co:
--
-- Ho so nhan su la ho so PHAP LY. Nap them mot ban scan vao la them chung cu — viec do
-- nhan su lam hang ngay va cang de cang tot. Nhung SUA hay XOA mot ban da nap la lam mat
-- chung cu, va do phai la viec co nguoi chiu trach nhiem.
--
-- Truoc di tru nay, moi tai khoan `nhan_su` deu xoa duoc bat ky tep nao trong ho so bat ky
-- ai, khong de lai dau vet ngoai nhat ky thao tac. Nay tach ra:
--
--   nhan_su                 nap tep moi vao o con trong        (them chung cu)
--   truong_phong_nhan_su    them, VA thay / go tep da co       (sua chung cu)
--   admin                   nhu tren — de khong bao gio khoa chet he thong
--
-- `truong_phong` (truong phong cac phong ban khac) KHONG nam trong danh sach nay: ho khong
-- doc duoc ho so nhan su cua cap duoi, nen cang khong sua duoc.

alter table nguoi_dung drop constraint if exists nguoi_dung_vai_tro_check;
alter table nguoi_dung
  add constraint nguoi_dung_vai_tro_check
  check (vai_tro in ('admin','nhan_su','truong_phong','truong_phong_nhan_su','nhan_vien','cho_duyet'));

-- Truong phong nhan su la mot con nguoi cu the trong cong ty, nen PHAI gan voi mot ho so
-- nhan vien — khong de trong nhu `admin` hay `nhan_su` (co the la tai khoan he thong).
-- Nho vay nhat ky thao tac "ai xoa tep nay" luon truy nguoc duoc ve mot nguoi.
alter table nguoi_dung drop constraint if exists nguoi_dung_phai_gan_nhan_vien;
alter table nguoi_dung
  add constraint nguoi_dung_phai_gan_nhan_vien
  check (vai_tro in ('admin','nhan_su','cho_duyet') or nhan_vien_id is not null);

comment on column nguoi_dung.vai_tro is
  'admin | nhan_su | truong_phong | truong_phong_nhan_su (TP HR: duoc thay/go tep ho so) '
  '| nhan_vien | cho_duyet (dang nhap duoc, chua co quyen gi)';
