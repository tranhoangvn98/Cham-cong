// Routes /ho-thu-y-kien/* — quan ly HOM THU Y KIEN (goc quan tri).
//
// HOM THU Y KIEN tiep nhan TAT CA phan anh / yeu cau / gop y / thac mac cua nhan su, va ca
// y kien cho ban du thao van ban AI (loai 'du_thao'). Khac voi don tu khieu nai: day la kenh
// lang nghe + giai dap, hoi thoai hai chieu cho den khi nhan su DONG ho thu.
//
// Phan chia trach nhiem: route chi nhan HTTP, kiem quyen, goi module nghiep vu, roi goi
// fire-and-forget (gui_ngam + email) sau khi du lieu da luu xong — khong cho HTTP ra ngoai
// vao luong request.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi_bat_buoc, than, trong_tap, uuid, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';
import {
  CAC_LOAI_HO_THU, CAC_TRANG_THAI_HO_THU, doc_ho_thu, dong_ho_thu, tra_loi_ho_thu,
} from '../ho_thu_y_kien/nghiep_vu.ts';
import { email_ho_thu_dong, email_nhan_su_tra_loi } from '../ho_thu_y_kien/email.ts';

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

export async function tuyen_ho_thu_y_kien(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ danh sach ho thu
  app.get('/ho-thu-y-kien', { preHandler: can_nhan_su }, async (req) => {
    const q = than(req.query) as Record<string, unknown>;
    const loai = trong_tap(q, 'loai', CAC_LOAI_HO_THU) as string | null;
    const trang_thai = trong_tap(q, 'trang_thai', CAC_TRANG_THAI_HO_THU) as string | null;
    const nhap_ai_id = uuid(q, 'nhap_ai_id');
    return truy_van(
      `select h.id, h.ma, h.loai, h.tieu_de, h.trang_thai, h.tao_luc, h.dong_luc,
              h.nhap_ai_id, n.ma as ma_van_ban,
              nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              (select count(*) from ho_thu_y_kien_tra_loi r where r.ho_thu_id = h.id)::int
                as so_tra_loi
         from ho_thu_y_kien h
         join nhan_vien nv on nv.id = h.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join thong_bao_nhap_ai n on n.id = h.nhap_ai_id
        where ($1::text is null or h.loai = $1)
          and ($2::text is null or h.trang_thai = $2)
          and ($3::uuid is null or h.nhap_ai_id = $3)
        order by (h.trang_thai in ('moi', 'dang_xem')) desc, h.tao_luc desc
        limit 500`,
      [loai, trang_thai, nhap_ai_id],
    );
  });

  // ------------------------------------------------------------ chi tiet ho thu
  app.get('/ho-thu-y-kien/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const h = await doc_ho_thu(id);
    const nv = await truy_van_mot<{ ma_nv: string; ho_ten: string; phong_ban: string | null }>(
      `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
         from nhan_vien nv
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where nv.id = $1`,
      [h.nhan_vien_id],
    );
    const vb = h.nhap_ai_id === null
      ? null
      : await truy_van_mot<{ ma: string; trang_thai: string }>(
        'select ma, trang_thai from thong_bao_nhap_ai where id = $1', [h.nhap_ai_id]);
    return {
      ...h,
      nhan_vien: nv === null ? null : { ma_nv: nv.ma_nv, ho_ten: nv.ho_ten, phong_ban: nv.phong_ban },
      van_ban: vb,
    };
  });

  // ------------------------------------------------------------ nhan su tra loi
  app.post('/ho-thu-y-kien/:id/tra-loi', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const noi_dung = chuoi_bat_buoc(than(req.body) as Record<string, unknown>, 'noi_dung',
      { toi_thieu: 1, toi_da: 2000 });

    const hien = await truy_van_mot<{ nhan_vien_id: string | null }>(
      'select nhan_vien_id from ho_thu_y_kien where id = $1', [id]);
    if (hien === null) throw new LoiKhongTim('Không tìm thấy hòm thư ý kiến.');

    const sau = await tra_loi_ho_thu(id, 'nhan_su', nd.sub, noi_dung);
    await ghi_nhat_ky(nd.sub, 'ho_thu_y_kien.tra_loi', 'ho_thu_y_kien', id, null, req.ip);

    if (hien.nhan_vien_id !== null) {
      gui_ngam({
        nguoi_dung_ids: await tai_khoan_cua_nhan_vien(hien.nhan_vien_id).catch(() => []),
        tieu_de: 'Hòm thư ý kiến có phản hồi mới',
        noi_dung: 'Phòng Nhân sự vừa trả lời ý kiến của bạn.',
        du_lieu: { man: 'ho-thu-y-kien', ho_thu_id: id },
      });
    }
    void email_nhan_su_tra_loi(id, noi_dung);
    return { ok: true, trang_thai: sau.trang_thai };
  });

  // ------------------------------------------------------------ nhan su dong ho thu
  app.post('/ho-thu-y-kien/:id/dong', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const hien = await truy_van_mot<{ nhan_vien_id: string | null }>(
      'select nhan_vien_id from ho_thu_y_kien where id = $1', [id]);
    if (hien === null) throw new LoiKhongTim('Không tìm thấy hòm thư ý kiến.');

    await dong_ho_thu(id, nd.sub);
    await ghi_nhat_ky(nd.sub, 'ho_thu_y_kien.dong', 'ho_thu_y_kien', id, null, req.ip);

    if (hien.nhan_vien_id !== null) {
      gui_ngam({
        nguoi_dung_ids: await tai_khoan_cua_nhan_vien(hien.nhan_vien_id).catch(() => []),
        tieu_de: 'Hòm thư ý kiến đã hoàn tất',
        noi_dung: 'Phòng Nhân sự đã đóng hòm thư ý kiến của bạn. Cảm ơn bạn đã chia sẻ.',
        du_lieu: { man: 'ho-thu-y-kien', ho_thu_id: id },
      });
    }
    void email_ho_thu_dong(id);
    return { ok: true };
  });
}
