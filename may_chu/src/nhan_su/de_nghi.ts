// De nghi them nhan su (onboarding — DTKT 02/2026): HR/quan ly tao de nghi, nhan su moi
// CHUA duoc khoi tao cho den khi Admin duyet MOT buoc. Khi duyet, `chay_khoi_tao_nhan_su`
// chay toan bo khoi tao trong mot transaction (tai dung khoi tao ho so o tao_ho_so.ts):
// insert nhan_vien + cap PIN + outbox cong/ERP1/MS365 + tai khoan he thong + lenh day user
// xuong may cua + cong viec "Nhap viec" kem checklist cho nguoi phu trach nhan su.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_admin, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, ngay, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { bo_dau } from '../tien_ich/ten_tep.ts';
import { MA_VI_TRI } from './vi_tri.ts';
import { tao_ho_so_nhan_su, type DauVaoTaoHoSo } from './tao_ho_so.ts';
import { la_truong_phong } from './ms365.ts';
import {
  khoa_lenh_pin, nguoi_nhan_nhap_viec, tao_viec_nhap_viec_trong,
} from './nhap_viec.ts';
import { xep_lenh } from '../adms/tuyen.ts';
import { lenh_cap_nhat_userinfo } from '../adms/giao_thuc.ts';

/** Ghi de du lieu Admin duoc sua ngay truoc khi duyet (REQ-G-01). */
export interface GhiDeDuyet {
  ma_nv?: string | null;
  pin_may?: string | null;
  chuc_danh?: string | null;
  cap_ms365?: boolean | null;
  sku_id?: string | null;
  serial_may_cua?: string | null;
}

interface DongDeNghi {
  id: string;
  ho_ten: string;
  ma_nv: string | null;
  chuc_danh: string | null;
  vi_tri: string | null;
  phong_ban_id: string | null;
  ca_lam_id: string | null;
  khoi_id: string | null;
  noi_lam_viec_id: string | null;
  ngay_vao: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  ma_erp: string | null;
  loai_hop_dong: string | null;
  tu_cap_pin: boolean;
  pin_may: string | null;
  serial_may_cua: string | null;
  cap_ms365: boolean;
  tao_tk_he_thong: boolean;
  trang_thai: string;
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, unknown>;
  const id = typeof p['id'] === 'string' ? p['id'].trim() : '';
  if (id === '' || id.length > 64) throw new LoiDauVao('Thiếu hoặc sai id.');
  return id;
}

/** Doc cac o de nghi tu than yeu cau. `bat_buoc_ho_ten` dung cho route tao moi. */
function doc_de_nghi(b: Record<string, unknown>, bat_buoc_ho_ten: boolean): Record<string, unknown> {
  const pin = chuoi(b, 'pin_may', { toi_da: 32 });
  if (pin !== null && !/^[0-9]{1,20}$/.test(pin)) {
    throw new LoiDauVao('PIN máy chỉ gồm chữ số (dùng đúng PIN đã khai trên máy).');
  }
  return {
    ho_ten: bat_buoc_ho_ten
      ? chuoi_bat_buoc(b, 'ho_ten', { toi_da: 120 })
      : chuoi(b, 'ho_ten', { toi_da: 120 }),
    ma_nv: chuoi(b, 'ma_nv', { toi_da: 40 }),
    chuc_danh: chuoi(b, 'chuc_danh', { toi_da: 200 }),
    vi_tri: trong_tap(b, 'vi_tri', MA_VI_TRI, { bat_buoc: false }),
    phong_ban_id: uuid(b, 'phong_ban_id'),
    ca_lam_id: uuid(b, 'ca_lam_id'),
    khoi_id: uuid(b, 'khoi_id'),
    noi_lam_viec_id: uuid(b, 'noi_lam_viec_id'),
    ngay_vao: ngay(b, 'ngay_vao'),
    so_dien_thoai: chuoi(b, 'so_dien_thoai', { toi_da: 20 }),
    email: chuoi(b, 'email', { toi_da: 200 }),
    ma_erp: chuoi(b, 'ma_erp', { toi_da: 40 }),
    loai_hop_dong: chuoi(b, 'loai_hop_dong', { toi_da: 120 }),
    tu_cap_pin: luan_ly(b, 'tu_cap_pin', true),
    pin_may: pin,
    serial_may_cua: chuoi(b, 'serial_may_cua', { toi_da: 64 }),
    cap_ms365: luan_ly(b, 'cap_ms365', true),
    tao_tk_he_thong: luan_ly(b, 'tao_tk_he_thong', true),
  };
}

const COT_DE_NGHI = [
  'ho_ten', 'ma_nv', 'chuc_danh', 'vi_tri', 'phong_ban_id', 'ca_lam_id', 'khoi_id',
  'noi_lam_viec_id', 'ngay_vao', 'so_dien_thoai', 'email', 'ma_erp', 'loai_hop_dong',
  'tu_cap_pin', 'pin_may', 'serial_may_cua', 'cap_ms365', 'tao_tk_he_thong',
] as const;

/**
 * Chay toan bo khoi tao cho mot de nghi da duyet.
 *
 * Chay trong MOT transaction cung ban ghi nhan vien: cap nhat de nghi (co canh gac trang
 * thai de chong duyet trung), sinh viec nhap viec, xep lenh day user xuong may cua. Mat
 * khau khoi tao MS365 chi tra ve MOT LAN o phan hoi nay.
 */
export async function chay_khoi_tao_nhan_su(
  de_nghi_id: string,
  nguoi_duyet_sub: string,
  ghi_de: GhiDeDuyet = {},
  ip: string | null = null,
): Promise<Record<string, unknown>> {
  const d = await truy_van_mot<DongDeNghi>(
    `select id, ho_ten, ma_nv, chuc_danh, vi_tri, phong_ban_id, ca_lam_id, khoi_id,
            noi_lam_viec_id, ngay_vao, so_dien_thoai, email, ma_erp, loai_hop_dong,
            tu_cap_pin, pin_may, serial_may_cua, cap_ms365, tao_tk_he_thong, trang_thai
       from de_nghi_them_nhan_su where id = $1`, [de_nghi_id]);
  if (d === null) throw new LoiKhongTim('Không tìm thấy đề nghị thêm nhân sự.');
  if (d.trang_thai !== 'cho_duyet') {
    throw new LoiXungDot('Đề nghị này đã được xử lý rồi — không duyệt lại được.');
  }

  const ma_nv = (ghi_de.ma_nv ?? d.ma_nv ?? '').trim();
  if (ma_nv === '') {
    throw new LoiDauVao('Chưa có mã nhân viên — Admin nhập mã trước khi duyệt.');
  }
  const chuc_danh = ghi_de.chuc_danh ?? d.chuc_danh;
  const cap_ms365 = ghi_de.cap_ms365 ?? d.cap_ms365;
  const email = (d.email ?? '').trim();

  // Kiem truoc khi chay (REQ-G-03): email/UPN hop le; cap MS365 ma chua khai SKU thi CHAN.
  let sku_id = '';
  if (cap_ms365) {
    if (!email.includes('@')) {
      throw new LoiDauVao(
        'Email hồ sơ không hợp lệ — email chính là tên đăng nhập Microsoft (UPN). Sửa đề nghị trước khi duyệt.');
    }
    sku_id = (ghi_de.sku_id ?? '').trim() !== ''
      ? (ghi_de.sku_id as string).trim()
      : (la_truong_phong(chuc_danh)
        ? cau_hinh.ms365_tao.sku_standard
        : cau_hinh.ms365_tao.sku_basic);
    if (sku_id === '') {
      throw new LoiDauVao(
        'Chưa khai SKU Microsoft (MS365_SKU_BASIC / MS365_SKU_STANDARD) — khai xong mới duyệt được đề nghị tạo tài khoản Microsoft.');
    }
  }

  const tu_cap_pin = d.tu_cap_pin;
  const serial_cua = ((ghi_de.serial_may_cua ?? d.serial_may_cua ?? '').trim()
    || cau_hinh.may_cua_mac_dinh).trim();
  const pin_tay = !tu_cap_pin ? ((ghi_de.pin_may ?? d.pin_may ?? '').trim() || null) : null;

  const dau_vao: DauVaoTaoHoSo = {
    ma_nv,
    ho_ten: d.ho_ten,
    pin_may: pin_tay,
    ma_erp: d.ma_erp,
    phong_ban_id: d.phong_ban_id,
    ca_lam_id: d.ca_lam_id,
    ngay_vao: d.ngay_vao,
    so_dien_thoai: d.so_dien_thoai,
    email: d.email,
    duoc_cham_cong_dien_thoai: false,
    noi_lam_viec_id: d.noi_lam_viec_id,
    che_do_luong: 'vn',
    khoi_id: d.khoi_id,
    chuc_danh,
    vi_tri: d.vi_tri,
    tu_cap_pin,
    thiet_bi_serial: serial_cua === '' ? null : serial_cua,
    tao_tk_ms365: cap_ms365,
    tao_tk_he_thong: d.tao_tk_he_thong,
    sku_id_tuy_chon: (ghi_de.sku_id ?? '').trim() || null,
  };

  let viec_id: string | null = null;
  const kq = await tao_ho_so_nhan_su(dau_vao, async (khach, nv_id, pin) => {
    // Canh gac duyet trung ngay trong transaction: chi doi trang thai khi con cho_duyet.
    const cap = await khach.query(
      `update de_nghi_them_nhan_su
          set trang_thai = 'da_khoi_tao', nhan_vien_id = $2,
              admin_duyet_id = $3, admin_duyet_luc = now()
        where id = $1 and trang_thai = 'cho_duyet'`,
      [de_nghi_id, nv_id, nguoi_duyet_sub]);
    if (cap.rowCount === 0) {
      throw new LoiXungDot('Đề nghị đã được xử lý trước đó — không khởi tạo lại.');
    }

    const canh_bao: string[] = [];
    // Viec "Nhap viec" + checklist cho nguoi phu trach nhan su.
    const nguoi_nhan = await nguoi_nhan_nhap_viec();
    if (nguoi_nhan === null) {
      canh_bao.push('Chưa khai NHAP_VIEC_NHAN_SU_ID / workflow nhập việc — chưa giao được việc nhập việc cho nhân sự.');
    } else {
      const han = d.ngay_vao ?? ngay_dia_phuong(new Date());
      viec_id = await tao_viec_nhap_viec_trong(
        khach, nguoi_nhan, { id: nv_id, ho_ten: d.ho_ten, ma_nv },
        han, cap_ms365, d.loai_hop_dong, cau_hinh.nhap_viec.email_bhxh,
      );
      if (viec_id === null) canh_bao.push('Việc nhập việc đã tồn tại — giữ nguyên bản cũ.');
    }
    // Day user + PIN xuong may cua; lenh nam cho hang doi khi may offline.
    if (serial_cua !== '' && pin !== null) {
      const id_lenh = await xep_lenh(
        serial_cua, lenh_cap_nhat_userinfo(pin, bo_dau(d.ho_ten)),
        khoa_lenh_pin(nv_id), khach,
      );
      if (id_lenh === 0) {
        canh_bao.push('Lệnh đẩy PIN xuống máy cửa đã có trong hàng đợi — không đẩy trùng.');
      }
    } else if (serial_cua !== '') {
      canh_bao.push('Không có PIN để đẩy xuống máy cửa — nhân sự khai tay lên máy và tick checklist bằng tay.');
    }
    return canh_bao;
  });

  await ghi_nhat_ky(nguoi_duyet_sub, 'duyet_de_nghi_nhan_su', 'de_nghi_them_nhan_su',
    de_nghi_id, { nhan_vien_id: kq.id, ma_nv }, ip);

  const ket_qua: Record<string, unknown> = {
    nhan_vien_id: kq.id, pin_may: kq.pin_cap, viec_id,
  };
  if (kq.canh_bao.length > 0) ket_qua['canh_bao'] = kq.canh_bao;
  if (kq.tai_khoan_ms365 !== null) {
    ket_qua['tai_khoan_ms365'] = {
      ...kq.tai_khoan_ms365,
      ghi_chu: 'Tài khoản Microsoft sẽ được tạo trong giây lát. Mật khẩu chỉ hiện lần này — hãy bàn giao cho nhân viên.',
    };
  }
  if (kq.tai_khoan_he_thong !== null) {
    ket_qua['tai_khoan_he_thong'] = {
      ...kq.tai_khoan_he_thong,
      ghi_chu: 'Tài khoản đăng nhập hệ thống được tạo tự động. Mật khẩu chỉ hiện lần này — nhân viên sẽ đổi ở lần đăng nhập đầu.',
    };
  }
  return ket_qua;
}

export async function tuyen_de_nghi(app: FastifyInstance): Promise<void> {
  // ======================================================================  DANH SACH
  app.get('/de-nghi-nhan-su', { preHandler: can_nhan_su }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const tt = chuoi(q, 'trang_thai', { toi_da: 20 });
    return truy_van(
      `select dn.id, dn.ho_ten, dn.ma_nv, dn.chuc_danh, dn.vi_tri, dn.ngay_vao, dn.email,
              dn.loai_hop_dong, dn.cap_ms365, dn.tao_tk_he_thong, dn.tu_cap_pin,
              dn.serial_may_cua, dn.trang_thai, dn.nhan_vien_id, dn.ly_do_tu_choi,
              dn.admin_duyet_luc, dn.tao_luc,
              nv.ma_nv as ma_nv_da_tao,
              coalesce(nd2.ho_ten, nd.ten_dang_nhap) as nguoi_de_nghi,
              nd3.ten_dang_nhap as admin_duyet
         from de_nghi_them_nhan_su dn
         left join nhan_vien nv on nv.id = dn.nhan_vien_id
         left join nguoi_dung nd on nd.id = dn.nguoi_de_nghi
         left join nhan_vien nd2 on nd2.id = nd.nhan_vien_id
         left join nguoi_dung nd3 on nd3.id = dn.admin_duyet_id
        where ($1::text is null or dn.trang_thai = $1)
        order by dn.tao_luc desc`,
      [tt],
    );
  });

  // ======================================================================  TAO DE NGHI
  app.post('/de-nghi-nhan-su', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const v = doc_de_nghi(b, true);
    const dong = await truy_van_mot<{ id: string }>(
      `insert into de_nghi_them_nhan_su
         (${COT_DE_NGHI.join(', ')}, nguoi_de_nghi)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       returning id`,
      [...COT_DE_NGHI.map((k) => v[k]), nguoi_dung_hien_tai(req).sub],
    );
    if (dong === null) throw new LoiDauVao('Không lưu được đề nghị.');
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'tao_de_nghi_nhan_su',
      'de_nghi_them_nhan_su', dong.id, { ho_ten: v['ho_ten'] }, req.ip);
    return res.code(201).send(dong);
  });

  // ======================================================================  SUA DE NGHI
  app.patch('/de-nghi-nhan-su/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    const cu = await truy_van_mot<{ trang_thai: string }>(
      'select trang_thai from de_nghi_them_nhan_su where id = $1', [id]);
    if (cu === null) throw new LoiKhongTim('Không tìm thấy đề nghị.');
    if (cu.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot('Chỉ sửa được đề nghị đang chờ duyệt.');
    }
    const v = doc_de_nghi(b, false);
    const doi: string[] = [];
    const ts: unknown[] = [];
    for (const [i, k] of COT_DE_NGHI.entries()) {
      if (!Object.hasOwn(b, k)) continue;
      doi.push(`${k} = $${ts.length + 2}`);
      ts.push(v[k]);
    }
    if (doi.length === 0) throw new LoiDauVao('Không có trường nào để sửa.');
    await thuc_thi(
      `update de_nghi_them_nhan_su set ${doi.join(', ')} where id = $1`,
      [id, ...ts],
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'sua_de_nghi_nhan_su',
      'de_nghi_them_nhan_su', id, null, req.ip);
    return { ok: true };
  });

  // ======================================================================  DUYET
  app.post('/de-nghi-nhan-su/:id/duyet', { preHandler: can_admin }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    const kq = await chay_khoi_tao_nhan_su(id, nguoi_dung_hien_tai(req).sub, {
      ma_nv: chuoi(b, 'ma_nv', { toi_da: 40 }),
      pin_may: chuoi(b, 'pin_may', { toi_da: 32 }),
      chuc_danh: chuoi(b, 'chuc_danh', { toi_da: 200 }),
      cap_ms365: Object.hasOwn(b, 'cap_ms365') ? luan_ly(b, 'cap_ms365', true) : null,
      sku_id: chuoi(b, 'sku_id', { toi_da: 200 }),
      serial_may_cua: chuoi(b, 'serial_may_cua', { toi_da: 64 }),
    }, req.ip);
    return kq;
  });

  // ======================================================================  TU CHOI
  app.post('/de-nghi-nhan-su/:id/tu-choi', { preHandler: can_admin }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    const ly_do = chuoi_bat_buoc(b, 'ly_do', { toi_da: 500 });
    const so = await thuc_thi(
      `update de_nghi_them_nhan_su
          set trang_thai = 'da_tu_choi', ly_do_tu_choi = $2,
              admin_duyet_id = $3, admin_duyet_luc = now()
        where id = $1 and trang_thai = 'cho_duyet'`,
      [id, ly_do, nguoi_dung_hien_tai(req).sub]);
    if (so === 0) throw new LoiXungDot('Đề nghị không còn ở trạng thái chờ duyệt.');
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'tu_choi_de_nghi_nhan_su',
      'de_nghi_them_nhan_su', id, { ly_do }, req.ip);
    return { ok: true };
  });
}
