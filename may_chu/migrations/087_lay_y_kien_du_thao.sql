-- Module: LAY Y KIEN DU THAO — van ban AI co them trang thai `dang_lay_y_kien`.
--
-- Ban nhap o `cho_duyet` (gate dat, chua trinh ky / ban hanh) co the mo "lay y kien":
-- he thong gui email toi dung tap nguoi nhan kem link gop y. Y kien gui ve nam trong bang
-- `ho_thu_y_kien` (migration 086), khong luu truc tiep o day. Ket thuc lay y kien thi ban
-- nhap quay ve `cho_duyet` de trinh ky / ban hanh nhu luong cu.

alter table thong_bao_nhap_ai add column if not exists lay_y_kien_luc timestamptz;

-- Mo rong CHECK trang_thai them 'dang_lay_y_kien'. Ten rang buoc do PostgreSQL tu dat cho
-- cot check inline — tim qua pg_constraint cho chac, khong doan ten.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'thong_bao_nhap_ai'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%trang_thai%'
  loop
    execute format('alter table thong_bao_nhap_ai drop constraint %I', c);
  end loop;
end $$;

alter table thong_bao_nhap_ai add constraint thong_bao_nhap_ai_trang_thai_check
  check (trang_thai in ('dang_soan', 'cho_duyet', 'cho_ky', 'loi',
                        'dang_lay_y_kien', 'da_phat_hanh', 'huy'));
