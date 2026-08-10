// Tinh khoang cach giua hai toa do (dung cho geofence khi cham cong bang dien thoai).

const BAN_KINH_TRAI_DAT_M = 6_371_000;

/**
 * Khoang cach vong lon (haversine) giua hai diem, don vi met.
 * Sai so du nho o quy mo vai km nen dung tot cho geofence van phong/cong truong.
 */
export function khoang_cach_met(
  vi_do_1: number,
  kinh_do_1: number,
  vi_do_2: number,
  kinh_do_2: number,
): number {
  const rad = Math.PI / 180;
  const p1 = vi_do_1 * rad;
  const p2 = vi_do_2 * rad;
  const dp = (vi_do_2 - vi_do_1) * rad;
  const dl = (kinh_do_2 - kinh_do_1) * rad;

  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return Math.round(2 * BAN_KINH_TRAI_DAT_M * Math.asin(Math.min(1, Math.sqrt(a))));
}

export interface DiaDiem {
  id: string;
  ten: string;
  vi_do: number;
  kinh_do: number;
  ban_kinh_m: number;
}

export interface KetQuaGeofence {
  dia_diem: DiaDiem | null;
  khoang_cach_m: number | null;
  trong_pham_vi: boolean;
}

/** Tim dia diem gan nhat va cho biet toa do co nam trong ban kinh cho phep khong. */
export function do_geofence(
  vi_do: number,
  kinh_do: number,
  cac_dia_diem: readonly DiaDiem[],
): KetQuaGeofence {
  let gan_nhat: DiaDiem | null = null;
  let khoang_gan_nhat = Number.POSITIVE_INFINITY;

  for (const dd of cac_dia_diem) {
    const d = khoang_cach_met(vi_do, kinh_do, dd.vi_do, dd.kinh_do);
    if (d < khoang_gan_nhat) {
      khoang_gan_nhat = d;
      gan_nhat = dd;
    }
  }

  if (gan_nhat === null) {
    return { dia_diem: null, khoang_cach_m: null, trong_pham_vi: false };
  }
  return {
    dia_diem: gan_nhat,
    khoang_cach_m: khoang_gan_nhat,
    trong_pham_vi: khoang_gan_nhat <= gan_nhat.ban_kinh_m,
  };
}
