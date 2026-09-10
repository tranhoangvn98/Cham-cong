// Tai khoan HE THONG — danh tinh cho moi quyet dinh TU DONG (khong co nguoi bam nut).
//
// Ban dieu hanh chot: he thong KHONG duoc duyet don duoi mot nguoi dung khong ro rang. Truoc day
// cac luong tu dong (di muon, nghi phep, chuyen quy phep nam) de `nguoi_duyet_id` = NULL, khien
// don da_duyet khong biet AI duyet. Tu nay moi quyet dinh tu dong deu gan vao tai khoan 'he_thong'
// (tao boi migration 053) — ro rang, tra cuu duoc, va KHONG dang nhap duoc.
import { truy_van_mot } from '../csdl/ket_noi.ts';

/** Ten dang nhap co dinh cua tai khoan he thong (khop migration 053). */
export const TEN_TAI_KHOAN_HE_THONG = 'he_thong';

let cache: string | null = null;

/**
 * Id tai khoan he thong, dung lam `nguoi_duyet_id` cho cac quyet dinh tu dong. Cache lai vi id
 * co dinh sau khi migration chay. Nem loi neu thieu — mot quyet dinh tu dong ma khong co danh tinh
 * he thong la dung tuyet doi khong ai lan lai duoc; tha bao loi con hon de NULL.
 */
export async function id_tai_khoan_he_thong(): Promise<string> {
  if (cache !== null) return cache;
  const nd = await truy_van_mot<{ id: string }>(
    'select id from nguoi_dung where ten_dang_nhap = $1', [TEN_TAI_KHOAN_HE_THONG],
  );
  if (nd === null) {
    throw new Error(
      `Thiếu tài khoản hệ thống '${TEN_TAI_KHOAN_HE_THONG}' — hãy chạy migration 053. `
      + 'Hệ thống không được duyệt đơn tự động dưới một người dùng không rõ ràng.',
    );
  }
  cache = nd.id;
  return cache;
}

/** Chi dung cho test: xoa cache. */
export function _xoa_cache_he_thong(): void {
  cache = null;
}
