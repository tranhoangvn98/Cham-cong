// Tro ly du lieu ca nhan — chatbot tra loi tu CHINH du lieu cua nguoi hoi.
//
// Vi sao khong goi thang mot LLM ngoai (mac dinh): du lieu cham cong/luong la du lieu ca nhan
// (NĐ 13/2023). Gui ra dich vu ngoai la mot quyet dinh phai co y thuc — nen o day tra loi bang
// truy van CO SAN, khong loi ra ngoai, khong ton phi. Cho LLM da chua san (`hoi_llm`): khi cong
// ty cau hinh khoa API va bat co, cac cau KHONG khop y dinh nao se chuyen sang LLM.
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

/** Cung tap loai nghi voi route POST /api/toi/nghi-phep (toi.ts). Khong import tu do de tranh vong import. */
export const LOAI_NGHI = [
  'phep_nam', 'khong_luong', 'om', 'thai_san', 'ket_hon', 'hieu',
] as const;

export type LoaiNghi = (typeof LOAI_NGHI)[number];

/** Hanh dong tro ly da dien san, CHO nhan vien bam xac nhan. Chua co gi duoc gui di. */
export interface HanhDongChoXacNhan {
  loai: 'tao_don_nghi_phep' | 'tao_giai_trinh' | 'tao_de_xuat' | 'huy_don';
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
  'Công tháng này của tôi thế nào?',
  'Tháng này tôi đi muộn mấy lần?',
  'Đi muộn bị xử lý thế nào?',
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
  | 'cong_thang' | 'nghi_le' | 'ca_lam' | 'don_cho' | 'phep' | 'khong_ro';

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
  if (co(cau, 'de xuat', 'kien nghi', 'gop y', 'góp y')) return 'de_xuat';
  if (co(cau, 'xin nghi', 'xin phep', 'xin om', 'nghi om', 'muon nghi', 'dang ky nghi', 'nghi phep ngay')) return 'xin_nghi_phep';
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
        tra_loi: 'Chào bạn! Mình là trợ lý dữ liệu. Bạn hỏi về phép, công, lương, đi muộn, '
          + 'nghỉ lễ, ca làm việc, nội quy công ty — mình tra ngay từ dữ liệu của bạn. '
          + 'Mình cũng điền sẵn đơn giúp bạn, và **chính bạn** bấm nút xác nhận thì đơn mới gửi.',
        y_dinh: 'chao',
        goi_y: GOI_Y,
      };
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

  // ---- KHONG KHOP: thu LLM (neu bat), khong thi loi moi ----
  const llm = await hoi_llm(nv_id, cau_hoi_goc);
  if (llm !== null) return { tra_loi: llm, y_dinh: 'llm', goi_y: GOI_Y };

  return {
    tra_loi: 'Mình chưa hiểu câu hỏi. Bạn thử hỏi về **phép, công, đi muộn, nghỉ lễ, ca làm '
      + 'việc, nội quy** hoặc **đơn chờ duyệt** nhé.',
    y_dinh: 'khong_ro',
    goi_y: GOI_Y,
  };
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
  return {
    tra_loi: `Năm nay bạn có **${quota} ngày phép**, đã dùng **${da_dung}**, `
      + `còn lại **${con} ngày**.`,
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
  return {
    tra_loi: `Tháng này bạn đi muộn **${m?.so_lan_muon ?? 0} lần**, `
      + `tổng **${m?.tong_phut ?? 0} phút**.`,
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
  return {
    tra_loi: `Tháng ${thang}: **${c?.tong_cong ?? 0} công**, có mặt ${c?.co_mat ?? 0} ngày, `
      + `nghỉ phép ${c?.phep ?? 0}, vắng ${c?.vang ?? 0}.`,
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
  return {
    tra_loi: `Ca của bạn: **${ca.ten}**, giờ vào ${ca.gio_vao?.slice(0, 5)}, `
      + `giờ ra ${ca.gio_ra?.slice(0, 5)}.`,
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
  return {
    tra_loi: so === 0 ? 'Bạn không có đơn nào đang chờ duyệt.'
      : `Bạn đang có **${so} đơn** chờ duyệt. Xem ở tab "Đơn của tôi".`,
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
  const khoang = phan_tich_khoang_nghi(cau, hom_nay);
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

/**
 * Cho cam LLM (Azure OpenAI / Claude) — CHUA bat. Tra null = khong dung LLM, tro ly chi tra loi
 * tu du lieu. Khi cong ty cau hinh khoa API, noi ham nay vao dich vu that: prompt chi duoc gui
 * du lieu TOI THIEU va da an danh, khong gui thang du lieu ca nhan tho ra ngoai.
 */
async function hoi_llm(_nv_id: string, _cau_hoi: string): Promise<string | null> {
  return null;
}
