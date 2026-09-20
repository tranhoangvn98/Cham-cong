// Tuyen API quan tri co cau to chuc – vi tri – trach nhiem (JD + RACI + PDCA).
//
// Quyen doc: moi nguoi da dang nhap. Quyen sua danh muc: nhan su / admin; rieng sua
// RULE dau viec thi TP chu TN chi tiet cung duoc (kiem trong to_chuc/ghi.ts).
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { truy_van } from '../csdl/ket_noi.ts';
import { can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import type { NguoiXem } from '../viec/quyen.ts';
import { LoiDauVao, LoiKhongTim } from '../tien_ich/kiem_tra.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, so_thuc, than, trong_tap, uuid, uuid_bat_buoc,
} from '../tien_ich/kiem_tra.ts';
import * as doc from './doc.ts';
import * as ghi from './ghi.ts';
import type { CapBac, DongRaci, TanSuat } from './kieu.ts';

const CAP_BAC = ['cap_cao', 'truong_phong', 'truong_nhom', 'chuyen_vien', 'nhan_vien'] as const;
const PHAM_VI = ['cu_the', 'toan_cong_ty', 'moi_phong'] as const;
const TAN_SUAT = ['hang_ngay', 'hang_tuan', 'hai_tuan', 'hang_thang', 'hang_quy',
  'hang_nam', '6_thang', 'phat_sinh', 'lien_tuc'] as const;
const MUC_DO = ['cao', 'rat_cao', 'trung_binh'] as const;
const VAI_TRO_RACI = ['R', 'A', 'C', 'I'] as const;
const KIEU_NGUOI_RACI = ['ceo', 'tp', 'tn', 'nv_cv', 'tbks'] as const;

function nd_hien_tai(req: FastifyRequest): NguoiXem {
  const nd = nguoi_dung_hien_tai(req);
  return { sub: nd.sub, vai_tro: nd.vai_tro, nv: nd.nv };
}

/** Doc raci tu body (mang {vai_tro, kieu_nguoi}). */
function doc_raci(b: Record<string, unknown>): DongRaci[] {
  const ds = than(b).raci as unknown;
  if (!Array.isArray(ds)) throw new LoiDauVao('RACI phải là danh sách vai trò.');
  return ds.map((x) => {
    const o = than(x);
    return {
      vai_tro: trong_tap(o, 'vai_tro', VAI_TRO_RACI) as DongRaci['vai_tro'],
      kieu_nguoi: trong_tap(o, 'kieu_nguoi', KIEU_NGUOI_RACI) as DongRaci['kieu_nguoi'],
    };
  });
}

/** Doc buoc (step) tu body. */
function doc_buoc(b: Record<string, unknown>): { ten: string; mo_ta: string | null; thu_tu: number }[] {
  const ds = b.buoc as unknown;
  if (!Array.isArray(ds)) return [];
  return ds.map((x, i) => {
    const o = than(x);
    return {
      ten: chuoi_bat_buoc(o, 'ten', { toi_da: 250 }),
      mo_ta: chuoi(o, 'mo_ta', { toi_da: 2000 }),
      thu_tu: (so_thuc(o, 'thu_tu') as number | undefined) ?? i,
    };
  });
}

/** Doc dau vao dau viec tu body (dung chung cho tao va sua). */
function doc_dau_viec(b: Record<string, unknown>, co_vi_tri: boolean): ghi.DauVaoDauViec {
  return {
    vi_tri_id: co_vi_tri ? uuid_bat_buoc(b, 'vi_tri_id') : '',
    ten: chuoi_bat_buoc(b, 'ten', { toi_da: 250 }),
    mo_ta: chuoi(b, 'mo_ta', { toi_da: 10000 }),
    nhom_id: co_vi_tri ? uuid_bat_buoc(b, 'nhom_id') : '',
    tn_chi_tiet_id: uuid(b, 'tn_chi_tiet_id'),
    phong_ban_id: uuid(b, 'phong_ban_id'),
    input: chuoi(b, 'input', { toi_da: 2000 }),
    output: chuoi(b, 'output', { toi_da: 2000 }),
    kpi: chuoi(b, 'kpi', { toi_da: 2000 }),
    co_bc: luan_ly(b, 'co_bc') ?? false,
    ma_bc: chuoi(b, 'ma_bc', { toi_da: 60 }),
    trang_thai_ma_bc: trong_tap(b, 'trang_thai_ma_bc', ['de_xuat', 'chuan']) as 'de_xuat' | 'chuan' | null,
    tan_suat: trong_tap(b, 'tan_suat', TAN_SUAT) as TanSuat,
    tan_suat_tho: chuoi(b, 'tan_suat_tho', { toi_da: 120 }),
    sla: chuoi(b, 'sla', { toi_da: 200 }),
    phan_cap_xu_ly: chuoi(b, 'phan_cap_xu_ly', { toi_da: 2000 }),
    muc_do_quan_trong: (trong_tap(b, 'muc_do_quan_trong', MUC_DO) ?? 'cao') as 'cao' | 'rat_cao' | 'trung_binh',
    ghi_chu: chuoi(b, 'ghi_chu', { toi_da: 1000 }),
    raci: doc_raci(b),
    buoc: doc_buoc(b),
  };
}

export async function tuyen_to_chuc(app: FastifyInstance): Promise<void> {
  // ==================================================================== vi tri
  app.get('/vi-tri', { preHandler: can_dang_nhap }, async (req) => {
    const phong = (req.query as { phong?: string }).phong ?? null;
    return doc.danh_sach_vi_tri(phong);
  });

  app.get('/vi-tri/:id', { preHandler: can_dang_nhap }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    const vt = await truy_van(
      `select vt.id, vt.ma, vt.ten, vt.cap_bac, vt.pham_vi, vt.phong_ban_id, vt.mo_ta,
              vt.dang_hoat_dong, pb.ten as ten_phong_ban
         from vi_tri vt left join phong_ban pb on pb.id = vt.phong_ban_id
        where vt.id = $1`,
      [id],
    );
    if (vt.length === 0) throw new LoiKhongTim('Không tìm thấy vị trí.');
    return {
      ...vt[0],
      dau_viec: await doc.dau_viec_cua(id),
      nguoi_giu: await ghi.nguoi_giu(id),
      mau_dinh_ky: await truy_van(
        `select md.id, md.nhan_vien_id, nv.ho_ten, md.quy_tac, md.dang_bat,
                to_char(md.bat_dau, 'YYYY-MM-DD') as bat_dau
           from cong_viec_mau_dinh_ky md
           join nhan_vien nv on nv.id = md.nhan_vien_id
          where md.dau_viec_id in (select dv.id from dau_viec dv where dv.vi_tri_id = $1)
          order by nv.ho_ten`,
        [id],
      ),
    };
  });

  app.post('/vi-tri', { preHandler: can_nhan_su }, async (req) => {
    const b = than(req.body);
    return ghi.tao_vi_tri({
      ma: chuoi_bat_buoc(b, 'ma', { toi_da: 30 }),
      ten: chuoi_bat_buoc(b, 'ten', { toi_da: 150 }),
      cap_bac: trong_tap(b, 'cap_bac', CAP_BAC) as CapBac,
      pham_vi: (trong_tap(b, 'pham_vi', PHAM_VI) ?? 'cu_the') as 'cu_the' | 'toan_cong_ty' | 'moi_phong',
      phong_ban_id: uuid(b, 'phong_ban_id'),
      mo_ta: chuoi(b, 'mo_ta', { toi_da: 2000 }),
    });
  });

  app.patch('/vi-tri/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    const b = than(req.body);
    await ghi.sua_vi_tri(id, {
      ten: chuoi(b, 'ten', { toi_da: 150 }) ?? undefined,
      cap_bac: trong_tap(b, 'cap_bac', CAP_BAC) as CapBac | undefined,
      pham_vi: trong_tap(b, 'pham_vi', PHAM_VI) as 'cu_the' | 'toan_cong_ty' | 'moi_phong' | undefined,
      phong_ban_id: Object.hasOwn(b, 'phong_ban_id') ? uuid(b, 'phong_ban_id') : undefined,
      mo_ta: chuoi(b, 'mo_ta', { toi_da: 2000 }) ?? undefined,
      dang_hoat_dong: Object.hasOwn(b, 'dang_hoat_dong') ? luan_ly(b, 'dang_hoat_dong') === true : undefined,
    });
    return { ok: true };
  });

  // ==================================================================== nhom + tn chi tiet
  app.get('/nhom', { preHandler: can_dang_nhap }, async () => {
    const nhom = await doc.danh_sach_nhom();
    const tn = await doc.danh_sach_tn();
    return { nhom, tn };
  });

  app.post('/tn', { preHandler: can_nhan_su }, async (req) => {
    const b = than(req.body);
    const nhom_id = uuid_bat_buoc(b, 'nhom_id');
    const ten = chuoi_bat_buoc(b, 'ten', { toi_da: 200 });
    const quan_tri = uuid(b, 'nguoi_quan_tri_vi_tri_id');
    const d = await truy_van(
      `insert into tn_chi_tiet(nhom_id, ten, nguoi_quan_tri_vi_tri_id)
       values ($1,$2,$3) on conflict (nhom_id, ten) do nothing returning id`,
      [nhom_id, ten, quan_tri],
    );
    if (d.length === 0) throw new LoiDauVao('Trách nhiệm chi tiết này đã có trong nhóm.');
    return d[0];
  });

  // ==================================================================== dau viec
  app.get('/dau-viec/:id', { preHandler: can_dang_nhap }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    const d = await doc.dau_viec_theo_id(id);
    if (d === null) throw new LoiKhongTim('Không tìm thấy đầu việc.');
    return d;
  });

  app.post('/dau-viec', { preHandler: can_nhan_su }, async (req) => {
    return ghi.tao_dau_viec(doc_dau_viec(than(req.body), true));
  });

  app.post('/dau-viec/:id/sao-chep', { preHandler: can_nhan_su }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    const b = than(req.body);
    return ghi.sao_chep_dau_viec(id, {
      vi_tri_id: uuid(b, 'vi_tri_id') ?? undefined,
      tn_chi_tiet_id: Object.hasOwn(b, 'tn_chi_tiet_id') ? uuid(b, 'tn_chi_tiet_id') : undefined,
      ten: chuoi(b, 'ten', { toi_da: 250 }) ?? undefined,
    });
  });

  app.patch('/dau-viec/:id', { preHandler: can_dang_nhap }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    const b = than(req.body);
    const d: Partial<ghi.DauVaoDauViec> = {};
    if (Object.hasOwn(b, 'ten')) d.ten = chuoi_bat_buoc(b, 'ten', { toi_da: 250 });
    if (Object.hasOwn(b, 'mo_ta')) d.mo_ta = chuoi(b, 'mo_ta', { toi_da: 10000 });
    if (Object.hasOwn(b, 'tn_chi_tiet_id')) d.tn_chi_tiet_id = uuid(b, 'tn_chi_tiet_id');
    if (Object.hasOwn(b, 'input')) d.input = chuoi(b, 'input', { toi_da: 2000 });
    if (Object.hasOwn(b, 'output')) d.output = chuoi(b, 'output', { toi_da: 2000 });
    if (Object.hasOwn(b, 'kpi')) d.kpi = chuoi(b, 'kpi', { toi_da: 2000 });
    if (Object.hasOwn(b, 'co_bc')) d.co_bc = luan_ly(b, 'co_bc') ?? false;
    if (Object.hasOwn(b, 'ma_bc')) d.ma_bc = chuoi(b, 'ma_bc', { toi_da: 60 });
    if (Object.hasOwn(b, 'trang_thai_ma_bc')) {
      d.trang_thai_ma_bc = trong_tap(b, 'trang_thai_ma_bc', ['de_xuat', 'chuan']) as 'de_xuat' | 'chuan' | null;
    }
    if (Object.hasOwn(b, 'tan_suat')) d.tan_suat = trong_tap(b, 'tan_suat', TAN_SUAT) as TanSuat;
    if (Object.hasOwn(b, 'tan_suat_tho')) d.tan_suat_tho = chuoi(b, 'tan_suat_tho', { toi_da: 120 });
    if (Object.hasOwn(b, 'sla')) d.sla = chuoi(b, 'sla', { toi_da: 200 });
    if (Object.hasOwn(b, 'phan_cap_xu_ly')) d.phan_cap_xu_ly = chuoi(b, 'phan_cap_xu_ly', { toi_da: 2000 });
    if (Object.hasOwn(b, 'muc_do_quan_trong')) {
      d.muc_do_quan_trong = (trong_tap(b, 'muc_do_quan_trong', MUC_DO) ?? 'cao') as 'cao' | 'rat_cao' | 'trung_binh';
    }
    if (Object.hasOwn(b, 'ghi_chu')) d.ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 1000 });
    await ghi.sua_dau_viec(nd_hien_tai(req), id, d);
    return { ok: true };
  });

  app.post('/dau-viec/:id/bat-tat', { preHandler: can_dang_nhap }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    const b = than(req.body);
    await ghi.doi_dang_bat(nd_hien_tai(req), id, luan_ly(b, 'dang_bat') ?? true);
    return { ok: true };
  });

  app.put('/dau-viec/:id/raci', { preHandler: can_dang_nhap }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    await ghi.dat_raci(nd_hien_tai(req), id, doc_raci(than(req.body)));
    return { ok: true };
  });

  app.put('/dau-viec/:id/buoc', { preHandler: can_dang_nhap }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    await ghi.dat_buoc(nd_hien_tai(req), id, doc_buoc(than(req.body)));
    return { ok: true };
  });

  // ==================================================================== bao phu + do luong
  app.get('/tong-quan', { preHandler: can_dang_nhap }, async () => doc.tong_quan());

  app.get('/bao-phu', { preHandler: can_dang_nhap }, async () => {
    const [theo_tn, lo_hong] = await Promise.all([doc.bao_phu_theo_tn(), doc.dau_viec_lo_hong()]);
    return { theo_tn, lo_hong };
  });

  app.get('/do-luong', { preHandler: can_dang_nhap }, async () => doc.do_luong_theo_nhan_vien());

  app.get('/ma-bc', { preHandler: can_dang_nhap }, async () => doc.danh_sach_ma_bc());

  // ==================================================================== gan vi tri cho nhan vien
  app.get('/nhan-vien/:id/vi-tri', { preHandler: can_dang_nhap }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    return ghi.vi_tri_cua_nhan_vien(id);
  });

  app.post('/nhan-vien/:id/vi-tri', { preHandler: can_nhan_su }, async (req) => {
    const id = uuid_bat_buoc(than(req.params), 'id');
    const b = than(req.body);
    const vi_tri_id = uuid_bat_buoc(b, 'vi_tri_id');
    await ghi.gan_vi_tri(nd_hien_tai(req), id, vi_tri_id, luan_ly(b, 'la_chinh') ?? false);
    return { ok: true };
  });

  app.delete('/nhan-vien/:id/vi-tri/:vi_tri_id', { preHandler: can_nhan_su }, async (req) => {
    const p = than(req.params);
    const id = uuid_bat_buoc(p, 'id');
    const vi_tri_id = uuid_bat_buoc(p, 'vi_tri_id');
    await ghi.bo_vi_tri(nd_hien_tai(req), id, vi_tri_id);
    return { ok: true };
  });

  // ==================================================================== trach nhiem cua toi (goc ca nhan)
  app.get('/toi/trach-nhiem', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    if (nd.nv === null) return [];
    return doc.trach_nhiem_cua_nhan_vien(nd.nv);
  });
}
