// API self-service cho app dien thoai: xem cong cua chinh minh, gui don, va
// cham cong bang GPS + selfie khi di cong tac.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_dang_nhap, nguoi_dung_hien_tai, xem_duoc_tat_ca } from '../bao_mat/xac_thuc.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { tinh_lai_khoang, tinh_lai_ngay } from '../cong/tinh_cong.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { do_geofence, type DiaDiem } from '../tien_ich/dia_ly.ts';
import { doc_anh_selfie, luu_anh_selfie } from '../tien_ich/luu_anh.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { khoang_thang, ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { NHAN_TRANG_THAI, nhan_cach_xac_thuc } from '../adms/giao_thuc.ts';
import {
  chuoi, chuoi_bat_buoc, gio, khoang_ngay, luan_ly, ngay_bat_buoc, than, trong_tap, uuid,
  LoiDauVao, LoiKhongQuyen, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';

const LOAI_NGHI = ['phep_nam', 'khong_luong', 'om', 'thai_san', 'ket_hon', 'hieu'] as const;

/** Khoang cach toi thieu giua hai lan cham cong bang dien thoai (giay). */
const GIAN_CACH_TOI_THIEU_GIAY = 60;

function nhan_vien_cua_toi(req: FastifyRequest): string {
  const nd = nguoi_dung_hien_tai(req);
  if (nd.nv === null) {
    throw new LoiKhongQuyen(
      'Tài khoản này không gắn với nhân viên nào nên không có dữ liệu chấm công cá nhân.',
    );
  }
  return nd.nv;
}

export async function tuyen_toi(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', can_dang_nhap);

  // ================================================================ hom nay
  app.get('/hom-nay', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const hom_nay = ngay_dia_phuong(new Date());

    const cong = await truy_van_mot(
      `select bc.ngay, bc.trang_thai, bc.gio_vao, bc.gio_ra, bc.phut_lam,
              bc.phut_muon, bc.phut_ve_som, bc.phut_ot, bc.so_cong, bc.ghi_chu,
              cl.ten as ca_lam, cl.gio_vao as ca_gio_vao, cl.gio_ra as ca_gio_ra
         from bang_cong_ngay bc
         left join ca_lam cl on cl.id = bc.ca_lam_id
        where bc.nhan_vien_id = $1 and bc.ngay = $2`,
      [nv_id, hom_nay],
    );

    const quet = await truy_van(
      `select id, thoi_diem, trang_thai, nguon, trang_thai_duyet, xac_thuc
         from lan_quet
        where nhan_vien_id = $1
          and thoi_diem >= $2::date and thoi_diem < ($2::date + 1)
        order by thoi_diem`,
      [nv_id, hom_nay],
    );

    const nv = await truy_van_mot<{
      ho_ten: string; ma_nv: string; duoc_cham_cong_dien_thoai: boolean;
      ca_lam: string | null; ca_gio_vao: string | null; ca_gio_ra: string | null;
    }>(
      `select nv.ho_ten, nv.ma_nv, nv.duoc_cham_cong_dien_thoai,
              cl.ten as ca_lam, cl.gio_vao as ca_gio_vao, cl.gio_ra as ca_gio_ra
         from nhan_vien nv left join ca_lam cl on cl.id = nv.ca_lam_id
        where nv.id = $1`,
      [nv_id],
    );

    return {
      ngay: hom_nay,
      nhan_vien: nv,
      bang_cong: cong,
      lan_quet: quet.map((q) => ({
        ...q,
        nhan_trang_thai: NHAN_TRANG_THAI[Number((q as Record<string, unknown>)['trang_thai'])] ?? 'Khac',
        nhan_xac_thuc: nhan_cach_xac_thuc(Number((q as Record<string, unknown>)['xac_thuc'])),
      })),
    };
  });

  // ================================================================ bang cong thang
  app.get('/bang-cong', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const q = req.query as Record<string, unknown>;
    const thang = chuoi(q, 'thang', { bat_buoc: true, toi_da: 7 }) as string;
    const { tu, den } = khoang_thang(thang);

    const ngay_cong = await truy_van(
      `select ngay, trang_thai, gio_vao, gio_ra, phut_lam, phut_muon, phut_ve_som,
              phut_ot, so_cong, co_dieu_chinh, da_chot, ghi_chu
         from bang_cong_ngay
        where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3
        order by ngay`,
      [nv_id, tu, den],
    );

    const tong = await truy_van_mot(
      `select coalesce(sum(so_cong), 0)        as tong_cong,
              coalesce(sum(phut_lam), 0)::int  as tong_phut_lam,
              coalesce(sum(phut_ot), 0)::int   as tong_phut_ot,
              coalesce(sum(phut_muon), 0)::int as tong_phut_muon,
              count(*) filter (where trang_thai = 'vang')::int      as so_ngay_vang,
              count(*) filter (where trang_thai = 'nghi_phep')::int as so_ngay_nghi_phep,
              count(*) filter (where phut_muon > 0)::int            as so_lan_di_muon
         from bang_cong_ngay
        where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3`,
      [nv_id, tu, den],
    );

    return { thang, tong_hop: tong, ngay: ngay_cong };
  });

  // ================================================================ lan quet cua toi
  app.get('/lan-quet', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const { tu, den } = khoang_ngay(req.query as Record<string, unknown>, 62);
    return truy_van(
      `select lq.id, lq.thoi_diem, lq.trang_thai, lq.nguon, lq.trang_thai_duyet,
              lq.xac_thuc, lq.khoang_cach_m, lq.anh_ten_tep is not null as co_anh,
              dd.ten as dia_diem, tb.ten as thiet_bi
         from lan_quet lq
         left join dia_diem dd on dd.id = lq.dia_diem_id
         left join thiet_bi tb on tb.serial = lq.thiet_bi_serial
        where lq.nhan_vien_id = $1
          and lq.thoi_diem >= $2::date and lq.thoi_diem < ($3::date + 1)
        order by lq.thoi_diem desc limit 500`,
      [nv_id, tu, den],
    );
  });

  // ================================================================ dia diem duoc cham cong
  app.get('/dia-diem', async () =>
    truy_van(
      'select id, ten, vi_do, kinh_do, ban_kinh_m from dia_diem where dang_hoat_dong = true order by ten',
    ),
  );

  // ================================================================ CHAM CONG BANG DIEN THOAI
  //
  // Dang multipart/form-data:
  //   vi_do, kinh_do  (bat buoc)  — toa do GPS
  //   do_chinh_xac_m  (tuy chon)  — do chinh xac may bao, de HR danh gia
  //   trang_thai      (0 = vao, 1 = ra)
  //   anh             (bat buoc)  — selfie JPEG/PNG
  //
  // Ket qua:
  //   Trong ban kinh dia diem -> ghi nhan ngay (trang_thai_duyet = 'tu_dong').
  //   Ngoai ban kinh          -> van ghi nhan nhung CHO NHAN SU DUYET, khong tinh cong
  //                              cho den khi duoc duyet.
  app.post('/cham-cong', {
    config: { rateLimit: { max: 12, timeWindow: '1 hour' } },
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);

    const nv = await truy_van_mot<{
      ma_nv: string; ma_erp: string | null; ho_ten: string;
      duoc_cham_cong_dien_thoai: boolean; dang_hoat_dong: boolean;
    }>(
      `select ma_nv, ma_erp, ho_ten, duoc_cham_cong_dien_thoai, dang_hoat_dong
         from nhan_vien where id = $1`,
      [nv_id],
    );
    if (nv === null || !nv.dang_hoat_dong) throw new LoiKhongTim('Không tìm thấy nhân viên.');
    if (!nv.duoc_cham_cong_dien_thoai) {
      throw new LoiKhongQuyen(
        'Tài khoản của bạn chưa được bật chấm công bằng điện thoại. Vui lòng quẹt tại máy chấm công.',
      );
    }

    // --- Doc multipart ---
    const truong: Record<string, string> = {};
    let anh: Buffer | null = null;
    for await (const phan of req.parts()) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'anh') {
          // Bo qua file la nhung phai doc het stream, neu khong request treo.
          await phan.toBuffer();
          continue;
        }
        anh = await phan.toBuffer();
      } else if (typeof phan.value === 'string') {
        truong[phan.fieldname] = phan.value;
      }
    }

    if (anh === null) throw new LoiDauVao('Thiếu ảnh chụp xác nhận.');

    const vi_do = Number(truong['vi_do']);
    const kinh_do = Number(truong['kinh_do']);
    if (!Number.isFinite(vi_do) || vi_do < -90 || vi_do > 90) {
      throw new LoiDauVao('Không lấy được vĩ độ hợp lệ. Hãy bật quyền vị trí cho ứng dụng.');
    }
    if (!Number.isFinite(kinh_do) || kinh_do < -180 || kinh_do > 180) {
      throw new LoiDauVao('Không lấy được kinh độ hợp lệ. Hãy bật quyền vị trí cho ứng dụng.');
    }
    const do_chinh_xac = Number(truong['do_chinh_xac_m']);
    const trang_thai = truong['trang_thai'] === '1' ? 1 : 0;
    // Android cho biet toa do co do app gia lap vi tri tao ra khong. Day la cach gian lan
    // pho bien nhat, nen ban ghi co co nay KHONG BAO GIO duoc tu dong tinh cong.
    const gps_gia_lap = truong['gps_gia_lap'] === 'true' || truong['gps_gia_lap'] === '1';

    const bay_gio = new Date();
    const ngay = ngay_dia_phuong(bay_gio);

    // --- Chan bam lien tuc ---
    const gan_nhat = await truy_van_mot<{ thoi_diem: Date }>(
      `select thoi_diem from lan_quet
        where nhan_vien_id = $1 and nguon = 'dien_thoai'
        order by thoi_diem desc limit 1`,
      [nv_id],
    );
    if (
      gan_nhat !== null
      && bay_gio.getTime() - gan_nhat.thoi_diem.getTime() < GIAN_CACH_TOI_THIEU_GIAY * 1000
    ) {
      throw new LoiXungDot(
        `Bạn vừa chấm công xong. Vui lòng đợi ${GIAN_CACH_TOI_THIEU_GIAY} giây giữa hai lần.`,
      );
    }

    // --- Geofence ---
    const cac_dia_diem = await truy_van<DiaDiem>(
      'select id, ten, vi_do, kinh_do, ban_kinh_m from dia_diem where dang_hoat_dong = true',
    );
    const gf = do_geofence(vi_do, kinh_do, cac_dia_diem);
    // Trong pham vi VA khong co dau hieu gia lap GPS -> tin ngay. Con lai cho nhan su duyet.
    const trang_thai_duyet = gf.trong_pham_vi && !gps_gia_lap ? 'tu_dong' : 'cho_duyet';

    const ly_do: string[] = [];
    if (gps_gia_lap) ly_do.push('CẢNH BÁO: điện thoại báo tọa độ do app giả lập vị trí tạo ra');
    if (cac_dia_diem.length === 0) {
      // Chua khai dia diem nao thi khong co gi de doi chieu -> khong the tin.
      ly_do.push('Chưa khai báo địa điểm nào để đối chiếu GPS');
    } else if (gf.trong_pham_vi) {
      ly_do.push(`Trong phạm vi "${gf.dia_diem?.ten}" (${gf.khoang_cach_m}m)`);
    } else {
      ly_do.push(`Ngoài phạm vi: cách "${gf.dia_diem?.ten}" ${gf.khoang_cach_m}m`);
    }
    const ghi_chu = ly_do.join('. ');

    // --- Luu anh (sau khi da qua moi kiem tra de khong rac dia) ---
    const anh_ten_tep = await luu_anh_selfie(anh, ngay);

    const khoa = `dien_thoai|${nv_id}|${bay_gio.toISOString().slice(0, 19).replace(/[-:T]/g, '')}|${trang_thai}`;

    const dong = await trong_giao_dich(async (khach) => {
      const kq = await khach.query<{ id: string }>(
        `insert into lan_quet
           (nguon, nhan_vien_id, thoi_diem, trang_thai, xac_thuc, khoa_chong_trung,
            vi_do, kinh_do, do_chinh_xac_m, dia_diem_id, khoang_cach_m,
            anh_ten_tep, trang_thai_duyet, ghi_chu, gps_gia_lap)
         values ('dien_thoai', $1, $2, $3, 9, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         on conflict (khoa_chong_trung) do nothing
         returning id`,
        [
          nv_id, bay_gio, trang_thai, khoa, vi_do, kinh_do,
          Number.isFinite(do_chinh_xac) ? do_chinh_xac : null,
          gf.dia_diem?.id ?? null, gf.khoang_cach_m, anh_ten_tep, trang_thai_duyet, ghi_chu,
          gps_gia_lap,
        ],
      );
      const d = kq.rows[0];
      if (d === undefined) return null;

      if (trang_thai_duyet === 'tu_dong') {
        await ghi_su_kien('lan_quet.da_ghi', {
          lan_quet_id: d.id,
          nguon: 'dien_thoai',
          nhan_vien_id: nv_id,
          ma_nv: nv.ma_nv,
          ma_erp: nv.ma_erp,
          thoi_diem: bay_gio.toISOString(),
          trang_thai,
          cach_xac_thuc: 'Dien thoai (GPS + anh)',
          dia_diem: gf.dia_diem?.ten ?? null,
          khoang_cach_m: gf.khoang_cach_m,
        }, khach);
      }
      return d;
    });

    if (dong === null) throw new LoiXungDot('Lần chấm công này đã được ghi nhận.');

    // Chi tinh lai cong khi lan quet duoc tin ngay.
    if (trang_thai_duyet === 'tu_dong') await tinh_lai_ngay(nv_id, ngay);

    await ghi_nhat_ky(nd.sub, 'cham_cong_dien_thoai', 'lan_quet', dong.id, {
      trang_thai, khoang_cach_m: gf.khoang_cach_m, trang_thai_duyet, gps_gia_lap,
    }, req.ip);
    if (gps_gia_lap) {
      req.log.warn({ nhan_vien_id: nv_id, lan_quet_id: dong.id }, 'cham cong voi GPS gia lap');
    }

    return res.code(201).send({
      ok: true,
      id: dong.id,
      thoi_diem: bay_gio.toISOString(),
      trang_thai,
      trang_thai_duyet,
      dia_diem: gf.dia_diem?.ten ?? null,
      khoang_cach_m: gf.khoang_cach_m,
      thong_bao: trang_thai_duyet === 'tu_dong'
        ? `Đã chấm công ${trang_thai === 0 ? 'VÀO' : 'RA'} thành công.`
        : gps_gia_lap
          ? 'Đã ghi nhận. Điện thoại đang bật chế độ giả lập vị trí nên nhân sự phải xác nhận '
            + 'trước khi tính công. Hãy tắt app giả lập vị trí.'
          : 'Đã ghi nhận nhưng bạn đang ở ngoài phạm vi cho phép. Công sẽ được tính sau khi '
            + 'nhân sự duyệt.',
    });
  });

  // ================================================================ anh selfie
  // Anh la du lieu ca nhan: chi chu so huu, nhan su/admin, hoac truong phong cung phong
  // moi xem duoc.
  app.get('/anh/:id', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const p = req.params as Record<string, string>;
    const id = uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;

    const lq = await truy_van_mot<{ anh_ten_tep: string | null; nhan_vien_id: string | null; phong_ban_id: string | null }>(
      `select lq.anh_ten_tep, lq.nhan_vien_id, nv.phong_ban_id
         from lan_quet lq left join nhan_vien nv on nv.id = lq.nhan_vien_id
        where lq.id = $1`,
      [id],
    );
    if (lq === null || lq.anh_ten_tep === null) throw new LoiKhongTim('Không tìm thấy ảnh.');

    if (!xem_duoc_tat_ca(nd)) {
      let duoc_xem = nd.nv !== null && nd.nv === lq.nhan_vien_id;
      if (!duoc_xem && nd.vai_tro === 'truong_phong' && lq.phong_ban_id !== null) {
        const cung = await truy_van_mot<{ ok: boolean }>(
          'select (phong_ban_id = $2) as ok from nhan_vien where id = $1',
          [nd.nv, lq.phong_ban_id],
        );
        duoc_xem = cung?.ok === true;
      }
      // Tra 404 thay vi 403 de khong tiet lo anh nay co ton tai.
      if (!duoc_xem) throw new LoiKhongTim('Không tìm thấy ảnh.');
    }

    const anh = await doc_anh_selfie(lq.anh_ten_tep);
    if (anh === null) throw new LoiKhongTim('Không tìm thấy tệp ảnh trên đĩa.');

    return res
      .header('content-type', anh.kieu)
      .header('cache-control', 'private, max-age=3600')
      .send(anh.du_lieu);
  });

  // ================================================================ NGHI PHEP
  app.get('/nghi-phep', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select id, loai, tu_ngay, den_ngay, nua_ngay, ly_do, trang_thai,
              ghi_chu_duyet, tao_luc, quyet_luc
         from don_nghi_phep where nhan_vien_id = $1
        order by tao_luc desc limit 100`,
      [nv_id],
    );
  });

  app.post('/nghi-phep', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);

    const loai = trong_tap(b, 'loai', LOAI_NGHI, { bat_buoc: true }) as typeof LOAI_NGHI[number];
    const tu_ngay = ngay_bat_buoc(b, 'tu_ngay');
    const den_ngay = ngay_bat_buoc(b, 'den_ngay');
    const nua_ngay = luan_ly(b, 'nua_ngay', false) as boolean;
    const ly_do = chuoi(b, 'ly_do', { toi_da: 500 });

    if (den_ngay < tu_ngay) throw new LoiDauVao('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
    if (nua_ngay && tu_ngay !== den_ngay) {
      throw new LoiDauVao('Đơn nửa ngày chỉ áp dụng cho một ngày duy nhất.');
    }
    const so_ngay = (Date.parse(`${den_ngay}T00:00:00Z`) - Date.parse(`${tu_ngay}T00:00:00Z`))
      / 86_400_000 + 1;
    if (so_ngay > 180) throw new LoiDauVao('Một đơn không được dài hơn 180 ngày.');

    // Chan don trum ngay da chot bang cong.
    const da_chot = await truy_van_mot<{ co: boolean }>(
      `select true as co from bang_cong_ngay
        where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3 and da_chot = true limit 1`,
      [nv_id, tu_ngay, den_ngay],
    );
    if (da_chot !== null) {
      throw new LoiXungDot('Khoảng ngày này đã chốt bảng công. Vui lòng liên hệ nhân sự.');
    }

    // Chan don trung khoang voi don dang cho / da duyet.
    const trung = await truy_van_mot<{ id: string }>(
      `select id from don_nghi_phep
        where nhan_vien_id = $1 and trang_thai in ('cho_duyet','da_duyet')
          and tu_ngay <= $3 and den_ngay >= $2 limit 1`,
      [nv_id, tu_ngay, den_ngay],
    );
    if (trung !== null) {
      throw new LoiXungDot('Bạn đã có đơn nghỉ phép trùm khoảng ngày này.');
    }

    const dong = await truy_van_mot<{ id: string }>(
      `insert into don_nghi_phep(nhan_vien_id, loai, tu_ngay, den_ngay, nua_ngay, ly_do)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [nv_id, loai, tu_ngay, den_ngay, nua_ngay, ly_do],
    );
    await ghi_nhat_ky(nd.sub, 'gui_don_nghi_phep', 'don_nghi_phep',
      dong?.id ?? null, { loai, tu_ngay, den_ngay }, req.ip);
    return res.code(201).send({ ...dong, trang_thai: 'cho_duyet' });
  });

  app.post('/nghi-phep/:id/huy', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const id = lay_id(req);
    const don = await truy_van_mot<{ trang_thai: string; tu_ngay: string; den_ngay: string }>(
      'select trang_thai, tu_ngay, den_ngay from don_nghi_phep where id = $1 and nhan_vien_id = $2',
      [id, nv_id],
    );
    if (don === null) throw new LoiKhongTim('Không tìm thấy đơn của bạn.');
    if (don.trang_thai === 'da_huy') return { ok: true };
    if (don.trang_thai === 'tu_choi') throw new LoiDauVao('Đơn đã bị từ chối, không cần hủy.');

    await thuc_thi(
      `update don_nghi_phep set trang_thai = 'da_huy', quyet_luc = now() where id = $1`,
      [id],
    );
    // Don da duyet bi huy -> ngay do khong con la nghi phep, phai tinh lai.
    if (don.trang_thai === 'da_duyet') {
      await tinh_lai_khoang(don.tu_ngay, don.den_ngay, nv_id);
    }
    return { ok: true };
  });

  // ================================================================ GIAI TRINH QUEN QUET
  app.get('/giai-trinh', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select id, ngay, gio_vao_de_xuat, gio_ra_de_xuat, ly_do, trang_thai,
              ghi_chu_duyet, tao_luc, quyet_luc
         from don_giai_trinh where nhan_vien_id = $1
        order by tao_luc desc limit 100`,
      [nv_id],
    );
  });

  app.post('/giai-trinh', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);

    const ngay = ngay_bat_buoc(b, 'ngay');
    const gio_vao = gio(b, 'gio_vao_de_xuat');
    const gio_ra = gio(b, 'gio_ra_de_xuat');
    const ly_do = chuoi_bat_buoc(b, 'ly_do', { toi_da: 500, toi_thieu: 5 });

    if (gio_vao === null && gio_ra === null) {
      throw new LoiDauVao('Phải đề xuất ít nhất giờ vào hoặc giờ ra.');
    }
    if (ngay > ngay_dia_phuong(new Date())) {
      throw new LoiDauVao('Không thể giải trình cho ngày trong tương lai.');
    }

    const da_chot = await truy_van_mot<{ co: boolean }>(
      'select true as co from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2 and da_chot = true',
      [nv_id, ngay],
    );
    if (da_chot !== null) {
      throw new LoiXungDot('Ngày này đã chốt bảng công. Vui lòng liên hệ nhân sự.');
    }

    try {
      const dong = await truy_van_mot<{ id: string }>(
        `insert into don_giai_trinh(nhan_vien_id, ngay, gio_vao_de_xuat, gio_ra_de_xuat, ly_do)
         values ($1,$2,$3,$4,$5) returning id`,
        [nv_id, ngay, gio_vao, gio_ra, ly_do],
      );
      await ghi_nhat_ky(nd.sub, 'gui_don_giai_trinh', 'don_giai_trinh',
        dong?.id ?? null, { ngay }, req.ip);
      return res.code(201).send({ ...dong, trang_thai: 'cho_duyet' });
    } catch (loi) {
      if ((loi as { code?: string }).code === '23505') {
        throw new LoiXungDot('Bạn đã có đơn giải trình cho ngày này.');
      }
      throw loi;
    }
  });

  // ================================================================ token push (Expo)
  app.post('/token-push', async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const token = chuoi_bat_buoc(b, 'token', { toi_da: 300 });
    const nen_tang = chuoi(b, 'nen_tang', { toi_da: 20 }) ?? 'unknown';

    await thuc_thi(
      `insert into token_push(nguoi_dung_id, token, nen_tang) values ($1,$2,$3)
       on conflict (token) do update set nguoi_dung_id = excluded.nguoi_dung_id`,
      [nd.sub, token, nen_tang],
    );
    return { ok: true };
  });

  app.delete('/token-push', async (req) => {
    const b = than(req.body ?? {});
    const token = chuoi(b, 'token', { toi_da: 300 });
    if (token !== null) await thuc_thi('delete from token_push where token = $1', [token]);
    return { ok: true };
  });
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}
