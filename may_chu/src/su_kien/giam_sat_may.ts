// Giam sat may cham cong mat ket noi (Phan C · Task 4).
//
// VI SAO CAN: may mat ket noi thi may van luu log noi bo, khong mat du lieu — nhung bang
// cong dung cap nhat. Neu cho tam den cuoi ky moi phat hien thi da qua muon de xu ly.
// Trang Tong quan co hien trang thai may, nhung do la thong tin BI DONG: phai co nguoi
// mo trang len xem. Tien trinh nay day canh bao ra ngoai.
//
// Chong spam: canh bao DUNG MOT LAN moi lan chuyen online -> offline (co `da_canh_bao_offline`
// tren bang thiet_bi), va gui mot su kien phuc hoi khi may bao hieu lai.
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van } from '../csdl/ket_noi.ts';
import { ghi_su_kien } from './hop_thu_di.ts';

/** Chu ky kiem tra. Nho hon nguong offline de canh bao khong tre qua mot chu ky. */
const CHU_KY_GIAY = 60;

let bo_hen: NodeJS.Timeout | null = null;

interface MayDoiTrangThai {
  serial: string;
  ten: string;
  vi_tri: string;
  thay_lan_cuoi: Date | null;
  im_lang_giay: number | null;
}

/**
 * Mot vong giam sat. Tra ve so su kien da phat.
 *
 * Ca hai cau UPDATE deu dung `where` loc theo trang thai hien tai roi `returning`, nen
 * nhieu instance chay song song chi mot instance gianh duoc moi may — khong can khoa
 * rieng, va khong the gui hai canh bao cho cung mot lan mat ket noi.
 */
export async function chay_mot_vong(
  ghi_log: (muc: 'canh_bao' | 'tin', s: string, t?: Record<string, unknown>) => void,
): Promise<number> {
  const nguong = String(cau_hinh.may_offline_sau_giay);
  let so_su_kien = 0;

  // ------------------------------------------------ online -> offline
  // Bao gom ca may CHUA BAO GIO bao hieu (`thay_lan_cuoi is null`): may vua khai bao ma
  // khong noi duoc voi may chu la loi cau hinh, can biet ngay.
  const mat = await truy_van<MayDoiTrangThai>(
    `update thiet_bi
        set da_canh_bao_offline = true
      where dang_bat
        and not da_canh_bao_offline
        and (thay_lan_cuoi is null or thay_lan_cuoi < now() - ($1 || ' seconds')::interval)
      returning serial, ten, vi_tri, thay_lan_cuoi,
                extract(epoch from (now() - thay_lan_cuoi))::int as im_lang_giay`,
    [nguong],
  );

  for (const m of mat) {
    ghi_log('canh_bao', 'may cham cong mat ket noi', {
      serial: m.serial,
      ten: m.ten,
      vi_tri: m.vi_tri,
      thay_lan_cuoi: m.thay_lan_cuoi,
      im_lang_giay: m.im_lang_giay,
    });
    await ghi_su_kien('thiet_bi.mat_ket_noi', {
      serial: m.serial,
      ten: m.ten,
      vi_tri: m.vi_tri,
      thay_lan_cuoi: m.thay_lan_cuoi === null ? null : m.thay_lan_cuoi.toISOString(),
      im_lang_giay: m.im_lang_giay,
      nguong_giay: cau_hinh.may_offline_sau_giay,
    });
    so_su_kien++;
  }

  // ------------------------------------------------ offline -> online
  const lai = await truy_van<MayDoiTrangThai>(
    `update thiet_bi
        set da_canh_bao_offline = false
      where dang_bat
        and da_canh_bao_offline
        and thay_lan_cuoi >= now() - ($1 || ' seconds')::interval
      returning serial, ten, vi_tri, thay_lan_cuoi, null::int as im_lang_giay`,
    [nguong],
  );

  for (const m of lai) {
    ghi_log('tin', 'may cham cong da ket noi lai', { serial: m.serial, ten: m.ten });
    await ghi_su_kien('thiet_bi.ket_noi_lai', {
      serial: m.serial,
      ten: m.ten,
      vi_tri: m.vi_tri,
      thay_lan_cuoi: m.thay_lan_cuoi === null ? null : m.thay_lan_cuoi.toISOString(),
    });
    so_su_kien++;
  }

  return so_su_kien;
}

export function bat_giam_sat_may(
  ghi_log: (muc: 'canh_bao' | 'tin', s: string, t?: Record<string, unknown>) => void,
): void {
  if (bo_hen !== null) return;

  const vong = (): void => {
    chay_mot_vong(ghi_log).catch((loi: unknown) => {
      ghi_log('canh_bao', 'vong giam sat may loi', { loi: String(loi) });
    });
  };

  bo_hen = setInterval(vong, CHU_KY_GIAY * 1000);
  bo_hen.unref();
  vong();
}

export function dung_giam_sat_may(): void {
  if (bo_hen !== null) {
    clearInterval(bo_hen);
    bo_hen = null;
  }
}
