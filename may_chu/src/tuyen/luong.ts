// API bang luong: tham so phap ly, ky luong, phieu luong, quy trinh gui duyet.
//
// Quy trinh: nhap -> cho_duyet -> da_duyet -> da_tra. Khoa sua tu buoc cho_duyet tro di,
// vi so lieu da gui len cho nguoi khac xem thi khong duoc phep tu doi duoi chan ho.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import {
  can_admin, can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai,
} from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { tinh_ky_luong } from '../luong/ky_luong.ts';
import {
  ban_chot_theo_id, chot_ky, danh_sach_ban_chot, type KetQuaChot,
} from '../luong/ban_chot.ts';
import { doc_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { ghi_nhan_am_tham } from '../sharepoint/dong_bo.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import {
  chuoi, chuoi_bat_buoc, ngay_bat_buoc, so_nguyen, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';

/** Trang thai cho phep sua so lieu. Tu cho_duyet tro di la khoa. */
const SUA_DUOC = new Set(['nhap']);

function so_tien(nguon: Record<string, unknown>, khoa: string, mac_dinh = 0): number {
  const v = nguon[khoa];
  if (v === undefined || v === null || v === '') return mac_dinh;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new LoiDauVao(`Trường ${khoa} phải là số tiền.`);
  if (n < 0) throw new LoiDauVao(`Trường ${khoa} không được âm.`);
  // Tien Viet khong co don vi nho hon dong.
  return Math.round(n);
}

async function lay_ky(id: string): Promise<{ id: string; thang: string; trang_thai: string }> {
  const k = await truy_van_mot<{ id: string; thang: string; trang_thai: string }>(
    'select id, thang, trang_thai from ky_luong where id = $1', [id],
  );
  if (k === null) throw new LoiKhongTim('Không tìm thấy kỳ lương.');
  return k;
}

export async function tuyen_luong(app: FastifyInstance): Promise<void> {
  // ============================================================ tham so phap ly
  app.get('/tham-so-luong', { preHandler: can_nhan_su }, async () => {
    const ds = await truy_van<Record<string, unknown>>(
      'select * from tham_so_luong order by hieu_luc_tu desc',
    );
    const bac = await truy_van<Record<string, unknown>>(
      'select * from bac_thue_tncn order by tham_so_id, bac',
    );
    return ds.map((t) => ({
      ...t,
      bac_thue: bac.filter((b) => b['tham_so_id'] === t['id']),
    }));
  });

  // Chi admin: doi mot con so o day la doi tien luong cua ca cong ty.
  app.post('/tham-so-luong', { preHandler: can_admin }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const hieu_luc_tu = ngay_bat_buoc(b, 'hieu_luc_tu');

    const dong = await truy_van_mot<{ id: string }>(
      `insert into tham_so_luong (
         hieu_luc_tu, ten, luong_co_so, luong_toi_thieu_vung, vung,
         ty_le_bhxh_nld, ty_le_bhyt_nld, ty_le_bhtn_nld,
         ty_le_bhxh_nsdld, ty_le_bhyt_nsdld, ty_le_bhtn_nsdld,
         giam_tru_ban_than, giam_tru_phu_thuoc, can_cu, ghi_chu
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
      [
        hieu_luc_tu,
        chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
        so_tien(b, 'luong_co_so'),
        so_tien(b, 'luong_toi_thieu_vung'),
        so_nguyen(b, 'vung', { min: 1, max: 4 }) ?? 1,
        so_tien(b, 'ty_le_bhxh_nld', 8), so_tien(b, 'ty_le_bhyt_nld', 1.5),
        so_tien(b, 'ty_le_bhtn_nld', 1),
        so_tien(b, 'ty_le_bhxh_nsdld', 17.5), so_tien(b, 'ty_le_bhyt_nsdld', 3),
        so_tien(b, 'ty_le_bhtn_nsdld', 1),
        so_tien(b, 'giam_tru_ban_than'), so_tien(b, 'giam_tru_phu_thuoc'),
        chuoi(b, 'can_cu', { toi_da: 1000 }), chuoi(b, 'ghi_chu', { toi_da: 1000 }),
      ],
    );

    // Sao chep bieu thue tu bo gan nhat truoc do — thue suat it doi hon giam tru gia canh,
    // bat nguoi dung go lai 7 bac moi lan la moi cho de sai.
    await thuc_thi(
      `insert into bac_thue_tncn (tham_so_id, bac, tu_muc, den_muc, thue_suat)
       select $1, bac, tu_muc, den_muc, thue_suat from bac_thue_tncn
        where tham_so_id = (
          select id from tham_so_luong where id <> $1 and hieu_luc_tu <= $2
          order by hieu_luc_tu desc limit 1
        )`,
      [dong!.id, hieu_luc_tu],
    );

    await ghi_nhat_ky(nd.sub, 'tao_tham_so_luong', 'tham_so_luong', dong!.id, b, req.ip);
    return res.code(201).send(dong);
  });

  // ============================================================ ky luong
  app.get('/ky-luong', { preHandler: can_nhan_su }, async () =>
    truy_van(
      `select k.*,
              (select count(*) from phieu_luong where ky_luong_id = k.id)::int as so_phieu,
              (select coalesce(sum(thuc_linh), 0) from phieu_luong where ky_luong_id = k.id) as tong_thuc_linh
         from ky_luong k order by k.thang desc limit 60`,
    ),
  );

  app.get('/ky-luong/:id', { preHandler: can_nhan_su }, async (req) => {
    const k = await lay_ky(lay_id(req));
    const phieu = await truy_van(
      `select p.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
         from phieu_luong p
         join nhan_vien nv on nv.id = p.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where p.ky_luong_id = $1
        order by pb.ten nulls last, nv.ma_nv`,
      [k.id],
    );
    return { ...k, phieu };
  });

  app.post('/ky-luong', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const thang = chuoi_bat_buoc(b, 'thang', { toi_da: 7 });
    if (!/^\d{4}-\d{2}$/.test(thang)) throw new LoiDauVao('Tháng phải có dạng YYYY-MM.');

    const co = await truy_van_mot<{ id: string }>(
      'select id from ky_luong where thang = $1', [thang],
    );
    if (co !== null) throw new LoiXungDot(`Đã có kỳ lương tháng ${thang}.`);

    const dong = await truy_van_mot<{ id: string }>(
      'insert into ky_luong(thang, ten, nguoi_tao) values ($1,$2,$3) returning id',
      [thang, chuoi(b, 'ten', { toi_da: 200 }), nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'tao_ky_luong', 'ky_luong', dong!.id, { thang }, req.ip);
    return res.code(201).send({ ...dong, thang, trang_thai: 'nhap' });
  });

  /** Tinh (hoac tinh lai) toan bo phieu luong cua ky tu du lieu cham cong. */
  app.post('/ky-luong/:id/tinh', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (!SUA_DUOC.has(k.trang_thai)) {
      throw new LoiXungDot(
        `Kỳ lương đang ở trạng thái "${k.trang_thai}" nên không tính lại được. `
        + 'Hãy thu hồi về nháp trước.',
      );
    }
    const so = await tinh_ky_luong(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'tinh_ky_luong', 'ky_luong', k.id, { so_phieu: so }, req.ip);
    return { ok: true, so_phieu: so };
  });

  app.post('/ky-luong/:id/gui-duyet', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (k.trang_thai !== 'nhap') {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${k.trang_thai}", không gửi duyệt được.`);
    }
    const so = await truy_van_mot<{ so: number }>(
      'select count(*)::int as so from phieu_luong where ky_luong_id = $1', [k.id],
    );
    if ((so?.so ?? 0) === 0) {
      throw new LoiDauVao('Kỳ lương chưa có phiếu nào. Bấm "Tính lương" trước khi gửi duyệt.');
    }

    await thuc_thi(
      `update ky_luong set trang_thai = 'cho_duyet', gui_duyet_luc = now(),
              cap_nhat_luc = now() where id = $1`,
      [k.id],
    );
    await ghi_nhat_ky(nd.sub, 'gui_duyet_ky_luong', 'ky_luong', k.id, null, req.ip);
    return { ok: true };
  });

  /** Duyet hoac tra lai. Chi admin — day la buoc chot so tien tra cho nguoi that. */
  app.post('/ky-luong/:id/quyet', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tra_lai'] as const, { bat_buoc: true });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    if (k.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${k.trang_thai}", không quyết được.`);
    }

    let ban_chot: KetQuaChot[] = [];

    if (quyet === 'da_duyet') {
      await thuc_thi(
        `update ky_luong set trang_thai = 'da_duyet', nguoi_duyet = $2, duyet_luc = now(),
                ghi_chu_duyet = $3, cap_nhat_luc = now() where id = $1`,
        [k.id, nd.sub, ghi_chu],
      );

      // KHOA BANG CONG CUA THANG DO. Bang luong vua duyet duoc tinh TU bang cong, nen de
      // bang cong con sua duoc sau khi duyet la de ton tai mot bang luong da chot dua tren
      // nhung con so da doi. `mo-chot-thang` cung bi chan — xem tuyen/bang_cong.ts.
      const { tu, den } = khoang_thang(k.thang);
      await thuc_thi(
        'update bang_cong_ngay set da_chot = true where ngay >= $1 and ngay <= $2',
        [tu, den],
      );

      // Sinh ban chot: bang cham cong thang VA bang luong thang.
      //
      // Duyet la moc duy nhat sinh ra chung, va do la co y: yeu cau la "bang chot cuoi cung
      // SAU KHI DUOC DUYET thi luu SharePoint". Sinh som hon la day len mot ban chua ai chiu
      // trach nhiem.
      ban_chot = await chot_ky(k.thang, nd.sub);
      for (const bc of ban_chot) await ghi_nhan_am_tham(bc.id);
    } else {
      // Tra lai ve nhap de nhan su sua roi gui lai.
      await thuc_thi(
        `update ky_luong set trang_thai = 'nhap', gui_duyet_luc = null,
                ghi_chu_duyet = $2, cap_nhat_luc = now() where id = $1`,
        [k.id, ghi_chu],
      );
    }
    await ghi_nhat_ky(nd.sub, `ky_luong_${quyet}`, 'ky_luong', k.id,
      { ghi_chu, ban_chot: ban_chot.map((x) => ({ loai: x.loai, so_dong: x.so_dong })) },
      req.ip);
    return { ok: true, ban_chot };
  });

  app.post('/ky-luong/:id/da-tra', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (k.trang_thai !== 'da_duyet') {
      throw new LoiXungDot('Chỉ kỳ đã duyệt mới đánh dấu đã trả được.');
    }
    await thuc_thi(
      `update ky_luong set trang_thai = 'da_tra', tra_luc = now(), cap_nhat_luc = now()
        where id = $1`,
      [k.id],
    );
    await ghi_nhat_ky(nd.sub, 'ky_luong_da_tra', 'ky_luong', k.id, null, req.ip);
    return { ok: true };
  });

  /** Thu hoi ve nhap de sua. Chi tu cho_duyet — da duyet roi thi phai tra lai truoc. */
  app.post('/ky-luong/:id/thu-hoi', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (k.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(`Chỉ thu hồi được kỳ đang chờ duyệt (hiện: "${k.trang_thai}").`);
    }
    await thuc_thi(
      `update ky_luong set trang_thai = 'nhap', gui_duyet_luc = null, cap_nhat_luc = now()
        where id = $1`,
      [k.id],
    );
    await ghi_nhat_ky(nd.sub, 'thu_hoi_ky_luong', 'ky_luong', k.id, null, req.ip);
    return { ok: true };
  });

  // ============================================================ sua tay mot phieu
  //
  // Chi cho sua THUONG / PHU CAP KHAC / TRU KHAC / GHI CHU. Cac con so con lai deu suy ra
  // tu cham cong va tham so phap ly — cho sua tay la mo duong cho so lieu khong con doi
  // chieu duoc voi bat cu cai gi.
  app.patch('/phieu-luong/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);

    const p = await truy_van_mot<{ ky_luong_id: string; trang_thai: string }>(
      `select p.ky_luong_id, k.trang_thai from phieu_luong p
         join ky_luong k on k.id = p.ky_luong_id where p.id = $1`,
      [id],
    );
    if (p === null) throw new LoiKhongTim('Không tìm thấy phiếu lương.');
    if (!SUA_DUOC.has(p.trang_thai)) {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${p.trang_thai}" nên phiếu đã khóa sửa.`);
    }

    await thuc_thi(
      `update phieu_luong set
         thuong = $2, phu_cap_khac = $3, tru_khac = $4,
         ly_do_tru_khac = $5, ghi_chu = $6, sua_boi = $7, sua_luc = now()
       where id = $1`,
      [
        id, so_tien(b, 'thuong'), so_tien(b, 'phu_cap_khac'), so_tien(b, 'tru_khac'),
        chuoi(b, 'ly_do_tru_khac', { toi_da: 500 }),
        chuoi(b, 'ghi_chu', { toi_da: 500 }), nd.sub,
      ],
    );

    // Tinh lai ca ky de tong khop voi tung dong.
    const k = await lay_ky(p.ky_luong_id);
    await tinh_ky_luong(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'sua_phieu_luong', 'phieu_luong', id, b, req.ip);
    return { ok: true };
  });

  // ============================================================ phieu luong cua toi
  //
  // Nhan vien chi thay phieu cua CHINH MINH, va chi khi ky da duoc duyet: so lieu dang
  // nhap co the con sai, bay ra roi sua lai la nguon khieu nai.
  app.get('/toi/phieu-luong', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    if (nd.nv === null) return [];
    return truy_van(
      `select p.*, k.thang, k.trang_thai as trang_thai_ky
         from phieu_luong p
         join ky_luong k on k.id = p.ky_luong_id
        where p.nhan_vien_id = $1 and k.trang_thai in ('da_duyet','da_tra')
        order by k.thang desc limit 24`,
      [nd.nv],
    );
  });

  // ============================================================ xuat CSV
  app.get('/ky-luong/:id/xuat-csv', { preHandler: can_nhan_su }, async (req, res) => {
    const k = await lay_ky(lay_id(req));
    return xuat_bang_luong(req, res, k.id, k.thang);
  });

  // ------------------------------------------------------------ ban chot

  /**
   * Danh sach ban chot da duyet. Nhan su xem duoc.
   *
   * Day la thu tra loi cau "bang thang 8 chot luc nao, ai chot" ma khong phai doc log.
   */
  app.get('/ban-chot', { preHandler: can_nhan_su }, async () => ({
    danh_sach: await danh_sach_ban_chot(),
  }));

  /**
   * Tai mot ban chot ve.
   *
   * LUON tra ve dang tai xuong, khong bao gio mo trong tab — cung ly do nhu tep ho so:
   * webapp va tep dung chung mot goc, nen mot tep mo inline chay duoc script trong ngu canh
   * cua chinh webapp.
   */
  app.get('/ban-chot/:id/tai', { preHandler: can_nhan_su },
    async (req: FastifyRequest, res: FastifyReply) => {
      const b = await ban_chot_theo_id(lay_id(req));
      if (b === null) throw new LoiKhongTim('Không tìm thấy bản chốt.');
      const du_lieu = await doc_tep_ho_so(b.ten_luu);
      if (du_lieu === null) {
        throw new LoiKhongTim('Bản chốt có dòng trong cơ sở dữ liệu nhưng tệp không còn trên đĩa.');
      }
      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'tai_ban_chot', 'ban_chot',
        lay_id(req), {}, req.ip);
      return res
        .header('content-type', b.kieu_mime)
        .header('content-disposition',
          `attachment; filename="${b.ten_goc.replace(/[^\w.-]/g, '_')}"`)
        .send(du_lieu);
    });
}

async function xuat_bang_luong(
  req: FastifyRequest, res: FastifyReply, ky_id: string, thang: string,
): Promise<unknown> {
  const dong = await truy_van<Record<string, unknown>>(
    `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban, p.*
       from phieu_luong p
       join nhan_vien nv on nv.id = p.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where p.ky_luong_id = $1
      order by pb.ten nulls last, nv.ma_nv`,
    [ky_id],
  );

  const cot: [string, string][] = [
    ['Mã NV', 'ma_nv'], ['Họ tên', 'ho_ten'], ['Phòng ban', 'phong_ban'],
    ['Lương cơ bản', 'luong_co_ban'], ['Phụ cấp', 'phu_cap'],
    ['Ngày công chuẩn', 'so_ngay_cong_chuan'], ['Ngày công thực', 'so_ngay_cong_thuc'],
    ['Lương theo công', 'luong_theo_cong'], ['Phút OT', 'phut_ot'], ['Tiền OT', 'tien_ot'],
    ['Thưởng', 'thuong'], ['Phụ cấp khác', 'phu_cap_khac'], ['Tổng thu nhập', 'tong_thu_nhap'],
    ['Mức đóng BH', 'muc_dong_bh'],
    ['BHXH (NLĐ)', 'bhxh_nld'], ['BHYT (NLĐ)', 'bhyt_nld'], ['BHTN (NLĐ)', 'bhtn_nld'],
    ['BHXH (Cty)', 'bhxh_nsdld'], ['BHYT (Cty)', 'bhyt_nsdld'], ['BHTN (Cty)', 'bhtn_nsdld'],
    ['Số người phụ thuộc', 'so_nguoi_phu_thuoc'], ['Tổng giảm trừ', 'giam_tru_tong'],
    ['Thu nhập tính thuế', 'thu_nhap_tinh_thue'], ['Thuế TNCN', 'thue_tncn'],
    ['Trừ khác', 'tru_khac'], ['Lý do trừ khác', 'ly_do_tru_khac'],
    ['Tổng trừ', 'tong_tru'], ['Thực lĩnh', 'thuc_linh'], ['Ghi chú', 'ghi_chu'],
  ];

  const csv = '﻿' + [
    cot.map((c) => c[0]),
    ...dong.map((d) => cot.map((c) => d[c[1]])),
  ].map((r) => r.map(o_csv).join(',')).join('\r\n');

  await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_bang_luong', 'ky_luong',
    ky_id, { thang, so_dong: dong.length }, req.ip);

  return res
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', `attachment; filename="bang_luong_${thang}.csv"`)
    .send(csv);
}

function o_csv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const an_toan = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(an_toan) ? `"${an_toan.replace(/"/g, '""')}"` : an_toan;
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;


}
