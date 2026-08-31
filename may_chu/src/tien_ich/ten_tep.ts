// Quy chuan ten thu muc va ten tep cho kho ho so nhan su.
//
// MUC TIEU: mo kho tep bang WinSCP, bang `ls`, hay sau khi bung mot ban sao luu ra may
// khac — VAN DOC DUOC day la ho so cua ai, thuoc loai gi, tu bao gio. Duong dan cu
// `2026-08/9e5dbb73-e0b5-4dd7-997a-c6e16cf66ca5.docx` khong tra loi duoc cau nao trong ba
// cau do; mat CSDL la mat luon y nghia cua ca kho tep.
//
// Cay thu muc:
//
//   <MA_NV>_<Ho-ten-khong-dau>/<nhom>/<YYYY-MM-DD>_<nhom>_<ten-goc-rut-gon>_<8 hex>.<duoi>
//   HR-01_Hoang-Minh-Ngoc/hop_dong/2026-08-18_hop-dong_HDLD-07-2026_a1b2c3d4.pdf
//
// BA RANG BUOC, va deu co ly do cu the:
//
//   1. KHONG DAU, chi ASCII. Ten tep di qua tar, scp, rsync, WinSCP, Windows, va qua ca
//      `Content-Disposition`. Moi chang do co mot cach hieu UTF-8 khac nhau, va cai gia
//      cua mot chang hieu sai la mot ban scan hop dong khong mo duoc.
//   2. KHONG DAU CACH. Duong dan co dau cach lam vo moi doan script mot dong ai do go voi
//      trong luc su co.
//   3. CO 8 KY TU HEX cua ma tep o cuoi. Hai tep cung ten trong cung thu muc thi cai sau
//      de len cai truoc, va o day "de len" nghia la mat mot ban goc.
//
// KHOA DOC VAN LA `ten_luu` TRONG CSDL, khong phai duong dan tinh lai tu ma nhan vien.
// Ma nhan vien va ho ten deu doi duoc (dong bo ERP ghi lai ho ten), nen neu doc bang cach
// tinh lai thi moi lan doi ten la mot lan ca kho tep bien mat. Thu muc duoc doi ten theo
// sau, va `ten_luu` duoc cap nhat cung luc — xem `ho_so/sap_xep_tep.ts`.

/** Do dai toi da cua doan ten goc trong ten tep. Du de nhan ra, khong du de vo duong dan. */
const DAI_TEN_GOC = 48;

/** Do dai toi da cua ten thu muc nhan vien. */
const DAI_THU_MUC = 72;

/**
 * Bo dau tieng Viet, giu lai chu cai ASCII.
 *
 * `normalize('NFD')` tach dau ra thanh ky tu to hop roi xoa — xu ly duoc gan het. NHUNG
 * `đ` va `Đ` KHONG PHAI chu `d` co dau: chung la chu cai rieng trong bang chu cai tieng
 * Viet, khong tach ra duoc bang NFD. Phai thay tay, neu khong `HĐLĐ` se thanh `HL`.
 */
export function bo_dau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Doi mot chuoi bat ky thanh doan an toan cho ten tep: chi chu, so va gach ngang.
 *
 * Giu HOA/thuong nhu goc — `HDLD-07-2026` de doc hon `hdld-07-2026`, va ten nguoi doc
 * duoc dung ten. Chi ban ve an toan la bo het thu con lai.
 */
export function lam_doan(s: string, dai_toi_da = DAI_TEN_GOC): string {
  const sach = bo_dau(s)
    .replace(/[^A-Za-z0-9]+/g, '-')   // moi thu khac thanh gach ngang
    .replace(/-{2,}/g, '-')           // gom gach ngang lien tiep
    .replace(/^-+|-+$/g, '');         // bo gach ngang dau/cuoi
  return sach.slice(0, dai_toi_da).replace(/-+$/, '');
}

/**
 * Ten thu muc cua mot nhan vien.
 *
 * Ho ten dat SAU ma nhan vien de `ls` sap xep theo ma — nhan su tra ma nhanh hon tra ten,
 * va hai nguoi trung ten thi ma van tach duoc ho.
 */
export function ten_thu_muc_nhan_vien(ma_nv: string, ho_ten: string): string {
  const ma = lam_doan(ma_nv, 24);
  const ten = lam_doan(ho_ten, DAI_THU_MUC - ma.length - 1);
  // Ma nhan vien rong (khong nen xay ra, cot la NOT NULL) van phai ra mot ten dung duoc.
  if (ma === '') return ten === '' ? 'khong-ro' : ten;
  return ten === '' ? ma : `${ma}_${ten}`;
}

export interface DauVaoTenTep {
  /** Ngay tai len, dang YYYY-MM-DD. */
  ngay: string;
  /** Nhom ho so, vd 'hop_dong'. */
  nhom: string;
  /** Ten tep nguoi dung tai len, con nguyen dau va duoi. */
  ten_goc: string;
  /** Ma tep (UUID). Tam ky tu dau dung lam phan chong trung. */
  ma_tep: string;
  /** Duoi tep do may chu nhan dang bang magic byte — KHONG lay tu ten_goc. */
  duoi: string;
  /** Dung ca UUID thay vi 8 ky tu dau. Chi dung khi ten ngan da bi chiem. */
  day_du?: boolean;
}

/**
 * Ten tep theo quy chuan.
 *
 * `duoi` PHAI la duoi do may chu nhan dang tu magic byte, khong phai duoi trong `ten_goc`.
 * Mot tep `.exe` doi ten thanh `.pdf` van la `.exe`, va ten tep tren dia khong duoc phep
 * noi doi ve noi dung.
 */
export function ten_tep_chuan(d: DauVaoTenTep): string {
  // Bo duoi khoi ten goc: de nguyen thi ra `...HDLD-pdf_a1b2c3d4.pdf`.
  const khong_duoi = d.ten_goc.replace(/\.[A-Za-z0-9]{1,8}$/, '');
  const goc = lam_doan(khong_duoi);
  const ma = d.day_du === true
    ? d.ma_tep.replace(/-/g, '')
    : d.ma_tep.replace(/-/g, '').slice(0, 8);

  const phan = [d.ngay, lam_doan(d.nhom, 30), goc === '' ? 'tep' : goc, ma];
  return `${phan.join('_')}.${d.duoi}`;
}

/** Duong dan tuong doi day du trong kho ho so. */
export function duong_dan_ho_so(
  thu_muc_nhan_vien: string, nhom: string, ten_tep: string,
): string {
  return `${thu_muc_nhan_vien}/${nhom}/${ten_tep}`;
}

/**
 * Duong dan hop le khong?
 *
 * DAY LA HANG RAO CHONG PATH TRAVERSAL, khong phai mot bo kiem cho dep. Chuoi nay den tu
 * CSDL, nhung mot dong CSDL hong hay mot lan chen SQL o cho khac deu bien no thanh duong
 * di tuy y tren dia may chu. Lop thu hai (`resolve` roi doi chieu thu muc goc) nam trong
 * `luu_tep.ts`.
 *
 * Nhan CA HAI dang:
 *   cu   2026-08/<uuid>.pdf                     — tep tai len truoc khi doi cay thu muc
 *   moi  <thu-muc-nv>/<nhom>/<ten-chuan>.pdf
 *
 * Dang cu con duoc nhan vi tep cu VAN PHAI DOC DUOC trong khoang thoi gian giua luc trien
 * khai va luc chay lenh sap xep. Bo som mot ngay la mot ngay khong ai mo duoc hop dong nao.
 */
const DUOI_CHO_PHEP = 'pdf|jpg|png|docx|xlsx';

const RE_CU = new RegExp(`^\\d{4}-\\d{2}/[0-9a-f-]{36}\\.(${DUOI_CHO_PHEP})$`);

const RE_MOI = new RegExp(
  '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}'      // thu muc nhan vien
  + '/[a-z][a-z_]{0,29}'                  // nhom
  + '/\\d{4}-\\d{2}-\\d{2}_[a-z][a-z0-9-]{0,29}_[A-Za-z0-9-]{1,48}_[0-9a-f]{8,32}'
  + `\\.(${DUOI_CHO_PHEP})$`,
);

/**
 * Ban chot cap cong ty: `_ban_chot/<loai>/<YYYY-MM>_<loai>_<hex>.xlsx`.
 *
 * Bat dau bang `_` LA CO Y, khong phai cho dep. `RE_MOI` doi thu muc nhan vien bat dau bang
 * chu hoac so, nen `_ban_chot` KHONG THE trung voi thu muc cua bat ky nhan vien nao, du ma
 * nhan vien co la gi. Mot ma nhan vien tinh co dat ten la "ban_chot" van khong cham vao day.
 *
 * Trong duong dan nay khong co MOT ky tu nao den tu nguoi dung: loai lay tu mot tap dong,
 * ky la YYYY-MM, hex do may chu sinh. An toan theo cau truc, khong phai an toan nho loc.
 */
const RE_BAN_CHOT = new RegExp(
  '^_ban_chot/(bang_cong|bang_luong)'
  + '/\\d{4}-\\d{2}_(bang_cong|bang_luong)_[0-9a-f]{8,32}\\.xlsx$',
);

export function duong_dan_hop_le(ten_luu: string): boolean {
  // `..` khong lot qua duoc vi moi doan phai bat dau bang chu hoac so, nhung kiem thang
  // mot lan nua cho ro y dinh — day la cho khong duoc phep "chac la an toan".
  if (ten_luu.includes('..')) return false;
  return RE_MOI.test(ten_luu) || RE_CU.test(ten_luu) || RE_BAN_CHOT.test(ten_luu);
}

export type LoaiBanChot = 'bang_cong' | 'bang_luong';

/** Duong dan tren dia cho mot ban chot. `ma` la hex do may chu sinh. */
export function duong_dan_ban_chot(loai: LoaiBanChot, ky: string, ma: string): string {
  const hex = ma.replace(/[^0-9a-f]/g, '').slice(0, 32);
  return `_ban_chot/${loai}/${ky}_${loai}_${hex}.xlsx`;
}

/** Duong dan nay la mot ban chot cap cong ty? Dung de phan biet o cac lan quet kho tep. */
export function la_ban_chot(ten_luu: string): boolean {
  return RE_BAN_CHOT.test(ten_luu);
}

/** Duong dan nay theo cay cu (chua sap xep) hay cay moi? */
export function la_duong_dan_cu(ten_luu: string): boolean {
  return RE_CU.test(ten_luu);
}
