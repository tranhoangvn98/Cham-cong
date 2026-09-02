// Vong quet dinh ky cua module giam sat.
//
// TACH RIENG khoi `su_kien/lich_chay.ts` co chu dich: lich chay kia co mot cong tat theo GIO
// (chi chay sau 01:00) vi viec cua no la chot ngay hom qua. Quet giam sat thi khac — no phai
// chay deu trong ngay de canh bao den kip luc con xu ly duoc, khong phai sang hom sau.
//
// KHOA VIEC theo O THOI GIAN, dung bang `cong_viec_da_chay` san co: nhieu instance chay song
// song thi dung mot instance thuc su quet. Khong dung thu vien cron — mot `setInterval` va
// mot phep chia lay o la du, va do la khuon repo dang dung.
import { cau_hinh } from '../cau_hinh.ts';
import { thuc_thi } from '../csdl/ket_noi.ts';
import { bat_giam_sat } from './ket_noi_erp.ts';
import { cac_loi_can_quet, ngu_canh_that, quet_mot_loi } from './danh_gia.ts';
import { bat_email, gui_ban_tin } from './ban_tin.ts';
import { gio_dia_phuong } from '../tien_ich/thoi_gian.ts';

/** Chu ky kiem tra. Moi vong chi quet nhung loi den han theo o thoi gian cua chung. */
const CHU_KY_PHUT = 15;

/**
 * Do dai mot o thoi gian. Mot loai loi chi quet MOT LAN trong moi o.
 *
 * 60 phut la can bang giua hai cai gia: quet day hon thi canh bao den som hon nhung ta doc
 * CSDL san xuat cua he thong khac day hon; quet thua thi canh bao den muon.
 */
const O_PHUT = 60;

let bo_hen: NodeJS.Timeout | null = null;
let dang_chay = false;

/** Ma o thoi gian hien tai, vi du '2026-09-02T08'. Dung lam mot phan cua khoa viec. */
export function ma_o(luc: Date, o_phut = O_PHUT): string {
  const o = Math.floor(luc.getTime() / (o_phut * 60_000));
  return String(o);
}

/**
 * Nhan viec. `insert ... on conflict do nothing` la nguyen tu nen nhieu instance chay song
 * song thi dung mot instance quet — khong doc trung CSDL ERP 1.
 */
async function nhan_viec(ma_viec: string): Promise<boolean> {
  const so = await thuc_thi(
    'insert into cong_viec_da_chay(ma_viec) values ($1) on conflict (ma_viec) do nothing',
    [ma_viec],
  );
  return so > 0;
}

async function ghi_ket_qua(ma_viec: string, ket_qua: string): Promise<void> {
  await thuc_thi('update cong_viec_da_chay set ket_qua = $2 where ma_viec = $1',
    [ma_viec, ket_qua.slice(0, 500)]);
}

/**
 * Don so ghi viec quet cu.
 *
 * Moi loai loi sinh mot dong moi o thoi gian: 39 loai x 24 o/ngay = ~936 dong/ngay. Khong
 * don la de lai mot cho phinh len mai mai. Giu 7 ngay du de go loi vong quet gan day.
 */
async function don_viec_cu(): Promise<void> {
  await thuc_thi(
    `delete from cong_viec_da_chay
      where ma_viec like 'quet_giam_sat:%' and chay_luc < now() - interval '7 days'`,
  );
}

/**
 * Don canh bao da xu ly xong tu lau.
 *
 * KHONG xoa canh bao chua xu ly, va KHONG xoa nhat ky xu ly cua chung — do la ho so kiem
 * soat noi bo. Chi don ban ghi da dong tren mot nam, de bang khong phinh vo han.
 */
async function don_canh_bao_cu(): Promise<number> {
  return thuc_thi(
    `delete from canh_bao
      where trang_thai in ('da_xu_ly','bo_qua')
        and xu_ly_luc is not null
        and xu_ly_luc < now() - interval '365 days'`,
  );
}

export interface KetQuaVong {
  so_loi_quet: number;
  so_canh_bao_moi: number;
  so_that_bai: number;
  bo_qua_ly_do: string | null;
}

/**
 * Mot vong quet. Tra ve so lieu de test va de lenh chay tay dung lai duoc.
 *
 * `ghi_that = false` dung cho nut "Chay thu" tren giao dien: chay het phep do nhung KHONG ghi
 * canh bao nao va KHONG ghi nhat ky chay.
 */
export async function chay_mot_vong(
  ghi_log: (s: string) => void = () => {},
  luc = new Date(),
): Promise<KetQuaVong> {
  if (!bat_giam_sat()) {
    return { so_loi_quet: 0, so_canh_bao_moi: 0, so_that_bai: 0,
      bo_qua_ly_do: 'Chưa cấu hình ERP1_HOST — module giám sát đang tắt.' };
  }

  const cac_loi = await cac_loi_can_quet();
  if (cac_loi.length === 0) {
    return { so_loi_quet: 0, so_canh_bao_moi: 0, so_that_bai: 0,
      bo_qua_ly_do: 'Không có loại lỗi nào đang bật kèm điều kiện đang bật.' };
  }

  const o = ma_o(luc);
  const ctx = ngu_canh_that(luc);
  let so_quet = 0;
  let so_moi = 0;
  let so_hong = 0;

  for (const loi of cac_loi) {
    const ma_viec = `quet_giam_sat:${loi.loai_loi_ma}:${o}`;
    if (!await nhan_viec(ma_viec)) continue; // o nay da quet roi (hoac instance khac dang lam)

    const kq = await quet_mot_loi(loi, ctx);
    so_quet += 1;
    so_moi += kq.so_canh_bao_moi;
    if (!kq.thanh_cong) so_hong += 1;

    await ghi_ket_qua(ma_viec,
      kq.thanh_cong
        ? `doc ${kq.so_ban_ghi_doc}, moi ${kq.so_canh_bao_moi}, ${kq.mili_giay}ms`
        : `HONG: ${kq.thong_diep ?? ''}`);

    if (!kq.thanh_cong) {
      ghi_log(`[giam_sat] ${loi.loai_loi_ma} HONG: ${kq.thong_diep ?? ''}`);
    } else if (kq.so_canh_bao_moi > 0) {
      ghi_log(`[giam_sat] ${loi.loai_loi_ma}: ${kq.so_canh_bao_moi} canh bao moi`);
    }
  }

  await don_viec_cu();
  const da_don = await don_canh_bao_cu();
  if (da_don > 0) ghi_log(`[giam_sat] don ${da_don} canh bao da dong tren mot nam`);

  // Ban tin hang ngay. Gio tinh theo mui gio NOI DAT MAY CHAM CONG, khong theo mui gio may
  // chu — mot ban tin gui luc 7 gio sang phai la 7 gio o cho nguoi doc no.
  if (bat_email()) {
    const gio = Number(gio_dia_phuong(luc).slice(0, 2));
    if (gio === cau_hinh.thu_dien_tu.gio_gui) {
      try {
        const bt = await gui_ban_tin(luc);
        if (bt.da_gui) ghi_log(`[giam_sat] da gui ban tin: ${bt.so_canh_bao} canh bao`);
      } catch (loi) {
        // Gui email that bai KHONG duoc lam hong vong quet: quet la viec chinh, ban tin la
        // viec phu. `gui_ban_tin` da nha khoa nen vong sau se thu lai.
        ghi_log(`[giam_sat] gui ban tin that bai: ${(loi as Error).message}`);
      }
    }
  }

  return { so_loi_quet: so_quet, so_canh_bao_moi: so_moi, so_that_bai: so_hong,
    bo_qua_ly_do: null };
}

/**
 * Bat vong quet nen.
 *
 * `unref()` de tien trinh van thoat duoc khi khong con viec gi — giong `lich_chay.ts`.
 * `dang_chay` chan hai vong chong len nhau khi mot vong keo dai hon chu ky (ERP 1 cham).
 */
export function bat_lich_quet(ghi_log: (s: string) => void = console.log): void {
  if (bo_hen !== null) return;
  if (!bat_giam_sat()) {
    ghi_log('[giam_sat] chua cau hinh ERP1_HOST — khong bat vong quet');
    return;
  }

  const vong = (): void => {
    if (dang_chay) return;
    dang_chay = true;
    chay_mot_vong(ghi_log)
      .catch((loi: unknown) => {
        ghi_log(`[giam_sat] vong quet loi: ${(loi as Error).message}`);
      })
      .finally(() => { dang_chay = false; });
  };

  bo_hen = setInterval(vong, CHU_KY_PHUT * 60 * 1000);
  bo_hen.unref();
  // Chay mot vong 30 giay sau khi khoi dong: bat kip o hien tai sau khi khoi dong lai,
  // nhung du tre de khong dua vao luc may chu con dang nap.
  setTimeout(vong, 30_000).unref();
  ghi_log(`[giam_sat] bat vong quet moi ${CHU_KY_PHUT} phut, o thoi gian ${O_PHUT} phut`);
}

export function dung_lich_quet(): void {
  if (bo_hen !== null) {
    clearInterval(bo_hen);
    bo_hen = null;
  }
}
