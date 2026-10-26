-- Anh chup lan kiem tra gan nhat: ung dung bat buoc cua cong ty da duoc dung tren may
-- tinh / dien thoai hay chua.
--
-- VI SAO CHI LA ANH CHUP: Microsoft Graph khong tra "danh sach ung dung da cai" khi tenant
-- khong dung Intune. Bao cao su dung M365 cho biet nguoi do DA KICH HOAT / DANG NHAP ung dung
-- nao trong 30 ngay, theo nen tang (Windows / Mobile). Vi vay bang nay luu BANG CHUNG SU DUNG
-- (da_dung / chi_web / khong_thay) chu khong phai trang thai cai dat.
--
-- Moi lan quet GHI DE toan bo anh chup (xoa + insert trong MOT transaction) de ho so luon phan
-- anh lan kiem tra gan nhat. Ket qua tung lan chay nam o bang cong_viec_da_chay.
create table if not exists ms365_ung_dung_kiem_tra (
  nhan_vien_id  uuid not null references nhan_vien(id) on delete cascade,
  nen_tang      text not null check (nen_tang in ('may_tinh', 'dien_thoai')),
  ung_dung      text not null,
  trang_thai    text not null check (trang_thai in (
    'da_dung', 'chi_web', 'khong_thay', 'khong_kiem_tra_duoc', 'khong_co_tai_khoan')),
  -- Ngay hoat dong cuoi CUA CHINH UNG DUNG do (chi bao cao OneDrive co cot nay).
  lan_hoat_dong date,
  -- Ngay bao cao Microsoft cap nhat (Report Refresh Date) — de nguoi doc biet du lieu cu the nao.
  ngay_bao_cao  date,
  nguon         text not null,
  chi_tiet      text,
  dong_bo_luc   timestamptz not null default now(),
  primary key (nhan_vien_id, nen_tang, ung_dung)
);

comment on table ms365_ung_dung_kiem_tra is
  'Anh chup lan kiem tra gan nhat: ung dung bat buoc da dung / chua thay, theo bao cao M365';
comment on column ms365_ung_dung_kiem_tra.trang_thai is
  'da_dung: co hoat dong trong ky; chi_web: chi thay ban web; khong_thay: khong co hoat dong; khong_kiem_tra_duoc: nguon khong tra duoc; khong_co_tai_khoan: chua co UPN';
comment on column ms365_ung_dung_kiem_tra.chi_tiet is
  'Ma ly do (khong phai cau hien thi): chi_dung_web, dong_bo_tep, can_entra_p1, bao_cao_khong_tach_thiet_bi, loi_bao_cao, khong_co_hoat_dong, chua_co_upn';
