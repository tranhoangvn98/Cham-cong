-- Chieu ra/vao cua may cham cong, va noi luu ket qua suy luan ra/vao mot ngay.
--
-- CHAN DOAN THUC DIA (trien_khai/kiem_chieu_ra_vao{,_2}.sql, chay 28.08.2026):
--   * Hai dau doc CO tinh chieu that — khoang cach giua hai lan quet khac may trai deu, khong
--     don o duoi 1 phut, nen khong phai "di qua ca hai dau doc trong mot buoc chan".
--   * TEN MAY BI DAO: 83,5% ngay-nguoi co lan quet dau ngay o may ten "Cong ra". Nguoi ta di
--     lam buoi sang bang cach quet "Cong ra". Chu cong ty da xac nhan truc tiep.
--   * Sau khi loc bam-dup (7.743 cap cach nhau <= 3 giay), LAP LAI tut tu 47% con 21,4%
--     (< 30%), va 83,5% ngay doc thanh "vao...ra" lanh manh.
--
-- Vi the KHONG doc chieu tu TEN may (ten sai). Khai chieu theo serial, ro rang, sua duoc.

-- 1. Cot chieu cho thiet_bi. Mac dinh 'hai_chieu' (suy tu Status ATTLOG) — an toan cho may moi
--    chua ai khai; hai cua that duoc dat thang o duoi.
alter table thiet_bi
  add column if not exists chieu text not null default 'hai_chieu'
    check (chieu in ('vao', 'ra', 'hai_chieu'));

comment on column thiet_bi.chieu is
  'Chieu vat ly cua dau doc: vao = cua vao, ra = cua ra, hai_chieu = mot may ca hai chieu '
  '(suy tu Status). KHONG suy tu ten may — ten co the dat nguoc.';

-- 2. Hai cua that o VP Ha Noi. Ten dat nguoc nen gan chieu theo serial (xem chan doan tren).
update thiet_bi set chieu = 'vao' where serial = '8116254600440';  -- ten "VP - Cong ra"
update thiet_bi set chieu = 'ra'  where serial = '8116254600435';  -- ten "VP - Cong vao"

-- 3. Ket qua suy luan ra/vao cua MOT ngay-nguoi. Song song voi bang_cong_ngay, KHONG thay the:
--    giai doan nay chi DO (Phuong an A) — phut_ra_ngoai khong tru vao cong.
create table if not exists ra_vao_ngay (
  nhan_vien_id        uuid not null references nhan_vien(id) on delete cascade,
  ngay                date not null,
  gio_den             timestamptz,   -- lan quet dau ngay
  gio_ra_ve           timestamptz,   -- lan quet ket thuc ngay
  phut_ra_ngoai       integer not null default 0,   -- da tru phan trum gio nghi trua
  so_phien_ra_ngoai   integer not null default 0,
  con_trong_van_phong boolean not null default false,  -- cuoi ngay chua quet ra
  suy_doan            boolean not null default false,  -- co lan quet chieu 'khong_ro'
  tinh_luc            timestamptz not null default now(),
  primary key (nhan_vien_id, ngay)
);

comment on table ra_vao_ngay is
  'Do luong ra/vao van phong mot ngay-nguoi. Phuong an A: chi do, phut_ra_ngoai KHONG tru cong.';

-- 4. Cac canh bao mau thuan ra/vao, cho dashboard HR. Mot ngay-nguoi co the nhieu dong.
--    Ghi lai moi lan tinh (xoa dong cu cua ngay-nguoi do roi chen lai) nen khong tich luy rac.
create table if not exists canh_bao_ra_vao (
  id            uuid primary key default gen_random_uuid(),
  nhan_vien_id  uuid not null references nhan_vien(id) on delete cascade,
  ngay          date not null,
  ma_loi        text not null
                check (ma_loi in ('QUEN_QUET_VAO', 'QUEN_QUET_RA',
                                  'VAO_KHI_DANG_TRONG', 'RA_KHI_DANG_NGOAI', 'CHI_MOT_LAN_QUET')),
  thoi_diem     timestamptz not null,
  mo_ta         text not null,
  tao_luc       timestamptz not null default now()
);

create index if not exists canh_bao_ra_vao_nv_ngay_idx on canh_bao_ra_vao(nhan_vien_id, ngay);
create index if not exists canh_bao_ra_vao_ngay_idx     on canh_bao_ra_vao(ngay);

comment on table canh_bao_ra_vao is
  'Canh bao mau thuan ra/vao (quen quet, vao khi dang trong...) de HR xem tren dashboard. '
  'Xoa het dong cua mot ngay-nguoi truoc khi tinh lai, nen luon phan anh lan tinh moi nhat.';
