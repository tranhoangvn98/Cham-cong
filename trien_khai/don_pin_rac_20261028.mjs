// DON PIN RAC TREN MAY CHAM CONG (28/10/2026).
//
// Boi canh: bang dieu khien bao "7 PIN tren may bi gan sai hoac dang co nguoi quet ma chua
// gan" + "23 PIN chua gan cho ai". Sau khi sua cach phan loai (1.138.1), phan con lai deu la
// user CU nam lai tren may tu truoc khi lap so:
//   - 23 PIN chua gan: lan quet cuoi 04-07/2026, khong thuoc ai trong he thong.
//   - PIN 2: nguoi cu (Nguyen Ngan Ha) nghi, PIN gan lai cho Hoang Minh Ngoc roi nguoi do cung
//            nghi 18/09.
//   - PIN 6 tren may VP: user cu cua Nguyen Viet Minh Tien (quen 01/10); nguoi giu PIN nay bay
//            gio la Nguyen Hai Yen va chi quet o Kho Ha Noi.
//
// Script CHI GUI LENH XOA USER tren may dang BAT, va tu choi xoa khi:
//   - PIN do co luot quet trong 30 ngay (co nguoi dang dung that), hoac
//   - PIN thuoc mot nguoi dang lam (khong phai danh sach chi dinh).
// Xoa user tren may KHONG xoa lich su quet: bang lan_quet giu nguyen de doi chieu sau nay.
//
// CHAY THU (in ra se xoa gi, khong ghi):
//   docker compose cp trien_khai/don_pin_rac_20261028.mjs may_chu:/app/
//   docker compose exec -T may_chu node /app/don_pin_rac_20261028.mjs
// CHAY THAT:
//   docker compose exec -T may_chu node /app/don_pin_rac_20261028.mjs --thuc-thi
import { truy_van } from '/app/may_chu/dist/csdl/ket_noi.js';
import { xep_lenh } from '/app/may_chu/dist/adms/tuyen.js';
import { doi_chieu_may } from '/app/may_chu/dist/dinh_danh/doi_chieu_may.js';

const THUC_THI = process.argv.includes('--thuc-thi');
const NGAY_IM_LANG = 30;

const may = await truy_van(
  'select serial, ten from thiet_bi where dang_bat = true order by serial');
const tat = await truy_van(
  'select serial, ten from thiet_bi where dang_bat = false order by serial');
console.log(`May dang bat: ${may.map((m) => `${m.ten} (${m.serial})`).join(', ') || '(khong co)'}`);
if (tat.length > 0) {
  console.log(`Bo qua may dang TAT: ${tat.map((m) => m.ten).join(', ')}`);
}

// PIN tren may VP la user cu cua nguoi da roi di, nguoi giu PIN hien tai quet o may khac.
const XOA_TAY = new Map([
  ['8116254600435|6', 'PIN 6: user cu Nguyen Viet Minh Tien; nguoi giu PIN quet o Kho Ha Noi'],
  ['8116254600440|6', 'PIN 6: user cu Nguyen Viet Minh Tien; nguoi giu PIN quet o Kho Ha Noi'],
]);

const tu_choi = [];
const chon = [];
for (const m of may) {
  const ds = await doi_chieu_may(m.serial);
  for (const u of ds) {
    const khoa = `${m.serial}|${u.pin}`;
    const ly_do_tay = XOA_TAY.get(khoa);
    let ly_do = null;
    if (ly_do_tay !== undefined) ly_do = ly_do_tay;
    else if (u.khop === 'chua_gan') ly_do = 'khong ai giu PIN, khong ai quet 7 ngay';
    else if (u.khop === 'da_nghi') ly_do = `nguoi giu PIN da nghi (${u.ho_ten ?? ''})`.trim();
    if (ly_do === null) continue;

    const cuoi = await truy_van(
      `select max(thoi_diem)::date::text as lan_cuoi, count(*)::int as so_luot
         from lan_quet where thiet_bi_serial = $1 and pin_may = $2
          and thoi_diem > now() - ($3 || ' days')::interval`,
      [m.serial, u.pin, String(NGAY_IM_LANG)]);
    const so_luot = cuoi[0]?.so_luot ?? 0;
    if (u.khop !== 'da_nghi' && so_luot > 0) {
      tu_choi.push(`${khoa} "${u.ten_may ?? ''}": con ${so_luot} luot quet trong ${NGAY_IM_LANG} ngay`);
      continue;
    }
    chon.push({ serial: m.serial, ten_may: m.ten, pin: u.pin, ly_do });
  }
}

console.log(`\nSe xoa ${chon.length} user tren may:`);
for (const c of chon) console.log(`  ${c.ten_may}  PIN ${String(c.pin).padStart(5)} — ${c.ly_do}`);
if (tu_choi.length > 0) {
  console.log(`\nTU CHOI ${tu_choi.length} (con luot quet gan day):`);
  for (const t of tu_choi) console.log(`  ${t}`);
}

if (!THUC_THI) {
  console.log('\nCHAY THU — chua gui lenh nao. Them --thuc-thi de xoa that.');
  process.exit(0);
}

let so_lenh = 0;
for (const c of chon) {
  const id = await xep_lenh(c.serial, `DATA DELETE USERINFO PIN=${c.pin}`, `dx:${c.serial}:${c.pin}`);
  if (id > 0) so_lenh++;
}
// Hoi lai danh sach user de may day ANH CHUP MOI — nho vay dong da xoa bien mat khoi
// may_nguoi_dung va canh bao tren bang dieu khien tu tat.
for (const m of may) {
  await xep_lenh(m.serial, 'DATA QUERY USERINFO');
  await xep_lenh(m.serial, 'DATA QUERY tablename=user,fielddesc=*,filter=*');
}

console.log(`\nDa xep ${so_lenh} lenh xoa + lenh hoi lai danh sach user cho ${may.length} may.`);
console.log('May se thuc hien o lan ket noi ke tiep (thuong duoi 15 giay), roi day anh chup moi.');
