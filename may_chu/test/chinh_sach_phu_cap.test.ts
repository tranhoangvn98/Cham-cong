// Kiem bo giai chinh sach phu cap: chinh sach cua mot nguoi -> cac dong khoan cua mot ky.
//
// Day la cho quyet dinh mot nguoi thang nay nhan them bao nhieu, nen moi con so mong doi deu
// duoc dan giai — nguoi doc sau phai kiem lai duoc bang may tinh bo tui.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { khoan_tu_chinh_sach, con_hieu_luc } = await import('../src/luong/chinh_sach.ts');

type DongChinhSach = Parameters<typeof khoan_tu_chinh_sach>[0][number];

/** Mot dong chinh sach mac dinh — moi test chi ghi de phan minh dang kiem. */
const GOC: DongChinhSach = {
  khoan_ma: 'x',
  cach_tinh: 'so_luong_x_don_gia',
  nguon_so_luong: 'co_dinh',
  so_luong: null,
  so_tien: null,
  don_gia: null,
};

const KHONG_GO_TAY = new Set<string>();

// ================================================================ nguon so luong

test('nguon "theo cong": so luong bang so ngay cong THUC TE cua ky', () => {
  const ra = khoan_tu_chinh_sach(
    [{ ...GOC, khoan_ma: 'pc_an_trua', nguon_so_luong: 'theo_cong' }],
    { so_cong: 23 },
    KHONG_GO_TAY,
  );
  assert.equal(ra.length, 1);
  assert.equal(ra[0]!.so_luong, 23);
});

test('nguon "theo cong": nghi ca thang thi khong sinh dong nao', () => {
  // Khong di lam ngay nao thi khong co ho tro an trua nao — va khong de lai mot dong 0 tren
  // bang luong de nguoi doc phai tu hieu.
  const ra = khoan_tu_chinh_sach(
    [{ ...GOC, khoan_ma: 'pc_an_trua', nguon_so_luong: 'theo_cong' }],
    { so_cong: 0 },
    KHONG_GO_TAY,
  );
  assert.deepEqual(ra, []);
});

test('nguon "co dinh": lay so luong cua chinh dong chinh sach, khong theo cong', () => {
  const ra = khoan_tu_chinh_sach(
    [{ ...GOC, khoan_ma: 'pc_gui_xe', nguon_so_luong: 'co_dinh', so_luong: 1 }],
    { so_cong: 23 },
    KHONG_GO_TAY,
  );
  assert.equal(ra[0]!.so_luong, 1, 'so cong 23 khong duoc lam doi so luong co dinh');
});

test('nguon "co dinh" ma khong khai so luong thi khong sinh dong', () => {
  const ra = khoan_tu_chinh_sach(
    [{ ...GOC, nguon_so_luong: 'co_dinh', so_luong: null }],
    { so_cong: 23 },
    KHONG_GO_TAY,
  );
  assert.deepEqual(ra, []);
});

// ================================================================ khoan go thang so tien

test('khoan "nhap tay": lay so tien co dinh moi thang cua chinh sach', () => {
  const ra = khoan_tu_chinh_sach(
    [{ ...GOC, khoan_ma: 'pc_chung', cach_tinh: 'nhap_tay', so_tien: 500_000 }],
    { so_cong: 23 },
    KHONG_GO_TAY,
  );
  assert.equal(ra.length, 1);
  assert.equal(ra[0]!.so_tien, 500_000);
  assert.equal(ra[0]!.so_luong, null, 'khoan go tay khong co so luong');
});

test('khoan "nhap tay" ma chinh sach khong noi so tien thi khong sinh dong', () => {
  const ra = khoan_tu_chinh_sach(
    [{ ...GOC, cach_tinh: 'nhap_tay', so_tien: null }],
    { so_cong: 23 },
    KHONG_GO_TAY,
  );
  assert.deepEqual(ra, []);
});

// ================================================================ don gia rieng

test('don gia rieng cua nguoi duoc mang theo; de trong thi de bo tinh lay danh muc', () => {
  const rieng = khoan_tu_chinh_sach(
    [{ ...GOC, nguon_so_luong: 'co_dinh', so_luong: 10, don_gia: 35_000 }],
    { so_cong: 23 },
    KHONG_GO_TAY,
  );
  assert.equal(rieng[0]!.don_gia, 35_000);

  const theo_danh_muc = khoan_tu_chinh_sach(
    [{ ...GOC, nguon_so_luong: 'co_dinh', so_luong: 10, don_gia: null }],
    { so_cong: 23 },
    KHONG_GO_TAY,
  );
  assert.equal(theo_danh_muc[0]!.don_gia, null,
    'de null de `tinh_mot_khoan` lay don gia danh muc, khong doan mot so o day');
});

// ================================================================ ghi de

test('khoan da GO TAY thi chinh sach khong sinh them dong — ghi de, khong cong don', () => {
  const cs: DongChinhSach[] = [
    { ...GOC, khoan_ma: 'pc_an_trua', nguon_so_luong: 'theo_cong' },
    { ...GOC, khoan_ma: 'pc_gui_xe', nguon_so_luong: 'co_dinh', so_luong: 1 },
  ];

  const ra = khoan_tu_chinh_sach(cs, { so_cong: 23 }, new Set(['pc_an_trua']));

  assert.deepEqual(ra.map((x) => x.khoan_ma), ['pc_gui_xe'],
    'khoan da go tay bi bo qua, khoan con lai van sinh binh thuong');
});

test('go tay HET thi chinh sach khong sinh dong nao', () => {
  const cs: DongChinhSach[] = [
    { ...GOC, khoan_ma: 'a', nguon_so_luong: 'co_dinh', so_luong: 1 },
    { ...GOC, khoan_ma: 'b', nguon_so_luong: 'co_dinh', so_luong: 1 },
  ];
  assert.deepEqual(khoan_tu_chinh_sach(cs, { so_cong: 23 }, new Set(['a', 'b'])), []);
});

// ================================================================ khoang hieu luc

test('chinh sach ap dung khi hai khoang GIAO NHAU, khong phai khi bao trum', () => {
  const ky = ['2026-08-01', '2026-08-31'] as const;

  // Vao lam giua thang: chinh sach bat dau 15/8 VAN ap cho ky thang 8.
  assert.equal(con_hieu_luc({ hieu_luc_tu: '2026-08-15', hieu_luc_den: null }, ...ky), true);
  // Nghi giua thang: chinh sach dong 10/8 VAN ap cho ky thang 8.
  assert.equal(
    con_hieu_luc({ hieu_luc_tu: '2026-01-01', hieu_luc_den: '2026-08-10' }, ...ky), true);
  // Con hieu luc suot ca thang.
  assert.equal(con_hieu_luc({ hieu_luc_tu: '2026-01-01', hieu_luc_den: null }, ...ky), true);
});

test('chinh sach chua toi hoac da dong truoc ky thi khong ap', () => {
  const ky = ['2026-08-01', '2026-08-31'] as const;

  assert.equal(con_hieu_luc({ hieu_luc_tu: '2026-09-01', hieu_luc_den: null }, ...ky), false,
    'bat dau sau khi ky ket thuc');
  assert.equal(
    con_hieu_luc({ hieu_luc_tu: '2026-01-01', hieu_luc_den: '2026-07-31' }, ...ky), false,
    'dong truoc khi ky bat dau');
});

test('dung ranh gioi: bat dau dung ngay cuoi ky, dong dung ngay dau ky — deu ap', () => {
  const ky = ['2026-08-01', '2026-08-31'] as const;
  assert.equal(con_hieu_luc({ hieu_luc_tu: '2026-08-31', hieu_luc_den: null }, ...ky), true);
  assert.equal(
    con_hieu_luc({ hieu_luc_tu: '2026-01-01', hieu_luc_den: '2026-08-01' }, ...ky), true);
});

// ================================================================ nhieu khoan

test('nhieu chinh sach ra nhieu dong, giu nguyen thu tu dua vao', () => {
  const ra = khoan_tu_chinh_sach(
    [
      { ...GOC, khoan_ma: 'pc_an_trua', nguon_so_luong: 'theo_cong' },
      { ...GOC, khoan_ma: 'pc_chung', cach_tinh: 'nhap_tay', so_tien: 500_000 },
      { ...GOC, khoan_ma: 'pc_gui_xe', nguon_so_luong: 'co_dinh', so_luong: 1, don_gia: 200_000 },
    ],
    { so_cong: 22 },
    KHONG_GO_TAY,
  );
  assert.deepEqual(ra.map((x) => x.khoan_ma), ['pc_an_trua', 'pc_chung', 'pc_gui_xe']);
  assert.equal(ra[0]!.so_luong, 22);
  assert.equal(ra[1]!.so_tien, 500_000);
  assert.equal(ra[2]!.don_gia, 200_000);
});

test('khong co chinh sach nao thi khong sinh dong nao', () => {
  assert.deepEqual(khoan_tu_chinh_sach([], { so_cong: 22 }, KHONG_GO_TAY), []);
});
