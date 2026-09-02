// Danh sach DONG cac nguon du lieu ERP 1 ma phep do duoc phep tham chieu.
//
// VI SAO DANH SACH DONG: `dieu_kien_loi.phep_do` va `phep_do.nguon` deu la chuoi lay tu CSDL
// hoac tu cau hinh. Neu khong doi chieu voi mot danh sach co dinh, mot chuoi la se di thang
// vao `pg.Pool({ database: <chuoi do> })`. Cung ly do voi `quy_tac_vi_pham.chi_so`
// (013_vi_pham.sql): mot danh sach dong la cach re nhat de khong bao gio phai kiem tra chuoi.
//
// Bang `nguon_du_lieu` trong CSDL la BAN ANH XA ma -> ten database that. Tep nay la danh sach
// MA hop le. Hai thu khac nhau: ma la hop dong giua code va cau hinh, ten database la thu
// nguoi quan tri chon.

export const MA_NGUON = ['hola', 'sale', 'debt', 'logs', 'kho'] as const;

export type MaNguon = typeof MA_NGUON[number];

export function la_ma_nguon(s: string): s is MaNguon {
  return (MA_NGUON as readonly string[]).includes(s);
}

/** Mo ta ngan de hien trong thong bao loi va tren giao dien. */
export const TEN_NGUON: Readonly<Record<MaNguon, string>> = {
  hola: 'Hola — chi/thu, ví, ngân hàng, vận đơn',
  sale: 'Bán hàng — đơn hàng, cơ hội, lô hàng, mua hàng',
  debt: 'Công nợ — khách hàng, nhân viên, nhà cung cấp',
  logs: 'Nhật ký thao tác ERP 1',
  kho: 'Kho & tờ khai — packing list, nhập/xuất kho, tờ khai, hóa đơn',
};
