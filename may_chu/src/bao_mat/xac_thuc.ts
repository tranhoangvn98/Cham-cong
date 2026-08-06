// Hook xac thuc + phan quyen cho Fastify.
//
// Luu y ve Fastify 5: trong hook async, muon tra loi ngay thi phai `return reply.send(...)`.
// Fastify thay hook tra ve reply se dung chuoi hook, khong chay handler.
import type { FastifyReply, FastifyRequest } from 'fastify';
import { giai_ma_token, type NoiDungToken, type VaiTro } from './jwt.ts';

// Gan nguoi dung da xac thuc vao request de cac route dung lai.
declare module 'fastify' {
  interface FastifyRequest {
    nguoi_dung?: NoiDungToken;
  }
}

/**
 * Doc va xac minh Bearer token. Chi nhan token loai 'tc' (truy cap) — token lam moi
 * KHONG duoc dung de goi API, neu khong thi thoi han ngan cua access token vo nghia.
 */
function xac_minh(req: FastifyRequest): NoiDungToken | null {
  const h = req.headers.authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return null;
  const token = h.slice(7).trim();
  if (token.length === 0) return null;
  const nd = giai_ma_token(token);
  if (nd === null || nd.loai !== 'tc') return null;
  return nd;
}

const LOI_401 = { loi: 'Chưa đăng nhập hoặc phiên đã hết hạn.' };
const LOI_403 = { loi: 'Bạn không có quyền thực hiện việc này.' };

/** Bat buoc dang nhap (moi vai tro). */
export async function can_dang_nhap(req: FastifyRequest, res: FastifyReply) {
  const nd = xac_minh(req);
  if (nd === null) return res.code(401).send(LOI_401);
  req.nguoi_dung = nd;
}

/** Bat buoc dang nhap VA thuoc mot trong cac vai tro cho phep. */
export function can_vai_tro(...vai_tro_cho_phep: VaiTro[]) {
  return async function (req: FastifyRequest, res: FastifyReply) {
    const nd = xac_minh(req);
    if (nd === null) return res.code(401).send(LOI_401);
    if (!vai_tro_cho_phep.includes(nd.vai_tro)) return res.code(403).send(LOI_403);
    req.nguoi_dung = nd;
  };
}

/** Quan tri cham cong: admin hoac nhan su. */
export const can_nhan_su = can_vai_tro('admin', 'nhan_su');

/** Nguoi duyet don: admin, nhan su, truong phong. */
export const can_nguoi_duyet = can_vai_tro('admin', 'nhan_su', 'truong_phong');

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
  return nd.vai_tro === 'admin' || nd.vai_tro === 'nhan_su';
}
