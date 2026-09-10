-- Khieu nai PHIEU LUONG: nguoi lao dong khong dong y voi mot phieu luong da duyet/da tra thi gui
-- khieu nai, Nhan su/Ke toan tiep nhan va phan hoi.
--
-- TEN BANG `khieu_nai_luong` — KHONG dung `khieu_nai` (da thuoc nhom ho so nhan su) va tach khoi
-- `khieu_nai_ky_luat` (khieu nai quyet dinh ky luat). Moi khieu nai gan voi MOT phieu luong.
--
-- Ranh gioi phap ly: day la kenh phan hoi bang luong (minh bach tien luong) — khong tu dong sua
-- luong. Ke toan xem lai, tra loi, va neu dung thi mo lai ky luong sua tay theo quy trinh cu.
create sequence if not exists seq_ma_khieu_nai_luong;

create table if not exists khieu_nai_luong (
  id                uuid primary key default gen_random_uuid(),
  ma                text,
  phieu_luong_id    uuid not null references phieu_luong(id) on delete cascade,
  nhan_vien_id      uuid not null references nhan_vien(id) on delete cascade,

  noi_dung          text not null check (length(btrim(noi_dung)) >= 5),

  -- moi -> dang_xem -> chap_nhan | tu_choi.
  trang_thai        text not null default 'moi'
                    check (trang_thai in ('moi','dang_xem','chap_nhan','tu_choi')),
  phan_hoi          text,
  nguoi_xu_ly       uuid references nguoi_dung(id) on delete set null,
  xu_ly_luc         timestamptz,

  tao_luc           timestamptz not null default now(),
  cap_nhat_luc      timestamptz not null default now()
);

create unique index if not exists khieu_nai_luong_ma_idx on khieu_nai_luong(ma);
create index if not exists khieu_nai_luong_nv_idx on khieu_nai_luong(nhan_vien_id, tao_luc desc);
create index if not exists khieu_nai_luong_phieu_idx on khieu_nai_luong(phieu_luong_id)
  where trang_thai in ('moi','dang_xem');

create or replace function gan_ma_khieu_nai_luong() returns trigger as $$
begin
  if new.ma is null then
    new.ma := 'KNL-' || lpad(nextval('seq_ma_khieu_nai_luong')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ma_khieu_nai_luong on khieu_nai_luong;
create trigger trg_ma_khieu_nai_luong before insert on khieu_nai_luong
  for each row execute function gan_ma_khieu_nai_luong();
