// Nguon danh sach Microsoft 365 da cap giay phep — cho form "+ Them nhan vien".
//
// Truoc day hai route nay nam trong module "de nghi them nhan su". Tu 26/10/2026 chi con MOT
// luong tao nhan su (POST /api/nhan-vien), nen chung chuyen ve day va doi duong dan theo dung
// nghiep vu: chon nguoi da co tai khoan Microsoft de khoi tao ho so ma khong tao lai tai khoan.
//
// Doc ANH CHUP (bang ms365_nguoi_da_cap_phep) thay vi goi Graph moi lan mo form — nhanh, khong
// treo form khi Graph cham. Anh chup cap nhat boi lich quet 08:00/13:00 va nut "Dong bo ngay".
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';
import {
  dong_bo_nguoi_ms365_da_cap_phep, graph_da_cau_hinh,
  type KetQuaDongBoMs365,
} from '../nhan_su/ms365.ts';

export async function tuyen_nguon_ms365(app: FastifyInstance): Promise<void> {
  app.get('/nhan-vien/ms365-da-cap-phep', { preHandler: can_nhan_su }, async () => {
    const co = await truy_van_mot<{ so: number }>(
      'select count(*)::int as so from ms365_nguoi_da_cap_phep');
    if ((co?.so ?? 0) === 0 && graph_da_cau_hinh()) {
      try {
        await dong_bo_nguoi_ms365_da_cap_phep();
      } catch (loi) {
        throw new LoiDauVao(`Không đọc được danh sách Microsoft 365: ${(loi as Error).message}`);
      }
    }
    // Chi loai nguoi DA CO HO SO. Khong loai theo "de nghi dang cho duyet" nua — buoc de nghi
    // da bo, nen nguoi do phai hien ra de nguoi nhan su con them duoc ho so.
    const da_dung = new Set<string>();
    for (const d of await truy_van<{ email: string }>(
      `select lower(email) as email from nhan_vien
        where email is not null and email <> ''`,
    )) da_dung.add(d.email);
    const ds = await truy_van<{ oid: string; ho_ten: string; upn: string }>(
      'select oid, ho_ten, upn from ms365_nguoi_da_cap_phep order by upn');
    const moc = await truy_van_mot<{ moc: string | null }>(
      'select max(dong_bo_luc)::text as moc from ms365_nguoi_da_cap_phep');
    return {
      danh_sach: ds.filter((u) => !da_dung.has(u.upn.toLowerCase())),
      dong_bo_luc: moc?.moc ?? null,
    };
  });

  app.post('/nhan-vien/ms365-da-cap-phep/dong-bo', { preHandler: can_nhan_su },
    async (req) => {
      if (!graph_da_cau_hinh()) {
        throw new LoiDauVao(
          'Chưa cấu hình Microsoft Graph (MS_MAIL_TENANT_ID / CLIENT_ID / CLIENT_SECRET) — chưa đọc được danh sách Microsoft 365.');
      }
      let kq: KetQuaDongBoMs365;
      try {
        kq = await dong_bo_nguoi_ms365_da_cap_phep();
      } catch (loi) {
        throw new LoiDauVao(`Không đồng bộ được danh sách Microsoft 365: ${(loi as Error).message}`);
      }
      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'dong_bo_ms365_giay_phep',
        'ms365_nguoi_da_cap_phep', null, { them_moi: kq.them_moi, tong: kq.tong }, req.ip);
      return kq;
    });
}
