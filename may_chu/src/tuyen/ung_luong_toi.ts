// API: UNG LUONG TU PHUC VU (giao dien ca nhan cua tung nguoi).
//
// Nhan vien tu xem lich su ung luong cua chinh minh, gui de nghi ung (trang thai cho_duyet)
// va huy de nghi khi con cho duyet. Duyet/chi van di qua trang quan tri /api/ung-luong cua
// nhan su (tuyen/ung_luong.ts) — duong dan duy nhat cua quy trinh tien.
//
// Chi khoan 'da_chi' moi tru vao luong (xem luong/ky_luong.ts) — giong admin.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_dang_nhap, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { gui_ngam, tai_khoan_nguoi_duyet } from '../su_kien/thong_bao_day.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import {
  chuoi, ngay, uuid_bat_buoc,
  LoiDauVao, LoiKhongQuyen, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';
import { chuan_ngon_ngu, tra_chuoi, type NgonNgu } from '../chuoi/chi_muc.ts';

const RE_THANG = /^\d{4}-\d{2}$/;

/**
 * Thang ung khong duoc la thang DA QUA — thang qua thi ky luong da tinh/da chot, ung khong
 * con tru duoc vao luong. So sanh chuoi YYYY-MM la dung thu tu (thuan tu dien = thu tu thoi gian).
 */
export function thang_khong_qua_khu(thang: string, hom_nay: string): boolean {
  return thang >= hom_nay.slice(0, 7);
}

/** Ngon ngu cua nguoi dang goi — doc tu CSDL moi lan (JWT khong mang ngon_ngu). */
async function ngon_ngu_cua(req: FastifyRequest): Promise<NgonNgu> {
  const nd = nguoi_dung_hien_tai(req);
  return chuan_ngon_ngu((await truy_van_mot<{ ngon_ngu: string | null }>(
    'select ngon_ngu from nguoi_dung where id = $1', [nd.sub],
  ))?.ngon_ngu);
}

/** Nhan vien gan voi tai khoan dang goi; tai khoan khong gan nhan vien thi khong dung duoc. */
function nhan_vien_cua_toi_ung(req: FastifyRequest): string {
  const nd = nguoi_dung_hien_tai(req);
  if (nd.nv === null) {
    throw new LoiKhongQuyen(tra_chuoi('vi', 'ul_tk_khong_nhan_vien'));
  }
  return nd.nv;
}

/** Ho ten de dua vao thong bao. Khong tim thay thi tra chuoi trung tinh, khong nem loi. */
async function ten_nhan_vien_ung(nhan_vien_id: string): Promise<string> {
  const d = await truy_van_mot<{ ho_ten: string }>(
    'select ho_ten from nhan_vien where id = $1', [nhan_vien_id],
  );
  return d?.ho_ten ?? 'Một nhân viên';
}

/** Doc + kiem thang YYYY-MM. */
function doc_thang_ung(nguon: Record<string, unknown>, ngon_ngu: NgonNgu): string {
  const s = chuoi(nguon, 'thang', { bat_buoc: true, toi_da: 7, nhan: 'Tháng' });
  if (s === null) throw new LoiDauVao(tra_chuoi(ngon_ngu, 'ul_thang_thieu'));
  if (!RE_THANG.test(s)) throw new LoiDauVao(tra_chuoi(ngon_ngu, 'ul_thang_sai_dang'));
  return s;
}

export async function tuyen_ung_luong_toi(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', can_dang_nhap);

  // Lich su ung luong cua chinh minh (tat ca trang thai, moi nhat truoc).
  app.get('/ung-luong', async (req) => {
    const nv_id = nhan_vien_cua_toi_ung(req);
    return truy_van(
      `select u.id, u.thang, u.so_tien::float8 as so_tien,
              to_char(u.ngay_ung, 'YYYY-MM-DD') as ngay_ung,
              u.hinh_thuc, u.trang_thai, u.ly_do, u.ghi_chu,
              u.tao_luc, u.duyet_luc, u.chi_luc,
              nd.ten_dang_nhap as nguoi_duyet
         from ung_luong u
         left join nguoi_dung nd on nd.id = u.nguoi_duyet
        where u.nhan_vien_id = $1
        order by u.thang desc, u.tao_luc desc`,
      [nv_id],
    );
  });

  // Gui de nghi ung luong moi (trang thai cho_duyet) — nhan su duyet tren trang quan tri.
  app.post('/ung-luong', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const ngon_ngu = await ngon_ngu_cua(req);
    const nv_id = nhan_vien_cua_toi_ung(req);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const thang = doc_thang_ung(b, ngon_ngu);
    // So tien kiem tra THU CONG de loi ra bang dung ngon ngu nguoi dung (thu vien kiem_tra
    // nem chuoi tieng Viet co dinh).
    const tien_tho = b['so_tien'];
    const so_tien = typeof tien_tho === 'number' ? tien_tho : Number(String(tien_tho ?? '').trim());
    if (!Number.isFinite(so_tien) || so_tien < 1) {
      throw new LoiDauVao(tra_chuoi(ngon_ngu, 'ul_so_tien_sai'));
    }
    let ngay_ung: string | null;
    try {
      ngay_ung = ngay(b, 'ngay_ung');
    } catch {
      throw new LoiDauVao(tra_chuoi(ngon_ngu, 'ul_ngay_sai'));
    }
    const hinh_thuc = b['hinh_thuc'] === 'chuyen_khoan' ? 'chuyen_khoan' : 'tien_mat';
    const ly_do = chuoi(b, 'ly_do', { toi_da: 500 });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    if (!thang_khong_qua_khu(thang, ngay_dia_phuong(new Date()))) {
      throw new LoiDauVao(tra_chuoi(ngon_ngu, 'ul_thang_qua_khu'));
    }

    // Chan gui TRUNG: thang do da co khoan dang cho duyet hoac da duyet — tranh nhan nham 2 lan.
    const trung = await truy_van_mot<{ id: string }>(
      `select id from ung_luong
        where nhan_vien_id = $1 and thang = $2 and trang_thai in ('cho_duyet', 'da_duyet')
        limit 1`,
      [nv_id, thang],
    );
    if (trung !== null) throw new LoiXungDot(tra_chuoi(ngon_ngu, 'ul_trung_thang'));

    const dong = await truy_van_mot<{ id: string }>(
      `insert into ung_luong
         (nhan_vien_id, thang, so_tien, ngay_ung, hinh_thuc, ly_do, ghi_chu, nguoi_tao)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [nv_id, thang, so_tien, ngay_ung, hinh_thuc, ly_do, ghi_chu, nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'tao_ung_luong', 'ung_luong', dong?.id ?? null,
      { thang, so_tien, nguon: 'tu_phuc_vu' }, req.ip);

    // Bao nhan su co de nghi moi de duyet. Chuoi thong bao gio nhu cac gui_ngam khac.
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_nguoi_duyet(nv_id),
      tieu_de: tra_chuoi('vi', 'ul_thong_bao_de_nghi'),
      noi_dung: tra_chuoi('vi', 'ul_thong_bao_noi_dung', {
        ten: await ten_nhan_vien_ung(nv_id), thang,
      }),
      du_lieu: { man: 'ung-luong' },
    });
    return res.code(201).send(dong);
  });

  // Huy de nghi cua chinh minh — chi khi con cho_duyet (duyet/chi roi thi lien he nhan su).
  app.post('/ung-luong/:id/huy', async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const ngon_ngu = await ngon_ngu_cua(req);
    const nv_id = nhan_vien_cua_toi_ung(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');

    // Tra 404 cho khoan khong phai cua minh — khong tiet lo su ton tai (quy tac bao mat).
    const u = await truy_van_mot<{ id: string; trang_thai: string }>(
      'select id, trang_thai from ung_luong where id = $1 and nhan_vien_id = $2',
      [id, nv_id],
    );
    if (u === null) throw new LoiKhongTim(tra_chuoi(ngon_ngu, 'ul_khong_tim_thay'));
    if (u.trang_thai === 'huy') return { ok: true };
    if (u.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(tra_chuoi(ngon_ngu, 'ul_chi_huy_khi_cho_duyet'));
    }
    await thuc_thi(
      `update ung_luong set trang_thai='huy', cap_nhat_luc=now() where id=$1`, [id]);
    await ghi_nhat_ky(nd.sub, 'huy_ung_luong', 'ung_luong', id,
      { nguon: 'tu_phuc_vu' }, req.ip);
    return { ok: true };
  });
}
