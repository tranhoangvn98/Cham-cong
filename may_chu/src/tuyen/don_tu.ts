// API don tu: nghi phep, giai trinh quen quet, va duyet lan quet bang dien thoai.
// Nhan vien tao don o /api/toi/*; day la phia NGUOI DUYET (nhan su / truong phong).
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_nguoi_duyet, nguoi_dung_hien_tai, xem_duoc_tat_ca } from '../bao_mat/xac_thuc.ts';
import { tinh_lai_ngay, tinh_lai_khoang } from '../cong/tinh_cong.ts';
import {
  ban_don_am_tham, ban_don_giai_trinh, ban_don_khac, ban_don_nghi_phep,
} from '../don_tu/ban_don.ts';
import { MA_LOAI_DON, dac_ta, type MaLoaiDon } from '../don_tu/loai_don.ts';
import { so_thang_lam_trong_nam, quy_phep_theo_luat } from '../don_tu/quy_phep_nam.ts';
import {
  canh_bao_cho_don, dem_cho_duyet, don_cho_nguoi_duyet, don_theo_id, quyet_don,
} from '../don_tu/nghiep_vu.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { ngay_dia_phuong, ngay_viet } from '../tien_ich/thoi_gian.ts';
import {
  chuoi, than, trong_tap, uuid, LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

const TRANG_THAI_DON = ['cho_duyet', 'da_duyet', 'tu_choi', 'da_huy'] as const;

/**
 * Truong phong chi duyet don cua nhan vien trong phong minh.
 * Nem LoiKhongTim (khong phai 403) de khong tiet lo don cua phong khac co ton tai.
 */
async function bat_buoc_trong_pham_vi(
  nd: { vai_tro: string; nv: string | null },
  nhan_vien_id: string,
): Promise<void> {
  if (xem_duoc_tat_ca(nd)) return;
  const dong = await truy_van_mot<{ cung_phong: boolean }>(
    `select (nv.phong_ban_id is not null
             and nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)) as cung_phong
       from nhan_vien nv where nv.id = $1`,
    [nhan_vien_id, nd.nv],
  );
  if (dong === null || !dong.cung_phong) {
    throw new LoiKhongTim('Không tìm thấy đơn thuộc phạm vi của bạn.');
  }
}

export async function tuyen_don_tu(app: FastifyInstance): Promise<void> {
  // ================================================================ NGHI PHEP
  app.get('/nghi-phep', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const trang_thai = trong_tap(q, 'trang_thai', TRANG_THAI_DON);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    return truy_van(
      `select d.id, d.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              d.loai, d.tu_ngay, d.den_ngay, d.nua_ngay, d.ly_do, d.trang_thai,
              d.ghi_chu_duyet, d.tao_luc, d.quyet_luc, nd2.ten_dang_nhap as nguoi_duyet
         from don_nghi_phep d
         join nhan_vien nv on nv.id = d.nhan_vien_id
         left join phong_ban pb  on pb.id = nv.phong_ban_id
         left join nguoi_dung nd2 on nd2.id = d.nguoi_duyet_id
        where ($1::text is null or d.trang_thai = $1)
          and ($2::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3))
        order by case when d.trang_thai = 'cho_duyet' then 0 else 1 end, d.tao_luc desc
        limit 300`,
      [trang_thai, chi_phong_minh, nd.nv],
    );
  });

  // ---------------------------------------------------------------- tong hop quan ly ngay phep
  /**
   * Bang tong hop PHEP NAM cua tung nhan vien trong mot nam: quy theo Luat (chia theo thang lam),
   * so da nghi (da_duyet), so dang cho duyet, va con lai. Nhan su/admin xem toan bo; truong phong
   * chi xem phong minh. Dung de "quan ly ngay phep tung nguoi".
   */
  app.get('/nghi-phep/tong-hop', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const nam_tho = Number(q['nam']);
    const nam = Number.isInteger(nam_tho) && nam_tho >= 2000 && nam_tho <= 2100
      ? nam_tho : new Date().getFullYear();
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    const ds = await truy_van<{
      id: string; ma_nv: string; ho_ten: string; phong_ban: string | null;
      ngay_vao: string | null; ngay_nghi_viec: string | null;
      base: number; da_dung: number; cho_duyet: number;
    }>(
      `select nv.id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              to_char(nv.ngay_vao,'YYYY-MM-DD')       as ngay_vao,
              to_char(nv.ngay_nghi_viec,'YYYY-MM-DD') as ngay_nghi_viec,
              coalesce(nv.so_ngay_phep_nam, 12)::float8 as base,
              coalesce(dp.da_dung, 0)::float8   as da_dung,
              coalesce(dp.cho_duyet, 0)::float8 as cho_duyet
         from nhan_vien nv
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ca_lam cl on cl.id = nv.ca_lam_id
         left join noi_lam_viec nlv on nlv.id = nv.noi_lam_viec_id
         left join lateral (
           select
             sum(case when d.trang_thai = 'da_duyet'  then x.w end) as da_dung,
             sum(case when d.trang_thai = 'cho_duyet' then x.w end) as cho_duyet
           from don_nghi_phep d
           cross join lateral (
             -- Chi dem NGAY LAM VIEC (L4): loai T7/CN theo cac_ngay_lam + ngay le theo lich cua nguoi.
             select (case when d.nua_ngay then 0.5 else 1 end) * count(*)::float8 as w
               from generate_series(
                      greatest(d.tu_ngay, make_date($1::int, 1, 1)),
                      least   (d.den_ngay, make_date($1::int, 12, 31)),
                      interval '1 day') g
              where extract(dow from g)::int
                      = any(coalesce(cl.cac_ngay_lam, '{1,2,3,4,5}')::int[])
                and not exists (
                  select 1 from ngay_le nl
                   where nl.ngay = g::date
                     and nl.lich_ma = coalesce(nlv.lich_nghi_ma, 'vn'))
           ) x
          where d.nhan_vien_id = nv.id and d.loai = 'phep_nam'
            and d.trang_thai in ('da_duyet', 'cho_duyet')
            and d.tu_ngay <= make_date($1::int, 12, 31)
            and d.den_ngay >= make_date($1::int, 1, 1)
         ) dp on true
        where nv.dang_hoat_dong = true
          and ($2::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3))
        order by pb.ten nulls last, nv.ma_nv`,
      [nam, chi_phong_minh, nd.nv],
    );

    const dong = ds.map((r) => {
      const so_thang = so_thang_lam_trong_nam(r.ngay_vao, r.ngay_nghi_viec, nam);
      const quy = quy_phep_theo_luat(r.base, so_thang);
      return {
        id: r.id,
        ma_nv: r.ma_nv, ho_ten: r.ho_ten, phong_ban: r.phong_ban, ngay_vao: r.ngay_vao,
        so_ngay_phep_nam: r.base, so_thang, quy, da_dung: r.da_dung, cho_duyet: r.cho_duyet,
        con_lai: Math.round((quy - r.da_dung) * 10) / 10,
      };
    });
    return { nam, dong };
  });

  /**
   * Chi tiet LICH SU TRU PHEP cua MOT nguoi trong nam (nut "Chi tiet" o trang Quan ly phep):
   * liet ke tung don phep nam (da_duyet = da tru; cho_duyet = chua tru) kem so ngay.
   */
  app.get('/nghi-phep/chi-tiet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = than(req.query);
    const nhan_vien_id = uuid(q, 'nhan_vien_id');
    if (nhan_vien_id === null) throw new LoiDauVao('Thiếu nhân viên cần xem.');
    const nam_tho = Number(q['nam']);
    const nam = Number.isInteger(nam_tho) && nam_tho >= 2000 && nam_tho <= 2100
      ? nam_tho : new Date().getFullYear();

    // Truong phong chi xem duoc nguoi trong phong minh (admin/nhan su xem tat ca).
    if (!xem_duoc_tat_ca(nd)) {
      const cung = await truy_van_mot<{ ok: boolean }>(
        `select true as ok from nhan_vien
          where id = $1 and phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)`,
        [nhan_vien_id, nd.nv],
      );
      if (cung === null) throw new LoiKhongTim('Không xem được nhân viên ngoài phòng của bạn.');
    }

    const nguoi = await truy_van_mot<{ ma_nv: string; ho_ten: string }>(
      'select ma_nv, ho_ten from nhan_vien where id = $1', [nhan_vien_id],
    );
    const cac_lan = await truy_van(
      // so_ngay = NGAY LAM VIEC that su bi tru quy (L4): loai T7/CN + ngay le, khong dem ngay lich.
      `select d.id, to_char(d.tu_ngay,'YYYY-MM-DD') as tu_ngay,
              to_char(d.den_ngay,'YYYY-MM-DD') as den_ngay, d.nua_ngay, d.trang_thai, d.ly_do,
              d.ghi_chu_duyet,
              to_char(d.tao_luc,'YYYY-MM-DD"T"HH24:MI:SSOF') as tao_luc,
              (case when d.nua_ngay then 0.5 else (
                 select count(*)::float8
                   from generate_series(d.tu_ngay, d.den_ngay, interval '1 day') g
                  where extract(dow from g)::int
                          = any(coalesce(cl.cac_ngay_lam, '{1,2,3,4,5}')::int[])
                    and not exists (
                      select 1 from ngay_le nl
                       where nl.ngay = g::date
                         and nl.lich_ma = coalesce(nlv.lich_nghi_ma, 'vn'))
              ) end)::float8 as so_ngay
         from don_nghi_phep d
         join nhan_vien nv on nv.id = d.nhan_vien_id
         left join ca_lam cl on cl.id = nv.ca_lam_id
         left join noi_lam_viec nlv on nlv.id = nv.noi_lam_viec_id
        where d.nhan_vien_id = $1 and d.loai = 'phep_nam'
          and d.tu_ngay <= make_date($2::int, 12, 31) and d.den_ngay >= make_date($2::int, 1, 1)
        order by d.tu_ngay desc`,
      [nhan_vien_id, nam],
    );
    return { nam, ma_nv: nguoi?.ma_nv ?? '', ho_ten: nguoi?.ho_ten ?? '', cac_lan };
  });

  app.post('/nghi-phep/:id/quyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tu_choi'] as const, { bat_buoc: true });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const don = await truy_van_mot<{
      nhan_vien_id: string; tu_ngay: string; den_ngay: string;
      trang_thai: string; loai: string; nua_ngay: boolean;
    }>(
      `select nhan_vien_id, tu_ngay, den_ngay, trang_thai, loai, nua_ngay
         from don_nghi_phep where id = $1`,
      [id],
    );
    if (don === null) throw new LoiKhongTim('Không tìm thấy đơn nghỉ phép.');
    if (don.trang_thai !== 'cho_duyet') {
      throw new LoiDauVao(`Đơn đã ở trạng thái "${don.trang_thai}", không thể quyết lại.`);
    }
    await bat_buoc_trong_pham_vi(nd, don.nhan_vien_id);

    await trong_giao_dich(async (khach) => {
      await khach.query(
        `update don_nghi_phep
            set trang_thai = $2, nguoi_duyet_id = $3, ghi_chu_duyet = $4, quyet_luc = now()
          where id = $1 and trang_thai = 'cho_duyet'`,
        [id, quyet, nd.sub, ghi_chu],
      );

      if (quyet === 'da_duyet') {
        const nv = await khach.query<{ ma_nv: string; ma_erp: string | null }>(
          'select ma_nv, ma_erp from nhan_vien where id = $1', [don.nhan_vien_id],
        );
        await ghi_su_kien('nghi_phep.da_duyet', {
          don_id: id,
          nhan_vien_id: don.nhan_vien_id,
          ma_nv: nv.rows[0]?.ma_nv ?? null,
          ma_erp: nv.rows[0]?.ma_erp ?? null,
          loai: don.loai,
          tu_ngay: don.tu_ngay,
          den_ngay: don.den_ngay,
          so_ngay: don.nua_ngay
            ? 0.5
            : (Date.parse(`${don.den_ngay}T00:00:00Z`) - Date.parse(`${don.tu_ngay}T00:00:00Z`))
              / 86_400_000 + 1,
        }, khach);
      }
    });

    // Duyet/tu choi deu doi trang thai ngay cong -> tinh lai khoang ngay cua don.
    const so = await tinh_lai_khoang(don.tu_ngay, don.den_ngay, don.nhan_vien_id);

    // Ban don DA DUYET duoc luu vao kho ho so (nhom `don_tu`). Chi khi DUYET — mot don bi tu
    // choi thi khong co to don nao de luu, va sinh mot ban "da tu choi" chi lam kho ho so day
    // giay khong ai can.
    if (quyet === 'da_duyet') await ban_don_am_tham('nghi_phep', id);

    await ghi_nhat_ky(nd.sub, `nghi_phep_${quyet}`, 'don_nghi_phep', id, { ghi_chu }, req.ip);

    const khoang = don.tu_ngay === don.den_ngay
      ? ngay_viet(don.tu_ngay)
      : `${ngay_viet(don.tu_ngay)} – ${ngay_viet(don.den_ngay)}`;
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(don.nhan_vien_id),
      tieu_de: quyet === 'da_duyet' ? 'Đơn nghỉ phép đã được duyệt' : 'Đơn nghỉ phép bị từ chối',
      noi_dung: ghi_chu === null || ghi_chu === '' ? khoang : `${khoang} — ${ghi_chu}`,
      du_lieu: { man: 'don-tu', loai: 'nghi_phep', don_id: id, quyet_dinh: quyet },
    });

    return { ok: true, so_ngay_da_tinh_lai: so };
  });

  // ================================================================ GIAI TRINH
  app.get('/giai-trinh', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const trang_thai = trong_tap(q, 'trang_thai', TRANG_THAI_DON);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    return truy_van(
      `select d.id, d.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              d.ngay, d.gio_vao_de_xuat, d.gio_ra_de_xuat, d.ly_do, d.trang_thai,
              d.ghi_chu_duyet, d.tao_luc, d.quyet_luc,
              bc.gio_vao as gio_vao_thuc, bc.gio_ra as gio_ra_thuc, bc.trang_thai as trang_thai_cong
         from don_giai_trinh d
         join nhan_vien nv on nv.id = d.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join bang_cong_ngay bc on bc.nhan_vien_id = d.nhan_vien_id and bc.ngay = d.ngay
        where ($1::text is null or d.trang_thai = $1)
          and ($2::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3))
        order by case when d.trang_thai = 'cho_duyet' then 0 else 1 end, d.tao_luc desc
        limit 300`,
      [trang_thai, chi_phong_minh, nd.nv],
    );
  });

  app.post('/giai-trinh/:id/quyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tu_choi'] as const, { bat_buoc: true });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const don = await truy_van_mot<{ nhan_vien_id: string; ngay: string; trang_thai: string }>(
      'select nhan_vien_id, ngay, trang_thai from don_giai_trinh where id = $1',
      [id],
    );
    if (don === null) throw new LoiKhongTim('Không tìm thấy đơn giải trình.');
    if (don.trang_thai !== 'cho_duyet') {
      throw new LoiDauVao(`Đơn đã ở trạng thái "${don.trang_thai}", không thể quyết lại.`);
    }
    await bat_buoc_trong_pham_vi(nd, don.nhan_vien_id);

    await truy_van(
      `update don_giai_trinh
          set trang_thai = $2, nguoi_duyet_id = $3, ghi_chu_duyet = $4, quyet_luc = now()
        where id = $1 and trang_thai = 'cho_duyet'`,
      [id, quyet, nd.sub, ghi_chu],
    );

    // Don da duyet ghi de gio vao/ra -> phai tinh lai ngay do.
    const kq = await tinh_lai_ngay(don.nhan_vien_id, don.ngay);

    if (quyet === 'da_duyet') await ban_don_am_tham('giai_trinh', id);

    await ghi_nhat_ky(nd.sub, `giai_trinh_${quyet}`, 'don_giai_trinh', id, { ghi_chu }, req.ip);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(don.nhan_vien_id),
      tieu_de: quyet === 'da_duyet' ? 'Đơn giải trình đã được duyệt' : 'Đơn giải trình bị từ chối',
      noi_dung: ghi_chu === null || ghi_chu === ''
        ? `Ngày ${ngay_viet(don.ngay)}`
        : `Ngày ${ngay_viet(don.ngay)} — ${ghi_chu}`,
      du_lieu: { man: 'don-tu', loai: 'giai_trinh', don_id: id, quyet_dinh: quyet },
    });

    return {
      ok: true,
      da_tinh_lai: kq !== null,
      luu_y: kq === null ? 'Ngày này đã chốt bảng công nên không tính lại. Hãy mở chốt trước.' : undefined,
    };
  });

  // ================================================================ DUYET QUET DIEN THOAI
  app.get('/quet-dien-thoai', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);
    return truy_van(
      `select lq.id, lq.nhan_vien_id, nv.ma_nv, nv.ho_ten, lq.thoi_diem, lq.trang_thai,
              lq.vi_do, lq.kinh_do, lq.do_chinh_xac_m, lq.khoang_cach_m, lq.gps_gia_lap,
              lq.anh_ten_tep, lq.ghi_chu, lq.trang_thai_duyet, dd.ten as dia_diem
         from lan_quet lq
         join nhan_vien nv on nv.id = lq.nhan_vien_id
         left join dia_diem dd on dd.id = lq.dia_diem_id
        where lq.nguon = 'dien_thoai' and lq.trang_thai_duyet = 'cho_duyet'
          and ($1::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2))
        order by lq.thoi_diem desc limit 300`,
      [chi_phong_minh, nd.nv],
    );
  });

  app.post('/quet-dien-thoai/:id/quyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tu_choi'] as const, { bat_buoc: true });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const lq = await truy_van_mot<{ nhan_vien_id: string | null; thoi_diem: Date; trang_thai_duyet: string }>(
      'select nhan_vien_id, thoi_diem, trang_thai_duyet from lan_quet where id = $1',
      [id],
    );
    if (lq === null || lq.nhan_vien_id === null) throw new LoiKhongTim('Không tìm thấy lần quẹt.');
    if (lq.trang_thai_duyet !== 'cho_duyet') {
      throw new LoiDauVao('Lần quẹt này đã được xử lý.');
    }
    await bat_buoc_trong_pham_vi(nd, lq.nhan_vien_id);

    await truy_van(
      `update lan_quet
          set trang_thai_duyet = $2, nguoi_duyet_id = $3, duyet_luc = now(),
              ghi_chu = coalesce($4, ghi_chu)
        where id = $1 and trang_thai_duyet = 'cho_duyet'`,
      [id, quyet, nd.sub, ghi_chu],
    );

    const ng = ngay_dia_phuong(lq.thoi_diem);
    const kq = await tinh_lai_ngay(lq.nhan_vien_id, ng);
    await ghi_nhat_ky(nd.sub, `quet_dien_thoai_${quyet}`, 'lan_quet', id, { ngay: ng }, req.ip);
    return { ok: true, da_tinh_lai: kq !== null };
  });

  // ================================================================ sinh lai ban don
  //
  // `ban_don_am_tham` nuot loi de mot su co kho tep khong lam do lan duyet. Doi lai phai co
  // duong sinh lai — neu khong thi mot don da duyet co the vinh vien khong co ban don, va
  // khong co cach nao sua ngoai viec huy don roi duyet lai.

  /** Sinh lai ban don cho mot don nghi phep DA DUYET. Tra 404 neu don chua duyet. */
  app.post('/nghi-phep/:id/ban-don', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const don = await truy_van_mot<{ nhan_vien_id: string }>(
      "select nhan_vien_id from don_nghi_phep where id = $1 and trang_thai = 'da_duyet'", [id]);
    if (don === null) throw new LoiKhongTim('Không có đơn nghỉ phép đã duyệt với mã này.');
    await bat_buoc_trong_pham_vi(nd, don.nhan_vien_id);

    const bd = await ban_don_nghi_phep(id);
    await ghi_nhat_ky(nd.sub, 'sinh_lai_ban_don', 'don_nghi_phep', id, {}, req.ip);
    return { ok: bd !== null, ban_don: bd };
  });

  /** Sinh lai ban don cho mot don giai trinh DA DUYET. */
  app.post('/giai-trinh/:id/ban-don', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const don = await truy_van_mot<{ nhan_vien_id: string }>(
      "select nhan_vien_id from don_giai_trinh where id = $1 and trang_thai = 'da_duyet'", [id]);
    if (don === null) throw new LoiKhongTim('Không có đơn giải trình đã duyệt với mã này.');
    await bat_buoc_trong_pham_vi(nd, don.nhan_vien_id);

    const bd = await ban_don_giai_trinh(id);
    await ghi_nhat_ky(nd.sub, 'sinh_lai_ban_don', 'don_giai_trinh', id, {}, req.ip);
    return { ok: bd !== null, ban_don: bd };
  });

  // ================================================================ CAC LOAI DON KHAC
  //
  // Bon loai dung chung bang `don_tu`. MOT bo route cho ca bon — nguoi duyet lam mot dong tac,
  // khong phai hoc bon man hinh.

  /** Dem don dang cho duyet, theo loai. Cho o dem tren giao dien. */
  app.get('/don/dem', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    return dem_cho_duyet(xem_duoc_tat_ca(nd) ? null : nd.nv);
  });

  /** Danh sach don theo trang thai va loai. */
  app.get('/don', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = than(req.query);
    const trang_thai = trong_tap(q, 'trang_thai',
      ['cho_duyet', 'da_duyet', 'tu_choi', 'da_huy'] as const,
      { mac_dinh: 'cho_duyet' }) as string;
    const loai = trong_tap(q, 'loai', MA_LOAI_DON, {}) as MaLoaiDon | null;

    return {
      danh_sach: await don_cho_nguoi_duyet(
        trang_thai, loai, xem_duoc_tat_ca(nd) ? null : nd.nv),
    };
  });

  /**
   * Duyet hoac tu choi.
   *
   * Duyet xong thi: (1) tinh lai bang cong neu la don cong tac, (2) sinh ban don DOCX vao kho
   * ho so. Thu tu do la co y — ban don ghi lai trang thai SAU khi moi thu da xong.
   */
  app.post('/don/:id/quyet', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tu_choi'] as const,
      { bat_buoc: true }) as 'da_duyet' | 'tu_choi';
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const truoc = await don_theo_id(id);
    if (truoc === null) throw new LoiKhongTim('Không tìm thấy đơn.');
    await bat_buoc_trong_pham_vi(nd, truoc.nhan_vien_id);

    const kq = await quyet_don(id, quyet, nd.sub, ghi_chu);

    let so_ngay_da_tinh_lai = 0;
    if (kq.tinh_lai !== null && quyet === 'da_duyet') {
      so_ngay_da_tinh_lai = await tinh_lai_khoang(
        kq.tinh_lai.tu_ngay, kq.tinh_lai.den_ngay, truoc.nhan_vien_id);
    }

    if (quyet === 'da_duyet') await ban_don_am_tham('khac', id);

    await ghi_nhat_ky(nd.sub, `don_${kq.loai}_${quyet}`, 'don_tu', id, { ghi_chu }, req.ip);

    const dt = dac_ta(kq.loai);
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(truoc.nhan_vien_id),
      tieu_de: quyet === 'da_duyet' ? `${dt.ten} đã được duyệt` : `${dt.ten} bị từ chối`,
      noi_dung: ghi_chu === null || ghi_chu === ''
        ? `${dt.nhan_tu_ngay}: ${ngay_viet(truoc.tu_ngay)}`
        : `${dt.nhan_tu_ngay}: ${ngay_viet(truoc.tu_ngay)} — ${ghi_chu}`,
      du_lieu: { man: 'don-tu', loai: kq.loai, don_id: id, quyet_dinh: quyet },
    });

    return { ok: true, so_ngay_da_tinh_lai };
  });

  /** Canh bao phap ly cua mot don — de nguoi duyet doc TRUOC khi bam duyet. */
  app.get('/don/:id/canh-bao', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const d = await don_theo_id(lay_id(req));
    if (d === null) throw new LoiKhongTim('Không tìm thấy đơn.');
    await bat_buoc_trong_pham_vi(nd, d.nhan_vien_id);
    return { canh_bao: await canh_bao_cho_don(d.nhan_vien_id, d, d.id) };
  });

  /** Sinh lai ban don cho mot don DA DUYET trong bang `don_tu`. */
  app.post('/don/:id/ban-don', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const d = await don_theo_id(id);
    if (d === null || d.trang_thai !== 'da_duyet') {
      throw new LoiKhongTim('Không có đơn đã duyệt với mã này.');
    }
    await bat_buoc_trong_pham_vi(nd, d.nhan_vien_id);
    const bd = await ban_don_khac(id);
    await ghi_nhat_ky(nd.sub, 'sinh_lai_ban_don', 'don_tu', id, {}, req.ip);
    return { ok: bd !== null, ban_don: bd };
  });
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}
