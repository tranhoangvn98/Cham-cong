// Lenh CLI nap ho so nhan su tu tep XLSX cua HCNS.
//
//   npm run nap_ho_so -- <tep.xlsx>                     chay thu, khong ghi gi
//   npm run nap_ho_so -- <tep.xlsx> --that              ghi that
//   npm run nap_ho_so -- <tep.xlsx> --xuat can_ma.xlsx  xuat danh sach nguoi CHUA CO HO SO
//
// `--xuat` ghi ra mot tep Excel co cot "Ma nhan vien" de trong cho nhan su dien. Dien xong thi
// chay lai lenh nay voi tep goc — day la duong nap nguoi moi.
//
// MAC DINH CHAY THU. Tep chua CCCD, ngay sinh, dia chi cua nguoi that — no nam tren may chu,
// KHONG nam trong repo, va lenh nay khong in day du CCCD ra man hinh.
import { readFileSync, writeFileSync } from 'node:fs';
import { dong_pool, trong_giao_dich } from '../csdl/ket_noi.ts';
import { ghi_xlsx } from '../tien_ich/ghi_xlsx.ts';
import { doc_ho_so_xlsx } from './doc_ho_so_xlsx.ts';
import { doi_chieu, gop_nguoi_trung } from './nap_ho_so.ts';
import {
  ghi_mot_nguoi, nap_ho_so_hien_co, o_se_doi, tat_hoat_dong,
} from './nap_ho_so_csdl.ts';

// Loc bo ca co `--xuat` LAN gia tri di ngay sau no, neu khong duong dan xuat se bi coi la
// tep dau vao va lenh doc nham tep.
const tho = process.argv.slice(2);
const doi_so = tho.filter((a, i) =>
  !a.startsWith('--') && tho[i - 1] !== '--xuat');
const that = process.argv.includes('--that');
const i_xuat = process.argv.indexOf('--xuat');
const duong_xuat = i_xuat >= 0 ? process.argv[i_xuat + 1] : undefined;
const duong_dan = doi_so[0];

/** Chi hien 4 so cuoi cua CCCD. Man hinh terminal luu vao lich su shell va log phien lam viec. */
function che(s: string | null): string {
  if (s === null || s === '') return '—';
  return s.length <= 4 ? '****' : `****${s.slice(-4)}`;
}

try {
  if (duong_dan === undefined) {
    console.error('\nCần đường dẫn tới tệp .xlsx.');
    console.error('  npm run nap_ho_so -- /duong/dan/DANH_SACH_NHAN_SU.xlsx\n');
    process.exitCode = 2;
  } else {
    const doc = doc_ho_so_xlsx(readFileSync(duong_dan));

    console.log(`\n=== ĐỌC TỆP ===`);
    console.log(`  sheet đã đọc:  ${doc.sheet_da_doc.join(' · ')}`);
    for (const s of doc.sheet_bo_qua) console.log(`  BỎ QUA "${s.ten}": ${s.ly_do}`);
    console.log(`  tổng số dòng nhân sự: ${String(doc.dong.length)}`);

    if (doc.canh_bao.length > 0) {
      console.log(`\n=== ${String(doc.canh_bao.length)} CẢNH BÁO DỮ LIỆU (vẫn nạp, nhưng nên sửa ở tệp gốc) ===`);
      for (const c of doc.canh_bao) console.log(`  · ${c}`);
    }

    const kq = doi_chieu(doc.dong, await nap_ho_so_hien_co());

    // --- ai sẽ được cập nhật gì
    const co_doi: { ten: string; ma_nv: string; doi: { truong: string; moi: string | null }[] }[] = [];
    for (const c of kq.cap_nhat) {
      const doi = await o_se_doi(c);
      if (doi.length > 0 && c.ho_so !== null) {
        co_doi.push({ ten: c.dong.ho_ten, ma_nv: c.ho_so.ma_nv, doi });
      }
    }

    console.log(`\n=== 1. CẬP NHẬT HỒ SƠ ĐÃ CÓ — ${String(co_doi.length)} người ===`);
    console.log('    Chỉ ghi vào ô đang TRỐNG. Ô đã có số liệu thì giữ nguyên.');
    for (const n of co_doi) {
      const mo_ta = n.doi.map((d) =>
        `${d.truong}=${d.truong === 'cccd_so' ? che(d.moi) : String(d.moi)}`).join(', ');
      console.log(`  ${n.ma_nv.padEnd(8)} ${n.ten.padEnd(26)} ${mo_ta}`);
    }
    if (kq.cap_nhat.length - co_doi.length > 0) {
      console.log(`  (${String(kq.cap_nhat.length - co_doi.length)} người khớp tên nhưng không có ô trống nào để điền)`);
    }

    if (kq.khop_gan_dung.length > 0) {
      console.log(`\n=== 1b. TRONG SỐ ĐÓ, ${String(kq.khop_gan_dung.length)} người khớp GẦN ĐÚNG — soát lại ===`);
      console.log('    Khớp được nhờ bỏ dấu / đảo thứ tự từ. Vẫn cập nhật, nhưng nhìn lại một lượt.');
      for (const k of kq.khop_gan_dung) {
        console.log(`  ${k.ho_so.ma_nv.padEnd(8)} tệp: "${k.dong.ho_ten}"  ↔  hệ thống: "${k.ho_so.ho_ten}"`);
      }
    }

    if (kq.nghi_cung_nguoi.length > 0) {
      console.log(`\n=== 1c. NGHI LÀ CÙNG NGƯỜI — ${String(kq.nghi_cung_nguoi.length)} dòng, KHÔNG cập nhật ===`);
      console.log('    Tên bên này là một phần của tên bên kia (thiếu chữ đệm). Có thể là cùng');
      console.log('    người, cũng có thể là hai chị em. Sửa cho khớp ở một trong hai đầu rồi chạy lại.');
      for (const n of kq.nghi_cung_nguoi) {
        console.log(`  tệp: "${n.dong.ho_ten}"  ↔  ${n.nhieu_ho_so.map((h) => `${h.ma_nv} "${h.ho_ten}"`).join(' | ')}`);
      }
    }

    if (kq.hai_dong_mot_ho_so.length > 0) {
      console.log(`\n=== 1d. HAI DÒNG CÙNG NHẬN MỘT HỒ SƠ — ${String(kq.hai_dong_mot_ho_so.length)} hồ sơ, KHÔNG cập nhật ===`);
      console.log('    Tệp có nhiều người trùng tên nhưng hệ thống mới có một hồ sơ. Dòng nào');
      console.log('    đúng thì tệp không trả lời được, nên không ghi dòng nào. Lập hồ sơ cho');
      console.log('    (những) người còn thiếu rồi chạy lại.');
      for (const v of kq.hai_dong_mot_ho_so) {
        console.log(`  ${v.ho_so.ma_nv} "${v.ho_so.ho_ten}" bị ${String(v.cac_dong.length)} dòng cùng nhận:`);
        for (const d of v.cac_dong) {
          console.log(`      ${(d.phong_ban ?? '—').padEnd(6)} ${(d.chuc_danh ?? '—').padEnd(12)} vào ${d.ngay_vao ?? '—'}  ${d.con_lam_viec === false ? 'ĐÃ NGHỈ' : 'đang làm'}  [${d.sheet} dòng ${String(d.dong_so)}]`);
        }
      }
    }

    console.log(`\n=== 2. TẮT HOẠT ĐỘNG — ${String(kq.se_tat.length)} người ===`);
    console.log('    Tệp ghi "Đã nghỉ việc" nhưng KHÔNG có cột ngày nghỉ. Ngày dưới đây lấy từ');
    console.log('    lần quẹt thẻ cuối cùng — nếu ai nghỉ mà không quẹt ngày cuối thì sẽ lệch.');
    for (const t of kq.se_tat) {
      console.log(`  ${t.ho_so.ma_nv.padEnd(8)} ${t.dong.ho_ten.padEnd(26)} ngày nghỉ = ${t.ngay_nghi ?? '>>> KHÔNG CÓ LẦN QUẸT NÀO — để trống <<<'}`);
    }

    console.log(`\n=== 3. CHƯA CÓ HỒ SƠ — ${String(kq.chua_co_ho_so.length)} người ===`);
    console.log('    KHÔNG tạo tự động: tệp không có cột "Mã nhân viên", mà mã là khoá nhân sự');
    console.log('    dùng trên phiếu lương. Điền mã vào tệp rồi chạy lại lệnh này.');
    for (const d of kq.chua_co_ho_so) {
      console.log(`  ${d.ho_ten.padEnd(26)} ${(d.phong_ban ?? '—').padEnd(8)} ${(d.chuc_danh ?? '—').padEnd(14)} vào ${d.ngay_vao ?? '—'}  [${d.sheet}]`);
    }

    if (kq.trung_ten.length > 0) {
      console.log(`\n=== 4. TRÙNG TÊN — ${String(kq.trung_ten.length)} dòng, KHÔNG cập nhật ===`);
      console.log('    Hai hồ sơ cùng tên thì máy không được chọn hộ: chọn sai là số liệu của');
      console.log('    người này chạy sang người kia. Gộp bằng `npm run gop_trung` rồi chạy lại.');
      for (const t of kq.trung_ten) {
        console.log(`  ${t.dong.ho_ten} → ${t.nhieu_ho_so.map((h) => `${h.ma_nv}${h.dang_hoat_dong ? '' : ' (đã nghỉ)'}`).join(' | ')}`);
      }
    }

    if (kq.khong_co_trong_tep.length > 0) {
      console.log(`\n=== 5. CÓ TRONG HỆ THỐNG NHƯNG KHÔNG CÓ TRONG TỆP — ${String(kq.khong_co_trong_tep.length)} người ===`);
      console.log('    Không đụng tới. Có thể là người đã nghỉ từ lâu, hoặc tệp thiếu.');
      for (const h of kq.khong_co_trong_tep) {
        console.log(`  ${h.ma_nv.padEnd(8)} ${h.ho_ten.padEnd(26)} ${h.dang_hoat_dong ? 'đang hoạt động' : 'đã tắt'}`);
      }
    }

    console.log(`\n=== KHÔNG LÀM TRONG LẦN NÀY ===`);
    console.log('  · Phòng ban — tệp ghi viết tắt (KD, KT, XNK…), hệ thống dùng tên đầy đủ.');
    console.log('    Nạp thẳng là sinh ra một bộ phòng ban thứ hai song song.');
    console.log('  · Hợp đồng lao động — cột "Thời hạn HĐ" và "Ngày hết hạn" trống toàn bộ,');
    console.log('    nhiều dòng ghi chú "Chưa ký HĐ". Sinh bản ghi hợp đồng từ đó là bịa giấy tờ.');

    if (duong_xuat !== undefined) {
      // Gộp người nằm ở nhiều sheet lại: xuất hai dòng cho một người là nhân sự lập hai hồ sơ.
      const gop = gop_nguoi_trung(kq.chua_co_ho_so);
      const buf = ghi_xlsx({
        ten_sheet: 'Cần mã nhân viên',
        tieu_de: ['Mã nhân viên (điền vào đây)', 'Họ và tên', 'Phòng ban', 'Chức danh',
          'Ngày vào công ty', 'Trạng thái', 'Nguồn (sheet)', 'Cần kiểm lại'],
        hang: gop.map((g) => [
          '', g.dong.ho_ten, g.dong.phong_ban ?? '', g.dong.chuc_danh ?? '', g.dong.ngay_vao ?? '',
          g.dong.con_lam_viec === false ? 'Đã nghỉ việc'
            : g.dong.con_lam_viec === true ? 'Đang làm việc' : '',
          [...new Set(g.cac_sheet)].join(' + '),
          g.khac_nhau.length > 0 ? `hai sheet ghi khác nhau — ${g.khac_nhau.join('; ')}` : '',
        ]),
      });
      writeFileSync(duong_xuat, buf);
      console.log(`\n  Đã ghi danh sách cần mã: ${duong_xuat} (${String(gop.length)} người`
        + `${gop.length === kq.chua_co_ho_so.length ? '' : `, gộp từ ${String(kq.chua_co_ho_so.length)} dòng`})`);
    }

    if (!that) {
      console.log('\n────────────────────────────────────────────────────────────');
      console.log('  CHẠY THỬ — chưa ghi gì cả.');
      console.log(`  Đúng rồi thì chạy lại kèm  --that\n`);
    } else {
      await trong_giao_dich(async (khach) => {
        for (const c of kq.cap_nhat) await ghi_mot_nguoi(khach, c, await o_se_doi(c));
        for (const t of kq.se_tat) await tat_hoat_dong(khach, t.ho_so.id, t.ngay_nghi);
      });
      console.log('\n────────────────────────────────────────────────────────────');
      console.log(`  ĐÃ GHI: ${String(co_doi.length)} hồ sơ cập nhật, ${String(kq.se_tat.length)} người tắt hoạt động.`);
      console.log('  Bấm "Tính lại bảng công" để các dòng Vắng sinh nhầm biến mất.\n');
    }
  }
} finally {
  await dong_pool();
}
