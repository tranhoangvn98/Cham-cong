-- Module: CONG CHUAN RIENG theo NGUOI / KHOI (YC HR 07/10/2026, BC so 02).
--
-- Cong chuan truoc day chi co MOT con so toan cong ty (`tham_so_luong.cong_chuan_thang`;
-- khong khai thi dem theo lich that). Nhung moi nhom co cong chuan khac nhau:
--   - Khoi Kho Ha Noi: 25 cong/thang (cong chuan co dinh).
--   - Mot so nguoi theo quyet dinh rieng: 30 cong/thang.
-- Them hai muc ghi de theo thu tu: NGUOI > KHOI > tham so chung > dem theo lich.
--
-- null = khong ghi de, dung muc cua cap tren (gioi han la dem theo lich).

alter table khoi
  add column if not exists cong_chuan_thang numeric(5,2)
    check (cong_chuan_thang is null or cong_chuan_thang >= 0);

comment on column khoi.cong_chuan_thang is
  'Cong chuan co dinh cua khoi. null = theo tham_so_luong.cong_chuan_thang; khong co thi dem theo lich.';

alter table nhan_vien
  add column if not exists cong_chuan_thang numeric(5,2)
    check (cong_chuan_thang is null or cong_chuan_thang >= 0);

comment on column nhan_vien.cong_chuan_thang is
  'Cong chuan co dinh RIENG cua nguoi nay (de len khoi). null = theo khoi > tham so > lich.';

-- NGOAI LE DA DUYET (07/10/2026): Khoi Kho Ha Noi cong chuan 25 cong/thang.
update khoi set cong_chuan_thang = 25 where ma = 'kho_hn';
