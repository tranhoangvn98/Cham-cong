// API yeu cau bo sung ho so bat buoc.
//
// Nhan su mo yeu cau cho mot nguoi; he thong tu gui email nhac hang tuan cho den khi ho so
// day du (lich chay quet moi vong, xem `su_kien/lich_chay.ts`). Route o day chi lo phan
// nghiep vu cua nguoi bam nut: mo, xem, huy.
import type { FastifyInstance } from 'fastify';
import { truy_van_mot } from '../csdl/ket_noi.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { chuoi, than, ngay, LoiKhongTim } from '../tien_ich/kiem_tra.ts';
import {
  danh_sach, huy_yeu_cau, tai_lieu_bat_buoc_con_thieu, tao_yeu_cau, yeu_cau_dang_mo,
  type TrangThaiYeuCau,
} from '../ho_so/bo_sung.ts';

const TRANG_THAI: readonly TrangThaiYeuCau[] = ['dang_mo', 'da_du', 'da_huy'];

/** Doc id tren duong dan; sai dang thi tra 404 chu khong phai loi 500 cua CSDL. */
function lay_id(req: { params: unknown }): string {
  const p = req.params as { id?: unknown };
  const id = typeof p.id === 'string' ? p.id : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new LoiKhongTim('Không tìm thấy.');
  }
  return id;
}

export function tuyen_bo_sung_ho_so(app: FastifyInstance): void {
  /** Danh sach yeu cau (mac dinh ca ba trang thai, moi nhat truoc). */
  app.get('/ho-so-bo-sung', { preHandler: can_nhan_su }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const tt = typeof q['trang_thai'] === 'string'
      && (TRANG_THAI as readonly string[]).includes(q['trang_thai'])
      ? q['trang_thai'] as TrangThaiYeuCau
      : undefined;
    return danh_sach(tt === undefined ? {} : { trang_thai: tt });
  });

  /**
   * Tinh trang bo sung cua MOT nhan vien: yeu cau dang mo (neu co) + danh sach tai lieu con
   * thieu NGAY BAY GIO. Web can ca hai de hien thi dung nut nao.
   */
  app.get('/nhan-vien/:id/bo-sung', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const nv = await truy_van_mot<{ ma_nv: string }>(
      'select ma_nv from nhan_vien where id = $1', [id]);
    if (nv === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');
    return {
      yeu_cau: await yeu_cau_dang_mo(id),
      con_thieu: await tai_lieu_bat_buoc_con_thieu(id),
    };
  });

  /**
   * Mo yeu cau. Ho so da day du thi tra `da_co = true` — do la thong tin, khong phai loi:
   * nguoi bam nut can doc "khong con gi de yeu cau" chu khong phai ve mot hop loi do.
   */
  app.post('/nhan-vien/:id/bo-sung', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body ?? {});
    const han_bo_sung = ngay(b, 'han_bo_sung');
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const nv = await truy_van_mot<{ ma_nv: string; ho_ten: string }>(
      'select ma_nv, ho_ten from nhan_vien where id = $1', [id]);
    if (nv === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');

    const kq = await tao_yeu_cau(id, nd.sub, han_bo_sung, ghi_chu);
    if (!kq.da_co) {
      await ghi_nhat_ky(nd.sub, 'yeu_cau_bo_sung_ho_so', 'nhan_vien', id, {
        ma_nv: nv.ma_nv, so_tai_lieu: kq.so_tai_lieu, han_bo_sung,
      }, req.ip);
    }
    return kq;
  });

  /** Huy yeu cau dang mo — nguoi nhan thoi bi nhac. */
  app.post('/ho-so-bo-sung/:id/huy', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const ok = await huy_yeu_cau(id);
    if (!ok) throw new LoiKhongTim('Không tìm thấy yêu cầu đang mở.');
    await ghi_nhat_ky(nd.sub, 'huy_yeu_cau_bo_sung_ho_so', 'yeu_cau_bo_sung_ho_so', id, null, req.ip);
    return { ok: true };
  });
}
