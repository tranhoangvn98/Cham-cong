// Lenh CLI gop hai ho so nhan vien la cung mot nguoi.
//
//   npm run gop_trung                          liet ke cac cap NGHI LA trung
//   npm run gop_trung -- HR-01 ERP147          chay thu, bao se doi gi
//   npm run gop_trung -- HR-01 ERP147 --that   gop that
//
// Tham so thu nhat la ma GIU LAI, thu hai la ma BO. Thu tu quan trong va khong doan duoc, nen
// khong co mac dinh: go nguoc hai ma la gop nguoc, va lan quet cua ban dung se thanh cua ban
// bi bo.
//
// MAC DINH CHAY THU, va o day dieu do quan trong hon moi cho khac trong ma nguon: gop la thao
// tac doi chu so hang tram dong bang cong, bang luong, KPI cua mot nguoi that, roi XOA mot ho
// so. Khong hoan tac duoc bang mot lenh.
import { dong_pool } from '../csdl/ket_noi.ts';
import { gop_ho_so, id_theo_ma_nv, nen_giu_ban_nao, tim_ho_so_trung } from './gop_trung.ts';

const doi_so = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const that = process.argv.includes('--that');

try {
  if (doi_so.length === 0) {
    const cap = await tim_ho_so_trung();
    if (cap.length === 0) {
      console.log('\nKhông thấy cặp hồ sơ nào nghi là trùng.\n');
    } else {
      console.log(`\n${String(cap.length)} cặp NGHI LÀ trùng — người xem quyết, không phải máy:\n`);
      for (const c of cap) {
        const g = await nen_giu_ban_nao(c.a_id, c.b_id);
        const giu_ma = g.giu === c.a_id ? c.a_ma_nv : c.b_ma_nv;
        const bo_ma = g.giu === c.a_id ? c.b_ma_nv : c.a_ma_nv;
        console.log(`  ${c.a_ma_nv}  ↔  ${c.b_ma_nv}   ${c.ho_ten}   (giống nhau ở: ${c.ly_do})`);
        console.log(`      đề nghị giữ ${giu_ma}, bỏ ${bo_ma} — ${g.ly_do}`);
        console.log(`      npm run gop_trung -- ${giu_ma} ${bo_ma}\n`);
      }
      console.log('Hai người cùng tên là chuyện thường. Kiểm tra từng cặp trước khi gộp.\n');
    }
  } else {
    if (doi_so.length !== 2) {
      console.error('\nCần đúng hai mã nhân viên: <mã GIỮ LẠI> <mã BỎ>');
      console.error('Ví dụ:  npm run gop_trung -- HR-01 ERP147\n');
      process.exitCode = 2;
    } else {
      const [ma_giu, ma_bo] = doi_so as [string, string];
      const kq = await gop_ho_so(
        await id_theo_ma_nv(ma_giu), await id_theo_ma_nv(ma_bo), that ? 'that' : 'thu');

      console.log(`\n${that ? 'ĐÃ GỘP' : 'CHẠY THỬ — chưa đổi gì'}`);
      console.log(`  giữ lại   ${kq.giu.ma_nv} — ${kq.giu.ho_ten}`);
      console.log(`  bỏ        ${kq.bo.ma_nv} — ${kq.bo.ho_ten}`);
      console.log(`  ${that ? 'đã đổi   ' : 'sẽ đổi   '} ${String(kq.so_doi)} dòng`);
      if (kq.so_cham > 0) {
        console.log(`  TRÙNG     ${String(kq.so_cham)} dòng (sẽ mất theo hồ sơ bỏ)`);
      }
      console.log(`  đã xoá hồ sơ bỏ: ${kq.da_xoa_ban_bo ? 'có' : 'chưa'}`);

      if (kq.mang_theo.length > 0) {
        console.log(`\n  ${that ? 'Đã mang' : 'Sẽ mang'} sang hồ sơ giữ (ô đang để trống):`);
        for (const m of kq.mang_theo) {
          // Ngay GIO day du cho `timestamptz`: cat con ngay thi `erp_dong_bo_luc` in ra nhu mot
          // cot ngay, va nguoi doc tuong gia tri mang sang chi co ngay.
          const v = m.gia_tri instanceof Date
            ? m.gia_tri.toISOString().replace('T', ' ').slice(0, 19)
            : String(m.gia_tri);
          console.log(`    ${m.cot.padEnd(20)} ${v}`);
        }
      }

      if (kq.chi_tiet.length > 0) {
        console.log('\n  Theo từng bảng:');
        for (const c of kq.chi_tiet) {
          const cham = c.so_cham > 0 ? `   trùng ${String(c.so_cham)}` : '';
          console.log(`    ${c.bang.padEnd(26)} ${String(c.so_doi).padStart(5)} dòng${cham}`);
        }
      }

      for (const cb of kq.canh_bao) console.log(`\n  ⚠ ${cb}`);

      if (!that) {
        console.log('\nChạy lại với --that để gộp thật:');
        console.log(`  docker compose exec may_chu npm run gop_trung -- ${ma_giu} ${ma_bo} --that\n`);
      } else {
        console.log('\nViệc còn lại: dọn tên thư mục trên đĩa');
        console.log('  docker compose exec may_chu npm run sap_xep_tep -- --that\n');
      }
    }
  }
} catch (loi) {
  console.error(`\nLỖI: ${(loi as Error).message}\n`);
  process.exitCode = 1;
} finally {
  await dong_pool();
}
