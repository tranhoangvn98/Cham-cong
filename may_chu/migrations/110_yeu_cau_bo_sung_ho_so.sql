-- Yeu cau bo sung ho so bat buoc.
--
-- VI SAO CAN BANG RIENG, khong chi dua vao `tai_lieu_nhan_vien.han_hoan_thanh`:
-- tien do ho so la trang thai TINH (con thieu hay khong), con viec NHAC thi can biet DA NHAC
-- BAO NHIEU LAN, LUC NAO, cho AI va theo yeu cau nao. Nhet vao bang tai lieu thi moi lan nhac
-- lai phai ghi de han, va khong tra loi duoc cau "tuan nay da nhac nguoi nay chua" — chinh cau
-- do moi la thu phai nguyen tu khi hai instance chay song song.
--
-- `danh_muc_ma` la ANH CHUP tai lieu bat buoc con thieu luc mo yeu cau: danh muc co the doi
-- ve sau (them loai giay to, sua `bat_buoc`), nhung nguoi nhan phai duoc nhac dung danh sach
-- ma HR da yeu cau — khong phai danh sach tu sinh ve sau.
create table if not exists yeu_cau_bo_sung_ho_so (
  id              uuid primary key default gen_random_uuid(),
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  -- Nguoi bam yeu cau (nhan su/admin). null = he thong tu tao.
  nguoi_tao_id    uuid references nguoi_dung(id) on delete set null,
  danh_muc_ma     text[] not null default '{}',
  han_bo_sung     date,
  ghi_chu         text,
  trang_thai      text not null default 'dang_mo'
                  check (trang_thai in ('dang_mo', 'da_du', 'da_huy')),
  tao_luc         timestamptz not null default now(),
  dong_luc        timestamptz,
  -- Moc de tinh ky nhac ke tiep; `so_lan_nhac` de nguoi nhan thay day la lan thu may.
  lan_nhac_cuoi   timestamptz,
  so_lan_nhac     int not null default 0
);

-- MOT yeu cau dang mo tren moi nhan vien. Mo hai cai thi hai luong nhac chay song song va
-- nguoi nhan bi nhac hai lan mot tuan.
create unique index if not exists yeu_cau_bo_sung_mot_dang_mo
  on yeu_cau_bo_sung_ho_so(nhan_vien_id) where trang_thai = 'dang_mo';

create index if not exists yeu_cau_bo_sung_dang_mo_idx
  on yeu_cau_bo_sung_ho_so(trang_thai, tao_luc);
