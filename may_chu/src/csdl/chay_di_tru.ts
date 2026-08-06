// Lenh CLI: npm run di_tru
import { chay_di_tru } from './di_tru.ts';
import { dong_pool } from './ket_noi.ts';

try {
  await chay_di_tru();
} catch (loi) {
  console.error('[di_tru] LOI:', (loi as Error).message);
  process.exitCode = 1;
} finally {
  await dong_pool();
}
