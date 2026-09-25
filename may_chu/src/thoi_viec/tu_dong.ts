// Cac muc `tu_dong` cua quy trinh thoi viec — tien trinh nen tu chay, tu tick, ghi so lieu
// vao `muc_checklist.ket_qua`. Idempotent: chay lai bao nhieu lan cung khong sinh so lieu
// trung hay doi ket qua da tick.
//
// Nhan viec bang mot UPDATE nguyen tu (`for update skip locked` qua cot dang_xu_ly_luc) —
// nhieu instance chay song song khong xu ly trung mot quy trinh.
import type { PoolClient } from 'pg';
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { ngay_dia_phuong, ngay_viet } from '../tien_ich/thoi_gian.ts';
import { gui_ngam } from '../su_kien/thong_bao_day.ts';
import {
  ngay_chot_quy, quy_phep_theo_luat, so_thang_lam_trong_nam,
} from '../don_tu/quy_phep_nam.ts';
import {
  chuyen_san_sang_chot, doc_khuon_han_bao_truoc, type DongMucThoiViec,
} from './quy_trinh.ts';
import {
  cong_ngay_lam_viec, nguong_bao_truoc, thu_trong_tuan_thuan, tro_cap_thoi_viec,
} from './tinh_toan.ts';
import { cac_tai_khoan_admin } from './nghiep_vu.ts';

interface QtDangChay {
  id: string;
  nhan_vien_id: string;
  ho_ten: string;
  ma_nv: string;
  loai_hop_dong: string;
  la_quan_ly_dn: boolean;
  khong_can_bao_truoc: boolean;
  lastday_da_chot: boolean;
  ngay_lam_viec_cuoi: string | null;
  ngay_vao: string | null;
  tao_luc: string;
}

/**
 * Vong quet quy trinh dang thuc hien: chay tung muc `tu_dong` con `chua`, tick xong, roi
 * chuyen sang `san_sang_chot` khi du dieu kien. Chay moi chu ky lich (5 phut) — nhe vi chi
 * quet quy trinh DANG THUC HIEN.
 */
export async function quet_quy_trinh_thoi_viec(
  ghi_log: (s: string, ...t: unknown[]) => void,
): Promise<void> {
  // Nhan viec nguyen tu. Cot dang_xu_ly_luc tu bao ve stale 5 phut.
  const dong = await truy_van<{ id: string }>(
    `update quy_trinh_thoi_viec
        set dang_xu_ly_luc = now()
      where id in (
        select id from quy_trinh_thoi_viec
         where trang_thai = 'dang_thuc_hien'
           and (dang_xu_ly_luc is null or dang_xu_ly_luc < now() - interval '5 minutes')
         order by tao_luc
         limit 10
         for update skip locked
      )
      returning id`,
  );
  for (const qt of dong) {
    try {
      const da_chuyen = await xu_ly_mot_quy_trinh(qt.id);
      if (da_chuyen) {
        await bao_san_sang(qt.id);
        ghi_log(`[thoi-viec] ${qt.id}: da san sang chot`);
      }
    } catch (loi) {
      ghi_log(`[thoi-viec] LOI quy trinh ${qt.id}: ${(loi as Error).message}`);
    } finally {
      await truy_van('update quy_trinh_thoi_viec set dang_xu_ly_luc = null where id = $1',
        [qt.id]);
    }
  }

  // REQ-G2-05: toi lastday ma chua khoa -> canh bao do dashboard Admin (toi da 1 lan/ngay).
  await canh_bao_den_han(ghi_log);
}

/** Xu ly mot quy trinh: chay muc tu_dong, tick, chuyen trang thai. Tra true neu vua san sang. */
async function xu_ly_mot_quy_trinh(quy_trinh_id: string): Promise<boolean> {
  return trong_giao_dich(async (khach) => {
    const qt = await doc_qt(khach, quy_trinh_id);
    if (qt === null || qt.trang_thai !== 'dang_thuc_hien') return false;

    const mucs = await muc_tu_dong_chua(khach, quy_trinh_id);
    for (const muc of mucs) {
      const ket_qua = await chay_mot_muc(khach, qt, muc);
      if (ket_qua.loi !== null) {
        // Muc can nguoi (vd chua tim thay nguoi nhan ban giao): de nguyen trang thai `chua`
        // va ghi ly do — khong bao gio tick xong khi chua lam duoc gi.
        await khach.query(
          `update muc_checklist set ghi_chu = $2 where id = $1`, [muc.id, ket_qua.loi]);
        continue;
      }
      await khach.query(
        `update muc_checklist
            set trang_thai = 'xong', ket_qua = $2::jsonb, ghi_chu = null
          where id = $1 and trang_thai = 'chua'`,
        [muc.id, JSON.stringify(ket_qua.ket_qua ?? {})],
      );
    }

    return chuyen_san_sang_chot(khach, quy_trinh_id);
  });
}

interface MucChua {
  id: string;
  ma_muc: string;
}

async function doc_qt(khach: PoolClient, id: string): Promise<
  (QtDangChay & { trang_thai: string }) | null
> {
  const d = await khach.query<QtDangChay & { trang_thai: string }>(
    `select qt.id, qt.nhan_vien_id, qt.loai_hop_dong, qt.la_quan_ly_dn, qt.khong_can_bao_truoc,
            qt.lastday_da_chot, qt.trang_thai,
            to_char(qt.tao_luc, 'YYYY-MM-DD') as tao_luc,
            to_char(qt.ngay_lam_viec_cuoi, 'YYYY-MM-DD') as ngay_lam_viec_cuoi,
            to_char(nv.ngay_vao, 'YYYY-MM-DD') as ngay_vao,
            nv.ho_ten, nv.ma_nv
       from quy_trinh_thoi_viec qt
       join nhan_vien nv on nv.id = qt.nhan_vien_id
      where qt.id = $1
      for update`,
    [id],
  );
  return d.rows[0] ?? null;
}

async function muc_tu_dong_chua(khach: PoolClient, quy_trinh_id: string): Promise<MucChua[]> {
  const d = await khach.query<MucChua>(
    `select id, ma_muc from muc_checklist
      where quy_trinh_id = $1 and loai_tu_dong = 'tu_dong' and trang_thai = 'chua'
      order by id`,
    [quy_trinh_id],
  );
  return d.rows;
}

interface KetQuaMuc {
  ket_qua: Record<string, unknown> | null;
  /** Loi can nguoi — muc giu nguyen `chua` kem ghi chu. */
  loi: string | null;
}

async function chay_mot_muc(
  khach: PoolClient, qt: QtDangChay, muc: MucChua,
): Promise<KetQuaMuc> {
  switch (muc.ma_muc) {
    case 'ban_giao_cong_viec_do': return chuyen_giao_viec_do(khach, qt);
    case 'kiem_tra_bao_truoc': return kiem_tra_bao_truoc(khach, qt);
    case 'quyet_toan_luong': return quyet_toan_luong(khach, qt);
    case 'thanh_toan_phep': return thanh_toan_phep(khach, qt);
    case 'tinh_tro_cap': return tinh_tro_cap(khach, qt);
    case 'hen_quyet_toan_14n': return hen_quyet_toan_14n(khach, qt);
    default:
      return { ket_qua: { ghi_chu: `Mục ${muc.ma_muc} chưa có cơ chế tự chạy.` }, loi: null };
  }
}

/**
 * REQ-AUTO-02: chuyen moi `cong_viec` dang mo cua nguoi nghi sang quan ly phong (theo
 * nguoi_quan_ly_id, fallback truong phong). Tick xong khi so viec mo = 0.
 */
async function chuyen_giao_viec_do(khach: PoolClient, qt: QtDangChay): Promise<KetQuaMuc> {
  const nv = await khach.query<{ nguoi_quan_ly_id: string | null; truong_phong_id: string | null }>(
    `select nv.nguoi_quan_ly_id, pb.truong_phong_id
       from nhan_vien nv
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where nv.id = $1`,
    [qt.nhan_vien_id],
  );
  const hang = nv.rows[0];
  const nguoi_nhan = hang?.nguoi_quan_ly_id ?? hang?.truong_phong_id ?? null;
  const mo = await khach.query<{ so: number }>(
    `select count(*)::int as so from cong_viec
      where nhan_vien_id = $1 and trang_thai in ('moi','dang_lam','cho_duyet')`,
    [qt.nhan_vien_id],
  );
  const so_mo = mo.rows[0]?.so ?? 0;
  if (so_mo === 0) {
    return { ket_qua: { so_viec_chuyen: 0, so_viec_con_mo: 0 }, loi: null };
  }
  if (nguoi_nhan === null || nguoi_nhan === qt.nhan_vien_id) {
    return {
      ket_qua: null,
      loi: `Còn ${String(so_mo)} việc đang mở nhưng chưa tìm được người quản lý để nhận bàn giao. `
        + 'Liên hệ nhân sự gán người quản lý trong hồ sơ rồi để hệ thống chạy lại.',
    };
  }
  await khach.query(
    `update cong_viec
        set nhan_vien_id = $2,
            phan_hoi = concat(coalesce(phan_hoi, ''),
              case when coalesce(phan_hoi, '') = '' then '' else E'\n' end,
              '[Bàn giao thôi việc] ', $3, ' chuyển từ ', $4)
      where nhan_vien_id = $1 and trang_thai in ('moi','dang_lam','cho_duyet')`,
    [qt.nhan_vien_id, nguoi_nhan, ngay_viet(ngay_dia_phuong(new Date())), qt.ho_ten],
  );
  const con = await khach.query<{ so: number }>(
    `select count(*)::int as so from cong_viec
      where nhan_vien_id = $1 and trang_thai in ('moi','dang_lam','cho_duyet')`,
    [qt.nhan_vien_id],
  );
  return {
    ket_qua: { so_viec_chuyen: so_mo, so_viec_con_mo: con.rows[0]?.so ?? 0, nguoi_nhan },
    loi: null,
  };
}

/**
 * REQ-AUTO-04: kiem han bao truoc. Thieu han ma khong thuoc D.35 k2 thi CANH BAO "nghi
 * ngang, rui ro Dieu 40" — KHONG chan (Admin quyet o Cong 2 qua thoa thuan D.34.3).
 */
async function kiem_tra_bao_truoc(khach: PoolClient, qt: QtDangChay): Promise<KetQuaMuc> {
  if (qt.ngay_lam_viec_cuoi === null) {
    return {
      ket_qua: null,
      loi: 'Chưa có ngày làm việc cuối để kiểm tra hạn báo trước.',
    };
  }
  const hd = await khach.query<{ so_thang: number | null }>(
    `select case when hieu_luc_den is null then null
                 else round((hieu_luc_den - hieu_luc_tu) / 30.0)::int end as so_thang
       from hop_dong_lao_dong
      where nhan_vien_id = $1 and trang_thai = 'hieu_luc'
      order by hieu_luc_tu desc limit 1`,
    [qt.nhan_vien_id],
  );
  const khuon = await doc_khuon_han_bao_truoc();
  const toi_thieu = nguong_bao_truoc(
    khuon, qt.loai_hop_dong, hd.rows[0]?.so_thang ?? null, qt.la_quan_ly_dn);
  const tu_ngay = qt.tao_luc.slice(0, 10); // ngay duyet Cong 1 (khoi dong quy trinh)
  const so_ngay = Math.round(
    (Date.parse(`${qt.ngay_lam_viec_cuoi}T00:00:00Z`)
      - Date.parse(`${tu_ngay}T00:00:00Z`)) / 86_400_000);
  if (toi_thieu === null) {
    return { ket_qua: { so_ngay, toi_thieu: null, du: true, canh_bao: null }, loi: null };
  }
  const du = so_ngay >= toi_thieu;
  const canh_bao = du ? null
    : `Báo trước ${String(so_ngay)} ngày, ít hơn mức ${String(toi_thieu)} ngày quy định. `
      + 'Nghỉ ngang có rủi ro theo Điều 40 BLLĐ 2019 — Admin quyết định ở Cổng 2.';
  if (!du && !qt.khong_can_bao_truoc) {
    gui_ngam({
      nguoi_dung_ids: await cac_tai_khoan_admin(),
      tieu_de: 'Cảnh báo: thôi việc thiếu hạn báo trước',
      noi_dung: `${qt.ho_ten} (${qt.ma_nv}) — ${canh_bao ?? ''}`,
      du_lieu: { man: 'thoi-viec', loai: 'thoi_viec', quy_trinh_id: qt.id },
    });
  }
  return { ket_qua: { so_ngay, toi_thieu, du, canh_bao }, loi: null };
}

/**
 * REQ-AUTO-03: quyet toan luong thuc te — so lieu nen tu phieu luong moi nhat + cong tich
 * luy den lastday. Day la DU LIEU NEN cho van ban Cong 2, khong phai bang thanh toan.
 */
async function quyet_toan_luong(khach: PoolClient, qt: QtDangChay): Promise<KetQuaMuc> {
  const phieu = await khach.query<{
    thang: string; thuc_linh: number; luong_co_ban: number; so_ngay_cong_thuc: number;
  }>(
    `select kl.thang, pl.thuc_linh::float8 as thuc_linh, pl.luong_co_ban::float8 as luong_co_ban,
            pl.so_ngay_cong_thuc::float8 as so_ngay_cong_thuc
       from phieu_luong pl
       join ky_luong kl on kl.id = pl.ky_luong_id
      where pl.nhan_vien_id = $1
      order by kl.thang desc limit 1`,
    [qt.nhan_vien_id],
  );
  const cong = await khach.query<{ so_cong: number }>(
    `select coalesce(sum(so_cong), 0)::float8 as so_cong
       from bang_cong_ngay
      where nhan_vien_id = $1
        and ($2::date is null or ngay <= $2::date)`,
    [qt.nhan_vien_id, qt.ngay_lam_viec_cuoi],
  );
  return {
    ket_qua: {
      thang_moi_nhat: phieu.rows[0]?.thang ?? null,
      thuc_linh_moi_nhat: phieu.rows[0]?.thuc_linh ?? null,
      luong_co_ban: phieu.rows[0]?.luong_co_ban ?? null,
      so_ngay_cong_thuc_moi_nhat: phieu.rows[0]?.so_ngay_cong_thuc ?? null,
      so_cong_tich_luy: cong.rows[0]?.so_cong ?? 0,
      luu_y: 'Số liệu nền để sinh bảng quyết toán ở Cổng 2 — chưa phải con số thanh toán cuối.',
    },
    loi: null,
  };
}

/** REQ-AUTO-03: thanh toan phep nam chua nghi (BLLD 2019 Dieu 113.3). */
async function thanh_toan_phep(khach: PoolClient, qt: QtDangChay): Promise<KetQuaMuc> {
  if (qt.ngay_lam_viec_cuoi === null) {
    return { ket_qua: null, loi: 'Chưa có ngày làm việc cuối để tính phép.' };
  }
  const nam = Number(qt.ngay_lam_viec_cuoi.slice(0, 4));
  const nv = await khach.query<{ base: number; cac_ngay_lam: number[] | null }>(
    `select coalesce(nv.so_ngay_phep_nam, 12)::float8 as base, cl.cac_ngay_lam
       from nhan_vien nv
       left join ca_lam cl on cl.id = nv.ca_lam_id
      where nv.id = $1`,
    [qt.nhan_vien_id],
  );
  const hang = nv.rows[0];
  if (hang === undefined) return { ket_qua: null, loi: 'Không tìm thấy nhân viên.' };
  const so_thang = so_thang_lam_trong_nam(
    qt.ngay_vao, qt.ngay_lam_viec_cuoi, nam, ngay_chot_quy(nam));
  const quy = quy_phep_theo_luat(hang.base, so_thang);
  // Dem ngay phep nam DA DUYET trong nam — chi dem ngay lam viec (giong trang quan ly phep).
  const da_dung = await khach.query<{ w: number }>(
    `select coalesce(sum(x.w), 0)::float8 as w
       from don_nghi_phep d
       cross join lateral (
         select (case when d.nua_ngay then 0.5 else 1 end) * count(*)::float8 as w
           from generate_series(d.tu_ngay, d.den_ngay, interval '1 day') g
          where extract(dow from g)::int = any(coalesce($2::int[], '{1,2,3,4,5}'::int[]))
            and not exists (
              select 1 from ngay_le nl where nl.ngay = g::date and nl.lich_ma = 'vn')
       ) x
      where d.nhan_vien_id = $1 and d.loai = 'phep_nam' and d.trang_thai = 'da_duyet'
        and d.tu_ngay <= make_date($3::int, 12, 31) and d.den_ngay >= make_date($3::int, 1, 1)`,
    [qt.nhan_vien_id, hang.cac_ngay_lam, nam],
  );
  const con_lai = Math.max(0, quy - (da_dung.rows[0]?.w ?? 0));
  const luong_ngay = await luong_ngay_cua(khach, qt.nhan_vien_id);
  return {
    ket_qua: {
      nam, quy, da_dung: da_dung.rows[0]?.w ?? 0,
      con_lai: Math.round(con_lai * 10) / 10,
      luong_ngay,
      tien_phep: luong_ngay === null ? null : Math.round(con_lai * luong_ngay),
    },
    loi: null,
  };
}

/** REQ-AUTO-03: tro cap thoi viec — BLLD 2019 Dieu 46, tru thoi gian dong BHTN. */
async function tinh_tro_cap(khach: PoolClient, qt: QtDangChay): Promise<KetQuaMuc> {
  if (qt.ngay_lam_viec_cuoi === null) {
    return { ket_qua: null, loi: 'Chưa có ngày làm việc cuối để tính trợ cấp.' };
  }
  const luong = await khach.query<{ luong_thang: number }>(
    `select coalesce(ql.luong_co_ban, hd.luong_co_ban, 0)::float8 as luong_thang
       from nhan_vien nv
       left join lateral (
         select luong_co_ban from quyet_dinh_luong
          where nhan_vien_id = nv.id order by hieu_luc_tu desc limit 1) ql on true
       left join lateral (
         select luong_co_ban from hop_dong_lao_dong
          where nhan_vien_id = nv.id and trang_thai = 'hieu_luc'
          order by hieu_luc_tu desc limit 1) hd on true
      where nv.id = $1`,
    [qt.nhan_vien_id],
  );
  const bhtn = await khach.query<{ so: number }>(
    `select count(distinct kl.thang)::int as so
       from phieu_luong pl join ky_luong kl on kl.id = pl.ky_luong_id
      where pl.nhan_vien_id = $1 and pl.bhtn_nld > 0`,
    [qt.nhan_vien_id],
  );
  const kq = tro_cap_thoi_viec(
    luong.rows[0]?.luong_thang ?? 0,
    qt.ngay_vao,
    qt.ngay_lam_viec_cuoi,
    bhtn.rows[0]?.so ?? 0,
  );
  return {
    ket_qua: {
      ...kq,
      luong_thang: luong.rows[0]?.luong_thang ?? 0,
      luu_y: 'Trợ cấp thôi việc = 0,5 tháng lương × số năm làm việc, trừ thời gian đã đóng '
        + 'BHTN (Điều 46 BLLĐ 2019, Điều 8 NĐ145/2020). Thời gian đóng BHTN lấy từ phiếu lương.',
    },
    loi: null,
  };
}

/** REQ-AUTO-05: moc quyet toan = lastday + 14 ngay lam viec (BLLD 2019 Dieu 48.1). */
async function hen_quyet_toan_14n(khach: PoolClient, qt: QtDangChay): Promise<KetQuaMuc> {
  if (qt.ngay_lam_viec_cuoi === null) {
    return { ket_qua: null, loi: 'Chưa có ngày làm việc cuối để đặt mốc quyết toán.' };
  }
  const le = await khach.query<{ ngay: string }>('select ngay::text as ngay from ngay_le');
  const cac_le = new Set(le.rows.map((d) => d.ngay));
  const la_ngay_lam = (ngay: string): boolean =>
    thu_trong_tuan_thuan(ngay) !== 0 && thu_trong_tuan_thuan(ngay) !== 6
    && !cac_le.has(ngay);
  const hen = cong_ngay_lam_viec(qt.ngay_lam_viec_cuoi, 14, la_ngay_lam);
  return {
    ket_qua: {
      han_quyet_toan: hen,
      luu_y: 'Thanh toán mọi khoản trong 14 ngày làm việc kể từ ngày chấm dứt HĐLĐ '
        + '(BLLĐ 2019 Điều 48 khoản 1).',
    },
    loi: null,
  };
}

/** Luong mot ngay cua nhan vien (quyet dinh luong moi nhat, fallback hop dong). */
async function luong_ngay_cua(khach: PoolClient, nhan_vien_id: string): Promise<number | null> {
  const d = await khach.query<{ luong_ngay: number | null }>(
    `select case when coalesce(ql.luong_co_ban, hd.luong_co_ban, 0) > 0
                 then round(coalesce(ql.luong_co_ban, hd.luong_co_ban, 0)::numeric / 26, 0)::float8
                 else null end as luong_ngay
       from nhan_vien nv
       left join lateral (
         select luong_co_ban from quyet_dinh_luong
          where nhan_vien_id = nv.id order by hieu_luc_tu desc limit 1) ql on true
       left join lateral (
         select luong_co_ban from hop_dong_lao_dong
          where nhan_vien_id = nv.id and trang_thai = 'hieu_luc'
          order by hieu_luc_tu desc limit 1) hd on true
      where nv.id = $1`,
    [nhan_vien_id],
  );
  return d.rows[0]?.luong_ngay ?? null;
}

/** Bao chuong cho admin khi mot quy trinh vua sang san_sang_chot. */
async function bao_san_sang(quy_trinh_id: string): Promise<void> {
  const qt = await truy_van_mot<{ ho_ten: string; ma_nv: string }>(
    `select nv.ho_ten, nv.ma_nv from quy_trinh_thoi_viec qt
       join nhan_vien nv on nv.id = qt.nhan_vien_id where qt.id = $1`,
    [quy_trinh_id],
  );
  if (qt === null) return;
  gui_ngam({
    nguoi_dung_ids: await cac_tai_khoan_admin(),
    tieu_de: 'Quy trình thôi việc sẵn sàng chốt',
    noi_dung: `${qt.ho_ten} (${qt.ma_nv}) đã hoàn tất mọi mục bắt buộc — mở Cổng 2 để chốt.`,
    du_lieu: { man: 'thoi-viec', loai: 'thoi_viec', quy_trinh_id },
  });
}

/**
 * REQ-G2-05: toi lastday ma quy trinh chua `da_khoa` -> KHONG tu khoa, ma ban canh bao do
 * cho Admin. Toi da mot lan mot ngay (cot canh_bao_den_han_luc).
 */
async function canh_bao_den_han(ghi_log: (s: string, ...t: unknown[]) => void): Promise<void> {
  const hom_nay = ngay_dia_phuong(new Date());
  const dong = await truy_van<{ id: string; ho_ten: string; ma_nv: string; lastday: string }>(
    `select qt.id, nv.ho_ten, nv.ma_nv,
            to_char(qt.ngay_lam_viec_cuoi, 'YYYY-MM-DD') as lastday
       from quy_trinh_thoi_viec qt
       join nhan_vien nv on nv.id = qt.nhan_vien_id
      where qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
        and qt.ngay_lam_viec_cuoi is not null
        and qt.ngay_lam_viec_cuoi <= $1::date
        and (qt.canh_bao_den_han_luc is null
             or qt.canh_bao_den_han_luc < now() - interval '1 day')`,
    [hom_nay],
  );
  for (const d of dong) {
    gui_ngam({
      nguoi_dung_ids: await cac_tai_khoan_admin(),
      tieu_de: 'Tới ngày nghỉ, bàn giao chưa xong — dữ liệu đang rủi ro',
      noi_dung: `${d.ho_ten} (${d.ma_nv}) — lastday ${ngay_viet(d.lastday)} đã tới mà quy `
        + 'trình chưa chốt. Hệ thống KHÔNG tự khóa; mở Cổng 2 sau khi bàn giao xong.',
      du_lieu: { man: 'thoi-viec', loai: 'thoi_viec', quy_trinh_id: d.id },
    });
    await truy_van(
      'update quy_trinh_thoi_viec set canh_bao_den_han_luc = now() where id = $1', [d.id]);
    ghi_log(`[thoi-viec] canh bao den han: ${d.ma_nv} ${d.ho_ten}`);
  }
}

// ---------------------------------------------------------------- tien ich dung lai

/** Tong hop cac muc tu dong — khong can, chi de test duoc mot muc don le. */
export async function muc_tu_dong_cua(quy_trinh_id: string): Promise<DongMucThoiViec[]> {
  return truy_van(
    `select id, ma_muc, trang_thai, ket_qua from muc_checklist
      where quy_trinh_id = $1 and loai_tu_dong = 'tu_dong' order by id`,
    [quy_trinh_id],
  );
}
