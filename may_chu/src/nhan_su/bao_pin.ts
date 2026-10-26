// Bao so PIN may cham cong cho NGUOI VUA DUOC KHOI TAO — de ho biet phai khai so nao tren may.
//
// VI SAO CAN: he thong tu cap PIN theo dai cua may, va so do chi hien ra mot lan tren man hinh
// cua nguoi lap ho so. Nguoi di lam thi khong nhin man hinh do — ho den may cham cong, khong
// biet so cua minh, va ca dau khong quet duoc.
//
// Dung chung `gui_chuong_ngon_ngu` voi moi thong bao khac: no chia nguoi nhan theo
// `nguoi_dung.ngon_ngu` va lap tham so theo tung thu tieng. KHONG chan luong tao ho so.
import { truy_van } from '../csdl/ket_noi.ts';
import { tra_chuoi } from '../chuoi/chi_muc.ts';
import { tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { gui_chuong_ngon_ngu } from '../su_kien/gui_chuong_ngon_ngu.ts';

export interface DuLieuBaoPin {
  nhan_vien_id: string;
  pin: string;
  /** Serial cac may da xep lenh — de bao "so nay khai o may nao". */
  serial_may: readonly string[];
}

/** Ten may theo serial, giu dung thu tu truyen vao. Serial khong co that thi bo qua. */
async function ten_cac_may(cac_serial: readonly string[]): Promise<string[]> {
  if (cac_serial.length === 0) return [];
  const dong = await truy_van<{ serial: string; ten: string }>(
    'select serial, ten from thiet_bi where serial = any($1::text[])',
    [[...cac_serial]],
  );
  const thep = new Map(dong.map((d) => [d.serial, d.ten]));
  return cac_serial.map((s) => thep.get(s)).filter((t): t is string => t !== undefined);
}

/**
 * Gui thong bao "PIN cua ban la X" cho moi tai khoan dang hoat dong cua nhan vien, theo ngon
 * ngu cua tung nguoi nhan.
 *
 * Tra ve `false` khi nhan vien chua co tai khoan nao — ben goi can canh bao de nguoi lap ho so
 * bao so PIN truc tiep, vi khong con duong nao khac de nguoi do biet so cua minh.
 */
export async function bao_pin_cho_nhan_vien(du: DuLieuBaoPin): Promise<boolean> {
  const nguoi_dung_ids = await tai_khoan_cua_nhan_vien(du.nhan_vien_id);
  if (nguoi_dung_ids.length === 0) return false;

  const may = await ten_cac_may(du.serial_may);
  await gui_chuong_ngon_ngu({
    nguoi_dung_ids,
    tieu_de: 'pin_tieu_de',
    noi_dung: 'pin_noi_dung',
    // Doan "da day xuong may ..." dung theo tung thu tieng, va bo han khi khong biet may nao.
    tham_so: (nn) => ({
      pin: du.pin,
      may: may.length === 0 ? '' : tra_chuoi(nn, 'pin_noi_dung_may', { may: may.join(', ') }),
    }),
    du_lieu: { man: 'ca-nhan' },
  });
  return true;
}
