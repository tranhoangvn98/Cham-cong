// Sinh docx — phan TS quan quanh Python sidecar (khong can Python de chay test nay).
//
// Sidecar build_vbhc.py da duoc kiem bang tay tren may co Python (xem phien lam viec);
// trong bo test CI chi kiem phan tim script + bao loi ro rang de worker biet chuyen
// ban nhap sang trang thai `loi`.
//
// Cau hinh duoc BOM qua tham so — `cau_hinh` export `as const` nen khong sua duoc luc chay.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LoiSinhDocx, tim_script_python } from '../src/ai/sinh_docx.ts';
import type { CauHinhVanBanHc } from '../src/ai/sinh_docx.ts';

const CAU_HINH: CauHinhVanBanHc = {
  script: '',
  ung_vien_script: ['van_ban_hc/build_vbhc.py', 'may_chu/van_ban_hc/build_vbhc.py'],
  python_bin: 'python3',
  timeout_ms: 60_000,
};

test('khong tim thay script: nem LoiSinhDocx ma khong_tim_script', () => {
  assert.throws(
    () => tim_script_python({ ...CAU_HINH, ung_vien_script: ['thu_muc_khong_ton_tai/build_vbhc.py'] }),
    (loi: unknown) => loi instanceof LoiSinhDocx && loi.ma === 'khong_tim_script',
  );
});

test('khai script truc tiep: dung dung duong da khai (khong can ton tai)', () => {
  const p = tim_script_python({ ...CAU_HINH, script: 'duong_dan_tuy_y.py' });
  assert.ok(p.endsWith('duong_dan_tuy_y.py'));
});

test('trong repo thuc, tim duoc script theo cwd', (t) => {
  // Chay tu may_chu/ (npm test) hoac goc repo — mot trong hai ung vien phai ton tai.
  const co = CAU_HINH.ung_vien_script.some((u) => {
    try {
      tim_script_python({ ...CAU_HINH, ung_vien_script: [u] });
      return true;
    } catch {
      return false;
    }
  });
  if (!co) t.skip('khong chay tu thu muc quen thuoc — bo qua');
});
