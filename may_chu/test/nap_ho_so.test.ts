// Bai kiem cho bo nap ho so nhan su. Toan bo la ham THUAN — khong CSDL, khong tep that.
//
// Du lieu trong tep nay la BIA RA. Tep nhan su that co CCCD, dia chi, ngay sinh cua nguoi
// that (Nghi dinh 13/2023) va khong duoc dua vao repo duoi bat ky dang nao.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chuan_cccd, chuan_chuc_danh, chuan_gioi_tinh, chuan_ngay, chuan_sdt, chuan_ten,
  chuan_trang_thai,
  ngay_tu_serial, type DongNhanSu,
} from '../src/nhan_su/doc_ho_so_xlsx.ts';
import {
  bo_dau, doi_chieu, gop_nguoi_trung, type HoSoHienCo,
} from '../src/nhan_su/nap_ho_so.ts';

// ---------------------------------------------------------------- ngay

test('serial Excel: goc la 1899-12-30, khong phai 1900-01-01', () => {
  assert.equal(ngay_tu_serial(61), '1900-03-01');
  assert.equal(ngay_tu_serial(45913), '2025-09-13');
});

test('serial Excel: vung 1..60 tra null chu khong tra ngay lech mot ngay', () => {
  // Do la vung truoc ngay gia 1900-02-29 cua Lotus, cong thuc lech dung mot ngay o do.
  // Ho so nhan su khong co ai sinh nam 1900 — o roi vao day la o rac.
  assert.equal(ngay_tu_serial(1), null);
  assert.equal(ngay_tu_serial(60), null);
});

test('serial Excel: so vo ly tra null chu khong tra ngay bua', () => {
  assert.equal(ngay_tu_serial(0), null);
  assert.equal(ngay_tu_serial(-5), null);
  assert.equal(ngay_tu_serial(9_999_999), null);
});

test('ngay: o kieu chu dd/mm/yyyy van doc duoc', () => {
  // Mot o trong tep that duoc go bang tay nen la CHU chu khong phai ngay.
  assert.equal(chuan_ngay('14/11/2003'), '2003-11-14');
  assert.equal(chuan_ngay('4/1/2003'), '2003-01-04');
});

test('ngay: chuoi khong phai ngay tra null', () => {
  assert.equal(chuan_ngay(''), null);
  assert.equal(chuan_ngay('chưa rõ'), null);
});

// ---------------------------------------------------------------- so dien thoai

test('sdt: Excel an mat so 0 dau thi tra lai', () => {
  assert.deepEqual(chuan_sdt('965328200'), { so: '0965328200', canh_bao: null });
});

test('sdt: so da co 0 dau thi giu nguyen', () => {
  assert.deepEqual(chuan_sdt('0392241215'), { so: '0392241215', canh_bao: null });
});

test('sdt: dang +84 va 84 deu ve duoc', () => {
  assert.equal(chuan_sdt('84965328200').so, '0965328200');
  assert.equal(chuan_sdt('+84965328200').so, '+84965328200');
});

test('sdt: so nuoc ngoai dai hon KHONG bi nan cho vua', () => {
  // Nhan su kho Trung Quoc dung so 11-12 chu so. Them so 0 vao la hong so.
  assert.deepEqual(chuan_sdt('13627817935'), { so: '13627817935', canh_bao: null });
  assert.deepEqual(chuan_sdt('137371239436'), { so: '137371239436', canh_bao: null });
});

test('sdt: so cut thi van giu nhung phai canh bao', () => {
  const kq = chuan_sdt('12345');
  assert.equal(kq.so, '12345');
  assert.match(String(kq.canh_bao), /không đúng dạng/);
});

// ---------------------------------------------------------------- cccd

test('cccd: 12 va 9 chu so la hai do dai hop le, giu nguyen', () => {
  assert.deepEqual(chuan_cccd('001191020508'), { so: '001191020508', canh_bao: null });
  assert.deepEqual(chuan_cccd('123456789'), { so: '123456789', canh_bao: null });
});

test('cccd: Excel nuot so 0 dau thi bu lai cho du 12', () => {
  // Khong co giay to Viet Nam nao dai 10 hay 11 chu so, nen day chac chan la CCCD bi cat dau.
  assert.equal(chuan_cccd('40099013188').so, '040099013188');
  assert.equal(chuan_cccd('1098005546').so, '001098005546');
  assert.match(String(chuan_cccd('1098005546').canh_bao), /thiếu số 0 đầu/);
});

test('cccd: chuoi 7-8 chu so la CMND bi cat dau, bu cho du 9', () => {
  assert.equal(chuan_cccd('13045791').so, '013045791');
  assert.equal(chuan_cccd('8089002').so, '008089002');
});

test('cccd: 18 chu so la so cong dan Trung Quoc, KHONG bu gi', () => {
  assert.deepEqual(chuan_cccd('452101198401200040'),
    { so: '452101198401200040', canh_bao: null });
});

test('cccd: o bi Excel lam tron thanh so thuc thi BO TRONG, khong doan', () => {
  // Cot nay co rang buoc UNIQUE va dung cho bao hiem/thue. Mot so sai te hon la de trong.
  const kq = chuan_cccd('1816007315.6666701');
  assert.equal(kq.so, null);
  assert.match(String(kq.canh_bao), /làm tròn thành số thực/);
});

test('cccd: do dai la thi giu nguyen va bao, khong tu nan', () => {
  const kq = chuan_cccd('0703030004675'); // 13 chu so
  assert.equal(kq.so, '0703030004675');
  assert.match(String(kq.canh_bao), /13 chữ số/);
});

// ---------------------------------------------------------------- cac o chu

test('gioi tinh: Nam/Nữ ve ma cua CSDL', () => {
  assert.equal(chuan_gioi_tinh('Nam'), 'nam');
  assert.equal(chuan_gioi_tinh('Nữ'), 'nu');
  assert.equal(chuan_gioi_tinh(''), null);
  assert.equal(chuan_gioi_tinh('khác'), null);
});

test('chuc danh: Leader la TRUONG NHOM', () => {
  assert.equal(chuan_chuc_danh('Leader'), 'Trưởng nhóm');
  assert.equal(chuan_chuc_danh('leader'), 'Trưởng nhóm');
});

test('chuc danh: cac chuc danh khac giu nguyen chu cua tep', () => {
  // Doi chu o day la doan y nguoi khac. 'TTS' van la 'TTS'.
  assert.equal(chuan_chuc_danh('Trưởng phòng'), 'Trưởng phòng');
  assert.equal(chuan_chuc_danh('TTS'), 'TTS');
  assert.equal(chuan_chuc_danh(''), null);
});

test('trang thai: chi hai gia tri biet chac, con lai la null', () => {
  assert.equal(chuan_trang_thai('Đang làm việc'), true);
  assert.equal(chuan_trang_thai('Đã nghỉ việc'), false);
  assert.equal(chuan_trang_thai(''), null);
  assert.equal(chuan_trang_thai('nghỉ thai sản'), false);
});

test('ten: bo khoang trang thua de so duoc giua hai nguon', () => {
  assert.equal(chuan_ten('  Trần   Văn  Định '), 'Trần Văn Định');
});

// ---------------------------------------------------------------- doi chieu

function dong(ho_ten: string, con_lam_viec: boolean | null = true): DongNhanSu {
  return {
    sheet: 'thu', dong_so: 2, ho_ten, gioi_tinh: null, ngay_sinh: null, cccd: null,
    so_dien_thoai: null, email: null, dia_chi_thuong_tru: null, que_quan: null,
    phong_ban: null, chuc_danh: null, ngay_vao: null, loai_hop_dong: null, con_lam_viec,
  };
}

function ho_so(
  id: string, ma_nv: string, ho_ten: string,
  tuy: Partial<HoSoHienCo> = {},
): HoSoHienCo {
  return {
    id, ma_nv, ho_ten, dang_hoat_dong: true, ngay_nghi_viec: null, quet_cuoi: null, ...tuy,
  };
}

test('doi chieu: khop ten thi vao nhom cap nhat', () => {
  const kq = doi_chieu([dong('Trần Văn Định')], [ho_so('1', 'ERP1', 'Trần Văn Định')]);
  assert.equal(kq.cap_nhat.length, 1);
  assert.equal(kq.chua_co_ho_so.length, 0);
  assert.equal(kq.cap_nhat[0]?.ho_so?.ma_nv, 'ERP1');
});

test('doi chieu: khoang trang thua khong lam lech ket qua', () => {
  const kq = doi_chieu([dong('Trần  Văn Định')], [ho_so('1', 'ERP1', 'Trần Văn  Định')]);
  assert.equal(kq.cap_nhat.length, 1);
});

test('doi chieu: khong co ho so thi KHONG tao, chi liet ke', () => {
  const kq = doi_chieu([dong('Ngô Trung Kiên')], []);
  assert.equal(kq.cap_nhat.length, 0);
  assert.equal(kq.chua_co_ho_so.length, 1);
  assert.equal(kq.chua_co_ho_so[0]?.ho_ten, 'Ngô Trung Kiên');
});

test('doi chieu: hai ho so cung ten thi KHONG chon ho', () => {
  const kq = doi_chieu(
    [dong('Trần Minh Anh')],
    [ho_so('1', 'ERP150', 'Trần Minh Anh'), ho_so('2', 'ERP149', 'Trần Minh Anh')]);
  assert.equal(kq.cap_nhat.length, 0);
  assert.equal(kq.trung_ten.length, 1);
  assert.equal(kq.trung_ten[0]?.nhieu_ho_so.length, 2);
});

test('da nghi: ngay nghi lay tu lan quet cuoi', () => {
  const kq = doi_chieu(
    [dong('Đào Thái Bình', false)],
    [ho_so('1', 'ERP128', 'Đào Thái Bình', { quet_cuoi: '2026-08-04' })]);
  assert.equal(kq.se_tat.length, 1);
  assert.equal(kq.se_tat[0]?.ngay_nghi, '2026-08-04');
});

test('da nghi: ngay da co san trong ho so duoc uu tien hon lan quet cuoi', () => {
  // Nhan su da dien ngay nghi that thi khong duoc de len bang mot ngay suy ra tu may.
  const kq = doi_chieu(
    [dong('Đào Thái Bình', false)],
    [ho_so('1', 'ERP128', 'Đào Thái Bình',
      { ngay_nghi_viec: '2026-07-31', quet_cuoi: '2026-08-04' })]);
  assert.equal(kq.se_tat[0]?.ngay_nghi, '2026-07-31');
});

test('da nghi: khong co lan quet nao thi de trong chu khong dat bua', () => {
  const kq = doi_chieu([dong('Ai Đó', false)], [ho_so('1', 'ERP9', 'Ai Đó')]);
  assert.equal(kq.se_tat.length, 1);
  assert.equal(kq.se_tat[0]?.ngay_nghi, null);
});

test('da nghi: nguoi da tat san thi khong tat lai', () => {
  const kq = doi_chieu(
    [dong('Ai Đó', false)],
    [ho_so('1', 'ERP9', 'Ai Đó', { dang_hoat_dong: false })]);
  assert.equal(kq.se_tat.length, 0);
});

test('doi chieu: nguoi trong he thong ma tep khong nhac den duoc bao rieng', () => {
  const kq = doi_chieu(
    [dong('Có Trong Tệp')],
    [ho_so('1', 'ERP1', 'Có Trong Tệp'), ho_so('2', 'ERP2', 'Không Có Trong Tệp')]);
  assert.equal(kq.khong_co_trong_tep.length, 1);
  assert.equal(kq.khong_co_trong_tep[0]?.ma_nv, 'ERP2');
});

test('doi chieu: dong trung ten KHONG bi tinh la da cham ho so', () => {
  // Neu tinh nham, hai ho so trung ten se bien mat khoi bang "khong co trong tep" va nguoi
  // doc tuong ca hai deu da duoc xu ly.
  const kq = doi_chieu(
    [dong('Trần Minh Anh')],
    [ho_so('1', 'ERP150', 'Trần Minh Anh'), ho_so('2', 'ERP149', 'Trần Minh Anh')]);
  assert.equal(kq.khong_co_trong_tep.length, 2);
});

// ---------------------------------------------------------------- khop ten khong tuyet doi
//
// Ba ca duoi day deu lay tu lan chay THAT tren tep cua HCNS. Voi phep khop tuyet doi, ca ba
// nguoi nay bi xep vao "chua co ho so" — va lam theo danh sach do la lap ho so trung.

test('khop gan dung: dao thu tu tu van ra cung mot nguoi', () => {
  const kq = doi_chieu([dong('Đào Thanh Bình')], [ho_so('1', 'ERP112', 'Thanh Bình Đào')]);
  assert.equal(kq.chua_co_ho_so.length, 0);
  assert.equal(kq.cap_nhat.length, 1);
  assert.equal(kq.khop_gan_dung.length, 1);
  assert.equal(kq.khop_gan_dung[0]?.ho_so.ma_nv, 'ERP112');
});

test('khop gan dung: Thuý / Thúy la hai cach danh dau, cung mot nguoi', () => {
  const kq = doi_chieu([dong('Nguyễn Thuý Hằng')], [ho_so('1', 'ERP155', 'Nguyễn Thúy Hằng')]);
  assert.equal(kq.cap_nhat.length, 1);
  assert.equal(kq.khop_gan_dung.length, 1);
});

test('nghi cung nguoi: thieu chu dem thi BAO chu KHONG tu cap nhat', () => {
  // "Tran Thi Minh Khanh" ↔ "Tran Minh Khanh" co the la mot nguoi, cung co the la hai chi em.
  const kq = doi_chieu([dong('Trần Thị Minh Khánh')], [ho_so('1', 'ERP84', 'Trần Minh Khánh')]);
  assert.equal(kq.cap_nhat.length, 0);
  assert.equal(kq.chua_co_ho_so.length, 0);
  assert.equal(kq.nghi_cung_nguoi.length, 1);
  assert.equal(kq.nghi_cung_nguoi[0]?.nhieu_ho_so[0]?.ma_nv, 'ERP84');
});

test('khop gan dung KHONG duoc voi tay sang nguoi khac ten', () => {
  const kq = doi_chieu([dong('Đào Thái Bình')], [ho_so('1', 'ERP112', 'Đào Thanh Bình')]);
  assert.equal(kq.cap_nhat.length, 0);
  assert.equal(kq.khop_gan_dung.length, 0);
  assert.equal(kq.chua_co_ho_so.length, 1);
});

test('bo dau: giu nguyen so tu, chi bo dau va d gach ngang', () => {
  assert.equal(bo_dau('Trần Đức Hoàng'), 'tran duc hoang');
  assert.equal(bo_dau('Nguyễn Thuý Hằng'), bo_dau('Nguyễn Thúy Hằng'));
});

// ---------------------------------------------------------------- gop nguoi o nhieu sheet

function dong_o(sheet: string, ho_ten: string, tuy: Partial<DongNhanSu> = {}): DongNhanSu {
  return { ...dong(ho_ten), sheet, ...tuy };
}

test('gop: mot nguoi o hai sheet ra MOT dong, ghi lai ca hai sheet', () => {
  // Xuat hai dong cho mot nguoi la nhan su lap hai ho so — dung benh dang phai go o PIN 4/57.
  const g = gop_nguoi_trung([
    dong_o('VPHN', 'Nguyễn Thị Thảo Vân', { chuc_danh: 'TTS' }),
    dong_o('VPSG', 'Nguyễn Thị Thảo Vân', { chuc_danh: 'Nhân viên' }),
  ]);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0]?.cac_sheet, ['VPHN', 'VPSG']);
});

test('gop: hai sheet ghi khac nhau thi BAO ca hai gia tri, khong chon ho', () => {
  const g = gop_nguoi_trung([
    dong_o('VPHN', 'Nguyễn Thị Thảo Vân', { chuc_danh: 'TTS' }),
    dong_o('VPSG', 'Nguyễn Thị Thảo Vân', { chuc_danh: 'Nhân viên' }),
  ]);
  assert.equal(g[0]?.khac_nhau.length, 1);
  assert.match(String(g[0]?.khac_nhau[0]), /chức danh: TTS \/ Nhân viên/);
});

test('gop: giu dong dien nhieu o nhat lam dai dien', () => {
  const g = gop_nguoi_trung([
    dong_o('A', 'Ai Đó'),
    dong_o('B', 'Ai Đó', { cccd: '001191020508', ngay_vao: '2026-01-01', email: 'x@y.z' }),
  ]);
  assert.equal(g[0]?.dong.sheet, 'B');
  assert.equal(g[0]?.dong.cccd, '001191020508');
});

test('gop: hai nguoi khac ten KHONG bi gop', () => {
  const g = gop_nguoi_trung([dong_o('A', 'Đào Thanh Bình'), dong_o('A', 'Đào Thái Bình')]);
  assert.equal(g.length, 2);
});

test('gop: khac dau nhung cung ten thi VAN gop', () => {
  const g = gop_nguoi_trung([dong_o('A', 'Nguyễn Thuý Hằng'), dong_o('B', 'Nguyễn Thúy Hằng')]);
  assert.equal(g.length, 1);
});

// ---------------------------------------------------------------- hai dong tranh mot ho so
//
// Loi that, phat hien khi chay tren CSDL that: tep co HAI chi "Tran Minh Anh" (mot KS dang lam,
// mot XNK da nghi) nhung he thong moi co MOT ho so ERP150. Ca hai dong cung tro ve ERP150, va
// dong thu hai mang co "da nghi" da danh dau nghi viec cho nguoi DANG DI LAM.

test('hai dong cua tep cung nhan mot ho so thi KHONG ghi dong nao', () => {
  const kq = doi_chieu(
    [dong('Trần Minh Anh', true), dong('Trần Minh Anh', false)],
    [ho_so('1', 'ERP150', 'Trần Minh Anh', { quet_cuoi: '2026-08-28' })]);
  assert.equal(kq.cap_nhat.length, 0);
  assert.equal(kq.hai_dong_mot_ho_so.length, 1);
  assert.equal(kq.hai_dong_mot_ho_so[0]?.ho_so.ma_nv, 'ERP150');
  assert.equal(kq.hai_dong_mot_ho_so[0]?.cac_dong.length, 2);
});

test('hai dong tranh mot ho so: KHONG duoc tat hoat dong nguoi do', () => {
  // Day chinh la thiet hai that: nguoi dang di lam bi danh dau nghi viec.
  const kq = doi_chieu(
    [dong('Trần Minh Anh', true), dong('Trần Minh Anh', false)],
    [ho_so('1', 'ERP150', 'Trần Minh Anh', { quet_cuoi: '2026-08-28' })]);
  assert.equal(kq.se_tat.length, 0);
});

test('hai dong tranh mot ho so cung bi loai khoi nhom khop gan dung', () => {
  const kq = doi_chieu(
    [dong('Đào Thanh Bình', true), dong('Đào Thanh Bình', false)],
    [ho_so('1', 'ERP112', 'Thanh Bình Đào')]);
  assert.equal(kq.khop_gan_dung.length, 0);
  assert.equal(kq.cap_nhat.length, 0);
  assert.equal(kq.hai_dong_mot_ho_so.length, 1);
});

test('MOT dong cho MOT ho so thi khong bi coi la tranh nhau', () => {
  const kq = doi_chieu(
    [dong('Trần Minh Anh', false)],
    [ho_so('1', 'ERP150', 'Trần Minh Anh', { quet_cuoi: '2026-08-28' })]);
  assert.equal(kq.hai_dong_mot_ho_so.length, 0);
  assert.equal(kq.cap_nhat.length, 1);
  assert.equal(kq.se_tat.length, 1);
});
