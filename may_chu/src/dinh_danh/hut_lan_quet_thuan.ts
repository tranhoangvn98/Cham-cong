// Phan THUAN cua viec hut luot quet chua gan khi mot PIN may vua duoc gan cho nguoi.
// Khong cham CSDL — de bai kiem chay duoc bang du lieu mau.
//
// Cau hoi duy nhat o day: trong so cac luot quet CHUA GAN cua mot PIN, luot nao duoc phep gan
// cho chu PIN hien tai, va co phai keo moc `hieu_luc_tu` cua dong ma dinh danh ve som hon khong.
//
// Hai chan chan sai:
//   1. PIN dung lai sau vai nam: khong gioi han nhin lai thi mot nguoi vao thang 11 se "hut"
//      luot quet thang 3 cua nguoi da nghi, va bang luong tra tien cho nguoi khong di lam.
//   2. PIN doi chu: luot quet cua nguoi CU trong khoang ho con giu PIN khong duoc phep roi sang
//      nguoi MOI. Moc chan la `hieu_luc_den` cua dong ma dinh danh da dong lai.
export interface TrangThaiPin {
  /** Moc hieu luc cua dong ma dinh danh dang mo. */
  hieu_luc_tu: Date;
  /** Moc ket thuc cua lan gan truoc (nguoi giu PIN truoc), null neu PIN chua tung doi chu. */
  nguoi_truoc_ket_thuc: Date | null;
}

export interface KeHoachHut {
  /** Moc hieu luc moi cho dong ma dinh danh; null = giu nguyen. */
  hieu_luc_tu_moi: Date | null;
  /** Chi hut cac luot quet co `thoi_diem >= moc_hut`. */
  moc_hut: Date;
}

/**
 * Tinh ke hoach hut. Tra null khi khong co luot quet nao duoc phep hut.
 *
 * @param luot_chua_gan thoi diem cac luot quet dang `nhan_vien_id is null` cua PIN nay
 * @param luc_chay      dong ho may chu, dung cho chan "nhin lai toi da N ngay"
 */
export function ke_hoach_hut(
  tt: TrangThaiPin,
  luot_chua_gan: readonly Date[],
  luc_chay: Date,
  toi_da_ngay: number,
): KeHoachHut | null {
  const san = luc_chay.getTime() - toi_da_ngay * 86_400_000;
  const moc_tu = Math.max(tt.nguoi_truoc_ket_thuc?.getTime() ?? Number.NEGATIVE_INFINITY, san);

  let dau = Number.POSITIVE_INFINITY;
  for (const t of luot_chua_gan) {
    const v = t.getTime();
    if (v >= moc_tu && v < dau) dau = v;
  }
  if (!Number.isFinite(dau)) return null;

  const moc_hut = new Date(dau);
  return {
    // Chi keo ve som hon: moc hien tai som hon roi thi giu nguyen, khong day ve tuong lai.
    hieu_luc_tu_moi: dau < tt.hieu_luc_tu.getTime() ? moc_hut : null,
    moc_hut,
  };
}
