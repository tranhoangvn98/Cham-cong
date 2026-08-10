#!/usr/bin/env node
// Gia lap mot may cham cong ZKTeco noi voi may chu qua giao thuc ADMS Push.
//
// Dung de kiem ca duong di cua du lieu TRUOC KHI cam may that: handshake -> day
// ATTLOG -> may chu tinh bang cong -> poll lenh. Neu tep nay chay xanh thi khi cam
// may that, phan con lai chi la cau hinh mang.
//
// Chay tren Windows / Linux / macOS deu duoc (chi can Node, khong can bash):
//
//   node trien_khai/gia_lap_may.mjs
//   node trien_khai/gia_lap_may.mjs --may-chu http://192.168.1.10:8080 --serial MAY-KHO-01
//
// Tuy chon:
//   --may-chu <url>    dia chi may chu            (mac dinh http://localhost:8080)
//   --serial <sn>      serial may gia lap         (mac dinh GIA-LAP-001)
//   --pin <pin>        PIN nhan vien tren may     (mac dinh 1001)
//   --ngay <YYYY-MM-DD> ngay cua lan quet         (mac dinh hom nay theo mui gio may)
//   --vao <HH:MM>      gio quet vao               (mac dinh 08:00)
//   --ra <HH:MM>       gio quet ra                (mac dinh 17:30)
//   --lien-tuc         chay mai, quet ngau nhien moi 20 giay (nhu may that dang hoat dong)
//   --offset <gio>     mui gio noi dat may        (mac dinh 7)

const doi_so = process.argv.slice(2);

function lay(ten, mac_dinh) {
  const i = doi_so.indexOf(`--${ten}`);
  return i >= 0 && doi_so[i + 1] !== undefined ? doi_so[i + 1] : mac_dinh;
}
const co = (ten) => doi_so.includes(`--${ten}`);

const MAY_CHU = lay('may-chu', 'http://localhost:8080').replace(/\/+$/, '');
const SERIAL = lay('serial', 'GIA-LAP-001');
const PIN = lay('pin', '1001');
const OFFSET = Number(lay('offset', '7'));
const LIEN_TUC = co('lien-tuc');

/** Ngay hom nay theo mui gio NOI DAT MAY, khong theo mui gio may dang chay tep nay. */
function ngay_may(luc = new Date()) {
  return new Date(luc.getTime() + OFFSET * 3600_000).toISOString().slice(0, 10);
}
function gio_may(luc = new Date()) {
  return new Date(luc.getTime() + OFFSET * 3600_000).toISOString().slice(11, 19);
}

const NGAY = lay('ngay', ngay_may());
const GIO_VAO = lay('vao', '08:00');
const GIO_RA = lay('ra', '17:30');

const XANH = '\x1b[32m';
const DO = '\x1b[31m';
const VANG = '\x1b[33m';
const MO = '\x1b[90m';
const HET = '\x1b[0m';

let so_loi = 0;
function ok(s, phu = '') {
  console.log(`${XANH}  OK  ${HET}${s}${phu === '' ? '' : ` ${MO}${phu}${HET}`}`);
}
function loi(s, phu = '') {
  so_loi++;
  console.log(`${DO} LOI  ${HET}${s}${phu === '' ? '' : ` ${MO}${phu}${HET}`}`);
}
function tin(s) {
  console.log(`${MO}      ${s}${HET}`);
}

/** Goi may chu giong may that: query co SN, body la text tho. */
async function goi(duong_dan, { method = 'GET', body } = {}) {
  const url = `${MAY_CHU}/iclock/${duong_dan}${duong_dan.includes('?') ? '&' : '?'}SN=${encodeURIComponent(SERIAL)}`;
  const res = await fetch(url, {
    method,
    // Firmware ZKTeco gui text tho, khong phai JSON.
    ...(body === undefined ? {} : { body, headers: { 'content-type': 'text/plain' } }),
  });
  return { ma: res.status, chu: (await res.text()).trim() };
}

console.log(`\n${VANG}=== Gia lap may cham cong ZKTeco ===${HET}`);
tin(`may chu : ${MAY_CHU}`);
tin(`serial  : ${SERIAL}`);
tin(`PIN     : ${PIN}`);
tin(`mui gio : UTC+${OFFSET}  (bay gio o noi dat may: ${NGAY} ${gio_may()})`);
console.log('');

// ---------------------------------------------------------------- 1. handshake
console.log(`${VANG}1. Handshake (may khoi dong, GET /iclock/cdata)${HET}`);
let hs;
try {
  hs = await goi('cdata');
} catch (e) {
  loi('khong ket noi duoc may chu', String(e));
  tin(`Kiem: may chu co chay chua? Thu mo ${MAY_CHU}/health bang trinh duyet.`);
  process.exit(1);
}

if (hs.ma === 401) {
  loi(`may chu tra 401 — serial "${SERIAL}" chua duoc khai bao`);
  tin('Day la dung theo thiet ke: whitelist theo serial, may la khong day duoc du lieu.');
  tin('Cach khai bao: mo webapp > Thiet bi > Dang ky may, dien dung serial tren.');
  tin('Hoac goi API:');
  tin(`  curl -X POST ${MAY_CHU}/api/thiet-bi -H "authorization: Bearer <token>" \\`);
  tin(`       -H "content-type: application/json" \\`);
  tin(`       -d '{"serial":"${SERIAL}","ten":"May gia lap","vi_tri":"Test"}'`);
  process.exit(1);
}
if (hs.ma !== 200) {
  loi(`handshake tra ma ${hs.ma}`, hs.chu.slice(0, 120));
  process.exit(1);
}
ok('may chu chap nhan serial');
if (hs.chu.includes('Realtime=1')) ok('block cau hinh co Realtime=1', '(may se day du lieu ngay khi co nguoi quet)');
else loi('block cau hinh THIEU Realtime=1', '(may se chi day theo chu ky, bang cong cham cap nhat)');
tin(`phan hoi: ${hs.chu.replace(/\n/g, ' | ').slice(0, 160)}`);

// ---------------------------------------------------------------- 2. thong tin may
console.log(`\n${VANG}2. May bao thong tin thiet bi (table=OPTIONS)${HET}`);
const tt = await goi('cdata?table=OPTIONS', {
  method: 'POST',
  body: `~DeviceName=Gia lap ZKTeco\r\nFirmVer=Ver 6.60 Aug 1 2025\r\n~SerialNumber=${SERIAL}\r\n`,
});
if (tt.ma === 200) ok('may chu ghi nhan firmware'); else loi(`tra ma ${tt.ma}`, tt.chu.slice(0, 100));

// ---------------------------------------------------------------- 3. day ATTLOG
async function day_quet(dong, nhan) {
  const r = await goi('cdata?table=ATTLOG', { method: 'POST', body: dong });
  if (r.ma !== 200) {
    loi(`${nhan}: tra ma ${r.ma}`, r.chu.slice(0, 100));
    return null;
  }
  const so = /OK:\s*(\d+)/.exec(r.chu);
  ok(`${nhan}: may chu tra "${r.chu}"`);
  return so === null ? null : Number(so[1]);
}

console.log(`\n${VANG}3. Day lan quet (POST /iclock/cdata?table=ATTLOG)${HET}`);
tin('Dinh dang moi dong, phan tach bang TAB:  PIN <tab> YYYY-MM-DD HH:MM:SS <tab> trang_thai <tab> xac_thuc <tab> ...');
// trang_thai: 0=Vao 1=Ra | xac_thuc: 1=van tay 4=the 15=khuon mat 25=long ban tay
const lo = `${PIN}\t${NGAY} ${GIO_VAO}:00\t0\t15\t0\n${PIN}\t${NGAY} ${GIO_RA}:00\t1\t15\t0\n`;
const lan1 = await day_quet(lo, 'lo dau');

// ---------------------------------------------------------------- 4. chong trung
console.log(`\n${VANG}4. Gui lai DUNG lo do (may that gui lai khi mat mang)${HET}`);
const lan2 = await day_quet(lo, 'lo gui lai');
if (lan1 !== null && lan2 === 0) {
  ok('chong trung hoat dong', '(lan hai khong nhan them ban ghi nao)');
} else if (lan2 !== null && lan2 > 0) {
  loi(`chong trung KHONG hoat dong — lan hai nhan them ${lan2} ban ghi`);
  tin('Hai lan quet giong nhau se lam cong bi tinh doi. Bao lai loi nay.');
}

// ---------------------------------------------------------------- 5. poll lenh
console.log(`\n${VANG}5. May xin lenh (GET /iclock/getrequest)${HET}`);
const gr = await goi('getrequest');
if (gr.ma !== 200) {
  loi(`tra ma ${gr.ma}`, gr.chu.slice(0, 100));
} else if (gr.chu === '' || gr.chu === 'OK') {
  ok('khong co lenh nao dang cho', '(binh thuong)');
} else {
  ok('nhan duoc lenh tu may chu', gr.chu.slice(0, 120));
  const id = /^C:(\d+):/.exec(gr.chu);
  if (id !== null) {
    const bc = await goi(`devicecmd`, { method: 'POST', body: `ID=${id[1]}&Return=0&CMD=DATA` });
    if (bc.ma === 200) ok('bao ket qua lenh ve may chu'); else loi(`bao ket qua tra ma ${bc.ma}`);
  }
}

// ---------------------------------------------------------------- ket luan
console.log('');
if (so_loi === 0) {
  console.log(`${XANH}=== Toan bo duong di cua du lieu chay dung ===${HET}`);
  tin('Gio mo webapp > Nhat ky quet: phai thay hai lan quet vua day len.');
  tin(`Neu PIN ${PIN} chua gan cho nhan vien nao, lan quet VAN duoc luu (khong mat du lieu)`);
  tin('nhung cong chua duoc tinh — webapp se liet ke o muc "PIN chua map nhan vien".');
} else {
  console.log(`${DO}=== Co ${so_loi} loi o tren ===${HET}`);
  process.exitCode = 1;
}

// ---------------------------------------------------------------- che do lien tuc
if (LIEN_TUC && so_loi === 0) {
  console.log(`\n${VANG}Che do lien tuc: gia lap may dang hoat dong. Ctrl+C de dung.${HET}`);
  let n = 0;
  const chay = async () => {
    n++;
    const luc = new Date();
    const dong = `${PIN}\t${ngay_may(luc)} ${gio_may(luc)}\t${n % 2 === 1 ? 0 : 1}\t15\t0\n`;
    try {
      const r = await goi('cdata?table=ATTLOG', { method: 'POST', body: dong });
      console.log(`${MO}[${gio_may(luc)}]${HET} quet ${n % 2 === 1 ? 'VAO ' : 'RA  '} -> ${r.chu}`);
      // May that cung poll lenh moi chu ky.
      await goi('getrequest');
    } catch (e) {
      console.log(`${DO}[${gio_may(luc)}] mat ket noi:${HET} ${String(e).slice(0, 80)}`);
    }
  };
  setInterval(() => { void chay(); }, 20_000);
}
