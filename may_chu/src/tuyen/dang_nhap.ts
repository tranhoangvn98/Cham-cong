// Dang nhap / lam moi token / doi mat khau. Dung cho ca webapp va app dien thoai.
import type { FastifyInstance } from 'fastify';
import { truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import {
  bam_token,
  giai_ma_token,
  tao_token_lam_moi,
  tao_token_truy_cap,
  type VaiTro,
} from '../bao_mat/jwt.ts';
import { bam_mat_khau, kiem_tra_mat_khau, LoiMatKhau } from '../bao_mat/mat_khau.ts';
import { can_dang_nhap, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { chuoi_bat_buoc, LoiDauVao, than } from '../tien_ich/kiem_tra.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';

interface DongNguoiDung {
  id: string;
  ten_dang_nhap: string;
  mat_khau_hash: string;
  vai_tro: VaiTro;
  nhan_vien_id: string | null;
  dang_hoat_dong: boolean;
  phai_doi_mat_khau: boolean;
  so_lan_sai: number;
  khoa_den: Date | null;
  ho_ten: string | null;
}

const SO_LAN_SAI_TOI_DA = 8;
const KHOA_PHUT = 15;

async function nap_nguoi_dung(ten_dang_nhap: string): Promise<DongNguoiDung | null> {
  return truy_van_mot<DongNguoiDung>(
    `select nd.id, nd.ten_dang_nhap, nd.mat_khau_hash, nd.vai_tro, nd.nhan_vien_id,
            nd.dang_hoat_dong, nd.phai_doi_mat_khau, nd.so_lan_sai, nd.khoa_den,
            nv.ho_ten
       from nguoi_dung nd
       left join nhan_vien nv on nv.id = nd.nhan_vien_id
      where lower(nd.ten_dang_nhap) = lower($1)`,
    [ten_dang_nhap],
  );
}

async function phat_token(nd: DongNguoiDung, mo_ta_thiet_bi: string | null) {
  const noi_dung = {
    sub: nd.id,
    vai_tro: nd.vai_tro,
    nv: nd.nhan_vien_id,
    ten: nd.ho_ten ?? nd.ten_dang_nhap,
  };
  const truy_cap = tao_token_truy_cap(noi_dung);
  const lam_moi = tao_token_lam_moi(noi_dung);

  await thuc_thi(
    `insert into token_lam_moi(nguoi_dung_id, token_hash, het_han, mo_ta_thiet_bi)
     values ($1, $2, $3, $4)`,
    [nd.id, bam_token(lam_moi.token), lam_moi.het_han, mo_ta_thiet_bi],
  );

  return {
    token_truy_cap: truy_cap.token,
    token_lam_moi: lam_moi.token,
    het_han_sau_giay: cau_hinh.jwt.access_ttl,
    // Client PHAI format moc thoi gian theo offset nay, khong dung mui gio may cua nguoi xem:
    // gio cham cong la gio tai noi dat may, doc tren may khac mui gio se ra so khac.
    mui_gio_offset_gio: cau_hinh.device_tz_offset_hours,
    nguoi_dung: {
      id: nd.id,
      ten_dang_nhap: nd.ten_dang_nhap,
      vai_tro: nd.vai_tro,
      nhan_vien_id: nd.nhan_vien_id,
      ho_ten: nd.ho_ten,
      phai_doi_mat_khau: nd.phai_doi_mat_khau,
    },
  };
}

export async function tuyen_dang_nhap(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------------ dang nhap
  app.post('/dang-nhap', {
    // Chong do mat khau: gioi han theo IP.
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, res) => {
    const b = than(req.body);
    const ten_dang_nhap = chuoi_bat_buoc(b, 'ten_dang_nhap', { toi_da: 100 });
    const mat_khau = chuoi_bat_buoc(b, 'mat_khau', { toi_da: 200 });
    const mo_ta = (b['thiet_bi'] === undefined ? null : String(b['thiet_bi']).slice(0, 200));

    const nd = await nap_nguoi_dung(ten_dang_nhap);

    // Thong diep chung cho moi truong hop sai — khong tiet lo tai khoan co ton tai hay khong.
    const LOI_CHUNG = { loi: 'Ten dang nhap hoac mat khau khong dung.' };

    if (nd === null) {
      // Van bam mot lan de thoi gian phan hoi khong to ra tai khoan khong ton tai.
      await kiem_tra_mat_khau(mat_khau, 'scrypt$32768$8$1$AAAA$AAAA');
      return res.code(401).send(LOI_CHUNG);
    }

    if (!nd.dang_hoat_dong) {
      return res.code(403).send({ loi: 'Tai khoan da bi vo hieu hoa.' });
    }

    if (nd.khoa_den !== null && nd.khoa_den.getTime() > Date.now()) {
      const con_phut = Math.ceil((nd.khoa_den.getTime() - Date.now()) / 60000);
      return res.code(429).send({
        loi: `Tai khoan tam khoa do sai mat khau nhieu lan. Thu lai sau ${con_phut} phut.`,
      });
    }

    const dung = await kiem_tra_mat_khau(mat_khau, nd.mat_khau_hash);
    if (!dung) {
      const so_lan = nd.so_lan_sai + 1;
      const khoa = so_lan >= SO_LAN_SAI_TOI_DA;
      await thuc_thi(
        `update nguoi_dung
            set so_lan_sai = $2,
                khoa_den = case when $3 then now() + ($4 || ' minutes')::interval else khoa_den end
          where id = $1`,
        [nd.id, khoa ? 0 : so_lan, khoa, String(KHOA_PHUT)],
      );
      req.log.warn({ ten_dang_nhap, ip: req.ip }, 'dang nhap sai mat khau');
      return res.code(401).send(LOI_CHUNG);
    }

    await thuc_thi(
      'update nguoi_dung set so_lan_sai = 0, khoa_den = null, dang_nhap_cuoi = now() where id = $1',
      [nd.id],
    );
    await ghi_nhat_ky(nd.id, 'dang_nhap', 'nguoi_dung', nd.id, null, req.ip);

    return res.send(await phat_token(nd, mo_ta));
  });

  // ------------------------------------------------------------------ lam moi token
  app.post('/lam-moi', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (req, res) => {
    const b = than(req.body);
    const token = chuoi_bat_buoc(b, 'token_lam_moi', { toi_da: 4000 });

    const nd_token = giai_ma_token(token);
    if (nd_token === null || nd_token.loai !== 'lm') {
      return res.code(401).send({ loi: 'Token lam moi khong hop le hoac da het han.' });
    }

    const hash = bam_token(token);

    // Xoay token: thu hoi token cu va phat cap moi trong cung transaction.
    // Neu token da bi thu hoi truoc do -> co the bi danh cap va dung lai -> thu hoi TAT CA.
    const ket_qua = await trong_giao_dich(async (khach) => {
      const dong = await khach.query<{ id: string; thu_hoi_luc: Date | null; het_han: Date }>(
        'select id, thu_hoi_luc, het_han from token_lam_moi where token_hash = $1 for update',
        [hash],
      );
      const t = dong.rows[0];
      if (t === undefined) return { loi: 'khong_ton_tai' as const };
      if (t.thu_hoi_luc !== null) {
        // Dung lai token da thu hoi = dau hieu bi danh cap. Cat toan bo phien.
        await khach.query(
          'update token_lam_moi set thu_hoi_luc = now() where nguoi_dung_id = $1 and thu_hoi_luc is null',
          [nd_token.sub],
        );
        return { loi: 'da_thu_hoi' as const };
      }
      if (t.het_han.getTime() <= Date.now()) return { loi: 'het_han' as const };

      await khach.query('update token_lam_moi set thu_hoi_luc = now() where id = $1', [t.id]);
      return { loi: null };
    });

    if (ket_qua.loi === 'da_thu_hoi') {
      req.log.warn({ nguoi_dung: nd_token.sub, ip: req.ip }, 'dung lai token lam moi da thu hoi');
      return res.code(401).send({
        loi: 'Phien khong hop le. Vi bao mat, tat ca phien da bi dang xuat. Vui long dang nhap lai.',
      });
    }
    if (ket_qua.loi !== null) {
      return res.code(401).send({ loi: 'Token lam moi khong hop le hoac da het han.' });
    }

    const nd = await truy_van_mot<DongNguoiDung>(
      `select nd.id, nd.ten_dang_nhap, nd.mat_khau_hash, nd.vai_tro, nd.nhan_vien_id,
              nd.dang_hoat_dong, nd.phai_doi_mat_khau, nd.so_lan_sai, nd.khoa_den, nv.ho_ten
         from nguoi_dung nd
         left join nhan_vien nv on nv.id = nd.nhan_vien_id
        where nd.id = $1`,
      [nd_token.sub],
    );
    if (nd === null || !nd.dang_hoat_dong) {
      return res.code(401).send({ loi: 'Tai khoan khong con hieu luc.' });
    }

    return res.send(await phat_token(nd, null));
  });

  // ------------------------------------------------------------------ dang xuat
  app.post('/dang-xuat', async (req, res) => {
    const b = than(req.body ?? {});
    const token = typeof b['token_lam_moi'] === 'string' ? b['token_lam_moi'] : null;
    if (token !== null) {
      await thuc_thi(
        'update token_lam_moi set thu_hoi_luc = now() where token_hash = $1 and thu_hoi_luc is null',
        [bam_token(token)],
      );
    }
    return res.send({ ok: true });
  });

  // ------------------------------------------------------------------ thong tin phien
  app.get('/toi', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const chi_tiet = await truy_van_mot<{
      ten_dang_nhap: string;
      phai_doi_mat_khau: boolean;
      ho_ten: string | null;
      ma_nv: string | null;
      phong_ban: string | null;
      duoc_cham_cong_dien_thoai: boolean | null;
    }>(
      `select nd.ten_dang_nhap, nd.phai_doi_mat_khau,
              nv.ho_ten, nv.ma_nv, pb.ten as phong_ban, nv.duoc_cham_cong_dien_thoai
         from nguoi_dung nd
         left join nhan_vien nv on nv.id = nd.nhan_vien_id
         left join phong_ban  pb on pb.id = nv.phong_ban_id
        where nd.id = $1`,
      [nd.sub],
    );
    return {
      id: nd.sub,
      vai_tro: nd.vai_tro,
      nhan_vien_id: nd.nv,
      mui_gio_offset_gio: cau_hinh.device_tz_offset_hours,
      ...chi_tiet,
    };
  });

  // ------------------------------------------------------------------ doi mat khau
  app.post('/doi-mat-khau', {
    preHandler: can_dang_nhap,
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const cu = chuoi_bat_buoc(b, 'mat_khau_cu', { toi_da: 200 });
    const moi = chuoi_bat_buoc(b, 'mat_khau_moi', { toi_da: 200 });

    const dong = await truy_van_mot<{ mat_khau_hash: string }>(
      'select mat_khau_hash from nguoi_dung where id = $1',
      [nd.sub],
    );
    if (dong === null) return res.code(401).send({ loi: 'Tai khoan khong ton tai.' });

    if (!(await kiem_tra_mat_khau(cu, dong.mat_khau_hash))) {
      return res.code(400).send({ loi: 'Mat khau hien tai khong dung.' });
    }
    if (cu === moi) throw new LoiDauVao('Mat khau moi phai khac mat khau cu.');

    let hash: string;
    try {
      hash = await bam_mat_khau(moi);
    } catch (loi) {
      if (loi instanceof LoiMatKhau) throw new LoiDauVao(loi.message);
      throw loi;
    }

    // Doi mat khau = thu hoi moi phien khac, buoc dang nhap lai tren cac thiet bi cu.
    await trong_giao_dich(async (khach) => {
      await khach.query(
        'update nguoi_dung set mat_khau_hash = $2, phai_doi_mat_khau = false where id = $1',
        [nd.sub, hash],
      );
      await khach.query(
        'update token_lam_moi set thu_hoi_luc = now() where nguoi_dung_id = $1 and thu_hoi_luc is null',
        [nd.sub],
      );
    });
    await ghi_nhat_ky(nd.sub, 'doi_mat_khau', 'nguoi_dung', nd.sub, null, req.ip);

    return res.send({ ok: true, thong_bao: 'Da doi mat khau. Vui long dang nhap lai.' });
  });
}
