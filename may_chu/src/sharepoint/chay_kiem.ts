// Lenh CLI: npm run kiem_sharepoint
//
// Doi chieu bang `NHANH` (anh_xa.ts) voi cay thu muc THAT tren SharePoint. CHI DOC — khong
// tao, khong ghi, khong xoa. Chay duoc truoc khi bat SHAREPOINT_BAT_DAY, va nen chay dung
// truoc do: neu mot ten nhanh lech thi lan day dau tien se tao mot cay thu muc moi ben canh
// cay that, va khong ai nhin thay ho so o do.
//
// Quyen can thiet chi la `Sites.Selected` muc read tren site — khong can Sites.FullControl.All.
import { kiem_cac_nhanh } from './kiem_nhanh.ts';
import { bat_sharepoint, doc_muc, thu_ket_noi } from './khach.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { dong_pool, truy_van } from '../csdl/ket_noi.ts';

if (!bat_sharepoint()) {
  console.error(
    'Chưa cấu hình SharePoint. Khai SHAREPOINT_SITE_ID, SHAREPOINT_CLIENT_ID,\n'
    + 'SHAREPOINT_CLIENT_SECRET, SHAREPOINT_TENANT_ID trong .env rồi chạy lại.',
  );
  process.exit(1);
}

const ket = await thu_ket_noi();
if (!ket.ok) {
  console.error(`KHÔNG KẾT NỐI ĐƯỢC: ${ket.thong_diep}`);
  process.exit(1);
}

// In ten thu vien TRUOC khi kiem nhanh, va do khong phai de cho dep.
//
// `GET /sites/{id}/drive` (so it) tra ve thu vien MAC DINH cua site — "Tài liệu" / "Shared
// Documents" — chu khong phai thu vien HCNS. Ai lay drive id bang duong do se cau hinh dung
// mot site dung nhung sai thu vien, va moi nhanh se bao "thiếu" ma khong hieu vi sao. Bon dong
// duoi day tra loi cau hoi do ngay truoc khi danh sach hien ra.
const ten_tv = ket.ten_thu_vien ?? '';
console.log(`Thư viện : ${ten_tv === '' ? '(không rõ tên)' : ten_tv}`);
console.log(`Đường dẫn: ${ket.web_url === '' || ket.web_url === undefined ? '(không rõ)' : ket.web_url}`);
console.log(`Drive id : ${ket.drive_id ?? '(không rõ)'}`);
console.log(`Khai sẵn : ${cau_hinh.sharepoint.drive_id === '' ? 'không — tra theo tên SHAREPOINT_THU_VIEN' : 'có — SHAREPOINT_DRIVE_ID'}`);

// Khai thang `SHAREPOINT_DRIVE_ID` thi ten thu vien KHONG duoc kiem o dau ca — id do di thang
// vao moi luot goi Graph. Day la cho duy nhat con doi chieu duoc no voi y dinh da khai.
const muon_tv = cau_hinh.sharepoint.thu_vien;
if (muon_tv !== '' && ten_tv !== '' && ten_tv.toLowerCase() !== muon_tv.toLowerCase()) {
  console.log('');
  console.log(`CHÚ Ý: SHAREPOINT_THU_VIEN khai "${muon_tv}" nhưng drive id đang trỏ vào "${ten_tv}".`);
  console.log('       Thư viện bị đổi tên thì không sao; trỏ sai thư viện thì hồ sơ sẽ vào chỗ khác.');
}
console.log('');

const bc = await kiem_cac_nhanh();

for (const k of bc.ket_qua) {
  if (k.co) {
    console.log(`  OK      ${k.duong_dan}`);
    continue;
  }
  if (k.loi !== null) {
    console.log(`  LỖI     ${k.duong_dan}`);
    console.log(`          ${k.loi}`);
    continue;
  }

  console.log(`  THIẾU   ${k.duong_dan}`);
  console.log(`          không thấy đoạn: "${k.thieu_doan ?? ''}"`);
  console.log(`          trong thư mục  : ${k.cha === '' || k.cha === null ? '(gốc thư viện)' : k.cha}`);
  if (k.la_tep) {
    console.log('          có một TỆP đúng tên này, không phải thư mục');
  }
  if (k.gan_giong !== null) {
    console.log(`          tên thật rất giống: "${k.gan_giong}"`);
    if (k.khac !== null) console.log(`          khác ở: ${k.khac}`);
    console.log('          → sửa bảng NHANH trong may_chu/src/sharepoint/anh_xa.ts cho khớp tên thật');
  } else if (k.anh_em.length > 0) {
    console.log('          các thư mục đang có ở đó:');
    for (const t of k.anh_em.slice(0, 30)) console.log(`            ${t}`);
    if (k.anh_em.length > 30) {
      console.log(`            … còn ${String(k.anh_em.length - 30)} mục nữa.`);
    }
  }
}

console.log('');
console.log(`Tổng: ${String(bc.so_co)} nhánh đúng, ${String(bc.so_thieu)} thiếu, ${String(bc.so_loi)} lỗi.`);

if (bc.so_thieu === 0 && bc.so_loi === 0) {
  console.log('Cây thư mục khớp hoàn toàn. Đẩy tệp lên sẽ vào đúng chỗ HCNS đang dùng.');
} else {
  console.log('CHƯA NÊN đặt SHAREPOINT_BAT_DAY=1: nhánh lệch tên sẽ được TẠO MỚI bên cạnh');
  console.log('nhánh thật, và hồ sơ sẽ nằm ở chỗ không ai mở.');
  process.exitCode = 1;
}

// -------------------------------------------------------------------- cac tep da day
//
// HOI NGUOC GRAPH, khong doc bang cua ta.
//
// `sharepoint_tep.duong_dan_da_day` la GHI CHEP CUA TA: no noi "ta da ghi tep nay len". No
// KHONG noi tep con o do bay gio. Tep co the bi ai do di chuyen hoac xoa tay sau do, va bang
// cua ta van bao 'xong' mai mai.
//
// Va cau hoi hay gap nhat sau lan day dau tien khong phai "co day duoc khong" ma la "tep nam o
// dau" — `webUrl` do Graph tra ve la cau tra loi bam duoc, thay vi mo tay tung cap thu muc.
const da_day = await truy_van<{ duong_dan_da_day: string }>(
  `select duong_dan_da_day from sharepoint_tep
    where duong_dan_da_day is not null
    order by duong_dan_da_day`,
);

if (da_day.length === 0) {
  console.log('');
  console.log('Chưa có tệp nào được đẩy lên (bảng sharepoint_tep không có dòng nào đã đẩy).');
} else {
  console.log('');
  console.log(`Các tệp hệ thống ĐÃ ĐẨY (${String(da_day.length)}) — hỏi lại Graph xem còn không:`);
  let mat = 0;
  for (const d of da_day) {
    let muc;
    try {
      muc = await doc_muc(d.duong_dan_da_day);
    } catch (loi) {
      console.log(`  LỖI     ${d.duong_dan_da_day}`);
      console.log(`          ${(loi as Error).message}`);
      mat += 1;
      continue;
    }
    if (muc === null) {
      console.log(`  KHÔNG CÒN  ${d.duong_dan_da_day}`);
      console.log('             hệ thống ghi là đã đẩy, nhưng SharePoint trả 404 — đã bị xóa hoặc di chuyển tay');
      mat += 1;
      continue;
    }
    console.log(`  CÒN     ${d.duong_dan_da_day}`);
    console.log(`          ${String(muc.so_byte)} byte`);
    console.log(`          ${muc.web_url}`);
  }
  if (mat > 0) {
    console.log('');
    console.log(`${String(mat)} tệp hệ thống tưởng đã đẩy nhưng SharePoint không có.`);
    process.exitCode = 1;
  }
}

await dong_pool();
