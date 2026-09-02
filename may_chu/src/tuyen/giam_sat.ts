// API module giam sat gian lan.
//
// PHAN QUYEN — doc truoc khi them route nao vao day:
//
//   can_kiem_soat  = admin | kiem_soat   -> doc/xu ly canh bao, sua danh muc va dieu kien
//   can_admin      = admin               -> cau hinh nguon du lieu, chay quet tay
//
// `nhan_su` va `truong_phong` KHONG co mat o day, va do khong phai thieu sot: ho nam trong so
// nguoi bi giam sat. Cho ho doc va dong canh bao la bo luon y nghia cua co che.
//
// Vai tro sai -> 403 (theo `can_vai_tro` san co cua repo). Luat "tra 404 thay vi 403" cua
// repo ap cho DU LIEU ngoai pham vi cua mot nguoi — vi du mot truong phong doi id de xem ho
// so phong khac — chu khong ap cho viec tu choi ca mot module. O day khong co gi de giau:
// su ton tai cua module giam sat khong phai bi mat.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_kiem_soat, can_admin, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, so_nguyen, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';
import { TAT_CA, cac_ma, co_phep_do, tim_phep_do } from '../giam_sat/phep_do/chi_muc.ts';
import { MA_NGUON, TEN_NGUON, la_ma_nguon } from '../giam_sat/nguon.ts';
import {
  bat_giam_sat, danh_sach_nguon, do_tim_database, kiem_tra_nguon,
} from '../giam_sat/ket_noi_erp.ts';
import { cac_loi_can_quet, chay_dieu_kien, ngu_canh_that } from '../giam_sat/danh_gia.ts';
import { chay_mot_vong } from '../giam_sat/lich_quet.ts';
import { doi_chieu } from '../giam_sat/doi_chieu_schema.ts';
import { o_csv } from '../tien_ich/csv.ts';

const NHOM = ['sla', 'trung_lap', 'don_hang', 'giao_dich', 'chi_phi_cong_no',
  'cheo_cham_cong'] as const;
const MUC_DO = ['thap', 'trung', 'cao', 'nghiem_trong'] as const;
const TRANG_THAI = ['moi', 'dang_kiem_tra', 'xac_nhan', 'bo_qua', 'da_xu_ly'] as const;
const TOAN_TU = ['>=', '>', '=', '<=', '<', '!='] as const;

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

/**
 * Doc tham so cua dieu kien, chi giu tham so ma PHEP DO DO khai bao.
 *
 * Loc theo khai bao thay vi nhan nguyen doi tuong: khong cho ai nhet khoa la vao jsonb roi
 * mot ban sau co ai do doc nham no. Gia tri phai la so huu han — `Infinity`/`NaN` lot vao
 * nguong se lam moi phep so sanh tra false am tham.
 */
function doc_tham_so(phep_do: string, tho: unknown): Record<string, number> {
  const pd = tim_phep_do(phep_do);
  if (pd === null) {
    throw new LoiDauVao(
      `Phép đo "${phep_do}" không tồn tại. Các mã hợp lệ: ${cac_ma().join(', ')}`,
    );
  }
  if (tho === null || tho === undefined) return {};
  if (typeof tho !== 'object') throw new LoiDauVao('Tham số phải là một đối tượng JSON.');

  const vao = tho as Record<string, unknown>;
  const ra: Record<string, number> = {};
  for (const t of pd.tham_so) {
    const v = vao[t.ten];
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (!Number.isFinite(n)) {
      throw new LoiDauVao(`Tham số "${t.nhan}" phải là một con số.`);
    }
    ra[t.ten] = n;
  }
  return ra;
}

export async function tuyen_giam_sat(app: FastifyInstance): Promise<void> {
  // ============================================================ danh muc phep do (chi doc)
  app.get('/giam-sat/phep-do', { preHandler: can_kiem_soat }, async () =>
    TAT_CA.map((p) => ({
      ma: p.ma, ten: p.ten, mo_ta: p.mo_ta, nhom: p.nhom, nguon: p.nguon,
      don_vi: p.don_vi, tham_so: p.tham_so,
      dung_anh_chup: p.dung_anh_chup === true,
      chua_trien_khai: p.chua_trien_khai ?? null,
    })),
  );

  // ============================================================ danh muc canh bao
  app.get('/giam-sat/loai-canh-bao', { preHandler: can_kiem_soat }, async () =>
    truy_van(
      `select cb.*,
              (select count(*) from loai_loi where loai_canh_bao_id = cb.id)::int as so_loai_loi
         from loai_canh_bao cb
        order by cb.nhom, cb.ma`,
    ),
  );

  app.post('/giam-sat/loai-canh-bao', { preHandler: can_kiem_soat }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const dong = await truy_van_mot<{ id: string }>(
      `insert into loai_canh_bao
         (ma, ten, nhom, mo_ta, muc_do_mac_dinh, sla_xu_ly_gio, vai_tro_xu_ly,
          huong_dan_xu_ly, dang_bat)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [
        chuoi_bat_buoc(b, 'ma', { toi_da: 40 }).toUpperCase(),
        chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
        trong_tap(b, 'nhom', NHOM, { bat_buoc: true }),
        chuoi(b, 'mo_ta', { toi_da: 2000 }),
        trong_tap(b, 'muc_do_mac_dinh', MUC_DO) ?? 'trung',
        so_nguyen(b, 'sla_xu_ly_gio', { min: 1, max: 8760 }) ?? 72,
        chuoi(b, 'vai_tro_xu_ly', { toi_da: 200 }),
        chuoi(b, 'huong_dan_xu_ly', { toi_da: 4000 }),
        luan_ly(b, 'dang_bat') ?? true,
      ],
    );
    await ghi_nhat_ky(nd.sub, 'tao', 'loai_canh_bao', dong?.id ?? null, null, req.ip);
    return res.code(201).send(dong);
  });

  app.patch('/giam-sat/loai-canh-bao/:id', { preHandler: can_kiem_soat }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const so = await thuc_thi(
      `update loai_canh_bao
          set ten = coalesce($2, ten),
              mo_ta = coalesce($3, mo_ta),
              muc_do_mac_dinh = coalesce($4, muc_do_mac_dinh),
              sla_xu_ly_gio = coalesce($5, sla_xu_ly_gio),
              vai_tro_xu_ly = coalesce($6, vai_tro_xu_ly),
              huong_dan_xu_ly = coalesce($7, huong_dan_xu_ly),
              dang_bat = coalesce($8, dang_bat),
              cap_nhat_luc = now()
        where id = $1`,
      [
        id, chuoi(b, 'ten', { toi_da: 200 }), chuoi(b, 'mo_ta', { toi_da: 2000 }),
        trong_tap(b, 'muc_do_mac_dinh', MUC_DO),
        so_nguyen(b, 'sla_xu_ly_gio', { min: 1, max: 8760 }),
        chuoi(b, 'vai_tro_xu_ly', { toi_da: 200 }),
        chuoi(b, 'huong_dan_xu_ly', { toi_da: 4000 }),
        luan_ly(b, 'dang_bat'),
      ],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy loại cảnh báo.');
    await ghi_nhat_ky(nd.sub, 'sua', 'loai_canh_bao', id, null, req.ip);
    return { ok: true };
  });

  app.delete('/giam-sat/loai-canh-bao/:id', { preHandler: can_kiem_soat }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    // `on delete restrict` o CSDL chan viec xoa khi con loai loi tham chieu. Doi thong bao
    // cua Postgres thanh cau noi ro PHAI LAM GI.
    const con = await truy_van_mot<{ so: number }>(
      'select count(*)::int as so from loai_loi where loai_canh_bao_id = $1', [id]);
    if ((con?.so ?? 0) > 0) {
      throw new LoiDauVao(
        `Nhóm cảnh báo này còn ${con?.so} loại lỗi. Hãy chuyển hoặc xóa các loại lỗi đó trước.`,
      );
    }
    const so = await thuc_thi('delete from loai_canh_bao where id = $1', [id]);
    if (so === 0) throw new LoiKhongTim('Không tìm thấy loại cảnh báo.');
    await ghi_nhat_ky(nd.sub, 'xoa', 'loai_canh_bao', id, null, req.ip);
    return res.code(204).send();
  });

  // ============================================================ danh muc loi
  app.get('/giam-sat/loai-loi', { preHandler: can_kiem_soat }, async (req) => {
    const q = req.query as Record<string, string>;
    return truy_van(
      `select ll.*, cb.ma as canh_bao_ma, cb.ten as canh_bao_ten, cb.nhom,
              (select count(*) from dieu_kien_loi where loai_loi_id = ll.id)::int
                as so_dieu_kien,
              (select count(*) from dieu_kien_loi
                where loai_loi_id = ll.id and dang_bat)::int as so_dieu_kien_bat,
              (select count(*) from canh_bao
                where loai_loi_id = ll.id and trang_thai = 'moi')::int as so_canh_bao_moi
         from loai_loi ll
         join loai_canh_bao cb on cb.id = ll.loai_canh_bao_id
        where ($1::text is null or cb.nhom = $1)
        order by cb.nhom, ll.ma`,
      [q['nhom'] ?? null],
    );
  });

  app.post('/giam-sat/loai-loi', { preHandler: can_kiem_soat }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const dong = await truy_van_mot<{ id: string }>(
      `insert into loai_loi
         (ma, ten, loai_canh_bao_id, mo_ta, muc_do, bo_phan_chiu_trach_nhiem,
          hau_qua, huong_khac_phuc, can_cu, dang_bat)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [
        chuoi_bat_buoc(b, 'ma', { toi_da: 40 }).toUpperCase(),
        chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
        uuid(b, 'loai_canh_bao_id', { bat_buoc: true }),
        chuoi(b, 'mo_ta', { toi_da: 2000 }),
        trong_tap(b, 'muc_do', MUC_DO) ?? 'trung',
        chuoi(b, 'bo_phan_chiu_trach_nhiem', { toi_da: 200 }),
        chuoi(b, 'hau_qua', { toi_da: 2000 }),
        chuoi(b, 'huong_khac_phuc', { toi_da: 2000 }),
        chuoi(b, 'can_cu', { toi_da: 2000 }),
        luan_ly(b, 'dang_bat') ?? true,
      ],
    );
    await ghi_nhat_ky(nd.sub, 'tao', 'loai_loi', dong?.id ?? null, null, req.ip);
    return res.code(201).send(dong);
  });

  app.patch('/giam-sat/loai-loi/:id', { preHandler: can_kiem_soat }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const so = await thuc_thi(
      `update loai_loi
          set ten = coalesce($2, ten),
              loai_canh_bao_id = coalesce($3, loai_canh_bao_id),
              mo_ta = coalesce($4, mo_ta),
              muc_do = coalesce($5, muc_do),
              bo_phan_chiu_trach_nhiem = coalesce($6, bo_phan_chiu_trach_nhiem),
              hau_qua = coalesce($7, hau_qua),
              huong_khac_phuc = coalesce($8, huong_khac_phuc),
              can_cu = coalesce($9, can_cu),
              dang_bat = coalesce($10, dang_bat),
              cap_nhat_luc = now()
        where id = $1`,
      [
        id, chuoi(b, 'ten', { toi_da: 200 }), uuid(b, 'loai_canh_bao_id'),
        chuoi(b, 'mo_ta', { toi_da: 2000 }), trong_tap(b, 'muc_do', MUC_DO),
        chuoi(b, 'bo_phan_chiu_trach_nhiem', { toi_da: 200 }),
        chuoi(b, 'hau_qua', { toi_da: 2000 }),
        chuoi(b, 'huong_khac_phuc', { toi_da: 2000 }),
        chuoi(b, 'can_cu', { toi_da: 2000 }),
        luan_ly(b, 'dang_bat'),
      ],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy loại lỗi.');
    await ghi_nhat_ky(nd.sub, 'sua', 'loai_loi', id, null, req.ip);
    return { ok: true };
  });

  app.delete('/giam-sat/loai-loi/:id', { preHandler: can_kiem_soat }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const con = await truy_van_mot<{ so: number }>(
      'select count(*)::int as so from canh_bao where loai_loi_id = $1', [id]);
    if ((con?.so ?? 0) > 0) {
      throw new LoiDauVao(
        `Loại lỗi này đã sinh ${con?.so} cảnh báo nên không xóa được — xóa đi là mất hồ sơ `
        + 'kiểm soát. Hãy tắt nó thay vì xóa.',
      );
    }
    const so = await thuc_thi('delete from loai_loi where id = $1', [id]);
    if (so === 0) throw new LoiKhongTim('Không tìm thấy loại lỗi.');
    await ghi_nhat_ky(nd.sub, 'xoa', 'loai_loi', id, null, req.ip);
    return res.code(204).send();
  });

  // ============================================================ dieu kien
  app.get('/giam-sat/dieu-kien', { preHandler: can_kiem_soat }, async (req) => {
    const q = req.query as Record<string, string>;
    return truy_van(
      `select dk.*, ll.ma as loai_loi_ma, ll.ten as loai_loi_ten
         from dieu_kien_loi dk
         join loai_loi ll on ll.id = dk.loai_loi_id
        where ($1::uuid is null or dk.loai_loi_id = $1::uuid)
        order by ll.ma, dk.thu_tu, dk.tao_luc`,
      [q['loai_loi_id'] ?? null],
    );
  });

  app.post('/giam-sat/dieu-kien', { preHandler: can_kiem_soat }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const phep_do = chuoi_bat_buoc(b, 'phep_do', { toi_da: 80 });
    if (!co_phep_do(phep_do)) {
      throw new LoiDauVao(
        `Phép đo "${phep_do}" không tồn tại. Các mã hợp lệ: ${cac_ma().join(', ')}`,
      );
    }
    const tham_so = doc_tham_so(phep_do, (b as Record<string, unknown>)['tham_so']);
    const nguong = Number((b as Record<string, unknown>)['nguong']);
    if (!Number.isFinite(nguong)) throw new LoiDauVao('Ngưỡng phải là một con số.');

    const dong = await truy_van_mot<{ id: string }>(
      `insert into dieu_kien_loi
         (loai_loi_id, phep_do, tham_so, toan_tu, nguong, thu_tu, dang_bat, ghi_chu)
       values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8) returning id`,
      [
        uuid(b, 'loai_loi_id', { bat_buoc: true }), phep_do, JSON.stringify(tham_so),
        trong_tap(b, 'toan_tu', TOAN_TU) ?? '>=', nguong,
        so_nguyen(b, 'thu_tu', { min: 0, max: 999 }) ?? 0,
        // Mac dinh TAT. Bat mot dieu kien la viec co y thuc, khong phai tac dung phu cua
        // viec tao no.
        luan_ly(b, 'dang_bat') ?? false,
        chuoi(b, 'ghi_chu', { toi_da: 2000 }),
      ],
    );
    await ghi_nhat_ky(nd.sub, 'tao', 'dieu_kien_loi', dong?.id ?? null, { phep_do }, req.ip);
    return res.code(201).send(dong);
  });

  app.patch('/giam-sat/dieu-kien/:id', { preHandler: can_kiem_soat }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const cu = await truy_van_mot<{ phep_do: string }>(
      'select phep_do from dieu_kien_loi where id = $1', [id]);
    if (cu === null) throw new LoiKhongTim('Không tìm thấy điều kiện.');

    const ho = b as Record<string, unknown>;
    const tham_so = ho['tham_so'] === undefined
      ? null
      : JSON.stringify(doc_tham_so(cu.phep_do, ho['tham_so']));
    const nguong_tho = ho['nguong'];
    let nguong: number | null = null;
    if (nguong_tho !== undefined && nguong_tho !== null && nguong_tho !== '') {
      nguong = Number(nguong_tho);
      if (!Number.isFinite(nguong)) throw new LoiDauVao('Ngưỡng phải là một con số.');
    }

    await thuc_thi(
      `update dieu_kien_loi
          set tham_so = coalesce($2::jsonb, tham_so),
              toan_tu = coalesce($3, toan_tu),
              nguong = coalesce($4, nguong),
              thu_tu = coalesce($5, thu_tu),
              dang_bat = coalesce($6, dang_bat),
              ghi_chu = coalesce($7, ghi_chu)
        where id = $1`,
      [
        id, tham_so, trong_tap(b, 'toan_tu', TOAN_TU), nguong,
        so_nguyen(b, 'thu_tu', { min: 0, max: 999 }),
        luan_ly(b, 'dang_bat'), chuoi(b, 'ghi_chu', { toi_da: 2000 }),
      ],
    );
    await ghi_nhat_ky(nd.sub, 'sua', 'dieu_kien_loi', id, null, req.ip);
    return { ok: true };
  });

  app.delete('/giam-sat/dieu-kien/:id', { preHandler: can_kiem_soat }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const so = await thuc_thi('delete from dieu_kien_loi where id = $1', [id]);
    if (so === 0) throw new LoiKhongTim('Không tìm thấy điều kiện.');
    await ghi_nhat_ky(nd.sub, 'xoa', 'dieu_kien_loi', id, null, req.ip);
    return res.code(204).send();
  });

  // ============================================================ chay thu
  //
  // BAT BUOC PHAI CO, khong phai tien ich: no cho nguoi dat nguong thay TRUOC khi bat, quy
  // tac se bat bao nhieu ban ghi. Khong co no thi nguoi ta bat mot nguong sai, sinh hang
  // nghin canh bao rac, va module chet vi khong ai doc nua.
  app.post('/giam-sat/thu-quy-tac', { preHandler: can_kiem_soat }, async (req) => {
    const b = than(req.body);
    const loai_loi_id = uuid(b, 'loai_loi_id', { bat_buoc: true }) as string;
    if (!bat_giam_sat()) {
      throw new LoiDauVao('Chưa cấu hình kết nối ERP 1 nên không chạy thử được.');
    }

    // Doc CA dieu kien dang tat: muc dich cua chay thu la xem TRUOC khi bat.
    const dong = await truy_van<{
      loai_loi_ma: string; loai_loi_ten: string; muc_do: string;
      dk_id: string; phep_do: string; tham_so: Record<string, number>;
      toan_tu: string; nguong: string;
    }>(
      `select ll.ma as loai_loi_ma, ll.ten as loai_loi_ten, ll.muc_do,
              dk.id as dk_id, dk.phep_do, dk.tham_so, dk.toan_tu, dk.nguong::text
         from loai_loi ll
         join dieu_kien_loi dk on dk.loai_loi_id = ll.id
        where ll.id = $1
        order by dk.thu_tu, dk.id`,
      [loai_loi_id],
    );
    if (dong.length === 0) {
      throw new LoiKhongTim('Loại lỗi không tồn tại hoặc chưa có điều kiện nào.');
    }

    const dau = dong[0];
    const kq = await chay_dieu_kien({
      loai_loi_id,
      loai_loi_ma: dau?.loai_loi_ma ?? '',
      loai_loi_ten: dau?.loai_loi_ten ?? '',
      muc_do: dau?.muc_do ?? 'trung',
      dieu_kien: dong.map((d) => ({
        id: d.dk_id, loai_loi_id, phep_do: d.phep_do,
        tham_so: d.tham_so ?? {}, toan_tu: d.toan_tu, nguong: d.nguong,
      })),
    }, ngu_canh_that());

    // KHONG ghi canh bao nao. Test `giam_sat_e2e` kiem dieu nay bang cach dem bang truoc/sau.
    return {
      so_ban_ghi_doc: kq.so_doc,
      so_se_canh_bao: kq.khop.length,
      bo_qua: kq.bo_qua,
      mau: kq.khop.slice(0, 20).map((k) => ({
        thuc_the: k.dong.thuc_the,
        khoa: k.dong.thuc_the_khoa,
        tieu_de: k.dong.tieu_de,
        gia_tri: k.dong.gia_tri,
        so_tien: k.dong.so_tien ?? null,
        dieu_kien_khop: k.dieu_kien_khop,
      })),
    };
  });

  // ============================================================ canh bao
  app.get('/giam-sat/tong-quan', { preHandler: can_kiem_soat }, async () => {
    const [tong, theo_nhom, quet] = await Promise.all([
      truy_van_mot<{
        moi: number; dang_kiem_tra: number; qua_han: number; nghiem_trong: number;
        tong_tien: string | null;
      }>(
        `select count(*) filter (where cb.trang_thai = 'moi')::int            as moi,
                count(*) filter (where cb.trang_thai = 'dang_kiem_tra')::int  as dang_kiem_tra,
                count(*) filter (
                  where cb.trang_thai in ('moi','dang_kiem_tra')
                    and cb.phat_hien_luc < now() - (lcb.sla_xu_ly_gio || ' hours')::interval
                )::int                                                        as qua_han,
                count(*) filter (
                  where cb.muc_do = 'nghiem_trong' and cb.trang_thai = 'moi')::int
                                                                              as nghiem_trong,
                sum(cb.so_tien) filter (where cb.trang_thai = 'moi')::text    as tong_tien
           from canh_bao cb
           join loai_loi ll on ll.id = cb.loai_loi_id
           join loai_canh_bao lcb on lcb.id = ll.loai_canh_bao_id`,
      ),
      truy_van(
        `select lcb.nhom, lcb.ten,
                count(*) filter (where cb.trang_thai = 'moi')::int as moi,
                count(*)::int                                       as tong
           from canh_bao cb
           join loai_loi ll on ll.id = cb.loai_loi_id
           join loai_canh_bao lcb on lcb.id = ll.loai_canh_bao_id
          group by lcb.nhom, lcb.ten
          order by lcb.nhom`,
      ),
      truy_van_mot<{ lan_cuoi: string | null; so_hong: number }>(
        `select max(bat_dau_luc)::text                              as lan_cuoi,
                count(*) filter (
                  where not thanh_cong and bat_dau_luc > now() - interval '24 hours')::int
                                                                    as so_hong
           from lan_quet_giam_sat`,
      ),
    ]);
    return {
      ...tong,
      tong_tien: tong?.tong_tien === null ? 0 : Number(tong?.tong_tien ?? 0),
      theo_nhom,
      quet_lan_cuoi: quet?.lan_cuoi ?? null,
      so_lan_quet_hong_24h: quet?.so_hong ?? 0,
      dang_bat: bat_giam_sat(),
    };
  });

  app.get('/giam-sat/canh-bao', { preHandler: can_kiem_soat }, async (req) => {
    const q = req.query as Record<string, string>;
    const gioi_han = Math.min(Number(q['gioi_han'] ?? 100) || 100, 500);
    const bo_qua = Math.max(Number(q['bo_qua'] ?? 0) || 0, 0);
    return truy_van(
      `select cb.id, cb.tieu_de, cb.muc_do, cb.trang_thai, cb.nguon_ma, cb.thuc_the,
              cb.thuc_the_khoa, cb.gia_tri, cb.nguong, cb.so_tien, cb.erp_user_id,
              cb.phat_hien_luc, cb.xu_ly_luc, cb.ky,
              ll.ma as loai_loi_ma, ll.ten as loai_loi_ten,
              lcb.nhom, lcb.ten as nhom_ten, lcb.sla_xu_ly_gio,
              nv.ho_ten as nhan_vien_ten,
              (cb.trang_thai in ('moi','dang_kiem_tra')
               and cb.phat_hien_luc < now() - (lcb.sla_xu_ly_gio || ' hours')::interval)
                as qua_han
         from canh_bao cb
         join loai_loi ll on ll.id = cb.loai_loi_id
         join loai_canh_bao lcb on lcb.id = ll.loai_canh_bao_id
         left join nhan_vien nv on nv.id = cb.nhan_vien_id
        where ($1::text is null or lcb.nhom = $1)
          and ($2::text is null or cb.muc_do = $2)
          and ($3::text is null or cb.trang_thai = $3)
          and ($4::date is null or cb.phat_hien_luc >= $4::date)
          and ($5::date is null or cb.phat_hien_luc < ($5::date + 1))
          and ($6::text is null or cb.nguon_ma = $6)
        order by cb.phat_hien_luc desc
        limit $7 offset $8`,
      [
        q['nhom'] ?? null, q['muc_do'] ?? null, q['trang_thai'] ?? null,
        q['tu_ngay'] ?? null, q['den_ngay'] ?? null, q['nguon'] ?? null,
        gioi_han, bo_qua,
      ],
    );
  });

  app.get('/giam-sat/canh-bao/:id', { preHandler: can_kiem_soat }, async (req) => {
    const id = lay_id(req);
    const dong = await truy_van_mot(
      `select cb.*, ll.ma as loai_loi_ma, ll.ten as loai_loi_ten, ll.mo_ta as loai_loi_mo_ta,
              ll.hau_qua, ll.huong_khac_phuc, ll.bo_phan_chiu_trach_nhiem, ll.can_cu,
              lcb.nhom, lcb.ten as nhom_ten, lcb.huong_dan_xu_ly, lcb.sla_xu_ly_gio,
              nv.ho_ten as nhan_vien_ten, nv.ma_nv
         from canh_bao cb
         join loai_loi ll on ll.id = cb.loai_loi_id
         join loai_canh_bao lcb on lcb.id = ll.loai_canh_bao_id
         left join nhan_vien nv on nv.id = cb.nhan_vien_id
        where cb.id = $1`,
      [id],
    );
    if (dong === null) throw new LoiKhongTim('Không tìm thấy cảnh báo.');
    const nhat_ky = await truy_van(
      `select x.*, nd.ten_dang_nhap
         from canh_bao_xu_ly x
         left join nguoi_dung nd on nd.id = x.nguoi_dung_id
        where x.canh_bao_id = $1
        order by x.luc`,
      [id],
    );
    return { ...dong, nhat_ky };
  });

  app.post('/giam-sat/canh-bao/:id/xu-ly', { preHandler: can_kiem_soat }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const moi = trong_tap(b, 'trang_thai', TRANG_THAI, { bat_buoc: true }) as string;
    const ket_luan = chuoi(b, 'ket_luan', { toi_da: 4000 });

    // Doi trang thai va ghi nhat ky trong CUNG mot transaction: mot ban ghi doi trang thai
    // ma khong co dong nhat ky la mot lo hong ghi vet.
    return trong_giao_dich(async (khach) => {
      const cu = await khach.query<{ trang_thai: string }>(
        'select trang_thai from canh_bao where id = $1 for update', [id]);
      const truoc = cu.rows[0]?.trang_thai;
      if (truoc === undefined) throw new LoiKhongTim('Không tìm thấy cảnh báo.');

      await khach.query(
        `update canh_bao
            set trang_thai = $2, ket_luan = coalesce($3, ket_luan),
                nguoi_xu_ly = $4, xu_ly_luc = now(), cap_nhat_luc = now()
          where id = $1`,
        [id, moi, ket_luan, nd.sub],
      );
      await khach.query(
        `insert into canh_bao_xu_ly
           (canh_bao_id, nguoi_dung_id, hanh_dong, trang_thai_truoc, trang_thai_sau, ghi_chu)
         values ($1,$2,'doi_trang_thai',$3,$4,$5)`,
        [id, nd.sub, truoc, moi, ket_luan],
      );
      return { ok: true, trang_thai_truoc: truoc, trang_thai_sau: moi };
    });
  });

  // ============================================================ xuat CSV
  app.get('/giam-sat/canh-bao.csv', { preHandler: can_kiem_soat }, async (req, res) => {
    const q = req.query as Record<string, string>;
    const ds = await truy_van<Record<string, unknown>>(
      `select cb.phat_hien_luc, lcb.ten as nhom_ten, ll.ma as loai_loi_ma,
              ll.ten as loai_loi_ten, cb.muc_do, cb.tieu_de, cb.nguon_ma, cb.thuc_the,
              cb.thuc_the_khoa, cb.gia_tri, cb.nguong, cb.so_tien, cb.erp_user_id,
              nv.ho_ten as nhan_vien_ten, cb.trang_thai, cb.ket_luan
         from canh_bao cb
         join loai_loi ll on ll.id = cb.loai_loi_id
         join loai_canh_bao lcb on lcb.id = ll.loai_canh_bao_id
         left join nhan_vien nv on nv.id = cb.nhan_vien_id
        where ($1::text is null or lcb.nhom = $1)
          and ($2::text is null or cb.trang_thai = $2)
          and ($3::date is null or cb.phat_hien_luc >= $3::date)
          and ($4::date is null or cb.phat_hien_luc < ($4::date + 1))
        order by cb.phat_hien_luc desc
        limit 20000`,
      [q['nhom'] ?? null, q['trang_thai'] ?? null, q['tu_ngay'] ?? null, q['den_ngay'] ?? null],
    );

    const tieu_de = ['Thời điểm phát hiện', 'Nhóm', 'Mã lỗi', 'Tên lỗi', 'Mức độ',
      'Tiêu đề', 'Nguồn', 'Bảng', 'Khóa', 'Giá trị đo', 'Ngưỡng', 'Số tiền',
      'ID người ERP', 'Nhân viên', 'Trạng thái', 'Kết luận'];
    const dong = ds.map((d) => Object.values(d).map((v) => o_csv(v)).join(','));
    // BOM de Excel tren Windows doc dung tieng Viet.
    const csv = `﻿${tieu_de.map((t) => o_csv(t)).join(',')}\n${dong.join('\n')}\n`;

    return res
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition',
        `attachment; filename="canh-bao-giam-sat-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(csv);
  });

  // ============================================================ nhat ky quet
  app.get('/giam-sat/lan-quet', { preHandler: can_kiem_soat }, async () =>
    truy_van(
      `select lq.*, ll.ma as loai_loi_ma, ll.ten as loai_loi_ten
         from lan_quet_giam_sat lq
         left join loai_loi ll on ll.id = lq.loai_loi_id
        order by lq.bat_dau_luc desc
        limit 200`,
    ),
  );

  // ============================================================ nguon du lieu (admin)
  app.get('/giam-sat/nguon', { preHandler: can_admin }, async () => ({
    dang_bat: bat_giam_sat(),
    // KHONG tra ve host/user/mat khau. Man hinh chi can biet da cau hinh hay chua.
    nguon: await danh_sach_nguon(),
    ma_hop_le: MA_NGUON.map((m) => ({ ma: m, ten: TEN_NGUON[m] })),
  }));

  app.post('/giam-sat/nguon/do-tim', { preHandler: can_admin }, async () => {
    if (!bat_giam_sat()) {
      throw new LoiDauVao(
        'Chưa cấu hình ERP1_HOST / ERP1_USER / ERP1_PASSWORD trong .env. '
        + 'Khai xong thì khởi động lại máy chủ rồi dò tìm lại.',
      );
    }
    return { database: await do_tim_database() };
  });

  app.post('/giam-sat/nguon/:id', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const so = await thuc_thi(
      `update nguon_du_lieu
          set ten_database = coalesce($2, ten_database),
              dang_bat = coalesce($3, dang_bat),
              cap_nhat_luc = now()
        where id = $1`,
      [id, chuoi(b, 'ten_database', { toi_da: 100 }), luan_ly(b, 'dang_bat')],
    );
    if (so === 0) throw new LoiKhongTim('Không tìm thấy nguồn dữ liệu.');
    await ghi_nhat_ky(nd.sub, 'sua', 'nguon_du_lieu', id, null, req.ip);
    return { ok: true };
  });

  app.post('/giam-sat/nguon/:id/kiem-tra', { preHandler: can_admin }, async (req) => {
    const id = lay_id(req);
    const dong = await truy_van_mot<{ ma: string }>(
      'select ma from nguon_du_lieu where id = $1', [id]);
    if (dong === null) throw new LoiKhongTim('Không tìm thấy nguồn dữ liệu.');
    if (!la_ma_nguon(dong.ma)) throw new LoiDauVao('Mã nguồn không hợp lệ.');
    return kiem_tra_nguon(dong.ma);
  });

  // ============================================================ doi chieu schema
  app.get('/giam-sat/doi-chieu-schema', { preHandler: can_admin }, async () => {
    if (!bat_giam_sat()) {
      throw new LoiDauVao('Chưa cấu hình kết nối ERP 1.');
    }
    const kq = await doi_chieu();
    return {
      bang: kq,
      so_khop: kq.filter((r) => r.tinh_trang === 'ok').length,
      so_bang: kq.length,
      co_van_de_chan: kq.some((r) => r.tinh_trang !== 'ok' && r.dang_dung),
    };
  });

  // ============================================================ chay quet tay (admin)
  app.post('/giam-sat/quet', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const kq = await chay_mot_vong(() => {});
    await ghi_nhat_ky(nd.sub, 'chay', 'quet_giam_sat', null, { ...kq }, req.ip);
    return kq;
  });

  // Danh sach loai loi dang bat — de man hinh biet vong quet sap toi se lam gi.
  app.get('/giam-sat/se-quet', { preHandler: can_kiem_soat }, async () => {
    const ds = await cac_loi_can_quet();
    return ds.map((l) => ({
      loai_loi_ma: l.loai_loi_ma, loai_loi_ten: l.loai_loi_ten,
      so_dieu_kien: l.dieu_kien.length,
      phep_do: l.dieu_kien.map((d) => d.phep_do),
    }));
  });
}
