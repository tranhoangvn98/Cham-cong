// Duong vContract goi NGUOC ve he thong nay (callback).
//
// Ba dieu bat buoc, deu lay tu tai lieu dac ta muc IV:
//
//   1. Phan hoi phai boc BASE64 cua {"message":"OK","success":true}. Tra JSON tran thi
//      vContract coi la that bai, retry ba lan roi bo — hop dong ket o trang thai cu ma
//      khong ai biet tai sao.
//   2. vContract CHI retry 3 lan. Mat ca ba la mat thong bao vinh vien, nen luon ghi nhat
//      ky truoc khi xu ly, va luon tra 200 khi da nhan duoc (loi noi bo cua ta khong phai
//      ly do de ho gui lai).
//   3. Duong nay nam NGOAI lop dang nhap cua he thong. Bao ve bang token dung chung khai
//      trong VCONTRACT_TOKEN_CALLBACK — de trong = tu choi tat ca.
import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { ghi_nhat_ky } from '../vcontract/khach.ts';
import {
  boc_tra_loi, suy_trang_thai, NHAN_TRANG_THAI_THONG_BAO,
} from '../vcontract/giao_thuc.ts';

/** So sanh khong lo thoi gian — chan do token bang cach do do tre phan hoi. */
function bang_nhau(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/** Lay token tu header Authorization, chap nhan ca dang co va khong co tien to Bearer. */
function token_tu_header(h: unknown): string {
  if (typeof h !== 'string') return '';
  return h.replace(/^Bearer\s+/i, '').trim();
}

export async function tuyen_vcontract(app: FastifyInstance): Promise<void> {
  // vContract co the gui charset la, hoac khong dat content-type. Nhan text roi tu phan
  // tich, thay vi de Fastify tra 415 va lam mat mot trong ba lan retry.
  app.addContentTypeParser(
    ['application/json', 'text/plain', '*/*'],
    { parseAs: 'string' },
    (_req, than, xong) => { xong(null, than); },
  );

  app.addHook('preHandler', async (req, res) => {
    const mong_doi = cau_hinh.vcontract.token_callback;
    if (mong_doi === '') {
      req.log.error({ url: req.url }, 'vcontract: tu choi callback vi chua khai VCONTRACT_TOKEN_CALLBACK');
      return res.code(401).type('text/plain')
        .send(boc_tra_loi(false, 'Chưa cấu hình token callback phía hệ thống nhận.'));
    }
    if (!bang_nhau(token_tu_header(req.headers['authorization']), mong_doi)) {
      req.log.warn({ url: req.url, ip: req.ip }, 'vcontract: callback sai token');
      return res.code(401).type('text/plain')
        .send(boc_tra_loi(false, 'Token không hợp lệ.'));
    }
    return undefined;
  });

  /** IV.1 — ket qua ca YEU CAU lap hop dong. */
  app.post('/receive-result-request', async (req, res) => {
    const tb = doc_than(req.body);
    await ghi_nhat_ky({
      chieu: 'nhan_ve', duong_dan: '/vcontract/receive-result-request',
      thanh_cong: true, du_lieu: tb, ma_http: 200,
    });

    // Ket qua tung hop dong nam trong listContractResult.
    const ds = Array.isArray(tb['listContractResult']) ? tb['listContractResult'] : [];
    for (const it of ds as Record<string, unknown>[]) {
      const ma = chuoi(it['contractCode']);
      if (ma === null) continue;
      await cap_nhat_theo_ma(ma, {
        trang_thai: it['status'] === 'SUCCESS' ? 'DRAFT' : null,
        ma_loi: chuoi(it['errorCode']),
        mo_ta: chuoi(it['decscription']) ?? chuoi(it['description']),
      });
    }
    return res.type('text/plain').send(boc_tra_loi(true, 'OK'));
  });

  /** IV.2 — ket qua xu ly TUNG hop dong. Day la duong bao ky/tu choi/hoan tat. */
  app.post('/receive-result-contract', async (req, res) => {
    const tb = doc_than(req.body);
    const contract_code = chuoi(tb['contractCode']);
    const request_code = chuoi(tb['requestCode']);

    await ghi_nhat_ky({
      chieu: 'nhan_ve', duong_dan: '/vcontract/receive-result-contract',
      thanh_cong: true, du_lieu: tb, ma_http: 200,
    });

    if (contract_code === null && request_code === null) {
      // Tai lieu ghi ro thong diep loi mau cho truong hop nay.
      return res.type('text/plain').send(boc_tra_loi(false, 'Phải truyền mã requestCode'));
    }

    const status = chuoi(tb['status']);
    await cap_nhat_theo_ma(contract_code ?? request_code!, {
      trang_thai: suy_trang_thai(status, chuoi(tb['contractStatus'])),
      loai_thong_bao: chuoi(tb['type']),
      trang_thai_thong_bao: status,
      ma_loi: chuoi(tb['errorCode']),
      mo_ta: chuoi(tb['decscription']) ?? chuoi(tb['description'])
        ?? (status === null ? null : NHAN_TRANG_THAI_THONG_BAO[status] ?? null),
      url_tai_ve: chuoi(tb['urlDownloadFile']),
    });

    return res.type('text/plain').send(boc_tra_loi(true, 'OK'));
  });
}

interface CapNhat {
  trang_thai?: string | null;
  loai_thong_bao?: string | null;
  trang_thai_thong_bao?: string | null;
  ma_loi?: string | null;
  mo_ta?: string | null;
  url_tai_ve?: string | null;
}

/**
 * Cap nhat mot ho so ky theo contractCode.
 *
 * `coalesce($n, cot)` o moi truong: vContract gui thong bao TUNG PHAN — mot thong bao
 * "khach hang da ky" khong kem urlDownloadFile, va ghi de null len se xoa mat dia chi tep
 * da nhan tu thong bao truoc.
 *
 * Khong tim thay ma thi bo qua trong im lang o tang du lieu, NHUNG da ghi nhat ky o tren
 * roi — nen van truy lai duoc, chu khong mat dau vet.
 */
async function cap_nhat_theo_ma(ma: string, c: CapNhat): Promise<void> {
  const hd = await truy_van_mot<{ id: string; trang_thai: string | null }>(
    'select id, trang_thai from hop_dong_dien_tu where contract_code = $1 or request_code = $1',
    [ma],
  );
  if (hd === null) return;

  await thuc_thi(
    `update hop_dong_dien_tu set
       trang_thai           = coalesce($2, trang_thai),
       loai_thong_bao       = coalesce($3, loai_thong_bao),
       trang_thai_thong_bao = coalesce($4, trang_thai_thong_bao),
       ma_loi               = $5,
       mo_ta                = coalesce($6, mo_ta),
       url_tai_ve           = coalesce($7, url_tai_ve),
       hoan_tat_luc         = case when $2 = 'FINISHED' and hoan_tat_luc is null
                                   then now() else hoan_tat_luc end,
       cap_nhat_luc         = now()
     where id = $1`,
    [
      hd.id, c.trang_thai ?? null, c.loai_thong_bao ?? null, c.trang_thai_thong_bao ?? null,
      c.ma_loi ?? null, c.mo_ta ?? null, c.url_tai_ve ?? null,
    ],
  );

  // Hop dong ky xong thi hop dong lao dong chuyen sang hieu luc.
  if (c.trang_thai === 'FINISHED') {
    await thuc_thi(
      `update hop_dong_lao_dong set trang_thai = 'hieu_luc', cap_nhat_luc = now()
        where id = (select hop_dong_id from hop_dong_dien_tu where id = $1)
          and trang_thai = 'nhap'`,
      [hd.id],
    );
  }
}

/** Doc than callback: co the la chuoi JSON, base64 cua JSON, hoac doi tuong da phan tich. */
function doc_than(than: unknown): Record<string, unknown> {
  if (than === null || than === undefined) return {};
  if (typeof than === 'object') return than as Record<string, unknown>;
  if (typeof than !== 'string') return {};

  const s = than.trim();
  if (s === '') return {};
  try {
    if (s.startsWith('{') || s.startsWith('[')) return JSON.parse(s) as Record<string, unknown>;
    const giai = Buffer.from(s, 'base64').toString('utf8').trim();
    if (giai.startsWith('{')) return JSON.parse(giai) as Record<string, unknown>;
  } catch {
    // than la thi tra rong — da ghi nhat ky nguyen van o tang tren.
  }
  return {};
}

function chuoi(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}
