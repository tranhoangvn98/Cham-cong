// Tra nguoi nhan mot luot quet theo TEN TAI KHOAN tren CHINH CAI MAY da gui ban ghi len.
//
// VI SAO CAN: moi may cham cong co KHONG GIAN PIN RIENG — PIN 6 tren may Kho co the la mot
// nguoi, PIN 6 tren may van phong la nguoi khac. Bang ma dinh danh (`he_thong =
// 'may_cham_cong'`) khong co chieu may nen khong tra loi duoc cau hoi "PIN nay tren MAY NAY
// la ai". Nguon duy nhat tra loi duoc la chinh may: ai enroll PIN do tren may do, nguoi do
// quet. Ban chup do nam o bang `may_nguoi_dung` (may day len sau `DATA QUERY USERINFO`).
//
// Luat dung o day: ten tren may ghep voi `nhan_vien.ho_ten` theo ten CHUAN HOA KHOP NGUYEN
// VAN (bo dau, thuong hoa, gom khoang trang). Ghep duoc DUY NHAT moi map; ten khong khop ai
// hoac khop NHIEU nguoi trung ten thi KHONG DOAN — lop tren roi xuong bang ma dinh danh toan
// cuc nhu cu.
//
// Module THUAN: khong CSDL, khong Fastify — kiem duoc bang du lieu mau.
import { bo_dau } from '../tien_ich/ten_tep.ts';
import type { NguoiMap } from './tra_pin.ts';

/** Mot dong bang `may_nguoi_dung`: PIN + ten tai khoan tren may. */
export interface DongTenMay {
  pin: string;
  ten_may: string;
}

/** Ung vien nhan vien dang hoat dong de ghep ten. */
export interface UngVienTen extends NguoiMap {
  ho_ten: string;
}

/** Chuan hoa ten de so sanh: bo dau, thuong hoa, moi ky tu khac thanh khoang trang. */
export function chuan_ten_may(s: string): string {
  return bo_dau(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/ +/g, ' ');
}

/**
 * Ghep ten tren may voi nhan vien. Tra map PIN -> nguoi cho cac PIN ghep duoc DUY NHAT.
 * `trung_ten` liet ke ten khop NHIEU nhan vien (phai sua du lieu, khong duoc doan).
 */
export function map_ten_may(
  dong_may: readonly DongTenMay[],
  ung_vien: readonly UngVienTen[],
): { theo_pin: Map<string, NguoiMap>; trung_ten: string[] } {
  const theo_ten = new Map<string, UngVienTen[]>();
  for (const u of ung_vien) {
    const k = chuan_ten_may(u.ho_ten);
    if (k === '') continue;
    const ds = theo_ten.get(k);
    if (ds === undefined) theo_ten.set(k, [u]); else ds.push(u);
  }

  const theo_pin = new Map<string, NguoiMap>();
  const trung_ten: string[] = [];
  for (const d of dong_may) {
    const k = chuan_ten_may(d.ten_may);
    if (k === '') continue;
    const ds = theo_ten.get(k);
    if (ds === undefined || ds.length === 0) continue; // ten khong khop ai -> de lop tren tra
    if (ds.length > 1) {
      trung_ten.push(`${d.pin}=${d.ten_may}`);
      continue;
    }
    const u = ds[0] as UngVienTen;
    theo_pin.set(d.pin, { id: u.id, ma_nv: u.ma_nv, ma_erp: u.ma_erp });
  }
  return { theo_pin, trung_ten };
}
