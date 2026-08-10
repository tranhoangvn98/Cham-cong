#!/usr/bin/env node
// Kiem tra mot ban trien khai da san sang nhan log tu may cham cong chua, roi in
// dung nhung gia tri phai bam vao menu may ZKTeco.
//
// Chay tren Windows / Linux / macOS deu duoc:
//
//   node trien_khai/kiem_tra.mjs
//   node trien_khai/kiem_tra.mjs --may-chu http://192.168.1.10:8080 --mat-khau <mk_admin>

import { networkInterfaces } from 'node:os';

const doi_so = process.argv.slice(2);
function lay(ten, mac_dinh) {
  const i = doi_so.indexOf(`--${ten}`);
  return i >= 0 && doi_so[i + 1] !== undefined ? doi_so[i + 1] : mac_dinh;
}

const MAY_CHU = lay('may-chu', 'http://localhost:8080').replace(/\/+$/, '');
const WEB = lay('web', 'http://localhost:8081').replace(/\/+$/, '');
const TEN_DN = lay('tai-khoan', 'admin');
const MAT_KHAU = lay('mat-khau', '');

const XANH = '\x1b[32m'; const DO = '\x1b[31m'; const VANG = '\x1b[33m';
const MO = '\x1b[90m'; const HET = '\x1b[0m';

let so_loi = 0; let so_canh_bao = 0;
const ok = (s, p = '') => console.log(`${XANH}  OK  ${HET}${s}${p && ` ${MO}${p}${HET}`}`);
const loi = (s, p = '') => { so_loi++; console.log(`${DO} LOI  ${HET}${s}${p && ` ${MO}${p}${HET}`}`); };
const cb = (s, p = '') => { so_canh_bao++; console.log(`${VANG} LUU Y${HET} ${s}${p && ` ${MO}${p}${HET}`}`); };
const tin = (s) => console.log(`${MO}      ${s}${HET}`);

async function json(duong_dan, tuy_chon = {}) {
  const res = await fetch(`${MAY_CHU}${duong_dan}`, tuy_chon);
  let than = null;
  try { than = await res.json(); } catch { than = null; }
  return { ma: res.status, than };
}

/** IP LAN cua may nay — may ZKTeco phai tro toi dia chi nay, khong phai localhost. */
function ip_lan() {
  const ra = [];
  for (const [ten, ds] of Object.entries(networkInterfaces())) {
    for (const n of ds ?? []) {
      if (n.family === 'IPv4' && !n.internal) ra.push({ ten, dia_chi: n.address });
    }
  }
  return ra;
}

console.log(`\n${VANG}=== Kiem tra ban trien khai ===${HET}`);
tin(`may chu: ${MAY_CHU}`);
console.log('');

// ---------------------------------------------------------------- 1. may chu song
console.log(`${VANG}1. May chu va cơ so du lieu${HET}`);
let hp;
try {
  hp = await json('/health');
} catch (e) {
  loi('khong ket noi duoc may chu', String(e).slice(0, 100));
  tin('Kiem: docker compose ps  — ca 3 service phai "healthy".');
  tin('Xem log:  docker compose logs may_chu | tail -30');
  process.exit(1);
}
if (hp.ma === 200 && hp.than?.trang_thai === 'ok') ok('may chu tra /health = ok');
else loi(`/health tra ma ${hp.ma}`, JSON.stringify(hp.than).slice(0, 120));
if (hp.than?.csdl === 'ok') ok('ket noi duoc PostgreSQL');
else loi('KHONG ket noi duoc PostgreSQL', 'may chu se khong luu duoc lan quet nao');

// ---------------------------------------------------------------- 2. webapp
console.log(`\n${VANG}2. Webapp${HET}`);
try {
  const r = await fetch(`${WEB}/`);
  if (r.ok) ok(`webapp tra ma ${r.status}`, WEB);
  else cb(`webapp tra ma ${r.status}`, WEB);
} catch {
  cb('khong mo duoc webapp', `${WEB} — neu chi chay backend thi bo qua`);
}

// ---------------------------------------------------------------- 3. dang nhap
console.log(`\n${VANG}3. Tai khoan quan tri${HET}`);
let token = '';
if (MAT_KHAU === '') {
  cb('chua truyen --mat-khau nen bo qua phan kiem sau khi dang nhap');
  tin('Chay lai voi:  node trien_khai/kiem_tra.mjs --mat-khau <ADMIN_MAT_KHAU trong .env>');
} else {
  const dn = await json('/api/xac-thuc/dang-nhap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ten_dang_nhap: TEN_DN, mat_khau: MAT_KHAU }),
  });
  if (dn.ma === 200 && typeof dn.than?.token_truy_cap === 'string') {
    token = dn.than.token_truy_cap;
    ok(`dang nhap duoc bang tai khoan "${TEN_DN}"`);
    if (dn.than.phai_doi_mat_khau === true) {
      cb('tai khoan dang bat buoc doi mat khau', 'phai doi truoc khi dung webapp');
    }
    const mg = dn.than.mui_gio_offset_gio;
    if (mg === undefined) loi('phan hoi dang nhap thieu mui_gio_offset_gio', 'web/app se hien sai gio');
    else if (Number(mg) === 7) ok(`mui gio may cham cong = UTC+${mg}`, '(Viet Nam)');
    else cb(`mui gio may cham cong = UTC+${mg}`, 'khac 7 — chac chan may dat o mui gio nay?');
  } else if (dn.ma === 401) {
    loi('sai tai khoan hoac mat khau');
    tin('Chua chay seed?  docker compose exec may_chu node dist/csdl/seed.js');
  } else {
    loi(`dang nhap tra ma ${dn.ma}`, JSON.stringify(dn.than).slice(0, 120));
  }
}

// ---------------------------------------------------------------- 4. may da khai bao
console.log(`\n${VANG}4. May cham cong da khai bao (whitelist theo serial)${HET}`);
let ds_may = [];
if (token !== '') {
  const r = await json('/api/thiet-bi', { headers: { authorization: `Bearer ${token}` } });
  if (r.ma === 200 && Array.isArray(r.than)) {
    ds_may = r.than;
    if (ds_may.length === 0) {
      loi('CHUA khai bao may nao');
      tin('May chua khai bao se bi tra 401 va KHONG day duoc du lieu — day la co y (chong gia mao).');
      tin('Khai bao: webapp > Thiet bi > Dang ky may. Serial lay o mat sau may hoac');
      tin('Menu > System Info > Device Info > Serial Number. Phai khop TUNG KY TU.');
    } else {
      ok(`da khai bao ${ds_may.length} may`);
      for (const m of ds_may) {
        const trang_thai = m.dang_online === true ? `${XANH}online${HET}`
          : m.thay_lan_cuoi === null ? `${DO}chua bao gio bao hieu${HET}`
          : `${VANG}mat ket noi${HET}`;
        console.log(`      ${m.serial}  ${m.ten}  ${trang_thai}${m.thay_lan_cuoi === null ? '' : `${MO}  thay lan cuoi ${m.thay_lan_cuoi}${HET}`}`);
      }
      if (ds_may.every((m) => m.thay_lan_cuoi === null)) {
        cb('chua may nao tung bao hieu', 'may chua noi duoc toi may chu — xem muc 6 ben duoi');
      }
    }
  } else {
    loi(`khong doc duoc danh sach thiet bi (ma ${r.ma})`);
  }
}

// ---------------------------------------------------------------- 5. nhan vien + PIN
console.log(`\n${VANG}5. Nhan vien va PIN may${HET}`);
if (token !== '') {
  const r = await json('/api/nhan-vien', { headers: { authorization: `Bearer ${token}` } });
  const ds = Array.isArray(r.than) ? r.than : (r.than?.du_lieu ?? []);
  if (ds.length === 0) {
    cb('chua co nhan vien nao');
    tin('Lan quet van duoc luu du chua co nhan vien, nhung cong khong duoc tinh.');
  } else {
    const co_pin = ds.filter((n) => n.pin_may !== null && n.pin_may !== '');
    ok(`${ds.length} nhan vien, ${co_pin.length} da gan PIN may`);
    if (co_pin.length < ds.length) {
      cb(`${ds.length - co_pin.length} nhan vien CHUA gan PIN`, 'quet may se khong tinh duoc cong cho ho');
    }
    const khong_ca = ds.filter((n) => n.ca_lam === null || n.ca_lam === undefined);
    if (khong_ca.length > 0) {
      cb(`${khong_ca.length} nhan vien chua gan ca lam viec`,
        'chi tinh tong gio co mat, khong tinh duoc di muon / ve som / OT');
    }
  }
}

// ---------------------------------------------------------------- 6. dia chi cho may
console.log(`\n${VANG}6. Dien gi vao menu may ZKTeco${HET}`);
const ips = ip_lan();
if (ips.length === 0) {
  cb('khong tim thay IP LAN nao tren may nay');
} else {
  tin('IP LAN cua may dang chay lenh nay:');
  for (const i of ips) console.log(`        ${i.dia_chi}   ${MO}(${i.ten})${HET}`);
}
const ip_goi_y = ips[0]?.dia_chi ?? '<IP may chu>';
console.log('');
tin('Tren may cham cong bam:  Menu > Comm > Cloud Server / ADMS');
console.log(`        Server Mode      : ${VANG}ADMS${HET}`);
console.log(`        Server Address   : ${VANG}${ip_goi_y}${HET}   ${MO}<- KHONG dung localhost / 127.0.0.1${HET}`);
console.log(`        Server Port      : ${VANG}8080${HET}`);
console.log(`        Enable Proxy     : ${VANG}OFF${HET}`);
console.log(`        HTTPS / SSL      : ${VANG}OFF${HET}   ${MO}<- nhieu firmware khong lam duoc TLS${HET}`);
console.log('');
tin('Kiem tra ngay tren may (neu firmware co menu Test / Comm Test): phai bao thanh cong.');
tin('May va may chu PHAI cung mang LAN, va tuong lua tren may chu phai mo cong 8080.');

// ---------------------------------------------------------------- 7. thu ngay
console.log(`\n${VANG}7. Thu giao thuc bang may gia lap${HET}`);
if (ds_may.length > 0) {
  tin('Chay lenh nay de gia lap may that day log len (khong can hardware):');
  console.log(`        node trien_khai/gia_lap_may.mjs --may-chu ${MAY_CHU} --serial ${ds_may[0].serial}`);
} else {
  tin('Khai bao may truoc, roi chay:');
  console.log(`        node trien_khai/gia_lap_may.mjs --may-chu ${MAY_CHU} --serial <serial>`);
}

// ---------------------------------------------------------------- ket luan
console.log('');
if (so_loi === 0 && so_canh_bao === 0) {
  console.log(`${XANH}=== San sang nhan log tu may cham cong ===${HET}`);
} else if (so_loi === 0) {
  console.log(`${VANG}=== Chay duoc, co ${so_canh_bao} luu y o tren ===${HET}`);
} else {
  console.log(`${DO}=== Co ${so_loi} loi phai sua truoc khi cam may ===${HET}`);
  process.exitCode = 1;
}
