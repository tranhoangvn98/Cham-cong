// Bien moi truong toi thieu cho bo kiem. KHONG phai mot bai kiem — khong co `.test.ts`.
//
// CACH DUNG: dat lam import DAU TIEN cua tep kiem, TRUOC moi import tu `../src/`.
//
//   import './moi_truong_kiem_thu.ts';
//   import { test } from 'node:test';
//   const { ham_can_kiem } = await import('../src/...');
//
// VI SAO CAN
//
// `cau_hinh.ts` fail-fast khi thieu `JWT_SECRET` hoac `DATABASE_URL` — dung, vi mot may chu
// chay production ma thieu khoa ky thi phai chet ngay chu khong chay nua vong. Nhung gan nhu
// moi tep trong `src/` deu keo theo `cau_hinh.ts` qua mot chuoi import nao do, ke ca nhung tep
// chi chua ham THUAN: `dinh_danh/cap_pin.ts` khong dung khoa ky, nhung import no la nap ca
// `cau_hinh.ts`.
//
// Ket qua: 9 tep kiem chi phu thuoc vao mot tep `.env` KHONG NAM TRONG KHO. Tren may nguoi
// viet co `.env` nen chung xanh; tren mot ban sao sach — CI, may dong nghiep, container — ca 9
// tep do do voi cung mot dong "Thieu bien moi truong bat buoc". Bo kiem chay duoc hay khong
// phu thuoc vao mot tep khong ai commit, va do la thu khong duoc phep.
//
// VI SAO LA MOT IMPORT, KHONG PHAI MAY DONG GAN
//
// Import TINH bi keo len dau tep, chay TRUOC moi lenh o than tep. Nen viet
// `process.env['JWT_SECRET'] = ...` roi `import { x } from '../src/...'` phia duoi la KHONG an
// toan — import da chay xong truoc khi dong gan kip chay. Cac tep hien co lach bang cach dung
// `await import(...)` dong.
//
// Mot import thi khong lach gi ca: import cua cung mot tep duoc chay THEO THU TU viet ra, nen
// dat tep nay len dau la no chay truoc. Nho vay tep kiem dung import tinh hay import dong deu
// duoc, khong phai nho quy tac nao.
//
// DUNG `??=`, KHONG PHAI `=`
//
// Moi truong that phai thang. `test_e2e` chay voi `DATABASE_URL` tro toi mot CSDL that; ghi de
// no o day la bo kiem e2e chay vao mot dia chi khong ton tai.

/** Du 32 ky tu — `cau_hinh.ts` tu choi khoa ngan hon khi `NODE_ENV=production`. */
process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';

// Dia chi KHONG TON TAI, co y. Bo kiem nao that su can CSDL thi phai tu khai `DATABASE_URL`
// cua no (xem `e2e.test.ts`); dat san mot dia chi that o day la mo duong cho mot bai kiem
// "khong can CSDL" am tham ghi vao CSDL that cua ai do.
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';

process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';
process.env['NODE_ENV'] ??= 'test';
