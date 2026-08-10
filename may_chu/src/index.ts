// Diem khoi dong may chu.
import { mkdir } from 'node:fs/promises';
import { cau_hinh } from './cau_hinh.ts';
import { chay_di_tru } from './csdl/di_tru.ts';
import { dong_pool } from './csdl/ket_noi.ts';
import { bat_tien_trinh_day, dung_tien_trinh_day } from './su_kien/hop_thu_di.ts';
import { bat_lich, dung_lich } from './su_kien/lich_chay.ts';
import { bat_giam_sat_may, dung_giam_sat_may } from './su_kien/giam_sat_may.ts';
import { dung_ung_dung } from './ung_dung.ts';

const app = await dung_ung_dung();

try {
  await mkdir(cau_hinh.thu_muc_anh, { recursive: true });

  if (cau_hinh.tu_dong_di_tru) {
    await chay_di_tru((s) => app.log.info(s));
  }

  bat_tien_trinh_day();
  // Chot bang cong ngay hom truoc — BAT BUOC de ngay VANG xuat hien tren bang cong.
  bat_lich((s) => app.log.info(s));
  // Canh bao may mat ket noi. Trang Tong quan co hien trang thai may nhung do la thong
  // tin bi dong — phai co nguoi mo trang len xem.
  bat_giam_sat_may((muc, s, t) => {
    if (muc === 'canh_bao') app.log.warn(t ?? {}, s);
    else app.log.info(t ?? {}, s);
  });

  await app.listen({ port: cau_hinh.cong, host: '0.0.0.0' });
  app.log.info(
    { cong: cau_hinh.cong, moi_truong: cau_hinh.moi_truong },
    'may chu cham cong da chay',
  );
  if (cau_hinh.cors_origin.length === 0) {
    app.log.warn('CORS_ORIGIN de trong: webapp o origin khac se KHONG goi duoc API.');
  }
  if (cau_hinh.iclock_ip_cho_phep.length === 0) {
    app.log.warn(
      'ICLOCK_IP_CHO_PHEP de trong: /iclock/* nhan request tu MOI dia chi IP. '
      + 'Chap nhan duoc khi may chu nam trong LAN kin. Neu may chu co dia chi cong khai, '
      + 'hay dien IP cong khai cua van phong — neu khong, ai biet serial may cung day duoc '
      + 'lan quet gia vao bang cong.',
    );
  } else {
    app.log.info(
      { so_quy_tac: cau_hinh.iclock_ip_cho_phep.length,
        quy_tac: cau_hinh.iclock_ip_cho_phep.map((q) => q.goc) },
      'chi cho phep nhung IP nay goi /iclock/*',
    );
  }
  if (cau_hinh.proxy_tin_cay.length === 0) {
    app.log.info(
      'PROXY_TIN_CAY de trong: khong tin X-Forwarded-For, lay dia chi that cua ket noi. '
      + 'Dat sau Caddy/Nginx thi phai khai dai mang cua proxy, neu khong moi request se '
      + 'mang IP cua proxy.',
    );
  } else {
    // Tin proxy o dai qua rong = ai cung gia mao duoc IP nguon, tuc ICLOCK_IP_CHO_PHEP
    // mat tac dung. Canh bao to thay vi im lang cho qua.
    if (cau_hinh.proxy_tin_cay.some((q) => q.loai === 'ipv4' && q.mat_na === 0)) {
      app.log.warn(
        'PROXY_TIN_CAY chua 0.0.0.0/0: tin header chuyen tiep cua MOI nguon, tuc '
        + 'ICLOCK_IP_CHO_PHEP bi vo hieu — ai cung gia mao duoc IP van phong. '
        + 'Chi khai dung dai mang cua reverse proxy.',
      );
    }
    app.log.info(
      { quy_tac: cau_hinh.proxy_tin_cay.map((q) => q.goc) },
      'chi tin X-Forwarded-For tu nhung dia chi nay',
    );
  }
} catch (loi) {
  app.log.error({ err: loi }, 'khong khoi dong duoc may chu');
  await dong_pool();
  process.exit(1);
}

// Tat may chu tu te: ngung nhan request moi, cho request dang chay xong, dong DB.
for (const tin_hieu of ['SIGINT', 'SIGTERM'] as const) {
  process.on(tin_hieu, () => {
    app.log.info({ tin_hieu }, 'dang tat may chu');
    dung_tien_trinh_day();
    dung_lich();
    dung_giam_sat_may();
    app.close()
      .then(() => dong_pool())
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}
