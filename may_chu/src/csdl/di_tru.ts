// Chay cac tep SQL trong may_chu/migrations theo thu tu ten, moi tep dung mot lan.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './ket_noi.ts';

const THU_MUC = resolve(dirname(fileURLToPath(import.meta.url)), '../../migrations');

export async function chay_di_tru(ghi_log: (s: string) => void = console.log): Promise<number> {
  const khach = await pool.connect();
  try {
    await khach.query(`
      create table if not exists di_tru (
        ten       text primary key,
        chay_luc  timestamptz not null default now()
      )
    `);

    // Khoa cap tien trinh: nhieu instance khoi dong cung luc khong duoc chay dong thoi.
    await khach.query('select pg_advisory_lock($1)', [918273645]);

    try {
      const da_chay = new Set(
        (await khach.query<{ ten: string }>('select ten from di_tru')).rows.map((r) => r.ten),
      );

      const tep_sql = readdirSync(THU_MUC)
        .filter((t) => t.endsWith('.sql'))
        .sort();

      let so_moi = 0;
      for (const ten of tep_sql) {
        if (da_chay.has(ten)) continue;
        const sql = readFileSync(join(THU_MUC, ten), 'utf8');
        ghi_log(`[di_tru] dang chay ${ten}`);
        // Moi tep mot transaction: hong giua duong thi khong ghi nhan da chay.
        await khach.query('BEGIN');
        try {
          await khach.query(sql);
          await khach.query('insert into di_tru(ten) values ($1)', [ten]);
          await khach.query('COMMIT');
        } catch (loi) {
          await khach.query('ROLLBACK');
          throw new Error(`Di tru ${ten} that bai: ${(loi as Error).message}`);
        }
        so_moi++;
      }

      ghi_log(so_moi === 0 ? '[di_tru] khong co tep moi' : `[di_tru] da chay ${so_moi} tep`);
      return so_moi;
    } finally {
      await khach.query('select pg_advisory_unlock($1)', [918273645]);
    }
  } finally {
    khach.release();
  }
}
