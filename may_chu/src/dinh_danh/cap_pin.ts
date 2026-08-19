// Cap phat PIN may cham cong.
//
// CHIEU DI LA HE-THONG -> MAY, KHONG BAO GIO NGUOC LAI.
//
// Truoc day nguoi khai may tu nghi ra so roi go lai vao phan mem. Voi mot may thi khong sao; voi
// nhieu may thi do la duong chac chan den cham cong sai ten: PIN la danh tinh, va bo tiep nhan
// tra PIN ra nhan vien tren pham vi TOAN CONG TY chu khong loc theo may. Hai van phong cung danh
// so tu 1 thi anh A o VP2 va anh B o VP1 la cung mot nguoi duoi mat he thong — va khong co gi
// bao, vi may chi gui len "PIN 1".
//
// Nen he thong cap so: lay so con trong dau tien trong dai cua may do, ghi vao bang ma dinh
// danh, roi nguoi phu trach cai DUNG so do len may.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiKhongTim, LoiXungDot } from '../tien_ich/kiem_tra.ts';
import { gan_ma } from './nghiep_vu.ts';

/** Tran tren cua PIN. Firmware ZKTeco thuong nhan toi 9 chu so. */
export const PIN_TOI_DA = 999_999_999;

export interface DaiPin {
  tu: number;
  den: number;
}

/**
 * So con trong dau tien trong dai, tinh tren tap PIN DANG DUNG.
 *
 * THUAN, khong CSDL — nho the kiem duoc bang du lieu mau, ke ca cac truong hop bien: dai day,
 * dai mot phan tu, dai bat dau giua vung da dung.
 *
 * Duyet tu `tu` di len chu khong `max + 1`: PIN cua nguoi da nghi duoc thu hoi se de lai lo
 * trong, va tai su dung lo do la dung — dai PIN cua mot van phong huu han.
 */
export function pin_trong_dau_tien(dai: DaiPin, dang_dung: ReadonlySet<number>): number | null {
  for (let n = dai.tu; n <= dai.den; n++) {
    if (!dang_dung.has(n)) return n;
  }
  return null;
}

/** Dai PIN cua mot may. Khong khai dai thi cap tu 1 den tran. */
export async function dai_pin_cua_may(serial: string): Promise<DaiPin & { ten: string }> {
  const may = await truy_van_mot<{ ten: string; pin_tu: number | null; pin_den: number | null }>(
    'select ten, pin_tu, pin_den from thiet_bi where serial = $1', [serial]);
  if (may === null) throw new LoiKhongTim('Chưa khai báo máy có serial này.');
  return {
    ten: may.ten,
    tu: may.pin_tu ?? 1,
    den: may.pin_den ?? PIN_TOI_DA,
  };
}

/**
 * Tap PIN DANG DUNG, doc tu ca hai nguon.
 *
 * `ma_dinh_danh` la nguon su that, con `nhan_vien.pin_may` van la cot cu ma vai duong ghi vao.
 * Hop ca hai thi khong the cap trung mot PIN dang duoc dung o mot trong hai cho — cap trung o
 * day nghia la hai nguoi cung mot danh tinh.
 *
 * Chi lay cac gia tri THUAN SO: cot cu la chu tu do nen tung co ky tu la trong do.
 */
export async function cac_pin_dang_dung(): Promise<Set<number>> {
  const ds = await truy_van<{ so: number }>(
    `select ma_chuan::bigint as so from ma_dinh_danh
      where he_thong = 'may_cham_cong' and hieu_luc_den is null and ma_chuan ~ '^[0-9]{1,9}$'
     union
     select pin_may::bigint as so from nhan_vien
      where pin_may ~ '^[0-9]{1,9}$'`,
  );
  return new Set(ds.map((d) => Number(d.so)));
}

export interface GoiYPin {
  /** PIN de nghi, dang chuoi — dung nguyen van khi cai len may. */
  pin: string;
  thiet_bi_serial: string;
  thiet_bi_ten: string;
  dai: DaiPin;
  /** So PIN con trong trong dai, de biet khi nao sap het cho. */
  con_trong: number;
}

/** De nghi mot PIN cho may nay. KHONG ghi gi. */
export async function goi_y_pin(serial: string): Promise<GoiYPin> {
  const dai = await dai_pin_cua_may(serial);
  const dang_dung = await cac_pin_dang_dung();
  const pin = pin_trong_dau_tien(dai, dang_dung);
  if (pin === null) {
    throw new LoiXungDot(
      `Dải PIN của máy "${dai.ten}" (${String(dai.tu)}–${String(dai.den)}) đã dùng hết. `
      + 'Mở rộng dải ở trang Thiết bị, hoặc thu hồi các PIN không còn dùng.',
    );
  }
  let con_trong = 0;
  for (let n = dai.tu; n <= dai.den && con_trong <= 1000; n++) {
    if (!dang_dung.has(n)) con_trong++;
  }
  return {
    pin: String(pin),
    thiet_bi_serial: serial,
    thiet_bi_ten: dai.ten,
    dai: { tu: dai.tu, den: dai.den },
    con_trong,
  };
}

export interface KetQuaCapPin extends GoiYPin {
  nhan_vien_id: string;
}

/**
 * Cap mot PIN cho nhan vien: chon so con trong roi ghi vao bang ma dinh danh.
 *
 * THU LAI KHI DUNG NHAU. Hai nguoi cung bam "Cấp PIN" mot luc thi ca hai deu duoc de nghi cung
 * mot so; unique index chan nguoi thu hai, va o day thu lai voi so ke tiep thay vi bao loi cho
 * nguoi dung. Khong khoa bang: cap PIN la thao tac hiem, con khoa bang thi ai cung tra gia.
 */
export async function cap_pin(
  nhan_vien_id: string, serial: string, so_lan_thu = 5,
): Promise<KetQuaCapPin> {
  let loi_cuoi: unknown = null;
  for (let lan = 0; lan < so_lan_thu; lan++) {
    const goi_y = await goi_y_pin(serial);
    try {
      await gan_ma(nhan_vien_id, 'may_cham_cong', goi_y.pin, {
        nguon: 'nguoi_khai',
        ghi_chu: `Hệ thống cấp cho máy ${goi_y.thiet_bi_ten}`,
      });
      return { ...goi_y, nhan_vien_id };
    } catch (loi) {
      // Chi thu lai khi DUNG NHAU (ai do vua lay dung so do). Ma sai dang hay nhan vien khong
      // ton tai thi thu lai bao nhieu lan cung the.
      if (!(loi instanceof LoiXungDot)) throw loi;
      loi_cuoi = loi;
    }
  }
  throw new LoiXungDot(
    `Không cấp được PIN sau ${String(so_lan_thu)} lần thử — có người khác đang cấp cùng lúc. `
    + `Thử lại. (${(loi_cuoi as Error | null)?.message ?? ''})`,
  );
}

/** Doc dai PIN tu dau vao nguoi dung, kiem cho ra loi de hieu. */
export function doc_dai_pin(tu: number | null, den: number | null): DaiPin | null {
  if (tu === null && den === null) return null;
  if (tu === null || den === null) {
    throw new LoiDauVao('Dải PIN phải khai cả hai đầu, hoặc để trống cả hai.');
  }
  if (tu < 1 || den > PIN_TOI_DA) {
    throw new LoiDauVao(`Dải PIN phải nằm trong 1–${String(PIN_TOI_DA)}.`);
  }
  if (den < tu) throw new LoiDauVao('Đầu dải PIN phải nhỏ hơn hoặc bằng cuối dải.');
  return { tu, den };
}
