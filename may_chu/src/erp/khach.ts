// Tang goi API ERP cu (Tran Hoang Viet Nam).
//
// Ba dac diem cua API do, deu lay tu tai lieu tich hop:
//   - Xac thuc bang header `X-Api-Key`, KHONG phai Bearer.
//   - Moi phan hoi boc trong mot "phong bi": { success, statusCode, result, errors }.
//     Phai kiem `success` TRUOC khi doc `result` — HTTP 200 khong co nghia la thanh cong.
//   - Danh sach phan trang: result = { items, totalCount, currentPage }.
//
// Tach ham thuan `doc_phong_bi` de kiem duoc bang du lieu mau ma khong can goi mang.
import { cau_hinh } from '../cau_hinh.ts';
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';

/** Toi da theo tai lieu: 500 cho hau het endpoint, 100 rieng containers. */
const TRANG_TOI_DA = 500;
const HET_GIO_MS = 60_000;
/** Tai lieu muc 4.5: retry 2s, 4s, 8s; toi da 3-4 lan. KHONG retry 401/404. */
const CHO_GIUA_LAN = [2000, 4000, 8000];

export interface PhongBi<T> {
  success?: boolean;
  statusCode?: number;
  result?: T;
  errors?: { message?: string }[];
}

export interface TrangDuLieu<T> {
  items?: T[];
  totalCount?: number;
  currentPage?: number;
}

/** Nguoi dung ERP — theo mau tai lieu muc 3.1. */
export interface NguoiDungErp {
  userId?: number;
  username?: string;
  name?: string;
  status?: number;
  isLocked?: boolean;
  email?: string;
  phoneNumber?: string;
  roleIds?: number[];
  departmentId?: number | null;
  mainSaleId?: number | null;
}

export function bat_erp(): boolean {
  return cau_hinh.erp.url !== '' && cau_hinh.erp.api_key !== '';
}

/**
 * Doc phong bi. Nem loi co thong diep doc duoc thay vi tra doi tuong rong — mot lan dong
 * bo that bai ma bao "0 ban ghi" la kieu that bai te nhat: nhin nhu thanh cong.
 */
export function doc_phong_bi<T>(tho: unknown): T {
  if (tho === null || typeof tho !== 'object') {
    throw new LoiDauVao('ERP trả về phản hồi không phải JSON.');
  }
  const pb = tho as PhongBi<T>;
  if (pb.success !== true) {
    const ly_do = (pb.errors ?? [])
      .map((e) => e.message ?? '')
      .filter((s) => s !== '')
      .join('; ');
    throw new LoiDauVao(
      `ERP báo thất bại${pb.statusCode === undefined ? '' : ` (mã ${pb.statusCode})`}`
      + `${ly_do === '' ? '.' : `: ${ly_do}`}`,
    );
  }
  if (pb.result === undefined || pb.result === null) {
    throw new LoiDauVao('ERP báo thành công nhưng không có dữ liệu.');
  }
  return pb.result;
}

/** Con phai doc trang tiep khong? Tai lieu muc 1.3. */
export function con_trang(
  trang: number, co_trang: number, so_item: number, tong: number,
): boolean {
  if (so_item === 0) return false;
  return trang * co_trang < tong;
}

function bat_buoc_bat(): void {
  if (!bat_erp()) {
    throw new LoiDauVao(
      'Chưa cấu hình ERP. Khai ERP_API_URL và ERP_API_KEY trong .env rồi '
      + 'chạy lại `docker compose up -d`.',
    );
  }
}

async function goi_mot_lan(duong_dan: string, tham_so: URLSearchParams): Promise<unknown> {
  const url = `${cau_hinh.erp.url}${duong_dan}?${tham_so.toString()}`;
  const res = await fetch(url, {
    headers: { 'x-api-key': cau_hinh.erp.api_key, accept: 'application/json' },
    signal: AbortSignal.timeout(HET_GIO_MS),
  });

  // Tai lieu muc 4.5: KHONG retry 401/404 — thu lai cung khong khac gi.
  if (res.status === 401) {
    throw new LoiDauVao('ERP từ chối: sai hoặc thiếu API key (ERP_API_KEY).');
  }
  if (res.status === 404) {
    throw new LoiDauVao(`ERP không có đường dẫn ${duong_dan}.`);
  }
  if (!res.ok) {
    // 5xx -> nem loi de vong retry o ngoai bat.
    throw new Error(`ERP trả mã ${res.status}`);
  }
  return res.json();
}

/** Nem lai ngay voi loi khong nen thu lai (401/404/du lieu sai). */
function khong_nen_thu_lai(loi: unknown): boolean {
  return loi instanceof LoiDauVao;
}

/**
 * Lay HET cac trang cua mot endpoint danh sach.
 *
 * `gioi_han_trang` chan vong lap vo tan khi ERP tra `totalCount` sai — da tung gap kieu
 * loi nay o cac API phan trang: totalCount luon lon hon so item that, va vong lap chay mai.
 */
export async function lay_tat_ca<T>(
  duong_dan: string,
  tuy_chon: { co_trang?: number; them?: Record<string, string>; gioi_han_trang?: number } = {},
): Promise<T[]> {
  bat_buoc_bat();
  const co_trang = Math.min(tuy_chon.co_trang ?? TRANG_TOI_DA, TRANG_TOI_DA);
  const gioi_han = tuy_chon.gioi_han_trang ?? 200;

  const ra: T[] = [];
  let trang = 1;

  for (;;) {
    const tham_so = new URLSearchParams({
      pageIndex: String(trang),
      pageSize: String(co_trang),
      ...(tuy_chon.them ?? {}),
    });

    let tho: unknown = null;
    for (let lan = 0; ; lan++) {
      try {
        tho = await goi_mot_lan(duong_dan, tham_so);
        break;
      } catch (loi) {
        if (khong_nen_thu_lai(loi) || lan >= CHO_GIUA_LAN.length) throw loi;
        await new Promise((ok) => setTimeout(ok, CHO_GIUA_LAN[lan]));
      }
    }

    const kq = doc_phong_bi<TrangDuLieu<T>>(tho);
    const items = kq.items ?? [];
    ra.push(...items);

    if (!con_trang(trang, co_trang, items.length, kq.totalCount ?? 0)) break;
    trang++;
    if (trang > gioi_han) {
      throw new LoiDauVao(
        `Đã đọc ${gioi_han} trang mà ERP vẫn báo còn dữ liệu. Dừng để tránh vòng lặp vô tận — `
        + 'nhiều khả năng `totalCount` bên ERP không khớp số bản ghi thật.',
      );
    }
  }
  return ra;
}

/** Danh sach nguoi dung ERP. `chi_dang_lam` map sang tham so `isWorking` cua ERP. */
export async function lay_nguoi_dung(chi_dang_lam = true): Promise<NguoiDungErp[]> {
  return lay_tat_ca<NguoiDungErp>('/external/users', {
    them: chi_dang_lam ? { isWorking: 'true' } : {},
  });
}
