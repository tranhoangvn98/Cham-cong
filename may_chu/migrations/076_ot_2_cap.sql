-- Module: QUAN LY OT HAI CAP DUYET + NOP KET QUA BANG ANH.
--
-- Yeu cau (17/09/2026): don OT (`lam_them`) co vong doi rieng:
--   dang ky (thoi gian + ly do + tai lieu tuy chon)
--     -> truong bo phan duyet (cap 1)
--     -> TBKS hoac Admin duyet (cap 2)
--     -> nhan vien nop KET QUA bang anh
--     -> TBKS/Admin duyet ket qua
--     -> luc do OT moi duoc tinh vao bang luong.
--
-- Ba thay doi: (1) vai tro moi `tbks` (Truong Ban Kiem Soat), (2) trang thai `cho_duyet_2`
-- va ba cot duyet cap 2 tren `don_tu`, (3) bang `ket_qua_ot` 1-1 voi don lam_them.

-- ---------------------------------------------------------------- vai tro tbks
alter table nguoi_dung drop constraint if exists nguoi_dung_vai_tro_check;
alter table nguoi_dung
  add constraint nguoi_dung_vai_tro_check
  check (vai_tro in ('admin','nhan_su','truong_phong','truong_phong_nhan_su','nhan_vien','cho_duyet','tbks'));

-- tbks khong bat buoc gan ho so nhan vien (giong admin/nhan_su: co the la tai khoan ngoai
-- danh sach nhan vien). Nhat ky "ai duyet ket qua OT" van ghi du `nguoi_duyet_id`.
alter table nguoi_dung drop constraint if exists nguoi_dung_phai_gan_nhan_vien;
alter table nguoi_dung
  add constraint nguoi_dung_phai_gan_nhan_vien
  check (vai_tro in ('admin','nhan_su','tbks','cho_duyet') or nhan_vien_id is not null);

comment on column nguoi_dung.vai_tro is
  'admin | nhan_su | truong_phong | truong_phong_nhan_su (TP HR: duoc thay/go tep ho so) '
  '| nhan_vien | cho_duyet (dang nhap duoc, chua co quyen gi) '
  '| tbks (Truong Ban Kiem Soat: duyet OT cap 2 va duyet ket qua OT)';

-- ---------------------------------------------------------------- don_tu: cap duyet thu hai
alter table don_tu drop constraint if exists don_tu_trang_thai_check;
alter table don_tu add constraint don_tu_trang_thai_check
  check (trang_thai in ('cho_duyet','cho_duyet_2','da_duyet','tu_choi','da_huy'));

-- Chi don lam_them di qua cap duyet thu hai. Cac loai khac giu vong doi cu.
alter table don_tu add constraint don_tu_cap_2_chi_lam_them
  check (trang_thai <> 'cho_duyet_2' or loai = 'lam_them');

alter table don_tu
  add column if not exists nguoi_duyet_2_id uuid references nguoi_dung(id) on delete set null,
  add column if not exists ghi_chu_duyet_2 text,
  add column if not exists quyet_2_luc timestamptz;

comment on column don_tu.trang_thai is
  'cho_duyet (cho truong bo phan) | cho_duyet_2 (chi lam_them: cho TBKS/admin) | da_duyet | '
  'tu_choi | da_huy. PHAI khop vong doi trong don_tu/nghiep_vu.ts.';
comment on column don_tu.nguoi_duyet_2_id is
  'Nguoi duyet cap 2 (tbks hoac admin) cua don lam_them.';

-- ---------------------------------------------------------------- ket qua OT (anh + duyet)
create table if not exists ket_qua_ot (
  id             uuid primary key default gen_random_uuid(),
  don_tu_id      uuid not null unique references don_tu(id) on delete cascade,
  trang_thai     text not null default 'cho_duyet'
                 check (trang_thai in ('cho_duyet','da_duyet','tu_choi')),
  ghi_chu        text,
  ghi_chu_duyet  text,
  nguoi_duyet_id uuid references nguoi_dung(id) on delete set null,
  tao_luc        timestamptz not null default now(),
  quyet_luc      timestamptz
);

create index if not exists ket_qua_ot_cho_duyet_idx
  on ket_qua_ot(tao_luc) where trang_thai = 'cho_duyet';

comment on table ket_qua_ot is
  'Ket qua cua mot don lam_them sau khi da lam: anh chup minh chung + quyet dinh cua TBKS/admin. '
  'Chi khi ket qua da_duyet thi phut OT moi duoc tinh vao bang cong (xem cong/tinh_cong.ts).';

-- ---------------------------------------------------------------- nhom tep cho OT
alter table ho_so_tep drop constraint if exists ho_so_tep_nhom_check;
alter table ho_so_tep add constraint ho_so_tep_nhom_check check (nhom in (
  'hop_dong','bien_ban','luong','cong_viec','bao_cao','khieu_nai','thiet_bi',
  'thong_tin','tai_lieu','nguoi_phu_thuoc','bhxh','don_tu','ot_tai_lieu','ot_ket_qua','khac'
));

comment on column ho_so_tep.nhom is
  'Nhom ho so. PHAI khop CAC_NHOM trong may_chu/src/bao_mat/quyen_ho_so.ts cong voi "khac". '
  'Co bai kiem e2e tai len that cho tung nhom trong CAC_NHOM.';
