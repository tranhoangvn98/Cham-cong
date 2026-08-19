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
import { can_dang_nhap_ke_ca_cho_duyet, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { chuoi_bat_buoc, LoiDauVao, than } from '../tien_ich/kiem_tra.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { gan_ma_am_tham } from '../dinh_danh/nghiep_vu.ts';
import {
  bat_dang_nhap_microsoft,
  doi_ma_lay_token,
  kiem_id_token,
  sinh_chuoi_ngau_nhien,
  thach_thuc_pkce,
  url_dang_nhap,
  LoiMicrosoft,
} from '../bao_mat/microsoft.ts';

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
    const LOI_CHUNG = { loi: 'Tên đăng nhập hoặc mật khẩu không đúng.' };

    if (nd === null) {
      // Van bam mot lan de thoi gian phan hoi khong to ra tai khoan khong ton tai.
      await kiem_tra_mat_khau(mat_khau, 'scrypt$32768$8$1$AAAA$AAAA');
      return res.code(401).send(LOI_CHUNG);
    }

    if (!nd.dang_hoat_dong) {
      return res.code(403).send({ loi: 'Tài khoản đã bị vô hiệu hóa.' });
    }

    if (nd.khoa_den !== null && nd.khoa_den.getTime() > Date.now()) {
      const con_phut = Math.ceil((nd.khoa_den.getTime() - Date.now()) / 60000);
      return res.code(429).send({
        loi: `Tài khoản tạm khóa do sai mật khẩu nhiều lần. Thử lại sau ${con_phut} phút.`,
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
      return res.code(401).send({ loi: 'Token làm mới không hợp lệ hoặc đã hết hạn.' });
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
        loi: 'Phiên không hợp lệ. Vì bảo mật, tất cả phiên đã bị đăng xuất. Vui lòng đăng nhập lại.',
      });
    }
    if (ket_qua.loi !== null) {
      return res.code(401).send({ loi: 'Token làm mới không hợp lệ hoặc đã hết hạn.' });
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
      return res.code(401).send({ loi: 'Tài khoản không còn hiệu lực.' });
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
  app.get('/toi', { preHandler: can_dang_nhap_ke_ca_cho_duyet }, async (req) => {
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
    preHandler: can_dang_nhap_ke_ca_cho_duyet,
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
    if (dong === null) return res.code(401).send({ loi: 'Tài khoản không tồn tại.' });

    if (!(await kiem_tra_mat_khau(cu, dong.mat_khau_hash))) {
      return res.code(400).send({ loi: 'Mật khẩu hiện tại không đúng.' });
    }
    if (cu === moi) throw new LoiDauVao('Mật khẩu mới phải khác mật khẩu cũ.');

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

    return res.send({ ok: true, thong_bao: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' });
  });

  // ================================================================ MICROSOFT (OIDC)
  //
  // Luong: webapp -> /microsoft/bat-dau -> trang dang nhap cua Microsoft -> /microsoft/goi-ve
  //     -> may chu doi ma lay id_token, doi chieu email -> phat token cua he thong
  //     -> chuyen huong ve webapp kem token trong PHAN NEO (#) cua URL.
  //
  // Dung phan neo chu khong phai chuoi truy van: phan neo khong duoc trinh duyet gui len
  // may chu nen khong bao gio loi vao log truy cap cua Caddy/nginx.

  /** Cho webapp biet co hien nut "Đăng nhập bằng Microsoft" hay khong. */
  app.get('/cau-hinh', async () => ({
    dang_nhap_microsoft: bat_dang_nhap_microsoft(),
  }));

  app.get('/microsoft/bat-dau', async (req, res) => {
    if (!bat_dang_nhap_microsoft()) {
      throw new LoiDauVao('Đăng nhập Microsoft chưa được cấu hình trên máy chủ này.');
    }
    const q = req.query as Record<string, unknown>;
    // Chi nhan duong dan noi bo — nhan URL tuyet doi la mo duong chuyen huong mo (open
    // redirect): ke tan cong gui link "dang nhap" roi day nan nhan sang trang gia.
    const quay_lai_tho = typeof q['quay_lai'] === 'string' ? q['quay_lai'] : '';
    const quay_lai = /^\/[^/\\]/.test(quay_lai_tho) ? quay_lai_tho : null;

    const state = sinh_chuoi_ngau_nhien();
    const nonce = sinh_chuoi_ngau_nhien();
    const ma_xac_minh = sinh_chuoi_ngau_nhien(48);

    await thuc_thi(
      `insert into phien_oidc(state, nonce, ma_xac_minh, quay_lai, het_han)
       values ($1,$2,$3,$4, now() + interval '10 minutes')`,
      [state, nonce, ma_xac_minh, quay_lai],
    );
    // Don phien qua han, khong can tien trinh nen rieng cho mot bang be nhu the nay.
    await thuc_thi('delete from phien_oidc where het_han < now()');

    return res.redirect(url_dang_nhap(state, nonce, thach_thuc_pkce(ma_xac_minh)), 302);
  });

  app.get('/microsoft/goi-ve', async (req, res) => {
    if (!bat_dang_nhap_microsoft()) throw new LoiDauVao('Đăng nhập Microsoft chưa được cấu hình.');
    const q = req.query as Record<string, unknown>;

    const ve_webapp = (duong: string): string => {
      const goc = cau_hinh.microsoft.goc_webapp.replace(/\/+$/, '');
      return `${goc}${duong}`;
    };
    const ve_loi = (ly_do: string): string =>
      ve_webapp(`/#loi_dang_nhap=${encodeURIComponent(ly_do)}`);

    // Nguoi dung bam Huy o man hinh Microsoft, hoac to chuc tu choi cap quyen.
    if (typeof q['error'] === 'string') {
      req.log.warn({ loi: q['error'], mo_ta: q['error_description'] }, 'Microsoft tra ve loi uy quyen');
      return res.redirect(ve_loi('Bạn đã hủy đăng nhập hoặc tổ chức từ chối cấp quyền.'), 302);
    }

    const ma = typeof q['code'] === 'string' ? q['code'] : '';
    const state = typeof q['state'] === 'string' ? q['state'] : '';
    if (ma === '' || state === '') return res.redirect(ve_loi('Thiếu tham số trả về từ Microsoft.'), 302);

    // Lay VA XOA phien trong cung mot cau lenh: state chi dung duoc dung mot lan.
    const phien = await truy_van_mot<{ nonce: string; ma_xac_minh: string; quay_lai: string | null }>(
      `delete from phien_oidc
        where state = $1 and het_han > now()
        returning nonce, ma_xac_minh, quay_lai`,
      [state],
    );
    if (phien === null) {
      return res.redirect(ve_loi('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Hãy thử lại.'), 302);
    }

    let tt;
    try {
      const id_token = await doi_ma_lay_token(ma, phien.ma_xac_minh);
      tt = await kiem_id_token(id_token, phien.nonce);
    } catch (loi) {
      req.log.warn({ err: loi }, 'kiem id_token that bai');
      const thong_bao = loi instanceof LoiMicrosoft ? loi.message : 'Không xác thực được với Microsoft.';
      return res.redirect(ve_loi(thong_bao), 302);
    }

    const nd = await tim_hoac_tao_theo_email(tt.email, tt.ho_ten, tt.oid);
    if (nd === null) {
      req.log.warn({ email: tt.email }, 'dang nhap Microsoft: email chua gan tai khoan nao');
      return res.redirect(
        ve_loi(`Tài khoản ${tt.email} chưa được khai trong hệ thống chấm công. Liên hệ nhân sự.`),
        302,
      );
    }
    if (!nd.dang_hoat_dong) {
      return res.redirect(ve_loi('Tài khoản đã bị vô hiệu hóa.'), 302);
    }

    // Dang nhap thanh cong -> xoa dem so lan sai va ghi nhan lan dang nhap.
    await thuc_thi(
      'update nguoi_dung set so_lan_sai = 0, khoa_den = null, dang_nhap_cuoi = now() where id = $1',
      [nd.id],
    );
    await ghi_nhat_ky(nd.id, 'dang_nhap_microsoft', 'nguoi_dung', nd.id, null, req.ip);

    // Ghi nho danh tinh Microsoft cua nguoi nay. `oid` chi lay duoc o day — no den tu
    // `id_token`, va truoc ban 1.32.0 he thong trich no ra roi bo di.
    //
    // KHONG BAO GIO LAM HONG VIEC DANG NHAP. Nguoi ta da xac thuc xong voi Microsoft; mot ma
    // trung (oid da thuoc ho so khac) hay mot loi CSDL o day khong duoc bien thanh "khong dang
    // nhap duoc". Ghi log de nguoi phu trach thay, roi di tiep.
    if (nd.nhan_vien_id !== null) {
      for (const [he_thong, gia_tri] of [
        ['microsoft_oid', tt.oid], ['microsoft_email', tt.email],
      ] as const) {
        if (gia_tri === '') continue;
        try {
          const cb = await gan_ma_am_tham(
            nd.nhan_vien_id, he_thong, gia_tri, 'dang_nhap_microsoft');
          if (cb !== null) req.log.warn({ he_thong, canh_bao: cb }, 'ghi ma dinh danh Microsoft');
        } catch (loi) {
          req.log.warn({ err: loi, he_thong }, 'khong ghi duoc ma dinh danh Microsoft');
        }
      }
    }

    const phien_moi = await phat_token(nd, 'Microsoft SSO');
    const neo = new URLSearchParams({
      token_truy_cap: phien_moi.token_truy_cap,
      token_lam_moi: phien_moi.token_lam_moi,
    });
    return res.redirect(ve_webapp(`${phien.quay_lai ?? '/'}#${neo.toString()}`), 302);
  });
}

/**
 * Doi chieu danh tinh Microsoft voi tai khoan trong he thong.
 *
 * Thu tu: `oid` da ghi nho -> email da gan san o tai khoan -> email cua ho so nhan vien. Khong
 * khop thi tra null (tu choi dang nhap), TRU KHI bat MS_TU_DONG_TAO.
 *
 * VI SAO `oid` DUNG TRUOC EMAIL: `oid` la ma dinh danh cua Entra va KHONG BAO GIO DOI, con email
 * (UPN) doi duoc — doi ten nguoi, doi ten mien, doi phong. Truoc day chi khop bang email, nen
 * doi email trong Entra la mat khop, va neu ten mien nam trong danh sach cho phep thi lan dang
 * nhap ke tiep TAO MOT TAI KHOAN THU HAI cho cung mot nguoi. `oid` di ra tu `id_token` da qua
 * `kiem_id_token` (chu ky, issuer, audience, nonce) nen no dang tin ngang email — that ra hon,
 * vi khong ai doi duoc no.
 */
export async function tim_hoac_tao_theo_email(
  email: string, ho_ten: string | null, oid: string,
): Promise<DongNguoiDung | null> {
  if (oid !== '') {
    const theo_oid = await truy_van_mot<DongNguoiDung>(
      `select nd.id, nd.ten_dang_nhap, nd.mat_khau_hash, nd.vai_tro, nd.nhan_vien_id,
              nd.dang_hoat_dong, nd.phai_doi_mat_khau, nd.so_lan_sai, nd.khoa_den, nv.ho_ten
         from ma_dinh_danh md
         join nhan_vien nv on nv.id = md.nhan_vien_id
         join nguoi_dung nd on nd.nhan_vien_id = nv.id
        where md.he_thong = 'microsoft_oid' and md.ma_chuan = lower($1)
          and md.hieu_luc_den is null`,
      [oid],
    );
    if (theo_oid !== null) return theo_oid;
  }

  const theo_tai_khoan = await truy_van_mot<DongNguoiDung>(
    `select nd.id, nd.ten_dang_nhap, nd.mat_khau_hash, nd.vai_tro, nd.nhan_vien_id,
            nd.dang_hoat_dong, nd.phai_doi_mat_khau, nd.so_lan_sai, nd.khoa_den, nv.ho_ten
       from nguoi_dung nd
       left join nhan_vien nv on nv.id = nd.nhan_vien_id
      where lower(nd.email_microsoft) = lower($1)`,
    [email],
  );
  if (theo_tai_khoan !== null) {
    // Tai khoan da co nhung CHUA gan ho so nhan vien: thu noi lai theo email.
    //
    // Rat hay gap — nguoi ta dang nhap lan dau truoc khi nhan su kip khai ho so. Truoc day
    // nhanh nay tra ve luon, nen ho so tao sau khong bao gio duoc noi vao, va quan tri
    // khong cap duoc vai tro nhan_vien / truong_phong cho ho du da lam dung huong dan.
    if (theo_tai_khoan.nhan_vien_id === null) {
      const nv = await truy_van_mot<{ id: string; ho_ten: string }>(
        'select id, ho_ten from nhan_vien where lower(email) = lower($1) and dang_hoat_dong = true',
        [email],
      );
      if (nv !== null) {
        await thuc_thi('update nguoi_dung set nhan_vien_id = $2 where id = $1',
          [theo_tai_khoan.id, nv.id]);
        return { ...theo_tai_khoan, nhan_vien_id: nv.id, ho_ten: nv.ho_ten };
      }
    }
    return theo_tai_khoan;
  }

  const theo_nhan_vien = await truy_van_mot<DongNguoiDung & { nhan_vien_co: string }>(
    `select nd.id, nd.ten_dang_nhap, nd.mat_khau_hash, nd.vai_tro, nd.nhan_vien_id,
            nd.dang_hoat_dong, nd.phai_doi_mat_khau, nd.so_lan_sai, nd.khoa_den,
            nv.ho_ten, nv.id as nhan_vien_co
       from nhan_vien nv
       join nguoi_dung nd on nd.nhan_vien_id = nv.id
      where lower(nv.email) = lower($1) and nv.dang_hoat_dong = true`,
    [email],
  );
  if (theo_nhan_vien !== null) {
    // Ghi nho de lan sau khoi phai doi chieu vong qua ho so nhan vien.
    await thuc_thi('update nguoi_dung set email_microsoft = $2 where id = $1', [theo_nhan_vien.id, email]);
    return theo_nhan_vien;
  }

  // Chua co tai khoan: chi tu tao khi email thuoc ten mien cua cong ty.
  const ten_mien = email.split('@')[1]?.toLowerCase() ?? '';
  const ds_ten_mien = cau_hinh.microsoft.ten_mien_cho_phep;
  if (ds_ten_mien.length === 0 || !ds_ten_mien.includes(ten_mien)) return null;

  // Vai tro `cho_duyet`: dang nhap duoc nhung MOI hook phan quyen deu tu choi, cho toi khi
  // admin phan vai tro. Bat MS_TU_DONG_TAO=1 thi bo qua buoc duyet, cap luon `nhan_vien`.
  const vai_tro: VaiTro = cau_hinh.microsoft.tu_dong_tao ? 'nhan_vien' : 'cho_duyet';

  // Ho so nhan vien van phai do nhan su khai — khong co ho so thi khong co PIN may,
  // khong tinh duoc cong. Co san thi gan luon cho do phai noi tay.
  const nv = await truy_van_mot<{ id: string; ho_ten: string }>(
    'select id, ho_ten from nhan_vien where lower(email) = lower($1) and dang_hoat_dong = true',
    [email],
  );
  // Vai tro `nhan_vien` bat buoc co ho so; khong co thi phai de o `cho_duyet`.
  const vai_tro_that: VaiTro = vai_tro === 'nhan_vien' && nv === null ? 'cho_duyet' : vai_tro;

  const moi = await truy_van_mot<{ id: string }>(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, nhan_vien_id,
                            email_microsoft, phai_doi_mat_khau)
     values ($1, $2, $3, $4, $5, false)
     returning id`,
    // Bam cua mot chuoi ngau nhien: tai khoan nay chi dang nhap bang Microsoft, khong ai
    // — ke ca quan tri — biet mat khau de dung duong mat khau.
    [email, await bam_mat_khau(sinh_chuoi_ngau_nhien(32)), vai_tro_that, nv?.id ?? null, email],
  );
  if (moi === null) return null;
  return {
    id: moi.id,
    ten_dang_nhap: email,
    mat_khau_hash: '',
    vai_tro: vai_tro_that,
    nhan_vien_id: nv?.id ?? null,
    dang_hoat_dong: true,
    phai_doi_mat_khau: false,
    so_lan_sai: 0,
    khoa_den: null,
    ho_ten: nv?.ho_ten ?? ho_ten,
  };
}
