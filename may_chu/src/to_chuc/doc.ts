// Cau truy van DOC (xem) cho module to chuc: danh muc, bao phu trach nhiem,
// do luong nhan su, trach nhiem cua toi. Khong sua du lieu — ghi nam o ghi.ts.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import type { DongDauViec, DongNhom, DongRaci, DongTn, DongViTri } from './kieu.ts';

const COT_VI_TRI = `
  vt.id, vt.ma, vt.ten, vt.cap_bac, vt.pham_vi, vt.phong_ban_id, vt.mo_ta,
  vt.dang_hoat_dong, pb.ten as ten_phong_ban,
  (select count(*)::int from dau_viec dv where dv.vi_tri_id = vt.id) as so_dau_viec,
  (select count(distinct nvv.nhan_vien_id)::int from nhan_vien_vi_tri nvv
     join nhan_vien nv2 on nv2.id = nvv.nhan_vien_id and nv2.dang_hoat_dong
    where nvv.vi_tri_id = vt.id) as so_nguoi_gui`;

/** Danh sach vi tri (co loc phong va trang thai hoat dong). */
export async function danh_sach_vi_tri(phong_ban_id: string | null = null): Promise<DongViTri[]> {
  const phan = phong_ban_id === null
    ? ''
    : (phong_ban_id === '' ? 'where vt.pham_vi <> \'cu_the\'' : 'where vt.phong_ban_id = $1');
  const ts = phong_ban_id === null || phong_ban_id === '' ? [] : [phong_ban_id];
  return truy_van<DongViTri>(
    `select ${COT_VI_TRI}
       from vi_tri vt left join phong_ban pb on pb.id = vt.phong_ban_id
      ${phan}
      order by vt.ten`,
    ts,
  );
}

/** Danh sach nhom trach nhiem kem so task. */
export async function danh_sach_nhom(): Promise<DongNhom[]> {
  return truy_van<DongNhom>(
    `select n.id, n.ma, n.ten,
            (select count(*)::int from dau_viec dv where dv.nhom_id = n.id) as so_task
       from nhom_trach_nhiem n
      order by nullif(regexp_replace(n.ma, '\D', '', 'g'), '')::int nulls last, n.ma`,
  );
}

/** Danh sach tn chi tiet cua mot nhom (hoac tat ca). */
export async function danh_sach_tn(nhom_id: string | null = null): Promise<DongTn[]> {
  return truy_van<DongTn>(
    `select t.id, t.nhom_id, t.ma, t.ten, t.nguoi_quan_tri_vi_tri_id,
            qt.ten as ten_nguoi_quan_tri,
            (select count(*)::int from dau_viec dv where dv.tn_chi_tiet_id = t.id) as so_task
       from tn_chi_tiet t
       left join vi_tri qt on qt.id = t.nguoi_quan_tri_vi_tri_id
      ${nhom_id === null ? '' : 'where t.nhom_id = $1'}
      order by nullif(regexp_replace(coalesce(t.ma, ''), '\D', '', 'g'), '')::int nulls last,
               t.ma`,
    nhom_id === null ? [] : [nhom_id],
  );
}

/** Doc mot dau viec kem RACI va buoc (checklist). */
export async function dau_viec_theo_id(id: string): Promise<DongDauViec | null> {
  const d = await truy_van_mot<Omit<DongDauViec, 'raci' | 'buoc'>>(
    `select dv.id, dv.vi_tri_id, vt.ten as ten_vi_tri, dv.ten, dv.mo_ta,
            dv.nhom_id, nh.ten as ten_nhom, dv.tn_chi_tiet_id, tc.ten as ten_tn,
            dv.phong_ban_id, pb.ten as ten_phong_ban,
            dv.input, dv.output, dv.kpi, dv.co_bc, dv.ma_bc, dv.trang_thai_ma_bc,
            dv.tan_suat, dv.tan_suat_tho, dv.sla, dv.phan_cap_xu_ly,
            dv.muc_do_quan_trong, dv.ghi_chu, dv.dang_bat
       from dau_viec dv
       left join vi_tri vt on vt.id = dv.vi_tri_id
       left join nhom_trach_nhiem nh on nh.id = dv.nhom_id
       left join tn_chi_tiet tc on tc.id = dv.tn_chi_tiet_id
       left join phong_ban pb on pb.id = dv.phong_ban_id
      where dv.id = $1`,
    [id],
  );
  if (d === null) return null;
  const raci = await truy_van<DongRaci>(
    `select vai_tro, kieu_nguoi from dau_viec_raci where dau_viec_id = $1
      order by case vai_tro when 'R' then 0 when 'A' then 1 when 'C' then 2 else 3 end,
               kieu_nguoi`,
    [id],
  );
  const buoc = await truy_van<{ id: string; ten: string; mo_ta: string | null; thu_tu: number }>(
    `select id, ten, mo_ta, thu_tu from dau_viec_buoc where dau_viec_id = $1 order by thu_tu, tao_luc`,
    [id],
  );
  return { ...d, raci, buoc };
}

/** Tat ca dau viec cua mot vi tri (gon, khong raci/buoc). */
export async function dau_viec_cua(vi_tri_id: string): Promise<DongDauViec[]> {
  const ids = await truy_van<{ id: string }>(
    'select id from dau_viec where vi_tri_id = $1 order by thu_tu, ten', [vi_tri_id],
  );
  const kq: DongDauViec[] = [];
  for (const d of ids) {
    const chi_tiet = await dau_viec_theo_id(d.id);
    if (chi_tiet !== null) kq.push(chi_tiet);
  }
  return kq;
}

/**
 * Bao phu trach nhiem: moi tn chi tiet co bao nhieu task, bao nhieu DA CO NGUOI
 * thuc hien (vi tri duoc gan cho nhan vien dang lam), bao nhieu dang sinh viec.
 */
export interface DongBaoPhuTn {
  id: string;
  nhom_id: string;
  ma: string | null;
  ten: string;
  ten_nguoi_quan_tri: string | null;
  so_task: number;
  so_task_co_nguoi: number;
  so_task_dang_chay: number;
  so_task_tat: number;
}

export async function bao_phu_theo_tn(): Promise<DongBaoPhuTn[]> {
  return truy_van<DongBaoPhuTn>(
    `select t.id, t.nhom_id, t.ma, t.ten, qt.ten as ten_nguoi_quan_tri,
            count(dv.id)::int as so_task,
            count(dv.id) filter (where exists (
              select 1 from nhan_vien_vi_tri nvv
               join nhan_vien nv on nv.id = nvv.nhan_vien_id and nv.dang_hoat_dong
              where nvv.vi_tri_id = dv.vi_tri_id
            ))::int as so_task_co_nguoi,
            count(dv.id) filter (where exists (
              select 1 from cong_viec_mau_dinh_ky md
              where md.dau_viec_id = dv.id and md.dang_bat
            ))::int as so_task_dang_chay,
            count(dv.id) filter (where not dv.dang_bat)::int as so_task_tat
       from tn_chi_tiet t
       left join vi_tri qt on qt.id = t.nguoi_quan_tri_vi_tri_id
       left join dau_viec dv on dv.tn_chi_tiet_id = t.id
      group by t.id, t.nhom_id, t.ma, t.ten, qt.ten
      order by t.nhom_id, t.ma`,
  );
}

/** Thong ke dau viec KHONG co nguoi thuc hien (lo hong bao phu). */
export async function dau_viec_lo_hong(): Promise<{
  id: string; ten: string; ten_vi_tri: string | null; ten_tn: string | null;
}[]> {
  return truy_van(
    `select dv.id, dv.ten, vt.ten as ten_vi_tri, tc.ten as ten_tn
       from dau_viec dv
       left join vi_tri vt on vt.id = dv.vi_tri_id
       left join tn_chi_tiet tc on tc.id = dv.tn_chi_tiet_id
      where dv.dang_bat
        and not exists (
          select 1 from nhan_vien_vi_tri nvv
           join nhan_vien nv on nv.id = nvv.nhan_vien_id and nv.dang_hoat_dong
          where nvv.vi_tri_id = dv.vi_tri_id
        )
      order by dv.ten`,
  );
}

/**
 * Trach nhiem cua toi: tu cac vi tri nhan vien dang giu -> cac dau viec, gom theo
 * tn chi tiet, kem trang thai cua viec MOI NHAT (theo ky) de nhan vien biet minh
 * da lam du hay chua.
 */
export interface DongTrachNhiemViec {
  dau_viec_id: string;
  ten_dau_viec: string;
  ten_vi_tri: string | null;
  tan_suat: string;
  ma_bc: string | null;
  kpi: string | null;
  sla: string | null;
  viec_id: string | null;
  viec_trang_thai: string | null;
  viec_han: string | null;
  co_bao_cao: boolean;
  bao_cao_trang_thai: string | null;
}

export interface DongTrachNhiemNhom {
  nhom_id: string;
  nhom_ten: string;
  tn_chi_tiet_id: string | null;
  tn_chi_tiet_ten: string | null;
  ten_nguoi_quan_tri: string | null;
  so_viec: number;
  so_xong: number;
  so_cho_duyet: number;
  so_qua_han: number;
  so_chua: number;
  viec: DongTrachNhiemViec[];
}

/** Trang thai viec gan nhat cua tung dau viec ma nhan vien nay phai lam. */
export async function trach_nhiem_cua_nhan_vien(
  nhan_vien_id: string,
): Promise<DongTrachNhiemNhom[]> {
  const dong = await truy_van<DongTrachNhiemViec & {
    nhom_id: string; nhom_ten: string; tn_id: string | null; tn_ten: string | null;
    ten_quan_tri: string | null;
  }>(
    `select distinct
            dv.id as dau_viec_id, dv.ten as ten_dau_viec, vt.ten as ten_vi_tri,
            dv.tan_suat, dv.ma_bc, dv.kpi, dv.sla,
            nh.id as nhom_id, nh.ten as nhom_ten,
            tc.id as tn_id, tc.ten as tn_ten, qt.ten as ten_quan_tri,
            v.id as viec_id, v.trang_thai as viec_trang_thai,
            to_char(v.han, 'YYYY-MM-DD') as viec_han,
            case when bc.id is not null then true else false end as co_bao_cao,
            bc.trang_thai as bao_cao_trang_thai
       from nhan_vien_vi_tri nvv
       join dau_viec dv on dv.vi_tri_id = nvv.vi_tri_id
       join nhom_trach_nhiem nh on nh.id = dv.nhom_id
       left join tn_chi_tiet tc on tc.id = dv.tn_chi_tiet_id
       left join vi_tri qt on qt.id = tc.nguoi_quan_tri_vi_tri_id
       left join vi_tri vt on vt.id = dv.vi_tri_id
       left join lateral (
         select cv.id, cv.trang_thai, cv.han
           from cong_viec cv
          where cv.nhan_vien_id = nvv.nhan_vien_id
            and cv.dau_viec_id = dv.id
          order by cv.tao_luc desc
          limit 1
       ) v on true
       left join lateral (
         select bc2.id, bc2.trang_thai
           from bao_cao bc2
          where bc2.nhan_vien_id = nvv.nhan_vien_id
            and bc2.dau_viec_id = dv.id
          order by bc2.tao_luc desc
          limit 1
       ) bc on true
      where nvv.nhan_vien_id = $1
      order by nhom_id, tn_id, ten_dau_viec`,
    [nhan_vien_id],
  );

  const nhom = new Map<string, DongTrachNhiemNhom>();
  for (const d of dong) {
    const khoa = `${d.nhom_id}\u0000${d.tn_id ?? ''}`;
    let n = nhom.get(khoa);
    if (n === undefined) {
      n = {
        nhom_id: d.nhom_id, nhom_ten: d.nhom_ten,
        tn_chi_tiet_id: d.tn_id, tn_chi_tiet_ten: d.tn_ten,
        ten_nguoi_quan_tri: d.ten_quan_tri,
        so_viec: 0, so_xong: 0, so_cho_duyet: 0, so_qua_han: 0, so_chua: 0,
        viec: [],
      };
      nhom.set(khoa, n);
    }
    n.viec.push({
      dau_viec_id: d.dau_viec_id, ten_dau_viec: d.ten_dau_viec,
      ten_vi_tri: d.ten_vi_tri, tan_suat: d.tan_suat, ma_bc: d.ma_bc,
      kpi: d.kpi, sla: d.sla, viec_id: d.viec_id,
      viec_trang_thai: d.viec_trang_thai, viec_han: d.viec_han,
      co_bao_cao: d.co_bao_cao, bao_cao_trang_thai: d.bao_cao_trang_thai,
    });
    n.so_viec++;
    if (d.viec_trang_thai === 'hoan_thanh') n.so_xong++;
    else if (d.viec_trang_thai === 'cho_duyet') n.so_cho_duyet++;
    else if (d.viec_trang_thai === 'khong_hoan_thanh') n.so_qua_han++;
    else n.so_chua++;
  }
  return [...nhom.values()];
}

/**
 * Do luong lam tron trach nhiem theo nhan vien: tong dau viec dang giu + ket qua
 * viec gan nhat trong ky. Dung cho tab Do luong (goc quan tri).
 */
export interface DongDoLuongNv {
  nhan_vien_id: string;
  ho_ten: string | null;
  ma_nv: string | null;
  ten_phong_ban: string | null;
  so_vi_tri: number;
  so_dau_viec: number;
  so_viec: number;
  so_xong: number;
  so_cho_duyet: number;
  so_qua_han: number;
}

export async function do_luong_theo_nhan_vien(): Promise<DongDoLuongNv[]> {
  return truy_van<DongDoLuongNv>(
    `select nv.id as nhan_vien_id, nv.ho_ten, nv.ma_nv, pb.ten as ten_phong_ban,
            (select count(*)::int from nhan_vien_vi_tri nvv where nvv.nhan_vien_id = nv.id) as so_vi_tri,
            (select count(*)::int from dau_viec dv
              where dv.vi_tri_id in (select nvv2.vi_tri_id from nhan_vien_vi_tri nvv2
                                     where nvv2.nhan_vien_id = nv.id)) as so_dau_viec,
            (select count(*)::int from cong_viec cv
              where cv.nhan_vien_id = nv.id and cv.dau_viec_id is not null
                and cv.tao_luc >= date_trunc('month', now())) as so_viec,
            (select count(*)::int from cong_viec cv
              where cv.nhan_vien_id = nv.id and cv.dau_viec_id is not null
                and cv.tao_luc >= date_trunc('month', now())
                and cv.trang_thai = 'hoan_thanh') as so_xong,
            (select count(*)::int from cong_viec cv
              where cv.nhan_vien_id = nv.id and cv.dau_viec_id is not null
                and cv.tao_luc >= date_trunc('month', now())
                and cv.trang_thai = 'cho_duyet') as so_cho_duyet,
            (select count(*)::int from cong_viec cv
              where cv.nhan_vien_id = nv.id and cv.dau_viec_id is not null
                and cv.tao_luc >= date_trunc('month', now())
                and cv.trang_thai = 'khong_hoan_thanh') as so_qua_han
       from nhan_vien nv
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where nv.dang_hoat_dong
        and exists (select 1 from nhan_vien_vi_tri nvv where nvv.nhan_vien_id = nv.id)
      order by nv.ho_ten`,
  );
}

/** Danh muc ma bao cao + so dau viec dung ma do + tinh hinh nop gan day. */
export async function danh_sach_ma_bc(): Promise<{
  id: string; ma: string; ten: string | null; trang_thai: 'de_xuat' | 'chuan'; so_dau_viec: number;
  so_da_nop: number; nop_gan_nhat: string | null;
}[]> {
  return truy_van(
    `select b.id, b.ma, b.ten, b.trang_thai,
            (select count(*)::int from dau_viec dv where dv.ma_bc = b.ma) as so_dau_viec,
            (select count(*)::int from bao_cao bc
              where bc.ma_bc = b.ma and bc.tao_luc >= now() - interval '30 days') as so_da_nop,
            (select to_char(max(bc2.tao_luc), 'YYYY-MM-DD') from bao_cao bc2
              where bc2.ma_bc = b.ma) as nop_gan_nhat
       from bao_cao_mau b
      order by b.trang_thai, b.ma`,
  );
}
