// Xuat bang luong ra Excel THEO MAU ERP (mau_bang_luong_erp.xlsx).
//
// Cach lam: nap chinh file mau (giu logo, nhom cot thu gon, cong thuc, dinh dang, thiet lap in),
// thay cac token o dau trang, roi DIEN tung dong nhan vien vao vung du lieu (dong 10 tro di),
// nhan/xoa dong cho khop so nhan vien, va viet lai cong thuc SUM cua dong TONG.
//
// Dung `exceljs` (khac voi cho khac trong du an tu viet `ghi_xlsx`): mau nay co logo nhung, nhom
// cot outline, cong thuc va thiet lap in — tu dung lai bang bo ghi toi gian la khong kha thi.
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import { cau_hinh } from '../cau_hinh.ts';

const DUONG_MAU = fileURLToPath(new URL('../../mau/mau_bang_luong_erp.xlsx', import.meta.url));

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

  // Mo BUNG tat ca cot: mau goc gom nhom + thu gon con 17 cot, nhung o che do thu gon cac tieu
  // de nhom (gop qua cot an) bi TRAN/DE len nhau. Hien day du 48 cot cho khong bi de; nut +/- cua
  // nhom van con de nguoi dung tu thu gon neu muon.
  for (let c = 1; c <= 48; c++) ws.getColumn(c).hidden = false;

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

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}
