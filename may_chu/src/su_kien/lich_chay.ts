// Cong viec chay dinh ky.
//
// VI SAO BAT BUOC PHAI CO: nguoi VANG ca ngay khong he co lan quet nao, nen khong co
// gi kich hoat tinh cong cho ho. Neu khong chay viec nay, ngay vang se KHONG BAO GIO
// xuat hien tren bang cong va ke toan se tuong ho khong thieu cong.
import { OFFSET_MAY_MS } from '../cau_hinh.ts';
import { truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { chot_ngay_hom_qua } from '../cong/tinh_cong.ts';
import { don_su_kien_cu } from './hop_thu_di.ts';
import { ma_viec_nhac_han, quet_nhac_han } from '../hop_dong/nhac_han.ts';
import { cong_ngay, ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';

/** Chu ky kiem tra. Khong dung cron: chi can do dung ngay/gio moi vong. */
const CHU_KY_PHUT = 15;

/** Gio (theo mui gio may cham cong) bat dau chay viec cuoi ngay. */
const GIO_CHAY = 1;

let bo_hen: NodeJS.Timeout | null = null;

/**
 * Nhan mot cong viec. Tra ve true neu instance nay gianh duoc viec (nen chay),
 * false neu viec da duoc chay truoc do.
 *
 * `insert ... on conflict do nothing` la nguyen tu, nen nhieu instance chay song song
 * thi dung mot instance thuc su lam viec.
 */
async function nhan_viec(ma_viec: string): Promise<boolean> {
  const so = await thuc_thi(
    'insert into cong_viec_da_chay(ma_viec) values ($1) on conflict (ma_viec) do nothing',
    [ma_viec],
  );
  return so > 0;
}

/** Nha viec ra de vong sau thu lai (dung khi viec that bai). */
async function nha_viec(ma_viec: string): Promise<void> {
  await thuc_thi('delete from cong_viec_da_chay where ma_viec = $1', [ma_viec]);
}

async function ghi_ket_qua(ma_viec: string, ket_qua: string): Promise<void> {
  await thuc_thi('update cong_viec_da_chay set ket_qua = $2 where ma_viec = $1', [ma_viec, ket_qua]);
}

async function chay_mot_vong(ghi_log: (s: string, ...t: unknown[]) => void): Promise<void> {
  const bay_gio = new Date();
  const hom_nay = ngay_dia_phuong(bay_gio);
  const gio_may = new Date(bay_gio.getTime() + OFFSET_MAY_MS).getUTCHours();

  // Chi chay sau GIO_CHAY de chac chan may da day het log cua ngay hom truoc.
  if (gio_may < GIO_CHAY) return;

  const hom_qua = cong_ngay(hom_nay, -1);
  const ma_viec = `chot_ngay:${hom_qua}`;

  if (await nhan_viec(ma_viec)) {
    ghi_log(`[lich] chot bang cong ngay ${hom_qua} (gom ca nguoi vang)`);
    try {
      const so = await chot_ngay_hom_qua(bay_gio);
      await ghi_ket_qua(ma_viec, `da tinh ${so} dong`);
      ghi_log(`[lich] da tinh ${so} dong bang cong cho ${hom_qua}`);
    } catch (loi) {
      // Nha viec de vong sau thu lai — khong duoc bo qua im lang.
      await nha_viec(ma_viec);
      ghi_log(`[lich] LOI khi chot ngay ${hom_qua}: ${(loi as Error).message}`);
    }
  }

  // Nhac han hop dong, moi ngay mot lan.
  //
  // Chay cung khung gio cuoi ngay, khong phai vao gio hanh chinh: `nhan_viec` chi cho MOT
  // instance chay, nhung neu de no chay ngay khi khoi dong may chu thi moi lan trien khai
  // lai trong ngay se... khong gui lai (da co ma viec cua ngay do), dung nhu mong doi.
  const ma_nhac = ma_viec_nhac_han(hom_nay);
  if (await nhan_viec(ma_nhac)) {
    try {
      const kq = await quet_nhac_han(hom_nay);
      await ghi_ket_qua(ma_nhac,
        `xet ${String(kq.so_hop_dong)} hop dong, nhac ${String(kq.so_gui)}`);
      if (kq.so_gui > 0) {
        ghi_log(`[lich] da nhac han ${String(kq.so_gui)} hop dong`);
      }
    } catch (loi) {
      await nha_viec(ma_nhac);
      ghi_log(`[lich] LOI khi nhac han hop dong: ${(loi as Error).message}`);
    }
  }

  // Don hop thu di da gui, moi tuan mot lan.
  const ma_don = `don_outbox:${hom_nay.slice(0, 7)}-tuan${Math.ceil(Number(hom_nay.slice(8)) / 7)}`;
  if (await nhan_viec(ma_don)) {
    try {
      const so = await don_su_kien_cu(30);
      await ghi_ket_qua(ma_don, `da don ${so} su kien`);
      if (so > 0) ghi_log(`[lich] da don ${so} su kien cu trong hop thu di`);
    } catch (loi) {
      await nha_viec(ma_don);
      ghi_log(`[lich] LOI khi don hop thu di: ${(loi as Error).message}`);
    }
  }
}

/** Bat bo lich. Goi mot lan khi khoi dong may chu. */
export function bat_lich(ghi_log: (s: string, ...t: unknown[]) => void = console.log): void {
  if (bo_hen !== null) return;

  const vong = (): void => {
    chay_mot_vong(ghi_log).catch((loi: unknown) => {
      ghi_log(`[lich] LOI khong mong doi: ${(loi as Error).message}`);
    });
  };

  bo_hen = setInterval(vong, CHU_KY_PHUT * 60 * 1000);
  bo_hen.unref();
  // Chay ngay mot vong khi khoi dong de bu ngay bi bo qua luc may chu dung.
  setTimeout(vong, 5_000).unref();
}

export function dung_lich(): void {
  if (bo_hen !== null) {
    clearInterval(bo_hen);
    bo_hen = null;
  }
}

/** Kiem tra ngay hom qua da duoc chot chua — dung cho endpoint /health chi tiet. */
export async function da_chot_hom_qua(bay_gio: Date = new Date()): Promise<boolean> {
  const hom_qua = cong_ngay(ngay_dia_phuong(bay_gio), -1);
  const dong = await truy_van_mot<{ ma_viec: string }>(
    'select ma_viec from cong_viec_da_chay where ma_viec = $1',
    [`chot_ngay:${hom_qua}`],
  );
  return dong !== null;
}
