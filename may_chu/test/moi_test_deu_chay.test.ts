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
const CHAY_RIENG = new Set(['e2e.test.ts', 'proxy_tin_cay.test.ts']);

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
