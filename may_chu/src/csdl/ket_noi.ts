// Ket noi PostgreSQL. Mot pool dung chung cho ca tien trinh.
import pg from 'pg';
import { cau_hinh } from '../cau_hinh.ts';

// Tra ve DATE (OID 1082) duoi dang chuoi 'YYYY-MM-DD' thay vi Date cua JS.
// Neu de mac dinh, node-postgres dung Date theo mui gio may chu -> lech ngay.
pg.types.setTypeParser(1082, (v: string) => v);
// NUMERIC (OID 1700) -> so, vi so_cong luon nho (<= 1.00) nen khong lo mat do chinh xac.
pg.types.setTypeParser(1700, (v: string) => Number(v));
// BIGINT (OID 20) -> so; id cua outbox/lenh khong bao gio vuot Number.MAX_SAFE_INTEGER.
pg.types.setTypeParser(20, (v: string) => Number(v));

export const pool = new pg.Pool({
  connectionString: cau_hinh.database_url,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // May ZKTeco co the doi ket noi lien tuc; dat statement_timeout de mot truy van
  // hong khong giu ket noi mai mai.
  statement_timeout: 30_000,
});

// Loi tu ket noi ranh (vd DB restart) khong duoc lam sap tien trinh.
pool.on('error', (loi) => {
  console.error('[csdl] loi pool:', loi.message);
});

export type ThamSo = ReadonlyArray<unknown>;

/** Chay truy van, tra ve danh sach dong. */
export async function truy_van<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  tham_so: ThamSo = [],
): Promise<T[]> {
  const kq = await pool.query<T>(sql, tham_so as unknown[]);
  return kq.rows;
}

/** Chay truy van, tra ve dong dau tien hoac null. */
export async function truy_van_mot<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  tham_so: ThamSo = [],
): Promise<T | null> {
  const rows = await truy_van<T>(sql, tham_so);
  return rows[0] ?? null;
}

/** Chay truy van khong can ket qua, tra ve so dong bi anh huong. */
export async function thuc_thi(sql: string, tham_so: ThamSo = []): Promise<number> {
  const kq = await pool.query(sql, tham_so as unknown[]);
  return kq.rowCount ?? 0;
}

/**
 * Chay mot khoi lenh trong transaction. Tu ROLLBACK neu ham nem loi.
 * Dung khi phai ghi du lieu nghiep vu + hop_thu_di cung luc (khong duoc lech nhau).
 */
export async function trong_giao_dich<T>(
  ham: (khach: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const khach = await pool.connect();
  try {
    await khach.query('BEGIN');
    const kq = await ham(khach);
    await khach.query('COMMIT');
    return kq;
  } catch (loi) {
    try {
      await khach.query('ROLLBACK');
    } catch {
      // ket noi co the da chet — bo qua, loi goc quan trong hon
    }
    throw loi;
  } finally {
    khach.release();
  }
}

export async function dong_pool(): Promise<void> {
  await pool.end();
}
