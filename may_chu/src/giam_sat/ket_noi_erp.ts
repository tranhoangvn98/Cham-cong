// Ket noi CHI-DOC toi cac database cua ERP 1.
//
// DAY LA LOP DUY NHAT trong ma nguon duoc phep mo ket noi sang ERP 1. Co bai kiem kien truc
// chan moi tep khac nhap `pg` de doc ERP 1 (thiet_ke/kien_truc.test.mjs). Ly do: neu moi phep
// do tu mo ket noi cua no thi ba lop chan chi-doc duoi day thanh tuy chon, va so ket noi ta
// mo vao CSDL san xuat cua he thong khac tro nen khong ai dem duoc.
//
// BA LOP CHAN GHI, xep tu ngoai vao:
//
//   1. Ben Postgres ERP 1: tai khoan chi co GRANT SELECT, va nen dat
//      `ALTER ROLE ... SET default_transaction_read_only = on`. Lop nay ta khong kiem soat
//      duoc tu day — no thuoc ve nguoi quan tri ERP 1 — nen khong duoc coi la du.
//   2. Chuoi ket noi: `options=-c default_transaction_read_only=on`. Postgres ap cho MOI
//      phien do pool nay mo, ke ca khi tai khoan quen bi cau hinh o lop 1.
//   3. Moi truy van chay trong `begin read only ... commit`. Postgres tu choi ngay bat ky
//      lenh ghi nao trong transaction do, ke ca khi hai lop tren deu hong.
//
// Ba lop la thua mot cach co chu dich. Mot lop cau hinh sai o he thong nay khong duoc phep
// bien thanh mot cau UPDATE tren CSDL san xuat cua he thong khac.
import pg from 'pg';
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { la_ma_nguon, type MaNguon } from './nguon.ts';
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';

/** So ket noi toi da MOI database. Co tinh nho: ta la khach tren CSDL cua nguoi khac. */
const TOI_DA_KET_NOI = 3;

/**
 * Ten hien trong `pg_stat_activity` ben ERP 1.
 *
 * Quan trong hon ve ngoai: khi quan tri ERP 1 thay mot truy van la dang chay, ho phai biet
 * ngay no den tu dau ma khong phai di hoi vong quanh.
 */
const TEN_UNG_DUNG = 'chamcong_giam_sat';

export function bat_giam_sat(): boolean {
  return cau_hinh.erp1.host !== '' && cau_hinh.erp1.user !== '';
}

function bat_buoc_bat(): void {
  if (!bat_giam_sat()) {
    throw new LoiDauVao(
      'Chưa cấu hình kết nối ERP 1. Khai ERP1_HOST, ERP1_USER, ERP1_PASSWORD trong .env '
      + 'rồi khởi động lại máy chủ.',
    );
  }
}

function cau_hinh_pool(ten_database: string): pg.PoolConfig {
  return {
    host: cau_hinh.erp1.host,
    port: cau_hinh.erp1.port,
    user: cau_hinh.erp1.user,
    password: cau_hinh.erp1.mat_khau,
    database: ten_database,
    ssl: cau_hinh.erp1.ssl ? { rejectUnauthorized: false } : undefined,
    max: TOI_DA_KET_NOI,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    statement_timeout: cau_hinh.erp1.het_gio_ms,
    application_name: TEN_UNG_DUNG,
    // LOP 2: moi phien cua pool nay chi-doc ngay tu luc mo.
    options: '-c default_transaction_read_only=on',
  };
}

// Mot pool cho moi TEN DATABASE (khong phai moi ma nguon) — hai ma nguon tro cung mot
// database thi dung chung pool.
const cac_pool = new Map<string, pg.Pool>();

function lay_pool(ten_database: string): pg.Pool {
  const co = cac_pool.get(ten_database);
  if (co !== undefined) return co;

  const pool = new pg.Pool(cau_hinh_pool(ten_database));
  // Loi tu ket noi ranh (ERP 1 restart, mang dut) khong duoc lam sap tien trinh cham cong.
  pool.on('error', (loi) => {
    console.error(`[giam_sat] loi pool ERP1/${ten_database}:`, loi.message);
  });
  cac_pool.set(ten_database, pool);
  return pool;
}

/** Dong toan bo pool ERP 1. Goi khi tat may chu. */
export async function dong_pool_erp(): Promise<void> {
  const ds = [...cac_pool.values()];
  cac_pool.clear();
  await Promise.allSettled(ds.map((p) => p.end()));
}

// ---------------------------------------------------------------- anh xa ma -> database

export interface DongNguon {
  id: string;
  ma: string;
  ten: string;
  ten_database: string | null;
  mo_ta: string | null;
  dang_bat: boolean;
  kiem_tra_luc: string | null;
  kiem_tra_ok: boolean | null;
  kiem_tra_thong_diep: string | null;
}

export async function danh_sach_nguon(): Promise<DongNguon[]> {
  return truy_van<DongNguon>(
    `select id, ma, ten, ten_database, mo_ta, dang_bat,
            kiem_tra_luc, kiem_tra_ok, kiem_tra_thong_diep
       from nguon_du_lieu
      order by ma`,
  );
}

/**
 * Ten database that cua mot ma nguon, hoac null neu chua cau hinh / dang tat.
 *
 * Doc tu CSDL moi lan goi thay vi nho vao bo dem: doi ten database la viec quan tri lam
 * tren giao dien, va no phai co hieu luc o vong quet ke tiep chu khong phai sau khi khoi
 * dong lai may chu.
 */
export async function ten_database_cua(ma: MaNguon): Promise<string | null> {
  const dong = await truy_van_mot<{ ten_database: string | null }>(
    'select ten_database from nguon_du_lieu where ma = $1 and dang_bat = true',
    [ma],
  );
  const ten = dong?.ten_database ?? null;
  return ten === null || ten.trim() === '' ? null : ten.trim();
}

// ---------------------------------------------------------------- doc du lieu

/**
 * Chay MOT truy van doc tren mot nguon ERP 1.
 *
 * LOP 3: `begin read only` bao quanh. Mot cau ghi lot vao day se bi Postgres tu choi voi
 * `cannot execute INSERT in a read-only transaction`, khong am tham chay.
 *
 * `tham_so` LUON di qua $1,$2 — khong ham nao trong module nay noi chuoi vao SQL, va co bai
 * kiem kien truc chan viec do.
 */
export async function doc<T extends pg.QueryResultRow = pg.QueryResultRow>(
  ma: MaNguon,
  sql: string,
  tham_so: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  bat_buoc_bat();
  const ten_db = await ten_database_cua(ma);
  if (ten_db === null) {
    throw new LoiDauVao(
      `Nguồn dữ liệu "${ma}" chưa được chọn database hoặc đang tắt. `
      + 'Vào Cài đặt → Nguồn ERP để cấu hình.',
    );
  }
  return doc_tren_database<T>(ten_db, sql, tham_so);
}

/** Nhu `doc` nhung chi dinh thang ten database — dung cho do tim va kiem tra ket noi. */
export async function doc_tren_database<T extends pg.QueryResultRow = pg.QueryResultRow>(
  ten_database: string,
  sql: string,
  tham_so: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  bat_buoc_bat();
  const khach = await lay_pool(ten_database).connect();
  try {
    await khach.query('begin read only');
    const kq = await khach.query<T>(sql, tham_so as unknown[]);
    await khach.query('commit');
    return kq.rows;
  } catch (loi) {
    try {
      await khach.query('rollback');
    } catch {
      // ket noi co the da chet — loi goc quan trong hon
    }
    throw loi;
  } finally {
    khach.release();
  }
}

// ---------------------------------------------------------------- do tim

export interface DatabaseTimDuoc {
  ten: string;
  /** Kich thuoc doc duoc tu pg_database_size, dang chuoi da lam tron. */
  kich_thuoc: string | null;
  /** true neu tai khoan hien tai co quyen ket noi. */
  ket_noi_duoc: boolean;
}

/**
 * Liet ke cac database tren may chu ERP 1 ma tai khoan nay THAY va NOI DUOC.
 *
 * VI SAO CAN MAN HINH NAY thay vi ghi thang ten vao code: ten database trong ma nguon ERP 1
 * la ten moi truong UAT (`cms_uat`, `xnk_debt_uat`, `xnk_logs_uat`...), khong chac la ten
 * production. Doan sai thi phep do im lang tra 0 dong — kieu hong te nhat, vi no nhin nhu
 * "khong co canh bao nao".
 *
 * `has_database_privilege` de khong liet ke thu ta khong vao duoc: mot danh sach dai co cac
 * dong bam vao thi loi la mot danh sach lam nguoi ta mat thoi gian.
 */
export async function do_tim_database(): Promise<DatabaseTimDuoc[]> {
  bat_buoc_bat();
  return doc_tren_database<DatabaseTimDuoc>(
    cau_hinh.erp1.db_bootstrap,
    `select d.datname                                              as ten,
            case when has_database_privilege(current_user, d.datname, 'CONNECT')
                 then pg_size_pretty(pg_database_size(d.datname))
                 else null end                                     as kich_thuoc,
            has_database_privilege(current_user, d.datname, 'CONNECT') as ket_noi_duoc
       from pg_database d
      where d.datistemplate = false
      order by d.datname`,
  );
}

export interface KetQuaKiemTra {
  ok: boolean;
  thong_diep: string;
  so_bang?: number;
  so_schema?: number;
}

/**
 * Thu ket noi mot nguon va dem so bang doc duoc.
 *
 * Dem bang la phep thu co y nghia hon la chi mo ket noi: mot tai khoan ket noi duoc nhung
 * khong duoc SELECT bang nao thi ve mat van hanh la chua dung duoc, va sai lech do phai lo
 * ra o day chu khong phai o vong quet luc 1 gio sang.
 */
export async function kiem_tra_nguon(ma: MaNguon): Promise<KetQuaKiemTra> {
  let kq: KetQuaKiemTra;
  try {
    const ten_db = await ten_database_cua(ma);
    if (ten_db === null) {
      kq = { ok: false, thong_diep: 'Chưa chọn database cho nguồn này, hoặc nguồn đang tắt.' };
    } else {
      const dong = await doc_tren_database<{ so_bang: number; so_schema: number }>(
        ten_db,
        `select count(*)::int                        as so_bang,
                count(distinct table_schema)::int    as so_schema
           from information_schema.tables
          where table_schema not in ('pg_catalog','information_schema')`,
      );
      const so_bang = dong[0]?.so_bang ?? 0;
      const so_schema = dong[0]?.so_schema ?? 0;
      kq = so_bang === 0
        ? {
          ok: false, so_bang, so_schema,
          thong_diep: 'Kết nối được nhưng không đọc được bảng nào. '
            + 'Tài khoản có thể thiếu quyền SELECT hoặc chọn nhầm database.',
        }
        : {
          ok: true, so_bang, so_schema,
          thong_diep: `Đọc được ${so_bang} bảng trong ${so_schema} schema.`,
        };
    }
  } catch (loi) {
    kq = { ok: false, thong_diep: thong_diep_loi(loi) };
  }

  await thuc_thi(
    `update nguon_du_lieu
        set kiem_tra_luc = now(), kiem_tra_ok = $2, kiem_tra_thong_diep = $3,
            cap_nhat_luc = now()
      where ma = $1`,
    [ma, kq.ok, kq.thong_diep],
  );
  return kq;
}

/**
 * Doi loi ket noi thanh cau tieng Viet noi ro PHAI LAM GI.
 *
 * KHONG bao gio de thong diep goc cua driver di thang ra giao dien: no co the chua host,
 * ten tai khoan va duong dan noi bo. Nguoi doc man hinh nay la quan tri, nhung man hinh
 * nay cung nam trong anh chup man hinh gui qua chat khi co su co.
 */
export function thong_diep_loi(loi: unknown): string {
  const ma = (loi as { code?: string }).code ?? '';
  switch (ma) {
    case '28P01': return 'Sai mật khẩu tài khoản đọc ERP 1 (ERP1_PASSWORD).';
    case '28000': return 'Tài khoản ERP 1 không được phép đăng nhập từ máy chủ này (pg_hba).';
    case '3D000': return 'Database không tồn tại trên máy chủ ERP 1.';
    case '42501': return 'Tài khoản ERP 1 không có quyền đọc dữ liệu này (thiếu GRANT SELECT).';
    case '57014': return 'Truy vấn chạy quá lâu và đã bị dừng để không làm chậm ERP 1.';
    case 'ETIMEDOUT':
    case 'ECONNREFUSED':
    case 'EHOSTUNREACH':
      return 'Không kết nối được tới máy chủ ERP 1. Kiểm tra ERP1_HOST, ERP1_PORT và tường lửa.';
    case '25006': return 'Truy vấn cố ghi dữ liệu trong khi kết nối là chỉ-đọc. '
      + 'Đây là lỗi lập trình, không phải lỗi cấu hình.';
    default: {
      const m = (loi as Error).message ?? String(loi);
      return `Không đọc được dữ liệu ERP 1: ${m.slice(0, 200)}`;
    }
  }
}

/** Doi chuoi thanh MaNguon, nem LoiDauVao neu la. Dung o bien API. */
export function doc_ma_nguon(s: unknown): MaNguon {
  if (typeof s !== 'string' || !la_ma_nguon(s)) {
    throw new LoiDauVao('Mã nguồn dữ liệu không hợp lệ.');
  }
  return s;
}
