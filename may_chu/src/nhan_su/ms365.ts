// Chan dang nhap va rut giay phep Microsoft 365 khi nhan vien nghi viec.
//
// Dung Graph app-only (client_credentials), cung creds voi module gui_email — token lay
// tu `lay_token_graph` trong su_kien/gui_email.ts. App Entra phai duoc cap quyen ung dung:
//   User.ReadWrite.All          — PATCH accountEnabled + assignLicense (rut giay phep)
//   User.RevokeSessions.All     — revokeSignInSessions
//
// Ham thuan `dung_than_*` tach payload ra de unit test ma khong can goi Graph that.
import { cau_hinh } from '../cau_hinh.ts';
import { lay_token_graph } from '../su_kien/gui_email.ts';

const HET_GIO_MS = 30_000;
const GOC_GRAPH = (): string => cau_hinh.mail.goc_graph;

/** Buoc Microsoft da bat chua (env MS365_NGHI_VIEC_BAT=1). */
export function ms365_nghi_viec_bat(): boolean {
  return cau_hinh.ms365_nghi_viec.bat;
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
