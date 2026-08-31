// Cham diem KPI: tu gia tri tho (vd "3 lan di muon") ra diem, roi gop thanh tong diem.
//
// Tach thanh ham thuan vi day la thu se bi nguoi bi cham diem chat van. Phai giai thich
// duoc bang mot cau, va kiem duoc bang so cu the.
//
// CACH CHAM: noi suy tuyen tinh giua hai moc.
//   dat `muc_toi_thieu` -> 0 diem
//   dat `muc_muc_tieu`  -> `diem_toi_da`
//   ngoai khoang thi kep lai.
//
// Cong thuc giong nhau cho ca hai chieu, vi voi chi so "cang thap cang tot" thi
// muc_muc_tieu NHO HON muc_toi_thieu nen mau so am va phep chia tu dao chieu. `chieu`
// khong tham gia tinh toan — no de kiem tra khai bao co mau thuan khong, va de giao dien
// noi cho dung.

export interface ChiSoKpi {
  ma: string;
  ten: string;
  chieu: 'cao_tot' | 'thap_tot';
  muc_toi_thieu: number;
  muc_muc_tieu: number;
  diem_toi_da: number;
  trong_so: number;
}

/**
 * Cham diem mot chi so.
 *
 * `gia_tri` la null khi khong co du lieu (vd nhan vien vao lam giua thang, chua co ngay
 * cong nao). Tra 0 thi oan; tra `diem_toi_da` thi thanh thuong khong cong. Nen tra null va
 * de ben goi LOAI chi so do khoi phep tinh trung binh — nguoi khong co du lieu khong bi
 * cham diem boi chi so do, chu khong phai bi cham diem 0.
 */
export function cham_mot_chi_so(gia_tri: number | null, cs: ChiSoKpi): number | null {
  if (gia_tri === null || !Number.isFinite(gia_tri)) return null;

  const khoang = cs.muc_muc_tieu - cs.muc_toi_thieu;
  // Di tru chan hai moc bang nhau, nhung du lieu cu co the lot qua.
  if (khoang === 0) return null;

  const ty_le = (gia_tri - cs.muc_toi_thieu) / khoang;
  const diem = ty_le * cs.diem_toi_da;
  return lam_tron(kep(diem, 0, cs.diem_toi_da));
}

/**
 * Khai bao co mau thuan voi `chieu` khong.
 *
 * 'cao_tot' ma muc tieu lai THAP hon nguong toi thieu la khai nguoc — he thong van tinh
 * ra so, nhung la so nguoc hoan toan y dinh. Bat o luc khai bao, khong doi den luc cham.
 */
export function loi_khai_bao(cs: ChiSoKpi): string | null {
  if (cs.muc_muc_tieu === cs.muc_toi_thieu) {
    return 'Mức mục tiêu và mức tối thiểu không được bằng nhau.';
  }
  if (cs.chieu === 'cao_tot' && cs.muc_muc_tieu < cs.muc_toi_thieu) {
    return 'Chỉ số "càng cao càng tốt" phải có mức mục tiêu LỚN HƠN mức tối thiểu.';
  }
  if (cs.chieu === 'thap_tot' && cs.muc_muc_tieu > cs.muc_toi_thieu) {
    return 'Chỉ số "càng thấp càng tốt" phải có mức mục tiêu NHỎ HƠN mức tối thiểu.';
  }
  if (cs.diem_toi_da <= 0) return 'Điểm tối đa phải lớn hơn 0.';
  if (cs.trong_so < 0) return 'Trọng số không được âm.';
  return null;
}

export interface DiemChiSo {
  ma: string;
  diem: number;
  trong_so: number;
}

/**
 * Gop cac diem thanh tong, theo trung binh CO TRONG SO.
 *
 * Chia cho tong trong so THUC TE (chi cac chi so co diem), khong phai tong trong so khai
 * bao: them hay bo mot chi so khong duoc lam vo thang diem cua nhung ky truoc, va nguoi
 * thieu du lieu o mot chi so khong bi keo diem xuong vi chi so do.
 *
 * Khong co chi so nao cham duoc thi tra null — khac han voi 0 diem.
 */
export function gop_diem(ds: DiemChiSo[]): number | null {
  const co = ds.filter((d) => d.trong_so > 0);
  if (co.length === 0) return null;
  const tong_trong_so = co.reduce((t, d) => t + d.trong_so, 0);
  if (tong_trong_so <= 0) return null;
  const tong = co.reduce((t, d) => t + d.diem * d.trong_so, 0);
  return lam_tron(tong / tong_trong_so);
}

export interface BacXepLoai {
  ten: string;
  tu_diem: number;
}

/** Xep loai theo thang. Tra null khi khong bac nao phu hop (thang khai thieu bac 0). */
export function xep_loai(diem: number | null, thang: BacXepLoai[]): string | null {
  if (diem === null) return null;
  const sap = [...thang].sort((a, b) => b.tu_diem - a.tu_diem);
  for (const b of sap) {
    if (diem >= b.tu_diem) return b.ten;
  }
  return null;
}

function kep(v: number, thap: number, cao: number): number {
  return Math.min(cao, Math.max(thap, v));
}

/** Lam tron 2 chu so thap phan — du chi tiet ma khong bay ra so le vo nghia. */
function lam_tron(v: number): number {
  return Math.round(v * 100) / 100;
}
