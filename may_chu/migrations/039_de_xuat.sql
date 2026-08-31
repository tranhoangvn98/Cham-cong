-- Module: DE XUAT & KIEN NGHI (danh muc MO).
--
-- Nhan vien tu gui de xuat: cap phat thiet bi, kien nghi, mua sam, sua chua, tam ung... Danh muc
-- loai KHONG cung trong code — nhan su them loai moi qua giao dien (bang loai_de_xuat). Moi de
-- xuat co ma DX- de theo doi, vong doi giong don (cho_duyet -> da_duyet/tu_choi/da_huy).

-- ---------------------------------------------------------------- danh muc loai (HR quan ly)
create table if not exists loai_de_xuat (
  id            uuid primary key default gen_random_uuid(),
  ma_loai       text not null unique,
  ten          text not null,
  mo_ta         text,
  -- Loai can nhap SO LUONG (vd cap phat thiet bi, mua sam). Kien nghi thi khong.
  can_so_luong  boolean not null default false,
  dang_dung     boolean not null default true,
  thu_tu        int not null default 100,
  tao_luc       timestamptz not null default now()
);

-- Seed vai loai thuong gap. `on conflict do nothing` de chay lai khong nhan doi.
insert into loai_de_xuat(ma_loai, ten, can_so_luong, thu_tu) values
  ('cap_phat_thiet_bi', 'Đề xuất cấp phát thiết bị', true, 10),
  ('mua_sam',           'Đề xuất mua sắm',           true, 20),
  ('sua_chua',          'Đề xuất sửa chữa',          false, 30),
  ('tam_ung',           'Đề xuất tạm ứng',           false, 40),
  ('kien_nghi',         'Đơn kiến nghị',             false, 50),
  ('khac',              'Khác',                      false, 100)
on conflict (ma_loai) do nothing;

-- ---------------------------------------------------------------- de xuat
create sequence if not exists seq_ma_de_xuat;

create table if not exists de_xuat (
  id              uuid primary key default gen_random_uuid(),
  ma              text,
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  loai_de_xuat_id uuid not null references loai_de_xuat(id),
  tieu_de         text not null,
  noi_dung        text not null default '',
  so_luong        int,
  trang_thai      text not null default 'cho_duyet'
                    check (trang_thai in ('cho_duyet','da_duyet','tu_choi','da_huy')),
  nguoi_duyet     uuid references nguoi_dung(id) on delete set null,
  ghi_chu_duyet   text,
  duyet_luc       timestamptz,
  tao_luc         timestamptz not null default now()
);

create or replace function gan_ma_de_xuat() returns trigger as $$
begin
  if new.ma is null then
    new.ma := 'DX-' || lpad(nextval('seq_ma_de_xuat')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_de_xuat on de_xuat;
create trigger trg_ma_de_xuat before insert on de_xuat
  for each row execute function gan_ma_de_xuat();

create unique index if not exists de_xuat_ma_idx on de_xuat(ma);
create index if not exists de_xuat_nv_idx on de_xuat(nhan_vien_id, tao_luc desc);
create index if not exists de_xuat_cho_duyet_idx on de_xuat(tao_luc) where trang_thai = 'cho_duyet';
