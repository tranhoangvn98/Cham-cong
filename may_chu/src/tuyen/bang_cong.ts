// API bang cong, nhat ky quet tho, dashboard va xuat CSV cho webapp HR.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai, xem_duoc_tat_ca } from '../bao_mat/xac_thuc.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { tinh_lai_khoang } from '../cong/tinh_cong.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { khoang_thang, ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { NHAN_TRANG_THAI, nhan_cach_xac_thuc } from '../adms/giao_thuc.ts';
import {
  chuoi, khoang_ngay, luan_ly, ngay_bat_buoc, phan_trang, so_nguyen, than, uuid,
  LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

const NHAN_TRANG_THAI_NGAY: Record<string, string> = {
  vang: 'Vang',
  co_mat: 'Co mat',
  nghi_phep: 'Nghi phep',
  ngay_le: 'Ngay le',
  nghi_tuan: 'Nghi tuan',
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
  app.get('/bang-cong/xuat-csv', { preHandler: can_nhan_su }, async (req, res) => {
    const q = req.query as Record<string, unknown>;
    const thang = chuoi(q, 'thang', { bat_buoc: true, toi_da: 7 }) as string;
    const { tu, den } = khoang_thang(thang);

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
      'Ma NV', 'Ho ten', 'Phong ban', 'Ngay', 'Trang thai', 'Gio vao', 'Gio ra',
      'Phut lam', 'Phut muon', 'Phut ve som', 'Phut OT', 'So cong', 'Ghi chu',
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
      .header('content-disposition', `attachment; filename="bang_cong_${thang}.csv"`)
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
      throw new LoiDauVao('so_cong phai trong khoang 0 den 2.');
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
    if (so === 0) throw new LoiKhongTim('Chua co dong bang cong cho nhan vien/ngay nay.');

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
    return { ok: true, so_dong_da_chot: so, luu_y: 'Dong da chot se khong bi tinh lai.' };
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
    const nhan_vien_id = uuid(q, 'nhan_vien_id');
    const { gioi_han, bo_qua } = phan_trang(q, 200, 1000);
    const pv = pham_vi_nhan_vien(nd, 'nv', 6);

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
        where lq.thoi_diem >= $1::date and lq.thoi_diem < ($2::date + 1)
          and ($3::uuid is null or lq.nhan_vien_id = $3)
          and (lq.nhan_vien_id is null or ${pv.sql})
        order by lq.thoi_diem desc
        limit $4 offset $5`,
      [tu, den, nhan_vien_id, gioi_han, bo_qua, ...pv.tham_so],
    );

    return dong.map((d) => ({
      ...d,
      nhan_trang_thai: NHAN_TRANG_THAI[Number(d['trang_thai'])] ?? 'Khac',
      nhan_xac_thuc: nhan_cach_xac_thuc(Number(d['xac_thuc'])),
    }));
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
    if (nv === null) throw new LoiKhongTim('Khong tim thay nhan vien.');

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
  app.get('/dashboard', { preHandler: can_dang_nhap }, async (req) => {
    const hom_nay = ngay_dia_phuong(new Date());

    const tong = await truy_van_mot<{
      tong_nhan_vien: number;
      co_mat: number;
      di_muon: number;
      vang: number;
      nghi_phep: number;
      chua_quet_ra: number;
    }>(
      `select
         (select count(*) from nhan_vien where dang_hoat_dong = true)::int as tong_nhan_vien,
         count(*) filter (where trang_thai = 'co_mat')::int               as co_mat,
         count(*) filter (where phut_muon > 0)::int                       as di_muon,
         count(*) filter (where trang_thai = 'vang')::int                 as vang,
         count(*) filter (where trang_thai = 'nghi_phep')::int            as nghi_phep,
         -- Chi co dung mot moc quet => chua quet ra (hoac dang trong gio lam).
         count(*) filter (where gio_vao is not null and gio_vao = gio_ra)::int as chua_quet_ra
       from bang_cong_ngay where ngay = $1`,
      [hom_nay],
    );

    const may = await truy_van<{ ten: string; serial: string; dang_online: boolean; thay_lan_cuoi: Date | null }>(
      `select ten, serial, thay_lan_cuoi,
              (thay_lan_cuoi is not null
               and thay_lan_cuoi > now() - ($1 || ' seconds')::interval) as dang_online
         from thiet_bi where dang_bat = true order by ten`,
      [String(cau_hinh.may_offline_sau_giay)],
    );

    const cho_duyet = await truy_van_mot<{ nghi_phep: number; giai_trinh: number; quet_mobile: number }>(
      `select
         (select count(*) from don_nghi_phep  where trang_thai = 'cho_duyet')::int as nghi_phep,
         (select count(*) from don_giai_trinh where trang_thai = 'cho_duyet')::int as giai_trinh,
         (select count(*) from lan_quet where trang_thai_duyet = 'cho_duyet')::int as quet_mobile`,
    );

    // Bieu do 7 ngay gan nhat.
    const bay_ngay = await truy_van(
      `select ngay,
              count(*) filter (where trang_thai = 'co_mat')::int as co_mat,
              count(*) filter (where phut_muon > 0)::int          as di_muon,
              count(*) filter (where trang_thai = 'vang')::int    as vang,
              coalesce(sum(phut_ot), 0)::int                      as phut_ot
         from bang_cong_ngay
        where ngay > $1::date - 7 and ngay <= $1::date
        group by ngay order by ngay`,
      [hom_nay],
    );

    const muon_nhat = await truy_van(
      `select nv.ho_ten, nv.ma_nv, bc.phut_muon, bc.gio_vao
         from bang_cong_ngay bc join nhan_vien nv on nv.id = bc.nhan_vien_id
        where bc.ngay = $1 and bc.phut_muon > 0
        order by bc.phut_muon desc limit 10`,
      [hom_nay],
    );

    return {
      ngay: hom_nay,
      tong_quan: tong,
      thiet_bi: may,
      cho_duyet,
      bay_ngay,
      di_muon_hom_nay: muon_nhat,
      vai_tro: nguoi_dung_hien_tai(req).vai_tro,
    };
  });
}

function o_csv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Chan CSV injection: Excel/Sheets coi o bat dau bang = + - @ la cong thuc.
  const an_toan = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(an_toan) ? `"${an_toan.replace(/"/g, '""')}"` : an_toan;
}

function gio_hhmm(v: unknown): string {
  if (v === null || v === undefined) return '';
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return '';
  const t = new Date(d.getTime() + cau_hinh.device_tz_offset_hours * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}
