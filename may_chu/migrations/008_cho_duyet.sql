-- Trang thai "cho duyet": dang nhap duoc nhung CHUA vao duoc he thong.
--
-- Dung cho luong dang nhap Microsoft theo ten mien: ai co email thuoc ten mien cua cong ty
-- deu xac thuc duoc, nhung tai khoan sinh ra khong co quyen gi cho toi khi admin phan vai
-- tro. Nho vay nhan su khong phai khai truoc tung nguoi, ma cung khong ai tu vao duoc.
alter table nguoi_dung drop constraint if exists nguoi_dung_vai_tro_check;
alter table nguoi_dung
  add constraint nguoi_dung_vai_tro_check
  check (vai_tro in ('admin','nhan_su','truong_phong','nhan_vien','cho_duyet'));

-- Tai khoan cho duyet chua chac gan duoc voi ho so nhan vien (nguoi moi, chua ai khai),
-- nen phai duoc phep de trong nhan_vien_id.
alter table nguoi_dung drop constraint if exists nguoi_dung_phai_gan_nhan_vien;
alter table nguoi_dung
  add constraint nguoi_dung_phai_gan_nhan_vien
  check (vai_tro in ('admin','nhan_su','cho_duyet') or nhan_vien_id is not null);

comment on column nguoi_dung.vai_tro is
  'admin | nhan_su | truong_phong | nhan_vien | cho_duyet (dang nhap duoc, chua co quyen gi)';

-- Ai duyet, luc nao — de tra loi duoc "sao nguoi nay co quyen nay".
alter table nguoi_dung
  add column if not exists duyet_boi uuid references nguoi_dung(id) on delete set null,
  add column if not exists duyet_luc timestamptz;
