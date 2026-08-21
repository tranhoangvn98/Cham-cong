// Hook xac thuc + phan quyen cho Fastify.
//
// Luu y ve Fastify 5: trong hook async, muon tra loi ngay thi phai `return reply.send(...)`.
// Fastify thay hook tra ve reply se dung chuoi hook, khong chay handler.
//
// HAI LOAI TOKEN di qua day, va ca hai deu ra cung mot kieu `NoiDungToken`:
//
//   1. Token cua chinh he thong (HS256, `bao_mat/jwt.ts`) — duong dang nhap rieng, con dung
//      cho app dien thoai.
//   2. Token cua cong SSO noi bo (RS256, `bao_mat/cong_sso.ts`) — chi bat khi khai
//      `CONG_SSO_GOC`.
//
// Thu tu thu la CO Y: token noi bo truoc, vi phep kiem cua no khong cham CSDL va khong cham
// mang. Token cua cong la RS256 nen `giai_ma_token` tu choi ngay o buoc doc `alg`, khong ton
// gi. Nguoc lai thi moi request cua app dien thoai phai di qua lop xac minh cua cong truoc.
//
// KHONG doc header `X-Cong-*` o day, va do khong phai thieu sot. Cong gac chuyen
// `X-Cong-Nguoi-Dung` / `X-Cong-Email` sang, nhung Caddy chi GHI DE chung: request den tu bat
// cu dau khac ngoai Caddy — goi thang 127.0.0.1:8080, mot lo SSRF o phan he khac, mot container
// cung mang Docker — thi ke goi TU KHAI MINH LA AI, chi bang cach dat header. Uy quyen duy nhat
// la token da xac minh chu ky.
import { la_vai_tro_nhan_su } from './quyen_ho_so.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { giai_ma_token, type NoiDungToken, type VaiTro } from './jwt.ts';
import { bat_cong_sso, xac_minh_token_cong } from './cong_sso.ts';
import { phien_tu_token_cong } from './cong_phien.ts';

// Gan nguoi dung da xac thuc vao request de cac route dung lai.
declare module 'fastify' {
  interface FastifyRequest {
    nguoi_dung?: NoiDungToken;
  }
}

const LOI_401 = { loi: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
const LOI_403 = { loi: 'Bạn không có quyền thực hiện việc này.' };
const LOI_CHO_DUYET = {
  loi: 'Tài khoản của bạn chưa được quản trị viên phân quyền. Hãy liên hệ bộ phận nhân sự.',
  cho_duyet: true,
};

/**
 * Ba man hinh khac nhau cho ba tinh huong "da dang nhap that nhung chua vao duoc".
 *
 * Ca ba PHAI la 403, khong duoc la 401. 401 lam giao dien day nguoi dung ve trang dang nhap:
 * ho dang nhap lai, thanh cong, roi lai bi day ra — mot vong lap khong bao gio thoat, va cai
 * duy nhat ho lam duoc la goi cho ho tro.
 */
const LOI_CHUA_CAP_QUYEN = {
  loi: 'Tài khoản của bạn chưa được cấp quyền ở phân hệ Chấm công. Hãy liên hệ quản trị cổng '
    + 'để được cấp vai trò.',
  chua_cap_quyen: true,
};
const LOI_VO_HIEU_HOA = { loi: 'Tài khoản đã bị vô hiệu hóa.' };

function loi_chua_noi_ho_so(email: string | null): Record<string, unknown> {
  return {
    loi: `Bạn đã đăng nhập nhưng tài khoản ${email ?? 'này'} chưa được nối với hồ sơ nhân viên `
      + 'nào trong hệ thống chấm công. Hãy liên hệ bộ phận nhân sự.',
    chua_noi_ho_so: true,
  };
}

/** Ket qua doc token: hoac mot nguoi dung, hoac mot ly do tu choi kem ma HTTP. */
type KetQuaDoc =
  | { ok: true; nd: NoiDungToken }
  | { ok: false; ma: 401 | 403; than: Record<string, unknown> };

function doc_bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return null;
  const token = h.slice(7).trim();
  return token.length === 0 ? null : token;
}

/**
 * Doc va xac minh Bearer token. Chi nhan token loai 'tc' (truy cap) — token lam moi KHONG
 * duoc dung de goi API, neu khong thi thoi han ngan cua access token vo nghia.
 */
async function xac_minh(req: FastifyRequest): Promise<KetQuaDoc> {
  const token = doc_bearer(req);
  if (token === null) return { ok: false, ma: 401, than: LOI_401 };

  const noi_bo = giai_ma_token(token);
  if (noi_bo !== null) {
    if (noi_bo.loai !== 'tc') return { ok: false, ma: 401, than: LOI_401 };
    return { ok: true, nd: noi_bo };
  }

  if (!bat_cong_sso()) return { ok: false, ma: 401, than: LOI_401 };

  const cong = await xac_minh_token_cong(token);
  if (cong === null) return { ok: false, ma: 401, than: LOI_401 };

  const phien = await phien_tu_token_cong(cong);
  switch (phien.loai) {
    case 'ok': return { ok: true, nd: phien.nguoi_dung };
    case 'chua_cap_quyen': return { ok: false, ma: 403, than: LOI_CHUA_CAP_QUYEN };
    case 'chua_noi_ho_so':
      return { ok: false, ma: 403, than: loi_chua_noi_ho_so(phien.email) };
    case 'vo_hieu_hoa': return { ok: false, ma: 403, than: LOI_VO_HIEU_HOA };
  }
}

/**
 * Bat buoc dang nhap va DA DUOC PHAN QUYEN.
 *
 * Tai khoan `cho_duyet` xac thuc duoc nhung chua co quyen gi — chan o day de khong route
 * nghiep vu nao phai tu nho kiem tra. Chi vai duong cua chinh lop xac thuc (xem
 * `can_dang_nhap_ke_ca_cho_duyet`) cho phep ho di qua, du de webapp hien man hinh cho duyet.
 */
export async function can_dang_nhap(req: FastifyRequest, res: FastifyReply) {
  const kq = await xac_minh(req);
  if (!kq.ok) return res.code(kq.ma).send(kq.than);
  if (kq.nd.vai_tro === 'cho_duyet') return res.code(403).send(LOI_CHO_DUYET);
  req.nguoi_dung = kq.nd;
}

/** Nhu tren nhung CHO PHEP tai khoan cho duyet — chi dung cho /toi va doi mat khau. */
export async function can_dang_nhap_ke_ca_cho_duyet(req: FastifyRequest, res: FastifyReply) {
  const kq = await xac_minh(req);
  if (!kq.ok) return res.code(kq.ma).send(kq.than);
  req.nguoi_dung = kq.nd;
}

/** Bat buoc dang nhap VA thuoc mot trong cac vai tro cho phep. */
export function can_vai_tro(...vai_tro_cho_phep: VaiTro[]) {
  return async function (req: FastifyRequest, res: FastifyReply) {
    const kq = await xac_minh(req);
    if (!kq.ok) return res.code(kq.ma).send(kq.than);
    if (!vai_tro_cho_phep.includes(kq.nd.vai_tro)) return res.code(403).send(LOI_403);
    req.nguoi_dung = kq.nd;
  };
}

/** Quan tri cham cong: admin hoac nhan su. */
export const can_nhan_su = can_vai_tro('admin', 'nhan_su', 'truong_phong_nhan_su');

/** Nguoi duyet don: admin, nhan su, truong phong. */
export const can_nguoi_duyet = can_vai_tro('admin', 'nhan_su', 'truong_phong_nhan_su',
  'truong_phong');

/** Chi admin (quan tri tai khoan, xoa du lieu). */
export const can_admin = can_vai_tro('admin');

/** Lay nguoi dung da xac thuc; nem loi neu route thieu hook (loi lap trinh). */
export function nguoi_dung_hien_tai(req: FastifyRequest): NoiDungToken {
  const nd = req.nguoi_dung;
  if (nd === undefined) throw new Error('Route thieu hook can_dang_nhap.');
  return nd;
}

/** true neu vai tro duoc xem du lieu cua moi nhan vien. */
export function xem_duoc_tat_ca(nd: { vai_tro: string }): boolean {
  return la_vai_tro_nhan_su(nd.vai_tro);
}
