// API danh muc cho webapp HR: phong ban, ca lam, nhan vien, thiet bi, dia diem,
// ngay le, nguoi dung. Toan bo yeu cau vai tro nhan_su tro len.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_admin, can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { bam_mat_khau, LoiMatKhau } from '../bao_mat/mat_khau.ts';
import { lenh_dong_bo_gio } from '../adms/giao_thuc.ts';
import { xep_lenh } from '../adms/tuyen.ts';
import { cau_hinh, OFFSET_MAY_MS } from '../cau_hinh.ts';
import { tinh_lai_khoang } from '../cong/tinh_cong.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { dong_bo_thu_muc_nhan_vien } from '../ho_so/sap_xep_tep.ts';
import { PHAM_VI, la_pham_vi, sinh_khoa } from '../bao_mat/khoa_api.ts';
import { doc_danh_sach_ip } from '../tien_ich/dia_chi_ip.ts';
import {
  chuoi, chuoi_bat_buoc, gio, luan_ly, ngay, ngay_bat_buoc, so_nguyen, so_thuc,
  than, trong_tap, uuid, uuid_bat_buoc, LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';
import {
  doi_soat, gan_bo_ma_nhan_su, gan_ma, ma_cua_nhan_vien, thu_hoi_ma, tim_theo_ma,
} from '../dinh_danh/nghiep_vu.ts';
import { CAC_HE_THONG, MA_CAC_HE_THONG } from '../dinh_danh/he_thong.ts';
import { cap_pin, doc_dai_pin, goi_y_pin } from '../dinh_danh/cap_pin.ts';

// 'cho_duyet' co trong tap hop de admin co the ha ai do ve trang thai cho duyet, nhung
// KHONG duoc dung khi tao tai khoan moi bang tay (xem POST /nguoi-dung).
const VAI_TRO = ['admin', 'nhan_su', 'truong_phong', 'truong_phong_nhan_su',
  'nhan_vien', 'cho_duyet'] as const;

/**
 * Vai tro DOI phai gan voi mot ho so nhan vien.
 *
 * `truong_phong_nhan_su` nam trong danh sach nay: nguoi duoc quyen go ban goc giay to phap
 * ly cua nguoi khac thi nhat ky thao tac phai truy nguoc duoc ve mot con nguoi cu the, chu
 * khong dung lai o mot ten dang nhap.
 */
const VAI_TRO_CAN_HO_SO = ['nhan_vien', 'truong_phong', 'truong_phong_nhan_su'] as const;

function can_ho_so(v: string | null): boolean {
  return (VAI_TRO_CAN_HO_SO as readonly string[]).includes(v ?? '');
}
const VAI_TRO_TAO_MOI = ['admin', 'nhan_su', 'truong_phong', 'truong_phong_nhan_su',
  'nhan_vien'] as const;

export async function tuyen_danh_muc(app: FastifyInstance): Promise<void> {
  // =====================================================================  PHONG BAN
  app.get('/phong-ban', { preHandler: can_dang_nhap }, async () =>
    truy_van(
      `select pb.id, pb.ten, pb.truong_phong_id, nv.ho_ten as truong_phong,
              (select count(*) from nhan_vien x
                where x.phong_ban_id = pb.id and x.dang_hoat_dong = true)::int as so_nhan_vien
         from phong_ban pb
         left join nhan_vien nv on nv.id = pb.truong_phong_id
        order by pb.ten`,
    ),
  );

  app.post('/phong-ban', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const ten = chuoi_bat_buoc(b, 'ten', { toi_da: 120 });
    const truong_phong_id = uuid(b, 'truong_phong_id');
    const dong = await ghi_bat_trung(
      () => truy_van_mot<{ id: string }>(
        'insert into phong_ban(ten, truong_phong_id) values ($1,$2) returning id',
        [ten, truong_phong_id],
      ),
      'Tên phòng ban đã tồn tại.',
    );
    return res.code(201).send(dong);
  });

  app.patch('/phong-ban/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    const ten = chuoi(b, 'ten', { toi_da: 120 });
    const truong_phong_id = uuid(b, 'truong_phong_id');
    const so = await thuc_thi(
      `update phong_ban
          set ten = coalesce($2, ten),
              truong_phong_id = case when $3::boolean then $4::uuid else truong_phong_id end
        where id = $1`,
      [id, ten, Object.hasOwn(b, 'truong_phong_id'), truong_phong_id],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy phòng ban.');
    return { ok: true };
  });

  // =====================================================================  CA LAM
  app.get('/ca-lam', { preHandler: can_dang_nhap }, async () =>
    truy_van(
      `select c.id, c.ten, c.gio_vao, c.gio_ra, c.nghi_tu, c.nghi_den,
              c.dung_sai_muon_phut, c.dung_sai_som_phut, c.nguong_ot_phut,
              c.qua_dem, c.phut_du_cong, c.cac_ngay_lam, c.dang_hoat_dong,
              coalesce(
                (select json_agg(json_build_object(
                          'thu', t.thu, 'gio_vao', t.gio_vao, 'gio_ra', t.gio_ra,
                          'nghi_tu', t.nghi_tu, 'nghi_den', t.nghi_den,
                          'phut_du_cong', t.phut_du_cong) order by t.thu)
                   from ca_lam_theo_thu t where t.ca_lam_id = c.id),
                '[]'::json) as theo_thu
         from ca_lam c order by c.dang_hoat_dong desc, c.ten`,
    ),
  );

  app.post('/ca-lam', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const ts = doc_ca_lam(b);
    const theo_thu = doc_ca_theo_thu(b);
    const dong = await trong_giao_dich(async (khach) => {
      const kq = await khach.query<{ id: string }>(
        `insert into ca_lam
           (ten, gio_vao, gio_ra, nghi_tu, nghi_den, dung_sai_muon_phut, dung_sai_som_phut,
            nguong_ot_phut, qua_dem, phut_du_cong, cac_ngay_lam)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
        ts,
      );
      const id = kq.rows[0]?.id as string;
      await ghi_ca_theo_thu(khach, id, theo_thu);
      return { id };
    });
    return res.code(201).send(dong);
  });

  app.put('/ca-lam/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    const ts = doc_ca_lam(b);
    const theo_thu = doc_ca_theo_thu(b);
    const so = await trong_giao_dich(async (khach) => {
      const kq = await khach.query(
        `update ca_lam set ten=$2, gio_vao=$3, gio_ra=$4, nghi_tu=$5, nghi_den=$6,
                dung_sai_muon_phut=$7, dung_sai_som_phut=$8, nguong_ot_phut=$9,
                qua_dem=$10, phut_du_cong=$11, cac_ngay_lam=$12
          where id=$1`,
        [id, ...ts],
      );
      if (kq.rowCount === 0) return 0;
      // Thay the toan bo: than yeu cau la nguon su that cho khung gio rieng cua ca nay.
      await khach.query('delete from ca_lam_theo_thu where ca_lam_id = $1', [id]);
      await ghi_ca_theo_thu(khach, id, theo_thu);
      return kq.rowCount ?? 0;
    });
    if (so === 0) throw new LoiKhongTim('Không tìm thấy ca làm việc.');
    // Doi quy tac ca -> bang cong cu da sai. Nhan su phai tinh lai chu dong
    // (POST /api/bang-cong/tinh-lai) vi co the anh huong hang nghin ngay.
    return { ok: true, luu_y: 'Đổi ca không tự tính lại bảng công cũ. Hãy dùng "Tính lại tháng" ở trang Bảng công.' };
  });

  app.delete('/ca-lam/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    // Khong xoa that (bang cong cu con tham chieu) — chi vo hieu hoa.
    const so = await thuc_thi('update ca_lam set dang_hoat_dong = false where id = $1', [id]);
    if (so === 0) throw new LoiKhongTim('Không tìm thấy ca làm việc.');
    return { ok: true };
  });

  // =====================================================================  NHAN VIEN
  app.get('/nhan-vien', { preHandler: can_dang_nhap }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const tim = chuoi(q, 'tim', { toi_da: 100 });
    const chi_dang_lam = luan_ly(q, 'chi_dang_lam', true);
    return truy_van(
      `select nv.id, nv.ma_nv, nv.ho_ten, nv.pin_may, nv.ma_erp, nv.ngay_vao,
              nv.so_dien_thoai, nv.email, nv.duoc_cham_cong_dien_thoai, nv.dang_hoat_dong,
              nv.phong_ban_id, pb.ten as phong_ban,
              nv.ca_lam_id, cl.ten as ca_lam,
              (nd.id is not null) as co_tai_khoan
         from nhan_vien nv
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ca_lam    cl on cl.id = nv.ca_lam_id
         left join nguoi_dung nd on nd.nhan_vien_id = nv.id
        where ($1::boolean is not true or nv.dang_hoat_dong = true)
          and ($2::text is null
               or nv.ho_ten ilike '%' || $2 || '%'
               or nv.ma_nv  ilike '%' || $2 || '%'
               or nv.pin_may = $2)
        order by nv.dang_hoat_dong desc, nv.ho_ten`,
      [chi_dang_lam, tim],
    );
  });

  app.post('/nhan-vien', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const dong = await ghi_bat_trung(
      () => truy_van_mot<{ id: string }>(
        `insert into nhan_vien
           (ma_nv, ho_ten, pin_may, ma_erp, phong_ban_id, ca_lam_id, ngay_vao,
            so_dien_thoai, email, duoc_cham_cong_dien_thoai)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
        doc_nhan_vien(b, true),
      ),
      'Mã nhân viên hoặc PIN máy đã được dùng cho người khác.',
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'tao_nhan_vien', 'nhan_vien',
      dong?.id ?? null, { ma_nv: b['ma_nv'] }, req.ip);

    const canh_bao = dong === null ? [] : await ghi_ma_dinh_danh(dong.id, b);
    return res.code(201).send(canh_bao.length === 0 ? dong : { ...dong, canh_bao });
  });

  app.put('/nhan-vien/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    const ts = doc_nhan_vien(b, true);
    const so = await ghi_bat_trung(
      () => thuc_thi(
        `update nhan_vien set ma_nv=$2, ho_ten=$3, pin_may=$4, ma_erp=$5, phong_ban_id=$6,
                ca_lam_id=$7, ngay_vao=$8, so_dien_thoai=$9, email=$10,
                duoc_cham_cong_dien_thoai=$11, cap_nhat_luc=now()
          where id=$1`,
        [id, ...ts],
      ),
      'Mã nhân viên hoặc PIN máy đã được dùng cho người khác.',
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy nhân viên.');

    // Ten thu muc kho tep mang ma nhan vien va ho ten, nen doi hai truong do thi thu muc
    // phai doi theo. KHONG nem loi neu doi cho that bai: `ho_so_tep.ten_luu` van tro dung
    // cho cu nen moi tep van doc duoc, va lan quet dinh ky se sua ten thu muc sau.
    await dong_bo_thu_muc_nhan_vien(id, (m) => { req.log.info(m); });

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'sua_nhan_vien', 'nhan_vien', id, null, req.ip);

    const canh_bao = await ghi_ma_dinh_danh(id, b);
    return canh_bao.length === 0 ? { ok: true } : { ok: true, canh_bao };
  });

  /** Cho nghi viec: giu lai lich su cham cong, chi tat hoat dong. */
  app.post('/nhan-vien/:id/nghi-viec', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body ?? {});
    const ngay_nghi = ngay(b, 'ngay_nghi_viec');
    const so = await thuc_thi(
      `update nhan_vien
          set dang_hoat_dong = false,
              ngay_nghi_viec = coalesce($2::date, current_date),
              cap_nhat_luc = now()
        where id = $1`,
      [id, ngay_nghi],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy nhân viên.');
    // Vo hieu hoa luon tai khoan dang nhap cua nguoi do.
    await thuc_thi('update nguoi_dung set dang_hoat_dong = false where nhan_vien_id = $1', [id]);
    await thuc_thi(
      `update token_lam_moi set thu_hoi_luc = now()
        where thu_hoi_luc is null
          and nguoi_dung_id in (select id from nguoi_dung where nhan_vien_id = $1)`,
      [id],
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'cho_nghi_viec', 'nhan_vien', id, null, req.ip);
    return { ok: true };
  });

  // =====================================================================  MA DINH DANH
  //
  // Mot nguoi di qua nhieu he thong va moi he thong goi ho bang mot ma khac. Nhom route nay la
  // cho nhan su NHIN THAY va SUA bang do — truoc day cac ma nam rai rac trong nhung o nho tren
  // form ho so, va khong cho nao noi duoc "ma nay dang thuoc ai".

  /** Bang dac ta cac he thong — de giao dien khong go tay danh sach. */
  app.get('/ma-dinh-danh/he-thong', { preHandler: can_dang_nhap }, async () =>
    CAC_HE_THONG.map((h) => ({
      ma: h.ma, ten: h.ten, nhom: h.nhom, nhieu_ma: h.nhieu_ma, on_dinh: h.on_dinh,
      cot_cu: h.cot_cu,
    })));

  /** Tim nguoi theo MOT MA BAT KY, ke ca ma da dong lai. */
  app.get('/ma-dinh-danh/tim', { preHandler: can_nhan_su }, async (req) => {
    const q = chuoi(req.query as Record<string, unknown>, 'q', { toi_da: 200 });
    return q === null ? [] : tim_theo_ma(q);
  });

  /** Doi soat bang dinh danh voi cac cot cu tren `nhan_vien`. */
  app.get('/ma-dinh-danh/doi-soat', { preHandler: can_nhan_su }, async () => {
    const lech = await doi_soat();
    return { so_lech: lech.length, chi_tiet: lech };
  });

  app.get('/nhan-vien/:id/ma-dinh-danh', { preHandler: can_dang_nhap }, async (req) => {
    const id = lay_id(req);
    const ca_lich_su = luan_ly(req.query as Record<string, unknown>, 'ca_lich_su', false);
    return ma_cua_nhan_vien(id, ca_lich_su === true);
  });

  app.post('/nhan-vien/:id/ma-dinh-danh', { preHandler: can_nhan_su }, async (req, res) => {
    const id = lay_id(req);
    const b = than(req.body);
    const he_thong = trong_tap(b, 'he_thong', MA_CAC_HE_THONG, { bat_buoc: true }) as string;
    const ma = chuoi_bat_buoc(b, 'ma', { toi_da: 200 });

    // `ma_nv` chi doi duoc tu form ho so: doi no con keo theo doi ten thu muc kho tep tren dia
    // va duong dan tren SharePoint (`dong_bo_thu_muc_nhan_vien`). Cho sua o hai cho la de mot
    // cho quen lam phan con lai.
    const dt = CAC_HE_THONG.find((h) => h.ma === he_thong);
    if (dt?.chi_tu_form_ho_so === true) {
      throw new LoiDauVao(
        `${dt.ten} chỉ đổi được ở form hồ sơ nhân viên, không đổi ở đây — đổi mã nhân viên `
        + 'còn kéo theo đổi tên thư mục kho tệp và đường dẫn trên SharePoint.',
      );
    }
    // Mac dinh KHONG thu hoi ma cua nguoi khac. Nguoi goi phai noi ro — day la thao tac chuyen
    // danh tinh giua hai con nguoi, khong phai mot o nhap lieu binh thuong.
    const thu_hoi = luan_ly(b, 'thu_hoi_cua_nguoi_khac', false) === true;
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    const kq = await gan_ma(id, he_thong, ma, {
      nguon: 'nguoi_khai', ghi_chu, thu_hoi_cua_nguoi_khac: thu_hoi,
    });
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'gan_ma_dinh_danh', 'nhan_vien', id,
      { he_thong, ma, ket_cuc: kq.ket_cuc }, req.ip);
    return res.code(201).send(kq);
  });

  /** Dong mot ma lai. Khong xoa dong — lich su la ly do bang nay ton tai. */
  app.delete('/ma-dinh-danh/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const ghi_chu = chuoi(than(req.body ?? {}), 'ghi_chu', { toi_da: 500 });
    await thu_hoi_ma(id, ghi_chu);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'thu_hoi_ma_dinh_danh', 'ma_dinh_danh',
      id, null, req.ip);
    return { ok: true };
  });

  // =====================================================================  THIET BI
  app.get('/thiet-bi', { preHandler: can_dang_nhap }, async () =>
    truy_van(
      `select id, serial, ten, vi_tri, dang_bat, phien_ban_firmware, dia_chi_ip,
              thay_lan_cuoi, pin_tu, pin_den,
              (thay_lan_cuoi is not null
               and thay_lan_cuoi > now() - ($1 || ' seconds')::interval) as dang_online,
              (select count(*) from lenh_thiet_bi l
                where l.thiet_bi_serial = thiet_bi.serial and l.gui_luc is null)::int as lenh_cho
         from thiet_bi order by ten`,
      [String(cau_hinh.may_offline_sau_giay)],
    ),
  );

  app.post('/thiet-bi', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const serial = chuoi_bat_buoc(b, 'serial', { toi_da: 64 });
    const ten = chuoi_bat_buoc(b, 'ten', { toi_da: 120 });
    const vi_tri = chuoi(b, 'vi_tri', { toi_da: 120 }) ?? 'Van phong';
    // Dai PIN: khai ngay luc them may thi khong ai phai nho quay lai dat sau — va cap PIN cho
    // nguoi dau tien cua may do da dung dai ngay tu dau.
    const dai = doc_dai_pin(so_nguyen(b, 'pin_tu'), so_nguyen(b, 'pin_den'));
    const dong = await ghi_bat_trung(
      () => truy_van_mot<{ id: string }>(
        `insert into thiet_bi(serial, ten, vi_tri, pin_tu, pin_den)
         values ($1,$2,$3,$4,$5) returning id`,
        [serial, ten, vi_tri, dai?.tu ?? null, dai?.den ?? null],
      ),
      'Serial máy này đã được khai báo.',
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'khai_bao_may', 'thiet_bi',
      dong?.id ?? null, { serial }, req.ip);
    return res.code(201).send(dong);
  });

  app.patch('/thiet-bi/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    // `pin_tu`/`pin_den` di CUNG NHAU: gui mot trong hai thi `doc_dai_pin` bao loi, gui ca hai
    // thi doi ca hai, khong gui gi thi giu nguyen. Rang buoc `check` cua bang cung doi the.
    const co_dai = b['pin_tu'] !== undefined || b['pin_den'] !== undefined;
    const dai = co_dai ? doc_dai_pin(so_nguyen(b, 'pin_tu'), so_nguyen(b, 'pin_den')) : null;
    const so = await thuc_thi(
      `update thiet_bi
          set ten = coalesce($2, ten),
              vi_tri = coalesce($3, vi_tri),
              dang_bat = coalesce($4, dang_bat),
              pin_tu = case when $5::boolean then $6::int else pin_tu end,
              pin_den = case when $5::boolean then $7::int else pin_den end
        where id = $1`,
      [id, chuoi(b, 'ten', { toi_da: 120 }), chuoi(b, 'vi_tri', { toi_da: 120 }),
        luan_ly(b, 'dang_bat'), co_dai, dai?.tu ?? null, dai?.den ?? null],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy thiết bị.');
    return { ok: true };
  });

  /**
   * Xoa han mot may da ngung dung.
   *
   * PHAI TAT TRUOC. Xoa mot may dang chay thi no bat dau an 401 va khong ai biet vi sao — hai
   * buoc bat nguoi xoa nhin thay may do da ngung nhan du lieu truoc khi go han.
   *
   * LICH SU QUET O LAI. `lan_quet.thiet_bi_serial` la chu tu do, khong co khoa ngoai, nen bang
   * cong cu van nguyen ven va van tra loi duoc "lan quet nay tu may nao". Chi ban ghi khai bao
   * may va cac lenh chua gui la mat — dung nhung thu khong con nghia khi may khong con.
   */
  app.delete('/thiet-bi/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const may = await truy_van_mot<{ serial: string; ten: string; dang_bat: boolean }>(
      'select serial, ten, dang_bat from thiet_bi where id = $1', [id]);
    if (may === null) throw new LoiKhongTim('Không tìm thấy thiết bị.');
    if (may.dang_bat) {
      throw new LoiXungDot(
        `Máy "${may.ten}" đang bật. Tắt máy trước rồi mới xóa — để chắc chắn nó đã ngừng nhận `
        + 'dữ liệu, thay vì đột nhiên bị từ chối 401 mà không ai biết vì sao.',
      );
    }

    const kq = await trong_giao_dich(async (khach) => {
      const quet = await khach.query<{ so: number }>(
        'select count(*)::int as so from lan_quet where thiet_bi_serial = $1', [may.serial]);
      const lenh = await khach.query(
        'delete from lenh_thiet_bi where thiet_bi_serial = $1', [may.serial]);
      await khach.query('delete from thiet_bi where id = $1', [id]);
      return {
        so_lan_quet_giu_lai: Number(quet.rows[0]?.so ?? 0),
        so_lenh_da_xoa: lenh.rowCount ?? 0,
      };
    });

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xoa_thiet_bi', 'thiet_bi', id,
      { serial: may.serial, ...kq }, req.ip);
    return { ok: true, ...kq };
  });

  /**
   * De nghi mot PIN con trong cho may nay. KHONG ghi gi.
   *
   * De nguoi dung nhin thay so truoc khi quyet dinh — cap PIN la viec se phai cai tay len may,
   * nen ho can biet so do la gi truoc khi bam.
   */
  app.get('/thiet-bi/:serial/pin-goi-y', { preHandler: can_nhan_su }, async (req) =>
    goi_y_pin(lay_serial_param(req)));

  /**
   * He thong CAP mot PIN cho nhan vien, theo dai cua may.
   *
   * Chieu di la he-thong -> may: he thong chon so, nguoi phu trach cai dung so do len may. Nguoc
   * lai — nguoi khai may tu nghi so roi go lai vao phan mem — la duong chac chan den cham cong
   * sai ten khi co nhieu may.
   */
  app.post('/nhan-vien/:id/cap-pin', { preHandler: can_nhan_su }, async (req, res) => {
    const id = lay_id(req);
    const b = than(req.body);
    const serial = chuoi_bat_buoc(b, 'thiet_bi_serial', { toi_da: 64 });
    const kq = await cap_pin(id, serial);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'cap_pin_may', 'nhan_vien', id,
      { pin: kq.pin, thiet_bi_serial: serial }, req.ip);
    return res.code(201).send(kq);
  });

  /** Nap mot nhan vien xuong may (tao user tren may theo PIN). */
  app.post('/thiet-bi/:serial/nap-nhan-vien', { preHandler: can_nhan_su }, async (req) => {
    const serial = lay_serial_param(req);
    const b = than(req.body);
    const nhan_vien_id = uuid(b, 'nhan_vien_id', { bat_buoc: true }) as string;

    const nv = await truy_van_mot<{ pin_may: string | null; ho_ten: string }>(
      'select pin_may, ho_ten from nhan_vien where id = $1',
      [nhan_vien_id],
    );
    if (nv === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');

    // PIN lay tu BANG MA DINH DANH, hop voi cot cu — dung nguon ma bo tiep nhan ADMS dung.
    // Mot nguoi co the co NHIEU PIN (moi may mot PIN), va cot `pin_may` chi chua duoc mot;
    // nap nham PIN cua may khac thi nguoi do quet vao may nay khong ai nhan ra.
    const tu_bang = await truy_van<{ ma: string }>(
      `select ma from ma_dinh_danh
        where nhan_vien_id = $1 and he_thong = 'may_cham_cong' and hieu_luc_den is null
        order by hieu_luc_tu`,
      [nhan_vien_id],
    );
    const cac_pin = [...new Set([
      ...tu_bang.map((x) => x.ma),
      ...(nv.pin_may === null || nv.pin_may.trim() === '' ? [] : [nv.pin_may]),
    ])];

    if (cac_pin.length === 0) {
      throw new LoiDauVao('Nhân viên chưa có PIN máy. Hãy gán PIN trước.');
    }
    const pin_chon = chuoi(b, 'pin', { toi_da: 32 });
    if (pin_chon !== null && !cac_pin.includes(pin_chon)) {
      throw new LoiDauVao(
        `PIN "${pin_chon}" không thuộc nhân viên này. Các PIN đang có: ${cac_pin.join(', ')}.`);
    }
    // Nhieu PIN ma khong noi ro nap cai nao thi KHONG DOAN — doan sai o day nghia la nguoi do
    // quet vao may nay ma khong khop duoc ai, va khong co gi bao.
    if (pin_chon === null && cac_pin.length > 1) {
      throw new LoiDauVao(
        `Nhân viên có ${String(cac_pin.length)} PIN đang dùng (${cac_pin.join(', ')}). `
        + 'Chọn PIN cần nạp xuống máy này.');
    }
    const pin_nap = pin_chon ?? cac_pin[0] as string;

    await bat_buoc_co_may(serial);
    // Ten tren may ZKTeco chi hien duoc ASCII — bo dau de khong ra ky tu la.
    const ten_may = bo_dau(nv.ho_ten).slice(0, 24);
    const id = await xep_lenh(
      serial,
      `DATA UPDATE USERINFO PIN=${pin_nap}\tName=${ten_may}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000`,
    );
    return { ok: true, lenh_id: id, luu_y: 'Máy sẽ nhận lệnh ở lần kết nối kế tiếp (thường dưới 10 giây).' };
  });

  app.delete('/thiet-bi/:serial/nhan-vien/:pin', { preHandler: can_nhan_su }, async (req) => {
    const serial = lay_serial_param(req);
    const pin = String((req.params as Record<string, string>)['pin'] ?? '').trim();
    if (pin.length === 0 || pin.length > 32) throw new LoiDauVao('PIN không hợp lệ.');
    await bat_buoc_co_may(serial);
    const id = await xep_lenh(serial, `DATA DELETE USERINFO PIN=${pin}`);
    return { ok: true, lenh_id: id };
  });

  /** Dong bo dong ho may theo gio server — lech gio la nguyen nhan pho bien nhat lam sai cong. */
  app.post('/thiet-bi/:serial/dong-bo-gio', { preHandler: can_nhan_su }, async (req) => {
    const serial = lay_serial_param(req);
    await bat_buoc_co_may(serial);
    const id = await xep_lenh(serial, lenh_dong_bo_gio(new Date(), OFFSET_MAY_MS));
    return { ok: true, lenh_id: id };
  });

  /** Yeu cau may gui lai toan bo log chua dong bo (dung khi nghi mat du lieu). */
  app.post('/thiet-bi/:serial/gui-lai-log', { preHandler: can_nhan_su }, async (req) => {
    const serial = lay_serial_param(req);
    await bat_buoc_co_may(serial);
    const id = await xep_lenh(serial, 'CHECK');
    return { ok: true, lenh_id: id, luu_y: 'Bản ghi trùng sẽ tự bị bỏ qua nhờ khóa chống trùng.' };
  });

  // ------------------------------------------------------------ khoa API tich hop
  //
  // Chi admin. Khoa API mo duong vao du lieu cham cong va ho so nhan su cua ca cong ty
  // bang mot chuoi ky tu — cap cho ai la mot quyet dinh ngang voi cap tai khoan quan tri.
  app.get('/khoa-api', { preHandler: can_admin }, async () => truy_van(
    `select k.id, k.ten, k.tien_to, k.pham_vi, k.dang_bat, k.het_han, k.ip_cho_phep,
            k.ghi_chu, k.tao_luc, k.dung_lan_cuoi, k.so_lan_dung, nd.ten_dang_nhap as tao_boi
       from khoa_api k
       left join nguoi_dung nd on nd.id = k.tao_boi
      order by k.tao_luc desc`,
  ));

  app.post('/khoa-api', { preHandler: can_admin }, async (req, res) => {
    const b = than(req.body);
    const ten = chuoi_bat_buoc(b, 'ten', { toi_da: 100 });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });
    const ip_cho_phep = chuoi(b, 'ip_cho_phep', { toi_da: 500 });
    const het_han = ngay(b, 'het_han');

    const tho = b['pham_vi'];
    const pham_vi = Array.isArray(tho) ? tho.map(String) : [];
    const sai = pham_vi.filter((p) => !la_pham_vi(p));
    if (sai.length > 0) {
      throw new LoiDauVao(`Phạm vi không hợp lệ: ${sai.join(', ')}. Hợp lệ: ${PHAM_VI.join(', ')}.`);
    }
    if (pham_vi.length === 0) {
      throw new LoiDauVao('Phải chọn ít nhất một phạm vi, nếu không khóa không gọi được gì.');
    }
    // Khai IP sai dinh dang thi bao NGAY luc tao, khong doi den luc ben tich hop goi vao
    // roi mo ho khong hieu vi sao bi 403.
    if (ip_cho_phep !== null && ip_cho_phep.trim() !== '') {
      doc_danh_sach_ip(ip_cho_phep, 'ip_cho_phep');
    }

    const { khoa, ma_bam, tien_to } = sinh_khoa();
    const dong = await truy_van_mot<{ id: string }>(
      `insert into khoa_api (ten, ma_bam, tien_to, pham_vi, het_han, ip_cho_phep, ghi_chu, tao_boi)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [ten, ma_bam, tien_to, pham_vi, het_han, ip_cho_phep, ghi_chu,
        nguoi_dung_hien_tai(req).sub],
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'tao_khoa_api', 'khoa_api',
      dong?.id ?? null, { ten, pham_vi }, req.ip);

    // `khoa` tra ve DUY NHAT lan nay. CSDL chi giu ma bam nen khong the lay lai — mat thi
    // thu hoi va tao cai moi.
    return res.code(201).send({ id: dong?.id ?? null, ten, pham_vi, khoa });
  });

  app.patch('/khoa-api/:id', { preHandler: can_admin }, async (req) => {
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const b = than(req.body);
    const dang_bat = b['dang_bat'];
    if (typeof dang_bat !== 'boolean') throw new LoiDauVao('Cần trường "dang_bat" (true/false).');
    const dong = await truy_van_mot<{ id: string; ten: string }>(
      'update khoa_api set dang_bat = $2 where id = $1 returning id, ten', [id, dang_bat],
    );
    if (dong === null) throw new LoiKhongTim('Không tìm thấy khóa API.');
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, dang_bat ? 'bat_khoa_api' : 'tat_khoa_api',
      'khoa_api', id, { ten: dong.ten }, req.ip);
    return { id, dang_bat };
  });

  app.delete('/khoa-api/:id', { preHandler: can_admin }, async (req) => {
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const dong = await truy_van_mot<{ ten: string }>(
      'delete from khoa_api where id = $1 returning ten', [id],
    );
    if (dong === null) throw new LoiKhongTim('Không tìm thấy khóa API.');
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xoa_khoa_api', 'khoa_api', id,
      { ten: dong.ten }, req.ip);
    return { da_xoa: true };
  });

  /** Nhat ky goi cua mot khoa — de doi chieu khi ben tich hop bao khong lay duoc du lieu. */
  app.get('/khoa-api/:id/nhat-ky', { preHandler: can_admin }, async (req) => {
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    return truy_van(
      `select duong_dan, phuong_thuc, ma_tra_ve, dia_chi_ip, mili_giay, tao_luc
         from nhat_ky_api where khoa_api_id = $1 order by id desc limit 200`,
      [id],
    );
  });

  app.get('/thiet-bi/:serial/lenh', { preHandler: can_nhan_su }, async (req) => {
    const serial = lay_serial_param(req);
    return truy_van(
      `select id, lenh, tao_luc, gui_luc, ma_tra_ve, bao_luc
         from lenh_thiet_bi where thiet_bi_serial = $1
        order by id desc limit 100`,
      [serial],
    );
  });

  // =====================================================================  DIA DIEM (geofence)
  app.get('/dia-diem', { preHandler: can_dang_nhap }, async () =>
    truy_van('select id, ten, vi_do, kinh_do, ban_kinh_m, dang_hoat_dong from dia_diem order by ten'),
  );

  app.post('/dia-diem', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const dong = await truy_van_mot<{ id: string }>(
      'insert into dia_diem(ten, vi_do, kinh_do, ban_kinh_m) values ($1,$2,$3,$4) returning id',
      [
        chuoi_bat_buoc(b, 'ten', { toi_da: 120 }),
        so_thuc(b, 'vi_do', { bat_buoc: true, min: -90, max: 90 }),
        so_thuc(b, 'kinh_do', { bat_buoc: true, min: -180, max: 180 }),
        so_nguyen(b, 'ban_kinh_m', { min: 20, max: 20000, mac_dinh: cau_hinh.geofence_ban_kinh_m }),
      ],
    );
    return res.code(201).send(dong);
  });

  app.patch('/dia-diem/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    const so = await thuc_thi(
      `update dia_diem set ten = coalesce($2, ten), vi_do = coalesce($3, vi_do),
              kinh_do = coalesce($4, kinh_do), ban_kinh_m = coalesce($5, ban_kinh_m),
              dang_hoat_dong = coalesce($6, dang_hoat_dong)
        where id = $1`,
      [
        id,
        chuoi(b, 'ten', { toi_da: 120 }),
        so_thuc(b, 'vi_do', { min: -90, max: 90 }),
        so_thuc(b, 'kinh_do', { min: -180, max: 180 }),
        so_nguyen(b, 'ban_kinh_m', { min: 20, max: 20000 }),
        luan_ly(b, 'dang_hoat_dong'),
      ],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy địa điểm.');
    return { ok: true };
  });

  // =====================================================================  NGAY LE
  app.get('/ngay-le', { preHandler: can_dang_nhap }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const nam = so_nguyen(q, 'nam', { min: 2000, max: 2100 });
    return truy_van(
      `select ngay, ten, huong_luong from ngay_le
        where $1::int is null or extract(year from ngay) = $1
        order by ngay`,
      [nam],
    );
  });

  app.post('/ngay-le', { preHandler: can_nhan_su }, async (req, res) => {
    const b = than(req.body);
    const ng = ngay_bat_buoc(b, 'ngay');
    await thuc_thi(
      `insert into ngay_le(ngay, ten, huong_luong) values ($1,$2,$3)
       on conflict (ngay) do update set ten = excluded.ten, huong_luong = excluded.huong_luong`,
      [ng, chuoi_bat_buoc(b, 'ten', { toi_da: 120 }), luan_ly(b, 'huong_luong', true)],
    );
    // Ngay le doi trang thai ngay do -> tinh lai ngay lap tuc.
    const so = await tinh_lai_khoang(ng, ng);
    return res.code(201).send({ ok: true, da_tinh_lai: so });
  });

  app.delete('/ngay-le/:ngay', { preHandler: can_nhan_su }, async (req) => {
    const p = req.params as Record<string, string>;
    const ng = ngay_bat_buoc({ ngay: p['ngay'] }, 'ngay');
    const so = await thuc_thi('delete from ngay_le where ngay = $1', [ng]);
    if (so === 0) throw new LoiKhongTim('Không tìm thấy ngày lễ.');
    await tinh_lai_khoang(ng, ng);
    return { ok: true };
  });

  // =====================================================================  NGUOI DUNG
  app.get('/nguoi-dung', { preHandler: can_admin }, async () =>
    truy_van(
      `select nd.id, nd.ten_dang_nhap, nd.vai_tro, nd.dang_hoat_dong, nd.phai_doi_mat_khau,
              nd.dang_nhap_cuoi, nd.nhan_vien_id, nd.email_microsoft, nd.duyet_luc,
              nv.ho_ten, nv.ma_nv, nd2.ten_dang_nhap as duyet_boi_ten
         from nguoi_dung nd
         left join nhan_vien nv on nv.id = nd.nhan_vien_id
         left join nguoi_dung nd2 on nd2.id = nd.duyet_boi
        -- Cho duyet len dau: day la viec admin can lam, khong phai thu de lan trong danh sach.
        order by (nd.vai_tro = 'cho_duyet') desc, nd.ten_dang_nhap`,
    ),
  );

  app.post('/nguoi-dung', { preHandler: can_admin }, async (req, res) => {
    const b = than(req.body);
    const ten_dang_nhap = chuoi_bat_buoc(b, 'ten_dang_nhap', { toi_da: 100, toi_thieu: 3 });
    if (!/^[a-zA-Z0-9._-]+$/.test(ten_dang_nhap)) {
      throw new LoiDauVao('Tên đăng nhập chỉ được gồm chữ không dấu, số và các ký tự . _ -');
    }
    const mat_khau = chuoi_bat_buoc(b, 'mat_khau', { toi_da: 200 });
    const vai_tro = trong_tap(b, 'vai_tro', VAI_TRO_TAO_MOI, { bat_buoc: true }) as typeof VAI_TRO_TAO_MOI[number];
    const nhan_vien_id = uuid(b, 'nhan_vien_id');

    if (can_ho_so(vai_tro) && nhan_vien_id === null) {
      throw new LoiDauVao('Vai trò nhân viên / trưởng phòng phải gắn với một nhân viên.');
    }

    let hash: string;
    try {
      hash = await bam_mat_khau(mat_khau);
    } catch (loi) {
      if (loi instanceof LoiMatKhau) throw new LoiDauVao(loi.message);
      throw loi;
    }

    const dong = await ghi_bat_trung(
      () => truy_van_mot<{ id: string }>(
        `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, nhan_vien_id)
         values ($1,$2,$3,$4) returning id`,
        [ten_dang_nhap, hash, vai_tro, nhan_vien_id],
      ),
      'Tên đăng nhập đã tồn tại, hoặc nhân viên này đã có tài khoản.',
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'tao_tai_khoan', 'nguoi_dung',
      dong?.id ?? null, { ten_dang_nhap, vai_tro }, req.ip);
    return res.code(201).send(dong);
  });

  /** Dat lai mat khau ho nhan vien (nguoi dung bat buoc doi o lan dang nhap sau). */
  app.post('/nguoi-dung/:id/dat-lai-mat-khau', { preHandler: can_admin }, async (req) => {
    const id = lay_id(req);
    const b = than(req.body);
    const mat_khau = chuoi_bat_buoc(b, 'mat_khau_moi', { toi_da: 200 });

    let hash: string;
    try {
      hash = await bam_mat_khau(mat_khau);
    } catch (loi) {
      if (loi instanceof LoiMatKhau) throw new LoiDauVao(loi.message);
      throw loi;
    }

    const so = await thuc_thi(
      `update nguoi_dung
          set mat_khau_hash = $2, phai_doi_mat_khau = true, so_lan_sai = 0, khoa_den = null
        where id = $1`,
      [id, hash],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy tài khoản.');
    // Cat moi phien dang mo cua nguoi do.
    await thuc_thi(
      'update token_lam_moi set thu_hoi_luc = now() where nguoi_dung_id = $1 and thu_hoi_luc is null',
      [id],
    );
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'dat_lai_mat_khau', 'nguoi_dung', id, null, req.ip);
    return { ok: true };
  });

  app.patch('/nguoi-dung/:id', { preHandler: can_admin }, async (req) => {
    const id = lay_id(req);
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const dang_hoat_dong = luan_ly(b, 'dang_hoat_dong');
    const vai_tro = trong_tap(b, 'vai_tro', VAI_TRO);
    // Chuoi rong = go lien ket voi Microsoft; vang mat = khong doi.
    const co_doi_email = Object.hasOwn(b, 'email_microsoft');
    const email_microsoft = co_doi_email ? doc_email_microsoft(b) : null;

    // Chan tu khoa chinh minh ra khoi he thong.
    if (id === nd.sub && (dang_hoat_dong === false || (vai_tro !== null && vai_tro !== 'admin'))) {
      throw new LoiDauVao('Không thể tự vô hiệu hóa hoặc tự hạ quyền tài khoản đang dùng.');
    }

    // Vai tro `nhan_vien` va `truong_phong` BAT BUOC gan voi mot ho so nhan vien: pham vi
    // du lieu cua ho duoc tinh tu ho so do (xem `pham_vi_nhan_vien`). Khong gan thi khong
    // biet ho duoc xem cua ai. CSDL cung co rang buoc CHECK cho viec nay.
    //
    // Truoc day cho di thang xuong CSDL: rang buoc no ra loi 23514, khong ai bat, va nguoi
    // dung nhan "Loi he thong" — mot loi hoan toan doan truoc duoc lai hien ra nhu su co.
    let nhan_vien_gan: string | null = null;
    if (can_ho_so(vai_tro)) {
      const hien = await truy_van_mot<{ nhan_vien_id: string | null; ten: string; email_ms: string | null }>(
        `select nhan_vien_id, ten_dang_nhap as ten, email_microsoft as email_ms
           from nguoi_dung where id = $1`, [id]);
      if (hien === null) throw new LoiKhongTim('Không tìm thấy tài khoản.');

      if (hien.nhan_vien_id === null) {
        // Cho phep chi dinh thang, hoac tu doi chieu theo email — dung cach he thong van
        // noi tai khoan Microsoft voi ho so nhan vien luc tao.
        nhan_vien_gan = uuid(b, 'nhan_vien_id');
        if (nhan_vien_gan === null) {
          const theo_email = await truy_van_mot<{ id: string }>(
            `select id from nhan_vien
              where dang_hoat_dong = true
                and lower(email) in (lower($1), lower(coalesce($2, '')))
              limit 1`,
            [hien.ten, hien.email_ms],
          );
          nhan_vien_gan = theo_email?.id ?? null;
        }
        if (nhan_vien_gan === null) {
          throw new LoiDauVao(
            'Vai trò này cần một hồ sơ nhân viên để biết người đó được xem dữ liệu của ai. '
            + `Hãy tạo nhân viên ở trang Nhân viên với email đúng bằng "${hien.ten}", `
            + 'rồi cấp quyền lại — hệ thống sẽ tự nối.',
          );
        }
      }
    }

    const so = await ghi_bat_trung(
      () => thuc_thi(
        `update nguoi_dung
            set dang_hoat_dong = coalesce($2, dang_hoat_dong),
                vai_tro = coalesce($3, vai_tro),
                nhan_vien_id = coalesce($7::uuid, nhan_vien_id),
                email_microsoft = case when $4 then $5 else email_microsoft end,
                -- Ghi lai ai phan quyen, luc nao: chi khi vua thoat khoi trang thai cho duyet.
                duyet_boi = case when vai_tro = 'cho_duyet' and $3::text is not null
                                  and $3 <> 'cho_duyet' then $6::uuid else duyet_boi end,
                duyet_luc = case when vai_tro = 'cho_duyet' and $3::text is not null
                                  and $3 <> 'cho_duyet' then now() else duyet_luc end
          where id = $1`,
        [id, dang_hoat_dong, vai_tro, co_doi_email, email_microsoft, nd.sub, nhan_vien_gan],
      ),
      'Email Microsoft này đã gán cho tài khoản khác.',
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy tài khoản.');
    if (dang_hoat_dong === false) {
      await thuc_thi(
        'update token_lam_moi set thu_hoi_luc = now() where nguoi_dung_id = $1 and thu_hoi_luc is null',
        [id],
      );
    }
    await ghi_nhat_ky(nd.sub, 'sua_tai_khoan', 'nguoi_dung', id, { dang_hoat_dong, vai_tro }, req.ip);
    return { ok: true };
  });

  // =====================================================================  NHAT KY
  app.get('/nhat-ky', { preHandler: can_admin }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const gioi_han = so_nguyen(q, 'gioi_han', { min: 1, max: 500, mac_dinh: 100 }) ?? 100;
    return truy_van(
      `select nk.id, nk.hanh_dong, nk.thuc_the, nk.thuc_the_id, nk.chi_tiet,
              nk.dia_chi_ip, nk.luc, nd.ten_dang_nhap
         from nhat_ky_thao_tac nk
         left join nguoi_dung nd on nd.id = nk.nguoi_dung_id
        order by nk.luc desc limit $1`,
      [gioi_han],
    );
  });
}

// ============================================================================ tien ich

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

function lay_serial_param(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  const s = String(p['serial'] ?? '').trim();
  if (s.length === 0 || s.length > 64) throw new LoiDauVao('Serial máy không hợp lệ.');
  return s;
}

/**
 * May phai CO KHAI va DANG BAT thi moi xep lenh xuong duoc.
 *
 * `dang_bat` la dieu kien bat buoc chu khong phai chi tiet: cong `/iclock` chi nhan may co
 * `dang_bat = true`, nen mot lenh xep cho may dang tat se KHONG BAO GIO duoc nhan. Truoc day
 * route van bao "đã xếp lệnh" va lenh nam lai mai mai — tren VPS that co dung mot dong nhu the,
 * xep cho may `THU001` tu 07/08 va khong ai biet.
 */
async function bat_buoc_co_may(serial: string): Promise<void> {
  const may = await truy_van_mot<{ id: string; ten: string; dang_bat: boolean }>(
    'select id, ten, dang_bat from thiet_bi where serial = $1', [serial]);
  if (may === null) throw new LoiKhongTim('Chưa khai báo máy có serial này.');
  if (!may.dang_bat) {
    throw new LoiXungDot(
      `Máy "${may.ten}" đang tắt nên không nhận lệnh — cổng máy chỉ tiếp máy đang bật. `
      + 'Bật máy ở trang Thiết bị rồi xếp lệnh lại.',
    );
  }
}

/** Doi loi vi pham UNIQUE (23505) thanh LoiXungDot co thong diep de hieu. */
/**
 * Doi loi trung khoa cua Postgres thanh thong diep nguoi dung hieu duoc.
 *
 * Nhan dang theo TEN RANG BUOC chu khong gan chung mot thong diep cho moi loi 23505: bang
 * `nguoi_dung` co nhieu khoa duy nhat, va bao "email Microsoft da duoc dung" khi that ra
 * nhan vien do da co tai khoan khac thi nguoi dung sua mai khong ra.
 */
async function ghi_bat_trung<T>(ham: () => Promise<T>, thong_diep: string): Promise<T> {
  try {
    return await ham();
  } catch (loi) {
    if ((loi as { code?: string }).code !== '23505') throw loi;
    const rb = (loi as { constraint?: string }).constraint ?? '';
    if (rb.includes('nhan_vien_id')) {
      throw new LoiXungDot('Nhân viên này đã có một tài khoản khác. Mỗi nhân viên chỉ một tài khoản.');
    }
    if (rb.includes('ten_dang_nhap')) {
      throw new LoiXungDot('Tên đăng nhập này đã tồn tại.');
    }
    throw new LoiXungDot(thong_diep);
  }
}

function doc_ca_lam(b: Record<string, unknown>): unknown[] {
  const gio_vao = gio(b, 'gio_vao', { bat_buoc: true }) as string;
  const gio_ra = gio(b, 'gio_ra', { bat_buoc: true }) as string;
  const nghi_tu = gio(b, 'nghi_tu');
  const nghi_den = gio(b, 'nghi_den');
  if ((nghi_tu === null) !== (nghi_den === null)) {
    throw new LoiDauVao('Phải khai cả hai mốc giờ nghỉ từ và nghỉ đến, hoặc để trống cả hai.');
  }
  if (nghi_tu !== null && nghi_den !== null && nghi_den <= nghi_tu) {
    throw new LoiDauVao('Giờ nghỉ đến phải lớn hơn giờ nghỉ từ.');
  }

  const qua_dem = luan_ly(b, 'qua_dem', gio_ra <= gio_vao) as boolean;
  if (!qua_dem && gio_ra <= gio_vao) {
    throw new LoiDauVao('Giờ ra phải lớn hơn giờ vào, hoặc bật "qua đêm" cho ca đêm.');
  }

  const cac_ngay_lam = doc_ngay_lam(b['cac_ngay_lam']);

  return [
    chuoi_bat_buoc(b, 'ten', { toi_da: 80 }),
    gio_vao, gio_ra, nghi_tu, nghi_den,
    so_nguyen(b, 'dung_sai_muon_phut', { min: 0, max: 240, mac_dinh: 5 }),
    so_nguyen(b, 'dung_sai_som_phut', { min: 0, max: 240, mac_dinh: 5 }),
    so_nguyen(b, 'nguong_ot_phut', { min: 0, max: 480, mac_dinh: 30 }),
    qua_dem,
    so_nguyen(b, 'phut_du_cong', { min: 60, max: 1440, mac_dinh: 420 }),
    cac_ngay_lam,
  ];
}

interface CaTheoThuVao {
  thu: number;
  gio_vao: string;
  gio_ra: string;
  nghi_tu: string | null;
  nghi_den: string | null;
  phut_du_cong: number;
}

/**
 * Doc khung gio rieng theo thu tu than yeu cau.
 *
 * Truong `theo_thu` VANG MAT khac hoan toan `theo_thu: []`: vang mat = khong doi gi
 * (nhung o PUT thi than la nguon su that nen vang mat = xoa het, dung nhu cac truong khac).
 */
function doc_ca_theo_thu(b: Record<string, unknown>): CaTheoThuVao[] {
  const v = b['theo_thu'];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new LoiDauVao('Khung giờ theo thứ phải là một danh sách.');

  const qua_dem = luan_ly(b, 'qua_dem', false) as boolean;
  if (qua_dem && v.length > 0) {
    throw new LoiDauVao('Ca qua đêm không khai được khung giờ riêng theo thứ: giờ ra thuộc ngày hôm sau.');
  }

  const ngay_lam = doc_ngay_lam(b['cac_ngay_lam']);
  const da_co = new Set<number>();

  return v.map((x) => {
    const m = than(x);
    const thu = so_nguyen(m, 'thu', { min: 0, max: 6, bat_buoc: true }) as number;
    if (da_co.has(thu)) throw new LoiDauVao(`Khai trùng khung giờ cho ${ten_thu(thu)}.`);
    da_co.add(thu);
    // Khai gio cho ngay khong di lam la vo nghia — bat loi thay vi luu roi khong ai dung.
    if (!ngay_lam.includes(thu)) {
      throw new LoiDauVao(`${ten_thu(thu)} không nằm trong các ngày đi làm của ca này.`);
    }

    const gio_vao = gio(m, 'gio_vao', { bat_buoc: true }) as string;
    const gio_ra = gio(m, 'gio_ra', { bat_buoc: true }) as string;
    if (gio_ra <= gio_vao) throw new LoiDauVao(`${ten_thu(thu)}: giờ ra phải lớn hơn giờ vào.`);

    const nghi_tu = gio(m, 'nghi_tu');
    const nghi_den = gio(m, 'nghi_den');
    if ((nghi_tu === null) !== (nghi_den === null)) {
      throw new LoiDauVao(`${ten_thu(thu)}: phải khai cả hai mốc giờ nghỉ, hoặc để trống cả hai.`);
    }
    if (nghi_tu !== null && nghi_den !== null && nghi_den <= nghi_tu) {
      throw new LoiDauVao(`${ten_thu(thu)}: giờ nghỉ đến phải lớn hơn giờ nghỉ từ.`);
    }

    // Mac dinh: dung bang so phut lam that cua khung gio do -> lam du khung la 1 cong.
    // Muon buoi sang thu Bay tinh 0,5 cong thi khai phut_du_cong gap doi (vd 480).
    const mac_dinh = phut_giua(gio_vao, gio_ra) - (nghi_tu !== null && nghi_den !== null ? phut_giua(nghi_tu, nghi_den) : 0);
    return {
      thu,
      gio_vao,
      gio_ra,
      nghi_tu,
      nghi_den,
      phut_du_cong: so_nguyen(m, 'phut_du_cong', { min: 60, max: 1440, mac_dinh }) as number,
    };
  });
}

async function ghi_ca_theo_thu(
  khach: { query: (sql: string, ts: unknown[]) => Promise<unknown> },
  ca_lam_id: string,
  ds: CaTheoThuVao[],
): Promise<void> {
  for (const t of ds) {
    await khach.query(
      `insert into ca_lam_theo_thu (ca_lam_id, thu, gio_vao, gio_ra, nghi_tu, nghi_den, phut_du_cong)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [ca_lam_id, t.thu, t.gio_vao, t.gio_ra, t.nghi_tu, t.nghi_den, t.phut_du_cong],
    );
  }
}

const TEN_THU = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
function ten_thu(thu: number): string {
  return TEN_THU[thu] ?? `Thứ ${thu}`;
}

/** So phut giua hai moc 'HH:MM' trong cung mot ngay. */
function phut_giua(tu: string, den: string): number {
  const p = (g: string): number => {
    const [h, m] = g.split(':');
    return Number(h) * 60 + Number(m);
  };
  return p(den) - p(tu);
}

/**
 * Doc email Microsoft de noi tai khoan. Chuoi rong -> null (go lien ket).
 *
 * Chi kiem dinh dang co ban: nguon su that la id_token do Microsoft ky, khong phai o nhap
 * nay. Kiem qua chat chi lam nhan su khong khai duoc dia chi hop le kieu la.
 */
function doc_email_microsoft(b: Record<string, unknown>): string | null {
  const v = chuoi(b, 'email_microsoft', { toi_da: 200 });
  if (v === null) return null;
  if (!v.includes('@') || v.includes(' ')) {
    throw new LoiDauVao('Email Microsoft không hợp lệ.');
  }
  return v;
}

function doc_ngay_lam(v: unknown): number[] {
  if (v === undefined || v === null) return [1, 2, 3, 4, 5];
  if (!Array.isArray(v)) throw new LoiDauVao('Các ngày làm phải là danh sách số từ 0 (Chủ nhật) đến 6 (Thứ 7).');
  const ds = v.map((x) => Number(x));
  if (ds.some((x) => !Number.isInteger(x) || x < 0 || x > 6)) {
    throw new LoiDauVao('Các ngày làm chỉ nhận số từ 0 (Chủ nhật) đến 6 (Thứ 7).');
  }
  if (ds.length === 0) throw new LoiDauVao('Ca làm phải có ít nhất một ngày đi làm.');
  return [...new Set(ds)].sort((a, b) => a - b);
}

/**
 * Ghi ma dinh danh sau khi tao/sua ho so, tra ve canh bao.
 *
 * Doc DUNG cac o ma `doc_nhan_vien` doc, de hai duong khong the lech nhau.
 */
async function ghi_ma_dinh_danh(
  nhan_vien_id: string, b: Record<string, unknown>,
): Promise<string[]> {
  return gan_bo_ma_nhan_su(nhan_vien_id, {
    ma_nv: chuoi(b, 'ma_nv', { toi_da: 40 }),
    pin_may: chuoi(b, 'pin_may', { toi_da: 32 }),
    ma_erp: chuoi(b, 'ma_erp', { toi_da: 40 }),
    email: chuoi(b, 'email', { toi_da: 200 }),
  }, 'nguoi_khai');
}

function doc_nhan_vien(b: Record<string, unknown>, bat_buoc: boolean): unknown[] {
  const pin = chuoi(b, 'pin_may', { toi_da: 32 });
  if (pin !== null && !/^[0-9]{1,20}$/.test(pin)) {
    throw new LoiDauVao('PIN máy chỉ gồm chữ số (dùng đúng PIN đã khai trên máy).');
  }
  return [
    bat_buoc ? chuoi_bat_buoc(b, 'ma_nv', { toi_da: 40 }) : chuoi(b, 'ma_nv', { toi_da: 40 }),
    bat_buoc ? chuoi_bat_buoc(b, 'ho_ten', { toi_da: 120 }) : chuoi(b, 'ho_ten', { toi_da: 120 }),
    pin,
    chuoi(b, 'ma_erp', { toi_da: 40 }),
    uuid(b, 'phong_ban_id'),
    uuid(b, 'ca_lam_id'),
    ngay(b, 'ngay_vao'),
    chuoi(b, 'so_dien_thoai', { toi_da: 20 }),
    chuoi(b, 'email', { toi_da: 200 }),
    luan_ly(b, 'duoc_cham_cong_dien_thoai', false),
  ];
}

/** Bo dau tieng Viet — man hinh may ZKTeco chi hien duoc ASCII. */
export function bo_dau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E]/g, '');
}
