// API bang cong, nhat ky quet tho, dashboard va xuat CSV cho webapp HR.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai, xem_duoc_tat_ca } from '../bao_mat/xac_thuc.ts';
import { cau_hinh, OFFSET_MAY_MS } from '../cau_hinh.ts';
import { dashboard_cho } from '../dashboard/theo_vai_tro.ts';
import { tinh_lai_khoang } from '../cong/tinh_cong.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { khoang_thang, ngay_dia_phuong, phut_thanh_chu } from '../tien_ich/thoi_gian.ts';
import { NHAN_TRANG_THAI, nhan_cach_xac_thuc } from '../adms/giao_thuc.ts';
import {
  chuoi, khoang_ngay, luan_ly, ngay_bat_buoc, phan_trang, so_nguyen, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

// Nhan hien thi cho ke toan doc trong Excel — co dau day du (tep CSV co BOM UTF-8).
const NHAN_TRANG_THAI_NGAY: Record<string, string> = {
  vang: 'Vắng',
  co_mat: 'Có mặt',
  nghi_phep: 'Nghỉ phép',
  ngay_le: 'Ngày lễ',
  nghi_tuan: 'Nghỉ tuần',
};

/**
 * Dieu kien SQL gioi han pham vi nhan vien theo vai tro.
 * - admin / nhan_su : tat ca
 * - truong_phong    : nhan vien cung phong ban voi minh
 * - nhan_vien       : chi chinh minh
 * Tra ve manh SQL + tham so bo sung (dat sau cac tham so co san).
 */
function pham_vi_nhan_vien(
  nd: { vai_tro: string; nv: string | null },
  bang: string,
  chi_so_tham_so: number,
): { sql: string; tham_so: unknown[] } {
  if (xem_duoc_tat_ca(nd)) return { sql: 'true', tham_so: [] };
  if (nd.vai_tro === 'nhan_vien') {
    return { sql: `${bang}.id = $${chi_so_tham_so}`, tham_so: [nd.nv] };
  }
  // truong_phong: cung phong ban (kem chinh minh du chua gan phong ban)
  return {
    sql: `(${bang}.id = $${chi_so_tham_so}
           or ${bang}.phong_ban_id = (select phong_ban_id from nhan_vien where id = $${chi_so_tham_so}))`,
    tham_so: [nd.nv],
  };
}

export async function tuyen_bang_cong(app: FastifyInstance): Promise<void> {
  // ============================================================ bang cong theo khoang
  app.get('/bang-cong', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 92);
    const nhan_vien_id = uuid(q, 'nhan_vien_id');
    const phong_ban_id = uuid(q, 'phong_ban_id');
    const pv = pham_vi_nhan_vien(nd, 'nv', 5);

    return truy_van(
      `select bc.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              bc.ngay, bc.trang_thai, bc.gio_vao, bc.gio_ra,
              bc.phut_lam, bc.phut_muon, bc.phut_ve_som, bc.phut_ot,
              bc.so_cong, bc.co_dieu_chinh, bc.da_chot, bc.ghi_chu
         from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where bc.ngay >= $1 and bc.ngay <= $2
          and ($3::uuid is null or bc.nhan_vien_id = $3)
          and ($4::uuid is null or nv.phong_ban_id = $4)
          and ${pv.sql}
        order by nv.ho_ten, bc.ngay`,
      [tu, den, nhan_vien_id, phong_ban_id, ...pv.tham_so],
    );
  });

  // ============================================================ tong hop thang
  app.get('/bang-cong/tong-hop', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const thang = chuoi(q, 'thang', { bat_buoc: true, toi_da: 7 }) as string;
    const { tu, den } = khoang_thang(thang);
    const phong_ban_id = uuid(q, 'phong_ban_id');
    const pv = pham_vi_nhan_vien(nd, 'nv', 4);

    return truy_van(
      `select nv.id as nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              coalesce(sum(bc.so_cong), 0)                                  as tong_cong,
              coalesce(sum(bc.phut_lam), 0)::int                            as tong_phut_lam,
              coalesce(sum(bc.phut_ot), 0)::int                             as tong_phut_ot,
              coalesce(sum(bc.phut_muon), 0)::int                           as tong_phut_muon,
              coalesce(sum(bc.phut_ve_som), 0)::int                         as tong_phut_ve_som,
              count(*) filter (where bc.trang_thai = 'co_mat')::int         as so_ngay_co_mat,
              count(*) filter (where bc.trang_thai = 'vang')::int           as so_ngay_vang,
              count(*) filter (where bc.trang_thai = 'nghi_phep')::int      as so_ngay_nghi_phep,
              count(*) filter (where bc.phut_muon > 0)::int                 as so_lan_di_muon
         from nhan_vien nv
         left join bang_cong_ngay bc
                on bc.nhan_vien_id = nv.id and bc.ngay >= $1 and bc.ngay <= $2
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where nv.dang_hoat_dong = true
          and ($3::uuid is null or nv.phong_ban_id = $3)
          and ${pv.sql}
        group by nv.id, nv.ma_nv, nv.ho_ten, pb.ten
        order by nv.ho_ten`,
      [tu, den, phong_ban_id, ...pv.tham_so],
    );
  });

  // ============================================================ xuat CSV cho ke toan
  //
  // Hai kieu, vi hai nguoi doc khac nhau:
  //   kieu=thang  moi nhan vien MOT dong — dung de tinh luong, khop voi bang dang xem
  //               tren man hinh Bang cong.
  //   kieu=ngay   moi ngay mot dong — dung de doi chieu khi nhan vien thac mac ve mot
  //               ngay cu the.
  //
  // Mac dinh 'ngay' de khong doi hanh vi cua nhung link da phat ra truoc do.
  app.get('/bang-cong/xuat-csv', { preHandler: can_nhan_su }, async (req, res) => {
    const q = req.query as Record<string, unknown>;
    const thang = chuoi(q, 'thang', { bat_buoc: true, toi_da: 7 }) as string;
    const kieu = trong_tap(q, 'kieu', ['ngay', 'thang'] as const) ?? 'ngay';
    const { tu, den } = khoang_thang(thang);

    if (kieu === 'thang') {
      return xuat_tong_hop_thang(req, res, thang, tu, den);
    }

    const dong = await truy_van<Record<string, unknown>>(
      `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban, bc.ngay, bc.trang_thai,
              bc.gio_vao, bc.gio_ra, bc.phut_lam, bc.phut_muon, bc.phut_ve_som,
              bc.phut_ot, bc.so_cong, bc.ghi_chu
         from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where bc.ngay >= $1 and bc.ngay <= $2
        order by nv.ma_nv, bc.ngay`,
      [tu, den],
    );

    const tieu_de = [
      'Mã NV', 'Họ tên', 'Phòng ban', 'Ngày', 'Trạng thái', 'Giờ vào', 'Giờ ra',
      'Phút làm', 'Phút muộn', 'Phút về sớm', 'Phút OT', 'Số công', 'Ghi chú',
    ];
    const hang = dong.map((d) => [
      d['ma_nv'], d['ho_ten'], d['phong_ban'], d['ngay'],
      NHAN_TRANG_THAI_NGAY[String(d['trang_thai'])] ?? d['trang_thai'],
      gio_hhmm(d['gio_vao']), gio_hhmm(d['gio_ra']),
      d['phut_lam'], d['phut_muon'], d['phut_ve_som'], d['phut_ot'], d['so_cong'],
      d['ghi_chu'],
    ]);

    // BOM UTF-8 de Excel tren Windows doc dung tieng Viet.
    const csv = '﻿' + [tieu_de, ...hang].map((r) => r.map(o_csv).join(',')).join('\r\n');

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_bang_cong', 'bang_cong_ngay',
      null, { thang, so_dong: hang.length }, req.ip);

    return res
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="bang_cong_chi_tiet_${thang}.csv"`)
      .send(csv);
  });

  // ============================================================ tinh lai bang cong
  app.post('/bang-cong/tinh-lai', { preHandler: can_nhan_su }, async (req) => {
    const b = than(req.body);
    const { tu, den } = khoang_ngay(b, 92);
    const nhan_vien_id = uuid(b, 'nhan_vien_id');
    const so = await tinh_lai_khoang(tu, den, nhan_vien_id ?? undefined);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'tinh_lai_bang_cong', 'bang_cong_ngay',
      null, { tu, den, nhan_vien_id, so_ngay: so }, req.ip);
    return { ok: true, so_ngay_da_tinh: so };
  });

  // ============================================================ sua tay mot ngay cong
  app.patch('/bang-cong/:nhan_vien_id/:ngay', { preHandler: can_nhan_su }, async (req) => {
    const p = req.params as Record<string, string>;
    const nhan_vien_id = uuid({ id: p['nhan_vien_id'] }, 'id', { bat_buoc: true }) as string;
    const ng = ngay_bat_buoc({ ngay: p['ngay'] }, 'ngay');
    const b = than(req.body);

    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });
    const da_chot = luan_ly(b, 'da_chot');
    const so_cong = b['so_cong'] === undefined ? null : Number(b['so_cong']);
    if (so_cong !== null && (!Number.isFinite(so_cong) || so_cong < 0 || so_cong > 2)) {
      throw new LoiDauVao('Số công phải trong khoảng 0 đến 2.');
    }
    const phut_ot = so_nguyen(b, 'phut_ot', { min: 0, max: 1440 });

    const so = await thuc_thi(
      `update bang_cong_ngay
          set ghi_chu = coalesce($3, ghi_chu),
              da_chot = coalesce($4, da_chot),
              so_cong = coalesce($5, so_cong),
              phut_ot = coalesce($6, phut_ot),
              co_dieu_chinh = true,
              tinh_luc = now()
        where nhan_vien_id = $1 and ngay = $2`,
      [nhan_vien_id, ng, ghi_chu, da_chot, so_cong, phut_ot],
    );
    if (so === 0) throw new LoiKhongTim('Chưa có dòng bảng công cho nhân viên/ngày này.');

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'sua_bang_cong', 'bang_cong_ngay',
      `${nhan_vien_id}|${ng}`, { so_cong, phut_ot, da_chot, ghi_chu }, req.ip);
    return { ok: true };
  });

  // ============================================================ chot ca thang
  app.post('/bang-cong/chot-thang', { preHandler: can_nhan_su }, async (req) => {
    const b = than(req.body);
    const thang = chuoi(b, 'thang', { bat_buoc: true, toi_da: 7 }) as string;
    const { tu, den } = khoang_thang(thang);
    const so = await thuc_thi(
      'update bang_cong_ngay set da_chot = true where ngay >= $1 and ngay <= $2 and da_chot = false',
      [tu, den],
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'chot_thang', 'bang_cong_ngay',
      null, { thang, so_dong: so }, req.ip);
    return { ok: true, so_dong_da_chot: so, luu_y: 'Dòng đã chốt sẽ không bị tính lại.' };
  });

  app.post('/bang-cong/mo-chot-thang', { preHandler: can_nhan_su }, async (req) => {
    const b = than(req.body);
    const thang = chuoi(b, 'thang', { bat_buoc: true, toi_da: 7 }) as string;
    const { tu, den } = khoang_thang(thang);
    const so = await thuc_thi(
      'update bang_cong_ngay set da_chot = false where ngay >= $1 and ngay <= $2 and da_chot = true',
      [tu, den],
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'mo_chot_thang', 'bang_cong_ngay',
      null, { thang, so_dong: so }, req.ip);
    return { ok: true, so_dong_da_mo: so };
  });

  // ============================================================ nhat ky quet tho
  app.get('/lan-quet', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 31);
    const loc = doc_loc_lan_quet(q);
    const { gioi_han, bo_qua } = phan_trang(q, 200, 1000);
    const pv = pham_vi_nhan_vien(nd, 'nv', 9);

    const dong = await truy_van<Record<string, unknown>>(
      `select lq.id, lq.nguon, lq.thiet_bi_serial, lq.pin_may, lq.thoi_diem,
              lq.trang_thai, lq.xac_thuc, lq.trang_thai_duyet,
              lq.vi_do, lq.kinh_do, lq.khoang_cach_m, lq.anh_ten_tep, lq.ghi_chu,
              lq.nhan_vien_id, nv.ma_nv, nv.ho_ten,
              dd.ten as dia_diem, tb.ten as thiet_bi
         from lan_quet lq
         left join nhan_vien nv on nv.id = lq.nhan_vien_id
         left join dia_diem  dd on dd.id = lq.dia_diem_id
         left join thiet_bi  tb on tb.serial = lq.thiet_bi_serial
        ${DIEU_KIEN_LAN_QUET(pv.sql)}
        order by lq.thoi_diem desc
        limit $7 offset $8`,
      [tu, den, loc.nhan_vien_id, loc.thiet_bi_serial, loc.nguon, loc.trang_thai_duyet,
       gioi_han, bo_qua, ...pv.tham_so],
    );

    return dong.map((d) => ({
      ...d,
      nhan_trang_thai: NHAN_TRANG_THAI[Number(d['trang_thai'])] ?? 'Khac',
      nhan_xac_thuc: nhan_cach_xac_thuc(Number(d['xac_thuc'])),
    }));
  });

  /**
   * Xuat log cham cong tho ra CSV — de doi chieu voi ERP hoac gui kem khi giai trinh.
   *
   * Khong gioi han 300 dong nhu tren giao dien: xuat het khoang ngay da chon, tran 50.000
   * dong de mot cu bam khong keo sap CSDL.
   */
  app.get('/lan-quet/xuat-csv', { preHandler: can_nhan_su }, async (req, res) => {
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 92);
    const loc = doc_loc_lan_quet(q);

    const dong = await truy_van<Record<string, unknown>>(
      `select lq.thoi_diem, nv.ma_nv, nv.ho_ten, lq.pin_may, lq.trang_thai, lq.xac_thuc,
              lq.nguon, lq.trang_thai_duyet, lq.thiet_bi_serial, tb.ten as thiet_bi,
              dd.ten as dia_diem, lq.khoang_cach_m, lq.ghi_chu
         from lan_quet lq
         left join nhan_vien nv on nv.id = lq.nhan_vien_id
         left join dia_diem  dd on dd.id = lq.dia_diem_id
         left join thiet_bi  tb on tb.serial = lq.thiet_bi_serial
        ${DIEU_KIEN_LAN_QUET('true')}
        order by lq.thoi_diem
        limit 50000`,
      [tu, den, loc.nhan_vien_id, loc.thiet_bi_serial, loc.nguon, loc.trang_thai_duyet],
    );

    const tieu_de = [
      'Thời điểm', 'Mã NV', 'Họ tên', 'PIN máy', 'Loại', 'Cách xác thực', 'Nguồn',
      'Trạng thái duyệt', 'Serial máy', 'Tên máy', 'Địa điểm', 'Khoảng cách (m)', 'Ghi chú',
    ];
    const hang = dong.map((d) => [
      moc_gio_may(d['thoi_diem']),
      d['ma_nv'], d['ho_ten'], d['pin_may'],
      NHAN_TRANG_THAI[Number(d['trang_thai'])] ?? d['trang_thai'],
      nhan_cach_xac_thuc(Number(d['xac_thuc'])),
      d['nguon'], d['trang_thai_duyet'], d['thiet_bi_serial'], d['thiet_bi'],
      d['dia_diem'], d['khoang_cach_m'], d['ghi_chu'],
    ]);

    const csv = '\ufeff' + [tieu_de, ...hang].map((r) => r.map(o_csv).join(',')).join('\r\n');
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_lan_quet', 'lan_quet',
      null, { tu, den, so_dong: hang.length }, req.ip);

    return res
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="lan_quet_${tu}_${den}.csv"`)
      .send(csv);
  });

  /** PIN tu may nhung chua gan cho nhan vien nao — nhan su phai xu ly. */
  app.get('/lan-quet/chua-map', { preHandler: can_nhan_su }, async () =>
    truy_van(
      `select pin_may, thiet_bi_serial, count(*)::int as so_lan,
              min(thoi_diem) as lan_dau, max(thoi_diem) as lan_cuoi
         from lan_quet
        where nhan_vien_id is null and pin_may is not null
        group by pin_may, thiet_bi_serial
        order by max(thoi_diem) desc
        limit 200`,
    ),
  );

  /** Gan lai cac lan quet chua map cho mot nhan vien (sau khi da khai PIN). */
  app.post('/lan-quet/gan-lai', { preHandler: can_nhan_su }, async (req) => {
    const b = than(req.body);
    const pin = chuoi(b, 'pin_may', { bat_buoc: true, toi_da: 32 }) as string;
    const nhan_vien_id = uuid(b, 'nhan_vien_id', { bat_buoc: true }) as string;

    const nv = await truy_van_mot<{ id: string }>(
      'select id from nhan_vien where id = $1', [nhan_vien_id],
    );
    if (nv === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');

    const ngay_anh_huong = await truy_van<{ ngay: string }>(
      `update lan_quet set nhan_vien_id = $2
        where pin_may = $1 and nhan_vien_id is null
        returning (thoi_diem + make_interval(hours => $3::int))::date::text as ngay`,
      [pin, nhan_vien_id, cau_hinh.device_tz_offset_hours],
    );

    // Tinh lai tung ngay bi anh huong.
    const cac_ngay = [...new Set(ngay_anh_huong.map((r) => r.ngay))];
    for (const ng of cac_ngay) await tinh_lai_khoang(ng, ng, nhan_vien_id);

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'gan_lai_lan_quet', 'lan_quet',
      null, { pin, nhan_vien_id, so_ban_ghi: ngay_anh_huong.length }, req.ip);
    return { ok: true, so_ban_ghi: ngay_anh_huong.length, so_ngay_tinh_lai: cac_ngay.length };
  });

  // ============================================================ dashboard hom nay
  /**
   * Trang Tong quan. Noi dung PHU THUOC VAI TRO — xem `dashboard/theo_vai_tro.ts`.
   *
   * Truoc day duong nay tra ve MOT payload cho moi nguoi: so lieu toan cong ty, va danh
   * sach dich danh muoi nguoi di muon hom nay kem so phut. Mot tai khoan `nhan_vien` mo
   * trang chu ra la doc duoc het.
   */
  app.get('/dashboard', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    return dashboard_cho({ vai_tro: nd.vai_tro, nv: nd.nv }, ngay_dia_phuong(new Date()));
  });
}

/** Cac bo loc dung chung cho danh sach va ban xuat CSV. */
function doc_loc_lan_quet(q: Record<string, unknown>) {
  return {
    nhan_vien_id: uuid(q, 'nhan_vien_id'),
    thiet_bi_serial: chuoi(q, 'thiet_bi_serial', { toi_da: 64 }),
    nguon: trong_tap(q, 'nguon', ['may', 'dien_thoai', 'thu_cong'] as const),
    trang_thai_duyet: trong_tap(q, 'trang_thai_duyet',
      ['tu_dong', 'cho_duyet', 'da_duyet', 'tu_choi'] as const),
  };
}

/**
 * Menh de where dung chung. Tham so 1..6 co dinh; `pham_vi` la dieu kien gioi han theo
 * vai tro (truong phong chi thay phong minh) hoac 'true' khi da chan bang can_nhan_su.
 */
const DIEU_KIEN_LAN_QUET = (pham_vi: string): string => `
        where lq.thoi_diem >= $1::date and lq.thoi_diem < ($2::date + 1)
          and ($3::uuid is null or lq.nhan_vien_id = $3)
          and ($4::text is null or lq.thiet_bi_serial = $4)
          and ($5::text is null or lq.nguon = $5)
          and ($6::text is null or lq.trang_thai_duyet = $6)
          and (lq.nhan_vien_id is null or ${pham_vi})`;

/**
 * Tong hop thang: MOI NHAN VIEN MOT DONG — dung bang ma man hinh Bang cong dang hien.
 *
 * Liet ke ca nhan vien KHONG co ngay cong nao trong thang (left join): ke toan can thay
 * ho de biet ma hoi, chu khong phai ho bien mat khoi bang luong ma khong ai nhan ra.
 *
 * Thoi luong xuat ra bang PHUT NGUYEN, khong phai gio thap phan: bang tinh o may Viet Nam
 * hay dat dau phay lam dau thap phan, ma dau phay cung la dau phan cach cot cua CSV — so
 * "7,5" se bi tach lam hai o. Ke toan chia 60 trong Excel la ra gio.
 */
async function xuat_tong_hop_thang(
  req: FastifyRequest,
  res: FastifyReply,
  thang: string,
  tu: string,
  den: string,
): Promise<unknown> {
  const dong = await truy_van<Record<string, unknown>>(
    `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban, cl.ten as ca_lam,
            coalesce(sum(bc.so_cong), 0)                             as tong_cong,
            coalesce(sum(bc.phut_lam), 0)::int                       as tong_phut_lam,
            coalesce(sum(bc.phut_ot), 0)::int                        as tong_phut_ot,
            coalesce(sum(bc.phut_muon), 0)::int                      as tong_phut_muon,
            coalesce(sum(bc.phut_ve_som), 0)::int                    as tong_phut_ve_som,
            count(*) filter (where bc.trang_thai = 'co_mat')::int    as so_ngay_co_mat,
            count(*) filter (where bc.trang_thai = 'vang')::int      as so_ngay_vang,
            count(*) filter (where bc.trang_thai = 'nghi_phep')::int as so_ngay_nghi_phep,
            count(*) filter (where bc.trang_thai = 'ngay_le')::int   as so_ngay_le,
            count(*) filter (where bc.phut_muon > 0)::int            as so_lan_di_muon,
            count(*) filter (where bc.phut_ve_som > 0)::int          as so_lan_ve_som,
            count(*) filter (where bc.da_chot = true)::int           as so_ngay_da_chot
       from nhan_vien nv
       left join bang_cong_ngay bc
              on bc.nhan_vien_id = nv.id and bc.ngay >= $1 and bc.ngay <= $2
       left join phong_ban pb on pb.id = nv.phong_ban_id
       left join ca_lam cl on cl.id = nv.ca_lam_id
      where nv.dang_hoat_dong = true
      group by nv.ma_nv, nv.ho_ten, pb.ten, cl.ten
      order by pb.ten nulls last, nv.ma_nv`,
    [tu, den],
  );

  const tieu_de = [
    'Mã NV', 'Họ tên', 'Phòng ban', 'Ca làm', 'Số công',
    'Ngày có mặt', 'Ngày vắng', 'Ngày nghỉ phép', 'Ngày lễ',
    'Phút làm', 'Giờ làm', 'Phút OT', 'Giờ OT',
    'Số lần đi muộn', 'Tổng phút muộn', 'Số lần về sớm', 'Tổng phút về sớm',
    'Số ngày đã chốt',
  ];
  const hang = dong.map((d) => [
    d['ma_nv'], d['ho_ten'], d['phong_ban'], d['ca_lam'], d['tong_cong'],
    d['so_ngay_co_mat'], d['so_ngay_vang'], d['so_ngay_nghi_phep'], d['so_ngay_le'],
    d['tong_phut_lam'], phut_thanh_chu(Number(d['tong_phut_lam'])),
    d['tong_phut_ot'], phut_thanh_chu(Number(d['tong_phut_ot'])),
    d['so_lan_di_muon'], d['tong_phut_muon'],
    d['so_lan_ve_som'], d['tong_phut_ve_som'],
    d['so_ngay_da_chot'],
  ]);

  const csv = '﻿' + [tieu_de, ...hang].map((r) => r.map(o_csv).join(',')).join('\r\n');

  await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_bang_cong_thang', 'bang_cong_ngay',
    null, { thang, so_dong: hang.length }, req.ip);

  return res
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', `attachment; filename="bang_cong_thang_${thang}.csv"`)
    .send(csv);
}

function o_csv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Chan CSV injection: Excel/Sheets coi o bat dau bang = + - @ la cong thuc.
  const an_toan = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(an_toan) ? `"${an_toan.replace(/"/g, '""')}"` : an_toan;
}

/**
 * Moc thoi gian theo gio NOI DAT MAY, dang 'YYYY-MM-DD HH:MM:SS'.
 *
 * KHONG dung toLocaleString: no format theo mui gio cua may chay may chu. Gio cham cong la
 * gio tai noi dat may — xuat tren may chu chay UTC phai ra dung so nhu nhin tren may.
 */
function moc_gio_may(v: unknown): string {
  if (v === null || v === undefined) return '';
  const t = new Date(v as string | Date);
  if (Number.isNaN(t.getTime())) return '';
  return new Date(t.getTime() + OFFSET_MAY_MS).toISOString().replace('T', ' ').slice(0, 19);
}

function gio_hhmm(v: unknown): string {
  if (v === null || v === undefined) return '';
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return '';
  const t = new Date(d.getTime() + cau_hinh.device_tz_offset_hours * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}
