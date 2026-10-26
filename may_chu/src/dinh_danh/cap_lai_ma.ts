// Cap lai ma nhan su cho nguoi DA CO ho so.
//
// VI SAO CAN: ma kieu cu (ERP69, NV0156, TAM14, BGD...) khong mang thong tin gi, va he thong da
// chuyen sang khuon NV + ma ngan khoi + MMYY + so thu tu cho nguoi moi. Nguoi cu khong co duong
// nao doi sang khuon moi: o `ma_nv` tren form cho go tay, nghia la nguoi lap ho so phai tu bia
// so — va se bia trung.
//
// DAY LA THAO TAC DOI DANH TINH, khong phai sua mot o nhap lieu. Ba hau qua duoc xu ly o day:
//
//   1. Ma cu duoc DONG LAI trong `ma_dinh_danh` (khong xoa): cau hoi "lan quet thang 6 bang ma
//      ERP69 la cua ai" van tra loi duoc.
//   2. Ten thu muc kho tep mang ma nhan vien, nen doi ma thi thu muc phai doi theo.
//   3. Ban ghi ben CONG phan quyen van mang ma cu — hop dong voi cong khong co dong tu doi ma.
//      Phan hoi tra canh bao de co nguoi doi chieu tay; khong tu bia su kien.
import type pg from 'pg';
import { trong_giao_dich, truy_van } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiKhongTim } from '../tien_ich/kiem_tra.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { dong_bo_thu_muc_nhan_vien } from '../ho_so/sap_xep_tep.ts';
import { bo_chay_tu, gan_ma } from './nghiep_vu.ts';
import {
  KHUON_MA_NHAN_SU, TIEN_TO_MA_NHAN_SU, sinh_ma_nhan_su, thang_trong_ma,
} from './ma_nhan_su.ts';

/** Ma da dung khuon sinh tu dong (NV + ma ngan khoi + MMYY + so thu tu) hay chua. */
export function la_ma_theo_khuon(ma: string): boolean {
  return KHUON_MA_NHAN_SU.test(ma.trim().toUpperCase());
}

/** 'YYYY-MM-DD' hop le thi tra lai, con lai null. */
function ngay_hop_le(x: string | null): string | null {
  if (x === null) return null;
  const t = x.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

/**
 * Ngay dung de sinh phan MMYY cua ma.
 *
 * Uu tien ngay vao lam. Nguoi cu thieu ngay vao lam thi lay ngay TAO HO SO — do la moc gan nhat
 * voi su that con lai; lay "hom nay" thi ma se mang thang cua luc cap lai, khong phai thang ho
 * vao lam, va se sai vinh vien.
 */
export function ngay_de_sinh_ma(
  ngay_vao: string | null, tao_luc: Date | string | null, hom_nay: Date = new Date(),
): string {
  const vao = ngay_hop_le(ngay_vao);
  if (vao !== null) return vao;
  if (tao_luc !== null) {
    const d = tao_luc instanceof Date ? tao_luc : new Date(tao_luc);
    if (!Number.isNaN(d.getTime())) return ngay_dia_phuong(d);
  }
  return ngay_dia_phuong(hom_nay);
}

/** Ma du kien de nguoi dung nhin truoc. So thu tu chi biet khi cap that. */
export function ma_du_kien(ma_ngan: string | null, ngay: string): string {
  const mn = (ma_ngan ?? '').trim().toUpperCase();
  if (mn === '') return '';
  return `${TIEN_TO_MA_NHAN_SU}${mn}${thang_trong_ma(ngay)}####`;
}

export interface DongMaCu {
  id: string;
  ma_nv: string;
  ho_ten: string;
  dang_hoat_dong: boolean;
  khoi_id: string | null;
  khoi_ten: string | null;
  ma_ngan: string | null;
  ngay_vao: string | null;
  /** Ngay dung de sinh ma — ngay vao lam, thieu thi ngay tao ho so. */
  ngay_sinh_ma: string;
  /** Ma du kien (so thu tu la `####`); rong khi khoi chua khai ma ngan. */
  ma_du_kien: string;
}

/**
 * Nhung nguoi con dung ma kieu cu, kem ma du kien neu cap lai.
 *
 * CHI DOC: khong cap ma nao o day. Cap ma la thao tac doi danh tinh (doi ten thu muc, lech ma
 * ben cong) nen phai do nguoi that bam, tung nguoi mot.
 */
export async function danh_sach_ma_cu(): Promise<DongMaCu[]> {
  const dong = await truy_van<{
    id: string; ma_nv: string; ho_ten: string; dang_hoat_dong: boolean;
    khoi_id: string | null; khoi_ten: string | null; ma_ngan: string | null;
    ngay_vao: string | null; tao_luc: Date | string | null;
  }>(
    `select nv.id, nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong,
            nv.khoi_id, k.ten as khoi_ten, k.ma_ngan,
            nv.ngay_vao::text as ngay_vao, nv.tao_luc
       from nhan_vien nv
       left join khoi k on k.id = nv.khoi_id
      where upper(trim(nv.ma_nv)) !~ '^NV[A-Z]+[0-9]{4}[0-9]{4,}$'
      order by nv.dang_hoat_dong desc, nv.ho_ten`,
  );
  return dong.map((d) => {
    const ngay = ngay_de_sinh_ma(d.ngay_vao, d.tao_luc);
    return {
      id: d.id,
      ma_nv: d.ma_nv,
      ho_ten: d.ho_ten,
      dang_hoat_dong: d.dang_hoat_dong,
      khoi_id: d.khoi_id,
      khoi_ten: d.khoi_ten,
      ma_ngan: d.ma_ngan,
      ngay_vao: d.ngay_vao,
      ngay_sinh_ma: ngay,
      ma_du_kien: ma_du_kien(d.ma_ngan, ngay),
    };
  });
}

export interface KetQuaCapLaiMa {
  ma_cu: string;
  ma_moi: string;
  /** Ma cu co dung khuon moi khong (false = kieu cu: ERP69, NV0156...). */
  ma_cu_dung_khuon: boolean;
  /** Ngay dung de sinh phan MMYY. */
  ngay_sinh_ma: string;
  /** Viec phai lam tiep, noi ro cho nguoi bam. */
  canh_bao: string[];
}

/**
 * Cap lai ma cho MOT nguoi, theo dung khuon cua nguoi moi.
 *
 * Mot transaction cho phan CSDL: dong `noi_bo` cu duoc dong lai, dong moi duoc them, cot
 * `nhan_vien.ma_nv` duoc ghi. Tao ten thu muc nam ngoai transaction (thao tac tren dia, co the
 * cham va co the that bai ma khong duoc lam mat ma vua cap).
 */
export async function cap_lai_ma_nhan_su(
  nhan_vien_id: string,
  ly_do: string | null = null,
  ghi_log: (s: string) => void = () => {},
  khoi_mac_dinh: string | null = null,
): Promise<KetQuaCapLaiMa> {
  const kq = await trong_giao_dich(async (khach) => {
    const nv = (await khach.query<{
      ma_nv: string; khoi_id: string | null;
      ngay_vao: string | null; tao_luc: Date | string | null;
    }>(
      `select ma_nv, khoi_id, ngay_vao::text as ngay_vao, tao_luc
         from nhan_vien where id = $1 for update`,
      [nhan_vien_id],
    )).rows[0];
    if (nv === undefined) throw new LoiKhongTim('Không tìm thấy nhân viên.');

    // Khai khoi mac dinh = nguoi goi chu dong chon khoi cho nguoi CHUA co khoi. Ghi luon vao ho
    // so: de trong thi ma khong sinh duoc, ma tu suy khoi tu ten phong ban la doan — va doan sai
    // thi ma sai vinh vien.
    let khoi_id = nv.khoi_id;
    if (khoi_id === null && khoi_mac_dinh !== null && khoi_mac_dinh !== '') {
      const k = (await khach.query<{ id: string }>(
        'select id from khoi where id::text = $1 or ma = $1', [khoi_mac_dinh])).rows[0];
      if (k === undefined) throw new LoiDauVao('Không thấy khối mặc định này trong danh mục.');
      khoi_id = k.id;
      await khach.query(
        'update nhan_vien set khoi_id = $2, cap_nhat_luc = now() where id = $1',
        [nhan_vien_id, khoi_id],
      );
    }
    if (khoi_id === null) {
      throw new LoiDauVao(
        'Nhân viên chưa thuộc khối nào — mã nhân sự được ghép từ mã ngắn của khối. '
        + 'Gán khối cho hồ sơ rồi cấp lại mã.');
    }

    const ngay = ngay_de_sinh_ma(nv.ngay_vao, nv.tao_luc);
    const ma_moi = await sinh_ma_nhan_su(khach, khoi_id, ngay);

    // `noi_bo` khai `nhieu_ma: false` nen `gan_ma` tu dong dong dong cu lai (giu lich su) roi
    // them dong moi. Cot `ma_nv` thi `noi_bo` khai `dong_bo_cot: 'khong'` — form ho so so huu
    // cot do, nen phai ghi tay o duoi.
    const gan = await gan_ma(nhan_vien_id, 'noi_bo', ma_moi, {
      nguon: 'nguoi_khai',
      ghi_chu: ly_do === null || ly_do.trim() === ''
        ? `Cấp lại mã: ${nv.ma_nv} → ${ma_moi}`
        : `Cấp lại mã: ${nv.ma_nv} → ${ma_moi}. Lý do: ${ly_do.trim()}`,
    }, bo_chay_tu(khach));
    if (gan.ket_cuc !== 'thay_the' && gan.ket_cuc !== 'them_moi') {
      throw new LoiDauVao(
        `Không cấp lại được mã "${ma_moi}" (${gan.ket_cuc}) — thử lại, hoặc báo quản trị hệ thống.`);
    }

    await khach.query(
      'update nhan_vien set ma_nv = $2, cap_nhat_luc = now() where id = $1',
      [nhan_vien_id, ma_moi],
    );

    return { ma_cu: nv.ma_nv, ma_moi, ngay };
  });

  // Thu muc kho tep mang ma nhan vien. Doi that bai thi KHONG cuon ma vua cap: `ho_so_tep.ten_luu`
  // van tro dung cho cu nen moi tep van doc duoc, va lan quet dinh ky se sua ten thu muc sau.
  let doi_thu_muc = true;
  try {
    await dong_bo_thu_muc_nhan_vien(nhan_vien_id, ghi_log);
  } catch (loi) {
    doi_thu_muc = false;
    ghi_log(`[ma] khong doi duoc ten thu muc kho tep: ${(loi as Error).message}`);
  }

  const canh_bao = [
    `Mã "${kq.ma_cu}" đã đóng lại trong bảng mã định danh (không xóa): lịch sử quẹt máy và `
      + 'chứng từ cũ vẫn tra cứu được theo mã đó.',
    'Bản ghi bên cổng phân quyền vẫn mang mã cũ — hợp đồng với cổng không có động từ đổi mã, '
      + 'cần cập nhật tay bên đó.',
    doi_thu_muc
      ? 'Tên thư mục kho tệp đã đổi theo mã mới; đường dẫn SharePoint theo ở lần đồng bộ kế tiếp.'
      : 'Chưa đổi được tên thư mục kho tệp — tệp vẫn mở được theo đường dẫn cũ, lần quét định kỳ '
        + 'sẽ đổi tên sau.',
  ];

  return {
    ma_cu: kq.ma_cu,
    ma_moi: kq.ma_moi,
    ma_cu_dung_khuon: la_ma_theo_khuon(kq.ma_cu),
    ngay_sinh_ma: kq.ngay,
    canh_bao,
  };
}

export interface DongDaCap {
  id: string;
  ma_cu: string;
  ho_ten: string;
  ma_moi: string;
}

export interface DongBoQua {
  id: string;
  ma_nv: string;
  ho_ten: string;
  ly_do: string;
}

export interface KetQuaCapLaiHangLoat {
  da_cap: DongDaCap[];
  bo_qua: DongBoQua[];
  loi: DongBoQua[];
}

/**
 * Cap lai ma cho MOI nguoi con dung ma kieu cu.
 *
 * VI SAO CO DUONG NAY: danh sach that co hang chuc nguoi (`ERP124`, `ERP9`...). Bam tung nguoi
 * mot thi khong ai lam, va he thong se mai co hai kieu ma song song.
 *
 * MOT NGUOI MOT TRANSACTION, khong gom ca lo vao mot transaction: mot cai ten thu muc hong khong
 * duoc lam cuon ca tram ma vua cap. Nguoi loi duoc ghi vao `loi` va xu ly rieng.
 *
 * KHONG BAO GIO dung toi nguoi da co ma dung khuon — chay lai bao nhieu lan cung chi cap cho
 * nguoi con ma cu.
 */
export async function cap_lai_ma_hang_loat(
  ghi_log: (s: string) => void = () => {},
  khoi_mac_dinh: string | null = null,
  ly_do: string | null = null,
): Promise<KetQuaCapLaiHangLoat> {
  const ds = await danh_sach_ma_cu();
  const kq: KetQuaCapLaiHangLoat = { da_cap: [], bo_qua: [], loi: [] };

  for (const d of ds) {
    // Nguoi chua co khoi va khong co khoi mac dinh: bo qua, khong doan.
    if (d.khoi_id === null && (khoi_mac_dinh === null || khoi_mac_dinh === '')) {
      kq.bo_qua.push({
        id: d.id, ma_nv: d.ma_nv, ho_ten: d.ho_ten,
        ly_do: 'Chưa gán khối — gán khối cho hồ sơ rồi chạy lại.',
      });
      continue;
    }
    // Khoi chua khai ma ngan: bao la thieu cau hinh, khong phai loi cua nguoi nay.
    if (d.ma_du_kien === '' && (d.khoi_id !== null || khoi_mac_dinh === null)) {
      kq.bo_qua.push({
        id: d.id, ma_nv: d.ma_nv, ho_ten: d.ho_ten,
        ly_do: `Khối "${d.khoi_ten ?? ''}" chưa khai mã ngắn — khai ở danh mục khối rồi chạy lại.`,
      });
      continue;
    }
    try {
      const r = await cap_lai_ma_nhan_su(d.id, ly_do, ghi_log, khoi_mac_dinh);
      kq.da_cap.push({ id: d.id, ma_cu: r.ma_cu, ho_ten: d.ho_ten, ma_moi: r.ma_moi });
    } catch (loi) {
      kq.loi.push({
        id: d.id, ma_nv: d.ma_nv, ho_ten: d.ho_ten,
        ly_do: (loi as Error).message,
      });
    }
  }
  return kq;
}
