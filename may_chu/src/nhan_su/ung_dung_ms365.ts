// Kiem tra ung dung bat buoc cua cong ty da duoc dung tren may tinh / dien thoai chua.
//
// SU THAT VE NGUON DU LIEU (da kiem chung tren tenant that ngay 26/10/2026):
//   - Microsoft Graph KHONG co API "liet ke ung dung da cai" khi tenant khong dung Intune.
//     Tenant nay chi co 10 giay phep Business Premium, Intune chua kich hoat — 43 nguoi con lai
//     khong co du lieu cai dat nao de doc.
//   - Bao cao `getM365AppUserDetail` cho biet nguoi do DA KICH HOAT / DANG NHAP ung dung nao
//     trong 30 ngay, theo tung nen tang: Outlook, Teams, Word, Excel, PowerPoint, OneNote.
//     KHONG co OneDrive, SharePoint, Authenticator.
//   - Bao cao `getOneDriveActivityUserDetail` co cot "Synced File Count": > 0 nghia la da dung
//     OneDrive tren MAY TINH (chi may tinh moi dong bo tep duoc).
//   - `userRegistrationDetails` (Authenticator) doi Entra ID P1/P2 — tenant tra 403
//     "Tenant ... doesn't have premium license", nen Authenticator luon la "chua kiem tra duoc"
//     cho toi khi mua P1 hoac bat Intune.
//
// Vi vay trang thai o day la BANG CHUNG SU DUNG, khong phai danh sach cai dat. Giao dien phai
// noi dung cau do (xem web/src/trang/ung_dung_ms365.tsx) de nhan su khong hieu nham.
//
// Module nay THUAN (khong mang, khong CSDL) de unit test duoc tung buoc doc CSV va danh gia.
import { tach_csv } from '../tien_ich/csv.ts';

export type NenTang = 'may_tinh' | 'dien_thoai';
export type MaUngDung = 'outlook' | 'teams' | 'onedrive' | 'authenticator' | 'sharepoint';
export type TrangThaiUngDung =
  | 'da_dung' | 'chi_web' | 'khong_thay' | 'khong_kiem_tra_duoc' | 'khong_co_tai_khoan';

export interface UngDungBatBuoc {
  nen_tang: NenTang;
  ma: MaUngDung;
  /** Ten san pham — giu nguyen ten thuong mai, khong dich. */
  ten: string;
}

/** Danh sach cong ty bat buoc — NGUON DUY NHAT de web va may chu cung doc. */
export const UNG_DUNG_BAT_BUOC: readonly UngDungBatBuoc[] = [
  { nen_tang: 'may_tinh', ma: 'outlook', ten: 'Outlook' },
  { nen_tang: 'may_tinh', ma: 'teams', ten: 'Microsoft Teams' },
  { nen_tang: 'may_tinh', ma: 'onedrive', ten: 'OneDrive for Business' },
  { nen_tang: 'dien_thoai', ma: 'authenticator', ten: 'Microsoft Authenticator' },
  { nen_tang: 'dien_thoai', ma: 'outlook', ten: 'Outlook' },
  { nen_tang: 'dien_thoai', ma: 'teams', ten: 'Microsoft Teams' },
  { nen_tang: 'dien_thoai', ma: 'onedrive', ten: 'OneDrive' },
  { nen_tang: 'dien_thoai', ma: 'sharepoint', ten: 'SharePoint' },
] as const;

export function ten_ung_dung(nen_tang: NenTang, ma: MaUngDung): string {
  return UNG_DUNG_BAT_BUOC.find((u) => u.nen_tang === nen_tang && u.ma === ma)?.ten ?? ma;
}

export interface DongKiemTraUngDung {
  nen_tang: NenTang;
  ung_dung: MaUngDung;
  trang_thai: TrangThaiUngDung;
  lan_hoat_dong: string | null;
  ngay_bao_cao: string | null;
  nguon: string;
  chi_tiet: string | null;
}

/** Trang thai nay co tinh la "con thieu" khi bao cao cho HR khong. */
export function la_thieu(trang_thai: TrangThaiUngDung): boolean {
  return trang_thai === 'khong_thay' || trang_thai === 'chi_web';
}

/** Dong bao cao `getM365AppUserDetail` cua MOT nguoi. */
export interface DongBaoCaoApp {
  upn: string;
  lastActivity: string | null;
  ngayBaoCao: string | null;
  outlookWindows: boolean;
  teamsWindows: boolean;
  outlookMobile: boolean;
  teamsMobile: boolean;
  outlookWeb: boolean;
  teamsWeb: boolean;
}

/** Dong bao cao `getOneDriveActivityUserDetail` cua MOT nguoi. */
export interface DongBaoCaoOneDrive {
  upn: string;
  lastActivity: string | null;
  ngayBaoCao: string | null;
  synced: number;
  viewedOrEdited: number;
}

function chuan_upn(v: string): string {
  return v.trim().toLowerCase();
}

function la_co(v: string | undefined): boolean {
  return (v ?? '').trim().toLowerCase() === 'yes';
}

function so_nguyen(v: string | undefined): number {
  const n = Number.parseInt((v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function chi_so_cot(goc: string[], ten: string): number {
  const i = goc.findIndex((x) => x.trim() === ten);
  if (i < 0) throw new Error(`Báo cáo Microsoft 365 thiếu cột "${ten}".`);
  return i;
}

function o(dong: string[], i: number): string {
  return dong[i] ?? '';
}

/**
 * Doc bao cao "Microsoft 365 Apps usage" (CSV) thanh ban do UPN -> co hoat dong tung ung dung.
 *
 * Goi lai nhieu dong cung mot UPN (khong nen co) thi GOP bang phep OR: mot lan dung la du.
 */
export function doc_bao_cao_app(csv: string): Map<string, DongBaoCaoApp> {
  const tat_ca = tach_csv(csv);
  const goc = tat_ca[0];
  if (goc === undefined) throw new Error('Báo cáo Microsoft 365 rỗng.');

  const i_upn = chi_so_cot(goc, 'User Principal Name');
  const i_last = chi_so_cot(goc, 'Last Activity Date');
  const i_bao_cao = chi_so_cot(goc, 'Report Refresh Date');
  const i_ow = chi_so_cot(goc, 'Outlook (Windows)');
  const i_tw = chi_so_cot(goc, 'Teams (Windows)');
  const i_om = chi_so_cot(goc, 'Outlook (Mobile)');
  const i_tm = chi_so_cot(goc, 'Teams (Mobile)');
  const i_oweb = chi_so_cot(goc, 'Outlook (Web)');
  const i_tweb = chi_so_cot(goc, 'Teams (Web)');

  const kq = new Map<string, DongBaoCaoApp>();
  for (const dong of tat_ca.slice(1)) {
    const upn = chuan_upn(o(dong, i_upn));
    if (upn === '') continue;
    const cu = kq.get(upn);
    const moi: DongBaoCaoApp = {
      upn,
      lastActivity: o(dong, i_last).trim() === '' ? null : o(dong, i_last).trim(),
      ngayBaoCao: o(dong, i_bao_cao).trim() === '' ? null : o(dong, i_bao_cao).trim(),
      outlookWindows: la_co(o(dong, i_ow)),
      teamsWindows: la_co(o(dong, i_tw)),
      outlookMobile: la_co(o(dong, i_om)),
      teamsMobile: la_co(o(dong, i_tm)),
      outlookWeb: la_co(o(dong, i_oweb)),
      teamsWeb: la_co(o(dong, i_tweb)),
    };
    if (cu === undefined) {
      kq.set(upn, moi);
      continue;
    }
    kq.set(upn, {
      ...moi,
      lastActivity: moi.lastActivity ?? cu.lastActivity,
      ngayBaoCao: moi.ngayBaoCao ?? cu.ngayBaoCao,
      outlookWindows: cu.outlookWindows || moi.outlookWindows,
      teamsWindows: cu.teamsWindows || moi.teamsWindows,
      outlookMobile: cu.outlookMobile || moi.outlookMobile,
      teamsMobile: cu.teamsMobile || moi.teamsMobile,
      outlookWeb: cu.outlookWeb || moi.outlookWeb,
      teamsWeb: cu.teamsWeb || moi.teamsWeb,
    });
  }
  return kq;
}

/** Doc bao cao "OneDrive usage account detail" (CSV) thanh ban do UPN -> so tep da dong bo. */
export function doc_bao_cao_onedrive(csv: string): Map<string, DongBaoCaoOneDrive> {
  const tat_ca = tach_csv(csv);
  const goc = tat_ca[0];
  if (goc === undefined) throw new Error('Báo cáo OneDrive rỗng.');

  const i_upn = chi_so_cot(goc, 'User Principal Name');
  const i_last = chi_so_cot(goc, 'Last Activity Date');
  const i_bao_cao = chi_so_cot(goc, 'Report Refresh Date');
  const i_sync = chi_so_cot(goc, 'Synced File Count');
  const i_xem = chi_so_cot(goc, 'Viewed Or Edited File Count');

  const kq = new Map<string, DongBaoCaoOneDrive>();
  for (const dong of tat_ca.slice(1)) {
    const upn = chuan_upn(o(dong, i_upn));
    if (upn === '') continue;
    kq.set(upn, {
      upn,
      lastActivity: o(dong, i_last).trim() === '' ? null : o(dong, i_last).trim(),
      ngayBaoCao: o(dong, i_bao_cao).trim() === '' ? null : o(dong, i_bao_cao).trim(),
      synced: so_nguyen(o(dong, i_sync)),
      viewedOrEdited: so_nguyen(o(dong, i_xem)),
    });
  }
  return kq;
}

export interface ThamSoDanhGia {
  /** UPN cua nhan vien; null khi ho so chua co email/UPN Microsoft. */
  upn: string | null;
  baoCaoApp: Map<string, DongBaoCaoApp>;
  baoCaoOneDrive: Map<string, DongBaoCaoOneDrive>;
  /** false khi lan quet nay KHONG doc duoc bao cao (loi mang/quyen) — khac voi "khong co dong". */
  co_bao_cao_app: boolean;
  co_bao_cao_onedrive: boolean;
  /**
   * Tap UPN dang co giay phep Microsoft (chu thuong). `null` = CHUA BIET (bang anh chup
   * giay phep dang trong) — luc do bo qua phep thu nay, dung ket qua bao cao.
   *
   * VI SAO CAN: bao cao khong co dong nao cho mot UPN co the do KHONG CO GIAY PHEP chu
   * khong phai "khong dung". Nham hai truong hop nay se lam nhan su di nhac nguoi khong
   * the cai dat duoc gi.
   */
  upn_co_giay_phep: Set<string> | null;
}

/**
 * Danh gia 8 ung dung bat buoc cua MOT nhan vien.
 *
 * Nguyen tac: trang thai "khong_thay" chi dung khi NGUON DOC DUOC ma khong thay hoat dong.
 * Nguon loi/quyen thieu thi tra "khong_kiem_tra_duoc" — khong duoc bien loi ky thuat thanh
 * loi cua nhan vien.
 */
export function danh_gia_ung_dung(t: ThamSoDanhGia): DongKiemTraUngDung[] {
  const upn = t.upn === null ? '' : chuan_upn(t.upn);
  if (upn === '') {
    return UNG_DUNG_BAT_BUOC.map((u) => ({
      nen_tang: u.nen_tang,
      ung_dung: u.ma,
      trang_thai: 'khong_co_tai_khoan' as const,
      lan_hoat_dong: null,
      ngay_bao_cao: null,
      nguon: 'khong_co',
      chi_tiet: 'chua_co_upn',
    }));
  }

  // Co email nhung KHONG nam trong anh chup nguoi da duoc cap giay phep: khong the co ung dung
  // cong ty. Chi xet khi anh chup CO du lieu — bang trong thi coi nhu chua biet.
  if (t.upn_co_giay_phep !== null && !t.upn_co_giay_phep.has(upn)) {
    return UNG_DUNG_BAT_BUOC.map((u) => ({
      nen_tang: u.nen_tang,
      ung_dung: u.ma,
      trang_thai: 'khong_co_tai_khoan' as const,
      lan_hoat_dong: null,
      ngay_bao_cao: null,
      nguon: 'khong_co',
      chi_tiet: 'khong_co_giay_phep',
    }));
  }

  const app = t.baoCaoApp.get(upn);
  const one = t.baoCaoOneDrive.get(upn);

  return UNG_DUNG_BAT_BUOC.map((u): DongKiemTraUngDung => {
    const nen = u.nen_tang;
    const ma = u.ma;

    // Ung dung khong co trong bao cao M365 — chi tra "khong kiem tra duoc" kem ly do ro rang.
    if (nen === 'dien_thoai' && ma === 'authenticator') {
      return {
        nen_tang: nen, ung_dung: ma, trang_thai: 'khong_kiem_tra_duoc',
        lan_hoat_dong: null, ngay_bao_cao: null,
        nguon: 'khong_kiem_tra_duoc', chi_tiet: 'can_entra_p1',
      };
    }
    if (nen === 'dien_thoai' && (ma === 'onedrive' || ma === 'sharepoint')) {
      return {
        nen_tang: nen, ung_dung: ma, trang_thai: 'khong_kiem_tra_duoc',
        lan_hoat_dong: null, ngay_bao_cao: null,
        nguon: 'khong_kiem_tra_duoc', chi_tiet: 'bao_cao_khong_tach_thiet_bi',
      };
    }

    if (nen === 'may_tinh' && ma === 'onedrive') {
      if (!t.co_bao_cao_onedrive) {
        return {
          nen_tang: nen, ung_dung: ma, trang_thai: 'khong_kiem_tra_duoc',
          lan_hoat_dong: null, ngay_bao_cao: null,
          nguon: 'khong_kiem_tra_duoc', chi_tiet: 'loi_bao_cao',
        };
      }
      if (one === undefined) {
        return {
          nen_tang: nen, ung_dung: ma, trang_thai: 'khong_thay',
          lan_hoat_dong: null, ngay_bao_cao: null,
          nguon: 'bao_cao_onedrive', chi_tiet: 'khong_co_hoat_dong',
        };
      }
      if (one.synced > 0) {
        return {
          nen_tang: nen, ung_dung: ma, trang_thai: 'da_dung',
          lan_hoat_dong: one.lastActivity, ngay_bao_cao: one.ngayBaoCao,
          nguon: 'bao_cao_onedrive', chi_tiet: 'dong_bo_tep',
        };
      }
      if (one.viewedOrEdited > 0) {
        return {
          nen_tang: nen, ung_dung: ma, trang_thai: 'chi_web',
          lan_hoat_dong: one.lastActivity, ngay_bao_cao: one.ngayBaoCao,
          nguon: 'bao_cao_onedrive', chi_tiet: 'chi_dung_web',
        };
      }
      return {
        nen_tang: nen, ung_dung: ma, trang_thai: 'khong_thay',
        lan_hoat_dong: null, ngay_bao_cao: one.ngayBaoCao,
        nguon: 'bao_cao_onedrive', chi_tiet: 'khong_co_hoat_dong',
      };
    }

    // Outlook / Teams: bao cao dung chung cho ca may tinh lan dien thoai.
    if (!t.co_bao_cao_app) {
      return {
        nen_tang: nen, ung_dung: ma, trang_thai: 'khong_kiem_tra_duoc',
        lan_hoat_dong: null, ngay_bao_cao: null,
        nguon: 'khong_kiem_tra_duoc', chi_tiet: 'loi_bao_cao',
      };
    }
    if (app === undefined) {
      return {
        nen_tang: nen, ung_dung: ma, trang_thai: 'khong_thay',
        lan_hoat_dong: null, ngay_bao_cao: null,
        nguon: 'bao_cao_m365_app', chi_tiet: 'khong_co_hoat_dong',
      };
    }

    const daDung = nen === 'may_tinh'
      ? (ma === 'outlook' ? app.outlookWindows : app.teamsWindows)
      : (ma === 'outlook' ? app.outlookMobile : app.teamsMobile);
    const dungWeb = nen === 'may_tinh'
      ? (ma === 'outlook' ? app.outlookWeb : app.teamsWeb)
      : false;

    if (daDung) {
      return {
        nen_tang: nen, ung_dung: ma, trang_thai: 'da_dung',
        lan_hoat_dong: null, ngay_bao_cao: app.ngayBaoCao,
        nguon: 'bao_cao_m365_app', chi_tiet: null,
      };
    }
    if (dungWeb) {
      return {
        nen_tang: nen, ung_dung: ma, trang_thai: 'chi_web',
        lan_hoat_dong: null, ngay_bao_cao: app.ngayBaoCao,
        nguon: 'bao_cao_m365_app', chi_tiet: 'chi_dung_web',
      };
    }
    return {
      nen_tang: nen, ung_dung: ma, trang_thai: 'khong_thay',
      lan_hoat_dong: null, ngay_bao_cao: app.ngayBaoCao,
      nguon: 'bao_cao_m365_app', chi_tiet: 'khong_co_hoat_dong',
    };
  });
}
