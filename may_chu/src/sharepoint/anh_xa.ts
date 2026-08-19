// Anh xa tep ho so cua he thong sang cay thu muc SharePoint cua phong HCNS.
//
// NGUON SU THAT CUA QUY UOC NAY KHONG PHAI TOI. No la tep
// "DANH MỤC HỆ THỐNG FILE HCNS - SHAREPOINT (BỔ SUNG THEO BC 11) - 15-07-2026"
// nam ngay trong thu vien HCNS, sheet "Cây thư mục" va sheet "Quy ước & phân loại".
// Moi hang trong bang `NHANH` duoi day deu tra ve duoc mot dong trong tep do.
//
// HAI QUY UOC TEN, CO Y KHAC NHAU:
//
//   tren dia may chu   HR-01_Hoang-Minh-Ngoc/hop_dong/2026-08-18_hop-dong_HDLD_a1b2c3d4.pdf
//   tren SharePoint    01 HỒ SƠ NHÂN SỰ (201)/HR-01-HOANG MINH NGOC/
//                        HĐLĐ SỐ 07-2026 - Hoàng Minh Ngọc - 18-08-2026.pdf
//
// Vi sao khong dung mot ten cho ca hai: ten tren dia phai di qua tar, scp, rsync, WinSCP
// va `Content-Disposition`, nen bo dau va bo dau cach. SharePoint thi xu ly Unicode tot, va
// quy uoc cua HCNS viet cho NGUOI DOC — co dau, co dau cach, ngay DD-MM-YYYY.
//
// `ho_so_tep.ten_luu` VAN LA KHOA DOC. Ban tren SharePoint la ban sao; khong cho nao doc
// tep bang duong dan SharePoint.
import { bo_dau } from '../tien_ich/ten_tep.ts';

// ---------------------------------------------------------------- cay thu muc HCNS

/**
 * Cac nhanh cua thu vien HCNS ma ta ghi vao.
 *
 * Ten PHAI khop tung ky tu voi thu muc dang co tren SharePoint — ke ca dau gach ngang dai
 * `–` trong "Quan hệ lao động – HĐLĐ" (U+2013, KHONG phai dau tru thuong). Sai mot ky tu la
 * Graph tao mot thu muc MOI ben canh thu muc that, va ho so se nam o cho khong ai nhin.
 */
export const NHANH = {
  ho_so_201: '01 HỒ SƠ NHÂN SỰ (201)',
  hdld: '02 HỢP ĐỒNG & THỎA THUẬN/02.1 [A] Quan hệ lao động – HĐLĐ',
  thoa_thuan_bo_tro: '02 HỢP ĐỒNG & THỎA THUẬN/02.3 [C] Thỏa thuận bổ trợ (ký kèm)',
  bhxh_tang_giam: '03 BẢO HIỂM (BHXH–BHYT–BHTN)/03.1 Tăng, giảm & đối chiếu',
  bhxh_che_do: '03 BẢO HIỂM (BHXH–BHYT–BHTN)/03.2 Hồ sơ hưởng chế độ',
  bhxh_chot_so: '03 BẢO HIỂM (BHXH–BHYT–BHTN)/03.3 Xử lý nợ – Chốt sổ & tờ rời',
  bang_luong: '04 TIỀN LƯƠNG – THUẾ TNCN/04.1 Thang bảng lương & Bảng lương',
  thue_tncn: '04 TIỀN LƯƠNG – THUẾ TNCN/04.2 Thuế TNCN',
  dao_tao_danh_gia: '07 ĐÀO TẠO & ĐÁNH GIÁ',
  khen_thuong_ky_luat: '08 KHEN THƯỞNG – KỶ LUẬT',
  an_toan_suc_khoe: '09 AN TOÀN – SỨC KHỎE (ATVSLĐ)',
  hanh_chinh_van_thu: '12 HÀNH CHÍNH – VĂN THƯ',
} as const;

export type TenNhanh = keyof typeof NHANH;

/**
 * Cac nhanh CO NGUOI PHU TRACH RIENG. Ung dung khong ghi vao, khong xoa trong.
 *
 * Day KHONG phai "chua kip anh xa". Chung dang duoc trien khai song song bang tay, va viec
 * ung dung khong cham vao la mot QUYET DINH, khong phai mot thieu sot. Ghi thanh bang co ten
 * de dieu do doc duoc, thay vi de nguoi sau nhin thay hai thu muc thieu trong `NHANH` roi
 * "bo sung cho day du".
 *
 * Ham `duong_dan_an_toan_de_ghi` la danh sach CHO PHEP, nen no da tu choi cac nhanh nay ma
 * khong can bang nay. Gia tri cua bang nay nam o bai kiem: no bat buoc viec them mot trong hai
 * nhanh vao `NHANH` phai keo theo viec go no khoi day — tuc la mot hanh dong co y, co doi
 * chieu voi nguoi phu trach, chu khong phai mot dong them vao luc don dep.
 */
export const NHANH_NGUOI_KHAC: readonly string[] = [
  '05 CHẤM CÔNG – NGHỈ PHÉP',
  '06 TUYỂN DỤNG & THỬ VIỆC',
] as const;

/**
 * Muc nhay cam theo sheet "Quy ước & phân loại".
 *
 * Giu lai trong ma nguon de mot ngay ai do them nhanh moi thi phai khai luon muc nhay cam,
 * chu khong the them mot cho ghi ho so luong ma khong ai nghi den chuyen do.
 */
export const MUC_NHAY_CAM: Record<TenNhanh, 'noi_bo' | 'han_che' | 'nhay_cam'> = {
  ho_so_201: 'nhay_cam',
  hdld: 'han_che',
  thoa_thuan_bo_tro: 'han_che',
  bhxh_tang_giam: 'han_che',
  bhxh_che_do: 'nhay_cam',
  bhxh_chot_so: 'han_che',
  bang_luong: 'nhay_cam',
  thue_tncn: 'nhay_cam',
  dao_tao_danh_gia: 'han_che',
  khen_thuong_ky_luat: 'nhay_cam',
  an_toan_suc_khoe: 'nhay_cam',
  hanh_chinh_van_thu: 'noi_bo',
};

// ---------------------------------------------------------------- chon nhanh

export interface DauVaoAnhXa {
  /** Nhom ho so trong he thong: 'hop_dong', 'tai_lieu', 'bhxh'... */
  nhom: string;
  /**
   * Loai cu the trong nhom, khi co. Vi du:
   *   bien_ban -> 'phu_luc' | 'cam_ket' | 'ky_luat' | 'ban_giao' | ...
   *   bhxh     -> 'bao_tang' | 'om_dau' | 'chot_so' | ...
   */
  loai?: string | null;
  /** Ma danh muc tai lieu, chi co voi nhom 'tai_lieu'. Vi du 'KHAM_SUC_KHOE'. */
  ma_tai_lieu?: string | null;
}

/** Ma danh muc tai lieu di sang nhanh 09 thay vi 01 — la du lieu suc khoe. */
const TAI_LIEU_SUC_KHOE = new Set(['KHAM_SUC_KHOE', 'GIAY_KHAM_SUC_KHOE', 'SUC_KHOE']);

/** Loai BHXH thuoc "huong che do" (03.2) theo sheet Cây thư mục. */
const BHXH_CHE_DO = new Set(['om_dau', 'thai_san', 'duong_suc', 'tai_nan_lao_dong']);

/**
 * Chon nhanh SharePoint cho mot tep. Tra null = KHONG day sang.
 *
 * Tra null thay vi doan mot cho nao do: dac ta cua HCNS khong phu het moi nhom cua he
 * thong (`khieu_nai` khong co nhanh nao), va day ho so khieu nai vao mot thu muc doan bua
 * la loai sai te nhat — khieu nai co the la ve chinh nguoi dang co quyen doc thu muc do.
 */
export function chon_nhanh(d: DauVaoAnhXa): TenNhanh | null {
  switch (d.nhom) {
    case 'tai_lieu':
      // Giay kham suc khoe la DU LIEU SUC KHOE — nhanh 09 khai dung dieu do, con 01 thi
      // liet ke "SYLL, CCCD, van bang". Theo dac ta chu khong theo tien tay.
      return d.ma_tai_lieu !== null && d.ma_tai_lieu !== undefined
        && TAI_LIEU_SUC_KHOE.has(d.ma_tai_lieu.toUpperCase())
        ? 'an_toan_suc_khoe'
        : 'ho_so_201';

    case 'thong_tin':
      return 'ho_so_201';

    case 'hop_dong':
      return 'hdld';

    case 'bien_ban':
      // 02.1 ghi ro co "phu luc, cham dut/thanh ly"; 02.3 la NDA va cam ket; 08 la ky luat
      // va khen thuong; 12 la ban giao tai san.
      if (d.loai === 'phu_luc') return 'hdld';
      if (d.loai === 'ky_luat' || d.loai === 'khen_thuong') return 'khen_thuong_ky_luat';
      if (d.loai === 'ban_giao') return 'hanh_chinh_van_thu';
      return 'thoa_thuan_bo_tro';

    case 'luong':
      return 'bang_luong';

    case 'nguoi_phu_thuoc':
      // 04.2 ghi dung: "MST, giam tru gia canh, quyet toan".
      return 'thue_tncn';

    case 'bhxh':
      if (d.loai !== null && d.loai !== undefined && BHXH_CHE_DO.has(d.loai)) {
        return 'bhxh_che_do';
      }
      if (d.loai === 'chot_so') return 'bhxh_chot_so';
      return 'bhxh_tang_giam';

    case 'cong_viec':
    case 'bao_cao':
      return 'dao_tao_danh_gia';

    case 'thiet_bi':
      return 'hanh_chinh_van_thu';

    // `khieu_nai` va moi nhom khac: KHONG day sang.
    default:
      return null;
  }
}

// ---------------------------------------------------------------- ten thu muc nhan vien

/**
 * Ten thu muc nhan vien theo sheet "Quy ước": `[Mã NV]-[Họ tên]`, vi du `NV015-NGUYEN VAN A`.
 *
 * Vi du trong dac ta viet HOA va KHONG DAU, trong khi quy uoc TEN TEP lai ghi ro "[TÊN CÓ
 * DẤU]". Hai cho tuong phan nhau nen o day theo dung vi du: thu muc thi HOA khong dau, ten
 * tep thi giu dau.
 */
export function thu_muc_nhan_vien(ma_nv: string, ho_ten: string): string {
  const ma = lam_sach_ten_sp(ma_nv).trim();
  const ten = lam_sach_ten_sp(bo_dau(ho_ten)).trim().toUpperCase().replace(/\s+/g, ' ');
  if (ma === '') return ten === '' ? 'KHONG-RO' : ten;
  return ten === '' ? ma : `${ma}-${ten}`;
}

// ---------------------------------------------------------------- ten tep

export interface DauVaoTenTep {
  /**
   * Nhan loai van ban, vi du 'HĐLĐ', 'CCCD', 'QĐ LƯƠNG'. Lay tu `NHAN_LOAI`.
   *
   * TEN LA `nhan`, KHONG PHAI `loai`, va do la co y. `DauVaoAnhXa.loai` la mot thu KHAC
   * han: no la loai con trong nhom ('phu_luc', 'om_dau', 'chot_so') va dung de CHON NHANH.
   * Hai truong nay tung cung ten `loai` trong mot ban truoc, va vi `DauVaoDuongDan` ke thua
   * ca hai interface nen tsc bao TS2320 — may la no bao. Neu kieu bi xoa (nhu khi chay bang
   * `--experimental-strip-types`) thi loi nay im lang: ten tep se in ra 'phu_luc SỐ ...'.
   */
  nhan: string;
  /** So van ban khi co, vi du '07/2026'. Bo trong thi khong co phan "SỐ ...". */
  so?: string | null;
  /** Phan giua: ho ten nhan vien, hoac trich yeu. GIU DAU tieng Viet. */
  ten: string;
  /** Ngay tren tep, dang YYYY-MM-DD (se doi sang DD-MM-YYYY). */
  ngay: string;
  /** Duoi tep, khong co dau cham. */
  duoi: string;
}

/** Do dai toi da cua ten tep. SharePoint chan 400 ky tu cho CA duong dan, khong chi ten. */
const DAI_TEN_TEP = 120;

/**
 * Ten tep theo sheet "Quy ước": `[LOẠI] SỐ [MÃ] - [TÊN CÓ DẤU] - DD-MM-YYYY`.
 *
 * Vi du trong dac ta: `QĐ SỐ 05 - BỔ NHIỆM - 15-07-2026`.
 *
 * NGAY DUNG GACH NOI, khong dung dau cham — dac ta ghi ro ly do: "để iOS không hiểu nhầm
 * đuôi file". Mot ten `... - 15.07.2026.pdf` bi iOS doc thanh duoi `.2026.pdf`.
 */
export function ten_tep_sharepoint(d: DauVaoTenTep): string {
  const phan: string[] = [];

  const nhan = lam_sach_ten_sp(d.nhan).trim();
  const so = d.so === null || d.so === undefined ? '' : lam_sach_ten_sp(d.so).trim();
  phan.push(so === '' ? nhan : `${nhan} SỐ ${so}`);

  const ten = lam_sach_ten_sp(d.ten).trim();
  if (ten !== '') phan.push(ten);

  phan.push(ngay_kieu_hcns(d.ngay));

  const goc = phan.filter((p) => p !== '').join(' - ');
  const duoi = d.duoi.replace(/^\./, '').toLowerCase();
  return `${cat_ten(goc, DAI_TEN_TEP - duoi.length - 1)}.${duoi}`;
}

/** YYYY-MM-DD -> DD-MM-YYYY. Chuoi khong dung dang thi tra nguyen — de con thay ma sua. */
export function ngay_kieu_hcns(ngay: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ngay);
  if (m === null) return ngay;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Nhan loai van ban cho tung nhom, dung lam phan `[LOẠI]` cua ten tep. */
export const NHAN_LOAI: Record<string, string> = {
  hop_dong: 'HĐLĐ',
  bien_ban: 'BIÊN BẢN',
  luong: 'QĐ LƯƠNG',
  bhxh: 'BHXH',
  tai_lieu: 'HỒ SƠ',
  thong_tin: 'HỒ SƠ',
  nguoi_phu_thuoc: 'NPT',
  cong_viec: 'CÔNG VIỆC',
  bao_cao: 'BÁO CÁO',
  thiet_bi: 'THIẾT BỊ',
};

// ---------------------------------------------------------------- lam sach ten

/**
 * Bo nhung ky tu SharePoint / OneDrive KHONG NHAN trong ten tep va thu muc.
 *
 * Danh sach cam: " * : < > ? / \ | va ky tu dieu khien. Dau cham dau ten cung bi tu choi.
 * Day la HANG RAO, khong phai lam cho dep: mot ten chua `/` se bien mot lan tai len thanh
 * mot cay thu muc khong ai mong doi, va mot ten chua ky tu dieu khien co the lam vo header.
 *
 * Tieng Viet co dau thi GIU — SharePoint nhan Unicode, va dac ta cua HCNS doi co dau.
 */
export function lam_sach_ten_sp(s: string): string {
  return s
    // Ky tu dieu khien: xoa han, khong doi thanh dau cach.
    //
    // VIET BANG \u, KHONG VIET KY TU THAT. Mot lan truoc day lop nay chua dung byte
    // 0x00 va 0x1f, va tren man hinh no hien ra la `[ -]` — doc nhu "dau cach hoac gach
    // noi", tuc la doc thanh ke huy hoai moi ten. Chua ke mot byte NUL nam trong tep
    // .ts thi bat ky editor hay `sed` nao cung co the lam sai lech no khong tieng dong.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/["*:<>?/\\|]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\.+/, '')
    .trim();
}

/** Cat ten ve do dai toi da, khong de lai khoang trang hay gach noi lung lo o cuoi. */
function cat_ten(s: string, tran: number): string {
  if (s.length <= tran) return s;
  return s.slice(0, Math.max(1, tran)).replace(/[\s-]+$/, '');
}

// ---------------------------------------------------------------- duong dan day du

export interface DuongDanSharePoint {
  nhanh: TenNhanh;
  /** Duong dan tuong doi tu goc thu vien, chua ke ten tep. */
  thu_muc: string;
  ten_tep: string;
  /** Ca duong dan, de goi Graph. */
  day_du: string;
  muc_nhay_cam: 'noi_bo' | 'han_che' | 'nhay_cam';
}

/** SharePoint chan 400 ky tu cho ca duong dan tuong doi trong thu vien. */
export const DUONG_DAN_TOI_DA = 400;

export interface DauVaoDuongDan extends DauVaoAnhXa, DauVaoTenTep {
  ma_nv: string;
  ho_ten: string;
}

/**
 * Duong dan day du cua mot tep tren SharePoint. Tra null khi nhom khong duoc day sang.
 *
 * MOI NHANH DEU CO MOT CAP `[Mã NV]-[Họ tên]`, ke ca cac nhanh ma dac ta khong noi ro —
 * `04.1 Bảng lương` chang han. Ly do: khong co cap do thi mot nhanh se thanh mot thu muc
 * phang hang nghin tep cua tat ca moi nguoi, va do dung la thu ma ca viec sap xep nay dinh
 * tranh.
 */
export function duong_dan_sharepoint(d: DauVaoDuongDan): DuongDanSharePoint | null {
  const nhanh = chon_nhanh(d);
  if (nhanh === null) return null;

  const thu_muc = `${NHANH[nhanh]}/${thu_muc_nhan_vien(d.ma_nv, d.ho_ten)}`;
  const ten_tep = ten_tep_sharepoint(d);
  return {
    nhanh,
    thu_muc,
    ten_tep,
    day_du: `${thu_muc}/${ten_tep}`,
    muc_nhay_cam: MUC_NHAY_CAM[nhanh],
  };
}

/**
 * Duong dan nay co an toan de GHI khong?
 *
 * Goi truoc moi lan tai len va truoc moi lan XOA. Ban chon "mot chieu, xoa lan theo", va
 * dich la thu vien HCNS DANG DUNG THAT — nen dieu quan trong nhat cua ca tinh nang nay la
 * ung dung KHONG BAO GIO cham vao tep do nguoi khac xep tay.
 *
 * Ba dieu kien, va thieu mot la tu choi:
 *   1. Nam trong mot nhanh co trong bang `NHANH`.
 *   2. Co dung ba cap: <nhanh>/<[Mã NV]-[Họ tên]>/<ten tep>. Nhanh cap hai (vi du
 *      "02 .../02.1 ...") thi thanh bon cap.
 *   3. Khong co `..`, khong bat dau bang `/`, khong vuot 400 ky tu.
 */
export function duong_dan_an_toan_de_ghi(duong_dan: string): boolean {
  if (!khung_duong_dan_hop_le(duong_dan)) return false;

  const nhanh = Object.values(NHANH).find((n) => duong_dan.startsWith(`${n}/`));
  if (nhanh === undefined) return false;

  // Con lai phai la dung `<thu muc nhan vien>/<ten tep>` — hai doan, khong hon.
  const con_lai = duong_dan.slice(nhanh.length + 1).split('/');
  if (con_lai.length !== 2) return false;
  return con_lai.every(doan_sach);
}

/**
 * Duong dan nay co an toan de TAO THU MUC khong?
 *
 * Quy tac KHAC voi ghi tep, va phai khac: mot thu muc chi duoc la chinh mot nhanh trong
 * bang `NHANH`, hoac mot cap nhan vien nam ngay trong nhanh do. Khong co cap thu ba.
 *
 * Vi sao tach ham rieng thay vi dung lai `duong_dan_an_toan_de_ghi`: ham do doi DUNG ba cap
 * (cap cuoi la ten tep), nen muon dung no cho thu muc thi hoac phai noi them mot doan gia,
 * hoac phai noi long dieu kien. Ca hai deu lam yeu chinh cai hang rao.
 */
export function thu_muc_an_toan_de_tao(duong_dan: string): boolean {
  if (!khung_duong_dan_hop_le(duong_dan)) return false;

  // Chinh mot nhanh: khong tao gi moi, chi bao dam no co (nhanh that thi Graph tra 409).
  if ((Object.values(NHANH) as string[]).includes(duong_dan)) return true;

  const nhanh = Object.values(NHANH).find((n) => duong_dan.startsWith(`${n}/`));
  if (nhanh === undefined) return false;

  const con_lai = duong_dan.slice(nhanh.length + 1).split('/');
  if (con_lai.length !== 1) return false;
  return doan_sach(con_lai[0] ?? '');
}

/** Cac dieu kien dung chung cho ca ghi tep va tao thu muc. */
function khung_duong_dan_hop_le(duong_dan: string): boolean {
  if (duong_dan.includes('..')) return false;
  if (duong_dan.startsWith('/') || duong_dan.endsWith('/')) return false;
  if (duong_dan.length > DUONG_DAN_TOI_DA) return false;
  return true;
}

/** Mot doan ten trong duong dan: khong rong, va da la ten SharePoint sach san. */
function doan_sach(p: string): boolean {
  return p.trim() !== '' && p === lam_sach_ten_sp(p);
}

/**
 * Cac cap thu muc phai bao dam co, theo dung thu tu, truoc khi ghi mot tep.
 *
 * Graph KHONG tu tao thu muc cha khi ghi theo duong dan — `PUT /root:/a/b/c.pdf:/content`
 * voi `a/b` chua ton tai tra 404, chu khong tao `a/b`. Nen phai di tu tren xuong.
 */
export function cac_cap_can_tao(duong_dan_thu_muc: string): string[] {
  const doan = duong_dan_thu_muc.split('/');
  return doan.map((_, i) => doan.slice(0, i + 1).join('/'));
}
