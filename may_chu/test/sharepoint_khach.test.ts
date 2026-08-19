// Client Microsoft Graph cho dong bo SharePoint, kiem bang MOT MAY CHU GRAPH GIA tai cho.
//
// NOI THANG MOT DIEU: phien lam viec dung de viet ma nay khong ket noi duoc SharePoint that
// (proxy chan, va cung khong co credential). Nen moi bai duoi day chay tren mot may chu
// `node:http` tu dung, cai dat dung nhung hanh vi cua Graph ma ma nguon phu thuoc vao. No
// KHONG chung minh SharePoint that se nhan; no chung minh client goi dung nhung gi tai lieu
// Graph noi, va bat duoc cac loi da biet la de mac.
//
// Nam hanh vi cua Graph duoc may chu gia nay giu dung:
//
//   1. `PUT /root:/a/b/c.pdf:/content` khi `a/b` chua ton tai thi tra 404 — Graph KHONG tu
//      tao thu muc cha. Neu client quen goi `bao_dam_thu_muc` thi bai kiem do.
//   2. `POST .../children` voi `conflictBehavior: fail` tra 409 khi ten da co.
//   3. `conflictBehavior: replace` tren mot thu muc XOA sach noi dung ben trong. May chu gia
//      lam dung the, nen neu ai doi 'fail' thanh 'replace' cho "do phai xu ly 409" thi bai
//      kiem se thay du lieu cu bien mat.
//   4. Khuc tai (tru khuc cuoi) phai la boi so cua 320 KiB, khong thi 400.
//   5. 429 kem `Retry-After` — client phai cho roi thu lai, khong duoc bo cuoc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

// ================================================================ may chu Graph gia

interface MucGia {
  la_thu_muc: boolean;
  noi_dung?: Buffer;
}

interface PhienTai {
  duong_dan: string;
  khuc: Buffer[];
  da_huy: boolean;
}

class GraphGia {
  may: Server;
  cong = 0;
  /** duong dan -> muc. Khoa la duong dan tuong doi trong thu vien. */
  kho = new Map<string, MucGia>();
  phien = new Map<string, PhienTai>();
  /** Nhat ky yeu cau, de bai kiem soi client da goi dung thu tu chua. */
  goi: { method: string; url: string }[] = [];
  /** So token da cap — de kiem client co dem token lai hay xin moi moi lan. */
  so_token = 0;
  /** Ma HTTP se tra mot lan roi thoi. Dung de gia lap 429 / 401. */
  tra_mot_lan: number | null = null;
  /** Han cua token tiep theo, giay. */
  han_token_giay = 3600;
  /** Bat de tu choi moi thu bang 403 — gia lap Sites.Selected chua duoc cap tren site. */
  luon_403 = false;
  /** Bat de site khong co thu vien nao ten HCNS. */
  khong_co_hcns = false;

  constructor() {
    this.may = createServer((yc, ph) => {
      this.xu_ly(yc, ph).catch(() => {
        ph.writeHead(500).end('{}');
      });
    });
  }

  async bat(): Promise<void> {
    this.may.listen(0, '127.0.0.1');
    await once(this.may, 'listening');
    this.cong = (this.may.address() as AddressInfo).port;
    // `unref` PHAI co: mot may chu dang lang nghe giu vong su kien song, nen `node --test`
    // se cho mai sau khi moi bai da xong. Trieu chung la ca tep test treo va KHONG in ra
    // ket qua nao — nhin nhu mot bai bi treo chu khong nhu mot may chu chua dong.
    this.may.unref();
  }

  get goc(): string { return `http://127.0.0.1:${String(this.cong)}`; }

  /** Dat truoc mot thu muc hay tep, gia lap thu muc HCNS dang co san. */
  dat(duong_dan: string, la_thu_muc: boolean, noi_dung?: Buffer): void {
    this.kho.set(duong_dan, { la_thu_muc, noi_dung });
  }

  private async doc_than(yc: IncomingMessage): Promise<Buffer> {
    const cac: Buffer[] = [];
    for await (const k of yc) cac.push(k as Buffer);
    return Buffer.concat(cac);
  }

  private json(ph: ServerResponse, ma: number, than: unknown): void {
    const s = JSON.stringify(than);
    ph.writeHead(ma, { 'content-type': 'application/json' }).end(s);
  }

  private loi(ph: ServerResponse, ma: number, thong_diep: string): void {
    this.json(ph, ma, { error: { code: 'test', message: thong_diep } });
  }

  /** `/root:/<duong dan ma hoa>:/...` -> duong dan da giai ma. */
  private doc_duong_dan(url: string): { duong_dan: string; duoi: string } | null {
    const m = /\/root:\/([^:?]*)(?::([^?]*))?/.exec(url);
    if (m === null) return null;
    return {
      duong_dan: decodeURIComponent(m[1] ?? '').replace(/\/+$/, ''),
      duoi: (m[2] ?? '').replace(/^\//, ''),
    };
  }

  private async xu_ly(yc: IncomingMessage, ph: ServerResponse): Promise<void> {
    const url = yc.url ?? '';
    const method = yc.method ?? 'GET';
    this.goi.push({ method, url });

    // ---- token
    if (url.includes('/oauth2/v2.0/token')) {
      const than = (await this.doc_than(yc)).toString('utf8');
      const t = new URLSearchParams(than);
      if (t.get('grant_type') !== 'client_credentials') {
        return this.loi(ph, 400, 'grant_type sai');
      }
      if ((t.get('client_secret') ?? '') === '') {
        return this.json(ph, 401, { error: 'invalid_client' });
      }
      this.so_token += 1;
      return this.json(ph, 200, {
        access_token: `token-gia-${String(this.so_token)}`,
        expires_in: this.han_token_giay,
        token_type: 'Bearer',
      });
    }

    // ---- phien tai nhieu khuc (uploadUrl rieng, KHONG mang Bearer)
    if (url.startsWith('/phien-tai/')) {
      if (yc.headers.authorization !== undefined) {
        return this.loi(ph, 400, 'uploadUrl khong duoc mang Bearer token');
      }
      const id = url.slice('/phien-tai/'.length);
      const p = this.phien.get(id);
      if (p === undefined) return this.loi(ph, 404, 'khong co phien');

      if (method === 'DELETE') {
        p.da_huy = true;
        return void ph.writeHead(204).end();
      }

      const khuc = await this.doc_than(yc);
      const dai = /bytes (\d+)-(\d+)\/(\d+)/.exec(String(yc.headers['content-range'] ?? ''));
      if (dai === null) return this.loi(ph, 400, 'thieu Content-Range');
      const dau = Number(dai[1]);
      const het = Number(dai[2]);
      const tong = Number(dai[3]);

      if (het - dau + 1 !== khuc.length) {
        return this.loi(ph, 400, 'Content-Range khong khop so byte gui');
      }
      // Rang buoc 320 KiB — Graph that co rang buoc nay va thong bao loi cua no khong noi ro.
      const con_nua = het + 1 < tong;
      if (con_nua && khuc.length % (320 * 1024) !== 0) {
        return this.loi(ph, 400, 'khuc khong phai boi so cua 320 KiB');
      }

      p.khuc.push(khuc);
      if (!con_nua) {
        const day_du = Buffer.concat(p.khuc);
        this.kho.set(p.duong_dan, { la_thu_muc: false, noi_dung: day_du });
        return this.json(ph, 201, { id: `id-${p.duong_dan}`, size: day_du.length });
      }
      return this.json(ph, 202, { nextExpectedRanges: [`${String(het + 1)}-`] });
    }

    // ---- tu day tro xuong la Graph, phai co Bearer
    if (!String(yc.headers.authorization ?? '').startsWith('Bearer token-gia-')) {
      return this.loi(ph, 401, 'thieu hoac sai token');
    }
    if (this.tra_mot_lan !== null) {
      const ma = this.tra_mot_lan;
      this.tra_mot_lan = null;
      if (ma === 429) ph.setHeader('retry-after', '0');
      return this.loi(ph, ma, `gia lap ${String(ma)}`);
    }
    if (this.luon_403) return this.loi(ph, 403, 'accessDenied');

    // /sites/{id}/drives
    if (/\/sites\/[^/]+\/drives/.test(url)) {
      const ds = [
        { id: 'drive-khac', name: 'Documents', webUrl: 'https://x/sites/hcns/Shared Documents' },
        ...(this.khong_co_hcns
          ? []
          : [{ id: 'drive-hcns', name: 'HCNS', webUrl: 'https://x/sites/hcns/HCNS' }]),
      ];
      return this.json(ph, 200, { value: ds });
    }

    if (!url.startsWith('/drives/drive-hcns')) {
      return this.loi(ph, 404, `drive khong dung: ${url}`);
    }

    // POST /drives/{d}/root/children  — tao o cap cao nhat
    if (method === 'POST' && /\/root\/children/.test(url)) {
      const than = JSON.parse((await this.doc_than(yc)).toString('utf8')) as Record<string, unknown>;
      return this.tao_muc(ph, '', than);
    }

    const dd = this.doc_duong_dan(url);

    // GET /drives/{d}/root?$select=...
    if (dd === null && /\/root(\?|$)/.test(url)) {
      return this.json(ph, 200, { id: 'root', name: 'HCNS' });
    }
    if (dd === null) return this.loi(ph, 400, `url la: ${url}`);

    // POST .../children — tao trong mot thu muc cha
    if (method === 'POST' && dd.duoi.startsWith('children')) {
      if (dd.duong_dan !== '' && !this.kho.has(dd.duong_dan)) {
        return this.loi(ph, 404, `thu muc cha chua ton tai: ${dd.duong_dan}`);
      }
      const than = JSON.parse((await this.doc_than(yc)).toString('utf8')) as Record<string, unknown>;
      return this.tao_muc(ph, dd.duong_dan, than);
    }

    // POST .../createUploadSession
    if (method === 'POST' && dd.duoi.startsWith('createUploadSession')) {
      const cha = dd.duong_dan.slice(0, dd.duong_dan.lastIndexOf('/'));
      if (!this.kho.has(cha)) return this.loi(ph, 404, `thu muc cha chua ton tai: ${cha}`);
      const id = `ph${String(this.phien.size + 1)}`;
      this.phien.set(id, { duong_dan: dd.duong_dan, khuc: [], da_huy: false });
      return this.json(ph, 200, { uploadUrl: `${this.goc}/phien-tai/${id}` });
    }

    // PUT .../content — tai mot lan
    if (method === 'PUT' && dd.duoi.startsWith('content')) {
      const cha = dd.duong_dan.slice(0, dd.duong_dan.lastIndexOf('/'));
      // Graph KHONG tu tao thu muc cha.
      if (!this.kho.has(cha)) return this.loi(ph, 404, `thu muc cha chua ton tai: ${cha}`);
      const noi_dung = await this.doc_than(yc);
      const moi = !this.kho.has(dd.duong_dan);
      this.kho.set(dd.duong_dan, { la_thu_muc: false, noi_dung });
      return this.json(ph, moi ? 201 : 200, { id: `id-${dd.duong_dan}`, size: noi_dung.length });
    }

    // GET / DELETE mot muc theo duong dan
    const muc = this.kho.get(dd.duong_dan);
    if (method === 'GET') {
      if (muc === undefined) return this.loi(ph, 404, 'khong co muc');
      return this.json(ph, 200, {
        id: `id-${dd.duong_dan}`,
        name: dd.duong_dan.slice(dd.duong_dan.lastIndexOf('/') + 1),
        ...(muc.la_thu_muc ? { folder: { childCount: 0 } } : { file: { mimeType: 'x' } }),
      });
    }
    if (method === 'DELETE') {
      if (muc === undefined) return this.loi(ph, 404, 'khong co muc');
      this.kho.delete(dd.duong_dan);
      // Xoa thu muc keo theo moi thu ben trong — dung nhu SharePoint that.
      for (const k of [...this.kho.keys()]) {
        if (k.startsWith(`${dd.duong_dan}/`)) this.kho.delete(k);
      }
      return void ph.writeHead(204).end();
    }

    return this.loi(ph, 405, `khong ho tro ${method} ${url}`);
  }

  private tao_muc(ph: ServerResponse, cha: string, than: Record<string, unknown>): void {
    const ten = String(than['name'] ?? '');
    const dd = cha === '' ? ten : `${cha}/${ten}`;
    const cach = String(than['@microsoft.graph.conflictBehavior'] ?? 'fail');

    if (this.kho.has(dd)) {
      if (cach === 'fail') return this.loi(ph, 409, 'nameAlreadyExists');
      if (cach === 'replace') {
        // Dung nhu SharePoint that: thay mot thu muc la XOA sach ben trong.
        for (const k of [...this.kho.keys()]) {
          if (k.startsWith(`${dd}/`)) this.kho.delete(k);
        }
      }
    }
    this.kho.set(dd, { la_thu_muc: than['folder'] !== undefined });
    return this.json(ph, 201, { id: `id-${dd}`, name: ten });
  }
}

// ================================================================ dung client

const NHANH_201 = '01 HỒ SƠ NHÂN SỰ (201)';
const NHANH_HDLD = '02 HỢP ĐỒNG & THỎA THUẬN/02.1 [A] Quan hệ lao động – HĐLĐ';

/**
 * MOT may chu gia cho ca tep test, khong phai mot may moi cho tung bai.
 *
 * Ly do khong hien nhien va da lam 20 bai do mot luot: `cau_hinh.ts` doc `process.env` DUNG
 * MOT LAN luc nap module, va ESM thi dem module lai. Nen bai thu hai co dung `await import`
 * lai cung khong nap lai — no van tro vao cong cua may chu o bai dau, luc do da dong. Trieu
 * chung la "fetch failed" o moi bai co ra mang, va no khong lien quan gi den ma nguon.
 *
 * Doi lai, trang thai phai don giua cac bai. `lam_moi()` lam viec do.
 */
const gg = new GraphGia();
await gg.bat();

process.env['JWT_SECRET'] ??= 'khoa-kiem-thu-du-dai-de-khong-bi-tu-choi-0123456789';
process.env['SHAREPOINT_SITE_ID'] = 'site-thu';
process.env['SHAREPOINT_CLIENT_ID'] = 'app-thu';
process.env['SHAREPOINT_CLIENT_SECRET'] = 'bi-mat-thu';
process.env['SHAREPOINT_TENANT_ID'] = 'tenant-thu';
process.env['SHAREPOINT_GOC_GRAPH'] = gg.goc;
process.env['SHAREPOINT_GOC_TOKEN'] = gg.goc;

const kh = await import('../src/sharepoint/khach.ts');

process.on('exit', () => { gg.may.close(); });

/** Don sach trang thai hai ben truoc moi bai. */
function lam_moi(): void {
  gg.kho.clear();
  gg.phien.clear();
  gg.goi = [];
  gg.so_token = 0;
  gg.tra_mot_lan = null;
  gg.han_token_giay = 3600;
  gg.luon_403 = false;
  gg.khong_co_hcns = false;
  kh.quen_token();
  kh.quen_drive();
  kh.quen_thu_muc_da_co();
}

/** Dat san cac nhanh HCNS dang co that tren SharePoint. */
function dat_nhanh_san(): void {
  gg.dat(NHANH_201, true);
  gg.dat('02 HỢP ĐỒNG & THỎA THUẬN', true);
  gg.dat(NHANH_HDLD, true);
}

// ================================================================ ma hoa duong dan

test('ma hoa duong dan: giu dau / lam phan cach, ma hoa tung doan', async () => {
  lam_moi();
  const ra = kh.ma_hoa_duong_dan('a b/c&d');
  assert.equal(ra.split('/').length, 2, `dau / phai con nguyen: ${ra}`);
  assert.ok(!ra.includes('%2F'), `dau / bi ma hoa thanh %2F: ${ra}`);
  assert.equal(decodeURIComponent(ra.split('/')[0] ?? ''), 'a b');
  assert.equal(decodeURIComponent(ra.split('/')[1] ?? ''), 'c&d');
});

test('ma hoa duong dan: dau # bi ma hoa', async () => {
  // Cho de mat nhat: `#` khong ma hoa thi moi thu sau no thanh fragment, Graph nhan mot
  // duong dan bi cat ngan va tep ghi sai cho MA KHONG BAO LOI.
  lam_moi();
  const ra = kh.ma_hoa_duong_dan('QĐ #5/x.pdf');
  assert.ok(!ra.includes('#'), `dau # con nguyen: ${ra}`);
  assert.equal(ra.split('/').length, 2);
});

// ================================================================ token

test('token: dem lai, khong xin moi cho tung luot goi', async () => {
  lam_moi();
  dat_nhanh_san();
  await kh.tai_len(`${NHANH_201}/NV1-A/x - 01-01-2026.pdf`, Buffer.from('a'));
  await kh.tai_len(`${NHANH_201}/NV1-A/y - 01-01-2026.pdf`, Buffer.from('b'));
  assert.equal(gg.so_token, 1, 'phai chi xin token MOT lan cho nhieu luot day');
});

test('token: het han thi xin lai', async () => {
  lam_moi();
  dat_nhanh_san();
  // Token song 1 giay -> le an toan bi cat con nua doi (500ms) -> chi dem lai 500ms.
  //
  // Bai nay tung do vi mot le do trong ma nguon: `Math.max(60_000, song - le)` lam SAN cho
  // han, nghia la mot token bao con song 60 giay van duoc dem lai dung 60 giay — tuc la dung
  // no den qua han. Le an toan phai la LE, khong duoc thanh san.
  gg.han_token_giay = 1;
  await kh.tai_len(`${NHANH_201}/NV1-A/x - 01-01-2026.pdf`, Buffer.from('a'));
  const lan_dau = gg.so_token;
  await new Promise((ok) => setTimeout(ok, 600));
  await kh.tai_len(`${NHANH_201}/NV1-A/y - 01-01-2026.pdf`, Buffer.from('b'));
  assert.ok(gg.so_token > lan_dau,
    'token da qua han ma van dem lai — le an toan dang lam san thay vi lam le');
});

test('token: xin song song chi mo MOT yeu cau', async () => {
  lam_moi();
  dat_nhanh_san();
  await Promise.all([
    kh.tai_len(`${NHANH_201}/NV1-A/a - 01-01-2026.pdf`, Buffer.from('1')),
    kh.tai_len(`${NHANH_201}/NV1-A/b - 01-01-2026.pdf`, Buffer.from('2')),
    kh.tai_len(`${NHANH_201}/NV1-A/c - 01-01-2026.pdf`, Buffer.from('3')),
  ]);
  assert.equal(gg.so_token, 1, 'ba luot day song song phai dung chung mot token');
});

// ================================================================ drive

test('drive: tim thu vien theo ten, khong lay thu vien dau tien', async () => {
  // Site nao cung co "Documents"; lay bua thu vien dau tien la day ho so vao dung cho sai.
  lam_moi();
  assert.equal(await kh.lay_drive_id(), 'drive-hcns');
});

test('drive: khong co thu vien dung ten thi bao loi liet ke thu vien dang co', async () => {
  lam_moi();
  gg.khong_co_hcns = true;
  await assert.rejects(() => kh.lay_drive_id(), /Documents/);
});

// ================================================================ tao thu muc

test('tao thu muc: nhanh da co thi 409 va coi la xong, KHONG xoa gi ben trong', async () => {
  lam_moi();
  dat_nhanh_san();
  // Mot tep do NGUOI KHAC xep tay vao nhanh 02.1.
  gg.dat(`${NHANH_HDLD}/tep-cua-nguoi-khac.pdf`, false, Buffer.from('quan trong'));

  await kh.bao_dam_thu_muc(`${NHANH_HDLD}/NV1-A`);

  assert.ok(gg.kho.has(`${NHANH_HDLD}/tep-cua-nguoi-khac.pdf`),
    'tep cua nguoi khac bi xoa — conflictBehavior chac chan dang la replace, khong phai fail');
  assert.ok(gg.kho.has(`${NHANH_HDLD}/NV1-A`), 'chua tao thu muc nhan vien');
});

test('tao thu muc: tao tu tren xuong khi cap tren chua co', async () => {
  lam_moi();
  // Khong dat san gi ca: client phai tao ca `02 ...`, `02 .../02.1 ...`, roi den `NV1-A`.
  await kh.bao_dam_thu_muc(`${NHANH_HDLD}/NV1-A`);
  assert.ok(gg.kho.has('02 HỢP ĐỒNG & THỎA THUẬN'), 'thieu cap 1');
  assert.ok(gg.kho.has(NHANH_HDLD), 'thieu cap 2');
  assert.ok(gg.kho.has(`${NHANH_HDLD}/NV1-A`), 'thieu cap 3');
});

test('tao thu muc: khong goi lai Graph cho nguoi da tao roi', async () => {
  lam_moi();
  dat_nhanh_san();
  await kh.bao_dam_thu_muc(`${NHANH_201}/NV1-A`);
  const sau_lan_dau = gg.goi.length;
  await kh.bao_dam_thu_muc(`${NHANH_201}/NV1-A`);
  assert.equal(gg.goi.length, sau_lan_dau, 'goi lai Graph cho thu muc da biet la co');
});

test('tao thu muc: TU CHOI duong dan ngoai pham vi', async () => {
  lam_moi();
  for (const xau of [
    '05 CHẤM CÔNG – NGHỈ PHÉP/NV1-A',
    'Shared Documents/NV1-A',
    `${NHANH_201}/NV1-A/2026`,
    `${NHANH_201}/../x`,
  ]) {
    await assert.rejects(() => kh.bao_dam_thu_muc(xau), /Từ chối/, `nhan sai: ${xau}`);
  }
  assert.equal(gg.goi.length, 0, 'da goi Graph truoc khi kiem hang rao');
});

// ================================================================ tai len

test('tai len: tu tao thu muc cha, khong doi tang goi phai nho', async () => {
  lam_moi();
  dat_nhanh_san();
  const dd = `${NHANH_201}/NV1-A/CCCD - A - 01-01-2026.pdf`;
  const kq = await kh.tai_len(dd, Buffer.from('noi dung'));
  assert.equal(kq.duong_dan, dd);
  assert.equal(kq.nhieu_khuc, false);
  assert.equal(gg.kho.get(dd)?.noi_dung?.toString('utf8'), 'noi dung');
});

test('tai len: ghi de ban cu (dong bo mot chieu, ban tren dia la ban goc)', async () => {
  lam_moi();
  dat_nhanh_san();
  const dd = `${NHANH_201}/NV1-A/CCCD - A - 01-01-2026.pdf`;
  await kh.tai_len(dd, Buffer.from('ban 1'));
  await kh.tai_len(dd, Buffer.from('ban 2'));
  assert.equal(gg.kho.get(dd)?.noi_dung?.toString('utf8'), 'ban 2');
});

test('tai len: ten co dau va ky tu & di dung cho', async () => {
  lam_moi();
  dat_nhanh_san();
  const dd = `${NHANH_HDLD}/NV1-HOÀNG MINH NGỌC/HĐLĐ SỐ 07 - Hoàng Minh Ngọc - 18-08-2026.pdf`;
  await kh.tai_len(dd, Buffer.from('x'));
  assert.ok(gg.kho.has(dd),
    `tep khong nam o duong dan da yeu cau. Cac khoa dang co: ${[...gg.kho.keys()].join(' | ')}`);
});

test('tai len: TU CHOI ghi ngoai pham vi, va tu choi TRUOC khi goi Graph', async () => {
  lam_moi();
  for (const xau of [
    '05 CHẤM CÔNG – NGHỈ PHÉP/NV1-A/x.pdf',
    `${NHANH_201}/x.pdf`,
    `${NHANH_201}/NV1-A/2026/x.pdf`,
    `${NHANH_201}/NV1-A/x:y.pdf`,
  ]) {
    await assert.rejects(() => kh.tai_len(xau, Buffer.from('x')), /Từ chối/, `nhan sai: ${xau}`);
  }
  assert.equal(gg.goi.length, 0, 'da goi Graph truoc khi kiem hang rao');
});

// ================================================================ tep lon

test('tep lon: mo phien nhieu khuc, moi khuc la boi so 320 KiB', async () => {
  lam_moi();
  dat_nhanh_san();
  const dd = `${NHANH_201}/NV1-A/HỒ SƠ - A - 01-01-2026.pdf`;
  // Lon hon nguong 4 MB, va co du ra mot khuc le o cuoi.
  const to = Buffer.alloc(kh.NGUONG_TEP_LON + kh.KHUC_TAI + 12_345, 7);

  const kq = await kh.tai_len(dd, to);
  assert.equal(kq.nhieu_khuc, true, 'tep lon ma van tai mot lan');
  assert.equal(kq.so_byte, to.length);

  const tren_may = gg.kho.get(dd)?.noi_dung;
  assert.ok(tren_may !== undefined, 'khong co tep tren may chu gia');
  assert.equal(tren_may.length, to.length, 'so byte khong khop — ghep khuc sai');
  assert.ok(tren_may.equals(to), 'noi dung khong khop — thu tu khuc sai');
});

test('tep lon: khuc dung boi so 320 KiB (rang buoc that cua Graph)', async () => {
  assert.equal(320 * 1024 * 10, 3_276_800);
  lam_moi();
  assert.equal(kh.KHUC_TAI % (320 * 1024), 0,
    'KHUC_TAI phai la boi so cua 320 KiB, khong thi Graph tu choi phien tai');
});

test('tep lon: nguong dung 4 MB, duoi nguong thi PUT mot lan', async () => {
  lam_moi();
  dat_nhanh_san();
  const dd = `${NHANH_201}/NV1-A/HỒ SƠ - A - 01-01-2026.pdf`;
  const kq = await kh.tai_len(dd, Buffer.alloc(kh.NGUONG_TEP_LON, 1));
  assert.equal(kq.nhieu_khuc, false, 'dung nguong ma da mo phien nhieu khuc');
  assert.equal(gg.phien.size, 0);
});

// ================================================================ xoa

test('xoa: xoa duoc tep trong pham vi', async () => {
  lam_moi();
  dat_nhanh_san();
  const dd = `${NHANH_201}/NV1-A/CCCD - A - 01-01-2026.pdf`;
  await kh.tai_len(dd, Buffer.from('x'));
  assert.equal(await kh.xoa(dd), true);
  assert.equal(gg.kho.has(dd), false);
});

test('xoa: tep khong co thi tra false, khong nem loi', async () => {
  // Xoa hai lan la chuyen binh thuong khi mot luot dong bo chay lai. Nem loi o day se lam
  // ca luot quet dung lai vi mot viec da xong tu truoc.
  lam_moi();
  dat_nhanh_san();
  assert.equal(await kh.xoa(`${NHANH_201}/NV1-A/khong-ton-tai - 01-01-2026.pdf`), false);
});

test('xoa: TU CHOI xoa mot thu muc', async () => {
  // Hang rao quan trong nhat cua ham xoa. `DELETE` mot thu muc tren SharePoint keo theo moi
  // tep ben trong, ke ca tep do nguoi khac dat vao.
  lam_moi();
  dat_nhanh_san();
  gg.dat(`${NHANH_201}/NV1-A`, true);
  gg.dat(`${NHANH_201}/NV1-A/cua-nguoi-khac.pdf`, false, Buffer.from('quan trong'));

  // Duong dan ba cap tro vao mot THU MUC — hang rao duong dan khong bat duoc, phai kiem
  // kieu doi tuong.
  gg.dat(`${NHANH_201}/NV1-A/thu-muc-con`, true);
  await assert.rejects(
    () => kh.xoa(`${NHANH_201}/NV1-A/thu-muc-con`), /thư mục/,
    'da xoa mot thu muc',
  );
  assert.ok(gg.kho.has(`${NHANH_201}/NV1-A/cua-nguoi-khac.pdf`));
});

test('xoa: TU CHOI duong dan ngoai pham vi', async () => {
  lam_moi();
  for (const xau of [
    '05 CHẤM CÔNG – NGHỈ PHÉP/NV1-A/x.pdf',
    `${NHANH_201}/NV1-A`,
    NHANH_201,
    `${NHANH_201}/NV1-A/../../x.pdf`,
  ]) {
    await assert.rejects(() => kh.xoa(xau), /Từ chối/, `nhan sai: ${xau}`);
  }
  assert.equal(gg.goi.length, 0, 'da goi Graph truoc khi kiem hang rao');
});

// ================================================================ loi va thu lai

test('429: cho theo Retry-After roi thu lai, khong bo cuoc', async () => {
  lam_moi();
  dat_nhanh_san();
  gg.tra_mot_lan = 429;
  const dd = `${NHANH_201}/NV1-A/CCCD - A - 01-01-2026.pdf`;
  await kh.bao_dam_thu_muc(`${NHANH_201}/NV1-A`);
  await kh.tai_len(dd, Buffer.from('x'));
  assert.ok(gg.kho.has(dd), 'bo cuoc khi bi chan luu luong');
});

test('503: thu lai', async () => {
  lam_moi();
  dat_nhanh_san();
  gg.tra_mot_lan = 503;
  assert.equal(await kh.lay_drive_id(), 'drive-hcns');
});

test('403: thong diep chi dung nguyen nhan that (Sites.Selected chua cap tren site)', async () => {
  // Trang thai nay rat de gap va rat de doan sai thanh "sai client secret". Thong diep phai
  // dan nguoi doc den dung cho.
  lam_moi();
  gg.luon_403 = true;
  await assert.rejects(() => kh.lay_drive_id(), /Sites\.Selected/);
});

test('thu ket noi: khong nem loi, tra ly do doc duoc', async () => {
  lam_moi();
  const ok = await kh.thu_ket_noi();
  assert.equal(ok.ok, true, ok.thong_diep);
  assert.equal(ok.drive_id, 'drive-hcns');

  gg.luon_403 = true;
  kh.quen_drive();
  const xau = await kh.thu_ket_noi();
  assert.equal(xau.ok, false);
  assert.match(xau.thong_diep, /Sites\.Selected/);
});

test('thong diep loi KHONG chua client secret hay token', async () => {
  lam_moi();
  gg.luon_403 = true;
  let td = '';
  try {
    await kh.lay_drive_id();
  } catch (loi) {
    td = String((loi as Error).message);
  }
  assert.notEqual(td, '');
  assert.ok(!td.includes('bi-mat-thu'), 'thong diep loi co client secret trong do');
  assert.ok(!td.includes('token-gia'), 'thong diep loi co access token trong do');
});

// ================================================================ hang rao goc

test('goc an toan: chi nhan dung hai ten may cua Microsoft', async () => {
  lam_moi();
  const G = 'https://graph.microsoft.com/v1.0';
  const T = 'https://login.microsoftonline.com';
  assert.equal(kh.goc_an_toan(G, T), true);

  // Tien to dung nhung TEN MAY khac — day la kieu do de nhat.
  assert.equal(kh.goc_an_toan('https://graph.microsoft.com.ke-tan-cong.vn/v1.0', T), false);
  assert.equal(kh.goc_an_toan(G, 'https://login.microsoftonline.com.xx.vn'), false);
  // http tran, khong TLS.
  assert.equal(kh.goc_an_toan('http://graph.microsoft.com/v1.0', T), false);
  assert.equal(kh.goc_an_toan('http://127.0.0.1:1234', T), false);
  assert.equal(kh.goc_an_toan('khong-phai-url', T), false);
});

// ================================================================ thu muc cha cua nhanh con

test('client TU CHOI ghi thang vao thu muc cha cua mot nhanh con', async () => {
  // `05 CHẤM CÔNG – NGHỈ PHÉP` va `06 TUYỂN DỤNG & THỬ VIỆC` la thu muc CHA. Ho so cua he
  // thong nam trong cac thu muc CON (05.1, 05.2, 06.1, 06.2), khong nam thang trong cha.
  //
  // Hai thu muc cha nay dang co nguoi dung that. Ghi thang vao do la tho mot tep vao giua khu
  // vuc cua nguoi khac, va lan xoa lan theo se khong biet no la cua ai.
  //
  // Kiem ca `gg.goi.length === 0`: tu choi phai xay ra TRUOC khi noi voi Graph.
  for (const cha of ['05 CHẤM CÔNG – NGHỈ PHÉP', '06 TUYỂN DỤNG & THỬ VIỆC']) {
    lam_moi();
    const tep = `${cha}/NV1-A/x - 01-01-2026.pdf`;
    await assert.rejects(() => kh.tai_len(tep, Buffer.from('x')), /Từ chối/, `ghi duoc: ${cha}`);
    await assert.rejects(() => kh.xoa(tep), /Từ chối/, `xoa duoc: ${cha}`);
    await assert.rejects(() => kh.bao_dam_thu_muc(`${cha}/NV1-A`), /Từ chối/, `tao duoc: ${cha}`);
    assert.equal(gg.goi.length, 0, `da goi Graph cho thu muc cha: ${cha}`);
  }
});

test('client ghi duoc vao nhanh con 06.1 / 06.2 (da xac minh ten tren SharePoint that)', async () => {
  const { NHANH } = await import('../src/sharepoint/anh_xa.ts');
  for (const n of [NHANH.tuyen_dung_cv, NHANH.danh_gia_thu_viec]) {
    lam_moi();
    gg.dat('06 TUYỂN DỤNG & THỬ VIỆC', true);
    gg.dat(n, true);
    const tep = `${n}/NV015-NGUYEN VAN A/CV - Nguyễn Văn A - 01-01-2026.pdf`;
    const kq = await kh.tai_len(tep, Buffer.from('x'));
    assert.equal(kq.duong_dan, tep);
    assert.ok(gg.kho.has(tep),
      `tep khong nam dung cho. Cac khoa: ${[...gg.kho.keys()].join(' | ')}`);
  }
});
