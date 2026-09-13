-- LƯƠNG NET (chốt của chủ DN): miễn THU BHXH từ NLĐ (không trừ vào thực lĩnh) NHƯNG công ty
-- VẪN đóng BHXH đầy đủ theo luật, và vẫn giữ phần BH trong giảm trừ khi tính thuế TNCN.
--
-- KHAC voi "Mien BHXH" (mien_bh): mien_bh = KHONG phat sinh BHXH nao (ca phan cong ty = 0,
-- khong co giam tru BH). Luong NET = BHXH van tinh + cong ty ganh phan NLD.
--
-- Co tren tung PHIEU (tich trong bang luong). Nguon su that khi tinh la co tren phieu; phieu
-- moi lay mac dinh theo ho so nhan_vien.luong_net.
alter table phieu_luong
  add column if not exists luong_net boolean not null default false;

comment on column phieu_luong.luong_net is
  'Luong NET: mien THU BHXH tu NLD (khong tru vao thuc linh, cong ty ganh), BHXH van tinh + '
  'cong ty dong du, van giu trong giam tru khi tinh thue. Khac mien_bh (khong phat sinh BHXH).';

-- Backfill: nguoi da danh dau luong net o ho so -> bat luon tren phieu da co (vd ERP123, ERP89).
update phieu_luong pl
   set luong_net = true
  from nhan_vien nv
 where nv.id = pl.nhan_vien_id
   and nv.luong_net = true
   and pl.luong_net = false;
