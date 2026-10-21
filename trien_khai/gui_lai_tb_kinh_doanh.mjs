// Gui lai thong bao TB-000021 (05/2026/TB-THVN) cho DUNG tap nguoi nhan:
// van ban da phat hanh NHAM phong "Kinh doanh" (rong, 0 nguoi) thay vi
// "Phòng Kinh doanh" (20 nguoi). Chay TRONG container may_chu (node, /app).
// Idempotent: chay lai khong sinh trung chuong; email gui lai binh thuong.

const { truy_van, truy_van_mot, thuc_thi, dong_pool } =
  await import('/app/may_chu/dist/csdl/ket_noi.js');
const { gui_email_thong_bao } =
  await import('/app/may_chu/dist/su_kien/gui_email_thong_bao.js');

const TB_ID = 'c9f94b7f-1d57-464f-bb50-968668028198';

const kd = await truy_van_mot(
  "select id from phong_ban where ten = 'Phòng Kinh doanh'",
);
if (kd === null) {
  console.error('KHONG tim thay phong ban "Phòng Kinh doanh" — dung lai.');
  process.exit(1);
}
const kd_id = kd.id;

const tb = await truy_van_mot(
  'select id, tieu_de, pham_vi, phong_ban_id from thong_bao where id = $1',
  [TB_ID],
);
if (tb === null) {
  console.error('KHONG tim thay thong bao TB-000021 — dung lai.');
  process.exit(1);
}
console.log(`Truoc khi sua: pham_vi=${tb.pham_vi} phong_ban_id=${tb.phong_ban_id}`);

// 1) Chuyen pham vi ve dung "Phòng Kinh doanh" — ca bang da phat hanh lan ban nhap AI.
await thuc_thi('update thong_bao set phong_ban_id = $2 where id = $1',
  [TB_ID, kd_id]);
await thuc_thi(
  `update thong_bao_nhap_ai set phong_ban_id = $2
    where thong_bao_id = $1 and pham_vi = 'phong_ban'`,
  [TB_ID, kd_id],
);

// 2) Tao lai chuong bao rieng cho dung tap nguoi nhan:
//    phong chinh + kiem nhiem + tai khoan admin (luat 21/10/2026).
const them = await truy_van(
  `select u.id as nguoi_dung_id, nv.ho_ten, coalesce(pb.ten, '(chua gan)') as phong_ban
     from nguoi_dung u
     join nhan_vien nv on nv.id = u.nhan_vien_id
     left join phong_ban pb on pb.id = nv.phong_ban_id
    where u.dang_hoat_dong = true and nv.dang_hoat_dong = true
      and (nv.phong_ban_id = $1
           or exists (select 1 from phong_ban_kiem_nhiem pbk
                       where pbk.nhan_vien_id = nv.id and pbk.phong_ban_id = $1)
           or u.vai_tro = 'admin')
      and not exists (
        select 1 from thong_bao_rieng tbr
         where tbr.nguoi_dung_id = u.id
           and tbr.du_lieu->>'thong_bao_id' = $2)
    order by coalesce(pb.ten, '(chua gan)'), nv.ho_ten`,
  [kd_id, TB_ID],
);
for (const n of them) {
  await thuc_thi(
    `insert into thong_bao_rieng(nguoi_dung_id, tieu_de, noi_dung, du_lieu)
     values ($1, $2, $3, $4::jsonb)`,
    [n.nguoi_dung_id, `Thông báo mới: ${tb.tieu_de}`,
      'Bấm để xem chi tiết.',
      JSON.stringify({ man: 'thong-bao', thong_bao_id: TB_ID })],
  );
}
console.log(`Da tao chuong cho ${them.length} nguoi:`);
for (const n of them) console.log(`  ${n.ho_ten} (${n.phong_ban})`);

// 3) Gui lai email cho dung tap nguoi nhan (kiem nhiem + admin tu dong vao).
const kq = await gui_email_thong_bao(TB_ID);
console.log(`Gui email: ok=${kq.ok} so_nhan=${kq.so_nhan ?? 0} ly_do=${kq.ly_do ?? '-'}`);

await dong_pool();
