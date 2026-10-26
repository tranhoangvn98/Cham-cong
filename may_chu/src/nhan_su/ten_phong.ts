// Ten phong ban CHUAN cho cac ten viet tat va bien the thuong gap trong tep HR.
// Dung chung cho MOI cong cu nhap du lieu nhan su de khong sinh phong ban trung ten:
//
//   - "Kinh doanh Hà Nội" / "Kinh doanh Sài Gòn" phai ve "Phòng Kinh doanh".
//     (Loi 21/10/2026: van ban 05/2026/TB-THVN ban hanh nham phong "Kinh doanh"
//      rong 0 nguoi vi he thong co hai phong gan giong nhau.)
//   - "KD", "KT", "XNK" ... ve ten chuan tuong ung.
//
// CHUAN TEN (chot 27/10/2026): dung TEN NGAN dang giu du lieu that —
// "Phòng IT", "Phòng XNK", "Phòng HCNS", "Phòng CSKH", "Phòng Kho TQ". Truoc day
// bang nay tro ve ten DAY DU ("Phòng Công nghệ thông tin", "Phòng Xuất nhập khẩu"…)
// trong khi du lieu that nam o ten ngan => moi lan nhap tep la de them mot dong
// phong ban trung (29 dong, 16 dong rong). Nay ten day du cung bi keo ve ten ngan.
//
// Thu tu: cat khoang trang thua -> lowercase -> tra bang anh xa. Ten la giu nguyen
// (co dau hay khong dau thi bang anh xa chi chua cac bien the da gap that).
export const TEN_PHONG_CHUAN: Record<string, string> = {
  kd: 'Phòng Kinh doanh',
  'kinh doanh': 'Phòng Kinh doanh',
  'phòng kinh doanh': 'Phòng Kinh doanh',
  'kinh doanh hà nội': 'Phòng Kinh doanh',
  'kinh doanh ha noi': 'Phòng Kinh doanh',
  'kinh doanh sài gòn': 'Phòng Kinh doanh',
  'kinh doanh sai gon': 'Phòng Kinh doanh',
  ks: 'Ban Kiểm soát',
  'kiểm soát': 'Ban Kiểm soát',
  'phòng kiểm soát': 'Ban Kiểm soát',
  'ban kiểm soát': 'Ban Kiểm soát',
  cskh: 'Phòng CSKH',
  'phòng cskh': 'Phòng CSKH',
  'chăm sóc khách hàng': 'Phòng CSKH',
  'phòng chăm sóc khách hàng': 'Phòng CSKH',
  mkt: 'Phòng Marketing',
  marketing: 'Phòng Marketing',
  'phòng marketing': 'Phòng Marketing',
  xnk: 'Phòng XNK',
  'phòng xnk': 'Phòng XNK',
  'xuất nhập khẩu': 'Phòng XNK',
  'phòng xuất nhập khẩu': 'Phòng XNK',
  it: 'Phòng IT',
  'phòng it': 'Phòng IT',
  'công nghệ thông tin': 'Phòng IT',
  'phòng công nghệ thông tin': 'Phòng IT',
  kt: 'Phòng Kế toán',
  'kế toán': 'Phòng Kế toán',
  'phòng kế toán': 'Phòng Kế toán',
  hcns: 'Phòng HCNS',
  'phòng hcns': 'Phòng HCNS',
  'hành chính nhân sự': 'Phòng HCNS',
  'phòng hành chính nhân sự': 'Phòng HCNS',
  'quản lý kho': 'Phòng Kho Hà Nội',
  'bốc xếp': 'Phòng Kho Hà Nội',
  'phòng kho hà nội': 'Phòng Kho Hà Nội',
  'lái xe': 'Phòng Lái xe',
  'phòng lái xe': 'Phòng Lái xe',
  'kho trung quốc': 'Phòng Kho TQ',
  'phòng kho trung quốc': 'Phòng Kho TQ',
  'kho tq': 'Phòng Kho TQ',
  'phòng kho tq': 'Phòng Kho TQ',
  'kho vận': 'Phòng Kho VN',
  'phòng kho vn': 'Phòng Kho VN',
};

/** Chuan hoa ten phong ban ve ten chuan; khong nam trong bang anh xa thi giu nguyen. */
export function ten_phong_chuan(raw: string): string {
  const r = raw.replace(/\s+/g, ' ').trim();
  if (r === '') return r;
  return TEN_PHONG_CHUAN[r.toLowerCase()] ?? r;
}
