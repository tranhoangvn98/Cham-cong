-- Cap vai tro TBKS (uy ban kiem soat duyet OT cap 2 + duyet ket qua OT) cho mot tai khoan.
-- Yeu cau nguoi dung 10/11/2026: "cho them Hien co them quyen TBKS duyet".
-- Tai khoan chon: thuhien.xnk@tranhoangvietnam.com (NVVPLS08250001 Ngo Thi Thu Hien) — dang
-- la `nhan_vien`, la tai khoan DUY NHAT ten Hien con thieu quyen (htthien.mkt@ da la admin).
-- Idempotent: chay lai khi da la tbks thi khong doi gi, khong ghi them nhat ky.
begin;

do $$
declare
  v_id   uuid := 'a5bc0f6d-2d3b-4313-bff4-8210859c2e01';
  v_cu   text;
begin
  select vai_tro into v_cu from nguoi_dung where id = v_id for update;
  if v_cu is null then
    raise exception 'Khong tim thay tai khoan %', v_id;
  end if;
  if v_cu = 'tbks' then
    raise notice 'Tai khoan da la tbks — khong doi';
    return;
  end if;

  update nguoi_dung set vai_tro = 'tbks' where id = v_id;

  insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, luc)
  values (null, 'doi_vai_tro_nguoi_dung', 'nguoi_dung', v_id::text,
          jsonb_build_object(
            'vai_tro_cu', v_cu,
            'vai_tro_moi', 'tbks',
            'ly_do', 'Cap quyen TBKS duyet OT theo yeu cau 10/11/2026',
            'boi', 'phien AI 10/11/2026'
          ),
          now());
end $$;

select 'SAU_DOI' as muc, id, ten_dang_nhap, vai_tro, dang_hoat_dong
  from nguoi_dung where id = 'a5bc0f6d-2d3b-4313-bff4-8210859c2e01';

commit;
