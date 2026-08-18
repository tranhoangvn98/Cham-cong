-- Mo rong nhom cua tep dinh kem ho so cho DU 11 nhom.
--
-- LOI DA XAY RA THAT: keo mot tep vao bat ky dong nao cua tab "Tai lieu" — chinh cai
-- checklist "Ho so tai lieu 0/7" tren dau trang ho so — deu that bai. Va bon nhom that
-- bai theo hai kieu khac nhau:
--
--   tai_lieu, thong_tin        -> 400 "Truong nhom phai la mot trong: ..."
--   nguoi_phu_thuoc, bhxh      -> 500, VA de lai tep mo coi tren dia
--
-- Nguyen nhan la BA danh sach nhom, ba noi, ba noi dung khac nhau:
--
--   quyen_ho_so.ts CAC_NHOM   11 nhom   (danh sach dung)
--   ho_so.ts DAC_TA            9 nhom   (thieu thong_tin va tai_lieu — hai nhom nay khong
--                                        sinh route tu bang dac ta nen khong co o trong do)
--   CHECK o day (di tru 009)   7 + khac (viet truoc khi co di tru 010)
--
-- Nhom `thong_tin`, `tai_lieu`, `nguoi_phu_thuoc`, `bhxh` sinh ra o di tru 010, nhung
-- rang buoc nay khong duoc mo rong theo. Khong ai phat hien vi tep dinh kem cua bon nhom
-- do chi duoc them vao giao dien sau do.
--
-- Danh sach duoi PHAI khop `CAC_NHOM` trong may_chu/src/bao_mat/quyen_ho_so.ts, cong
-- 'khac'. Co bai kiem e2e tai len that cho TUNG nhom trong CAC_NHOM va doi 201 — de lech
-- lan nua thi do test, khong phai do nguoi dung keo tep vao roi moi biet.

alter table ho_so_tep drop constraint if exists ho_so_tep_nhom_check;

alter table ho_so_tep add constraint ho_so_tep_nhom_check check (nhom in (
  'thong_tin', 'tai_lieu', 'hop_dong', 'bien_ban', 'luong',
  'nguoi_phu_thuoc', 'bhxh', 'cong_viec', 'bao_cao', 'khieu_nai', 'thiet_bi',
  -- 'khac' khong nam trong CAC_NHOM: no la o chua cho tep khong thuoc nhom nao, giu lai
  -- de ban ghi cu (neu co) khong vi pham rang buoc moi.
  'khac'
));

comment on column ho_so_tep.nhom is
  'Nhom ho so chua tep. Phai khop CAC_NHOM trong bao_mat/quyen_ho_so.ts, cong ''khac''.';
