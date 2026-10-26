-- Module: CHE DO LUONG — them tuy chon KHONG THEO BANG LUONG.
--
-- Yeu cau 27/10/2026: nhan su outsource (ky hop dong dich vu / khoan viec) khong thuoc bang
-- luong cua cong ty, nhung van can ho so `nhan_vien` de cham cong, cap tai khoan, giao viec.
-- Truoc day chi co hai lua chon:
--   'vn' — vao bang luong VND
--   'tq' — khoi luong Trung Quoc (CNY)
-- Ca hai deu SINH PHIEU LUONG, nen nguoi outsource buoc phai nam trong mot bang luong nao do.
--
-- Nay them:
--   'khong' — KHONG theo bang luong: khong sinh phieu luong o ca ky VND lan CNY, tra theo hop
--             dong dich vu ben ngoai. Mac dinh cho nhan su co loai hop dong outsource.
--
-- Khong can sua ky luong: `ky_luong.ts` loc `che_do_luong = 'vn'`, `ky_luong_cny.ts` loc
-- `= 'tq'` — gia tri moi tu dong nam ngoai ca hai bang.
alter table nhan_vien drop constraint if exists nhan_vien_che_do_luong_ck;

alter table nhan_vien
  add constraint nhan_vien_che_do_luong_ck
  check (che_do_luong in ('vn', 'tq', 'khong'));

comment on column nhan_vien.che_do_luong is
  'vn = bảng lương VND (mặc định); tq = khối lương Trung Quốc (CNY); khong = không theo bảng lương (outsource, trả theo hợp đồng dịch vụ).';
