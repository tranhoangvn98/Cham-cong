// Xuat bang luong ra Excel THEO MAU ERP (mau_bang_luong_erp.xlsx).
//
// Cach lam: nap chinh file mau (giu logo, nhom cot thu gon, cong thuc, dinh dang, thiet lap in),
// thay cac token o dau trang, roi DIEN tung dong nhan vien vao vung du lieu (dong 10 tro di),
// nhan/xoa dong cho khop so nhan vien, va viet lai cong thuc SUM cua dong TONG.
//
// Dung `exceljs` (khac voi cho khac trong du an tu viet `ghi_xlsx`): mau nay co logo nhung, nhom
// cot outline, cong thuc va thiet lap in — tu dung lai bang bo ghi toi gian la khong kha thi.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import { cau_hinh } from '../cau_hinh.ts';

const DUONG_MAU = fileURLToPath(new URL('../../mau/mau_bang_luong_erp.xlsx', import.meta.url));
const SHEET_XML = 'xl/worksheets/sheet1.xml';
const RE_COLS = /<cols>[\s\S]*?<\/cols>/;

/**
 * exceljs GHI KHONG DUNG khoi <cols> cua mau (mat trang thai an + rong cua cot nhom, dat lai
 * rong 13). Ta thay thang khoi <cols> trong XML dau ra bang khoi GOC cua mau — nho vay che do
 * thu gon 17 cot va do rong tung cot khop y HET mau.
 */
// Do rong TOI THIEU cho cac cot HIEN (khong an) — de tieu de + so tien khong bi cat chu.
// Chi NOI RONG (max voi mau), khong lam hep, va khong dung toi cac cot chi tiet dang an.
const RONG_TOI_THIEU: Record<number, number> = {
  1: 6, 3: 24, 4: 20, 5: 26,        // STT, Ho ten, Chuc danh, Phong ban
  7: 12, 8: 12, 9: 14, 12: 15, 14: 12, // Cong chuan/thuc, Luong co ban, Luong theo cong, Tien OT
  15: 12, 16: 13,                   // Thuong, Phu cap khac (bo an)
  17: 13, 18: 13, 19: 13, 20: 14, 21: 12, // PC theo ca/an trua/trang diem/trang phuc/KPI (bo an)
  22: 16, 23: 15, 29: 14, 36: 13,   // Tong PC+thuong, Tong thu nhap, Tong BH, Thue TNCN
  44: 13, 45: 15, 47: 22,           // Tong tru, Thuc linh, Ghi chu
};

// Cot Thuong + Phu cap (O..U): BO AN de hien ro tren bang chinh (yeu cau: "thuong phu cap
// chua co trong bang luong"). Van nam trong nhom outline nen co the thu gon lai neu muon.
const BO_AN = new Set([15, 16, 17, 18, 19, 20, 21]);

/** Noi rong + bo an cac cot Thuong/Phu cap trong khoi <cols>, giu nguyen cac cot chi tiet khac. */
function noi_rong_cols(cols: string): string {
  return cols.replace(/<col\b[^>]*\/>/g, (tag) => {
    const min = Number(/min="(\d+)"/.exec(tag)?.[1] ?? '0');
    let t = tag;
    if (BO_AN.has(min)) t = t.replace(/\s*hidden="1"/, '');
    const toi_thieu = RONG_TOI_THIEU[min];
    if (toi_thieu !== undefined) {
      const cur = Number(/width="([\d.]+)"/.exec(t)?.[1] ?? '0');
      t = t.replace(/width="[\d.]+"/, `width="${Math.max(cur, toi_thieu)}"`);
    }
    return t;
  });
}

async function va_cols(buf: Buffer): Promise<Buffer> {
  const zin = await JSZip.loadAsync(buf);
  const ztpl = await JSZip.loadAsync(readFileSync(DUONG_MAU));
  const f_tpl = ztpl.file(SHEET_XML);
  const f_out = zin.file(SHEET_XML);
  if (f_tpl === null || f_out === null) return buf;
  const cols_goc = RE_COLS.exec(await f_tpl.async('string'))?.[0];
  if (cols_goc === undefined) return buf;
  const cols = noi_rong_cols(cols_goc);
  let xml = await f_out.async('string');
  xml = RE_COLS.test(xml) ? xml.replace(RE_COLS, cols) : xml.replace('<sheetData', `${cols}<sheetData`);
  zin.file(SHEET_XML, xml);
  return zin.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

const DATA_START = 10;
const SO_DONG_MAU = 30; // dong 10..39 trong mau

/** Cot can viet lai cong thuc SUM o dong TONG (bo A,B,C,D,E,F,G,H,AQ — khong cong). */
const COT_SUM = [
  'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y',
  'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM',
  'AN', 'AO', 'AP', 'AR', 'AS', 'AT',
];

const NHAN_HOP_DONG: Record<string, string> = {
  thu_viec: 'Thử việc', xac_dinh: 'Xác định', khong_xac_dinh: 'Không XĐ',
  thoi_vu: 'Thời vụ', cong_tac_vien: 'CTV', hoc_viec: 'Học việc',
};

interface DongPhieu {
  ma_nv: string; ho_ten: string; chuc_danh: string | null; phong_ban: string | null;
  loai_hop_dong: string | null;
  so_ngay_cong_chuan: number; so_ngay_cong_thuc: number;
  luong_co_ban: number; phu_cap: number; luong_ngay: number; luong_theo_cong: number;
  phut_ot: number; tien_ot: number; thuong: number; phu_cap_khac: number;
  khoan_thu_nhap: number; khoan_tru: number; thu_nhap_mien_thue: number;
  tong_thu_nhap: number; muc_dong_bh: number;
  bhxh_nld: number; bhyt_nld: number; bhtn_nld: number;
  bhxh_nsdld: number; bhyt_nsdld: number; bhtn_nsdld: number;
  so_nguoi_phu_thuoc: number; giam_tru_tong: number; thu_nhap_tinh_thue: number; thue_tncn: number;
  tru_khac: number; ly_do_tru_khac: string | null; tong_tru: number;
  thuc_linh: number; thuc_linh_lam_tron: number; ghi_chu: string | null; email: string | null;
  pc_theo_ca: number; pc_an_trua: number; pc_trang_diem: number; pc_trang_phuc: number; pc_kpi: number;
  tru_di_muon_tien: number; tru_di_muon_lan: number;
  tru_nua_ngay_tien: number; tru_nua_ngay_lan: number;
}

function d2(n: number): string {
  return String(n).padStart(2, '0');
}

/** dd/mm/yyyy tu chuoi 'YYYY-MM-DD'. */
function ngay_vn(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Them SHEET RIENG liet ke CHI TIET CAC KHOAN GIAM TRU cua tung nguoi (BHXH/YT/TN, thue TNCN,
 * tru di muon, tru nua ngay, giam thuong/phu cap do ky luat, tru khac) + dong TONG.
 */
function them_sheet_giam_tru(wb: ExcelJS.Workbook, ds: readonly DongPhieu[]): void {
  const ws = wb.addWorksheet('Chi tiết giảm trừ');
  const cot = [
    { h: 'STT', w: 6 }, { h: 'Mã NV', w: 12 }, { h: 'Họ tên', w: 24 }, { h: 'Phòng ban', w: 20 },
    { h: 'BHXH (NLĐ)', w: 13 }, { h: 'BHYT (NLĐ)', w: 13 }, { h: 'BHTN (NLĐ)', w: 13 },
    { h: 'Tổng BH (NLĐ)', w: 14 }, { h: 'Thuế TNCN', w: 13 },
    { h: 'Trừ đi muộn', w: 13 }, { h: 'Trừ nửa ngày', w: 13 },
    { h: 'Giảm thưởng/PC (kỷ luật)', w: 16 }, { h: 'Trừ khác', w: 13 }, { h: 'TỔNG TRỪ', w: 15 },
  ];
  ws.getRow(1).values = cot.map((c) => c.h);
  cot.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });
  const dau = ws.getRow(1);
  dau.font = { name: 'Times New Roman', bold: true };
  dau.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  const FMT = '#,##0';
  ds.forEach((p, i) => {
    const bh = p.bhxh_nld + p.bhyt_nld + p.bhtn_nld;
    const giam_kl = p.khoan_tru - p.tru_di_muon_tien - p.tru_nua_ngay_tien;
    const row = ws.addRow([
      i + 1, p.ma_nv, p.ho_ten, p.phong_ban ?? '',
      p.bhxh_nld, p.bhyt_nld, p.bhtn_nld, bh, p.thue_tncn,
      p.tru_di_muon_tien, p.tru_nua_ngay_tien, giam_kl, p.tru_khac, p.tong_tru,
    ]);
    for (let c = 5; c <= 14; c++) row.getCell(c).numFmt = FMT;
  });

  const n = ds.length;
  if (n > 0) {
    const tong = ws.addRow([]);
    tong.getCell(1).value = 'TỔNG';
    for (let c = 5; c <= 14; c++) {
      const L = String.fromCharCode(64 + c);
      tong.getCell(c).value = { formula: `SUM(${L}2:${L}${n + 1})` };
      tong.getCell(c).numFmt = FMT;
    }
    tong.font = { name: 'Times New Roman', bold: true };
  }

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
      if (cell.font?.name === undefined) cell.font = { name: 'Times New Roman' };
    });
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Xuat bang luong VND cua mot ky theo mau ERP. Tra ve Buffer file .xlsx.
 */
export async function xuat_bang_luong_erp(ky_luong_id: string): Promise<Buffer> {
  const ky = await truy_van_mot<{
    thang: string; nguoi_tao_ten: string | null; nguoi_duyet_ten: string | null;
  }>(
    `select k.thang,
            ut.ho_ten as nguoi_tao_ten, ud.ho_ten as nguoi_duyet_ten
       from ky_luong k
       left join nguoi_dung nt on nt.id = k.nguoi_tao
       left join nhan_vien  ut on ut.id = nt.nhan_vien_id
       left join nguoi_dung nd on nd.id = k.nguoi_duyet
       left join nhan_vien  ud on ud.id = nd.nhan_vien_id
      where k.id = $1`,
    [ky_luong_id],
  );
  if (ky === null) throw new Error('Không tìm thấy kỳ lương.');
  const { tu, den } = khoang_thang(ky.thang);

  const ds = await truy_van<DongPhieu>(
    `select nv.ma_nv, nv.ho_ten, nv.chuc_danh,
            pb.ten as phong_ban, p.loai_hop_dong,
            p.so_ngay_cong_chuan::float8, p.so_ngay_cong_thuc::float8,
            p.luong_co_ban::float8, p.phu_cap::float8, p.luong_ngay::float8,
            p.luong_theo_cong::float8, p.phut_ot::float8, p.tien_ot::float8,
            p.thuong::float8, p.phu_cap_khac::float8,
            p.khoan_thu_nhap::float8, p.khoan_tru::float8, p.thu_nhap_mien_thue::float8,
            p.tong_thu_nhap::float8, p.muc_dong_bh::float8,
            p.bhxh_nld::float8, p.bhyt_nld::float8, p.bhtn_nld::float8,
            p.bhxh_nsdld::float8, p.bhyt_nsdld::float8, p.bhtn_nsdld::float8,
            p.so_nguoi_phu_thuoc::int, p.giam_tru_tong::float8, p.thu_nhap_tinh_thue::float8,
            p.thue_tncn::float8, p.tru_khac::float8, p.ly_do_tru_khac,
            p.tong_tru::float8, p.thuc_linh::float8, p.thuc_linh_lam_tron::float8,
            p.ghi_chu, nv.email,
            coalesce(k.pc_theo_ca,0)::float8       as pc_theo_ca,
            coalesce(k.pc_an_trua,0)::float8       as pc_an_trua,
            coalesce(k.pc_trang_diem,0)::float8    as pc_trang_diem,
            coalesce(k.pc_trang_phuc,0)::float8    as pc_trang_phuc,
            coalesce(k.pc_kpi,0)::float8           as pc_kpi,
            coalesce(k.tru_di_muon_tien,0)::float8 as tru_di_muon_tien,
            coalesce(k.tru_di_muon_lan,0)::float8  as tru_di_muon_lan,
            coalesce(k.tru_nua_ngay_tien,0)::float8 as tru_nua_ngay_tien,
            coalesce(k.tru_nua_ngay_lan,0)::float8  as tru_nua_ngay_lan
       from phieu_luong p
       join nhan_vien nv on nv.id = p.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
       left join lateral (
         select
           sum(thanh_tien) filter (where khoan_ma = 'pc_theo_ca')    as pc_theo_ca,
           sum(thanh_tien) filter (where khoan_ma = 'pc_an_trua')    as pc_an_trua,
           sum(thanh_tien) filter (where khoan_ma = 'pc_trang_diem') as pc_trang_diem,
           sum(thanh_tien) filter (where khoan_ma = 'pc_trang_phuc') as pc_trang_phuc,
           sum(thanh_tien) filter (where khoan_ma = 'pc_kpi')        as pc_kpi,
           sum(thanh_tien) filter (where khoan_ma = 'tru_di_muon')   as tru_di_muon_tien,
           sum(so_luong)   filter (where khoan_ma = 'tru_di_muon')   as tru_di_muon_lan,
           sum(thanh_tien) filter (where khoan_ma = 'tru_nua_ngay')  as tru_nua_ngay_tien,
           sum(so_luong)   filter (where khoan_ma = 'tru_nua_ngay')  as tru_nua_ngay_lan
         from phieu_luong_khoan where phieu_luong_id = p.id
       ) k on true
      where p.ky_luong_id = $1
      order by pb.ten nulls last, nv.ma_nv`,
    [ky_luong_id],
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(DUONG_MAU);
  const ws = wb.getWorksheet('Bảng lương');
  if (ws === undefined) throw new Error('Mẫu bảng lương thiếu sheet "Bảng lương".');

  const N = ds.length;

  // Chup style TRUOC khi bien doi (duplicate xe dich cac dong duoi). Dung de dung lai dong TONG
  // va cum chu ky o dung vi tri.
  const style_tong: unknown[] = [];
  for (let c = 1; c <= 48; c++) style_tong[c] = ws.getCell(40, c).style;
  const style_sig_nhan = ws.getCell(43, 1).style; // "Người lập bảng"
  const style_sig_phu = ws.getCell(44, 1).style;  // "(Ký, họ tên)"
  const style_sig_ten = ws.getCell(48, 1).style;  // ten nguoi ky

  // CHI NHAN dong, KHONG BAO GIO XOA: spliceRows cua exceljs de lai o rac va lam mat gop o
  // (merge) o cum chu ky. Vi vay ta luon nhan tu mau 30 dong, roi DUNG LAI footer o vi tri
  // dung ben duoi — khong dua vao viec xoa dong.
  if (N > SO_DONG_MAU) ws.duplicateRow(DATA_START, N - SO_DONG_MAU, true);

  const cuoi = DATA_START + Math.max(N, 1) - 1; // dong du lieu cuoi
  const tong_row = DATA_START + N;              // dong TONG ngay sau vung du lieu

  // Xoa vung tu dong TONG tro xuong (dong du thua khi it nguoi + footer goc), va GO GOP O de
  // dung lai cum chu ky moi khong bi dung do.
  const xoa_den = Math.max(tong_row + 12, 48);
  for (const m of [...(ws.model.merges as string[])]) {
    const top = Number((/(\d+)/.exec(m) ?? [])[1] ?? 0);
    if (top >= tong_row) ws.unMergeCells(m);
  }
  for (let r = tong_row; r <= xoa_den; r++) {
    for (let c = 1; c <= 48; c++) ws.getCell(r, c).value = null;
  }

  // ---- dien tung dong ----
  for (let i = 0; i < N; i++) {
    const p = ds[i] as DongPhieu;
    const r = DATA_START + i;
    // Cot Q..U tach theo khoan; phan thu nhap con lai (pc_chung, gui xe, doanh so, ot khoan...)
    // gom vao P de V=SUM(O:U) khop tong thu nhap.
    const tach = p.pc_theo_ca + p.pc_an_trua + p.pc_trang_diem + p.pc_trang_phuc + p.pc_kpi;
    const phu_cap_khac_cot = p.phu_cap_khac + (p.khoan_thu_nhap - tach);
    // Cac khoan tru khac ngoai di muon (giam thuong ky luat, phat...) gom vao AM de tong khop.
    const giam_ky_luat = p.khoan_tru - p.tru_di_muon_tien - p.tru_nua_ngay_tien;
    const tong_tru_nhom = p.khoan_tru + p.tru_khac; // AR: khong gom BH/thue (o nhom rieng)

    const set = (col: string, v: number | string): void => { ws.getCell(`${col}${r}`).value = v; };
    set('A', i + 1);
    set('B', p.ma_nv);
    set('C', p.ho_ten);
    set('D', p.chuc_danh ?? '');
    set('E', p.phong_ban ?? '');
    set('F', p.loai_hop_dong === null ? '' : (NHAN_HOP_DONG[p.loai_hop_dong] ?? p.loai_hop_dong));
    set('G', p.so_ngay_cong_chuan);
    set('H', p.so_ngay_cong_thuc);
    set('I', p.luong_co_ban);
    set('J', p.phu_cap);
    set('K', p.luong_ngay);
    set('L', p.luong_theo_cong);
    set('M', p.phut_ot);
    set('N', p.tien_ot);
    set('O', p.thuong);
    set('P', phu_cap_khac_cot);
    set('Q', p.pc_theo_ca);
    set('R', p.pc_an_trua);
    set('S', p.pc_trang_diem);
    set('T', p.pc_trang_phuc);
    set('U', p.pc_kpi);
    ws.getCell(`V${r}`).value = { formula: `SUM(O${r}:U${r})` };
    set('W', p.tong_thu_nhap);
    set('X', p.thu_nhap_mien_thue);
    set('Y', p.muc_dong_bh);
    set('Z', p.bhxh_nld);
    set('AA', p.bhyt_nld);
    set('AB', p.bhtn_nld);
    ws.getCell(`AC${r}`).value = { formula: `SUM(Z${r}:AB${r})` };
    set('AD', p.bhxh_nsdld);
    set('AE', p.bhyt_nsdld);
    set('AF', p.bhtn_nsdld);
    set('AG', p.so_nguoi_phu_thuoc);
    set('AH', p.giam_tru_tong);
    set('AI', p.thu_nhap_tinh_thue);
    set('AJ', p.thue_tncn);
    set('AK', p.tru_di_muon_lan);
    set('AL', p.tru_nua_ngay_lan);
    set('AM', giam_ky_luat);
    set('AN', p.tru_di_muon_tien);
    set('AO', p.tru_nua_ngay_tien);
    set('AP', p.tru_khac);
    set('AQ', p.ly_do_tru_khac ?? '');
    set('AR', tong_tru_nhom);
    set('AS', p.thuc_linh);
    set('AT', p.thuc_linh_lam_tron);
    set('AU', p.ghi_chu ?? '');
    set('AV', p.email ?? '');
  }

  // ---- dong TONG: ap lai style mau + viet cong thuc SUM dung pham vi ----
  if (N > 0) {
    for (let c = 1; c <= 48; c++) ws.getCell(tong_row, c).style = style_tong[c] as never;
    ws.getCell(`A${tong_row}`).value = 'TỔNG';
    ws.getCell(`C${tong_row}`).value = { formula: `"("&COUNTA(C${DATA_START}:C${cuoi})&" người)"` };
    for (const col of COT_SUM) {
      ws.getCell(`${col}${tong_row}`).value = { formula: `SUM(${col}${DATA_START}:${col}${cuoi})` };
    }
  }

  // ---- cum chu ky: dung lai o vi tri dung (cach TONG 3 dong, giong mau) ----
  const r_nhan = tong_row + 3;
  const r_phu = tong_row + 4;
  const r_ten = tong_row + 8;
  const dat_cum = (
    r: number, style: unknown, cot: readonly [string, string, string][],
  ): void => {
    for (const [a, b, txt] of cot) {
      ws.mergeCells(`${a}${r}:${b}${r}`);
      const cell = ws.getCell(`${a}${r}`);
      cell.value = txt;
      cell.style = style as never;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  };
  dat_cum(r_nhan, style_sig_nhan, [
    ['A', 'F', 'Người lập bảng'], ['S', 'X', 'Kế toán trưởng'], ['AO', 'AT', 'Giám đốc'],
  ]);
  dat_cum(r_phu, style_sig_phu, [
    ['A', 'F', '(Ký, họ tên)'], ['S', 'X', '(Ký, họ tên)'], ['AO', 'AT', '(Ký, đóng dấu)'],
  ]);
  // Dong ten: nguoi lap o A, giam doc o AO (ke toan truong de trong nhu mau).
  dat_cum(r_ten, style_sig_ten, [
    ['A', 'F', ky.nguoi_tao_ten ?? ''], ['AO', 'AT', ky.nguoi_duyet_ten ?? ''],
  ]);

  // ---- token dau trang / o ky: thay tren MOI o co chuoi chua {{...}} ----
  const token: Record<string, string> = {
    company_name: cau_hinh.cong_ty.ten,
    company_address: cau_hinh.cong_ty.dia_chi,
    doc_no: `BL-${ky.thang}`,
    doc_date: ngay_vn(`${new Date().getFullYear()}-${d2(new Date().getMonth() + 1)}-${d2(new Date().getDate())}`),
    period: `${ky.thang.slice(5)}/${ky.thang.slice(0, 4)}`,
    period_from: ngay_vn(tu),
    period_to: ngay_vn(den),
    created_by: ky.nguoi_tao_ten ?? '',
    approved_by: ky.nguoi_duyet_ten ?? '',
  };
  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (typeof cell.value === 'string' && cell.value.includes('{{')) {
        cell.value = cell.value.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => token[k] ?? '');
      }
    });
  });

  // Tieu de A6 (da gop A6:AV6): CAN GIUA, IN HOA, Times New Roman.
  const o_tieu_de = ws.getCell('A6');
  if (typeof o_tieu_de.value === 'string') o_tieu_de.value = o_tieu_de.value.toUpperCase();
  o_tieu_de.font = { name: 'Times New Roman', bold: true, size: 16 };
  o_tieu_de.alignment = { horizontal: 'center', vertical: 'middle' };

  // ---- sheet rieng: chi tiet cac khoan giam tru tung nguoi ----
  them_sheet_giam_tru(wb, ds);

  const ab = await wb.xlsx.writeBuffer();
  return va_cols(Buffer.from(ab as ArrayBuffer));
}
