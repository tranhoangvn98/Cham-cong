// API SO NGOAI LE CHAM CONG (migration 097): nhan su ghi cac ngay dac biet (bao, su kien bat
// kha khang...) de he thong bo qua luat "di muon / ve som qua 30 phut mat nua ngay cong" va/hoac
// khong tinh vang (khong tru phep) cho ngay do.
//
// Sau khi tao / sua / xoa mot muc thi tinh lai cong DUNG ngay do de bang cong phan anh ngay.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { tinh_lai_khoang } from '../cong/tinh_cong.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, than, trong_tap, uuid, ngay_bat_buoc, luan_ly,
  LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

/** Doc danh sach nhan vien tu than yeu cau (da kiem uuid). */
function doc_nhan_vien(b: Record<string, unknown>): string[] {
  const tho = b['nhan_vien_ids'];
  if (!Array.isArray(tho)) return [];
  const ra: string[] = [];
  for (const x of tho) {
    const id = uuid({ id: x }, 'id');
    if (id === null) throw new LoiDauVao('Danh sách nhân viên chứa mã không hợp lệ.');
    ra.push(id);
  }
  return ra;
}

export function tuyen_so_ngoai_le(app: FastifyInstance): void {
  /** Danh sach muc ngoai le trong mot khoang ngay (web gui tu/den cua thang dang xem). */
  app.get('/so-ngoai-le', { preHandler: can_nhan_su }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const tu = typeof q['tu'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q['tu']) ? q['tu'] : null;
    const den = typeof q['den'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q['den']) ? q['den'] : null;
    return truy_van(
      `select s.id, to_char(s.ngay, 'YYYY-MM-DD') as ngay, s.loai, s.ghi_chu,
              s.mien_di_muon, s.mien_ve_som, s.mien_vang, s.tao_luc, s.sua_luc,
              coalesce((select json_agg(json_build_object(
                          'id', nv.id, 'ma_nv', nv.ma_nv, 'ho_ten', nv.ho_ten)
                        order by nv.ma_nv)
                          from so_ngoai_le_nhan_vien snv
                          join nhan_vien nv on nv.id = snv.nhan_vien_id
                         where snv.so_ngoai_le_id = s.id), '[]') as nhan_vien
         from so_ngoai_le s
        where ($1::date is null or s.ngay >= $1)
          and ($2::date is null or s.ngay <= $2)
        order by s.ngay desc, s.tao_luc desc`,
      [tu, den],
    );
  });

  /** Tao muc ngoai le moi. Sau khi tao: tinh lai cong dung ngay do. */
  app.post('/so-ngoai-le', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const ngay = ngay_bat_buoc(b, 'ngay');
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });
    if (ghi_chu === null || ghi_chu.trim() === '') throw new LoiDauVao('Cần ghi rõ lý do ngoại lệ.');
    const loai = trong_tap(b, 'loai', ['tat_ca', 'nhan_vien'] as const, { bat_buoc: true }) as string;
    const mien_di_muon = luan_ly(b, 'mien_di_muon', true);
    const mien_ve_som = luan_ly(b, 'mien_ve_som', true);
    const mien_vang = luan_ly(b, 'mien_vang', false);
    const nhan_vien_ids = loai === 'nhan_vien' ? doc_nhan_vien(b) : [];
    if (loai === 'nhan_vien' && nhan_vien_ids.length === 0) {
      throw new LoiDauVao('Ngoại lệ áp cho nhân viên riêng thì phải chọn ít nhất một người.');
    }

    const id = await trong_giao_dich(async (khach) => {
      const dong = await khach.query<{ id: string }>(
        `insert into so_ngoai_le
           (ngay, loai, ghi_chu, mien_di_muon, mien_ve_som, mien_vang, tao_boi)
         values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [ngay, loai, ghi_chu, mien_di_muon, mien_ve_som, mien_vang, nd.sub],
      );
      const id_moi = dong.rows[0]!.id;
      for (const nv of nhan_vien_ids) {
        await khach.query(
          `insert into so_ngoai_le_nhan_vien(so_ngoai_le_id, nhan_vien_id) values ($1,$2)
           on conflict do nothing`,
          [id_moi, nv],
        );
      }
      return id_moi;
    });

    // Ap dung ngay: tinh lai cong cua dung ngay do cho toan cong ty (idempotent).
    await tinh_lai_khoang(ngay, ngay);
    await ghi_nhat_ky(nd.sub, 'tao_so_ngoai_le', 'so_ngoai_le', id,
      { ngay, loai, so_nhan_vien: nhan_vien_ids.length }, req.ip);
    return res.code(201).send({ id });
  });

  /** Sua mot muc ngoai le (doi ly do / loai mien / danh sach nguoi). Sau khi sua: tinh lai ngay. */
  app.patch('/so-ngoai-le/:id', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const p = req.params as Record<string, string>;
    const id = uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
    const cu = await truy_van_mot<{ ngay: string }>(
      'select to_char(ngay, \'YYYY-MM-DD\') as ngay from so_ngoai_le where id = $1', [id],
    );
    if (cu === null) throw new LoiKhongTim('Không tìm thấy mục ngoại lệ.');

    const b = than(req.body);
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });
    if (ghi_chu === null || ghi_chu.trim() === '') throw new LoiDauVao('Cần ghi rõ lý do ngoại lệ.');
    const loai = trong_tap(b, 'loai', ['tat_ca', 'nhan_vien'] as const, { bat_buoc: true }) as string;
    const mien_di_muon = luan_ly(b, 'mien_di_muon', true);
    const mien_ve_som = luan_ly(b, 'mien_ve_som', true);
    const mien_vang = luan_ly(b, 'mien_vang', false);
    const nhan_vien_ids = loai === 'nhan_vien' ? doc_nhan_vien(b) : [];
    if (loai === 'nhan_vien' && nhan_vien_ids.length === 0) {
      throw new LoiDauVao('Ngoại lệ áp cho nhân viên riêng thì phải chọn ít nhất một người.');
    }

    await trong_giao_dich(async (khach) => {
      await khach.query(
        `update so_ngoai_le set ghi_chu = $2, loai = $3, mien_di_muon = $4,
                mien_ve_som = $5, mien_vang = $6, sua_luc = now()
          where id = $1`,
        [id, ghi_chu, loai, mien_di_muon, mien_ve_som, mien_vang],
      );
      await khach.query('delete from so_ngoai_le_nhan_vien where so_ngoai_le_id = $1', [id]);
      for (const nv of nhan_vien_ids) {
        await khach.query(
          `insert into so_ngoai_le_nhan_vien(so_ngoai_le_id, nhan_vien_id) values ($1,$2)
           on conflict do nothing`,
          [id, nv],
        );
      }
    });

    await tinh_lai_khoang(cu.ngay, cu.ngay);
    await ghi_nhat_ky(nd.sub, 'sua_so_ngoai_le', 'so_ngoai_le', id,
      { ngay: cu.ngay, loai, so_nhan_vien: nhan_vien_ids.length }, req.ip);
    return { ok: true };
  });

  /** Xoa mot muc ngoai le. Sau khi xoa: tinh lai cong ngay do (tro ve luat thuong). */
  app.delete('/so-ngoai-le/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const p = req.params as Record<string, string>;
    const id = uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
    const cu = await truy_van_mot<{ ngay: string }>(
      'select to_char(ngay, \'YYYY-MM-DD\') as ngay from so_ngoai_le where id = $1', [id],
    );
    if (cu === null) throw new LoiKhongTim('Không tìm thấy mục ngoại lệ.');
    const kq = await thuc_thi('delete from so_ngoai_le where id = $1', [id]);
    if (kq === 0) throw new LoiKhongTim('Không tìm thấy mục ngoại lệ.');

    await tinh_lai_khoang(cu.ngay, cu.ngay);
    await ghi_nhat_ky(nd.sub, 'xoa_so_ngoai_le', 'so_ngoai_le', id, { ngay: cu.ngay }, req.ip);
    return { ok: true };
  });
}
