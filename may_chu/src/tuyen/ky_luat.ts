// API xu ly ky luat tu dong: gom vi pham theo thang -> ho so ky luat, danh sach, tong quan,
// quet, duyet, bac bo.
//
// RANH GIOI PHAP LY: che tai tai chinh o day la GIAM THUONG P3 (Dieu 104 BLLD, Dieu 14 Noi quy),
// KHONG phai phat tien (Dieu 127). Ky luat lao dong that (khien trach tro len) van lam o tab Vi
// pham qua bien ban (Dieu 122/124) — khong endpoint nao o day ap ky luat do.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import {
  can_admin, can_nhan_su, can_nguoi_duyet, nguoi_dung_hien_tai, xem_duoc_tat_ca,
} from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { chuoi, chuoi_bat_buoc, trong_tap, uuid, than, LoiDauVao } from '../tien_ich/kiem_tra.ts';
import { quet_vi_pham } from '../vi_pham/phat_hien.ts';
import { gom_va_xu_ly_thang, duyet_ho_so, bac_bo_ho_so } from '../ky_luat/xu_ly.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';

const MUC_DO = ['nhe', 'trung', 'nang', 'rat_nang'] as const;
const TRANG_THAI = ['moi', 'da_nhac', 'cho_duyet', 'da_ap_dung', 'bac_bo', 'huy'] as const;

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

/** Ky mac dinh = thang hien tai (theo gio may). */
function ky_hien(q: Record<string, unknown>): string {
  const k = chuoi(q, 'ky', { toi_da: 7 });
  if (k !== undefined && k !== null && /^\d{4}-\d{2}$/.test(k)) return k;
  return ngay_dia_phuong(new Date()).slice(0, 7);
}

export async function tuyen_ky_luat(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ danh sach ho so
  app.get('/ky-luat', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = than(req.query) as Record<string, unknown>;
    const ky = ky_hien(q);
    const tt = trong_tap(q, 'trang_thai', TRANG_THAI);   // undefined = tat ca
    const md = trong_tap(q, 'muc_do', MUC_DO);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    return truy_van(
      `select h.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
         from ho_so_ky_luat h
         join nhan_vien nv on nv.id = h.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where h.ky = $1
          and ($2::text is null or h.trang_thai = $2)
          and ($3::text is null or h.muc_do = $3)
          and ($4::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $5))
        order by h.tong_tien desc, h.cap_nhat_luc desc
        limit 500`,
      [ky, tt ?? null, md ?? null, chi_phong_minh, nd.nv],
    );
  });

  // ------------------------------------------------------------ tong quan (dashboard ky luat)
  app.get('/ky-luat/tong-quan', { preHandler: can_nguoi_duyet }, async (req) => {
    const q = than(req.query) as Record<string, unknown>;
    const ky = ky_hien(q);

    const [tong, theo_trang_thai, theo_muc_do, top_nguoi] = await Promise.all([
      truy_van_mot<{ so_ho_so: number; so_nguoi: number; cho_duyet: number; tong_tien: string }>(
        `select count(*)::int as so_ho_so,
                count(distinct nhan_vien_id)::int as so_nguoi,
                count(*) filter (where trang_thai = 'cho_duyet')::int as cho_duyet,
                coalesce(sum(tong_tien) filter (where trang_thai = 'da_ap_dung'), 0)::text as tong_tien
           from ho_so_ky_luat where ky = $1`,
        [ky],
      ),
      truy_van<{ trang_thai: string; so: number }>(
        `select trang_thai, count(*)::int as so from ho_so_ky_luat
          where ky = $1 group by trang_thai`,
        [ky],
      ),
      truy_van<{ muc_do: string; so: number; tien: string }>(
        `select muc_do, count(*)::int as so, coalesce(sum(tong_tien),0)::text as tien
           from ho_so_ky_luat where ky = $1 group by muc_do`,
        [ky],
      ),
      truy_van<{ nhan_vien_id: string; ma_nv: string; ho_ten: string; phong_ban: string | null;
                 so_ho_so: number; so_vi_pham: number; tong_tien: string }>(
        `select h.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
                count(*)::int as so_ho_so, sum(h.so_vi_pham)::int as so_vi_pham,
                coalesce(sum(h.tong_tien),0)::text as tong_tien
           from ho_so_ky_luat h
           join nhan_vien nv on nv.id = h.nhan_vien_id
           left join phong_ban pb on pb.id = nv.phong_ban_id
          where h.ky = $1
          group by h.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten
          order by tong_tien desc, so_vi_pham desc limit 10`,
        [ky],
      ),
    ]);

    return { ky, tong, theo_trang_thai, theo_muc_do, top_nguoi };
  });

  // ------------------------------------------------------------ quet & xu ly mot ky
  /**
   * Quet vi pham cua ky (theo quy tac dang bat) roi gom & tu xu ly thanh ho so ky luat.
   * Nhac nho / giam thuong duoi nguong tu ap; giam thuong tu nguong chuyen 'cho_duyet'.
   */
  app.post('/ky-luat/quet', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const thang = chuoi_bat_buoc(b, 'thang', { toi_da: 7 });
    if (!/^\d{4}-\d{2}$/.test(thang)) throw new LoiDauVao('Tháng phải có dạng YYYY-MM.');

    // Phat hien vi pham he thong truoc (idempotent), roi gom.
    const phat_hien = await quet_vi_pham(thang, nd.sub);
    const gom = await gom_va_xu_ly_thang(thang, { tu_dong: false });
    await ghi_nhat_ky(nd.sub, 'quet_ky_luat', 'ho_so_ky_luat', null,
      { thang, phat_hien, gom }, req.ip);
    return { phat_hien, gom };
  });

  // ------------------------------------------------------------ duyet (giam thuong >= nguong)
  app.post('/ky-luat/:id/duyet', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 1000 }) ?? null;
    const kq = await duyet_ho_so(id, nd.sub, ghi_chu);
    await ghi_nhat_ky(nd.sub, 'duyet_ky_luat', 'ho_so_ky_luat', id, { ghi_chu, ...kq }, req.ip);
    return { ok: true, ...kq };
  });

  // ------------------------------------------------------------ bac bo / huy
  app.post('/ky-luat/:id/bac-bo', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const ly_do = chuoi_bat_buoc(b, 'ly_do', { toi_thieu: 3, toi_da: 1000 });
    const kq = await bac_bo_ho_so(id, nd.sub, ly_do);
    await ghi_nhat_ky(nd.sub, 'bac_bo_ky_luat', 'ho_so_ky_luat', id, { ly_do, ...kq }, req.ip);
    return { ok: true };
  });
}
