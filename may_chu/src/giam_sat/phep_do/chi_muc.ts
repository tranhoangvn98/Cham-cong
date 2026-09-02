// DANH SACH DONG cua moi phep do. Day la HOP DONG giua ma nguon va cau hinh trong CSDL.
//
// `dieu_kien_loi.phep_do` la mot chuoi nguoi quan tri chon tren giao dien. Chuoi do phai
// doi chieu voi danh sach nay TRUOC KHI dung — neu khong, mot ma la se di thang vao vong
// quet. Cung ly do voi `quy_tac_vi_pham.chi_so` (013_vi_pham.sql).
//
// THEM MOT PHEP DO: viet no trong tep nhom tuong ung, xuat ra mang cua nhom, roi them mang do
// vao `TAT_CA` ben duoi. Khong con buoc nao khac — giao dien tu dung form tu `tham_so`.
//
// DOI MA CUA MOT PHEP DO DA PHAT HANH: dung. Ma nam trong `dieu_kien_loi` cua khach hang;
// doi ma la lam mot dieu kien dang chay tro thanh "phep do khong ton tai" va im lang khong
// bat gi nua. Can doi nghia thi them ma moi va de ma cu bao `chua_trien_khai`.
import type { PhepDo } from './kieu.ts';
import { PHEP_DO_SLA } from './sla.ts';
import { PHEP_DO_TRUNG_LAP } from './trung_lap.ts';
import { PHEP_DO_DON_HANG } from './don_hang.ts';
import { PHEP_DO_GIAO_DICH } from './giao_dich.ts';
import { PHEP_DO_CHI_PHI_CONG_NO } from './chi_phi_cong_no.ts';
import { PHEP_DO_CHEO_CHAM_CONG } from './cheo_cham_cong.ts';

export const TAT_CA: readonly PhepDo[] = [
  ...PHEP_DO_SLA,
  ...PHEP_DO_TRUNG_LAP,
  ...PHEP_DO_DON_HANG,
  ...PHEP_DO_GIAO_DICH,
  ...PHEP_DO_CHI_PHI_CONG_NO,
  ...PHEP_DO_CHEO_CHAM_CONG,
];

const THEO_MA = new Map(TAT_CA.map((p) => [p.ma, p]));

// Ma trung nhau la loi lap trinh am tham nguy hiem: mot phep do se che phep do kia va khong
// ai biet cai nao dang chay. Nem ngay khi nap module thay vi de test bat sau.
if (THEO_MA.size !== TAT_CA.length) {
  const dem = new Map<string, number>();
  for (const p of TAT_CA) dem.set(p.ma, (dem.get(p.ma) ?? 0) + 1);
  const trung = [...dem.entries()].filter(([, n]) => n > 1).map(([m]) => m);
  throw new Error(`Phep do bi trung ma: ${trung.join(', ')}`);
}

/** Tra ve phep do theo ma, hoac null neu ma khong co trong danh sach dong. */
export function tim_phep_do(ma: string): PhepDo | null {
  return THEO_MA.get(ma) ?? null;
}

export function co_phep_do(ma: string): boolean {
  return THEO_MA.has(ma);
}

/** Danh sach ma hop le — dung trong thong bao loi 422 de nguoi dung biet chon gi. */
export function cac_ma(): string[] {
  return [...THEO_MA.keys()].sort();
}
