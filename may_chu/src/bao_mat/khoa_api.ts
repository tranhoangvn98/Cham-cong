// Xac thuc khoa API cho /api/v1/* — cong danh cho HE THONG NGOAI goi vao (may den may).
//
// Khac JWT cua webapp o ba diem, va ca ba deu co ly do:
//   - Song lau, khong het han sau 15 phut: ERP chay theo lich luc 2 gio sang, khong co ai
//     ngoi nhap mat khau de lam moi token.
//   - Gan voi mot BEN TICH HOP chu khong phai mot nguoi: thu hoi khoa cua ERP khong lam
//     ai mat quyen dang nhap.
//   - Co pham vi quyen rieng: ERP khai 'bang_cong:doc' thi khong the goi nham vao duong
//     ghi ho so nhan su, du co doan dung duong dan.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { doc_danh_sach_ip, ip_duoc_phep } from '../tien_ich/dia_chi_ip.ts';

/**
 * Pham vi quyen. Dat theo cap "doi tuong:hanh dong" de con mo rong ma khong pha ban cu.
 *
 * Tach doc/ghi rieng vi phan lon ben tich hop CHI can doc — ERP lay bang cong de tinh
 * luong thi khong co ly do gi duoc sua ho so nhan su. Cap khoa chi-doc la mac dinh nen
 * chon; cap them quyen ghi phai la mot quyet dinh co y thuc.
 */
export const PHAM_VI = [
  'nhan_vien:doc',
  'nhan_vien:ghi',
  'bang_cong:doc',
  'lan_quet:doc',
  'nghi_phep:doc',
  'ho_so:doc',
  'su_kien:doc',
] as const;

export type PhamVi = (typeof PHAM_VI)[number];

export function la_pham_vi(x: string): x is PhamVi {
  return (PHAM_VI as readonly string[]).includes(x);
}

/** Tien to de nguoi doc log phan biet ngay khoa nay la cua he thong nao. */
const TIEN_TO_KHOA = 'ck_';

export interface KhoaApiHienTai {
  id: string;
  ten: string;
  pham_vi: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    khoa_api?: KhoaApiHienTai;
  }
}

/**
 * Sinh khoa moi. Tra ve ca khoa GOC (chi hien mot lan cho nguoi tao) lan ma bam de luu.
 *
 * 32 byte ngau nhien = 256 bit, khong the do. Bam bang SHA-256 khong them muoi: khoa da la
 * chuoi ngau nhien du dai nen khong so tan cong tu dien, va bam khong muoi cho phep tra
 * cuu bang mot cau SELECT theo chi muc thay vi doc het bang roi so tung dong.
 */
export function sinh_khoa(): { khoa: string; ma_bam: string; tien_to: string } {
  const khoa = TIEN_TO_KHOA + randomBytes(32).toString('base64url');
  return { khoa, ma_bam: bam_khoa(khoa), tien_to: khoa.slice(0, 11) };
}

export function bam_khoa(khoa: string): string {
  return createHash('sha256').update(khoa).digest('hex');
}

interface DongKhoa {
  id: string;
  ten: string;
  pham_vi: string[];
  ma_bam: string;
  dang_bat: boolean;
  het_han: Date | null;
  ip_cho_phep: string | null;
}

function doc_khoa_tu_header(req: FastifyRequest): string | null {
  const h = req.headers['authorization'];
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  // Mot so client cu chi gui duoc header rieng.
  const x = req.headers['x-api-key'];
  if (typeof x === 'string' && x.trim().length > 0) return x.trim();
  return null;
}

/**
 * Hook: bat buoc co khoa API hop le VA du pham vi.
 *
 * Dung nhu preHandler:  { preHandler: can_khoa_api('bang_cong:doc') }
 */
export function can_khoa_api(...pham_vi_can: PhamVi[]) {
  return async function kiem(req: FastifyRequest, res: FastifyReply): Promise<void> {
    const khoa = doc_khoa_tu_header(req);
    if (khoa === null || !khoa.startsWith(TIEN_TO_KHOA)) {
      await tu_choi(res, 401, 'thieu_khoa',
        'Thiếu khóa API. Gửi header: Authorization: Bearer ck_...');
      return;
    }

    const dong = await truy_van_mot<DongKhoa>(
      `select id, ten, pham_vi, ma_bam, dang_bat, het_han, ip_cho_phep
         from khoa_api where ma_bam = $1`,
      [bam_khoa(khoa)],
    );

    // So sanh thoi gian hang so du da tra cuu bang chi muc: tranh ro ri qua thoi gian phan
    // hoi khi ma bam trung mot phan.
    if (dong === null || !bang_nhau_an_toan(dong.ma_bam, bam_khoa(khoa))) {
      req.log.warn({ ip: req.ip, url: req.url }, 'khoa API khong hop le');
      await tu_choi(res, 401, 'khoa_sai', 'Khóa API không hợp lệ hoặc đã bị thu hồi.');
      return;
    }

    if (!dong.dang_bat) {
      await tu_choi(res, 401, 'khoa_da_tat', 'Khóa API đã bị tắt.');
      return;
    }
    if (dong.het_han !== null && dong.het_han.getTime() <= Date.now()) {
      await tu_choi(res, 401, 'khoa_het_han', 'Khóa API đã hết hạn.');
      return;
    }

    if (dong.ip_cho_phep !== null && dong.ip_cho_phep.trim() !== '') {
      const quy_tac = doc_danh_sach_ip(dong.ip_cho_phep, 'khoa_api.ip_cho_phep');
      if (quy_tac.length > 0 && !ip_duoc_phep(req.ip, quy_tac)) {
        req.log.warn({ khoa: dong.ten, ip: req.ip }, 'khoa API goi tu IP ngoai danh sach');
        await tu_choi(res, 403, 'ip_khong_cho_phep',
          'Khóa này chỉ dùng được từ dải IP đã khai.');
        return;
      }
    }

    const thieu = pham_vi_can.filter((p) => !dong.pham_vi.includes(p));
    if (thieu.length > 0) {
      await tu_choi(res, 403, 'thieu_pham_vi',
        `Khóa thiếu phạm vi: ${thieu.join(', ')}. Phạm vi hiện có: ${dong.pham_vi.join(', ') || '(trống)'}.`);
      return;
    }

    req.khoa_api = { id: dong.id, ten: dong.ten, pham_vi: dong.pham_vi };
  };
}

function bang_nhau_an_toan(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * Loi tra ve cho he thong ngoai: LUON la JSON co `ma` on dinh.
 *
 * `ma` la thu client doi chieu bang code; `thong_diep` chi de nguoi doc. Doi chu tieng Viet
 * trong `thong_diep` khong duoc lam hong client nao.
 */
async function tu_choi(res: FastifyReply, ma_http: number, ma: string, thong_diep: string) {
  await res.code(ma_http).send({ loi: { ma, thong_diep } });
}

/** Ghi lai mot lan goi. Loi o day khong duoc lam hong phan hoi that. */
export async function ghi_lan_goi(
  khoa_api_id: string | null,
  duong_dan: string,
  phuong_thuc: string,
  ma_tra_ve: number,
  dia_chi_ip: string | null,
  mili_giay: number,
): Promise<void> {
  try {
    await thuc_thi(
      `insert into nhat_ky_api
         (khoa_api_id, duong_dan, phuong_thuc, ma_tra_ve, dia_chi_ip, mili_giay)
       values ($1,$2,$3,$4,$5,$6)`,
      [khoa_api_id, duong_dan.slice(0, 500), phuong_thuc, ma_tra_ve, dia_chi_ip, mili_giay],
    );
    if (khoa_api_id !== null) {
      await thuc_thi(
        'update khoa_api set dung_lan_cuoi = now(), so_lan_dung = so_lan_dung + 1 where id = $1',
        [khoa_api_id],
      );
    }
  } catch {
    // Nuot loi co y: khong ghi duoc nhat ky thi van phai tra du lieu cho ben tich hop.
  }
}
