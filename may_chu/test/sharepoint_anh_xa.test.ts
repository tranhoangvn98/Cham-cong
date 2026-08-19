// Anh xa kho tep ho so -> cay thu muc SharePoint cua HCNS.
//
// DICH DEN LA MOT THU VIEN DANG DUNG THAT. Do la dieu khac han moi tinh nang khac trong he
// thong nay: mot loi o day khong lam sai mot con so tren man hinh, no XEP HO SO VAO CHO
// KHONG AI NHIN, hoac te hon, xoa mot tep do nguoi khac tu tay dat vao. Ban da chon "mot
// chieu, xoa lan theo", nen ham `duong_dan_an_toan_de_ghi` la thu duy nhat chan giua ung
// dung va tep cua nguoi khac.
//
// Bon nhom bai o day:
//
//   1. QUY UOC LA CUA HCNS, KHONG PHAI CUA TOI. Cac vi du duoc lay nguyen tu tep
//      "DANH MỤC HỆ THỐNG FILE HCNS - SHAREPOINT (BỔ SUNG THEO BC 11) - 15-07-2026".
//      Bai kiem giu dung nhung vi du do, de sau nay ai sua ham cho "gon hon" thi bo test do.
//
//   2. TEN PHAI KHOP TUNG KY TU voi thu muc dang co tren SharePoint. Sai mot dau gach ngang
//      dai thanh gach tru la Graph tao mot thu muc moi nam canh thu muc that.
//
//   3. MOI NHOM DEU CO CAU TRA LOI, ke ca cau tra loi "khong day sang".
//
//   4. BO SINH VA BO KIEM PHAI DONG Y VOI NHAU: moi duong dan do `duong_dan_sharepoint`
//      sinh ra deu phai qua duoc `duong_dan_an_toan_de_ghi`. Neu khong, tinh nang tu chan
//      chinh no va khong tep nao duoc day len — im lang tuyet doi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DUONG_DAN_TOI_DA, MUC_NHAY_CAM, NHANH, NHANH_CHUA_MO, NHAN_LOAI,
  chon_nhanh, duong_dan_an_toan_de_ghi, duong_dan_sharepoint,
  lam_sach_ten_sp, ngay_kieu_hcns, ten_tep_sharepoint, thu_muc_an_toan_de_tao,
  thu_muc_nhan_vien,
} from '../src/sharepoint/anh_xa.ts';
import { CAC_NHOM } from '../src/bao_mat/quyen_ho_so.ts';

const THU_MUC = dirname(fileURLToPath(import.meta.url));
const MA_NGUON = join(THU_MUC, '..', 'src', 'sharepoint', 'anh_xa.ts');

// Ky tu dieu khien dung lam du lieu thu, dung bang `dk()` chu KHONG dan ky tu that vao
// tep test. Y do la ky tu that vua sinh ra dung con bug ma tep nay di sua: mot lop
// `[<NUL>-<0x1f>]` viet bang byte that trong anh_xa.ts hien tren man hinh la `[ -]` va
// khong ai doc ra duoc. Mot tep test cung khong nen chua byte khong nhin thay duoc.
const dk = (ma: number): string => String.fromCharCode(ma);

// ---------------------------------------------------------------- lam sach ten

test('lam sach ten: GIU dau cach va gach noi', () => {
  // Bai nay ton tai vi mot ban truoc cua `lam_sach_ten_sp` co lop `[<NUL>-<0x1f><0x7f>]`
  // viet bang ky tu THAT. Tren man hinh no hien ra la `[ -]`, doc nhu "dau cach hoac gach
  // noi". Neu ai do "sua lai cho ro" thanh dung the thi `NV015-NGUYEN VAN A` thanh
  // `NV015NGUYENVANA`, va vi `duong_dan_an_toan_de_ghi` so `p === lam_sach_ten_sp(p)` nen
  // MOI duong dan that se bi tu choi. Khong mot tep nao len duoc, khong mot loi nao hien ra.
  assert.equal(lam_sach_ten_sp('NV015-NGUYEN VAN A'), 'NV015-NGUYEN VAN A');
  assert.equal(lam_sach_ten_sp('QĐ SỐ 05 - BỔ NHIỆM - 15-07-2026'),
    'QĐ SỐ 05 - BỔ NHIỆM - 15-07-2026');
  assert.equal(lam_sach_ten_sp('a-b'), 'a-b');
  assert.equal(lam_sach_ten_sp('a b'), 'a b');
});

test('lam sach ten: xoa ky tu dieu khien', () => {
  assert.equal(lam_sach_ten_sp(`Hoàng${dk(0x00)}Minh`), 'HoàngMinh');
  assert.equal(lam_sach_ten_sp(`a${dk(0x1f)}b`), 'ab');
  assert.equal(lam_sach_ten_sp(`a${dk(0x7f)}b`), 'ab');
  // Ky tu dieu khien bi XOA HAN, khong doi thanh dau cach: mot ten dinh \r\n do dan tu Excel
  // khong duoc bien thanh hai tu.
  assert.equal(lam_sach_ten_sp('HĐLĐ\r\n'), 'HĐLĐ');
});

test('lam sach ten: ky tu SharePoint cam thanh dau cach', () => {
  // `/` thanh dau cach chu KHONG bi xoa: neu xoa, `a/b` thanh `ab` va hai ho so khac nhau co
  // the trung ten. Doi thanh dau cach thi van la mot ten, va nhin vao con thay cho bi thay.
  for (const c of ['"', '*', ':', '<', '>', '?', '/', '\\', '|']) {
    assert.equal(lam_sach_ten_sp(`a${c}b`), 'a b', `ky tu ${c} phai thanh dau cach`);
  }
  assert.equal(lam_sach_ten_sp('HĐLĐ 07/2026'), 'HĐLĐ 07 2026');
});

test('lam sach ten: gop dau cach lien tiep va bo dau cham dau ten', () => {
  assert.equal(lam_sach_ten_sp('a  b'), 'a b');
  assert.equal(lam_sach_ten_sp('a??b'), 'a b');
  // Ten bat dau bang dau cham bi SharePoint tu choi thang.
  assert.equal(lam_sach_ten_sp('...hop dong.pdf'), 'hop dong.pdf');
  assert.equal(lam_sach_ten_sp('  x  '), 'x');
});

test('lam sach ten: giu dau tieng Viet', () => {
  // Quy uoc cua HCNS ghi ro "[TÊN CÓ DẤU]" cho ten tep. Bo dau o day la lam sai dac ta.
  assert.equal(lam_sach_ten_sp('Nguyễn Thị Ánh Tuyết'), 'Nguyễn Thị Ánh Tuyết');
  assert.equal(lam_sach_ten_sp('HỢP ĐỒNG LAO ĐỘNG'), 'HỢP ĐỒNG LAO ĐỘNG');
});

test('lam sach ten: ket qua cua lam sach la diem bat dong', () => {
  // `duong_dan_an_toan_de_ghi` dua vao tinh chat nay (`p === lam_sach_ten_sp(p)`), nen no
  // phai dung voi MOI dau vao, khong chi vai vi du.
  const thu = [
    'NV015-NGUYEN VAN A', 'HĐLĐ SỐ 07 2026 - Hoàng Minh Ngọc - 18-08-2026.pdf',
    'a/b', '..x', '   ', `a${dk(0x00)}b`, 'A  B', 'x|y?z', 'Trần Đức Đạt', '2026-08-18_x.docx',
  ];
  for (const s of thu) {
    const mot = lam_sach_ten_sp(s);
    assert.equal(lam_sach_ten_sp(mot), mot, `lam sach hai lan phai bang lam sach mot lan: ${s}`);
  }
});

// ---------------------------------------------------------------- ma nguon

test('ma nguon anh_xa.ts khong chua byte dieu khien tho', () => {
  // Canh chinh cho bai dau tien: doi khi loi khong o logic ma o CHINH TEP MA NGUON. Mot byte
  // NUL nam trong tep .ts thi bat ky editor, `sed`, hay lan copy-paste nao cung co the lam
  // sai lech no ma khong bao gi.
  const b = readFileSync(MA_NGUON);
  const xau: string[] = [];
  for (const [i, ch] of b.entries()) {
    if ((ch < 0x20 && ch !== 0x09 && ch !== 0x0a && ch !== 0x0d) || ch === 0x7f) {
      xau.push(`byte ${String(i)} = 0x${ch.toString(16)}`);
    }
  }
  assert.deepEqual(xau, [],
    'anh_xa.ts co byte dieu khien tho; hay viet bang \\u trong bieu thuc chinh quy');
});

// ---------------------------------------------------------------- ten thu muc nhan vien

test('thu muc nhan vien: dung vi du cua dac ta', () => {
  // Sheet "Quy ước": `[Mã NV]-[Họ tên]`, vi du `NV015-NGUYEN VAN A` — HOA, khong dau.
  assert.equal(thu_muc_nhan_vien('NV015', 'Nguyen Van A'), 'NV015-NGUYEN VAN A');
  assert.equal(thu_muc_nhan_vien('HR-01', 'Hoàng Minh Ngọc'), 'HR-01-HOANG MINH NGOC');
});

test('thu muc nhan vien: Đ thanh D, khong mat chu', () => {
  // `đ` khong tach ra duoc bang NFD. Quen thay tay thi "Trần Đức Đạt" thanh "TRN C T".
  assert.equal(thu_muc_nhan_vien('NV1', 'Trần Đức Đạt'), 'NV1-TRAN DUC DAT');
});

test('thu muc nhan vien: gop dau cach, khong de trong', () => {
  assert.equal(thu_muc_nhan_vien('NV2', '  Le   Thi  B '), 'NV2-LE THI B');
  // Thieu mot trong hai phan thi con lai mot phan, khong ra ten treo dau gach noi.
  assert.equal(thu_muc_nhan_vien('', 'Le Thi B'), 'LE THI B');
  assert.equal(thu_muc_nhan_vien('NV3', ''), 'NV3');
  assert.equal(thu_muc_nhan_vien('', ''), 'KHONG-RO');
});

test('thu muc nhan vien: ho ten chua / khong tao them cap thu muc', () => {
  // Day la hang rao: mot ho ten "A/B" ma di nguyen vao duong dan Graph se thanh hai cap.
  const t = thu_muc_nhan_vien('NV4', 'Le/Thi B');
  assert.ok(!t.includes('/'), `van con dau / trong ten thu muc: ${t}`);
  assert.equal(t, 'NV4-LE THI B');
});

// ---------------------------------------------------------------- ngay

test('ngay kieu HCNS: YYYY-MM-DD thanh DD-MM-YYYY', () => {
  assert.equal(ngay_kieu_hcns('2026-07-15'), '15-07-2026');
  assert.equal(ngay_kieu_hcns('2026-08-18T03:04:05.000Z'), '18-08-2026');
});

test('ngay kieu HCNS: chuoi la tra nguyen, khong doan', () => {
  assert.equal(ngay_kieu_hcns('khong ro'), 'khong ro');
  assert.equal(ngay_kieu_hcns(''), '');
});

// ---------------------------------------------------------------- ten tep

test('ten tep: dung vi du cua dac ta', () => {
  // Sheet "Quy ước", vi du nguyen van: `QĐ SỐ 05 - BỔ NHIỆM - 15-07-2026`.
  assert.equal(
    ten_tep_sharepoint({ nhan: 'QĐ', so: '05', ten: 'BỔ NHIỆM', ngay: '2026-07-15', duoi: 'pdf' }),
    'QĐ SỐ 05 - BỔ NHIỆM - 15-07-2026.pdf');
});

test('ten tep: khong co so thi khong co chu "SỐ"', () => {
  assert.equal(
    ten_tep_sharepoint({ nhan: 'CCCD', so: null, ten: 'Hoàng Minh Ngọc', ngay: '2026-08-18', duoi: 'pdf' }),
    'CCCD - Hoàng Minh Ngọc - 18-08-2026.pdf');
  assert.equal(
    ten_tep_sharepoint({ nhan: 'CCCD', ten: 'Hoàng Minh Ngọc', ngay: '2026-08-18', duoi: 'pdf' }),
    'CCCD - Hoàng Minh Ngọc - 18-08-2026.pdf');
});

test('ten tep: ngay dung GACH NOI, khong dung dau cham', () => {
  // Dac ta ghi ro ly do: "để iOS không hiểu nhầm đuôi file". `... - 15.07.2026.pdf` bi iOS
  // doc thanh duoi `.2026.pdf`. Day la mot rang buoc THAT, khong phai so thich trinh bay.
  const t = ten_tep_sharepoint({ nhan: 'HĐLĐ', so: '07/2026', ten: 'Hoàng Minh Ngọc', ngay: '2026-08-18', duoi: 'pdf' });
  assert.ok(t.endsWith('18-08-2026.pdf'), t);
  // Chi duoc con DUNG MOT dau cham — dau cham cua duoi tep.
  assert.equal(t.split('.').length - 1, 1, `ten tep co nhieu hon mot dau cham: ${t}`);
});

test('ten tep: giu dau tieng Viet o phan giua', () => {
  const t = ten_tep_sharepoint({ nhan: 'HĐLĐ', so: '07', ten: 'Nguyễn Thị Ánh Tuyết', ngay: '2026-01-02', duoi: 'PDF' });
  assert.equal(t, 'HĐLĐ SỐ 07 - Nguyễn Thị Ánh Tuyết - 02-01-2026.pdf');
});

test('ten tep: duoi tep chuyen ve chu thuong, bo dau cham dat truoc', () => {
  assert.ok(ten_tep_sharepoint({ nhan: 'X', ten: 'y', ngay: '2026-01-02', duoi: '.DOCX' })
    .endsWith('.docx'));
});

test('ten tep: ten qua dai bi cat, khong de lai gach noi lung lo', () => {
  const t = ten_tep_sharepoint({
    nhan: 'HỒ SƠ', so: null, ten: 'A'.repeat(300), ngay: '2026-01-02', duoi: 'pdf',
  });
  assert.ok(t.length <= 120, `ten tep ${String(t.length)} ky tu, qua tran 120`);
  assert.ok(t.endsWith('.pdf'), t);
  assert.ok(!/[\s-]+\.pdf$/.test(t), `con gach noi hay dau cach truoc duoi tep: ${t}`);
});

test('ten tep: ky tu cam bi lam sach o CA BA phan', () => {
  const t = ten_tep_sharepoint({
    nhan: 'QĐ:X', so: 'a/b', ten: 'Le|Thi?B', ngay: '2026-01-02', duoi: 'pdf',
  });
  for (const c of ['"', '*', ':', '<', '>', '?', '\\', '|']) {
    assert.ok(!t.includes(c), `ten tep con ky tu cam ${c}: ${t}`);
  }
  assert.ok(!t.includes('/'), `ten tep con dau / nen se tao them cap thu muc: ${t}`);
});

// ---------------------------------------------------------------- cay thu muc

test('NHANH: ten khop tung ky tu voi thu muc that tren SharePoint', () => {
  // Kiem bang MA KY TU, khong bang mat: `–` (U+2013, gach ngang dai) va `-` (U+002D) nhin
  // gan nhu nhau tren man hinh. Neu mot lan "chuan hoa" doi U+2013 thanh U+002D thi Graph
  // se TAO MOI thu muc "Quan hệ lao động - HĐLĐ" nam ngay canh thu muc that, va ho so bay
  // vao cho khong ai mo.
  assert.equal(NHANH.hdld, '02 HỢP ĐỒNG & THỎA THUẬN/02.1 [A] Quan hệ lao động – HĐLĐ');
  assert.ok(NHANH.hdld.includes('–'), 'phai la gach ngang dai U+2013');
  assert.ok(NHANH.bhxh_tang_giam.includes('–'), 'BHXH–BHYT–BHTN dung U+2013');
  assert.ok(NHANH.bang_luong.includes('–'), 'TIỀN LƯƠNG – THUẾ dung U+2013');
  assert.equal(NHANH.ho_so_201, '01 HỒ SƠ NHÂN SỰ (201)');
});

test('NHANH: khong nhanh nao bat dau hay ket thuc bang dau /', () => {
  for (const [ten, n] of Object.entries(NHANH)) {
    assert.ok(!n.startsWith('/') && !n.endsWith('/'), `${ten}: ${n}`);
    assert.ok(!n.includes('//'), `${ten} co hai gach cheo lien nhau: ${n}`);
  }
});

test('MUC_NHAY_CAM khai du moi nhanh', () => {
  // Ep nguoi them nhanh moi phai nghi den muc nhay cam ngay luc do, chu khong de mot cho
  // luu bang luong ma khong ai phan loai.
  assert.deepEqual(Object.keys(MUC_NHAY_CAM).sort(), Object.keys(NHANH).sort());
});

test('MUC_NHAY_CAM: cho luu luong, BHXH che do va suc khoe deu la nhay cam', () => {
  // Theo sheet "Quy ước & phân loại", va theo NĐ 13/2023: du lieu suc khoe la du lieu ca
  // nhan NHAY CAM, khong phai "noi bo".
  assert.equal(MUC_NHAY_CAM.bang_luong, 'nhay_cam');
  assert.equal(MUC_NHAY_CAM.thue_tncn, 'nhay_cam');
  assert.equal(MUC_NHAY_CAM.an_toan_suc_khoe, 'nhay_cam');
  assert.equal(MUC_NHAY_CAM.bhxh_che_do, 'nhay_cam');
  assert.equal(MUC_NHAY_CAM.ho_so_201, 'nhay_cam');
});

// ---------------------------------------------------------------- chon nhanh

test('chon nhanh: moi nhom trong CAC_NHOM deu co cau tra loi ro rang', () => {
  // Bai nay khong kiem "map dung", no kiem KHONG NHOM NAO BI BO QUEN. Them mot nhom vao
  // CAC_NHOM ma quen khai o day thi test do, thay vi tep cua nhom do im lang khong bao gio
  // duoc day sang.
  const KHONG_DAY: readonly string[] = ['khieu_nai'];
  for (const nhom of CAC_NHOM) {
    const n = chon_nhanh({ nhom });
    if (KHONG_DAY.includes(nhom)) {
      assert.equal(n, null, `${nhom} phai KHONG duoc day sang`);
    } else {
      assert.notEqual(n, null, `${nhom} chua duoc khai nhanh nao`);
      assert.ok(n !== null && n in NHANH, `${nhom} tra ve nhanh la: ${String(n)}`);
    }
  }
});

test('chon nhanh: khieu nai KHONG day sang', () => {
  // Khong phai vi quen. Dac ta HCNS khong co nhanh nao cho khieu nai, va khieu nai co the
  // la ve chinh nguoi dang co quyen doc thu muc dich. Doan bua mot cho la loai sai te nhat.
  assert.equal(chon_nhanh({ nhom: 'khieu_nai' }), null);
  assert.equal(chon_nhanh({ nhom: 'mot_nhom_moi_nao_do' }), null);
});

test('chon nhanh: giay kham suc khoe di sang nhanh 09, khong vao 01', () => {
  assert.equal(chon_nhanh({ nhom: 'tai_lieu', ma_tai_lieu: 'KHAM_SUC_KHOE' }), 'an_toan_suc_khoe');
  assert.equal(chon_nhanh({ nhom: 'tai_lieu', ma_tai_lieu: 'kham_suc_khoe' }), 'an_toan_suc_khoe');
  assert.equal(chon_nhanh({ nhom: 'tai_lieu', ma_tai_lieu: 'CCCD' }), 'ho_so_201');
  assert.equal(chon_nhanh({ nhom: 'tai_lieu', ma_tai_lieu: null }), 'ho_so_201');
});

test('chon nhanh: bien ban tach theo loai', () => {
  assert.equal(chon_nhanh({ nhom: 'bien_ban', loai: 'phu_luc' }), 'hdld');
  assert.equal(chon_nhanh({ nhom: 'bien_ban', loai: 'ky_luat' }), 'khen_thuong_ky_luat');
  assert.equal(chon_nhanh({ nhom: 'bien_ban', loai: 'khen_thuong' }), 'khen_thuong_ky_luat');
  assert.equal(chon_nhanh({ nhom: 'bien_ban', loai: 'ban_giao' }), 'hanh_chinh_van_thu');
  assert.equal(chon_nhanh({ nhom: 'bien_ban', loai: 'cam_ket' }), 'thoa_thuan_bo_tro');
  assert.equal(chon_nhanh({ nhom: 'bien_ban', loai: null }), 'thoa_thuan_bo_tro');
});

test('chon nhanh: BHXH tach theo loai ho so', () => {
  assert.equal(chon_nhanh({ nhom: 'bhxh', loai: 'om_dau' }), 'bhxh_che_do');
  assert.equal(chon_nhanh({ nhom: 'bhxh', loai: 'thai_san' }), 'bhxh_che_do');
  assert.equal(chon_nhanh({ nhom: 'bhxh', loai: 'chot_so' }), 'bhxh_chot_so');
  assert.equal(chon_nhanh({ nhom: 'bhxh', loai: 'bao_tang' }), 'bhxh_tang_giam');
  assert.equal(chon_nhanh({ nhom: 'bhxh', loai: null }), 'bhxh_tang_giam');
});

test('chon nhanh: nguoi phu thuoc vao nhanh thue TNCN', () => {
  // 04.2 ghi dung viec nay: "MST, giam tru gia canh, quyet toan".
  assert.equal(chon_nhanh({ nhom: 'nguoi_phu_thuoc' }), 'thue_tncn');
});

test('NHAN_LOAI: moi nhom duoc day sang deu co nhan loai van ban', () => {
  for (const nhom of CAC_NHOM) {
    if (chon_nhanh({ nhom }) === null) continue;
    assert.ok(NHAN_LOAI[nhom] !== undefined && NHAN_LOAI[nhom] !== '',
      `nhom ${nhom} duoc day sang nhung khong co NHAN_LOAI, ten tep se thieu phan [LOẠI]`);
  }
});

// ---------------------------------------------------------------- duong dan day du

test('duong dan: dung ba cap va co ca hai quy uoc ten', () => {
  const dd = duong_dan_sharepoint({
    nhom: 'hop_dong', ma_nv: 'HR-01', ho_ten: 'Hoàng Minh Ngọc',
    nhan: 'HĐLĐ', so: '07-2026', ten: 'Hoàng Minh Ngọc', ngay: '2026-08-18', duoi: 'pdf',
  });
  assert.notEqual(dd, null);
  assert.equal(dd?.nhanh, 'hdld');
  assert.equal(dd?.thu_muc, `${NHANH.hdld}/HR-01-HOANG MINH NGOC`);
  assert.equal(dd?.ten_tep, 'HĐLĐ SỐ 07-2026 - Hoàng Minh Ngọc - 18-08-2026.pdf');
  assert.equal(dd?.day_du, `${dd?.thu_muc ?? ''}/${dd?.ten_tep ?? ''}`);
  assert.equal(dd?.muc_nhay_cam, 'han_che');
});

test('duong dan: nhom khong day sang tra null', () => {
  assert.equal(duong_dan_sharepoint({
    nhom: 'khieu_nai', ma_nv: 'HR-01', ho_ten: 'Hoàng Minh Ngọc',
    nhan: 'KHIẾU NẠI', ten: 'x', ngay: '2026-08-18', duoi: 'pdf',
  }), null);
});

test('duong dan: moi nhanh deu co cap thu muc nhan vien', () => {
  // Khong co cap nay thi mot nhanh thanh mot thu muc phang hang nghin tep cua tat ca moi
  // nguoi — dung thu ma ca viec sap xep nay dinh tranh.
  for (const nhom of CAC_NHOM) {
    if (chon_nhanh({ nhom }) === null) continue;
    const dd = duong_dan_sharepoint({
      nhom, ma_nv: 'NV015', ho_ten: 'Nguyen Van A',
      nhan: NHAN_LOAI[nhom] ?? 'HỒ SƠ', ten: 'Nguyen Van A', ngay: '2026-08-18', duoi: 'pdf',
    });
    assert.notEqual(dd, null, nhom);
    assert.ok(dd !== null && dd.thu_muc.endsWith('/NV015-NGUYEN VAN A'),
      `${nhom}: thieu cap thu muc nhan vien -> ${dd?.thu_muc ?? ''}`);
  }
});

// ------------------------------------------------- bo sinh dong y voi bo kiem

test('MOI duong dan do bo sinh tao ra deu qua duoc bo kiem an toan', () => {
  // DAY LA BAI QUAN TRONG NHAT CUA TEP NAY. `duong_dan_an_toan_de_ghi` duoc goi truoc moi
  // lan tai len. Neu bo sinh va bo kiem lech nhau — nhu khi `lam_sach_ten_sp` an dau cach —
  // thi khong tep nao len duoc va cung khong loi nao hien ra: tinh nang chi don gian "khong
  // hoat dong". Nen kiem qua nhieu to hop, khong chi mot vi du.
  const ho_ten = ['Hoàng Minh Ngọc', 'Trần Đức Đạt', 'Le/Thi B', 'A', '  Nguyễn  Thị  C  '];
  const ma_nv = ['HR-01', 'NV015', 'ERP147', '1', 'A?B'];
  const so = [null, '07', '07/2026', 'QĐ-05'];
  let so_bai = 0;

  for (const nhom of CAC_NHOM) {
    if (chon_nhanh({ nhom }) === null) continue;
    for (const h of ho_ten) {
      for (const m of ma_nv) {
        for (const s of so) {
          const dd = duong_dan_sharepoint({
            nhom, ma_nv: m, ho_ten: h, nhan: NHAN_LOAI[nhom] ?? 'HỒ SƠ',
            so: s, ten: h, ngay: '2026-08-18', duoi: 'pdf',
          });
          assert.notEqual(dd, null, `${nhom} ${m} ${h}`);
          assert.ok(dd !== null && duong_dan_an_toan_de_ghi(dd.day_du),
            `bo kiem tu choi duong dan do chinh bo sinh tao ra: ${dd?.day_du ?? ''}`);
          so_bai += 1;
        }
      }
    }
  }
  assert.ok(so_bai >= 200, `moi thu ${String(so_bai)} to hop, it qua`);
});

// ---------------------------------------------------------------- hang rao ghi/xoa

test('an toan de ghi: nhan duong dan dung', () => {
  assert.ok(duong_dan_an_toan_de_ghi(
    `${NHANH.ho_so_201}/NV015-NGUYEN VAN A/CCCD - Nguyễn Văn A - 18-08-2026.pdf`));
  // Nhanh hai cap thi thanh bon doan — van dung.
  assert.ok(duong_dan_an_toan_de_ghi(
    `${NHANH.hdld}/NV015-NGUYEN VAN A/HĐLĐ SỐ 07 - Nguyễn Văn A - 18-08-2026.pdf`));
});

test('an toan de ghi: tu choi ngoai cac nhanh da khai', () => {
  // Cot loi cua "mot chieu, xoa lan theo": ung dung chi duoc cham vao nhung nhanh no tu tao ra.
  assert.ok(!duong_dan_an_toan_de_ghi('Shared Documents/NV015-A/x.pdf'));
  assert.ok(!duong_dan_an_toan_de_ghi('00 QUẢN TRỊ & QUY CHẾ/NV015-A/x.pdf'));
  assert.ok(!duong_dan_an_toan_de_ghi('x.pdf'));
  assert.ok(!duong_dan_an_toan_de_ghi(''));
});

test('an toan de ghi: tu choi MOI nhanh chua mo', () => {
  // `05 CHẤM CÔNG – NGHỈ PHÉP` va `06 TUYỂN DỤNG & THỬ VIỆC` da thong nhat la se ghi vao,
  // nhung chua biet ten thu muc con va chua chot phan loai. Thieu mot trong hai la khong
  // duoc ghi — doan ten la Graph tao mot thu muc moi ben canh thu muc that.
  //
  // Doc tu `NHANH_CHUA_MO` chu khong go tay hai chuoi vao day: them nhanh moi vao danh sach
  // do thi bai kiem nay tu bao ve luon nhanh moi.
  assert.ok(NHANH_CHUA_MO.length > 0, 'danh sach rong thi bai kiem nay khong kiem gi');
  for (const n of NHANH_CHUA_MO) {
    assert.ok(!duong_dan_an_toan_de_ghi(`${n}/NV015-NGUYEN VAN A/x - 01-01-2026.pdf`),
      `ghi duoc vao nhanh chua mo: ${n}`);
    assert.ok(!thu_muc_an_toan_de_tao(`${n}/NV015-NGUYEN VAN A`),
      `tao duoc thu muc trong nhanh chua mo: ${n}`);
    assert.ok(!thu_muc_an_toan_de_tao(n), `tao duoc chinh nhanh chua mo: ${n}`);
  }
});

test('mot nhanh khong duoc vua duoc anh xa vua nam trong danh sach chua mo', () => {
  // Day la muc dich that cua bang `NHANH_CHUA_MO`. Mo mot nhanh ra thi phai GO no khoi bang
  // do — tuc la mot hanh dong co y, sau khi da co ten thu muc con that va da chot phan loai
  // voi nguoi phu trach. Khong the lang le them mot dong vao `NHANH` luc don dep.
  for (const n of NHANH_CHUA_MO) {
    for (const [ten, da_khai] of Object.entries(NHANH)) {
      assert.ok(da_khai !== n && !da_khai.startsWith(`${n}/`),
        `nhanh "${ten}" nam trong "${n}", ma nhanh do con trong danh sach chua mo. `
        + 'Da co ten thu muc con that va da chot phan loai thi go no khoi NHANH_CHUA_MO.');
    }
  }
});

test('an toan de ghi: tu choi ghi thang vao goc nhanh', () => {
  // Mot tep nam ngay trong `01 HỒ SƠ NHÂN SỰ (201)` thi khong thuoc ve ai, va lan xoa lan
  // theo se khong biet no la cua ung dung hay do nguoi khac dat vao.
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/x.pdf`));
  assert.ok(!duong_dan_an_toan_de_ghi(NHANH.ho_so_201));
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/`));
});

test('an toan de ghi: tu choi sau hon ba cap', () => {
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/NV015-A/2026/x.pdf`));
});

test('an toan de ghi: tu choi .. va duong dan tuyet doi', () => {
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/../../x.pdf`));
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/NV015-A/../x.pdf`));
  assert.ok(!duong_dan_an_toan_de_ghi(`/${NHANH.ho_so_201}/NV015-A/x.pdf`));
});

test('an toan de ghi: tu choi doan trong hay chi co dau cach', () => {
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}//x.pdf`));
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/   /x.pdf`));
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/NV015-A/   `));
});

test('an toan de ghi: tu choi ten chua ky tu SharePoint cam', () => {
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/NV015-A/x:y.pdf`));
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/NV015-A/x${dk(0x00)}y.pdf`));
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/NV015-A/.x.pdf`));
  assert.ok(!duong_dan_an_toan_de_ghi(`${NHANH.ho_so_201}/NV015 - A/x  y.pdf`));
});

test('an toan de ghi: tu choi duong dan qua 400 ky tu', () => {
  const dai = `${NHANH.ho_so_201}/NV015-A/${'x'.repeat(DUONG_DAN_TOI_DA)}.pdf`;
  assert.ok(dai.length > DUONG_DAN_TOI_DA);
  assert.ok(!duong_dan_an_toan_de_ghi(dai));
});

test('an toan de ghi: mot nhanh khong duoc la tien to cua nhanh khac', () => {
  // Neu co, `startsWith` trong bo kiem se nhan sai nhanh va tep bay sang nhanh ben canh.
  const ds = Object.values(NHANH);
  for (const a of ds) {
    for (const b of ds) {
      if (a === b) continue;
      assert.ok(!b.startsWith(`${a}/`),
        `nhanh "${a}" la tien to cua "${b}" — bo kiem se nhan sai cap`);
    }
  }
});
