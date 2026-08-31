// API dong bo nguoi dung tu ERP cu.
//
// Chi ADMIN. Dong bo nay TAO va SUA nhan vien hang loat — khong phai viec de mo cho moi
// tai khoan nhan su.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_admin, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { bat_erp } from '../erp/khach.ts';
import { dong_bo_nhan_vien } from '../erp/dong_bo_nhan_vien.ts';
import { luan_ly, than, trong_tap } from '../tien_ich/kiem_tra.ts';

/** Cat bot chi tiet truoc khi ghi nhat ky: 10.000 nguoi thi jsonb phinh vo ich. */
const CHI_TIET_TOI_DA = 500;

export async function tuyen_dong_bo_erp(app: FastifyInstance): Promise<void> {
  /** Trang thai cau hinh + lich su cac luot da chay. */
  app.get('/dong-bo-erp', { preHandler: can_nhan_su }, async () => {
    const ds = await truy_van(
      `select id, thuc_the, che_do, so_doc, so_tao_moi, so_cap_nhat, so_bo_qua, so_loi,
              thong_diep, thanh_cong, bat_dau_luc, ket_thuc_luc, mili_giay
         from dong_bo_erp order by bat_dau_luc desc limit 50`,
    );
    const da_noi = await truy_van_mot<{ so: number }>(
      'select count(*)::int as so from nhan_vien where erp_user_id is not null',
    );
    return { da_cau_hinh: bat_erp(), so_da_noi: da_noi?.so ?? 0, lich_su: ds };
  });

  /** Chi tiet mot luot — de xem dong bo dong vao ai. */
  app.get('/dong-bo-erp/:id', { preHandler: can_nhan_su }, async (req) => {
    const p = req.params as Record<string, string>;
    return truy_van_mot(
      'select * from dong_bo_erp where id = $1', [Number(p['id'] ?? 0)],
    );
  });

  /**
   * Chay dong bo.
   *
   * `che_do = 'thu'` (mac dinh) doc ERP va tinh ra se lam gi NHUNG KHONG GHI GI. Bat nguoi
   * dung phai chu dong chon 'that' — dong bo tao va sua nguoi hang loat, khong nen la thao
   * tac lo tay mot cai la xong.
   */
  app.post('/dong-bo-erp/nhan-vien', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body ?? {});
    const che_do = trong_tap(b, 'che_do', ['thu', 'that'] as const, { mac_dinh: 'thu' })!;
    const chi_dang_lam = luan_ly(b, 'chi_dang_lam', true) as boolean;

    const bat_dau = Date.now();
    const dong = await truy_van_mot<{ id: string }>(
      `insert into dong_bo_erp (thuc_the, che_do, nguoi_chay) values ('nhan_vien',$1,$2)
       returning id`,
      [che_do, nd.sub],
    );

    try {
      const kq = await dong_bo_nhan_vien(che_do, chi_dang_lam);
      await thuc_thi(
        `update dong_bo_erp set so_doc = $2, so_tao_moi = $3, so_cap_nhat = $4,
                so_bo_qua = $5, chi_tiet = $6, thanh_cong = true,
                ket_thuc_luc = now(), mili_giay = $7
          where id = $1`,
        [
          dong!.id, kq.so_doc, kq.so_tao_moi, kq.so_cap_nhat, kq.so_bo_qua,
          JSON.stringify(kq.chi_tiet.slice(0, CHI_TIET_TOI_DA)),
          Date.now() - bat_dau,
        ],
      );
      await ghi_nhat_ky(nd.sub, `dong_bo_erp_${che_do}`, 'nhan_vien', null, {
        so_doc: kq.so_doc, so_tao_moi: kq.so_tao_moi, so_cap_nhat: kq.so_cap_nhat,
      }, req.ip);

      return { ...kq, luot_id: dong!.id, che_do };
    } catch (loi) {
      const thong_diep = (loi as Error).message;
      await thuc_thi(
        `update dong_bo_erp set thanh_cong = false, so_loi = 1, thong_diep = $2,
                ket_thuc_luc = now(), mili_giay = $3
          where id = $1`,
        [dong!.id, thong_diep, Date.now() - bat_dau],
      );
      throw loi;
    }
  });

  /**
   * Nhung nguoi trong he thong CHUA noi duoc voi Microsoft 365.
   *
   * Dang nhap Microsoft khop nguoi theo `lower(nhan_vien.email)`. Khong co email thi ho
   * khong dang nhap bang tai khoan cong ty duoc — va do la thu de bo sot nhat, vi khong co
   * gi bao loi cho toi khi chinh nguoi do thu dang nhap.
   */
  app.get('/dong-bo-erp/thieu-email', { preHandler: can_nhan_su }, async () =>
    truy_van(
      `select id, ma_nv, ho_ten, erp_user_id, so_dien_thoai
         from nhan_vien
        where dang_hoat_dong = true and (email is null or btrim(email) = '')
        order by ma_nv`,
    ),
  );
}
