-- Bon loai don con thieu: lam them gio, doi ca, di cong tac, thoi viec.
--
-- MOT BANG CHU KHONG BON BANG. `don_nghi_phep` va `don_giai_trinh` co bang rieng vi chung co
-- NGHIA RIENG trong bo tinh cong (nghi phep doi trang thai ngay, giai trinh ghi de gio vao/ra)
-- va da chay that tu dau. Bon loai duoi day thi khac: chung khac nhau o vai o du lieu, con
-- vong doi thi giong het nhau — lam don, duyet, sinh ban don. Bon bang la bon bo route, bon
-- form, bon cho de lech.
--
-- Doi lai: mot bang chung phai co RANG BUOC THEO TUNG LOAI, neu khong no thanh mot cai tui
-- dung duoc moi thu va khong bao dam gi. Cac `check` duoi day lam viec do — mot don `doi_ca`
-- khong co ca moi, hay mot don `lam_them` khong co gio, la vo nghia va CSDL tu choi.

create table if not exists don_tu (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  loai            text not null
                  check (loai in ('lam_them','doi_ca','cong_tac','thoi_viec')),

  -- Khoang ngay. `den_ngay` null = mot ngay.
  tu_ngay         date not null,
  den_ngay        date,

  -- Lam them gio.
  gio_bat_dau     time,
  gio_ket_thuc    time,

  -- Doi ca: doi voi ai, tu ca nao sang ca nao.
  doi_voi_id      uuid references nhan_vien(id) on delete set null,
  ca_hien_tai_id  uuid references ca_lam(id) on delete set null,
  ca_moi_id       uuid references ca_lam(id) on delete set null,

  -- Di cong tac.
  noi_den         text,

  ly_do           text,

  -- Vong doi giong `don_nghi_phep` tung chu, co y: nguoi duyet lam mot dong tac, khong phai
  -- hoc mot bang trang thai thu hai.
  trang_thai      text not null default 'cho_duyet'
                  check (trang_thai in ('cho_duyet','da_duyet','tu_choi','da_huy')),
  nguoi_duyet_id  uuid references nguoi_dung(id) on delete set null,
  ghi_chu_duyet   text,
  tao_luc         timestamptz not null default now(),
  quyet_luc       timestamptz,

  constraint don_tu_khoang_ngay check (den_ngay is null or den_ngay >= tu_ngay),

  -- Lam them: phai co ca hai moc gio, va gio ket thuc phai sau gio bat dau. Cho phep bang
  -- nhau thi mot don OT 0 phut duoc duyet va khong ai thay gi sai.
  constraint don_tu_lam_them check (
    loai <> 'lam_them'
    or (gio_bat_dau is not null and gio_ket_thuc is not null and gio_ket_thuc > gio_bat_dau)
  ),

  -- Doi ca: phai co ca moi. `ca_hien_tai_id` co the null (nhan vien chua duoc gan ca), va
  -- `doi_voi_id` cung null duoc (doi ca ma khong doi voi ai cu the).
  constraint don_tu_doi_ca check (loai <> 'doi_ca' or ca_moi_id is not null),

  -- Doi ca: khong doi voi CHINH MINH.
  constraint don_tu_doi_ca_khac_nguoi check (doi_voi_id is null or doi_voi_id <> nhan_vien_id),

  -- Cong tac: phai co noi den. Mot don cong tac khong noi di dau thi khong duyet duoc.
  constraint don_tu_cong_tac check (
    loai <> 'cong_tac' or (noi_den is not null and length(btrim(noi_den)) > 0)
  ),

  -- Thoi viec: phai co ly do. BLLD 2019 Dieu 35 cho nguoi lao dong don phuong cham dut khong
  -- can ly do, nhung mot don khong ly do thi nguoi duyet khong co gi de doc — va o day
  -- `tu_ngay` la NGAY LAM VIEC CUOI CUNG mong muon.
  constraint don_tu_thoi_viec check (
    loai <> 'thoi_viec' or (ly_do is not null and length(btrim(ly_do)) > 0)
  )
);

create index if not exists don_tu_nhan_vien_idx on don_tu(nhan_vien_id, tu_ngay desc);
create index if not exists don_tu_cho_duyet_idx on don_tu(loai, tao_luc)
  where trang_thai = 'cho_duyet';
-- Tra cuu ngay cong tac trong bo tinh cong: mot lan moi ngay moi nguoi.
create index if not exists don_tu_cong_tac_idx on don_tu(nhan_vien_id, tu_ngay, den_ngay)
  where loai = 'cong_tac' and trang_thai = 'da_duyet';

comment on table don_tu is
  'Bon loai don co vong doi giong nhau: lam them, doi ca, cong tac, thoi viec. Nghi phep va '
  'giai trinh co bang rieng vi chung co nghia rieng trong bo tinh cong.';
comment on column don_tu.tu_ngay is
  'Voi thoi_viec: NGAY LAM VIEC CUOI CUNG mong muon, khong phai ngay lap don.';

-- ---------------------------------------------------------------- trang thai ngay moi
-- Ngay di cong tac KHONG PHAI ngay vang. Truoc di tru nay, mot nguoi di cong tac ca tuan se
-- hien la vang ca tuan tren bang cong — khong co lan quet nao, va bo tinh cong khong biet ly
-- do. Ke toan nhin bang do thi tru cong that.
alter table bang_cong_ngay drop constraint if exists bang_cong_ngay_trang_thai_check;
alter table bang_cong_ngay add constraint bang_cong_ngay_trang_thai_check
  check (trang_thai in ('vang','co_mat','nghi_phep','ngay_le','nghi_tuan','cong_tac'));

comment on column bang_cong_ngay.trang_thai is
  'PHAI khop TrangThaiNgay trong may_chu/src/cong/quy_tac_tinh_cong.ts.';
