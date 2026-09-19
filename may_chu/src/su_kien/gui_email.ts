// Gui email qua Microsoft Graph (sendMail, app-only client_credentials).
//
// He thong KHONG co SMTP — day la duong gui mail duy nhat. Cong ty dung Microsoft 365 nen
// dung luon Graph. Token lay y het luong cua sharepoint/khach.ts (client_credentials,
// scope `${graph}/.default`), nhung app PHAI duoc cap them quyen ung dung `Mail.Send`.
//
// FAIL-SOFT: chua cau hinh (thieu creds / nguoi_gui), hoac Graph tu choi, thi tra false —
// KHONG nem loi len tren. Nhac nho van con duong thong bao day trong app. Mot canh bao ra/vao
// khong the vi loi mail ma treo ca job.
import { cau_hinh } from '../cau_hinh.ts';

const m = cau_hinh.mail;

/** Day du cau hinh de gui mail chua. */
export function email_bat(): boolean {
  return m.nguoi_gui !== '' && m.tenant_id !== '' && m.client_id !== '' && m.client_secret !== '';
}

let token: string | null = null;
let token_het_luc = 0;
let dang_xin: Promise<string> | null = null;
const LE_AN_TOAN_MS = 5 * 60 * 1000;
const HET_GIO_MS = 30_000;

async function xin_token_moi(): Promise<string> {
  const than = new URLSearchParams({
    client_id: m.client_id,
    client_secret: m.client_secret,
    scope: `${m.goc_graph.replace(/\/v1\.0$/, '')}/.default`,
    grant_type: 'client_credentials',
  });
  const res = await fetch(`${m.goc_token}/${m.tenant_id}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: than.toString(),
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  const kq = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // KHONG lay error_description: Microsoft nhet client_id + chi tiet cau hinh vao do.
    throw new Error(`Graph tu choi cap token gui mail (${String(kq['error'] ?? res.status)})`);
  }
  const t = kq['access_token'];
  if (typeof t !== 'string' || t === '') throw new Error('Graph tra ve token khong co access_token');
  const song_ms = (Number(kq['expires_in'] ?? 3600) || 3600) * 1000;
  token = t;
  token_het_luc = Date.now() + Math.max(0, song_ms - Math.min(LE_AN_TOAN_MS, song_ms / 2));
  return t;
}

/**
 * Token Graph app-only dung chung. Goi bat ky dau cung duoc mot token (cung app, cung
 * scope) — mail, chan dang nhap nghi viec, ... Khong goi Graph thi khong goi ham nay.
 */
export async function lay_token_graph(): Promise<string> {
  if (token !== null && token_het_luc > Date.now()) return token;
  if (dang_xin !== null) return dang_xin;
  dang_xin = xin_token_moi().finally(() => { dang_xin = null; });
  return dang_xin;
}

export interface DinhKemMail {
  ten: string;
  mime: string;
  du_lieu: Buffer;
}

export interface ThuDienTu {
  den: string[];              // dia chi nhan
  tieu_de: string;
  noi_dung_html: string;
  dinh_kem?: DinhKemMail[];   // dinh kem (vd DOCX ban hanh) — bo trong neu khong co
}

/**
 * Dung than sendMail gui len Graph. Ham THUAN (khong mang, khong doc cau hinh) de unit test
 * duoc payload ke ca phan dinh kem ma khong can goi Graph that.
 */
export function dung_than_mail(thu: ThuDienTu, den: string[]): Record<string, unknown> {
  const message: Record<string, unknown> = {
    subject: thu.tieu_de,
    body: { contentType: 'HTML', content: thu.noi_dung_html },
    toRecipients: den.map((d) => ({ emailAddress: { address: d } })),
  };
  if (thu.dinh_kem !== undefined && thu.dinh_kem.length > 0) {
    message['attachments'] = thu.dinh_kem.map((k) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: k.ten,
      contentType: k.mime,
      contentBytes: k.du_lieu.toString('base64'),
    }));
  }
  return { message, saveToSentItems: true };
}

/**
 * Gui mot email. Tra true neu Graph nhan (202), false neu chua cau hinh hoac loi. KHONG nem.
 * Dia chi rong bi loc; khong con dia chi nao thi tra false.
 */
export async function gui_email(thu: ThuDienTu): Promise<boolean> {
  if (!email_bat()) return false;
  const den = thu.den.map((d) => d.trim()).filter((d) => d.includes('@'));
  if (den.length === 0) return false;
  try {
    const tk = await lay_token_graph();
    const res = await fetch(
      `${m.goc_graph}/users/${encodeURIComponent(m.nguoi_gui)}/sendMail`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${tk}`, 'content-type': 'application/json' },
        signal: AbortSignal.timeout(HET_GIO_MS),
        body: JSON.stringify(dung_than_mail(thu, den)),
      },
    );
    if (!res.ok) {
      const kq = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const loi = (kq['error'] as Record<string, unknown> | undefined)?.['code'] ?? res.status;
      console.error(`[gui_email] Graph tu choi sendMail (${String(loi)})`);
      return false;
    }
    return true;
  } catch (loi) {
    console.error('[gui_email] loi gui mail:', (loi as Error).message);
    return false;
  }
}
