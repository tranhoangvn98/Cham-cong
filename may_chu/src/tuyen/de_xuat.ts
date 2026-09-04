// Duyet DE XUAT & KIEN NGHI + quan ly danh muc loai (phia quan tri).
//
// Nhan vien tu gui qua /api/toi/de-xuat (xem toi.ts). Day la dau DUYET: nguoi duyet (truong
// phong duyet phong minh, nhan su thay tat ca) chap nhan/tu choi; va nhan su quan ly DANH MUC
// loai (them loai moi khong can sua code — dung yeu cau "he thong linh hoat").
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import {
  can_nguoi_duyet, can_nhan_su, nguoi_dung_hien_tai, xem_duoc_tat_ca,
} from '../bao_mat/xac_thuc.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, than, trong_tap, uuid, LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

function lay_id_param(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

/** Chan neu de xuat khong thuoc pham vi cua nguoi duyet (truong phong: cung phong). */
async function trong_pham_vi(
  nd: { vai_tro: string; nv: string | null }, nhan_vien_id: string,
): Promise<void> {
  if (xem_duoc_tat_ca(nd)) return;
  const dong = await truy_van_mot<{ cung_phong: boolean }>(
    `select (nv.phong_ban_id is not null
             and nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)) as cung_phong
       from nhan_vien nv where nv.id = $1`,
    [nhan_vien_id, nd.nv],
  );
  if (dong === null || !dong.cung_phong) {
    throw new LoiKhongTim('Không tìm thấy đề xuất thuộc phạm vi của bạn.');
  }
}

export async function tuyen_de_xuat(app: FastifyInstance): Promise<void> {
  /** Danh sach de xuat cho nguoi duyet, loc theo pham vi + trang thai. */
  app.get('/de-xuat/cho-duyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = than(req.query);
    const trang_thai = trong_tap(q, 'trang_thai',
      ['cho_duyet', 'da_duyet', 'tu_choi', 'da_huy'] as const,
      { mac_dinh: 'cho_duyet' }) as string;
    const tat_ca = xem_duoc_tat_ca(nd);
    return {
      danh_sach: await truy_van(
        `select d.id, d.ma, d.tieu_de, d.noi_dung, d.so_luong, d.trang_thai, d.tao_luc,
                d.ghi_chu_duyet, d.duyet_luc, l.ten as ten_loai,
                nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
           from de_xuat d
           join loai_de_xuat l on l.id = d.loai_de_xuat_id
           join nhan_vien nv on nv.id = d.nhan_vien_id
           left join phong_ban pb on pb.id = nv.phong_ban_id
          where d.trang_thai = $1
            and ($2 or (nv.phong_ban_id is not null
                        and nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3)))
          order by d.tao_luc desc limit 300`,
        [trang_thai, tat_ca, nd.nv],
      ),
    };
  });

  /** So de xuat dang cho duyet trong pham vi — cho badge Duyet don. */
  app.get('/de-xuat/so-cho-duyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const tat_ca = xem_duoc_tat_ca(nd);
    const dong = await truy_van_mot<{ so: number }>(
      `select count(*)::int as so from de_xuat d join nhan_vien nv on nv.id = d.nhan_vien_id
        where d.trang_thai = 'cho_duyet'
          and ($1 or (nv.phong_ban_id is not null
                      and nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)))`,
      [tat_ca, nd.nv],
    );
    return { so: dong?.so ?? 0 };
  });

  /** Duyet hoac tu choi mot de xuat. */
  app.post('/de-xuat/:id/quyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id_param(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tu_choi'] as const,
      { bat_buoc: true }) as 'da_duyet' | 'tu_choi';
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const truoc = await truy_van_mot<{ nhan_vien_id: string; ma: string; tieu_de: string; trang_thai: string }>(
      'select nhan_vien_id, ma, tieu_de, trang_thai from de_xuat where id = $1', [id],
    );
    if (truoc === null) throw new LoiKhongTim('Không tìm thấy đề xuất.');
    if (truoc.trang_thai !== 'cho_duyet') throw new LoiDauVao('Đề xuất đã được xử lý.');
    await trong_pham_vi(nd, truoc.nhan_vien_id);

    await thuc_thi(
      `update de_xuat set trang_thai = $2, nguoi_duyet = $3, ghi_chu_duyet = $4, duyet_luc = now()
        where id = $1`,
      [id, quyet, nd.sub, ghi_chu],
    );
    await ghi_nhat_ky(nd.sub, `de_xuat_${quyet}`, 'de_xuat', id, { ghi_chu }, req.ip);
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(truoc.nhan_vien_id),
      tieu_de: quyet === 'da_duyet' ? `Đề xuất ${truoc.ma} đã được duyệt` : `Đề xuất ${truoc.ma} bị từ chối`,
      noi_dung: ghi_chu === null || ghi_chu === '' ? truoc.tieu_de : `${truoc.tieu_de} — ${ghi_chu}`,
      du_lieu: { man: 'don-cua-toi', loai: 'de_xuat', de_xuat_id: id, quyet_dinh: quyet },
    });
    return { ok: true };
  });

  // ------------------------------------------------------------ danh muc loai (nhan su)
  /** Tat ca loai (ke ca tat) — de nhan su quan ly. */
  app.get('/de-xuat/loai-quan-ly', { preHandler: can_nhan_su }, async () => truy_van(
    `select id, ma_loai, ten, mo_ta, can_so_luong, dang_dung, thu_tu,
            (select count(*) from de_xuat d where d.loai_de_xuat_id = l.id)::int as so_don
       from loai_de_xuat l order by thu_tu, ten`));

  /** Them loai de xuat moi. */
  app.post('/de-xuat/loai', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const ten = chuoi_bat_buoc(b, 'ten', { toi_da: 120, toi_thieu: 2 });
    const mo_ta = chuoi(b, 'mo_ta', { toi_da: 500 });
    const can_so_luong = luan_ly(b, 'can_so_luong') ?? false;
    // Ma loai sinh tu ten: bo dau, thuong hoa, gach duoi. Bao dam duy nhat bang hau to so.
    const goc = (ten.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')) || 'loai';
    let ma_loai = goc;
    for (let i = 2; i <= 50; i++) {
      const co = await truy_van_mot('select 1 from loai_de_xuat where ma_loai = $1', [ma_loai]);
      if (co === null) break;
      ma_loai = `${goc}_${i}`;
    }
    const dong = await truy_van_mot<{ id: string }>(
      `insert into loai_de_xuat(ma_loai, ten, mo_ta, can_so_luong) values ($1,$2,$3,$4)
       returning id`,
      [ma_loai, ten, mo_ta === '' ? null : mo_ta, can_so_luong],
    );
    await ghi_nhat_ky(nd.sub, 'them_loai_de_xuat', 'loai_de_xuat', dong?.id ?? null, { ten }, req.ip);
    return res.code(201).send({ id: dong?.id, ma_loai });
  });

  /** Sua loai: doi ten/mo ta, bat/tat, hoac can_so_luong. */
  app.patch('/de-xuat/loai/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id_param(req);
    const b = than(req.body);
    const ten = chuoi(b, 'ten', { toi_da: 120 });
    const mo_ta = chuoi(b, 'mo_ta', { toi_da: 500 });
    const dang_dung = luan_ly(b, 'dang_dung');
    const can_so_luong = luan_ly(b, 'can_so_luong');
    const kq = await thuc_thi(
      `update loai_de_xuat set
         ten = coalesce($2, ten),
         mo_ta = coalesce($3, mo_ta),
         dang_dung = coalesce($4, dang_dung),
         can_so_luong = coalesce($5, can_so_luong)
       where id = $1`,
      [id, ten === '' ? null : ten, mo_ta, dang_dung, can_so_luong],
    );
    if (kq === 0) throw new LoiKhongTim('Không tìm thấy loại.');
    await ghi_nhat_ky(nd.sub, 'sua_loai_de_xuat', 'loai_de_xuat', id, {}, req.ip);
    return { ok: true };
  });
}
