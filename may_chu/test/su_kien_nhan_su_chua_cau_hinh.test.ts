// CHUA khai `CONG_SU_KIEN_URL` thi su kien nhan su NAM LAI trong hop thu — khong bi danh dau da gui.
//
// VI SAO LA MOT TEP RIENG
//
// `cau_hinh` doc bien moi truong MOT LAN luc import va dong bang lai. Muon kiem hanh vi khi
// thieu cau hinh thi phai la mot tien trinh khac, voi moi truong khac. Nhet vao tep kia bang
// cach ghi de `cau_hinh` luc chay la kiem mot vat da bi sua, khong phai kiem san pham.
//
// VI SAO DANG KIEM
//
// Day la cho de mat du lieu nhat trong ca duong day. `day_hop_thu_di` truoc day mo dau bang
// `if (cau_hinh.erp.webhook_url === '') return 0;` — mot dong hop ly khi chi co mot dich. Voi
// hai dich, dat nham cho la: nhan su cho mot nguoi nghi viec, Cham cong khoa tai khoan cua ho,
// con cong KHONG BAO GIO biet — nguoi do van dang nhap duoc vao moi phan he khac trong cum.
//
// Va no hong IM LANG: khong loi, khong canh bao, `hop_thu_di` van sach vi dong da bi danh dau
// da gui. Chi doc CSDL ben cong moi thay.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

// ERP CO cau hinh, CONG thi KHONG. Day dung la trang thai cua production hom nay, va la trang
// thai he thong se o trong suot quang giua hai lan trien khai.
const da_nhan_erp: string[] = [];
const erp_gia = createServer((req: IncomingMessage, res: ServerResponse) => {
  let than = '';
  req.on('data', (c) => (than += String(c)));
  req.on('end', () => {
    da_nhan_erp.push(than);
    res.writeHead(200).end('{}');
  });
});
await new Promise<void>((xong) => erp_gia.listen(0, '127.0.0.1', xong));

process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['ERP_WEBHOOK_URL'] = `http://127.0.0.1:${(erp_gia.address() as AddressInfo).port}/hook`;
process.env['CONG_SU_KIEN_URL'] = '';
process.env['CONG_SSO_GOC'] = '';
process.env['CONG_TOKEN_DICH_VU'] = '';
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

/** Xem chu thich day du o `su_kien_nhan_su.test.ts`. */
function ten_csdl(url: string): string {
  const khong_truy_van = url.split('?')[0] ?? '';
  const sau_giao_thuc = khong_truy_van.replace(/^[a-z+]+:\/\//i, '');
  const vt = sau_giao_thuc.indexOf('/');
  return vt < 0 ? '' : sau_giao_thuc.slice(vt + 1);
}
if (!ten_csdl(process.env['DATABASE_URL']).startsWith('chamcong_test')) {
  throw new Error("Bo kiem nay xoa du lieu nen chi chay tren DB ten 'chamcong_test*'.");
}

const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const { thuc_thi, truy_van, dong_pool } = await import('../src/csdl/ket_noi.ts');
const { day_hop_thu_di, ghi_su_kien } = await import('../src/su_kien/hop_thu_di.ts');

before(async () => {
  await chay_di_tru();
  await thuc_thi('truncate table hop_thu_di restart identity');
});

after(async () => {
  await dong_pool();
  erp_gia.close();
});

test('chua khai CONG_SU_KIEN_URL: su kien nhan su NAM LAI, khong bi danh dau da gui', async () => {
  await ghi_su_kien('nhan_su.nghi_viec', { ma_nv: 'NV900' });
  await day_hop_thu_di();

  const ds = await truy_van<{ gui_luc: Date | null; loi_cuoi: string | null }>(
    "select gui_luc, loi_cuoi from hop_thu_di where loai_su_kien = 'nhan_su.nghi_viec'",
  );
  assert.equal(ds.length, 1);
  assert.equal(ds[0]!.gui_luc, null, 'chua co dich ma da danh dau da gui = MAT su kien');
  // Ly do phai doc duoc: nguoi truc mo bang len phai biet ngay phai khai bien nao.
  assert.match(ds[0]!.loi_cuoi ?? '', /CONG_SU_KIEN_URL/);
});

test('su kien ERP van di binh thuong trong luc do', async () => {
  // Mot duong chua cau hinh khong duoc lam ket duong con lai. Neu `day_hop_thu_di` dung han
  // vi thieu CONG_SU_KIEN_URL thi bang cong da chot cung khong sang duoc ERP.
  da_nhan_erp.length = 0;
  await ghi_su_kien('bang_cong.da_chot', { ky: '2026-08' });
  const so = await day_hop_thu_di();

  assert.equal(so, 1, 'su kien ERP phai di duoc du cong chua cau hinh');
  assert.equal(da_nhan_erp.length, 1);
});
