// Nap lich su PIN may cham cong tu CSDL. Tach khoi `tra_pin.ts` de tep do giu duoc tinh THUAN —
// luat tra PIN phai kiem duoc bang du lieu mau, khong can CSDL.
import { truy_van } from '../csdl/ket_noi.ts';
import {
  dung_lich_pin, lich_pin_rong, type KhoangMa, type LichPin, type NguoiMap,
} from './tra_pin.ts';
import { map_ten_may, type DongTenMay, type UngVienTen } from './tra_ten_may.ts';

/**
 * Nap LICH SU cua cac PIN: mot cau cho bang `ma_dinh_danh`, mot cau cho cot `nhan_vien.pin_may`.
 *
 * VI SAO NAP CA LICH SU thay vi tra tung ban ghi: mot PIN da qua tay ba nguoi thi cung chi ba
 * dong. Nap het roi tra bang ham thuan re hon N cau truy van, va — quan trong hon — lam cho luat
 * tra duoc kiem bang du lieu mau.
 *
 * KHONG LOC `dang_hoat_dong` o cau doc bang, va do la co y: mot lan quet thang 6 cua nguoi da
 * nghi viec thang 7 VAN phai gan dung ten ho, neu khong thi bang cong thang 6 sai. Khoang hieu
 * luc tra loi "luc do PIN cua ai"; con dang lam hay da nghi la cau hoi khac.
 *
 * Cau doc cot thi VAN loc `dang_hoat_dong` — giu nguyen hanh vi cu. Cot khong co chieu thoi gian
 * nen no chi noi duoc ve hom nay, va "hom nay" thi nguoi da nghi khong con giu PIN nua.
 */
export async function nap_lich_pin(cac_pin: string[]): Promise<LichPin> {
  if (cac_pin.length === 0) return lich_pin_rong();

  const [dong_bang, dong_cot] = await Promise.all([
    truy_van<KhoangMa & { pin: string }>(
      `select md.ma_chuan as pin, nv.id, nv.ma_nv, nv.ma_erp,
              md.hieu_luc_tu, md.hieu_luc_den
         from ma_dinh_danh md
         join nhan_vien nv on nv.id = md.nhan_vien_id
        where md.he_thong = 'may_cham_cong' and md.ma_chuan = any($1::text[])`,
      [cac_pin],
    ),
    truy_van<NguoiMap & { pin: string }>(
      `select nv.pin_may as pin, nv.id, nv.ma_nv, nv.ma_erp
         from nhan_vien nv
        where nv.pin_may = any($1::text[]) and nv.dang_hoat_dong = true`,
      [cac_pin],
    ),
  ]);

  return dung_lich_pin(dong_bang, dong_cot);
}

/** Ket qua nap ten tai khoan tren may: map PIN -> nguoi + danh sach ten khop nhieu nguoi. */
export interface KetQuaTenMay {
  theo_pin: Map<string, NguoiMap>;
  trung_ten: string[];
}

/**
 * Nap TEN TAI KHOAN tren may (bang `may_nguoi_dung` — anh chup user cua CHINH may do, day len
 * sau lenh `DATA QUERY USERINFO`) va ghep voi nhan vien DANG HOAT DONG theo ten chuan hoa.
 *
 * VI SAO phai hoi may: moi may co khong gian PIN rieng — cung so PIN nhung may khac nhau la
 * nguoi khac. Bang ma dinh danh toan cuc khong co chieu may nen khong tra loi duoc. Chi ghep
 * ten khop NGUYEN VAN va DUY NHAT; con lai de lop tren roi xuong bang ma dinh danh nhu cu.
 */
export async function nap_ten_may(serial: string): Promise<KetQuaTenMay> {
  const [dong_may, ung_vien] = await Promise.all([
    truy_van<DongTenMay>(
      `select pin, ten_may from may_nguoi_dung
        where thiet_bi_serial = $1 and ten_may is not null and ten_may <> ''`,
      [serial],
    ),
    // KHONG loc dang_hoat_dong o day la sai: ten tren may noi ve nguoi DANG dung may, khong
    // phai lich su. Nguoi da nghi khong duoc nhan them luot quet moi.
    truy_van<UngVienTen>(
      `select nv.id, nv.ma_nv, nv.ma_erp, nv.ho_ten
         from nhan_vien nv where nv.dang_hoat_dong = true`,
    ),
  ]);
  return map_ten_may(dong_may, ung_vien);
}
