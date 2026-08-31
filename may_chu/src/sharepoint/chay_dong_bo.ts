// Lenh CLI: npm run dong_bo_sharepoint                  (tinh duong dan + day len)
//           npm run dong_bo_sharepoint -- --chi_tinh     (CHI tinh duong dan, khong cham SharePoint)
//
// VI SAO CAN LENH NAY: truoc no, cach duy nhat kich mot vong quet ngay la bam nut "Đồng bộ ngay"
// tren giao dien — nut do doi dang nhap. Con lai la cho vong quet hang ngay sau 01:00. Nguoi
// dang cau hinh SharePoint thi lam viec trong terminal cua VPS, va bat `SHAREPOINT_BAT_DAY=1`
// roi khong co gi xay ra la mot trang thai rat de doan sai thanh "hong".
//
// `--chi_tinh` KHONG cham vao SharePoint: chi doi chieu bang trang thai voi CSDL de xem duong
// dan se la gi. An toan de chay bat cu luc nao, ke ca khi chua bat `SHAREPOINT_BAT_DAY`.
import { ghi_nhan, quet } from './dong_bo.ts';
import { bat_sharepoint } from './khach.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { dong_pool } from '../csdl/ket_noi.ts';

const chi_tinh = process.argv.includes('--chi_tinh');

try {
  if (!bat_sharepoint()) {
    console.error(
      'Chưa cấu hình SharePoint. Khai SHAREPOINT_SITE_ID / CLIENT_ID / CLIENT_SECRET /\n'
      + 'TENANT_ID trong .env rồi chạy lại.',
    );
    process.exitCode = 1;
  } else {
    const gn = await ghi_nhan();
    console.log('Tính đường dẫn mong muốn:');
    console.log(`  xét        ${String(gn.so_xet)} tệp`);
    console.log(`  cập nhật   ${String(gn.so_doi)} dòng`);
    console.log(`  không đẩy  ${String(gn.so_bo_qua)}  (nhóm không đồng bộ, hoặc tệp đã gỡ)`);

    if (chi_tinh) {
      console.log('\n--chi_tinh: KHÔNG chạm vào SharePoint. Xem bảng rồi chạy lại không có cờ này.');
    } else if (!cau_hinh.sharepoint.bat_day) {
      // Van goi `quet()` de con so "còn việc" la thuc, nhung noi ro vi sao khong day.
      const q = await quet();
      console.log(`\nCòn ${String(q.so_con_viec)} việc, nhưng SHAREPOINT_BAT_DAY chưa bằng 1 nên KHÔNG đẩy gì.`);
      console.log('Đặt SHAREPOINT_BAT_DAY=1 trong .env, `docker compose up -d`, rồi chạy lại.');
    } else {
      const q = await quet();
      console.log('\nĐồng bộ:');
      console.log(`  còn việc   ${String(q.so_con_viec)}`);
      console.log(`  đã đẩy     ${String(q.so_day)}`);
      console.log(`  đã xóa     ${String(q.so_xoa)}  (tệp đã gỡ ở hệ thống thì xóa bản sao)`);
      console.log(`  lỗi        ${String(q.so_loi)}`);

      if (q.so_loi > 0) {
        console.log('\nXem lý do từng dòng ở *Cài đặt → Kho tệp hồ sơ*, hoặc:');
        console.log("  select ket_qua, so_lan_thu, ly_do, duong_dan_muon from sharepoint_tep");
        console.log("   where ket_qua = 'loi';");
        process.exitCode = 1;
      }

      // Mot vong chi lam toi `MOI_VONG` viec. Con viec nhieu hon so da lam nghia la con lai
      // cho vong sau — noi ra, khong de nguoi doc tuong da xong.
      const con = q.so_con_viec - q.so_day - q.so_xoa - q.so_loi;
      if (con > 0) {
        console.log(`\nCòn ${String(con)} việc chưa tới lượt trong vòng này. Chạy lại lệnh để làm tiếp.`);
      }
    }
  }
} catch (loi) {
  console.error('[dong_bo] LOI:', (loi as Error).message);
  process.exitCode = 1;
} finally {
  await dong_pool();
}
