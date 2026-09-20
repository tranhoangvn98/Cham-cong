// Nap du lieu phan tang trach nhiem (file SO LAM VIEC SO 01) vao PostgreSQL.
// Idempotent: chay lai bao nhieu lan cung khong sinh trung (UNIQUE + on conflict
// do nothing). Chi nap phan THIEU — khong xoa, khong sua du lieu da co tren he thong.
import type pg from 'pg';
import { trong_giao_dich, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { CAC_NHOM, CAC_TN, CAC_VI_TRI, CAC_PHONG } from './du_lieu_jd_danh_muc.ts';
import { DAU_VIEC_A, type DongDauViec } from './du_lieu_jd_viec.ts';

/** Tong hop tat ca dau viec tu cac tep du lieu (theo thu tu file goc). */
export const CAC_DAU_VIEC: DongDauViec[] = [...DAU_VIEC_A];

/** Ket qua nap JD — dung de ghi log luc khoi dong. */
export interface KetQuaNapJd {
  phong: number;
  nhom: number;
  vi_tri: number;
  tn: number;
  dau_viec: number;
  raci: number;
  ma_bc: number;
}

interface IdMap {
  phong: Map<string, string | null>;
  nhom: Map<string, string>;
  vi_tri: Map<string, string>;
  /** Khoa tn = nhom_ma + '\u0000' + ten (ma co the null). */
  tn: Map<string, string>;
}

async function nap_danh_muc(khach: pg.PoolClient): Promise<IdMap> {
  // Phong: tao thieu (ten unique trong phong_ban).
  for (const ten of CAC_PHONG) {
    await khach.query(
      'insert into phong_ban(ten) values ($1) on conflict (ten) do nothing',
      [ten],
    );
  }
  const phong = new Map<string, string | null>();
  const ds_phong = await khach.query<{ id: string; ten: string }>(
    'select id, ten from phong_ban where ten = any($1::text[])',
    [CAC_PHONG],
  );
  for (const d of ds_phong.rows) phong.set(d.ten, d.id);

  // Nhom trach nhiem cap 1.
  for (const n of CAC_NHOM) {
    await khach.query(
      'insert into nhom_trach_nhiem(ma, ten) values ($1,$2) on conflict (ma) do nothing',
      [n.ma, n.ten],
    );
  }
  const nhom = new Map<string, string>();
  const ds_nhom = await khach.query<{ id: string; ma: string }>(
    'select id, ma from nhom_trach_nhiem',
  );
  for (const d of ds_nhom.rows) nhom.set(d.ma, d.id);

  // Vi tri.
  for (const vt of CAC_VI_TRI) {
    const pid = vt.phong === null ? null : (phong.get(vt.phong) ?? null);
    await khach.query(
      `insert into vi_tri(ma, ten, cap_bac, pham_vi, phong_ban_id)
       values ($1,$2,$3,$4,$5) on conflict (ma) do nothing`,
      [vt.ma, vt.ten, vt.cap_bac, vt.pham_vi, pid],
    );
  }
  const vi_tri = new Map<string, string>();
  const ds_vt = await khach.query<{ id: string; ma: string }>('select id, ma from vi_tri');
  for (const d of ds_vt.rows) vi_tri.set(d.ma, d.id);

  // Trach nhiem chi tiet cap 2.
  for (const tn of CAC_TN) {
    const nhom_id = nhom.get(tn.nhom);
    if (nhom_id === undefined) continue;
    const qt = tn.quan_tri === null ? null : (vi_tri.get(tn.quan_tri) ?? null);
    await khach.query(
      `insert into tn_chi_tiet(nhom_id, ma, ten, nguoi_quan_tri_vi_tri_id)
       values ($1,$2,$3,$4) on conflict (nhom_id, ten) do nothing`,
      [nhom_id, tn.ma, tn.ten, qt],
    );
  }
  const tn_map = new Map<string, string>();
  const ds_tn = await khach.query<{ id: string; nhom_id: string; ten: string }>(
    'select id, nhom_id, ten from tn_chi_tiet',
  );
  const nhom_ma_cua = new Map<string, string>();
  for (const [ma, id] of nhom) nhom_ma_cua.set(id, ma);
  for (const d of ds_tn.rows) {
    tn_map.set(`${nhom_ma_cua.get(d.nhom_id) ?? '?'}\u0000${d.ten}`, d.id);
  }

  return { phong, nhom, vi_tri, tn: tn_map };
}

function khoa_tn(nhom_ma: string, ten: string): string {
  return `${nhom_ma}\u0000${ten}`;
}

/** Nap toan bo JD. Tra ve so luong dong DA THEM MOI (khong tinh dong da co). */
export async function nap_jd_neu_trong(): Promise<KetQuaNapJd> {
  return trong_giao_dich(async (khach) => {
    const ids = await nap_danh_muc(khach);

    let dau_viec = 0;
    let raci = 0;
    for (const dv of CAC_DAU_VIEC) {
      const vt_id = ids.vi_tri.get(dv.vt);
      const nhom_id = ids.nhom.get(dv.nhom);
      if (vt_id === undefined || nhom_id === undefined) continue;
      const tn_id = dv.tn === null ? null : (ids.tn.get(khoa_tn(dv.nhom, dv.tn)) ?? null);
      const pid = dv.phong === null ? null : (ids.phong.get(dv.phong) ?? null);
      const kq = await khach.query<{ id: string }>(
        `insert into dau_viec
           (vi_tri_id, ten, nhom_id, tn_chi_tiet_id, phong_ban_id, input, output, kpi,
            co_bc, ma_bc, trang_thai_ma_bc, tan_suat, tan_suat_tho, sla, phan_cap_xu_ly,
            muc_do_quan_trong, ghi_chu, thu_tu)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         on conflict (vi_tri_id, ten) do nothing returning id`,
        [vt_id, dv.ten, nhom_id, tn_id, pid, dv.vao, dv.ra, dv.kpi,
          dv.co_bc, dv.ma_bc, dv.tt_bc, dv.ts, dv.ts_tho, dv.sla, dv.ng,
          dv.md, dv.gc, 0],
      );
      const id = kq.rows[0]?.id;
      if (id !== undefined) {
        dau_viec++;
        for (const [vai_tro, kieu_nguoi] of dv.raci) {
          await khach.query(
            `insert into dau_viec_raci(dau_viec_id, vai_tro, kieu_nguoi)
             values ($1,$2,$3) on conflict (dau_viec_id, vai_tro, kieu_nguoi) do nothing`,
            [id, vai_tro, kieu_nguoi],
          );
          raci++;
        }
      }
    }

    // Danh muc ma bao cao: sinh tu chinh cac dau viec (khong khai tay 208 ma).
    const ds_bc = await khach.query<{ ma: string; chuan: boolean }>(
      `select ma_bc as ma, bool_or(trang_thai_ma_bc = 'chuan') as chuan
         from dau_viec where ma_bc is not null and ma_bc <> ''
        group by ma_bc`,
    );
    let ma_bc = 0;
    for (const d of ds_bc.rows) {
      const kq = await khach.query(
        `insert into bao_cao_mau(ma, trang_thai) values ($1,$2)
         on conflict (ma) do nothing returning id`,
        [d.ma, d.chuan ? 'chuan' : 'de_xuat'],
      );
      if (kq.rows.length > 0) ma_bc++;
    }

    // Thong ke phuc vu log (so dong moi).
    const dem = async (sql: string): Promise<number> => {
      const d = await khach.query<{ n: string }>(sql);
      return Number(d.rows[0]?.n ?? 0);
    };
    const so_phong = await dem('select count(*)::text as n from phong_ban');
    const so_nhom = await dem('select count(*)::text as n from nhom_trach_nhiem');
    const so_vt = await dem('select count(*)::text as n from vi_tri');
    const so_tn = await dem('select count(*)::text as n from tn_chi_tiet');

    return { phong: so_phong, nhom: so_nhom, vi_tri: so_vt, tn: so_tn, dau_viec, raci, ma_bc };
  });
}

/** Dem nhanh cac bang JD (dung kiem tra o test). */
export async function thong_ke_jd(): Promise<KetQuaNapJd & { dau_viec_tong: number }> {
  const dem = async (bang: string): Promise<number> => {
    const d = await truy_van_mot<{ n: string }>(`select count(*)::text as n from ${bang}`);
    return Number(d?.n ?? 0);
  };
  return {
    phong: await dem('phong_ban'),
    nhom: await dem('nhom_trach_nhiem'),
    vi_tri: await dem('vi_tri'),
    tn: await dem('tn_chi_tiet'),
    dau_viec: await dem('dau_viec'),
    dau_viec_tong: await dem('dau_viec'),
    raci: await dem('dau_viec_raci'),
    ma_bc: await dem('bao_cao_mau'),
  };
}

/** Ghi de (dung khi can chay lai toan bo danh muc — KHONG dung hang ngay). */
export async function xoa_jd(): Promise<void> {
  await thuc_thi('delete from dau_viec_raci');
  await thuc_thi('delete from dau_viec');
  await thuc_thi('delete from tn_chi_tiet');
  await thuc_thi('delete from vi_tri');
  await thuc_thi('delete from nhom_trach_nhiem');
  await thuc_thi('delete from bao_cao_mau');
}
