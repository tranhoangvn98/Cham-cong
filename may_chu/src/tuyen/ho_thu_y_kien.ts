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
import { cau_hinh } from '../cau_hinh.ts';
import { can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { la_vai_tro_nhan_su } from '../bao_mat/quyen_ho_so.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, chuoi_bat_buoc, than, trong_tap, uuid, LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';
import { doc_tep_ho_so, lam_sach_ten, luu_tep_ho_so, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import {
  CAC_LOAI_HO_THU, CAC_TRANG_THAI_HO_THU, doc_ho_thu, dong_ho_thu, tiep_nhan_ho_thu,
  tra_loi_ho_thu,
} from '../ho_thu_y_kien/nghiep_vu.ts';
import {
  email_ho_thu_dong, email_ho_thu_tiep_nhan, email_nhan_su_tra_loi,
} from '../ho_thu_y_kien/email.ts';

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
         join nhan_vien nv on nv.id = h.nhan_vien_id and nv.dang_hoat_dong
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

  // ------------------------------------------------------------ thu da gui (thu di cua Nhan su)
  // Dang ky TRUOC route /:id de duong tinh khong bi nuot vao tham so :id.
  app.get('/ho-thu-y-kien/thu-da-gui', { preHandler: can_nhan_su }, async (req) => {
    const q = than(req.query) as Record<string, unknown>;
    const loai = trong_tap(q, 'loai', CAC_LOAI_HO_THU) as string | null;
    return truy_van(
      `select r.id, r.noi_dung, r.tao_luc,
              coalesce(nv2.ho_ten, u.ten_dang_nhap) as nguoi_gui,
              h.id as ho_thu_id, h.ma as ma_ho_thu, h.tieu_de, h.loai, h.trang_thai,
              nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
         from ho_thu_y_kien_tra_loi r
         join ho_thu_y_kien h on h.id = r.ho_thu_id
         left join nguoi_dung u on u.id = r.nguoi_dung_id
         left join nhan_vien nv2 on nv2.id = u.nhan_vien_id
         join nhan_vien nv on nv.id = h.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where r.vai = 'nhan_su'
          and ($1::text is null or h.loai = $1)
        order by r.tao_luc desc limit 500`,
      [loai],
    );
  });

  // ------------------------------------------------------------ anh dinh kem (nhan su)
  // Nhan su gan ANH minh chung khi tra loi ho thu. Tai dung he thong tep ho so (nhom
  // 'ho_thu_y_kien', thuoc_id = ho thu). Chi anh; magic byte da kiem trong luu_tep_ho_so,
  // chan them theo mime. Ho thu da dong thi khong gan them duoc.
  app.post('/ho-thu-y-kien/:id/anh', {
    preHandler: can_nhan_su,
    bodyLimit: cau_hinh.tep_toi_da_byte + 1024 * 1024,
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const ht = await truy_van_mot<{ nhan_vien_id: string | null; trang_thai: string }>(
      'select nhan_vien_id, trang_thai from ho_thu_y_kien where id = $1', [id],
    );
    if (ht === null) throw new LoiKhongTim('Không tìm thấy hòm thư ý kiến.');
    if (ht.trang_thai === 'da_dong') {
      throw new LoiXungDot('Hòm thư đã hoàn tất, không đính kèm thêm được.');
    }

    let du_lieu: Buffer | null = null;
    let ten_goc = 'anh';
    for await (const phan of req.parts({ limits: { fileSize: cau_hinh.tep_toi_da_byte } })) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'anh') { await phan.toBuffer(); continue; }
        ten_goc = lam_sach_ten(phan.filename ?? 'anh');
        du_lieu = await phan.toBuffer();
      }
    }
    if (du_lieu === null) throw new LoiDauVao('Thiếu ảnh đính kèm.');

    // Thu muc tep mang MA NV + HO TEN cua nguoi lao dong (chu ho thu) — lay tu ban ghi.
    const nv = ht.nhan_vien_id === null
      ? null
      : await truy_van_mot<{ ma_nv: string; ho_ten: string }>(
        'select ma_nv, ho_ten from nhan_vien where id = $1', [ht.nhan_vien_id]);
    const da_luu = await luu_tep_ho_so(du_lieu, ten_goc, {
      ma_nv: nv?.ma_nv ?? 'NV', ho_ten: nv?.ho_ten ?? '',
      nhom: 'ho_thu_y_kien', ngay: ngay_dia_phuong(new Date()),
    });
    if (!da_luu.mime.startsWith('image/')) {
      await xoa_tep_ho_so(da_luu.ten_luu).catch(() => { /* da co loi that o tren */ });
      throw new LoiDauVao('Chỉ đính kèm được tệp ảnh (jpg, png…).');
    }
    let moi: Record<string, unknown> | null;
    try {
      moi = await truy_van_mot(
        `insert into ho_so_tep(id, nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                               kich_thuoc, tai_len_boi)
         values ($1,$2,'ho_thu_y_kien',$3,$4,$5,$6,$7,$8)
         returning id, ten_goc`,
        [da_luu.ma_tep, ht.nhan_vien_id, id, ten_goc, da_luu.ten_luu, da_luu.mime,
          da_luu.kich_thuoc, nd.sub],
      );
    } catch (loi) {
      await xoa_tep_ho_so(da_luu.ten_luu).catch(() => { /* da co loi that o tren */ });
      throw loi;
    }
    await ghi_nhat_ky(nd.sub, 'ho_thu_y_kien.dinh_kem_anh', 'ho_thu_y_kien', id,
      { tep_id: moi?.['id'] ?? null }, req.ip);
    return res.code(201).send({ id: moi?.['id'] ?? null, ten: ten_goc });
  });

  // Dang ky TRUOC route /:id de chuoi 'anh' khong bi nuot vao tham so :id.
  // Xem anh dinh kem cua mot ho thu: nhan su xem duoc het; nguoi khac chi xem anh cua ho
  // thu CUA MINH. Tra 404 (khong phai 403) khi khong duoc xem — de khong lo su ton tai.
  app.get('/ho-thu-y-kien/anh/:tep_id', { preHandler: can_dang_nhap }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const p = req.params as Record<string, string>;
    const tep_id = uuid({ id: p['tep_id'] }, 'id', { bat_buoc: true }) as string;
    const t = await truy_van_mot<{ ten_luu: string; kieu_mime: string; nhan_vien_id: string | null }>(
      `select ten_luu, kieu_mime, nhan_vien_id from ho_so_tep
        where id = $1 and nhom = 'ho_thu_y_kien'`,
      [tep_id],
    );
    if (t === null) throw new LoiKhongTim('Không tìm thấy ảnh.');
    if (!la_vai_tro_nhan_su(nd.vai_tro) && !(nd.nv !== null && nd.nv === t.nhan_vien_id)) {
      throw new LoiKhongTim('Không tìm thấy ảnh.');
    }
    const buf = await doc_tep_ho_so(t.ten_luu);
    if (buf === null) throw new LoiKhongTim('Không tìm thấy tệp ảnh trên đĩa.');
    return res
      .header('content-type', t.kieu_mime)
      .header('cache-control', 'private, max-age=3600')
      .send(buf);
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

  // ------------------------------------------------------------ nhan su tiep nhan (bam Xem)
  // Mo ho thu 'moi' lan dau -> chuyen thanh 'dang_xem' (Da tiep nhan) + bao email nguoi lao
  // dong rang y kien da duoc tiep nhan. Web goi ngay khi hop thoai chi tiet mo ra.
  app.post('/ho-thu-y-kien/:id/tiep-nhan', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const hien = await truy_van_mot<{ nhan_vien_id: string | null }>(
      'select nhan_vien_id from ho_thu_y_kien where id = $1', [id]);
    if (hien === null) throw new LoiKhongTim('Không tìm thấy hòm thư ý kiến.');

    const { ho_thu, vua_chuyen } = await tiep_nhan_ho_thu(id, nd.sub);
    if (vua_chuyen) {
      await ghi_nhat_ky(nd.sub, 'ho_thu_y_kien.tiep_nhan', 'ho_thu_y_kien', id, null, req.ip);
      if (hien.nhan_vien_id !== null) {
        gui_ngam({
          nguoi_dung_ids: await tai_khoan_cua_nhan_vien(hien.nhan_vien_id).catch(() => []),
          tieu_de: 'Hòm thư ý kiến đã được tiếp nhận',
          noi_dung: 'Phòng Nhân sự đã tiếp nhận ý kiến của bạn và sẽ phản hồi sớm.',
          du_lieu: { man: 'ho-thu-y-kien', ho_thu_id: id },
        });
      }
      void email_ho_thu_tiep_nhan(id);
    }
    return { ok: true, trang_thai: ho_thu.trang_thai };
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
    // Ket luan xu ly (tuy chon): de trong thi email lay tra loi cuoi cua Nhan su lam ket luan;
    // khong co tra loi nao thi dung loi cam on chung.
    const ket_luan = chuoi(than(req.body) as Record<string, unknown>, 'ket_luan', { toi_da: 2000 });
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
    void email_ho_thu_dong(id, ket_luan);
    return { ok: true };
  });
}
