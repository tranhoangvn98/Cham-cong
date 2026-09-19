// So ky hieu van ban — phan THUAN, khong cham CSDL.
//
// Khuon so cua THVN theo mau chuan (08-09-2026):
//   thong bao : 01/2026/TB-CTTHVN
//   quyet dinh: 01/2026/QĐ-CTTHVN
//   cong van  : 01/2026/CTTHVN-NS   (khong in ten loai, khong chu "CV" — ND30)
//
// C-11: so nho hon 10 PHAI co so 0 dang truoc (01, 02, ... 09).
//
// Viec CAP SO (tang dem nguyen tu trong CSDL) nam o route ban hanh — xem
// tuyen/thong_bao_ai.ts. So da cap la vinh vien: huy chi ghi so, khong cap lai.
import type { KieuVanBan } from './kieu.ts';

/** Dung so ky hieu tu so dem, nam va ma don vi cau hinh. */
export function dung_so_ky_hieu(
  loai: KieuVanBan,
  so: number,
  nam: number,
  ky_hieu_don_vi: string,
  ky_hieu_don_vi_soan: string,
): string {
  const so_chu = String(so).padStart(2, '0'); // C-11
  if (loai === 'thong_bao') return `${so_chu}/${nam}/TB-${ky_hieu_don_vi}`;
  if (loai === 'quyet_dinh') return `${so_chu}/${nam}/QĐ-${ky_hieu_don_vi}`;
  return `${so_chu}/${nam}/${ky_hieu_don_vi}-${ky_hieu_don_vi_soan}`;
}

const RE_TB_QD = /^(0[1-9]|[1-9]\d+)\/\d{4}\/(TB|QĐ)-[A-ZĐ0-9-]+$/;
const RE_CONG_VAN = /^(0[1-9]|[1-9]\d+)\/\d{4}\/[A-ZĐ0-9]{1,10}-[A-ZĐ0-9]{1,10}$/;

/** Kiem so ky hieu dung khuon cua loai — dung cho gate G3. */
export function kiem_tra_so_ky_hieu(loai: KieuVanBan, so_ky_hieu: string): boolean {
  if (loai === 'cong_van') {
    return RE_CONG_VAN.test(so_ky_hieu) && !so_ky_hieu.includes('CV');
  }
  return RE_TB_QD.test(so_ky_hieu);
}
