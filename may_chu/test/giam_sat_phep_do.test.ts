// Test cac ham THUAN cua phep do — khong cham CSDL nao.
//
// Ba ham duoi day deu la cho da tung hong o he thong that:
//   - chuan hoa so dien thoai: khong chuan hoa thi phep do trung SDT bat duoc gan nhu khong gi
//   - tinh lai sao co hoi: sai cong thuc la vu oan hoac bo sot ca loat
//   - doc tong tien tu JSON: mot ban ghi JSON hong khong duoc lam sap ca vong quet
import { test } from 'node:test';
import assert from 'node:assert/strict';

// `cau_hinh.ts` doc bien moi truong ngay khi nap, nen phai dat truoc va import DONG —
// dung khuon cua `tinh_cong.test.ts`.
process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';

const { chuan_hoa_dien_thoai, sao_tu_tinh } =
  await import('../src/giam_sat/phep_do/trung_lap.ts');
const { doc_tong_tien } = await import('../src/giam_sat/phep_do/don_hang.ts');
const { TAT_CA, tim_phep_do, co_phep_do, cac_ma } =
  await import('../src/giam_sat/phep_do/chi_muc.ts');
const { MA_NGUON } = await import('../src/giam_sat/nguon.ts');

test('chuan hoa so dien thoai: nam cach go cung ra mot ket qua', () => {
  const mong_doi = '0912345678';
  for (const tho of [
    '0912345678', '+84912345678', '84912345678',
    '0912.345.678', '0912 345 678', ' 0912-345-678 ',
  ]) {
    assert.equal(chuan_hoa_dien_thoai(tho), mong_doi, `sai voi dau vao: ${tho}`);
  }
});

test('chuan hoa so dien thoai: gia tri khong phai so dien thoai tra ve chuoi rong', () => {
  // Quan trong: ben goi BO QUA chuoi rong. Neu ham nay tra ve '0' cho moi rac thi tat ca
  // co hoi rac se gop thanh MOT nhom "trung" khong lo.
  for (const rac of [null, undefined, '', '   ', 'khong co', 'abc', '12']) {
    assert.equal(chuan_hoa_dien_thoai(rac as string | null), '', `sai voi: ${String(rac)}`);
  }
});

test('tinh lai sao co hoi dung cong thuc AutoCreateLevel cua ERP 1', () => {
  // Nguong ERP 1: kg {200,1000,3000,5000,10000}, m3 {1,3,5,10,20}; dem so nguong bi VUOT
  // (strictly greater), lay max hai truc.
  assert.equal(sao_tu_tinh(0, 0), 0);
  assert.equal(sao_tu_tinh(200, 1), 0, 'bang nguong thi CHUA vuot');
  assert.equal(sao_tu_tinh(201, 0), 1);
  assert.equal(sao_tu_tinh(0, 1.5), 1);
  assert.equal(sao_tu_tinh(1001, 0), 2);
  assert.equal(sao_tu_tinh(3001, 0), 3);
  assert.equal(sao_tu_tinh(5001, 0), 4);
  assert.equal(sao_tu_tinh(10001, 0), 5);
  assert.equal(sao_tu_tinh(999999, 999), 5, 'khong vuot qua 5 sao');
  assert.equal(sao_tu_tinh(0, 21), 5, 'truc the tich cung dat toi da');
  assert.equal(sao_tu_tinh(201, 21), 5, 'lay MAX cua hai truc, khong cong don');
});

test('doc tong tien tu JSON lich su don hang', () => {
  assert.equal(doc_tong_tien('{"Total": 1500000}'), 1500000);
  assert.equal(doc_tong_tien('{"total": 1500000}'), 1500000, 'ERP 1 khong nhat quan hoa chu');
  assert.equal(doc_tong_tien('{"Total": "2000000"}'), 2000000, 'so luu duoi dang chuoi');
});

test('doc tong tien: JSON hong tra ve null thay vi nem loi', () => {
  // Mot ban ghi hong KHONG duoc lam sap ca vong quet. Ben goi bo qua dong do.
  for (const hong of [null, '', '   ', 'khong phai json', '{', '[1,2,3]', '"chuoi"',
    '{"khong_co_total": 1}', '{"Total": "abc"}']) {
    assert.equal(doc_tong_tien(hong), null, `sai voi: ${String(hong)}`);
  }
});

test('chi muc phep do: moi ma duy nhat va khong rong', () => {
  const ma = TAT_CA.map((p) => p.ma);
  assert.equal(new Set(ma).size, ma.length, 'co ma phep do bi trung');
  for (const p of TAT_CA) {
    assert.ok(p.ma.length > 0, 'ma rong');
    assert.ok(p.ten.length > 0, `phep do ${p.ma} thieu ten`);
    assert.ok(p.mo_ta.length > 0, `phep do ${p.ma} thieu mo ta`);
  }
});

test('chi muc phep do: moi nguon khai bao deu nam trong danh sach dong', () => {
  const hop_le = new Set<string>(MA_NGUON);
  for (const p of TAT_CA) {
    assert.ok(p.nguon.length > 0, `phep do ${p.ma} khong khai nguon nao`);
    for (const n of p.nguon) {
      assert.ok(hop_le.has(n), `phep do ${p.ma} khai nguon la: ${n}`);
    }
  }
});

test('chi muc phep do: tham so co ten duy nhat trong tung phep do', () => {
  for (const p of TAT_CA) {
    const ten = p.tham_so.map((t) => t.ten);
    assert.equal(new Set(ten).size, ten.length, `phep do ${p.ma} co tham so trung ten`);
  }
});

test('tim phep do: ma la tra ve null, khong nem loi', () => {
  assert.equal(tim_phep_do('khong_ton_tai'), null);
  assert.equal(co_phep_do('khong_ton_tai'), false);
  assert.notEqual(tim_phep_do('co_hoi_trung_sdt'), null);
  assert.ok(cac_ma().includes('co_hoi_trung_sdt'));
});

test('phep do chua trien khai phai khai ly do, va ly do phai noi ro thieu gi', () => {
  const chua = TAT_CA.filter((p) => p.chua_trien_khai !== undefined);
  // Hien tai dung mot phep do: chi_vuot_han_muc (ERP 1 khong luu so tien han muc).
  assert.ok(chua.length >= 1, 'mong doi it nhat mot phep do chua trien khai');
  for (const p of chua) {
    assert.ok((p.chua_trien_khai ?? '').length > 40,
      `phep do ${p.ma} khai chua_trien_khai qua so sai — phai noi ro thieu gi`);
  }
});
