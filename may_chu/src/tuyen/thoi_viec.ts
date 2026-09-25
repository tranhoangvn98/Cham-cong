// API quan tri quy trinh thoi viec — phia Admin (Cong 1 da nam o route duyet don; day la
// giam sat + Cong 2 + cau hinh). Phia nhan vien nam o /api/toi/thoi-viec* (tuyen/toi.ts).
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { truy_van } from '../csdl/ket_noi.ts';
import {
  can_admin, can_nhan_su, nguoi_dung_hien_tai,
} from '../bao_mat/xac_thuc.ts';
import {
  chuoi, ngay, than, trong_tap, uuid, LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  bo_qua_muc, chot_lastday, gan_nguoi_nhan_ban_giao, huy_quy_trinh,
} from '../thoi_viec/nghiep_vu.ts';
import {
  danh_sach_quy_trinh, dat_cau_hinh_thoi_viec, dat_han_bao_truoc,
  doc_cau_hinh_thoi_viec, doc_khuon_han_bao_truoc, quy_trinh_theo_id,
} from '../thoi_viec/quy_trinh.ts';
import { chay_dung_hoat_dong, bao_admin_it_thu_cong } from '../thoi_viec/chay_dung.ts';
import { danh_sach_nguoi_nhan_cho } from '../thoi_viec/tro_ly.ts';

const TRANG_THAI = ['dang_thuc_hien', 'san_sang_chot', 'da_khoa', 'da_huy'] as const;
const KHOA_CAU_HINH = [
  'email_dich_vu_bhxh', 'email_dich_vu_bhxh_cc', 'email_chung_tu_thue',
] as const;

function nd_tu(req: FastifyRequest): { sub: string; nv: string | null } {
  return nguoi_dung_hien_tai(req);
}

function lay_id(req: FastifyRequest): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

export async function tuyen_thoi_viec(app: FastifyInstance): Promise<void> {
  // ---------------------------------------------------------------- danh sach & chi tiet
  app.get('/thoi-viec/quy-trinh', { preHandler: can_nhan_su }, async (req) => {
    const q = than(req.query);
    const trang_thai = trong_tap(q, 'trang_thai', TRANG_THAI);
    const tim = chuoi(q, 'tim', { toi_da: 100 });
    return { danh_sach: await danh_sach_quy_trinh(trang_thai, tim) };
  });

  app.get('/thoi-viec/quy-trinh/:id', { preHandler: can_nhan_su }, async (req) => {
    const qt = await quy_trinh_theo_id(lay_id(req));
    if (qt === null) throw new LoiKhongTim('Không tìm thấy quy trình.');
    return qt;
  });

  /** Danh sach nguoi dung co the gan lam nguoi nhan ban giao. */
  app.get('/thoi-viec/quy-trinh/:id/nguoi-nhan', { preHandler: can_nhan_su }, async (req) =>
    danh_sach_nguoi_nhan_cho(lay_id(req)));

  // ---------------------------------------------------------------- thao tac Admin
  /** Huy quy trinh (bat ky trang thai tru da_khoa). */
  app.post('/thoi-viec/quy-trinh/:id/huy', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    await huy_quy_trinh(id, nd_tu(req));
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'thoi_viec_huy', 'quy_trinh_thoi_viec',
      id, null, req.ip);
    return { ok: true };
  });

  /** Cong 2 (b): Admin chot lastday + (tuy chon) coi nhu khong can bao truoc (D.35 k2). */
  app.post('/thoi-viec/quy-trinh/:id/chot-lastday', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body ?? {});
    const ngay_moi = ngay(b, 'ngay_lam_viec_cuoi');
    const khong_can_bao_truoc = b['khong_can_bao_truoc'] === true;
    await chot_lastday(id, nd_tu(req), ngay_moi, khong_can_bao_truoc);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'thoi_viec_chot_lastday',
      'quy_trinh_thoi_viec', id, { ngay_lam_viec_cuoi: ngay_moi, khong_can_bao_truoc }, req.ip);
    return { ok: true };
  });

  /** Cong 2 (c): chay script dung hoat dong. Idempotent. */
  app.post('/thoi-viec/quy-trinh/:id/chay-dung', { preHandler: can_admin }, async (req) => {
    const id = lay_id(req);
    const kq = await chay_dung_hoat_dong(id, nguoi_dung_hien_tai(req).sub, req.ip);
    if (!kq.da_chay) await bao_admin_it_thu_cong(id);
    return kq;
  });

  /** Bo qua (hoac bo bo qua) mot muc — chi muc chua lam. */
  app.post('/thoi-viec/muc/:id/bo-qua', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body ?? {});
    const bo = b['bo'] === true;
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });
    const kq = await bo_qua_muc(id, bo, ghi_chu);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'thoi_viec_bo_qua_muc', 'muc_checklist',
      id, { bo, ghi_chu }, req.ip);
    return { ok: true, muc_chua: kq.muc_chua };
  });

  /** Chi dinh nguoi nhan ban giao — nguoi nay ky ben nhan cua bien ban. */
  app.post('/thoi-viec/ban-giao/:id/nguoi-nhan', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body ?? {});
    const nguoi_dung_id = uuid(b, 'nguoi_dung_id', { bat_buoc: true });
    if (nguoi_dung_id === null) throw new LoiDauVao('Thiếu tài khoản người nhận.');
    await gan_nguoi_nhan_ban_giao(id, nd_tu(req), nguoi_dung_id);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'thoi_viec_gan_nguoi_nhan', 'ban_giao',
      id, { nguoi_dung_id }, req.ip);
    return { ok: true };
  });

  // ---------------------------------------------------------------- cau hinh
  app.get('/thoi-viec/cau-hinh', { preHandler: can_nhan_su }, async () => ({
    cau_hinh: await doc_cau_hinh_thoi_viec(),
    han_bao_truoc: await doc_khuon_han_bao_truoc(),
  }));

  app.post('/thoi-viec/cau-hinh', { preHandler: can_admin }, async (req) => {
    const b = than(req.body ?? {});
    const khoa = chuoi(b, 'khoa', { toi_da: 60 });
    if (khoa === null) throw new LoiDauVao('Thiếu khóa cấu hình.');
    const gia_tri = chuoi(b, 'gia_tri', { toi_da: 200 }) ?? '';
    if ((KHOA_CAU_HINH as readonly string[]).includes(khoa)) {
      await dat_cau_hinh_thoi_viec(khoa, gia_tri);
    } else if (khoa.startsWith('han_bao_truoc_')) {
      const loai_hd = khoa.slice('han_bao_truoc_'.length);
      const so_ngay = gia_tri === '' ? null : Number(gia_tri);
      if (so_ngay !== null && (!Number.isInteger(so_ngay) || so_ngay < 0)) {
        throw new LoiDauVao('Số ngày phải là số nguyên không âm (để trống = theo hợp đồng).');
      }
      await dat_han_bao_truoc(loai_hd, so_ngay);
    } else {
      throw new LoiDauVao('Không biết khóa cấu hình này.');
    }
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'thoi_viec_cau_hinh', khoa, null,
      { gia_tri }, req.ip);
    return { ok: true };
  });

  /** So quy trinh den han ma chua khoa — cham do tren dashboard. */
  app.get('/thoi-viec/canh-bao-den-han', { preHandler: can_nhan_su }, async () =>
    truy_van(
      `select qt.id, nv.ma_nv, nv.ho_ten, to_char(qt.ngay_lam_viec_cuoi, 'YYYY-MM-DD') as lastday,
              qt.trang_thai
         from quy_trinh_thoi_viec qt
         join nhan_vien nv on nv.id = qt.nhan_vien_id
        where qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
          and qt.ngay_lam_viec_cuoi is not null
          and qt.ngay_lam_viec_cuoi <= current_date
        order by qt.ngay_lam_viec_cuoi`));
}
