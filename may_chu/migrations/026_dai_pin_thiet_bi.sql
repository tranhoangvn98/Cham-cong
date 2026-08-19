-- Dai PIN cua tung may cham cong.
--
-- VI SAO: PIN la DANH TINH — bo tiep nhan tra PIN ra nhan vien tren pham vi toan cong ty, khong
-- loc theo may. Nen neu VP2 khai anh A la PIN 1 trong khi VP1 da co anh B la PIN 1, moi lan quet
-- cua anh A o VP2 se cong vao cong cua anh B. Phan mem khong the biet: no chi thay "PIN 1".
--
-- Cach chac chan la KHONG DE NGUOI KHAI MAY TU NGHI RA SO. He thong cap mot PIN con trong, hop
-- le, trong dai cua may do; nguoi phu trach cai dung so do len may. Chieu di la he-thong -> may,
-- khong bao gio nguoc lai.
--
-- Dai chi de SO DE DOC (nhin PIN biet may nao) va de cap phat khong dam vao nhau. Tinh duy nhat
-- van do unique index cua `ma_dinh_danh` bao dam tren toan cong ty, khong phai do dai nay.

alter table thiet_bi
  add column if not exists pin_tu  int,
  add column if not exists pin_den int;

-- Dai phai xuoi va duong. Cho phep ca hai cung null = may nay khong khai dai, cap tu 1 tro len.
alter table thiet_bi drop constraint if exists thiet_bi_dai_pin_hop_le;
alter table thiet_bi add constraint thiet_bi_dai_pin_hop_le check (
  (pin_tu is null and pin_den is null)
  or (pin_tu is not null and pin_den is not null and pin_tu >= 1 and pin_den >= pin_tu)
);

comment on column thiet_bi.pin_tu is
  'Dau dai PIN cap phat cho may nay. null = khong khai dai, cap tu 1.';
comment on column thiet_bi.pin_den is
  'Cuoi dai PIN cap phat cho may nay.';
