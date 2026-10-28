// Chan dang nhap va rut giay phep Microsoft 365 khi nhan vien nghi viec. Tao tai khoan va
// cap giay phep khi tao ho so nhan su moi.
//
// Dung Graph app-only (client_credentials), cung creds voi module gui_email — token lay
// tu `lay_token_graph` trong su_kien/gui_email.ts. App Entra phai duoc cap quyen ung dung:
//   User.ReadWrite.All            — PATCH accountEnabled + POST /users + assignLicense
//   User.RevokeSessions.All       — revokeSignInSessions (nghi viec)
//   User-PasswordProfile.ReadWrite.All — PATCH passwordProfile (cap lai mat khau). THIEU quyen
//                                   nay thi Graph tra 403 "Insufficient privileges" du
//                                   User.ReadWrite.All da co (gap that 27/10/2026).
//
// Ham thuan `dung_than_*` tach payload ra de unit test ma khong can goi Graph that.
import { randomInt } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';
import { trong_giao_dich } from '../csdl/ket_noi.ts';
import { tai_khoan_nhan_su } from '../su_kien/thong_bao_day.ts';
import { gui_chuong_ngon_ngu } from '../su_kien/gui_chuong_ngon_ngu.ts';
import { type NgonNgu } from '../chuoi/chi_muc.ts';
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
 * Chuc danh co phai cap truong hay khong — dung khi Admin chon giay phep STANDARD cho mot nguoi
 * cu the.
 *
 * LUU Y: day KHONG con la quy tac mac dinh. Tu 10/2026 moi tai khoan moi nhan Basic; Standard chi
 * khi nguoi tao chon dich danh (`sku_id_tuy_chon`), va luc do ham nay chi de goi y tren giao dien.
 *
 * Khop chuoi chua "trưởng" (trưởng phòng, trưởng bộ phận, trưởng nhóm...) tru "phó" (phó trưởng
 * phòng van nhan Basic).
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

/**
 * Payload PATCH /users/{id}: dat quoc gia su dung.
 *
 * Graph BAT BUOC co `usageLocation` truoc khi `assignLicense`, khong thi tra 400. Tai khoan do
 * chinh he thong tao khong co truong nay (payload POST /users o tren khong dat), nen buoc cap
 * giay phep phai dat truoc — thieu no la ca hai buoc deu that bai va su kien quay vong mai.
 */
export function dung_than_dat_quoc_gia(quoc_gia: string): Record<string, unknown> {
  return { usageLocation: quoc_gia.trim().toUpperCase() };
}

/** Viec phai lam o buoc cap giay phep, quyet dinh tu danh sach SKU dang co. */
export type QuyetDinhGiayPhep =
  | { viec: 'cap' }
  | { viec: 'da_co' }
  | { viec: 'khac'; dang_co: string[] };

/**
 * Co nen cap them giay phep khong — ham THUAN de unit test.
 *
 * Ba truong hop phai phan biet ro, vi ca ba deu tung lam hong luong that:
 *  - Chua co giay phep nao -> cap.
 *  - Da co dung SKU dich -> xong (lan gui lai cua outbox khong duoc cap trung).
 *  - Da co giay phep KHAC -> KHONG cap chong. Mot nguoi dang dung Business Standard ma cap
 *    them Basic la tra tien hai lan cho cung mot nguoi; viec chon goi la cua nguoi quan tri,
 *    he thong chi bao lai de ho quyet.
 */
export function quyet_dinh_giay_phep(
  dang_co: readonly string[], sku_id: string,
): QuyetDinhGiayPhep {
  const ds = dang_co.filter((s) => s !== '');
  if (ds.includes(sku_id)) return { viec: 'da_co' };
  if (ds.length > 0) return { viec: 'khac', dang_co: ds };
  return { viec: 'cap' };
}

/**
 * Payload PATCH /users/{id}: dat lai mat khau khoi tao cho tai khoan DA CO (ban giao lai).
 *
 * Bat buoc `forceChangePasswordNextSignIn: true` — nguoi nhan mat khau tam phai doi ngay o lan
 * dang nhap dau, neu khong thi mat khau do nam lai trong tin nhan/giay ghi chu mai mai.
 */
export function dung_than_dat_lai_mat_khau(mat_khau: string): Record<string, unknown> {
  return { passwordProfile: { forceChangePasswordNextSignIn: true, password: mat_khau } };
}

/**
 * Dat lai mat khau Microsoft cho mot UPN da ton tai, tra ve mat khau moi de ban giao.
 *
 * Dung khi tao ho so bao "email đã thuộc <ai đó>" — tuc tai khoan da duoc tao tu lan truoc
 * (vi du lan truoc bi mat phien giua chung). KHONG tao tai khoan moi, KHONG cap them giay phep,
 * KHONG mo khoa tai khoan: dang bi khoa thi bao ra de nguoi lam ho so tu quyet dinh.
 */
export async function dat_lai_mat_khau_ms365(
  upn: string,
): Promise<{ mat_khau: string; dang_bi_khoa: boolean }> {
  const token = await lay_token_graph();
  const doc = await fetch(
    `${GOC_GRAPH()}/users/${encodeURIComponent(upn)}?$select=accountEnabled`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(HET_GIO_MS) },
  );
  if (doc.status === 404) {
    throw new Error(`Không tìm thấy tài khoản Microsoft ${upn} — kiểm tra lại email.`);
  }
  if (!doc.ok) {
    throw new Error(`Graph từ chối đọc tài khoản ${upn} (HTTP ${doc.status})`);
  }
  const dang_bat = ((await doc.json()) as { accountEnabled?: unknown }).accountEnabled === true;

  const mat_khau = sinh_mat_khau_khoi_tao();
  const sua = await fetch(`${GOC_GRAPH()}/users/${encodeURIComponent(upn)}`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(dung_than_dat_lai_mat_khau(mat_khau)),
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  if (!sua.ok) {
    throw new Error(`Graph từ chối đặt lại mật khẩu ${upn} (HTTP ${sua.status})`);
  }
  return { mat_khau, dang_bi_khoa: !dang_bat };
}

/**
 * Doc than phan hoi loi cua Graph de ghi vao `loi_cuoi` cua hop thu di.
 *
 * Khong co no thi loi chi con "HTTP 400" — dung cau khong ai chan doan duoc (gap that
 * 28/10/2026: hai su kien tao tai khoan quay vong 43 va 55 lan ma khong biet vi sao). Cat 300
 * ky tu va gop khoang trang vi than loi cua Graph thuong rat dai.
 */
async function doc_than_loi(res: Response): Promise<string> {
  const than = await res.text().catch(() => '');
  const gon = than.replace(/\s+/g, ' ').trim();
  return gon === '' ? '' : `: ${gon.slice(0, 300)}`;
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
 * Gỡ TOÀN BỘ vai trò thư mục Entra của một tài khoản. Trả về số vai trò đã gỡ.
 *
 * VI SAO PHẢI GỠ TRƯỚC KHI KHÓA: Microsoft chặn ứng dụng tắt tài khoản còn giữ vai trò quản trị
 * (`PATCH accountEnabled` trả 403) — cơ chế bảo vệ có chủ đích, để một app bị lộ không tự khóa
 * quản trị viên. Nhưng với người ĐÃ NGHỈ thì vai trò đó không còn lý do tồn tại, và không gỡ
 * thì tài khoản không bao giờ khóa được (đã gặp thật với ERP147: 3 vai trò, 403).
 *
 * Đọc vai trò cần `RoleManagement.ReadWrite.Directory` (quyền ứng dụng, đã cấp admin consent).
 * Gỡ xong thì tài khoản thường mới, nên `$ref` trả 404 cũng tính là xong.
 */
export async function go_vai_tro_entra(upn: string): Promise<number> {
  const token = await lay_token_graph();
  const dau = { authorization: `Bearer ${token}` };

  const u = await fetch(`${GOC_GRAPH()}/users/${encodeURIComponent(upn)}?$select=id`, {
    headers: dau, signal: AbortSignal.timeout(HET_GIO_MS),
  });
  if (u.status === 404) return 0;
  if (!u.ok) throw new Error(`Graph từ chối đọc tài khoản ${upn} (HTTP ${u.status})`);
  const { id } = (await u.json().catch(() => ({}))) as { id?: string };
  if (id === undefined) return 0;

  const ds = await fetch(
    `${GOC_GRAPH()}/users/${id}/transitiveMemberOf/microsoft.graph.directoryRole?$select=id`,
    { headers: dau, signal: AbortSignal.timeout(HET_GIO_MS) },
  );
  if (!ds.ok) throw new Error(`Graph từ chối đọc vai trò của ${upn} (HTTP ${ds.status})`);
  const vai_tro = ((await ds.json().catch(() => ({}))) as { value?: { id?: string }[] }).value ?? [];

  let so = 0;
  for (const v of vai_tro) {
    if (v.id === undefined) continue;
    const x = await fetch(`${GOC_GRAPH()}/directoryRoles/${v.id}/members/${id}/$ref`, {
      method: 'DELETE', headers: dau, signal: AbortSignal.timeout(HET_GIO_MS),
    });
    if (x.ok || x.status === 404) so += 1;
  }
  return so;
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

  // 0. Go vai tro quan tri Entra TRUOC khi khoa.
  //    Tai khoan con vai tro quan tri thi buoc 1 (PATCH) chac chan 403. Buoc nay KHONG chan
  //    luong: tai khoan thuong khong co vai tro nao (tra 0, khong goi Graph them), va neu Graph
  //    tu choi o day thi buoc khoa ben duoi se bao loi ro rang — con hon nuot loi roi bao "da khoa".
  try {
    const so_vai_tro = await go_vai_tro_entra(upn);
    if (so_vai_tro > 0) console.info(`[ms365] da go ${String(so_vai_tro)} vai tro Entra cua ${upn}`);
  } catch (loi) {
    console.warn(`[ms365] khong go duoc vai tro Entra cua ${upn}: ${(loi as Error).message}`);
  }

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

/** Ket qua buoc tao tai khoan + cap giay phep (xem `tao_tai_khoan_va_cap_giay_phep`). */
export interface KetQuaTaoTaiKhoanMs365 {
  /** true = vua tao; false = tai khoan da co tu truoc. */
  da_tao: boolean;
  /** 'da_cap' = vua cap; 'da_co' = da co dung SKU; 'khac' = dang co giay phep khac, khong cap chong. */
  giay_phep: 'da_cap' | 'da_co' | 'khac';
  /** Cac SKU dang co khi `giay_phep === 'khac'` (rong o hai truong hop con lai). */
  giay_phep_dang_co: string[];
}

/**
 * Tai khoan Entra theo UPN: co hay khong, quoc gia su dung va cac SKU dang gan.
 * Khong co (404) tra `co: false` — day la phep Kiem tra ton tai dung de phan biet "trung UPN"
 * voi "payload sai".
 */
async function doc_tai_khoan(
  token: string, upn: string,
): Promise<{ co: boolean; quoc_gia: string; giay_phep: string[] }> {
  const res = await fetch(
    `${GOC_GRAPH()}/users/${encodeURIComponent(upn)}?$select=id,usageLocation,assignedLicenses`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(HET_GIO_MS) },
  );
  if (res.status === 404) return { co: false, quoc_gia: '', giay_phep: [] };
  if (!res.ok) {
    throw new Error(
      `Graph từ chối đọc tài khoản ${upn} (HTTP ${res.status})${await doc_than_loi(res)}`);
  }
  const kq = (await res.json().catch(() => ({}))) as {
    usageLocation?: string;
    assignedLicenses?: { skuId?: string }[];
  };
  return {
    co: true,
    quoc_gia: (kq.usageLocation ?? '').trim(),
    giay_phep: (kq.assignedLicenses ?? []).map((l) => l.skuId ?? '').filter((s) => s !== ''),
  };
}

/**
 * Tao tai khoan Entra moi va cap giay phep theo SKU da chon.
 *
 * An toan khi goi lai (outbox gui lai sau khi mat phan hoi, hoac quan tri da tao tay tai trung
 * tam quan tri Microsoft 365): tai khoan da ton tai thi KHONG coi la loi, di tiep buoc cap giay
 * phep — buoc do idempotent va khong cap chong.
 *
 * VI SAO KHONG THE DUA VAO 409: Entra tra **400** (`Request_BadRequest`, "Another object with
 * the same value for property userPrincipalName already exists") khi UPN da ton tai, khong phai
 * 409. Ban cu chi bat 409 nen moi lan gui lai deu nem loi, su kien quay vong vo han va giay phep
 * KHONG BAO GIO duoc cap — dung trieu chung "them nhan su moi khong duoc gan giay phep tu dong"
 * (gap that 28/10/2026: hai su kien da thu 43 va 55 lan). Nay khang dinh "da ton tai" bang mot
 * phep doc lai tai khoan, khong doan theo ma loi cua chuoi.
 *
 * NEM loi ro rang kem than phan hoi cua Graph khi that bai de outbox giu lai dong va thu lai theo
 * backoff; khong co than phan hoi thi `loi_cuoi` chi con "HTTP 400" — khong ai chan doan duoc.
 */
export async function tao_tai_khoan_va_cap_giay_phep(
  upn: string, ho_ten: string, mat_khau: string, sku_id: string,
): Promise<KetQuaTaoTaiKhoanMs365> {
  if (!ms365_tao_bat()) {
    throw new Error('MS365_TAO_TAI_KHOAN_BAT chưa bật — sự kiện ms365 nằm lại hộp thư chờ');
  }
  if (sku_id === '') {
    throw new Error(`Chưa khai SKU Microsoft cho tài khoản ${upn} — sự kiện ms365 nằm lại hộp thư chờ`);
  }
  const token = await lay_token_graph();
  const dau = { authorization: `Bearer ${token}` };

  // 1. Tao tai khoan. "Da ton tai" (UPN trung) khong phai loi.
  let da_tao = false;
  const tao = await fetch(`${GOC_GRAPH()}/users`, {
    method: 'POST',
    headers: { ...dau, 'content-type': 'application/json' },
    body: JSON.stringify(dung_than_tao_tai_khoan(upn, ho_ten, mat_khau)),
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  if (tao.ok) {
    da_tao = true;
  } else {
    const than = await doc_than_loi(tao);
    // Khang dinh bang phep doc lai thay vi tin vao ma loi: 400 cua Entra khi trung UPN va 400
    // khi payload sai khong phan biet duoc neu chi nhin con so.
    const hien = await doc_tai_khoan(token, upn);
    if (!hien.co) {
      throw new Error(`Graph từ chối tạo tài khoản ${upn} (HTTP ${tao.status})${than}`);
    }
    console.info(`[ms365] tai khoan ${upn} da co san — di tiep buoc cap giay phep`);
  }

  // 2. usageLocation: Graph bat buoc truoc khi cap giay phep, tai khoan he thong tao ra khong co.
  const sau = await doc_tai_khoan(token, upn);
  if (!sau.co) {
    throw new Error(`Vừa tạo nhưng Graph không đọc lại được tài khoản ${upn} — thử lại sau`);
  }
  if (sau.quoc_gia === '') {
    const dat = await fetch(`${GOC_GRAPH()}/users/${encodeURIComponent(upn)}`, {
      method: 'PATCH',
      headers: { ...dau, 'content-type': 'application/json' },
      body: JSON.stringify(dung_than_dat_quoc_gia(cau_hinh.ms365_tao.quoc_gia)),
      signal: AbortSignal.timeout(HET_GIO_MS),
    });
    if (!dat.ok) {
      throw new Error(
        `Graph từ chối đặt quốc gia sử dụng cho ${upn} (HTTP ${dat.status})${await doc_than_loi(dat)}`);
    }
  }

  // 3. Cap giay phep — khong bao gio cap chong.
  const quyet_dinh = quyet_dinh_giay_phep(sau.giay_phep, sku_id);
  if (quyet_dinh.viec === 'da_co') {
    return { da_tao, giay_phep: 'da_co', giay_phep_dang_co: [] };
  }
  if (quyet_dinh.viec === 'khac') {
    return { da_tao, giay_phep: 'khac', giay_phep_dang_co: quyet_dinh.dang_co };
  }
  const cap = await fetch(`${GOC_GRAPH()}/users/${encodeURIComponent(upn)}/assignLicense`, {
    method: 'POST',
    headers: { ...dau, 'content-type': 'application/json' },
    body: JSON.stringify(dung_than_cap_giay_phep(sku_id)),
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  if (!cap.ok) {
    throw new Error(
      `Graph từ chối cấp giấy phép ${upn} (HTTP ${cap.status})${await doc_than_loi(cap)}`);
  }
  return { da_tao, giay_phep: 'da_cap', giay_phep_dang_co: [] };
}

/**
 * Ten goi giay phep theo skuId, de thong bao nguoi doc hieu ngay.
 *
 * Doc tu Graph `GET /subscribedSkus` moi la duong dung, nhung app hien tai chi duoc cap
 * `User.ReadWrite.All` — goi do tra **403** (da thu 28/10/2026), nên giu bang nho nay. Ngay nao
 * quan tri cap them `Organization.Read.All` thi thay bang phep doc that.
 *
 * Khong thay skuId trong bang thi tra ve chinh skuId: van hon la doan bua mot cai ten.
 */
const TEN_GOI_GIAY_PHEP: Record<string, string> = {
  '3b555118-da6a-4418-894f-7df1e2096870': 'Microsoft 365 Business Basic',
  'e0dfc8b9-9531-4ec8-94b4-9fec23b05fc8': 'Microsoft 365 Business Standard',
};

export function ten_goi_giay_phep(sku_id: string): string {
  const s = sku_id.trim();
  return TEN_GOI_GIAY_PHEP[s.toLowerCase()] ?? s;
}

/**
 * Bao nhan su khi tai khoan da co giay phep KHAC nen he thong khong cap chong.
 *
 * Khong bao thi nguoi lap ho so tuong la da cap xong, trong khi nguoi do dung goi khac — mot
 * su that can nguoi quyet, khong phai viec cua ma.
 *
 * KHONG chan luong: thong bao hong thi ghi log va thoi, su kien van duoc danh da gui (neu nem
 * loi o day thi outbox gui lai mai mai va moi lan mot thong bao).
 */
export async function bao_giay_phep_da_co_khac(
  upn: string, ho_ten: string, ma_nv: string, dang_co: string[], mong_muon: string,
): Promise<void> {
  try {
    await gui_chuong_ngon_ngu({
      nguoi_dung_ids: await tai_khoan_nhan_su(),
      tieu_de: 'm365_phep_khac_tieu_de',
      noi_dung: 'm365_phep_khac_noi_dung',
      tham_so: {
        ho_ten,
        ma_nv,
        upn,
        giay_phep: dang_co.map(ten_goi_giay_phep).join(', '),
        giay_phep_mong_muon: ten_goi_giay_phep(mong_muon),
      },
      du_lieu: { man: 'nhan-vien' },
    });
  } catch (loi) {
    console.warn(`[ms365] khong bao duoc giay phep khac cua ${upn}: ${(loi as Error).message}`);
  }
}

// ------------------------------------------------------------ doc danh sach da cap phep

/**
 * Graph app-only da cau hinh chua — dung chung creds cua `mail`, nhung KHONG can
 * `nguoi_gui` vi chi DOC danh sach nguoi dung, khong gui thu.
 */
export function graph_da_cau_hinh(): boolean {
  const m = cau_hinh.mail;
  return m.tenant_id !== '' && m.client_id !== '' && m.client_secret !== '';
}

/** Nguoi dung Microsoft 365 da co giay phep, de HR chon khi tao de nghi them nhan su. */
export interface NguoiMs365DaCapPhep {
  /** Dinh danh on dinh cua nguoi dung trong Entra (object id). */
  oid: string;
  ho_ten: string;
  /** Email/UPN — email chinh la ten dang nhap Microsoft. */
  upn: string;
}

/** Dong nguoi dung Graph tho — chi lay nhung truong can doc giay phep. */
export interface DongNguoiDungGraph {
  id?: unknown;
  displayName?: unknown;
  userPrincipalName?: unknown;
  accountEnabled?: unknown;
  userType?: unknown;
  assignedLicenses?: unknown;
}

/**
 * Loc nhung nguoi dung CON DANG HOAT DONG va DANG CO it nhat mot giay phep.
 *
 * Ham THUAN de unit test ma khong can goi Graph that. Loai:
 *   - Tai khoan da khoa (accountEnabled khac true).
 *   - Khach moi ngoai tenancy (UPN chua `#EXT#`) — khong phai nhan vien cong ty.
 *   - Nguoi chua duoc cap giay phep nao.
 */
export function loc_nguoi_da_cap_phep(ds: DongNguoiDungGraph[]): NguoiMs365DaCapPhep[] {
  const kq: NguoiMs365DaCapPhep[] = [];
  for (const d of ds) {
    if (d === null || typeof d !== 'object') continue;
    if (d.accountEnabled !== true) continue;
    if (!Array.isArray(d.assignedLicenses) || d.assignedLicenses.length === 0) continue;
    const upn = typeof d.userPrincipalName === 'string' ? d.userPrincipalName.trim() : '';
    if (upn === '' || upn.toUpperCase().includes('#EXT#')) continue;
    const oid = typeof d.id === 'string' ? d.id.trim() : '';
    const ten = typeof d.displayName === 'string' ? d.displayName.trim() : '';
    if (oid === '' || ten === '') continue;
    kq.push({ oid, ho_ten: ten, upn });
  }
  return kq;
}

/**
 * Doc danh sach nguoi dung Entra dang co giay phep qua Graph app-only.
 *
 * Quyen can thiet: User.Read.All (nam san trong User.ReadWrite.All da cap cho app).
 * Doc theo trang `@odata.nextLink`, toi da 5 trang phong ho — cong ty nho, mot trang
 * `$top=999` la du, nhung khong bao gio gia su the.
 */
export async function danh_sach_nguoi_ms365_da_cap_phep(): Promise<NguoiMs365DaCapPhep[]> {
  const token = await lay_token_graph();
  let url = `${GOC_GRAPH()}/users`
    + '?$select=id,displayName,userPrincipalName,accountEnabled,userType,assignedLicenses'
    + '&$top=999';
  const tat_ca: NguoiMs365DaCapPhep[] = [];
  for (let trang = 0; trang < 5 && url !== ''; trang++) {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(HET_GIO_MS),
    });
    if (!res.ok) {
      throw new Error(`Graph từ chối đọc danh sách người dùng (HTTP ${res.status})`);
    }
    const than = (await res.json().catch(() => ({}))) as {
      value?: DongNguoiDungGraph[];
      '@odata.nextLink'?: string;
    };
    tat_ca.push(...loc_nguoi_da_cap_phep(than.value ?? []));
    url = than['@odata.nextLink'] ?? '';
  }
  return tat_ca;
}

// ------------------------------------------------------------ dong bo anh chup + bao HR

export interface KetQuaDongBoMs365 {
  /** Tong so nguoi dang co giay phep (sau lan quet nay). */
  tong: number;
  /** So nguoi moi phat hien lan nay (oid chua tung co trong anh chup). */
  them_moi: number;
  /** Ho ten nguoi moi phat hien — de bao HR va hien phan hoi. */
  ten_moi: string[];
}

/**
 * Gom ho ten nguoi moi thanh mot cau nguoi doc duoc cho thong bao.
 *
 * Ham THUAN de unit test: toi da 3 ten, thua thi "... va N nguoi khac" (tieng Trung noi bang
 * dau lien va "等N人").
 */
export function ten_moi_thanh_chu(ten: string[], ngon_ngu: NgonNgu = 'vi'): string | null {
  if (ten.length === 0) return null;
  const dau = ten.slice(0, 3);
  if (ngon_ngu === 'zh') {
    const noi = dau.join('、');
    return ten.length > 3 ? `${noi}等${String(ten.length - 3)}人` : noi;
  }
  const noi = dau.join(', ');
  return ten.length > 3 ? `${noi} và ${String(ten.length - 3)} người khác` : noi;
}

/**
 * Quet Graph, ghi anh chup danh sach nguoi da co giay phep vao bang
 * `ms365_nguoi_da_cap_phep`, va bao HR khi co nguoi MOI duoc cap phep.
 *
 * Idempotent — chay song song (lich + nut dong bo) cung an toan: insert moi dung
 * `on conflict do nothing`, cap nhat ten/upn cho oid da biet, xoa oid khong con giay
 * phep nua. Nem loi khi Graph loi de ben goi quyet dinh nha viec / tra loi.
 */
export async function dong_bo_nguoi_ms365_da_cap_phep(): Promise<KetQuaDongBoMs365> {
  const ds = await danh_sach_nguoi_ms365_da_cap_phep();
  const oid = ds.map((d) => d.oid);
  const ten = ds.map((d) => d.ho_ten);
  const upn = ds.map((d) => d.upn);

  const ten_moi = await trong_giao_dich(async (khach) => {
    // Nguoi moi: chen (oid moi) va lay ten de bao. `on conflict do nothing` la nguyen
    // tu — hai lan quet cung luc khong dem trung.
    const moi = await khach.query<{ ho_ten: string }>(
      `insert into ms365_nguoi_da_cap_phep(oid, ho_ten, upn)
       select v.oid, v.ho_ten, v.upn
         from unnest($1::text[], $2::text[], $3::text[]) as v(oid, ho_ten, upn)
       on conflict (oid) do nothing
       returning ho_ten`,
      [oid, ten, upn],
    );
    // Oid da biet nhung ten/upn doi: cap nhat lai, khong doi `phat_hien_luc`.
    await khach.query(
      `update ms365_nguoi_da_cap_phep as t
          set ho_ten = v.ho_ten, upn = v.upn, dong_bo_luc = now()
         from unnest($1::text[], $2::text[], $3::text[]) as v(oid, ho_ten, upn)
        where t.oid = v.oid and (t.ho_ten <> v.ho_ten or t.upn <> v.upn)`,
      [oid, ten, upn],
    );
    // Nguoi mat giay phep: ra khoi anh chup de o chon khong con liet ke ho.
    await khach.query(
      `delete from ms365_nguoi_da_cap_phep where oid <> all($1::text[])`,
      [oid],
    );
    return moi.rows.map((r) => r.ho_ten);
  });

  if (ten_moi.length > 0) {
    // Mot luong tao nhan su duy nhat: khong con "de nghi", nguoi nhan su mo thang trang
    // Nhan vien de them ho so. Noi dung qua tu dien song ngu theo ngon ngu nguoi nhan.
    await gui_chuong_ngon_ngu({
      nguoi_dung_ids: await tai_khoan_nhan_su(),
      tieu_de: 'm365_moi_tieu_de',
      noi_dung: 'm365_moi_noi_dung',
      tham_so: (nn) => ({ danh_sach: ten_moi_thanh_chu(ten_moi, nn) ?? '' }),
      du_lieu: { man: 'nhan-vien' },
    });
  }
  return { tong: ds.length, them_moi: ten_moi.length, ten_moi };
}
