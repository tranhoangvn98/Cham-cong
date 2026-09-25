// Routes /thong-bao/ai/* — van ban cong ty bang AI (DTKT 01): nhap -> soan -> duyet -> ban hanh.
//
// Phan chia trach nhiem:
//   - Route chi NHAN HTTP, kiem quyen, goi module, ghi nhat ky. Khong logic nghiep vu nang.
//   - Soan AI + build docx + gate chay O WORKER (su_kien/soan_van_ban_day.ts) — route /nhap
//     chi ghi hang roi tra ve ngay, khong goi DeepSeek trong luong request.
//   - Ban hanh la buoc deterministic duy nhat con lai cua route: cap so nguyen tu, build ban
//     cuoi, gate lan cuoi, ghi trong MOT transaction.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { gui_ngam } from '../su_kien/thong_bao_day.ts';
import { gui_email_thong_bao } from '../su_kien/gui_email_thong_bao.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { doc_tep_ho_so, luu_tep_ho_so, luu_van_ban_cong_ty, xoa_tep_ho_so,
  type TepDaLuu } from '../tien_ich/luu_tep.ts';
import { cau_hinh } from '../cau_hinh.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, ngay, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';
import { chuan_hoa_van_ai } from '../ai/soan_van_ban.ts';
import { ghep_spec, kiem_tra_spec, noi_dung_hien_thi } from '../ai/ghep_spec.ts';
import { dung_so_ky_hieu } from '../ai/cap_so.ts';
import { chay_gate, dat_tat_ca, muc_loi } from '../ai/gate_kiem_tra.ts';
import { bo_sinh_docx } from '../ai/sinh_docx.ts';
import { nguoi_ky_cua, ben_nhan } from '../su_kien/soan_van_ban_day.ts';
import { email_moi_y_kien } from '../ho_thu_y_kien/email_du_thao.ts';
import type {
  KieuVanBan, PhamViNhan, QuanHe, SpecVanBan, TrangThaiNhap, VanXuatAI,
} from '../ai/kieu.ts';

const CAC_LOAI = ['thong_bao', 'quyet_dinh', 'cong_van'] as const;
const CAC_PHAM_VI = ['ca_nhan', 'phong_ban', 'toan_cong_ty'] as const;
const CAC_QUAN_HE = ['noi_bo', 'doi_ngoai'] as const;
const CAC_MUC_DICH = ['nhac_nho', 'yeu_cau', 'pho_bien', 'moi_hop', 'phoi_hop'] as const;
const CAC_MUC_DO = ['thuong', 'quan_trong', 'khan'] as const;
const CAC_CHE_DO = ['ai', 'tu_soan'] as const;

interface NhapAi {
  id: string;
  ma: string;
  loai: KieuVanBan;
  pham_vi: PhamViNhan;
  quan_he: QuanHe;
  phong_ban_id: string | null;
  nhan_vien_id: string | null;
  muc_dich: string;
  muc_do: 'thuong' | 'quan_trong' | 'khan';
  can_giai_trinh: boolean;
  het_han: Date | null;
  /** Quyet dinh nghi viec: phat hanh thi gan tep vao ho so, den ngay thi lich dem khoa tai khoan. */
  la_qd_nghi_viec: boolean;
  ngay_nghi_viec: string | null;
  nghi_viec_da_chay_luc: Date | null;
  lay_y_kien_luc: Date | null;
  noi_dung_tho: string;
  che_do: 'ai' | 'tu_soan';
  spec_json: unknown;
  ten_luu_docx: string | null;
  mime: string | null;
  kich_thuoc: number | null;
  trang_thai: TrangThaiNhap;
  ket_qua_gate: unknown;
  so_lan_thu: number;
  so_ban_hanh: number | null;
  so_ky_hieu: string | null;
  thong_bao_id: string | null;
  da_gui_email: boolean;
  gui_email_luc: Date | null;
  gui_email_loi: string | null;
  nguoi_tao: string | null;
  tao_luc: Date;
  cap_nhat_luc: Date;
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

/** Du lieu ngoai pham vi tra 404 (khong tiet lo su ton tai). */
async function doc_nhap(id: string): Promise<NhapAi> {
  const d = await truy_van_mot<NhapAi>(
    `select id, ma, loai, pham_vi, quan_he, phong_ban_id, nhan_vien_id, muc_dich, muc_do,
            can_giai_trinh, het_han, la_qd_nghi_viec, ngay_nghi_viec::text as ngay_nghi_viec,
            nghi_viec_da_chay_luc, lay_y_kien_luc, noi_dung_tho, che_do, spec_json, ten_luu_docx, mime,
            kich_thuoc, trang_thai, ket_qua_gate, so_lan_thu, so_ban_hanh, so_ky_hieu,
            thong_bao_id, nguoi_tao, tao_luc, cap_nhat_luc,
            (select tb.da_gui_email from thong_bao tb where tb.id = thong_bao_nhap_ai.thong_bao_id) as da_gui_email,
            (select tb.gui_email_luc from thong_bao tb where tb.id = thong_bao_nhap_ai.thong_bao_id) as gui_email_luc,
            (select tb.gui_email_loi from thong_bao tb where tb.id = thong_bao_nhap_ai.thong_bao_id) as gui_email_loi
       from thong_bao_nhap_ai where id = $1`,
    [id],
  );
  if (d === null) throw new LoiKhongTim('Không tìm thấy bản nháp.');
  return d;
}

/**
 * Ban nay co phai duyet 2 cap khong?
 *   hai_cap  = moi ban 2 cap.
 *   mot_cap  = moi ban 1 cap.
 *   tu_dong  = mac dinh dac ta: toan cong ty & doi ngoai 2 cap, con lai 1 cap.
 */
function can_hai_cap(pham_vi: PhamViNhan, quan_he: QuanHe): boolean {
  const ch = cau_hinh.van_ban.so_cap_duyet;
  if (ch === 'hai_cap') return true;
  if (ch === 'mot_cap') return false;
  return pham_vi === 'toan_cong_ty' || quan_he === 'doi_ngoai';
}

/** Doc van xuoi tu body cho che do tu_soan (REQ-22). */
function van_xuoi_tu_body(b: Record<string, unknown>, loai: KieuVanBan): VanXuatAI {
  return chuan_hoa_van_ai(loai, {
    trich_yeu: chuoi_bat_buoc(b, 'trich_yeu', { toi_da: 500, toi_thieu: 3 }),
    kinh_gui: b['kinh_gui'] ?? [],
    can_cu: b['can_cu'] ?? [],
    dieu: b['dieu'] ?? [],
    noi_dung: b['noi_dung'] ?? [],
  });
}

/** Chan CSV injection: o bat dau bang = + - @ bi vo hieu (gioi han pham vi o bang tinh). */
function o_csv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const an_toan = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(an_toan) ? `"${an_toan.replace(/"/g, '""')}"` : an_toan;
}

export async function tuyen_thong_bao_ai(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ danh sach + CSV
  app.get('/thong-bao/ai', { preHandler: can_nhan_su }, async (req, res) => {
    const q = req.query as Record<string, unknown>;
    const dong = await truy_van<Record<string, unknown>>(
      `select n.id, n.ma, n.loai, n.pham_vi, n.quan_he, n.muc_dich, n.muc_do, n.che_do,
              n.trang_thai, n.so_lan_thu, n.so_ky_hieu, n.thong_bao_id,
              n.la_qd_nghi_viec, n.ngay_nghi_viec::text as ngay_nghi_viec,
              n.tao_luc, n.cap_nhat_luc,
              nv.ho_ten as nhan_vien, pb.ten as phong_ban,
              (n.ten_luu_docx is not null) as co_tep,
              jsonb_array_length(coalesce(n.ket_qua_gate, '[]'::jsonb)) as so_muc_gate
         from thong_bao_nhap_ai n
         left join nhan_vien nv on nv.id = n.nhan_vien_id
         left join phong_ban pb on pb.id = n.phong_ban_id
        order by n.cap_nhat_luc desc limit 300`,
    );

    if (q['csv'] === '1') {
      const tieu_de = ['Mã', 'Loại', 'Phạm vi', 'Chế độ', 'Trạng thái', 'Số ký hiệu',
        'Người nhận', 'Tạo lúc', 'Cập nhật lúc'];
      const hang = dong.map((d) => [
        d['ma'], d['loai'], d['pham_vi'], d['che_do'], d['trang_thai'],
        d['so_ky_hieu'],
        d['nhan_vien'] ?? d['phong_ban'] ?? 'Toàn công ty',
        d['tao_luc'], d['cap_nhat_luc'],
      ]);
      const csv = '\uFEFF' + [tieu_de, ...hang].map((r) => r.map(o_csv).join(',')).join('\r\n');
      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'thong_bao_ai_xuat_csv',
        'thong_bao_nhap_ai', null, { so_dong: hang.length }, req.ip);
      return res
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', 'attachment; filename="thong_bao_ai.csv"')
        .send(csv);
    }
    return dong;
  });

  // ------------------------------------------------------------ nhap (REQ-02)
  app.post('/thong-bao/ai/nhap', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);

    const loai = trong_tap(b, 'loai', CAC_LOAI, { bat_buoc: true }) as KieuVanBan;
    const pham_vi = trong_tap(b, 'pham_vi', CAC_PHAM_VI, { bat_buoc: true }) as PhamViNhan;
    const quan_he = trong_tap(b, 'quan_he', CAC_QUAN_HE) as QuanHe ?? 'noi_bo';
    const muc_dich = trong_tap(b, 'muc_dich', CAC_MUC_DICH) ?? 'pho_bien';
    const muc_do = trong_tap(b, 'muc_do', CAC_MUC_DO) ?? 'thuong';
    const can_giai_trinh = luan_ly(b, 'can_giai_trinh', false) as boolean;
    const che_do = trong_tap(b, 'che_do', CAC_CHE_DO) ?? 'ai';
    const het_han = ngay(b, 'het_han');

    // Quyet dinh nghi viec: danh dau de he thong tu gan tep vao ho so khi phat hanh, va
    // den ngay nghi viec thi lich dem tu khoa tai khoan + bao cong + bao Microsoft.
    const la_qd_nghi_viec = luan_ly(b, 'la_qd_nghi_viec', false) as boolean;
    const ngay_nghi_viec = ngay(b, 'ngay_nghi_viec');
    if (la_qd_nghi_viec) {
      if (loai !== 'quyet_dinh' || pham_vi !== 'ca_nhan') {
        throw new LoiDauVao('Quyết định nghỉ việc phải là loại quyết định gửi tới một cá nhân.');
      }
      if (ngay_nghi_viec === null) {
        throw new LoiDauVao('Quyết định nghỉ việc phải có ngày nghỉ việc.');
      }
      if (ngay_nghi_viec < ngay_dia_phuong(new Date())) {
        throw new LoiDauVao('Ngày nghỉ việc phải từ hôm nay trở đi.');
      }
    }

    // Pham vi quyet dinh id nguoi nhan — kiem ngay o dau vao, CHECK CSDL giu nua.
    const phong_ban_id = pham_vi === 'phong_ban'
      ? uuid(b, 'phong_ban_id', { bat_buoc: true }) as string : null;
    const nhan_vien_id = pham_vi === 'ca_nhan'
      ? uuid(b, 'nhan_vien_id', { bat_buoc: true }) as string : null;

    const noi_dung_tho = che_do === 'ai'
      ? chuoi_bat_buoc(b, 'noi_dung_tho', { toi_da: 8000, toi_thieu: 3 })
      : chuoi(b, 'noi_dung_tho', { toi_da: 8000 }) ?? '';

    // Che do tu_soan: dung spec ngay tu van xuoi nguoi tao nhap (bo buoc ②).
    let spec_json: unknown = null;
    if (che_do === 'tu_soan') {
      const ky = await nguoi_ky_cua(nd.sub);
      const nhan = await ben_nhan({
        id: '', ma: '', loai, pham_vi, quan_he, phong_ban_id, nhan_vien_id,
        muc_dich, muc_do, can_giai_trinh, het_han: null, noi_dung_tho: '',
        la_qd_nghi_viec, ngay_nghi_viec,
        che_do, spec_json: null, nguoi_tao: nd.sub,
      });
      const spec = ghep_spec({
        co_quan_ban_hanh: cau_hinh.van_ban.co_quan_ban_hanh,
        dia_danh: cau_hinh.van_ban.dia_danh,
        ngay: ngay_dia_phuong(new Date()),
        nguoi_ky: ky.ten,
        chuc_vu_nguoi_ky: ky.chuc_vu,
        noi_nhan: nhan.noi_nhan,
      }, loai, pham_vi, quan_he, van_xuoi_tu_body(b, loai),
        { nhan_vien_id, phong_ban_id });
      const loi = kiem_tra_spec(spec);
      if (loi.length > 0) throw new LoiDauVao(`Văn xuôi chưa đủ: ${loi.join(' ')}`);
      spec_json = spec;
    }

    const dong = await truy_van_mot<{ id: string; ma: string }>(
      `insert into thong_bao_nhap_ai(loai, pham_vi, quan_he, phong_ban_id, nhan_vien_id,
                                     muc_dich, muc_do, can_giai_trinh, het_han,
                                     la_qd_nghi_viec, ngay_nghi_viec,
                                     noi_dung_tho, che_do, spec_json, nguoi_tao)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)
       returning id, ma`,
      [loai, pham_vi, quan_he, phong_ban_id, nhan_vien_id, muc_dich, muc_do,
        can_giai_trinh, het_han, la_qd_nghi_viec, ngay_nghi_viec,
        noi_dung_tho, che_do,
        spec_json === null ? null : JSON.stringify(spec_json), nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'thong_bao_ai_nhap', 'thong_bao_nhap_ai', dong?.id ?? null,
      { loai, pham_vi, che_do, muc_dich, la_qd_nghi_viec, ngay_nghi_viec }, req.ip);
    return res.code(201).send({ ...dong, trang_thai: 'dang_soan' });
  });

  // ------------------------------------------------------------ trang thai (REQ-03)
  app.get('/thong-bao/ai/:id', { preHandler: can_nhan_su }, async (req) => {
    const d = await doc_nhap(lay_id(req));
    return {
      id: d.id, ma: d.ma, loai: d.loai, pham_vi: d.pham_vi, quan_he: d.quan_he,
      muc_dich: d.muc_dich, muc_do: d.muc_do, can_giai_trinh: d.can_giai_trinh,
      het_han: d.het_han, che_do: d.che_do, noi_dung_tho: d.noi_dung_tho,
      la_qd_nghi_viec: d.la_qd_nghi_viec, ngay_nghi_viec: d.ngay_nghi_viec,
      nghi_viec_da_chay_luc: d.nghi_viec_da_chay_luc, lay_y_kien_luc: d.lay_y_kien_luc,
      trang_thai: d.trang_thai, ket_qua_gate: d.ket_qua_gate, so_lan_thu: d.so_lan_thu,
      so_ban_hanh: d.so_ban_hanh, so_ky_hieu: d.so_ky_hieu, thong_bao_id: d.thong_bao_id,
      da_gui_email: d.da_gui_email, gui_email_luc: d.gui_email_luc,
      gui_email_loi: d.gui_email_loi,
      spec_json: d.spec_json, ten_luu_docx: d.ten_luu_docx, co_tep: d.ten_luu_docx !== null,
      tao_luc: d.tao_luc, cap_nhat_luc: d.cap_nhat_luc,
      can_hai_cap: can_hai_cap(d.pham_vi, d.quan_he),
    };
  });

  // ------------------------------------------------------------ xem docx (REQ-15)
  app.get('/thong-bao/ai/:id/xem', { preHandler: can_nhan_su }, async (req, res) => {
    const d = await doc_nhap(lay_id(req));
    if (d.ten_luu_docx === null) throw new LoiKhongTim('Bản nháp chưa có tệp dự thảo.');
    const du_lieu = await doc_tep_ho_so(d.ten_luu_docx);
    if (du_lieu === null) throw new LoiKhongTim('Tệp không còn trên máy chủ.');
    return res
      .header('content-type', d.mime ?? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .header('x-content-type-options', 'nosniff')
      .header('content-disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(`${d.ma}.docx`)}`)
      .send(du_lieu);
  });

  // ------------------------------------------------------------ sua van xuoi (REQ-16)
  app.patch('/thong-bao/ai/:id/sua', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const d = await doc_nhap(lay_id(req));
    if (!['cho_duyet', 'cho_ky', 'loi'].includes(d.trang_thai)) {
      throw new LoiXungDot(`Bản nháp đang ở trạng thái ${d.trang_thai}, không thể sửa.`);
    }
    const b = than(req.body);
    const loai = trong_tap(b, 'loai', CAC_LOAI) as KieuVanBan | null ?? d.loai;

    // Giu truong he thong, thay moi van xuoi nguoi tao sua.
    const van_ai = chuan_hoa_van_ai(loai, {
      trich_yeu: typeof b['trich_yeu'] === 'string' ? b['trich_yeu'] : (d.spec_json as SpecVanBan)?.trich_yeu,
      kinh_gui: b['kinh_gui'] ?? (d.spec_json as SpecVanBan)?.kinh_gui,
      can_cu: b['can_cu'] ?? (d.spec_json as SpecVanBan)?.can_cu,
      dieu: b['dieu'] ?? (d.spec_json as SpecVanBan)?.dieu,
      noi_dung: b['noi_dung'] ?? (d.spec_json as SpecVanBan)?.noi_dung,
    });
    const cu = d.spec_json as SpecVanBan | null;
    if (cu === null) throw new LoiXungDot('Bản nháp chưa có văn xuôi để sửa.');
    const spec = ghep_spec({
      co_quan_ban_hanh: cu.co_quan_ban_hanh,
      dia_danh: cu.dia_danh,
      ngay: cu.ngay,
      nguoi_ky: cu.nguoi_ky,
      chuc_vu_nguoi_ky: cu.chuc_vu_nguoi_ky,
      noi_nhan: cu.noi_nhan,
    }, loai, d.pham_vi, d.quan_he, van_ai,
      { nhan_vien_id: d.nhan_vien_id, phong_ban_id: d.phong_ban_id });

    // Build lai + gate lai qua worker (che do tu_soan — khong goi AI).
    await thuc_thi(
      `update thong_bao_nhap_ai
          set spec_json = $2::jsonb, che_do = 'tu_soan', trang_thai = 'dang_soan',
              dang_xu_ly = null, cap_nhat_luc = now()
        where id = $1`,
      [d.id, JSON.stringify(spec)],
    );
    if (d.ten_luu_docx !== null) {
      xoa_tep_ho_so(d.ten_luu_docx).catch(() => {});
    }
    await ghi_nhat_ky(nd.sub, 'thong_bao_ai_sua', 'thong_bao_nhap_ai', d.id,
      { loai }, req.ip);
    return { ok: true, trang_thai: 'dang_soan' };
  });

  // ------------------------------------------------------------ AI viet lai
  app.post('/thong-bao/ai/:id/viet-lai', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const d = await doc_nhap(lay_id(req));
    if (!['cho_duyet', 'cho_ky', 'loi'].includes(d.trang_thai)) {
      throw new LoiXungDot(`Bản nháp đang ở trạng thái ${d.trang_thai}.`);
    }
    await thuc_thi(
      `update thong_bao_nhap_ai
          set che_do = 'ai', spec_json = null, so_lan_thu = 0, trang_thai = 'dang_soan',
              dang_xu_ly = null, cap_nhat_luc = now()
        where id = $1`,
      [d.id],
    );
    if (d.ten_luu_docx !== null) {
      xoa_tep_ho_so(d.ten_luu_docx).catch(() => {});
    }
    await ghi_nhat_ky(nd.sub, 'thong_bao_ai_viet_lai', 'thong_bao_nhap_ai', d.id, {}, req.ip);
    return { ok: true, trang_thai: 'dang_soan' };
  });

  // ------------------------------------------------------------ trinh ky (REQ-17)
  app.post('/thong-bao/ai/:id/trinh-ky', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const d = await doc_nhap(lay_id(req));
    if (!can_hai_cap(d.pham_vi, d.quan_he)) {
      throw new LoiXungDot('Văn bản này không cần trình ký — có thể ban hành trực tiếp.');
    }
    if (d.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(`Trạng thái ${d.trang_thai} không thể trình ký.`);
    }
    await thuc_thi(
      `update thong_bao_nhap_ai set trang_thai = 'cho_ky', cap_nhat_luc = now()
        where id = $1`,
      [d.id],
    );
    await ghi_nhat_ky(nd.sub, 'thong_bao_ai_trinh_ky', 'thong_bao_nhap_ai', d.id, {}, req.ip);
    return { ok: true, trang_thai: 'cho_ky' };
  });

  // ------------------------------------------------------------ lay y kien du thao
  // Mo "lay y kien": gui email toi dung tap nguoi nhan kem link gop y, ban nhap chuyen sang
  // 'dang_lay_y_kien'. Chi mo duoc tu 'cho_duyet' (ban da qua gate, chua trinh ky).
  app.post('/thong-bao/ai/:id/lay-y-kien', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const d = await doc_nhap(lay_id(req));
    if (d.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(
        d.trang_thai === 'dang_lay_y_kien'
          ? 'Văn bản này đang lấy ý kiến rồi.'
          : `Trạng thái ${d.trang_thai} không thể mở lấy ý kiến — chỉ mở được khi văn bản chờ duyệt.`,
      );
    }
    await thuc_thi(
      `update thong_bao_nhap_ai
          set trang_thai = 'dang_lay_y_kien', lay_y_kien_luc = now(), cap_nhat_luc = now()
        where id = $1`,
      [d.id],
    );
    await ghi_nhat_ky(nd.sub, 'thong_bao_ai_lay_y_kien', 'thong_bao_nhap_ai', d.id,
      { pham_vi: d.pham_vi }, req.ip);

    // Email moi gop y — fire-and-forget, khong cho HTTP ra ngoai vao luong request.
    void email_moi_y_kien(d.id).then((kq) => {
      if (!kq.ok) {
        console.warn(`[thong_bao_ai] khong gui duoc email moi y kien ${d.ma}: ${kq.ly_do ?? ''}`);
      }
    });
    return { ok: true, trang_thai: 'dang_lay_y_kien' };
  });

  // ------------------------------------------------------------ ket thuc lay y kien
  // Quay ve 'cho_duyet' — luong trinh ky / ban hanh chay nhu cu. Y kien da gui van nam
  // trong ho thu y kien (khong xoa).
  app.post('/thong-bao/ai/:id/ket-thuc-y-kien', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const d = await doc_nhap(lay_id(req));
    if (d.trang_thai !== 'dang_lay_y_kien') {
      throw new LoiXungDot(`Trạng thái ${d.trang_thai} không phải đang lấy ý kiến.`);
    }
    await thuc_thi(
      `update thong_bao_nhap_ai set trang_thai = 'cho_duyet', cap_nhat_luc = now()
        where id = $1`,
      [d.id],
    );
    await ghi_nhat_ky(nd.sub, 'thong_bao_ai_ket_thuc_y_kien', 'thong_bao_nhap_ai', d.id,
      {}, req.ip);
    return { ok: true, trang_thai: 'cho_duyet' };
  });

  // ------------------------------------------------------------ danh sach y kien cua ban nhap
  app.get('/thong-bao/ai/:id/y-kien', { preHandler: can_nhan_su }, async (req) => {
    const d = await doc_nhap(lay_id(req));
    return truy_van(
      `select h.id, h.ma, h.tieu_de, h.trang_thai, h.tao_luc, h.dong_luc,
              nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              (select count(*) from ho_thu_y_kien_tra_loi r where r.ho_thu_id = h.id)::int
                as so_tra_loi
         from ho_thu_y_kien h
         join nhan_vien nv on nv.id = h.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where h.loai = 'du_thao' and h.nhap_ai_id = $1
        order by h.tao_luc desc limit 300`,
      [d.id],
    );
  });

  // ------------------------------------------------------------ ban hanh (REQ-18..21)
  app.post('/thong-bao/ai/:id/phat-hanh', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const d = await doc_nhap(lay_id(req));

    if (d.trang_thai === 'dang_lay_y_kien') {
      throw new LoiXungDot('Văn bản đang lấy ý kiến — hãy kết thúc lấy ý kiến trước khi ban hành.');
    }

    const hai_cap = can_hai_cap(d.pham_vi, d.quan_he);
    // REQ-12: chan trang thai sai. REQ-17: quyen ban hanh tach khoi quyen soan.
    const trang_cho_phep = hai_cap ? 'cho_ky' : 'cho_duyet';
    if (d.trang_thai !== trang_cho_phep) {
      throw new LoiXungDot(
        hai_cap
          ? 'Văn bản này cần được trình ký trước khi ban hành.'
          : `Trạng thái ${d.trang_thai} không thể ban hành.`,
      );
    }
    if (hai_cap && nd.vai_tro !== 'admin') {
      throw new LoiXungDot('Chỉ Giám đốc (admin) mới được ban hành văn bản này.');
    }

    const spec_cu = d.spec_json as SpecVanBan | null;
    if (spec_cu === null) throw new LoiXungDot('Bản nháp chưa có văn xuôi.');
    const loi_spec = kiem_tra_spec(spec_cu);
    if (loi_spec.length > 0) throw new LoiXungDot(`Spec lỗi: ${loi_spec.join(' ')}`);

    // REQ-19: cap so NGUYEN TU. So da cap la vinh vien — neu ban nhap da co so
    // (lan ban hanh truoc bi loi sau buoc cap so) thi GIU NGUYEN so do.
    let so_ky_hieu = d.so_ky_hieu;
    let so_ban_hanh = d.so_ban_hanh;
    if (so_ky_hieu === null || so_ban_hanh === null) {
      const nam = Number(ngay_dia_phuong(new Date()).slice(0, 4));
      await thuc_thi(
        `insert into bo_dem_so_vb(loai, nam, gia_tri) values ($1,$2,0)
         on conflict (loai, nam) do nothing`,
        [d.loai, nam],
      );
      const dem = await truy_van_mot<{ gia_tri: number }>(
        `update bo_dem_so_vb set gia_tri = gia_tri + 1
          where loai = $1 and nam = $2 returning gia_tri`,
        [d.loai, nam],
      );
      so_ban_hanh = dem?.gia_tri ?? 0;
      so_ky_hieu = dung_so_ky_hieu(d.loai, so_ban_hanh, nam,
        cau_hinh.van_ban.ky_hieu_don_vi, cau_hinh.van_ban.ky_hieu_don_vi_soan);
      // Ghi so ngay — so da cap la vinh vien, huy sau nay chi ghi so, khong cap lai.
      await thuc_thi(
        `update thong_bao_nhap_ai set so_ban_hanh = $2, so_ky_hieu = $3, cap_nhat_luc = now()
          where id = $1`,
        [d.id, so_ban_hanh, so_ky_hieu],
      );
      await ghi_nhat_ky(nd.sub, 'thong_bao_ai_cap_so', 'thong_bao_nhap_ai', d.id,
        { so_ban_hanh, so_ky_hieu }, req.ip);
    }
    if (so_ky_hieu === null || so_ban_hanh === null) {
      throw new LoiXungDot('Không cấp được số ký hiệu. Thử lại.');
    }

    // REQ-20: build ban cuoi co so that + gate LAN CUOI tren ban co so.
    const spec_cuoi: SpecVanBan = { ...spec_cu, so_ky_hieu, du_thao: false };
    const docx = await bo_sinh_docx.dung(spec_cuoi);
    const kq_cuoi = await chay_gate(spec_cuoi, docx);
    if (!dat_tat_ca(kq_cuoi)) {
      const cac_loi = muc_loi(kq_cuoi).map((k) => `${k.ma_check}: ${k.ly_do}`).join('; ');
      // So da cap duoc GIU — lan ban hanh sau dung dung so nay.
      throw new LoiXungDot(`Gate lần cuối chưa đạt: ${cac_loi}`);
    }

    // Quyet dinh nghi viec: tra cuu TRUOC khi ghi bat ky tep nao — nem loi o day thi
    // khong de lai tep mo coi tren dia.
    let da_luu_ho_so: TepDaLuu | null = null;
    let danh_muc_qd_id: string | null = null;
    let ten_goc_ho_so = '';
    let dich_ho_so: { ma_nv: string; ho_ten: string } | null = null;
    if (d.la_qd_nghi_viec) {
      if (d.nhan_vien_id === null) {
        throw new LoiXungDot('Quyết định nghỉ việc phải gửi tới một nhân viên cụ thể.');
      }
      dich_ho_so = await truy_van_mot<{ ma_nv: string; ho_ten: string }>(
        'select ma_nv, ho_ten from nhan_vien where id = $1', [d.nhan_vien_id]);
      if (dich_ho_so === null) {
        throw new LoiXungDot('Nhân viên nhận quyết định không còn trong hệ thống.');
      }
      const dm_qd = await truy_van_mot<{ id: string }>(
        `select id from danh_muc_tai_lieu where ma = 'qd_nghi_viec'`);
      if (dm_qd === null) {
        throw new LoiXungDot('Danh mục tài liệu "Quyết định nghỉ việc" (mã qd_nghi_viec) '
          + 'đã bị gỡ. Khôi phục trong danh mục hồ sơ rồi ban hành lại.');
      }
      danh_muc_qd_id = dm_qd.id;
      ten_goc_ho_so = `Quyết định nghỉ việc ${so_ky_hieu}.docx`;
    }

    // Luu tep ban cuoi truoc transaction (xoa tep mo coi neu CSDL that bai).
    const da_luu = await luu_van_ban_cong_ty(docx,
      `${d.ma}_${so_ky_hieu.replace(/\//g, '-')}.docx`, 'khac', ngay_dia_phuong(new Date()));

    // Quyet dinh nghi viec: them mot BAN COPY vao ho so cua nhan vien nhan quyet dinh —
    // HCNS va chinh nguoi do doc duoc ngay trong tab Ho so, va tep tu dong dong bo sang
    // SharePoint nhu moi tep ho so khac. Copy RIENG chu khong tro chung ten_luu: ban cong
    // ty va ban trong ho so co vong doi doc lap (xoa ben nay khong anh huong ben kia).
    if (dich_ho_so !== null) {
      try {
        da_luu_ho_so = await luu_tep_ho_so(docx, ten_goc_ho_so, {
          ma_nv: dich_ho_so.ma_nv,
          ho_ten: dich_ho_so.ho_ten,
          nhom: 'tai_lieu',
          ngay: ngay_dia_phuong(new Date()),
        });
      } catch (loi) {
        // Ghi copy ho so loi thi don ca ban cong ty vua ghi, tran de lai tep mo coi.
        await xoa_tep_ho_so(da_luu.ten_luu).catch(() => {});
        throw loi;
      }
    }

    const tieu_de = spec_cuoi.trich_yeu;
    const noi_dung = noi_dung_hien_thi(spec_cuoi);
    let thong_bao: { id: string; ma: string };
    try {
      // REQ-21: mot transaction — insert thong_bao + danh dau ban nhap da phat hanh.
      // Tra ve dong vua tao QUA ham de TypeScript khong thay no la `never` o ngoai.
      thong_bao = await trong_giao_dich(async (khach) => {
        const kq = await khach.query<{ id: string; ma: string }>(
          `insert into thong_bao(tieu_de, noi_dung, muc_do, can_giai_trinh, pham_vi,
                                  phong_ban_id, nhan_vien_id, nguoi_tao, het_han,
                                  ten_luu, mime, kich_thuoc)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           returning id, ma`,
          [tieu_de, noi_dung, d.muc_do, d.can_giai_trinh, d.pham_vi, d.phong_ban_id,
            d.nhan_vien_id, d.nguoi_tao, d.het_han, da_luu.ten_luu, da_luu.mime,
            da_luu.kich_thuoc],
        );
        const dong = kq.rows[0];
        if (dong === undefined) throw new LoiXungDot('Không tạo được dòng thông báo.');

        const cap_nhat = await khach.query(
          `update thong_bao_nhap_ai
              set trang_thai = 'da_phat_hanh', thong_bao_id = $2,
                  spec_json = $3::jsonb, ket_qua_gate = $4::jsonb, cap_nhat_luc = now()
            where id = $1 and thong_bao_id is null`,
          [d.id, dong.id, JSON.stringify(spec_cuoi), JSON.stringify(kq_cuoi)],
        );
        if (cap_nhat.rowCount === 0) {
          throw new LoiXungDot('Bản nháp này đã được ban hành rồi.');
        }

        // Gan tep quyet dinh vao ho so nhan vien CUNG transaction voi ban hanh: CSDL loi
        // thi tep vua ghi tren dia bi xoa o catch ben ngoai, khong de lai dong ho so tro
        // tep khong con. Ho so hoan chinh = ban hanh hoan chinh.
        if (da_luu_ho_so !== null && danh_muc_qd_id !== null && d.nhan_vien_id !== null) {
          await khach.query(
            `insert into ho_so_tep
               (id, nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime, kich_thuoc,
                tai_len_boi)
             values ($1,$2,'tai_lieu',null,$3,$4,$5,$6,$7)`,
            [da_luu_ho_so.ma_tep, d.nhan_vien_id, ten_goc_ho_so, da_luu_ho_so.ten_luu,
              da_luu_ho_so.mime, da_luu_ho_so.kich_thuoc, nd.sub],
          );
          await khach.query(
            `insert into tai_lieu_nhan_vien (nhan_vien_id, danh_muc_id, trang_thai, tep_id)
             values ($1,$2,'da_len_phan_mem',$3)
             on conflict (nhan_vien_id, danh_muc_id) do update
                set trang_thai = 'da_len_phan_mem', tep_id = $3, cap_nhat_luc = now()`,
            [d.nhan_vien_id, danh_muc_qd_id, da_luu_ho_so.ma_tep],
          );
        }

        return dong;
      });
    } catch (loi) {
      // Tep da nam tren dia truoc khi co dong CSDL — xoa tep mo coi.
      await xoa_tep_ho_so(da_luu.ten_luu).catch(() => {});
      if (da_luu_ho_so !== null) {
        await xoa_tep_ho_so(da_luu_ho_so.ten_luu).catch(() => {});
      }
      throw loi;
    }

    // Xoa tep DU THAO (ban chinh thuc da thay no).
    if (d.ten_luu_docx !== null) {
      xoa_tep_ho_so(d.ten_luu_docx).catch(() => {});
    }

    await ghi_nhat_ky(nd.sub, 'thong_bao_ai_phat_hanh', 'thong_bao_nhap_ai', d.id,
      { thong_bao_id: thong_bao?.id, so_ky_hieu }, req.ip);

    // Chuong bao + push cho dung tap nguoi nhan.
    const nguoi_nhan = await truy_van<{ id: string }>(
      `select u.id from nguoi_dung u
         join nhan_vien nv on nv.id = u.nhan_vien_id
        where u.dang_hoat_dong = true and nv.dang_hoat_dong = true
          and ($1 = 'toan_cong_ty'
               or ($1 = 'phong_ban' and nv.phong_ban_id = $2::uuid)
               or ($1 = 'ca_nhan' and nv.id = $3::uuid))`,
      [d.pham_vi, d.phong_ban_id, d.nhan_vien_id],
    );
    if (nguoi_nhan.length > 0) {
      gui_ngam({
        nguoi_dung_ids: nguoi_nhan.map((n) => n.id),
        tieu_de: `Thông báo mới: ${tieu_de}`,
        noi_dung: d.can_giai_trinh
          ? 'Thông báo này yêu cầu bạn giải trình.' : 'Bấm để xem chi tiết.',
        du_lieu: { man: 'thong-bao', thong_bao_id: thong_bao?.id ?? null },
      });
    }

    // Gui email kem DOCX toi dung tap nguoi nhan. Fire-and-forget: khong cho HTTP ra ngoai
    // vao luong request — mat giua chung thi vong quet `quet_email_cho` cua lich_chay bu lai.
    void gui_email_thong_bao(thong_bao.id).catch((loi) => {
      console.error('[thong_bao_ai] gui email ban hanh loi:', (loi as Error).message);
    });

    return {
      ok: true,
      thong_bao_id: thong_bao?.id ?? null,
      ma_thong_bao: thong_bao?.ma ?? null,
      so_ky_hieu,
    };
  });

  // ------------------------------------------------------------ huy
  app.post('/thong-bao/ai/:id/huy', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const d = await doc_nhap(lay_id(req));
    if (d.trang_thai === 'da_phat_hanh' || d.trang_thai === 'huy') {
      throw new LoiXungDot(`Không thể hủy văn bản đang ở trạng thái ${d.trang_thai}.`);
    }
    await thuc_thi(
      `update thong_bao_nhap_ai set trang_thai = 'huy', dang_xu_ly = null, cap_nhat_luc = now()
        where id = $1`,
      [d.id],
    );
    if (d.ten_luu_docx !== null) {
      xoa_tep_ho_so(d.ten_luu_docx).catch(() => {});
    }
    // So da cap (neu co) la vinh vien — ghi nhat ky de con so so, KHONG cap lai.
    await ghi_nhat_ky(nd.sub, 'thong_bao_ai_huy', 'thong_bao_nhap_ai', d.id,
      { so_ky_hieu: d.so_ky_hieu }, req.ip);
    return { ok: true };
  });
}
