// Lenh CLI: npm --workspace may_chu run doi_chieu_schema
//
// Chay tren MOT MAY CO MANG toi CSDL ERP 1. In bao cao lech schema va thoat ma 1 neu co phep
// do dang BAT tro toi bang/cot khong ton tai.
//
// Dat ma thoat khac 0 de dua duoc vao CI hoac cron cua doi van hanh: schema ERP 1 doi ma
// khong ai biet la kieu hong im lang, va cai gia phai tra la nhung thang khong co canh bao
// nao trong khi thuc te co.
import { bat_duoc, doi_chieu, in_bao_cao } from './doi_chieu_schema.ts';
import { dong_pool_erp } from './ket_noi_erp.ts';
import { dong_pool } from '../csdl/ket_noi.ts';

try {
  if (!bat_duoc()) {
    console.error(
      'Chua cau hinh ket noi ERP 1. Khai ERP1_HOST, ERP1_USER, ERP1_PASSWORD trong .env '
      + 'roi chay lai.',
    );
    process.exitCode = 2;
  } else {
    const kq = await doi_chieu();
    const chan = in_bao_cao(kq, (s) => { console.log(s); });
    process.exitCode = chan ? 1 : 0;
  }
} catch (loi) {
  console.error('[doi_chieu_schema] LOI:', (loi as Error).message);
  process.exitCode = 2;
} finally {
  await dong_pool_erp();
  await dong_pool();
}
