-- CHI TIET TUNG DONG cua mot khoan tren phieu luong.
--
-- Van de (chu cong ty chot): mot khoan tru (vd 'tru_giam_thuong_kl' — giam thuong theo ky luat)
-- chi la MOT dong tong tren phieu (phieu_luong_khoan PK theo (phieu, khoan_ma) -> moi khoan mot
-- dong). Nguoi xem chi thay "Giam thuong theo ky luat 250.000" GOP lai, khong biet gom nhung
-- lenh tru nao. Yeu cau: "chi tiet tung lenh tru ra, khong de gop" — moi lenh MOT dong rieng
-- co ly do + so tien.
--
-- Cach lam: giu nguyen mo hinh mot dong TONG tren phieu_luong_khoan (tuong thich nguoc, khong pha
-- rang buoc PK, khong dung lai tinh_ky_luong), va them bang CON nay giu tung dong chi tiet. Tong
-- cua khoan = sum(so_tien) cac dong chi tiet — tinh o tuyen sua chi tiet roi ghi vao dong tong.
--
-- Gan theo (phieu_luong_id, khoan_ma): nhat quan voi phieu_luong_khoan, join thang, va tu dong
-- CASCADE khi dong khoan cha bi xoa hoac ca phieu bi xoa. Chi tiet la khoan GO TAY cua nhan su
-- (khong phai may sinh tu chinh sach), nen dong cha luon tu_chinh_sach = false.

create table if not exists phieu_luong_khoan_ct (
  id             uuid primary key default gen_random_uuid(),
  phieu_luong_id uuid not null,
  khoan_ma       text not null,
  ly_do          text not null,
  so_tien        numeric(14,2) not null default 0,
  thu_tu         int  not null default 0,
  tao_boi        uuid references nguoi_dung(id) on delete set null,
  tao_luc        timestamptz not null default now(),
  -- Xoa dong khoan cha (hoac ca phieu) thi chi tiet di theo — khong de lai dong mo coi.
  foreign key (phieu_luong_id, khoan_ma)
    references phieu_luong_khoan(phieu_luong_id, khoan_ma) on delete cascade
);

create index if not exists phieu_luong_khoan_ct_idx
  on phieu_luong_khoan_ct(phieu_luong_id, khoan_ma, thu_tu);
