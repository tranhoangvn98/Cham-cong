-- ============================================================================
-- 119 — Don OT cua chinh nguoi duyet: chuyen Giam doc duyet truoc khi sang cap 2.
--
-- BOI CANH
--   Don lam them di qua hai cap: truong bo phan (cap 1) roi TBKS/Admin (cap 2). Nguoi duyet
--   cap 1 duoc suy ra tu `phong_ban.truong_phong_id`. Khi nguoi lap don CHINH LA truong bo
--   phan cua minh thi khong ai duyet duoc cap 1: `chan_tu_duyet` chan chinh ho, con
--   admin/tbks bi cam duyet cap 1 de mot nguoi khong quyet ca hai cap cua cung mot don.
--   Don nam im khong ai xu ly.
--
-- NOI DUNG
--   1. Them trang thai `cho_giam_doc` (chi danh cho don `lam_them`).
--   2. Chuyen cac don OT dang ket o `cho_duyet` ma nguoi lap chinh la truong phong cua
--      phong ban minh sang `cho_giam_doc`, de khong phai sua tay tren production.
--
-- Chay lai nhieu lan KHONG doi gi (idempotent).
-- KHONG dung `\set` va KHONG tu mo transaction: `csdl/di_tru.ts` boc san mot transaction.
-- ============================================================================

alter table don_tu drop constraint if exists don_tu_trang_thai_check;
alter table don_tu add constraint don_tu_trang_thai_check
  check (trang_thai in ('cho_duyet','cho_duyet_2','cho_giam_doc','da_duyet','tu_choi','da_huy'));

-- Chi don lam_them moi co buoc Giam doc. Cac loai khac giu vong doi cu.
alter table don_tu drop constraint if exists don_tu_cho_giam_doc_chi_lam_them;
alter table don_tu add constraint don_tu_cho_giam_doc_chi_lam_them
  check (trang_thai <> 'cho_giam_doc' or loai = 'lam_them');

-- Don OT dang ket: nguoi lap chinh la truong phong cua phong ban minh.
update don_tu d
   set trang_thai = 'cho_giam_doc'
 where d.loai = 'lam_them'
   and d.trang_thai = 'cho_duyet'
   and exists (
     select 1
       from nhan_vien nv
       join phong_ban pb on pb.id = nv.phong_ban_id
      where nv.id = d.nhan_vien_id
        and pb.truong_phong_id = d.nhan_vien_id
   );
