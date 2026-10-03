// Kiem thu ghep ten tai khoan tren may voi nhan vien — nguon map PIN theo CHINH CAI MAY.
// Moi may cham cong co khong gian PIN rieng: cung so PIN nhung may khac nhau la nguoi khac.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { chuan_ten_may, map_ten_may } from '../src/dinh_danh/tra_ten_may.ts';

test('chuan_ten_may: bo dau, thuong hoa, gom khoang trang', () => {
  assert.equal(chuan_ten_may('  Nguyễn Hải Yến '), 'nguyen hai yen');
  assert.equal(chuan_ten_may('Hoàng-Văn_Môn'), 'hoang van mon');
  assert.equal(chuan_ten_may('Yenkho'), 'yenkho');
});

test('map_ten_may: ghep theo ten khop nguyen van, bo qua ten khong khop ai', () => {
  const { theo_pin, trung_ten } = map_ten_may(
    [
      { pin: '6', ten_may: 'Nguyen Hai Yen' },
      { pin: '4', ten_may: 'Hoang Van Mon' },
      { pin: '1', ten_may: 'Hao' }, // ten cut khong khop ho ten day du -> de lop tren tra
      { pin: '2', ten_may: '' },    // ten rong -> bo qua
    ],
    [
      { id: 'id-yen', ma_nv: 'ERP120', ma_erp: null, ho_ten: 'Nguyễn Hải Yến' },
      { id: 'id-mon', ma_nv: 'ERP158', ma_erp: null, ho_ten: 'Hoàng Văn Môn' },
    ],
  );
  assert.deepEqual([...theo_pin.keys()], ['6', '4']);
  assert.equal(theo_pin.get('6')!.id, 'id-yen');
  assert.equal(theo_pin.get('4')!.ma_nv, 'ERP158');
  assert.equal(theo_pin.has('1'), false, 'ten cut khong khop -> de lop tren tra');
  assert.equal(theo_pin.has('2'), false);
  assert.equal(trung_ten.length, 0);
});

test('map_ten_may: hai nhan vien trung ten -> KHONG doan, dua vao trung_ten', () => {
  const { theo_pin, trung_ten } = map_ten_may(
    [{ pin: '9', ten_may: 'Nguyen Van A' }],
    [
      { id: 'a1', ma_nv: 'ERP1', ma_erp: null, ho_ten: 'Nguyễn Văn A' },
      { id: 'a2', ma_nv: 'ERP2', ma_erp: null, ho_ten: 'Nguyễn Văn A' },
    ],
  );
  assert.equal(theo_pin.size, 0, 'trung ten thi khong duoc doan');
  assert.equal(trung_ten.length, 1);
  assert.equal(trung_ten[0], '9=Nguyen Van A');
});

test('map_ten_may: khong co ung vien nao thi map rong', () => {
  const { theo_pin } = map_ten_may(
    [{ pin: '6', ten_may: 'Nguyen Hai Yen' }],
    [],
  );
  assert.equal(theo_pin.size, 0);
});
