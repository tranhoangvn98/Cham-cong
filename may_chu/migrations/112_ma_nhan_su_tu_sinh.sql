-- Ma nhan su cua he thong cham cong do HE THONG sinh, khong de nguoi go tay.
--
-- KHUON: NV + ma ngan cua khoi + MMYY (thang-nam vao lam) + so thu tu 4 chu so.
--
--   NVKHN05260001  = nhan vien Kho Ha Noi, vao thang 5/2026, nguoi thu 1
--   NVVP10260007   = nhan vien Khoi Van Phong, vao thang 10/2026, nguoi thu 7
--
-- VI SAO MA MANG NGHIA: ma nhan su di vao ten thu muc kho tep, vao phieu luong in ra, vao cau
-- hoi "nguoi nay thuoc dau". Mot day so tang dan thuan tuy (NV0001, NV0002...) tra loi duoc
-- dung mot cau: ai vao truoc. Ma mang khoi + thang tra loi duoc ba cau, va van giu duoc thu tu
-- trong thang cua tung khoi.
--
-- VI SAO KHONG TAI DUNG SO: ma nhan su la danh tinh trong ho so luu tru va tren phieu luong.
-- So cua nguoi da nghi ma cap lai cho nguoi moi thi hai nguoi cung mot ma trong lich su, va
-- khong co gi phan biet ho. Bo dem chi tang.

alter table khoi add column if not exists ma_ngan text;

alter table khoi drop constraint if exists khoi_ma_ngan_hop_le;
alter table khoi add constraint khoi_ma_ngan_hop_le
  check (ma_ngan is null or ma_ngan ~ '^[A-Z]{1,6}$');

-- Ma ngan cua bon khoi dang co. Chi ghi khi dang trong: da co nguoi sua tren production thi
-- giu nguyen lua chon cua ho.
update khoi set ma_ngan = 'VP'   where ma = 'vp'    and ma_ngan is null;
update khoi set ma_ngan = 'KHN'  where ma = 'kho_hn' and ma_ngan is null;
update khoi set ma_ngan = 'VPLS' where ma = 'vp_ls' and ma_ngan is null;
update khoi set ma_ngan = 'KTQ'  where ma = 'kho_tq' and ma_ngan is null;

comment on column khoi.ma_ngan is
  'Ma ngan cua khoi, chen vao ma nhan su (VP, KHN, VPLS, KTQ). Chi chu HOA, khong dau.';

-- ---------------------------------------------------------------- bo dem so thu tu
--
-- Khoa la (ma ngan khoi, thang): moi khoi dem lai tu 0001 khi sang thang moi. Nho vay ma ngan va
-- de doc, va so thu tu noi len "nguoi thu may duoc nhan trong thang do cua khoi do".
--
-- Vi sao la BANG chu khong phai SEQUENCE: sequence khong dem theo cap (khoi, thang), va muon
-- dem theo cap thi phai tao mot sequence cho moi cap — moi thang lai sinh them mot doi tuong
-- CSDL. Mot bang khoa doi thi khong bao gio phinh theo thoi gian.
create table if not exists dem_ma_nhan_su (
  ma_ngan_khoi  text not null,
  -- 'MMYY' — thang nam vao lam, dung nhu phan nam trong ma.
  thang         text not null check (thang ~ '^[0-9]{4}$'),
  so_cuoi       int  not null default 0 check (so_cuoi >= 0),
  cap_nhat_luc  timestamptz not null default now(),
  primary key (ma_ngan_khoi, thang)
);

comment on table dem_ma_nhan_su is
  'Bo dem so thu tu trong ma nhan su, theo (ma ngan khoi, thang-nam vao lam). Chi tang, khong lui.';

-- Neo bo dem vao nhung ma DA cap theo khuon moi, de lan cap dau tien khong dung ma cu.
-- Chay lai duoc: `greatest` chi nang bo dem len, khong bao gio ha.
insert into dem_ma_nhan_su (ma_ngan_khoi, thang, so_cuoi)
select phan[1], phan[2], max(phan[3]::int)
  from (
    select regexp_match(upper(trim(ma_nv)), '^NV([A-Z]+)([0-9]{4})([0-9]{4,})$') as phan
      from nhan_vien
  ) t
 where phan is not null
 group by phan[1], phan[2]
on conflict (ma_ngan_khoi, thang) do update
   set so_cuoi = greatest(dem_ma_nhan_su.so_cuoi, excluded.so_cuoi);

-- ---------------------------------------------------------------- may cham cong thuoc khoi
--
-- De tao ho so chi can khai KHOI: he thong tu biet may nao cap PIN va day lenh xuong may nao.
-- Truoc day cap may VP bi ghim cung trong code (`CAP_MAY_DONG_BO`), con khoi kho thi khong co
-- duong nao biet may — nen nguoi moi o kho khong duoc day lenh.
alter table thiet_bi add column if not exists khoi_id uuid references khoi(id) on delete set null;
create index if not exists thiet_bi_khoi_idx on thiet_bi(khoi_id);

comment on column thiet_bi.khoi_id is
  'Khoi ma may nay phuc vu. Tao ho so nhan su chi can khai khoi la biet may + dai PIN.';

-- Cap may cua Khoi Van Phong — serial da kiem chung tren may that (xem KET-NOI-MAY-ZKTECO.md).
update thiet_bi set khoi_id = (select id from khoi where ma = 'vp')
 where khoi_id is null
   and serial in ('8116254600435', '8116254600440');
