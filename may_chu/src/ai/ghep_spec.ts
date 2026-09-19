// Ghep spec — noi duy nhat code tron VAN XUOI (AI) voi TRUONG HE THONG (code).
//
// AI khong duoc sinh ten cong ty / so ky hieu / ngay / nguoi ky; tat ca nhung truong
// do do code dien o day. Ket qua la SpecVanBan dung nhat cho bo sinh docx va module
// gate — text app hien thi va tep docx cung sinh tu mot spec nay.
import type {
  KieuVanBan, PhamViNhan, QuanHe, SpecVanBan, TruongHeThong, VanXuatAI,
} from './kieu.ts';

/** Ten loai in tren van ban. Cong van theo ND30 KHONG in ten loai. */
export function ten_loai_cua(loai: KieuVanBan): string {
  if (loai === 'thong_bao') return 'THÔNG BÁO';
  if (loai === 'quyet_dinh') return 'QUYẾT ĐỊNH';
  return '';
}

/** Tach ngay 'YYYY-MM-DD' thanh 3 phan — dung cho ca docx (Python) lan gate. */
export function tach_ngay(ngay: string): { nam: number; thang: number; ngay_trong_thang: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ngay);
  if (m === null) return null;
  return {
    nam: Number(m[1]),
    thang: Number(m[2]),
    ngay_trong_thang: Number(m[3]),
  };
}

/**
 * Ghep van xuoi + truong he thong thanh spec ban DU THAO (chua co so ky hieu).
 * So ky hieu chi duoc dien o buoc ban hanh — xem cap_so.ts.
 */
export function ghep_spec(
  he_thong: TruongHeThong,
  loai: KieuVanBan,
  pham_vi: PhamViNhan,
  quan_he: QuanHe,
  van_ai: VanXuatAI,
  nguoi_nhan: { nhan_vien_id: string | null; phong_ban_id: string | null },
): SpecVanBan {
  return {
    loai,
    pham_vi,
    quan_he,
    co_quan_ban_hanh: he_thong.co_quan_ban_hanh,
    dia_danh: he_thong.dia_danh,
    ngay: he_thong.ngay,
    ten_loai: ten_loai_cua(loai),
    trich_yeu: van_ai.trich_yeu,
    kinh_gui: van_ai.kinh_gui,
    can_cu: van_ai.can_cu ?? [],
    dieu: van_ai.dieu ?? [],
    noi_dung: van_ai.noi_dung,
    nguoi_ky: he_thong.nguoi_ky,
    chuc_vu_nguoi_ky: he_thong.chuc_vu_nguoi_ky,
    noi_nhan: he_thong.noi_nhan,
    so_ky_hieu: null,
    du_thao: true,
    nhan_vien_id: nguoi_nhan.nhan_vien_id,
    phong_ban_id: nguoi_nhan.phong_ban_id,
  };
}

/** Kiem spec hop le — tra danh sach loi (rong = dat). Dung trong test va gate. */
export function kiem_tra_spec(spec: unknown): string[] {
  const loi: string[] = [];
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
    return ['spec phai la mot doi tuong.'];
  }
  const s = spec as Record<string, unknown>;

  const bat_buoc_chuoi: string[] = [
    'co_quan_ban_hanh', 'dia_danh', 'ngay', 'trich_yeu', 'nguoi_ky', 'chuc_vu_nguoi_ky',
  ];
  for (const k of bat_buoc_chuoi) {
    if (typeof s[k] !== 'string' || (s[k] as string).trim() === '') {
      loi.push(`Thieu truong ${k}.`);
    }
  }

  if (typeof s['loai'] !== 'string' || !['thong_bao', 'quyet_dinh', 'cong_van'].includes(s['loai'] as string)) {
    loi.push('loai khong hop le (thong_bao|quyet_dinh|cong_van).');
  }
  if (typeof s['pham_vi'] !== 'string' || !['ca_nhan', 'phong_ban', 'toan_cong_ty'].includes(s['pham_vi'] as string)) {
    loi.push('pham_vi khong hop le.');
  }

  for (const k of ['kinh_gui', 'can_cu', 'dieu', 'noi_dung', 'noi_nhan']) {
    const v = s[k];
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'string' && x.trim() !== '')) {
      loi.push(`${k} phai la mang chuoi khong rong.`);
    }
  }
  if ((s['noi_dung'] as string[] | undefined)?.length === 0) loi.push('noi_dung rong.');

  if (typeof s['ngay'] === 'string' && tach_ngay(s['ngay'] as string) === null) {
    loi.push('ngay phai co dang YYYY-MM-DD.');
  }
  if (s['so_ky_hieu'] !== null && typeof s['so_ky_hieu'] !== 'string') {
    loi.push('so_ky_hieu phai la chuoi hoac null.');
  }
  return loi;
}

/**
 * Noi dung TEXT hien thi trong app (cot `thong_bao.noi_dung`).
 *
 * Sinh tu CUNG mot spec voi tep docx nen khong lech; khong chua phan the thuc
 * (quoc hieu, so ky hieu, chu ky) — nhung phan do nam trong docx.
 */
export function noi_dung_hien_thi(spec: SpecVanBan): string {
  const dong: string[] = [];
  if (spec.loai === 'quyet_dinh') {
    for (const c of spec.can_cu) dong.push(`Căn cứ ${c};`);
    if (dong.length > 0) dong.push('');
    // AI viet "QUYẾT ĐỊNH:" theo hai kieu: ngay cuoi doan loi dan, hoac thanh doan
    // rieng. In dong danh dau DUNG MOT LAN — bo qua doan rieng neu co.
    const danh_dau = /^quyết\s*định\s*:?$/i;
    for (const d of spec.noi_dung) {
      if (danh_dau.test(d.trim())) continue;
      dong.push(d);
    }
    const cuoi = dong.length > 0 ? (dong[dong.length - 1] ?? '') : '';
    if (!/quyết\s*định\s*:?$/i.test(cuoi)) dong.push('QUYẾT ĐỊNH:');
    spec.dieu.forEach((d, i) => dong.push(`Điều ${i + 1}. ${d}`));
  } else {
    for (const d of spec.noi_dung) dong.push(d);
  }
  return dong.join('\n');
}
