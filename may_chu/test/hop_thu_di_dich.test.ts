// Kiem phan CHON DICH cua hop thu di: su kien nao di ve dau, va tien trinh nhat viec duoc
// phep lay nhung dong nao.
//
// VI SAO PHAI KHOA BANG TEST
//
// Bo nhat viec lay dong CU NHAT truoc. Mot dong khong co dich that bai, lui theo backoff roi
// den han lai nam trong nhom cu nhat — chi can so dong do nhieu hon so slot moi vong thi hang
// doi DUNG HAN. Da xay ra that tren production: 123.510 su kien ERP cu (chua khai webhook)
// chiem het slot, toan bo su kien nghi viec + ms365 nam im tu thang 9 voi `so_lan = 0`.
// Bai kiem nay khoa dieu kien loc — bo no di la trieu chung cu quay lai, va lan nay no am
// tham: nguoi da nghi van dang nhap duoc Microsoft ma khong ai thay loi.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { dich_cua_loai, dieu_kien_nhat_viec } = await import('../src/su_kien/hop_thu_di.ts');

const KHONG_DICH = {
  ms365_nghi_viec: false, ms365_tao: false, cong: false, erp1: false, email: false, erp: false,
};

test('dich_cua_loai: moi loai su kien ve dung MOT dich', () => {
  assert.equal(dich_cua_loai('ms365.nghi_viec'), 'ms365_nghi_viec');
  assert.equal(dich_cua_loai('ms365.tao_tai_khoan'), 'ms365_tao');
  // Loai ms365 la chua khai van di theo duong offboarding, giong `gui_mot`.
  assert.equal(dich_cua_loai('ms365.loai_la'), 'ms365_nghi_viec');

  assert.equal(dich_cua_loai('nhan_su.da_tao'), 'cong');
  assert.equal(dich_cua_loai('nhan_su.doi_ten'), 'cong');
  assert.equal(dich_cua_loai('nhan_su.nghi_viec'), 'cong');
  assert.equal(dich_cua_loai('nhan_su.quay_lai'), 'cong');

  assert.equal(dich_cua_loai('erp1.nhan_su.nghi_viec'), 'erp1');
  assert.equal(dich_cua_loai('erp1.nhan_su.da_tao'), 'erp1');

  assert.equal(dich_cua_loai('gui_email'), 'email');

  // Con lai la ERP cu — ke ca cac loai ERP chua khai o day.
  assert.equal(dich_cua_loai('bang_cong.da_chot'), 'erp');
  assert.equal(dich_cua_loai('lan_quet.da_ghi'), 'erp');
  assert.equal(dich_cua_loai('nghi_phep.da_duyet'), 'erp');
  assert.equal(dich_cua_loai('thiet_bi.mat_ket_noi'), 'erp');
});

test('dieu_kien_nhat_viec: khong dich nao bat thi khong lay dong nao', () => {
  const k = dieu_kien_nhat_viec(KHONG_DICH);
  assert.deepEqual(k.mau, []);
  assert.equal(k.nhan_erp, false);
});

test('dieu_kien_nhat_viec: chi bat mot dich thi chi lay dung loai cua dich do', () => {
  const ms = dieu_kien_nhat_viec({ ...KHONG_DICH, ms365_nghi_viec: true });
  assert.deepEqual(ms.mau, ['ms365.nghi_viec']);
  assert.equal(ms.nhan_erp, false, 'khong duoc lay loai ERP cu');

  const cong = dieu_kien_nhat_viec({ ...KHONG_DICH, cong: true });
  assert.deepEqual(cong.mau, ['nhan_su.%']);
  assert.equal(cong.nhan_erp, false);

  const erp1 = dieu_kien_nhat_viec({ ...KHONG_DICH, erp1: true });
  assert.deepEqual(erp1.mau, ['erp1.%']);
  assert.equal(erp1.nhan_erp, false);

  const email = dieu_kien_nhat_viec({ ...KHONG_DICH, email: true });
  assert.deepEqual(email.mau, ['gui_email']);
  assert.equal(email.nhan_erp, false);

  const erp = dieu_kien_nhat_viec({ ...KHONG_DICH, erp: true });
  assert.deepEqual(erp.mau, []);
  assert.equal(erp.nhan_erp, true);
});

test('dieu_kien_nhat_viec: bat het thi phu du moi duong', () => {
  const k = dieu_kien_nhat_viec({
    ms365_nghi_viec: true, ms365_tao: true, cong: true, erp1: true, email: true, erp: true,
  });
  assert.deepEqual(k.mau, [
    'ms365.nghi_viec', 'ms365.tao_tai_khoan', 'nhan_su.%', 'erp1.%', 'gui_email',
  ]);
  assert.equal(k.nhan_erp, true);
});

test('dieu_kien_nhat_viec: cac mau khong chong nhau — mot dong chi thuoc mot dich', () => {
  // Neu mau chong nhau thi mot su kien co the bi tinh la "co dich" boi dich nay trong khi
  // `gui_mot` lai gui no sang dich khac. Kiem bang chinh ham dich_cua_loai.
  const k = dieu_kien_nhat_viec({
    ms365_nghi_viec: true, ms365_tao: true, cong: true, erp1: true, email: true, erp: true,
  });
  const mau_cua = (loai: string): string[] => k.mau.filter((m) => {
    // Doi `%` thanh khop tien to de kiem bang JS thay vi SQL.
    return m.endsWith('%') ? loai.startsWith(m.slice(0, -1)) : loai === m;
  });

  const mau_ky_vong: Record<string, string> = {
    'ms365.nghi_viec': 'ms365_nghi_viec',
    'ms365.tao_tai_khoan': 'ms365_tao',
    'nhan_su.nghi_viec': 'cong',
    'erp1.nhan_su.nghi_viec': 'erp1',
    gui_email: 'email',
    'bang_cong.da_chot': 'erp',
  };
  for (const [loai, dich] of Object.entries(mau_ky_vong)) {
    const khop = mau_cua(loai);
    if (dich === 'erp') {
      assert.deepEqual(khop, [], `${loai} phai roi vao nhom nhan_erp`);
      assert.equal(dich_cua_loai(loai), 'erp');
    } else {
      assert.equal(khop.length, 1, `${loai} phai khop dung mot mau`);
      assert.equal(dich_cua_loai(loai), dich);
    }
  }
});
