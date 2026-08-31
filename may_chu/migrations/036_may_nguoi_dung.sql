-- Module: DANH SACH USER ENROLL TREN MAY (doi chieu voi mapping he thong).
--
-- Van de thuc te: may o kho enroll nguoi DUOI PIN da thuoc nhan vien khac (vd PIN 6 tren may kho
-- la mot anh kho, nhung PIN 6 trong he thong la nhan vien van phong) -> quet bi gan nham nguoi.
-- He thong map PIN TOAN CUC (khong theo tung may), nen phai DOI CHIEU user thuc trong may voi
-- mapping he thong de phat hien lech.
--
-- Bang nay giu ban chup user cua tung may (may day len sau lenh `DATA QUERY USERINFO`). KHONG
-- phai nguon su that de tinh cong — chi de doi chieu + canh bao trung/lech PIN.

create table if not exists may_nguoi_dung (
  thiet_bi_serial  text not null references thiet_bi(serial) on delete cascade,
  pin              text not null,
  ten_may          text,          -- Name enroll tren may (thuong ASCII khong dau, cat ngan)
  the              text,          -- Card
  quyen            int not null default 0,   -- Pri: 0 thuong, 14 admin...
  thay_luc         timestamptz not null default now(),  -- lan cuoi may bao ban ghi nay
  primary key (thiet_bi_serial, pin)
);
create index if not exists may_nguoi_dung_pin_idx on may_nguoi_dung(pin);
