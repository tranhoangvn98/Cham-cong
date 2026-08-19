// Quy chuan ten thu muc / ten tep cho kho ho so, va hang rao chong path traversal.
//
// Hai nhom bai o day co ly do rat khac nhau:
//
//   1. TEN DOC DUOC. Mo kho tep bang WinSCP hay sau khi bung mot ban sao luu ra may khac,
//      phai biet day la ho so cua ai, loai gi, tu bao gio. Duong dan cu
//      `2026-08/9e5dbb73-....docx` khong tra loi duoc cau nao.
//
//   2. TEN AN TOAN. Chuoi `ten_luu` den tu CSDL, nhung mot dong hong hay mot lan chen SQL
//      o cho khac deu bien no thanh duong di tuy y tren dia may chu. `duong_dan_hop_le` la
//      HANG RAO, khong phai mot bo kiem cho dep.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bo_dau, duong_dan_ho_so, duong_dan_hop_le, la_duong_dan_cu, lam_doan,
  ten_tep_chuan, ten_thu_muc_nhan_vien,
} from '../src/tien_ich/ten_tep.ts';

// ---------------------------------------------------------------- bo dau

test('bo dau: nguyen am co dau thanh nguyen am ASCII', () => {
  assert.equal(bo_dau('Hoàng Minh Ngọc'), 'Hoang Minh Ngoc');
  assert.equal(bo_dau('Nguyễn Thị Ánh Tuyết'), 'Nguyen Thi Anh Tuyet');
  assert.equal(bo_dau('Trần Đức Đạt'), 'Tran Duc Dat');
});

test('bo dau: Đ va đ PHAI thanh D va d', () => {
  // `đ` KHONG PHAI chu `d` co dau — no la chu cai rieng trong bang chu cai tieng Viet va
  // khong tach ra duoc bang NFD. Quen thay tay thi `HĐLĐ` se thanh `HL`, mat hai chu.
  assert.equal(bo_dau('đ'), 'd');
  assert.equal(bo_dau('Đ'), 'D');
  assert.equal(bo_dau('HĐLĐ'), 'HDLD');
  assert.equal(bo_dau('Đoàn Đức Định'), 'Doan Duc Dinh');
});

test('bo dau: khong dung toi chu khong dau', () => {
  assert.equal(bo_dau('HR-01 Contract 2026.pdf'), 'HR-01 Contract 2026.pdf');
});

// ---------------------------------------------------------------- lam doan

test('lam doan: moi thu khong phai chu/so thanh mot gach ngang', () => {
  assert.equal(lam_doan('HĐLĐ số 07/2026'), 'HDLD-so-07-2026');
  assert.equal(lam_doan('a  b   c'), 'a-b-c');
  assert.equal(lam_doan('!!!@@@'), '');
});

test('lam doan: khong de lai gach ngang o dau hay cuoi', () => {
  assert.equal(lam_doan('  hello  '), 'hello');
  assert.equal(lam_doan('---x---'), 'x');
  // Va khong de lai gach ngang lung lo sau khi cat theo do dai.
  assert.equal(lam_doan('abcde-fghij', 6), 'abcde');
});

test('lam doan: giu HOA/thuong nhu goc — de doc hon', () => {
  assert.equal(lam_doan('HDLD-07-2026'), 'HDLD-07-2026');
});

// ---------------------------------------------------------------- ten thu muc

test('ten thu muc: ma nhan vien truoc, ho ten sau', () => {
  // Ma truoc de `ls` sap theo ma — nhan su tra ma nhanh hon tra ten, va hai nguoi trung ten
  // thi ma van tach duoc.
  assert.equal(ten_thu_muc_nhan_vien('HR-01', 'Hoàng Minh Ngọc'), 'HR-01_Hoang-Minh-Ngoc');
  assert.equal(ten_thu_muc_nhan_vien('ERP147', 'Trần Đức Đạt'), 'ERP147_Tran-Duc-Dat');
});

test('ten thu muc: ho ten qua dai thi bi cat, ma nhan vien KHONG bi cat', () => {
  const t = ten_thu_muc_nhan_vien('ERP147', 'Nguyễn Thị Hoàng Anh Phương Thảo Linh Chi Mai Lan');
  assert.ok(t.startsWith('ERP147_'), `ma nhan vien phai con nguyen, nhan duoc: ${t}`);
  assert.ok(t.length <= 72, `qua dai: ${String(t.length)}`);
});

test('ten thu muc: thieu ho ten hay thieu ma van ra ten dung duoc', () => {
  assert.equal(ten_thu_muc_nhan_vien('HR-01', ''), 'HR-01');
  assert.equal(ten_thu_muc_nhan_vien('', 'Hoàng Minh Ngọc'), 'Hoang-Minh-Ngoc');
  assert.equal(ten_thu_muc_nhan_vien('', ''), 'khong-ro');
});

test('ten thu muc: khong bao gio co dau cach', () => {
  // Duong dan co dau cach lam vo moi doan script mot dong ai do go voi trong luc su co.
  for (const ten of ['Hoàng Minh Ngọc', 'A  B', ' x ']) {
    assert.equal(ten_thu_muc_nhan_vien('HR-01', ten).includes(' '), false);
  }
});

// ---------------------------------------------------------------- ten tep

test('ten tep: ngay_nhom_tengoc_hex.duoi', () => {
  assert.equal(ten_tep_chuan({
    ngay: '2026-08-18', nhom: 'hop_dong', ten_goc: 'HĐLĐ Hoàng Minh Ngọc.pdf',
    ma_tep: 'a1b2c3d4-1111-2222-3333-444455556666', duoi: 'pdf',
  }), '2026-08-18_hop-dong_HDLD-Hoang-Minh-Ngoc_a1b2c3d4.pdf');
});

test('ten tep: BO duoi cua ten goc, khong de no lot vao giua', () => {
  // De nguyen thi ra `...HDLD-pdf_a1b2c3d4.pdf` — doc ra la co hai lan duoi.
  const t = ten_tep_chuan({
    ngay: '2026-08-18', nhom: 'tai_lieu', ten_goc: 'CCCD.pdf',
    ma_tep: 'aaaaaaaa-1111-2222-3333-444455556666', duoi: 'pdf',
  });
  assert.equal(t, '2026-08-18_tai-lieu_CCCD_aaaaaaaa.pdf');
  assert.equal(t.includes('-pdf_'), false);
});

test('ten tep: duoi lay tu THAM SO chu khong tu ten goc', () => {
  // Mot tep .exe doi ten thanh .pdf van la .exe. Ten tep tren dia khong duoc phep noi doi
  // ve noi dung — `duoi` phai la thu may chu doc duoc tu magic byte.
  const t = ten_tep_chuan({
    ngay: '2026-08-18', nhom: 'tai_lieu', ten_goc: 'virus.pdf',
    ma_tep: 'bbbbbbbb-1111-2222-3333-444455556666', duoi: 'jpg',
  });
  assert.ok(t.endsWith('.jpg'), t);
});

test('ten tep: ten goc rong hay toan ky tu la thi thay bang "tep"', () => {
  for (const goc of ['', '.pdf', '!!!.pdf', '   ']) {
    const t = ten_tep_chuan({
      ngay: '2026-08-18', nhom: 'tai_lieu', ten_goc: goc,
      ma_tep: 'cccccccc-1111-2222-3333-444455556666', duoi: 'pdf',
    });
    assert.match(t, /_tep_cccccccc\.pdf$/, `ten goc ${JSON.stringify(goc)} -> ${t}`);
  }
});

test('ten tep: `day_du` dung ca ma — de xu ly trung ten', () => {
  const ngan = ten_tep_chuan({
    ngay: '2026-08-18', nhom: 'tai_lieu', ten_goc: 'CCCD.pdf',
    ma_tep: 'dddddddd-1111-2222-3333-444455556666', duoi: 'pdf',
  });
  const dai = ten_tep_chuan({
    ngay: '2026-08-18', nhom: 'tai_lieu', ten_goc: 'CCCD.pdf',
    ma_tep: 'dddddddd-1111-2222-3333-444455556666', duoi: 'pdf', day_du: true,
  });
  assert.notEqual(ngan, dai);
  assert.ok(dai.length > ngan.length);
  assert.match(dai, /_dddddddd111122223333444455556666\.pdf$/);
});

test('ten tep: ten goc rat dai bi cat, phan hex VAN CON', () => {
  // Phan hex la thu chong trung. Cat mat no la mo cua cho hai tep de len nhau.
  const t = ten_tep_chuan({
    ngay: '2026-08-18', nhom: 'hop_dong', ten_goc: `${'x'.repeat(300)}.pdf`,
    ma_tep: 'eeeeeeee-1111-2222-3333-444455556666', duoi: 'pdf',
  });
  assert.match(t, /_eeeeeeee\.pdf$/);
  assert.ok(t.length < 130, `qua dai: ${String(t.length)}`);
});

// ---------------------------------------------------------------- hang rao duong dan

test('duong dan moi: hop le', () => {
  const dd = duong_dan_ho_so(
    ten_thu_muc_nhan_vien('HR-01', 'Hoàng Minh Ngọc'), 'hop_dong',
    ten_tep_chuan({
      ngay: '2026-08-18', nhom: 'hop_dong', ten_goc: 'HĐLĐ.pdf',
      ma_tep: 'a1b2c3d4-1111-2222-3333-444455556666', duoi: 'pdf',
    }),
  );
  assert.equal(duong_dan_hop_le(dd), true, dd);
  assert.equal(la_duong_dan_cu(dd), false);
});

test('duong dan CU van hop le — tep chua sap xep phai con doc duoc', () => {
  // Bo som mot ngay la mot ngay khong ai mo duoc hop dong nao.
  const cu = '2026-08/9e5dbb73-e0b5-4dd7-997a-c6e16cf66ca5.docx';
  assert.equal(duong_dan_hop_le(cu), true);
  assert.equal(la_duong_dan_cu(cu), true);
});

test('duong dan: CHAN path traversal duoi moi dang', () => {
  const xau = [
    '../../etc/passwd',
    '/etc/passwd',
    'HR-01/../../etc/passwd',
    'HR-01/hop_dong/../../../etc/passwd',
    './HR-01/hop_dong/x.pdf',
    'HR-01//hop_dong/x.pdf',
    '..',
    '',
    'HR-01',
    'HR-01/hop_dong',
  ];
  for (const x of xau) {
    assert.equal(duong_dan_hop_le(x), false, `LE RA PHAI CHAN: ${JSON.stringify(x)}`);
  }
});

test('duong dan: CHAN duoi tep khong nam trong danh sach cho phep', () => {
  const goc = 'HR-01_Hoang-Minh-Ngoc/hop_dong/2026-08-18_hop-dong_X_a1b2c3d4';
  assert.equal(duong_dan_hop_le(`${goc}.pdf`), true);
  for (const duoi of ['exe', 'sh', 'php', 'html', 'svg', 'js', '']) {
    assert.equal(duong_dan_hop_le(`${goc}.${duoi}`), false, `le ra phai chan .${duoi}`);
  }
});

test('duong dan: CHAN ky tu la trong ten thu muc', () => {
  const duoi = '/hop_dong/2026-08-18_hop-dong_X_a1b2c3d4.pdf';
  for (const tm of ['HR 01', 'HR/01', 'HR\\01', 'HR;01', 'HR$01', '.HR01', '-HR01']) {
    assert.equal(duong_dan_hop_le(tm + duoi), false, `le ra phai chan ${JSON.stringify(tm)}`);
  }
});

test('duong dan: CHAN nhom viet HOA hay co so — nhom la ten cot trong CSDL', () => {
  const tm = 'HR-01_Hoang-Minh-Ngoc';
  const tep = '2026-08-18_hop-dong_X_a1b2c3d4.pdf';
  assert.equal(duong_dan_hop_le(`${tm}/hop_dong/${tep}`), true);
  assert.equal(duong_dan_hop_le(`${tm}/HOP_DONG/${tep}`), false);
  assert.equal(duong_dan_hop_le(`${tm}/hop-dong2/${tep}`), false);
});

test('duong dan: CHAN thieu phan hex o ten tep', () => {
  const tm = 'HR-01_Hoang-Minh-Ngoc/hop_dong';
  assert.equal(duong_dan_hop_le(`${tm}/2026-08-18_hop-dong_X_a1b2c3d4.pdf`), true);
  assert.equal(duong_dan_hop_le(`${tm}/2026-08-18_hop-dong_X.pdf`), false);
  assert.equal(duong_dan_hop_le(`${tm}/2026-08-18_hop-dong_X_ZZZZZZZZ.pdf`), false);
  assert.equal(duong_dan_hop_le(`${tm}/18-08-2026_hop-dong_X_a1b2c3d4.pdf`), false);
});

test('moi ten do bo sinh ra deu qua duoc hang rao', () => {
  // Bai kiem quan trong nhat cua nhom nay: neu bo SINH ten va bo KIEM ten lech nhau thi moi
  // lan tai tep len se ghi duoc xuong dia roi khong doc lai duoc — tep mo coi ngay tu dau.
  const ten_nguoi = ['Hoàng Minh Ngọc', 'Trần Đức Đạt', 'A', 'Nguyễn Thị Hoàng Anh Phương Thảo'];
  const ma = ['HR-01', 'ERP147', 'IT-01', 'X'];
  const goc = ['HĐLĐ.pdf', 'CCCD hai mặt.jpg', '!!!.png', 'bảng lương 2026.xlsx', ''];
  const nhom = ['hop_dong', 'tai_lieu', 'nguoi_phu_thuoc', 'bhxh'];

  let so = 0;
  for (const m of ma) {
    for (const t of ten_nguoi) {
      for (const g of goc) {
        for (const n of nhom) {
          const duoi = (g.split('.').pop() ?? 'pdf').toLowerCase();
          const hop_le_duoi = ['pdf', 'jpg', 'png', 'docx', 'xlsx'].includes(duoi);
          const dd = duong_dan_ho_so(
            ten_thu_muc_nhan_vien(m, t), n,
            ten_tep_chuan({
              ngay: '2026-08-18', nhom: n, ten_goc: g,
              ma_tep: 'a1b2c3d4-1111-2222-3333-444455556666',
              duoi: hop_le_duoi ? duoi : 'pdf',
            }),
          );
          assert.equal(duong_dan_hop_le(dd), true, `bo sinh ra duong dan bi bo kiem chan: ${dd}`);
          so++;
        }
      }
    }
  }
  assert.ok(so > 200, `chi thu ${String(so)} to hop — vong lap hong?`);
});
