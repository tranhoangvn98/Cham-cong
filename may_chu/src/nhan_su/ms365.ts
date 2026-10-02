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
import { trong_giao_dich } from '../csdl/ket_noi.ts';
import { gui_ngam, tai_khoan_nhan_su } from '../su_kien/thong_bao_day.ts';
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
 * Ham THUAN de unit test: toi da 3 ten, thua thi "... va N nguoi khac".
 */
export function ten_moi_thanh_chu(ten: string[]): string | null {
  if (ten.length === 0) return null;
  const dau = ten.slice(0, 3).join(', ');
  return ten.length > 3 ? `${dau} và ${ten.length - 3} người khác` : dau;
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
    const chu = ten_moi_thanh_chu(ten_moi) ?? '';
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_nhan_su(),
      tieu_de: 'Microsoft 365 có tài khoản mới được cấp phép',
      noi_dung: `${chu} vừa có giấy phép Microsoft 365 — mở "Đề nghị thêm nhân sự" `
        + 'để tạo đề nghị.',
      du_lieu: { man: 'de-nghi-nhan-su' },
    });
  }
  return { tong: ds.length, them_moi: ten_moi.length, ten_moi };
}
