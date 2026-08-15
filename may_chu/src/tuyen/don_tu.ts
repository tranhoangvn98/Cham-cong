// API don tu: nghi phep, giai trinh quen quet, va duyet lan quet bang dien thoai.
// Nhan vien tao don o /api/toi/*; day la phia NGUOI DUYET (nhan su / truong phong).
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_nguoi_duyet, nguoi_dung_hien_tai, xem_duoc_tat_ca } from '../bao_mat/xac_thuc.ts';
import { tinh_lai_ngay, tinh_lai_khoang } from '../cong/tinh_cong.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { ngay_dia_phuong, ngay_viet } from '../tien_ich/thoi_gian.ts';
import {
  chuoi, than, trong_tap, uuid, LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

const TRANG_THAI_DON = ['cho_duyet', 'da_duyet', 'tu_choi', 'da_huy'] as const;

/**
 * Truong phong chi duyet don cua nhan vien trong phong minh.
 * Nem LoiKhongTim (khong phai 403) de khong tiet lo don cua phong khac co ton tai.
 */
async function bat_buoc_trong_pham_vi(
  nd: { vai_tro: string; nv: string | null },
  nhan_vien_id: string,
): Promise<void> {
  if (xem_duoc_tat_ca(nd)) return;
  const dong = await truy_van_mot<{ cung_phong: boolean }>(
    `select (nv.phong_ban_id is not null
             and nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)) as cung_phong
       from nhan_vien nv where nv.id = $1`,
    [nhan_vien_id, nd.nv],
  );
  if (dong === null || !dong.cung_phong) {
    throw new LoiKhongTim('Không tìm thấy đơn thuộc phạm vi của bạn.');
  }
}

export async function tuyen_don_tu(app: FastifyInstance): Promise<void> {
  // ================================================================ NGHI PHEP
  app.get('/nghi-phep', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const trang_thai = trong_tap(q, 'trang_thai', TRANG_THAI_DON);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    return truy_van(
      `select d.id, d.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              d.loai, d.tu_ngay, d.den_ngay, d.nua_ngay, d.ly_do, d.trang_thai,
              d.ghi_chu_duyet, d.tao_luc, d.quyet_luc, nd2.ten_dang_nhap as nguoi_duyet
         from don_nghi_phep d
         join nhan_vien nv on nv.id = d.nhan_vien_id
         left join phong_ban pb  on pb.id = nv.phong_ban_id
         left join nguoi_dung nd2 on nd2.id = d.nguoi_duyet_id
        where ($1::text is null or d.trang_thai = $1)
          and ($2::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3))
        order by case when d.trang_thai = 'cho_duyet' then 0 else 1 end, d.tao_luc desc
        limit 300`,
      [trang_thai, chi_phong_minh, nd.nv],
    );
  });

  app.post('/nghi-phep/:id/quyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tu_choi'] as const, { bat_buoc: true });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const don = await truy_van_mot<{
      nhan_vien_id: string; tu_ngay: string; den_ngay: string;
      trang_thai: string; loai: string; nua_ngay: boolean;
    }>(
      `select nhan_vien_id, tu_ngay, den_ngay, trang_thai, loai, nua_ngay
         from don_nghi_phep where id = $1`,
      [id],
    );
    if (don === null) throw new LoiKhongTim('Không tìm thấy đơn nghỉ phép.');
    if (don.trang_thai !== 'cho_duyet') {
      throw new LoiDauVao(`Đơn đã ở trạng thái "${don.trang_thai}", không thể quyết lại.`);
    }
    await bat_buoc_trong_pham_vi(nd, don.nhan_vien_id);

    await trong_giao_dich(async (khach) => {
      await khach.query(
        `update don_nghi_phep
            set trang_thai = $2, nguoi_duyet_id = $3, ghi_chu_duyet = $4, quyet_luc = now()
          where id = $1 and trang_thai = 'cho_duyet'`,
        [id, quyet, nd.sub, ghi_chu],
      );

      if (quyet === 'da_duyet') {
        const nv = await khach.query<{ ma_nv: string; ma_erp: string | null }>(
          'select ma_nv, ma_erp from nhan_vien where id = $1', [don.nhan_vien_id],
        );
        await ghi_su_kien('nghi_phep.da_duyet', {
          don_id: id,
          nhan_vien_id: don.nhan_vien_id,
          ma_nv: nv.rows[0]?.ma_nv ?? null,
          ma_erp: nv.rows[0]?.ma_erp ?? null,
          loai: don.loai,
          tu_ngay: don.tu_ngay,
          den_ngay: don.den_ngay,
          so_ngay: don.nua_ngay
            ? 0.5
            : (Date.parse(`${don.den_ngay}T00:00:00Z`) - Date.parse(`${don.tu_ngay}T00:00:00Z`))
              / 86_400_000 + 1,
        }, khach);
      }
    });

    // Duyet/tu choi deu doi trang thai ngay cong -> tinh lai khoang ngay cua don.
    const so = await tinh_lai_khoang(don.tu_ngay, don.den_ngay, don.nhan_vien_id);
    await ghi_nhat_ky(nd.sub, `nghi_phep_${quyet}`, 'don_nghi_phep', id, { ghi_chu }, req.ip);

    const khoang = don.tu_ngay === don.den_ngay
      ? ngay_viet(don.tu_ngay)
      : `${ngay_viet(don.tu_ngay)} – ${ngay_viet(don.den_ngay)}`;
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(don.nhan_vien_id),
      tieu_de: quyet === 'da_duyet' ? 'Đơn nghỉ phép đã được duyệt' : 'Đơn nghỉ phép bị từ chối',
      noi_dung: ghi_chu === null || ghi_chu === '' ? khoang : `${khoang} — ${ghi_chu}`,
      du_lieu: { man: 'don-tu', loai: 'nghi_phep', don_id: id, quyet_dinh: quyet },
    });

    return { ok: true, so_ngay_da_tinh_lai: so };
  });

  // ================================================================ GIAI TRINH
  app.get('/giai-trinh', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const trang_thai = trong_tap(q, 'trang_thai', TRANG_THAI_DON);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    return truy_van(
      `select d.id, d.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              d.ngay, d.gio_vao_de_xuat, d.gio_ra_de_xuat, d.ly_do, d.trang_thai,
              d.ghi_chu_duyet, d.tao_luc, d.quyet_luc,
              bc.gio_vao as gio_vao_thuc, bc.gio_ra as gio_ra_thuc, bc.trang_thai as trang_thai_cong
         from don_giai_trinh d
         join nhan_vien nv on nv.id = d.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join bang_cong_ngay bc on bc.nhan_vien_id = d.nhan_vien_id and bc.ngay = d.ngay
        where ($1::text is null or d.trang_thai = $1)
          and ($2::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3))
        order by case when d.trang_thai = 'cho_duyet' then 0 else 1 end, d.tao_luc desc
        limit 300`,
      [trang_thai, chi_phong_minh, nd.nv],
    );
  });

  app.post('/giai-trinh/:id/quyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tu_choi'] as const, { bat_buoc: true });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const don = await truy_van_mot<{ nhan_vien_id: string; ngay: string; trang_thai: string }>(
      'select nhan_vien_id, ngay, trang_thai from don_giai_trinh where id = $1',
      [id],
    );
    if (don === null) throw new LoiKhongTim('Không tìm thấy đơn giải trình.');
    if (don.trang_thai !== 'cho_duyet') {
      throw new LoiDauVao(`Đơn đã ở trạng thái "${don.trang_thai}", không thể quyết lại.`);
    }
    await bat_buoc_trong_pham_vi(nd, don.nhan_vien_id);

    await truy_van(
      `update don_giai_trinh
          set trang_thai = $2, nguoi_duyet_id = $3, ghi_chu_duyet = $4, quyet_luc = now()
        where id = $1 and trang_thai = 'cho_duyet'`,
      [id, quyet, nd.sub, ghi_chu],
    );

    // Don da duyet ghi de gio vao/ra -> phai tinh lai ngay do.
    const kq = await tinh_lai_ngay(don.nhan_vien_id, don.ngay);
    await ghi_nhat_ky(nd.sub, `giai_trinh_${quyet}`, 'don_giai_trinh', id, { ghi_chu }, req.ip);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(don.nhan_vien_id),
      tieu_de: quyet === 'da_duyet' ? 'Đơn giải trình đã được duyệt' : 'Đơn giải trình bị từ chối',
      noi_dung: ghi_chu === null || ghi_chu === ''
        ? `Ngày ${ngay_viet(don.ngay)}`
        : `Ngày ${ngay_viet(don.ngay)} — ${ghi_chu}`,
      du_lieu: { man: 'don-tu', loai: 'giai_trinh', don_id: id, quyet_dinh: quyet },
    });

    return {
      ok: true,
      da_tinh_lai: kq !== null,
      luu_y: kq === null ? 'Ngày này đã chốt bảng công nên không tính lại. Hãy mở chốt trước.' : undefined,
    };
  });

  // ================================================================ DUYET QUET DIEN THOAI
  app.get('/quet-dien-thoai', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);
    return truy_van(
      `select lq.id, lq.nhan_vien_id, nv.ma_nv, nv.ho_ten, lq.thoi_diem, lq.trang_thai,
              lq.vi_do, lq.kinh_do, lq.do_chinh_xac_m, lq.khoang_cach_m, lq.gps_gia_lap,
              lq.anh_ten_tep, lq.ghi_chu, lq.trang_thai_duyet, dd.ten as dia_diem
         from lan_quet lq
         join nhan_vien nv on nv.id = lq.nhan_vien_id
         left join dia_diem dd on dd.id = lq.dia_diem_id
        where lq.nguon = 'dien_thoai' and lq.trang_thai_duyet = 'cho_duyet'
          and ($1::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2))
        order by lq.thoi_diem desc limit 300`,
      [chi_phong_minh, nd.nv],
    );
  });

  app.post('/quet-dien-thoai/:id/quyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tu_choi'] as const, { bat_buoc: true });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const lq = await truy_van_mot<{ nhan_vien_id: string | null; thoi_diem: Date; trang_thai_duyet: string }>(
      'select nhan_vien_id, thoi_diem, trang_thai_duyet from lan_quet where id = $1',
      [id],
    );
    if (lq === null || lq.nhan_vien_id === null) throw new LoiKhongTim('Không tìm thấy lần quẹt.');
    if (lq.trang_thai_duyet !== 'cho_duyet') {
      throw new LoiDauVao('Lần quẹt này đã được xử lý.');
    }
    await bat_buoc_trong_pham_vi(nd, lq.nhan_vien_id);

    await truy_van(
      `update lan_quet
          set trang_thai_duyet = $2, nguoi_duyet_id = $3, duyet_luc = now(),
              ghi_chu = coalesce($4, ghi_chu)
        where id = $1 and trang_thai_duyet = 'cho_duyet'`,
      [id, quyet, nd.sub, ghi_chu],
    );

    const ng = ngay_dia_phuong(lq.thoi_diem);
    const kq = await tinh_lai_ngay(lq.nhan_vien_id, ng);
    await ghi_nhat_ky(nd.sub, `quet_dien_thoai_${quyet}`, 'lan_quet', id, { ngay: ng }, req.ip);
    return { ok: true, da_tinh_lai: kq !== null };
  });
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}
