// Gui thong bao day (push) toi app dien thoai qua dich vu Expo.
//
// Truoc ban nay, app xin quyen -> lay Expo token -> POST /api/toi/token-push, may chu luu
// vao bang token_push... roi khong co gi doc bang do. Ca chuoi dung o mat xich cuoi: nhan
// vien nop don thi quan ly khong hay, don duoc duyet thi nhan vien khong hay.
//
// KHONG chan luong chinh: moi ham o day tu nuot loi cua no. Don nghi phep da duoc duyet
// thanh cong roi thi khong duoc phep tra loi 500 chi vi Expo tam thoi khong goi duoc.
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van, thuc_thi } from '../csdl/ket_noi.ts';

/** Expo nhan toi da 100 thong bao moi lan goi. */
const LO_TOI_DA = 100;

/** Bo cuoc thay vi treo mai neu Expo khong tra loi. */
const HET_GIO_MS = 10_000;

interface ThongBao {
  /** Nguoi nhan — id trong bang nguoi_dung. Token se duoc tra cuu tu day. */
  nguoi_dung_ids: string[];
  tieu_de: string;
  noi_dung: string;
  /** Kem theo de app biet bam vao thi mo man nao. */
  du_lieu?: Record<string, unknown>;
}

interface KetQuaExpo {
  data?: { status: string; message?: string; details?: { error?: string } }[];
}

/**
 * Gui mot thong bao. Tra ve so token da gui di (0 nghia la khong ai bat thong bao,
 * hoac tinh nang dang tat) — dung de ghi log, KHONG dung de bao loi cho nguoi dung.
 */
export async function gui_thong_bao(tb: ThongBao): Promise<number> {
  // LUU CHUONG BAO TRONG WEB truoc — khong phu thuoc push co bat hay khong. Nho the moi diem
  // su kien dang goi gui_ngam (nop don, duyet don, giai trinh...) tu dong co thong bao rieng.
  await luu_thong_bao_rieng(tb);

  if (!cau_hinh.thong_bao_day_bat) return 0;
  if (tb.nguoi_dung_ids.length === 0) return 0;

  const dong = await truy_van<{ token: string }>(
    'select token from token_push where nguoi_dung_id = any($1::uuid[])',
    [tb.nguoi_dung_ids],
  );
  if (dong.length === 0) return 0;

  let da_gui = 0;
  for (let i = 0; i < dong.length; i += LO_TOI_DA) {
    const lo = dong.slice(i, i + LO_TOI_DA);
    const than = lo.map((d) => ({
      to: d.token,
      title: tb.tieu_de,
      body: tb.noi_dung,
      sound: 'default',
      ...(tb.du_lieu === undefined ? {} : { data: tb.du_lieu }),
    }));

    const ket_qua = await goi_expo(than);
    if (ket_qua === null) continue;
    da_gui += lo.length;
    await don_token_chet(lo.map((d) => d.token), ket_qua);
  }
  return da_gui;
}

/**
 * Luu mot dong thong bao rieng cho tung nguoi nhan (chuong bao trong web).
 *
 * Tu nuot loi nhu ca module nay: thong bao la phan phu, khong duoc lam hong viec chinh (don da
 * luu xong). Chen mot cau cho ca lo bang unnest — mot lan di CSDL du bao nhieu nguoi nhan.
 */
async function luu_thong_bao_rieng(tb: ThongBao): Promise<void> {
  if (tb.nguoi_dung_ids.length === 0) return;
  try {
    await thuc_thi(
      `insert into thong_bao_rieng(nguoi_dung_id, tieu_de, noi_dung, du_lieu)
       select id, $2, $3, $4::jsonb from unnest($1::uuid[]) as id`,
      [tb.nguoi_dung_ids, tb.tieu_de, tb.noi_dung,
        tb.du_lieu === undefined ? null : JSON.stringify(tb.du_lieu)],
    );
  } catch (loi) {
    console.warn(`[bao] khong luu duoc thong bao rieng: ${(loi as Error).message}`);
  }
}

/** Goi Expo. Tra null khi that bai — da ghi log, ben goi khong phai xu ly gi them. */
async function goi_expo(than: unknown[]): Promise<KetQuaExpo | null> {
  const bo_huy = AbortSignal.timeout(HET_GIO_MS);
  try {
    const res = await fetch(cau_hinh.expo_push_url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(than),
      signal: bo_huy,
    });
    if (!res.ok) {
      console.warn(`[push] Expo tra ma ${res.status}`);
      return null;
    }
    return await res.json() as KetQuaExpo;
  } catch (loi) {
    console.warn(`[push] khong goi duoc Expo: ${(loi as Error).message}`);
    return null;
  }
}

/**
 * Xoa token ma Expo bao la da chet (go app, doi may). Khong don thi bang token_push
 * phinh mai va moi lan gui deu ton mot suat cho mot thiet bi khong con ton tai.
 */
async function don_token_chet(token: string[], kq: KetQuaExpo): Promise<void> {
  const chet: string[] = [];
  kq.data?.forEach((r, i) => {
    if (r.status === 'error' && r.details?.error === 'DeviceNotRegistered') {
      const t = token[i];
      if (t !== undefined) chet.push(t);
    }
  });
  if (chet.length === 0) return;
  try {
    await thuc_thi('delete from token_push where token = any($1::text[])', [chet]);
    console.info(`[push] da xoa ${chet.length} token khong con dung duoc`);
  } catch (loi) {
    console.warn(`[push] khong xoa duoc token chet: ${(loi as Error).message}`);
  }
}

/**
 * Goi gui ma khong cho ket qua. Dung o cuoi cac route: don da luu xong roi, thong bao
 * chi la phan phu — khong duoc lam cham phan hoi cung khong duoc lam hong no.
 */
export function gui_ngam(tb: ThongBao): void {
  gui_thong_bao(tb).catch((loi: unknown) => {
    console.warn(`[push] loi khong mong doi: ${(loi as Error).message}`);
  });
}

/** Tai khoan nguoi dung gan voi mot nhan vien. Nhan vien chua co tai khoan thi tra []. */
export async function tai_khoan_cua_nhan_vien(nhan_vien_id: string): Promise<string[]> {
  const dong = await truy_van<{ id: string }>(
    'select id from nguoi_dung where nhan_vien_id = $1 and dang_hoat_dong = true',
    [nhan_vien_id],
  );
  return dong.map((d) => d.id);
}

/**
 * Nguoi co quyen duyet don cua mot nhan vien: truong phong cua phong ban do, cong voi
 * moi tai khoan nhan su / admin.
 *
 * Gui cho ca nhan su chu khong chi truong phong: phong chua gan truong phong thi don se
 * khong den tay ai, va do la luc don bi bo quen lau nhat.
 */
export async function tai_khoan_nguoi_duyet(nhan_vien_id: string): Promise<string[]> {
  const dong = await truy_van<{ id: string }>(
    `select nd.id
       from nguoi_dung nd
      where nd.dang_hoat_dong = true
        and (
          nd.vai_tro in ('admin', 'nhan_su')
          or nd.nhan_vien_id = (
            select pb.truong_phong_id from nhan_vien nv
              join phong_ban pb on pb.id = nv.phong_ban_id
             where nv.id = $1
          )
        )`,
    [nhan_vien_id],
  );
  return dong.map((d) => d.id);
}
