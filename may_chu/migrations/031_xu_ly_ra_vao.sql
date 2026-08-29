-- Xu ly canh bao ra/vao: quy trinh tu luc phat hien -> nhac nho (email) -> ky luat (noi vi_pham).
--
-- `canh_bao_ra_vao` bi XOA + ghi lai moi lan tinh lai cong (xem 030), nen KHONG the tham chieu
-- theo id cua no. Bang nay SNAPSHOT (nhan_vien_id, ngay, ma_loi) — du de nhan dien mot canh bao
-- ma khong vo khi tinh lai. Mot dong = mot canh bao da duoc xu ly; khong co dong = chua xu ly.
create table if not exists xu_ly_ra_vao (
  id            uuid primary key default gen_random_uuid(),
  nhan_vien_id  uuid not null references nhan_vien(id) on delete cascade,
  ngay          date not null,
  ma_loi        text not null,
  -- So lan cung loi trong thang tinh toi luc xu ly — can cu chon nhac nho hay ky luat.
  so_lan_thang  int  not null default 1,
  -- Ket qua xu ly.
  trang_thai    text not null
                check (trang_thai in ('da_nhac', 'chuyen_ky_luat', 'hop_le', 'bo_qua')),
  -- true = he thong tu xu ly (qua nguong); false = nhan su bam tay.
  tu_dong       boolean not null default false,
  da_gui_email  boolean not null default false,
  da_gui_push   boolean not null default false,
  -- Ho so vi pham sinh ra khi chuyen ky luat (module vi_pham lo phan doi chieu dieu/muc phat).
  vi_pham_id    uuid references vi_pham(id) on delete set null,
  ghi_chu       text,
  -- null = he thong (tu dong). Co gia tri = nguoi bam.
  nguoi_xu_ly   uuid references nguoi_dung(id) on delete set null,
  tao_luc       timestamptz not null default now(),
  cap_nhat_luc  timestamptz not null default now(),
  -- Mot canh bao (nguoi + ngay + loai) chi xu ly MOT lan. Chan job tu dong lam trung.
  unique (nhan_vien_id, ngay, ma_loi)
);
create index if not exists xu_ly_ra_vao_ngay_idx       on xu_ly_ra_vao(ngay);
create index if not exists xu_ly_ra_vao_trang_thai_idx on xu_ly_ra_vao(trang_thai);
create index if not exists xu_ly_ra_vao_nv_idx         on xu_ly_ra_vao(nhan_vien_id, ngay);

comment on table xu_ly_ra_vao is
  'Xu ly canh bao ra/vao. Snapshot (nhan_vien_id, ngay, ma_loi) vi canh_bao_ra_vao bi ghi de. '
  'Ky luat noi sang bang vi_pham qua vi_pham_id.';

-- Loai vi pham dung khi CHUYEN KY LUAT tu canh bao ra/vao. Tan dung dong bootstrap 'QUEN_QUET'
-- (bi 016 tat khi thay bang danh muc NQ) — bat lai va ghi ro can cu + che tai cho ra/vao.
-- Nhan su co the doi sang dung ma NQ chi tiet khi quyet dinh tren tab Vi pham.
update loai_vi_pham
   set dang_bat        = true,
       ten             = 'Ra/vào không quẹt thẻ (mâu thuẫn chấm công)',
       nhom            = 'gio_giac',
       muc_do          = 'nhe',
       ky_luat_de_xuat = 'nhac_nho',
       can_cu          = 'Nội quy lao động — quy định chấm công ra/vào',
       chi_tiet_che_tai= 'Lần đầu nhắc nhở. Tái phạm nhiều lần trong tháng xem xét khiển trách '
                         'theo nội quy lao động.',
       cap_nhat_luc    = now()
 where ma = 'QUEN_QUET';

insert into loai_vi_pham (ma, ten, nhom, muc_do, ky_luat_de_xuat, can_cu, chi_tiet_che_tai, dang_bat)
select 'QUEN_QUET', 'Ra/vào không quẹt thẻ (mâu thuẫn chấm công)', 'gio_giac', 'nhe', 'nhac_nho',
       'Nội quy lao động — quy định chấm công ra/vào',
       'Lần đầu nhắc nhở. Tái phạm nhiều lần trong tháng xem xét khiển trách theo nội quy.', true
 where not exists (select 1 from loai_vi_pham where ma = 'QUEN_QUET');
