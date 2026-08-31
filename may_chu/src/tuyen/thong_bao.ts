// Quan ly THONG BAO (BGD/HR) + VAN BAN CONG TY — phia quan tri.
//
// Nhan vien thuong DOC qua /api/toi/thong-bao va /api/toi/van-ban (xem toi.ts). Day la dau TAO:
// chi nhan su (can_nhan_su) moi dang thong bao / tai van ban len. Giai trinh cua nhan vien cho
// cac thong bao 'can_giai_trinh' duoc liet ke o /api/thong-bao/giai-trinh de HR quan ly CHUNG voi
// khieu nai (chu cong ty chot: giai trinh noi vao muc Khieu nai & giai trinh san co).
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { luu_van_ban_cong_ty, lam_sach_ten, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { cau_hinh } from '../cau_hinh.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, ngay, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

const MUC_DO = ['thuong', 'quan_trong', 'khan'] as const;
const PHAM_VI = ['toan_cong_ty', 'phong_ban'] as const;
const DANH_MUC_VB = ['noi_quy', 'bieu_mau', 'chinh_sach', 'huong_dan', 'khac'] as const;

function lay_id_param(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

export async function tuyen_thong_bao(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ THONG BAO (quan tri)
  /** Danh sach thong bao + so nguoi da doc / da giai trinh. */
  app.get('/thong-bao', { preHandler: can_nhan_su }, async () => truy_van(
    `select tb.id, tb.ma, tb.tieu_de, tb.noi_dung, tb.muc_do, tb.can_giai_trinh, tb.pham_vi,
            tb.phong_ban_id, pb.ten as phong_ban, tb.tao_luc, tb.het_han, tb.da_go,
            (select count(*) from thong_bao_da_doc dd where dd.thong_bao_id = tb.id)::int as so_da_doc,
            (select count(*) from thong_bao_da_doc dd
              where dd.thong_bao_id = tb.id and dd.giai_trinh is not null)::int as so_giai_trinh
       from thong_bao tb left join phong_ban pb on pb.id = tb.phong_ban_id
      order by tb.tao_luc desc limit 300`));

  /** Tao thong bao moi. */
  app.post('/thong-bao', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const tieu_de = chuoi_bat_buoc(b, 'tieu_de', { toi_da: 250, toi_thieu: 3 });
    const noi_dung = chuoi_bat_buoc(b, 'noi_dung', { toi_da: 8000, toi_thieu: 3 });
    const muc_do = trong_tap(b, 'muc_do', MUC_DO, { bat_buoc: false }) ?? 'thuong';
    const can_giai_trinh = luan_ly(b, 'can_giai_trinh') ?? false;
    const pham_vi = trong_tap(b, 'pham_vi', PHAM_VI, { bat_buoc: false }) ?? 'toan_cong_ty';
    const phong_ban_id = pham_vi === 'phong_ban'
      ? uuid(b, 'phong_ban_id', { bat_buoc: true }) as string : null;
    const het_han = b['het_han'] === undefined || b['het_han'] === null || b['het_han'] === ''
      ? null : ngay(b, 'het_han');

    const dong = await truy_van_mot<{ id: string; ma: string }>(
      `insert into thong_bao(tieu_de, noi_dung, muc_do, can_giai_trinh, pham_vi, phong_ban_id,
                             nguoi_tao, het_han)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, ma`,
      [tieu_de, noi_dung, muc_do, can_giai_trinh, pham_vi, phong_ban_id, nd.sub, het_han],
    );
    await ghi_nhat_ky(nd.sub, 'tao_thong_bao', 'thong_bao', dong?.id ?? null,
      { pham_vi, muc_do, can_giai_trinh }, req.ip);
    return res.code(201).send(dong);
  });

  /** Sua thong bao: go xuong hoac dat lai han. */
  app.patch('/thong-bao/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id_param(req);
    const b = than(req.body);
    const da_go = luan_ly(b, 'da_go');
    if (da_go === null) throw new LoiDauVao('Không có thay đổi nào.');
    const kq = await thuc_thi('update thong_bao set da_go = $2 where id = $1', [id, da_go]);
    if (kq === 0) throw new LoiKhongTim('Không tìm thấy thông báo.');
    await ghi_nhat_ky(nd.sub, da_go ? 'go_thong_bao' : 'khoi_phuc_thong_bao', 'thong_bao', id,
      {}, req.ip);
    return { ok: true };
  });

  /** Ai da doc / chua doc mot thong bao (kem giai trinh neu co). */
  app.get('/thong-bao/:id/da-doc', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id_param(req);
    return truy_van(
      `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              dd.doc_luc, dd.giai_trinh, dd.giai_trinh_luc, dd.ma as ma_giai_trinh
         from thong_bao_da_doc dd
         join nhan_vien nv on nv.id = dd.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where dd.thong_bao_id = $1
        order by dd.doc_luc desc`,
      [id],
    );
  });

  /** Tat ca GIAI TRINH cho thong bao — de HR quan ly chung voi khieu nai. */
  app.get('/thong-bao/giai-trinh', { preHandler: can_nhan_su }, async () => truy_van(
    `select dd.ma, dd.giai_trinh, dd.giai_trinh_luc,
            nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
            tb.ma as ma_thong_bao, tb.tieu_de
       from thong_bao_da_doc dd
       join thong_bao tb on tb.id = dd.thong_bao_id
       join nhan_vien nv on nv.id = dd.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where dd.giai_trinh is not null
      order by dd.giai_trinh_luc desc limit 300`));

  // ------------------------------------------------------------ VAN BAN CONG TY (quan tri)
  /** Danh sach van ban (ke ca da go — quan ly). */
  app.get('/van-ban', { preHandler: can_nhan_su }, async () => truy_van(
    `select vb.id, vb.ma, vb.tieu_de, vb.mo_ta, vb.danh_muc, vb.ten_goc, vb.mime,
            vb.kich_thuoc, vb.tao_luc, vb.da_go, (vb.ten_luu is not null) as co_tep
       from van_ban_cong_ty vb order by vb.tao_luc desc limit 500`));

  /** Tai mot van ban len (multipart: tep + tieu_de + danh_muc + mo_ta). */
  app.post('/van-ban', {
    preHandler: can_nhan_su,
    bodyLimit: cau_hinh.tep_toi_da_byte + 1024 * 1024,
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const truong: Record<string, string> = {};
    let du_lieu: Buffer | null = null;
    let ten_goc = 'van-ban';
    for await (const phan of req.parts({ limits: { fileSize: cau_hinh.tep_toi_da_byte } })) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'tep') { await phan.toBuffer(); continue; }
        ten_goc = lam_sach_ten(phan.filename ?? 'van-ban');
        du_lieu = await phan.toBuffer();
      } else if (typeof phan.value === 'string') {
        truong[phan.fieldname] = phan.value;
      }
    }
    const tieu_de = chuoi_bat_buoc(truong, 'tieu_de', { toi_da: 250, toi_thieu: 3 });
    const danh_muc = trong_tap(truong, 'danh_muc', DANH_MUC_VB, { bat_buoc: false }) ?? 'khac';
    const mo_ta = chuoi(truong, 'mo_ta', { toi_da: 1000 });
    if (du_lieu === null) throw new LoiDauVao('Thiếu tệp văn bản.');

    const da_luu = await luu_van_ban_cong_ty(du_lieu, ten_goc, danh_muc, ngay_dia_phuong(new Date()));
    let dong: { id: string; ma: string } | null;
    try {
      dong = await truy_van_mot(
        `insert into van_ban_cong_ty(tieu_de, mo_ta, danh_muc, ten_luu, ten_goc, mime, kich_thuoc,
                                     nguoi_tao)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, ma`,
        [tieu_de, mo_ta === '' ? null : mo_ta, danh_muc, da_luu.ten_luu, ten_goc, da_luu.mime,
          da_luu.kich_thuoc, nd.sub],
      );
    } catch (loi) {
      // Tep da nam tren dia truoc khi co dong CSDL. Ghi that bai -> xoa tep mo coi.
      await xoa_tep_ho_so(da_luu.ten_luu);
      throw loi;
    }
    await ghi_nhat_ky(nd.sub, 'tai_van_ban', 'van_ban_cong_ty', dong?.id ?? null,
      { danh_muc }, req.ip);
    return res.code(201).send(dong);
  });

  /** Go mot van ban (soft delete — con luu tep de khoi phuc). */
  app.patch('/van-ban/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id_param(req);
    const b = than(req.body);
    const da_go = luan_ly(b, 'da_go');
    if (da_go === null) throw new LoiDauVao('Không có thay đổi nào.');
    const kq = await thuc_thi('update van_ban_cong_ty set da_go = $2 where id = $1', [id, da_go]);
    if (kq === 0) throw new LoiKhongTim('Không tìm thấy văn bản.');
    await ghi_nhat_ky(nd.sub, da_go ? 'go_van_ban' : 'khoi_phuc_van_ban', 'van_ban_cong_ty', id,
      {}, req.ip);
    return { ok: true };
  });
}
