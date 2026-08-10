// Hop thu di (outbox): ghi su kien cung transaction voi du lieu nghiep vu, mot tien
// trinh nen day sang ERP sau. Cach nay khong mat su kien khi ERP dang chet — thay cho
// viec publish truc tiep RabbitMQ trong ban .NET goc.
import type { PoolClient } from 'pg';
import { createHmac } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';
import { pool, truy_van, thuc_thi } from '../csdl/ket_noi.ts';

export type LoaiSuKien =
  | 'lan_quet.da_ghi'
  | 'bang_cong.da_chot'
  | 'nghi_phep.da_duyet'
  | 'thiet_bi.mat_ket_noi'
  | 'thiet_bi.ket_noi_lai';

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

/**
 * Day toi da `so_luong` su kien chua gui sang ERP webhook.
 * Tra ve so su kien gui thanh cong. Neu chua cau hinh ERP_WEBHOOK_URL thi khong lam gi
 * (su kien nam lai trong bang, khong mat).
 */
export async function day_hop_thu_di(so_luong = 50): Promise<number> {
  if (cau_hinh.erp.webhook_url === '') return 0;

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
  if (cau_hinh.erp.webhook_url === '') return;
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
