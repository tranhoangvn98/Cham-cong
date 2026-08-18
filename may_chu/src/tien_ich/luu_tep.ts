// Luu tep dinh kem ho so nhan su (hop dong scan, bien ban, anh bien nhan thiet bi...).
//
// Khac anh selfie cham cong o hai diem: cho phep PDF va tep Office, va dung lai chinh sach
// TRA VE cung ran hon — xem `doc_tep_ho_so`.
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { cau_hinh } from '../cau_hinh.ts';
import { LoiDauVao } from './kiem_tra.ts';

/**
 * Khong ghi duoc xuong thu muc luu tru. KHONG phai loi cua nguoi dung.
 *
 * Co lop loi rieng vi day la loi VAN HANH, va no can noi thanh cau nguoi doc hieu duoc.
 * Truoc do no bubble len thanh HTTP 500 "Loi he thong. Vui long thu lai" — mot cau khong
 * dan ai den dau, cho mot loi khong bao gio tu khoi.
 */
export class LoiThuMucLuu extends Error {
  readonly thu_muc: string;
  /** 503, khong phai 500: kho luu tru khong dung duoc, con may chu thi van song. */
  readonly ma_http = 503;
  /**
   * Thong diep duoc phep tra ra ngoai.
   *
   * KHONG chua duong dan tuyet doi tren may chu — cai do chi vao log. Nhung PHAI noi ro
   * "loi cau hinh may chu, khong phai loi cua tep", vi khong noi thi nhan su se ngoi thu
   * lai voi tep khac hang chuc lan.
   */
  readonly thong_diep_cong_khai: string;

  constructor(thu_muc: string, gay_boi: string) {
    super(`Không ghi được vào thư mục lưu hồ sơ ${thu_muc}: ${gay_boi}`);
    this.name = 'LoiThuMucLuu';
    this.thu_muc = thu_muc;
    this.thong_diep_cong_khai = gay_boi === 'ENOSPC'
      ? 'Máy chủ đã hết dung lượng đĩa nên chưa lưu được tệp. Đây là lỗi máy chủ, '
        + 'không phải lỗi của tệp — báo quản trị, đừng thử lại.'
      : `Máy chủ không ghi được vào thư mục lưu hồ sơ (mã lỗi ${gay_boi}). Đây là lỗi cấu `
        + 'hình máy chủ, không phải lỗi của tệp — thử lại sẽ vẫn thất bại. Báo quản trị, '
        + 'xem tai_lieu/TRIEN-KHAI.md mục "Thư mục lưu hồ sơ không ghi được".';
  }
}

interface DinhDang {
  duoi: string;
  mime: string;
}

/**
 * Nhan dang loai tep bang MAGIC BYTE, khong tin content-type client gui len.
 *
 * Client dat content-type tuy y, nen tin no dong nghia voi khong kiem gi ca. Ten tep cung
 * vay: mot tep .exe doi ten thanh .pdf van la .exe.
 */
function doc_dinh_dang(du_lieu: Buffer, ten_goc: string): DinhDang | null {
  if (du_lieu.length < 12) return null;
  const b = (i: number): number => du_lieu[i] as number;

  // PDF: '%PDF-'
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46 && b(4) === 0x2d) {
    return { duoi: 'pdf', mime: 'application/pdf' };
  }
  // JPEG: FF D8 FF
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) {
    return { duoi: 'jpg', mime: 'image/jpeg' };
  }
  // PNG
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((x, i) => b(i) === x)) {
    return { duoi: 'png', mime: 'image/png' };
  }

  // DOCX / XLSX la tep ZIP ('PK'). Khong the phan biet chung voi mot tep ZIP bat ky chi
  // bang magic byte, nen o day PHAI dua them vao duoi ten do nguoi dung gui. Chap nhan
  // duoc vi tep khong bao gio duoc thuc thi va luon tra ve dang tai xuong.
  if (b(0) === 0x50 && b(1) === 0x4b && (b(2) === 0x03 || b(2) === 0x05 || b(2) === 0x07)) {
    const duoi = (ten_goc.split('.').pop() ?? '').toLowerCase();
    if (duoi === 'docx') {
      return { duoi, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    }
    if (duoi === 'xlsx') {
      return { duoi, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    return null;
  }

  return null;
}

/**
 * Bo duong dan va ky tu dieu khien khoi ten hien thi.
 *
 * Ten nay CHI de nguoi doc va de dat ten luc tai xuong — khong bao gio dung de mo tep tren
 * dia. Phai bo ky tu dieu khien vi ten se di vao header Content-Disposition: mot ky tu
 * xuong dong trong do la chen header tuy y.
 */
export function lam_sach_ten(ten: string): string {
  const chi_ten = ten.split(/[/\\]/).pop() ?? ten;
  return chi_ten.replace(/[\u0000-\u001f\u007f"\\]/g, '').trim().slice(0, 200) || 'tep';
}

export interface TepDaLuu {
  ten_luu: string;
  mime: string;
  kich_thuoc: number;
}

/**
 * Ghi tep xuong dia, tra ve ten tuong doi dang 'YYYY-MM/uuid.pdf'.
 * Ten tep do may chu sinh HOAN TOAN — khong lay bat ky phan nao tu client.
 */
export async function luu_tep_ho_so(
  du_lieu: Buffer,
  ten_goc: string,
  thang: string,
): Promise<TepDaLuu> {
  if (du_lieu.length === 0) throw new LoiDauVao('Tệp rỗng.');
  if (du_lieu.length > cau_hinh.tep_toi_da_byte) {
    const mb = Math.round(cau_hinh.tep_toi_da_byte / (1024 * 1024));
    throw new LoiDauVao(`Tệp quá lớn (tối đa ${mb} MB).`);
  }

  const dd = doc_dinh_dang(du_lieu, ten_goc);
  if (dd === null) {
    throw new LoiDauVao('Chỉ nhận tệp PDF, JPG, PNG, DOCX hoặc XLSX.');
  }

  // Gom theo thang de mot thu muc khong phinh len hang tram nghin tep.
  const ten_luu = `${thang}/${randomUUID()}.${dd.duoi}`;
  try {
    await mkdir(join(cau_hinh.thu_muc_ho_so, thang), { recursive: true });
    await writeFile(join(cau_hinh.thu_muc_ho_so, ten_luu), du_lieu, { mode: 0o600 });
  } catch (loi) {
    // EACCES / EPERM: thu muc thuoc nguoi khac. ENOSPC: het dia. Ba tinh huong nay deu la
    // van hanh, va deu KHONG tu khoi — phai noi ro ra thay vi tra 500 chung.
    const ma = (loi as NodeJS.ErrnoException).code ?? '';
    if (ma === 'EACCES' || ma === 'EPERM' || ma === 'ENOSPC' || ma === 'EROFS') {
      throw new LoiThuMucLuu(cau_hinh.thu_muc_ho_so, ma);
    }
    throw loi;
  }
  return { ten_luu, mime: dd.mime, kich_thuoc: du_lieu.length };
}

/**
 * Thu muc luu tru co ghi duoc that khong? Goi luc khoi dong.
 *
 * KHONG dung `access(W_OK)`: no chi hoi he dieu hanh ve bit quyen, va tra ve "duoc" trong
 * nhung truong hop van khong ghi duoc (dia chi doc, het inode, quota). Cach duy nhat biet
 * chac la GHI THAT mot tep roi xoa.
 */
export async function thu_ghi_thu_muc(thu_muc: string): Promise<string | null> {
  const thu = join(thu_muc, `.thu-ghi-${randomUUID()}`);
  try {
    await mkdir(thu_muc, { recursive: true });
    await writeFile(thu, 'x');
    return null;
  } catch (loi) {
    return (loi as NodeJS.ErrnoException).code ?? (loi as Error).message;
  } finally {
    await rm(thu, { force: true }).catch(() => { /* khong ghi duoc thi cung khong co gi de xoa */ });
  }
}

export interface TinhTrangLuuTru {
  thu_muc_ho_so: string;
  thu_muc_anh: string;
  /** null = ghi duoc. Chuoi = ma loi cua he dieu hanh. */
  loi_ho_so: string | null;
  loi_anh: string | null;
}

/**
 * Kiem ca hai thu muc luu tru.
 *
 * Bao ca hai trong mot lan goi vi hai thu muc nay hong DOC LAP nhau — da xay ra dung the:
 * `anh_cham_cong` ghi duoc con `ho_so` thi khong, nen anh selfie van chay va khong co dau
 * hieu nao cho thay mot nua kho luu tru dang chet.
 */
export async function kiem_tra_luu_tru(): Promise<TinhTrangLuuTru> {
  const [loi_ho_so, loi_anh] = await Promise.all([
    thu_ghi_thu_muc(cau_hinh.thu_muc_ho_so),
    thu_ghi_thu_muc(cau_hinh.thu_muc_anh),
  ]);
  return {
    thu_muc_ho_so: cau_hinh.thu_muc_ho_so,
    thu_muc_anh: cau_hinh.thu_muc_anh,
    loi_ho_so,
    loi_anh,
  };
}

const RE_TEN_LUU = /^\d{4}-\d{2}\/[0-9a-f-]{36}\.(pdf|jpg|png|docx|xlsx)$/;

/** Duong dan tuyet doi da kiem, hoac null neu ten khong hop le / thoat ra ngoai thu muc. */
function duong_dan_an_toan(ten_luu: string): string | null {
  if (!RE_TEN_LUU.test(ten_luu)) return null;
  const goc = resolve(cau_hinh.thu_muc_ho_so);
  const day_du = resolve(goc, ten_luu);
  if (day_du !== goc && !day_du.startsWith(goc + sep)) return null;
  return day_du;
}

/** Doc tep theo ten da luu trong CSDL. Chan path traversal hai lop nhu anh selfie. */
export async function doc_tep_ho_so(ten_luu: string): Promise<Buffer | null> {
  const day_du = duong_dan_an_toan(ten_luu);
  if (day_du === null) return null;
  try {
    return await readFile(day_du);
  } catch {
    return null;
  }
}

/** Xoa tep tren dia. Khong nem neu tep da khong con — muc tieu la "khong con nua". */
export async function xoa_tep_ho_so(ten_luu: string): Promise<void> {
  const day_du = duong_dan_an_toan(ten_luu);
  if (day_du === null) return;
  try {
    await unlink(day_du);
  } catch {
    // da bi xoa tu truoc: coi nhu xong
  }
}
