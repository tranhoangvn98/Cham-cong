// Kiem bo cham diem KPI.
//
// Diem KPI se bi chinh nguoi bi cham chat van, nen moi con so mong doi o day deu tinh tay
// duoc va co dan giai trong ghi chu.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { cham_mot_chi_so, gop_diem, loi_khai_bao, xep_loai } =
  await import('../src/kpi/cham_diem.ts');
type ChiSoKpi = Parameters<typeof cham_mot_chi_so>[1];

/** Ty le du cong: 80% = 0 diem, 100% = 100 diem. */
const DU_CONG: ChiSoKpi = {
  ma: 'DU_CONG', ten: 'Tỷ lệ đủ công', chieu: 'cao_tot',
  muc_toi_thieu: 80, muc_muc_tieu: 100, diem_toi_da: 100, trong_so: 3,
};

/** Di muon: 5 lan = 0 diem, 0 lan = 100 diem. */
const DI_MUON: ChiSoKpi = {
  ma: 'DI_MUON', ten: 'Số lần đi muộn', chieu: 'thap_tot',
  muc_toi_thieu: 5, muc_muc_tieu: 0, diem_toi_da: 100, trong_so: 2,
};

// ================================================================ cang cao cang tot
test('cao_tot: dat muc tieu duoc diem toi da', () => {
  assert.equal(cham_mot_chi_so(100, DU_CONG), 100);
});

test('cao_tot: o nguong toi thieu duoc 0 diem', () => {
  assert.equal(cham_mot_chi_so(80, DU_CONG), 0);
});

test('cao_tot: giua hai moc noi suy tuyen tinh', () => {
  // 90% nam giua 80 va 100 -> dung nua duong -> 50 diem.
  assert.equal(cham_mot_chi_so(90, DU_CONG), 50);
  // 95% -> 3/4 duong -> 75 diem.
  assert.equal(cham_mot_chi_so(95, DU_CONG), 75);
});

test('cao_tot: vuot muc tieu KHONG duoc qua diem toi da', () => {
  assert.equal(cham_mot_chi_so(120, DU_CONG), 100);
});

test('cao_tot: duoi nguong toi thieu khong bi diem AM', () => {
  assert.equal(cham_mot_chi_so(50, DU_CONG), 0);
  assert.equal(cham_mot_chi_so(0, DU_CONG), 0);
});

// ================================================================ cang thap cang tot
test('thap_tot: 0 lan di muon duoc diem toi da', () => {
  assert.equal(cham_mot_chi_so(0, DI_MUON), 100);
});

test('thap_tot: dung nguong duoc 0 diem', () => {
  assert.equal(cham_mot_chi_so(5, DI_MUON), 0);
});

test('thap_tot: giua hai moc dao chieu dung', () => {
  // 2 lan tren thang 5 lan -> con 3/5 duong tot -> 60 diem.
  assert.equal(cham_mot_chi_so(2, DI_MUON), 60);
  assert.equal(cham_mot_chi_so(4, DI_MUON), 20);
});

test('thap_tot: te hon nguong van chi 0, khong am', () => {
  assert.equal(cham_mot_chi_so(20, DI_MUON), 0);
});

// ================================================================ thieu du lieu
test('khong co du lieu tra null, KHONG phai 0 — nguoi moi vao lam khong bi oan', () => {
  assert.equal(cham_mot_chi_so(null, DU_CONG), null);
  assert.equal(cham_mot_chi_so(Number.NaN, DU_CONG), null);
});

test('hai moc bang nhau khong lam vo phep chia', () => {
  const hong = { ...DU_CONG, muc_toi_thieu: 50, muc_muc_tieu: 50 };
  assert.equal(cham_mot_chi_so(50, hong), null);
});

// ================================================================ khai bao
test('bat khai bao NGUOC chieu ngay luc khai, khong doi den luc cham', () => {
  assert.equal(loi_khai_bao(DU_CONG), null);
  assert.equal(loi_khai_bao(DI_MUON), null);

  const nguoc = { ...DU_CONG, muc_toi_thieu: 100, muc_muc_tieu: 80 };
  assert.match(loi_khai_bao(nguoc)!, /LỚN HƠN/);

  const nguoc2 = { ...DI_MUON, muc_toi_thieu: 0, muc_muc_tieu: 5 };
  assert.match(loi_khai_bao(nguoc2)!, /NHỎ HƠN/);
});

test('bat hai moc bang nhau va diem toi da khong hop le', () => {
  assert.match(loi_khai_bao({ ...DU_CONG, muc_muc_tieu: 80 })!, /bằng nhau/);
  assert.match(loi_khai_bao({ ...DU_CONG, diem_toi_da: 0 })!, /lớn hơn 0/);
  assert.match(loi_khai_bao({ ...DU_CONG, trong_so: -1 })!, /không được âm/);
});

// ================================================================ gop diem
test('gop diem theo trung binh CO trong so', () => {
  // 100 diem trong so 3, 50 diem trong so 2 -> (300 + 100) / 5 = 80
  assert.equal(gop_diem([
    { ma: 'A', diem: 100, trong_so: 3 },
    { ma: 'B', diem: 50, trong_so: 2 },
  ]), 80);
});

test('chia cho tong trong so THUC TE — bo mot chi so khong lam vo thang diem', () => {
  const ba = gop_diem([
    { ma: 'A', diem: 100, trong_so: 3 },
    { ma: 'B', diem: 100, trong_so: 2 },
    { ma: 'C', diem: 100, trong_so: 5 },
  ]);
  const hai = gop_diem([
    { ma: 'A', diem: 100, trong_so: 3 },
    { ma: 'B', diem: 100, trong_so: 2 },
  ]);
  assert.equal(ba, 100);
  assert.equal(hai, 100, 'bo bot chi so van la 100, khong tut xuong 50');
});

test('nguoi thieu du lieu o mot chi so khong bi keo diem xuong vi chi so do', () => {
  // Chi so C bi loai vi khong cham duoc -> chi con A va B.
  assert.equal(gop_diem([
    { ma: 'A', diem: 80, trong_so: 1 },
    { ma: 'B', diem: 60, trong_so: 1 },
  ]), 70);
});

test('trong so 0 bi bo qua, khong lam lech trung binh', () => {
  assert.equal(gop_diem([
    { ma: 'A', diem: 100, trong_so: 2 },
    { ma: 'B', diem: 0, trong_so: 0 },
  ]), 100);
});

test('khong chi so nao cham duoc thi tra null, KHAC han 0 diem', () => {
  assert.equal(gop_diem([]), null);
  assert.equal(gop_diem([{ ma: 'A', diem: 50, trong_so: 0 }]), null);
});

// ================================================================ xep loai
const THANG = [
  { ten: 'Xuất sắc', tu_diem: 90 },
  { ten: 'Tốt', tu_diem: 75 },
  { ten: 'Đạt', tu_diem: 60 },
  { ten: 'Cần cải thiện', tu_diem: 40 },
  { ten: 'Không đạt', tu_diem: 0 },
];

test('xep loai lay bac CAO NHAT ma diem con voi toi', () => {
  assert.equal(xep_loai(95, THANG), 'Xuất sắc');
  assert.equal(xep_loai(90, THANG), 'Xuất sắc', 'dung nguong tinh la dat bac do');
  assert.equal(xep_loai(89.99, THANG), 'Tốt');
  assert.equal(xep_loai(60, THANG), 'Đạt');
  assert.equal(xep_loai(0, THANG), 'Không đạt');
});

test('thang khai lon xon van xep dung', () => {
  const dao = [...THANG].sort((a, b) => a.tu_diem - b.tu_diem);
  assert.equal(xep_loai(95, dao), 'Xuất sắc');
});

test('khong co diem thi khong xep loai', () => {
  assert.equal(xep_loai(null, THANG), null);
});

test('thang thieu bac 0 thi diem thap khong bi gan loai bua', () => {
  assert.equal(xep_loai(10, [{ ten: 'Tốt', tu_diem: 75 }]), null);
});
