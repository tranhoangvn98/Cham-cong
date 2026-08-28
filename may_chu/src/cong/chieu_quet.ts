// Suy ra CHIEU (vao / ra) cua mot lan quet — ham thuan, khong cham CSDL.
//
// Chieu la thu can de biet "dang trong hay dang ngoai van phong". Co HAI nguon suy ra, va thu
// tu uu tien co chu dinh:
//
//   1. Chieu khai san cua MAY (`thiet_bi.chieu`): may dat o cua vao thi moi lan quet la 'vao',
//      may cua ra thi 'ra'. Day la nguon DANG TIN NHAT vi no la vat ly — khong phu thuoc
//      firmware cau hinh ra sao.
//   2. Ma Status trong ATTLOG: chi dung khi may khai 'hai_chieu'.
//
// BAY THAT: rat nhieu may ZKTeco chay che do mac dinh luon day Status = 0 cho MOI lan quet. Neu
// coi Status 0 la 'vao' mot cach may moc thi moi buoi chieu ca cong ty se "vao khi dang trong".
// Nen may 'hai_chieu' ma chi thay Status 0 -> tra 'khong_ro', va lop tren (`ra_vao.ts`) xu ly
// 'khong_ro' bang cach DAO trang thai chu khong sinh canh bao. Xem muc 1.2b cua KE-HOACH-BO-SUNG.

export type Chieu = 'vao' | 'ra' | 'khong_ro';

/** Chieu khai o `thiet_bi.chieu`. `hai_chieu` = mot may cho ca hai chieu, suy tu Status. */
export type ChieuMay = 'vao' | 'ra' | 'hai_chieu';

/**
 * Ma Status trong ATTLOG (xem 001_khoi_tao.sql):
 *   0 = vao (check-in)      3 = vao sau nghi (break-in)   4 = OT vao
 *   1 = ra  (check-out)     2 = ra nghi (break-out)       5 = OT ra
 *
 * `chi_co_status_0` = tren toan bo du lieu cua may nay, MOI lan quet deu Status 0. Khi do
 * Status khong mang thong tin chieu, nen may 'hai_chieu' phai tra 'khong_ro'. Co nay do lop
 * goi tinh mot lan cho ca may, khong tinh tung dong.
 */
export function chieu_quet(
  chieu_may: ChieuMay, status: number, chi_co_status_0: boolean,
): Chieu {
  if (chieu_may === 'vao') return 'vao';
  if (chieu_may === 'ra') return 'ra';

  // hai_chieu: doc Status. Nhung neu ca may chi co Status 0 thi Status vo nghia.
  if (chi_co_status_0) return 'khong_ro';
  if (status === 0 || status === 3 || status === 4) return 'vao';
  if (status === 1 || status === 2 || status === 5) return 'ra';
  return 'khong_ro';
}
