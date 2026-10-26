-- MIEN CHAM CONG (26/10/2026)
--
-- Van de: khoi VP Lang Son va tai khoan he thong khong quet may. Ngay nao cung bi ket luan
-- 'vang' -> moi thang mot phieu vi pham + mot ho so ky luat cho tung nguoi, va bang dieu khien
-- bao "60 nguoi vang" trong khi thuc te chi vai nguoi.
--
-- Hai co: theo KHOI (ca khoi khong cham cong) va theo TUNG NGUOI (truong hop le, tai khoan he
-- thong). Hieu luc = co cua nguoi HOAC co cua khoi.
--
-- Chi bo dong VANG. Ngay le / nghi tuan / nghi phep giu nguyen: do la su that cua lich, va
-- ngay le dang duoc tra luong (thang 9/2026 moi nguoi khoi VP Lang Son co 3 cong ngay le).

alter table khoi
  add column if not exists mien_cham_cong boolean not null default false;

alter table nhan_vien
  add column if not exists mien_cham_cong boolean not null default false;

-- Khoi VP Lang Son: chua co may cham cong tai diem, nhan su lam viec khong quet.
update khoi set mien_cham_cong = true where ma = 'vp_ls';

-- Tai khoan he thong (dung de he thong tu gui don thay nguoi) khong phai nguoi di lam.
update nhan_vien set mien_cham_cong = true where ma_nv = 'ERP134';

-- Xoa dong 'vang' cu cua nhom mien cham cong: xem script trien_khai/don_vang_mien_cham_cong.mjs
-- (chay tay, in so luong truoc/sau va khong dung toi dong ngay le / nghi phep).
