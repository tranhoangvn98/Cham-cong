// Sap xep kho tep ho so vao dung cay thu muc, va giu no dung khi ma nhan vien / ho ten doi.
//
// NGUYEN TAC QUAN TRONG NHAT: `ho_so_tep.ten_luu` LA KHOA DOC. Khong cho nao doc tep bang
// cach tinh lai duong dan tu ma nhan vien.
//
// Vi sao: ma nhan vien va ho ten deu DOI DUOC — dong bo ERP ghi lai ho ten moi lan chay, va
// nhan su doi duoc ma. Neu doc bang cach tinh lai thi moi lan doi ten la mot lan CA KHO TEP
// bien mat, va no bien mat im lang: khong loi, chi la "khong tim thay tep".
//
// Cay thu muc vi the la thu duoc BAO TRI theo, khong phai thu duoc TIN vao:
//
//   doi ma_nv / ho_ten  ->  doi cho tep tren dia  ->  cap nhat `ten_luu`
//                                                     ^ that bai o day thi ten_luu van tro
//                                                       den cho cu, va cho cu VAN CON TEP,
//                                                       nen moi thu van doc duoc. Chi la
//                                                       ten thu muc lech voi ho so.
//
// Lech thi lan quet sau sua. Doc KHONG BAO GIO hong. Do la thu tu duy nhat chap nhan duoc
// khi thu dang di chuyen la ban goc hop dong lao dong.
import { truy_van, thuc_thi } from '../csdl/ket_noi.ts';
import { doi_cho_tep_ho_so } from '../tien_ich/luu_tep.ts';
import {
  duong_dan_hop_le, la_duong_dan_cu, ten_tep_chuan, ten_thu_muc_nhan_vien,
} from '../tien_ich/ten_tep.ts';

export interface DongTep {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  nhom: string;
  ten_goc: string;
  ten_luu: string;
  tao_luc: string;
}

/**
 * Duong dan mong muon cua mot tep, theo ma nhan vien va ho ten HIEN TAI.
 *
 * Giu nguyen phan duoi va phan ma hex cua ten cu khi co the — doi ten thu muc thi khong
 * viec gi phai doi luon ten tep, va giu nguyen lam lan quet sau nhan ra ngay "tep nay da
 * dung ten, chi sai thu muc".
 */
export function duong_dan_mong_muon(d: DongTep): string {
  const thu_muc = `${ten_thu_muc_nhan_vien(d.ma_nv, d.ho_ten)}/${d.nhom}`;

  // Tep dang o cay MOI: giu nguyen ten tep, chi doi thu muc.
  if (!la_duong_dan_cu(d.ten_luu)) {
    const ten_tep = d.ten_luu.split('/').pop() ?? '';
    return `${thu_muc}/${ten_tep}`;
  }

  // Tep o cay CU (`YYYY-MM/<uuid>.pdf`): dung ten moi hoan toan. Ngay lay tu `tao_luc` cua
  // dong CSDL chu khong lay hom nay — ten tep phai noi dung luc tep duoc nap.
  const duoi = (d.ten_luu.split('.').pop() ?? 'pdf').toLowerCase();
  const ten_tep = ten_tep_chuan({
    ngay: String(d.tao_luc).slice(0, 10),
    nhom: d.nhom,
    ten_goc: d.ten_goc,
    ma_tep: d.id,
    duoi,
  });
  return `${thu_muc}/${ten_tep}`;
}

export interface KetQuaSapXep {
  so_xet: number;
  so_doi_cho: number;
  so_dung_cho: number;
  /** Tep co dong CSDL nhung khong con tren dia. */
  so_mat_tep: number;
  /** Duong dan trong CSDL khong hop le — dau hieu du lieu hong, phai co nguoi xem. */
  so_duong_dan_xau: number;
  che_do: 'thu' | 'that';
  chi_tiet: {
    id: string; ma_nv: string; ho_ten: string; ten_goc: string;
    tu: string; den: string;
    ket_qua: 'se_doi' | 'da_doi' | 'dung_cho' | 'mat_tep' | 'duong_dan_xau';
  }[];
}

/**
 * Sap xep lai toan bo kho tep.
 *
 * `che_do = 'thu'` KHONG di chuyen gi — chi liet ke se doi cai gi. Mac dinh la 'thu' vi thu
 * dang di chuyen la ban goc hop dong, CCCD, bang cap: khong khoi phuc duoc tu CSDL.
 *
 * GOI LAI DUOC NHIEU LAN. Tep da dung cho thi bo qua; tep khong con tren dia thi dem vao
 * `so_mat_tep` va bao ra chu khong nem loi — mot tep mat khong duoc phep chan viec sap xep
 * hang tram tep con lai.
 */
export async function sap_xep_kho(
  che_do: 'thu' | 'that' = 'thu',
  chi_nhan_vien: string | null = null,
): Promise<KetQuaSapXep> {
  const ds = await truy_van<DongTep>(
    `select t.id, t.nhan_vien_id, nv.ma_nv, nv.ho_ten, t.nhom, t.ten_goc, t.ten_luu,
            to_char(t.tao_luc, 'YYYY-MM-DD') as tao_luc
       from ho_so_tep t
       join nhan_vien nv on nv.id = t.nhan_vien_id
      where ($1::uuid is null or t.nhan_vien_id = $1)
      order by nv.ma_nv, t.nhom, t.tao_luc`,
    [chi_nhan_vien],
  );

  const kq: KetQuaSapXep = {
    so_xet: ds.length, so_doi_cho: 0, so_dung_cho: 0, so_mat_tep: 0,
    so_duong_dan_xau: 0, che_do, chi_tiet: [],
  };

  for (const d of ds) {
    // Duong dan trong CSDL khong hop le: KHONG dung `doi_cho_tep_ho_so` (no se tra false va
    // ta khong phan biet duoc voi "tep da mat"). Bao ra de co nguoi xem — day la dau hieu
    // du lieu hong, khong phai viec may tu xu ly duoc.
    if (!duong_dan_hop_le(d.ten_luu)) {
      kq.so_duong_dan_xau++;
      kq.chi_tiet.push({ ...gon(d), tu: d.ten_luu, den: '', ket_qua: 'duong_dan_xau' });
      continue;
    }

    const den = duong_dan_mong_muon(d);
    if (den === d.ten_luu) {
      kq.so_dung_cho++;
      continue;
    }

    if (che_do === 'thu') {
      kq.so_doi_cho++;
      kq.chi_tiet.push({ ...gon(d), tu: d.ten_luu, den, ket_qua: 'se_doi' });
      continue;
    }

    // BA BUOC, va thu tu la ca van de.
    //
    // Khong the goi mot lenh nao lam nguyen tu ca hai viec "doi cho tep tren dia" va "cap
    // nhat dong CSDL" — mot ben la he tep, mot ben la Postgres. Nen phai chon xem hong o
    // giua thi de lai trang thai nao, va CHI CO MOT lua chon chap nhan duoc: trang thai ma
    // moi tep van doc duoc.
    //
    //   1. rename tren dia          tep sang cho moi, CSDL van tro cho cu -> TAM THOI HONG
    //   2. update ten_luu           khop lai, xong
    //   3. update hong -> rename nguoc lai, roi nem loi len
    //
    // Cua so hong o buoc 1 chi dai bang mot lenh `update`, va buoc 3 dong no lai. Neu tien
    // trinh bi giet dung giua buoc 1 va 2 — mat dien, OOM — thi tep do khong doc duoc cho
    // toi lan sap xep sau; lan do se thay `ten_luu` tro den cho khong co tep, dem vao
    // `so_mat_tep` va bao ra.
    //
    // Thu tu nguoc (update truoc, rename sau) NGHE co ve an toan hon nhung te hon that:
    // rename that bai thi CSDL da tro den mot cho khong bao gio co tep, va khong con thong
    // tin nao de tim lai tep cu.
    const da_doi = await doi_cho_tep_ho_so(d.ten_luu, den);
    if (!da_doi) {
      kq.so_mat_tep++;
      kq.chi_tiet.push({ ...gon(d), tu: d.ten_luu, den, ket_qua: 'mat_tep' });
      continue;
    }

    try {
      await thuc_thi('update ho_so_tep set ten_luu = $2 where id = $1', [d.id, den]);
    } catch (loi) {
      // Tra tep ve cho cu de `ten_luu` trong CSDL van dung. Tha de cay thu muc lech mot
      // dong hon la de mot ban scan hop dong khong mo duoc.
      await doi_cho_tep_ho_so(den, d.ten_luu);
      throw loi;
    }

    kq.so_doi_cho++;
    kq.chi_tiet.push({ ...gon(d), tu: d.ten_luu, den, ket_qua: 'da_doi' });
  }

  return kq;
}

function gon(d: DongTep): { id: string; ma_nv: string; ho_ten: string; ten_goc: string } {
  return { id: d.id, ma_nv: d.ma_nv, ho_ten: d.ho_ten, ten_goc: d.ten_goc };
}

/**
 * Dong bo thu muc cua MOT nhan vien. Goi sau khi doi ma nhan vien hay ho ten.
 *
 * KHONG NEM LOI. Doi ho ten la mot thao tac hanh chinh binh thuong; no khong duoc phep that
 * bai chi vi kho tep tam thoi khong ghi duoc. Lech thi lan quet dinh ky sau se sua, va
 * trong luc lech thi moi thu van doc duoc binh thuong vi `ten_luu` van tro dung cho.
 *
 * Tra ve so tep da doi cho, hoac null khi co loi (da ghi log).
 */
export async function dong_bo_thu_muc_nhan_vien(
  nhan_vien_id: string,
  ghi_log: (s: string) => void = () => { /* im lang theo mac dinh */ },
): Promise<number | null> {
  try {
    const kq = await sap_xep_kho('that', nhan_vien_id);
    if (kq.so_doi_cho > 0) {
      ghi_log(`[sap_xep] doi cho ${String(kq.so_doi_cho)} tep cua nhan vien ${nhan_vien_id}`);
    }
    return kq.so_doi_cho;
  } catch (loi) {
    ghi_log(`[sap_xep] KHONG doi cho duoc tep cua ${nhan_vien_id}: ${(loi as Error).message}. `
      + 'Tep van doc duoc binh thuong; lan quet dinh ky sau se sua ten thu muc.');
    return null;
  }
}

/** Ma viec cho bo lich — mot lan moi ngay. */
export function ma_viec_sap_xep(hom_nay: string): string {
  return `sap_xep_kho_tep:${hom_nay}`;
}

/**
 * Con bao nhieu tep chua dung cho? Dung cho trang quan tri va cho /health chi tiet.
 *
 * Chi DEM, khong di chuyen gi.
 */
export async function so_tep_lech(): Promise<{
  tong: number; lech: number; cay_cu: number; duong_dan_xau: number;
}> {
  const kq = await sap_xep_kho('thu');
  return {
    tong: kq.so_xet,
    lech: kq.so_doi_cho,
    cay_cu: kq.chi_tiet.filter((c) => la_duong_dan_cu(c.tu)).length,
    duong_dan_xau: kq.so_duong_dan_xau,
  };
}

