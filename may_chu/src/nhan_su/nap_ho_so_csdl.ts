// Phan cham CSDL cua bo nap ho so. Luat doi chieu nam o `nap_ho_so.ts` (ham thuan).
import type pg from 'pg';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import type { CapDoiChieu, HoSoHienCo } from './nap_ho_so.ts';

/** Doc `nhan_vien` kem ngay quet cuoi cung — ngay do la can cu duy nhat de dat ngay nghi. */
export async function nap_ho_so_hien_co(): Promise<HoSoHienCo[]> {
  return truy_van<HoSoHienCo>(
    `select nv.id, nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong,
            nv.ngay_nghi_viec::text as ngay_nghi_viec,
            (select max((lq.thoi_diem + interval '7 hours')::date)::text
               from lan_quet lq where lq.nhan_vien_id = nv.id) as quet_cuoi
       from nhan_vien nv order by nv.ma_nv`);
}

export interface ODoi { truong: string; cu: string | null; moi: string | null }

/** Nhung o se doi cua mot nguoi. Chi ghi vao o dang TRONG — khong de len so lieu da co. */
export async function o_se_doi(c: CapDoiChieu): Promise<ODoi[]> {
  const h = c.ho_so;
  if (h === null) return [];
  const nv = await truy_van_mot<Record<string, string | null>>(
    `select nv.so_dien_thoai, nv.email, nv.chuc_danh, nv.ngay_vao::text as ngay_vao,
            hs.cccd_so, hs.ngay_sinh::text as ngay_sinh, hs.gioi_tinh,
            hs.dia_chi_thuong_tru, hs.noi_sinh
       from nhan_vien nv left join ho_so_ca_nhan hs on hs.nhan_vien_id = nv.id
      where nv.id = $1`, [h.id]);
  if (nv === null) return [];

  const d = c.dong;
  const doi: ODoi[] = [];
  const xet = (truong: string, cu: string | null, moi: string | null): void => {
    if (moi === null || moi === '') return;
    if (cu !== null && cu !== '') return; // da co so lieu -> khong de len
    doi.push({ truong, cu, moi });
  };
  xet('so_dien_thoai', nv['so_dien_thoai'] ?? null, d.so_dien_thoai);
  xet('email', nv['email'] ?? null, d.email);
  xet('chuc_danh', nv['chuc_danh'] ?? null, d.chuc_danh);
  xet('ngay_vao', nv['ngay_vao'] ?? null, d.ngay_vao);
  xet('cccd_so', nv['cccd_so'] ?? null, d.cccd);
  xet('ngay_sinh', nv['ngay_sinh'] ?? null, d.ngay_sinh);
  xet('gioi_tinh', nv['gioi_tinh'] ?? null, d.gioi_tinh);
  xet('dia_chi_thuong_tru', nv['dia_chi_thuong_tru'] ?? null, d.dia_chi_thuong_tru);
  xet('noi_sinh', nv['noi_sinh'] ?? null, d.que_quan);
  return doi;
}

const COT_NHAN_VIEN = new Set(['so_dien_thoai', 'email', 'chuc_danh', 'ngay_vao']);

// Ca hai ham ghi nhan `khach` chu khong dung `thuc_thi` cua pool. Pool cap mot ket noi KHAC
// cho moi lenh, nen `BEGIN` o ket noi nay va `UPDATE` o ket noi kia la khong nam trong cung
// mot giao dich — loi im lang, va chi lo ra khi mot lan chay hong giua chung.

/** Ghi that. `khach` phai la ket noi dang mo giao dich. */
export async function ghi_mot_nguoi(
  khach: pg.PoolClient, c: CapDoiChieu, doi: ODoi[],
): Promise<void> {
  const h = c.ho_so;
  if (h === null || doi.length === 0) return;

  const cua_nv = doi.filter((d) => COT_NHAN_VIEN.has(d.truong));
  if (cua_nv.length > 0) {
    const dat = cua_nv.map((d, i) => `${d.truong} = $${String(i + 2)}`).join(', ');
    await khach.query(
      `update nhan_vien set ${dat}, cap_nhat_luc = now() where id = $1`,
      [h.id, ...cua_nv.map((d) => d.moi)]);
  }

  const cua_hs = doi.filter((d) => !COT_NHAN_VIEN.has(d.truong));
  if (cua_hs.length > 0) {
    // `on conflict` chi de len o DANG TRONG: chay lai lenh nay khong duoc xoa so lieu ai do
    // vua sua tay tren web giua hai lan chay.
    const cot = cua_hs.map((d) => d.truong);
    const cho = cot.map((_, i) => `$${String(i + 2)}`);
    const dat = cot.map((c2) => `${c2} = coalesce(ho_so_ca_nhan.${c2}, excluded.${c2})`);
    await khach.query(
      `insert into ho_so_ca_nhan (nhan_vien_id, ${cot.join(', ')})
       values ($1, ${cho.join(', ')})
       on conflict (nhan_vien_id) do update set ${dat.join(', ')}, cap_nhat_luc = now()`,
      [h.id, ...cua_hs.map((d) => d.moi)]);
  }
}

/** Tat hoat dong va ghi ngay nghi. Ngay null = van tat, nhung bao ra de nhan su dien sau. */
export async function tat_hoat_dong(
  khach: pg.PoolClient, id: string, ngay_nghi: string | null,
): Promise<void> {
  await khach.query(
    `update nhan_vien
        set dang_hoat_dong = false,
            ngay_nghi_viec = coalesce(ngay_nghi_viec, $2::date),
            cap_nhat_luc = now()
      where id = $1`, [id, ngay_nghi]);
}
