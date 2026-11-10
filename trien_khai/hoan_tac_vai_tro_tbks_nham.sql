-- HOAN TAC: cap nham tai khoan. Ngo Thi Thu Hien (thuhien.xnk@) tro ve `nhan_vien`.
-- Yeu cau 10/11/2026: nguoi can cap la HOANG Thi Thu Hien (htthien.mkt@), khong phai NGO.
begin;

do $$
declare
  v_id uuid := 'a5bc0f6d-2d3b-4313-bff4-8210859c2e01';
  v_cu text;
begin
  select vai_tro into v_cu from nguoi_dung where id = v_id for update;
  if v_cu is null then
    raise exception 'Khong tim thay tai khoan %', v_id;
  end if;
  if v_cu = 'nhan_vien' then
    raise notice 'Da la nhan_vien — khong doi';
    return;
  end if;

  update nguoi_dung set vai_tro = 'nhan_vien' where id = v_id;

  insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, luc)
  values (null, 'doi_vai_tro_nguoi_dung', 'nguoi_dung', v_id::text,
          jsonb_build_object(
            'vai_tro_cu', v_cu,
            'vai_tro_moi', 'nhan_vien',
            'ly_do', 'Hoan tac cap nham tai khoan — nguoi can cap la Hoang Thi Thu Hien, khong phai Ngo Thi Thu Hien',
            'boi', 'phien AI 10/11/2026'
          ),
          now());
end $$;

select 'SAU_HOAN_TAC' as muc, id, ten_dang_nhap, vai_tro
  from nguoi_dung where id = 'a5bc0f6d-2d3b-4313-bff4-8210859c2e01';

select 'HTTHIEN' as muc, id, ten_dang_nhap, vai_tro, dang_hoat_dong,
       nhan_vien_id
  from nguoi_dung where ten_dang_nhap = 'htthien.mkt@tranhoangvietnam.com';

commit;
