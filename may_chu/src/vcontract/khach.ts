// Tang goi vContract: giu token, goi API, ghi nhat ky ca hai chieu.
//
// Moi lan goi deu duoc ghi vao `nhat_ky_vcontract`. Hop dong lao dong la chung cu phap ly;
// khi co tranh chap "ai ky luc nao", cai tra loi duoc la nhat ky chu khong phai trang thai
// hien tai cua mot dong trong bang.
import { cau_hinh } from '../cau_hinh.ts';
import { thuc_thi } from '../csdl/ket_noi.ts';
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';
import {
  giai_phan_hoi, doc_phien, la_thanh_cong, thong_diep_loi,
  type PhanHoiVContract, type PhienVContract,
} from './giao_thuc.ts';

/** Bo cuoc thay vi treo mai khi vContract khong tra loi. */
const HET_GIO_MS = 30_000;

/**
 * Token con dung duoc bao lau. Tai lieu khong noi ro han; JWT trong vi du song vai ngay.
 * Giu 30 phut roi login lai la du an toan ma khong lam phien may chu ho.
 */
const HAN_TOKEN_MS = 30 * 60 * 1000;

let phien: PhienVContract | null = null;
let phien_het_luc = 0;
/** Chan login song song: nhieu yeu cau cung luc chi duoc mo MOT phien. */
let dang_login: Promise<PhienVContract> | null = null;

export function bat_vcontract(): boolean {
  const v = cau_hinh.vcontract;
  return v.url !== '' && v.username !== '' && v.mat_khau !== '';
}

/** Nem loi voi thong diep chi ro phai lam gi, thay vi de fetch bao "invalid URL". */
function bat_buoc_bat(): void {
  if (!bat_vcontract()) {
    throw new LoiDauVao(
      'Chưa cấu hình vContract. Khai VCONTRACT_URL, VCONTRACT_USERNAME, VCONTRACT_PASSWORD '
      + 'trong .env rồi chạy lại `docker compose up -d`.',
    );
  }
}

/** Xoa phien dang giu — dung khi vContract tra 401 de lan sau login lai. */
export function quen_phien(): void {
  phien = null;
  phien_het_luc = 0;
}

async function lay_phien(): Promise<PhienVContract> {
  bat_buoc_bat();
  if (phien !== null && Date.now() < phien_het_luc) return phien;
  if (dang_login !== null) return dang_login;

  dang_login = (async () => {
    const v = cau_hinh.vcontract;
    const than: Record<string, string> = {
      username: v.username,
      password: v.mat_khau,
      isNotHuman: 'true',
    };
    if (v.cp_code !== '') than['cpCode'] = v.cp_code;
    if (v.cp_account_code !== '') than['cpAccountCode'] = v.cp_account_code;

    // KHONG ghi than yeu cau vao nhat ky: no chua mat khau.
    const ph = await goi_tho('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(than),
    }, '(đã ẩn: chứa mật khẩu)');

    if (!la_thanh_cong(ph)) {
      throw new LoiDauVao(`Đăng nhập vContract thất bại: ${thong_diep_loi(ph)}`);
    }
    const p = doc_phien(ph);
    phien = p;
    phien_het_luc = Date.now() + HAN_TOKEN_MS;
    return p;
  })();

  try {
    return await dang_login;
  } finally {
    dang_login = null;
  }
}

/** Goi mot lan, khong kem token, khong tu login lai. */
async function goi_tho(
  duong_dan: string,
  tuy_chon: RequestInit,
  ghi_du_lieu: unknown = null,
): Promise<PhanHoiVContract> {
  const url = `${cau_hinh.vcontract.url}${duong_dan}`;
  const bat_dau = Date.now();
  let ma_http: number | null = null;
  try {
    const res = await fetch(url, { ...tuy_chon, signal: AbortSignal.timeout(HET_GIO_MS) });
    ma_http = res.status;
    const tho = await res.text();

    if (res.status === 401) quen_phien();

    const ph = giai_phan_hoi(tho);
    await ghi_nhat_ky({
      chieu: 'goi_di', duong_dan, ma_http, thanh_cong: la_thanh_cong(ph),
      du_lieu: ghi_du_lieu, thong_diep: thong_diep_loi(ph), mili_giay: Date.now() - bat_dau,
    });
    return ph;
  } catch (loi) {
    await ghi_nhat_ky({
      chieu: 'goi_di', duong_dan, ma_http, thanh_cong: false,
      du_lieu: ghi_du_lieu, thong_diep: (loi as Error).message,
      mili_giay: Date.now() - bat_dau,
    });
    throw loi;
  }
}

/**
 * Goi API co xac thuc. Gap 401 thi login lai va thu MOT lan nua — token het han giua chung
 * la chuyen binh thuong, khong dang de nguoi dung thay loi.
 */
export async function goi_vcontract(
  duong_dan: string,
  tuy_chon: { method?: string; than?: unknown; form?: FormData } = {},
): Promise<PhanHoiVContract> {
  bat_buoc_bat();

  const lam = async (): Promise<PhanHoiVContract> => {
    const p = await lay_phien();
    const headers: Record<string, string> = {
      authorization: `Bearer ${p.token}`,
      'accept-language': 'vi',
    };
    let body: FormData | string | undefined;
    if (tuy_chon.form !== undefined) {
      // KHONG dat content-type: fetch tu sinh kem boundary cua multipart.
      body = tuy_chon.form;
    } else if (tuy_chon.than !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(tuy_chon.than);
    }
    return goi_tho(
      duong_dan,
      { method: tuy_chon.method ?? 'GET', headers, ...(body === undefined ? {} : { body }) },
      tuy_chon.form === undefined ? tuy_chon.than ?? null : '(multipart)',
    );
  };

  const lan_1 = await lam();
  if (la_thanh_cong(lan_1)) return lan_1;
  // Token het han giua chung: vContract tra loi xac thuc chu khong phai 401 HTTP.
  if (/token|unauthor|hết hạn|expired/i.test(thong_diep_loi(lan_1))) {
    quen_phien();
    return lam();
  }
  return lan_1;
}

interface DongNhatKy {
  chieu: 'goi_di' | 'nhan_ve';
  duong_dan: string;
  ma_http?: number | null;
  thanh_cong?: boolean | null;
  du_lieu?: unknown;
  thong_diep?: string | null;
  mili_giay?: number | null;
  hop_dong_dien_tu_id?: string | null;
}

/** Ghi nhat ky. Tu nuot loi cua chinh no: khong ghi duoc log khong duoc lam hong viec chinh. */
export async function ghi_nhat_ky(d: DongNhatKy): Promise<void> {
  try {
    await thuc_thi(
      `insert into nhat_ky_vcontract
         (hop_dong_dien_tu_id, chieu, duong_dan, ma_http, thanh_cong, du_lieu, thong_diep, mili_giay)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        d.hop_dong_dien_tu_id ?? null, d.chieu, d.duong_dan, d.ma_http ?? null,
        d.thanh_cong ?? null,
        d.du_lieu === undefined || d.du_lieu === null ? null : JSON.stringify(d.du_lieu),
        d.thong_diep ?? null, d.mili_giay ?? null,
      ],
    );
  } catch (loi) {
    console.warn(`[vcontract] khong ghi duoc nhat ky: ${(loi as Error).message}`);
  }
}

// ================================================================ cac API cu the

/** Tai tep hop dong len vContract. Tra ve `path` de gan vao AttachmentDTO khi lap HD. */
export async function tai_tep_len(
  ten_tep: string, du_lieu: Buffer, contract_code: string,
): Promise<string> {
  const form = new FormData();
  form.append('files', new Blob([new Uint8Array(du_lieu)]), ten_tep);
  form.append('contractCode', contract_code);

  const ph = await goi_vcontract('/api/integration/upload/files', { method: 'POST', form });
  if (!la_thanh_cong(ph)) {
    throw new LoiDauVao(`Tải tệp lên vContract thất bại: ${thong_diep_loi(ph)}`);
  }
  const duong = duong_dan_tu_phan_hoi(ph);
  if (duong === null) {
    throw new LoiDauVao('vContract không trả về đường dẫn tệp sau khi tải lên.');
  }
  return duong;
}

/**
 * Doc `path` tu phan hoi upload.
 *
 * vContract tra hinh dang khac nhau giua cac ban (chuoi, mang chuoi, hoac mang doi tuong
 * co truong `path`/`filePath`), nen thu lan luot thay vi doan mot dang duy nhat.
 */
export function duong_dan_tu_phan_hoi(ph: PhanHoiVContract): string | null {
  const d = ph.data;
  if (typeof d === 'string' && d.trim() !== '' && d.trim() !== 'null') return d.trim();
  if (Array.isArray(d) && d.length > 0) {
    const dau = d[0] as unknown;
    if (typeof dau === 'string') return dau;
    if (typeof dau === 'object' && dau !== null) {
      const o = dau as Record<string, unknown>;
      for (const k of ['path', 'filePath', 'fileName', 'url']) {
        if (typeof o[k] === 'string' && o[k] !== '') return o[k];
      }
    }
  }
  if (typeof d === 'object' && d !== null) {
    const o = d as Record<string, unknown>;
    for (const k of ['path', 'filePath', 'url']) {
      if (typeof o[k] === 'string' && o[k] !== '') return o[k] as string;
    }
  }
  return null;
}

/** Lap hop dong. `than` dung dang ContractRequestDTO cua tai lieu (contractList + requestCode). */
export async function lap_hop_dong(than: unknown): Promise<PhanHoiVContract> {
  return goi_vcontract('/api/integration/input-contract', { method: 'POST', than });
}

/** Bat dau luong ky. Sau buoc nay vContract moi gui thu moi ky cho cac ben. */
export async function bat_dau_ky(request_code: string, contract_code: string): Promise<PhanHoiVContract> {
  const q = `requestCode=${encodeURIComponent(request_code)}`
    + `&contractCode=${encodeURIComponent(contract_code)}`;
  return goi_vcontract(`/api/integration/start-sign-flow?${q}`);
}

/** Huy luong ky. */
export async function huy_ky(request_code: string, contract_code: string): Promise<PhanHoiVContract> {
  return goi_vcontract('/api/auto-sign/cancel', {
    method: 'POST',
    than: { requestCode: request_code, contractCode: contract_code },
  });
}

/** Hoi hien trang xu ly hop dong — duong du phong khi callback that lac. */
export async function hien_trang_hop_dong(
  request_code: string, contract_code: string,
): Promise<PhanHoiVContract> {
  const q = `requestCode=${encodeURIComponent(request_code)}`
    + `&contractCode=${encodeURIComponent(contract_code)}`;
  return goi_vcontract(`/api/integration/get-contract-result?${q}`);
}

/** Lay dia chi tai tep hop dong (ban da ky neu da hoan tat). */
export async function lay_tep_hop_dong(
  request_code: string, contract_code: string,
): Promise<PhanHoiVContract> {
  const q = `requestCode=${encodeURIComponent(request_code)}`
    + `&contractCode=${encodeURIComponent(contract_code)}`;
  return goi_vcontract(`/api/integration/get-files?${q}`);
}

/** Xoa hop dong nhap. Chi xoa duoc khi con o trang thai DRAFT. */
export async function xoa_hop_dong(
  request_code: string, contract_code: string,
): Promise<PhanHoiVContract> {
  return goi_vcontract('/api/integration/delete-contract', {
    method: 'POST',
    than: { requestCode: request_code, contractCode: contract_code },
  });
}
