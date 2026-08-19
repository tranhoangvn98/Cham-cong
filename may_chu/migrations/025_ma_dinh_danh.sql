-- Bang ma dinh danh: mot nguoi, nhieu he thong, moi he thong mot ma.
--
-- VI SAO: du lieu nhan su vao he thong nay tu bon nguon, va moi nguon goi cung mot nguoi bang
-- mot ma khac — ma noi bo, PIN may cham cong, userId ERP cu, danh tinh Microsoft. Truoc di tru
-- nay moi ma la MOT COT tren `nhan_vien`, va cach do da tao ra dung cai truong hop phai gop ho
-- so bang tay: `ERP147` va `HR-01` la mot nguoi, `BGD` va `ERP4` la mot nguoi.
--
-- MOT DONG = MOT MA, O MOT HE THONG, CUA MOT NGUOI, TRONG MOT KHOANG THOI GIAN.
--
-- Ba dieu bang nay lam duoc ma cac cot cu khong:
--
--   1. NHIEU MA MOT NGUOI. Mot nguoi co PIN o hai may cham cong, hay hai email trong Entra, la
--      chuyen thuong. Mot cot thi khong chua duoc.
--   2. LICH SU. PIN 1 chuyen tu nguoi cu sang nguoi moi thi dong cu duoc DONG LAI
--      (`hieu_luc_den`), khong bi xoa. Cau hoi "nhung lan quet thang 6 bang PIN 1 la cua ai"
--      tra loi duoc.
--   3. CHONG TRUNG DO CSDL BAO DAM. Unique index bo phan duoi day: mot ma DANG HIEU LUC thuoc
--      dung mot nguoi. Khong con chuyen hai ho so cung mang mot ma ERP roi cha ai biet.
--
-- Cac cot cu VAN CON va van la duong doc cua ADMS / dang nhap Microsoft. Di tru nay khong doi
-- duong doc — doi mot lan ca ba duong khop nguoi la cach chac chan nhat de mot sai sot trong
-- backfill lam may cham cong ngung khop nguoi mot cach im lang. Bao cao doi soat
-- (`/api/ma-dinh-danh/doi-soat`) so hai ben va bao cho lech; sau khi no sach thi moi go cot.

create table if not exists ma_dinh_danh (
  id            uuid primary key default gen_random_uuid(),
  nhan_vien_id  uuid not null references nhan_vien(id) on delete cascade,
  -- Khoa phang, khai trong `dinh_danh/he_thong.ts`. Khong dung enum cua CSDL: them mot he thong
  -- moi la them mot muc trong bang dac ta, khong phai mot di tru.
  he_thong      text not null,
  -- NGUYEN VAN nhu he thong kia tra ve, de hien lai dung cai nguoi ta thay o ben do.
  ma            text not null,
  -- DA CHUAN HOA, chi dung de so sanh va chong trung. Hai cot chu khong mot, vi hien thi va so
  -- sanh la hai viec khac nhau: `Vinh@THVN.com` phai hien nguyen van nhung phai khop voi
  -- `vinh@thvn.com`.
  ma_chuan      text not null,
  hieu_luc_tu   timestamptz not null default now(),
  -- null = dang hieu luc. Dong lai chu khong xoa: xoa la mat cau tra loi cho "ma nay tung la
  -- cua ai".
  hieu_luc_den  timestamptz,
  -- Ai/cai gi tao dong nay: 'di_tru' | 'nguoi_khai' | 'dong_bo_erp' | 'dang_nhap_microsoft'
  -- | 'gop_ho_so' | 'nhap_csv'. De doc lai duoc mot dong la ai ghi.
  nguon         text not null default 'nguoi_khai',
  ghi_chu       text,
  tao_luc       timestamptz not null default now()
);

-- CHONG TRUNG. Bo phan tren `hieu_luc_den is null`: mot ma DANG HIEU LUC thuoc dung mot nguoi,
-- con cac dong da dong lai thi tu do trung nhau — dung the moi ke lai duoc lich su mot PIN da
-- qua tay ba nguoi.
--
-- Day la INDEX chu khong phai CONSTRAINT vi Postgres khong cho `unique constraint` co `where`.
-- Hau qua can biet: no khong xuat hien trong `pg_constraint`, nen bo gop ho so khong "thay" no.
-- Khong sao — bo gop chi doi chu so huu, va vi index nay bao dam hai nguoi khong the cung mang
-- mot ma dang hieu luc, nen chuyen ca hai sang mot nguoi khong the cham nhau.
create unique index if not exists ma_dinh_danh_dang_hieu_luc_idx
  on ma_dinh_danh(he_thong, ma_chuan) where hieu_luc_den is null;

-- Doc theo nguoi: "nguoi nay co nhung ma gi".
create index if not exists ma_dinh_danh_nhan_vien_idx
  on ma_dinh_danh(nhan_vien_id, he_thong);

-- Doc theo ma: "ai dang la 12345", ke ca ma da dong lai.
create index if not exists ma_dinh_danh_tim_idx on ma_dinh_danh(ma_chuan);

comment on table ma_dinh_danh is
  'Ma cua mot nhan vien o cac he thong khac (PIN may, ERP cu, Microsoft...). Mot ma dang hieu luc thuoc dung mot nguoi.';

-- ---------------------------------------------------------------- backfill tu cac cot cu
--
-- `on conflict do nothing` o moi cau: di tru nay phai chay lai duoc, va tren VPS no da chay mot
-- lan roi thi lan hai khong duoc nem loi.
--
-- Loc `<> ''` chu khong chi `is not null`: cot chu tu do thi chuoi rong la chuyen co that, va
-- mot ma rong thi khong khop voi gi ca.

-- Ma noi bo.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, hieu_luc_tu)
select id, 'noi_bo', ma_nv, upper(trim(ma_nv)), 'di_tru', coalesce(tao_luc, now())
  from nhan_vien where coalesce(trim(ma_nv), '') <> ''
on conflict do nothing;

-- PIN may cham cong.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, hieu_luc_tu)
select id, 'may_cham_cong', trim(pin_may), trim(pin_may), 'di_tru', coalesce(tao_luc, now())
  from nhan_vien where coalesce(trim(pin_may), '') <> ''
on conflict do nothing;

-- userId ERP cu.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, hieu_luc_tu)
select id, 'erp_cu', erp_user_id::text, erp_user_id::text, 'di_tru',
       coalesce(erp_dong_bo_luc, tao_luc, now())
  from nhan_vien where erp_user_id is not null
on conflict do nothing;

-- Tai khoan ERP cu.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, hieu_luc_tu)
select id, 'erp_cu_tai_khoan', trim(erp_username), lower(trim(erp_username)), 'di_tru',
       coalesce(erp_dong_bo_luc, tao_luc, now())
  from nhan_vien where coalesce(trim(erp_username), '') <> ''
on conflict do nothing;

-- Ma nhan vien ben ERP cu.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, hieu_luc_tu)
select id, 'erp_cu_ma', trim(ma_erp), upper(trim(ma_erp)), 'di_tru', coalesce(tao_luc, now())
  from nhan_vien where coalesce(trim(ma_erp), '') <> ''
on conflict do nothing;

-- Email / UPN Microsoft tu ho so nhan vien.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, hieu_luc_tu)
select id, 'microsoft_email', trim(email), lower(trim(email)), 'di_tru', coalesce(tao_luc, now())
  from nhan_vien where coalesce(trim(email), '') <> '' and email like '%@%.%'
on conflict do nothing;

-- Email Microsoft da ghi nho o tai khoan dang nhap. Co the khac email tren ho so — dung la ly
-- do bang nay cho `microsoft_email` NHIEU MA.
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, hieu_luc_tu)
select nd.nhan_vien_id, 'microsoft_email', trim(nd.email_microsoft), lower(trim(nd.email_microsoft)),
       'di_tru', coalesce(nd.tao_luc, now())
  from nguoi_dung nd
 where nd.nhan_vien_id is not null
   and coalesce(trim(nd.email_microsoft), '') <> ''
   and nd.email_microsoft like '%@%.%'
on conflict do nothing;
