-- CHINH SACH CONG MOI TU KY LUONG THANG 9 (ap dung tu 01/09/2026) + SO NGOAI LE.
--
-- Chinh sach moi (chu cong ty chot):
--   - Di muon / ve som TRONG 30 phut so voi gio ca: khong phat, khong tru cong.
--   - Di muon QUA 30 phut (vd ca 08:00 -> tu 08:31): mat nua ngay cong (buoi sang).
--   - Ve som QUA 30 phut (vd ca tan 17:30 -> truoc 17:00, tuc tu 16:59 tro ve truoc):
--     mat nua ngay cong (buoi chieu).
--   - Ca hai loi cung ngay -> 0 cong.
--   - Phu cap an trua CHI tinh cho ngay cong du (so_cong = 1).
--   - Bo han che do phat di muon cu (50k trong [08:11, 08:30), tru nua ngay tu 08:30):
--     tao ban ghi `tham_so_luong` moi hieu luc 2026-09-01 voi phat_di_muon_bat = false.
--
-- SO NGOAI LE: so ghi cac ngay dac biet (bao, su kien bat kha khang...) de he thong bo qua
-- luat mat nua ngay cong va/hoac khong tinh vang (khong tru phep). Mot muc co the ap toan
-- cong ty ('tat_ca') hoac chi mot so nhan vien (bang con).

-- ---------------------------------------------------------------- chinh sach moi vao tham so
do $$
declare src tham_so_luong%rowtype;
begin
  if not exists (select 1 from tham_so_luong where hieu_luc_tu = date '2026-09-01') then
    select * into src from tham_so_luong order by hieu_luc_tu desc limit 1;
    if not found then
      raise notice 'Chua co tham_so_luong nao — bo qua migration chinh sach cong 9/2026.';
      return;
    end if;
    src.id := gen_random_uuid();
    src.hieu_luc_tu := date '2026-09-01';
    src.ten := 'Chính sách công từ 01/9/2026 (đi muộn/về sớm quá 30 phút mất nửa ngày công)';
    -- Bo han che do phat di muon cu: truoc 30 phut khong phat; qua 30 phut mat nua ngay CONG
    -- (tinh o bang cong), khong tru tien rieng nua.
    src.phat_di_muon_bat := false;
    src.can_cu := 'Chính sách công ty áp dụng từ kỳ lương tháng 9/2026: đi muộn/về sớm '
                   || 'trong 30 phút không bị phạt; quá 30 phút mất nửa ngày công.';
    src.tao_luc := now();
    src.cap_nhat_luc := now();
    insert into tham_so_luong values (src.*);

    -- Bieu thue TNCN phai CO BAN GHI cho ban ghi tham so moi (bac_thue_tncn tham chieu
    -- tham_so_id) — copy nguyen bieu dang dung cua ban 2026-01-01.
    insert into bac_thue_tncn (tham_so_id, bac, tu_muc, den_muc, thue_suat)
    select src.id, b.bac, b.tu_muc, b.den_muc, b.thue_suat
      from tham_so_luong cu
      join bac_thue_tncn b on b.tham_so_id = cu.id
     where cu.hieu_luc_tu = date '2026-01-01';
  end if;
end $$;

-- ---------------------------------------------------------------- so ngoai le
create table if not exists so_ngoai_le (
  id              uuid primary key default gen_random_uuid(),
  ngay            date not null,
  -- Pham vi ap dung:
  --   tat_ca   — toan cong ty (khong can dong nao trong bang con)
  --   nhan_vien — chi nhung nguoi duoc liet ke trong `so_ngoai_le_nhan_vien`
  loai            text not null default 'tat_ca'
                  check (loai in ('tat_ca', 'nhan_vien')),
  -- Ly do / noi dung ngoai le (bat buoc — day la SO, phai doc lai hieu duoc).
  ghi_chu         text not null check (length(trim(ghi_chu)) > 0),

  -- Mien luat mat nua ngay cong vi DI MUON qua 30 phut.
  mien_di_muon    boolean not null default true,
  -- Mien luat mat nua ngay cong vi VE SOM qua 30 phut.
  mien_ve_som     boolean not null default true,
  -- Mien VANG: nguoi khong quet may ngay do duoc tinh 1 cong (huong luong) va khong bi tru
  -- phep (vd ngay bao). Neu khong bat, nguoi vang van tinh nhu thuong.
  mien_vang       boolean not null default false,

  tao_boi         uuid references nguoi_dung(id) on delete set null,
  tao_luc         timestamptz not null default now(),
  sua_luc         timestamptz not null default now()
);

create index if not exists so_ngoai_le_ngay_idx on so_ngoai_le(ngay);

comment on table so_ngoai_le is
  'Sổ ngoại lệ chấm công: ngày đặc biệt (bão, sự kiện bất khả kháng...) — hệ thống bỏ qua luật mất nửa ngày công và/hoặc không tính vắng cho ngày đó.';

create table if not exists so_ngoai_le_nhan_vien (
  so_ngoai_le_id  uuid not null references so_ngoai_le(id) on delete cascade,
  nhan_vien_id    uuid not null references nhan_vien(id) on delete cascade,
  primary key (so_ngoai_le_id, nhan_vien_id)
);

comment on table so_ngoai_le_nhan_vien is
  'Danh sách nhân viên được miễn khi mục ngoại lệ có loai = ''nhan_vien''.';

-- ---------------------------------------------------------------- trang thai moi tren bang cong
alter table bang_cong_ngay drop constraint if exists bang_cong_ngay_trang_thai_check;
alter table bang_cong_ngay add constraint bang_cong_ngay_trang_thai_check
  check (trang_thai in
    ('vang','co_mat','nghi_phep','nghi_khong_luong','ngay_le','nghi_tuan','cong_tac',
     'lam_bu','ngoai_le'));

-- ---------------------------------------------------------------- ngoai le 17/9/2026: bao Ha Noi
insert into so_ngoai_le (ngay, loai, ghi_chu, mien_di_muon, mien_ve_som, mien_vang)
select date '2026-09-17', 'tat_ca',
       'Bão tại Hà Nội: toàn công ty không tính đi muộn/về sớm; người vắng không bị trừ phép.',
       true, true, true
 where not exists (select 1 from so_ngoai_le where ngay = date '2026-09-17');
