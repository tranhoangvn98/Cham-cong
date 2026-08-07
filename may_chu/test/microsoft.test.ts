// Kiem thu xac minh id_token cua Microsoft — mot loi o day la BAT KY AI cung dang nhap
// duoc bang email tuy chon. Tu ky token bang khoa RSA sinh tai cho, dung mot may chu
// JWKS gia dat ngay tren localhost.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { createSign, generateKeyPairSync, createPublicKey } from 'node:crypto';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@127.0.0.1:5432/khong_dung';
process.env['MS_TENANT_ID'] = 'tenant-thu-0001';
process.env['MS_CLIENT_ID'] = 'client-thu-0001';
process.env['MS_CLIENT_SECRET'] = 'bi-mat-thu';
process.env['MS_REDIRECT_URI'] = 'https://vi-du.test/api/xac-thuc/microsoft/goi-ve';

const ms = await import('../src/bao_mat/microsoft.ts');

const TENANT = 'tenant-thu-0001';
const CLIENT = 'client-thu-0001';
const ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const KID = 'khoa-thu-1';
const NONCE = 'nonce-cua-phien-nay';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
// Mot cap khoa KHAC de dong vai ke tan cong tu ky token.
const khoa_gia = generateKeyPairSync('rsa', { modulusLength: 2048 });

function jwk(khoa: ReturnType<typeof createPublicKey>, kid: string) {
  return { ...khoa.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' };
}

let may_chu_jwks: Server;
let bo_khoa = [jwk(publicKey, KID)];

before(async () => {
  may_chu_jwks = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ keys: bo_khoa }));
  });
  await new Promise<void>((ok) => may_chu_jwks.listen(18899, '127.0.0.1', ok));

  // Tro cac URL cua Microsoft ve may chu gia.
  const that = globalThis.fetch;
  globalThis.fetch = ((u: string | URL | Request, o?: RequestInit) => {
    const s = String(u);
    if (s.includes('/discovery/v2.0/keys')) return that('http://127.0.0.1:18899/keys', o);
    return that(u as string, o);
  }) as typeof fetch;
});

after(async () => {
  await new Promise<void>((ok) => may_chu_jwks.close(() => ok()));
});

/** Ky mot id_token theo dung dinh dang Microsoft tra ve. */
function tao_token(
  sua: Record<string, unknown> = {},
  tuy: { khoa?: typeof privateKey; kid?: string; alg?: string } = {},
): string {
  const gio = Math.floor(Date.now() / 1000);
  const dau = { typ: 'JWT', alg: tuy.alg ?? 'RS256', kid: tuy.kid ?? KID };
  const than = {
    iss: ISSUER,
    aud: CLIENT,
    tid: TENANT,
    oid: 'oid-nguoi-dung-1',
    sub: 'sub-1',
    nonce: NONCE,
    preferred_username: 'an.nguyen@congty.vn',
    name: 'Nguyễn Văn An',
    iat: gio,
    nbf: gio - 10,
    exp: gio + 3600,
    ...sua,
  };
  const b64 = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  const phan_dau_than = `${b64(dau)}.${b64(than)}`;
  const chu_ky = createSign('RSA-SHA256').update(phan_dau_than).sign(tuy.khoa ?? privateKey);
  return `${phan_dau_than}.${chu_ky.toString('base64url')}`;
}

test('token hop le -> lay duoc email va ho ten', async () => {
  ms.xoa_dem_khoa();
  const tt = await ms.kiem_id_token(tao_token(), NONCE);
  assert.equal(tt.email, 'an.nguyen@congty.vn');
  assert.equal(tt.ho_ten, 'Nguyễn Văn An');
  assert.equal(tt.oid, 'oid-nguoi-dung-1');
});

test('CHU KY GIA bi tu choi (ke tan cong tu ky bang khoa cua minh)', async () => {
  ms.xoa_dem_khoa();
  const gia = tao_token({ preferred_username: 'giam.doc@congty.vn' }, { khoa: khoa_gia.privateKey });
  await assert.rejects(() => ms.kiem_id_token(gia, NONCE), /Chữ ký/);
});

test("alg 'none' bi tu choi", async () => {
  ms.xoa_dem_khoa();
  const gio = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  const khong_ky = `${b64({ typ: 'JWT', alg: 'none', kid: KID })}.${b64({
    iss: ISSUER, aud: CLIENT, tid: TENANT, nonce: NONCE,
    preferred_username: 'ai.do@congty.vn', exp: gio + 3600,
  })}.`;
  await assert.rejects(() => ms.kiem_id_token(khong_ky, NONCE), /Thuật toán/);
});

test('alg HS256 bi tu choi (algorithm confusion)', async () => {
  ms.xoa_dem_khoa();
  await assert.rejects(() => ms.kiem_id_token(tao_token({}, { alg: 'HS256' }), NONCE), /Thuật toán/);
});

test('sai nonce bi tu choi (chong phat lai token cu)', async () => {
  ms.xoa_dem_khoa();
  await assert.rejects(() => ms.kiem_id_token(tao_token(), 'nonce-khac'), /nonce/);
});

test('token het han bi tu choi', async () => {
  ms.xoa_dem_khoa();
  const gio = Math.floor(Date.now() / 1000);
  await assert.rejects(() => ms.kiem_id_token(tao_token({ exp: gio - 600 }), NONCE), /hết hạn/);
});

test('token cua ung dung khac bi tu choi', async () => {
  ms.xoa_dem_khoa();
  await assert.rejects(() => ms.kiem_id_token(tao_token({ aud: 'client-khac' }), NONCE), /ứng dụng khác/);
});

test('token cua to chuc khac bi tu choi', async () => {
  ms.xoa_dem_khoa();
  await assert.rejects(
    () => ms.kiem_id_token(tao_token({ tid: 'tenant-khac', iss: 'https://login.microsoftonline.com/tenant-khac/v2.0' }), NONCE),
    /tổ chức đã cấu hình phát hành/,
  );
});

test('issuer sai bi tu choi', async () => {
  ms.xoa_dem_khoa();
  await assert.rejects(
    () => ms.kiem_id_token(tao_token({ iss: 'https://ke-tan-cong.example/v2.0' }), NONCE),
    /phát hành/,
  );
});

test('token khong co email bi tu choi', async () => {
  ms.xoa_dem_khoa();
  const t = tao_token({ preferred_username: undefined, email: undefined, upn: undefined });
  await assert.rejects(() => ms.kiem_id_token(t, NONCE), /email/);
});

test('kid la bi tu choi sau khi nap lai bo khoa', async () => {
  ms.xoa_dem_khoa();
  await assert.rejects(() => ms.kiem_id_token(tao_token({}, { kid: 'kid-khong-co' }), NONCE), /khóa công khai/);
});

test('khoa xoay: kid moi xuat hien -> nap lai va chap nhan', async () => {
  ms.xoa_dem_khoa();
  await ms.kiem_id_token(tao_token(), NONCE);          // nap bo khoa cu vao dem
  const khoa_moi = generateKeyPairSync('rsa', { modulusLength: 2048 });
  bo_khoa = [jwk(khoa_moi.publicKey, 'khoa-thu-2')];   // Microsoft xoay khoa
  const tt = await ms.kiem_id_token(
    tao_token({}, { khoa: khoa_moi.privateKey, kid: 'khoa-thu-2' }),
    NONCE,
  );
  assert.equal(tt.email, 'an.nguyen@congty.vn');
  bo_khoa = [jwk(publicKey, KID)];
});

test('PKCE: thach thuc la bam S256 cua chuoi xac minh', () => {
  const xm = ms.sinh_chuoi_ngau_nhien(48);
  const tt = ms.thach_thuc_pkce(xm);
  assert.notEqual(tt, xm, 'thach thuc phai KHAC chuoi xac minh, neu khong PKCE vo nghia');
  assert.equal(tt, ms.thach_thuc_pkce(xm), 'cung dau vao phai ra cung ket qua');
  assert.match(tt, /^[A-Za-z0-9_-]+$/, 'phai la base64url, khong co dau =');
});

test('chuoi ngau nhien du dai va khong lap', () => {
  const bo = new Set(Array.from({ length: 200 }, () => ms.sinh_chuoi_ngau_nhien()));
  assert.equal(bo.size, 200);
  assert.ok(ms.sinh_chuoi_ngau_nhien().length >= 40);
});

test('URL dang nhap mang du tham so bat buoc', () => {
  const u = new URL(ms.url_dang_nhap('state-1', 'nonce-1', 'thach-thuc-1'));
  assert.equal(u.searchParams.get('client_id'), CLIENT);
  assert.equal(u.searchParams.get('response_type'), 'code');
  assert.equal(u.searchParams.get('state'), 'state-1');
  assert.equal(u.searchParams.get('nonce'), 'nonce-1');
  assert.equal(u.searchParams.get('code_challenge'), 'thach-thuc-1');
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(u.pathname.includes(TENANT), 'phai goi dung tenant da cau hinh');
});
