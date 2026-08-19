// Trich noi dung hop dong sang van ban de luu tru va tim kiem.
//
// YEU CAU: "quet noi dung hop dong chuyen sang text de luu tru", ban giay scan tinh ca.
//
// BA DUONG, VA PHAI BIET MINH DI DUONG NAO:
//
//   docx      -> doc truc tiep XML trong tep. Chinh xac tuyet doi: chu la chu goc.
//   pdf_text  -> `pdftotext`. Chinh xac: PDF do Word xuat ra co san lop chu.
//   ocr       -> `tesseract -l vie`. DOAN, khong phai doc. Se co loi.
//
// Cot `cach_trich` trong CSDL ton tai chinh vi diem thu ba. Mot ban OCR nhin qua giong
// van ban that nhung 'Đ' co the thanh 'D', so 0 co the thanh chu O — trong mot hop dong
// lao dong thi "12.500.000" doc sai mot chu so la sai luong. Ai doc noi_dung_text PHAI
// thay duoc no den tu dau.
//
// VA VI THE: noi_dung_text KHONG CO GIA TRI PHAP LY. Ban goc luon la tep trong ho_so_tep.
// O day chi de TIM va DOI CHIEU.
//
// KHONG BAO GIO ghi mot chuoi rong vao noi_dung_text roi coi la xong. Trich khong ra chu
// thi phai bao ro ("day la ban scan, may chu chua cai OCR"), vi mot o trong im lang se
// duoc hieu la "hop dong nay khong co noi dung".
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { trich_docx } from '../tien_ich/doc_office.ts';
import { chay_lenh, co_cong_cu, LoiThieuCongCu } from '../tien_ich/lenh_ngoai.ts';

/** Cach lay duoc chu — quyet dinh do tin cay. Khop voi rang buoc cot `cach_trich`. */
export type CachTrich = 'docx' | 'pdf_text' | 'ocr' | 'nhap_tay';

export interface KetQuaTrich {
  noi_dung_text: string;
  cach_trich: CachTrich;
  so_ky_tu: number;
  /** So trang da OCR (chi voi PDF scan). */
  so_trang?: number;
  /** Chuyen nguoi doc phai biet. null = khong co gi bat thuong. */
  canh_bao: string | null;
  /** Da cham tran, van ban bi cat. */
  cat_bot: boolean;
}

/** Tran do dai luu vao CSDL. Mot hop dong lao dong dai nhat cung khong toi. */
export const KY_TU_TOI_DA = 400_000;

/** Tran doan cho DOCX khi luu tru — cao hon nhieu so voi xem nhanh. */
const DOAN_TOI_DA_LUU = 5_000;

/**
 * So trang toi da chiu OCR trong mot lan.
 *
 * OCR mat khoang 1-3 giay moi trang. 30 trang la khoang mot phut — dai nhung con trong
 * pham vi mot yeu cau HTTP cho duoc. Hop dong lao dong thuong 3-8 trang; tep dai hon the
 * gan nhu chac chan la nguoi gan sai tep.
 */
export const TRANG_OCR_TOI_DA = 30;

/** Do phan giai rasterise truoc khi OCR. Duoi 200 thi dau tieng Viet bat dau mat. */
const DPI_OCR = 200;

/**
 * It hon bay nhieu ky tu thi coi nhu PDF KHONG co lop chu.
 *
 * PDF scan khong hoan toan rong: pdftotext van tra ve dau ngat trang, doi khi vai ky tu
 * rac tu watermark. Nguong nay phan biet "co lop chu" voi "chi la anh".
 */
export const TOI_THIEU_CO_CHU = 40;

const HAN_PDFTOTEXT_GIAY = 60;
const HAN_PDFTOPPM_GIAY = 180;
const HAN_TESSERACT_GIAY = 120;

/**
 * Chuan hoa van ban truoc khi luu.
 *
 * Ba viec, va deu de PHUC VU TIM KIEM chu khong de cho dep: bo \r (pdftotext tren tep tu
 * Windows tra ve CRLF), gom nhieu dong trong lien tiep, bo khoang trang cuoi dong. Khong
 * dung toi noi dung.
 */
export function chuan_van_ban(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n')            // dau ngat trang cua pdftotext
    .split('\n')
    .map((d) => d.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Cat ve tran, cat o ranh dong gan nhat de khong dut giua cau. */
export function cat_ve_tran(s: string, tran = KY_TU_TOI_DA): { chu: string; cat_bot: boolean } {
  if (s.length <= tran) return { chu: s, cat_bot: false };
  const tho = s.slice(0, tran);
  const cho = tho.lastIndexOf('\n');
  return { chu: cho > tran * 0.8 ? tho.slice(0, cho) : tho, cat_bot: true };
}

/** Duoi tep quyet dinh duong di. null = khong trich duoc dinh dang nay. */
export function duong_trich(ten_luu: string): 'docx' | 'pdf' | 'anh' | null {
  const t = ten_luu.toLowerCase();
  if (t.endsWith('.docx')) return 'docx';
  if (t.endsWith('.pdf')) return 'pdf';
  if (t.endsWith('.jpg') || t.endsWith('.jpeg') || t.endsWith('.png')) return 'anh';
  return null;
}

export interface CongCuTrich {
  /** `pdftotext` — doc lop chu cua PDF. */
  pdf: boolean;
  /** `tesseract` — OCR anh. */
  ocr: boolean;
  /** `pdftoppm` — rasterise PDF de OCR. Thieu thi PDF scan khong OCR duoc. */
  pdf_sang_anh: boolean;
}

/**
 * May chu nay trich duoc nhung gi?
 *
 * Giao dien doc ham nay de noi truoc "may chu chua cai OCR" thay vi de nguoi dung bam nut
 * roi moi nhan loi. DOCX khong co trong danh sach vi no khong can gi ngoai Node.
 */
export async function cong_cu_trich(): Promise<CongCuTrich> {
  const [pdf, ocr, ppm] = await Promise.all([
    co_cong_cu('pdftotext'), co_cong_cu('tesseract'), co_cong_cu('pdftoppm'),
  ]);
  return { pdf, ocr, pdf_sang_anh: ppm };
}

/** Trong mot thu muc tam, roi don sach — ke ca khi giua duong nem loi. */
async function trong_thu_muc_tam<T>(viec: (thu_muc: string) => Promise<T>): Promise<T> {
  const tm = await mkdtemp(join(tmpdir(), 'trich-'));
  try {
    return await viec(tm);
  } finally {
    await rm(tm, { recursive: true, force: true }).catch(() => { /* don duoc thi don */ });
  }
}

/** Doc lop chu cua PDF. Tra ve chuoi rong khi PDF chi la anh. */
export async function trich_pdf_text(du_lieu: Buffer): Promise<string> {
  return trong_thu_muc_tam(async (tm) => {
    const tep = join(tm, 'v.pdf');
    await writeFile(tep, du_lieu);
    // `-layout` giu bo cuc cot — hop dong hay co bang luong, bang phu cap. `-enc UTF-8`
    // bat buoc: mac dinh cua pdftotext la Latin-1, tieng Viet se thanh dau hoi.
    const kq = await chay_lenh('pdftotext', ['-layout', '-enc', 'UTF-8', '-q', tep, '-'],
      { han_giay: HAN_PDFTOTEXT_GIAY });
    return kq.ra.toString('utf8');
  });
}

/** OCR mot anh. `-l vie` — khong co thi tieng Viet ra rac. */
export async function ocr_anh(du_lieu: Buffer): Promise<string> {
  // THU TU DOI SO QUAN TRONG: tesseract doi <anh> <dau_ra> [tuy chon] [dinh dang]. Dat
  // `-l vie` sau ten dinh dang thi tesseract hieu 'vie' la tep cau hinh va bao
  // "read_params_file: Can't open vie" — roi OCR bang tieng Anh, ra chu khong dau.
  const kq = await chay_lenh('tesseract', ['-', '-', '-l', 'vie'],
    { vao: du_lieu, han_giay: HAN_TESSERACT_GIAY });
  return kq.ra.toString('utf8');
}

/** OCR mot PDF scan: rasterise tung trang roi OCR. Tra ve ca so trang da doc. */
export async function ocr_pdf(du_lieu: Buffer): Promise<{ chu: string; so_trang: number }> {
  return trong_thu_muc_tam(async (tm) => {
    const tep = join(tm, 'v.pdf');
    await writeFile(tep, du_lieu);
    await chay_lenh('pdftoppm', [
      '-r', String(DPI_OCR), '-gray', '-f', '1', '-l', String(TRANG_OCR_TOI_DA),
      '-png', tep, join(tm, 'tr'),
    ], { han_giay: HAN_PDFTOPPM_GIAY });

    // pdftoppm dat ten tr-1.png, tr-2.png... hoac tr-01.png khi nhieu trang. Sap xep theo
    // SO, khong theo chu: sap theo chu thi trang 10 chen vao truoc trang 2.
    const ten = (await readdir(tm))
      .filter((t) => t.startsWith('tr-') && t.endsWith('.png'))
      .sort((a, b) => so_trang_tu_ten(a) - so_trang_tu_ten(b));

    const phan: string[] = [];
    for (const t of ten) {
      phan.push(chuan_van_ban(await ocr_anh(await readFile(join(tm, t)))));
    }
    return { chu: phan.filter((p) => p !== '').join('\n\n'), so_trang: ten.length };
  });
}

function so_trang_tu_ten(ten: string): number {
  return Number(/-(\d+)\.png$/.exec(ten)?.[1] ?? 0);
}

/** Gom chuan hoa + cat tran + dem, dung cho ca ba duong. */
function dong_goi(
  tho: string, cach: CachTrich, canh_bao: string | null, so_trang?: number,
): KetQuaTrich {
  const { chu, cat_bot } = cat_ve_tran(chuan_van_ban(tho));
  return {
    noi_dung_text: chu,
    cach_trich: cach,
    so_ky_tu: chu.length,
    ...(so_trang === undefined ? {} : { so_trang }),
    canh_bao,
    cat_bot,
  };
}

/**
 * Trich noi dung mot tep. Nem `LoiDinhDang` khi khong biet doc dinh dang do.
 *
 * KHONG nem khi thieu cong cu: tra ve ket qua rong kem `canh_bao`. Do la tinh huong van
 * hanh (may chu chua cai OCR) chu khong phai loi — va lop tren can biet phan biet hai
 * chuyen do de bao dung cho nguoi dung.
 */
export async function trich_tu_tep(du_lieu: Buffer, ten_luu: string): Promise<KetQuaTrich> {
  const duong = duong_trich(ten_luu);
  if (duong === null) throw new LoiDinhDang(ten_luu);

  if (duong === 'docx') {
    const kq = trich_docx(du_lieu, { doan_toi_da: DOAN_TOI_DA_LUU });
    if (kq === null) {
      return dong_goi('', 'docx', 'Tệp .docx này không đọc được — có thể đã hỏng.');
    }
    if (kq.doan.length === 0) {
      return dong_goi('', 'docx',
        'Tệp .docx không có đoạn văn nào — có thể nội dung nằm trong ảnh chèn vào tài liệu.');
    }
    return dong_goi(kq.doan.join('\n'), 'docx', null);
  }

  if (duong === 'anh') {
    try {
      const chu = await ocr_anh(du_lieu);
      const kq = dong_goi(chu, 'ocr', canh_bao_ocr());
      if (kq.so_ky_tu === 0) {
        return dong_goi('', 'ocr', 'OCR không đọc được chữ nào từ ảnh này. '
          + 'Thường là do ảnh mờ, chụp nghiêng, hoặc độ phân giải quá thấp.');
      }
      return kq;
    } catch (loi) {
      if (loi instanceof LoiThieuCongCu) return dong_goi('', 'ocr', THIEU_OCR);
      throw loi;
    }
  }

  // PDF: thu lop chu truoc. Nhanh hon OCR hang chuc lan va chinh xac tuyet doi.
  let chu_pdf = '';
  try {
    chu_pdf = await trich_pdf_text(du_lieu);
  } catch (loi) {
    if (!(loi instanceof LoiThieuCongCu)) throw loi;
    return dong_goi('', 'pdf_text',
      'Máy chủ chưa cài "pdftotext" nên chưa đọc được PDF. Xem tài liệu HOP-DONG.md.');
  }

  const sach = chuan_van_ban(chu_pdf);
  if (sach.length >= TOI_THIEU_CO_CHU) return dong_goi(sach, 'pdf_text', null);

  // Khong co lop chu -> ban scan. Chuyen sang OCR.
  try {
    const { chu, so_trang } = await ocr_pdf(du_lieu);
    const kq = dong_goi(chu, 'ocr', canh_bao_ocr(so_trang), so_trang);
    if (kq.so_ky_tu === 0) {
      return dong_goi('', 'ocr',
        'Đây là bản scan và OCR không đọc được chữ nào. Thường do bản scan quá mờ.',
        so_trang);
    }
    return kq;
  } catch (loi) {
    if (loi instanceof LoiThieuCongCu) {
      return dong_goi('', 'ocr',
        `PDF này không có lớp chữ (bản scan) và máy chủ chưa cài "${loi.cong_cu}" để OCR.`);
    }
    throw loi;
  }
}

const THIEU_OCR = 'Máy chủ chưa cài "tesseract" nên chưa OCR được bản scan. '
  + 'Xem tài liệu HOP-DONG.md.';

function canh_bao_ocr(so_trang?: number): string {
  const trang = so_trang === undefined ? '' : ` ${String(so_trang)} trang.`;
  return `Nội dung này do OCR đọc từ bản scan${trang} OCR có thể đọc sai chữ và số — `
    + 'phải đối chiếu với bản gốc trước khi dùng vào việc gì có hệ quả.';
}

/** Dinh dang khong trich duoc. */
export class LoiDinhDang extends Error {
  constructor(ten: string) {
    super(`Chưa trích được nội dung từ "${ten}". Chỉ đọc được .docx, .pdf, .jpg, .png.`);
    this.name = 'LoiDinhDang';
  }
}
