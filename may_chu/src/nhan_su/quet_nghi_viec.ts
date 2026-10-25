// Quet nguoi DA NGHI ma tai khoan ERP1 / Microsoft 365 van con mo.
//
// VI SAO PHAI CO JOB NAY: nghiep vu nghi viec ghi su kien vao hop thu di, nhung mot su kien
// "da gui thanh cong" chi chung minh BEN NHAN DA TRA LOI 2xx — khong chung minh tai khoan da
// bi khoa. Ba loi da tung xay ra that o he thong nay:
//   * hop thu di tac, su kien nam im (xem v1.122.9) — nguoi nghi van dang nhap duoc;
//   * ben nhan tra 2xx nhung xu ly loi nghiep vu cua no;
//   * su kien bi danh dau bo qua bang tay (vu Quynh Anh, vu ERP147) roi khong ai nhac lai.
// Khong co job nay thi ca ba deu chi lo ra khi da qua muon.
//
// Nguon "da nghi" la trang thai trong CHINH he thong cham cong (`dang_hoat_dong = false`) —
// do la noi nghiep vu nghi viec duoc ghi. Job khong tu sua gi ca: no chi bao dong.
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van } from '../csdl/ket_noi.ts';
import { lay_token_graph } from '../su_kien/gui_email.ts';
import { gui_ngam } from '../su_kien/thong_bao_day.ts';
import { chuan_ngon_ngu, tra_chuoi, type NgonNgu } from '../chuoi/chi_muc.ts';

const HET_GIO_MS = 20_000;

export interface TrangThaiM365 {
  /** Tai khoan co ton tai trong Entra khong. false = da xoa han, coi nhu da dong. */
  ton_tai: boolean;
  dang_mo: boolean;
  so_giay_phep: number;
}

export type LoiNghiViec = 'erp1_chua_khoa' | 'm365_con_mo' | 'm365_con_giay_phep';

/**
 * Danh gia mot tai khoan M365 — ham THUAN de khoa quy tac bang test.
 *
 * Tai khoan khong ton tai KHONG phai loi: xoa han tai khoan la cach dong chat hon khoa.
 * `m365_con_mo` va `m365_con_giay_phep` tach rieng vi cach sua khac nhau (mo khoa vs rut phep),
 * va mot tai khoan da khoa van co the con giay phep.
 */
export function loi_m365(t: TrangThaiM365): LoiNghiViec[] {
  if (!t.ton_tai) return [];
  const loi: LoiNghiViec[] = [];
  if (t.dang_mo) loi.push('m365_con_mo');
  if (t.so_giay_phep > 0) loi.push('m365_con_giay_phep');
  return loi;
}

/** Doc trang thai that cua mot tai khoan trong Entra. null = khong doc duoc (mang/quyen). */
async function doc_entra(upn: string): Promise<TrangThaiM365 | null> {
  if (!cau_hinh.ms365_nghi_viec.bat) return null;
  try {
    const token = await lay_token_graph();
    const res = await fetch(
      `${cau_hinh.mail.goc_graph}/users/${encodeURIComponent(upn)}`
      + '?$select=accountEnabled,assignedLicenses',
      { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(HET_GIO_MS) },
    );
    if (res.status === 404) return { ton_tai: false, dang_mo: false, so_giay_phep: 0 };
    if (!res.ok) return null;
    const j = (await res.json().catch(() => ({}))) as {
      accountEnabled?: boolean; assignedLicenses?: unknown[];
    };
    return {
      ton_tai: true,
      dang_mo: j.accountEnabled !== false,
      so_giay_phep: Array.isArray(j.assignedLicenses) ? j.assignedLicenses.length : 0,
    };
  } catch {
    return null;
  }
}

export interface DongLoi {
  ma_nv: string;
  ho_ten: string;
  ngay_nghi_viec: string | null;
  upn: string | null;
  loi: LoiNghiViec[];
  /** Tai khoan M365 khong doc duoc (chua co UPN, Graph loi) — can nguoi kiem tra tay. */
  khong_kiem_tra_duoc: boolean;
}

export interface KetQuaQuetNghiViec {
  so_da_nghi: number;
  so_loi: number;
  so_khong_kiem_tra_duoc: number;
  ds: DongLoi[];
}

/**
 * Mot vong quet. Khong nem loi ra ngoai: job lich khong duoc lam sap gi, va mot tai khoan loi
 * mang khong duoc che mat cac tai khoan con lai.
 */
export async function quet_nghi_viec_chua_khoa(): Promise<KetQuaQuetNghiViec> {
  // CHI KIEM HE THONG DA NOI. Chua khai `ERP1_WEBHOOK_URL` thi he thong CHUA TUNG bao ERP1
  // lan nao — coi do la loi se sinh mot canh bao dung-su-that nhung vo dung moi ngay cho moi
  // nguoi da nghi, va cach chac chan nhat de nhan su bo qua canh bao that.
  const kiem_erp1 = cau_hinh.erp1.webhook_url !== '';
  const kiem_m365 = cau_hinh.ms365_nghi_viec.bat;
  if (!kiem_erp1 && !kiem_m365) {
    return { so_da_nghi: 0, so_loi: 0, so_khong_kiem_tra_duoc: 0, ds: [] };
  }

  const ds = await truy_van<{
    ma_nv: string; ho_ten: string; ngay_nghi_viec: string | null;
    email: string | null; email_microsoft: string | null; erp1_da_bao: number;
  }>(
    `select nv.ma_nv, nv.ho_ten, nv.ngay_nghi_viec::text as ngay_nghi_viec,
            nv.email, nd.email_microsoft,
            (select count(*)::int from hop_thu_di h
              where h.loai_su_kien = 'erp1.nhan_su.nghi_viec'
                and h.gui_luc is not null
                and h.du_lieu->>'ma_nv' = nv.ma_nv) as erp1_da_bao
       from nhan_vien nv
       left join nguoi_dung nd on nd.nhan_vien_id = nv.id
      where nv.dang_hoat_dong = false
      order by nv.ngay_nghi_viec desc nulls last, nv.ma_nv`,
  );

  const kq: KetQuaQuetNghiViec = { so_da_nghi: ds.length, so_loi: 0, so_khong_kiem_tra_duoc: 0, ds: [] };

  for (const d of ds) {
    const loi: LoiNghiViec[] = [];

    // ERP1: chua co su kien gui thanh cong nghia la chua ai bao ERP1 khoa tai khoan.
    if (kiem_erp1 && d.erp1_da_bao === 0) loi.push('erp1_chua_khoa');

    // M365: doc trang thai THAT tu Entra, khong suy tu su kien.
    const upn = (d.email_microsoft ?? d.email ?? '').trim();
    let khong_kiem_tra_duoc = false;
    if (kiem_m365) {
      if (upn === '' || !upn.includes('@')) {
        khong_kiem_tra_duoc = true;
      } else {
        const tt = await doc_entra(upn);
        if (tt === null) khong_kiem_tra_duoc = true;
        else loi.push(...loi_m365(tt));
      }
    }

    if (loi.length === 0 && !khong_kiem_tra_duoc) continue;
    if (loi.length > 0) kq.so_loi += 1;
    else kq.so_khong_kiem_tra_duoc += 1;

    kq.ds.push({
      ma_nv: d.ma_nv,
      ho_ten: d.ho_ten,
      ngay_nghi_viec: d.ngay_nghi_viec,
      upn: upn === '' ? null : upn,
      loi,
      khong_kiem_tra_duoc,
    });
  }

  if (kq.so_loi > 0) await bao_hr(kq);
  return kq;
}

/** Bao HR/admin danh sach tai khoan chua dong. Mot chuong cho ca danh sach, khong moi nguoi mot cai. */
async function bao_hr(kq: KetQuaQuetNghiViec): Promise<void> {
  const tai_khoan = await truy_van<{ id: string; ngon_ngu: string | null }>(
    `select id, ngon_ngu from nguoi_dung
      where dang_hoat_dong = true and vai_tro in ('admin', 'nhan_su')`,
  );
  if (tai_khoan.length === 0) return;

  const theo_ngon_ngu: Record<NgonNgu, string[]> = { vi: [], zh: [] };
  for (const t of tai_khoan) theo_ngon_ngu[chuan_ngon_ngu(t.ngon_ngu)].push(t.id);

  const mo_ta = (nn: NgonNgu): string => kq.ds
    .filter((d) => d.loi.length > 0)
    .map((d) => {
      const phan = d.loi.map((l) => tra_chuoi(nn, ma_khoa_loi(l))).join(', ');
      return `${d.ma_nv} ${d.ho_ten}: ${phan}`;
    })
    .join('; ');

  for (const nn of ['vi', 'zh'] as const) {
    const ids = theo_ngon_ngu[nn];
    if (ids.length === 0) continue;
    gui_ngam({
      nguoi_dung_ids: ids,
      tieu_de: tra_chuoi(nn, 'qn_tieu_de'),
      noi_dung: tra_chuoi(nn, 'qn_noi_dung', { so: kq.so_loi, danh_sach: mo_ta(nn) }),
      du_lieu: { man: 'nhan-vien' },
    });
  }
}

function ma_khoa_loi(loi: LoiNghiViec): 'qn_loi_erp1' | 'qn_loi_m365_mo' | 'qn_loi_m365_phep' {
  if (loi === 'erp1_chua_khoa') return 'qn_loi_erp1';
  if (loi === 'm365_con_mo') return 'qn_loi_m365_mo';
  return 'qn_loi_m365_phep';
}
