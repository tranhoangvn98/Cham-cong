// Kiem thu JWT, bam mat khau va geofence.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';

const { tao_token_truy_cap, tao_token_lam_moi, giai_ma_token, tao_token, bam_token } =
  await import('../src/bao_mat/jwt.ts');
const { bam_mat_khau, kiem_tra_mat_khau, kiem_tra_do_manh, LoiMatKhau } =
  await import('../src/bao_mat/mat_khau.ts');
const { khoang_cach_met, do_geofence } = await import('../src/tien_ich/dia_ly.ts');

const NGUOI = { sub: 'u1', vai_tro: 'nhan_vien' as const, nv: 'nv1', ten: 'Nguyen Van A' };

// ================================================================ JWT
test('token truy cap giai ma lai dung noi dung', () => {
  const t = tao_token_truy_cap(NGUOI);
  const nd = giai_ma_token(t.token);
  assert.notEqual(nd, null);
  assert.equal(nd!.sub, 'u1');
  assert.equal(nd!.vai_tro, 'nhan_vien');
  assert.equal(nd!.nv, 'nv1');
  assert.equal(nd!.loai, 'tc');
});

test('token lam moi co loai "lm" — khong duoc dung nhu token truy cap', () => {
  const t = tao_token_lam_moi(NGUOI);
  assert.equal(giai_ma_token(t.token)!.loai, 'lm');
});

test('token bi sua payload thi khong con hop le', () => {
  const t = tao_token_truy_cap(NGUOI);
  const [h, p, s] = t.token.split('.') as [string, string, string];
  const nd = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  nd.vai_tro = 'admin'; // nang quyen
  const p_gia = Buffer.from(JSON.stringify(nd)).toString('base64url');
  assert.equal(giai_ma_token(`${h}.${p_gia}.${s}`), null);
});

test('tu choi token alg=none (chu ky rong)', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 'u1', vai_tro: 'admin', nv: null, ten: 'x', loai: 'tc', jti: 'j',
    iat: 1, exp: Math.floor(Date.now() / 1000) + 999,
  })).toString('base64url');
  assert.equal(giai_ma_token(`${header}.${payload}.`), null);
});

test('tu choi token da het han', () => {
  const t = tao_token({ ...NGUOI, loai: 'tc' }, -10);
  assert.equal(giai_ma_token(t.token), null);
});

test('tu choi chuoi rac va token thieu phan', () => {
  assert.equal(giai_ma_token('abc'), null);
  assert.equal(giai_ma_token('a.b'), null);
  assert.equal(giai_ma_token(''), null);
  assert.equal(giai_ma_token('a.b.c.d'), null);
});

test('bam_token cho ket qua on dinh va khac token goc', () => {
  const t = tao_token_lam_moi(NGUOI).token;
  const h = bam_token(t);
  assert.equal(h, bam_token(t));
  assert.notEqual(h, t);
  assert.notEqual(h, bam_token(`${t}x`));
});

// ================================================================ mat khau
test('bam roi kiem tra lai dung mat khau', async () => {
  const hash = await bam_mat_khau('MatKhau123');
  assert.match(hash, /^scrypt\$32768\$8\$1\$/);
  assert.equal(await kiem_tra_mat_khau('MatKhau123', hash), true);
  assert.equal(await kiem_tra_mat_khau('MatKhau124', hash), false);
});

test('hai lan bam cung mat khau cho hash khac nhau (co muoi)', async () => {
  const a = await bam_mat_khau('MatKhau123');
  const b = await bam_mat_khau('MatKhau123');
  assert.notEqual(a, b);
});

test('kiem_tra_mat_khau khong nem loi voi hash rac', async () => {
  for (const rac of ['', 'x', 'scrypt$1$2$3', 'bcrypt$a$b$c$d$e', 'scrypt$abc$8$1$AA$BB']) {
    assert.equal(await kiem_tra_mat_khau('MatKhau123', rac), false);
  }
});

test('kiem_tra_mat_khau chan tham so N vo ly trong hash (chong an het RAM)', async () => {
  assert.equal(await kiem_tra_mat_khau('MatKhau123', 'scrypt$99999999$8$1$AAAA$AAAA'), false);
});

test('do manh mat khau: chan ngan, chan thieu so, chan de doan', () => {
  assert.throws(() => kiem_tra_do_manh('abc123'), LoiMatKhau);
  assert.throws(() => kiem_tra_do_manh('khongcoso'), LoiMatKhau);
  assert.throws(() => kiem_tra_do_manh('12345678'), LoiMatKhau);
  assert.throws(() => kiem_tra_do_manh('password'), LoiMatKhau);
  // Hop le
  kiem_tra_do_manh('ChamCong2026');
});

// ================================================================ geofence
test('khoang_cach_met: cung mot diem = 0', () => {
  assert.equal(khoang_cach_met(21.0278, 105.8342, 21.0278, 105.8342), 0);
});

test('khoang_cach_met: sai so nho o quy mo km', () => {
  // Ho Hoan Kiem -> Lang Chu tich Ho Chi Minh, khoang 2.3 km duong chim bay
  const d = khoang_cach_met(21.0287, 105.8524, 21.0367, 105.8348);
  assert.ok(d > 1800 && d < 2400, `khoang cach thuc te ${d}m, mong doi 1.8-2.4km`);
});

const VP = { id: 'dd1', ten: 'Van phong Ha Noi', vi_do: 21.0278, kinh_do: 105.8342, ban_kinh_m: 200 };
const KHO = { id: 'dd2', ten: 'Kho Long Bien', vi_do: 21.0450, kinh_do: 105.8600, ban_kinh_m: 500 };

test('geofence: dung tai van phong thi trong pham vi', () => {
  const kq = do_geofence(21.0278, 105.8342, [VP, KHO]);
  assert.equal(kq.trong_pham_vi, true);
  assert.equal(kq.dia_diem?.id, 'dd1');
  assert.equal(kq.khoang_cach_m, 0);
});

test('geofence: cach 150m van trong ban kinh 200m', () => {
  // 0.00135 do vi do ~ 150m
  const kq = do_geofence(21.0278 + 0.00135, 105.8342, [VP]);
  assert.equal(kq.trong_pham_vi, true);
  assert.ok(kq.khoang_cach_m! < 200);
});

test('geofence: cach 1km thi ngoai pham vi nhung van bao dia diem gan nhat', () => {
  const kq = do_geofence(21.0378, 105.8342, [VP]);
  assert.equal(kq.trong_pham_vi, false);
  assert.equal(kq.dia_diem?.id, 'dd1');
  assert.ok(kq.khoang_cach_m! > 900);
});

test('geofence: chon dia diem GAN NHAT trong nhieu dia diem', () => {
  const kq = do_geofence(21.0445, 105.8595, [VP, KHO]);
  assert.equal(kq.dia_diem?.id, 'dd2');
  assert.equal(kq.trong_pham_vi, true);
});

test('geofence: chua khai dia diem nao thi khong the xac minh', () => {
  const kq = do_geofence(21.0278, 105.8342, []);
  assert.equal(kq.dia_diem, null);
  assert.equal(kq.trong_pham_vi, false);
  assert.equal(kq.khoang_cach_m, null);
});
