// Helper DUNG CHUNG cho cac bai kiem module van ban AI — khong phai tep test
// (khong co duoi .test.ts nen `npm test` khong chay, va khong bi canh
// `moi_test_deu_chay.test.ts` bat).
//
// `docx_gia` dung bo sinh `ghi_docx` CO SAN de tao tep docx mau trong test — khong can
// Python, khong can mang. Module gate doc lai bang `trich_docx` (vong kin nhu bo DOCX
// cua don xin phep da dung that trong he thong).
import { ghi_docx } from '../src/tien_ich/ghi_docx.ts';
import type { SpecVanBan } from '../src/ai/kieu.ts';

/** Spec thong bao HOP LE — cac bai kiem sua tung truong de co tinh lam sai. */
export function spec_mau(sua: Partial<SpecVanBan> = {}): SpecVanBan {
  return {
    loai: 'thong_bao',
    pham_vi: 'toan_cong_ty',
    quan_he: 'noi_bo',
    co_quan_ban_hanh: 'CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM',
    dia_danh: 'Lạng Sơn',
    ngay: '2026-09-07',
    ten_loai: 'THÔNG BÁO',
    trich_yeu: 'Về việc đổi phần mềm chấm công',
    kinh_gui: [],
    can_cu: [],
    dieu: [],
    noi_dung: [
      'Nhằm nâng cao hiệu quả quản lý giờ giấc lao động, Công ty triển khai phần mềm chấm công mới.',
      'Đề nghị toàn thể cán bộ, nhân viên nghiêm túc thực hiện.',
    ],
    nguoi_ky: 'Trần Đức Hoàng',
    chuc_vu_nguoi_ky: 'GIÁM ĐỐC',
    noi_nhan: ['Toàn thể cán bộ, nhân viên'],
    so_ky_hieu: null,
    du_thao: true,
    nhan_vien_id: null,
    phong_ban_id: null,
    ...sua,
  };
}

/** Spec cong van HOP LE (theo ND30: khong ten loai, co Kinh gui, trich yeu V/v). */
export function spec_cong_van(sua: Partial<SpecVanBan> = {}): SpecVanBan {
  return spec_mau({
    loai: 'cong_van',
    ten_loai: '',
    trich_yeu: 'V/v phối hợp bàn giao dữ liệu chấm công',
    kinh_gui: ['Quý Công ty'],
    quan_he: 'doi_ngoai',
    ...sua,
  });
}

/** Spec quyet dinh HOP LE. */
export function spec_quyet_dinh(sua: Partial<SpecVanBan> = {}): SpecVanBan {
  return spec_mau({
    loai: 'quyet_dinh',
    ten_loai: 'QUYẾT ĐỊNH',
    trich_yeu: 'Về việc ban hành nội quy lao động',
    can_cu: ['Bộ luật Lao động 2019'],
    dieu: ['Điều này bắt buộc toàn thể nhân viên tuân thủ.'],
    noi_dung: ['Căn cứ tình hình thực tế, Giám đốc QUYẾT ĐỊNH:'],
    ...sua,
  });
}

/** Sinh tep docx GIA tu cac doan van cho truoc. */
export function docx_gia(dong: string[], dam_tat_ca = false): Buffer {
  return ghi_docx({
    khoi: dong.map((chu) => ({ loai: 'doan' as const, chu, dam: dam_tat_ca })),
  });
}

/** Nhung chu bat buoc cua the thuc ND30 de docx vua sinh DAT cac gate tep (G13..G17). */
export function docx_du(spec: SpecVanBan, chu_them: string[] = []): Buffer {
  const dong: string[] = [
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    'Độc lập - Tự do - Hạnh phúc',
    spec.co_quan_ban_hanh,
    `Số: ${spec.du_thao ? 'DỰ THẢO' : spec.so_ky_hieu ?? ''}`,
    `${spec.dia_danh}, ngày 07 tháng 09 năm 2026`,
    spec.ten_loai !== '' ? spec.ten_loai : '',
    spec.trich_yeu,
    ...(spec.loai === 'cong_van' ? ['Kính gửi: Quý Công ty'] : []),
    ...spec.noi_dung,
    ...chu_them,
  ];
  // Bo dong rong + them doan dem de tep lon hon nguong 3KB cua G13.
  // Dem phai la CHUOI GIA NGAU NHIEN that su (xorshift32): chuoi lap khuon hay
  // tuan hoan deu bi ZIP nen manh — tep nho hon 3KB thi G13 truot o nham.
  const sach = dong.filter((d) => d !== '');
  let x = 123456789;
  const dem = Array.from({ length: 8000 }, () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return String.fromCharCode(
      65 + ((x >>> 0) % 26), 65 + ((x >>> 3) % 26), 48 + ((x >>> 7) % 10),
    );
  }).join('');
  return docx_gia([...sach, dem]);
}
