-- Module: CA VAO LAM MUON HON GIO CHUNG — khai theo TUNG NGUOI (YC 02/11/2026).
--
-- Ba nguoi duoc duyet vao lam muon hon gio chuan. Moi thu khac giu nguyen nhu ca chuan
-- `Hành chính (theo HĐLĐ)` — 08:00-17:30, nghi 12:00-13:30, T2-T6 + sang thu Bay, GIO TAN CA
-- VAN LA 17:30 (ba nguoi nay lam it hon mot gio moi ngay, khong phai doi gio ve):
--
--   * ERP4   Tran Hoang Anh Vinh  -> ca `Hành chính 09:00` (vao 09:00)
--   * ERP10  Nguyen Tuan Anh      -> ca `Hành chính 09:00`
--   * ERP100 Phan Mai Lan         -> ca `Hành chính 08:30` (vao 08:30)
--
-- KHOA THEO `ma_erp`, khong theo `ma_nv` va khong theo ho ten:
--   - `ma_nv` da bi cap lai (ERP4 -> NVVP08260007), va con co the doi nua.
--   - `nhan_vien` dang co HAI ho so cung ten "Tran Hoang Anh Vinh"
--     (xem trien_khai/khai_pin_con_lai.sql).
--   - `ma_erp` la ma ben ERP, khong doi khi cap lai `ma_nv`; kiem tren du lieu that
--     (02/11/2026) khong co hai ho so nao trung `ma_erp`.
-- Nhanh `ma_nv` giu lai chi de CSDL nao chua chay migration 111/112 van khop.
--
-- KHONG SUA CONG THUC TINH CONG. `quy_tac_tinh_cong.ts` da doc `gio_vao`, `dung_sai_muon_phut`
-- va `phut_du_cong` tu ca cua TUNG NGUOI, nen chi can khai ca la moi he qua tu dung:
--   - Di muon bat dau tinh tu gio_vao + dung sai 10 phut -> 09:11 / 08:41 (ca chuan: 08:11).
--   - Qua 30 phut THO thi mat nua ngay cong -> 09:31 / 09:01 (ca chuan: 08:31).
--   - Sang thu Bay van la nua cong (khung rieng 09:00-12:00 / 08:30-12:00).
--   - Ve som, OT, ngay le, nghi phep: y het ca chuan.
--
-- NGUONG DU CONG cua ca moi = so phut toi da cua ca - 60, giu dung do de da cua ca chuan:
--   ca chuan 08:00-17:30, nghi 90 phut = 480 phut toi da, dang khai 420 (= 480 - 60).
--   vao 09:00 -> 420 - 60 = 360 phut | vao 08:30 -> 450 - 60 = 390 phut.
-- De nguyen 420 thi nguoi vao 09:00 di lam DU ca hai buoi chi duoc dung 420 phut = bang dung
-- nguong (het do de), con mot buoi sang 180 phut tut xuong 0 cong thay vi 0,5. Do chinh la ly do
-- ca chuan ha nguong tu 480 xuong 420 (xem `trien_khai/gan_ca_lam_viec.sql`).
--
-- Ca chuan khong co (CSDL moi, chua chay seed) thi tep nay khong tao gi — dung y dinh: ba nguoi
-- tren cung chua co ho so o CSDL do.
--
-- Chay xong phai bam "Tinh lai bang cong" cho khoang ngay can doi. Migration KHONG tu tinh lai:
-- tinh lai ca thang la viec nang, va ky luong da duyet thi phai huy duyet truoc.

-- ============================================================ 1. Hai ca moi
-- Copy nguyen cau hinh ca chuan, chi doi gio vao va ha nguong du cong.
insert into ca_lam (
  ten, gio_vao, gio_ra, nghi_tu, nghi_den,
  dung_sai_muon_phut, dung_sai_som_phut, nguong_ot_phut,
  qua_dem, phut_du_cong, cac_ngay_lam, dang_hoat_dong
)
select
  m.ten,
  m.gio_vao,
  c.gio_ra,
  c.nghi_tu,
  c.nghi_den,
  c.dung_sai_muon_phut,
  c.dung_sai_som_phut,
  c.nguong_ot_phut,
  c.qua_dem,
  greatest(
    60,
    (extract(epoch from (c.gio_ra - m.gio_vao)) / 60)::int
      - coalesce((extract(epoch from (c.nghi_den - c.nghi_tu)) / 60)::int, 0)
      - 60
  ),
  c.cac_ngay_lam,
  c.dang_hoat_dong
  from ca_lam c
  cross join (values
    ('Hành chính 09:00', '09:00'::time),
    ('Hành chính 08:30', '08:30'::time)
  ) as m(ten, gio_vao)
 where c.ten = 'Hành chính (theo HĐLĐ)'
   and c.gio_vao < m.gio_vao
   and c.gio_ra > m.gio_vao
   and not exists (select 1 from ca_lam x where x.ten = m.ten);

-- ============================================================ 2. Khung gio rieng theo thu
-- Sang thu Bay cua ca chuan la 08:00-12:00 (240 phut, nua cong). Ca moi giu nguyen gio ra va
-- chi doi gio vao; nguong du cong lay theo ca moi de 09:00-12:00 (180 phut) van ra 0,5 cong.
insert into ca_lam_theo_thu (ca_lam_id, thu, gio_vao, gio_ra, nghi_tu, nghi_den, phut_du_cong)
select moi.id, t.thu, moi.gio_vao, t.gio_ra, t.nghi_tu, t.nghi_den, moi.phut_du_cong
  from ca_lam goc
  join ca_lam_theo_thu t on t.ca_lam_id = goc.id
  join ca_lam moi on moi.ten in ('Hành chính 09:00', 'Hành chính 08:30')
 where goc.ten = 'Hành chính (theo HĐLĐ)'
   and moi.gio_vao > goc.gio_vao
   and t.gio_ra > moi.gio_vao
on conflict (ca_lam_id, thu) do nothing;

-- ============================================================ 3. Gan ca cho ba nguoi
-- Khoa theo ma ERP (`ma_erp`), KHONG theo `ma_nv` (da bi cap lai) va KHONG theo ho ten
-- (`nhan_vien` dang co HAI ho so cung ten "Tran Hoang Anh Vinh").
do $$
declare r record;
begin
  for r in
    select nv.ma_nv, nv.ma_erp, nv.ho_ten, coalesce(cl.ten, '(chua co ca)') as ca_cu,
           coalesce(cl.gio_vao::text, '-') as gio_vao_cu
      from nhan_vien nv
      left join ca_lam cl on cl.id = nv.ca_lam_id
     where lower(nv.ma_erp) in ('erp4', 'erp10', 'erp100')
        or lower(nv.ma_nv)  in ('erp4', 'erp10', 'erp100')
     order by nv.ma_nv
  loop
    raise notice 'ca hien tai cua % / % (%): % (vao %)',
      r.ma_nv, r.ma_erp, r.ho_ten, r.ca_cu, r.gio_vao_cu;
  end loop;
end $$;

update nhan_vien nv
   set ca_lam_id = c.id,
       cap_nhat_luc = now()
  from (values
    ('erp4',   'Hành chính 09:00'),
    ('erp10',  'Hành chính 09:00'),
    ('erp100', 'Hành chính 08:30')
  ) as m(ma_erp, ten_ca)
  join ca_lam c on c.ten = m.ten_ca
 where (lower(nv.ma_erp) = m.ma_erp or lower(nv.ma_nv) = m.ma_erp)
   -- Ho so da nghi viec thi bo qua: doi ca cho nguoi da roi khong co y nghia, va de nguoi
   -- phu trach doc NOTICE o tren ma doi chieu.
   and nv.dang_hoat_dong = true
   and nv.ca_lam_id is distinct from c.id;

-- ============================================================ 4. Moc phat di muon (tien)
-- `phat_di_muon_bat` dang TAT (migration 097) nen phan nay chua anh huong dong nao. Van phai
-- khai: bat lai la ba nguoi nay bi tinh muon tu 08:11 / 08:30 trong khi ho vao 09:00 / 08:30.
-- Chi dien o nao con trong — khong ghi de moc HR da khai (erp100 da co 08:40 / 09:00 tu
-- migration 055, giu nguyen).
update nhan_vien nv
   set di_muon_moc_50k     = coalesce(nv.di_muon_moc_50k, m.moc_50k),
       di_muon_moc_nua_ngay = coalesce(nv.di_muon_moc_nua_ngay, m.moc_nua_ngay),
       cap_nhat_luc         = now()
  from (values
    ('erp4',   '09:11'::time, '09:30'::time),
    ('erp10',  '09:11'::time, '09:30'::time),
    ('erp100', '08:41'::time, '09:00'::time)
  ) as m(ma_erp, moc_50k, moc_nua_ngay)
 where (lower(nv.ma_erp) = m.ma_erp or lower(nv.ma_nv) = m.ma_erp)
   and (nv.di_muon_moc_50k is null or nv.di_muon_moc_nua_ngay is null);
