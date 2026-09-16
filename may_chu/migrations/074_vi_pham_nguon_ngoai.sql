-- KN noi bo (he thong CSKH) day ho so vi pham sang cham cong — ADR-0012 cua repo CSKH.
--
-- Chi ghi ban ghi 'moi' nguon 'cskh'; moi quyet dinh ky luat van di qua bien ban
-- (BLLD Dieu 122) nhu moi vi pham khac. Idempotent theo id_ngoai: goi lai khong ghi trung.
-- Hai cot moi deu nullable — ban ghi vi pham cu (nguon he_thong/nguoi) khong bi anh huong.

alter table vi_pham add column if not exists lien_ket  text;
alter table vi_pham add column if not exists id_ngoai  text;

-- Mo rong nguon: them 'cskh' vao rang buoc hien co (chi rong ra, khong thu hep).
alter table vi_pham drop constraint if exists vi_pham_nguon_check;
alter table vi_pham add constraint vi_pham_nguon_check
  check (nguon in ('nguoi','he_thong','cskh'));

create unique index if not exists ux_vi_pham_id_ngoai
  on vi_pham (id_ngoai) where id_ngoai is not null;
