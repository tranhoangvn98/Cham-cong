-- Module: XU LY KY LUAT TU DONG.
-- Gom vi pham theo thang & muc do -> mot ho so ky luat -> nhac nho / giam thuong P3 tu dong.
--
-- RANH GIOI PHAP LY — doc ky truoc khi sua bang nao o day:
--
-- 1. CHE TAI TAI CHINH LA GIAM THUONG P3 (Dieu 104 BLLD) theo Dieu 14 Noi quy lao dong, KHONG
--    PHAI phat tien / cat luong (Dieu 127 CAM). So tien giam duoc ghi qua khoan luong
--    'tru_giam_thuong_kl' (loai 'tru') — chi dong toi phan thuong/phu cap khi tinh luong, KHONG
--    BAO GIO tru vao luong co ban. Cot `muc_tru_tien` tren loai_vi_pham la MUC GIAM THUONG do
--    nhan su khai theo Quy che thuong, khong phai "tien phat".
--
-- 2. HINH THUC KY LUAT LAO DONG THAT (khien trach, keo dai nang luong, cach chuc, sa thai) VAN
--    KHONG tu dong. Chung phai qua hop + nguoi lao dong giai trinh + bien ban (Dieu 122/124),
--    lam o tab Vi pham. Bang `ho_so_ky_luat` chi lo GOM THONG KE + NHAC NHO + GIAM THUONG P3.
--
-- 3. NGUONG DUYET: khoan giam thuong CUA MOT HO SO >= nguong (mac dinh 2.000.000d, khai bang
--    RA_VAO... khong — bang KY_LUAT_NGUONG_DUYET) phai co nguoi duyet moi ap; duoi nguong he
--    thong tu ap. Chu cong ty chot con so.

-- ---------------------------------------------------------------- muc giam thuong theo loai
alter table loai_vi_pham
  add column if not exists muc_tru_tien numeric(14,2) not null default 0
    check (muc_tru_tien >= 0);

comment on column loai_vi_pham.muc_tru_tien is
  'Muc GIAM THUONG P3 (Dieu 104 BLLD) moi lan vi pham loai nay, do nhan su khai theo Quy che '
  'thuong. KHONG phai phat tien (Dieu 127). 0 = khong giam tien, chi nhac nho / xu ly nguoi.';

-- ---------------------------------------------------------------- khoan luong: giam thuong ky luat
-- Duong duy nhat de che tai tai chinh cham vao phieu luong. `loai='tru'`, `nhap_tay`: so tien do
-- may tong hop tu ho_so_ky_luat, KHONG go tay tren phieu. `tu_chinh_sach=true` khi sinh ra (qua
-- chinh_sach_phu_cap) nen tinh lai luong khong lam mat no.
insert into khoan_luong (ma, ten, loai, cach_tinh, don_gia, chiu_thue, thu_tu, canh_bao, ghi_chu)
values
  ('tru_giam_thuong_kl', 'Giảm thưởng/phụ cấp theo kỷ luật', 'tru', 'nhap_tay', null, false, 15,
   'Giảm thưởng P3 (Điều 104 BLLĐ) theo Điều 14 Nội quy lao động — KHÔNG phải phạt tiền (Điều 127 CẤM). Chỉ trừ vào phần thưởng/phụ cấp, không trừ lương cơ bản.',
   'Máy tự tổng hợp từ hồ sơ kỷ luật (tab Kỷ luật) rồi áp qua chính sách phụ cấp. Không sửa tay dòng này trên phiếu.')
on conflict (ma) do nothing;

-- ---------------------------------------------------------------- ho so ky luat (gom theo muc do)
-- Mot dong = mot NGUOI, mot KY (thang), mot MUC DO. Gom tat ca vi_pham cung muc do trong ky lai:
-- "ky luat 1 lan theo tung muc do" (chu cong ty chot). Chi tiet tung vi pham nam trong `chi_tiet`.
create table if not exists ho_so_ky_luat (
  id             uuid primary key default gen_random_uuid(),
  nhan_vien_id   uuid not null references nhan_vien(id) on delete cascade,
  ky             text not null check (ky ~ '^\d{4}-\d{2}$'),
  muc_do         text not null check (muc_do in ('nhe','trung','nang','rat_nang')),

  so_vi_pham     int not null default 0 check (so_vi_pham >= 0),
  -- Tong muc GIAM THUONG P3 (dong). = sum(muc_tru_tien) cua cac loai vi pham trong ho so.
  tong_tien      numeric(14,2) not null default 0 check (tong_tien >= 0),

  -- 'nhac_nho'    : khong giam tien (tong_tien = 0) — chi nhac nho + luu ho so.
  -- 'giam_thuong' : co giam thuong P3.
  hinh_thuc      text not null default 'nhac_nho' check (hinh_thuc in ('nhac_nho','giam_thuong')),

  -- moi -> da_nhac (nhac nho xong) | cho_duyet (giam thuong >= nguong) -> da_ap_dung | bac_bo | huy.
  trang_thai     text not null default 'moi'
                 check (trang_thai in ('moi','da_nhac','cho_duyet','da_ap_dung','bac_bo','huy')),
  -- tong_tien >= nguong duyet: phai co nguoi duyet moi ap.
  can_duyet      boolean not null default false,
  tu_dong        boolean not null default true,

  -- Cac vi pham gop vao: [{vi_pham_id, ma, ten, tien}]. De nguoi doc doi chieu, va de biet
  -- dong nao thay doi khi quet lai.
  chi_tiet       jsonb,

  -- Dong chinh_sach_phu_cap sinh ra khi ap giam thuong (de tinh luong doc duoc). null = chua ap.
  chinh_sach_id  uuid references chinh_sach_phu_cap(id) on delete set null,

  da_gui_email   boolean not null default false,
  da_gui_push    boolean not null default false,

  nguoi_duyet    uuid references nguoi_dung(id) on delete set null,
  duyet_luc      timestamptz,
  ly_do_bac_bo   text,
  ghi_chu        text,

  tao_luc        timestamptz not null default now(),
  cap_nhat_luc   timestamptz not null default now(),

  -- Mot nguoi mot ky mot muc do CHI mot ho so. Quet lai la cap nhat, khong de ra ban trung.
  unique (nhan_vien_id, ky, muc_do)
);
create index if not exists ho_so_ky_luat_ky_idx on ho_so_ky_luat(ky, trang_thai);
create index if not exists ho_so_ky_luat_nhan_vien_idx on ho_so_ky_luat(nhan_vien_id, ky);

-- ---------------------------------------------------------------- them quy tac tu phat hien
-- Noi vao danh muc Noi quy 01/2026 (NQ-*). TAT san (`dang_bat=false`): nguong phai doi chieu
-- Noi quy da dang ky roi nhan su moi bat. "Them nhieu quy tac phat hien hon" (chu cong ty).
insert into quy_tac_vi_pham (loai_vi_pham_id, ten, chi_so, toan_tu, nguong, dang_bat, ghi_chu)
select l.id, q.ten, q.chi_so, q.toan_tu, q.nguong, false,
       'Ngưỡng gợi ý — đối chiếu Nội quy lao động 01/2026 đã đăng ký rồi mới bật. '
       'Khai mức giảm thưởng ở danh mục loại vi phạm trước khi để hệ thống tự xử lý tiền.'
  from loai_vi_pham l
  join (values
    ('NQ-A01', 'Đi muộn từ 3 lần/tháng',            'so_lan_di_muon',   '>=', 3::numeric),
    ('NQ-A01', 'Tổng đi muộn từ 60 phút/tháng',      'tong_phut_muon',   '>=', 60::numeric),
    ('NQ-A01', 'Về sớm từ 3 lần/tháng',             'so_lan_ve_som',    '>=', 3::numeric),
    ('NQ-A02', 'Vắng không phép từ 1 ngày',          'so_ngay_vang',     '>=', 1::numeric),
    ('NQ-A04', 'Không chấm công (quên quẹt) từ 3 lần/tháng', 'so_lan_quen_quet', '>=', 3::numeric)
  ) as q(ma, ten, chi_so, toan_tu, nguong) on q.ma = l.ma
 where not exists (
   select 1 from quy_tac_vi_pham qt where qt.loai_vi_pham_id = l.id and qt.chi_so = q.chi_so
 );
