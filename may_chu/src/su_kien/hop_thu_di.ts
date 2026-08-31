// Hop thu di (outbox): ghi su kien cung transaction voi du lieu nghiep vu, mot tien
// trinh nen day sang ERP sau. Cach nay khong mat su kien khi ERP dang chet — thay cho
// viec publish truc tiep RabbitMQ trong ban .NET goc.
import type { PoolClient } from 'pg';
import { createHmac } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';
import { pool, truy_van, thuc_thi } from '../csdl/ket_noi.ts';

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

export type LoaiSuKien = LoaiSuKienErp | LoaiSuKienCong;

/** Su kien nao di sang cong thay vi sang ERP. */
function di_sang_cong(loai: string): boolean {
  return loai.startsWith('nhan_su.');
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
  return cau_hinh.erp.webhook_url !== '' || cau_hinh.cong_sso.goc !== '';
}

/**
 * Day toi da `so_luong` su kien chua gui. Tra ve so su kien gui thanh cong.
 *
 * HAI DICH, MOT HOP THU. Su kien `nhan_su.*` di sang cong dinh danh; con lai di sang ERP.
 * Dich la thuoc tinh cua LOAI su kien, khong phai cua co che gui — nen phep chon dich nam
 * trong `gui_mot`, con phan nhan viec / thu lai / backoff dung chung. Tach thanh hai bang la
 * hai ban sao cua cung mot doan logic kho nhat o day.
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
  if (di_sang_cong(d.loai_su_kien)) return gui_sang_cong(d);
  return gui_sang_erp(d);
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
  if (cau_hinh.cong_sso.goc === '') {
    // NEM chu khong bo qua: dong nay phai o lai hop thu va thu lai, khong duoc danh dau da
    // gui. Bo qua o day la mat su kien nhan su khi ai do quen khai CONG_URL.
    throw new Error('Chua khai CONG_URL — su kien nhan su nam lai cho');
  }
  if (cau_hinh.cong_sso.token_dich_vu === '') {
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

  const res = await fetch(`${cau_hinh.cong_sso.goc}/api/su-kien-nhan-su`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${cau_hinh.cong_sso.token_dich_vu}`,
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
