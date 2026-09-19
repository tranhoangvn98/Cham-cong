// API: TRO LY QUAN TRI — chatbot cho nhan su/quan tri o goc nhin Quan tri.
//
// Chi can_nhan_su (admin, nhan su, truong phong nhan su) vao duoc. Bot tra loi tu du lieu
// QUAN TRI dung theo quyen cua nguoi hoi (xem quan_tri/tro_ly.ts). Lich su luu theo nguoi
// dung va chi chu tai khoan doc/xoa duoc cua minh.
import type { FastifyInstance } from 'fastify';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { truy_van, thuc_thi } from '../csdl/ket_noi.ts';
import { tra_loi_tro_ly_quan_tri } from '../quan_tri/tro_ly.ts';

export async function tuyen_quan_tri(app: FastifyInstance): Promise<void> {
  /** Tro ly quan tri: hoi bang tieng Viet, tra loi tu du lieu quan tri dung theo quyen. */
  app.get('/tro-ly', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const cau_hoi = typeof q['hoi'] === 'string' ? q['hoi'] : '';
    return tra_loi_tro_ly_quan_tri(
      { sub: nd.sub, vai_tro: nd.vai_tro, nv: nd.nv, ten: nd.ten }, cau_hoi,
    );
  });

  /** Lich su hoi thoai quan tri cua CHINH tai khoan nay — moi nhat truoc, toi da 100 luot. */
  app.get('/tro-ly/lich-su', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    return truy_van(
      `select cau_hoi, tra_loi, y_dinh, tao_luc from tro_ly_qt_hoi_thoai
        where nguoi_dung_id = $1 order by tao_luc desc limit 100`,
      [nd.sub],
    );
  });

  /** Xoa toan bo lich su tro ly quan tri cua chinh minh. */
  app.delete('/tro-ly/lich-su', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    await thuc_thi('delete from tro_ly_qt_hoi_thoai where nguoi_dung_id = $1', [nd.sub]);
    return { ok: true };
  });
}
