// Doc tep "DANH SACH NHAN SU" cua HCNS thanh du lieu co kieu.
//
// Tach rieng khoi phan ghi CSDL de kiem duoc bang bai kiem thuan: toan bo cho de sai trong
// viec nay nam o day — ngay kieu Excel, so dien thoai mat so 0 dau, ten cot lech giua cac
// sheet, va mot sheet la BAN SAO chu khong phai nguon.
//
// KHONG co du lieu that nao trong ma nguon hay trong repo. Tep xlsx chua CCCD, dia chi, ngay
// sinh cua nguoi that (Nghi dinh 13/2023) — no nam tren may chu, duoc doc luc chay.
import { trich_xlsx, ten_cac_sheet } from '../tien_ich/doc_office.ts';

/** Mot dong nhan su doc tu tep, da chuan hoa nhung CHUA doi chieu voi CSDL. */
export interface DongNhanSu {
  sheet: string;
  dong_so: number;
  ho_ten: string;
  gioi_tinh: 'nam' | 'nu' | null;
  ngay_sinh: string | null;
  cccd: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  dia_chi_thuong_tru: string | null;
  que_quan: string | null;
  phong_ban: string | null;
  chuc_danh: string | null;
  ngay_vao: string | null;
  loai_hop_dong: string | null;
  con_lam_viec: boolean | null;
}

export interface KetQuaDoc {
  dong: DongNhanSu[];
  /** Sheet da doc, va sheet da bo qua kem ly do. */
  sheet_da_doc: string[];
  sheet_bo_qua: { ten: string; ly_do: string }[];
  /** Cho du lieu tu no ngo — khong chan viec nap, nhung phai hien ra cho nguoi doc. */
  canh_bao: string[];
}

// Sheet "VPSN" la danh sach SINH NHAT: cung nhung nguoi cua VPHN, sap lai theo thang sinh, va
// KHONG duoc cap nhat theo. Bo qua no khong phai vi ten — ma vi bai kiem o duoi chung minh
// duoc no la ban sao. Neu mot ngay nao do no khong con la ban sao, hang rao se keu len.
const COT_THANG_SINH = 'thángsn';

/** Bo dau cach va ha chu thuong de so ten cot — tieu de trong tep co xuong dong va cach doi. */
function khoa_cot(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

const TEN_COT: Record<keyof Omit<DongNhanSu, 'sheet' | 'dong_so'> | 'ma_nv', string[]> = {
  ho_ten:             ['họvàtên'],
  gioi_tinh:          ['giớitính'],
  ngay_sinh:          ['ngàysinh'],
  cccd:               ['sốcccd/cmnd', 'sốcccd', 'cccd/cmnd'],
  so_dien_thoai:      ['sốđiệnthoại'],
  email:              ['email'],
  dia_chi_thuong_tru: ['địachỉthườngtrú'],
  que_quan:           ['quêquán'],
  phong_ban:          ['phòngban'],
  chuc_danh:          ['chứcdanh/vịtrícôngtác', 'chứcdanh'],
  ngay_vao:           ['ngàyvàocôngty'],
  loai_hop_dong:      ['loạihđlđ'],
  con_lam_viec:       ['trạngtháilàmviệc'],
  ma_nv:              ['mãnhânviên'],
};

/**
 * Doi so serial cua Excel sang 'YYYY-MM-DD'.
 *
 * Excel dem tu 1899-12-30 chu khong phai 1900-01-01, vi no giu lai loi cua Lotus 1-2-3 coi
 * 1900 la nam nhuan (co ngay 1900-02-29 khong ton tai). Cong thuc `1899-12-30 + n ngay` dung
 * cho MOI serial tu 61 tro len, tuc moi ngay tu 1900-03-01.
 *
 * Serial 1..60 roi vao vung truoc cai ngay ma khong ton tai do, va o day cong thuc lech dung
 * mot ngay. Thay vi tra ve mot ngay lech, tra null: ho so nhan su khong co ai sinh nam 1900,
 * nen mot o roi vao vung do gan nhu chac chan la o rac chu khong phai ngay that.
 */
export function ngay_tu_serial(n: number): string | null {
  if (!Number.isFinite(n) || n < 61 || n > 2_958_465) return null;
  const ms = Math.round(n) * 86_400_000;
  const d = new Date(Date.UTC(1899, 11, 30) + ms);
  return d.toISOString().slice(0, 10);
}

/** Chuan hoa mot o ngay: serial Excel, 'dd/mm/yyyy', hay 'yyyy-mm-dd'. */
export function chuan_ngay(o: string): string | null {
  const s = o.trim();
  if (s === '') return null;
  if (/^\d+(\.\d+)?$/.test(s)) return ngay_tu_serial(Number(s));

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (dmy !== null) {
    const [, d, m, y] = dmy as unknown as [string, string, string, string];
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (ymd !== null) return ymd[0];
  return null;
}

/**
 * Chuan hoa so dien thoai Viet Nam.
 *
 * Excel luu so dien thoai thanh SO nen no an mat so 0 dau: '0965328200' vao tep thanh
 * 965328200. Tra lai so 0 khi va chi khi con so khop dang di dong Viet Nam 9 chu so; so cua
 * nguoi nuoc ngoai (kho Trung Quoc, 11-12 chu so) giu nguyen chu khong nan cho vua.
 */
export function chuan_sdt(o: string): { so: string | null; canh_bao: string | null } {
  const s = o.trim().replace(/[^\d+]/g, '');
  if (s === '') return { so: null, canh_bao: null };
  if (s.startsWith('+')) return { so: s, canh_bao: null };
  if (/^0\d{9}$/.test(s)) return { so: s, canh_bao: null };
  if (/^\d{9}$/.test(s)) return { so: `0${s}`, canh_bao: null };
  if (/^84\d{9}$/.test(s)) return { so: `0${s.slice(2)}`, canh_bao: null };
  if (s.length >= 11) return { so: s, canh_bao: null }; // so nuoc ngoai
  return { so: s, canh_bao: `số điện thoại "${o}" không đúng dạng nào — giữ nguyên` };
}

/**
 * Chuan hoa so CCCD / CMND, va tra lai cac so 0 dau ma Excel da nuot.
 *
 * Excel luu o nay thanh SO nen '001098005546' vao tep thanh 1098005546. Giay to Viet Nam chi co
 * hai do dai hop le — CCCD 12 chu so, CMND 9 chu so — nen khong co so hop le nao dai 10 hay 11.
 * Mot chuoi 10-11 chu so la mot CCCD bi cat dau, va bu 0 cho du 12 chinh la lam nguoc lai cai
 * Excel vua lam. Van bao ra de nhan su doi chieu voi ban cung.
 *
 * Ngoai le co y:
 *   * 18 chu so = so cong dan Trung Quoc (nhan su kho Trung Quoc) — giu nguyen.
 *   * O bi Excel lam tron thanh so thuc ('1816007315.6666701') thi KHONG doan. Mot so giay to
 *     sai con te hon la de trong: cot nay co rang buoc UNIQUE va dung cho bao hiem, thue.
 */
export function chuan_cccd(o: string): { so: string | null; canh_bao: string | null } {
  const tho = o.trim();
  if (tho === '') return { so: null, canh_bao: null };
  if (tho.includes('.') || tho.toLowerCase().includes('e+')) {
    return { so: null, canh_bao: `số CCCD/CMND "${tho}" đã bị Excel làm tròn thành số thực — bỏ trống, phải nhập lại tay` };
  }
  const s = tho.replace(/\D/g, '');
  if (s === '') return { so: null, canh_bao: `số CCCD/CMND "${tho}" không có chữ số nào` };
  if (s.length === 9 || s.length === 12 || s.length === 18) return { so: s, canh_bao: null };
  if (s.length >= 10 && s.length <= 11) {
    return { so: s.padStart(12, '0'),
      canh_bao: `CCCD "${tho}" thiếu số 0 đầu do Excel — đã bù thành ${s.padStart(12, '0')}` };
  }
  if (s.length >= 7 && s.length <= 8) {
    return { so: s.padStart(9, '0'),
      canh_bao: `CMND "${tho}" thiếu số 0 đầu do Excel — đã bù thành ${s.padStart(9, '0')}` };
  }
  return { so: s, canh_bao: `số CCCD/CMND "${tho}" dài ${String(s.length)} chữ số — không phải 9, 12 hay 18. Giữ nguyên, cần kiểm tay` };
}

export function chuan_gioi_tinh(o: string): 'nam' | 'nu' | null {
  const s = o.trim().toLowerCase();
  if (s === 'nam') return 'nam';
  if (s === 'nữ' || s === 'nu') return 'nu';
  return null;
}

/**
 * Chuc danh. "Leader" la tieng Anh lan vao mot bang tieng Viet; nhan su xac nhan no la
 * TRUONG NHOM. Cac chuc danh khac giu nguyen chu tep — doi chu o day la doan y nguoi khac.
 */
export function chuan_chuc_danh(o: string): string | null {
  const s = o.trim();
  if (s === '') return null;
  if (s.toLowerCase() === 'leader') return 'Trưởng nhóm';
  return s;
}

/** 'Đang làm việc' / 'Đã nghỉ việc'. Truong khac hay de trong = khong biet, tra null. */
export function chuan_trang_thai(o: string): boolean | null {
  const s = o.trim().toLowerCase();
  if (s === '') return null;
  if (s.includes('nghỉ')) return false;
  if (s.includes('đang làm')) return true;
  return null;
}

/** Bo dau cach thua trong ho ten de so sanh giua hai nguon. */
export function chuan_ten(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function o(hang: string[], i: number | undefined): string {
  if (i === undefined || i < 0) return '';
  return (hang[i] ?? '').trim();
}

/** Doc mot sheet. Tra rong neu khong tim thay cot "Họ và tên". */
function doc_mot_sheet(du_lieu: Buffer, ten: string): {
  dong: DongNhanSu[]; co_thang_sinh: boolean; canh_bao: string[];
} {
  const canh_bao: string[] = [];
  const bang = trich_xlsx(du_lieu, { ten_sheet: ten, hang_toi_da: 5000, cot_toi_da: 64 });
  if (bang === null || bang.hang.length === 0) {
    return { dong: [], co_thang_sinh: false, canh_bao: [`sheet "${ten}": không đọc được`] };
  }

  const tieu_de = (bang.hang[0] ?? []).map(khoa_cot);
  const chi_so: Partial<Record<keyof typeof TEN_COT, number>> = {};
  for (const [truong, ten_co_the] of Object.entries(TEN_COT)) {
    const i = tieu_de.findIndex((t) => ten_co_the.includes(t));
    if (i >= 0) chi_so[truong as keyof typeof TEN_COT] = i;
  }
  if (chi_so.ho_ten === undefined) {
    return { dong: [], co_thang_sinh: false,
      canh_bao: [`sheet "${ten}": không có cột "Họ và tên" — bỏ qua`] };
  }

  const dong: DongNhanSu[] = [];
  for (let i = 1; i < bang.hang.length; i++) {
    const h = bang.hang[i] as string[];
    const ho_ten = chuan_ten(o(h, chi_so.ho_ten));
    if (ho_ten === '') continue;

    const sdt = chuan_sdt(o(h, chi_so.so_dien_thoai));
    if (sdt.canh_bao !== null) canh_bao.push(`${ten} dòng ${String(i + 1)} (${ho_ten}): ${sdt.canh_bao}`);

    const ngay_sinh = chuan_ngay(o(h, chi_so.ngay_sinh));
    const tho_ngay_sinh = o(h, chi_so.ngay_sinh);
    if (tho_ngay_sinh !== '' && ngay_sinh === null) {
      canh_bao.push(`${ten} dòng ${String(i + 1)} (${ho_ten}): ngày sinh "${tho_ngay_sinh}" không đọc được`);
    }
    if (ngay_sinh !== null && ngay_sinh > new Date().toISOString().slice(0, 10)) {
      canh_bao.push(`${ten} dòng ${String(i + 1)} (${ho_ten}): ngày sinh ${ngay_sinh} nằm ở TƯƠNG LAI`);
    }

    const cccd = chuan_cccd(o(h, chi_so.cccd));
    if (cccd.canh_bao !== null) canh_bao.push(`${ten} dòng ${String(i + 1)} (${ho_ten}): ${cccd.canh_bao}`);

    dong.push({
      sheet: ten,
      dong_so: i + 1,
      ho_ten,
      gioi_tinh: chuan_gioi_tinh(o(h, chi_so.gioi_tinh)),
      ngay_sinh,
      cccd: cccd.so,
      so_dien_thoai: sdt.so,
      email: o(h, chi_so.email) === '' ? null : o(h, chi_so.email),
      dia_chi_thuong_tru: o(h, chi_so.dia_chi_thuong_tru) === '' ? null : o(h, chi_so.dia_chi_thuong_tru),
      que_quan: o(h, chi_so.que_quan) === '' ? null : o(h, chi_so.que_quan),
      phong_ban: o(h, chi_so.phong_ban) === '' ? null : o(h, chi_so.phong_ban),
      chuc_danh: chuan_chuc_danh(o(h, chi_so.chuc_danh)),
      ngay_vao: chuan_ngay(o(h, chi_so.ngay_vao)),
      loai_hop_dong: o(h, chi_so.loai_hop_dong) === '' ? null : o(h, chi_so.loai_hop_dong),
      con_lam_viec: chuan_trang_thai(o(h, chi_so.con_lam_viec)),
    });
  }

  return { dong, co_thang_sinh: tieu_de.includes(COT_THANG_SINH), canh_bao };
}

/**
 * Doc ca tep.
 *
 * Sheet co cot "Tháng SN" bi coi la DANH SACH SINH NHAT va bo qua — nhung chi khi kiem duoc
 * rang moi nguoi trong no deu co o sheet khac. Neu no chua nguoi rieng thi bo qua la mat
 * nguoi, nen ham nem loi thay vi im lang.
 */
export function doc_ho_so_xlsx(du_lieu: Buffer): KetQuaDoc {
  const sheet_da_doc: string[] = [];
  const sheet_bo_qua: { ten: string; ly_do: string }[] = [];
  const canh_bao: string[] = [];
  const dong: DongNhanSu[] = [];
  const cho_kiem: { ten: string; dong: DongNhanSu[] }[] = [];

  for (const ten of ten_cac_sheet(du_lieu)) {
    const kq = doc_mot_sheet(du_lieu, ten);
    if (kq.dong.length === 0) {
      if (kq.canh_bao.length > 0) sheet_bo_qua.push({ ten, ly_do: 'không có dữ liệu nhân sự' });
      continue;
    }
    // Canh bao cua sheet SE BI BO QUA thi khong dua vao bao cao: no bao ve nhung o ma lenh nay
    // khong nap, va lan chay that dau tien in ra 3 dong canh bao cho mot sheet da bo qua.
    if (kq.co_thang_sinh) { cho_kiem.push({ ten, dong: kq.dong }); continue; }
    canh_bao.push(...kq.canh_bao);
    sheet_da_doc.push(ten);
    dong.push(...kq.dong);
  }

  const ten_da_co = new Set(dong.map((d) => d.ho_ten.toLowerCase()));
  for (const c of cho_kiem) {
    const rieng = c.dong.filter((d) => !ten_da_co.has(d.ho_ten.toLowerCase()));
    if (rieng.length > 0) {
      throw new Error(
        `Sheet "${c.ten}" có cột "Tháng SN" nên được coi là danh sách sinh nhật (bản sao), `
        + `nhưng nó chứa ${String(rieng.length)} người KHÔNG có ở sheet nào khác: `
        + `${rieng.slice(0, 5).map((d) => d.ho_ten).join(', ')}. `
        + 'Bỏ qua sheet này sẽ mất người — kiểm lại tệp trước khi nạp.');
    }
    sheet_bo_qua.push({
      ten: c.ten,
      ly_do: `danh sách sinh nhật — ${String(c.dong.length)} người đều đã có ở sheet khác`,
    });
  }

  return { dong, sheet_da_doc, sheet_bo_qua, canh_bao };
}
