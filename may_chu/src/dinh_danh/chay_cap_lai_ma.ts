// Cap lai ma nhan su cho nguoi DA CO ho so, theo khuon NV + ma ngan khoi + MMYY + so thu tu.
//
// DAY LA VIEC CUA IT, KHONG CO NUT TREN GIAO DIEN. Cap lai ma la doi danh tinh: ma cu duoc dong
// lai (giu lich su), ten thu muc kho tep doi theo, va ban ghi ben cong phan quyen van mang ma cu
// (hop dong voi cong khong co dong tu doi ma). Nhung hau qua do can nguoi doi chieu, nen no la
// mot lenh chay co chu dich chu khong phai mot cai bam trong luc dang lam viec khac.
//
//   npm run cap_lai_ma                        # CHAY THU: in ai se doi thanh ma gi, khong ghi gi
//   npm run cap_lai_ma -- --that              # ghi that
//   npm run cap_lai_ma -- --that --khoi-mac-dinh vp
//                                             # nguoi CHUA gan khoi: gan luon khoi nay roi cap ma
//   npm run cap_lai_ma -- --that --ly-do "Chuan hoa ma 10/2026"
//
// Chi dong toi nguoi con ma kieu cu (ERP69, NV0156, TAM14...). Nguoi da co ma dung khuon khong
// bi dung toi, nen chay lai bao nhieu lan cung an toan.
//
// Chay duoc tren VPS:  docker compose exec -T may_chu node dist/dinh_danh/chay_cap_lai_ma.js --that
import { dong_pool } from '../csdl/ket_noi.ts';
import { cap_lai_ma_hang_loat, danh_sach_ma_cu } from './cap_lai_ma.ts';

/** Doc tham so dang `--ten gia-tri`; tra null khi khong co. */
function tham_so(ten: string): string | null {
  const i = process.argv.indexOf(ten);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v === undefined || v.startsWith('--') ? null : v;
}

async function main(): Promise<void> {
  const that = process.argv.includes('--that');
  const khoi_mac_dinh = tham_so('--khoi-mac-dinh');
  const ly_do = tham_so('--ly-do');

  const ds = await danh_sach_ma_cu();
  if (ds.length === 0) {
    console.log('Mọi nhân sự đã dùng mã theo khuôn mới — không có gì để cấp lại.');
    await dong_pool();
    return;
  }

  console.log(`\n${String(ds.length)} nhân sự còn dùng mã cũ:\n`);
  let so_chua_khoi = 0;
  for (const d of ds) {
    const trang_thai = d.dang_hoat_dong ? '' : '  (đã nghỉ)';
    const ma = d.ma_du_kien === '' ? '(chưa gán khối)' : d.ma_du_kien;
    console.log(`  ${d.ma_nv.padEnd(10)} ${d.ho_ten.padEnd(24)} → ${ma}${trang_thai}`);
    if (d.ma_du_kien === '') so_chua_khoi++;
  }

  if (so_chua_khoi > 0) {
    console.log(`\n⚠ ${String(so_chua_khoi)} người chưa gán khối nên KHÔNG sinh được mã `
      + '(mã ghép từ mã ngắn của khối).');
    console.log('  Gán khối cho họ ở hồ sơ, hoặc chạy lại với --khoi-mac-dinh <ma khoi> '
      + 'nếu tất cả những người đó thật sự thuộc cùng một khối.');
  }

  if (!that) {
    console.log('\n(CHẠY THỬ — chưa ghi gì). Thêm --that để cấp lại thật.');
    await dong_pool();
    return;
  }

  const kq = await cap_lai_ma_hang_loat(console.log, khoi_mac_dinh, ly_do);

  console.log(`\n=== KẾT QUẢ ===`);
  for (const d of kq.da_cap) console.log(`  ✔ ${d.ma_cu} → ${d.ma_moi}  ${d.ho_ten}`);
  for (const d of kq.bo_qua) console.log(`  – bỏ qua ${d.ma_nv} (${d.ho_ten}): ${d.ly_do}`);
  for (const d of kq.loi) console.log(`  ✖ LỖI ${d.ma_nv} (${d.ho_ten}): ${d.ly_do}`);
  console.log(`\nĐã cấp ${String(kq.da_cap.length)} · bỏ qua ${String(kq.bo_qua.length)} `
    + `· lỗi ${String(kq.loi.length)}`);
  console.log('\nVIỆC CÒN LẠI (làm tay):');
  console.log('  1. Cập nhật mã nhân sự bên CỔNG PHÂN QUYỀN — bản ghi bên đó vẫn mang mã cũ.');
  console.log('  2. Đường dẫn SharePoint theo mã mới ở lần đồng bộ kế tiếp.');
  await dong_pool();
}

main().catch((loi: unknown) => { console.error((loi as Error).message); process.exit(1); });
