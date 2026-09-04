// Kiem thu parser giao thuc ADMS — day la noi du lieu tu may di vao he thong,
// parse sai la sai cong ca cong ty.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';

const {
  doc_attlog, doc_rtlog, doc_ket_qua_lenh, doc_thong_tin_may,
  dung_phan_hoi_handshake, dinh_dang_lenh, ma_hoa_thoi_gian_zkteco,
  nhan_cach_xac_thuc, doc_userinfo,
} = await import('../src/adms/giao_thuc.ts');

test('doc_userinfo: doc PIN + Name + Card + Pri, bo qua PIN=0', () => {
  const body = 'PIN=6\tName=NGUYEN VAN A\tPri=0\tPasswd=\tCard=123\tGrp=1\tTZ=0000\n'
    + 'PIN=0\tName=ADMIN\n'                    // PIN=0 -> bo qua (su kien thiet bi)
    + 'USER PIN=9001\tName=TRAN B\tPri=14\tCard=0\n';  // tien to USER (OPERLOG) + card 0 -> null
  const { nguoi_dung, so_dong_loi } = doc_userinfo(body);
  assert.equal(nguoi_dung.length, 2);
  assert.deepEqual(nguoi_dung[0], { pin: '6', ten: 'NGUYEN VAN A', the: '123', quyen: 0 });
  assert.deepEqual(nguoi_dung[1], { pin: '9001', ten: 'TRAN B', the: null, quyen: 14 });
  assert.equal(so_dong_loi, 0);
});

test('doc_userinfo: doc dinh dang may acc (CardNo/Privilege thay Card/Pri)', () => {
  // May kiem soat ra vao tra ket qua `DATA QUERY tablename=user,...` vao /iclock/querydata
  // voi ten truong CardNo/Privilege, khac dong cham cong (Card/Pri).
  const body = 'Pin=6\tCardNo=456\tPassword=\tGroup=1\tStartTime=0\tEndTime=0\tName=ANH KHO\tPrivilege=0\n'
    + 'Pin=9001\tCardNo=0\tName=\tPrivilege=14\n';
  const { nguoi_dung, so_dong_loi } = doc_userinfo(body);
  assert.equal(so_dong_loi, 0);
  assert.equal(nguoi_dung.length, 2);
  assert.deepEqual(nguoi_dung[0], { pin: '6', ten: 'ANH KHO', the: '456', quyen: 0 });
  assert.deepEqual(nguoi_dung[1], { pin: '9001', ten: null, the: null, quyen: 14 });
});

test('doc_userinfo: than rong tra ve mang rong, khong nem loi', () => {
  assert.deepEqual(doc_userinfo(''), { nguoi_dung: [], so_dong_loi: 0 });
  assert.deepEqual(doc_userinfo('   \n  '), { nguoi_dung: [], so_dong_loi: 0 });
});

test('doc_attlog: doc dung mot dong chuan tab-separated', () => {
  const { ban_ghi, so_dong_loi } = doc_attlog('1001\t2026-08-06 08:03:12\t0\t15\t0\n');
  assert.equal(so_dong_loi, 0);
  assert.equal(ban_ghi.length, 1);
  const b = ban_ghi[0]!;
  assert.equal(b.pin, '1001');
  assert.equal(b.trang_thai, 0);
  assert.equal(b.xac_thuc, 15);
  assert.equal(nhan_cach_xac_thuc(b.xac_thuc), 'Khuôn mặt');
  // May o mui gio +07 gui gio dia phuong -> 08:03:12 +07 = 01:03:12 UTC
  assert.equal(b.thoi_diem.toISOString(), '2026-08-06T01:03:12.000Z');
});

test('doc_attlog: nhieu dong, bo qua dong rong va dong loi', () => {
  const body = [
    '1001\t2026-08-06 08:00:00\t0\t1\t0',
    '',
    'dong_rac_khong_co_tab_va_khong_co_gio',
    '1002\t2026-08-06 08:05:00\t0\t4\t0',
    '1003\tkhong_phai_ngay\t0\t1\t0',
    '1004\t2026-08-06 17:30:00\t1\t15\t0',
  ].join('\n');
  const { ban_ghi, so_dong_loi } = doc_attlog(body);
  assert.equal(ban_ghi.length, 3);
  assert.equal(so_dong_loi, 2);
  assert.deepEqual(ban_ghi.map((b) => b.pin), ['1001', '1002', '1004']);
});

test('doc_attlog: chap nhan CRLF va thieu truong cuoi', () => {
  const { ban_ghi } = doc_attlog('1001\t2026-08-06 08:00:00\r\n1002\t2026-08-06 09:00:00\t1\r\n');
  assert.equal(ban_ghi.length, 2);
  assert.equal(ban_ghi[0]!.trang_thai, 0); // mac dinh khi thieu Status
  assert.equal(ban_ghi[1]!.trang_thai, 1);
  assert.equal(ban_ghi[0]!.xac_thuc, 9);   // mac dinh 'Khác'
});

test('doc_attlog: firmware dung nhieu khoang trang thay TAB', () => {
  const { ban_ghi } = doc_attlog('1001   2026-08-06 08:00:00   0   1   0');
  assert.equal(ban_ghi.length, 1);
  assert.equal(ban_ghi[0]!.pin, '1001');
});

test('doc_attlog: chap nhan dang epoch giay', () => {
  const { ban_ghi } = doc_attlog('1001\t1785000000\t0\t1\t0');
  assert.equal(ban_ghi.length, 1);
  assert.equal(ban_ghi[0]!.thoi_diem.getTime(), 1785000000 * 1000);
});

test('doc_attlog: tu choi ngay khong ton tai', () => {
  const { ban_ghi, so_dong_loi } = doc_attlog('1001\t2026-02-30 08:00:00\t0\t1\t0');
  assert.equal(ban_ghi.length, 0);
  assert.equal(so_dong_loi, 1);
});

test('doc_attlog: tu choi gio khong hop le', () => {
  const { ban_ghi } = doc_attlog('1001\t2026-08-06 25:00:00\t0\t1\t0');
  assert.equal(ban_ghi.length, 0);
});

test('doc_attlog: chan Status ngoai khoang 0-5 ve mac dinh', () => {
  const { ban_ghi } = doc_attlog('1001\t2026-08-06 08:00:00\t99\t1\t0');
  assert.equal(ban_ghi[0]!.trang_thai, 0);
});

test('doc_attlog: body rong tra ve danh sach rong', () => {
  assert.equal(doc_attlog('').ban_ghi.length, 0);
  assert.equal(doc_attlog('   \n\n').ban_ghi.length, 0);
});

test('doc_ket_qua_lenh: doc nhieu dong ID/Return/CMD', () => {
  const kq = doc_ket_qua_lenh('ID=12&Return=0&CMD=DATA\nID=13&Return=-1&CMD=INFO\n');
  assert.equal(kq.length, 2);
  assert.deepEqual(kq[0], { id: 12, ma_tra_ve: 0, lenh: 'DATA' });
  assert.deepEqual(kq[1], { id: 13, ma_tra_ve: -1, lenh: 'INFO' });
});

test('doc_ket_qua_lenh: bo qua dong khong co ID', () => {
  assert.equal(doc_ket_qua_lenh('Return=0&CMD=DATA').length, 0);
});

test('doc_thong_tin_may: doc cap key=value, bo tien to ~', () => {
  const tt = doc_thong_tin_may('~DeviceName=SpeedFace-V5L,FirmVer=Ver 8.0.4.1,IPAddress=192.168.1.50');
  assert.equal(tt['devicename'], 'SpeedFace-V5L');
  assert.equal(tt['firmver'], 'Ver 8.0.4.1');
  assert.equal(tt['ipaddress'], '192.168.1.50');
});

test('dung_phan_hoi_handshake: bat Realtime va dung mui gio cau hinh', () => {
  const s = dung_phan_hoi_handshake('ABC123', 7);
  assert.match(s, /^GET OPTION FROM: ABC123\n/);
  assert.match(s, /\nRealtime=1\n/);
  assert.match(s, /\nTimeZone=7\n/);
  assert.match(s, /\nATTLOGStamp=None\n/);
});

test('dinh_dang_lenh: dung dinh dang C:<id>:<cmd>', () => {
  assert.equal(dinh_dang_lenh(7, 'CHECK'), 'C:7:CHECK\n');
});

test('ma_hoa_thoi_gian_zkteco: dung cong thuc cua hang', () => {
  // 2026-08-06 10:30:00 gio may (offset +07 => 03:30 UTC)
  const d = new Date('2026-08-06T03:30:00.000Z');
  const ma = ma_hoa_thoi_gian_zkteco(d, 7 * 3600_000);
  const mong_doi = ((2026 - 2000) * 12 * 31 + (8 - 1) * 31 + (6 - 1)) * 86400
    + 10 * 3600 + 30 * 60;
  assert.equal(ma, mong_doi);
});

// ============================================================ RTLOG (PUSH kiem soat ra vao)
//
// May SenseFace 2A day cham cong bang table=rtlog voi cac cap khoa=gia tri, khong phai cot
// TAB nhu ATTLOG. Truoc khi ho tro, moi lan quet deu bi vut im lang.
test('doc_rtlog: doc duoc mot lan quet', () => {
  const { ban_ghi, so_dong_loi } = doc_rtlog(
    'time=2026-08-14 15:28:03\tpin=123456\tcardno=0\teventaddr=1'
    + '\tevent=0\tinoutstatus=1\tverifytype=15\tindex=0\n',
  );
  assert.equal(so_dong_loi, 0);
  assert.equal(ban_ghi.length, 1);
  assert.equal(ban_ghi[0]!.pin, '123456');
  assert.equal(ban_ghi[0]!.trang_thai, 1);
  assert.equal(ban_ghi[0]!.xac_thuc, 15);
  assert.equal(ban_ghi[0]!.thoi_diem.toISOString(), '2026-08-14T08:28:03.000Z');
});

test('doc_rtlog: nhip tim than rong khong sinh ban ghi va khong tinh la loi', () => {
  for (const than of ['', '   ', '\n\n']) {
    const kq = doc_rtlog(than);
    assert.equal(kq.ban_ghi.length, 0, `than ${JSON.stringify(than)}`);
    assert.equal(kq.so_dong_loi, 0, `than ${JSON.stringify(than)}`);
  }
});

test('doc_rtlog: bo qua su kien cua thiet bi (pin=0 hoac thieu pin)', () => {
  const kq = doc_rtlog(
    'time=2026-08-14 15:28:03\tpin=0\tevent=20\tinoutstatus=0\n'
    + 'time=2026-08-14 15:28:09\tevent=21\tinoutstatus=0\n'
    + 'time=2026-08-14 15:29:00\tpin=1001\tinoutstatus=0\tverifytype=15\n',
  );
  assert.equal(kq.ban_ghi.length, 1, 'chi lan quet cua nguoi moi duoc tinh');
  assert.equal(kq.ban_ghi[0]!.pin, '1001');
  assert.equal(kq.so_dong_loi, 0, 'su kien thiet bi khong phai dong loi');
});

test('doc_rtlog: dong khong co cap khoa=gia tri nao thi tinh la dong loi', () => {
  const kq = doc_rtlog('day khong phai rtlog\n');
  assert.equal(kq.ban_ghi.length, 0);
  assert.equal(kq.so_dong_loi, 1);
});

test('doc_rtlog: doc nhieu ban ghi trong mot lo', () => {
  const kq = doc_rtlog(
    'time=2026-08-14 08:01:00\tpin=1001\tinoutstatus=0\tverifytype=15\n'
    + 'time=2026-08-14 17:30:00\tpin=1001\tinoutstatus=1\tverifytype=15\n'
    + 'time=2026-08-14 08:05:00\tpin=1002\tinoutstatus=0\tverifytype=1\n',
  );
  assert.equal(kq.ban_ghi.length, 3);
  assert.deepEqual(kq.ban_ghi.map((b) => b.pin), ['1001', '1001', '1002']);
});
