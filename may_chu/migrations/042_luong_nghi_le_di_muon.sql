-- Module: NGHỈ LỄ THEO VỊ TRÍ LÀM VIỆC + KẾ HOẠCH NGHỈ NĂM + PHẠT ĐI MUỘN + THỬ VIỆC.
--
-- Bổ sung cho khối lương/công theo yêu cầu ban giám đốc:
--   1. Nghỉ lễ áp theo VỊ TRÍ làm việc: làm ở VN theo lịch VN, làm ở TQ theo lịch TQ.
--   2. Kế hoạch nghỉ lễ theo NĂM khai theo KHOẢNG ngày (vd 29/8–2/9) rồi bung ra từng ngày,
--      để không bị tính trừ ngày công.
--   3. Cấu hình PHẠT ĐI MUỘN 2 mức (50k / nửa ngày công) có bật/tắt + 3 lần miễn/tháng.
--   4. Tỷ lệ LƯƠNG THỬ VIỆC (mặc định 85% lương cứng) — hợp đồng loại thu_viec tự áp.
--   5. Đơn xin đi muộn (loại mới của don_tu) làm căn cứ miễn phạt.
--
-- Lưu ý: dia_diem (001) là VÙNG GPS để chấm công bằng điện thoại — KHÁC khái niệm nơi làm
-- việc ở đây, nên ta dùng bảng noi_lam_viec riêng, tránh nhập nhằng.

-- ------------------------------------------------------------------ lịch nghỉ lễ (calendar)
create table if not exists lich_nghi_le (
  ma          text primary key,          -- 'vn', 'tq', ...
  ten         text not null,
  quoc_gia    text,
  dang_dung   boolean not null default true,
  tao_luc     timestamptz not null default now()
);
insert into lich_nghi_le(ma, ten, quoc_gia) values
  ('vn', 'Lịch nghỉ lễ Việt Nam',   'Việt Nam'),
  ('tq', 'Lịch nghỉ lễ Trung Quốc', 'Trung Quốc')
on conflict (ma) do nothing;

-- ------------------------------------------------------------------ nơi làm việc (work site)
-- Mỗi nơi làm việc gắn MỘT lịch nghỉ. Nhiều văn phòng VN có thể cùng dùng lịch 'vn'.
create table if not exists noi_lam_viec (
  id            uuid primary key default gen_random_uuid(),
  ten           text not null,
  lich_nghi_ma  text not null default 'vn' references lich_nghi_le(ma),
  dia_chi       text,
  dang_dung     boolean not null default true,
  tao_luc       timestamptz not null default now()
);
-- Nơi làm việc mặc định (VN) nếu bảng còn rỗng.
insert into noi_lam_viec(ten, lich_nghi_ma)
  select 'Văn phòng Việt Nam', 'vn'
  where not exists (select 1 from noi_lam_viec);

-- Gán nơi làm việc cho nhân viên. NULL = coi như lịch VN mặc định.
alter table nhan_vien
  add column if not exists noi_lam_viec_id uuid references noi_lam_viec(id) on delete set null;

-- ------------------------------------------------------------------ kế hoạch nghỉ lễ theo năm
create table if not exists ke_hoach_nghi_le (
  id          uuid primary key default gen_random_uuid(),
  nam         int  not null,
  ten         text not null,
  tu_ngay     date not null,
  den_ngay    date not null,
  lich_ma     text not null default 'vn' references lich_nghi_le(ma),
  huong_luong boolean not null default true,
  ghi_chu     text,
  tao_boi     uuid references nguoi_dung(id) on delete set null,
  tao_luc     timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  constraint ke_hoach_nghi_le_khoang check (den_ngay >= tu_ngay)
);
create index if not exists ke_hoach_nghi_le_nam_idx on ke_hoach_nghi_le(nam, lich_ma);

-- ------------------------------------------------------------------ ngay_le: thêm lịch + nguồn kế hoạch
-- Trước đây PK là (ngay). Nay một ngày có thể là lễ ở lịch này mà không phải lịch kia,
-- nên PK đổi thành (ngay, lich_ma). Các dòng cũ mặc định thuộc lịch 'vn'.
alter table ngay_le add column if not exists lich_ma     text not null default 'vn';
alter table ngay_le add column if not exists ke_hoach_id uuid;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'ngay_le_pkey') then
    alter table ngay_le drop constraint ngay_le_pkey;
  end if;
end $$;
alter table ngay_le add constraint ngay_le_pkey primary key (ngay, lich_ma);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ngay_le_lich_fk') then
    alter table ngay_le add constraint ngay_le_lich_fk
      foreign key (lich_ma) references lich_nghi_le(ma);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ngay_le_ke_hoach_fk') then
    alter table ngay_le add constraint ngay_le_ke_hoach_fk
      foreign key (ke_hoach_id) references ke_hoach_nghi_le(id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------------ cấu hình phạt đi muộn + thử việc
-- Gắn vào tham_so_luong (đã hiệu-lực-hóa theo mốc) để BẢNG LƯƠNG TÁI LẬP ĐƯỢC: mỗi kỳ
-- lương chụp lại đúng tham số đang hiệu lực. Sửa trong trang Tham số lương (Cài đặt).
--
-- Quy tắc (bật/tắt bằng phat_di_muon_bat):
--   - Giờ vào chuẩn = di_muon_gio_vao (08:00).
--   - Vào trong [di_muon_moc_50k, di_muon_moc_nua_ngay) (08:10–08:29) → phạt di_muon_muc_50k/lần.
--   - Vào từ di_muon_moc_nua_ngay (≥08:30) → trừ NỬA ngày lương cứng (P1+P2)/lần.
--   - Mỗi người được miễn di_muon_mien_moi_thang lần/tháng NẾU có đơn đi muộn gửi trước
--     di_muon_han_don (07:30) và vào ≤ di_muon_moc_nua_ngay (08:30). ≥08:30 không được miễn.
alter table tham_so_luong add column if not exists phat_di_muon_bat      boolean      not null default false;
alter table tham_so_luong add column if not exists di_muon_gio_vao       time         not null default '08:00';
alter table tham_so_luong add column if not exists di_muon_moc_50k       time         not null default '08:10';
alter table tham_so_luong add column if not exists di_muon_muc_50k       numeric(14,2) not null default 50000;
alter table tham_so_luong add column if not exists di_muon_moc_nua_ngay  time         not null default '08:30';
alter table tham_so_luong add column if not exists di_muon_mien_moi_thang int         not null default 3;
alter table tham_so_luong add column if not exists di_muon_han_don       time         not null default '07:30';
-- Tỷ lệ lương thử việc trên lương cứng (0.85 = 85%). BLLĐ 2019 Đ.26: tối thiểu 85%.
alter table tham_so_luong add column if not exists ty_le_thu_viec        numeric(5,4) not null default 0.85
  constraint tham_so_ty_le_thu_viec_hop_le check (ty_le_thu_viec > 0 and ty_le_thu_viec <= 1);

-- ------------------------------------------------------------------ đơn xin đi muộn
-- Thêm loại 'di_muon' vào don_tu. gio_bat_dau = giờ dự kiến có mặt (tùy chọn).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'don_tu'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%lam_them%' and pg_get_constraintdef(oid) like '%loai%'
  loop
    execute format('alter table don_tu drop constraint %I', c.conname);
  end loop;
end $$;
alter table don_tu add constraint don_tu_loai_check
  check (loai in ('lam_them','doi_ca','cong_tac','thoi_viec','di_muon'));
