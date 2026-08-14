// API tich hop /api/v1/* — danh cho HE THONG NGOAI, khong phai cho webapp.
//
// Ba khac biet co y so voi /api/* dang co, va deu la vi ben goi la MAY chu khong phai
// nguoi ngoi truoc man hinh:
//
//  1. Xac thuc bang KHOA API + pham vi quyen, khong phai JWT 15 phut.
//  2. Duong dan co SO PHIEN BAN (/v1). Doi hinh dang phan hoi cua /api/* thi chi phai sua
//     webapp cua minh; doi cua /api/v1/* thi ERP ben kia hong ma minh khong biet. Co /v1
//     nghia la khi can doi, ta them /v2 va cho hai ban song song mot thoi gian.
//  3. Hinh dang phan hoi CO DINH: { du_lieu, phan_trang } cho danh sach, { loi: { ma,
//     thong_diep } } cho loi. `ma` la thu client doi chieu bang code — doi chu tieng Viet
//     trong `thong_diep` khong duoc lam hong ben nao.
//
// Dinh danh doi ngoai la `ma_nv`, KHONG phai `id` (uuid noi bo). ERP va he thong nhan su
// khac deu biet ma nhan vien; uuid cua ta thi khong ai biet, va lo doi CSDL la ho hong het.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { can_khoa_api, ghi_lan_goi } from '../bao_mat/khoa_api.ts';
import {
  LoiKhongTim, chuoi, chuoi_bat_buoc, khoang_ngay, ngay, phan_trang, than,
} from '../tien_ich/kiem_tra.ts';

interface PhanTrang {
  gioi_han: number;
  bo_qua: number;
  tong: number;
}

function goi_ra<T>(du_lieu: T[], pt: PhanTrang): { du_lieu: T[]; phan_trang: PhanTrang } {
  return { du_lieu, phan_trang: pt };
}

/** Ma nhan vien tu duong dan. */
function lay_ma_nv(req: FastifyRequest): string {
  const p = req.params as Record<string, unknown>;
  const ma = String(p['ma_nv'] ?? '').trim();
  if (ma === '' || ma.length > 64) throw new LoiKhongTim('Không tìm thấy nhân viên.');
  return ma;
}

async function nhan_vien_theo_ma(ma_nv: string): Promise<{ id: string; ma_nv: string }> {
  const nv = await truy_van_mot<{ id: string; ma_nv: string }>(
    'select id, ma_nv from nhan_vien where lower(ma_nv) = lower($1)', [ma_nv],
  );
  if (nv === null) throw new LoiKhongTim(`Không tìm thấy nhân viên có mã "${ma_nv}".`);
  return nv;
}

/**
 * Plugin Fastify — dang ky voi prefix '/api/v1'.
 */
export async function tuyen_tich_hop(app: FastifyInstance): Promise<void> {
  // Ghi nhat ky MOI lan goi trong pham vi /api/v1, ke ca lan bi tu choi 401/403. Ben tich
  // hop bao "hom qua khong lay duoc du lieu" thi phai tra ra duoc ho co goi that khong.
  app.addHook('onRequest', async (req) => {
    (req as { _bat_dau?: number })._bat_dau = Date.now();
  });
  app.addHook('onResponse', async (req, res) => {
    const bd = (req as { _bat_dau?: number })._bat_dau ?? Date.now();
    await ghi_lan_goi(
      req.khoa_api?.id ?? null, req.url, req.method, res.statusCode, req.ip, Date.now() - bd,
    );
  });

  // ------------------------------------------------------------ danh tinh khoa
  //
  // Ben tich hop goi dau tien de biet khoa cua ho con song va co nhung pham vi nao. Khong
  // co duong nay thi cach duy nhat de kiem tra la goi bua mot endpoint that.
  app.get('/toi', { preHandler: can_khoa_api() }, async (req) => ({
    du_lieu: {
      ten: req.khoa_api?.ten ?? null,
      pham_vi: req.khoa_api?.pham_vi ?? [],
      may_chu_luc: new Date().toISOString(),
    },
  }));

  // ------------------------------------------------------------ nhan vien
  app.get('/nhan-vien', { preHandler: can_khoa_api('nhan_vien:doc') }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { gioi_han, bo_qua } = phan_trang(q, 100, 500);
    const tim = chuoi(q, 'tim', { toi_da: 100 });
    // Mac dinh CHI tra nguoi dang lam. He thong luong lay nham ca nguoi da nghi thi tinh
    // luong cho nguoi khong con lam viec.
    const gom_da_nghi = String(q['gom_da_nghi'] ?? '') === 'true';

    const dieu_kien: string[] = [];
    const tham_so: unknown[] = [];
    if (!gom_da_nghi) dieu_kien.push('nv.dang_hoat_dong = true');
    if (tim !== null) {
      tham_so.push(`%${tim}%`);
      dieu_kien.push(`(nv.ma_nv ilike $${tham_so.length} or nv.ho_ten ilike $${tham_so.length})`);
    }
    const where = dieu_kien.length > 0 ? `where ${dieu_kien.join(' and ')}` : '';

    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from nhan_vien nv ${where}`, tham_so,
    );
    const dong = await truy_van(
      `select nv.ma_nv, nv.ho_ten, nv.email, nv.so_dien_thoai, nv.pin_may, nv.chuc_danh,
              nv.ngay_vao, nv.ngay_nghi_viec, nv.dang_hoat_dong, nv.ma_erp,
              pb.ten as phong_ban, cl.ten as ca_lam
         from nhan_vien nv
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ca_lam cl on cl.id = nv.ca_lam_id
         ${where}
        order by nv.ma_nv
        limit $${tham_so.length + 1} offset $${tham_so.length + 2}`,
      [...tham_so, gioi_han, bo_qua],
    );
    return goi_ra(dong, { gioi_han, bo_qua, tong: dem?.tong ?? 0 });
  });

  app.get('/nhan-vien/:ma_nv', { preHandler: can_khoa_api('nhan_vien:doc') }, async (req) => {
    const nv = await nhan_vien_theo_ma(lay_ma_nv(req));
    const dong = await truy_van_mot(
      `select nv.ma_nv, nv.ho_ten, nv.email, nv.so_dien_thoai, nv.pin_may, nv.chuc_danh,
              nv.ngay_vao, nv.ngay_chinh_thuc, nv.ngay_nghi_viec, nv.dang_hoat_dong,
              nv.ma_erp, pb.ten as phong_ban, cl.ten as ca_lam
         from nhan_vien nv
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ca_lam cl on cl.id = nv.ca_lam_id
        where nv.id = $1`,
      [nv.id],
    );
    return { du_lieu: dong };
  });

  // ------------------------------------------------------------ bang cong
  //
  // Duong quan trong nhat: he thong luong lay o day. Tra ve theo NGAY chu khong phai da
  // tong hop san — ben kia co quy tac tinh luong rieng, dua so lieu tho de ho tu cong.
  app.get('/bang-cong', { preHandler: can_khoa_api('bang_cong:doc') }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 400);
    const { gioi_han, bo_qua } = phan_trang(q, 200, 1000);
    const ma_nv = chuoi(q, 'ma_nv', { toi_da: 64 });
    // Mac dinh CHI tra ngay da chot. Bang cong chua chot con doi khi nhan su sua tay hoac
    // co don nghi duyet sau — ben luong lay ban chua chot thi tinh xong roi so lieu doi.
    const gom_chua_chot = String(q['gom_chua_chot'] ?? '') === 'true';

    const dk = ['bc.ngay between $1 and $2'];
    const ts: unknown[] = [tu, den];
    if (!gom_chua_chot) dk.push('bc.da_chot = true');
    if (ma_nv !== null) {
      ts.push(ma_nv);
      dk.push(`lower(nv.ma_nv) = lower($${ts.length})`);
    }
    const where = `where ${dk.join(' and ')}`;

    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id ${where}`, ts,
    );
    const dong = await truy_van(
      `select nv.ma_nv, nv.ho_ten, nv.ma_erp, bc.ngay, bc.trang_thai,
              bc.gio_vao, bc.gio_ra, bc.phut_lam, bc.phut_muon, bc.phut_ve_som,
              bc.phut_ot, bc.so_cong, bc.co_dieu_chinh, bc.da_chot, bc.ghi_chu
         from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id
         ${where}
        order by bc.ngay, nv.ma_nv
        limit $${ts.length + 1} offset $${ts.length + 2}`,
      [...ts, gioi_han, bo_qua],
    );
    return goi_ra(dong, { gioi_han, bo_qua, tong: dem?.tong ?? 0 });
  });

  /** Tong hop theo thang cho mot ky luong — tien cho ERP khong muon tu cong. */
  app.get('/bang-cong/tong-hop', { preHandler: can_khoa_api('bang_cong:doc') }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const thang = chuoi_bat_buoc(q, 'thang', { toi_da: 7 });
    if (!/^\d{4}-\d{2}$/.test(thang)) {
      throw new LoiKhongTim('Tham số "thang" phải có dạng YYYY-MM.');
    }
    const gom_chua_chot = String(q['gom_chua_chot'] ?? '') === 'true';
    const dong = await truy_van(
      `select nv.ma_nv, nv.ho_ten, nv.ma_erp,
              count(*) filter (where bc.trang_thai = 'co_mat')::int as ngay_co_mat,
              count(*) filter (where bc.trang_thai = 'nghi_phep')::int as ngay_nghi_phep,
              count(*) filter (where bc.trang_thai = 'vang')::int as ngay_vang,
              coalesce(sum(bc.so_cong), 0) as tong_cong,
              coalesce(sum(bc.phut_lam), 0)::int as tong_phut_lam,
              coalesce(sum(bc.phut_ot), 0)::int as tong_phut_ot,
              coalesce(sum(bc.phut_muon), 0)::int as tong_phut_muon,
              coalesce(sum(bc.phut_ve_som), 0)::int as tong_phut_ve_som,
              bool_and(bc.da_chot) as da_chot_het
         from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id
        where to_char(bc.ngay, 'YYYY-MM') = $1
          and ($2::bool or bc.da_chot = true)
        group by nv.ma_nv, nv.ho_ten, nv.ma_erp
        order by nv.ma_nv`,
      [thang, gom_chua_chot],
    );
    return { du_lieu: dong, thang };
  });

  // ------------------------------------------------------------ lan quet tho
  app.get('/lan-quet', { preHandler: can_khoa_api('lan_quet:doc') }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 92);
    const { gioi_han, bo_qua } = phan_trang(q, 200, 1000);
    const ma_nv = chuoi(q, 'ma_nv', { toi_da: 64 });

    const dk = ['lq.thoi_diem >= $1::date', 'lq.thoi_diem < ($2::date + 1)'];
    const ts: unknown[] = [tu, den];
    if (ma_nv !== null) {
      ts.push(ma_nv);
      dk.push(`lower(nv.ma_nv) = lower($${ts.length})`);
    }
    const where = `where ${dk.join(' and ')}`;

    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from lan_quet lq
         left join nhan_vien nv on nv.id = lq.nhan_vien_id ${where}`, ts,
    );
    const dong = await truy_van(
      `select lq.thoi_diem, lq.pin_may, nv.ma_nv, nv.ho_ten, lq.nguon,
              lq.thiet_bi_serial, lq.trang_thai, lq.xac_thuc
         from lan_quet lq
         left join nhan_vien nv on nv.id = lq.nhan_vien_id
         ${where}
        order by lq.thoi_diem desc
        limit $${ts.length + 1} offset $${ts.length + 2}`,
      [...ts, gioi_han, bo_qua],
    );
    return goi_ra(dong, { gioi_han, bo_qua, tong: dem?.tong ?? 0 });
  });

  // ------------------------------------------------------------ nghi phep da duyet
  app.get('/nghi-phep', { preHandler: can_khoa_api('nghi_phep:doc') }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 400);
    const { gioi_han, bo_qua } = phan_trang(q, 200, 1000);

    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from don_nghi_phep d
         join nhan_vien nv on nv.id = d.nhan_vien_id
        where d.trang_thai = 'da_duyet' and d.tu_ngay <= $2 and d.den_ngay >= $1`,
      [tu, den],
    );
    const dong = await truy_van(
      `select nv.ma_nv, nv.ho_ten, nv.ma_erp, d.loai, d.tu_ngay, d.den_ngay,
              d.nua_ngay, d.ly_do, d.quyet_luc as duyet_luc
         from don_nghi_phep d
         join nhan_vien nv on nv.id = d.nhan_vien_id
        where d.trang_thai = 'da_duyet' and d.tu_ngay <= $2 and d.den_ngay >= $1
        order by d.tu_ngay, nv.ma_nv
        limit $3 offset $4`,
      [tu, den, gioi_han, bo_qua],
    );
    return goi_ra(dong, { gioi_han, bo_qua, tong: dem?.tong ?? 0 });
  });

  // ------------------------------------------------------------ nguon su kien (pull)
  //
  // Ben tich hop khong nhan webhook duoc (nam sau tuong lua, hoac khong muon mo cong vao)
  // thi hoi o day: dua `tu_id` cua lan truoc, nhan cac su kien moi hon. Con so `tu_id` do
  // ho tu luu — ta khong giu con tro cho tung ben, nen nhieu ben doc chung mot dong su
  // kien ma khong dam nhau.
  app.get('/su-kien', { preHandler: can_khoa_api('su_kien:doc') }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { gioi_han } = phan_trang(q, 100, 500);
    const tu_id = Number.parseInt(String(q['tu_id'] ?? '0'), 10);
    if (!Number.isInteger(tu_id) || tu_id < 0) {
      throw new LoiKhongTim('Tham số "tu_id" phải là số nguyên không âm.');
    }
    const loai = chuoi(q, 'loai', { toi_da: 64 });

    const dong = await truy_van<{ id: string }>(
      `select id, loai_su_kien, du_lieu, tao_luc
         from hop_thu_di
        where id > $1 and ($2::text is null or loai_su_kien = $2)
        order by id
        limit $3`,
      [tu_id, loai, gioi_han],
    );
    // `id_cuoi` de ben kia luu lai cho lan hoi sau. Tra ve null khi het du lieu de ho biet
    // giu nguyen con tro cu chu khong nhay ve 0.
    return {
      du_lieu: dong,
      id_cuoi: dong.length > 0 ? dong[dong.length - 1]!.id : null,
      con_nua: dong.length === gioi_han,
    };
  });

  // ------------------------------------------------------------ ghi: dong bo nhan vien
  //
  // Cho he thong nhan su khac day nguoi sang. Dung UPSERT theo ma_nv: goi lai cung mot ban
  // ghi khong tao them nguoi moi, nen ben kia chay lai lo dong bo thoai mai.
  //
  // KHONG cho xoa qua API: xoa nhan vien keo theo lan quet va bang cong. Muon cho nghi thi
  // dat `dang_hoat_dong = false` — du lieu cham cong cu van con de doi chieu ve sau.
  app.put('/nhan-vien/:ma_nv', { preHandler: can_khoa_api('nhan_vien:ghi') }, async (req) => {
    const ma_nv = lay_ma_nv(req);
    const b = than(req.body);

    const ho_ten = chuoi(b, 'ho_ten', { toi_da: 200 });
    const email = chuoi(b, 'email', { toi_da: 200 });
    const so_dien_thoai = chuoi(b, 'so_dien_thoai', { toi_da: 30 });
    const chuc_danh = chuoi(b, 'chuc_danh', { toi_da: 200 });
    const pin_may = chuoi(b, 'pin_may', { toi_da: 32 });
    const ma_erp = chuoi(b, 'ma_erp', { toi_da: 64 });
    const ngay_vao = ngay(b, 'ngay_vao');
    const ngay_nghi_viec = ngay(b, 'ngay_nghi_viec');
    const dang_hoat_dong = b['dang_hoat_dong'];

    const co = await truy_van_mot<{ id: string }>(
      'select id from nhan_vien where lower(ma_nv) = lower($1)', [ma_nv],
    );

    if (co === null) {
      if (ho_ten === null) {
        throw new LoiKhongTim('Tạo nhân viên mới cần "ho_ten".');
      }
      const moi = await truy_van_mot<{ ma_nv: string }>(
        `insert into nhan_vien
           (ma_nv, ho_ten, email, so_dien_thoai, chuc_danh, pin_may, ma_erp, ngay_vao)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning ma_nv`,
        [ma_nv, ho_ten, email, so_dien_thoai, chuc_danh, pin_may, ma_erp, ngay_vao],
      );
      return { du_lieu: moi, da_tao: true };
    }

    // coalesce: truong khong gui thi GIU NGUYEN, khong xoa trang. He thong nhan su ben kia
    // thuong chi biet mot phan thong tin — gui thieu ma bi xoa mat PIN may la mat cham cong.
    const sua = await truy_van_mot<{ ma_nv: string }>(
      `update nhan_vien set
         ho_ten = coalesce($2, ho_ten),
         email = coalesce($3, email),
         so_dien_thoai = coalesce($4, so_dien_thoai),
         chuc_danh = coalesce($5, chuc_danh),
         pin_may = coalesce($6, pin_may),
         ma_erp = coalesce($7, ma_erp),
         ngay_vao = coalesce($8, ngay_vao),
         ngay_nghi_viec = coalesce($9, ngay_nghi_viec),
         dang_hoat_dong = coalesce($10, dang_hoat_dong)
       where id = $1 returning ma_nv`,
      [co.id, ho_ten, email, so_dien_thoai, chuc_danh, pin_may, ma_erp, ngay_vao,
        ngay_nghi_viec, typeof dang_hoat_dong === 'boolean' ? dang_hoat_dong : null],
    );
    return { du_lieu: sua, da_tao: false };
  });

  // Duong dan la trong /api/v1 cung phai tra JSON dung hinh dang, khong phai trang 404 la.
  app.setNotFoundHandler(async (_req: FastifyRequest, res: FastifyReply) => {
    await res.code(404).send({
      loi: { ma: 'khong_co_duong_dan', thong_diep: 'Đường dẫn không tồn tại trong API v1.' },
    });
  });
}
