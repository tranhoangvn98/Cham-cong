-- Module: OT THEO LOAI NGAY (ngay thuong / nghi tuan / le) + T7 VA HE SO OT THEO KHOI.
--
-- Boi canh (chu cong ty chot 17/09/2026):
--   1. OT co nhieu muc theo BLLD 2019 D.98: ngay thuong 150%, ngay nghi hang tuan 200%,
--      ngay le/tet 300%. Truoc day `phieu_luong.he_so_ot` la MOT so duy nhat (1,5) cho moi
--      gio OT — tra OT ngay le 150% la thap hon muc luat dinh.
--   2. Khoi Kho Ha Noi lam DU ngay thu Bay (1 cong, khong nua cong) va tra them gio ngay
--      thuong 100% — khac chinh sach chung. Day la NGOAI LE DA DUYET duy nhat; moi khoi khac
--      giu nguyen he so chung trong `tham_so_luong`.
--
-- Nguyen tac (ra soat 17/09/2026): logic ap CHUNG cho moi nhom nhan su; ngoai le phai duoc
-- duyet va ghi ro o day. Khong duoc tu them ngoai le moi ma khong co quyet dinh.

-- ---------------------------------------------------------------- ba he so OT vao tham so
alter table tham_so_luong
  add column if not exists he_so_ot_ngay_thuong numeric(4,2) not null default 1.50
    check (he_so_ot_ngay_thuong >= 0),
  add column if not exists he_so_ot_nghi_tuan   numeric(4,2) not null default 2.00
    check (he_so_ot_nghi_tuan >= 0),
  add column if not exists he_so_ot_ngay_le     numeric(4,2) not null default 3.00
    check (he_so_ot_ngay_le >= 0);

comment on column tham_so_luong.he_so_ot_ngay_thuong is
  'He so OT ngay thuong (BLLD 2019 D.98: it nhat 150%). Khoi co the ghi de bang khoi.he_so_ot_ngay_thuong.';
comment on column tham_so_luong.he_so_ot_nghi_tuan is
  'He so OT ngay nghi hang tuan (Chu nhat) — BLLD D.98: it nhat 200%.';
comment on column tham_so_luong.he_so_ot_ngay_le is
  'He so OT ngay le/tet va ngay nghi co huong luong — BLLD D.98: it nhat 300%.';

-- ---------------------------------------------------------------- breakdown OT tren phieu
-- Giữ `phut_ot` / `tien_ot` la TONG (tuong thich xuat XLSX/ERP va cac bang cu); them 5 cot
-- breakdown de hien thi chi tiet "OT thuong / OT CN / OT le" tren phieu luong.
alter table phieu_luong
  add column if not exists phut_ot_nghi_tuan int            not null default 0,
  add column if not exists phut_ot_le        int            not null default 0,
  add column if not exists tien_ot_thuong    numeric(14,2)  not null default 0,
  add column if not exists tien_ot_nghi_tuan numeric(14,2)  not null default 0,
  add column if not exists tien_ot_le        numeric(14,2)  not null default 0,
  -- He so CHUP LAI tai thoi diem tinh (de hien cong thuc tren phieu; doi tham so sau khong
  -- lam doi cach trinh bay cua phieu da tra).
  add column if not exists he_so_ot_nghi_tuan numeric(5,2)  not null default 2.00,
  add column if not exists he_so_ot_le       numeric(5,2)  not null default 3.00;

comment on column phieu_luong.phut_ot_nghi_tuan is
  'Phut OT roi vao ngay nghi hang tuan (Chu nhat) cua ky. Phan ngay thuong = phut_ot - phut_ot_nghi_tuan - phut_ot_le.';
comment on column phieu_luong.phut_ot_le is
  'Phut OT roi vao ngay le/tet theo lich nghi cua nguoi do.';

-- ---------------------------------------------------------------- ngoai le theo khoi
-- null = theo `tham_so_luong` (chinh sach chung). Chi khoi duoc duyet moi duoc khac.
alter table khoi
  add column if not exists t7_nua_cong            boolean,
  add column if not exists he_so_ot_ngay_thuong  numeric(4,2);

comment on column khoi.t7_nua_cong is
  'Thu Bay nua cong cua khoi nay. null = theo tham_so_luong.t7_nua_cong (chinh sach chung).';
comment on column khoi.he_so_ot_ngay_thuong is
  'He so OT ngay thuong rieng cua khoi. null = theo tham_so_luong.he_so_ot_ngay_thuong.';

-- NGOAI LE DA DUYET (17/09/2026): Khoi Kho Ha Noi lam DU ngay thu Bay (1 cong) va tra them
-- gio ngay thuong 100%. Cac khoi khac giu nguyen nua cong va he so chung.
update khoi set t7_nua_cong = false, he_so_ot_ngay_thuong = 1.00
 where ma = 'kho_hn';
