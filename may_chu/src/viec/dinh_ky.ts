// Viec dinh ky lap di lap lai: ham tinh ngay lap la ham THUAN (test duoc trong docker
// build khong can CSDL), phan sinh instance cham CSDL do lich chay dem goi.
//
// Sinh theo LICH CO DINH, khong cho ban truoc hoan thanh: khong co gia han, nen mot
// viec dinh ky bi qua han la xong chu ky do (chuyen 'khong_hoan_thanh'), chu ky sau van
// sinh dung ngay.
import { truy_van, thuc_thi } from '../csdl/ket_noi.ts';
import { cong_ngay, danh_sach_ngay, thu_trong_tuan, tach_ngay } from '../tien_ich/thoi_gian.ts';
import { tao_viec } from './cong_viec.ts';

/** Dang mau doc tu CSDL — chi nhung cot ham tinh can. */
export interface MauDinhKy {
  id: string;
  ten: string;
  mo_ta: string | null;
  nguoi_giao: string | null;
  nhan_vien_id: string;
  nguon: string;
  quy_tac: string;
  cac_thu: number[];
  ngay_trong_thang: number[];
  so_ngay: number | null;
  gio_han: string;
  bat_dau: string;
  ket_thuc: string | null;
  uu_tien: string;
  sinh_den: string;
}

/** Ngay cuoi thang cua 'YYYY-MM-DD'. */
export function ngay_cuoi_thang(ngay: string): number {
  const [y, m] = tach_ngay(ngay);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Ngay lap thuoc thang cua `ngay` hay khong (theo ngay_trong_thang, kep lai cuoi thang). */
export function lap_trong_thang(ngay: string, cac_ngay: readonly number[]): boolean {
  const [, , d] = tach_ngay(ngay);
  const cuoi = ngay_cuoi_thang(ngay);
  return cac_ngay.some((n) => Math.min(n, cuoi) === d);
}

/**
 * Cac ngay lap cua mot mau trong khoang tu..den (bao gom hai dau).
 *
 * quy_tac:
 *  - hang_ngay: moi ngay.
 *  - hang_tuan: cac thu trong `cac_thu` (0=CN ... 6=T7).
 *  - hang_thang: cac ngay trong `ngay_trong_thang` (ngay qua dai thi kep vao cuoi thang).
 *  - khoang_ngay: moi `so_ngay` ngay mot lan, moc dau la `bat_dau`.
 */
export function cac_ngay_lap(mau: MauDinhKy, tu: string, den: string): string[] {
  const ket_thuc = mau.ket_thuc === null ? den : (mau.ket_thuc < den ? mau.ket_thuc : den);
  if (tu > ket_thuc) return [];

  const kq: string[] = [];
  switch (mau.quy_tac) {
    case 'hang_ngay':
      return danh_sach_ngay(tu, ket_thuc);
    case 'hang_tuan': {
      const thu_cho_phep = new Set(mau.cac_thu);
      for (const ng of danh_sach_ngay(tu, ket_thuc)) {
        if (thu_cho_phep.has(thu_trong_tuan(ng))) kq.push(ng);
      }
      return kq;
    }
    case 'hang_thang': {
      for (const ng of danh_sach_ngay(tu, ket_thuc)) {
        if (lap_trong_thang(ng, mau.ngay_trong_thang)) kq.push(ng);
      }
      return kq;
    }
    case 'khoang_ngay': {
      const n = mau.so_ngay ?? 1;
      let moc = mau.bat_dau;
      while (moc <= ket_thuc && kq.length < 400) {
        if (moc >= tu) kq.push(moc);
        moc = cong_ngay(moc, n);
      }
      return kq;
    }
    default:
      return [];
  }
}

/** So viec sinh toi da cho MOT mau trong mot lan chay (chan chong chay loan). */
const SINH_TOI_DA = 60;

/**
 * Sinh cac instance den han trong ngay `hom_nay` cho moi mau dang bat.
 *
 * Moi instance co khoa chong trung `dinh_ky:<mau>:<ngay>` — `on conflict do nothing`
 * dam bao nhieu instance chay song song cung khong sinh trung.
 */
export async function sinh_viec_dinh_ky(hom_nay: string): Promise<number> {
  const mau = await truy_van<MauDinhKy>(
    `select id, ten, mo_ta, nguoi_giao, nhan_vien_id, nguon, quy_tac, cac_thu,
            ngay_trong_thang, so_ngay, to_char(gio_han, 'HH24:MI') as gio_han,
            to_char(bat_dau, 'YYYY-MM-DD') as bat_dau,
            to_char(ket_thuc, 'YYYY-MM-DD') as ket_thuc, uu_tien,
            to_char(sinh_den, 'YYYY-MM-DD') as sinh_den
       from cong_viec_mau_dinh_ky
      where dang_bat and sinh_den < $1::date
      order by tao_luc`,
    [hom_nay],
  );

  let so_sinh = 0;
  for (const m of mau) {
    const tu = cong_ngay(m.sinh_den, 1);
    const ngay_lap = cac_ngay_lap(m, tu, hom_nay).slice(0, SINH_TOI_DA);
    for (const ng of ngay_lap) {
      const tao = await tao_viec(
        {
          nhan_vien_id: m.nhan_vien_id,
          tieu_de: m.ten,
          mo_ta: m.mo_ta,
          han: ng,
          han_gio: m.gio_han,
          bat_dau: ng,
          uu_tien: m.uu_tien,
          nhom_id: null,
          hanh_dong: [],
        },
        m.nguon,
        m.nguoi_giao,
        `dinh_ky:${m.id}:${ng}`,
      );
      if (tao !== null) so_sinh++;
    }
    await thuc_thi(
      'update cong_viec_mau_dinh_ky set sinh_den = $2::date where id = $1',
      [m.id, hom_nay],
    );
  }
  return so_sinh;
}
