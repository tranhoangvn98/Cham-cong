// Quy tac tinh cong 1 ngay cho 1 nhan vien — HAM THUAN, khong cham CSDL.
// Tach rieng de kiem thu duoc tung tinh huong (di muon, ve som, ca dem, ngay le...).
//
// Thu tu uu tien khi xac dinh trang thai ngay:
//   1. Don nghi phep DA DUYET trum ngay  -> nghi_phep
//   2. Ngay le                            -> ngay_le
//   3. Khong thuoc cac ngay lam cua ca    -> nghi_tuan
//   4. Don cong tac DA DUYET trum ngay    -> cong_tac
//   5. Co lan quet hop le                 -> co_mat
//   6. Con lai                            -> vang
//
// VI SAO `cong_tac` DUNG O BUOC 4 chu khong som hon:
//   - Sau `nghi_phep`: hai don trum cung mot ngay la du lieu mau thuan, va nghi phep la thu
//     nguoi lao dong duoc huong — no thang.
//   - Sau `ngay_le`: cong tac trum mot ngay le thi nguoi do van duoc huong ngay le.
//   - Sau `nghi_tuan`: cong tac vao ngay nghi tuan khong bien ngay do thanh ngay cong. Neu ho
//     that su lam viec hom do thi co lan quet, va OT duoc tinh theo don lam them (xem duoi).
//
// OT KHONG TU SINH TU GIO QUET. Xem `phut_lam_them_da_duyet`.
import { moc_thoi_gian, phut_giao_nhau, so_phut, thu_trong_tuan } from '../tien_ich/thoi_gian.ts';

/**
 * Khung gio rieng cho MOT thu trong tuan. Dung cho che do lam viec pho bien o Viet Nam:
 * T2-T6 lam ca ngay, rieng sang thu Bay 08:00-12:00 VAN LA GIO CHUAN (khong phai OT).
 * Thu khong khai o day thi dung khung gio goc cua ca.
 */
export interface CaTheoThu {
  /** 0=CN, 1=T2, ... 6=T7 */
  thu: number;
  gio_vao: string;
  gio_ra: string;
  nghi_tu: string | null;
  nghi_den: string | null;
  phut_du_cong: number;
}

/**
 * Mot khoang lam them DA DUYET trong ngay, lay tu `don_tu` loai `lam_them`.
 *
 * HAN CHE DA BIET: hai cot nay la kieu `time` va CSDL rang buoc `gio_ket_thuc > gio_bat_dau`,
 * nen mot khoang OT VAT QUA NUA DEM khong khai duoc bang mot don. Ca qua dem muon khai OT sau
 * nua dem thi phai lap hai don, moi don mot ngay.
 */
export interface KhoangLamThem {
  gio_bat_dau: string;
  gio_ket_thuc: string;
}

export interface CaLam {
  gio_vao: string;
  gio_ra: string;
  nghi_tu: string | null;
  nghi_den: string | null;
  dung_sai_muon_phut: number;
  dung_sai_som_phut: number;
  /**
   * KHONG CON THAM GIA TINH OT ke tu ban "OT phai dang ky".
   *
   * Nguong nay sinh ra de loc nhieu cho mot phep SUY DOAN tu dong ("o lai qua 30 phut thi coi
   * nhu lam them"). Khi can cu la mot don da duyet thi loc nua la sai: mot don 20 phut duoc
   * duyet ma ra 0 phut OT thi khong ai giai thich duoc. Cot van giu vi con hien tren giao dien
   * ca lam va con y nghia lich su.
   */
  nguong_ot_phut: number;
  qua_dem: boolean;
  phut_du_cong: number;
  cac_ngay_lam: number[];
  /** Ghi de khung gio theo thu. Rong / thieu = ca dung mot khung gio cho moi ngay lam. */
  theo_thu?: CaTheoThu[];
}

/**
 * Ca hieu luc cho mot ngay cu the: ap khung gio rieng cua thu do neu co khai.
 *
 * Chi ghi de gio vao/ra, gio nghi va nguong du cong. Dung sai, nguong OT va danh sach
 * ngay lam VAN lay tu ca goc — day la chinh sach chung, khong doi theo thu.
 */
export function ca_cua_ngay(ca: CaLam | null, ngay: string): CaLam | null {
  if (ca === null || ca.theo_thu === undefined || ca.theo_thu.length === 0) return ca;
  const thu = thu_trong_tuan(ngay);
  const rieng = ca.theo_thu.find((t) => t.thu === thu);
  if (rieng === undefined) return ca;
  return {
    ...ca,
    gio_vao: rieng.gio_vao,
    gio_ra: rieng.gio_ra,
    nghi_tu: rieng.nghi_tu,
    nghi_den: rieng.nghi_den,
    phut_du_cong: rieng.phut_du_cong,
  };
}

export type TrangThaiNgay =
  'vang' | 'co_mat' | 'nghi_phep' | 'ngay_le' | 'nghi_tuan' | 'cong_tac';

export interface DauVaoTinhCong {
  /** 'YYYY-MM-DD' */
  ngay: string;
  ca: CaLam | null;
  /** Cac moc quet HOP LE trong ngay, da sap xep tang dan. */
  quet: Date[];
  /** Don nghi phep da duyet trum ngay nay (neu co). */
  nghi_phep: { loai: string; nua_ngay: boolean } | null;
  ngay_le: { huong_luong: boolean } | null;
  /** Don giai trinh quen quet DA DUYET — ghi de gio vao/ra. */
  giai_trinh: { gio_vao_de_xuat: string | null; gio_ra_de_xuat: string | null } | null;
  /**
   * Don di cong tac DA DUYET trum ngay nay (neu co).
   *
   * KHONG PHAI NGAY VANG. Nguoi di cong tac khong quet the o van phong, nen truoc khi co
   * nhanh nay ho hien la vang — va ke toan nhin bang cong do thi tru cong that.
   */
  cong_tac: { noi_den: string | null } | null;
  /**
   * Cac khoang lam them DA DUYET trum ngay nay. Rong = khong dang ky gi, va khi do OT = 0
   * du nguoi do o lai bao lau.
   */
  lam_them: KhoangLamThem[];
}

export interface KetQuaTinhCong {
  trang_thai: TrangThaiNgay;
  gio_vao: Date | null;
  gio_ra: Date | null;
  phut_lam: number;
  phut_muon: number;
  phut_ve_som: number;
  phut_ot: number;
  so_cong: number;
  co_dieu_chinh: boolean;
  ghi_chu: string | null;
}

/** Ngay lam viec mac dinh khi nhan vien chua duoc gan ca: Thu 2 - Thu 6. */
const NGAY_LAM_MAC_DINH = [1, 2, 3, 4, 5];
/** So phut cong chuan mac dinh khi chua gan ca (8h - 1h nghi trua). */
const PHUT_DU_CONG_MAC_DINH = 420;

/**
 * Khoang thoi gian can lay lan quet cho mot ngay cong.
 *
 * Ca thuong: dung dung ngay theo lich (00:00 -> 24:00 gio may).
 * Ca qua dem: mo rong tu 3h truoc gio vao den 5h sau gio ra cua ngay hom sau.
 *
 * HAN CHE DA BIET: OT qua nua dem cua ca ngay se KHONG duoc tinh vao ngay hom truoc.
 * Muon tinh, nhan su phai khai mot ca 'qua_dem' cho nguoi do.
 */
export function khoang_lay_quet(ngay: string, ca_goc: CaLam | null): { tu: Date; den: Date } {
  // Ca qua dem khong duoc phep khai khung gio rieng theo thu (CSDL chan bang trigger),
  // nen o day resolve chi de nhat quan — nhanh qua_dem luon dung khung gio goc.
  const ca = ca_cua_ngay(ca_goc, ngay);
  if (ca !== null && ca.qua_dem) {
    return {
      tu: new Date(moc_thoi_gian(ngay, ca.gio_vao).getTime() - 3 * 3600_000),
      den: new Date(moc_thoi_gian(ngay, ca.gio_ra, 1).getTime() + 5 * 3600_000),
    };
  }
  return { tu: moc_thoi_gian(ngay, '00:00'), den: moc_thoi_gian(ngay, '00:00', 1) };
}

/**
 * So phut LAM THEM DUOC TINH: phan GIAO giua thoi gian co mat that va cac khoang da dang ky
 * trong don `lam_them` DA DUYET, DA TRU GIO NGHI.
 *
 * GIAO chu khong phai mot trong hai, va ca hai chieu deu co ly do:
 *   - Dang ky ma khong lam thi khong duoc tra. Don la KE HOACH, khong phai ket qua.
 *   - Lam ma khong dang ky thi khong duoc tra. Day la yeu cau nghiep vu, va no cung dung
 *     BLLD 2019 Dieu 107: lam them gio phai co su dong y cua nguoi lao dong — mot he thong tu
 *     ket luan "o lai muon = lam them" la tu tao ra nghia vu tra tien tu mot lan quet the.
 *
 * TRU GIO NGHI tren dung doan da kep. Voi OT sau gio tan ca thi khong khac gi (17:30-19:00
 * khong cham gio nghi trua), nhung mot don lam them CA NGAY le hay CA NGAY Chu nhat ma khong
 * tru thi thanh tra tien cho 90 phut nghi trua.
 *
 * Cac khoang duoc HOP NHAT truoc khi cong: hai don chong nhau trong cung mot ngay khong duoc
 * tinh hai lan.
 */
function phut_lam_them_da_duyet(
  vao: Date | null,
  ra: Date | null,
  ngay: string,
  ca: CaLam | null,
  lam_them: readonly KhoangLamThem[],
): number {
  if (vao === null || ra === null || lam_them.length === 0) return 0;

  const khoang: { tu: number; den: number }[] = [];
  for (const d of lam_them) {
    // Ca qua dem: khoang dang ky nam truoc gio vao ca thi thuoc ngay hom sau — cung quy uoc
    // voi `phut_nghi_giao`.
    const cong_ngay = ca !== null && ca.qua_dem && d.gio_bat_dau < ca.gio_vao ? 1 : 0;
    const tu = moc_thoi_gian(ngay, d.gio_bat_dau, cong_ngay).getTime();
    const den = moc_thoi_gian(ngay, d.gio_ket_thuc, cong_ngay).getTime();
    if (den > tu) khoang.push({ tu, den });
  }
  if (khoang.length === 0) return 0;

  khoang.sort((a, b) => a.tu - b.tu);
  const hop_nhat: { tu: number; den: number }[] = [khoang[0] as { tu: number; den: number }];
  for (let i = 1; i < khoang.length; i++) {
    const k = khoang[i] as { tu: number; den: number };
    const cuoi = hop_nhat[hop_nhat.length - 1] as { tu: number; den: number };
    if (k.tu <= cuoi.den) cuoi.den = Math.max(cuoi.den, k.den);
    else hop_nhat.push({ tu: k.tu, den: k.den });
  }

  let tong = 0;
  for (const k of hop_nhat) {
    // Kep vao thoi gian co mat that, roi tru gio nghi TREN DUNG DOAN DA KEP.
    const a = new Date(Math.max(vao.getTime(), k.tu));
    const b = new Date(Math.min(ra.getTime(), k.den));
    if (b.getTime() <= a.getTime()) continue;
    tong += Math.max(0, so_phut(a, b) - phut_nghi_giao(a, b, ngay, ca));
  }
  return tong;
}

const RONG: Omit<KetQuaTinhCong, 'trang_thai' | 'so_cong' | 'ghi_chu'> = {
  gio_vao: null,
  gio_ra: null,
  phut_lam: 0,
  phut_muon: 0,
  phut_ve_som: 0,
  phut_ot: 0,
  co_dieu_chinh: false,
};

export function tinh_cong_ngay(dv: DauVaoTinhCong): KetQuaTinhCong {
  // Ap khung gio rieng cua thu (neu ca co khai) TRUOC moi phep tinh phia duoi.
  const ca = ca_cua_ngay(dv.ca, dv.ngay);
  const ngay_lam = ca?.cac_ngay_lam ?? NGAY_LAM_MAC_DINH;
  const nguong_du_cong = ca?.phut_du_cong ?? PHUT_DU_CONG_MAC_DINH;

  // --- Gio vao/ra hieu luc: uu tien don giai trinh da duyet ---
  let gio_vao: Date | null = dv.quet[0] ?? null;
  let gio_ra: Date | null = dv.quet.length > 0 ? (dv.quet[dv.quet.length - 1] ?? null) : null;
  let co_dieu_chinh = false;
  const chu_thich: string[] = [];

  if (dv.giai_trinh !== null) {
    const gt = dv.giai_trinh;
    if (gt.gio_vao_de_xuat !== null) {
      gio_vao = moc_thoi_gian(dv.ngay, gt.gio_vao_de_xuat);
      co_dieu_chinh = true;
    }
    if (gt.gio_ra_de_xuat !== null) {
      const cong_ngay_ra = ca !== null && ca.qua_dem ? 1 : 0;
      gio_ra = moc_thoi_gian(dv.ngay, gt.gio_ra_de_xuat, cong_ngay_ra);
      co_dieu_chinh = true;
    }
    if (co_dieu_chinh) chu_thich.push('Da ap don giai trinh');
  }

  // Chi co 1 moc (quen quet ra) — khong the tinh so gio lam.
  const chi_mot_moc = gio_vao !== null && gio_ra !== null && gio_vao.getTime() === gio_ra.getTime();
  if (chi_mot_moc) chu_thich.push('Chi co 1 lan quet, thieu gio ra');

  // --- So phut co mat thuc te (chua doi chieu ca) ---
  const phut_co_mat = gio_vao !== null && gio_ra !== null ? so_phut(gio_vao, gio_ra) : 0;

  // OT cua ngay nay, dung chung cho moi nhanh: chi phan da dang ky VA that su co mat.
  const ot_da_duyet = phut_lam_them_da_duyet(gio_vao, gio_ra, dv.ngay, ca, dv.lam_them);

  // --- Nhanh 1: dang nghi phep da duyet ---
  if (dv.nghi_phep !== null) {
    const np = dv.nghi_phep;
    const cong = np.nua_ngay ? 0.5 : np.loai === 'khong_luong' ? 0 : 1;
    if (phut_co_mat > 0) chu_thich.push('Co quet the trong ngay nghi phep');
    if (phut_co_mat > 0 && ot_da_duyet === 0) {
      chu_thich.push(`O lai ${phut_co_mat} phut nhung khong co don lam them da duyet`);
    }
    return {
      ...RONG,
      trang_thai: 'nghi_phep',
      gio_vao,
      gio_ra,
      phut_ot: ot_da_duyet,
      co_dieu_chinh,
      so_cong: cong,
      ghi_chu: gop_chu_thich(chu_thich),
    };
  }

  // --- Nhanh 2: ngay le ---
  if (dv.ngay_le !== null) {
    const phut_lam = tru_gio_nghi(gio_vao, gio_ra, dv.ngay, ca);
    if (phut_lam > 0) {
      chu_thich.push(ot_da_duyet > 0
        ? 'Lam viec ngay le, tinh phan da dang ky vao OT'
        : `Lam viec ngay le ${phut_lam} phut nhung khong co don lam them da duyet`);
    }
    return {
      ...RONG,
      trang_thai: 'ngay_le',
      gio_vao,
      gio_ra,
      phut_lam,
      phut_ot: ot_da_duyet,
      co_dieu_chinh,
      so_cong: dv.ngay_le.huong_luong ? 1 : 0,
      ghi_chu: gop_chu_thich(chu_thich),
    };
  }

  // --- Nhanh 3: khong phai ngay lam viec ---
  if (!ngay_lam.includes(thu_trong_tuan(dv.ngay))) {
    const phut_lam = tru_gio_nghi(gio_vao, gio_ra, dv.ngay, ca);
    if (phut_lam > 0) {
      chu_thich.push(ot_da_duyet > 0
        ? 'Lam viec ngay nghi tuan, tinh phan da dang ky vao OT'
        : `Lam viec ngay nghi tuan ${phut_lam} phut nhung khong co don lam them da duyet`);
    }
    return {
      ...RONG,
      trang_thai: 'nghi_tuan',
      gio_vao,
      gio_ra,
      phut_lam,
      phut_ot: ot_da_duyet,
      co_dieu_chinh,
      so_cong: 0,
      ghi_chu: gop_chu_thich(chu_thich),
    };
  }

  // --- Nhanh 4: di cong tac da duyet ---
  //
  // Tinh MOT cong tron. Khong tinh di muon / ve som: khong co gio chuan de doi chieu voi mot
  // nguoi khong o van phong. Neu ho co quet the (ghe qua van phong roi di) thi ghi chu lai —
  // mot lan quet trong ngay cong tac la thong tin, khong phai loi.
  if (dv.cong_tac !== null) {
    const noi = dv.cong_tac.noi_den;
    chu_thich.push(noi === null || noi === '' ? 'Di cong tac' : `Di cong tac: ${noi}`);
    if (phut_co_mat > 0) chu_thich.push('Co quet the trong ngay cong tac');
    return {
      ...RONG,
      trang_thai: 'cong_tac',
      gio_vao,
      gio_ra,
      phut_ot: ot_da_duyet,
      co_dieu_chinh,
      so_cong: 1,
      ghi_chu: gop_chu_thich(chu_thich),
    };
  }

  // --- Nhanh 5: vang mat ---
  if (gio_vao === null || gio_ra === null) {
    return {
      ...RONG,
      trang_thai: 'vang',
      so_cong: 0,
      co_dieu_chinh,
      ghi_chu: gop_chu_thich(chu_thich),
    };
  }

  // --- Nhanh 6: co mat, chua gan ca -> chi tinh tong thoi gian, khong phat ---
  if (ca === null) {
    chu_thich.push('Nhan vien chua duoc gan ca lam viec');
    return {
      ...RONG,
      trang_thai: 'co_mat',
      gio_vao,
      gio_ra,
      phut_lam: phut_co_mat,
      phut_ot: ot_da_duyet,
      co_dieu_chinh,
      so_cong: quy_ra_cong(phut_co_mat, nguong_du_cong),
      ghi_chu: gop_chu_thich(chu_thich),
    };
  }

  // --- Nhanh 7: co mat, co ca -> tinh day du ---
  const cong_ngay_ra = ca.qua_dem ? 1 : 0;
  const ca_bat_dau = moc_thoi_gian(dv.ngay, ca.gio_vao);
  const ca_ket_thuc = moc_thoi_gian(dv.ngay, ca.gio_ra, cong_ngay_ra);

  // Kep thoi gian lam trong khung ca de loai nhieu quet som/muon bat thuong:
  // den truoc gio vao KHONG duoc tinh them cong.
  const vao_hieu_luc = gio_vao > ca_bat_dau ? gio_vao : ca_bat_dau;
  const ra_hieu_luc = gio_ra < ca_ket_thuc ? gio_ra : ca_ket_thuc;
  const tho = so_phut(vao_hieu_luc, ra_hieu_luc);
  const phut_lam = Math.max(0, tho - phut_nghi_giao(vao_hieu_luc, ra_hieu_luc, dv.ngay, ca));

  const muon = Math.max(0, so_phut(ca_bat_dau, gio_vao) - ca.dung_sai_muon_phut);
  const ve_som = Math.max(0, so_phut(gio_ra, ca_ket_thuc) - ca.dung_sai_som_phut);

  if (muon > 0) chu_thich.push(`Di muon ${muon} phut`);
  if (ve_som > 0) chu_thich.push(`Ve som ${ve_som} phut`);

  // O lai ngoai gio ma khong co don thi KHONG tinh OT — nhung cung khong im lang. Nhan su can
  // thay con so nay de di doi chieu, chu khong phai de no bien mat.
  const sau_ca = so_phut(ca_ket_thuc, gio_ra);
  if (sau_ca > 0 && ot_da_duyet === 0) {
    chu_thich.push(`O lai ${sau_ca} phut sau gio tan ca nhung khong co don lam them da duyet`);
  }

  return {
    trang_thai: 'co_mat',
    gio_vao,
    gio_ra,
    phut_lam,
    phut_muon: muon,
    phut_ve_som: ve_som,
    phut_ot: ot_da_duyet,
    so_cong: quy_ra_cong(phut_lam, ca.phut_du_cong),
    co_dieu_chinh,
    ghi_chu: gop_chu_thich(chu_thich),
  };
}

/** Quy so phut lam thanh so cong: du nguong = 1, tu nua nguong = 0.5, con lai = 0. */
function quy_ra_cong(phut_lam: number, nguong: number): number {
  if (phut_lam >= nguong) return 1;
  if (phut_lam >= nguong / 2) return 0.5;
  return 0;
}

/** So phut nghi trua giao voi khoang lam viec. Tra 0 neu ca khong khai gio nghi. */
function phut_nghi_giao(tu: Date, den: Date, ngay: string, ca: CaLam | null): number {
  if (ca === null || ca.nghi_tu === null || ca.nghi_den === null) return 0;
  // Voi ca qua dem, gio nghi co the thuoc ngay hom sau neu nho hon gio vao.
  const cong_ngay = ca.qua_dem && ca.nghi_tu < ca.gio_vao ? 1 : 0;
  const nghi_bat_dau = moc_thoi_gian(ngay, ca.nghi_tu, cong_ngay);
  const nghi_ket_thuc = moc_thoi_gian(ngay, ca.nghi_den, cong_ngay);
  return phut_giao_nhau(tu, den, nghi_bat_dau, nghi_ket_thuc);
}

/** Tong thoi gian co mat da tru gio nghi trua — dung cho ngay le / nghi tuan. */
function tru_gio_nghi(vao: Date | null, ra: Date | null, ngay: string, ca: CaLam | null): number {
  if (vao === null || ra === null) return 0;
  return Math.max(0, so_phut(vao, ra) - phut_nghi_giao(vao, ra, ngay, ca));
}

function gop_chu_thich(ds: string[]): string | null {
  return ds.length === 0 ? null : ds.join('; ');
}
