// Dung instance Fastify. Tach khoi index.ts de kiem thu goi truc tiep khong can mo cong.
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { cau_hinh } from './cau_hinh.ts';
import { ip_duoc_phep } from './tien_ich/dia_chi_ip.ts';
import { tuyen_adms } from './adms/tuyen.ts';
import { tuyen_dang_nhap } from './tuyen/dang_nhap.ts';
import { tuyen_danh_muc } from './tuyen/danh_muc.ts';
import { tuyen_bang_cong } from './tuyen/bang_cong.ts';
import { tuyen_nhap_du_lieu } from './tuyen/nhap_du_lieu.ts';
import { tuyen_ho_so } from './tuyen/ho_so.ts';
import { tuyen_don_tu } from './tuyen/don_tu.ts';
import { tuyen_luong } from './tuyen/luong.ts';
import { tuyen_toi } from './tuyen/toi.ts';
import { tuyen_tich_hop } from './tuyen/tich_hop.ts';
import { truy_van_mot } from './csdl/ket_noi.ts';

/** Loi nghiep vu co ma HTTP rieng (LoiDauVao, LoiKhongTim, ...). */
interface LoiCoMa extends Error {
  ma_http?: number;
}

export async function dung_ung_dung(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: cau_hinh.la_production ? 'info' : 'debug',
      // KHONG log body/header cua request — chua mat khau va du lieu ca nhan.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      transport: cau_hinh.la_production ? undefined : { target: 'pino-pretty' },
    },
    // May ZKTeco gui dong URL rat dai khi day nhieu ban ghi.
    routerOptions: { maxParamLength: 500 },
    bodyLimit: 4 * 1024 * 1024,
    // X-Forwarded-For CHI duoc tin khi request den tu proxy da khai trong PROXY_TIN_CAY.
    //
    // Truoc day day la `la_production`, tuc tin header cua BAT KY AI khi chay production.
    // Header nay do client gui len nen ai cung dat duoc: chi can them
    // "X-Forwarded-For: <ip van phong>" la qua duoc ICLOCK_IP_CHO_PHEP — danh sach trang
    // coi nhu khong con tac dung. Khong khai PROXY_TIN_CAY thi dung dia chi that cua
    // socket; dat sau Caddy thi khai dai mang cua proxy.
    trustProxy:
      cau_hinh.proxy_tin_cay.length === 0
        ? false
        : (dia_chi: string): boolean => ip_duoc_phep(dia_chi, cau_hinh.proxy_tin_cay),
  });

  // -------------------------------------------------------------------- CORS
  // Webapp chay o origin khac may chu API nen phai mo dung origin da khai bao.
  // Mang rong = tat CORS (chi cho goi cung origin) — an toan hon mac dinh '*'.
  await app.register(cors, {
    origin: cau_hinh.cors_origin.length === 0 ? false : cau_hinh.cors_origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization'],
    maxAge: 86400,
  });

  // -------------------------------------------------------------------- rate limit
  await app.register(rateLimit, {
    global: false, // chi bat o route can (dang nhap, cham cong)
    keyGenerator: (req) => req.ip,
  });

  // -------------------------------------------------------------------- upload anh
  await app.register(multipart, {
    limits: {
      fileSize: cau_hinh.anh_toi_da_byte,
      files: 1,
      fields: 10,
      fieldSize: 1024,
    },
  });

  // -------------------------------------------------------------------- xu ly loi chung
  app.setErrorHandler((loi: LoiCoMa, req, res) => {
    const ma = typeof loi.ma_http === 'number'
      ? loi.ma_http
      : (loi as { statusCode?: number }).statusCode ?? 500;

    if (ma >= 500) {
      // Loi he thong: ghi day du vao log nhung KHONG tra chi tiet ra ngoai.
      req.log.error({ err: loi }, 'loi khong mong doi');
      return res.code(500).send({ loi: 'Lỗi hệ thống. Vui lòng thử lại hoặc liên hệ quản trị.' });
    }

    // Fastify tu sinh loi 429 khi vuot rate limit — giu nguyen thong diep cua no.
    if (ma === 429) {
      return res.code(429).send({
        loi: 'Bạn gửi quá nhiều yêu cầu. Vui lòng chờ một lát rồi thử lại.',
      });
    }

    req.log.info({ ma, thong_diep: loi.message }, 'loi dau vao');
    return res.code(ma).send({ loi: loi.message });
  });

  app.setNotFoundHandler((req, res) => {
    res.code(404).send({ loi: `Không có đường dẫn ${req.method} ${req.url}.` });
  });

  // -------------------------------------------------------------------- suc khoe
  app.get('/health', async (_req, res) => {
    try {
      await truy_van_mot('select 1 as ok');
      return { trang_thai: 'ok', csdl: 'ok', luc: new Date().toISOString() };
    } catch (loi) {
      return res.code(503).send({
        trang_thai: 'loi',
        csdl: 'khong ket noi duoc',
        chi_tiet: (loi as Error).message,
      });
    }
  });

  // -------------------------------------------------------------------- cac nhom tuyen
  // Giao thuc ADMS cho may cham cong (text tho, khong xac thuc bang JWT).
  await app.register(tuyen_adms, { prefix: '/iclock' });

  // REST API cho webapp va app dien thoai.
  await app.register(tuyen_dang_nhap, { prefix: '/api/xac-thuc' });
  await app.register(tuyen_danh_muc, { prefix: '/api' });
  await app.register(tuyen_bang_cong, { prefix: '/api' });
  await app.register(tuyen_nhap_du_lieu, { prefix: '/api' });
  await app.register(tuyen_ho_so, { prefix: '/api' });
  await app.register(tuyen_luong, { prefix: '/api' });
  await app.register(tuyen_don_tu, { prefix: '/api/duyet' });
  await app.register(tuyen_toi, { prefix: '/api/toi' });
  // API cho he thong ngoai. Prefix rieng + xac thuc bang khoa API, xem tuyen/tich_hop.ts.
  await app.register(tuyen_tich_hop, { prefix: '/api/v1' });

  return app;
}
