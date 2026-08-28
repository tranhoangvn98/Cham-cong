// May trang thai ra/vao van phong trong MOT ngay — ham thuan, khong cham CSDL.
//
// Tra loi bon cau cua yeu cau nghiep vu:
//   1. Gio den   = lan quet dau tien trong ngay (bat ke chieu).
//   2. Gio ra ve = lan quet KET THUC ngay (ra sau moc tan ca, hoac lan ra cuoi neu khong quay lai).
//   3. Cac PHIEN RA NGOAI trong gio lam (ra roi vao lai truoc khi tan ca) + tong phut.
//   4. LOI logic: dang trong ma lai co log vao (co lan ra khong quet), va nguoc lai.
//
// NGUYEN TAC (muc 1.2b KE-HOACH-BO-SUNG): trang thai chi doi KHI CO LOG. Khong log thi giu
// nguyen — nen o lai trong van phong buoi trua khong sinh su kien, khong canh bao. Chi log MAU
// THUAN moi la canh bao, va no la bang chung co lan ra/vao khong quet the.
//
// KHONG DOAN GIO CON THIEU: biet co lan khong quet nhung khong biet may gio, nen chi ghi loi,
// khong cong/tru phut. Bia mot con so la bia vao bang luong.
import { moc_thoi_gian, phut_giao_nhau, so_phut } from '../tien_ich/thoi_gian.ts';
import type { Chieu } from './chieu_quet.ts';
import type { CaLam } from './quy_tac_tinh_cong.ts';

export interface LanQuetCoChieu {
  thoi_diem: Date;
  chieu: Chieu;
  thiet_bi: string | null;
}

export interface PhienRaNgoai {
  ra_luc: Date;
  /** null = ra roi khong quet vao lai truoc khi ket thuc ngay. */
  vao_luc: Date | null;
  /** Phut ra ngoai da TRU phan giao voi gio nghi giua ca. 0 khi vao_luc = null. */
  phut: number;
  /** Phien nam TRON trong gio nghi giua ca — hien de minh bach, khong tru cong. */
  trong_gio_nghi: boolean;
}

export type MaLoiQuet =
  | 'QUEN_QUET_VAO'       // lan quet dau ngay o chieu ra
  | 'QUEN_QUET_RA'        // cuoi ngay van dang TRONG
  | 'VAO_KHI_DANG_TRONG'  // log vao khi dang trong -> co lan ra khong quet
  | 'RA_KHI_DANG_NGOAI'   // log ra khi dang ngoai  -> co lan vao khong quet
  | 'CHI_MOT_LAN_QUET';   // ca ngay chi mot lan quet, thieu gio ra

export interface LoiQuet {
  ma: MaLoiQuet;
  thoi_diem: Date;
  mo_ta: string;
}

export interface KetQuaRaVao {
  gio_den: Date | null;
  gio_ra_ve: Date | null;
  phien_ra_ngoai: PhienRaNgoai[];
  phut_ra_ngoai: number;
  /** Cuoi ngay van o trang thai TRONG (chua quet ra). */
  con_trong_van_phong: boolean;
  /** Co it nhat mot lan quet chieu 'khong_ro' -> chieu la SUY DOAN, khong bat loi mau thuan. */
  suy_doan: boolean;
  loi: LoiQuet[];
}

type TrangThai = 'ngoai' | 'trong';

/** Moc tan ca (co tru dung sai ve som): quet 'ra' tu moc nay tro di = ket thuc ngay. */
function moc_tan_ca(ngay: string, ca: CaLam | null): Date | null {
  if (ca === null || ca.qua_dem) return null;
  const ra = moc_thoi_gian(ngay, ca.gio_ra);
  return new Date(ra.getTime() - ca.dung_sai_som_phut * 60_000);
}

/** Phut cua mot phien ra ngoai, da tru phan trum gio nghi giua ca. */
function phut_phien(ra: Date, vao: Date, ngay: string, ca: CaLam | null): {
  phut: number; trong_gio_nghi: boolean;
} {
  const tho = so_phut(ra, vao);
  if (tho <= 0) return { phut: 0, trong_gio_nghi: false };
  if (ca === null || ca.nghi_tu === null || ca.nghi_den === null) {
    return { phut: tho, trong_gio_nghi: false };
  }
  const nghi_tu = moc_thoi_gian(ngay, ca.nghi_tu);
  const nghi_den = moc_thoi_gian(ngay, ca.nghi_den);
  const trum_nghi = phut_giao_nhau(ra, vao, nghi_tu, nghi_den);
  // Phien nam tron trong gio nghi: khong tru cong (gio nghi von khong tinh cong).
  if (trum_nghi >= tho) return { phut: tho, trong_gio_nghi: true };
  return { phut: tho - trum_nghi, trong_gio_nghi: false };
}

/**
 * Chay may trang thai tren cac lan quet cua MOT ngay-nguoi. `quet` khong can sap san — ham tu
 * sap theo thoi diem.
 */
export function suy_luan_ra_vao(
  quet: readonly LanQuetCoChieu[], ngay: string, ca: CaLam | null,
): KetQuaRaVao {
  const ds = [...quet].sort((a, b) => a.thoi_diem.getTime() - b.thoi_diem.getTime());
  const suy_doan = ds.some((q) => q.chieu === 'khong_ro');
  const moc = moc_tan_ca(ngay, ca);

  const loi: LoiQuet[] = [];
  const phien: PhienRaNgoai[] = [];
  let trang_thai: TrangThai = 'ngoai';
  let gio_den: Date | null = null;
  let gio_ra_ve: Date | null = null;
  let ra_dang_mo: Date | null = null;   // thoi diem 'ra' cua phien ra ngoai dang mo

  const dong_phien = (vao_luc: Date | null): void => {
    if (ra_dang_mo === null) return;
    if (vao_luc === null) {
      phien.push({ ra_luc: ra_dang_mo, vao_luc: null, phut: 0, trong_gio_nghi: false });
    } else {
      const p = phut_phien(ra_dang_mo, vao_luc, ngay, ca);
      phien.push({ ra_luc: ra_dang_mo, vao_luc, phut: p.phut, trong_gio_nghi: p.trong_gio_nghi });
    }
    ra_dang_mo = null;
  };

  for (const q of ds) {
    if (gio_ra_ve !== null) break;   // da ket thuc ngay, cac lan sau chi de tinh OT (ngoai pham vi)

    // Chieu 'khong_ro': dao trang thai, KHONG bat loi mau thuan.
    const chieu: 'vao' | 'ra' = q.chieu === 'khong_ro'
      ? (trang_thai === 'trong' ? 'ra' : 'vao')
      : q.chieu;

    if (gio_den === null) {
      // Lan quet DAU TIEN = gio den, bat ke chieu (yeu cau 1).
      gio_den = q.thoi_diem;
      if (q.chieu === 'ra' && !suy_doan) {
        loi.push({ ma: 'QUEN_QUET_VAO', thoi_diem: q.thoi_diem,
          mo_ta: 'Lần quét đầu ngày ở cửa ra — có thể quên quét vào' });
      }
      trang_thai = 'trong';
      continue;
    }

    if (chieu === 'ra' && moc !== null && q.thoi_diem.getTime() >= moc.getTime()) {
      // Quet ra tu moc tan ca tro di = ket thuc ngay.
      dong_phien(q.thoi_diem);   // neu con phien mo, lan ra nay dong no luon
      gio_ra_ve = q.thoi_diem;
      continue;
    }

    if (chieu === 'vao') {
      if (trang_thai === 'trong' && !suy_doan) {
        loi.push({ ma: 'VAO_KHI_DANG_TRONG', thoi_diem: q.thoi_diem,
          mo_ta: 'Log vào khi đang trong văn phòng — có một lần ra không quét thẻ' });
      }
      dong_phien(trang_thai === 'ngoai' ? q.thoi_diem : null);
      trang_thai = 'trong';
    } else {
      // chieu === 'ra', truoc moc tan ca -> mo phien ra ngoai
      if (trang_thai === 'ngoai' && !suy_doan) {
        loi.push({ ma: 'RA_KHI_DANG_NGOAI', thoi_diem: q.thoi_diem,
          mo_ta: 'Log ra khi đang ngoài văn phòng — có một lần vào không quét thẻ' });
      }
      if (trang_thai === 'trong') ra_dang_mo = q.thoi_diem;
      trang_thai = 'ngoai';
    }
  }

  // Ket thuc ngay.
  if (gio_ra_ve === null) {
    if (ra_dang_mo !== null) {
      // Ra roi khong quay lai truoc tan ca -> lan ra do la gio ra ve (ve som).
      gio_ra_ve = ra_dang_mo;
      ra_dang_mo = null;
    } else if (trang_thai === 'trong' && gio_den !== null) {
      loi.push({ ma: 'QUEN_QUET_RA', thoi_diem: gio_den,
        mo_ta: 'Cuối ngày vẫn đang trong văn phòng — quên quét ra' });
    }
  }

  if (gio_den !== null && gio_ra_ve !== null
      && gio_den.getTime() === gio_ra_ve.getTime()) {
    loi.push({ ma: 'CHI_MOT_LAN_QUET', thoi_diem: gio_den,
      mo_ta: 'Chỉ có một lần quét trong ngày' });
  }

  const phut_ra_ngoai = phien.reduce((t, p) => t + (p.trong_gio_nghi ? 0 : p.phut), 0);

  return {
    gio_den,
    gio_ra_ve,
    phien_ra_ngoai: phien,
    phut_ra_ngoai,
    con_trong_van_phong: gio_ra_ve === null && trang_thai === 'trong',
    suy_doan,
    loi,
  };
}
