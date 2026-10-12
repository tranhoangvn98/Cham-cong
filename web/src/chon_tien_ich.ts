// Tinh huong mo cua bo chon tha xuong dung chung (web/src/chon.tsx).
//
// Bang tha xuong mac dinh mo XUONG. O gan day cua mot khung co cuon (vi du phan trang
// nam cuoi bang luong chi tiet trong khung toan man hinh), mo xuong la bang nam LECH
// ra ngoai khung nhin — nguoi dung bam thay khong co gi xay ra. Khi do phai mo LEN.
//
// Ham THUAN, khong cham DOM — tach khoi chon.tsx (co JSX) de kiem duoc bang bai kiem
// chay bang node --experimental-strip-types nhu cac bai web/test khac.

/** Chieu cao mot muc trong danh sach (khop .chon-muc o kieu.css). */
export const CAO_MUC_CHON = 36;
/** Padding tren + duoi cua .chon-ds (4 + 4). */
export const PAD_DANH_SACH = 8;
/** Chieu cao o go de tim (khop .chon-tim o kieu.css, chi hien khi du 5 tuy chon). */
export const CAO_O_TIM = 41;
/** So muc toi da hien cung luc (khop .chon-ds max-height 188px o kieu.css). */
export const SO_MUC_TOI_DA = 5;
/** Khoang le giua o chon va bang tha xuong (khop top: calc(100% + 4px) o kieu.css). */
export const LE_BANG = 4;

/**
 * Chieu cao du kien cua bang tha xuong cho `so_tuy_chon` lua chon.
 * Du 5 tuy chon tro len thi co them o go de tim va danh sach bi chan o 5 muc kem con lan.
 */
export function cao_bang_chon(so_tuy_chon: number, co_tim: boolean): number {
  const muc = Math.min(Math.max(so_tuy_chon, 1), SO_MUC_TOI_DA);
  return PAD_DANH_SACH + muc * CAO_MUC_CHON + (co_tim ? CAO_O_TIM : 0);
}

/**
 * Co nen mo LEN (thay vi xuong) hay khong.
 *
 * `day_o` — canh duoi cua o chon (getBoundingClientRect().bottom).
 * `canh_duoi_khung` — canh duoi cua khung cuon gan nhat (hoac viewport) noi bang se bi cat.
 * `cao_can` — chieu cao du kien cua bang (xem `cao_bang_chon`).
 */
export function phai_mo_len(day_o: number, canh_duoi_khung: number, cao_can: number): boolean {
  return day_o + LE_BANG + cao_can > canh_duoi_khung;
}
