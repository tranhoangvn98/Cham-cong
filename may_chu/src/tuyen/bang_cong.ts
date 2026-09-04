// API bang cong, nhat ky quet tho, dashboard va xuat CSV cho webapp HR.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai, xem_duoc_tat_ca } from '../bao_mat/xac_thuc.ts';
import { cau_hinh, OFFSET_MAY_MS } from '../cau_hinh.ts';
import { dashboard_cho } from '../dashboard/theo_vai_tro.ts';
import { tinh_lai_khoang } from '../cong/tinh_cong.ts';
import { ky_da_chot_luong } from '../luong/ban_chot.ts';
import { khoang_cua_nguoi } from '../dinh_danh/tra_pin.ts';
import { nap_lich_pin } from '../dinh_danh/lich_pin_csdl.ts';
import { LoiXungDot } from '../tien_ich/kiem_tra.ts';
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

/**
 * Moc mo cho khoang "gan lai". Dung ngay that chu khong phai null de cau UPDATE chi co MOT dang —
 * mot nhanh `is null` trong cau SQL do la mot nhanh khong ai kiem, va day dung la cho khong duoc
 * co nhanh nhu the.
 */
const MO_DAU = '2000-01-01';
const MO_CUOI = '9999-12-31';

/**
 * Khoang ngay cho mot lan "gan lai": lay theo khai bao, hoac theo khoang hieu luc cua PIN doi voi
 * chinh nguoi nay trong `ma_dinh_danh`.
 *
 * KHONG CO MAC DINH "TAT CA". Mac dinh do chinh la lo hong: nguoi bam nut thay mot dong trong bang
 * "PIN chua gan" va tin rang minh gan mot dong, trong khi cau UPDATE quet het lich su cua PIN do.
 */
async function khoang_gan_lai(
  pin: string, nhan_vien_id: string, tu_khai: string | null, den_khai: string | null,
): Promise<{ tu: string; den: string }> {
  if ((tu_khai === null) !== (den_khai === null)) {
    throw new LoiDauVao('Khai khoảng ngày thì phải khai cả "tu" và "den", hoặc để trống cả hai.');
  }
  if (tu_khai !== null && den_khai !== null) {
    const tu = ngay_bat_buoc({ tu: tu_khai }, 'tu') as string;
    const den = ngay_bat_buoc({ den: den_khai }, 'den') as string;
    if (tu > den) throw new LoiDauVao('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    return { tu, den };
  }

  const lich = await nap_lich_pin([pin]);
  const k = khoang_cua_nguoi(lich, pin, nhan_vien_id);
  if (k === null) {
    throw new LoiDauVao(
      `Nhân viên này chưa từng giữ PIN ${pin} trong bảng mã định danh, nên hệ thống không biết `
      + 'các lần quẹt đó thuộc khoảng thời gian nào. Khai PIN cho nhân viên ở trang Mã định danh '
      + 'trước, hoặc khai rõ khoảng ngày cần gán.',
    );
  }
  return {
    tu: k.tu === null ? MO_DAU : ngay_dia_phuong(k.tu),
    // `hieu_luc_den` LOAI TRU: ngay cuoi con giu PIN la ngay cua moc do tru mot phan nghin giay.
    den: k.den === null ? MO_CUOI : ngay_dia_phuong(new Date(k.den.getTime() - 1)),
  };
}

/**
 * Tu choi neu trong khoang co thang da co bang luong duoc duyet.
 *
 * `/bang-cong/mo-chot` da co luat nay tu truoc, nhung duong "gan lai" di vong qua no: no khong sua
 * `bang_cong_ngay` truc tiep, no doi chu mot lan quet roi tinh lai — va ket qua thi giong nhau.
 */
async function chan_thang_da_chot(
  pin: string, serial: string | null, tu: string, den: string,
): Promise<void> {
  const thang = await truy_van<{ thang: string; so_lan: number }>(
    `select to_char(thoi_diem + make_interval(hours => $2::int), 'YYYY-MM') as thang,
            count(*)::int as so_lan
       from lan_quet
      where pin_may = $1 and nhan_vien_id is null
        and ($3::text is null or thiet_bi_serial = $3)
        and (thoi_diem + make_interval(hours => $2::int))::date >= $4::date
        and (thoi_diem + make_interval(hours => $2::int))::date <= $5::date
      group by 1 order by 1`,
    [pin, cau_hinh.device_tz_offset_hours, serial, tu, den],
  );

  const da_chot: string[] = [];
  for (const t of thang) {
    if (await ky_da_chot_luong(t.thang)) da_chot.push(`${t.thang} (${String(t.so_lan)} lần)`);
  }
  if (da_chot.length > 0) {
    throw new LoiXungDot(
      `Khoảng này chạm vào tháng đã có bảng lương được duyệt: ${da_chot.join(', ')}. `
      + 'Gán lại sẽ tính lại bảng công của tháng đó, tức là số đã trả không còn khớp căn cứ. '
      + 'Thu hẹp khoảng ngày, hoặc hủy duyệt kỳ lương trước — và đó là việc phải có người chịu '
      + 'trách nhiệm.',
    );
  }
  // Khong co lan quet nao trong khoang thi khong phai loi: cho goi tra ve so_ban_ghi = 0.
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
              count(*) filter (where bc.phut_muon > 0)::int                 as so_lan_di_muon,
              count(*) filter (where bc.phut_muon > 0 and bc.phut_muon < 30)::int as so_lan_muon_duoi_30,
              count(*) filter (where bc.phut_muon >= 30)::int               as so_lan_muon_tu_30
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

    // KHONG mo lai duoc thang da co bang luong DA DUYET.
    //
    // Bang luong duoc tinh TU bang cong. Mo lai bang cong sau khi luong da duyet nghia la
    // co the ton tai mot bang luong da chot — da co nguoi ky, da co ban ket xuat tren
    // SharePoint — dua tren nhung con so gio khong con nhu the. Khong ai giai thich duoc
    // trang thai do cho thanh tra lao dong, va cai lam ta phat hien ra thi qua muon.
    if (await ky_da_chot_luong(thang)) {
      throw new LoiXungDot(
        `Tháng ${thang} đã có bảng lương được duyệt, nên bảng công của tháng đó đã chốt cứng. `
        + 'Muốn sửa thì phải hủy kỳ lương trước — và đó là việc phải có người chịu trách nhiệm, '
        + 'không phải một lần mở chốt.',
      );
    }

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

  /**
   * Cac lan quet chua map cua mot PIN, DEM THEO THANG.
   *
   * Nguoi bam nut "gan lai" phai thay minh dang cham vao nhung thang nao TRUOC khi bam. Mot con
   * so tong ("142 lan quet") khong noi duoc rang 22 trong so do thuoc thang 6 da chot luong.
   */
  app.get('/lan-quet/chua-map/thang', { preHandler: can_nhan_su }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const pin = chuoi(q, 'pin_may', { bat_buoc: true, toi_da: 32 }) as string;
    const serial = chuoi(q, 'thiet_bi_serial', { toi_da: 64 });
    return truy_van(
      `select to_char(thoi_diem + make_interval(hours => $2::int), 'YYYY-MM') as thang,
              count(*)::int as so_lan,
              min((thoi_diem + make_interval(hours => $2::int))::date)::text as ngay_dau,
              max((thoi_diem + make_interval(hours => $2::int))::date)::text as ngay_cuoi
         from lan_quet
        where pin_may = $1 and nhan_vien_id is null
          and ($3::text is null or thiet_bi_serial = $3)
        group by 1
        order by 1`,
      [pin, cau_hinh.device_tz_offset_hours, serial],
    );
  });

  /**
   * Gan lai cac lan quet chua map cho mot nhan vien (sau khi da khai PIN).
   *
   * BA HANG RAO, va ca ba deu do mot lan quet bi gan sai nguoi la sai bang cong, tuc la sai luong.
   *
   * 1. `thiet_bi_serial` GIOI HAN theo may. PIN la danh tinh o pham vi TOAN CONG TY (xem di tru
   *    026), nhung SO PIN thi do tung may cap — nen hai may co the cung co PIN 5 cua HAI NGUOI
   *    KHAC NHAU. Truoc ban 1.35 cau UPDATE khong loc theo may: gan PIN 5 la keo theo moi lan
   *    quet PIN 5 chua map cua MOI may. Khong khai serial ma PIN do dang co ban ghi chua map o
   *    NHIEU MAY thi TU CHOI, khong doan.
   *
   * 2. `tu` / `den` GIOI HAN theo ngay — MOI o ban nay. Loc theo may van chua du: mot PIN o dung
   *    mot may cung co the da qua tay hai nguoi. Gan PIN 042 cho nguoi dang giu no hom nay ma
   *    khong loc ngay la keo luon cac lan quet thang 6 cua nguoi cu sang bang cong nguoi moi —
   *    dung tinh huong §9.5 cua tai lieu lien thong nhan su. Nang hon loi 1 vi CO NGUOI BAM NUT
   *    va tin rang minh gan mot dong.
   *
   *    Khong khai `tu`/`den` thi mac dinh la khoang hieu luc cua PIN do doi voi CHINH nguoi nay
   *    trong `ma_dinh_danh`. Nguoi nay khong co dong nao voi PIN do thi TU CHOI — khai PIN truoc,
   *    hoac khai ro khoang ngay. Khong co mac dinh "tat ca": mac dinh la cho loi nay quay lai.
   *
   * 3. THANG DA CHOT LUONG thi tu choi. `/bang-cong/mo-chot` da co luat nay tu truoc; duong nay
   *    di vong qua no. Sua bang cong cua thang da co bang luong duoc duyet la viec phai co nguoi
   *    chiu trach nhiem, khong phai mot lan bam nut.
   */
  app.post('/lan-quet/gan-lai', { preHandler: can_nhan_su }, async (req) => {
    const b = than(req.body);
    const pin = chuoi(b, 'pin_may', { bat_buoc: true, toi_da: 32 }) as string;
    const nhan_vien_id = uuid(b, 'nhan_vien_id', { bat_buoc: true }) as string;
    const serial = chuoi(b, 'thiet_bi_serial', { toi_da: 64 });
    const tu_khai = chuoi(b, 'tu', { toi_da: 10 });
    const den_khai = chuoi(b, 'den', { toi_da: 10 });

    const nv = await truy_van_mot<{ id: string }>(
      'select id from nhan_vien where id = $1', [nhan_vien_id],
    );
    if (nv === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');

    if (serial === null) {
      const may = await truy_van<{ thiet_bi_serial: string | null; so_lan: number }>(
        `select thiet_bi_serial, count(*)::int as so_lan
           from lan_quet
          where pin_may = $1 and nhan_vien_id is null
          group by thiet_bi_serial
          order by count(*) desc`,
        [pin],
      );
      if (may.length > 1) {
        const ke = may.map(
          (m) => `${m.thiet_bi_serial ?? '(không gắn máy)'} (${String(m.so_lan)} lần)`,
        );
        throw new LoiDauVao(
          `PIN ${pin} đang có bản ghi chưa gán ở ${String(may.length)} máy: ${ke.join(', ')}. `
          + 'Mỗi máy cấp số PIN riêng nên cùng một số có thể là hai người khác nhau. '
          + 'Chọn đúng máy cần gán.',
        );
      }
    }

    // Hang rao 2 dat SAU hang rao 1: "PIN nay dang o hai may" la loi ve hinh dang cua yeu cau,
    // va bao no truoc thi nguoi doc sua duoc bang mot lan. Dat truoc la che mat no.
    const { tu, den } = await khoang_gan_lai(pin, nhan_vien_id, tu_khai, den_khai);

    // Hang rao 3: thang nao trong khoang da co bang luong duoc duyet thi tu choi CA LAN GAN, chu
    // khong gan phan con lai — gan mot nua la de lai mot trang thai khong ai doc duoc.
    await chan_thang_da_chot(pin, serial, tu, den);

    const ngay_anh_huong = await truy_van<{ ngay: string }>(
      `update lan_quet set nhan_vien_id = $2
        where pin_may = $1 and nhan_vien_id is null
          and ($4::text is null or thiet_bi_serial = $4)
          and (thoi_diem + make_interval(hours => $3::int))::date >= $5::date
          and (thoi_diem + make_interval(hours => $3::int))::date <= $6::date
        returning (thoi_diem + make_interval(hours => $3::int))::date::text as ngay`,
      [pin, nhan_vien_id, cau_hinh.device_tz_offset_hours, serial, tu, den],
    );

    // Tinh lai tung ngay bi anh huong.
    const cac_ngay = [...new Set(ngay_anh_huong.map((r) => r.ngay))];
    for (const ng of cac_ngay) await tinh_lai_khoang(ng, ng, nhan_vien_id);

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'gan_lai_lan_quet', 'lan_quet',
      null, {
        pin, nhan_vien_id, thiet_bi_serial: serial, tu, den,
        so_ban_ghi: ngay_anh_huong.length,
      },
      req.ip);
    return {
      ok: true, tu, den,
      so_ban_ghi: ngay_anh_huong.length, so_ngay_tinh_lai: cac_ngay.length,
    };
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

  // ------------------------------------------------------------ drill-down o so dashboard
  // Bam mot o so tren Trang tong quan -> danh sach nhan vien thuoc nhom do (mot ngay). Loc theo
  // vai tro nhu bang cong: nhan su thay het, truong phong thay phong minh, nhan vien thay minh.
  const LOAI_DS = ['tong', 'co_mat', 'di_muon', 'vang', 'nghi_phep', 'chua_quet_ra'] as const;
  const DIEU_KIEN_DS: Record<typeof LOAI_DS[number], string> = {
    tong: 'true',
    co_mat: `bc.trang_thai = 'co_mat'`,
    di_muon: 'bc.phut_muon > 0',
    vang: `bc.trang_thai = 'vang'`,
    nghi_phep: `bc.trang_thai = 'nghi_phep'`,
    chua_quet_ra: 'bc.gio_vao is not null and bc.gio_vao = bc.gio_ra',
  };

  app.get('/dashboard/danh-sach', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = than(req.query) as Record<string, unknown>;
    const loai = trong_tap(q, 'loai', LOAI_DS, { bat_buoc: true }) as typeof LOAI_DS[number];
    const ngay = chuoi(q, 'ngay', { toi_da: 10 }) ?? ngay_dia_phuong(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) throw new LoiDauVao('Ngày phải có dạng YYYY-MM-DD.');
    const pv = pham_vi_nhan_vien(nd, 'nv', 2);

    // 'tong' = MOI nhan vien dang hoat dong (khop o so "Tong nhan vien", von dem tu nhan_vien),
    // left join bang cong hom nay de con hien trang thai. Cac loai khac loc theo bang cong ngay.
    if (loai === 'tong') {
      return truy_van(
        `select nv.id as nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
                bc.trang_thai, bc.gio_vao, bc.gio_ra, bc.phut_muon
           from nhan_vien nv
           left join phong_ban pb on pb.id = nv.phong_ban_id
           left join bang_cong_ngay bc on bc.nhan_vien_id = nv.id and bc.ngay = $1
          where nv.dang_hoat_dong = true and ${pv.sql}
          order by nv.ho_ten limit 1000`,
        [ngay, ...pv.tham_so],
      );
    }
    return truy_van(
      `select nv.id as nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              bc.trang_thai, bc.gio_vao, bc.gio_ra, bc.phut_muon
         from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where bc.ngay = $1 and (${DIEU_KIEN_DS[loai]}) and ${pv.sql}
        order by ${loai === 'di_muon' ? 'bc.phut_muon desc,' : ''} nv.ho_ten limit 1000`,
      [ngay, ...pv.tham_so],
    );
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
