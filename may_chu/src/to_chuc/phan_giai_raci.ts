// Phan giai RACI tu VAI TRO (ceo/tp/tn/nv_cv/tbks) thanh NGUOI CU THE.
//
// RACI trong file JD dien theo chuc danh, khong theo ten nguoi — vi tri do khi nao
// co nguoi giu (qua nhan_vien_vi_tri) thi vai tro moi "song". Cac ham o day tra ve
// danh sach nhan_vien_id dang giu vai tro do cho MOT dau viec cu the.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import type { KieuNguoiRaci } from './kieu.ts';

/** Thong tin toi thieu cua dau viec de phan giai. */
export interface BoiCanhDauViec {
  vi_tri_id: string;
  phong_ban_id: string | null;
  /** Vi tri cua nguoi quan tri TN chi tiet (dau viec thuoc tn nao). */
  quan_tri_vi_tri_id: string | null;
}

/** Ma vi tri dac biet dung de phan giai (khop cot vi_tri.ma). */
const MA_CEO = 'CEO';
const MA_TBKS = 'TBKS';

async function nguoi_giu_vi_tri(vi_tri_id: string | null): Promise<string[]> {
  if (vi_tri_id === null) return [];
  const d = await truy_van<{ id: string }>(
    `select distinct nvv.nhan_vien_id as id
       from nhan_vien_vi_tri nvv
       join nhan_vien nv on nv.id = nvv.nhan_vien_id
      where nvv.vi_tri_id = $1
        and nv.dang_hoat_dong
        and (nvv.ket_thuc is null or nvv.ket_thuc >= current_date)`,
    [vi_tri_id],
  );
  return d.map((x) => x.id);
}

async function nguoi_giu_ma_vi_tri(ma: string): Promise<string[]> {
  const vt = await truy_van_mot<{ id: string }>(
    'select id from vi_tri where ma = $1 and dang_hoat_dong', [ma],
  );
  return nguoi_giu_vi_tri(vt?.id ?? null);
}

async function truong_phong_cua(phong_ban_id: string | null): Promise<string[]> {
  if (phong_ban_id === null) return nguoi_giu_ma_vi_tri(MA_CEO);
  const d = await truy_van_mot<{ truong_phong_id: string | null }>(
    'select truong_phong_id from phong_ban where id = $1', [phong_ban_id],
  );
  if (d?.truong_phong_id == null) return nguoi_giu_ma_vi_tri(MA_CEO);
  return [d.truong_phong_id];
}

/** Phan giai MOT kieu nguoi RACI thanh danh sach nhan_vien_id cu the. */
export async function phan_giai_kieu(
  kieu: KieuNguoiRaci, bc: BoiCanhDauViec,
): Promise<string[]> {
  switch (kieu) {
    case 'ceo':
      return nguoi_giu_ma_vi_tri(MA_CEO);
    case 'tp':
      return truong_phong_cua(bc.phong_ban_id);
    case 'tn': {
      const q = await nguoi_giu_vi_tri(bc.quan_tri_vi_tri_id);
      if (q.length > 0) return q;
      return truong_phong_cua(bc.phong_ban_id);
    }
    case 'nv_cv':
      return nguoi_giu_vi_tri(bc.vi_tri_id);
    case 'tbks': {
      const q = await nguoi_giu_ma_vi_tri(MA_TBKS);
      if (q.length > 0) return q;
      // Fallback: truong phong Ban Kiem soat (phong ten co san tren he thong).
      const d = await truy_van_mot<{ truong_phong_id: string | null }>(
        `select pb.truong_phong_id from phong_ban pb where pb.ten = 'Ban Kiểm soát'`,
      );
      return d?.truong_phong_id == null ? [] : [d.truong_phong_id];
    }
  }
}

/** Nguoi A (duyet) cua mot dau viec — khong co thi fallback nguoi giao (tp). */
export async function nguoi_duyet_cua_dau_viec(bc: BoiCanhDauViec): Promise<string[]> {
  const a = await phan_giai_kieu('tp', bc);
  if (a.length > 0) return a;
  return phan_giai_kieu('tbks', bc);
}
