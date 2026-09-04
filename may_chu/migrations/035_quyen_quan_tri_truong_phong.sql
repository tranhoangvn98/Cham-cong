-- Module: ADMIN CAP QUYEN XEM MAN HINH QUAN TRI CHO TRUONG PHONG (chi XEM, khong thao tac).
--
-- Chu cong ty chot: "Tu cap truong phong tro len co them quyen duoc xem man hinh quan tri khi
-- duoc duyet boi admin. Truong phong duoc XEM khong duoc quyen thao tac gi; chi Admin va Truong
-- phong nhan su duoc quyen thao tac."
--
-- CACH LAM (an toan):
--   - Chi them mot co `quyen_quan_tri` tren nguoi_dung. Mac dinh false.
--   - Co nay CHI co y nghia voi vai tro 'truong_phong'. Admin/nhan_su von da co quyen quan tri.
--   - Frontend: co bat -> truong phong vao duoc GOC NHIN QUAN TRI, thay cac man dOC (Ky luat &
--     vi pham, Nhan vien, Bang cong) — deu la man da GIOI HAN THEO PHONG cua ho (xem_duoc_tat_ca
--     = false), khong lo ro du lieu toan cong ty.
--   - Backend: KHONG noi co nay vao cac guard GHI. Moi thao tac (POST/PATCH/DELETE) van la
--     can_nhan_su / can_admin — truong phong duoc cap quyen VAN bi chan khi thao tac. Cac endpoint
--     DOC cua nhung man tren von da cho truong phong (can_nguoi_duyet / can_dang_nhap) va loc theo
--     phong, nen khong can doi guard doc.

alter table nguoi_dung add column if not exists quyen_quan_tri boolean not null default false;

-- Ai duyet, khi nao — de truy vet (audit). Tach khoi duyet_boi/duyet_luc (dung cho cho_duyet).
alter table nguoi_dung add column if not exists quyen_quan_tri_boi uuid
  references nguoi_dung(id) on delete set null;
alter table nguoi_dung add column if not exists quyen_quan_tri_luc timestamptz;

comment on column nguoi_dung.quyen_quan_tri is
  'Truong phong duoc admin duyet cho XEM man hinh quan tri (chi xem, khong thao tac). Chi co y '
  'nghia voi vai tro truong_phong; admin/nhan_su von da co quyen quan tri.';
