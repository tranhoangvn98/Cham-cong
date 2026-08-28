// Doi chieu bang `NHANH` voi cay thu muc THAT tren SharePoint.
//
// VI SAO CAN MOT LENH RIENG CHO VIEC NAY: bang `NHANH` trong anh_xa.ts la mot ban SAO CHEP
// TAY tu thu vien HCNS. Ten thu muc o do co dau gach ngang dai `–` (U+2013), co `&`, co
// `(...)`, co so thu tu `02.1`. Sai mot ky tu thi Graph KHONG bao loi: `POST .../children`
// voi conflictBehavior 'fail' se TAO MOT THU MUC MOI ben canh thu muc that, va ho so cua 53
// nguoi se nam trong mot cay khong ai mo. Trieu chung duy nhat la "chi HCNS khong thay tep".
//
// Va no khong phai viec lam mot lan: chi HCNS doi ten hoac them so thu tu la bang nay lech.
//
// Nen lenh nay tra ve dung mot thu: voi tung nhanh, no CO tren SharePoint hay khong; va khi
// khong, ten THAT cua cac thu muc dang nam trong thu muc cha, kem cho khac nhau tinh theo ma
// ky tu. Nguoi chay chi viec sao ten that vao `NHANH` — khong phai doan.
//
// CHI DOC. Khong tao, khong ghi, khong xoa. Quyen can la `Sites.Selected` muc read.
import { NHANH, type TenNhanh } from './anh_xa.ts';
import { liet_ke, type MucCon } from './khach.ts';
import { bo_dau } from '../tien_ich/ten_tep.ts';

/** Doc muc con cua mot thu muc; `null` = thu muc khong ton tai. */
export type DocThuMuc = (duong_dan: string) => Promise<MucCon[] | null>;

export interface KetQuaNhanh {
  khoa: TenNhanh;
  duong_dan: string;
  /** Nhanh nay co that tren SharePoint, va la mot thu muc. */
  co: boolean;
  /** Doan DAU TIEN khong tim thay. Voi nhanh hai cap co the la doan cha. */
  thieu_doan: string | null;
  /** Thu muc cha da liet ke duoc — cho de soi bang mat trong SharePoint. */
  cha: string | null;
  /** Ten THAT cua cac thu muc trong `cha`. De sao lai vao bang NHANH. */
  anh_em: readonly string[];
  /** Ten that giong nhat voi doan dang thieu, khi tim duoc. */
  gan_giong: string | null;
  /** Cho khac nhau giua ten mong doi va `gan_giong`, tinh theo ma ky tu. */
  khac: string | null;
  /** Co doi tuong dung ten nhung la TEP, khong phai thu muc. */
  la_tep: boolean;
  /** Loi khi goi Graph cho nhanh nay (403, mang dut...). */
  loi: string | null;
}

export interface BaoCaoNhanh {
  ket_qua: readonly KetQuaNhanh[];
  so_co: number;
  so_thieu: number;
  so_loi: number;
}

// ---------------------------------------------------------------- so sanh ten

/**
 * Cac ky tu gach ngang de bi lan voi nhau.
 *
 * U+2013 (–) la ky tu HCNS dung that trong "Quan hệ lao động – HĐLĐ". Ban phim go ra U+002D
 * (-), va Word tu doi thanh U+2014 (—). Ba ky tu nay hien tren man hinh gan nhu giong nhau.
 */
const GACH = /[-‐‑‒–—―−]/g;

/**
 * Dang de SO SANH hai ten thu muc — khong phai dang de ghi.
 *
 * Bo het nhung khac biet ma mat nguoi khong thay: kieu chuan hoa Unicode (ten tao tu may Mac
 * ve NFD), loai gach ngang, dau cach doi (ke ca U+00A0), HOA/thuong, va dau tieng Viet.
 *
 * Bo dau la buoc long nhat, va co y: khi mot ten lech vi dau thi ta VAN muon nhan ra do la
 * cung mot thu muc, roi de `khac_o()` chi ra dung ky tu lech. Hai nhanh khac nhau cua HCNS
 * khong nhanh nao trung nhau sau khi bo dau — chung khac nhau tu so thu tu dau ten.
 */
export function dang_so_sanh(s: string): string {
  return bo_dau(s.normalize('NFC'))
    .replace(GACH, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Ten trong `cac_ten` giong `muon` nhat sau khi chuan hoa. `null` = khong co cai nao gan. */
export function tim_gan_giong(muon: string, cac_ten: readonly string[]): string | null {
  const m = dang_so_sanh(muon);
  return cac_ten.find((t) => dang_so_sanh(t) === m) ?? null;
}

/** Ten mot ky tu theo ma Unicode, dang `"–" (U+2013)`. */
function ta_ky_tu(s: string, i: number): string {
  const c = s.codePointAt(i);
  if (c === undefined) return '(hết chuỗi)';
  const ma = c.toString(16).toUpperCase().padStart(4, '0');
  return `"${String.fromCodePoint(c)}" (U+${ma})`;
}

/**
 * Cho khac nhau dau tien giua ten mong doi va ten that. `null` = giong nhau tung ky tu.
 *
 * In ca MA KY TU, vi day la ca ly do ham nay ton tai: `"– "` va `"- "` in ra man hinh gan nhu
 * khong phan biet duoc, con `U+2013` va `U+002D` thi khong the nham.
 */
export function khac_o(mong: string, that: string): string | null {
  if (mong === that) return null;

  const n = Math.min(mong.length, that.length);
  for (let i = 0; i < n; i++) {
    if (mong[i] !== that[i]) {
      return `ký tự thứ ${String(i + 1)}: cần ${ta_ky_tu(mong, i)}, `
        + `trên SharePoint là ${ta_ky_tu(that, i)}`;
    }
  }
  return mong.length > that.length
    ? `tên thật NGẮN hơn ${String(mong.length - that.length)} ký tự `
      + `(thiếu "${mong.slice(n)}" ở cuối)`
    : `tên thật DÀI hơn ${String(that.length - mong.length)} ký tự `
      + `(thừa "${that.slice(n)}" ở cuối)`;
}

// ---------------------------------------------------------------- kiem mot nhanh

/**
 * Kiem MOT duong dan nhanh, di tu goc thu vien xuong tung cap.
 *
 * Di tung cap chu khong goi thang `GET /root:/<ca duong dan>`: nhanh hai cap
 * (`02 HỢP ĐỒNG & THỎA THUẬN/02.1 [A] ...`) co the lech o cap CHA, va mot ket qua 404 tren ca
 * duong dan thi khong noi duoc cap nao lech. Di tung cap thi biet dung doan dau tien khong
 * khop, va liet ke duoc anh em cua no.
 *
 * `doc` la tham so de bo kiem cap mot cay thu muc gia — khong can may chu Graph.
 */
export async function kiem_mot_nhanh(
  khoa: TenNhanh, doc: DocThuMuc,
): Promise<KetQuaNhanh> {
  const duong_dan = NHANH[khoa];
  const goc: KetQuaNhanh = {
    khoa,
    duong_dan,
    co: false,
    thieu_doan: null,
    cha: null,
    anh_em: [],
    gan_giong: null,
    khac: null,
    la_tep: false,
    loi: null,
  };

  let cha = '';
  for (const doan of duong_dan.split('/')) {
    let con: MucCon[] | null;
    try {
      con = await doc(cha);
    } catch (loi) {
      const l = loi as { thong_diep_cong_khai?: string; message?: string };
      return { ...goc, cha, loi: l.thong_diep_cong_khai ?? l.message ?? 'Lỗi không rõ.' };
    }

    if (con === null) {
      // Chi xay ra khi cap tren vua bao la CO thu muc nay ma doc lai khong thay — thu muc bi
      // xoa giua hai luot goi, hoac quyen doc bi chan rieng o do.
      return {
        ...goc,
        cha,
        thieu_doan: doan,
        loi: `Không đọc được thư mục "${cha}" dù cấp trên báo là có.`,
      };
    }

    const ten = con.map((c) => c.ten);
    const khop = con.find((c) => c.ten === doan);

    if (khop === undefined || !khop.la_thu_muc) {
      const giong = tim_gan_giong(doan, ten);
      return {
        ...goc,
        thieu_doan: doan,
        cha,
        anh_em: ten,
        gan_giong: giong,
        khac: giong === null ? null : khac_o(doan, giong),
        la_tep: khop !== undefined,
      };
    }

    cha = cha === '' ? doan : `${cha}/${doan}`;
  }

  return { ...goc, co: true };
}

// ---------------------------------------------------------------- kiem ca bang

/**
 * Kiem toan bo bang `NHANH`.
 *
 * Nho lai ket qua liet ke tung thu muc: 16 nhanh nhung chi 7 thu muc cha, va goi Graph 16 lan
 * cho cung mot thu muc goc la tu di toi gioi han luu luong cua Microsoft khong vi ly do gi.
 */
export async function kiem_cac_nhanh(doc: DocThuMuc = liet_ke): Promise<BaoCaoNhanh> {
  const nho = new Map<string, MucCon[] | null>();
  const doc_nho: DocThuMuc = async (duong_dan) => {
    if (nho.has(duong_dan)) return nho.get(duong_dan) ?? null;
    const ra = await doc(duong_dan);
    nho.set(duong_dan, ra);
    return ra;
  };

  const ket_qua: KetQuaNhanh[] = [];
  for (const khoa of Object.keys(NHANH) as TenNhanh[]) {
    ket_qua.push(await kiem_mot_nhanh(khoa, doc_nho));
  }

  return {
    ket_qua,
    so_co: ket_qua.filter((k) => k.co).length,
    so_loi: ket_qua.filter((k) => k.loi !== null).length,
    so_thieu: ket_qua.filter((k) => !k.co && k.loi === null).length,
  };
}
