// Nhanh cua LUONG NGHI VIEC DUY NHAT.
//
// Mot quy trinh `quy_trinh_thoi_viec` duy nhat cho moi nguoi, nhung checklist va van ban
// Cổng 2 KHAC NHAU theo loai hop dong — can cu BLLĐ 2019:
//
//   hoc_viec (thuc tap sinh)  -> ket thuc hoc viec/thuc tap, KHONG phai cham dut HDLD,
//                                khong bao truoc theo D.35, khong tro cap thoi viec,
//                                khong bao giam BHXH.
//   thu_viec                  -> D.27 k2: khong can bao truoc; khong tro cap thoi viec,
//                                khong thanh toan phep nam.
//   thoi_vu                   -> D.35.1: bao truoc 3 ngay lam viec.
//   xac_dinh / khong_xac_dinh -> nhan vien chinh thuc (30 / 45 ngay).
//   quan_ly (co HĐLĐ)         -> D.7 ND145/2020: bao truoc toi 120 ngay.
//   cong_tac_vien             -> hop dong dich vu (BLDS), ngoai D.35.
//
// Ham THUAN, khong CSDL — test duoc tung nhanh.

/** Loai hop dong -> so ngay bao truoc (null = theo hop dong, khong chan). */
export type KhuonHanBaoTruoc = Record<string, number | null>;

export type NhomQuyTrinh =
  | 'thuc_tap' | 'thu_viec' | 'thoi_vu' | 'chinh_thuc' | 'cong_tac_vien' | 'quan_ly';

/** Cac loai hop dong thuoc pham vi BLLĐ 2019 (co the phat sinh quan he lao dong). */
const HOP_DONG_LAO_DONG: ReadonlySet<string> = new Set([
  'thu_viec', 'thoi_vu', 'xac_dinh', 'khong_xac_dinh',
]);

export function la_hop_dong_lao_dong(loai_hop_dong: string): boolean {
  return HOP_DONG_LAO_DONG.has(loai_hop_dong);
}

/**
 * Nhanh cua quy trinh. `la_quan_ly_dn` chi co hieu luc voi HĐ xac dinh / khong xac dinh —
 * thu viec, thoi vu, hoc viec (thuc tap sinh) va cong tac vien khong the "nghi viec nhu quan
 * ly" du chuc danh co chu "truong phong" trong ten.
 */
export function nhom_quy_trinh(loai_hop_dong: string, la_quan_ly_dn: boolean): NhomQuyTrinh {
  if (la_quan_ly_dn && (loai_hop_dong === 'xac_dinh' || loai_hop_dong === 'khong_xac_dinh')) {
    return 'quan_ly';
  }
  switch (loai_hop_dong) {
    case 'hoc_viec': return 'thuc_tap';
    case 'thu_viec': return 'thu_viec';
    case 'thoi_vu': return 'thoi_vu';
    case 'cong_tac_vien': return 'cong_tac_vien';
    default: return 'chinh_thuc';
  }
}

export interface CauTrucNhanh {
  nhom: NhomQuyTrinh;
  /** Tieu de Quyet dinh do Cong 2 sinh ra. */
  tieu_de_quyet_dinh: string;
  /** Tieu de bang quyet toan. */
  tieu_de_bang_quyet_toan: string;
  /** Can cu phap ly ghi trong quyet dinh. */
  can_cu: string;
  /** Co ap dung D.48 BLLĐ (quyet toan trong 14 ngay lam viec) khong. */
  co_dieu_48: boolean;
  /** Dong ghi chu cuoi bang quyet toan khi KHONG ap dung D.48. */
  ghi_chu_quyet_toan: string;
  /** Cau mo ta hanh dong o Dieu 1 cua quyet dinh. */
  dieu_1: string;
}

const CAU_TRUC: Record<NhomQuyTrinh, CauTrucNhanh> = {
  thuc_tap: {
    nhom: 'thuc_tap',
    tieu_de_quyet_dinh: 'QUYẾT ĐỊNH KẾT THÚC HỌC VIỆC / THỰC TẬP',
    tieu_de_bang_quyet_toan: 'BẢNG QUYẾT TOÁN KẾT THÚC HỌC VIỆC / THỰC TẬP',
    can_cu: 'Căn cứ hợp đồng học việc/thực tập và biên bản bàn giao của người học việc;',
    co_dieu_48: false,
    ghi_chu_quyet_toan: 'Thanh toán các khoản còn lại theo thỏa thuận trong hợp đồng '
      + 'học việc/thực tập.',
    dieu_1: 'Kết thúc quá trình học việc/thực tập',
  },
  thu_viec: {
    nhom: 'thu_viec',
    tieu_de_quyet_dinh: 'QUYẾT ĐỊNH KẾT THÚC THỜI GIAN THỬ VIỆC',
    tieu_de_bang_quyet_toan: 'BẢNG QUYẾT TOÁN KẾT THÚC THỜI GIAN THỬ VIỆC',
    can_cu: 'Căn cứ Bộ luật Lao động 2019 (Điều 27, 48) và biên bản bàn giao;',
    co_dieu_48: true,
    ghi_chu_quyet_toan: '',
    dieu_1: 'Kết thúc thời gian thử việc',
  },
  thoi_vu: {
    nhom: 'thoi_vu',
    tieu_de_quyet_dinh: 'QUYẾT ĐỊNH CHẤM DỨT HỢP ĐỒNG LAO ĐỘNG',
    tieu_de_bang_quyet_toan: 'BẢNG QUYẾT TOÁN KHI CHẤM DỨT HỢP ĐỒNG LAO ĐỘNG',
    can_cu: 'Căn cứ Bộ luật Lao động 2019 (Điều 34, 35, 46, 48) và biên bản bàn giao;',
    co_dieu_48: true,
    ghi_chu_quyet_toan: '',
    dieu_1: 'Chấm dứt hợp đồng lao động',
  },
  chinh_thuc: {
    nhom: 'chinh_thuc',
    tieu_de_quyet_dinh: 'QUYẾT ĐỊNH CHẤM DỨT HỢP ĐỒNG LAO ĐỘNG',
    tieu_de_bang_quyet_toan: 'BẢNG QUYẾT TOÁN KHI CHẤM DỨT HỢP ĐỒNG LAO ĐỘNG',
    can_cu: 'Căn cứ Bộ luật Lao động 2019 (Điều 34, 35, 46, 48) và biên bản bàn giao;',
    co_dieu_48: true,
    ghi_chu_quyet_toan: '',
    dieu_1: 'Chấm dứt hợp đồng lao động',
  },
  quan_ly: {
    nhom: 'quan_ly',
    tieu_de_quyet_dinh: 'QUYẾT ĐỊNH CHẤM DỨT HỢP ĐỒNG LAO ĐỘNG',
    tieu_de_bang_quyet_toan: 'BẢNG QUYẾT TOÁN KHI CHẤM DỨT HỢP ĐỒNG LAO ĐỘNG',
    can_cu: 'Căn cứ Bộ luật Lao động 2019 (Điều 34, 35, 46, 48), '
      + 'Điều 7 Nghị định 145/2020/NĐ-CP và biên bản bàn giao;',
    co_dieu_48: true,
    ghi_chu_quyet_toan: '',
    dieu_1: 'Chấm dứt hợp đồng lao động',
  },
  cong_tac_vien: {
    nhom: 'cong_tac_vien',
    tieu_de_quyet_dinh: 'QUYẾT ĐỊNH CHẤM DỨT HỢP ĐỒNG DỊCH VỤ',
    tieu_de_bang_quyet_toan: 'BẢNG QUYẾT TOÁN KẾT THÚC HỢP ĐỒNG DỊCH VỤ',
    can_cu: 'Căn cứ hợp đồng dịch vụ đã ký và biên bản bàn giao;',
    co_dieu_48: false,
    ghi_chu_quyet_toan: 'Thanh toán các khoản còn lại theo thỏa thuận trong hợp đồng dịch vụ.',
    dieu_1: 'Chấm dứt hợp đồng dịch vụ',
  },
};

export function cau_truc_nhanh(nhom: NhomQuyTrinh): CauTrucNhanh {
  return CAU_TRUC[nhom];
}

/**
 * Nguong bao truoc ap dung cho nhanh nay. Hoc viec / cong tac vien = null (theo hop dong,
 * khong chan) — DU chuc danh co chu "quan ly" thi cung khong lay muc 120 ngay.
 */
export function nguong_bao_truoc_nhanh(
  khuon: KhuonHanBaoTruoc, nhom: NhomQuyTrinh, so_thang_hop_dong: number | null, loai_hop_dong: string,
): number | null {
  if (!la_hop_dong_lao_dong(loai_hop_dong)) return null;
  if (nhom === 'quan_ly') return khuon['quan_ly_dn'] ?? 120;
  if (loai_hop_dong === 'xac_dinh' && so_thang_hop_dong !== null && so_thang_hop_dong < 12) {
    return 3;
  }
  return khuon[loai_hop_dong] ?? null;
}
