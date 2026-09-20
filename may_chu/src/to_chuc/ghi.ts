// GHI du lieu module to chuc: tao/sua vi tri, dau viec (kem SAO CHEP tu checklist
// da co), RACI, buoc (step), gan vi tri cho nhan vien (kiem nhiem).
//
// Phan quyen:
//   - nhan su / admin: toan quyen danh muc.
//   - TP chu TN chi tiet (nguoi quan tri cua khoi do): duoc SUA RULE cac dau viec
//     thuoc TN chi tiet minh quan ly, khong duoc dung TN chi tiet khac.
import type pg from 'pg';
import { trong_giao_dich, truy_van_mot, thuc_thi, truy_van } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiKhongQuyen, LoiKhongTim } from '../tien_ich/kiem_tra.ts';
import { la_vai_tro_nhan_su } from '../bao_mat/quyen_ho_so.ts';
import type { NguoiXem } from '../viec/quyen.ts';
import { dau_viec_theo_id } from './doc.ts';
import { dau_viec_cua_vi_tri, tao_mau_tu_dau_viec, tat_mau_theo_vi_tri } from './sinh_mau.ts';
import type { CapBac, DongBuoc, DongRaci, TanSuat } from './kieu.ts';

// ---------------------------------------------------------------- quyen
interface NguoiVaiTro { vai_tro: string; nv: string | null }

/** Nguoi dung co quyen sua RULE cua dau viec nay khong. */
export async function kiem_quyen_sua_dau_viec(
  nd: NguoiVaiTro, dau_viec_id: string,
): Promise<void> {
  if (la_vai_tro_nhan_su(nd.vai_tro)) return;
  if (nd.nv === null) throw new LoiKhongQuyen('Bạn không có quyền thay đổi đầu việc.');
  const d = await truy_van_mot<{ quan_tri_vi_tri_id: string | null }>(
    `select tc.nguoi_quan_tri_vi_tri_id as quan_tri_vi_tri_id
       from dau_viec dv
       left join tn_chi_tiet tc on tc.id = dv.tn_chi_tiet_id
      where dv.id = $1`,
    [dau_viec_id],
  );
  if (d === null) throw new LoiKhongTim('Không tìm thấy đầu việc.');
  const dc = await truy_van_mot<{ n: number }>(
    `select count(*)::int as n from nhan_vien_vi_tri
      where nhan_vien_id = $1 and vi_tri_id = $2`,
    [nd.nv, d.quan_tri_vi_tri_id ?? ''],
  );
  if ((dc?.n ?? 0) === 0) {
    throw new LoiKhongQuyen(
      'Chỉ trưởng phòng quản lý trách nhiệm chi tiết này mới được sửa rule công việc.',
    );
  }
}

/** Kiem tra nguoi dang xem co giu vi tri quan tri cua mot tn chi tiet khong. */
export async function quan_tri_duoc_tn(nd: NguoiVaiTro, tn_id: string): Promise<boolean> {
  if (la_vai_tro_nhan_su(nd.vai_tro)) return true;
  if (nd.nv === null) return false;
  const d = await truy_van_mot<{ n: number }>(
    `select count(*)::int as n
       from tn_chi_tiet tc
       join nhan_vien_vi_tri nvv on nvv.vi_tri_id = tc.nguoi_quan_tri_vi_tri_id
      where tc.id = $1 and nvv.nhan_vien_id = $2`,
    [tn_id, nd.nv],
  );
  return (d?.n ?? 0) > 0;
}

// ---------------------------------------------------------------- dau vao
export interface DauVaoViTri {
  ma: string;
  ten: string;
  cap_bac: CapBac;
  pham_vi: 'cu_the' | 'toan_cong_ty' | 'moi_phong';
  phong_ban_id: string | null;
  mo_ta: string | null;
  dang_hoat_dong?: boolean;
}

export interface DauVaoDauViec {
  vi_tri_id: string;
  ten: string;
  mo_ta: string | null;
  nhom_id: string;
  tn_chi_tiet_id: string | null;
  phong_ban_id: string | null;
  input: string | null;
  output: string | null;
  kpi: string | null;
  co_bc: boolean;
  ma_bc: string | null;
  trang_thai_ma_bc: 'de_xuat' | 'chuan' | null;
  tan_suat: TanSuat;
  tan_suat_tho: string | null;
  sla: string | null;
  phan_cap_xu_ly: string | null;
  muc_do_quan_trong: 'cao' | 'rat_cao' | 'trung_binh';
  ghi_chu: string | null;
  raci: DongRaci[];
  buoc: Omit<DongBuoc, 'id'>[];
}

// ---------------------------------------------------------------- vi tri
export async function tao_vi_tri(d: DauVaoViTri): Promise<{ id: string }> {
  try {
    return await trong_giao_dich(async (khach) => {
      const kq = await khach.query<{ id: string }>(
        `insert into vi_tri(ma, ten, cap_bac, pham_vi, phong_ban_id, mo_ta)
         values ($1,$2,$3,$4,$5,$6) returning id`,
        [d.ma, d.ten, d.cap_bac, d.pham_vi, d.phong_ban_id, d.mo_ta],
      );
      const id = kq.rows[0]?.id;
      if (id === undefined) throw new LoiDauVao('Không tạo được vị trí.');
      return { id };
    });
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      throw new LoiDauVao('Mã hoặc tên vị trí đã tồn tại.');
    }
    throw e;
  }
}

export async function sua_vi_tri(id: string, d: Partial<DauVaoViTri>): Promise<void> {
  const so = await thuc_thi(
    `update vi_tri set
       ten = coalesce($2, ten),
       cap_bac = coalesce($3, cap_bac),
       pham_vi = coalesce($4, pham_vi),
       mo_ta = coalesce($5, mo_ta),
       dang_hoat_dong = coalesce($6, dang_hoat_dong),
       phong_ban_id = case when $7::boolean then $8::uuid else phong_ban_id end
     where id = $1`,
    [id, d.ten ?? null, d.cap_bac ?? null, d.pham_vi ?? null, d.mo_ta ?? null,
      d.dang_hoat_dong === undefined ? null : d.dang_hoat_dong,
      d.phong_ban_id !== undefined, d.phong_ban_id],
  );
  if (so === 0) throw new LoiKhongTim('Không tìm thấy vị trí.');
}

// ---------------------------------------------------------------- dau viec
function kiem_dau_viec_hop_le(d: DauVaoDauViec): void {
  if (d.co_bc && (d.ma_bc === null || d.ma_bc.trim() === '')) {
    throw new LoiDauVao('Đầu việc có báo cáo phải có mã báo cáo.');
  }
}

async function chen_dau_viec(
  khach: pg.PoolClient, d: DauVaoDauViec,
): Promise<string> {
  kiem_dau_viec_hop_le(d);
  const kq = await khach.query<{ id: string }>(
    `insert into dau_viec
       (vi_tri_id, ten, mo_ta, nhom_id, tn_chi_tiet_id, phong_ban_id, input, output,
        kpi, co_bc, ma_bc, trang_thai_ma_bc, tan_suat, tan_suat_tho, sla,
        phan_cap_xu_ly, muc_do_quan_trong, ghi_chu, dang_bat, thu_tu)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,true,
             coalesce((select max(thu_tu) + 1 from dau_viec x where x.vi_tri_id = $1), 0))
     returning id`,
    [d.vi_tri_id, d.ten, d.mo_ta, d.nhom_id, d.tn_chi_tiet_id, d.phong_ban_id,
      d.input, d.output, d.kpi, d.co_bc, d.ma_bc, d.trang_thai_ma_bc, d.tan_suat,
      d.tan_suat_tho, d.sla, d.phan_cap_xu_ly, d.muc_do_quan_trong, d.ghi_chu],
  );
  const id = kq.rows[0]?.id;
  if (id === undefined) throw new LoiDauVao('Không tạo được đầu việc.');
  for (const r of d.raci) {
    await khach.query(
      `insert into dau_viec_raci(dau_viec_id, vai_tro, kieu_nguoi)
       values ($1,$2,$3) on conflict (dau_viec_id, vai_tro, kieu_nguoi) do nothing`,
      [id, r.vai_tro, r.kieu_nguoi],
    );
  }
  for (const [i, b] of d.buoc.entries()) {
    await khach.query(
      'insert into dau_viec_buoc(dau_viec_id, ten, mo_ta, thu_tu) values ($1,$2,$3,$4)',
      [id, b.ten, b.mo_ta, b.thu_tu ?? i],
    );
  }
  return id;
}

/** Tao dau viec moi bam vao TN chi tiet (co san hoac moi) + sinh mau cho nguoi dang giu vi tri. */
export async function tao_dau_viec(d: DauVaoDauViec): Promise<{ id: string }> {
  try {
    const id = await trong_giao_dich((khach) => chen_dau_viec(khach, d));
    await dong_bo_mau_vi_tri(d.vi_tri_id);
    return { id };
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      throw new LoiDauVao('Vị trí này đã có đầu việc cùng tên.');
    }
    throw e;
  }
}

/**
 * SAO CHEP mot dau viec da co (kem RACI + buoc checklist) sang vi tri / tn chi tiet
 * dich — dung de them nhanh task moi tu task mau.
 */
export async function sao_chep_dau_viec(
  tu_id: string, den: { vi_tri_id?: string; tn_chi_tiet_id?: string | null; ten?: string },
): Promise<{ id: string }> {
  const goc = await dau_viec_theo_id(tu_id);
  if (goc === null) throw new LoiKhongTim('Không tìm thấy đầu việc mẫu.');
  const d: DauVaoDauViec = {
    vi_tri_id: den.vi_tri_id ?? goc.vi_tri_id,
    ten: den.ten ?? `${goc.ten} (sao chép)`,
    mo_ta: goc.mo_ta,
    nhom_id: goc.nhom_id,
    tn_chi_tiet_id: den.tn_chi_tiet_id === undefined ? goc.tn_chi_tiet_id : den.tn_chi_tiet_id,
    phong_ban_id: goc.phong_ban_id,
    input: goc.input, output: goc.output, kpi: goc.kpi,
    co_bc: goc.co_bc, ma_bc: goc.ma_bc, trang_thai_ma_bc: goc.trang_thai_ma_bc,
    tan_suat: goc.tan_suat, tan_suat_tho: goc.tan_suat_tho,
    sla: goc.sla, phan_cap_xu_ly: goc.phan_cap_xu_ly,
    muc_do_quan_trong: goc.muc_do_quan_trong,
    ghi_chu: goc.ghi_chu,
    raci: goc.raci,
    buoc: goc.buoc.map((b) => ({ ten: b.ten, mo_ta: b.mo_ta, thu_tu: b.thu_tu })),
  };
  return tao_dau_viec(d);
}

/** Sua rule cua dau viec (chi nhan su/admin hoac TP quan tri TN chi tiet). */
export async function sua_dau_viec(
  nd: NguoiXem, id: string, d: Partial<DauVaoDauViec>,
): Promise<void> {
  await kiem_quyen_sua_dau_viec(nd, id);
  const so = await thuc_thi(
    `update dau_viec set
       ten = coalesce($2, ten),
       mo_ta = coalesce($3, mo_ta),
       tn_chi_tiet_id = case when $4::boolean then $5::uuid else tn_chi_tiet_id end,
       input = coalesce($6, input),
       output = coalesce($7, output),
       kpi = coalesce($8, kpi),
       ma_bc = coalesce($9, ma_bc),
       trang_thai_ma_bc = coalesce($10, trang_thai_ma_bc),
       tan_suat = coalesce($11, tan_suat),
       tan_suat_tho = coalesce($12, tan_suat_tho),
       sla = coalesce($13, sla),
       phan_cap_xu_ly = coalesce($14, phan_cap_xu_ly),
       muc_do_quan_trong = coalesce($15, muc_do_quan_trong),
       ghi_chu = coalesce($16, ghi_chu),
       co_bc = coalesce($17, co_bc)
     where id = $1`,
    [id, d.ten ?? null, d.mo_ta ?? null, d.tn_chi_tiet_id !== undefined, d.tn_chi_tiet_id,
      d.input ?? null, d.output ?? null, d.kpi ?? null, d.ma_bc ?? null,
      d.trang_thai_ma_bc ?? null, d.tan_suat ?? null, d.tan_suat_tho ?? null,
      d.sla ?? null, d.phan_cap_xu_ly ?? null, d.muc_do_quan_trong ?? null,
      d.ghi_chu ?? null, d.co_bc ?? null],
  );
  if (so === 0) throw new LoiKhongTim('Không tìm thấy đầu việc.');
  const dv = await dau_viec_theo_id(id);
  if (dv !== null) await dong_bo_mau_vi_tri(dv.vi_tri_id);
}

/** Bat / tat sinh viec tu dong cho dau viec + dong bo mau. */
export async function doi_dang_bat(nd: NguoiXem, id: string, dang_bat: boolean): Promise<void> {
  await kiem_quyen_sua_dau_viec(nd, id);
  const so = await thuc_thi('update dau_viec set dang_bat = $2 where id = $1', [id, dang_bat]);
  if (so === 0) throw new LoiKhongTim('Không tìm thấy đầu việc.');
  await thuc_thi(
    `update cong_viec_mau_dinh_ky set dang_bat = $2 where dau_viec_id = $1`,
    [id, dang_bat],
  );
}

/** Thay toan bo RACI cua mot dau viec (user tu nhap / chinh sau). */
export async function dat_raci(
  nd: NguoiXem, dau_viec_id: string, raci: DongRaci[],
): Promise<void> {
  await kiem_quyen_sua_dau_viec(nd, dau_viec_id);
  const d = await truy_van_mot<{ id: string }>('select id from dau_viec where id = $1', [dau_viec_id]);
  if (d === null) throw new LoiKhongTim('Không tìm thấy đầu việc.');
  await trong_giao_dich(async (khach) => {
    await khach.query('delete from dau_viec_raci where dau_viec_id = $1', [dau_viec_id]);
    for (const r of raci) {
      await khach.query(
        `insert into dau_viec_raci(dau_viec_id, vai_tro, kieu_nguoi) values ($1,$2,$3)`,
        [dau_viec_id, r.vai_tro, r.kieu_nguoi],
      );
    }
  });
}

/** Thay toan bo buoc (step checklist) cua dau viec. */
export async function dat_buoc(
  nd: NguoiXem, dau_viec_id: string, buoc: Omit<DongBuoc, 'id'>[],
): Promise<void> {
  await kiem_quyen_sua_dau_viec(nd, dau_viec_id);
  await trong_giao_dich(async (khach) => {
    await khach.query('delete from dau_viec_buoc where dau_viec_id = $1', [dau_viec_id]);
    for (const [i, b] of buoc.entries()) {
      await khach.query(
        'insert into dau_viec_buoc(dau_viec_id, ten, mo_ta, thu_tu) values ($1,$2,$3,$4)',
        [dau_viec_id, b.ten, b.mo_ta, b.thu_tu ?? i],
      );
    }
  });
}

// ---------------------------------------------------------------- gan vi tri cho nhan vien
/** Dong bo mau dinh ky cua moi nguoi dang giu mot vi tri (sau khi doi rule). */
async function dong_bo_mau_vi_tri(vi_tri_id: string): Promise<void> {
  const dvs = await dau_viec_cua_vi_tri(vi_tri_id);
  const ds = await truy_van<{ nhan_vien_id: string }>(
    `select distinct nvv.nhan_vien_id from nhan_vien_vi_tri nvv
      where nvv.vi_tri_id = $1`,
    [vi_tri_id],
  );
  await trong_giao_dich(async (khach) => {
    for (const n of ds) {
      for (const dv of dvs) {
        await tao_mau_tu_dau_viec(khach, {
          id: dv.id, vi_tri_id: dv.vi_tri_id, ten: dv.ten, mo_ta: dv.mo_ta,
          tan_suat: dv.tan_suat, muc_do_quan_trong: dv.muc_do_quan_trong,
          ma_bc: dv.ma_bc, dang_bat: dv.dang_bat,
        }, n.nhan_vien_id);
      }
    }
  });
}

/**
 * Gan them mot vi tri cho nhan vien (kiem nhiem). Sinh mau dinh ky cho cac dau viec
 * cua vi tri do. `la_chinh` thi xoa co chinh cua cac vi tri khac.
 */
export async function gan_vi_tri(
  nd: NguoiXem, nhan_vien_id: string, vi_tri_id: string, la_chinh: boolean,
): Promise<void> {
  if (!la_vai_tro_nhan_su(nd.vai_tro) && nd.nv !== nhan_vien_id) {
    throw new LoiKhongQuyen('Chỉ nhân sự mới được gán vị trí cho người khác.');
  }
  const vt = await truy_van_mot<{ id: string }>('select id from vi_tri where id = $1', [vi_tri_id]);
  if (vt === null) throw new LoiKhongTim('Không tìm thấy vị trí.');
  await trong_giao_dich(async (khach) => {
    if (la_chinh) {
      await khach.query('update nhan_vien_vi_tri set la_chinh = false where nhan_vien_id = $1', [nhan_vien_id]);
    }
    await khach.query(
      `insert into nhan_vien_vi_tri(nhan_vien_id, vi_tri_id, la_chinh)
       values ($1,$2,$3) on conflict (nhan_vien_id, vi_tri_id)
       do update set la_chinh = nhan_vien_vi_tri.la_chinh or $3`,
      [nhan_vien_id, vi_tri_id, la_chinh],
    );
    const dvs = await dau_viec_cua_vi_tri(vi_tri_id);
    for (const dv of dvs) {
      await tao_mau_tu_dau_viec(khach, {
        id: dv.id, vi_tri_id: dv.vi_tri_id, ten: dv.ten, mo_ta: dv.mo_ta,
        tan_suat: dv.tan_suat, muc_do_quan_trong: dv.muc_do_quan_trong,
        ma_bc: dv.ma_bc, dang_bat: dv.dang_bat,
      }, nhan_vien_id);
    }
  });
  await dong_bo_chuc_danh(nhan_vien_id);
}

/** Bo mot vi tri cua nhan vien (tat mau dinh ky tuong ung). */
export async function bo_vi_tri(
  nd: NguoiXem, nhan_vien_id: string, vi_tri_id: string,
): Promise<void> {
  if (!la_vai_tro_nhan_su(nd.vai_tro) && nd.nv !== nhan_vien_id) {
    throw new LoiKhongQuyen('Chỉ nhân sự mới được gỡ vị trí của người khác.');
  }
  await trong_giao_dich(async (khach) => {
    const kq = await khach.query(
      'delete from nhan_vien_vi_tri where nhan_vien_id = $1 and vi_tri_id = $2 returning la_chinh',
      [nhan_vien_id, vi_tri_id],
    );
    if (kq.rows.length === 0) throw new LoiKhongTim('Nhân viên không giữ vị trí này.');
    await tat_mau_theo_vi_tri(khach, nhan_vien_id, vi_tri_id);
  });
  await dong_bo_chuc_danh(nhan_vien_id);
}

/** Dong bo nhan_vien.chuc_danh + vi_tri_chinh_id theo cac vi tri dang giu. */
async function dong_bo_chuc_danh(nhan_vien_id: string): Promise<void> {
  const chinh = await truy_van_mot<{ vi_tri_id: string; ten: string }>(
    `select nvv.vi_tri_id, vt.ten from nhan_vien_vi_tri nvv
       join vi_tri vt on vt.id = nvv.vi_tri_id
      where nvv.nhan_vien_id = $1 and nvv.la_chinh limit 1`,
    [nhan_vien_id],
  );
  if (chinh !== null) {
    await thuc_thi(
      `update nhan_vien set vi_tri_chinh_id = $2, chuc_danh = $3, cap_nhat_luc = now()
        where id = $1`,
      [nhan_vien_id, chinh.vi_tri_id, chinh.ten],
    );
  } else {
    // Khong con vi tri nao (hoac khong co vi tri chinh) — gio nguyen chuc danh cu.
    const dau = await truy_van_mot<{ vi_tri_id: string; ten: string }>(
      `select nvv.vi_tri_id, vt.ten from nhan_vien_vi_tri nvv
         join vi_tri vt on vt.id = nvv.vi_tri_id
        where nvv.nhan_vien_id = $1 limit 1`,
      [nhan_vien_id],
    );
    if (dau !== null) {
      await thuc_thi(
        `update nhan_vien set vi_tri_chinh_id = $2, chuc_danh = $3, cap_nhat_luc = now()
          where id = $1`,
        [nhan_vien_id, dau.vi_tri_id, dau.ten],
      );
    }
  }
}

/** Vi tri nhan vien dang giu + co phai chinh khong. */
export async function vi_tri_cua_nhan_vien(nhan_vien_id: string): Promise<{
  vi_tri_id: string; ten: string; cap_bac: string; la_chinh: boolean; bat_dau: string | null;
}[]> {
  return truy_van(
    `select nvv.vi_tri_id, vt.ten, vt.cap_bac, nvv.la_chinh,
            to_char(nvv.bat_dau, 'YYYY-MM-DD') as bat_dau
       from nhan_vien_vi_tri nvv
       join vi_tri vt on vt.id = nvv.vi_tri_id
      where nvv.nhan_vien_id = $1
      order by nvv.la_chinh desc, vt.ten`,
    [nhan_vien_id],
  );
}

/** Nhan vien dang giu mot vi tri (kem phong) — dung cho goc bao phu. */
export async function nguoi_giu(vi_tri_id: string): Promise<{
  nhan_vien_id: string; ho_ten: string; ma_nv: string; ten_phong_ban: string | null;
}[]> {
  return truy_van(
    `select nv.id as nhan_vien_id, nv.ho_ten, nv.ma_nv, pb.ten as ten_phong_ban
       from nhan_vien_vi_tri nvv
       join nhan_vien nv on nv.id = nvv.nhan_vien_id and nv.dang_hoat_dong
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where nvv.vi_tri_id = $1
      order by nv.ho_ten`,
    [vi_tri_id],
  );
}
