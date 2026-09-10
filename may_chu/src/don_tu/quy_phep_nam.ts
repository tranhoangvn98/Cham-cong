// Ap QUY DINH SO NGAY PHEP NAM theo Luat Lao dong (Dieu 113-114 BLLD 2019) cho mot nam.
//
// YEU CAU (chu doanh nghiep): "Ap quy dinh ve so ngay phep theo Luat Lao dong; neu khong du
// ngay phep theo quy dinh thi tu dong TU CHOI don nghi phep va CHUYEN thanh nghi khong luong."
//
// Cach tinh quy phep (da chot voi chu):
//   - CHIA THEO THANG LAM: quy = so_ngay_phep_nam * (so thang lam trong nam / 12).
//     Nguoi lam du 12 thang huong nguyen quy; nguoi vao/nghi giua nam huong theo ti le.
//   - Thang lam duoc tinh tron 01 thang neu so ngay lam trong thang do >= 50% so ngay cua
//     thang (Dieu 66 ND 145/2020 — o day dung ti le ngay LICH lam xap xi, du dung cho muc dich
//     chia quy). Lam tron quy ve 0,5 ngay (Luat khong quy dinh, doanh nghiep tu chon).
//   - `so_ngay_phep_nam` da la MUC NAM cua tung nguoi (HR dat, gom ca tham nien Dieu 114), nen
//     ham nay khong tinh lai tham nien — chi chia theo thang.
//
// Cach xu ly khi VUOT quy:
//   - Duyet cac don phep nam DA DUYET theo THU TU THOI GIAN (don som tieu quy truoc).
//   - Khi tong ngay phep vuot quy: cac NGAY vuot chuyen sang nghi khong luong.
//       * Don nam TRON trong phan vuot        -> TU CHOI don phep (tu_choi) + tao don khong
//                                                 luong DA DUYET cung khoang ngay.
//       * Don VAT qua ranh gioi quy (mot phan -> tach: rut ngan don phep giu phan trong quy,
//         trong quy, mot phan vuot)              tao don khong luong DA DUYET cho phan vuot.
//   - Don VAT QUA HAI NAM khong tu dong sua (chi canh bao) de tranh dung nham quy nam khac.
//
// Ham `ap_quy_phep_nam` co che do `dry_run` de XEM TRUOC truoc khi ap that.
import type pg from 'pg';
import { truy_van, trong_giao_dich } from '../csdl/ket_noi.ts';
import { danh_sach_ngay } from '../tien_ich/thoi_gian.ts';

const MARKER = 'auto_quy_phep';

function d2(n: number): string {
  return String(n).padStart(2, '0');
}

/** So ngay giua hai chuoi 'YYYY-MM-DD' (den - tu), khong am khi den >= tu. */
function so_ngay_giua(tu: string, den: string): number {
  const a = Date.parse(`${tu}T00:00:00Z`);
  const b = Date.parse(`${den}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * So thang lam viec trong `nam` (1..12). Mot thang duoc tinh neu nhan vien co mat >= 50% so
 * ngay cua thang do (tinh theo ngay lich, xap xi cho muc dich chia quy phep).
 */
export function so_thang_lam_trong_nam(
  ngay_vao: string | null, ngay_nghi_viec: string | null, nam: number,
): number {
  if (ngay_vao === null || ngay_vao === '') return 12; // khong ro ngay vao -> coi nhu ca nam
  let so = 0;
  for (let m = 1; m <= 12; m++) {
    const so_ngay_thang = new Date(Date.UTC(nam, m, 0)).getUTCDate();
    const dau = `${nam}-${d2(m)}-01`;
    const cuoi = `${nam}-${d2(m)}-${d2(so_ngay_thang)}`;
    const bat_dau = ngay_vao > dau ? ngay_vao : dau;
    const ket_thuc = ngay_nghi_viec !== null && ngay_nghi_viec !== '' && ngay_nghi_viec < cuoi
      ? ngay_nghi_viec : cuoi;
    if (bat_dau > ket_thuc) continue; // khong lam ngay nao trong thang
    const so_ngay_lam = so_ngay_giua(bat_dau, ket_thuc) + 1;
    if (so_ngay_lam * 2 >= so_ngay_thang) so++;
  }
  return so;
}

/** Quy phep nam theo ti le thang lam, lam tron ve 0,5 ngay. */
export function quy_phep_theo_luat(so_ngay_phep_nam: number, so_thang: number): number {
  return Math.round((so_ngay_phep_nam * so_thang) / 12 * 2) / 2;
}

export interface DonPhep {
  id: string;
  tu_ngay: string; // 'YYYY-MM-DD'
  den_ngay: string;
  nua_ngay: boolean;
}

export type HanhDong =
  | { don_id: string; kieu: 'giu' }
  | { don_id: string; kieu: 'canh_bao_hai_nam' }
  | { don_id: string; kieu: 'chuyen'; tu_ngay: string; den_ngay: string; nua_ngay: boolean }
  | { don_id: string; kieu: 'tach'; giu_den: string; km_tu: string; km_den: string };

/**
 * Phan bo cac don phep nam vao quy theo thu tu thoi gian, tra ve hanh dong cho tung don.
 * `dons` da loc: chi don phep nam DA DUYET co ngay trong `nam`. Ket qua on dinh theo (tu_ngay,id).
 */
export function phan_bo_phep(dons: readonly DonPhep[], quy: number, nam: number): HanhDong[] {
  const dau_nam = `${nam}-01-01`;
  const cuoi_nam = `${nam}-12-31`;
  const sap = [...dons].sort((a, b) =>
    a.tu_ngay < b.tu_ngay ? -1 : a.tu_ngay > b.tu_ngay ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  let da_dung = 0;
  const kq: HanhDong[] = [];
  for (const d of sap) {
    const trong_nam = d.tu_ngay.slice(0, 4) === String(nam) && d.den_ngay.slice(0, 4) === String(nam);
    const tu = d.tu_ngay > dau_nam ? d.tu_ngay : dau_nam;
    const den = d.den_ngay < cuoi_nam ? d.den_ngay : cuoi_nam;
    const ngays = danh_sach_ngay(tu, den);
    if (ngays.length === 0) { kq.push({ don_id: d.id, kieu: 'giu' }); continue; }
    const w = d.nua_ngay ? 0.5 : 1;

    // Don vat qua hai nam: chi tieu quy phan trong nam, KHONG tu dong sua (canh bao).
    if (!trong_nam) {
      da_dung += w * ngays.length;
      kq.push({ don_id: d.id, kieu: 'canh_bao_hai_nam' });
      continue;
    }

    let vuot_tu = -1;
    for (let i = 0; i < ngays.length; i++) {
      if (da_dung + w <= quy + 1e-9) da_dung += w;
      else { vuot_tu = i; break; }
    }
    if (vuot_tu === -1) kq.push({ don_id: d.id, kieu: 'giu' });
    else if (vuot_tu === 0) {
      kq.push({ don_id: d.id, kieu: 'chuyen', tu_ngay: d.tu_ngay, den_ngay: d.den_ngay, nua_ngay: d.nua_ngay });
    } else {
      kq.push({
        don_id: d.id, kieu: 'tach',
        giu_den: ngays[vuot_tu - 1] as string, km_tu: ngays[vuot_tu] as string, km_den: d.den_ngay,
      });
    }
  }
  return kq;
}

// ---------------------------------------------------------------- ap that vao CSDL

export interface DongBaoCao {
  ma_nv: string;
  ho_ten: string;
  so_thang: number;
  quy: number;
  phep_da_duyet: number; // tong ngay phep nam da duyet truoc khi ap
  so_ngay_chuyen: number; // so ngay chuyen sang khong luong
  hai_nam_can_ra_soat: number;
  hanh_dong: HanhDong[];
}

/** Mot o cong bi anh huong (can tinh lai) do co ngay phep chuyen sang khong luong. */
export interface CapAnhHuong { nhan_vien_id: string; ngay: string }

export interface BaoCao {
  nam: number;
  dry_run: boolean;
  so_nguoi_xet: number;
  so_nguoi_vuot: number;
  tong_ngay_chuyen: number;
  dong: DongBaoCao[];
  /** Chinh xac cac o (nhan vien + ngay) doi trang thai — de tinh lai DUNG o do, khong dung ca thang. */
  cap_anh_huong: CapAnhHuong[];
}

/** Cac ngay cu the cua mot hanh dong chuyen/tach (de tinh lai dung o do). */
function ngay_cua_hanh_dong(h: HanhDong): string[] {
  if (h.kieu === 'chuyen') return danh_sach_ngay(h.tu_ngay, h.den_ngay);
  if (h.kieu === 'tach') return danh_sach_ngay(h.km_tu, h.km_den);
  return [];
}

interface NhanVienPhep {
  id: string; ma_nv: string; ho_ten: string;
  ngay_vao: string | null; ngay_nghi_viec: string | null; base: number;
}

/** Tong so ngay (0,5 cho nua ngay) cua mot tap don, chi tinh phan trong nam. */
function tong_ngay(dons: readonly DonPhep[], nam: number): number {
  const dau = `${nam}-01-01`;
  const cuoi = `${nam}-12-31`;
  let s = 0;
  for (const d of dons) {
    const tu = d.tu_ngay > dau ? d.tu_ngay : dau;
    const den = d.den_ngay < cuoi ? d.den_ngay : cuoi;
    const n = danh_sach_ngay(tu, den).length;
    if (n > 0) s += (d.nua_ngay ? 0.5 : 1) * n;
  }
  return s;
}

/**
 * Ap quy phep nam cho ca nam. Voi `dry_run=true` (mac dinh) chi TINH va bao cao, khong sua CSDL.
 * Tra ve bao cao chi tiet tung nguoi.
 */
export async function ap_quy_phep_nam(
  nam: number, opts: { dry_run?: boolean } = {},
): Promise<BaoCao> {
  const dry_run = opts.dry_run ?? true;
  const dau_nam = `${nam}-01-01`;
  const cuoi_nam = `${nam}-12-31`;

  // Nhan vien co it nhat mot don phep nam DA DUYET cham vao nam nay.
  const nvs = await truy_van<NhanVienPhep>(
    `select distinct nv.id, nv.ma_nv, nv.ho_ten,
            to_char(nv.ngay_vao,'YYYY-MM-DD')       as ngay_vao,
            to_char(nv.ngay_nghi_viec,'YYYY-MM-DD') as ngay_nghi_viec,
            coalesce(nv.so_ngay_phep_nam, 12)::float8 as base
       from don_nghi_phep d
       join nhan_vien nv on nv.id = d.nhan_vien_id
      where d.loai = 'phep_nam' and d.trang_thai = 'da_duyet'
        and d.tu_ngay <= $2 and d.den_ngay >= $1
      order by nv.ma_nv`,
    [dau_nam, cuoi_nam],
  );

  const dong: DongBaoCao[] = [];
  const cap_anh_huong: CapAnhHuong[] = [];
  let tong_ngay_chuyen = 0;
  let so_nguoi_vuot = 0;

  for (const nv of nvs) {
    const dons = await truy_van<DonPhep>(
      `select id, to_char(tu_ngay,'YYYY-MM-DD') as tu_ngay,
              to_char(den_ngay,'YYYY-MM-DD') as den_ngay, nua_ngay
         from don_nghi_phep
        where nhan_vien_id = $1 and loai = 'phep_nam' and trang_thai = 'da_duyet'
          and tu_ngay <= $3 and den_ngay >= $2`,
      [nv.id, dau_nam, cuoi_nam],
    );
    const so_thang = so_thang_lam_trong_nam(nv.ngay_vao, nv.ngay_nghi_viec, nam);
    const quy = quy_phep_theo_luat(nv.base, so_thang);
    const hanh_dong = phan_bo_phep(dons, quy, nam);

    let so_ngay_chuyen = 0;
    let hai_nam = 0;
    for (const h of hanh_dong) {
      if (h.kieu === 'chuyen') {
        const n = danh_sach_ngay(h.tu_ngay, h.den_ngay).length;
        so_ngay_chuyen += (h.nua_ngay ? 0.5 : 1) * n;
      } else if (h.kieu === 'tach') {
        so_ngay_chuyen += danh_sach_ngay(h.km_tu, h.km_den).length; // phan vuot khong the la nua ngay
      } else if (h.kieu === 'canh_bao_hai_nam') hai_nam++;
    }
    if (so_ngay_chuyen === 0 && hai_nam === 0) continue; // khong co gi de bao cao

    if (so_ngay_chuyen > 0) so_nguoi_vuot++;
    tong_ngay_chuyen += so_ngay_chuyen;
    for (const h of hanh_dong) {
      for (const ngay of ngay_cua_hanh_dong(h)) cap_anh_huong.push({ nhan_vien_id: nv.id, ngay });
    }
    dong.push({
      ma_nv: nv.ma_nv, ho_ten: nv.ho_ten, so_thang, quy,
      phep_da_duyet: tong_ngay(dons, nam), so_ngay_chuyen,
      hai_nam_can_ra_soat: hai_nam, hanh_dong,
    });

    if (!dry_run && so_ngay_chuyen > 0) {
      await ap_cho_nhan_vien(nv, nam, hanh_dong, dons);
    }
  }

  return {
    nam, dry_run, so_nguoi_xet: nvs.length, so_nguoi_vuot, tong_ngay_chuyen, dong,
    cap_anh_huong,
  };
}

/** Thuc hien cac hanh dong (tu choi / tach + tao don khong luong) trong MOT giao dich. */
async function ap_cho_nhan_vien(
  nv: NhanVienPhep, nam: number, hanh_dong: readonly HanhDong[], dons: readonly DonPhep[],
): Promise<void> {
  await trong_giao_dich(async (khach) => {
    for (const h of hanh_dong) {
      if (h.kieu === 'chuyen') {
        // Tu choi don phep goc.
        await khach.query(
          `update don_nghi_phep
              set trang_thai = 'tu_choi', quyet_luc = now(),
                  ghi_chu_duyet = $2
            where id = $1`,
          [h.don_id, `[${MARKER}] Vuot quy phep nam ${nam} -> chuyen nghi khong luong`],
        );
        await tao_don_khong_luong(khach, nv.id, h.tu_ngay, h.den_ngay, h.nua_ngay, nam);
      } else if (h.kieu === 'tach') {
        // Rut ngan don phep: giu phan trong quy (tu_ngay .. giu_den).
        await khach.query(
          `update don_nghi_phep
              set den_ngay = $2, quyet_luc = now(),
                  ghi_chu_duyet = $3
            where id = $1`,
          [h.don_id, h.giu_den, `[${MARKER}] Cat phan vuot quy phep nam ${nam} sang khong luong`],
        );
        // Phan vuot (km_tu .. km_den) -> khong luong.
        await tao_don_khong_luong(khach, nv.id, h.km_tu, h.km_den, false, nam);
      }
    }
  });
}

/** Tao (hoac giu neu da co) mot don nghi khong luong DA DUYET. Idempotent theo marker + khoang ngay. */
async function tao_don_khong_luong(
  khach: pg.PoolClient,
  nhan_vien_id: string, tu_ngay: string, den_ngay: string, nua_ngay: boolean, nam: number,
): Promise<void> {
  const da_co = await khach.query(
    `select 1 from don_nghi_phep
      where nhan_vien_id = $1 and loai = 'khong_luong' and tu_ngay = $2 and den_ngay = $3
        and ghi_chu_duyet like $4`,
    [nhan_vien_id, tu_ngay, den_ngay, `[${MARKER}]%`],
  );
  if (da_co.rows.length > 0) return;
  await khach.query(
    `insert into don_nghi_phep
       (nhan_vien_id, loai, tu_ngay, den_ngay, nua_ngay, ly_do, trang_thai, quyet_luc, ghi_chu_duyet)
     values ($1,'khong_luong',$2,$3,$4,$5,'da_duyet', now(), $6)`,
    [nhan_vien_id, tu_ngay, den_ngay, nua_ngay,
      `Chuyen tu nghi phep nam vuot quy ${nam}`,
      `[${MARKER}] Tao tu phan vuot quy phep nam ${nam}`],
  );
}

/** Khoang ngay bi anh huong (nho nhat .. lon nhat) cua cac don da chuyen — de tinh lai cong. */
export function khoang_anh_huong(bc: BaoCao): { tu: string; den: string } | null {
  let tu: string | null = null;
  let den: string | null = null;
  const cham = (a: string, b: string): void => {
    if (tu === null || a < tu) tu = a;
    if (den === null || b > den) den = b;
  };
  for (const d of bc.dong) {
    for (const h of d.hanh_dong) {
      if (h.kieu === 'chuyen') cham(h.tu_ngay, h.den_ngay);
      else if (h.kieu === 'tach') cham(h.km_tu, h.km_den);
    }
  }
  return tu === null || den === null ? null : { tu, den };
}
