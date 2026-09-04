-- Module: KHOA CUA THEO GIO (chan VAO ngoai gio lam viec).
--
-- AN TOAN PCCC (QCVN 06 / NĐ 136): tinh nang nay CHI chan chieu VAO. Loi RA phai luon tu do
-- bang PHAN CUNG (nut exit / thanh day / khoa fail-safe) — phan mem khong duoc khoa loi thoat.
--
-- Vi lenh dieu khien cua khac nhau theo firmware (dong acc SenseFace kén lenh — xem vu
-- DATA QUERY), lenh MO/CHAN de CAU HINH duoc va CO NUT TEST. Mac dinh RONG: bo lich khong tu
-- ban lenh nao cho toi khi admin dien lenh va bam test xac nhan tren may that. Bat = false mac
-- dinh: khong bao gio tu bat.

create table if not exists khoa_cua_lich (
  thiet_bi_serial   text primary key references thiet_bi(serial) on delete cascade,
  bat               boolean not null default false,
  -- Trong khung [gio_mo, gio_dong] la CHO VAO; ngoai khung do CHAN VAO.
  gio_mo            time not null default '07:00',
  gio_dong          time not null default '19:00',
  -- Cuoi tuan (T7, CN) chan ca ngay.
  cuoi_tuan_chan    boolean not null default true,
  -- Lenh ADMS gui xuong may. RONG = chua cau hinh -> bo lich khong ban gi (an toan).
  -- Vi du (kiem chung tren may that truoc): CONTROL DEVICE ... cho dong acc.
  lenh_mo           text not null default '',
  lenh_chan         text not null default '',
  -- Trang thai da ap dung lan cuoi ('mo' | 'chan') — de chi gui lenh KHI DOI trang thai.
  trang_thai        text check (trang_thai in ('mo','chan')),
  cap_nhat_luc      timestamptz not null default now()
);

comment on table khoa_cua_lich is
  'Lich chan VAO ngoai gio cho tung may. Chi chan chieu vao — loi ra phai tu do bang phan cung.';
