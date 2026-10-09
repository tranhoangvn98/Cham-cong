-- ============================================================================
-- 106 — ho_so_tep.nhan_vien_id cho phep bo trong.
--
-- Tep dinh kem van ban (nhom `thong_bao_tep_kem`, migration 102) KHONG thuoc nhan
-- vien nao — no thuoc VAN BAN, doi tuong chi bang cot `thuoc_id`. Ca hai luong ghi
-- tep kem (POST /thong-bao/ai/:id/tep-kem va tep kem cua POST /thong-bao) deu ghi
-- nhan_vien_id = null theo dung thiet ke, nhung cot nay mang NOT NULL tu migration
-- 009 nen moi lan dinh kem deu that bai voi loi 23502 -> HTTP 500 "Loi he thong".
--
-- Khoa ngoai van giu nguyen: cac nhom khac van bat buoc phai ghi nhan_vien_id that
-- o tang nghiep vu (khong co DEFAULT), chi nhom khong-chu nhu tep van ban moi de null.
-- ============================================================================

alter table ho_so_tep alter column nhan_vien_id drop not null;
