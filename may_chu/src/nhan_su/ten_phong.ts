// Ten phong ban CHUAN (day du — chu cong ty chot 29.08) cho cac ten viet tat va
// bien the thuong gap trong tep HR. Dung chung cho MOI cong cu nhap du lieu nhan
// su de khong sinh phong ban trung ten:
//
//   - "Kinh doanh Hà Nội" / "Kinh doanh Sài Gòn" phai ve "Phòng Kinh doanh".
//     (Loi 21/10/2026: van ban 05/2026/TB-THVN ban hanh nham phong "Kinh doanh"
//      rong 0 nguoi vi he thong co hai phong gan giong nhau.)
//   - "KD", "KT", "XNK" ... ve ten day du tuong ung.
//
// Thu tu: cat khoang trang thua -> lowercase -> tra bang anh xa. Ten la giu nguyen
// (co dau hay khong dau thi bang anh xa chi chua cac bien the da gap that).
export const TEN_PHONG_CHUAN: Record<string, string> = {
  kd: 'Phòng Kinh doanh',
  'kinh doanh': 'Phòng Kinh doanh',
  'kinh doanh hà nội': 'Phòng Kinh doanh',
  'kinh doanh ha noi': 'Phòng Kinh doanh',
  'kinh doanh sài gòn': 'Phòng Kinh doanh',
  'kinh doanh sai gon': 'Phòng Kinh doanh',
  ks: 'Phòng Kiểm soát',
  cskh: 'Phòng Chăm sóc khách hàng',
  mkt: 'Phòng Marketing',
  xnk: 'Phòng Xuất nhập khẩu',
  it: 'Phòng Công nghệ thông tin',
  kt: 'Phòng Kế toán',
  hcns: 'Phòng Hành chính nhân sự',
  'quản lý kho': 'Phòng Kho Hà Nội',
  'bốc xếp': 'Phòng Kho Hà Nội',
  'lái xe': 'Phòng Lái xe',
};

/** Chuan hoa ten phong ban ve ten day du; khong nam trong bang anh xa thi giu nguyen. */
export function ten_phong_chuan(raw: string): string {
  const r = raw.replace(/\s+/g, ' ').trim();
  if (r === '') return r;
  return TEN_PHONG_CHUAN[r.toLowerCase()] ?? r;
}
