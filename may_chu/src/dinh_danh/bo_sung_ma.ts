// Bo sung ma dinh danh tu COT CU, va liet ke nguoi con thieu — chay tu dong MOT LAN MOI NGAY.
//
// VI SAO CAN: bang `ma_dinh_danh` la nguon su that ve "he thong nay goi nguoi do bang ma gi",
// nhung vai duong van chi ghi COT CU tren `nhan_vien` (`email` khi tao ho so/nhap CSV, `pin_may`
// khi khai tay). Ket qua: nguoi DA co email hoac PIN ma trang "Ma o cac he thong" van hien
// "Chua co ma", bao cao doi soat bao lech, va nguoi phu trach tuong he thong mat du lieu.
//
// Job nay chi di MOT CHIEU: cot cu -> bang ma. Khong bao gio ghi nguoc lai cot cu (viec do la
// `dong_bo_cot` cua tung he thong trong `gan_ma`), va khong tu bia ma nao chua co nguon (ma ERP1
// phai do ERP1/nguoi nhap cung cap).
//
// Ham `ke_hoach_bo_sung` THUAN (khong CSDL) de kiem duoc cac ca bien: ma da co, ma thuoc nguoi
// khac, email chi khac chu hoa/thuong, PIN co khoang trang.
import { truy_van } from '../csdl/ket_noi.ts';
import { gan_ma } from './nghiep_vu.ts';

/** Hai he thong co the bo sung tu cot cu. Cac he thong khac khong co cot tuong ung. */
export type HeThongBoSung = 'microsoft_email' | 'may_cham_cong';

export interface NguoiCoCotCu {
  id: string;
  ma_nv: string;
  ho_ten: string;
  email: string | null;
  pin_may: string | null;
}

export interface MaDangHieuLuc {
  nhan_vien_id: string;
  he_thong: string;
  /** Ma da chuan hoa (`ma_chuan`) — dung de SO SANH, khong phai de hien thi. */
  ma: string;
  ma_nv: string;
}

export interface ViecBoSung {
  nhan_vien_id: string;
  ma_nv: string;
  he_thong: HeThongBoSung;
  /** Ma nguyen van lay tu cot cu — ghi nguyen van, chi cat khoang trang. */
  ma: string;
}

/** Ma cua cot cu dang thuoc nguoi KHAC — khong tu lay, phai co nguoi quyet dinh. */
export interface XungDotMa {
  nhan_vien_id: string;
  ma_nv: string;
  he_thong: HeThongBoSung;
  ma: string;
  thuoc_ve: string;
}

export interface KeHoachBoSung {
  viec: ViecBoSung[];
  xung_dot: XungDotMa[];
}

const khoa = (he_thong: string, ma: string): string => `${he_thong}\u0000${ma}`;

/** Bo sung gi cho ai — THUAN, khong cham CSDL. */
export function ke_hoach_bo_sung(
  nguoi: readonly NguoiCoCotCu[],
  ma: readonly MaDangHieuLuc[],
): KeHoachBoSung {
  const daCo = new Set(ma.map((m) => `${m.nhan_vien_id}\u0000${m.he_thong}\u0000${m.ma}`));
  // Ma dang hieu luc thuoc ve ai: mot ma chi duoc mot nguoi, nen day la ban do 1-1.
  const chuCuaMa = new Map<string, MaDangHieuLuc>();
  for (const m of ma) {
    if (!chuCuaMa.has(khoa(m.he_thong, m.ma))) chuCuaMa.set(khoa(m.he_thong, m.ma), m);
  }

  const viec: ViecBoSung[] = [];
  const xung_dot: XungDotMa[] = [];

  const xet = (nv: NguoiCoCotCu, he_thong: HeThongBoSung, gia_tri: string | null): void => {
    const ma_nguyen = (gia_tri ?? '').trim();
    if (ma_nguyen === '') return;
    // `ma_chuan` cua microsoft_email la chu thuong, cua may_cham_cong la nguyen van.
    const ma_so_sanh = he_thong === 'microsoft_email' ? ma_nguyen.toLowerCase() : ma_nguyen;
    if (daCo.has(`${nv.id}\u0000${he_thong}\u0000${ma_so_sanh}`)) return;
    const chu = chuCuaMa.get(khoa(he_thong, ma_so_sanh));
    if (chu !== undefined && chu.nhan_vien_id !== nv.id) {
      xung_dot.push({
        nhan_vien_id: nv.id, ma_nv: nv.ma_nv, he_thong, ma: ma_nguyen, thuoc_ve: chu.ma_nv,
      });
      return;
    }
    viec.push({ nhan_vien_id: nv.id, ma_nv: nv.ma_nv, he_thong, ma: ma_nguyen });
  };

  for (const nv of nguoi) {
    xet(nv, 'microsoft_email', nv.email);
    xet(nv, 'may_cham_cong', nv.pin_may);
  }
  viec.sort((a, b) => (a.ma_nv === b.ma_nv
    ? a.he_thong.localeCompare(b.he_thong)
    : a.ma_nv.localeCompare(b.ma_nv)));
  return { viec, xung_dot };
}

export interface NguoiConThieu {
  ma_nv: string;
  ho_ten: string;
  /** Ten he thong con thieu, cho nguoi doc — vd ['PIN máy chấm công']. */
  thieu: string[];
}

export interface KetQuaDongBoMa {
  /** So ma da bo sung duoc trong lan chay nay. */
  so_bu: number;
  xung_dot: XungDotMa[];
  /** Nguoi van thieu ma SAU khi bu (khong tinh ma ERP1 — xem `so_thieu_erp1`). */
  con_thieu: NguoiConThieu[];
  /** Ma ERP1 khong tu sinh duoc: chi dem de bao, khong liet ke tung nguoi. */
  so_thieu_erp1: number;
}

/**
 * Doc cot cu + bang ma, bo sung phan thieu, tra ve danh sach con thieu.
 *
 * Ghi tung ma bang `gan_ma` de giu nguyen moi rang buoc (mot ma mot nguoi, dong cot cu theo).
 * Mot ma loi khong lam hong ca luot: ghi log roi di tiep.
 */
export async function bo_sung_ma_tu_dong(
  ghi_log: (s: string) => void = () => {},
): Promise<KetQuaDongBoMa> {
  const nguoi = await truy_van<NguoiCoCotCu>(
    `select id, ma_nv, ho_ten, email, pin_may
       from nhan_vien where dang_hoat_dong = true
      order by ma_nv`,
  );
  const ma = await truy_van<MaDangHieuLuc>(
    `select h.nhan_vien_id, h.he_thong, h.ma_chuan as ma, nv.ma_nv
       from ma_dinh_danh h
       join nhan_vien nv on nv.id = h.nhan_vien_id
      where h.hieu_luc_den is null`,
  );

  const { viec, xung_dot } = ke_hoach_bo_sung(nguoi, ma);

  let so_bu = 0;
  for (const v of viec) {
    try {
      await gan_ma(v.nhan_vien_id, v.he_thong, v.ma,
        { nguon: 'tu_dong', ghi_chu: 'Bổ sung tự động từ cột cũ trên hồ sơ' });
      so_bu += 1;
    } catch (loi) {
      ghi_log(`[ma] khong bo sung duoc ${v.ma_nv}/${v.he_thong}=${v.ma}: ${(loi as Error).message}`);
    }
  }
  for (const x of xung_dot) {
    ghi_log(`[ma] ${x.ma_nv}: ${x.he_thong}=${x.ma} dang thuoc ${x.thuoc_ve} — khong tu lay`);
  }

  // Doc LAI bang ma sau khi bu: ro rang hon viec tu suy nguoc tu danh sach viec, va bat duoc ca
  // truong hop mot ma vua duoc nguoi khac gan trong luc job dang chay.
  const sau = await truy_van<{ nhan_vien_id: string; he_thong: string }>(
    `select h.nhan_vien_id, h.he_thong
       from ma_dinh_danh h
       join nhan_vien nv on nv.id = h.nhan_vien_id
      where h.hieu_luc_den is null and nv.dang_hoat_dong = true`,
  );
  const coHeThong = new Set(sau.map((m) => `${m.nhan_vien_id}\u0000${m.he_thong}`));

  const con_thieu: NguoiConThieu[] = [];
  let so_thieu_erp1 = 0;
  for (const nv of nguoi) {
    const thieu: string[] = [];
    if (!coHeThong.has(`${nv.id}\u0000may_cham_cong`)) thieu.push('PIN máy chấm công');
    if (!coHeThong.has(`${nv.id}\u0000microsoft_email`)) thieu.push('Email Microsoft');
    if (thieu.length > 0) con_thieu.push({ ma_nv: nv.ma_nv, ho_ten: nv.ho_ten, thieu });
    if (!coHeThong.has(`${nv.id}\u0000erp1`)) so_thieu_erp1 += 1;
  }

  return { so_bu, xung_dot, con_thieu, so_thieu_erp1 };
}
