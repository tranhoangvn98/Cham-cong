// API vi pham noi quy lao dong: danh muc, quy tac tu phat hien, ban ghi vi pham.
//
// Toan bo tep nay bam theo BLLD 2019:
//   Dieu 122 — ky luat phai co hop, nguoi lao dong duoc giai trinh, phai lap bien ban.
//   Dieu 124 — chi bon hinh thuc ky luat.
//   Dieu 127 — CAM phat tien, cam cat luong thay ky luat. Khong endpoint nao o day dong
//              den bang luong, va khong co truong so tien nao.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import {
  can_dang_nhap, can_nhan_su, can_nguoi_duyet, nguoi_dung_hien_tai, xem_duoc_tat_ca,
} from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { ngay_viet } from '../tien_ich/thoi_gian.ts';
import { quet_vi_pham } from '../vi_pham/phat_hien.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, ngay_bat_buoc, so_nguyen, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';

const NHOM = ['gio_giac', 'noi_quy', 'an_toan', 'tai_san', 'thai_do', 'khac'] as const;
const MUC_DO = ['nhe', 'trung', 'nang'] as const;
/** BLLD 2019 Dieu 124 + 'nhac_nho' (khong phai ky luat chinh thuc). */
const KY_LUAT = ['nhac_nho', 'khien_trach', 'keo_dai_nang_luong', 'cach_chuc', 'sa_thai'] as const;
const CHI_SO = [
  'so_lan_di_muon', 'tong_phut_muon', 'so_lan_ve_som', 'tong_phut_ve_som',
  'so_ngay_vang', 'so_ngay_thieu_gio', 'so_lan_quen_quet',
] as const;
const TOAN_TU = ['>=', '>', '=', '<=', '<'] as const;

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

export async function tuyen_vi_pham(app: FastifyInstance): Promise<void> {
  // ============================================================ danh muc loai vi pham
  app.get('/loai-vi-pham', { preHandler: can_nguoi_duyet }, async () =>
    truy_van(
      `select l.*,
              (select count(*) from quy_tac_vi_pham where loai_vi_pham_id = l.id)::int as so_quy_tac
         from loai_vi_pham l order by l.nhom, l.ma`,
    ),
  );

  app.post('/loai-vi-pham', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const dong = await truy_van_mot<{ id: string }>(
      `insert into loai_vi_pham (ma, ten, mo_ta, nhom, muc_do, ky_luat_de_xuat, diem_tru_kpi, dang_bat)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [
        chuoi_bat_buoc(b, 'ma', { toi_da: 40 }).toUpperCase(),
        chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
        chuoi(b, 'mo_ta', { toi_da: 1000 }),
        trong_tap(b, 'nhom', NHOM, { mac_dinh: 'khac' }),
        trong_tap(b, 'muc_do', MUC_DO, { mac_dinh: 'nhe' }),
        trong_tap(b, 'ky_luat_de_xuat', KY_LUAT),
        so_nguyen(b, 'diem_tru_kpi', { min: 0, max: 100 }) ?? 0,
        luan_ly(b, 'dang_bat', true),
      ],
    );
    await ghi_nhat_ky(nd.sub, 'tao_loai_vi_pham', 'loai_vi_pham', dong!.id, b, req.ip);
    return res.code(201).send(dong);
  });

  app.patch('/loai-vi-pham/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    await thuc_thi(
      `update loai_vi_pham set
         ten = coalesce($2, ten), mo_ta = coalesce($3, mo_ta),
         nhom = coalesce($4, nhom), muc_do = coalesce($5, muc_do),
         ky_luat_de_xuat = coalesce($6, ky_luat_de_xuat),
         diem_tru_kpi = coalesce($7, diem_tru_kpi),
         dang_bat = coalesce($8, dang_bat), cap_nhat_luc = now()
       where id = $1`,
      [
        id, chuoi(b, 'ten', { toi_da: 200 }), chuoi(b, 'mo_ta', { toi_da: 1000 }),
        trong_tap(b, 'nhom', NHOM), trong_tap(b, 'muc_do', MUC_DO),
        trong_tap(b, 'ky_luat_de_xuat', KY_LUAT),
        so_nguyen(b, 'diem_tru_kpi', { min: 0, max: 100 }),
        Object.hasOwn(b, 'dang_bat') ? luan_ly(b, 'dang_bat', true) : null,
      ],
    );
    await ghi_nhat_ky(nd.sub, 'sua_loai_vi_pham', 'loai_vi_pham', id, b, req.ip);
    return { ok: true };
  });

  // ============================================================ quy tac tu phat hien
  app.get('/quy-tac-vi-pham', { preHandler: can_nhan_su }, async () =>
    truy_van(
      `select q.*, l.ten as ten_loai, l.ma as ma_loai
         from quy_tac_vi_pham q join loai_vi_pham l on l.id = q.loai_vi_pham_id
        order by l.ma, q.ten`,
    ),
  );

  app.post('/quy-tac-vi-pham', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const dong = await truy_van_mot<{ id: string }>(
      `insert into quy_tac_vi_pham (loai_vi_pham_id, ten, chi_so, toan_tu, nguong, dang_bat, ghi_chu)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [
        uuid(b, 'loai_vi_pham_id', { bat_buoc: true }),
        chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
        trong_tap(b, 'chi_so', CHI_SO, { bat_buoc: true }),
        trong_tap(b, 'toan_tu', TOAN_TU, { mac_dinh: '>=' }),
        so_nguyen(b, 'nguong', { min: 0, max: 100000 }) ?? 0,
        // Mac dinh TAT: nguong phai doi chieu noi quy lao dong da dang ky truoc khi bat.
        luan_ly(b, 'dang_bat', false),
        chuoi(b, 'ghi_chu', { toi_da: 500 }),
      ],
    );
    await ghi_nhat_ky(nd.sub, 'tao_quy_tac_vi_pham', 'quy_tac_vi_pham', dong!.id, b, req.ip);
    return res.code(201).send(dong);
  });

  app.patch('/quy-tac-vi-pham/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    await thuc_thi(
      `update quy_tac_vi_pham set
         ten = coalesce($2, ten), chi_so = coalesce($3, chi_so),
         toan_tu = coalesce($4, toan_tu), nguong = coalesce($5, nguong),
         dang_bat = coalesce($6, dang_bat), ghi_chu = coalesce($7, ghi_chu)
       where id = $1`,
      [
        id, chuoi(b, 'ten', { toi_da: 200 }), trong_tap(b, 'chi_so', CHI_SO),
        trong_tap(b, 'toan_tu', TOAN_TU), so_nguyen(b, 'nguong', { min: 0, max: 100000 }),
        Object.hasOwn(b, 'dang_bat') ? luan_ly(b, 'dang_bat', false) : null,
        chuoi(b, 'ghi_chu', { toi_da: 500 }),
      ],
    );
    await ghi_nhat_ky(nd.sub, 'sua_quy_tac_vi_pham', 'quy_tac_vi_pham', id, b, req.ip);
    return { ok: true };
  });

  app.delete('/quy-tac-vi-pham/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    await thuc_thi('delete from quy_tac_vi_pham where id = $1', [id]);
    await ghi_nhat_ky(nd.sub, 'xoa_quy_tac_vi_pham', 'quy_tac_vi_pham', id, null, req.ip);
    return { ok: true };
  });

  /** Quet mot thang: ghi nhan vi pham cho ai vuot nguong. Chi tao ban ghi 'moi'. */
  app.post('/vi-pham/quet', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const thang = chuoi_bat_buoc(b, 'thang', { toi_da: 7 });
    if (!/^\d{4}-\d{2}$/.test(thang)) throw new LoiDauVao('Tháng phải có dạng YYYY-MM.');

    const kq = await quet_vi_pham(thang, nd.sub);
    await ghi_nhat_ky(nd.sub, 'quet_vi_pham', 'vi_pham', null, { thang, ...kq }, req.ip);
    return kq;
  });

  // ============================================================ ban ghi vi pham
  app.get('/vi-pham', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const trang_thai = chuoi(q, 'trang_thai', { toi_da: 20 });
    const nhan_vien_id = uuid(q, 'nhan_vien_id');
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    return truy_van(
      `select v.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              l.ma as ma_loai, l.ten as ten_loai, l.muc_do, l.diem_tru_kpi
         from vi_pham v
         join nhan_vien nv on nv.id = v.nhan_vien_id
         join loai_vi_pham l on l.id = v.loai_vi_pham_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where ($1::text is null or v.trang_thai = $1)
          and ($2::uuid is null or v.nhan_vien_id = $2)
          and ($3::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $4))
        order by v.ngay desc, v.tao_luc desc
        limit 500`,
      [trang_thai, nhan_vien_id, chi_phong_minh, nd.nv],
    );
  });

  /** Ghi nhan thu cong. Nguoi ghi la quan ly/nhan su, khac han duong may tu phat hien. */
  app.post('/vi-pham', { preHandler: can_nguoi_duyet }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const nhan_vien_id = uuid(b, 'nhan_vien_id', { bat_buoc: true }) as string;
    const ngay = ngay_bat_buoc(b, 'ngay');

    const dong = await truy_van_mot<{ id: string }>(
      `insert into vi_pham
         (nhan_vien_id, loai_vi_pham_id, nguon, ngay, ky, mo_ta, trang_thai, nguoi_ghi)
       values ($1,$2,'nguoi',$3,$4,$5,'moi',$6) returning id`,
      [
        nhan_vien_id, uuid(b, 'loai_vi_pham_id', { bat_buoc: true }),
        ngay, ngay.slice(0, 7), chuoi(b, 'mo_ta', { toi_da: 2000 }), nd.sub,
      ],
    );
    await ghi_nhat_ky(nd.sub, 'ghi_vi_pham', 'vi_pham', dong!.id, b, req.ip);

    // Bao cho nguoi lao dong biet de con giai trinh — Dieu 122 cho ho quyen do.
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(nhan_vien_id),
      tieu_de: 'Có ghi nhận vi phạm cần bạn giải trình',
      noi_dung: `Ngày ${ngay_viet(ngay)}. Vào mục Vi phạm để gửi giải trình.`,
      du_lieu: { man: 'vi-pham', vi_pham_id: dong!.id },
    });

    return res.code(201).send(dong);
  });

  /**
   * Quyet mot vi pham: xac nhan, bac bo, hoac ap dung ky luat.
   *
   * Bat buoc co bien ban truoc khi ghi hinh thuc ky luat — Dieu 122 khoan 1 diem c doi
   * cuoc hop xu ly ky luat phai duoc lap thanh bien ban.
   */
  app.post('/vi-pham/:id/quyet', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_xac_nhan', 'bac_bo', 'da_xu_ly'] as const,
      { bat_buoc: true });
    const ky_luat = trong_tap(b, 'ky_luat', KY_LUAT);
    const bien_ban_id = uuid(b, 'bien_ban_id');

    const vp = await truy_van_mot<{ nhan_vien_id: string; trang_thai: string; ngay: string }>(
      'select nhan_vien_id, trang_thai, to_char(ngay, \'YYYY-MM-DD\') as ngay from vi_pham where id = $1',
      [id],
    );
    if (vp === null) throw new LoiKhongTim('Không tìm thấy vi phạm.');
    if (vp.trang_thai === 'da_xu_ly') {
      throw new LoiXungDot('Vi phạm đã xử lý xong, không quyết lại được.');
    }

    // Hai hinh thuc nang nhat bat buoc phai co bien ban hop.
    if (ky_luat !== null && ky_luat !== 'nhac_nho' && bien_ban_id === null) {
      throw new LoiDauVao(
        'Áp dụng kỷ luật phải kèm biên bản cuộc họp xử lý kỷ luật '
        + '(Bộ luật Lao động 2019, Điều 122). Hãy lập biên bản trong hồ sơ nhân sự trước.',
      );
    }

    await thuc_thi(
      `update vi_pham set trang_thai = $2, ky_luat = $3, bien_ban_id = $4,
              ghi_chu = coalesce($5, ghi_chu), nguoi_xu_ly = $6, xu_ly_luc = now(),
              cap_nhat_luc = now()
        where id = $1`,
      [id, quyet, ky_luat, bien_ban_id, chuoi(b, 'ghi_chu', { toi_da: 1000 }), nd.sub],
    );
    await ghi_nhat_ky(nd.sub, `vi_pham_${quyet}`, 'vi_pham', id, b, req.ip);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(vp.nhan_vien_id),
      tieu_de: quyet === 'bac_bo' ? 'Vi phạm đã được bãi bỏ' : 'Kết quả xử lý vi phạm',
      noi_dung: `Ngày ${ngay_viet(vp.ngay)}`,
      du_lieu: { man: 'vi-pham', vi_pham_id: id, quyet_dinh: quyet },
    });

    return { ok: true };
  });

  // ============================================================ phia nguoi lao dong
  /** Vi pham cua CHINH MINH. Nguoi lao dong phai thay duoc de con giai trinh. */
  app.get('/toi/vi-pham', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    if (nd.nv === null) return [];
    return truy_van(
      `select v.id, v.ngay, v.mo_ta, v.trang_thai, v.giai_trinh, v.giai_trinh_luc,
              v.ky_luat, v.ghi_chu, l.ten as ten_loai, l.muc_do
         from vi_pham v join loai_vi_pham l on l.id = v.loai_vi_pham_id
        where v.nhan_vien_id = $1
        order by v.ngay desc limit 100`,
      [nd.nv],
    );
  });

  /** Gui giai trinh. BLLD 2019 Dieu 122 khoan 1 diem c: nguoi lao dong co quyen tu bao chua. */
  app.post('/toi/vi-pham/:id/giai-trinh', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const noi_dung = chuoi_bat_buoc(b, 'giai_trinh', { toi_thieu: 5, toi_da: 2000 });

    const vp = await truy_van_mot<{ trang_thai: string }>(
      'select trang_thai from vi_pham where id = $1 and nhan_vien_id = $2', [id, nd.nv],
    );
    if (vp === null) throw new LoiKhongTim('Không tìm thấy vi phạm của bạn.');
    if (vp.trang_thai === 'da_xu_ly') {
      throw new LoiXungDot('Vi phạm đã xử lý xong. Nếu không đồng ý, hãy gửi khiếu nại.');
    }

    await thuc_thi(
      `update vi_pham set giai_trinh = $2, giai_trinh_luc = now(),
              trang_thai = case when trang_thai = 'moi' then 'cho_giai_trinh' else trang_thai end,
              cap_nhat_luc = now()
        where id = $1`,
      [id, noi_dung],
    );
    await ghi_nhat_ky(nd.sub, 'gui_giai_trinh_vi_pham', 'vi_pham', id, null, req.ip);
    return { ok: true };
  });
}
