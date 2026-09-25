// Hop thu di (outbox): ghi su kien cung transaction voi du lieu nghiep vu, mot tien
// trinh nen day sang ERP sau. Cach nay khong mat su kien khi ERP dang chet — thay cho
// viec publish truc tiep RabbitMQ trong ban .NET goc.
import type { PoolClient } from 'pg';
import { createHmac } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';
import { pool, truy_van, thuc_thi } from '../csdl/ket_noi.ts';
import { doc_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { email_bat, gui_email, type DinhKemMail } from './gui_email.ts';
import {
  chan_dang_nhap_va_rut_giay_phep,
  tao_tai_khoan_va_cap_giay_phep,
} from '../nhan_su/ms365.ts';

/**
 * Su kien gui sang ERP. Than tu do — ERP doc theo hop dong rieng cua no.
 */
export type LoaiSuKienErp =
  | 'lan_quet.da_ghi'
  | 'bang_cong.da_chot'
  | 'nghi_phep.da_duyet'
  | 'thiet_bi.mat_ket_noi'
  | 'thiet_bi.ket_noi_lai';

/**
 * Su kien gui sang ERP1 (ERP moi). Hai nghiep vu: nghi viec (de ERP1 vo hieu hoa tai
 * khoan) va tao ho so nhan su moi (de ERP1 thiet lap tai khoan). Tien to `erp1.` KHONG
 * duoc trung `nhan_su.` (cong) hay cac loai ERP cu — router chon dich theo tien to nay.
 *
 * `du_lieu` bat buoc co `ma_nv`; `nghi_viec` kem `ma_erp` / `email` / `ngay_nghi_viec` /
 * `luc`; `da_tao` kem `ho_ten` / `email` / `so_dien_thoai` / `ngay_vao` / `pin_may`.
 */
export type LoaiSuKienErp1 = 'erp1.nhan_su.nghi_viec' | 'erp1.nhan_su.da_tao';

/**
 * Su kien nhan su gui sang CONG. Bon loai nay do CONG dinh nghia, khong phai ta —
 * xem `may_chu/src/tuyen/su_kien_nhan_su.ts` cua kho `phanquyen`. Them mot loai o day ma cong
 * chua biet thi cong tra 400 va dong do nam lai trong hop thu, thu lai mai.
 *
 * `du_lieu` cua nhung loai nay BAT BUOC co `ma_nv`; `da_tao` va `doi_ten` con can `ho_ten`.
 */
export type LoaiSuKienCong =
  | 'nhan_su.da_tao'
  | 'nhan_su.doi_ten'
  | 'nhan_su.nghi_viec'
  | 'nhan_su.quay_lai';

/**
 * Su kien nghi vu cho Microsoft Graph. `ms365.nghi_viec` de offboarding; `ms365.tao_tai_khoan`
 * de tao tai khoan Entra + cap giay phep khi tao ho so nhan su moi.
 *
 * `du_lieu` BAT BUOC co `upn` (email/UPN cua tai khoan Entra); `tao_tai_khoan` con can
 * `ho_ten`, `mat_khau` (khoi tao) va `sku_id` (giay phep can cap).
 */
export type LoaiSuKienMs365 = 'ms365.nghi_viec' | 'ms365.tao_tai_khoan';

/**
 * Email qua outbox (quy trinh thoi viec: ho so BHXH, chung tu thue...). Ghi cung
 * transaction voi nghiep vu; tien trinh nen gui sau voi backoff. `du_lieu`:
 *   { den: string[], cc?: string[], tieu_de, noi_dung (html), tep_ids?: string[] }
 */
export type LoaiSuKienGuiEmail = 'gui_email';

export type LoaiSuKien =
  | LoaiSuKienErp | LoaiSuKienErp1 | LoaiSuKienCong | LoaiSuKienMs365 | LoaiSuKienGuiEmail;

/** Su kien nao di sang cong thay vi sang ERP. */
function di_sang_cong(loai: string): boolean {
  return loai.startsWith('nhan_su.');
}

/** Su kien nao di sang Microsoft Graph thay vi sang ERP / cong. */
function di_sang_ms365(loai: string): boolean {
  return loai.startsWith('ms365.');
}

/** Su kien nao di sang ERP1 (ERP moi) thay vi cac dich khac. */
export function di_sang_erp1(loai: string): boolean {
  return loai.startsWith('erp1.');
}

/** Ghi su kien vao outbox. Dung `khach` de nam trong cung transaction voi du lieu goc. */
export async function ghi_su_kien(
  loai: LoaiSuKien,
  du_lieu: Record<string, unknown>,
  khach?: PoolClient,
): Promise<void> {
  const sql = 'insert into hop_thu_di(loai_su_kien, du_lieu) values ($1, $2::jsonb)';
  const ts = [loai, JSON.stringify(du_lieu)];
  if (khach !== undefined) await khach.query(sql, ts);
  else await thuc_thi(sql, ts);
}

interface DongOutbox {
  id: number;
  loai_su_kien: string;
  du_lieu: Record<string, unknown>;
  so_lan: number;
}

/** Co dich nao duoc cau hinh chua. Chua thi khong can nhan viec ra khoi bang. */
function co_dich(): boolean {
  return cau_hinh.erp.webhook_url !== ''
    || cau_hinh.erp1.webhook_url !== ''
    || cau_hinh.cong_su_kien.goc !== ''
    || cau_hinh.ms365_nghi_viec.bat
    || cau_hinh.ms365_tao.bat
    || cau_hinh.mail.nguoi_gui !== '';
}

/**
 * Day toi da `so_luong` su kien chua gui. Tra ve so su kien gui thanh cong.
 *
 * BA DICH, MOT HOP THU. Su kien `nhan_su.*` di sang cong dinh danh; `ms365.*` di sang
 * Microsoft Graph; con lai di sang ERP. Dich la thuoc tinh cua LOAI su kien, khong phai
 * cua co che gui — nen phep chon dich nam trong `gui_mot`, con phan nhan viec / thu lai /
 * backoff dung chung. Tach thanh nhieu bang la nhieu ban sao cua cung mot doan logic kho
 * nhat o day.
 *
 * Chua cau hinh dich NAO thi khong lam gi: su kien nam lai trong bang, khong mat. Bat len luc
 * nao thi chung di luc do.
 *
 * Chi cau hinh MOT dich thi van chay: dong cua dich kia se that bai va lui theo backoff cho
 * den khi dich do duoc khai. Do la co y — mot su kien nhan su khong duoc phep bi danh dau "da
 * gui" chi vi cong chua duoc cau hinh.
 */
export async function day_hop_thu_di(so_luong = 50): Promise<number> {
  if (!co_dich()) return 0;

  // Nhan viec bang MOT cau UPDATE nguyen tu: day gui_lai_sau ve tuong lai de instance
  // khac khong lay lai cung su kien. Khong giu transaction trong luc goi HTTP.
  // (Chi dung `for update skip locked` roi doc thoi la SAI: khoa nha ngay sau cau select.)
  const dong = await truy_van<DongOutbox>(
    `update hop_thu_di
        set gui_lai_sau = now() + interval '2 minutes'
      where id in (
        select id from hop_thu_di
         where gui_luc is null and gui_lai_sau <= now()
         order by id
         limit $1
         for update skip locked
      )
      returning id, loai_su_kien, du_lieu, so_lan`,
    [so_luong],
  );
  if (dong.length === 0) return 0;

  let thanh_cong = 0;
  for (const d of dong) {
    try {
      await gui_mot(d);
      await thuc_thi('update hop_thu_di set gui_luc = now(), loi_cuoi = null where id = $1', [d.id]);
      thanh_cong++;
    } catch (loi) {
      const so_lan = d.so_lan + 1;
      // Backoff luy tien, tran 1 gio. Sau 12 lan that bai thi de yen cho nguoi kiem tra.
      const cho_giay = Math.min(3600, 2 ** Math.min(so_lan, 11) * 5);
      await thuc_thi(
        `update hop_thu_di
            set so_lan = $2,
                loi_cuoi = $3,
                gui_lai_sau = now() + ($4 || ' seconds')::interval
          where id = $1`,
        [d.id, so_lan, (loi as Error).message.slice(0, 500), String(cho_giay)],
      );
    }
  }
  return thanh_cong;
}

async function gui_mot(d: DongOutbox): Promise<void> {
  if (di_sang_ms365(d.loai_su_kien)) return gui_sang_ms365(d);
  if (di_sang_cong(d.loai_su_kien)) return gui_sang_cong(d);
  if (di_sang_erp1(d.loai_su_kien)) return gui_sang_erp1(d);
  if (d.loai_su_kien === 'gui_email') return gui_sang_email(d);
  return gui_sang_erp(d);
}

/**
 * Gui mot email da xep hang trong outbox. Doc tep dinh kem theo `tep_ids` (id bang
 * `ho_so_tep`) — tep phai da luu truoc khi ghi su kien. Chua khai MS_MAIL_* thi NEM loi
 * de dong nam lai cho (cung quy tac nhu cac dich khac).
 */
async function gui_sang_email(d: DongOutbox): Promise<void> {
  if (!email_bat()) {
    throw new Error('Chua khai MS_MAIL_* — email nam lai cho');
  }
  const du = d.du_lieu;
  const den_tho = Array.isArray(du['den']) ? du['den'] : [];
  const den = den_tho.filter((x): x is string => typeof x === 'string' && x.includes('@'));
  if (den.length === 0) throw new Error(`su kien ${d.id} thieu nguoi nhan email`);
  const cc_tho = Array.isArray(du['cc']) ? du['cc'] : [];
  const cc = cc_tho.filter((x): x is string => typeof x === 'string' && x.includes('@'));
  const tieu_de = typeof du['tieu_de'] === 'string' ? du['tieu_de'] : 'Thông báo';
  const noi_dung = typeof du['noi_dung'] === 'string' ? du['noi_dung'] : '';

  const tep_ids = Array.isArray(du['tep_ids']) ? du['tep_ids'] : [];
  const dinh_kem: DinhKemMail[] = [];
  for (const id_tho of tep_ids) {
    if (typeof id_tho !== 'string') continue;
    const t = await truy_van<{ ten_goc: string; ten_luu: string; kieu_mime: string }>(
      'select ten_goc, ten_luu, kieu_mime from ho_so_tep where id = $1', [id_tho]);
    const hang = t[0];
    if (hang === undefined) continue;
    const tep = await doc_tep_ho_so(hang.ten_luu);
    if (tep === null) continue;
    dinh_kem.push({ ten: hang.ten_goc, mime: hang.kieu_mime, du_lieu: tep });
  }

  // Graph nhan CC qua truong rieng; de giu hop dong gui_email don gian, ghep CC vao den
  // (nguoi nhan van nhan duoc, chi khac o nhan To/Cc).
  const ok = await gui_email({
    den: [...den, ...cc],
    tieu_de,
    noi_dung_html: noi_dung,
    dinh_kem: dinh_kem.length > 0 ? dinh_kem : undefined,
  });
  if (!ok) throw new Error('Graph khong gui duoc email (gui_email tra false)');
}

/**
 * Day mot su kien offboarding/onboarding sang Microsoft Graph.
 *
 * `ms365.nghi_viec`: chan dang nhap, thu hoi phien va rut toan bo giay phep.
 * `ms365.tao_tai_khoan`: tao tai khoan Entra + cap giay phep theo SKU.
 *
 * Sau khi tao xong thi XOA `mat_khau` khoi `du_lieu`: mat khau khoi tao chi hien cho HR mot
 * lan o phan hoi tao ho so, khong duoc nam mai trong bang outbox.
 */
async function gui_sang_ms365(d: DongOutbox): Promise<void> {
  if (d.loai_su_kien === 'ms365.tao_tai_khoan') {
    const du = d.du_lieu;
    const upn = typeof du['upn'] === 'string' ? du['upn'].trim() : '';
    const ho_ten = typeof du['ho_ten'] === 'string' ? du['ho_ten'].trim() : '';
    const mat_khau = typeof du['mat_khau'] === 'string' ? du['mat_khau'] : '';
    const sku_id = typeof du['sku_id'] === 'string' ? du['sku_id'] : '';
    if (upn === '' || !upn.includes('@')) throw new Error(`su kien ${d.id} upn sai dang`);
    if (mat_khau === '') throw new Error(`su kien ${d.id} thieu mat_khau`);
    await tao_tai_khoan_va_cap_giay_phep(upn, ho_ten, mat_khau, sku_id);
    await thuc_thi(
      `update hop_thu_di set du_lieu = du_lieu - 'mat_khau' where id = $1`, [d.id]);
    return;
  }

  const upn = typeof d.du_lieu['upn'] === 'string' ? d.du_lieu['upn'].trim() : '';
  if (upn === '') throw new Error(`su kien ${d.id} thieu upn`);
  if (!upn.includes('@')) throw new Error(`su kien ${d.id} upn sai dang: ${upn}`);
  await chan_dang_nhap_va_rut_giay_phep(upn);
}

/**
 * Day mot su kien nhan su sang cong dinh danh.
 *
 * `su_kien_id` = `chamcong-<id dong outbox>`. Cong chong trung bang `unique(su_kien_id)` +
 * `on conflict do nothing`, nen dinh danh nay phai:
 *
 *  - ON DINH qua cac lan gui lai. `id` la `bigserial` cua chinh dong nay nen no khong doi du
 *    gui lai bao nhieu lan. Sinh `randomUUID()` moi lan gui la BO phep chong trung cua cong:
 *    mot lan gui thanh cong ma mat phan hoi se thanh mot su kien thu hai o ben kia — voi
 *    `nhan_su.nghi_viec` do la thu hoi phien mot nguoi hai lan, con voi `da_tao` thi vo hai
 *    nhung lam ban nhat ky. Khong duoc de xay ra.
 *  - CO TIEN TO he thong. Cong nhan su kien tu nhieu nguon; `chamcong-12` va `rfid-12` phai la
 *    hai su kien khac nhau.
 */
async function gui_sang_cong(d: DongOutbox): Promise<void> {
  if (cau_hinh.cong_su_kien.goc === '') {
    // NEM chu khong bo qua: dong nay phai o lai hop thu va thu lai, khong duoc danh dau da
    // gui. Bo qua o day la mat su kien nhan su khi ai do quen khai goc cua cong.
    throw new Error('Chua khai CONG_SSO_GOC (hoac CONG_SU_KIEN_URL) — su kien nhan su nam lai cho');
  }
  if (cau_hinh.cong_su_kien.token_dich_vu === '') {
    throw new Error('Chua khai CONG_TOKEN_DICH_VU — su kien nhan su nam lai cho');
  }

  const du = d.du_lieu;
  const ma_nv = String(du['ma_nv'] ?? '');
  if (ma_nv === '') throw new Error(`su kien ${d.id} thieu ma_nv`);

  // `than` cua cong chi nhan nhung gi no dung: `ho_ten`. KHONG day nguyen `du_lieu` sang —
  // phong ban, ca lam, so dien thoai, ngay vao la du lieu nghiep vu cua Cham cong, va cong
  // khong co viec gi voi chung (ADR-002: cong giu DANH TINH, khong giu ho so nhan su).
  const than_cong: Record<string, unknown> = {};
  if (typeof du['ho_ten'] === 'string' && du['ho_ten'] !== '') than_cong['ho_ten'] = du['ho_ten'];

  const res = await fetch(`${cau_hinh.cong_su_kien.goc}/api/su-kien-nhan-su`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${cau_hinh.cong_su_kien.token_dich_vu}`,
    },
    body: JSON.stringify({
      su_kien_id: `chamcong-${d.id}`,
      loai: d.loai_su_kien,
      nhan_su_ma: ma_nv,
      than: than_cong,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    // Doc cau tra loi cua cong vao `loi_cuoi`: 400 vi sai hop dong va 401 vi sai token la hai
    // su co khac han nhau, ma "HTTP 4xx" tran thi nguoi truc khong phan biet duoc.
    const chi_tiet = await res.text().catch(() => '');
    throw new Error(`Cong tra ve HTTP ${res.status}${chi_tiet === '' ? '' : `: ${chi_tiet.slice(0, 200)}`}`);
  }
}

async function gui_sang_erp(d: DongOutbox): Promise<void> {
  if (cau_hinh.erp.webhook_url === '') {
    throw new Error('Chua khai ERP_WEBHOOK_URL — su kien nam lai cho');
  }
  const than = JSON.stringify({
    id: d.id,
    loai_su_kien: d.loai_su_kien,
    du_lieu: d.du_lieu,
  });

  const header: Record<string, string> = { 'content-type': 'application/json' };
  // Chu ky HMAC de ERP xac minh su kien that su den tu he thong cham cong.
  if (cau_hinh.erp.webhook_secret !== '') {
    header['x-cham-cong-signature'] = createHmac('sha256', cau_hinh.erp.webhook_secret)
      .update(than)
      .digest('hex');
  }

  const bo_dem = AbortSignal.timeout(15_000);
  const res = await fetch(cau_hinh.erp.webhook_url, {
    method: 'POST',
    headers: header,
    body: than,
    signal: bo_dem,
  });
  if (!res.ok) {
    throw new Error(`ERP tra ve HTTP ${res.status}`);
  }
}

/**
 * Dung than gui sang ERP1. Tach thanh ham THUAN de test hop dong ma khong goi HTTP that:
 * sai khuon payload la sai hop dong voi ERP1, va kieu nay chi lo ra khi ERP1 khong tu deactive
 * duoc tai khoan cua mot nguoi da nghi — qua muon. Nen khuon duoc khoa bang test.
 *
 * `su_kien_id` = `chamcong-<id dong outbox>` — ON DINH qua cac lan gui lai de ERP1 chong
 * trung bang `unique(su_kien_id)` (cung mau cong phan quyen dang dung).
 */
export function dung_than_erp1(d: DongOutbox): string {
  const chuoi = (k: string): string | null =>
    typeof d.du_lieu[k] === 'string' && d.du_lieu[k] !== '' ? d.du_lieu[k] as string : null;
  return JSON.stringify({
    su_kien_id: `chamcong-${d.id}`,
    loai_su_kien: d.loai_su_kien,
    ma_nv: chuoi('ma_nv'),
    ma_erp: chuoi('ma_erp'),
    email: chuoi('email'),
    ngay_nghi_viec: chuoi('ngay_nghi_viec'),
    luc: chuoi('luc'),
  });
}

/**
 * Khuon than cho `erp1.nhan_su.da_tao` — bao tao ho so nhan su moi de ERP1 thiet lap tai
 * khoan. Tach rieng khoi khuon nghi viec: hai nghiep vu khac nhau, moi ben mot hop dong.
 */
export function dung_than_erp1_da_tao(d: DongOutbox): string {
  const chuoi = (k: string): string | null =>
    typeof d.du_lieu[k] === 'string' && d.du_lieu[k] !== '' ? d.du_lieu[k] as string : null;
  return JSON.stringify({
    su_kien_id: `chamcong-${d.id}`,
    loai_su_kien: d.loai_su_kien,
    ma_nv: chuoi('ma_nv'),
    ma_erp: chuoi('ma_erp'),
    email: chuoi('email'),
    ho_ten: chuoi('ho_ten'),
    so_dien_thoai: chuoi('so_dien_thoai'),
    ngay_vao: chuoi('ngay_vao'),
    pin_may: chuoi('pin_may'),
  });
}

/**
 * Day mot su kien sang ERP1: nghi viec -> ERP1 vo hieu hoa tai khoan; da_tao -> ERP1 thiet
 * lap tai khoan moi. Neu chua khai URL thi NEM loi de dong o lai hop thu cho.
 */
async function gui_sang_erp1(d: DongOutbox): Promise<void> {
  if (cau_hinh.erp1.webhook_url === '') {
    throw new Error('Chua khai ERP1_WEBHOOK_URL — su kien erp1 nam lai cho');
  }
  const than = d.loai_su_kien === 'erp1.nhan_su.da_tao'
    ? dung_than_erp1_da_tao(d)
    : dung_than_erp1(d);

  const header: Record<string, string> = { 'content-type': 'application/json' };
  // Chu ky HMAC de ERP1 xac minh su kien that su den tu he thong cham cong.
  if (cau_hinh.erp1.webhook_secret !== '') {
    header['x-cham-cong-signature'] = createHmac('sha256', cau_hinh.erp1.webhook_secret)
      .update(than)
      .digest('hex');
  }

  const res = await fetch(cau_hinh.erp1.webhook_url, {
    method: 'POST',
    headers: header,
    body: than,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const chi_tiet = await res.text().catch(() => '');
    throw new Error(
      `ERP1 tra ve HTTP ${res.status}${chi_tiet === '' ? '' : `: ${chi_tiet.slice(0, 200)}`}`,
    );
  }
}

let bo_hen: NodeJS.Timeout | null = null;

/** Chay tien trinh day outbox dinh ky (goi mot lan khi khoi dong may chu). */
export function bat_tien_trinh_day(chu_ky_giay = 20): void {
  if (!co_dich()) return;
  if (bo_hen !== null) return;
  bo_hen = setInterval(() => {
    day_hop_thu_di().catch((loi: unknown) => {
      console.error('[hop_thu_di] loi khi day:', (loi as Error).message);
    });
  }, chu_ky_giay * 1000);
  // Khong giu tien trinh song chi vi bo hen nay.
  bo_hen.unref();
}

export function dung_tien_trinh_day(): void {
  if (bo_hen !== null) {
    clearInterval(bo_hen);
    bo_hen = null;
  }
}

/** Don su kien da gui cu hon `so_ngay` de bang khong phinh mai. */
export async function don_su_kien_cu(so_ngay = 30): Promise<number> {
  const kq = await pool.query(
    `delete from hop_thu_di
      where gui_luc is not null and gui_luc < now() - ($1 || ' days')::interval`,
    [String(so_ngay)],
  );
  return kq.rowCount ?? 0;
}
