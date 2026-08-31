-- Ban chot cap cong ty: bang cham cong thang va bang luong thang, SAU KHI DUOC DUYET.
--
-- VI SAO CO BANG NAY: yeu cau la "bang chot cuoi cung sau khi duoc duyet thi luu SharePoint".
-- Truoc di tru nay, bang cong va bang luong chi la DU LIEU TINH RA, xem tren web — khong co
-- tep nao ton tai de day di dau. Bang nay ghi lai tung ban ket xuat da chot.
--
-- KHONG PHAI BAN GOC PHAP LY. Ban goc la du lieu trong `bang_cong_ngay` / `phieu_luong` cong
-- voi hai cot `duyet_boi` va `duyet_luc` o day — chung tra loi duoc "ai chot con so nay, luc
-- nao". Tep XLSX chi la ban ket xuat, sinh lai duoc tu cung du lieu do.
--
-- Do la ly do tep duoc phep GHI DE: mot ky bi tra lai roi duyet lai thi ban ket xuat moi thay
-- ban cu. Khac han kho tep ho so, noi ban scan CCCD va hop dong khong bao gio duoc ghi de.

create table if not exists ban_chot (
  id            uuid primary key default gen_random_uuid(),
  loai          text not null check (loai in ('bang_cong','bang_luong')),
  -- 'YYYY-MM'. Mot thang mot ban cho moi loai.
  ky            text not null check (ky ~ '^\d{4}-\d{2}$'),

  -- Duong dan tren dia, dang `_ban_chot/<loai>/<ky>_<loai>_<hex>.xlsx`.
  ten_luu       text not null unique,
  -- Ten cho nguoi doc, dung khi tai ve tu web.
  ten_goc       text not null,
  kieu_mime     text not null
                default 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  kich_thuoc    int not null check (kich_thuoc > 0),
  -- So nhan vien trong ban chot. Mot ban 0 dong la mot dau hieu can nguoi xem.
  so_dong       int not null default 0 check (so_dong >= 0),

  -- HAI COT NAY LA LY DO CA BANG TON TAI. Khong co chung thi day chi la mot cai dem tep.
  duyet_boi     uuid references nguoi_dung(id) on delete set null,
  duyet_luc     timestamptz not null,

  tao_luc       timestamptz not null default now(),

  -- MOT ban cho moi (loai, ky). Duyet lai thi thay ban cu, khong tao ban thu hai: hai ban
  -- chot cung mot thang la hai con so cung "chinh thuc", va khong ai biet tin ban nao.
  constraint ban_chot_mot_ban unique (loai, ky)
);

create index if not exists ban_chot_ky_idx on ban_chot(ky desc, loai);

comment on table ban_chot is
  'Ban ket xuat da duyet cua bang cong / bang luong tung thang. Ban goc phap ly la du lieu '
  'trong CSDL cong voi duyet_boi/duyet_luc; tep XLSX sinh lai duoc nen duoc phep ghi de.';
