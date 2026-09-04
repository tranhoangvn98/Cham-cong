// Canh chinh danh sach test trong package.json.
//
// Da hai lan mot tep test duoc viet ra day du nhung khong duoc khai trong `npm test`, nen
// no khong chay lan nao: test/csv.test.ts va test/quyen_ho_so.test.ts. Kieu hong nay im
// lang tuyet doi — bo test van bao mau xanh, chi la no dang xanh vi khong kiem gi ca.
//
// Nen de mot cai canh o day thay vi tiep tuc nho bang tay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const THU_MUC = dirname(fileURLToPath(import.meta.url));
const GOI = join(THU_MUC, '..', 'package.json');

/** Chay rieng vi can CSDL that; xem script `test_e2e`. */
const CHAY_RIENG = new Set([
  'e2e.test.ts',
  'proxy_tin_cay.test.ts',
  'su_kien_nhan_su.test.ts',
  // Tep rieng vi no can `CONG_URL` RONG, ma `cau_hinh` doc bien moi truong mot lan luc import.
  'su_kien_nhan_su_chua_cau_hinh.test.ts',
]);

test('moi tep test deu duoc khai trong npm test', () => {
  const script = (JSON.parse(readFileSync(GOI, 'utf8')) as { scripts: Record<string, string> })
    .scripts;
  const moi_lenh = Object.values(script).join(' ');

  const thieu = readdirSync(THU_MUC)
    .filter((t) => t.endsWith('.test.ts'))
    .filter((t) => !CHAY_RIENG.has(t))
    .filter((t) => !moi_lenh.includes(`test/${t}`));

  assert.deepEqual(thieu, [],
    `Cac tep test sau chua duoc khai trong package.json nen KHONG chay lan nao: ${thieu.join(', ')}`);
});

test('cac tep chay rieng van co script goi toi', () => {
  const script = (JSON.parse(readFileSync(GOI, 'utf8')) as { scripts: Record<string, string> })
    .scripts;
  const moi_lenh = Object.values(script).join(' ');
  for (const t of CHAY_RIENG) {
    assert.ok(moi_lenh.includes(`test/${t}`), `${t} khong co script nao goi toi`);
  }
});

/**
 * Tep kiem nao cham vao `../src/` deu phai TU khai bien moi truong no can.
 *
 * VI SAO
 *
 * `cau_hinh.ts` fail-fast khi thieu `JWT_SECRET` / `DATABASE_URL`, va gan nhu moi tep trong
 * `src/` deu keo theo no qua mot chuoi import — ke ca nhung tep chi chua ham thuan. Tep kiem
 * khong khai bien se song nho tep `.env` cua nguoi viet, ma `.env` KHONG NAM TRONG KHO.
 *
 * Do la kieu hong te nhat: xanh tren may nguoi viet, do tren moi may khac, va thong bao loi
 * ("Thieu bien moi truong bat buoc") khong he goi y rang van de nam o bo kiem chu khong phai
 * o may. Ngay 31.08.2026 co CHIN tep dang hong nhu vay cung luc — khong ai them cung mot lo
 * chin lan, chung tich lai tung tep mot vi khong co gi bat.
 *
 * Chap nhan HAI cach khai: import `moi_truong_kiem_thu.ts` (nen dung), hoac tu dat
 * `JWT_SECRET` trong tep. Cach thu hai la loi cu cua nhung tep viet truoc; giu lai de bai kiem
 * nay khong bien thanh mot dot sua hang loat khong lien quan.
 */
test('tep kiem dung `../src/` phai tu khai bien moi truong', () => {
  const thieu: string[] = [];

  for (const t of readdirSync(THU_MUC).filter((x) => x.endsWith('.test.ts'))) {
    const nguon = readFileSync(join(THU_MUC, t), 'utf8');
    if (!nguon.includes('../src/')) continue;
    if (nguon.includes('moi_truong_kiem_thu.ts')) continue;
    if (nguon.includes('JWT_SECRET')) continue;
    thieu.push(t);
  }

  assert.deepEqual(thieu, [],
    'Cac tep sau nap `../src/` ma khong khai bien moi truong, nen chi chay duoc tren may co '
    + `tep .env: ${thieu.join(', ')}. Them \`import './moi_truong_kiem_thu.ts';\` lam import `
    + 'DAU TIEN cua tep.');
});
