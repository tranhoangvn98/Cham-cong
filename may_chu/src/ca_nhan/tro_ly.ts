// Tro ly du lieu ca nhan — chatbot tra loi tu CHINH du lieu cua nguoi hoi.
//
// HAI TANG, TACH RO VI TRI:
//   1. SU THAT = truy van SQL. Moi con so (phep, cong, di muon, che tai noi quy, don cho
//      duyet) deu do code tinh — khong bao gio de AI tinh hay bịa ra mot con so.
//   2. GIONG NOI = DeepSeek (khi khai DEEPSEEK_API_KEY). AI chi duoc:
//        - viet lai loi tra loi tu boi canh TOI THIEU (con so, khong ten/email/id) — an danh
//          theo NĐ 13/2023;
//        - tro chuyen cau hoi ngoai luat va trich ngay xin nghi tu cau noi;
//      AI KHONG duoc: dien giai che tai noi quy (giu NGUYEN VAN), sua payload hanh dong,
//      cham vao du lieu ho so. Loi mang/het khoa thi roi ve loi san co — chatbot khong chet
//      vi LLM.
//
// Bo sung (1.94.0):
//   - Tra cuu tri thuc cong ty: noi quy/che tai vi pham (bang loai_vi_pham), van ban cong ty
//     (bang van_ban_cong_ty) va thong bao (bang thong_bao). Du lieu nay KHONG thuoc ca nhan.
//   - Hanh dong cho xac nhan (`hanh_dong`): tro ly DIEN SAN payload don (nghi phep, giai
//     trinh, de xuat, huy don) nhung KHONG ghi gi vao CSDL. Khi nhan vien bam "Xac nhan" o
//     giao dien, TRINH DUYET cua ho moi goi route POST san co voi token cua chinh ho. Tro ly
//     khong bao gio tu thuc thi thay doi du lieu — do la nguyen tac bat di bat dich.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { bo_dau } from '../tien_ich/ten_tep.ts';
import {
  cong_ngay, khoang_thang, ngay_dia_phuong, ngay_viet,
} from '../tien_ich/thoi_gian.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { goi_deepseek } from '../ai/deepseek.ts';

/** Cung tap loai nghi voi route POST /api/toi/nghi-phep (toi.ts). Khong import tu do de tranh vong import. */
export const LOAI_NGHI = [
  'phep_nam', 'khong_luong', 'om', 'thai_san', 'ket_hon', 'hieu',
] as const;

export type LoaiNghi = (typeof LOAI_NGHI)[number];

/** Hanh dong tro ly da dien san, CHO nhan vien bam xac nhan. Chua co gi duoc gui di. */
export interface HanhDongChoXacNhan {
  loai: 'tao_don_nghi_phep' | 'tao_giai_trinh' | 'tao_de_xuat' | 'huy_don'
    | 'tao_don_lam_them' | 'tao_don_doi_ca' | 'tao_don_cong_tac' | 'tao_don_thoi_viec'
    | 'tao_don_di_muon' | 'tao_khieu_nai_luong' | 'tao_khieu_nai_ky_luat';
  tieu_de: string;
  /** Cac dong chi tiet hien cho nguoi dung xem truoc khi bam Xac nhan. */
  chi_tiet: string[];
  /** Duong dan POST ma GIAO DIEN goi khi nhan vien bam Xac nhan. Luon nam trong /api/toi. */
  duong_dan: string;
  phuong_thuc: 'POST';
  /** Payload gui kem. Do tro ly tinh tu cau hoi, giao dien khong sua gi. */
  du_lieu: Record<string, unknown>;
  /** Nhan cua nut xac nhan va nut bo. */
  nhan: string;
  bo: string;
}

export interface TraLoiTroLy {
  tra_loi: string;
  /** Nhan y dinh da nhan dang (de giao dien lam noi bat). */
  y_dinh: string;
  /** Goi y cau hoi tiep theo. */
  goi_y: string[];
  /** Khi co: giao dien hien the xac nhan, nhan vien tu bam moi gui. */
  hanh_dong?: HanhDongChoXacNhan;
}

const GOI_Y = [
  'Tôi còn bao nhiêu ngày phép?',
  'Đăng ký OT giúp tôi',
  'Công tháng này của tôi thế nào?',
  'Tháng này tôi đi muộn mấy lần?',
  'Đi muộn bị xử lý thế nào?',
  'Tôi muốn xin đổi ca',
  'Sắp tới có nghỉ lễ gì không?',
  'Tôi có đơn nào đang chờ duyệt không?',
];

/** Bo dau + thuong hoa de so khop tu khoa khong phu thuoc dau tieng Viet. */
export function chuan(s: string): string {
  return bo_dau(s).toLowerCase();
}

function co(cau: string, ...tu: string[]): boolean {
  return tu.some((t) => cau.includes(t));
}

/** Tu dung khong mang y nghia tim kiem — loai khoi bo tu khoa tra cuu noi quy/van ban. */
const TU_DUNG = new Set([
  'la', 'gi', 'nao', 'the', 'nhu', 'va', 'cua', 'cho', 'khi', 'bi', 'co', 'duoc', 'khong',
  'phai', 'toi', 'minh', 'cong', 'ty', 'se', 'thi', 'do', 'trong', 'ra', 'vao', 'neu',
  'hay', 'hoi', 've', 'anh', 'chi', 'ban', 'em', 'voi', 'ngay', 'thang', 'nam', 'nay',
  'hom', 'qua', 'mai', 'bao', 'nhieu', 'lan', 'sao', 'tai', 'ma', 'nhung', 'nhung',
]);

/** Cum tu nhan dien hanh vi — dai 2 chu nhung mang nghia rieng, khong bi bo nhu tu le. */
const CUM_TU_HANH_VI = [
  'di muon', 'di tre', 've som', 'khong cham', 'quen quet', 'nghi khong', 'gian lan',
  'lam viec rieng', 'trang phuc', 'mat trat tu', 'xa rac', 'mat ve sinh', 'lang phi',
  'uong ruou', 'danh nhau', 'tiet lo', 'tham o', 'nhan hoi lo', 'gay mat', 'tinh cam',
];

/** Tach tu khoa co y nghia: cum tu nhan dien truoc, roi tu >= 3 ky tu, khong trung lap. */
export function tu_khoa(cau: string): string[] {
  const c = chuan(cau);
  const tap = new Set<string>();
  for (const cum of CUM_TU_HANH_VI) {
    if (c.includes(cum)) tap.add(cum);
  }
  for (const tu of c.split(/[^a-z0-9]+/)) {
    if (tu.length >= 3 && !TU_DUNG.has(tu)) tap.add(tu);
  }
  return [...tap];
}

// ==================================================================== phan tich ngay

/**
 * Doc mot ngay tu cau noi, neo theo ngay hom nay cua MUI GIO MAY (device TZ).
 *
 * Hieu: "hom nay", "hom qua", "ngay mai"/"mai", "ngay kia", va dang dd/mm (nam tuy chon,
 * thieu thi lay nam hien tai). Tra 'YYYY-MM-DD' hoac null khi khong co ngay hop le.
 */
export function phan_tich_ngay(cau: string, hom_nay: string): string | null {
  const c = chuan(cau);
  if (/\bhom nay\b/.test(c)) return hom_nay;
  if (/\bhom qua\b/.test(c)) return cong_ngay(hom_nay, -1);
  if (/\bngay mai\b|\bmai\b/.test(c)) return cong_ngay(hom_nay, 1);
  if (/\bngay kia\b/.test(c)) return cong_ngay(hom_nay, 2);

  const m = c.match(
    /(?:^|\D)(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?(?=\D|$)/,
  );
  if (m === null) return null;
  const ng = Number(m[1]);
  const th = Number(m[2]);
  let nam = m[3] === undefined ? Number.NaN : Number(m[3]);
  if (Number.isNaN(nam)) nam = Number(hom_nay.slice(0, 4));
  else if (nam < 100) nam += 2000;
  if (th < 1 || th > 12 || ng < 1 || ng > 31) return null;
  const kq = `${nam}-${String(th).padStart(2, '0')}-${String(ng).padStart(2, '0')}`;
  // Chan ngay khong co that (vd 31/02): Date se troi sang thang khac.
  const d = new Date(`${kq}T00:00:00Z`);
  if (d.toISOString().slice(0, 10) !== kq) return null;
  return kq;
}

/** Ngay dang YYYY-MM-DD va co that tren lich (chan 31/02). Ham thuan de kiem. */
export function ngay_hop_le(ngay: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return false;
  const d = new Date(`${ngay}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === ngay;
}

/** Ket qua phan tich khoang nghi: tu/den/nua ngay. */
export interface KhoangNghi {
  tu: string;
  den: string;
  nua_ngay: boolean;
}

/**
 * Doc khoang ngay nghi tu cau noi ("25/09", "25/09 - 28/09", "tu 25 den 28/09",
 * "nua ngay 25/09"). Neu chi co mot ngay thi tu = den. Tra null khi khong co ngay nao.
 */
export function phan_tich_khoang_nghi(cau: string, hom_nay: string): KhoangNghi | null {
  const c = chuan(cau);
  const nua_ngay = /\bnua ngay\b|\bnua buoi\b|\bbuoi sang\b|\bbuoi chieu\b/.test(c);

  // "tu X den Y": tach theo tu "den" truoc de khong nham hai so trong cung mot ngay.
  const vt_den = c.indexOf(' den ');
  if (vt_den >= 0) {
    const tu = phan_tich_ngay(c.slice(0, vt_den), hom_nay);
    const den = phan_tich_ngay(c.slice(vt_den), hom_nay);
    if (tu === null || den === null) return null;
    return den < tu ? null : { tu, den, nua_ngay };
  }

  // Gom tat ca ngay trong cau: ngay tuong doi truoc ("hom nay"), roi den ngay dang so
  // (vd "nghi 25/09 va 26/09").
  const cac_ngay: string[] = [];
  if (/\bhom nay\b/.test(c)) cac_ngay.push(hom_nay);
  if (/\bhom qua\b/.test(c)) cac_ngay.push(cong_ngay(hom_nay, -1));
  if (/\bngay mai\b|\bmai\b/.test(c)) cac_ngay.push(cong_ngay(hom_nay, 1));
  if (/\bngay kia\b/.test(c)) cac_ngay.push(cong_ngay(hom_nay, 2));
  for (const m of c.matchAll(/(?:^|\D)(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?(?=\D|$)/g)) {
    const kq = phan_tich_ngay(m[0].trim(), hom_nay);
    if (kq !== null) cac_ngay.push(kq);
  }
  if (cac_ngay.length === 0) return null;
  const tu = cac_ngay[0]!;
  const den = cac_ngay.length >= 2 ? cac_ngay[1]! : tu;
  if (den < tu) return null;
  return { tu, den, nua_ngay };
}

/** Suy loai nghi tu cau noi. Mac dinh phep_nam. */
export function phan_tich_loai_nghi(cau: string): LoaiNghi {
  const c = chuan(cau);
  if (/\bom\b|\bbenh\b|\bsot\b|\bkham benh\b/.test(c)) return 'om';
  if (/\bkhong luong\b|\bkhong phep\b|\bviec rieng\b/.test(c)) return 'khong_luong';
  if (/\bhieu\b|\btang gia\b/.test(c)) return 'hieu';
  if (/\bcuoi\b|\bket hon\b/.test(c)) return 'ket_hon';
  if (/\bthai san\b|\bsinh\b/.test(c)) return 'thai_san';
  return 'phep_nam';
}

/** Lay phan "vi ..." lam ly do, cat ve 500 ky tu. Rong = null. */
export function phan_tich_ly_do(cau_goc: string): string | null {
  const vt = cau_goc.toLowerCase().indexOf(' vì ');
  if (vt < 0) return null;
  const ly_do = cau_goc.slice(vt + 4).trim();
  return ly_do === '' ? null : ly_do.slice(0, 500);
}

/** Hai moc gio doc duoc tu cau noi, dang HH:MM (24 gio). */
export interface MocGio {
  bat_dau: string | null;
  ket_thuc: string | null;
}

/**
 * Doc gio tu cau noi: hieu "18:00", "18h", "18 gio", va buoi trong ngay dung TRUOC hoac ngay
 * SAU moc ("6 gio toi" = 18:00, "2 gio chieu" = 14:00). Lay toi da HAI moc theo thu tu xuat
 * hien: moc dau la bat dau, moc sau la ket thuc. Gio vo ly (25:99) bi bo qua.
 */
export function phan_tich_gio(cau: string): MocGio {
  const c = chuan(cau);
  const mau: { vt: number; h: number; p: number }[] = [];
  for (const m of c.matchAll(/(\d{1,2}):(\d{2})/g)) {
    mau.push({ vt: m.index, h: Number(m[1]), p: Number(m[2]) });
  }
  for (const m of c.matchAll(/(\d{1,2})\s*(?:h\b|gio\b)/g)) {
    if (mau.some((g) => g.vt === m.index)) continue;
    mau.push({ vt: m.index, h: Number(m[1]), p: 0 });
  }
  mau.sort((a, b) => a.vt - b.vt);
  const moc = mau.slice(0, 2).map((g) => {
    let h = g.h;
    // Buoi dung TRUOC moc ("8 gio toi") hoac ngay SAU moc ("6 gio toi") — uu tien truoc.
    const truoc = [...c.slice(0, g.vt).matchAll(/\b(sang|chieu|toi|dem)\b/g)].pop()?.[1] ?? null;
    const sau = c.slice(g.vt, g.vt + 25).match(/\b(sang|chieu|toi|dem)\b/)?.[1] ?? null;
    const buoi = truoc ?? sau;
    if ((buoi === 'toi' || buoi === 'dem' || buoi === 'chieu') && h < 12) h += 12;
    if (h > 23 || g.p > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(g.p).padStart(2, '0')}`;
  }).filter((g): g is string => g !== null);
  return { bat_dau: moc[0] ?? null, ket_thuc: moc[1] ?? null };
}

/**
 * Doc noi den tu cau di cong tac ("di cong tac Ha Noi tu 26/09", "di Can Tho"). Cat o cac
 * tu danh dau thoi gian/ly do. Rong thi tra null (route nhan null duoc).
 *
 * LUU Y: \b cua JS khong hieu chu Viet co dau — phai dung lookaround nhu da tung gap.
 */
export function phan_tich_noi_den(cau_goc: string): string | null {
  const m = cau_goc.match(
    /(?<![A-Za-z0-9À-ỹ])đi\s+(.+?)(?=\s+(?:công tác|từ|đến|ngày|vào|về|vì|để|trong)(?![A-Za-z0-9À-ỹ])|$)/iu,
  );
  if (m === null) return null;
  const noi = m[1]!.trim().replace(/^công tác\s*/iu, '').replace(/^tại\s*/iu, '')
    .replace(/[,.]+$/, '');
  if (noi === '') return null;
  return noi.slice(0, 100);
}

/**
 * Boc noi dung khieu nai tu cau goc: bo phan mo dau ("toi muon gui khieu nai phieu luong"),
 * uu tien phan sau "vi ...". Tra null khi con lai qua ngan (route doi toi thieu 5 ky tu).
 */
export function phan_tich_noi_dung_khieu_nai(cau_goc: string): string | null {
  const t = cau_goc.trim()
    .replace(/^(?:toi|tôi|minh|mình)\s+(?:muon|muốn|can|cần|la|là)\s+/iu, '')
    .replace(/^(?:gui|gửi)\s+/iu, '')
    .replace(/^(?:khieu nai|khiếu nại)\s+(?:ve|về)?\s*/iu, '')
    .replace(/^(?:(?:phieu|phiếu)\s*)?(?:luong|lương|ky luat|kỷ luật|ho so|hồ sơ|quyet dinh|quyết định)?\s*[:.\-]?\s*/iu, '');
  const ly = phan_tich_ly_do(t);
  if (ly !== null) return ly;
  const kq = t.trim().replace(/^(?:vì|vi|do)\s+/iu, '').trim();
  if (kq.length < 5) return null;
  return kq.slice(0, 2000);
}

/** Ket qua phan tich giai trinh quen quet. */
export interface GiaiTrinh {
  ngay: string | null;
  ly_do: string | null;
  /** true = nguoi noi quen quet VAO, false = quen quet RA, null = khong ro. */
  quen_vao: boolean | null;
}

/** Doc ngay + ly do + buoi quen quet tu cau giai trinh. */
export function phan_tich_giai_trinh(cau: string, hom_nay: string): GiaiTrinh {
  const c = chuan(cau);
  const quen_vao = /\bquen\b|\bkhong\b/.test(c) && /\bvao\b/.test(c);
  const quen_ra = /\bquen\b|\bkhong\b/.test(c) && /\bra\b/.test(c);
  return {
    ngay: phan_tich_ngay(cau, hom_nay),
    ly_do: phan_tich_ly_do(cau),
    quen_vao: quen_vao && !quen_ra ? true : quen_ra && !quen_vao ? false : null,
  };
}

/** Tach tieu de + noi dung cua de xuat tu cau goc. Tra null khi tieu de qua ngan. */
export function phan_tich_de_xuat(cau_goc: string): { tieu_de: string; noi_dung: string } | null {
  let t = cau_goc.trim()
    .replace(/^đề xuất\s*[:.\-]?\s*/iu, '')
    .replace(/^kiến nghị\s*[:.\-]?\s*/iu, '')
    .replace(/^góp ý\s*[:.\-]?\s*/iu, '')
    .replace(/^(tôi|minh|mình)\s+(muốn\s+)?(đề xuất|kiến nghị|góp ý)\s*[:.\-]?\s*/iu, '');
  t = t.trim();
  if (t.length < 3) return null;
  return { tieu_de: t.slice(0, 250), noi_dung: t.slice(0, 4000) };
}

// ==================================================================== nhan dang y dinh

export type YDinh =
  | 'chao' | 'giai_trinh' | 'huy_don' | 'de_xuat' | 'xin_nghi_phep'
  | 'noi_quy' | 'thong_bao' | 'van_ban' | 'luong' | 'di_muon'
  | 'cong_thang' | 'nghi_le' | 'ca_lam' | 'don_cho' | 'phep' | 'khong_ro'
  | 'dang_ky_ot' | 'doi_ca' | 'cong_tac' | 'nghi_viec' | 'xin_di_muon'
  | 'khieu_nai_luong' | 'khieu_nai_ky_luat' | 'ung_luong';

/**
 * Nhan dang y dinh bang tu khoa (khong dau). THU TU CO Y: y dinh hep truoc y dinh rong —
 * vi du "xin nghi phep" phai duoc bat truoc "phep", "quen quet" truoc "cong thang".
 *
 * Tu chuan hoa dau vao (bo dau + thuong hoa) nen goi bang chuoi co dau hay khong dau deu duoc.
 */
export function nhan_dang_y_dinh(cau_goc: string): YDinh {
  const cau = chuan(cau_goc);
  if (cau.trim() === '') return 'chao';
  if (co(cau, 'giai trinh', 'quen quet', 'quen cham', 'quen bam', 'khong quet', 'khong bam')) return 'giai_trinh';
  if (co(cau, 'huy don', 'huy nghi', 'huy de xuat', 'bo don', 'huy dơn', 'rut don')) return 'huy_don';
  // Hoi MAU DON / bieu mau la tim van ban, khong phai muon lam don: "mau don xin nghi".
  // Phai kiem TRUOC de xuat/xin nghi vi "bieu mau de xuat" chua ca "de xuat".
  if (co(cau, 'mau don', 'bieu mau', 'mau nghi')) return 'van_ban';
  // Khieu nai truoc moi thu: "khieu nai ky luat" chua "ky luat" (noi_quy) va
  // "khieu nai luong" chua "luong" — tach dung loai ngay tu dau.
  if (co(cau, 'khieu nai')) {
    return co(cau, 'luong', 'phieu luong') ? 'khieu_nai_luong' : 'khieu_nai_ky_luat';
  }
  // Nghi viec truoc xin_nghi_phep ("xin nghi viec" chua "xin nghi"). Chua nghi viec
  // hieu/tang che ra — do la loai NGHI PHEP che do, khong phai thoi viec.
  if (!co(cau, 'hieu', 'tang gia', 'tang che')
    && co(cau, 'thoi viec', 'nghi viec', 'bo viec', 'cham dut', 'nop don thoi')) return 'nghi_viec';
  if (co(cau, 'de xuat', 'kien nghi', 'gop y', 'góp y')) return 'de_xuat';
  if (co(cau, 'xin nghi', 'xin phep', 'xin om', 'nghi om', 'muon nghi', 'dang ky nghi', 'nghi phep ngay')) return 'xin_nghi_phep';
  // Cac don tu phuc vu chu dong — dat truoc cac y dinh rong cung tu ("cong tac" chua
  // "cong", "doi ca" chua "ca"). "ot" khop theo tu nguyen de khong bam phai "tot".
  if (/\bot\b/.test(cau) || co(cau, 'lam them', 'tang ca', 'them gio')) return 'dang_ky_ot';
  if (co(cau, 'doi ca', 'chuyen ca')) return 'doi_ca';
  if (co(cau, 'cong tac')) return 'cong_tac';
  if (co(cau, 'xin di muon', 'dang ky di muon', 'bao di muon', 'xin den tre', 'dang ky den tre')) return 'xin_di_muon';
  if (co(cau, 'ung luong', 'tam ung', 'ung truoc')) return 'ung_luong';
  if (co(cau, 'noi quy', 'vi pham', 'ky luat', 'che tai', 'bi phat', 'giam thuong', 'xu ly khi', 'sai pham')) return 'noi_quy';
  // Hoi hanh vi + che tai cung la cau hoi noi quy: "di muon bi xu ly the nao" khong phai
  // cau hoi so lieu ca nhan.
  if (co(cau, 'xu ly', 'che tai', 'phat', 'quy dinh', 'noi quy', 'giam thuong')
    && co(cau, 'muon', 'tre', 've som', 'vang', 'cham cong', 'quet', 'di lam')) return 'noi_quy';
  if (co(cau, 'thong bao', 'tin tuc')) return 'thong_bao';
  if (co(cau, 'van ban', 'chinh sach', 'bieu mau', 'huong dan', 'quy dinh', 'quy che', 'tai lieu', 'cong van', 'mau don')) return 'van_ban';
  if (co(cau, 'luong', 'thu nhap', 'phieu luong')) return 'luong';
  if (co(cau, 'muon', 've som', 'tre')) return 'di_muon';
  if (co(cau, 'cong', 'cham cong', 'thang nay', 'di lam', 'ngay cong')) return 'cong_thang';
  if (co(cau, 'le', 'nghi le', 'ngay le', 'sap toi', 'tet')) return 'nghi_le';
  if (co(cau, 'ca lam', 'gio lam', 'gio vao', 'gio ra', 'ca cua toi', 'lam viec luc')) return 'ca_lam';
  if (co(cau, 'don', 'cho duyet', 'dang cho', 'xin nghi')) return 'don_cho';
  if (co(cau, 'phep', 'nghi phep', 'ngay nghi', 'con bao nhieu ngay')) return 'phep';
  return 'khong_ro';
}

/** Ten tieng Viet cua tung loai nghi, dung trong the xac nhan. */
const NHAN_LOAI_NGHI: Record<LoaiNghi, string> = {
  phep_nam: 'nghỉ phép năm',
  khong_luong: 'nghỉ không lương',
  om: 'nghỉ ốm',
  thai_san: 'nghỉ thai sản',
  ket_hon: 'nghỉ kết hôn',
  hieu: 'nghỉ việc hiếu',
};

/** Ten hien thi cua tung danh muc van ban cong ty. */
const NHAN_DANH_MUC: Record<string, string> = {
  noi_quy: 'Nội quy', bieu_mau: 'Biểu mẫu', chinh_sach: 'Chính sách',
  huong_dan: 'Hướng dẫn', khac: 'Khác',
};

/**
 * Tra loi mot cau hoi cua nhan vien tu du lieu cua chinh ho.
 *
 * Nhan dang y dinh bang tu khoa (khong dau) — du cho cac cau thuong gap. Cau khong khop y dinh
 * nao: thu LLM (neu bat), khong thi tra ve loi moi kem goi y.
 */
export async function tra_loi_tro_ly(nv_id: string, cau_hoi_goc: string): Promise<TraLoiTroLy> {
  const cau = chuan(cau_hoi_goc.trim());
  const hom_nay = ngay_dia_phuong(new Date());
  const y_dinh = nhan_dang_y_dinh(cau);

  switch (y_dinh) {
    case 'chao':
      return {
        tra_loi: 'Chào bạn! Mình là trợ lý dữ liệu. Bạn hỏi phép, công, lương, đi muộn, ca làm, '
          + 'nội quy — mình tra ngay từ dữ liệu của bạn. Mình còn điền sẵn đơn **OT, đổi ca, '
          + 'công tác, xin đi muộn, khiếu nại** giúp bạn, và **chính bạn** bấm nút xác nhận '
          + 'thì mới gửi đi.',
        y_dinh: 'chao',
        goi_y: GOI_Y,
      };
    case 'khieu_nai_luong': return tra_loi_khieu_nai_luong(nv_id, cau_hoi_goc, cau);
    case 'khieu_nai_ky_luat': return tra_loi_khieu_nai_ky_luat(nv_id, cau_hoi_goc, cau);
    case 'nghi_viec': return tra_loi_nghi_viec(nv_id, cau_hoi_goc, cau, hom_nay);
    case 'dang_ky_ot': return tra_loi_dang_ky_ot(nv_id, cau_hoi_goc, cau, hom_nay);
    case 'doi_ca': return tra_loi_doi_ca(nv_id, cau_hoi_goc, cau, hom_nay);
    case 'cong_tac': return tra_loi_cong_tac(nv_id, cau_hoi_goc, cau, hom_nay);
    case 'xin_di_muon': return tra_loi_xin_di_muon(nv_id, cau_hoi_goc, cau, hom_nay);
    case 'ung_luong': return tra_loi_ung_luong();
    case 'giai_trinh': return tra_loi_giai_trinh(nv_id, cau_hoi_goc, cau, hom_nay);
    case 'huy_don': return tra_loi_huy_don(nv_id, cau);
    case 'de_xuat': return tra_loi_de_xuat(nv_id, cau_hoi_goc, cau);
    case 'xin_nghi_phep': return tra_loi_xin_nghi(nv_id, cau_hoi_goc, cau, hom_nay);
    case 'noi_quy': return tra_loi_noi_quy(cau);
    case 'thong_bao': return tra_loi_thong_bao(cau);
    case 'van_ban': return tra_loi_van_ban(cau);
    case 'luong': return {
      tra_loi: 'Phiếu lương chi tiết bạn xem ở tab **Lương** để bảo mật. Mình có thể giúp về '
        + 'công, phép, đi muộn — những thứ ảnh hưởng tới lương.',
      y_dinh: 'luong', goi_y: ['Công tháng này của tôi thế nào?', 'Tháng này tôi đi muộn mấy lần?'],
    };
    case 'di_muon': return tra_loi_di_muon(nv_id);
    case 'cong_thang': return tra_loi_cong_thang(nv_id);
    case 'nghi_le': return tra_loi_nghi_le(hom_nay);
    case 'ca_lam': return tra_loi_ca_lam(nv_id);
    case 'don_cho': return tra_loi_don_cho(nv_id);
    case 'phep': return tra_loi_phep(nv_id);
    case 'khong_ro': break;
  }

  // ---- KHONG KHOP: tro chuyen bang AI (neu bat), khong thi loi moi ----
  const llm = await tro_chuyen_llm(cau_hoi_goc);
  if (llm !== null) return { tra_loi: llm.tra_loi, y_dinh: 'llm', goi_y: llm.goi_y };

  return {
    tra_loi: 'Mình chưa hiểu câu hỏi. Bạn thử hỏi về **phép, công, đi muộn, ca làm, nội quy**, '
      + 'hoặc nhờ mình điền đơn **OT, đổi ca, công tác, xin đi muộn** nhé.',
    y_dinh: 'khong_ro',
    goi_y: GOI_Y,
  };
}

// ==================================================================== LLM (DeepSeek)
//
// AI chi dung cho GIONG NOI va HIEU CAU, khong phai nguon su that — xem ghi chu dau tep.
// Moi ham o day tra null khi khong san sang (chua khai DEEPSEEK_API_KEY) hoac loi mang:
// nguoi goi PHẢI co loi mac dinh san co, khong duoc nem.

function llm_san_sang(): boolean {
  return cau_hinh.deepseek.khoa !== '';
}

/** Goi DeepSeek (luon tra JSON do response_format) va phan giai thanh doi tuong. */
async function hoi_llm_json(loai: string, prompt: string): Promise<Record<string, unknown> | null> {
  if (!llm_san_sang()) return null;
  try {
    const tho = await goi_deepseek(prompt, {
      // Chi log trang thai, KHONG log prompt (cau hoi cua nguoi dung la du lieu ca nhan).
      ghi_log: (dong) => console.error(`[tro-ly:${loai}] ${dong}`),
    });
    const j: unknown = JSON.parse(tho);
    if (typeof j !== 'object' || j === null || Array.isArray(j)) return null;
    return j as Record<string, unknown>;
  } catch (loi) {
    console.error(`[tro-ly:${loai}] LLM loi, roi ve loi san: ${(loi as Error).message}`);
    return null;
  }
}

/**
 * Viet lai loi tra loi tu boi canh TOI THIEU (chi con so, khong danh tinh). Tra null de
 * nguoi goi dung loi dinh san.
 */
async function viet_tu_nhien(y_dinh: string, boi_canh: unknown): Promise<string | null> {
  const kq = await hoi_llm_json('viet',
    'Ban la tro ly nhan su than thien cua phan he Cham cong. Viet cau tra loi TIENG VIET, '
    + '1-3 cau, giong am ap tu nhien nhu dong nghiep, khong khuon sap, khong mo dau bang '
    + '"Chào bạn". GIỮ NGUYÊN mọi con số trong boi canh, khong them bot, khong bịa. Con so '
    + 'quan trong viet trong dau ** ** (markdown dam). Boi canh: '
    + JSON.stringify(boi_canh)
    + '. Tra ve DUY NHAT doi tuong JSON dang {"tra_loi": "..."}.');
  if (kq === null) return null;
  const chu = kq['tra_loi'];
  return typeof chu === 'string' && chu.trim() !== '' ? chu.trim().slice(0, 1000) : null;
}

/**
 * Tro chuyen cho cau ngoai luat: huong dan, hoi ro, nhung KHONG tu bịa so lieu.
 */
async function tro_chuyen_llm(cau_hoi_goc: string): Promise<
  { tra_loi: string; goi_y: string[] } | null
> {
  const kq = await hoi_llm_json('tro-chuyen',
    'Ban la tro ly cua phan he Cham cong, hoi bang tieng Viet. Nguoi dung hoi: '
    + JSON.stringify(cau_hoi_goc)
    + '\n\nBan chi ho tro: phep nam (con bao nhieu ngay), cong thang, di muon, nghi le, ca lam, '
    + 'don cho duyet, noi quy/che tai, xin nghi phep, giai trinh quen quet, de xuat, '
    + 'dang ky OT/lam them gio (can ngay + tu gio den gio), xin doi ca, dang ky di cong tac, '
    + 'xin di muon, khieu nai phieu luong, khieu nai ky luat. '
    + 'Neu cau hoi trong pham vi: tra loi ngan gon, than thien va huong ho hoi lai cu the '
    + '(vi du kem ngay dang 25/09, gio dang 18:00 den 20:00). Neu NGOAI pham vi: noi ro minh '
    + 'chi lo viec cham cong. '
    + 'KHONG bịa so lieu, khong hua viec minh khong lam duoc. '
    + 'Tra ve DUY NHAT doi tuong JSON dang {"tra_loi": "...", "goi_y": ["cau goi y 1", "cau goi y 2"]} '
    + 'toi da 3 goi y, noi dung goi y nhu cach nguoi dung nen hoi.');
  if (kq === null) return null;
  const chu = kq['tra_loi'];
  if (typeof chu !== 'string' || chu.trim() === '') return null;
  const goi = kq['goi_y'];
  const goi_y = Array.isArray(goi)
    ? goi.filter((g): g is string => typeof g === 'string' && g.trim() !== '').slice(0, 3)
    : [];
  return { tra_loi: chu.trim().slice(0, 1000), goi_y: goi_y.length > 0 ? goi_y : GOI_Y };
}

/**
 * Neu bo phan tich tu khoa khong thay ngay, nho AI trich ngay xin nghi tu cau noi. Ket qua
 * duoc KIEU LAI bang ham thuan (ngay_hop_le) truoc khi dung — AI khong duoc phep bịa ngay.
 */
async function phan_tich_khoang_llm(cau_goc: string, hom_nay: string): Promise<KhoangNghi | null> {
  const kq = await hoi_llm_json('ngay-nghi',
    'Trich khoang ngay nghi tu cau sau (hom nay la ' + hom_nay + '): '
    + JSON.stringify(cau_goc)
    + '\n\nTra ve DUY NHAT doi tuong JSON dang '
    + '{"tu_ngay": "YYYY-MM-DD", "den_ngay": "YYYY-MM-DD", "nua_ngay": false}. '
    + 'Mot ngay thi den_ngay = tu_ngay. "ngay mai" = ' + cong_ngay(hom_nay, 1)
    + '. Neu cau KHONG co ngay nao thi tra {"tu_ngay": null}.');
  if (kq === null) return null;
  const tu = kq['tu_ngay'];
  const den = kq['den_ngay'] ?? tu;
  if (typeof tu !== 'string' || typeof den !== 'string') return null;
  if (!ngay_hop_le(tu) || !ngay_hop_le(den) || den < tu) return null;
  return { tu, den, nua_ngay: kq['nua_ngay'] === true };
}

// ==================================================================== tra loi du lieu ca nhan

async function tra_loi_phep(nv_id: string): Promise<TraLoiTroLy> {
  const p = await truy_van_mot<{ quota: number; da_dung: number }>(
    `select nv.so_ngay_phep_nam::float as quota,
            coalesce((select sum(case when d.nua_ngay then 0.5
                                      else (d.den_ngay - d.tu_ngay + 1) end)
                        from don_nghi_phep d
                       where d.nhan_vien_id = nv.id and d.loai = 'phep_nam'
                         and d.trang_thai = 'da_duyet'
                         and extract(year from d.tu_ngay) = extract(year from current_date)
            ), 0)::float as da_dung
       from nhan_vien nv where nv.id = $1`,
    [nv_id],
  );
  const quota = p?.quota ?? 0;
  const da_dung = p?.da_dung ?? 0;
  const con = Math.max(0, quota - da_dung);
  const tra_loi_dinh = `Năm nay bạn có **${quota} ngày phép**, đã dùng **${da_dung}**, `
    + `còn lại **${con} ngày**.`;
  const llm = await viet_tu_nhien('phep', { quota, da_dung, con_lai: con });
  return {
    tra_loi: llm ?? tra_loi_dinh,
    y_dinh: 'phep',
    goi_y: ['Tôi muốn xin nghỉ phép', 'Công tháng này của tôi thế nào?'],
  };
}

async function tra_loi_di_muon(nv_id: string): Promise<TraLoiTroLy> {
  const thang = ngay_dia_phuong(new Date()).slice(0, 7);
  const { tu, den } = khoang_thang(thang);
  const m = await truy_van_mot<{ so_lan_muon: number; tong_phut: number }>(
    `select count(*) filter (where phut_muon > 0)::int as so_lan_muon,
            coalesce(sum(phut_muon),0)::int as tong_phut
       from bang_cong_ngay where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3`,
    [nv_id, tu, den],
  );
  const tra_loi_dinh = `Tháng này bạn đi muộn **${m?.so_lan_muon ?? 0} lần**, `
    + `tổng **${m?.tong_phut ?? 0} phút**.`;
  const llm = await viet_tu_nhien('di_muon',
    { so_lan_muon: m?.so_lan_muon ?? 0, tong_phut: m?.tong_phut ?? 0 });
  return {
    tra_loi: llm ?? tra_loi_dinh,
    y_dinh: 'di_muon',
    goi_y: ['Công tháng này của tôi thế nào?', 'Tôi muốn giải trình quên chấm công'],
  };
}

async function tra_loi_cong_thang(nv_id: string): Promise<TraLoiTroLy> {
  const thang = ngay_dia_phuong(new Date()).slice(0, 7);
  const { tu, den } = khoang_thang(thang);
  const c = await truy_van_mot<{ tong_cong: number; co_mat: number; vang: number; phep: number }>(
    `select coalesce(sum(so_cong),0)::float as tong_cong,
            count(*) filter (where trang_thai='co_mat')::int as co_mat,
            count(*) filter (where trang_thai='vang')::int as vang,
            count(*) filter (where trang_thai='nghi_phep')::int as phep
       from bang_cong_ngay where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3`,
    [nv_id, tu, den],
  );
  const tra_loi_dinh = `Tháng ${thang}: **${c?.tong_cong ?? 0} công**, có mặt ${c?.co_mat ?? 0} ngày, `
    + `nghỉ phép ${c?.phep ?? 0}, vắng ${c?.vang ?? 0}.`;
  const llm = await viet_tu_nhien('cong_thang', {
    thang, tong_cong: c?.tong_cong ?? 0, co_mat: c?.co_mat ?? 0,
    phep: c?.phep ?? 0, vang: c?.vang ?? 0,
  });
  return {
    tra_loi: llm ?? tra_loi_dinh,
    y_dinh: 'cong_thang',
    goi_y: ['Tháng này tôi đi muộn mấy lần?', 'Tôi còn bao nhiêu ngày phép?'],
  };
}

async function tra_loi_nghi_le(hom_nay: string): Promise<TraLoiTroLy> {
  const ds = await truy_van<{ ngay: string; ten: string }>(
    'select ngay, ten from ngay_le where ngay >= $1 order by ngay limit 3', [hom_nay],
  );
  if (ds.length === 0) {
    return { tra_loi: 'Sắp tới chưa có ngày lễ nào trong lịch.', y_dinh: 'nghi_le', goi_y: GOI_Y };
  }
  const danh_sach = ds.map((l) => `• ${ngay_viet(l.ngay)}: ${l.ten}`).join('\n');
  return {
    tra_loi: `Các ngày lễ sắp tới:\n${danh_sach}`,
    y_dinh: 'nghi_le',
    goi_y: ['Tôi còn bao nhiêu ngày phép?'],
  };
}

async function tra_loi_ca_lam(nv_id: string): Promise<TraLoiTroLy> {
  const ca = await truy_van_mot<{ ten: string; gio_vao: string; gio_ra: string }>(
    `select cl.ten, cl.gio_vao::text as gio_vao, cl.gio_ra::text as gio_ra
       from nhan_vien nv left join ca_lam cl on cl.id = nv.ca_lam_id where nv.id = $1`,
    [nv_id],
  );
  if (ca === null || ca.ten === null) {
    return {
      tra_loi: 'Hồ sơ của bạn chưa gán ca làm việc. Liên hệ nhân sự để được xếp ca.',
      y_dinh: 'ca_lam', goi_y: GOI_Y,
    };
  }
  const tra_loi_dinh = `Ca của bạn: **${ca.ten}**, giờ vào ${ca.gio_vao?.slice(0, 5)}, `
    + `giờ ra ${ca.gio_ra?.slice(0, 5)}.`;
  const llm = await viet_tu_nhien('ca_lam', {
    ten_ca: ca.ten, gio_vao: ca.gio_vao?.slice(0, 5) ?? '—',
    gio_ra: ca.gio_ra?.slice(0, 5) ?? '—',
  });
  return {
    tra_loi: llm ?? tra_loi_dinh,
    y_dinh: 'ca_lam', goi_y: ['Tháng này tôi đi muộn mấy lần?'],
  };
}

async function tra_loi_don_cho(nv_id: string): Promise<TraLoiTroLy> {
  const d = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from (
       select trang_thai from don_nghi_phep where nhan_vien_id=$1
       union all select trang_thai from don_giai_trinh where nhan_vien_id=$1
       union all select trang_thai from don_tu where nhan_vien_id=$1
       union all select trang_thai from de_xuat where nhan_vien_id=$1
     ) t where trang_thai='cho_duyet'`,
    [nv_id],
  );
  const so = d?.so ?? 0;
  const tra_loi_dinh = so === 0 ? 'Bạn không có đơn nào đang chờ duyệt.'
    : `Bạn đang có **${so} đơn** chờ duyệt. Xem ở tab "Đơn của tôi".`;
  const llm = await viet_tu_nhien('don_cho', { so_don_cho_duyet: so });
  return {
    tra_loi: llm ?? tra_loi_dinh,
    y_dinh: 'don_cho', goi_y: ['Tôi muốn xin nghỉ phép'],
  };
}

// ==================================================================== tra cuu tri thuc cong ty

/** Tim trong loai_vi_pham theo tu khoa — cham diem tren ten (3) + che tai (1) + can cu (1). */
async function tra_loi_noi_quy(cau: string): Promise<TraLoiTroLy> {
  const khoa = tu_khoa(cau);
  const dong = await truy_van<{
    ten: string; chi_tiet_che_tai: string | null; can_cu: string | null;
  }>(
    'select ten, chi_tiet_che_tai, can_cu from loai_vi_pham where dang_bat = true',
  );
  const cham: { ten: string; che_tai: string; can_cu: string; diem: number }[] = [];
  for (const d of dong) {
    let diem = 0;
    for (const tu of khoa) {
      if (chuan(d.ten).includes(tu)) diem += 3;
      if (d.chi_tiet_che_tai !== null && chuan(d.chi_tiet_che_tai).includes(tu)) diem += 1;
      if (d.can_cu !== null && chuan(d.can_cu).includes(tu)) diem += 1;
    }
    if (diem > 0) {
      cham.push({
        ten: d.ten, che_tai: d.chi_tiet_che_tai ?? '', can_cu: d.can_cu ?? '', diem,
      });
    }
  }
  cham.sort((a, b) => b.diem - a.diem);
  const dau = cham.slice(0, 3);

  if (dau.length === 0) {
    return {
      tra_loi: 'Mình chưa tìm thấy điều khoản nội quy nào khớp câu hỏi. Bạn thử nói ngắn gọn '
        + 'hành vi cần hỏi (ví dụ "đi muộn", "không chấm công", "nghỉ không xin phép").',
      y_dinh: 'noi_quy', goi_y: ['Đi muộn bị xử lý thế nào?', 'Nghỉ không xin phép bị gì?'],
    };
  }

  // In NGUYEN VAN che tai — khong dien giai lai noi quy da ban hanh.
  const dong_tra_loi = dau.map((d) => {
    const can_cu = d.can_cu === '' ? '' : ` (Căn cứ: ${d.can_cu})`;
    return `• **${d.ten}** — ${d.che_tai}${can_cu}`;
  }).join('\n');
  return {
    tra_loi: `Theo Nội quy lao động của công ty:\n${dong_tra_loi}\n\n`
      + 'Bạn xem toàn văn ở tab **Văn bản** (mục Nội quy).',
    y_dinh: 'noi_quy',
    goi_y: ['Đi muộn bị xử lý thế nào?', 'Tôi muốn giải trình quên chấm công'],
  };
}

async function tra_loi_thong_bao(cau: string): Promise<TraLoiTroLy> {
  const khoa = tu_khoa(cau);
  const dong = await truy_van<{ tieu_de: string; muc_do: string; tao_luc: Date }>(
    `select tieu_de, muc_do, tao_luc from thong_bao where da_go = false
      order by tao_luc desc limit 200`,
  );
  const khop = dong
    .filter((d) => khoa.length === 0 || khoa.some((t) => chuan(d.tieu_de).includes(t)))
    .slice(0, 5);

  if (khop.length === 0) {
    return {
      tra_loi: 'Hiện không có thông báo nào khớp. Bạn xem đầy đủ ở mục **Thông báo** nhé.',
      y_dinh: 'thong_bao', goi_y: GOI_Y,
    };
  }
  const danh_sach = khop.map((d) => {
    const ngay = ngay_viet(ngay_dia_phuong(new Date(d.tao_luc)));
    const muc = d.muc_do === 'thuong' ? '' : ` (mức ${d.muc_do})`;
    return `• ${ngay}: **${d.tieu_de}**${muc}`;
  }).join('\n');
  return {
    tra_loi: `Các thông báo gần đây:\n${danh_sach}\n\nChi tiết bạn xem ở mục **Thông báo**.`,
    y_dinh: 'thong_bao', goi_y: ['Có thông báo gì mới nhất?'],
  };
}

async function tra_loi_van_ban(cau: string): Promise<TraLoiTroLy> {
  const khoa = tu_khoa(cau);
  const dong = await truy_van<{
    tieu_de: string; danh_muc: string; mo_ta: string | null;
  }>(
    `select tieu_de, danh_muc, mo_ta from van_ban_cong_ty where da_go = false
      order by tao_luc desc limit 500`,
  );
  const cham: { tieu_de: string; danh_muc: string; diem: number }[] = [];
  for (const d of dong) {
    let diem = 0;
    for (const tu of khoa) {
      if (chuan(d.tieu_de).includes(tu)) diem += 3;
      if (d.mo_ta !== null && chuan(d.mo_ta).includes(tu)) diem += 1;
    }
    if (diem > 0) cham.push({ tieu_de: d.tieu_de, danh_muc: d.danh_muc, diem });
  }
  cham.sort((a, b) => b.diem - a.diem);
  const dau = cham.slice(0, 5);

  if (dau.length === 0) {
    return {
      tra_loi: 'Không tìm thấy văn bản nào khớp từ khóa. Bạn thử từ khóa khác, hoặc xem '
        + 'toàn bộ ở tab **Văn bản**.',
      y_dinh: 'van_ban', goi_y: ['Nội quy lao động ở đâu?', 'Mẫu đơn xin nghỉ phép'],
    };
  }
  const danh_sach = dau.map((d) =>
    `• **${d.tieu_de}** (mục ${NHAN_DANH_MUC[d.danh_muc] ?? d.danh_muc})`,
  ).join('\n');
  return {
    tra_loi: `Các văn bản công ty khớp câu hỏi:\n${danh_sach}\n\n`
      + 'Bạn mở tab **Văn bản** để đọc hoặc tải tệp.',
    y_dinh: 'van_ban', goi_y: ['Đi muộn bị xử lý thế nào?'],
  };
}

// ==================================================================== hanh dong cho xac nhan

/** Don cho duyet cua nguoi hoi — dung cho huy don. */
interface DonChoHuy {
  loai: 'nghi_phep' | 'don_tu' | 'de_xuat';
  id: string;
  nhan: string;
  ngay: string | null;
}

async function tra_loi_xin_nghi(
  nv_id: string, cau_goc: string, cau: string, hom_nay: string,
): Promise<TraLoiTroLy> {
  // Luat tu khoa truoc; cau noi tu nhien khong khop luat thi nho AI trich ngay (da kiem lai
  // bang ham thuan truoc khi dung).
  let khoang = phan_tich_khoang_nghi(cau, hom_nay);
  if (khoang === null) {
    khoang = await phan_tich_khoang_llm(cau_goc, hom_nay);
  }
  if (khoang === null) {
    return {
      tra_loi: 'Bạn muốn nghỉ ngày nào? Ví dụ: **"xin nghỉ phép ngày 25/09"** hoặc '
        + '**"xin nghỉ từ 25/09 đến 26/09"** (thêm "nửa ngày" nếu chỉ nghỉ nửa buổi).',
      y_dinh: 'xin_nghi_phep',
      goi_y: ['Xin nghỉ phép ngày mai', 'Xin nghỉ ốm hôm nay'],
    };
  }

  const loai = phan_tich_loai_nghi(cau);
  const ly_do = phan_tich_ly_do(cau_goc);

  // Chan trum ngay da chot bang cong (giong route POST /nghi-phep).
  const da_chot = await truy_van_mot<{ co: boolean }>(
    `select true as co from bang_cong_ngay
      where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3 and da_chot = true limit 1`,
    [nv_id, khoang.tu, khoang.den],
  );
  if (da_chot !== null) {
    return {
      tra_loi: 'Khoảng ngày này đã **chốt bảng công**, mình không điền đơn được. '
        + 'Vui lòng liên hệ nhân sự.',
      y_dinh: 'xin_nghi_phep', goi_y: GOI_Y,
    };
  }

  // Chan trung khoang voi don dang cho / da duyet.
  const trung = await truy_van_mot<{ id: string }>(
    `select id from don_nghi_phep
      where nhan_vien_id = $1 and trang_thai in ('cho_duyet','da_duyet')
        and tu_ngay <= $3 and den_ngay >= $2 limit 1`,
    [nv_id, khoang.tu, khoang.den],
  );
  if (trung !== null) {
    return {
      tra_loi: 'Bạn đã có đơn nghỉ phép trùm khoảng ngày này. Xem ở tab **Đơn của tôi**.',
      y_dinh: 'xin_nghi_phep', goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    };
  }

  const khoang_viet = khoang.tu === khoang.den
    ? ngay_viet(khoang.tu)
    : `${ngay_viet(khoang.tu)} – ${ngay_viet(khoang.den)}`;
  const chi_tiet = [
    `Loại nghỉ: ${NHAN_LOAI_NGHI[loai]}`,
    `Ngày: ${khoang_viet}${khoang.nua_ngay ? ' (nửa ngày)' : ''}`,
    ...(ly_do === null ? [] : [`Lý do: ${ly_do}`]),
  ];

  return {
    tra_loi: 'Mình đã điền sẵn đơn nghỉ bên dưới. Bạn xem lại rồi bấm **Gửi đơn nghỉ** — '
      + 'đơn chỉ được nộp khi **chính bạn xác nhận**.',
    y_dinh: 'xin_nghi_phep',
    goi_y: ['Tôi còn bao nhiêu ngày phép?'],
    hanh_dong: {
      loai: 'tao_don_nghi_phep',
      tieu_de: 'Đơn nghỉ phép',
      chi_tiet,
      duong_dan: '/api/toi/nghi-phep',
      phuong_thuc: 'POST',
      du_lieu: {
        loai, tu_ngay: khoang.tu, den_ngay: khoang.den,
        nua_ngay: khoang.nua_ngay, ly_do,
      },
      nhan: 'Gửi đơn nghỉ',
      bo: 'Bỏ',
    },
  };
}

async function tra_loi_giai_trinh(
  nv_id: string, cau_goc: string, _cau: string, hom_nay: string,
): Promise<TraLoiTroLy> {
  const kq = phan_tich_giai_trinh(cau_goc, hom_nay);
  if (kq.ngay === null) {
    return {
      tra_loi: 'Bạn quên quét ngày nào? Ví dụ: **"giải trình quên quét vào ngày 24/09 vì '
        + 'kẹt xe"**.',
      y_dinh: 'giai_trinh', goi_y: ['Giải trình quên quét hôm qua'],
    };
  }
  if (kq.ngay > hom_nay) {
    return {
      tra_loi: 'Không thể giải trình cho ngày trong tương lai. Bạn kiểm tra lại ngày nhé.',
      y_dinh: 'giai_trinh', goi_y: GOI_Y,
    };
  }
  if (kq.ly_do === null || kq.ly_do.trim().length < 5) {
    return {
      tra_loi: `Được, giải trình ngày **${ngay_viet(kq.ngay)}**. Bạn cho mình lý do nhé, `
        + 'ví dụ: **"giải trình quên quét ngày 24/09 vì kẹt xe"**.',
      y_dinh: 'giai_trinh', goi_y: [`Giải trình quên quét ngày ${ngay_viet(kq.ngay)} vì kẹt xe`],
    };
  }

  const da_chot = await truy_van_mot<{ co: boolean }>(
    'select true as co from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2 and da_chot = true',
    [nv_id, kq.ngay],
  );
  if (da_chot !== null) {
    return {
      tra_loi: 'Ngày này đã chốt bảng công. Vui lòng liên hệ nhân sự.',
      y_dinh: 'giai_trinh', goi_y: GOI_Y,
    };
  }
  const trung = await truy_van_mot<{ id: string }>(
    'select id from don_giai_trinh where nhan_vien_id = $1 and ngay = $2 and trang_thai = \'cho_duyet\'',
    [nv_id, kq.ngay],
  );
  if (trung !== null) {
    return {
      tra_loi: `Bạn đã có đơn giải trình cho ngày ${ngay_viet(kq.ngay)} đang chờ duyệt.`,
      y_dinh: 'giai_trinh', goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    };
  }

  // De xuat gio theo ca cua nhan vien — day la DE XUAT, nguoi duyet quyet cuoi.
  const ca = await truy_van_mot<{ gio_vao: string; gio_ra: string }>(
    `select cl.gio_vao::text as gio_vao, cl.gio_ra::text as gio_ra
       from nhan_vien nv left join ca_lam cl on cl.id = nv.ca_lam_id where nv.id = $1`,
    [nv_id],
  );
  const gio_vao = kq.quen_vao === false ? null : ca?.gio_vao?.slice(0, 5) ?? null;
  const gio_ra = kq.quen_vao === true ? null : ca?.gio_ra?.slice(0, 5) ?? null;
  if (gio_vao === null && gio_ra === null) {
    return {
      tra_loi: 'Hồ sơ của bạn chưa gán ca làm việc nên mình chưa điền được giờ đề xuất. '
        + 'Liên hệ nhân sự hoặc gửi giải trình ở tab **Đơn của tôi**.',
      y_dinh: 'giai_trinh', goi_y: GOI_Y,
    };
  }

  const chi_tiet = [
    `Ngày: ${ngay_viet(kq.ngay)}`,
    ...(gio_vao !== null ? [`Giờ vào đề xuất: ${gio_vao}`] : []),
    ...(gio_ra !== null ? [`Giờ ra đề xuất: ${gio_ra}`] : []),
    `Lý do: ${kq.ly_do}`,
  ];
  return {
    tra_loi: 'Mình đã điền sẵn đơn giải trình bên dưới. Bấm **Gửi giải trình** để nộp — '
      + 'chỉ gửi khi **chính bạn xác nhận**.',
    y_dinh: 'giai_trinh',
    goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    hanh_dong: {
      loai: 'tao_giai_trinh',
      tieu_de: 'Đơn giải trình quên quét',
      chi_tiet,
      duong_dan: '/api/toi/giai-trinh',
      phuong_thuc: 'POST',
      du_lieu: {
        ngay: kq.ngay, gio_vao_de_xuat: gio_vao, gio_ra_de_xuat: gio_ra, ly_do: kq.ly_do,
      },
      nhan: 'Gửi giải trình',
      bo: 'Bỏ',
    },
  };
}

async function tra_loi_de_xuat(
  nv_id: string, cau_goc: string, _cau: string,
): Promise<TraLoiTroLy> {
  const kq = phan_tich_de_xuat(cau_goc);
  if (kq === null) {
    return {
      tra_loi: 'Bạn muốn đề xuất gì? Ví dụ: **"đề xuất mua thêm ghế cho văn phòng"**.',
      y_dinh: 'de_xuat', goi_y: GOI_Y,
    };
  }

  const cac_loai = await truy_van<{ id: string; ten: string }>(
    'select id, ten from loai_de_xuat where dang_dung = true order by thu_tu, ten',
  );
  if (cac_loai.length === 0) {
    return {
      tra_loi: 'Hệ thống chưa khai loại đề xuất nào. Liên hệ nhân sự để mở.',
      y_dinh: 'de_xuat', goi_y: GOI_Y,
    };
  }

  const c = chuan(cau_goc);
  const loai = cac_loai.length === 1
    ? cac_loai[0]!
    : cac_loai.find((l) => c.includes(chuan(l.ten))) ?? null;
  if (loai === null) {
    const ten_loai = cac_loai.map((l) => `• ${l.ten}`).join('\n');
    return {
      tra_loi: `Đề xuất của bạn thuộc loại nào? Nói kèm tên loại, ví dụ **"đề xuất ${
        cac_loai[0]!.ten}: ..."**.\n\nCác loại đang mở:\n${ten_loai}`,
      y_dinh: 'de_xuat', goi_y: GOI_Y,
    };
  }

  return {
    tra_loi: 'Mình đã điền sẵn đề xuất bên dưới. Bấm **Gửi đề xuất** để nộp — chỉ gửi khi '
      + '**chính bạn xác nhận**.',
    y_dinh: 'de_xuat',
    goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    hanh_dong: {
      loai: 'tao_de_xuat',
      tieu_de: `Đề xuất: ${loai.ten}`,
      chi_tiet: [`Loại: ${loai.ten}`, `Nội dung: ${kq.tieu_de}`],
      duong_dan: '/api/toi/de-xuat',
      phuong_thuc: 'POST',
      du_lieu: { loai_de_xuat_id: loai.id, tieu_de: kq.tieu_de, noi_dung: kq.noi_dung },
      nhan: 'Gửi đề xuất',
      bo: 'Bỏ',
    },
  };
}

async function tra_loi_huy_don(nv_id: string, cau: string): Promise<TraLoiTroLy> {
  const np = await truy_van<{ id: string; tu_ngay: string; den_ngay: string }>(
    `select id, to_char(tu_ngay, 'YYYY-MM-DD') as tu_ngay, to_char(den_ngay, 'YYYY-MM-DD') as den_ngay
       from don_nghi_phep
      where nhan_vien_id = $1 and trang_thai = 'cho_duyet' order by tao_luc desc limit 20`,
    [nv_id],
  );
  const dt = await truy_van<{ id: string; loai: string; tu_ngay: string }>(
    `select id, loai, to_char(tu_ngay, 'YYYY-MM-DD') as tu_ngay from don_tu
      where nhan_vien_id = $1 and trang_thai = 'cho_duyet' order by tao_luc desc limit 20`,
    [nv_id],
  );
  const dx = await truy_van<{ id: string; tieu_de: string }>(
    `select id, tieu_de from de_xuat
      where nhan_vien_id = $1 and trang_thai = 'cho_duyet' order by tao_luc desc limit 20`,
    [nv_id],
  );

  const don: DonChoHuy[] = [
    ...np.map((d) => ({
      loai: 'nghi_phep' as const,
      id: d.id,
      nhan: `Nghỉ phép ${ngay_viet(d.tu_ngay)}${d.den_ngay !== d.tu_ngay ? ` – ${ngay_viet(d.den_ngay)}` : ''}`,
      ngay: d.tu_ngay,
    })),
    ...dt.map((d) => ({
      loai: 'don_tu' as const,
      id: d.id,
      nhan: `Đơn ${d.loai} ngày ${ngay_viet(d.tu_ngay)}`,
      ngay: d.tu_ngay,
    })),
    ...dx.map((d) => ({
      loai: 'de_xuat' as const,
      id: d.id,
      nhan: `Đề xuất: ${d.tieu_de}`,
      ngay: null,
    })),
  ];

  if (don.length === 0) {
    return {
      tra_loi: 'Bạn không có đơn nào đang chờ duyệt để hủy.',
      y_dinh: 'huy_don', goi_y: GOI_Y,
    };
  }

  // Nguoi hoi neu ro ngay thi loc theo ngay do.
  const ngay_noi = phan_tich_ngay(cau, ngay_dia_phuong(new Date()));
  const khop = ngay_noi === null ? don : don.filter((d) => d.ngay === ngay_noi);

  if (khop.length === 0) {
    const danh_sach = don.map((d) => `• ${d.nhan}`).join('\n');
    return {
      tra_loi: `Không có đơn chờ duyệt nào vào ngày bạn nói. Các đơn đang chờ duyệt:\n${danh_sach}`,
      y_dinh: 'huy_don', goi_y: GOI_Y,
    };
  }
  if (khop.length > 1) {
    const danh_sach = khop.map((d) => `• ${d.nhan}`).join('\n');
    return {
      tra_loi: `Bạn muốn hủy đơn nào? Nói rõ ngày hoặc loại đơn nhé:\n${danh_sach}`,
      y_dinh: 'huy_don', goi_y: GOI_Y,
    };
  }

  const d = khop[0]!;
  const duong_dan = d.loai === 'nghi_phep' ? `/api/toi/nghi-phep/${d.id}/huy`
    : d.loai === 'don_tu' ? `/api/toi/don/${d.id}/huy`
      : `/api/toi/de-xuat/${d.id}/huy`;
  return {
    tra_loi: 'Mình tìm thấy một đơn đang chờ duyệt. Bấm **Hủy đơn** chỉ khi bạn chắc chắn — '
      + 'việc hủy do **chính bạn xác nhận**.',
    y_dinh: 'huy_don',
    goi_y: GOI_Y,
    hanh_dong: {
      loai: 'huy_don',
      tieu_de: 'Hủy đơn chờ duyệt',
      chi_tiet: [d.nhan],
      duong_dan,
      phuong_thuc: 'POST',
      du_lieu: {},
      nhan: 'Hủy đơn',
      bo: 'Giữ lại',
    },
  };
}

// ================================================================ hanh dong don tu (OT, doi ca, cong tac, thoi viec, di muon)

/** Kiem don_tu cung loai cua nguoi hoi dang cho/da duyet trum ngay — tranh de route nem loi. */
async function don_tu_trung_ngay(
  nv_id: string, loai: string, tu: string, den: string,
): Promise<boolean> {
  const trung = await truy_van_mot<{ id: string }>(
    `select id from don_tu
      where nhan_vien_id = $1 and loai = $2
        and trang_thai in ('cho_duyet','cho_duyet_2','da_duyet')
        and tu_ngay <= $4 and coalesce(den_ngay, tu_ngay) >= $3 limit 1`,
    [nv_id, loai, tu, den],
  );
  return trung !== null;
}

async function tra_loi_dang_ky_ot(
  nv_id: string, cau_goc: string, cau: string, hom_nay: string,
): Promise<TraLoiTroLy> {
  let ngay = phan_tich_ngay(cau, hom_nay);
  if (ngay === null) {
    const llm = await phan_tich_khoang_llm(cau_goc, hom_nay);
    if (llm !== null) ngay = llm.tu;
  }
  if (ngay === null) {
    return {
      tra_loi: 'OT vào ngày nào? Ví dụ: **"đăng ký OT ngày 25/09 từ 18:00 đến 20:00"**.',
      y_dinh: 'dang_ky_ot',
      goi_y: ['Đăng ký OT ngày mai từ 18:00 đến 20:00'],
    };
  }
  if (ngay < hom_nay) {
    return {
      tra_loi: `Ngày ${ngay_viet(ngay)} đã qua — OT chỉ đăng ký cho hôm nay hoặc ngày sắp tới.`,
      y_dinh: 'dang_ky_ot', goi_y: GOI_Y,
    };
  }
  const gio = phan_tich_gio(cau);
  if (gio.bat_dau === null || gio.ket_thuc === null) {
    return {
      tra_loi: 'Làm thêm từ mấy giờ đến mấy giờ? Ví dụ: **"đăng ký OT ngày 25/09 từ 18:00 '
        + 'đến 20:00"**.',
      y_dinh: 'dang_ky_ot',
      goi_y: [`Đăng ký OT ngày ${ngay_viet(ngay)} từ 18:00 đến 20:00`],
    };
  }
  if (gio.ket_thuc <= gio.bat_dau) {
    return {
      tra_loi: 'Giờ kết thúc phải sau giờ bắt đầu. Bạn kiểm tra lại nhé (ví dụ từ 18:00 '
        + 'đến 20:00).',
      y_dinh: 'dang_ky_ot', goi_y: GOI_Y,
    };
  }
  if (await don_tu_trung_ngay(nv_id, 'lam_them', ngay, ngay)) {
    return {
      tra_loi: `Bạn đã có đơn làm thêm giờ ngày ${ngay_viet(ngay)} đang chờ duyệt hoặc đã duyệt.`,
      y_dinh: 'dang_ky_ot', goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    };
  }
  const ly_do = phan_tich_ly_do(cau_goc);
  return {
    tra_loi: 'Mình đã điền sẵn đơn làm thêm giờ bên dưới. Bấm **Gửi đơn OT** để nộp — chỉ '
      + 'gửi khi **chính bạn xác nhận**.',
    y_dinh: 'dang_ky_ot',
    goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    hanh_dong: {
      loai: 'tao_don_lam_them',
      tieu_de: 'Đơn xin làm thêm giờ',
      chi_tiet: [
        `Ngày làm thêm: ${ngay_viet(ngay)}`,
        `Từ giờ: ${gio.bat_dau}`,
        `Đến giờ: ${gio.ket_thuc}`,
        ...(ly_do === null ? [] : [`Lý do: ${ly_do}`]),
      ],
      duong_dan: '/api/toi/don',
      phuong_thuc: 'POST',
      du_lieu: {
        loai: 'lam_them', tu_ngay: ngay,
        gio_bat_dau: gio.bat_dau, gio_ket_thuc: gio.ket_thuc, ly_do,
      },
      nhan: 'Gửi đơn OT',
      bo: 'Bỏ',
    },
  };
}

async function tra_loi_xin_di_muon(
  nv_id: string, cau_goc: string, cau: string, hom_nay: string,
): Promise<TraLoiTroLy> {
  let ngay = phan_tich_ngay(cau, hom_nay);
  if (ngay === null) {
    const llm = await phan_tich_khoang_llm(cau_goc, hom_nay);
    if (llm !== null) ngay = llm.tu;
  }
  if (ngay === null) {
    return {
      tra_loi: 'Bạn xin đi muộn ngày nào? Ví dụ: **"xin đi muộn ngày mai 15 phút"** hoặc '
        + '**"xin đi muộn ngày 25/09 đến 8:30"**.',
      y_dinh: 'xin_di_muon',
      goi_y: ['Xin đi muộn ngày mai 15 phút'],
    };
  }
  if (ngay < hom_nay) {
    return {
      tra_loi: `Ngày ${ngay_viet(ngay)} đã qua. Đơn đi muộn cần gửi trước giờ vào ca cùng ngày `
        + 'để làm căn cứ miễn phạt — ngày cũ bạn liên hệ nhân sự nhé.',
      y_dinh: 'xin_di_muon', goi_y: GOI_Y,
    };
  }
  if (await don_tu_trung_ngay(nv_id, 'di_muon', ngay, ngay)) {
    return {
      tra_loi: `Bạn đã có đơn xin đi muộn ngày ${ngay_viet(ngay)} đang chờ duyệt hoặc đã duyệt.`,
      y_dinh: 'xin_di_muon', goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    };
  }
  const gio_den = phan_tich_gio(cau).bat_dau;
  const ly_do = phan_tich_ly_do(cau_goc);
  return {
    tra_loi: 'Mình đã điền sẵn đơn xin đi muộn bên dưới. Bấm **Gửi đơn đi muộn** để nộp — '
      + 'chỉ gửi khi **chính bạn xác nhận**.',
    y_dinh: 'xin_di_muon',
    goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    hanh_dong: {
      loai: 'tao_don_di_muon',
      tieu_de: 'Đơn xin đi muộn',
      chi_tiet: [
        `Ngày đi muộn: ${ngay_viet(ngay)}`,
        `Giờ dự kiến có mặt: ${gio_den ?? 'chưa rõ (bổ sung ở tab Đơn của tôi)'}`,
        ...(ly_do === null ? [] : [`Lý do: ${ly_do}`]),
      ],
      duong_dan: '/api/toi/don',
      phuong_thuc: 'POST',
      du_lieu: { loai: 'di_muon', tu_ngay: ngay, gio_bat_dau: gio_den, ly_do },
      nhan: 'Gửi đơn đi muộn',
      bo: 'Bỏ',
    },
  };
}

async function tra_loi_doi_ca(
  nv_id: string, cau_goc: string, cau: string, hom_nay: string,
): Promise<TraLoiTroLy> {
  let khoang = phan_tich_khoang_nghi(cau, hom_nay);
  if (khoang === null) {
    khoang = await phan_tich_khoang_llm(cau_goc, hom_nay);
  }
  if (khoang === null) {
    return {
      tra_loi: 'Bạn muốn đổi ca từ ngày nào? Ví dụ: **"xin đổi ca từ 26/09 sang ca tối"**.',
      y_dinh: 'doi_ca',
      goi_y: ['Xin đổi ca sang ca tối từ ngày mai'],
    };
  }

  const cac_ca = await truy_van<{ id: string; ten: string }>(
    'select id, ten from ca_lam order by ten',
  );
  if (cac_ca.length === 0) {
    return {
      tra_loi: 'Hệ thống chưa khai ca làm việc nào. Liên hệ nhân sự để mở danh mục ca.',
      y_dinh: 'doi_ca', goi_y: GOI_Y,
    };
  }
  const ca_moi = cac_ca.find((c) => cau.includes(chuan(c.ten))) ?? null;
  if (ca_moi === null) {
    const ten_ca = cac_ca.map((c) => `• ${c.ten}`).join('\n');
    return {
      tra_loi: `Bạn muốn đổi sang ca nào? Nói kèm tên ca, ví dụ **"xin đổi ca sang ${cac_ca[0]!.ten}"**.\n\nCác ca hiện có:\n${ten_ca}`,
      y_dinh: 'doi_ca', goi_y: GOI_Y,
    };
  }

  const hien_tai = await truy_van_mot<{ ca_id: string | null; ten: string | null }>(
    `select nv.ca_lam_id as ca_id, cl.ten as ten
       from nhan_vien nv left join ca_lam cl on cl.id = nv.ca_lam_id where nv.id = $1`,
    [nv_id],
  );

  const tu = khoang.tu;
  const den = khoang.den;
  if (await don_tu_trung_ngay(nv_id, 'doi_ca', tu, den)) {
    return {
      tra_loi: 'Bạn đã có đơn xin đổi ca trùm khoảng ngày này (đang chờ duyệt hoặc đã duyệt).',
      y_dinh: 'doi_ca', goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    };
  }

  const khoang_viet = tu === den ? ngay_viet(tu) : `${ngay_viet(tu)} – ${ngay_viet(den)}`;
  const ly_do = phan_tich_ly_do(cau_goc);
  return {
    tra_loi: 'Mình đã điền sẵn đơn xin đổi ca bên dưới. Bấm **Gửi đơn đổi ca** để nộp — chỉ '
      + 'gửi khi **chính bạn xác nhận**.',
    y_dinh: 'doi_ca',
    goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    hanh_dong: {
      loai: 'tao_don_doi_ca',
      tieu_de: 'Đơn xin đổi ca',
      chi_tiet: [
        `Từ ngày: ${khoang_viet}`,
        `Ca hiện tại: ${hien_tai?.ten ?? 'chưa gán'}`,
        `Ca đề nghị: ${ca_moi.ten}`,
        ...(ly_do === null ? [] : [`Lý do: ${ly_do}`]),
      ],
      duong_dan: '/api/toi/don',
      phuong_thuc: 'POST',
      du_lieu: {
        loai: 'doi_ca', tu_ngay: tu, den_ngay: den,
        ca_hien_tai_id: hien_tai?.ca_id ?? null, ca_moi_id: ca_moi.id, ly_do,
      },
      nhan: 'Gửi đơn đổi ca',
      bo: 'Bỏ',
    },
  };
}

async function tra_loi_cong_tac(
  nv_id: string, cau_goc: string, cau: string, hom_nay: string,
): Promise<TraLoiTroLy> {
  let khoang = phan_tich_khoang_nghi(cau, hom_nay);
  if (khoang === null) {
    khoang = await phan_tich_khoang_llm(cau_goc, hom_nay);
  }
  if (khoang === null) {
    return {
      tra_loi: 'Bạn đi công tác từ ngày nào đến ngày nào? Ví dụ: **"đi công tác Hà Nội từ '
        + '26/09 đến 27/09"**.',
      y_dinh: 'cong_tac',
      goi_y: ['Đi công tác từ ngày mai'],
    };
  }
  const tu = khoang.tu;
  const den = khoang.den;

  // Giong route POST /don: cong tac doi trang thai ngay cong nen khong trum ngay da chot.
  const da_chot = await truy_van_mot<{ co: boolean }>(
    `select true as co from bang_cong_ngay
      where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3 and da_chot = true limit 1`,
    [nv_id, tu, den],
  );
  if (da_chot !== null) {
    return {
      tra_loi: 'Khoảng ngày này đã **chốt bảng công**, đơn công tác không đổi được số công '
        + 'nữa. Vui lòng liên hệ nhân sự.',
      y_dinh: 'cong_tac', goi_y: GOI_Y,
    };
  }
  if (await don_tu_trung_ngay(nv_id, 'cong_tac', tu, den)) {
    return {
      tra_loi: 'Bạn đã có đơn công tác trùm khoảng ngày này (đang chờ duyệt hoặc đã duyệt).',
      y_dinh: 'cong_tac', goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    };
  }

  const noi_den = phan_tich_noi_den(cau_goc);
  const ly_do = phan_tich_ly_do(cau_goc);
  const khoang_viet = tu === den ? ngay_viet(tu) : `${ngay_viet(tu)} – ${ngay_viet(den)}`;
  return {
    tra_loi: 'Mình đã điền sẵn đơn xin đi công tác bên dưới. Bấm **Gửi đơn công tác** để nộp '
      + '— chỉ gửi khi **chính bạn xác nhận**.',
    y_dinh: 'cong_tac',
    goi_y: ['Tôi có đơn nào đang chờ duyệt không?'],
    hanh_dong: {
      loai: 'tao_don_cong_tac',
      tieu_de: 'Đơn xin đi công tác',
      chi_tiet: [
        `Từ ngày: ${khoang_viet}`,
        ...(noi_den === null ? [] : [`Nơi đến: ${noi_den}`]),
        ...(ly_do === null ? [] : [`Nội dung công tác: ${ly_do}`]),
      ],
      duong_dan: '/api/toi/don',
      phuong_thuc: 'POST',
      du_lieu: { loai: 'cong_tac', tu_ngay: tu, den_ngay: den, noi_den, ly_do },
      nhan: 'Gửi đơn công tác',
      bo: 'Bỏ',
    },
  };
}

async function tra_loi_nghi_viec(
  nv_id: string, cau_goc: string, cau: string, hom_nay: string,
): Promise<TraLoiTroLy> {
  const ngay = phan_tich_ngay(cau, hom_nay);
  if (ngay === null) {
    return {
      tra_loi: 'Ngày làm việc cuối cùng bạn muốn là ngày nào? Ví dụ: **"xin nghỉ việc, ngày '
        + 'làm việc cuối 25/10"**.',
      y_dinh: 'nghi_viec',
      goi_y: GOI_Y,
    };
  }
  const trung = await truy_van_mot<{ id: string }>(
    `select id from don_tu where nhan_vien_id = $1 and loai = 'thoi_viec'
       and trang_thai in ('cho_duyet','cho_duyet_2','da_duyet') limit 1`,
    [nv_id],
  );
  if (trung !== null) {
    return {
      tra_loi: 'Bạn đã có đơn xin thôi việc đang chờ duyệt hoặc đã duyệt. Liên hệ nhân sự '
        + 'nếu cần điều chỉnh.',
      y_dinh: 'nghi_viec', goi_y: GOI_Y,
    };
  }
  const ly_do = phan_tich_ly_do(cau_goc);
  return {
    tra_loi: 'Thôi việc là quyết định quan trọng — mình điền sẵn đơn bên dưới để bạn xem lại. '
      + 'Bấm **Gửi đơn thôi việc** chỉ khi **chính bạn chắc chắn**.',
    y_dinh: 'nghi_viec',
    goi_y: GOI_Y,
    hanh_dong: {
      loai: 'tao_don_thoi_viec',
      tieu_de: 'Đơn xin thôi việc',
      chi_tiet: [
        `Ngày làm việc cuối cùng: ${ngay_viet(ngay)}`,
        ...(ly_do === null ? [] : [`Lý do: ${ly_do}`]),
      ],
      duong_dan: '/api/toi/don',
      phuong_thuc: 'POST',
      du_lieu: { loai: 'thoi_viec', tu_ngay: ngay, ly_do },
      nhan: 'Gửi đơn thôi việc',
      bo: 'Bỏ',
    },
  };
}

// ================================================================ hanh dong khieu nai

async function tra_loi_khieu_nai_luong(
  nv_id: string, cau_goc: string, _cau: string,
): Promise<TraLoiTroLy> {
  const phieu = await truy_van_mot<{ id: string; thang: string }>(
    `select p.id, k.thang from phieu_luong p
       join ky_luong k on k.id = p.ky_luong_id
      where p.nhan_vien_id = $1 and k.trang_thai in ('da_duyet','da_tra')
      order by k.thang desc limit 1`,
    [nv_id],
  );
  if (phieu === null) {
    return {
      tra_loi: 'Bạn chưa có phiếu lương nào được duyệt để khiếu nại. Khi có phiếu lương đã '
        + 'chốt, nói **"khiếu nại phiếu lương vì ..."** là mình điền giúp.',
      y_dinh: 'khieu_nai_luong', goi_y: GOI_Y,
    };
  }
  const noi_dung = phan_tich_noi_dung_khieu_nai(cau_goc);
  if (noi_dung === null) {
    return {
      tra_loi: `Được, mình sẽ điền khiếu nại cho phiếu lương **tháng ${phieu.thang}**. Bạn cho `
        + 'mình nội dung nhé, ví dụ: **"khiếu nại phiếu lương vì thiếu phụ cấp đi lại"**.',
      y_dinh: 'khieu_nai_luong',
      goi_y: ['Khiếu nại phiếu lương vì thiếu phụ cấp đi lại'],
    };
  }
  return {
    tra_loi: 'Mình đã điền sẵn khiếu nại phiếu lương bên dưới. Bấm **Gửi khiếu nại** để nộp '
      + '— chỉ gửi khi **chính bạn xác nhận**.',
    y_dinh: 'khieu_nai_luong',
    goi_y: ['Khiếu nại của tôi xử lý tới đâu rồi?'],
    hanh_dong: {
      loai: 'tao_khieu_nai_luong',
      tieu_de: `Khiếu nại phiếu lương tháng ${phieu.thang}`,
      chi_tiet: [`Nội dung: ${noi_dung}`],
      duong_dan: '/api/toi/khieu-nai-luong',
      phuong_thuc: 'POST',
      du_lieu: { phieu_luong_id: phieu.id, noi_dung },
      nhan: 'Gửi khiếu nại',
      bo: 'Bỏ',
    },
  };
}

async function tra_loi_khieu_nai_ky_luat(
  nv_id: string, cau_goc: string, cau: string,
): Promise<TraLoiTroLy> {
  const ho_so = await truy_van<{ id: string; ma: string; ky: string; hinh_thuc: string | null }>(
    `select h.id, h.ma, h.ky, h.hinh_thuc from ho_so_ky_luat h
      where h.nhan_vien_id = $1 and h.trang_thai <> 'bac_bo'
      order by h.ky desc limit 20`,
    [nv_id],
  );
  if (ho_so.length === 0) {
    return {
      tra_loi: 'Bạn chưa có hồ sơ kỷ luật hoặc vi phạm nào trong hệ thống để khiếu nại.',
      y_dinh: 'khieu_nai_ky_luat', goi_y: GOI_Y,
    };
  }
  let chon = ho_so.find((h) => cau.includes(chuan(h.ma))) ?? null;
  if (chon === null && ho_so.length === 1) chon = ho_so[0]!;
  if (chon === null) {
    const danh_sach = ho_so.map((h) =>
      `• ${h.ma} — kỳ ${h.ky}${h.hinh_thuc === null ? '' : ` (${h.hinh_thuc})`}`).join('\n');
    return {
      tra_loi: `Bạn muốn khiếu nại hồ sơ nào? Nói kèm mã hồ sơ nhé:\n${danh_sach}`,
      y_dinh: 'khieu_nai_ky_luat', goi_y: GOI_Y,
    };
  }
  const noi_dung = phan_tich_noi_dung_khieu_nai(cau_goc);
  if (noi_dung === null) {
    return {
      tra_loi: `Được, khiếu nại hồ sơ **${chon.ma}**. Bạn cho mình nội dung khiếu nại nhé, ví `
        + 'dụ: **"khiếu nại ' + `${chon.ma} vì mức xử lý chưa đúng quy định"**.`,
      y_dinh: 'khieu_nai_ky_luat',
      goi_y: [`Khiếu nại ${chon.ma} vì mức xử lý chưa đúng quy định`],
    };
  }
  return {
    tra_loi: 'Mình đã điền sẵn khiếu nại bên dưới (quyền khiếu nại theo BLLĐ Điều 131). Bấm '
      + '**Gửi khiếu nại** để nộp — chỉ gửi khi **chính bạn xác nhận**.',
    y_dinh: 'khieu_nai_ky_luat',
    goi_y: ['Khiếu nại của tôi xử lý tới đâu rồi?'],
    hanh_dong: {
      loai: 'tao_khieu_nai_ky_luat',
      tieu_de: `Khiếu nại hồ sơ ${chon.ma}`,
      chi_tiet: [`Nội dung: ${noi_dung}`],
      duong_dan: '/api/toi/khieu-nai',
      phuong_thuc: 'POST',
      du_lieu: { ho_so_ky_luat_id: chon.id, loai: 'khieu_nai', noi_dung },
      nhan: 'Gửi khiếu nại',
      bo: 'Bỏ',
    },
  };
}

/** Ung luong CHUA mo tu phuc vu (route chi danh cho nhan su/quan tri) — huong dan dung cho. */
function tra_loi_ung_luong(): TraLoiTroLy {
  return {
    tra_loi: 'Ứng lương hiện chưa mở tự phục vụ trên hệ thống. Bạn gửi đề nghị tới bộ phận '
      + 'nhân sự nhé — nhân sự sẽ tạo khoản ứng và theo dõi duyệt/chi cho bạn.',
    y_dinh: 'ung_luong',
    goi_y: ['Công tháng này của tôi thế nào?', 'Tôi có đơn nào đang chờ duyệt không?'],
  };
}
