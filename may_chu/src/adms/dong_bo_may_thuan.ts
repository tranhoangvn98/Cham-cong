// Dong bo giua cac may cham cong — PHAN THUAN (khong CSDL, khong Fastify).
//
// So sanh hai "anh chup" cua hai may de tinh ra nhung gi can day sang may con lai, va chon
// nhung user tren may thuoc nguoi da nghi viec can bi KHOA. Kiem duoc bang du lieu mau.
import { chuan_ten_may, type DongTenMay } from '../dinh_danh/tra_ten_may.ts';

/** Mot dong bang sinh hoc (BIODATA) cua mot nguoi tren mot may. */
export interface DongSinhHoc {
  pin: string;
  /** So khe tren may: 0 = khuon mat, 5/6/7 = ngon tay. */
  no: string;
  /** Loai template: 9 = khuon mat, 1 = van tay. */
  type: string;
  /** Phien ban template may ghi kem — giu nguyen khi day sang may khac. */
  major: string;
  minor: string;
  /** Template base64. */
  tmp: string;
}

/** Anh chup day du cua mot may: user enroll + template sinh hoc. */
export interface AnhChupMay {
  nguoi_dung: DongTenMay[];
  sinh_hoc: DongSinhHoc[];
}

/** Mot nguoi can day sang may con lai: user thieu (hoac ten lech) + cac template thieu. */
export interface DongCanDay {
  pin: string;
  ten_may: string;
  /** User chua co tren may dich, hoac ten tai khoan khac. */
  thieu_user: boolean;
  /** Cac template (khuon mat / van tay) thieu tren may dich. */
  sinh_hoc: DongSinhHoc[];
}

/** User tren may thuoc nguoi da nghi -> can khoa. */
export interface DongCanKhoa {
  serial: string;
  pin: string;
  ten_may: string;
}

/** User tren may, kem serial cua may do. */
export interface UserMayTheoSerial extends DongTenMay {
  serial: string;
}

const KHOA_SINH_HOC = (d: DongSinhHoc): string => `${d.pin}|${d.no}|${d.type}`;

/**
 * Tinh nhung gi may `tu` co ma may `den` THIEU — chi THEM, khong bao gio xoa (xoa la viec
 * cua luong nghi viec, khong phai cua dong bo). Template doi chieu theo KHE (pin + no + type):
 * khe da co thi bo qua, khong ghi de len du lieu nguoi khac.
 */
export function tinh_thieu_giua_hai_may(tu: AnhChupMay, den: AnhChupMay): DongCanDay[] {
  const ten_den = new Map<string, string>();
  for (const u of den.nguoi_dung) ten_den.set(u.pin, u.ten_may);
  const sh_den = new Set<string>();
  for (const s of den.sinh_hoc) sh_den.add(KHOA_SINH_HOC(s));

  const theo_pin = new Map<string, DongCanDay>();
  for (const u of tu.nguoi_dung) {
    if (u.pin === '' || u.pin === '0') continue;
    const ten_cu = ten_den.get(u.pin);
    // Ten nguon rong thi khong co gi dang tin de day — de may dich nguyen trang.
    const thieu_user = u.ten_may !== ''
      && (ten_cu === undefined || chuan_ten_may(ten_cu) !== chuan_ten_may(u.ten_may));
    theo_pin.set(u.pin, { pin: u.pin, ten_may: u.ten_may, thieu_user, sinh_hoc: [] });
  }
  for (const s of tu.sinh_hoc) {
    if (sh_den.has(KHOA_SINH_HOC(s))) continue;
    const d = theo_pin.get(s.pin);
    if (d === undefined) {
      // Template cua PIN khong nam trong danh sach user day len — van day duoc template.
      theo_pin.set(s.pin, { pin: s.pin, ten_may: '', thieu_user: false, sinh_hoc: [s] });
    } else {
      d.sinh_hoc.push(s);
    }
  }
  return [...theo_pin.values()].filter((d) => d.thieu_user || d.sinh_hoc.length > 0);
}

/**
 * Chon user tren may can bi khoa vi chu nhan da nghi viec.
 *
 * Bang chung KHONG phai ten tren may (may VP ghi ten rut gon "Kien", "Huyenkd" — khong ghep
 * duoc voi ho ten), ma la LICH SU QUET: lan quet gan nhat cua chinh PIN do tren chinh may do
 * da duoc he thong map cho ai — nguoi do la chu nhan duy nhat dang tin cua PIN. PIN chua tung
 * quet (chua co bang chung) thi giu nguyen, khong doan.
 *
 * `con_quet` = nguoi con luot quet gan day (3 ngay): chua chac da nghi that (tien le cho
 * nghi NHAM roi van di lam) nen giu nguyen, de HR ra lai.
 */
export function chon_nguoi_da_nghi(
  may: readonly UserMayTheoSerial[],
  chu_nhan: ReadonlyMap<string, string>, // "serial|pin" -> id nhan vien (chu lan quet gan nhat)
  da_nghi: ReadonlySet<string>,
  con_quet: ReadonlySet<string>,
): DongCanKhoa[] {
  const ra: DongCanKhoa[] = [];
  for (const d of may) {
    if (d.pin === '' || d.pin === '0') continue;
    const id = chu_nhan.get(`${d.serial}|${d.pin}`);
    if (id === undefined) continue;   // chua tung quet -> khong co bang chung chu nhan
    if (!da_nghi.has(id)) continue;   // chu nhan con lam -> giu nguyen
    if (con_quet.has(id)) continue;   // con quet gan day -> chua chac da nghi that
    ra.push({ serial: d.serial, pin: d.pin, ten_may: d.ten_may });
  }
  return ra;
}
