-- Theo doi ban sao cua tung tep ho so tren thu vien HCNS (SharePoint).
--
-- KHONG PHAI MOT HANG DOI VIEC. La mot BANG TRANG THAI, va cho no khac nhau that su:
--
--   hang doi   ghi "hay day tep X" -> lam -> xoa khoi hang doi. Bo mat mot su kien la mat
--              vinh vien; chay lai hai lan thi lam hai lan.
--   trang thai ghi "tep X DANG o duong dan A, va NEN o duong dan B". Moi vong quet chi lam
--              cho hai cot bang nhau. Bo mat bao nhieu su kien cung khong sao, va chay lai
--              bao nhieu lan cung cho cung mot ket qua.
--
-- Chon trang thai vi co BON cho doi duoc ma_nv/ho_ten (nhan su sua tay, nhap CSV, dong bo
-- ERP, API /api/v1), va moi lan doi la duong dan mong muon doi theo. Voi hang doi thi mot
-- cho quen phat su kien la mot tep nam sai cho mai mai.

create table if not exists sharepoint_tep (
  -- CO Y KHONG CO KHOA NGOAI SANG ho_so_tep.
  --
  -- Neu co `references ho_so_tep(id) on delete cascade` thi luc nhan su GO mot tep, dong nay
  -- bi xoa theo — va cung voi no la thong tin duy nhat cho biet con mot ban sao tren
  -- SharePoint can xoa. Ban sao do se song mai mai o do, khong ai biet.
  --
  -- Doi lai, bang nay co the co dong "mo": tep_id khong con trong ho_so_tep. Do la dung:
  -- day chinh la nhung dong dang cho lenh xoa.
  tep_id            uuid primary key,
  nhan_vien_id      uuid,

  -- Duong dan NEN co tren SharePoint. null = khong duoc phep nam tren SharePoint nua, vi
  -- tep da bi go, hoac vi nhom cua no khong duoc dong bo (khieu_nai).
  duong_dan_muon    text,
  -- Duong dan DANG co that tren SharePoint. null = chua tung day len duoc.
  duong_dan_da_day  text,
  -- Id cua tep tren SharePoint, do Graph cap. Giu lai de doi chieu khi go loi.
  sp_item_id        text,
  so_byte           bigint,

  -- Ket qua cua LAN LAM GAN NHAT, khong phai "con viec hay khong". Con viec hay khong thi
  -- tinh bang `duong_dan_muon is distinct from duong_dan_da_day`, khong luu.
  ket_qua           text not null default 'chua_lam'
                    check (ket_qua in ('chua_lam','xong','loi','bo_qua')),
  -- Vi sao bo qua, hoac loi gi. Doc duoc tren trang quan tri.
  ly_do             text,
  so_lan_thu        int not null default 0,

  lam_luc           timestamptz,
  tao_luc           timestamptz not null default now(),
  cap_nhat_luc      timestamptz not null default now()
);

-- Tim viec con phai lam: hai cot duong dan khac nhau.
--
-- `is distinct from` chu KHONG phai `<>`: voi `<>` thi mot ben null lam ca bieu thuc thanh
-- null, tuc la "khong khac nhau", tuc la mot tep can XOA (muon = null, da_day co gia tri) se
-- khong bao gio duoc tim thay.
create index if not exists sharepoint_tep_con_viec_idx
  on sharepoint_tep(cap_nhat_luc)
  where duong_dan_muon is distinct from duong_dan_da_day;

create index if not exists sharepoint_tep_nhan_vien_idx
  on sharepoint_tep(nhan_vien_id);

-- Hai tep khac nhau khong duoc cung mot duong dan dang chiem tren SharePoint: neu co, tep
-- sau ghi de tep truoc va mot ban sao mat im lang.
create unique index if not exists sharepoint_tep_duong_dan_idx
  on sharepoint_tep(duong_dan_da_day)
  where duong_dan_da_day is not null;

comment on table sharepoint_tep is
  'Ban sao cua tung tep ho so tren thu vien HCNS. Bang TRANG THAI (hai cot duong dan), '
  'khong phai hang doi. Khong co khoa ngoai sang ho_so_tep de dong cho lenh xoa con song '
  'sot sau khi tep bi go.';
