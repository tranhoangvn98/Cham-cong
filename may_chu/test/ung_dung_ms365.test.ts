// Kiem phan THUAN cua tinh nang "ung dung bat buoc M365": doc CSV bao cao va danh gia trang thai.
//
// Phan nay quyet dinh nhan vien nao bi ghi "chua thay dung" — mot cau hien tren ho so nhan su,
// nen no phai co test: doc sai cot (vi du lay nham "Outlook (Web)" cho "Outlook (Windows)") se
// bao sai ca cong ty ma khong co loi nao.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  UNG_DUNG_BAT_BUOC, danh_gia_ung_dung, doc_bao_cao_app, doc_bao_cao_onedrive, la_thieu,
} = await import('../src/nhan_su/ung_dung_ms365.ts');

const CSV_APP = '\uFEFFReport Refresh Date,User Principal Name,Last Activity Date,'
  + 'Outlook (Windows),Teams (Windows),Outlook (Mobile),Teams (Mobile),Outlook (Web),Teams (Web)\r\n'
  + '2026-10-18,an@tranhoangvietnam.com,2026-10-17,Yes,No,No,Yes,No,Yes\r\n'
  + '2026-10-18,BINH@tranhoangvietnam.com ,2026-10-16,No,No,Yes,No,No,No\r\n';

const CSV_ONEDRIVE = 'Report Refresh Date,User Principal Name,Last Activity Date,'
  + 'Viewed Or Edited File Count,Synced File Count\r\n'
  + '2026-10-24,an@tranhoangvietnam.com,2026-10-20,12,5\r\n'
  + '2026-10-24,binh@tranhoangvietnam.com,2026-10-19,10,0\r\n';

test('doc bao cao app: dung tung cot Windows/Mobile/Web, UPN duoc chuan hoa', () => {
  const ds = doc_bao_cao_app(CSV_APP);
  const an = ds.get('an@tranhoangvietnam.com');
  assert.ok(an !== undefined);
  assert.equal(an.outlookWindows, true);
  assert.equal(an.teamsWindows, false);
  assert.equal(an.outlookMobile, false);
  assert.equal(an.teamsMobile, true);
  assert.equal(an.teamsWeb, true);
  assert.equal(an.lastActivity, '2026-10-17');

  // UPN hoa + khoang trang cuoi van khop cung mot nguoi.
  const binh = ds.get('binh@tranhoangvietnam.com');
  assert.ok(binh !== undefined);
  assert.equal(binh.outlookMobile, true);
  assert.equal(binh.outlookWindows, false);
});

test('doc bao cao app: hai dong cung UPN thi GOP bang phep OR', () => {
  const csv = 'Report Refresh Date,User Principal Name,Last Activity Date,'
    + 'Outlook (Windows),Teams (Windows),Outlook (Mobile),Teams (Mobile),Outlook (Web),Teams (Web)\n'
    + '2026-10-18,a@x.com,,No,No,No,No,No,No\n'
    + '2026-10-18,a@x.com,,Yes,No,Yes,No,No,No\n';
  const a = doc_bao_cao_app(csv).get('a@x.com');
  assert.ok(a !== undefined);
  assert.equal(a.outlookWindows, true);
  assert.equal(a.outlookMobile, true);
});

test('doc bao cao app: thieu cot bat buoc thi NEM loi (khong im lang tra rong)', () => {
  assert.throws(
    () => doc_bao_cao_app('Report Refresh Date,User Principal Name\n2026-10-18,a@x.com\n'),
    /thiếu cột "Last Activity Date"/,
  );
});

test('doc bao cao OneDrive: dem so tep dong bo va so tep da xem', () => {
  const ds = doc_bao_cao_onedrive(CSV_ONEDRIVE);
  const an = ds.get('an@tranhoangvietnam.com');
  assert.ok(an !== undefined);
  assert.equal(an.synced, 5);
  assert.equal(an.viewedOrEdited, 12);
  assert.equal(an.lastActivity, '2026-10-20');

  const binh = ds.get('binh@tranhoangvietnam.com');
  assert.ok(binh !== undefined);
  assert.equal(binh.synced, 0);
  assert.equal(binh.viewedOrEdited, 10);
});

test('danh gia: du 8 ung dung theo thu tu khai bao', () => {
  const dong = danh_gia_ung_dung({
    upn: 'an@tranhoangvietnam.com',
    baoCaoApp: doc_bao_cao_app(CSV_APP),
    baoCaoOneDrive: doc_bao_cao_onedrive(CSV_ONEDRIVE),
    co_bao_cao_app: true,
    co_bao_cao_onedrive: true,
  });
  assert.equal(dong.length, UNG_DUNG_BAT_BUOC.length);
  assert.deepEqual(
    dong.map((d) => `${d.nen_tang}:${d.ung_dung}`),
    UNG_DUNG_BAT_BUOC.map((u) => `${u.nen_tang}:${u.ma}`),
  );
});

test('danh gia: Outlook Windows, Teams chi web, OneDrive dong bo, Mobile tach dung ban', () => {
  const dong = danh_gia_ung_dung({
    upn: 'an@tranhoangvietnam.com',
    baoCaoApp: doc_bao_cao_app(CSV_APP),
    baoCaoOneDrive: doc_bao_cao_onedrive(CSV_ONEDRIVE),
    co_bao_cao_app: true,
    co_bao_cao_onedrive: true,
  });
  const tim = (nen_tang: string, ma: string) =>
    dong.find((d) => d.nen_tang === nen_tang && d.ung_dung === ma);

  assert.equal(tim('may_tinh', 'outlook')?.trang_thai, 'da_dung');
  assert.equal(tim('may_tinh', 'teams')?.trang_thai, 'chi_web');
  assert.equal(tim('may_tinh', 'onedrive')?.trang_thai, 'da_dung');
  assert.equal(tim('may_tinh', 'onedrive')?.lan_hoat_dong, '2026-10-20');
  assert.equal(tim('may_tinh', 'onedrive')?.chi_tiet, 'dong_bo_tep');
  assert.equal(tim('dien_thoai', 'authenticator')?.trang_thai, 'khong_kiem_tra_duoc');
  assert.equal(tim('dien_thoai', 'outlook')?.trang_thai, 'khong_thay');
  assert.equal(tim('dien_thoai', 'teams')?.trang_thai, 'da_dung');
  assert.equal(tim('dien_thoai', 'onedrive')?.trang_thai, 'khong_kiem_tra_duoc');
  assert.equal(tim('dien_thoai', 'sharepoint')?.trang_thai, 'khong_kiem_tra_duoc');
});

test('danh gia: nguoi chi dung OneDrive tren web thi la chi_web, khong phai da_dung', () => {
  const dong = danh_gia_ung_dung({
    upn: 'binh@tranhoangvietnam.com',
    baoCaoApp: doc_bao_cao_app(CSV_APP),
    baoCaoOneDrive: doc_bao_cao_onedrive(CSV_ONEDRIVE),
    co_bao_cao_app: true,
    co_bao_cao_onedrive: true,
  });
  const tim = (nen_tang: string, ma: string) =>
    dong.find((d) => d.nen_tang === nen_tang && d.ung_dung === ma);
  assert.equal(tim('may_tinh', 'outlook')?.trang_thai, 'khong_thay');
  assert.equal(tim('may_tinh', 'onedrive')?.trang_thai, 'chi_web');
  assert.equal(tim('dien_thoai', 'outlook')?.trang_thai, 'da_dung');
});

test('danh gia: chua co UPN thi MOI dong la khong_co_tai_khoan, khong phai khong_thay', () => {
  const dong = danh_gia_ung_dung({
    upn: null,
    baoCaoApp: new Map(),
    baoCaoOneDrive: new Map(),
    co_bao_cao_app: true,
    co_bao_cao_onedrive: true,
  });
  assert.equal(dong.every((d) => d.trang_thai === 'khong_co_tai_khoan'), true);
  assert.equal(dong.every((d) => d.chi_tiet === 'chua_co_upn'), true);
});

test('danh gia: loi doc bao cao thi khong_kiem_tra_duoc, KHONG quy toi nhan vien', () => {
  const dong = danh_gia_ung_dung({
    upn: 'an@tranhoangvietnam.com',
    baoCaoApp: new Map(),
    baoCaoOneDrive: new Map(),
    co_bao_cao_app: false,
    co_bao_cao_onedrive: false,
  });
  for (const d of dong) {
    // Authenticator / OneDrive / SharePoint dien thoai van la khong_kiem_tra_duoc vi ly do rieng.
    assert.equal(d.trang_thai, 'khong_kiem_tra_duoc');
    assert.equal(la_thieu(d.trang_thai), false);
  }
  assert.equal(dong.find((d) => d.nen_tang === 'may_tinh' && d.ung_dung === 'outlook')?.chi_tiet,
    'loi_bao_cao');
});

test('la_thieu: chi_web va khong_thay moi tinh la thieu', () => {
  assert.equal(la_thieu('khong_thay'), true);
  assert.equal(la_thieu('chi_web'), true);
  assert.equal(la_thieu('da_dung'), false);
  assert.equal(la_thieu('khong_kiem_tra_duoc'), false);
  assert.equal(la_thieu('khong_co_tai_khoan'), false);
});
