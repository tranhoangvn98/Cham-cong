// Lenh doi chieu bang NHANH voi cay thu muc that tren SharePoint.
//
// Hai lop kiem, va can ca hai:
//
//   1. Cay thu muc GIA thuan (`doc` la mot ham tra ve muc con) — kiem logic doi chieu: tim
//      dung doan lech, tim ten gan giong, chi ra dung ma ky tu khac nhau. Khong can mang.
//   2. May chu GRAPH GIA — kiem `liet_ke()` goi Graph dung duong, phan trang dung, va 404
//      khong thanh loi. Lop nay bat duoc kieu hong ma lop 1 khong the: goi sai duong dan API.
//
// Bai quan trong nhat cua ca tep: mot nhanh lech DUNG MOT KY TU (gach ngang dai thanh gach
// ngang thuong) PHAI bao thieu, va phai in ra ma Unicode cua ca hai ky tu. Do la kieu lech
// duy nhat da tung xay ra that, va la kieu ma mat nguoi khong doc ra tren man hinh.
//
// MOI THU TU src ĐEU NAP BANG `await import`, KHONG PHAI `import` o dau tep. Ly do: `cau_hinh.ts`
// doc `process.env` DUNG MOT LAN luc nap module, con cong cua may chu gia thi chi biet duoc
// sau khi da `listen`. Import tinh bi hoisted len truoc moi cau lenh, nen no nap `cau_hinh`
// truoc khi co gi de khai — va trieu chung la "chua cau hinh SharePoint" o moi bai co ra mang.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { TenNhanh } from '../src/sharepoint/anh_xa.ts';
import type { DocThuMuc } from '../src/sharepoint/kiem_nhanh.ts';

// ================================================================ may chu Graph gia

/**
 * Graph gia toi thieu, chi du cho `liet_ke`: token, /drives, va `.../children` co PHAN TRANG.
 *
 * Rieng tep test nay dung may rieng thay vi dung lai may trong sharepoint_khach.test.ts: hai
 * tep test la hai tien trinh khac nhau khi chay `node --test`, nen khong chia se duoc gi.
 */
class GraphGia {
  may: Server;
  cong = 0;
  /** duong dan -> la thu muc. */
  kho = new Map<string, boolean>();
  goi: string[] = [];
  /** So muc moi trang — dat nho de bat duoc loi khong di theo nextLink. */
  moi_trang = 200;
  /** nextLink tro ra ngoai goc Graph — gia lap phan hoi bi sua. */
  next_ra_ngoai = false;

  constructor() {
    this.may = createServer((yc, ph) => { this.xu_ly(yc, ph); });
  }

  async bat(): Promise<void> {
    this.may.listen(0, '127.0.0.1');
    await once(this.may, 'listening');
    this.cong = (this.may.address() as AddressInfo).port;
    // `unref` PHAI co, khong thi `node --test` cho mai sau khi moi bai da xong.
    this.may.unref();
  }

  get goc(): string { return `http://127.0.0.1:${String(this.cong)}`; }

  private json(ph: ServerResponse, ma: number, than: unknown): void {
    ph.writeHead(ma, { 'content-type': 'application/json' }).end(JSON.stringify(than));
  }

  private xu_ly(yc: IncomingMessage, ph: ServerResponse): void {
    const url = yc.url ?? '';
    this.goi.push(url);

    if (url.includes('/oauth2/v2.0/token')) {
      return this.json(ph, 200, { access_token: 'tk', expires_in: 3600 });
    }
    if (/\/sites\/[^/]+\/drives/.test(url)) {
      return this.json(ph, 200, { value: [{ id: 'drive-hcns', name: 'HCNS' }] });
    }

    // `/root/children` (goc thu vien) hoac `/root:/<dd>:/children`
    let cha: string | null = null;
    const m = /\/root:\/([^:]*):\/children/.exec(url);
    if (m !== null) cha = decodeURIComponent(m[1] ?? '');
    else if (/\/root\/children/.test(url)) cha = '';

    if (cha === null) {
      // `name` cua muc goc la `"root"` — hanh vi that cua Graph. Ten THU VIEN nam o
      // `GET /drives/{id}`, khong nam o day.
      if (/\/root(\?|$)/.test(url)) return this.json(ph, 200, { id: 'root', name: 'root' });
      if (/^\/drives\/drive-hcns(\?|$)/.test(url)) {
        return this.json(ph, 200, {
          id: 'drive-hcns', name: 'HCNS', webUrl: 'https://x/sites/hcns/HCNS',
        });
      }
      return this.json(ph, 400, { error: { message: `url la ${url}` } });
    }
    if (cha !== '' && !this.kho.has(cha)) {
      return this.json(ph, 404, { error: { code: 'itemNotFound', message: 'khong co' } });
    }

    const tien_to = cha === '' ? '' : `${cha}/`;
    const con = [...this.kho.entries()]
      .filter(([d]) => d.startsWith(tien_to) && d !== cha)
      .filter(([d]) => !d.slice(tien_to.length).includes('/'))
      .map(([d, la_tm]) => ({
        name: d.slice(tien_to.length),
        ...(la_tm ? { folder: { childCount: 0 } } : { file: { mimeType: 'x' } }),
      }));

    const bo = Number(new URL(url, 'http://x').searchParams.get('$skiptoken') ?? '0');
    const lat = con.slice(bo, bo + this.moi_trang);
    const con_nua = bo + this.moi_trang < con.length;
    const goc_next = this.next_ra_ngoai ? 'http://ke-tan-cong.vn' : this.goc;

    return this.json(ph, 200, {
      value: lat,
      ...(con_nua
        ? {
          '@odata.nextLink': `${goc_next}${url.replace(/&?\$skiptoken=\d+/, '')}`
            + `&$skiptoken=${String(bo + this.moi_trang)}`,
        }
        : {}),
    });
  }
}

const gg = new GraphGia();
await gg.bat();

process.env['JWT_SECRET'] ??= 'khoa-kiem-thu-du-dai-de-khong-bi-tu-choi-0123456789';
process.env['SHAREPOINT_SITE_ID'] = 'site-thu';
process.env['SHAREPOINT_CLIENT_ID'] = 'app-thu';
process.env['SHAREPOINT_CLIENT_SECRET'] = 'bi-mat-thu';
process.env['SHAREPOINT_TENANT_ID'] = 'tenant-thu';
process.env['SHAREPOINT_GOC_GRAPH'] = gg.goc;
process.env['SHAREPOINT_GOC_TOKEN'] = gg.goc;

const { NHANH } = await import('../src/sharepoint/anh_xa.ts');
const kh = await import('../src/sharepoint/khach.ts');
const {
  dang_so_sanh, khac_o, kiem_cac_nhanh, kiem_mot_nhanh, tim_gan_giong,
} = await import('../src/sharepoint/kiem_nhanh.ts');

process.on('exit', () => { gg.may.close(); });

// ================================================================ cay thu muc gia

/** Dung `doc` tu mot danh sach duong dan thu muc (va tep, khi cho `tep`). */
function cay(thu_muc: readonly string[], tep: readonly string[] = []): DocThuMuc {
  const co = new Set([...thu_muc, ...tep]);
  return async (duong_dan) => {
    if (duong_dan !== '' && !co.has(duong_dan)) return null;
    const tien_to = duong_dan === '' ? '' : `${duong_dan}/`;
    const con = [...co]
      .filter((d) => d.startsWith(tien_to) && d.slice(tien_to.length).split('/').length === 1)
      .filter((d) => d !== duong_dan);
    return con.map((d) => ({
      ten: d.slice(tien_to.length),
      la_thu_muc: !tep.includes(d),
    }));
  };
}

/** Moi doan cua moi nhanh, dung de dung mot cay "khop hoan toan". */
function moi_cap(): string[] {
  const ra = new Set<string>();
  for (const dd of Object.values(NHANH)) {
    const doan = dd.split('/');
    doan.forEach((_, i) => ra.add(doan.slice(0, i + 1).join('/')));
  }
  return [...ra];
}

// ================================================================ so sanh ten

test('dang so sanh: bo nhung khac biet mat nguoi khong thay', () => {
  const goc = '02.1 [A] Quan hệ lao động – HĐLĐ';
  // Gach ngang thuong thay gach ngang dai.
  assert.equal(dang_so_sanh(goc), dang_so_sanh('02.1 [A] Quan hệ lao động - HĐLĐ'));
  // Gach ngang em (Word tu doi).
  assert.equal(dang_so_sanh(goc), dang_so_sanh('02.1 [A] Quan hệ lao động — HĐLĐ'));
  // HOA/thuong, dau cach doi, dau cach o dau/cuoi.
  assert.equal(dang_so_sanh(goc), dang_so_sanh('  02.1 [a] QUAN HỆ  lao động – hđlđ '));
  // NFD — ten tao tu may Mac.
  assert.equal(dang_so_sanh(goc), dang_so_sanh(goc.normalize('NFD')));
});

test('dang so sanh: KHONG lam hai nhanh khac nhau trung nhau', () => {
  // Neu chuan hoa qua manh thi `tim_gan_giong` se chi sang mot nhanh khac va nguoi doc se sua
  // bang NHANH theo mot ten sai.
  const dang = Object.values(NHANH).map((n) => n.split('/').map(dang_so_sanh));
  // Cac doan cha trung nhau la binh thuong (02 xuat hien 2 lan), nen chi kiem doan CUOI.
  const cuoi = dang.map((d) => d[d.length - 1] ?? '');
  assert.equal(new Set(cuoi).size, cuoi.length,
    `co hai nhanh trung nhau sau chuan hoa: ${cuoi.join(' | ')}`);
});

test('tim gan giong: tra ten THAT, khong tra ten mong doi', () => {
  const that = '02.1 [A] Quan hệ lao động - HĐLĐ';
  const ra = tim_gan_giong('02.1 [A] Quan hệ lao động – HĐLĐ', ['x', that, 'y']);
  assert.equal(ra, that, 'phai tra chuoi lay tu SharePoint de sao lai duoc');
});

test('tim gan giong: khong co cai nao gan thi tra null', () => {
  assert.equal(tim_gan_giong('01 HỒ SƠ NHÂN SỰ (201)', ['General', 'Đính kèm']), null);
});

test('khac o: chi ra dung ky tu va MA Unicode cua no', () => {
  const ra = khac_o('a – b', 'a - b');
  assert.ok(ra !== null);
  assert.match(ra, /U\+2013/, `khong in ma ky tu mong doi: ${ra}`);
  assert.match(ra, /U\+002D/, `khong in ma ky tu that: ${ra}`);
  assert.match(ra, /thứ 3/, `khong chi dung vi tri: ${ra}`);
});

test('khac o: giong het thi null', () => {
  assert.equal(khac_o('01 HỒ SƠ NHÂN SỰ (201)', '01 HỒ SƠ NHÂN SỰ (201)'), null);
});

test('khac o: ten that dai hon / ngan hon', () => {
  assert.match(String(khac_o('07 ĐÀO TẠO', '07 ĐÀO TẠO & ĐÁNH GIÁ')), /DÀI hơn/);
  assert.match(String(khac_o('07 ĐÀO TẠO & ĐÁNH GIÁ', '07 ĐÀO TẠO')), /NGẮN hơn/);
});

// ================================================================ kiem mot nhanh

test('cay khop hoan toan: moi nhanh deu OK', async () => {
  const bc = await kiem_cac_nhanh(cay(moi_cap()));
  assert.equal(bc.so_thieu, 0,
    bc.ket_qua.filter((k) => !k.co).map((k) => k.duong_dan).join(' | '));
  assert.equal(bc.so_loi, 0);
  assert.equal(bc.so_co, Object.keys(NHANH).length);
});

test('lech DUNG MOT KY TU (gach ngang dai) thi bao thieu, khong bao OK', async () => {
  // Kieu lech duy nhat da tung xay ra that, va kieu ma mat nguoi khong doc ra tren man hinh.
  // Neu bai nay xanh khi ten lech thi ca lenh nay vo dung.
  const that = NHANH.hdld.replace('–', '-');
  const bc = await kiem_cac_nhanh(cay([...moi_cap().filter((d) => d !== NHANH.hdld), that]));

  const k = bc.ket_qua.find((x) => x.khoa === 'hdld');
  assert.ok(k !== undefined);
  assert.equal(k.co, false, 'ten lech mot ky tu ma van bao OK');
  assert.equal(k.gan_giong, that.split('/')[1], 'khong chi ra ten that de sao lai');
  assert.match(String(k.khac), /U\+2013/);
  assert.match(String(k.khac), /U\+002D/);
  assert.equal(bc.so_thieu, 1, 'chi duoc mot nhanh thieu');
});

test('thieu o cap CHA thi bao dung cap cha, khong bao cap con', async () => {
  // `02 HỢP ĐỒNG & THỎA THUẬN` la thu muc cha cua hai nhanh. Neu doi ten no thi ca hai nhanh
  // lech, va cho lech nam o CAP MOT — bao "khong thay 02.1 ..." la chi sai cho.
  const cha = '02 HỢP ĐỒNG & THỎA THUẬN';
  const bc = await kiem_cac_nhanh(cay(moi_cap().filter((d) => !d.startsWith(cha))));

  const k = bc.ket_qua.find((x) => x.khoa === 'hdld');
  assert.ok(k !== undefined);
  assert.equal(k.thieu_doan, cha, 'chi sai cap — phai la cap cha');
  assert.equal(k.cha, '', 'cha cua cap mot la goc thu vien');
  assert.equal(bc.so_thieu, 2, 'ca hai nhanh duoi 02 phai bao thieu');
});

test('co TEP dung ten thay vi thu muc thi bao thieu, va noi ro la tep', async () => {
  const bc = await kiem_cac_nhanh(cay(
    moi_cap().filter((d) => d !== NHANH.dao_tao_danh_gia),
    [NHANH.dao_tao_danh_gia],
  ));
  const k = bc.ket_qua.find((x) => x.khoa === 'dao_tao_danh_gia');
  assert.ok(k !== undefined);
  assert.equal(k.co, false, 'mot TEP cung ten duoc tinh la nhanh co that');
  assert.equal(k.la_tep, true);
});

test('nhanh OK thi khong keo theo danh sach anh em', async () => {
  const bc = await kiem_cac_nhanh(cay(moi_cap()));
  assert.equal(bc.ket_qua.every((k) => k.anh_em.length === 0), true,
    'anh_em chi duoc dien khi THIEU — dien ca khi OK la in ra hang tram dong vo ich');
});

test('liet ke nem loi thi bao LOI, khong bao THIEU', async () => {
  // 403 (Sites.Selected chua cap) khac han "thu muc khong co". Gom hai thu vao mot la day
  // nguoi doc di doi ten thu muc trong khi van de la quyen.
  const doc: DocThuMuc = async () => {
    throw Object.assign(new Error('x'), { thong_diep_cong_khai: 'SharePoint từ chối (403).' });
  };
  const bc = await kiem_cac_nhanh(doc);
  assert.equal(bc.so_loi, Object.keys(NHANH).length);
  assert.equal(bc.so_thieu, 0);
  assert.match(String(bc.ket_qua[0]?.loi), /403/);
});

test('khong goi lai Graph cho cung mot thu muc cha', async () => {
  // 16 nhanh nhung chi 7 thu muc cha. Goi 16 lan cho cung mot goc la tu di toi gioi han luu
  // luong cua Microsoft khong vi ly do gi.
  const dem: string[] = [];
  const goc = cay(moi_cap());
  await kiem_cac_nhanh(async (dd) => { dem.push(dd); return goc(dd); });

  assert.equal(dem.length, new Set(dem).size, `co thu muc bi doc lai: ${dem.join(' | ')}`);
  assert.ok(dem.length <= 8, `doc ${String(dem.length)} thu muc cho 16 nhanh — chua nho lai`);
});

test('kiem mot nhanh: dung duoc rieng cho mot nhanh', async () => {
  const k = await kiem_mot_nhanh('ho_so_201' as TenNhanh, cay(moi_cap()));
  assert.equal(k.co, true);
  assert.equal(k.duong_dan, NHANH.ho_so_201);
});

// ================================================================ qua Graph that (may gia)

/** Dung lai trang thai hai ben, va nap san mot cay thu muc. */
function dat_cay(thu_muc: readonly string[], tep: readonly string[] = []): void {
  gg.kho.clear();
  gg.goi = [];
  gg.moi_trang = 200;
  gg.next_ra_ngoai = false;
  kh.quen_token();
  kh.quen_drive();
  for (const d of thu_muc) gg.kho.set(d, true);
  for (const d of tep) gg.kho.set(d, false);
}

test('liet ke qua Graph: doc duoc goc thu vien', async () => {
  dat_cay(moi_cap());
  const con = await kh.liet_ke('');
  assert.ok(con !== null);
  assert.ok(con.some((c) => c.ten === '01 HỒ SƠ NHÂN SỰ (201)'), JSON.stringify(con));
  assert.ok(con.every((c) => c.la_thu_muc));
});

test('liet ke qua Graph: thu muc khong co thi tra null, KHONG nem loi', async () => {
  dat_cay([]);
  assert.equal(await kh.liet_ke('khong-he-co'), null);
});

test('liet ke qua Graph: ten co dau / & / ( ) di dung duong', async () => {
  dat_cay(['02 HỢP ĐỒNG & THỎA THUẬN', NHANH.hdld]);
  const con = await kh.liet_ke('02 HỢP ĐỒNG & THỎA THUẬN');
  assert.deepEqual(con?.map((c) => c.ten), [NHANH.hdld.split('/')[1]]);
});

test('liet ke qua Graph: phan biet TEP va thu muc', async () => {
  dat_cay(['A'], ['A/x.pdf']);
  const con = await kh.liet_ke('A');
  assert.deepEqual(con, [{ ten: 'x.pdf', la_thu_muc: false }]);
});

test('liet ke qua Graph: di theo nextLink, khong bo mat trang sau', async () => {
  dat_cay(Array.from({ length: 7 }, (_, i) => `tm-${String(i)}`));
  gg.moi_trang = 2;
  const con = await kh.liet_ke('');
  assert.equal(con?.length, 7, `bo mat trang sau: chi lay duoc ${String(con?.length)} muc`);
});

test('liet ke qua Graph: KHONG di theo nextLink tro ra ngoai goc Graph', async () => {
  // nextLink den tu PHAN HOI. Di theo mot cach mu la gui Bearer token cua ung dung den bat ky
  // may nao URL do tro tOi.
  dat_cay(Array.from({ length: 5 }, (_, i) => `tm-${String(i)}`));
  gg.moi_trang = 2;
  gg.next_ra_ngoai = true;
  await assert.rejects(() => kh.liet_ke(''), /nextLink/);
});

test('kiem cac nhanh qua Graph: cay khop thi khong nhanh nao thieu', async () => {
  dat_cay(moi_cap());
  const bc = await kiem_cac_nhanh();
  assert.equal(bc.so_thieu, 0, bc.ket_qua.filter((k) => !k.co)
    .map((k) => `${k.duong_dan} <- ${k.thieu_doan ?? ''}`).join(' | '));
  assert.equal(bc.so_loi, 0);
});

test('kiem cac nhanh qua Graph: thu vien SAI thi moi nhanh deu thieu', async () => {
  // Trang thai da tung xay ra that: `SHAREPOINT_DRIVE_ID` tro vao thu vien MAC DINH cua site
  // ("Tài liệu") thay vi HCNS. Thu vien do chi co `General` va `Đính kèm`.
  dat_cay(['General', 'Đính kèm']);
  const bc = await kiem_cac_nhanh();
  assert.equal(bc.so_co, 0);
  assert.equal(bc.so_thieu, Object.keys(NHANH).length);
  assert.equal(bc.ket_qua[0]?.gan_giong, null, 'khong duoc chi bua sang General / Đính kèm');
});
