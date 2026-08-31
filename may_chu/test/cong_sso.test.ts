// Xac minh token cua cong SSO noi bo.
//
// TEP NAY CHU YEU KIEM CAC NHANH TU CHOI, khong phai nhanh thanh cong. Do la co y: mot lop xac
// minh token chi co MOT cach dung va rat nhieu cach hong, va moi cach hong deu im lang. Bai
// "token dung thi qua" khong bat duoc gi ca — no van xanh khi ta bo het phep kiem.
//
// Bon bai quan trong nhat, theo thu tu:
//
//   1. `alg: none`     — bo phep kiem alg thi bai nay do.
//   2. HS256 ky bang chinh khoa CONG KHAI ("algorithm confusion") — doi khoa cong khai thanh
//      bi mat HMAC. Ai cung doc duoc JWKS, nen ai cung tu ky duoc token quan tri.
//   3. Doi payload nhung giu chu ky cu — bat cai loi "doc truong truoc, kiem chu ky sau".
//   4. JWKS chet va CHUA co cache  -> TU CHOI (fail closed). Va JWKS chet nhung DA co cache
//      -> VAN chap nhan (cong chet 5 phut khong duoc lam dut phien cua ca cong ty).
//
// MOI THU TU src NAP BANG `await import`, khong phai `import` o dau tep: `cau_hinh.ts` doc
// `process.env` DUNG MOT LAN luc nap module, con cong cua may chu JWKS gia thi chi biet duoc
// sau khi da `listen`. Import tinh bi hoisted len truoc moi cau lenh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { createSign, createHmac, generateKeyPairSync, createPublicKey, type KeyObject } from 'node:crypto';
import type { AddressInfo } from 'node:net';

// ================================================================ khoa + may chu JWKS gia

interface CapKhoa {
  kid: string;
  rieng: KeyObject;
  jwk: Record<string, unknown>;
}

function sinh_cap(kid: string): CapKhoa {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  return { kid, rieng: privateKey, jwk: { ...jwk, kid, alg: 'RS256', use: 'sig' } };
}

const KHOA = sinh_cap('khoa-1');
const KHOA_MOI = sinh_cap('khoa-2');   // dung cho bai xoay khoa
const KHOA_LA = sinh_cap('khoa-la');   // KHONG BAO GIO nam trong JWKS

class JwksGia {
  may: Server;
  cong = 0;
  /** So luot bi goi — dung de kiem cache va gioi han tan suat. */
  so_goi = 0;
  /** Bo khoa dang cong bo. Doi de mo phong cong xoay khoa. */
  khoa: CapKhoa[] = [KHOA];
  /** `chet` = 500; `rong` = khong khoa nao; `rac` = khong phai JSON; `khong-rsa` = khoa la kieu khac. */
  che_do: 'thuong' | 'chet' | 'rong' | 'rac' | 'khong-rsa' = 'thuong';

  constructor() {
    this.may = createServer((_yc, ph) => {
      this.so_goi += 1;
      if (this.che_do === 'chet') {
        ph.writeHead(500).end('cong chet');
        return;
      }
      if (this.che_do === 'rac') {
        ph.writeHead(200, { 'content-type': 'application/json' }).end('<html>khong phai json');
        return;
      }
      const keys = this.che_do === 'rong'
        ? []
        : this.che_do === 'khong-rsa'
          ? [{ kid: KHOA.kid, kty: 'oct', k: 'AAAA' }]
          : this.khoa.map((k) => k.jwk);
      ph.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ keys }));
    });
  }

  async mo(): Promise<void> {
    this.may.listen(0, '127.0.0.1');
    await once(this.may, 'listening');
    this.cong = (this.may.address() as AddressInfo).port;
  }

  async dong(): Promise<void> {
    this.may.close();
    await once(this.may, 'close');
  }
}

const jwks = new JwksGia();
await jwks.mo();

const ISS = 'https://cong-gia.test/cong';
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'khoa-kiem-thu-du-dai-32-ky-tu-tro-len-aaaa';
process.env['DATABASE_URL'] = 'postgres://khong-dung@127.0.0.1:1/khong';
process.env['CONG_SSO_GOC'] = ISS;
process.env['CONG_SSO_JWKS'] = `http://127.0.0.1:${String(jwks.cong)}/jwks.json`;
process.env['CONG_SSO_MA_MODULE'] = 'chamcong';

const {
  xac_minh_token_cong, vai_tro_tu_quyen, xoa_dem_khoa_cong, bat_cong_sso,
  url_an_toan, la_duong_dan_noi_bo, lam_sach_duong_dan_noi_bo, url_dang_nhap_cong,
  MA_VAI_TRO_CONG,
} = await import('../src/bao_mat/cong_sso.ts');

// ================================================================ tien ich soan token

function b64(v: unknown): string {
  return Buffer.from(JSON.stringify(v)).toString('base64url');
}

const gio = (): number => Math.floor(Date.now() / 1000);

interface ThanTuy { [k: string]: unknown }

function than_chuan(them: ThanTuy = {}): ThanTuy {
  return {
    iss: ISS,
    aud: 'cong-noi-bo',
    sub: 'tk-0001',
    oid: 'oid-abc',
    nhan_su: 'ns-77',
    email: 'nguoi.thu@tranhoangvietnam.com',
    ten: 'Nguyễn Người Thử',
    quyen: { chamcong: ['nhan_su'] },
    loai: 'tc',
    jti: 'jti-1',
    iat: gio(),
    exp: gio() + 900,
    ...them,
  };
}

/** Ky bang RS256 voi cap khoa cho truoc. */
function ky_rs256(than: ThanTuy, cap: CapKhoa = KHOA, dau_them: ThanTuy = {}): string {
  const p_dau = b64({ alg: 'RS256', typ: 'JWT', kid: cap.kid, ...dau_them });
  const p_than = b64(than);
  const chu_ky = createSign('RSA-SHA256').update(`${p_dau}.${p_than}`).sign(cap.rieng);
  return `${p_dau}.${p_than}.${chu_ky.toString('base64url')}`;
}

function token_tot(them: ThanTuy = {}): string {
  return ky_rs256(than_chuan(them));
}

/** Dat lai trang thai giua cac bai: bo nho dem khoa, bo dem goi, bo khoa cong bo. */
function dat_lai(): void {
  xoa_dem_khoa_cong();
  jwks.so_goi = 0;
  jwks.che_do = 'thuong';
  jwks.khoa = [KHOA];
}

// ================================================================ nhanh thanh cong (toi thieu)

test('token nguoi dung hop le: doc dung sub, quyen, loai', async () => {
  dat_lai();
  const nd = await xac_minh_token_cong(token_tot());
  assert.notEqual(nd, null);
  assert.equal(nd!.sub, 'tk-0001');
  assert.equal(nd!.nhan_su, 'ns-77');
  assert.equal(nd!.loai, 'tc');
  assert.deepEqual(nd!.quyen, ['nhan_su']);
});

test('token dich vu (loai dv) dung duoc', async () => {
  dat_lai();
  const nd = await xac_minh_token_cong(token_tot({ loai: 'dv', nhan_su: null, email: null }));
  assert.equal(nd?.loai, 'dv');
  assert.equal(nd?.nhan_su, null, 'nhan_su null phai xu ly duoc, khong duoc thanh chuoi "null"');
});

test('bat_cong_sso: khai du thi bat', () => {
  assert.equal(bat_cong_sso(), true);
});

// ================================================================ bon bai quan trong nhat

test('alg=none bi tu choi', async () => {
  dat_lai();
  const p_dau = b64({ alg: 'none', typ: 'JWT' });
  const p_than = b64(than_chuan({ quyen: { chamcong: ['quan_tri'] } }));
  assert.equal(await xac_minh_token_cong(`${p_dau}.${p_than}.`), null);
  // Va ca dang co kid, de khong ai nghi rang chi thieu kid moi bi chan.
  const p_dau2 = b64({ alg: 'none', typ: 'JWT', kid: KHOA.kid });
  assert.equal(await xac_minh_token_cong(`${p_dau2}.${p_than}.`), null);
});

test('alg khac RS256 bi tu choi NGAY CA KHI chu ky RSA-SHA256 dung', async () => {
  dat_lai();
  // Bai nay la cai giu DANH SACH TRANG. Hai bai `alg=none` va HS256 o tren van xanh khi bo han
  // phep kiem `alg`, vi lop nay luon xac minh bang RSA-SHA256 bat ke header ghi gi — nen chung
  // KHONG chan duoc mot ban viet lai kieu "doc alg roi chon bo xac minh theo do".
  //
  // O day chu ky la RSA-SHA256 THAT va hop le; chi cai nhan `alg` trong header la khac. Ma
  // co danh sach trang cung thi tu choi; ma tin theo header thi nhan.
  for (const alg of ['RS512', 'PS256', 'none', '', 'rs256']) {
    const t = ky_rs256(than_chuan(), KHOA, { alg });
    assert.equal(await xac_minh_token_cong(t), null, `alg=${alg}`);
  }
  // Va doi chung: dung nhan RS256 thi qua.
  assert.notEqual(await xac_minh_token_cong(ky_rs256(than_chuan(), KHOA, { alg: 'RS256' })), null);
});

test('HS256 ky bang chinh khoa cong khai (algorithm confusion) bi tu choi', async () => {
  dat_lai();
  // Don kinh dien: JWKS la CONG KHAI, ai cung tai duoc. Neu lop xac minh doc `alg` roi tin
  // theo, ke tan cong lay khoa cong khai lam bi mat HMAC va tu ky token quan tri.
  const pem = createPublicKey({ key: KHOA.jwk as never, format: 'jwk' })
    .export({ type: 'spki', format: 'pem' }).toString();
  const p_dau = b64({ alg: 'HS256', typ: 'JWT', kid: KHOA.kid });
  const p_than = b64(than_chuan({ quyen: { chamcong: ['quan_tri'] } }));
  const ky = createHmac('sha256', pem).update(`${p_dau}.${p_than}`).digest('base64url');
  assert.equal(await xac_minh_token_cong(`${p_dau}.${p_than}.${ky}`), null);
});

test('doi payload nhung giu chu ky cu bi tu choi', async () => {
  dat_lai();
  const that = token_tot();
  const [p_dau, , p_ky] = that.split('.') as [string, string, string];
  const gia = b64(than_chuan({ quyen: { chamcong: ['quan_tri'] }, sub: 'tk-khac' }));
  assert.equal(await xac_minh_token_cong(`${p_dau}.${gia}.${p_ky}`), null);
});

test('ky bang khoa khong nam trong JWKS bi tu choi', async () => {
  dat_lai();
  assert.equal(await xac_minh_token_cong(ky_rs256(than_chuan(), KHOA_LA)), null);
});

test('FAIL CLOSED: JWKS chet va chua co cache thi TU CHOI', async () => {
  dat_lai();
  jwks.che_do = 'chet';
  const nd = await xac_minh_token_cong(token_tot());
  assert.equal(nd, null, 'khong tai duoc JWKS thi phai tu choi, khong duoc cho qua');
});

test('JWKS chet nhung DA co cache thi van chap nhan token con han', async () => {
  dat_lai();
  assert.notEqual(await xac_minh_token_cong(token_tot()), null); // nap cache
  jwks.che_do = 'chet';
  const nd = await xac_minh_token_cong(token_tot());
  assert.notEqual(nd, null, 'cong chet khong duoc lam dut phien cua ca cong ty');
});

// ================================================================ tung phep kiem trong bang

test('iss sai bi tu choi, ke ca khi chi khac tien to', async () => {
  dat_lai();
  for (const iss of [
    'https://cong-khac.test/cong',
    `${ISS}/`,                       // them mot gach cheo cuoi
    `${ISS}x`,
    'https://cong-gia.test',         // thieu /cong
    '',
  ]) {
    assert.equal(await xac_minh_token_cong(token_tot({ iss })), null, `iss=${iss}`);
  }
});

test('aud sai bi tu choi; aud dang MANG cung bi tu choi', async () => {
  dat_lai();
  assert.equal(await xac_minh_token_cong(token_tot({ aud: 'he-khac' })), null);
  // `aud` la CHUOI theo hop dong cua cong. Nhan ca mang la mo cua cho token phat cho he khac
  // ma trong danh sach aud co ke them ten cua ta.
  assert.equal(await xac_minh_token_cong(token_tot({ aud: ['cong-noi-bo'] })), null);
  assert.equal(await xac_minh_token_cong(token_tot({ aud: undefined })), null);
});

test('exp: het han thi tu choi, trong do lech dong ho 30 giay thi van nhan', async () => {
  dat_lai();
  assert.equal(await xac_minh_token_cong(token_tot({ exp: gio() - 120 })), null);
  assert.equal(await xac_minh_token_cong(token_tot({ exp: undefined })), null);
  assert.equal(await xac_minh_token_cong(token_tot({ exp: 'mai sau' })), null);
  // Vua het han 5 giay: dong ho hai may lech nhau la chuyen thuong, tu choi o day la tu choi
  // oan nguoi dung that.
  assert.notEqual(await xac_minh_token_cong(token_tot({ exp: gio() - 5 })), null);
});

test('nbf trong tuong lai bi tu choi', async () => {
  dat_lai();
  assert.equal(await xac_minh_token_cong(token_tot({ nbf: gio() + 600 })), null);
  assert.notEqual(await xac_minh_token_cong(token_tot({ nbf: gio() - 10 })), null);
});

test('token lam moi (loai lm) KHONG goi API duoc', async () => {
  dat_lai();
  // Token lam moi song 30 ngay. Nhan no lam token goi API la bien mot bi mat dai han thanh
  // giay thong hanh, va lam thoi han 15 phut cua access token vo nghia.
  assert.equal(await xac_minh_token_cong(token_tot({ loai: 'lm' })), null);
  assert.equal(await xac_minh_token_cong(token_tot({ loai: undefined })), null);
  assert.equal(await xac_minh_token_cong(token_tot({ loai: 'quan_tri' })), null);
});

test('sub rong hoac thieu bi tu choi', async () => {
  dat_lai();
  assert.equal(await xac_minh_token_cong(token_tot({ sub: '' })), null);
  assert.equal(await xac_minh_token_cong(token_tot({ sub: undefined })), null);
  assert.equal(await xac_minh_token_cong(token_tot({ sub: 42 })), null);
});

test('token sai dinh dang bi tu choi, khong nem loi', async () => {
  dat_lai();
  for (const t of ['', 'khong-phai-jwt', 'a.b', 'a.b.c.d', '...', 'e30.e30.', '@@@.@@@.@@@']) {
    assert.equal(await xac_minh_token_cong(t), null, `token=${t}`);
  }
});

// ================================================================ ranh gioi quyen

test('CHI doc quyen cua phan he minh, khong doc cua phan he khac', async () => {
  dat_lai();
  const nd = await xac_minh_token_cong(token_tot({
    quyen: { chatbot: ['quan_tri'], cong: ['quan_tri'], chamcong: ['nhan_vien'] },
  }));
  assert.deepEqual(nd!.quyen, ['nhan_vien'], 'doc quyen phan he khac la vuot ranh gioi');
});

test('quyen rong VA thieu han khoa: ca hai deu la "chua duoc cap quyen", khong phai "cho qua"', async () => {
  dat_lai();
  const rong = await xac_minh_token_cong(token_tot({ quyen: { chamcong: [] } }));
  const thieu = await xac_minh_token_cong(token_tot({ quyen: { chatbot: ['quan_tri'] } }));
  const khong_co = await xac_minh_token_cong(token_tot({ quyen: undefined }));
  for (const nd of [rong, thieu, khong_co]) {
    // Token VAN hop le — nguoi nay da dang nhap. Chi la chua co quyen.
    assert.notEqual(nd, null);
    assert.deepEqual(nd!.quyen, []);
    assert.equal(vai_tro_tu_quyen(nd!.quyen), null);
  }
});

test('quyen khong phai mang, hoac chua thu khong phai chuoi, thi bo qua', async () => {
  dat_lai();
  for (const q of [
    { chamcong: 'quan_tri' }, { chamcong: { 0: 'quan_tri' } }, 'quan_tri', ['quan_tri'], 7,
  ]) {
    const nd = await xac_minh_token_cong(token_tot({ quyen: q }));
    assert.notEqual(nd, null);
    assert.deepEqual(nd!.quyen, [], `quyen=${JSON.stringify(q)}`);
  }
  const lan = await xac_minh_token_cong(token_tot({ quyen: { chamcong: ['nhan_su', 7, null, ''] } }));
  assert.deepEqual(lan!.quyen, ['nhan_su']);
});

test('vai_tro_tu_quyen: doi chieu theo ma, lay quyen cao nhat, ma la thi bo qua', () => {
  assert.equal(vai_tro_tu_quyen(['quan_tri']), 'admin');
  assert.equal(vai_tro_tu_quyen(['nhan_su']), 'nhan_su');
  assert.equal(vai_tro_tu_quyen(['truong_phong_nhan_su']), 'truong_phong_nhan_su');
  assert.equal(vai_tro_tu_quyen(['truong_phong']), 'truong_phong');
  assert.equal(vai_tro_tu_quyen(['nhan_vien']), 'nhan_vien');
  // Nhieu vai tro -> cao nhat.
  assert.equal(vai_tro_tu_quyen(['nhan_vien', 'quan_tri', 'truong_phong']), 'admin');
  assert.equal(vai_tro_tu_quyen(['nhan_vien', 'truong_phong']), 'truong_phong');
  // Ma la (vai tro cua phan he khac, hoac vai tro da bo khai) KHONG cap quyen gi.
  assert.equal(vai_tro_tu_quyen(['sieu_quan_tri']), null);
  assert.equal(vai_tro_tu_quyen(['admin']), null, 'ten noi bo khong phai ma ben cong');
  assert.equal(vai_tro_tu_quyen([]), null);
  // `ten` (nhan hien thi tieng Viet) KHONG bao gio duoc cap quyen — doi chieu theo `ten` la
  // de mot nguoi sua nhan thanh go quyen cua ca phong.
  assert.equal(vai_tro_tu_quyen(['Nhân sự']), null);
  assert.equal(vai_tro_tu_quyen(['Quản trị']), null);
});

test('MA_VAI_TRO_CONG dung la danh sach phai khai ben cong', () => {
  assert.deepEqual([...MA_VAI_TRO_CONG].sort(), [
    'nhan_su', 'nhan_vien', 'quan_tri', 'truong_phong', 'truong_phong_nhan_su',
  ]);
  // `cho_duyet` KHONG phai mot vai tro ben cong: trang thai do la `quyen` RONG.
  assert.equal(MA_VAI_TRO_CONG.includes('cho_duyet'), false);
});

// ================================================================ JWKS: cache, xoay khoa, tan suat

test('khong tai JWKS o moi request', async () => {
  dat_lai();
  for (let i = 0; i < 5; i += 1) await xac_minh_token_cong(token_tot());
  assert.equal(jwks.so_goi, 1, 'tai JWKS moi request la mot don DoS tu gay len chinh cong');
});

test('xoay khoa: kid la thi nap lai va tu phuc hoi, khong can khoi dong lai', async () => {
  dat_lai();
  assert.notEqual(await xac_minh_token_cong(token_tot()), null);
  assert.equal(jwks.so_goi, 1);

  // Cong xoay khoa: cong bo bo moi.
  jwks.khoa = [KHOA, KHOA_MOI];
  const nd = await xac_minh_token_cong(ky_rs256(than_chuan(), KHOA_MOI));
  assert.notEqual(nd, null, 'gap kid la phai nap lai mot lan');
  assert.equal(jwks.so_goi, 2);

  // Khoa cu van con trong bo cong bo -> van dung duoc, khong nap them.
  assert.notEqual(await xac_minh_token_cong(token_tot()), null);
  assert.equal(jwks.so_goi, 2);
});

test('kid la lien tuc KHONG bat goi cong moi lan (gioi han tan suat)', async () => {
  dat_lai();
  await xac_minh_token_cong(token_tot());          // nap lan 1
  assert.equal(jwks.so_goi, 1);

  // Ke tan cong gui mot loat token voi kid ngau nhien. Neu moi cai bat mot luot goi JWKS thi
  // phan he thanh cai bua danh vao cong — DoS phat tu ben trong.
  for (let i = 0; i < 20; i += 1) {
    const bia = { ...KHOA_LA, kid: `kid-bia-${String(i)}` };
    assert.equal(await xac_minh_token_cong(ky_rs256(than_chuan(), bia)), null);
  }
  assert.equal(jwks.so_goi, 3, '20 token kid bia chi duoc ton het chum luot, khong hon');

  // Va het luot thi khong duoc bien thanh "cho qua": token bia van bi tu choi, token that van
  // duoc nhan bang bo khoa da cache.
  assert.equal(await xac_minh_token_cong(ky_rs256(than_chuan(), KHOA_LA)), null);
  assert.notEqual(await xac_minh_token_cong(token_tot()), null);
  assert.equal(jwks.so_goi, 3);
});

test('JWKS tra ve bo khoa rong, hoac rac, thi tu choi', async () => {
  for (const che_do of ['rong', 'rac', 'khong-rsa'] as const) {
    dat_lai();
    jwks.che_do = che_do;
    assert.equal(await xac_minh_token_cong(token_tot()), null, `che_do=${che_do}`);
  }
});

// ================================================================ url JWKS an toan

test('url_an_toan: HTTPS thi duoc, HTTP ra ngoai thi khong', () => {
  assert.equal(url_an_toan('https://teams.tranhoangvietnam.com/cong/.well-known/jwks.json'), true);
  // Tai bo khoa CONG KHAI qua HTTP la de ke dung giua thay khoa, va thay khoa la tu ky duoc
  // token quan tri. Chi loopback duoc mien, va chi ngoai production.
  assert.equal(url_an_toan('http://teams.tranhoangvietnam.com/cong/jwks.json'), false);
  assert.equal(url_an_toan('http://127.0.0.1:9999/jwks.json'), true);
  assert.equal(url_an_toan('http://localhost:9999/jwks.json'), true);
  assert.equal(url_an_toan('file:///etc/passwd'), false);
  assert.equal(url_an_toan('khong-phai-url'), false);
  assert.equal(url_an_toan(''), false);
});

// ================================================================ quay_lai (chuyen huong mo)

test('la_duong_dan_noi_bo: chi nhan duong dan noi bo', () => {
  for (const d of ['/chamcong/', '/chamcong/bang-cong?thang=2026-08', '/', '/a/b/c#neo']) {
    assert.equal(la_duong_dan_noi_bo(d), true, d);
  }
  for (const d of [
    '//ke-tan-cong.test/dang-nhap',        // giao thuc tuong doi -> ra ngoai ten mien
    'https://ke-tan-cong.test',
    'http://ke-tan-cong.test',
    '/\\ke-tan-cong.test',                 // mot so trinh duyet coi \ nhu /
    '\\\\ke-tan-cong.test',
    'chamcong/khong-co-gach-dau',
    '',
  ]) {
    assert.equal(la_duong_dan_noi_bo(d), false, JSON.stringify(d));
  }
  // Ky tu dieu khien: dung de cat header hoac che phan sau trong log.
  assert.equal(la_duong_dan_noi_bo('/chamcong\r\nSet-Cookie: x=1'), false);
  assert.equal(la_duong_dan_noi_bo(`/chamcong${String.fromCharCode(0)}`), false);
  // Qua dai -> tu choi thay vi de no chay vao URL.
  assert.equal(la_duong_dan_noi_bo(`/${'a'.repeat(600)}`), false);
});

test('url_dang_nhap_cong: quay_lai xau thi bo han, khong chuyen huong ra ngoai', () => {
  const goc = 'https://cong-gia.test/';
  assert.equal(url_dang_nhap_cong(null), goc);
  assert.equal(url_dang_nhap_cong('//ke-tan-cong.test'), goc);
  assert.equal(url_dang_nhap_cong('https://ke-tan-cong.test'), goc);
  assert.equal(
    url_dang_nhap_cong('/chamcong/bang-cong?thang=2026-08'),
    `${goc}?quay_lai=${encodeURIComponent('/chamcong/bang-cong?thang=2026-08')}`,
  );
});

// ================================================================ khong doc header X-Cong-*

test('ma nguon KHONG doc header X-Cong-* o bat cu dau', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const goc = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

  // Uy quyen duy nhat la token da xac minh chu ky. `X-Cong-Nguoi-Dung` / `X-Cong-Email` do
  // Caddy chuyen sang, va Caddy chi GHI DE chung — request den tu bat cu dau khac (goi thang
  // 127.0.0.1:8080, mot lo SSRF o phan he khac, mot container cung mang Docker) thi ke goi TU
  // KHAI MINH LA AI chi bang cach dat header. Bai kiem nay chan ca y tuong do.
  const cho_phep_nhac = ['bao_mat/cong_sso.ts']; // chi trong chu thich, giai thich vi sao khong dung
  const vi_pham: string[] = [];
  const di = (thu_muc: string, tien_to: string): void => {
    for (const muc of readdirSync(thu_muc, { withFileTypes: true })) {
      const duong = join(thu_muc, muc.name);
      const ten = tien_to === '' ? muc.name : `${tien_to}/${muc.name}`;
      if (muc.isDirectory()) { di(duong, ten); continue; }
      if (!muc.name.endsWith('.ts')) continue;
      const ma = readFileSync(duong, 'utf8');
      for (const dong of ma.split('\n')) {
        if (!/x-cong-/i.test(dong)) continue;
        if (dong.trimStart().startsWith('//') || dong.trimStart().startsWith('*')) continue;
        vi_pham.push(`${ten}: ${dong.trim()}`);
      }
    }
  };
  di(goc, '');
  assert.deepEqual(vi_pham, [], `Ma dang doc header X-Cong-*:\n${vi_pham.join('\n')}`);
  assert.equal(cho_phep_nhac.length, 1);
});

test('la_duong_dan_noi_bo: ky tu dieu khien lam URL thanh //evil.com — PHAI tu choi', async () => {
  // BA VECTOR NAY DA DUOC XAC MINH TREN CHROMIUM THAT, khong suy tu dac ta:
  //   ?quay_lai=/%09/evil.com  ->  https://evil.com/
  //   ?quay_lai=/%0a/evil.com  ->  https://evil.com/
  //   ?quay_lai=/%0d/evil.com  ->  https://evil.com/
  //
  // Co che: bo phan tich URL theo WHATWG XOA tab/LF/CR trong luc doc URL. Nen mot phep kiem
  // `slice(0,2) === '//'` chay TRUOC khi xoa se khong bat duoc gi — luc do ky tu dieu khien con
  // nam giua hai dau gach.
  //
  // Vi sao dieu nay dang so: ke tan cong gui link dang nhap THAT cua cong ty. Nan nhan doc thanh
  // dia chi, thay dung ten mien, dung chung chi, go mat khau, roi bi day sang trang gia. Moi thu
  // ho duoc day phai kiem deu dung.
  for (const d of ['/\t/evil.com', '/\n/evil.com', '/\r/evil.com']) {
    assert.equal(la_duong_dan_noi_bo(d), false, `${JSON.stringify(d)} dan ra NGOAI ten mien`);
  }
  // Nhieu ky tu, va tron lan.
  for (const d of ['/\t\t/evil.com', '/\r\n/evil.com', '/\t/\t/evil.com', '/\t\\evil.com']) {
    assert.equal(la_duong_dan_noi_bo(d), false, JSON.stringify(d));
  }
  // TU CHOI HAN, khong "xoa roi kiem lai". Ban xoa-roi-kiem tra ve true cho
  // `/chamcong<CR><LF>Set-Cookie: x=1` — dung ve cau hoi "dich co noi bo khong" nhung lam mat
  // lop chan chen header, va de mot khoang cach cho tang goi dung chuoi GOC thay vi chuoi sach.
  // Bai kiem cu ngay trong tep nay da bat dung dieu do khi thu huong xoa-roi-kiem.
  assert.equal(lam_sach_duong_dan_noi_bo('/bang-cong\t'), null);
  assert.equal(lam_sach_duong_dan_noi_bo('/bang\tcong'), null);
  assert.equal(lam_sach_duong_dan_noi_bo('/\t/evil.com'), null);
  assert.equal(lam_sach_duong_dan_noi_bo('\t\r\n'), null);
  // Chuoi hop le thi tra ve CHINH NO — chuoi da kiem luon bang chuoi duoc dung.
  assert.equal(lam_sach_duong_dan_noi_bo('/bang-cong?thang=2026-08'), '/bang-cong?thang=2026-08');
});

test('la_duong_dan_noi_bo: hai ban may chu va webapp phai doi chieu GIONG NHAU', async () => {
  // Webapp va may chu la hai bundle khac nhau nen khong nhap chung module duoc — co hai ban.
  // Mot lop chan chuyen huong mo co hai ban khac nhau thi chi manh bang BAN YEU HON, va hom nay
  // da co mot su co that dung theo kieu do o cong: ban may chu du, ban JavaScript thieu phep
  // chan ky tu dieu khien, va ban chay ngay truoc `window.location.href = ...` la ban yeu.
  //
  // Bai nay chay CUNG MOT BO DAU VAO qua ca hai ban va doi chung tra ve giong nhau.
  const { readFileSync } = await import('node:fs');
  const ma_web = readFileSync(new URL('../../web/src/api.ts', import.meta.url), 'utf8');

  // Trich than ham ben webapp roi chay no, thay vi chep logic sang day.
  const m = /export function lam_sach_duong_dan_noi_bo\(duong: string\): string \| null \{([\s\S]*?)\n\}/
    .exec(ma_web);
  assert.notEqual(m, null, 'khong tim thay lam_sach_duong_dan_noi_bo trong web/src/api.ts');
  // Hang o pham vi module nen `new Function` khong thay — trich no ra roi chen vao dau than.
  const mh = /const KY_TU_TU_CHOI = (\/\[[^\]]*\]\/);/.exec(ma_web);
  assert.notEqual(mh, null, 'khong tim thay KY_TU_TU_CHOI trong web/src/api.ts');
  const than_web = `const KY_TU_TU_CHOI = ${mh![1]!};\n${m![1]!}`;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const ban_web = new Function('duong', than_web) as (d: string) => string | null;

  const dau_vao = [
    '/', '/bang-cong', '/chamcong/bang-cong?thang=2026-08', '/a#neo',
    '//evil.com', '/\\evil.com', '\\\\evil.com', 'khong-co-gach-dau', '',
    '/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '/\t\t/evil.com',
    '/bang-cong\t', '\t\r\n', `/${'a'.repeat(600)}`,
  ];
  for (const d of dau_vao) {
    assert.equal(ban_web(d), lam_sach_duong_dan_noi_bo(d),
      `hai ban khac nhau o dau vao ${JSON.stringify(d)}`);
  }
});

test('MOI cho doc `quay_lai` deu phai di qua lam_sach_duong_dan_noi_bo', async () => {
  // Chan ca LOP loi, khong chi mot ca. Lo hom nay o `/microsoft/bat-dau` la mot phep kiem TU
  // VIET (`/^\\/[^/\\\\]/`) — trong hop ly, thieu mot thu, va khong ai doc lai. Bai nay do neu
  // mot route moi lai tu viet phep kiem cho `quay_lai`.
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const goc = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

  const vi_pham: string[] = [];
  const di = (thu_muc: string, tien_to: string): void => {
    for (const muc of readdirSync(thu_muc, { withFileTypes: true })) {
      const duong = join(thu_muc, muc.name);
      const ten = tien_to === '' ? muc.name : `${tien_to}/${muc.name}`;
      if (muc.isDirectory()) { di(duong, ten); continue; }
      if (!muc.name.endsWith('.ts')) continue;
      const ma = readFileSync(duong, 'utf8');
      const dong = ma.split('\n');
      dong.forEach((d, i) => {
        if (!/quay_lai/.test(d)) return;
        if (d.trimStart().startsWith('//') || d.trimStart().startsWith('*')) return;
        // Dong nao gan mot bieu thuc chinh quy la dau hieu tu viet phep kiem.
        if (!/\.test\(|match\(|startsWith\(/.test(d)) return;
        vi_pham.push(`${ten}:${String(i + 1)}  ${d.trim()}`);
      });
    }
  };
  di(goc, '');
  assert.deepEqual(vi_pham, [],
    `Phep kiem quay_lai tu viet — phai dung lam_sach_duong_dan_noi_bo():\n${vi_pham.join('\n')}`);
});

test.after(async () => { await jwks.dong(); });
