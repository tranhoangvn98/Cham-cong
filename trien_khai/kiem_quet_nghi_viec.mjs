// Kiem chung job quet nghi viec (CHI DOC Entra + bao cao, KHONG sua gi).
// Chay TRONG container may_chu:
//   docker compose cp trien_khai/kiem_quet_nghi_viec.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/kiem_quet_nghi_viec.mjs
import { quet_nghi_viec_chua_khoa } from '/app/may_chu/dist/nhan_su/quet_nghi_viec.js';

const kq = await quet_nghi_viec_chua_khoa();
console.log('da nghi:', kq.so_da_nghi, '| loi:', kq.so_loi, '| khong kiem tra duoc:', kq.so_khong_kiem_tra_duoc);
for (const d of kq.ds) {
  console.log(`- ${d.ma_nv} ${d.ho_ten} (nghi ${d.ngay_nghi_viec ?? '?'}) [${d.upn ?? 'khong co UPN'}]: `
    + (d.loi.length === 0 ? '(khong loi)' : d.loi.join(', '))
    + (d.khong_kiem_tra_duoc ? ' + KHONG KIEM TRA DUOC M365' : ''));
}
process.exit(0);
