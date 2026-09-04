// Cong viec chay dinh ky.
//
// VI SAO BAT BUOC PHAI CO: nguoi VANG ca ngay khong he co lan quet nao, nen khong co
// gi kich hoat tinh cong cho ho. Neu khong chay viec nay, ngay vang se KHONG BAO GIO
// xuat hien tren bang cong va ke toan se tuong ho khong thieu cong.
import { cau_hinh, OFFSET_MAY_MS } from '../cau_hinh.ts';
import { truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { chot_ngay_hom_qua } from '../cong/tinh_cong.ts';
import { don_su_kien_cu } from './hop_thu_di.ts';
import { ma_viec_nhac_han, quet_nhac_han } from '../hop_dong/nhac_han.ts';
import { ma_viec_sap_xep, sap_xep_kho } from '../ho_so/sap_xep_tep.ts';
import { quet_va_xu_ly_ngay } from '../ra_vao/xu_ly.ts';
import { dong_bo_khoa_cua } from '../ra_vao/khoa_cua.ts';
import { quet_vi_pham } from '../vi_pham/phat_hien.ts';
import { gom_va_xu_ly_thang } from '../ky_luat/xu_ly.ts';
import { ghi_nhan, ma_viec_dong_bo, moc_dong_bo, quet } from '../sharepoint/dong_bo.ts';
import { cong_ngay, ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';

/** Chu ky kiem tra. Khong dung cron: chi can do dung ngay/gio moi vong. Khai duoc trong .env. */
const CHU_KY_PHUT = cau_hinh.lich_chu_ky_phut;

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

/**
 * Don so ghi cong viec cu.
 *
 * Khoa cua viec dong bo SharePoint la mot O 15 PHUT, tuc ~92 dong moi ngay. Cac viec khac deu
 * la mot dong moi ngay nen truoc day bang nay khong can don. Them mot nguon sinh dong deu deu
 * ma khong don la de lai mot cho phinh len mai mai — nho, nhung khong bao gio dung lai.
 *
 * Giu 7 ngay: du de doc lai `ket_qua` cua nhung vong gan day khi go loi.
 */
async function don_viec_cu(): Promise<void> {
  await thuc_thi(
    `delete from cong_viec_da_chay
      where ma_viec like 'dong_bo_sharepoint:%' and chay_luc < now() - interval '7 days'`,
  );
}

/** Nha viec ra de vong sau thu lai (dung khi viec that bai). */
async function nha_viec(ma_viec: string): Promise<void> {
  await thuc_thi('delete from cong_viec_da_chay where ma_viec = $1', [ma_viec]);
}

async function ghi_ket_qua(ma_viec: string, ket_qua: string): Promise<void> {
  await thuc_thi('update cong_viec_da_chay set ket_qua = $2 where ma_viec = $1', [ma_viec, ket_qua]);
}

/**
 * Doi chieu va day kho tep sang SharePoint. Chay MOI VONG.
 *
 * Tach thanh ham rieng de doc ra ngay la no KHONG nam sau cua chan gio cuoi ngay.
 */
async function dong_bo_sharepoint(
  bay_gio: Date, ghi_log: (s: string, ...t: unknown[]) => void,
): Promise<void> {
  // MOI VONG, khong phai moi ngay mot lan.
  //
  // Truoc day khoa la `dong_bo_sharepoint:<ngay>`, tuc mot lan mot ngay. Hau qua: nap mot tep
  // luc 13:00 chi GHI NHAN la co viec can day, con vong quet cua hom nay da chay xong tu 01:00
  // — nen tep phai cho den 01:00 SANG MAI. Ca mot ngay, va nguoi nap tep khong co cach nao
  // biet. Da gap dung tinh huong nay tren may that.
  //
  // Chay moi vong khong sao: `ghi_nhan` la upsert, `quet` chi cham dong co hai cot lech
  // nhau, va khong con viec thi `quet` ket thuc sau MOT cau SQL co chi muc — khong mot luot
  // goi Graph nao. Xem `moc_dong_bo`.
  //
  // `ghi_nhan` luon chay, `quet` chi day that khi SHAREPOINT_BAT_DAY=1. Nghia la bang trang
  // thai luon dung va xem duoc duong dan se la gi TRUOC khi bat dong bo.
  const ma_sp = ma_viec_dong_bo(moc_dong_bo(bay_gio, CHU_KY_PHUT));
  if (await nhan_viec(ma_sp)) {
    await don_viec_cu();
    try {
      const gn = await ghi_nhan();
      const q = await quet();
      await ghi_ket_qua(ma_sp,
        `xet ${String(gn.so_xet)}, doi ${String(gn.so_doi)}, con viec ${String(q.so_con_viec)}, `
        + `day ${String(q.so_day)}, xoa ${String(q.so_xoa)}, loi ${String(q.so_loi)}`
        + (q.chi_dem ? ' (chi dem, chua bat SHAREPOINT_BAT_DAY)' : ''));
      if (q.so_day > 0 || q.so_xoa > 0) {
        ghi_log(`[lich] SharePoint: day ${String(q.so_day)}, xoa ${String(q.so_xoa)}`);
      }
      if (q.so_loi > 0) {
        ghi_log(`[lich] CANH BAO SharePoint: ${String(q.so_loi)} tep loi. `
          + 'Xem He thong -> Kho tep ho so.');
      }
    } catch (loi) {
      await nha_viec(ma_sp);
      ghi_log(`[lich] LOI khi dong bo SharePoint: ${(loi as Error).message}`);
    }
  }

  // Don hop thu di da gui, moi tuan mot lan.
}

async function chay_mot_vong(ghi_log: (s: string, ...t: unknown[]) => void): Promise<void> {
  const bay_gio = new Date();
  const hom_nay = ngay_dia_phuong(bay_gio);
  const gio_may = new Date(bay_gio.getTime() + OFFSET_MAY_MS).getUTCHours();

  // ------------------------------------------------------------ dong bo SharePoint
  // CHAY TRUOC CUA CHAN GIO, va do la co y.
  //
  // Cua chan `gio_may < GIO_CHAY` ton tai cho cac viec CUOI NGAY: phai cho may cham cong day
  // het log cua ngay hom truoc roi moi chot bang cong. Viec dong bo tep khong lien quan gi den
  // dieu do — no chi copy tep len SharePoint. De no sau cua chan nghia la moi dem co mot cua so
  // MOT TIENG khong dong bo gi, va mot tep nap luc 00:10 phai cho den 01:00.
  //
  // Thu tu voi viec sap xep kho tep KHONG con la rang buoc. Ban dau khoi nay dat sau viec sap
  // xep vi lo "sap xep doi ten thu muc thi duong dan vua tinh se lech". Doc lai `SQL_MONG_MUON`
  // thi khong phai: duong dan SharePoint tinh tu `ma_nv` / `ho_ten` va sieu du lieu van ban,
  // con `ten_luu` chi duoc dung de lay DUOI TEP — ma sap xep khong doi duoi tep.
  await dong_bo_sharepoint(bay_gio, ghi_log);

  // ------------------------------------------------------------ khoa cua theo gio
  // CHAY MOI VONG, ca ngay (khong sau cua chan gio cuoi ngay): trang thai cua doi theo gio hanh
  // chinh. Chi gui lenh khi trang thai DOI, nen goi moi vong khong spam. An toan: khong may nao
  // co lich bat + lenh cau hinh thi ham ket thuc sau MOT cau SQL.
  try {
    const doi = await dong_bo_khoa_cua(bay_gio);
    if (doi > 0) ghi_log(`[lich] khoa cua: doi trang thai ${doi} may`);
  } catch (loi) {
    ghi_log(`[lich] LOI khi dong bo khoa cua: ${(loi as Error).message}`);
  }

  // ------------------------------------------------------------ cac viec cuoi ngay
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

  // Tu xu ly canh bao ra/vao cua ngay hom qua: duoi nguong -> nhac nho (email + thong bao app),
  // tu nguong -> tao ho so vi_pham de nhan su doi chieu. Chay SAU chot_ngay vi chot_ngay moi la
  // buoc ghi canh_bao_ra_vao cua hom qua.
  const ma_ra_vao = `ra_vao_xu_ly:${hom_qua}`;
  if (await nhan_viec(ma_ra_vao)) {
    try {
      const so = await quet_va_xu_ly_ngay(hom_qua);
      await ghi_ket_qua(ma_ra_vao, `da xu ly ${so} canh bao`);
      if (so > 0) ghi_log(`[lich] da tu xu ly ${so} canh bao ra/vao ngay ${hom_qua}`);
    } catch (loi) {
      await nha_viec(ma_ra_vao);
      ghi_log(`[lich] LOI khi xu ly canh bao ra/vao ${hom_qua}: ${(loi as Error).message}`);
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

  // Sap xep kho tep, moi ngay mot lan.
  //
  // Day la LUOI HUNG, khong phai duong chinh: doi ma nhan vien hay ho ten thi thu muc duoc
  // doi ngay tai cho. Nhung co BON cho sua duoc ma_nv/ho_ten (nhan su sua tay, nhap CSV,
  // dong bo ERP, API /api/v1), va mot cho quen goi la mot cho lech im lang mai mai. Lan quet
  // nay lam viec "quen mot cho" thanh "lech toi da mot ngay".
  //
  // An toan de chay hang ngay: tep da dung cho thi bo qua, va viec chi doi cho TRONG kho ho
  // so — khong xoa, khong ghi de.
  const ma_sap_xep = ma_viec_sap_xep(hom_nay);
  if (await nhan_viec(ma_sap_xep)) {
    try {
      const kq = await sap_xep_kho('that');
      await ghi_ket_qua(ma_sap_xep,
        `xet ${String(kq.so_xet)}, doi cho ${String(kq.so_doi_cho)}, `
        + `mat tep ${String(kq.so_mat_tep)}`);
      if (kq.so_doi_cho > 0) {
        ghi_log(`[lich] da sap xep ${String(kq.so_doi_cho)} tep vao dung thu muc`);
      }
      // Mat tep la chuyen PHAI co nguoi biet: co dong CSDL ma khong co tep tren dia.
      if (kq.so_mat_tep > 0 || kq.so_duong_dan_xau > 0) {
        ghi_log(`[lich] CANH BAO kho tep: ${String(kq.so_mat_tep)} tep mat, `
          + `${String(kq.so_duong_dan_xau)} duong dan xau. Chay `
          + '`npm run sap_xep_tep` de xem chi tiet.');
      }
    } catch (loi) {
      await nha_viec(ma_sap_xep);
      ghi_log(`[lich] LOI khi sap xep kho tep: ${(loi as Error).message}`);
    }
  }

  // Xu ly ky luat tu dong, MOI NGAY MOT LAN (chu cong ty chon: quet hang ngay, loi nhac nho gui
  // email luon). Gom vi pham cua thang HOM QUA (cong_ngay(-1)) — de tren ranh gioi thang van
  // chot dung thang truoc. Chay hang ngay cho tha ca thang hien tai: bat l01 nguoi vi pham la
  // ho so cap nhat, nguoi lao dong nhan email som (khong doi het thang).
  //
  // An toan khi chay lai moi ngay: `quet_vi_pham` dung `on conflict do nothing`;
  // `gom_va_xu_ly_thang` upsert theo (nguoi, ky, muc do), CAP NHAT LAI ho so tu dong theo so
  // lieu moi (di muon them thi tien phat tang), giu nguyen ho so nguoi da quyet, va KHONG gui
  // lai email/push da gui. Khoa `ky_luat_ngay:<hom qua>` dam bao mot ngay chi chay mot lan.
  const thang_kl = cong_ngay(hom_nay, -1).slice(0, 7);
  const ma_kl = `ky_luat_ngay:${cong_ngay(hom_nay, -1)}`;
  if (await nhan_viec(ma_kl)) {
    try {
      const ph = await quet_vi_pham(thang_kl, null);
      const gom = await gom_va_xu_ly_thang(thang_kl, { tu_dong: true });
      await ghi_ket_qua(ma_kl,
        `ky ${thang_kl}: phat hien ${String(ph.so_moi)} vi pham, gom ${String(gom.so_ho_so)} ho so `
        + `(nhac ${String(gom.so_nhac_nho)}, giam thuong ${String(gom.so_giam_thuong)}, `
        + `cho duyet ${String(gom.so_cho_duyet)})`);
      if (gom.so_cho_duyet > 0) {
        ghi_log(`[lich] ky luat ${thang_kl}: ${String(gom.so_cho_duyet)} ho so cho duyet`);
      }
    } catch (loi) {
      await nha_viec(ma_kl);
      ghi_log(`[lich] LOI khi xu ly ky luat ${thang_kl}: ${(loi as Error).message}`);
    }
  }

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
