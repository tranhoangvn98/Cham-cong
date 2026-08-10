#!/usr/bin/env node
// Nap du lieu de chay thu: ca lam theo hop dong lao dong, ngay nghi le theo luat,
// va mot bo nhan vien DEMO de xem giao dien co so lieu that.
//
//   node trien_khai/nap_du_lieu_demo.mjs --mat-khau <mk_admin>
//   node trien_khai/nap_du_lieu_demo.mjs --mat-khau <mk> --khong-nhan-vien   # chi ca + ngay le
//   node trien_khai/nap_du_lieu_demo.mjs --mat-khau <mk> --may-chu http://192.168.1.10:8080
//
// Chay lai nhieu lan duoc: ngay le ghi de theo ngay, ca va nhan vien bo qua neu da co.
//
// NHAN VIEN LA DU LIEU GIA (ma NVDEMO*, PIN 9001-9008) — de phan biet voi nguoi that
// va xoa duoc bang --xoa-nhan-vien-demo truoc khi vao van hanh.

const doi_so = process.argv.slice(2);
function lay(ten, mac_dinh) {
  const i = doi_so.indexOf(`--${ten}`);
  return i >= 0 && doi_so[i + 1] !== undefined ? doi_so[i + 1] : mac_dinh;
}
const co = (ten) => doi_so.includes(`--${ten}`);

// 127.0.0.1 chu khong phai localhost: Node 20 uu tien ::1, ma may chu lang nghe IPv4 —
// dung localhost se dinh "fetch failed / other side closed" tren mot so may.
const MAY_CHU = lay('may-chu', 'http://127.0.0.1:8080').replace(/\/+$/, '');
const TEN_DN = lay('tai-khoan', 'admin');
const MAT_KHAU = lay('mat-khau', '');

const XANH = '\x1b[32m'; const DO = '\x1b[31m'; const VANG = '\x1b[33m';
const MO = '\x1b[90m'; const HET = '\x1b[0m';
let so_loi = 0;
const ok = (s, p = '') => console.log(`${XANH}  OK  ${HET}${s}${p && ` ${MO}${p}${HET}`}`);
const bo = (s, p = '') => console.log(`${MO}  --  ${s}${p && ` ${p}`}${HET}`);
const loi = (s, p = '') => { so_loi++; console.log(`${DO} LOI  ${HET}${s}${p && ` ${MO}${p}${HET}`}`); };
const tin = (s) => console.log(`${MO}      ${s}${HET}`);

let TOKEN = '';
async function api(duong_dan, tuy_chon = {}) {
  const res = await fetch(`${MAY_CHU}${duong_dan}`, {
    ...tuy_chon,
    headers: {
      'content-type': 'application/json',
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      ...(tuy_chon.headers ?? {}),
    },
  });
  let than = null;
  try { than = await res.json(); } catch { than = null; }
  return { ma: res.status, than };
}

// =====================================================================  1. CA LAM
//
// Nguon: Dieu 2.1 Hop dong lao dong — "khong qua 08 gio/ngay va 48 gio/tuan. Khung gio:
// tu thu Hai den het sang thu Bay; buoi sang 08h00-12h00, buoi chieu 13h30-17h30".
//
// => T2-T6: 08:00-17:30, nghi trua 12:00-13:30  -> 480 phut lam  -> 1 cong
//    T7   : 08:00-12:00, khong nghi trua        -> 240 phut lam  -> 0,5 cong
//    Tuan : 5 x 8h + 4h = 44 gio (duoi tran 48 gio/tuan cua Dieu 105 BLLD).
//
// phut_du_cong = 480 cho ca hai: ngay thuong lam du khung duoc 1 cong; sang thu Bay chi
// dat 240 phut = nua nguong nen tinh 0,5 cong — dung thong le 5,5 cong/tuan.
const CA = {
  ten: 'Hành chính (theo HĐLĐ)',
  gio_vao: '08:00',
  gio_ra: '17:30',
  nghi_tu: '12:00',
  nghi_den: '13:30',
  dung_sai_muon_phut: 5,
  dung_sai_som_phut: 5,
  nguong_ot_phut: 30,
  qua_dem: false,
  phut_du_cong: 480,
  cac_ngay_lam: [1, 2, 3, 4, 5, 6],
  theo_thu: [
    { thu: 6, gio_vao: '08:00', gio_ra: '12:00', nghi_tu: null, nghi_den: null, phut_du_cong: 480 },
  ],
};

// =====================================================================  2. NGAY LE
//
// 11 ngay/nam theo Dieu 112 Bo luat Lao dong 2019. Ngay am lich da quy doi sang duong
// lich (mui gio UTC+7):
//   Tet Binh Ngo : mung 1 = 17/02/2026 (Thu Ba),   29 thang Chap = 16/02/2026
//   Tet Dinh Mui : mung 1 = 06/02/2027 (Thu Bay),  29 thang Chap = 05/02/2027
//   Gio To Hung Vuong (10/3 AL): 26/04/2026 (Chu nhat) va 16/04/2027 (Thu Sau)
//
// HAI DIEU PHAI TU DIEU CHINH HANG NAM:
//  1. Phuong an nghi Tet (chon 5 ngay nao) va ngay lien ke cua Quoc khanh do Chinh phu
//     thong bao hang nam; doanh nghiep duoc chon phuong an khac nhung phai thong bao
//     truoc 30 ngay (Dieu 112 khoan 3).
//  2. Nghi bu khi ngay le trung ngay nghi hang tuan (Dieu 111 khoan 3) — o day Gio To
//     2026 roi vao Chu nhat nen da them ngay nghi bu Thu Hai 27/04/2026.
const NGAY_LE = [
  // ---- 2026
  { ngay: '2026-01-01', ten: 'Tết Dương lịch' },
  { ngay: '2026-02-16', ten: 'Tết Nguyên đán — 29 tháng Chạp' },
  { ngay: '2026-02-17', ten: 'Tết Nguyên đán — mùng 1' },
  { ngay: '2026-02-18', ten: 'Tết Nguyên đán — mùng 2' },
  { ngay: '2026-02-19', ten: 'Tết Nguyên đán — mùng 3' },
  { ngay: '2026-02-20', ten: 'Tết Nguyên đán — mùng 4' },
  { ngay: '2026-04-26', ten: 'Giỗ Tổ Hùng Vương (10/3 âm lịch)' },
  { ngay: '2026-04-27', ten: 'Nghỉ bù Giỗ Tổ (trùng Chủ nhật)' },
  { ngay: '2026-04-30', ten: 'Ngày Giải phóng miền Nam' },
  { ngay: '2026-05-01', ten: 'Quốc tế Lao động' },
  { ngay: '2026-09-02', ten: 'Quốc khánh' },
  { ngay: '2026-09-03', ten: 'Quốc khánh — ngày liền kề' },
  // ---- 2027
  { ngay: '2027-01-01', ten: 'Tết Dương lịch' },
  { ngay: '2027-02-05', ten: 'Tết Nguyên đán — 29 tháng Chạp' },
  { ngay: '2027-02-06', ten: 'Tết Nguyên đán — mùng 1' },
  { ngay: '2027-02-07', ten: 'Tết Nguyên đán — mùng 2' },
  { ngay: '2027-02-08', ten: 'Tết Nguyên đán — mùng 3' },
  { ngay: '2027-02-09', ten: 'Tết Nguyên đán — mùng 4' },
  { ngay: '2027-04-16', ten: 'Giỗ Tổ Hùng Vương (10/3 âm lịch)' },
  { ngay: '2027-04-30', ten: 'Ngày Giải phóng miền Nam' },
  { ngay: '2027-05-01', ten: 'Quốc tế Lao động' },
  { ngay: '2027-09-02', ten: 'Quốc khánh' },
  { ngay: '2027-09-03', ten: 'Quốc khánh — ngày liền kề' },
];

// =====================================================================  3. NHAN VIEN
// DU LIEU GIA de xem giao dien. PIN 9001-9008 de khong dam voi PIN that thuong bat dau
// tu 1. Chi mot nguoi duoc bat cham cong dien thoai — dung nhu chinh sach mac dinh.
const PHONG_BAN = ['Kinh doanh', 'Kho vận', 'Kế toán', 'Hành chính nhân sự'];
const NHAN_VIEN = [
  { ma_nv: 'NVDEMO01', ho_ten: 'Nguyễn Văn An',   pin_may: '9001', phong: 'Kinh doanh',           dien_thoai: true },
  { ma_nv: 'NVDEMO02', ho_ten: 'Trần Thị Bình',   pin_may: '9002', phong: 'Kinh doanh' },
  { ma_nv: 'NVDEMO03', ho_ten: 'Lê Quang Cường',  pin_may: '9003', phong: 'Kho vận' },
  { ma_nv: 'NVDEMO04', ho_ten: 'Phạm Thị Dung',   pin_may: '9004', phong: 'Kho vận' },
  { ma_nv: 'NVDEMO05', ho_ten: 'Hoàng Minh Đức',  pin_may: '9005', phong: 'Kế toán' },
  { ma_nv: 'NVDEMO06', ho_ten: 'Vũ Thị Hà',       pin_may: '9006', phong: 'Kế toán' },
  { ma_nv: 'NVDEMO07', ho_ten: 'Đỗ Trung Hiếu',   pin_may: '9007', phong: 'Hành chính nhân sự' },
  { ma_nv: 'NVDEMO08', ho_ten: 'Bùi Thị Lan',     pin_may: '9008', phong: 'Hành chính nhân sự' },
];

// ==================================================================================
console.log(`\n${VANG}=== Nap du lieu chay thu ===${HET}`);
tin(`may chu: ${MAY_CHU}`);
console.log('');

// ---------------------------------------------------------------- dang nhap
if (MAT_KHAU === '') {
  loi('thieu --mat-khau');
  tin('node trien_khai/nap_du_lieu_demo.mjs --mat-khau <ADMIN_MAT_KHAU>');
  process.exit(1);
}

// Cho may chu san sang: chay ngay sau `docker compose up -d` thi container con dang chay
// di tru CSDL, ket noi vao se bi dong giua chung.
let san_sang = false;
for (let i = 0; i < 30 && !san_sang; i++) {
  try {
    const hp = await api('/health');
    san_sang = hp.ma === 200;
  } catch { /* chua len — thu lai */ }
  if (!san_sang) {
    if (i === 0) tin('dang cho may chu san sang...');
    await new Promise((r) => setTimeout(r, 2000));
  }
}
if (!san_sang) {
  loi(`may chu khong phan hoi sau 60 giay`, MAY_CHU);
  tin('kiem tra:  docker compose ps  va  docker compose logs --tail 50 may_chu');
  process.exit(1);
}
const dn = await api('/api/xac-thuc/dang-nhap', {
  method: 'POST',
  body: JSON.stringify({ ten_dang_nhap: TEN_DN, mat_khau: MAT_KHAU }),
});
if (dn.ma !== 200 || typeof dn.than?.token_truy_cap !== 'string') {
  loi(`dang nhap that bai (ma ${dn.ma})`, JSON.stringify(dn.than ?? {}).slice(0, 120));
  process.exit(1);
}
TOKEN = dn.than.token_truy_cap;
ok(`dang nhap bang tai khoan "${TEN_DN}"`);

// ---------------------------------------------------------------- xoa du lieu demo
if (co('xoa-nhan-vien-demo')) {
  console.log(`\n${VANG}Cho nghi viec toan bo nhan vien demo${HET}`);
  // Khong xoa that: bang cong va lan quet cu con tham chieu toi. Cho nghi viec la dung
  // co che san co — nguoi do bien khoi danh sach dang lam va tai khoan bi vo hieu hoa.
  const ds = await api('/api/nhan-vien?chi_dang_lam=false');
  for (const nv of ds.than ?? []) {
    if (typeof nv.ma_nv === 'string' && nv.ma_nv.startsWith('NVDEMO') && nv.dang_hoat_dong) {
      const kq = await api(`/api/nhan-vien/${nv.id}/nghi-viec`, { method: 'POST', body: '{}' });
      if (kq.ma < 300) ok(`da cho nghi viec ${nv.ma_nv}`, nv.ho_ten);
      else loi(`khong xu ly duoc ${nv.ma_nv}`, `ma ${kq.ma}`);
    }
  }
  process.exit(so_loi === 0 ? 0 : 1);
}

// ---------------------------------------------------------------- 1. ca lam
console.log(`\n${VANG}1. Ca lam viec (theo Dieu 2.1 hop dong lao dong)${HET}`);
const ds_ca = await api('/api/ca-lam');
let ca_id = (ds_ca.than ?? []).find((c) => c.ten === CA.ten)?.id ?? null;
if (ca_id === null) {
  const kq = await api('/api/ca-lam', { method: 'POST', body: JSON.stringify(CA) });
  if (kq.ma === 201) { ca_id = kq.than.id; ok(`da tao ca "${CA.ten}"`); }
  else loi('khong tao duoc ca lam', JSON.stringify(kq.than ?? {}).slice(0, 160));
} else {
  const kq = await api(`/api/ca-lam/${ca_id}`, { method: 'PUT', body: JSON.stringify(CA) });
  if (kq.ma < 300) ok(`da cap nhat ca "${CA.ten}"`);
  else loi('khong cap nhat duoc ca lam', JSON.stringify(kq.than ?? {}).slice(0, 160));
}
tin('T2-T6  08:00-17:30, nghi trua 12:00-13:30  -> 480 phut -> 1 cong');
tin('T7     08:00-12:00, khong nghi trua        -> 240 phut -> 0,5 cong');
tin('Tuan   44 gio (tran 48 gio/tuan theo Dieu 105 BLLD)');

// ---------------------------------------------------------------- 2. ngay le
console.log(`\n${VANG}2. Ngay nghi le (Dieu 112 BLLD 2019)${HET}`);
let so_le = 0;
for (const nl of NGAY_LE) {
  const kq = await api('/api/ngay-le', { method: 'POST', body: JSON.stringify({ ...nl, huong_luong: true }) });
  if (kq.ma < 300) so_le++;
  else loi(`khong them duoc ${nl.ngay}`, JSON.stringify(kq.than ?? {}).slice(0, 120));
}
ok(`da khai ${so_le}/${NGAY_LE.length} ngay le cho 2026 va 2027`);
tin('11 ngay/nam: Tet Duong lich 1 + Tet Am lich 5 + Gio To 1 + 30/4 1 + 1/5 1 + Quoc khanh 2');
tin('2026: Gio To 26/04 roi vao Chu nhat -> da them ngay nghi bu Thu Hai 27/04');
tin('PHAI RA SOAT HANG NAM: phuong an nghi Tet va ngay lien ke Quoc khanh do Chinh phu');
tin('thong bao; doanh nghiep chon phuong an khac phai bao truoc 30 ngay (Dieu 112 kh.3).');

// ---------------------------------------------------------------- 3. nhan vien demo
if (co('khong-nhan-vien')) {
  console.log(`\n${MO}Bo qua nhan vien demo (--khong-nhan-vien)${HET}`);
} else {
  console.log(`\n${VANG}3. Nhan vien DEMO${HET}`);

  const ds_pb = await api('/api/phong-ban');
  const map_pb = new Map((ds_pb.than ?? []).map((p) => [p.ten, p.id]));
  for (const ten of PHONG_BAN) {
    if (map_pb.has(ten)) { bo(`phong ban "${ten}" da co`); continue; }
    const kq = await api('/api/phong-ban', { method: 'POST', body: JSON.stringify({ ten }) });
    if (kq.ma === 201) { map_pb.set(ten, kq.than.id); ok(`da tao phong ban "${ten}"`); }
    else loi(`khong tao duoc phong ban "${ten}"`, JSON.stringify(kq.than ?? {}).slice(0, 120));
  }

  const ds_nv = await api('/api/nhan-vien?chi_dang_lam=false');
  const da_co = new Set((ds_nv.than ?? []).map((n) => n.ma_nv));
  for (const nv of NHAN_VIEN) {
    if (da_co.has(nv.ma_nv)) { bo(`${nv.ma_nv} da co`, nv.ho_ten); continue; }
    const kq = await api('/api/nhan-vien', {
      method: 'POST',
      body: JSON.stringify({
        ma_nv: nv.ma_nv,
        ho_ten: nv.ho_ten,
        pin_may: nv.pin_may,
        phong_ban_id: map_pb.get(nv.phong) ?? null,
        ca_lam_id: ca_id,
        ngay_vao: '2026-01-05',
        duoc_cham_cong_dien_thoai: nv.dien_thoai === true,
      }),
    });
    if (kq.ma === 201) ok(`${nv.ma_nv}  ${nv.ho_ten}`, `PIN ${nv.pin_may} · ${nv.phong}`);
    else loi(`khong tao duoc ${nv.ma_nv}`, JSON.stringify(kq.than ?? {}).slice(0, 120));
  }
}

// ---------------------------------------------------------------- ket luan
console.log('');
if (so_loi === 0) {
  console.log(`${XANH}=== Da nap xong ===${HET}`);
  tin('Thu toan bo duong di:  node trien_khai/gia_lap_may.mjs --serial <serial da khai> --pin 9001');
  tin('Xoa nhan vien demo   :  node trien_khai/nap_du_lieu_demo.mjs --mat-khau <mk> --xoa-nhan-vien-demo');
} else {
  console.log(`${DO}=== Co ${so_loi} loi ===${HET}`);
}
process.exit(so_loi === 0 ? 0 : 1);
