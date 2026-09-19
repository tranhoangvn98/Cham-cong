// API: QUAN LY UNG LUONG (tam ung luong).
//
// Quy trinh mot khoan ung: cho_duyet -> da_duyet -> da_chi (da giao tien) / huy.
// CHI khoan 'da_chi' moi thuc su tru vao luong: khi tinh phieu, tong ung 'da_chi' cua
// (nguoi, thang) sinh khoan tru 'da_tam_ung' -> thuc linh da net. Ai thuc linh <= 0 (ung
// du/qua) thi khong ra dong o lenh chi. Xem: luong/ky_luong.ts va luong/lenh_chi.ts.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_nhan_su, can_admin, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, ngay, so_thuc, than, trong_tap, uuid, uuid_bat_buoc,
  LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';

const RE_THANG = /^\d{4}-\d{2}$/;

/** Doc + kiem thang YYYY-MM. */
function doc_thang(nguon: Record<string, unknown>, bat_buoc = true): string | null {
  const s = chuoi(nguon, 'thang', { bat_buoc, toi_da: 7, nhan: 'Tháng' });
  if (s === null) return null;
  if (!RE_THANG.test(s)) throw new LoiDauVao('Tháng phải có dạng YYYY-MM.');
  return s;
}

/** Lay mot khoan ung theo id, hoac nem 404. */
async function lay_ung(id: string): Promise<{ id: string; trang_thai: string; thang: string }> {
  const u = await truy_van_mot<{ id: string; trang_thai: string; thang: string }>(
    'select id, trang_thai, thang from ung_luong where id = $1', [id],
  );
  if (u === null) throw new LoiKhongTim('Không tìm thấy khoản ứng lương.');
  return u;
}

export async function tuyen_ung_luong(app: FastifyInstance): Promise<void> {
  // Danh sach ung luong, loc theo thang / nhan vien / trang thai.
  app.get('/ung-luong', { preHandler: can_nhan_su }, async (req) => {
    const q = than((req as { query?: unknown }).query ?? {});
    const thang = doc_thang(q, false);
    const nhan_vien_id = uuid(q, 'nhan_vien_id');
    const trang_thai = trong_tap(q, 'trang_thai',
      ['cho_duyet', 'da_duyet', 'da_chi', 'huy'] as const, {});
    return truy_van(
      `select u.id, u.nhan_vien_id, nv.ma_nv, nv.ho_ten, u.thang,
              u.so_tien::float8 as so_tien, to_char(u.ngay_ung,'YYYY-MM-DD') as ngay_ung,
              u.hinh_thuc, u.trang_thai, u.ly_do, u.ghi_chu,
              u.tao_luc, u.duyet_luc, u.chi_luc,
              nt.ten_dang_nhap as nguoi_tao, nd.ten_dang_nhap as nguoi_duyet
         from ung_luong u
         join nhan_vien nv on nv.id = u.nhan_vien_id
         left join nguoi_dung nt on nt.id = u.nguoi_tao
         left join nguoi_dung nd on nd.id = u.nguoi_duyet
        where ($1::text is null or u.thang = $1)
          and ($2::uuid is null or u.nhan_vien_id = $2)
          and ($3::text is null or u.trang_thai = $3)
        order by u.thang desc, nv.ma_nv, u.tao_luc desc`,
      [thang, nhan_vien_id, trang_thai],
    );
  });

  // Tao khoan ung moi (trang thai cho_duyet).
  app.post('/ung-luong', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const nhan_vien_id = uuid_bat_buoc(b, 'nhan_vien_id');
    const thang = doc_thang(b, true)!;
    const so_tien = so_thuc(b, 'so_tien', { bat_buoc: true, min: 1 })!;
    const ngay_ung = ngay(b, 'ngay_ung');
    const hinh_thuc = trong_tap(b, 'hinh_thuc',
      ['tien_mat', 'chuyen_khoan'] as const, {}) ?? 'tien_mat';
    const ly_do = chuoi(b, 'ly_do', { toi_da: 500 });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const nv = await truy_van_mot<{ id: string }>(
      'select id from nhan_vien where id = $1', [nhan_vien_id]);
    if (nv === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');

    const dong = await truy_van_mot<{ id: string }>(
      `insert into ung_luong
         (nhan_vien_id, thang, so_tien, ngay_ung, hinh_thuc, ly_do, ghi_chu, nguoi_tao)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [nhan_vien_id, thang, so_tien, ngay_ung, hinh_thuc, ly_do, ghi_chu, nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'tao_ung_luong', 'ung_luong', dong!.id,
      { nhan_vien_id, thang, so_tien }, req.ip);
    return res.code(201).send(dong);
  });

  // Sua khoan ung — chi khi con cho_duyet (chua ai duyet/chi).
  app.patch('/ung-luong/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const u = await lay_ung(id);
    if (u.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot('Chỉ sửa được khoản ứng khi còn chờ duyệt.');
    }
    const b = than(req.body);
    const so_tien = so_thuc(b, 'so_tien', { bat_buoc: true, min: 1 })!;
    const ngay_ung = ngay(b, 'ngay_ung');
    const hinh_thuc = trong_tap(b, 'hinh_thuc',
      ['tien_mat', 'chuyen_khoan'] as const, {}) ?? 'tien_mat';
    const ly_do = chuoi(b, 'ly_do', { toi_da: 500 });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });
    await thuc_thi(
      `update ung_luong set so_tien=$2, ngay_ung=$3, hinh_thuc=$4, ly_do=$5, ghi_chu=$6,
              cap_nhat_luc=now() where id=$1`,
      [id, so_tien, ngay_ung, hinh_thuc, ly_do, ghi_chu],
    );
    await ghi_nhat_ky(nd.sub, 'sua_ung_luong', 'ung_luong', id, { so_tien }, req.ip);
    return { ok: true };
  });

  // Duyet: cho_duyet -> da_duyet.
  app.post('/ung-luong/:id/duyet', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const u = await lay_ung(id);
    if (u.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(`Khoản ứng đang ở trạng thái "${u.trang_thai}", không duyệt được.`);
    }
    await thuc_thi(
      `update ung_luong set trang_thai='da_duyet', nguoi_duyet=$2, duyet_luc=now(),
              cap_nhat_luc=now() where id=$1`,
      [id, nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'duyet_ung_luong', 'ung_luong', id, null, req.ip);
    return { ok: true };
  });

  // Danh dau da chi (da giao tien): da_duyet -> da_chi. Tu day moi tru vao luong/lenh chi.
  app.post('/ung-luong/:id/da-chi', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const u = await lay_ung(id);
    if (u.trang_thai !== 'da_duyet') {
      throw new LoiXungDot('Chỉ đánh dấu đã chi khi khoản ứng đã được duyệt.');
    }
    await thuc_thi(
      `update ung_luong set trang_thai='da_chi', chi_luc=now(), cap_nhat_luc=now() where id=$1`,
      [id],
    );
    await ghi_nhat_ky(nd.sub, 'chi_ung_luong', 'ung_luong', id, { thang: u.thang }, req.ip);
    // Bao cho nguoi dung biet phai tinh lai ky de khoan ung phan anh vao phieu.
    return { ok: true, luu_y: 'Hãy "Tính lương" tháng này để khoản ứng trừ vào phiếu.' };
  });

  // Huy khoan ung — chi khi chua chi (cho_duyet/da_duyet). Da chi roi thi khong huy suong.
  app.post('/ung-luong/:id/huy', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const u = await lay_ung(id);
    if (u.trang_thai === 'da_chi') {
      throw new LoiXungDot('Khoản ứng đã chi tiền, không hủy được. Hãy điều chỉnh ở kỳ lương.');
    }
    if (u.trang_thai === 'huy') return { ok: true };
    await thuc_thi(
      `update ung_luong set trang_thai='huy', cap_nhat_luc=now() where id=$1`, [id]);
    await ghi_nhat_ky(nd.sub, 'huy_ung_luong', 'ung_luong', id, null, req.ip);
    return { ok: true };
  });

  // Xoa han — chi khoan cho_duyet moi xoa duoc (chua vao quy trinh).
  app.delete('/ung-luong/:id', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const u = await lay_ung(id);
    if (u.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot('Chỉ xóa được khoản ứng khi còn chờ duyệt (đã duyệt thì Hủy).');
    }
    await thuc_thi('delete from ung_luong where id = $1', [id]);
    await ghi_nhat_ky(nd.sub, 'xoa_ung_luong', 'ung_luong', id, null, req.ip);
    return { ok: true };
  });
}
