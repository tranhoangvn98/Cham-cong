-- Module: BAT DU LIEU THO tu may (de kham pha cau truc bang access-control).
--
-- May acc day ket qua `DATA QUERY tablename=<bang>` vao /iclock/querydata. Voi bang `user` ta
-- da parse duoc. Nhung `timezone`, `door`, `userauthorize`... cau truc KHONG co tai lieu — muon
-- cau hinh khung gio qua ADMS thi phai XEM cau truc that truoc (nhu da lam voi tablename=user).
--
-- Bang nay luu NGUYEN VAN than may day ve cho tung (may, bang) — de admin doc cau truc va tu do
-- soan lenh DATA UPDATE. Chi giu ban MOI NHAT moi bang (upsert), khong phinh.

create table if not exists may_du_lieu_tho (
  thiet_bi_serial text not null references thiet_bi(serial) on delete cascade,
  bang            text not null,
  noi_dung        text not null default '',
  so_dong         int not null default 0,
  luc             timestamptz not null default now(),
  primary key (thiet_bi_serial, bang)
);
