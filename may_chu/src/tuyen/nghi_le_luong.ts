// API: lich nghi le (VN/TQ), noi lam viec, ke hoach nghi le theo nam.
//
// Nghi le ap theo VI TRI lam viec: nhan vien gan mot noi lam viec, noi do gan mot lich nghi.
// Ke hoach nghi le khai theo KHOANG ngay (vd 29/8–2/9) roi BUNG ra tung ngay vao `ngay_le`
// (co `ke_hoach_id` de sau go lai theo cum). Sua ke hoach -> tinh lai cong khoang do.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { tinh_lai_khoang } from '../cong/tinh_cong.ts';
import { danh_sach_ngay } from '../tien_ich/thoi_gian.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, ngay_bat_buoc, so_nguyen, than, uuid_bat_buoc,
  LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

export async function tuyen_nghi_le_luong(app: FastifyInstance): Promise<void> {
  // ============================================================  LICH NGHI LE
  app.get('/lich-nghi', { preHandler: can_dang_nhap }, async () =>
    truy_van(`select ma, ten, quoc_gia, dang_dung from lich_nghi_le order by ma`),
  );

  // ============================================================  NOI LAM VIEC
  app.get('/noi-lam-viec', { preHandler: can_dang_nhap }, async () =>
    truy_van(
      `select n.id, n.ten, n.lich_nghi_ma, n.dia_chi, n.dang_dung, l.ten as lich_ten,
              (select count(*) from nhan_vien nv where nv.noi_lam_viec_id = n.id) as so_nguoi
         from noi_lam_viec n
         left join lich_nghi_le l on l.ma = n.lich_nghi_ma
        order by n.dang_dung desc, n.ten`,
    ),
  );

  app.post('/noi-lam-viec', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const dong = await truy_van_mot<{ id: string }>(
      `insert into noi_lam_viec(ten, lich_nghi_ma, dia_chi, dang_dung)
       values ($1,$2,$3,$4) returning id`,
      [
        chuoi_bat_buoc(b, 'ten', { toi_da: 120 }),
        chuoi_bat_buoc(b, 'lich_nghi_ma', { toi_da: 16 }),
        chuoi(b, 'dia_chi', { toi_da: 300 }),
        luan_ly(b, 'dang_dung', true),
      ],
    );
    return res.code(201).send(dong);
  });

  app.put('/noi-lam-viec/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const b = than(req.body);
    const so = await thuc_thi(
      `update noi_lam_viec set ten=$2, lich_nghi_ma=$3, dia_chi=$4, dang_dung=$5 where id=$1`,
      [
        id,
        chuoi_bat_buoc(b, 'ten', { toi_da: 120 }),
        chuoi_bat_buoc(b, 'lich_nghi_ma', { toi_da: 16 }),
        chuoi(b, 'dia_chi', { toi_da: 300 }),
        luan_ly(b, 'dang_dung', true),
      ],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy nơi làm việc.');
    return { ok: true };
  });

  // Gan noi lam viec cho mot nhan vien.
  app.put('/nhan-vien/:id/noi-lam-viec', { preHandler: can_nhan_su }, async (req) => {
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const b = than(req.body);
    const noi = b['noi_lam_viec_id'] === null || b['noi_lam_viec_id'] === undefined
      ? null
      : uuid_bat_buoc(b, 'noi_lam_viec_id');
    const so = await thuc_thi(
      'update nhan_vien set noi_lam_viec_id=$2, cap_nhat_luc=now() where id=$1',
      [id, noi],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy nhân viên.');
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'gan_noi_lam_viec', 'nhan_vien', id,
      { noi_lam_viec_id: noi }, req.ip);
    return { ok: true };
  });

  // ============================================================  KE HOACH NGHI LE THEO NAM
  app.get('/ke-hoach-nghi-le', { preHandler: can_dang_nhap }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const nam = so_nguyen(q, 'nam', { min: 2000, max: 2100 });
    return truy_van(
      `select k.id, k.nam, k.ten, to_char(k.tu_ngay,'YYYY-MM-DD') as tu_ngay,
              to_char(k.den_ngay,'YYYY-MM-DD') as den_ngay, k.lich_ma, k.huong_luong, k.ghi_chu,
              l.ten as lich_ten,
              (k.den_ngay - k.tu_ngay + 1) as so_ngay
         from ke_hoach_nghi_le k
         left join lich_nghi_le l on l.ma = k.lich_ma
        where $1::int is null or k.nam = $1
        order by k.tu_ngay desc`,
      [nam],
    );
  });

  // Tao ke hoach + BUNG ra ngay_le cho tung ngay trong khoang. Ca hai trong mot giao dich.
  app.post('/ke-hoach-nghi-le', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const tu = ngay_bat_buoc(b, 'tu_ngay');
    const den = ngay_bat_buoc(b, 'den_ngay');
    if (den < tu) throw new LoiKhongTim('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
    const ten = chuoi_bat_buoc(b, 'ten', { toi_da: 120 });
    const lich = chuoi(b, 'lich_ma', { toi_da: 16 }) ?? 'vn';
    const huong_luong = luan_ly(b, 'huong_luong', true);
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 300 });
    const nam = Number(tu.slice(0, 4));

    const id = await trong_giao_dich(async (khach) => {
      const kh = (await khach.query<{ id: string }>(
        `insert into ke_hoach_nghi_le(nam, ten, tu_ngay, den_ngay, lich_ma, huong_luong, ghi_chu, tao_boi)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [nam, ten, tu, den, lich, huong_luong, ghi_chu, nguoi_dung_hien_tai(req).sub],
      )).rows[0]!.id;
      for (const ng of danh_sach_ngay(tu, den)) {
        await khach.query(
          `insert into ngay_le(ngay, ten, huong_luong, lich_ma, ke_hoach_id)
           values ($1,$2,$3,$4,$5)
           on conflict (ngay, lich_ma) do update set
             ten = excluded.ten, huong_luong = excluded.huong_luong, ke_hoach_id = excluded.ke_hoach_id`,
          [ng, ten, huong_luong, lich, kh],
        );
      }
      return kh;
    });

    // Cham cong khoang do doi trang thai -> tinh lai.
    const so = await tinh_lai_khoang(tu, den);
    return res.code(201).send({ id, da_tinh_lai: so });
  });

  app.delete('/ke-hoach-nghi-le/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const kh = await truy_van_mot<{ tu_ngay: string; den_ngay: string }>(
      `select to_char(tu_ngay,'YYYY-MM-DD') as tu_ngay, to_char(den_ngay,'YYYY-MM-DD') as den_ngay
         from ke_hoach_nghi_le where id = $1`,
      [id],
    );
    if (kh === null) throw new LoiKhongTim('Không tìm thấy kế hoạch nghỉ.');
    // Xoa ke hoach -> ngay_le cua no cung xoa (ngay_le.ke_hoach_id on delete set null KHONG xoa
    // dong, nen xoa tay cac ngay thuoc ke hoach truoc).
    await trong_giao_dich(async (khach) => {
      await khach.query('delete from ngay_le where ke_hoach_id = $1', [id]);
      await khach.query('delete from ke_hoach_nghi_le where id = $1', [id]);
    });
    await tinh_lai_khoang(kh.tu_ngay, kh.den_ngay);
    return { ok: true };
  });
}
