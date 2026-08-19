// Nghiep vu ma dinh danh: gan, thu hoi, tra cuu, doi soat.
//
// QUY TAC QUAN TRONG NHAT O DAY: MOT BO DONG BO KHONG BAO GIO DUOC AM THAM LAY MA CUA NGUOI
// KHAC. Do la cach "trung" xuat hien: mot ma di tu nguoi nay sang nguoi kia trong mot lan chay
// tu dong, va ba thang sau khong ai biet vi sao lan quet cua ong A lai tinh cho ba B. Nen
// `gan_ma` TU CHOI khi ma dang thuoc nguoi khac, va chi doi chu khi nguoi goi noi ro la co y
// (`thu_hoi_cua_nguoi_khac`) — luc do dong cu duoc DONG LAI kem ghi chu, khong bi xoa.
import type pg from 'pg';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiKhongTim, LoiXungDot } from '../tien_ich/kiem_tra.ts';
import {
  CAC_HE_THONG, chuan_ma, dac_ta_he_thong, type DacTaHeThong, type MaHeThong,
} from './he_thong.ts';

/** Ai/cai gi tao dong dinh danh. Trung voi cot `nguon` cua bang. */
export type NguonMa =
  | 'di_tru' | 'nguoi_khai' | 'dong_bo_erp' | 'dang_nhap_microsoft' | 'gop_ho_so' | 'nhap_csv';

/** Bo chay truy van: pool dung chung, hoac mot khach trong giao dich dang mo. */
export interface BoChay {
  query: (sql: string, tham_so?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

function bo_chay_mac_dinh(): BoChay {
  return {
    query: async (sql, tham_so = []) => ({ rows: await truy_van(sql, tham_so) }),
  };
}

/** Dung mot khach trong giao dich lam bo chay. */
export function bo_chay_tu(khach: pg.PoolClient): BoChay {
  return {
    query: async (sql, tham_so = []) =>
      khach.query(sql, tham_so) as Promise<{ rows: Record<string, unknown>[] }>,
  };
}

export interface DongMa {
  id: string;
  nhan_vien_id: string;
  he_thong: MaHeThong;
  ma: string;
  ma_chuan: string;
  hieu_luc_tu: string;
  hieu_luc_den: string | null;
  nguon: string;
  ghi_chu: string | null;
}

export type KetCucGan =
  /** Nguoi nay da co dung ma nay, dang hieu luc. Khong lam gi. */
  | 'da_co'
  /** Them mot ma moi. */
  | 'them_moi'
  /** He thong nay chi mot ma: ma cu cua CHINH NGUOI DO da duoc dong lai. */
  | 'thay_the'
  /** Ma dang thuoc NGUOI KHAC va da duoc thu hoi theo yeu cau ro rang. */
  | 'thu_hoi_tu_nguoi_khac';

export interface KetQuaGan {
  ket_cuc: KetCucGan;
  he_thong: MaHeThong;
  ma: string;
  /** Ma cua chinh nguoi do vua bi dong lai (khi `thay_the`). */
  ma_cu?: string;
  /** Nguoi vua bi thu hoi ma (khi `thu_hoi_tu_nguoi_khac`). */
  lay_tu?: { nhan_vien_id: string; ma_nv: string; ho_ten: string };
}

export interface TuyChonGan {
  nguon?: NguonMa;
  ghi_chu?: string | null;
  /**
   * Cho phep LAY ma dang thuoc nguoi khac.
   *
   * Mac dinh `false`, va mac dinh do la thu quan trong nhat cua module nay. PIN 1 dang la cua
   * nguoi da nghi, gan cho nguoi moi la viec that va lam duoc — nhung phai la mot HANH DONG CO
   * Y cua nguoi that, khong phai hau qua phu cua mot lan bam "Đồng bộ".
   */
  thu_hoi_cua_nguoi_khac?: boolean;
}

/**
 * Gan mot ma cho mot nhan vien.
 *
 * Goi lai duoc nhieu lan: da co dung ma do thi tra `da_co` va khong ghi gi.
 */
export async function gan_ma(
  nhan_vien_id: string,
  he_thong: string,
  ma: string,
  tuy_chon: TuyChonGan = {},
  bo?: BoChay,
): Promise<KetQuaGan> {
  const chay = bo ?? bo_chay_mac_dinh();
  const d = dac_ta_he_thong(he_thong);
  const { ma_chuan, ma: ma_sach } = chuan_ma(he_thong, ma);
  const nguon: NguonMa = tuy_chon.nguon ?? 'nguoi_khai';

  const dang_co = (await chay.query(
    `select md.id, md.nhan_vien_id, nv.ma_nv, nv.ho_ten
       from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
      where md.he_thong = $1 and md.ma_chuan = $2 and md.hieu_luc_den is null`,
    [d.ma, ma_chuan],
  )).rows[0];

  if (dang_co !== undefined) {
    if (String(dang_co['nhan_vien_id']) === nhan_vien_id) {
      return { ket_cuc: 'da_co', he_thong: d.ma, ma: ma_sach };
    }
    if (tuy_chon.thu_hoi_cua_nguoi_khac !== true) {
      throw new LoiXungDot(
        `${d.ten} "${ma_sach}" đang thuộc ${String(dang_co['ma_nv'])} — `
        + `${String(dang_co['ho_ten'])}. Một mã đang hiệu lực chỉ thuộc một người. Nếu đúng là `
        + 'cần chuyển sang người này, hãy xác nhận thu hồi.',
      );
    }
    await chay.query(
      `update ma_dinh_danh
          set hieu_luc_den = now(),
              ghi_chu = coalesce(ghi_chu || ' | ', '') || $2
        where id = $1`,
      [String(dang_co['id']), `Thu hồi để chuyển cho nhân viên khác (${nguon})`],
    );
    // GO COT CU CUA NGUOI BI THU HOI TRUOC khi ghi cho nguoi moi. Hai ly do, deu bat buoc:
    //   - `pin_may` la UNIQUE, ghi truoc khi go la va vao rang buoc.
    //   - Neu quen go, cot van tro nguoi cu trong khi bang tro nguoi moi. Bo tiep nhan ADMS uu
    //     tien bang, nhung mot he thong noi hai chuyen la mot he thong dang cho hong.
    await go_cot(chay, d, String(dang_co['nhan_vien_id']), ma_chuan);
    await them_dong(chay, nhan_vien_id, d.ma, ma_sach, ma_chuan, nguon, tuy_chon.ghi_chu ?? null);
    await ghi_cot(chay, d, nhan_vien_id, ma_sach);
    return {
      ket_cuc: 'thu_hoi_tu_nguoi_khac',
      he_thong: d.ma,
      ma: ma_sach,
      lay_tu: {
        nhan_vien_id: String(dang_co['nhan_vien_id']),
        ma_nv: String(dang_co['ma_nv']),
        ho_ten: String(dang_co['ho_ten']),
      },
    };
  }

  // He thong chi cho mot ma: dong ma cu CUA CHINH NGUOI DO lai truoc khi them ma moi. Day la
  // truong hop doi email, doi ma nhan vien — ma cu khong bien mat, no thanh lich su.
  let ma_cu: string | undefined;
  if (!d.nhieu_ma) {
    const cu = (await chay.query(
      `update ma_dinh_danh set hieu_luc_den = now()
        where nhan_vien_id = $1 and he_thong = $2 and hieu_luc_den is null
        returning ma`,
      [nhan_vien_id, d.ma],
    )).rows[0];
    if (cu !== undefined) ma_cu = String(cu['ma']);
  }

  await them_dong(chay, nhan_vien_id, d.ma, ma_sach, ma_chuan, nguon, tuy_chon.ghi_chu ?? null);
  await ghi_cot(chay, d, nhan_vien_id, ma_sach);
  return ma_cu === undefined
    ? { ket_cuc: 'them_moi', he_thong: d.ma, ma: ma_sach }
    : { ket_cuc: 'thay_the', he_thong: d.ma, ma: ma_sach, ma_cu };
}

/**
 * Ghi ma vao cot cu tren `nhan_vien`, neu he thong do co khai cot.
 *
 * Ten cot den TU BANG DAC TA, khong tu dau vao nguoi dung — khong co cho nao noi chuoi ngoai
 * vao SQL.
 */
async function ghi_cot(
  chay: BoChay, d: DacTaHeThong, nhan_vien_id: string, ma: string,
): Promise<void> {
  const cot = d.cot_nhan_vien;
  if (cot === null || d.dong_bo_cot === 'khong') return;
  const dieu_kien = d.dong_bo_cot === 'khi_trong'
    ? ` and coalesce(${cot}::text, '') = ''`
    : '';
  await chay.query(
    `update nhan_vien set ${cot} = $2, cap_nhat_luc = now() where id = $1${dieu_kien}`,
    [nhan_vien_id, ma],
  );
}

/** Xoa ma khoi cot cu, chi khi cot dang giu DUNG ma do. */
async function go_cot(
  chay: BoChay, d: DacTaHeThong, nhan_vien_id: string, ma_chuan: string,
): Promise<void> {
  const cot = d.cot_nhan_vien;
  if (cot === null || d.dong_bo_cot === 'khong') return;
  // So bang `ma_chuan` qua chinh ham chuan hoa cua he thong thi khong lam duoc trong SQL, nen
  // doc gia tri ra roi so tren JS. Mot dong, khong phai duong nong.
  const dong = (await chay.query(
    `select ${cot}::text as v from nhan_vien where id = $1`, [nhan_vien_id])).rows[0];
  const v = dong?.['v'];
  if (typeof v !== 'string' || v.trim() === '') return;
  if (d.chuan_hoa(v) !== ma_chuan) return;
  await chay.query(
    `update nhan_vien set ${cot} = null, cap_nhat_luc = now() where id = $1`, [nhan_vien_id]);
}

async function them_dong(
  chay: BoChay, nhan_vien_id: string, he_thong: string,
  ma: string, ma_chuan: string, nguon: string, ghi_chu: string | null,
): Promise<void> {
  await chay.query(
    `insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, ghi_chu)
     values ($1,$2,$3,$4,$5,$6)`,
    [nhan_vien_id, he_thong, ma, ma_chuan, nguon, ghi_chu],
  );
}

/**
 * Gan ma tu mot bo dong bo, KHONG NEM LOI.
 *
 * Tra ve thong diep canh bao (hoac null khi xong xuoi). Bo dong bo ERP chay ca tram nguoi trong
 * MOT giao dich: nem loi o day la rollback ca luot dong bo vi mot ma trung cua mot nguoi. Bao ra
 * roi di tiep thi dung hon — bao cao co cho hien canh bao tung dong.
 */
export async function gan_ma_am_tham(
  nhan_vien_id: string, he_thong: string, ma: string, nguon: NguonMa, bo?: BoChay,
): Promise<string | null> {
  try {
    const kq = await gan_ma(nhan_vien_id, he_thong, ma, { nguon }, bo);
    if (kq.ket_cuc === 'thay_the') {
      return `${dac_ta_he_thong(he_thong).ten}: "${kq.ma_cu ?? ''}" → "${kq.ma}"`;
    }
    return null;
  } catch (loi) {
    if (loi instanceof LoiXungDot || loi instanceof LoiDauVao) return loi.message;
    throw loi;
  }
}

/**
 * Ghi bo ma ma NHAN SU go tay tren ho so: ma nhan vien, PIN may, ma ERP, email.
 *
 * Dung sau khi tao/sua ho so. Tra ve danh sach canh bao — rong la xong xuoi.
 *
 * VI SAO KHONG NEM LOI: `ma_nv` va `pin_may` da co rang buoc UNIQUE tren cot nen cau ghi ho so
 * chan truoc; con `ma_erp` va `email` thi khong, nen o day CO THE xung dot trong khi ho so da
 * luu xong. Nem loi luc do la bao "luu that bai" cho mot thao tac da thanh cong.
 */
export async function gan_bo_ma_nhan_su(
  nhan_vien_id: string,
  gia_tri: { ma_nv?: string | null; pin_may?: string | null; ma_erp?: string | null; email?: string | null },
  nguon: NguonMa = 'nguoi_khai',
  bo?: BoChay,
): Promise<string[]> {
  const canh_bao: string[] = [];
  const cap: readonly [MaHeThong, string | null | undefined][] = [
    ['noi_bo', gia_tri.ma_nv],
    ['may_cham_cong', gia_tri.pin_may],
    ['erp_cu_ma', gia_tri.ma_erp],
    ['microsoft_email', gia_tri.email],
  ];
  for (const [he_thong, v] of cap) {
    if (v === null || v === undefined || v.trim() === '') continue;
    const cb = await gan_ma_am_tham(nhan_vien_id, he_thong, v, nguon, bo);
    if (cb !== null) canh_bao.push(cb);
  }
  return canh_bao;
}

/** Dong mot ma lai. Khong xoa — lich su la ly do bang nay ton tai. */
export async function thu_hoi_ma(id: string, ghi_chu: string | null = null): Promise<void> {
  const d = await truy_van_mot<{ nhan_vien_id: string; he_thong: string; ma_chuan: string }>(
    `update ma_dinh_danh
        set hieu_luc_den = now(),
            ghi_chu = case when $2::text is null then ghi_chu
                           else coalesce(ghi_chu || ' | ', '') || $2 end
      where id = $1 and hieu_luc_den is null
      returning nhan_vien_id, he_thong, ma_chuan`,
    [id, ghi_chu],
  );
  if (d === null) throw new LoiKhongTim('Không thấy mã định danh đang hiệu lực với id này.');
  // Cot cu phai di theo, neu khong thi dong ma lai xong ma may cham cong VAN ghi cong cho
  // nguoi do — bang noi mot dang, cot noi mot dang.
  await go_cot(bo_chay_mac_dinh(), dac_ta_he_thong(d.he_thong), d.nhan_vien_id, d.ma_chuan);
}

export interface MaTheoNhom {
  nhom: string;
  he_thong: MaHeThong;
  ten_he_thong: string;
  nhieu_ma: boolean;
  on_dinh: boolean;
  cac_ma: DongMa[];
}

/**
 * Ma cua mot nguoi, nhom theo he thong, THEO THU TU khai trong `CAC_HE_THONG`.
 *
 * Tra ve ca cac he thong CHUA CO MA nao (danh sach rong) — de giao dien noi duoc "chua nối
 * Microsoft" thay vi im lang bo qua. Mot o trong la mot thong tin.
 */
export async function ma_cua_nhan_vien(
  nhan_vien_id: string, ca_lich_su = false,
): Promise<MaTheoNhom[]> {
  const ds = await truy_van<DongMa>(
    `select id, nhan_vien_id, he_thong, ma, ma_chuan,
            hieu_luc_tu::text as hieu_luc_tu, hieu_luc_den::text as hieu_luc_den,
            nguon, ghi_chu
       from ma_dinh_danh
      where nhan_vien_id = $1 ${ca_lich_su ? '' : 'and hieu_luc_den is null'}
      order by hieu_luc_den nulls first, hieu_luc_tu desc`,
    [nhan_vien_id],
  );

  return CAC_HE_THONG.map((h) => ({
    nhom: h.nhom,
    he_thong: h.ma,
    ten_he_thong: h.ten,
    nhieu_ma: h.nhieu_ma,
    on_dinh: h.on_dinh,
    cac_ma: ds.filter((m) => m.he_thong === h.ma),
  }));
}

export interface KetQuaTim {
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  dang_hoat_dong: boolean;
  he_thong: MaHeThong;
  ten_he_thong: string;
  ma: string;
  hieu_luc_den: string | null;
}

/**
 * Tim nguoi theo MOT MA BAT KY, khong can biet no thuoc he thong nao.
 *
 * Tim ca ma DA DONG LAI, va do la cong dung chinh: mot bang cong in ra thang truoc ghi PIN 7,
 * mot cong van cu ghi ma `ERP147`. Cho tra loi duoc "ma nay tung la cua ai" la o day.
 */
export async function tim_theo_ma(q: string): Promise<KetQuaTim[]> {
  const s = q.trim();
  if (s === '') return [];
  // So sanh tren `ma_chuan` bang ca hai cach chuan hoa dang dung (chu thuong va chu hoa), cong
  // them so khop chinh xac ban nguyen van. Nguoi tim khong biet he thong nao chuan hoa kieu gi.
  const ds = await truy_van<KetQuaTim>(
    `select md.nhan_vien_id, nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong,
            md.he_thong, md.ma, md.hieu_luc_den::text as hieu_luc_den
       from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
      where md.ma_chuan in ($1, $2, $3) or md.ma = $1
      order by md.hieu_luc_den nulls first, nv.ma_nv`,
    [s, s.toLowerCase(), s.toUpperCase()],
  );
  return ds.map((d) => ({ ...d, ten_he_thong: dac_ta_he_thong(d.he_thong).ten }));
}

// ---------------------------------------------------------------- doi soat
//
// Bang dinh danh va cac cot cu tren `nhan_vien` PHAI noi cung mot chuyen. Bao cao nay so hai ben
// va bao cho lech, vi giai doan nay ca hai cung ton tai: cot cu van la duong doc cua ADMS va
// dang nhap Microsoft, bang moi la nguon su that dang duoc dung dan. Khi bao cao nay sach thi
// moi go cot cu duoc — go som hon la doan.

export interface DongLech {
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  he_thong: MaHeThong;
  ten_he_thong: string;
  /** Gia tri o cot cu tren `nhan_vien`. */
  cot_cu: string | null;
  /** Gia tri dang hieu luc trong bang dinh danh. */
  bang_moi: string | null;
  ly_do: string;
}

/** Cac cot cu, cap voi he thong tuong ung. Chi nhung he thong CO cot cu. */
const DOI_CHIEU: readonly { he_thong: MaHeThong; sql: string; chuan: (s: string) => string }[] = [
  { he_thong: 'noi_bo', sql: 'ma_nv', chuan: (s) => s.trim().toUpperCase() },
  { he_thong: 'may_cham_cong', sql: 'pin_may', chuan: (s) => s.trim() },
  { he_thong: 'erp_cu', sql: 'erp_user_id::text', chuan: (s) => s.trim() },
  { he_thong: 'erp_cu_tai_khoan', sql: 'erp_username', chuan: (s) => s.trim().toLowerCase() },
  { he_thong: 'erp_cu_ma', sql: 'ma_erp', chuan: (s) => s.trim().toUpperCase() },
  { he_thong: 'microsoft_email', sql: 'email', chuan: (s) => s.trim().toLowerCase() },
];

/**
 * So bang dinh danh voi cac cot cu, HAI CHIEU.
 *
 * Hai chieu moi bat duoc ca hai kieu lech: cot co ma ma bang khong (backfill bo sot, hoac hai
 * nguoi trung ma nen dong thu hai bi index chan) va bang co ma ma cot khong (co duong ghi vao
 * bang ma quen ghi vao cot).
 */
export async function doi_soat(): Promise<DongLech[]> {
  const nv = await truy_van<Record<string, unknown>>(
    `select id, ma_nv, ho_ten, pin_may, erp_user_id::text as erp_user_id,
            erp_username, ma_erp, email
       from nhan_vien order by ma_nv`,
  );
  const md = await truy_van<{ nhan_vien_id: string; he_thong: MaHeThong; ma_chuan: string }>(
    'select nhan_vien_id, he_thong, ma_chuan from ma_dinh_danh where hieu_luc_den is null',
  );

  const theo_nguoi = new Map<string, Map<MaHeThong, string[]>>();
  for (const m of md) {
    const cua = theo_nguoi.get(m.nhan_vien_id) ?? new Map<MaHeThong, string[]>();
    cua.set(m.he_thong, [...(cua.get(m.he_thong) ?? []), m.ma_chuan]);
    theo_nguoi.set(m.nhan_vien_id, cua);
  }

  const lech: DongLech[] = [];
  for (const n of nv) {
    const id = String(n['id']);
    const cua = theo_nguoi.get(id) ?? new Map<MaHeThong, string[]>();

    for (const c of DOI_CHIEU) {
      const cot_ten = c.sql.replace('::text', '');
      const tho = n[cot_ten];
      const cot_cu = typeof tho === 'string' && tho.trim() !== '' ? c.chuan(tho) : null;
      const trong_bang = cua.get(c.he_thong) ?? [];

      if (cot_cu !== null && !trong_bang.includes(cot_cu)) {
        lech.push({
          nhan_vien_id: id, ma_nv: String(n['ma_nv']), ho_ten: String(n['ho_ten']),
          he_thong: c.he_thong, ten_he_thong: dac_ta_he_thong(c.he_thong).ten,
          cot_cu, bang_moi: trong_bang[0] ?? null,
          ly_do: trong_bang.length === 0
            ? `Cột \`${cot_ten}\` có giá trị nhưng bảng định danh không có mã đang hiệu lực nào`
            : `Cột \`${cot_ten}\` không nằm trong các mã đang hiệu lực (${trong_bang.join(', ')})`,
        });
        continue;
      }

      // Chieu nguoc: bang co ma ma cot de trong. Chi bao cho he thong MOT MA — voi
      // `may_cham_cong` va `microsoft_email` thi nhieu ma la binh thuong, cot cu chi giu duoc
      // mot cai, nen "cot it hon bang" khong phai lech.
      const mot_ma = !dac_ta_he_thong(c.he_thong).nhieu_ma;
      if (cot_cu === null && trong_bang.length > 0 && mot_ma) {
        lech.push({
          nhan_vien_id: id, ma_nv: String(n['ma_nv']), ho_ten: String(n['ho_ten']),
          he_thong: c.he_thong, ten_he_thong: dac_ta_he_thong(c.he_thong).ten,
          cot_cu: null, bang_moi: trong_bang[0] ?? null,
          ly_do: `Bảng định danh có mã nhưng cột \`${cot_ten}\` để trống`,
        });
      }
    }
  }
  return lech;
}

/** Tim nhan vien theo mot ma dang hieu luc. Duong doc cho cac bo dong bo. */
export async function nhan_vien_theo_ma(
  he_thong: string, ma: string,
): Promise<{ id: string; ma_nv: string; ho_ten: string } | null> {
  const { ma_chuan } = chuan_ma(he_thong, ma);
  return truy_van_mot<{ id: string; ma_nv: string; ho_ten: string }>(
    `select nv.id, nv.ma_nv, nv.ho_ten
       from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
      where md.he_thong = $1 and md.ma_chuan = $2 and md.hieu_luc_den is null`,
    [he_thong, ma_chuan],
  );
}
