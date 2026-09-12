-- Danh dau da GUI EMAIL PHIEU LUONG cho mot ky (tranh gui trung khi duyet lai).
-- null = chua gui. Dat khi lan dau duyet ky (gui phieu luong cho tung nguoi).
alter table ky_luong add column if not exists gui_phieu_luc timestamptz;
comment on column ky_luong.gui_phieu_luc is
  'Thoi diem da gui email phieu luong cho nhan vien (null = chua gui). Chan gui trung.';
