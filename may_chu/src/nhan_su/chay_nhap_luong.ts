// Nhập LƯƠNG CỨNG + PHỤ CẤP hàng loạt từ file Excel "Bảng lương" của công ty, khớp theo HỌ TÊN.
//
//   npm run nhap_luong -- <file.xlsx> [YYYY-MM] [--sheet "Tên sheet"]        # chạy thử (chỉ in)
//   npm run nhap_luong -- <file.xlsx> [YYYY-MM] [--sheet "Tên sheet"] --that # ghi thật
//
// MẶC ĐỊNH CHẠY THỬ. In ra: ai khớp, mỗi người sẽ nhận lương cơ bản + từng phụ cấp bao nhiêu,
// ai KHÔNG khớp tên. Xem kỹ rồi mới --that (đây là tiền thật).
//
// Ghi vào:
//   - quyet_dinh_luong: LƯƠNG CƠ BẢN (hiệu lực từ đầu tháng chỉ định) — các tháng sau vẫn giữ.
//   - chinh_sach_phu_cap: các khoản PHỤ CẤP CỐ ĐỊNH (pc_chung, trang điểm, trang phục, gửi xe,
//     KPI) theo số tiền; PC ăn trưa theo công (30.000đ/công).
// KHÔNG nhập OT / doanh số / tạm ứng — đó là số theo từng kỳ, nhập ở màn Khoản mỗi tháng.
//
// Đọc file LÚC CHẠY, KHÔNG nhét dữ liệu lương vào mã nguồn (NĐ 13/2023 + không rò lương).
import { readFileSync } from 'node:fs';
import { trich_xlsx, ten_cac_sheet } from '../tien_ich/doc_office.ts';
import { truy_van, thuc_thi, trong_giao_dich, dong_pool } from '../csdl/ket_noi.ts';

function chuan(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
function tap_tu(s: string): string {
  return chuan(s).split(' ').filter(Boolean).sort().join(' ');
}
/** Chuẩn hoá tên cột: bỏ mọi khoảng trắng + thường hoá. */
function khoa_cot(s: string): string {
  return chuan(s).replace(/\s+/g, '');
}
/** Đọc số từ ô Excel (bỏ dấu phẩy, chấm ngăn cách, khoảng trắng). */
function so(o: string | undefined): number {
  if (o === undefined) return 0;
  // Excel lưu GIÁ TRỊ SỐ THÔ (vd 24120512.8076965, 500000): dấu chấm là DẤU THẬP PHÂN, không
  // phải ngăn nghìn. Giữ dấu chấm -> Number() -> làm tròn về đồng. Chỉ khi có NHIỀU dấu chấm
  // (ô định dạng ngăn nghìn kiểu 24.120.512) mới coi là ngăn nghìn.
  let s = o.replace(/[^\d.-]/g, '');
  if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Khoản phụ cấp cố định (số tiền): tên cột chuẩn hoá -> khoan_ma. */
const KHOAN_TIEN: { khoan_ma: string; ten: string; cot: string[] }[] = [
  { khoan_ma: 'pc_chung',      ten: 'Phụ cấp',              cot: ['phucap'] },
  { khoan_ma: 'pc_trang_diem', ten: 'Phụ cấp trang điểm',   cot: ['phucaptrangdiem'] },
  { khoan_ma: 'pc_trang_phuc', ten: 'Phụ cấp trang phục quý', cot: ['phucaptrangphucquy', 'phucaptrangphuc'] },
  { khoan_ma: 'pc_gui_xe',     ten: 'Hỗ trợ gửi xe',        cot: ['hotroguixeveNgay', 'hotroguixe', 'guixe'].map(khoa_cot) },
  { khoan_ma: 'pc_kpi',        ten: 'Thưởng KPI',           cot: ['kpi'] },
];
const COT_HO_TEN = ['hovaten', 'hoten'];
const COT_LUONG = ['luongcoban'];
const COT_AN_TRUA_NGAY = ['ngaylamviecduoctinhpcantrua', 'ngaytinhpcantrua', 'ngayantrua'];

interface CotMap { [k: string]: number }

function tim_cot(tieu_de: string[]): CotMap {
  const m: CotMap = {};
  tieu_de.forEach((t, i) => { m[khoa_cot(t)] = i; });
  return m;
}
function chi_so(m: CotMap, ung_vien: string[]): number | undefined {
  for (const c of ung_vien) if (m[c] !== undefined) return m[c];
  return undefined;
}

interface NhanVienDb { id: string; ho_ten: string; }

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const that = args.includes('--that');
  const file = args.find((a) => a.endsWith('.xlsx'));
  const thang = args.find((a) => /^\d{4}-\d{2}$/.test(a)) ?? new Date().toISOString().slice(0, 7);
  const si = args.indexOf('--sheet');
  const sheet_chi_dinh = si >= 0 ? args[si + 1] : undefined;

  if (file === undefined) {
    console.error('Dùng: npm run nhap_luong -- <file.xlsx> [YYYY-MM] [--sheet "Tên"] [--that]');
    process.exit(1);
  }
  const buf = readFileSync(file);

  // Chọn sheet: chỉ định, hoặc sheet đầu tiên có cột "Họ và tên".
  const sheets = sheet_chi_dinh !== undefined ? [sheet_chi_dinh] : ten_cac_sheet(buf);
  let bang: { hang: string[][] } | null = null;
  let ten_sheet = '';
  let dong_tieu_de = -1;
  for (const s of sheets) {
    const b = trich_xlsx(buf, { ten_sheet: s, hang_toi_da: 5000, cot_toi_da: 64 });
    if (b === null) continue;
    // Tìm dòng tiêu đề (dòng có "Họ và tên").
    const idx = b.hang.findIndex((h) => h.some((c) => COT_HO_TEN.includes(khoa_cot(c))));
    if (idx >= 0) { bang = b; ten_sheet = s; dong_tieu_de = idx; break; }
  }
  if (bang === null) {
    console.error('Không tìm thấy sheet nào có cột "Họ và tên".');
    await dong_pool();
    process.exit(1);
  }
  console.log(`Đọc sheet "${ten_sheet}", dòng tiêu đề ${dong_tieu_de + 1}, áp cho tháng ${thang}.`);

  const cot = tim_cot(bang.hang[dong_tieu_de]!);
  const i_ten = chi_so(cot, COT_HO_TEN);
  const i_luong = chi_so(cot, COT_LUONG);
  const i_an_trua_ngay = chi_so(cot, COT_AN_TRUA_NGAY);
  if (i_ten === undefined) { console.error('Thiếu cột "Họ và tên".'); await dong_pool(); process.exit(1); }

  // Nhân viên đang hoạt động, tra theo tên chuẩn hoá.
  const nv = await truy_van<NhanVienDb>('select id, ho_ten from nhan_vien where dang_hoat_dong = true');
  const theo_ten = new Map<string, NhanVienDb>();
  for (const n of nv) theo_ten.set(tap_tu(n.ho_ten), n);

  interface Ke { nv: NhanVienDb; luong: number; pc: { khoan_ma: string; ten: string; so_tien: number }[]; an_trua_ngay: number; }
  const ke_hoach: Ke[] = [];
  const khong_khop: string[] = [];
  const canh_bao_so: string[] = [];

  for (let r = dong_tieu_de + 1; r < bang.hang.length; r++) {
    const hang = bang.hang[r]!;
    const ten = (hang[i_ten] ?? '').trim();
    if (ten === '' || /^(cộng|tổng|tong|cong)\b/i.test(chuan(ten))) continue;
    const match = theo_ten.get(tap_tu(ten));
    if (match === undefined) { khong_khop.push(ten); continue; }

    // Chặn an toàn: số tiền vô lý (> 5 tỷ/tháng) gần như luôn là lỗi đọc ô — bỏ + cảnh báo,
    // KHÔNG để nó tràn cột hay ghi lương bậy.
    const hop_le = (v: number, nhan: string): number => {
      if (v > 5_000_000_000) { canh_bao_so.push(`${ten}: ${nhan}=${v} — bỏ qua (vô lý).`); return 0; }
      return v;
    };
    const luong = hop_le(i_luong === undefined ? 0 : so(hang[i_luong]), 'lương cơ bản');
    const pc = KHOAN_TIEN.map((k) => {
      const idx = chi_so(cot, k.cot);
      return { khoan_ma: k.khoan_ma, ten: k.ten, so_tien: idx === undefined ? 0 : hop_le(so(hang[idx]), k.ten) };
    }).filter((x) => x.so_tien > 0);
    const an_trua_ngay = i_an_trua_ngay === undefined ? 0 : so(hang[i_an_trua_ngay]);
    ke_hoach.push({ nv: match, luong, pc, an_trua_ngay });
  }

  // In kế hoạch.
  const dinh = new Intl.NumberFormat('vi-VN');
  console.log(`\nSẽ gán cho ${ke_hoach.length} người (khớp tên):`);
  for (const k of ke_hoach) {
    const cac_pc = [
      ...k.pc.map((p) => `${p.ten}=${dinh.format(p.so_tien)}`),
      ...(k.an_trua_ngay > 0 ? [`ăn trưa=${k.an_trua_ngay} công×30k`] : []),
    ];
    console.log(`  ${k.nv.ho_ten.padEnd(24)} lương cơ bản=${dinh.format(k.luong).padStart(12)}`
      + (cac_pc.length > 0 ? `  | ${cac_pc.join(', ')}` : ''));
  }
  if (canh_bao_so.length > 0) {
    console.log(`\n⚠ ${canh_bao_so.length} ô số vô lý đã bỏ (không ghi):`);
    for (const c of canh_bao_so) console.log(`  - ${c}`);
  }
  if (khong_khop.length > 0) {
    console.log(`\n⚠ ${khong_khop.length} tên trong Excel KHÔNG khớp nhân viên nào (bỏ qua):`);
    for (const t of khong_khop) console.log(`  - ${t}`);
  }

  if (!that) {
    console.log('\n(CHẠY THỬ — chưa ghi gì). Thêm --that để ghi thật.');
    await dong_pool();
    return;
  }

  const hieu_luc_tu = `${thang}-01`;
  let so_luong_nv = 0;
  let so_pc = 0;
  await trong_giao_dich(async (kh) => {
    for (const k of ke_hoach) {
      if (k.luong > 0) {
        await kh.query(
          `insert into quyet_dinh_luong (nhan_vien_id, hieu_luc_tu, luong_co_ban, phu_cap, hinh_thuc, ly_do)
           values ($1,$2,$3,0,'thang','Nhập từ bảng lương Excel')
           on conflict (nhan_vien_id, hieu_luc_tu) do update set luong_co_ban = excluded.luong_co_ban`,
          [k.nv.id, hieu_luc_tu, k.luong],
        );
        so_luong_nv++;
      }
      // Phụ cấp cố định (số tiền): xoá chính sách cùng khoản mở từ cùng mốc rồi ghi mới.
      for (const p of k.pc) {
        await kh.query(
          'delete from chinh_sach_phu_cap where nhan_vien_id=$1 and khoan_ma=$2 and hieu_luc_tu=$3',
          [k.nv.id, p.khoan_ma, hieu_luc_tu],
        );
        await kh.query(
          `insert into chinh_sach_phu_cap (nhan_vien_id, khoan_ma, nguon_so_luong, so_tien, hieu_luc_tu, ly_do)
           values ($1,$2,'co_dinh',$3,$4,'Nhập từ bảng lương Excel')`,
          [k.nv.id, p.khoan_ma, p.so_tien, hieu_luc_tu],
        );
        so_pc++;
      }
      // PC ăn trưa: theo công, 30.000đ/công.
      if (k.an_trua_ngay > 0) {
        await kh.query(
          'delete from chinh_sach_phu_cap where nhan_vien_id=$1 and khoan_ma=$2 and hieu_luc_tu=$3',
          [k.nv.id, 'pc_an_trua', hieu_luc_tu],
        );
        await kh.query(
          `insert into chinh_sach_phu_cap (nhan_vien_id, khoan_ma, nguon_so_luong, don_gia, hieu_luc_tu, ly_do)
           values ($1,'pc_an_trua','theo_cong',30000,$2,'Nhập từ bảng lương Excel')`,
          [k.nv.id, hieu_luc_tu],
        );
        so_pc++;
      }
    }
  });
  console.log(`\n✔ ĐÃ GHI: lương cơ bản cho ${so_luong_nv} người, ${so_pc} dòng phụ cấp (hiệu lực ${hieu_luc_tu}).`);
  console.log('→ Vào màn Bảng lương bấm "Tính lương" để áp vào kỳ.');
  await dong_pool();
}

main().catch((loi: unknown) => { console.error((loi as Error).message); process.exit(1); });
