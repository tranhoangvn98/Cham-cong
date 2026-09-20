// Sinh / cap nhat mau viec dinh ky tu dau viec (JD) cho mot nhan vien.
//
// Khi gan vi tri cho nhan vien: moi dau viec co tan suat dinh ky cua vi tri do
// sinh MOT mau `nguon = 'jd'` de lich chay tao viec hang ngay. Khi bo gan vi tri
// hoac tat dau viec: tat mau tuong ung. Bat lai thi dung lai mau cu (unique
// (nhan_vien_id, dau_viec_id) dam bao khong sinh trung).
import type pg from 'pg';
import { thuc_thi, truy_van } from '../csdl/ket_noi.ts';
import type { TanSuat } from './kieu.ts';

export interface DongDauViecGon {
  id: string;
  vi_tri_id: string;
  ten: string;
  mo_ta: string | null;
  tan_suat: TanSuat;
  muc_do_quan_trong: string;
  ma_bc: string | null;
  dang_bat: boolean;
}

/** Tan suat nao duoc sinh tu dong (phat_sinh / lien_tuc thi KHONG). */
export function tu_dong_sinh_duoc(ts: TanSuat): boolean {
  return ts !== 'phat_sinh' && ts !== 'lien_tuc';
}

/** Anh xa tan suat dau viec -> quy tac mau dinh ky + tham so mac dinh. */
export function quy_tac_cua(ts: TanSuat): {
  quy_tac: string;
  cac_thu: number[];
  ngay_trong_thang: number[];
} {
  switch (ts) {
    case 'hang_ngay': return { quy_tac: 'hang_ngay', cac_thu: [], ngay_trong_thang: [] };
    case 'hang_tuan': return { quy_tac: 'hang_tuan', cac_thu: [1], ngay_trong_thang: [] };
    case 'hai_tuan': return { quy_tac: 'hai_tuan', cac_thu: [], ngay_trong_thang: [] };
    case 'hang_thang': return { quy_tac: 'hang_thang', cac_thu: [], ngay_trong_thang: [1] };
    case 'hang_quy': return { quy_tac: 'hang_quy', cac_thu: [], ngay_trong_thang: [] };
    case 'hang_nam': return { quy_tac: 'hang_nam', cac_thu: [], ngay_trong_thang: [] };
    case '6_thang': return { quy_tac: '6_thang', cac_thu: [], ngay_trong_thang: [] };
    default: return { quy_tac: 'hang_ngay', cac_thu: [], ngay_trong_thang: [] };
  }
}

/** Uu tien cua viec sinh tu muc do quan trong cua dau viec. */
function uu_tien_cua(muc_do: string): string {
  return muc_do === 'rat_cao' ? 'cao' : 'thuong';
}

/** Mo ta ngan gon dua vao JD de nguoi nhan hieu nguon goc cong viec. */
function mo_ta_cua(dv: DongDauViecGon): string {
  const phan: string[] = [];
  if (dv.mo_ta !== null && dv.mo_ta !== '') phan.push(dv.mo_ta);
  if (dv.ma_bc !== null && dv.ma_bc !== '') phan.push(`Báo cáo: ${dv.ma_bc}`);
  return phan.join('\n');
}

/**
 * Tao mau dinh ky cho nhan vien tu mot dau viec.
 * - Dau viec khong sinh tu dong (phat_sinh/lien_tuc) hoac dang tat -> bo qua.
 * - Da co mau (unique) thi bat lai (update), khong tao trung.
 */
export async function tao_mau_tu_dau_viec(
  khach: pg.PoolClient, dv: DongDauViecGon, nhan_vien_id: string,
): Promise<void> {
  if (!tu_dong_sinh_duoc(dv.tan_suat)) return;
  const q = quy_tac_cua(dv.tan_suat);
  const dang_bat = dv.dang_bat;
  const kq = await khach.query<{ id: string }>(
    `insert into cong_viec_mau_dinh_ky
       (ten, mo_ta, nguoi_giao, nhan_vien_id, nguon, quy_tac, cac_thu,
        ngay_trong_thang, gio_han, uu_tien, dau_viec_id, dang_bat)
     values ($1,$2,null,$3,'jd',$4,$5,$6,'18:00',$7,$8,$9)
     on conflict (nhan_vien_id, dau_viec_id) where dau_viec_id is not null
     do update set dang_bat = $9, quy_tac = $4, cac_thu = $5,
                   ngay_trong_thang = $6, ten = $1, mo_ta = $2
     returning id`,
    [dv.ten, mo_ta_cua(dv), nhan_vien_id, q.quy_tac, q.cac_thu, q.ngay_trong_thang,
      uu_tien_cua(dv.muc_do_quan_trong), dv.id, dang_bat],
  );
  // Dong da co ma dang tat va dau viec van bat: bao dam bat lai.
  if (kq.rows.length === 0 && dang_bat) {
    await khach.query(
      `update cong_viec_mau_dinh_ky set dang_bat = true
        where nhan_vien_id = $1 and dau_viec_id = $2`,
      [nhan_vien_id, dv.id],
    );
  }
}

/** Tat het mau cua mot nhan vien thuoc mot vi tri (khi bo gan vi tri). */
export async function tat_mau_theo_vi_tri(
  khach: pg.PoolClient, nhan_vien_id: string, vi_tri_id: string,
): Promise<void> {
  await khach.query(
    `update cong_viec_mau_dinh_ky md set dang_bat = false
      where md.nhan_vien_id = $1
        and md.dau_viec_id in (select dv.id from dau_viec dv where dv.vi_tri_id = $2)`,
    [nhan_vien_id, vi_tri_id],
  );
}

/** Doc cac dau viec dang bat cua mot vi tri (dung khi gan vi tri). */
export async function dau_viec_cua_vi_tri(vi_tri_id: string): Promise<DongDauViecGon[]> {
  return truy_van<DongDauViecGon>(
    `select dv.id, dv.vi_tri_id, dv.ten, dv.mo_ta, dv.tan_suat,
            dv.muc_do_quan_trong, dv.ma_bc, dv.dang_bat
       from dau_viec dv where dv.vi_tri_id = $1 order by dv.thu_tu, dv.ten`,
    [vi_tri_id],
  );
}

/** Dong bo lai toan bo mau cua mot nhan vien theo cac vi tri dang giu. */
export async function dong_bo_mau_cua_nhan_vien(
  khach: pg.PoolClient, nhan_vien_id: string,
): Promise<void> {
  const ds = await khach.query<{ vi_tri_id: string }>(
    `select vi_tri_id from nhan_vien_vi_tri where nhan_vien_id = $1`, [nhan_vien_id],
  );
  for (const d of ds.rows) {
    const dvs = await dau_viec_cua_vi_tri(d.vi_tri_id);
    for (const dv of dvs) await tao_mau_tu_dau_viec(khach, dv, nhan_vien_id);
  }
}

/** Dem mau dang bat cua mot dau viec (dung cho goc nhin bao phu). */
export async function dem_mau_bat(dau_viec_id: string): Promise<number> {
  return thuc_thi(
    `select count(*)::int as n from cong_viec_mau_dinh_ky
      where dau_viec_id = $1 and dang_bat`,
    [dau_viec_id],
  );
}
