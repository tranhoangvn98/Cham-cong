// Chan dang nhap va rut giay phep Microsoft 365 khi nhan vien nghi viec. Tao tai khoan va
// cap giay phep khi tao ho so nhan su moi.
//
// Dung Graph app-only (client_credentials), cung creds voi module gui_email — token lay
// tu `lay_token_graph` trong su_kien/gui_email.ts. App Entra phai duoc cap quyen ung dung:
//   User.ReadWrite.All          — PATCH accountEnabled + POST /users + assignLicense
//   User.RevokeSessions.All     — revokeSignInSessions (nghi viec)
//
// Ham thuan `dung_than_*` tach payload ra de unit test ma khong can goi Graph that.
import { randomInt } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';
import { lay_token_graph } from '../su_kien/gui_email.ts';

const HET_GIO_MS = 30_000;
const GOC_GRAPH = (): string => cau_hinh.mail.goc_graph;

/** Buoc Microsoft da bat chua (env MS365_NGHI_VIEC_BAT=1). */
export function ms365_nghi_viec_bat(): boolean {
  return cau_hinh.ms365_nghi_viec.bat;
}

/** Buoc tao tai khoan Microsoft da bat chua (env MS365_TAO_TAI_KHOAN_BAT=1). */
export function ms365_tao_bat(): boolean {
  return cau_hinh.ms365_tao.bat;
}

/**
 * Chuc danh co duoc cap giay phep STANDARD hay khong.
 *
 * Quy tac chu cong ty chot: truong phong nhan Microsoft 365 Standard, nhan su con lai nhan
 * Basic. Khop chuoi chua "trưởng" (trưởng phòng, trưởng bộ phận, trưởng nhóm...) tru
 * "phó" (phó trưởng phòng van nhan Basic).
 */
export function la_truong_phong(chuc_danh: string | null): boolean {
  const c = (chuc_danh ?? '').toLowerCase().trim();
  if (c === '') return false;
  if (c.includes('phó')) return false;
  return c.includes('trưởng');
}

const BO_MA_HOA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const BO_MA_THUONG = 'abcdefghjkmnpqrstuvwxyz';
const BO_MA_SO = '23456789';
const BO_MA_KY_TU = '!@#$%^&*-_=+';

/** Chon ngau nhien mot ky tu trong bo, dung `randomInt` cua node:crypto. */
function chon_trong_bo(bo: string): string {
  return bo[randomInt(0, bo.length)] as string;
}

/**
 * Sinh mat khau khoi tao cho tai khoan Microsoft.
 *
 * 16 ky tu, chac chan co du 4 nhom (hoa, thuong, so, ky tu dac biet) — Graph tu choi mat
 * khau khong du 3 trong 4 nhom. Khong dung ky tu de nhin nham (O/0, I/l/1).
 */
export function sinh_mat_khau_khoi_tao(do_dai = 16): string {
  const bat_buoc = [
    chon_trong_bo(BO_MA_HOA),
    chon_trong_bo(BO_MA_THUONG),
    chon_trong_bo(BO_MA_SO),
    chon_trong_bo(BO_MA_KY_TU),
  ];
  const tat_ca = BO_MA_HOA + BO_MA_THUONG + BO_MA_SO + BO_MA_KY_TU;
  for (let i = bat_buoc.length; i < do_dai; i++) {
    bat_buoc.push(chon_trong_bo(tat_ca));
  }
  // Xao tron bang Fisher–Yates de 4 nhom bat buoc khong dung dau mat khau theo thu tu co dinh.
  for (let i = bat_buoc.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const tam = bat_buoc[i] as string;
    bat_buoc[i] = bat_buoc[j] as string;
    bat_buoc[j] = tam;
  }
  return bat_buoc.join('');
}

/** Payload PATCH /users/{id}: khoa tai khoan, khong cho dang nhap nua. */
export function dung_than_chan_dang_nhap(): Record<string, unknown> {
  return { accountEnabled: false };
}

/**
 * Payload POST /users/{id}/assignLicense: rut toan bo giay phep dang gan.
 * `addLicenses` rong, `removeLicenses` la danh sach skuId doc tu `assignedLicenses` hien tai.
 */
export function dung_than_rut_giay_phep(sku_ids: string[]): Record<string, unknown> {
  return { addLicenses: [], removeLicenses: sku_ids };
}

/**
 * Payload POST /users: tao tai khoan Entra moi.
 * `forceChangePasswordNextSignIn` bat buoc phai co — nhan vien doi mat khau o lan dang nhap dau.
 */
export function dung_than_tao_tai_khoan(
  upn: string, ho_ten: string, mat_khau: string,
): Record<string, unknown> {
  return {
    accountEnabled: true,
    displayName: ho_ten,
    mailNickname: upn.slice(0, upn.indexOf('@')),
    userPrincipalName: upn,
    passwordProfile: {
      forceChangePasswordNextSignIn: true,
      password: mat_khau,
    },
  };
}

/** Payload POST /users/{id}/assignLicense: cap MOT giay phep cho tai khoan vua tao. */
export function dung_than_cap_giay_phep(sku_id: string): Record<string, unknown> {
  return { addLicenses: [{ skuId: sku_id }], removeLicenses: [] };
}

/** Doc danh sach skuId giay phep dang gan cua mot tai khoan Entra. */
async function doc_giay_phep(token: string, upn: string): Promise<string[]> {
  const res = await fetch(
    `${GOC_GRAPH()}/users/${encodeURIComponent(upn)}?$select=assignedLicenses`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(HET_GIO_MS) },
  );
  if (!res.ok) {
    throw new Error(`Graph từ chối đọc giấy phép ${upn} (HTTP ${res.status})`);
  }
  const kq = (await res.json().catch(() => ({}))) as {
    assignedLicenses?: { skuId?: string }[];
  };
  return (kq.assignedLicenses ?? [])
    .map((l) => l.skuId ?? '')
    .filter((s) => s !== '');
}

/**
 * Chan dang nhap + thu hoi phien + rut toan bo giay phep cua mot tai khoan Entra.
 *
 * NEM loi ro rang khi that bai de outbox giu lai dong va thu lai theo backoff. Khong nuot
 * loi: mot nguoi da nghi ma con dang nhap duoc Microsoft la lo bao mat, phai nhin thay.
 */
export async function chan_dang_nhap_va_rut_giay_phep(upn: string): Promise<void> {
  if (!ms365_nghi_viec_bat()) {
    throw new Error('MS365_NGHI_VIEC_BAT chưa bật — sự kiện ms365 nằm lại hộp thư chờ');
  }
  const token = await lay_token_graph();

  // 1. Khoa tai khoan: accountEnabled = false.
  const khoa = await fetch(`${GOC_GRAPH()}/users/${encodeURIComponent(upn)}`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(dung_than_chan_dang_nhap()),
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  if (!khoa.ok) {
    throw new Error(`Graph từ chối chặn đăng nhập ${upn} (HTTP ${khoa.status})`);
  }

  // 2. Thu hoi phien dang song. Giong cong: khoa tai khoan chan duoc dang nhap lai nhung
  //    khong chan duoc phien dang mo — tab dang mo van dung duoc neu bo buoc nay.
  const phien = await fetch(
    `${GOC_GRAPH()}/users/${encodeURIComponent(upn)}/revokeSignInSessions`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(HET_GIO_MS),
    },
  );
  if (!phien.ok && phien.status !== 404) {
    throw new Error(`Graph từ chối thu hồi phiên ${upn} (HTTP ${phien.status})`);
  }

  // 3. Rut toan bo giay phep dang gan.
  const sku = await doc_giay_phep(token, upn);
  if (sku.length > 0) {
    const rut = await fetch(`${GOC_GRAPH()}/users/${encodeURIComponent(upn)}/assignLicense`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(dung_than_rut_giay_phep(sku)),
      signal: AbortSignal.timeout(HET_GIO_MS),
    });
    if (!rut.ok) {
      throw new Error(`Graph từ chối rút giấy phép ${upn} (HTTP ${rut.status})`);
    }
  }
}

/**
 * Tao tai khoan Entra moi va cap giay phep theo SKU da chon.
 *
 * An toan khi goi lai (outbox gui lai sau khi mat phan hoi): neu tai khoan da ton tai
 * (Graph tra 409) thi KHONG coi la loi, van cap giay phep tiep — buoc cap giay phep idempotent.
 *
 * NEM loi ro rang khi that bai de outbox giu lai dong va thu lai theo backoff.
 */
export async function tao_tai_khoan_va_cap_giay_phep(
  upn: string, ho_ten: string, mat_khau: string, sku_id: string,
): Promise<void> {
  if (!ms365_tao_bat()) {
    throw new Error('MS365_TAO_TAI_KHOAN_BAT chưa bật — sự kiện ms365 nằm lại hộp thư chờ');
  }
  if (sku_id === '') {
    throw new Error(`Chưa khai SKU Microsoft cho tài khoản ${upn} — sự kiện ms365 nằm lại hộp thư chờ`);
  }
  const token = await lay_token_graph();

  // 1. Tao tai khoan. 409 = UPN da ton tai (lan gui lai) — khong phai loi.
  const tao = await fetch(`${GOC_GRAPH()}/users`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(dung_than_tao_tai_khoan(upn, ho_ten, mat_khau)),
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  if (!tao.ok && tao.status !== 409) {
    throw new Error(`Graph từ chối tạo tài khoản ${upn} (HTTP ${tao.status})`);
  }

  // 2. Cap giay phep theo SKU.
  const cap = await fetch(`${GOC_GRAPH()}/users/${encodeURIComponent(upn)}/assignLicense`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(dung_than_cap_giay_phep(sku_id)),
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  if (!cap.ok) {
    throw new Error(`Graph từ chối cấp giấy phép ${upn} (HTTP ${cap.status})`);
  }
}
