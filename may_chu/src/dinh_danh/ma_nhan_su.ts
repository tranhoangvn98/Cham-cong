// Sinh ma nhan su cua he thong cham cong: NV + ma ngan khoi + MMYY + so thu tu.
//
//   NVKHN05260001  = Kho Ha Noi, vao thang 5/2026, nguoi thu 1
//
// VI SAO MA MANG NGHIA: ma di vao ten thu muc kho tep, vao phieu luong in ra, va vao cau hoi
// "nguoi nay thuoc dau, vao khi nao". Day so tang dan thuan tuy chi tra loi duoc "ai vao truoc".
//
// SO THU TU DEM THEO (KHOI, THANG): moi khoi dem lai tu 0001 khi sang thang moi, nen ma ngan va
// doc duoc. Tinh duy nhat van do khoa chinh cua `dem_ma_nhan_su` bao dam.
import type pg from 'pg';
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';

/** Tien to chung cua ma. */
export const TIEN_TO_MA_NHAN_SU = 'NV';

/** So chu so toi thieu cua phan thu tu. Qua 9999 thi so dai ra tu nhien. */
export const SO_CHU_SO_THU_TU = 4;

/**
 * Phan 'MMYY' cua ma, lay tu thang-nam vao lam.
 *
 * Khong co `ngay_vao` thi lay hom nay theo MUI GIO MAY CHAM CONG, khong theo mui gio may chu:
 * nguoi vao lam luc 23:30 gio Viet Nam khong duoc mang thang cua hom sau.
 */
export function thang_trong_ma(ngay_vao: string | null, hom_nay: Date = new Date()): string {
  const nguon = ngay_vao === null || ngay_vao.trim() === '' ? ngay_dia_phuong(hom_nay) : ngay_vao.trim();
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(nguon);
  if (m === null) {
    throw new LoiDauVao(
      `Ngày vào làm phải có dạng YYYY-MM-DD để sinh mã nhân sự, nhận được "${nguon}".`,
    );
  }
  return `${m[2] as string}${(m[1] as string).slice(2)}`;
}

/** Ghep ma tu ba phan. So qua 4 chu so KHONG bi cat — cat la mat tinh duy nhat. */
export function dung_ma_nhan_su(ma_ngan: string, thang: string, so: number): string {
  return `${TIEN_TO_MA_NHAN_SU}${ma_ngan}${thang}`
    + String(so).padStart(SO_CHU_SO_THU_TU, '0');
}

/** Khuon ma sinh tu dong — dung de kiem va de doc lai ma cu trong bo dem. */
export const KHUON_MA_NHAN_SU = /^NV([A-Z]+)(\d{4})(\d{4,})$/;

/**
 * Cap mot ma moi trong transaction cua ben goi.
 *
 * VI SAO TRONG TRANSACTION: cau `on conflict do update` khoa dong bo dem den luc COMMIT, nen hai
 * nguoi tao ho so cung luc nhan hai so khac nhau. Con khi transaction cuon lai thi so cung cuon
 * theo — so chua tung in ra o dau nen cap lai khong phai tai dung.
 */
export async function sinh_ma_nhan_su(
  khach: pg.PoolClient, khoi_id: string, ngay_vao: string | null,
): Promise<string> {
  const k = await khach.query<{ ma_ngan: string | null; ten: string }>(
    'select ma_ngan, ten from khoi where id = $1', [khoi_id]);
  const khoi = k.rows[0];
  if (khoi === undefined) throw new LoiDauVao('Không thấy khối này trong danh mục.');
  return sinh_ma_cho_khoi(khach, khoi.ma_ngan, khoi.ten, ngay_vao);
}

/** Phan con lai sau khi da biet khoi — tach ra de kiem duoc ma khong can bang `khoi`. */
async function sinh_ma_cho_khoi(
  khach: pg.PoolClient, ma_ngan: string | null, ten_khoi: string, ngay_vao: string | null,
): Promise<string> {
  const ma = (ma_ngan ?? '').trim().toUpperCase();
  if (ma === '') {
    throw new LoiDauVao(
      `Khối "${ten_khoi}" chưa khai mã ngắn — mã nhân sự được ghép từ mã ngắn của khối. `
      + 'Khai mã ngắn cho khối rồi lưu lại.',
    );
  }
  const thang = thang_trong_ma(ngay_vao);
  const kq = await khach.query<{ so_cuoi: number }>(
    `insert into dem_ma_nhan_su (ma_ngan_khoi, thang, so_cuoi) values ($1, $2, 1)
     on conflict (ma_ngan_khoi, thang)
     do update set so_cuoi = dem_ma_nhan_su.so_cuoi + 1, cap_nhat_luc = now()
     returning so_cuoi`,
    [ma, thang],
  );
  const so = kq.rows[0]?.so_cuoi;
  if (so === undefined) throw new Error('Không cấp được số thứ tự cho mã nhân sự.');
  return dung_ma_nhan_su(ma, thang, Number(so));
}
