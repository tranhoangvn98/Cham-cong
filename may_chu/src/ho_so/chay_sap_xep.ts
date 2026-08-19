// Lenh CLI: npm run sap_xep_tep            (chay thu, KHONG doi gi)
//           npm run sap_xep_tep -- --that  (doi cho that)
//
// Mac dinh la CHAY THU. Thu dang di chuyen la ban goc hop dong lao dong, CCCD, bang cap —
// khong khoi phuc duoc tu CSDL. Mot lenh mac dinh "lam that" o day la mot lenh cho phep go
// nham mot chu.
import { sap_xep_kho } from './sap_xep_tep.ts';
import { dong_pool } from '../csdl/ket_noi.ts';

const that = process.argv.includes('--that');

try {
  const kq = await sap_xep_kho(that ? 'that' : 'thu');

  console.log(`\n${that ? 'ĐÃ SẮP XẾP' : 'CHẠY THỬ — chưa đổi gì'}`);
  console.log(`  xét            ${String(kq.so_xet)} tệp`);
  console.log(`  ${that ? 'đã đổi chỗ    ' : 'sẽ đổi chỗ    '} ${String(kq.so_doi_cho)}`);
  console.log(`  đã đúng chỗ    ${String(kq.so_dung_cho)}`);
  if (kq.so_mat_tep > 0) {
    console.log(`  MẤT TỆP        ${String(kq.so_mat_tep)}  (có dòng CSDL nhưng không có tệp trên đĩa)`);
  }
  if (kq.so_duong_dan_xau > 0) {
    console.log(`  ĐƯỜNG DẪN XẤU  ${String(kq.so_duong_dan_xau)}  (dữ liệu hỏng — cần người xem)`);
  }

  // In toi 40 dong. Nhieu hon thi cuon mat dau, va con so tong o tren da noi du.
  for (const c of kq.chi_tiet.slice(0, 40)) {
    console.log(`\n  ${c.ma_nv} — ${c.ho_ten}  (${c.ten_goc})`);
    console.log(`    ${c.tu}`);
    console.log(`    → ${c.den === '' ? '(không xác định được)' : c.den}   [${c.ket_qua}]`);
  }
  if (kq.chi_tiet.length > 40) {
    console.log(`\n  … còn ${String(kq.chi_tiet.length - 40)} dòng nữa.`);
  }

  if (!that && kq.so_doi_cho > 0) {
    console.log('\nChạy lại với --that để đổi chỗ thật:');
    console.log('  docker compose exec may_chu npm run sap_xep_tep -- --that\n');
  }
} catch (loi) {
  console.error('[sap_xep] LOI:', (loi as Error).message);
  process.exitCode = 1;
} finally {
  await dong_pool();
}
