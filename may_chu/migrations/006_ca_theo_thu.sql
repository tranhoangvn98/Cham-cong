-- Khung gio RIENG cho tung thu trong tuan, de nguyen ca lam lam mac dinh.
--
-- Vi sao can: che do lam viec pho bien o Viet Nam la T2-T6 lam ca ngay va SANG THU BAY
-- van la gio chuan (vd 08:00-12:00 va 13:30-17:30 tu T2 den T6, rieng T7 chi 08:00-12:00).
-- Mo hinh cu chi co MOT khung gio dung chung cho moi ngay lam cua ca, nen thu Bay se bi
-- cham diem "ve som 330 phut" cho toan bo nhan vien — sai ca ve ky luat lan ve so cong.
--
-- Dong nao khong khai o day thi thu do dung khung gio goc cua ca. Khong co dong nao =
-- hanh vi y het truoc khi co bang nay.
create table if not exists ca_lam_theo_thu (
  ca_lam_id      uuid     not null references ca_lam(id) on delete cascade,
  -- Theo chuan JS, giong ca_lam.cac_ngay_lam: 0=CN, 1=T2, ... 6=T7.
  thu            smallint not null check (thu between 0 and 6),
  gio_vao        time     not null,
  gio_ra         time     not null,
  nghi_tu        time,
  nghi_den       time,
  -- So phut cong toi thieu de tinh du 1 cong TRONG NGAY DO. Buoi sang thu Bay thuong
  -- duoc tinh 0,5 cong: de nguong 480 thi 240 phut lam that se ra dung 0,5.
  phut_du_cong   int      not null check (phut_du_cong > 0),
  primary key (ca_lam_id, thu),
  constraint ca_theo_thu_gio_hop_le check (gio_ra > gio_vao),
  constraint ca_theo_thu_khoang_nghi_hop_le check (
    (nghi_tu is null and nghi_den is null)
    or (nghi_tu is not null and nghi_den is not null and nghi_den > nghi_tu)
  )
);

comment on table ca_lam_theo_thu is
  'Ghi de khung gio cua ca cho mot thu cu the. Khong co dong = dung khung gio goc cua ca.';
comment on column ca_lam_theo_thu.thu is
  'Thu trong tuan theo chuan JS: 0=CN, 1=T2, ..., 6=T7.';

-- Ca qua dem khong dung duoc bang nay: gio ra thuoc ngay hom sau nen "thu" cua khung gio
-- khong xac dinh duoc mot cach khong nhap nhang. Chan ngay o CSDL de khong ai khai nham.
create or replace function chan_ca_qua_dem_theo_thu() returns trigger as $$
begin
  if exists (select 1 from ca_lam where id = new.ca_lam_id and qua_dem) then
    raise exception 'Ca qua dem khong khai duoc khung gio rieng theo thu';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists ca_theo_thu_chan_qua_dem on ca_lam_theo_thu;
create trigger ca_theo_thu_chan_qua_dem
  before insert or update on ca_lam_theo_thu
  for each row execute function chan_ca_qua_dem_theo_thu();
