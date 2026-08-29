// API xu ly canh bao ra/vao van phong: danh sach de HR xem, tong hop diem nong, va bam xu ly
// (nhac nho / ky luat / hop le / bo qua). Chi nhan su.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import {
  chuoi, ngay_bat_buoc, trong_tap, uuid, than,
} from '../tien_ich/kiem_tra.ts';
import { xu_ly_canh_bao, type HanhDong } from '../ra_vao/xu_ly.ts';

const MA_LOI = [
  'QUEN_QUET_VAO', 'QUEN_QUET_RA', 'VAO_KHI_DANG_TRONG', 'RA_KHI_DANG_NGOAI', 'CHI_MOT_LAN_QUET',
] as const;
const HANH_DONG = ['nhac_nho', 'ky_luat', 'hop_le', 'bo_qua'] as const;
const TRANG_THAI_LOC = ['chua', 'da_nhac', 'chuyen_ky_luat', 'hop_le', 'bo_qua'] as const;

/** Khoang mac dinh = thang hien tai (theo gio may). */
function khoang(q: Record<string, unknown>): { tu: string; den: string } {
  const hn = ngay_dia_phuong(new Date());
  const den = chuoi({ v: q['den'] }, 'v', { toi_da: 10 }) ?? hn;
  const tu = chuoi({ v: q['tu'] }, 'v', { toi_da: 10 }) ?? `${den.slice(0, 7)}-01`;
  return { tu, den };
}

export async function tuyen_ra_vao(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ danh sach canh bao + xu ly
  app.get('/ra-vao', { preHandler: can_nhan_su }, async (req) => {
    const q = than(req.query) as Record<string, unknown>;
    const { tu, den } = khoang(q);
    const pb = chuoi(q, 'phong_ban', { toi_da: 40 });
    const tt = trong_tap(q, 'trang_thai', TRANG_THAI_LOC);   // undefined = tat ca

    const dieu: string[] = ['cb.ngay between $1 and $2'];
    const ts: unknown[] = [tu, den];
    if (pb !== undefined && pb !== null && pb !== '') {
      ts.push(pb); dieu.push(`nv.phong_ban_id = $${ts.length}`);
    }
    // Loc theo trang thai xu ly: 'chua' = chua co dong xu ly.
    let having = '';
    if (tt === 'chua') having = 'having max(x.trang_thai) is null';
    else if (tt !== null) { ts.push(tt); having = `having max(x.trang_thai) = $${ts.length}`; }

    return truy_van(
      `select cb.nhan_vien_id, cb.ngay::text as ngay, cb.ma_loi,
              count(*)::int as so_lan_ngay,
              min(cb.thoi_diem) as thoi_diem_dau,
              min(cb.mo_ta) as mo_ta,
              nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              max(x.trang_thai) as trang_thai,
              bool_or(x.tu_dong) as tu_dong,
              bool_or(x.da_gui_email) as da_gui_email,
              bool_or(x.da_gui_push) as da_gui_push,
              max(x.vi_pham_id::text) as vi_pham_id,
              max(x.so_lan_thang) as so_lan_thang,
              max(x.ghi_chu) as ghi_chu,
              max(x.cap_nhat_luc) as xu_ly_luc
         from canh_bao_ra_vao cb
         join nhan_vien nv on nv.id = cb.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join xu_ly_ra_vao x
           on x.nhan_vien_id = cb.nhan_vien_id and x.ngay = cb.ngay and x.ma_loi = cb.ma_loi
        where ${dieu.join(' and ')}
        group by cb.nhan_vien_id, cb.ngay, cb.ma_loi, nv.ma_nv, nv.ho_ten, pb.ten
        ${having}
        order by cb.ngay desc, nv.ho_ten
        limit 500`,
      ts,
    );
  });

  // ------------------------------------------------------------ tong hop diem nong
  app.get('/ra-vao/tong-quan', { preHandler: can_nhan_su }, async (req) => {
    const q = than(req.query) as Record<string, unknown>;
    const { tu, den } = khoang(q);

    const [tong, theo_loai, top_nguoi, top_phong] = await Promise.all([
      truy_van_mot<{ tong: number; chua_xu_ly: number; so_nguoi: number }>(
        `with dv as (
           select distinct cb.nhan_vien_id, cb.ngay, cb.ma_loi,
                  (x.trang_thai is null) as chua
             from canh_bao_ra_vao cb
             left join xu_ly_ra_vao x on x.nhan_vien_id = cb.nhan_vien_id
                   and x.ngay = cb.ngay and x.ma_loi = cb.ma_loi
            where cb.ngay between $1 and $2)
         select count(*)::int as tong,
                count(*) filter (where chua)::int as chua_xu_ly,
                count(distinct nhan_vien_id)::int as so_nguoi from dv`,
        [tu, den],
      ),
      truy_van<{ ma_loi: string; so: number; chua: number }>(
        `select cb.ma_loi,
                count(distinct (cb.nhan_vien_id, cb.ngay))::int as so,
                count(distinct (cb.nhan_vien_id, cb.ngay))
                  filter (where x.trang_thai is null)::int as chua
           from canh_bao_ra_vao cb
           left join xu_ly_ra_vao x on x.nhan_vien_id = cb.nhan_vien_id
                 and x.ngay = cb.ngay and x.ma_loi = cb.ma_loi
          where cb.ngay between $1 and $2
          group by cb.ma_loi order by so desc`,
        [tu, den],
      ),
      truy_van<{ nhan_vien_id: string; ma_nv: string; ho_ten: string; phong_ban: string | null;
                 so_canh_bao: number; chua: number }>(
        `select cb.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
                count(distinct (cb.ngay, cb.ma_loi))::int as so_canh_bao,
                count(distinct (cb.ngay, cb.ma_loi))
                  filter (where x.trang_thai is null)::int as chua
           from canh_bao_ra_vao cb
           join nhan_vien nv on nv.id = cb.nhan_vien_id
           left join phong_ban pb on pb.id = nv.phong_ban_id
           left join xu_ly_ra_vao x on x.nhan_vien_id = cb.nhan_vien_id
                 and x.ngay = cb.ngay and x.ma_loi = cb.ma_loi
          where cb.ngay between $1 and $2
          group by cb.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten
          order by so_canh_bao desc limit 10`,
        [tu, den],
      ),
      truy_van<{ phong_ban: string | null; so_canh_bao: number; so_nguoi: number }>(
        `select pb.ten as phong_ban,
                count(distinct (cb.nhan_vien_id, cb.ngay, cb.ma_loi))::int as so_canh_bao,
                count(distinct cb.nhan_vien_id)::int as so_nguoi
           from canh_bao_ra_vao cb
           join nhan_vien nv on nv.id = cb.nhan_vien_id
           left join phong_ban pb on pb.id = nv.phong_ban_id
          where cb.ngay between $1 and $2
          group by pb.ten order by so_canh_bao desc limit 10`,
        [tu, den],
      ),
    ]);

    return { tu, den, tong, theo_loai, top_nguoi, top_phong };
  });

  // ------------------------------------------------------------ bam xu ly mot canh bao
  app.post('/ra-vao/xu-ly', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const nhan_vien_id = uuid(b, 'nhan_vien_id', { bat_buoc: true }) as string;
    const ngay = ngay_bat_buoc(b, 'ngay');
    const ma_loi = trong_tap(b, 'ma_loi', MA_LOI, { bat_buoc: true }) as string;
    const hanh_dong = trong_tap(b, 'hanh_dong', HANH_DONG, { bat_buoc: true }) as HanhDong;
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 1000 }) ?? undefined;

    const kq = await xu_ly_canh_bao(
      { nhan_vien_id, ngay, ma_loi, mo_ta: '' },
      { hanh_dong_ep: hanh_dong, nguoi_id: nd.sub, ghi_chu },
    );
    await ghi_nhat_ky(nd.sub, 'xu_ly_ra_vao', 'xu_ly_ra_vao',
      `${nhan_vien_id}:${ngay}:${ma_loi}`, { hanh_dong, ghi_chu }, req.ip);
    return res.send(kq);
  });
}
