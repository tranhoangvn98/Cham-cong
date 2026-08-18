// Ho so nhan su: hop dong, bien ban, luong, cong viec, bao cao, khieu nai, thiet bi cap phat.
//
// Bay nhom nay giong nhau ve hinh dang (danh sach theo mot nhan vien, them / sua / xoa) va
// chi khac nhau o danh sach cot. Nen o day chung duoc mo ta bang MOT BANG DAC TA roi sinh
// route, thay vi viet bay khoi gan giong nhau.
//
// Ly do that su khong phai la ngan dong: viet tay bay lan thi som muon co mot lan quen goi
// kiem quyen, va cai quen do se im lang — khong loi, khong test do, chi la luong cua nguoi
// khac hien ra tren man hinh ai do. Sinh tu bang dac ta thi kiem quyen nam tren duong di
// chung, khong the bo sot.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import {
  CAC_NHOM, LY_DO_KHONG_THAY_XOA_DUOC, cac_nhom_doc_duoc, chi_duoc_sua_o, doc_duoc,
  sua_duoc, thay_xoa_tep_duoc,
  type BoiCanh, type NhomHoSo, type NguoiXem,
} from '../bao_mat/quyen_ho_so.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { che_ho_so, duoc_xem_day_du } from '../bao_mat/che_du_lieu.ts';
import { trich_theo_duoi } from '../tien_ich/doc_office.ts';
import {
  LoiDinhDang, cong_cu_trich, trich_tu_tep, type KetQuaTrich,
} from '../hop_dong/trich_noi_dung.ts';
import { hop_dong_sap_het_han, muc_gap } from '../hop_dong/nhac_han.ts';
import { doc_tep_ho_so, lam_sach_ten, luu_tep_ho_so, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { cau_hinh } from '../cau_hinh.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, ngay, ngay_bat_buoc, phan_trang, so_nguyen, so_thuc, than,
  trong_tap, uuid, uuid_bat_buoc,
  LoiDauVao, LoiKhongQuyen, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

// ==================================================================== bang dac ta

type DocTruong = (b: Record<string, unknown>) => unknown;

interface DacTaNhom {
  nhom: NhomHoSo;
  /** Doan duong dan, vd 'hop-dong' -> /nhan-vien/:id/hop-dong. */
  duong: string;
  bang: string;
  /** Cot tra ve cho client. */
  cot: string;
  sap_xep: string;
  /** Ten cot -> ham doc gia tri tu than yeu cau. */
  truong: Record<string, DocTruong>;
  /** Ten hien thi trong nhat ky va thong bao loi. */
  ten: string;
}

const LOAI_HOP_DONG = ['thu_viec', 'xac_dinh', 'khong_xac_dinh', 'thoi_vu', 'cong_tac_vien', 'hoc_viec'] as const;
const TT_HOP_DONG = ['nhap', 'hieu_luc', 'het_han', 'da_thanh_ly', 'da_huy'] as const;
const LOAI_BIEN_BAN = ['phu_luc', 'thoa_thuan', 'cam_ket', 'ky_luat', 'khen_thuong', 'bien_ban_hop', 'ban_giao', 'khac'] as const;
const HINH_THUC_LUONG = ['thang', 'ngay', 'gio', 'san_pham', 'khoan'] as const;
const UU_TIEN = ['thap', 'thuong', 'cao', 'khan'] as const;
const TT_CONG_VIEC = ['moi', 'dang_lam', 'cho_duyet', 'hoan_thanh', 'huy'] as const;
const KY_BAO_CAO = ['ngay', 'tuan', 'thang', 'quy', 'nam', 'dot_xuat'] as const;
const TT_BAO_CAO = ['nhap', 'da_nop', 'da_xem', 'can_bo_sung'] as const;
const LOAI_KHIEU_NAI = ['luong_thuong', 'cham_cong', 'che_do', 'moi_truong', 'quan_ly', 'quay_roi', 'an_toan', 'khac'] as const;
const TT_KHIEU_NAI = ['moi', 'dang_xu_ly', 'da_giai_quyet', 'tu_choi', 'dong'] as const;
const LOAI_THIET_BI = ['laptop', 'may_ban', 'man_hinh', 'dien_thoai', 'may_tinh_bang', 'sim', 'the_tu', 'xe', 'dong_phuc', 'cong_cu', 'khac'] as const;
const TINH_TRANG_TB = ['dang_dung', 'da_thu_hoi', 'bao_hong', 'mat', 'dang_sua'] as const;

const QUAN_HE_NPT = ['con', 'vo_chong', 'cha', 'me', 'anh_chi_em', 'khac'] as const;
const LOAI_BHXH = ['bao_tang', 'bao_giam', 'dieu_chinh', 'chot_so', 'cap_the_bhyt',
  'om_dau', 'thai_san', 'duong_suc', 'tai_nan_lao_dong'] as const;
const TT_BHXH = ['moi', 'da_nop', 'co_quan_duyet', 'tu_choi', 'hoan_thanh'] as const;

const DAC_TA: DacTaNhom[] = [
  {
    nhom: 'hop_dong', duong: 'hop-dong', bang: 'hop_dong_lao_dong', ten: 'hợp đồng lao động',
    cot: `id, so_hd, loai, chuc_danh, noi_lam_viec, ngay_ky, hieu_luc_tu, hieu_luc_den,
          luong_co_ban, trang_thai, ghi_chu, tao_luc`,
    sap_xep: 'hieu_luc_tu desc, tao_luc desc',
    truong: {
      so_hd: (b) => chuoi(b, 'so_hd', { toi_da: 60 }),
      loai: (b) => trong_tap(b, 'loai', LOAI_HOP_DONG, { mac_dinh: 'xac_dinh' }),
      chuc_danh: (b) => chuoi(b, 'chuc_danh', { toi_da: 150 }),
      noi_lam_viec: (b) => chuoi(b, 'noi_lam_viec', { toi_da: 250 }),
      ngay_ky: (b) => ngay(b, 'ngay_ky'),
      hieu_luc_tu: (b) => ngay_bat_buoc(b, 'hieu_luc_tu'),
      hieu_luc_den: (b) => ngay(b, 'hieu_luc_den'),
      luong_co_ban: (b) => so_thuc(b, 'luong_co_ban', { min: 0 }),
      trang_thai: (b) => trong_tap(b, 'trang_thai', TT_HOP_DONG, { mac_dinh: 'hieu_luc' }),
      ghi_chu: (b) => chuoi(b, 'ghi_chu', { toi_da: 2000 }),
    },
  },
  {
    nhom: 'bien_ban', duong: 'bien-ban', bang: 'bien_ban_thoa_thuan', ten: 'biên bản / thỏa thuận',
    cot: 'id, hop_dong_id, loai, tieu_de, ngay_ky, hieu_luc_tu, noi_dung, tao_luc',
    sap_xep: 'coalesce(ngay_ky, hieu_luc_tu) desc nulls last, tao_luc desc',
    truong: {
      // Phu luc gan voi mot hop dong; bien ban roi thi de trong. `uuid` tra null khi khoa
      // vang mat hoac rong — dung `uuid_bat_buoc` o day se bat moi bien ban phai co hop dong.
      hop_dong_id: (b) => uuid(b, 'hop_dong_id'),
      loai: (b) => trong_tap(b, 'loai', LOAI_BIEN_BAN, { mac_dinh: 'thoa_thuan' }),
      tieu_de: (b) => chuoi_bat_buoc(b, 'tieu_de', { toi_da: 250 }),
      ngay_ky: (b) => ngay(b, 'ngay_ky'),
      hieu_luc_tu: (b) => ngay(b, 'hieu_luc_tu'),
      noi_dung: (b) => chuoi(b, 'noi_dung', { toi_da: 20000 }),
    },
  },
  {
    nhom: 'luong', duong: 'luong', bang: 'quyet_dinh_luong', ten: 'quyết định lương',
    cot: `id, hieu_luc_tu, luong_co_ban, phu_cap, hinh_thuc, so_quyet_dinh, ly_do, ghi_chu, tao_luc`,
    sap_xep: 'hieu_luc_tu desc',
    truong: {
      hieu_luc_tu: (b) => ngay_bat_buoc(b, 'hieu_luc_tu'),
      luong_co_ban: (b) => so_thuc(b, 'luong_co_ban', { bat_buoc: true, min: 0 }),
      phu_cap: (b) => so_thuc(b, 'phu_cap', { min: 0 }) ?? 0,
      hinh_thuc: (b) => trong_tap(b, 'hinh_thuc', HINH_THUC_LUONG, { mac_dinh: 'thang' }),
      so_quyet_dinh: (b) => chuoi(b, 'so_quyet_dinh', { toi_da: 60 }),
      ly_do: (b) => chuoi(b, 'ly_do', { toi_da: 500 }),
      ghi_chu: (b) => chuoi(b, 'ghi_chu', { toi_da: 2000 }),
    },
  },
  {
    nhom: 'cong_viec', duong: 'cong-viec', bang: 'cong_viec', ten: 'công việc',
    cot: `id, tieu_de, mo_ta, han, uu_tien, trang_thai, ket_qua, hoan_thanh_luc, tao_luc`,
    sap_xep: `case trang_thai when 'dang_lam' then 0 when 'moi' then 1 when 'cho_duyet' then 2 else 3 end,
              han asc nulls last, tao_luc desc`,
    truong: {
      tieu_de: (b) => chuoi_bat_buoc(b, 'tieu_de', { toi_da: 250 }),
      mo_ta: (b) => chuoi(b, 'mo_ta', { toi_da: 10000 }),
      han: (b) => ngay(b, 'han'),
      uu_tien: (b) => trong_tap(b, 'uu_tien', UU_TIEN, { mac_dinh: 'thuong' }),
      trang_thai: (b) => trong_tap(b, 'trang_thai', TT_CONG_VIEC, { mac_dinh: 'moi' }),
      ket_qua: (b) => chuoi(b, 'ket_qua', { toi_da: 10000 }),
    },
  },
  {
    nhom: 'bao_cao', duong: 'bao-cao', bang: 'bao_cao', ten: 'báo cáo',
    cot: 'id, ky, ky_tu, ky_den, tieu_de, noi_dung, trang_thai, phan_hoi, xem_luc, tao_luc',
    sap_xep: 'coalesce(ky_tu, tao_luc::date) desc, tao_luc desc',
    truong: {
      ky: (b) => trong_tap(b, 'ky', KY_BAO_CAO, { mac_dinh: 'tuan' }),
      ky_tu: (b) => ngay(b, 'ky_tu'),
      ky_den: (b) => ngay(b, 'ky_den'),
      tieu_de: (b) => chuoi_bat_buoc(b, 'tieu_de', { toi_da: 250 }),
      noi_dung: (b) => chuoi(b, 'noi_dung', { toi_da: 50000 }),
      trang_thai: (b) => trong_tap(b, 'trang_thai', TT_BAO_CAO, { mac_dinh: 'da_nop' }),
      phan_hoi: (b) => chuoi(b, 'phan_hoi', { toi_da: 5000 }),
    },
  },
  {
    nhom: 'khieu_nai', duong: 'khieu-nai', bang: 'khieu_nai', ten: 'khiếu nại',
    cot: `id, tieu_de, noi_dung, loai, muc_do, trang_thai, phan_hoi, giai_quyet_luc, tao_luc`,
    sap_xep: `case trang_thai when 'moi' then 0 when 'dang_xu_ly' then 1 else 2 end, tao_luc desc`,
    truong: {
      tieu_de: (b) => chuoi_bat_buoc(b, 'tieu_de', { toi_da: 250 }),
      noi_dung: (b) => chuoi_bat_buoc(b, 'noi_dung', { toi_da: 20000 }),
      loai: (b) => trong_tap(b, 'loai', LOAI_KHIEU_NAI, { mac_dinh: 'khac' }),
      muc_do: (b) => trong_tap(b, 'muc_do', UU_TIEN, { mac_dinh: 'thuong' }),
      trang_thai: (b) => trong_tap(b, 'trang_thai', TT_KHIEU_NAI, { mac_dinh: 'moi' }),
      phan_hoi: (b) => chuoi(b, 'phan_hoi', { toi_da: 10000 }),
    },
  },
  {
    nhom: 'thiet_bi', duong: 'thiet-bi-cap-phat', bang: 'thiet_bi_cap_phat', ten: 'thiết bị cấp phát',
    cot: `id, loai, ten, hang, model, so_seri, dia_chi_mac, host(dia_chi_ip) as dia_chi_ip,
          ngay_cap, ngay_thu_hoi, tinh_trang, gia_tri, ghi_chu, tao_luc`,
    sap_xep: `case tinh_trang when 'dang_dung' then 0 else 1 end, ngay_cap desc nulls last`,
    truong: {
      loai: (b) => trong_tap(b, 'loai', LOAI_THIET_BI, { mac_dinh: 'khac' }),
      ten: (b) => chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
      hang: (b) => chuoi(b, 'hang', { toi_da: 100 }),
      model: (b) => chuoi(b, 'model', { toi_da: 100 }),
      so_seri: (b) => chuoi(b, 'so_seri', { toi_da: 100 }),
      dia_chi_mac: (b) => doc_mac(b),
      dia_chi_ip: (b) => chuoi(b, 'dia_chi_ip', { toi_da: 45 }),
      ngay_cap: (b) => ngay(b, 'ngay_cap'),
      ngay_thu_hoi: (b) => ngay(b, 'ngay_thu_hoi'),
      tinh_trang: (b) => trong_tap(b, 'tinh_trang', TINH_TRANG_TB, { mac_dinh: 'dang_dung' }),
      gia_tri: (b) => so_thuc(b, 'gia_tri', { min: 0 }),
      ghi_chu: (b) => chuoi(b, 'ghi_chu', { toi_da: 2000 }),
    },
  },
  {
    nhom: 'nguoi_phu_thuoc', duong: 'nguoi-phu-thuoc', bang: 'nguoi_phu_thuoc',
    ten: 'người phụ thuộc',
    cot: `id, ho_ten, quan_he, ngay_sinh, ma_so_thue, so_cccd, tu_thang, den_thang,
          da_dang_ky, ghi_chu, tao_luc`,
    sap_xep: 'da_dang_ky desc, ngay_sinh asc nulls last',
    truong: {
      ho_ten: (b) => chuoi_bat_buoc(b, 'ho_ten', { toi_da: 150 }),
      quan_he: (b) => trong_tap(b, 'quan_he', QUAN_HE_NPT, { mac_dinh: 'con' }),
      ngay_sinh: (b) => ngay(b, 'ngay_sinh'),
      ma_so_thue: (b) => chuoi(b, 'ma_so_thue', { toi_da: 20 }),
      so_cccd: (b) => chuoi(b, 'so_cccd', { toi_da: 20 }),
      tu_thang: (b) => ngay(b, 'tu_thang'),
      den_thang: (b) => ngay(b, 'den_thang'),
      da_dang_ky: (b) => luan_ly(b, 'da_dang_ky', false),
      ghi_chu: (b) => chuoi(b, 'ghi_chu', { toi_da: 2000 }),
    },
  },
  {
    nhom: 'bhxh', duong: 'bhxh', bang: 'bhxh_su_kien', ten: 'hồ sơ BHXH',
    cot: `id, loai, thang, muc_dong, ty_le_phan_tram, so_ho_so, trang_thai,
          ngay_nop, ngay_ket_qua, ghi_chu, tao_luc`,
    sap_xep: 'thang desc, tao_luc desc',
    truong: {
      loai: (b) => trong_tap(b, 'loai', LOAI_BHXH, { bat_buoc: true }),
      thang: (b) => ngay_bat_buoc(b, 'thang'),
      muc_dong: (b) => so_thuc(b, 'muc_dong', { min: 0 }),
      ty_le_phan_tram: (b) => so_thuc(b, 'ty_le_phan_tram', { min: 0, max: 100 }),
      so_ho_so: (b) => chuoi(b, 'so_ho_so', { toi_da: 60 }),
      trang_thai: (b) => trong_tap(b, 'trang_thai', TT_BHXH, { mac_dinh: 'moi' }),
      ngay_nop: (b) => ngay(b, 'ngay_nop'),
      ngay_ket_qua: (b) => ngay(b, 'ngay_ket_qua'),
      ghi_chu: (b) => chuoi(b, 'ghi_chu', { toi_da: 2000 }),
    },
  },
];

const THEO_NHOM = new Map(DAC_TA.map((d) => [d.nhom, d]));

/**
 * Ten hien thi cho hai nhom KHONG nam trong bang dac ta.
 *
 * `thong_tin` va `tai_lieu` khong sinh route theo khuon "danh sach theo nhan vien" nen
 * khong co o trong DAC_TA — nhung chung van la nhom ho so that, van co tep dinh kem, va
 * van can mot cai ten de bao loi thieu quyen cho ra tieng Viet.
 */
const TEN_NHOM_KHAC: Record<string, string> = {
  thong_tin: 'thông tin cá nhân',
  tai_lieu: 'hồ sơ tài liệu',
};

/** Chuan hoa dia chi MAC ve dang aa:bb:cc:dd:ee:ff; chan chuoi rac. */
function doc_mac(b: Record<string, unknown>): string | null {
  const s = chuoi(b, 'dia_chi_mac', { toi_da: 20 });
  if (s === null) return null;
  const chi_so = s.replace(/[^0-9a-fA-F]/g, '');
  if (chi_so.length !== 12) {
    throw new LoiDauVao('Địa chỉ MAC phải gồm 12 ký tự hex, ví dụ 00:17:61:11:2b:3d.');
  }
  return (chi_so.toLowerCase().match(/.{2}/g) ?? []).join(':');
}

// ==================================================================== boi canh & quyen

interface NhanVienGon {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban_id: string | null;
  phong_cua_toi: string | null;
}

/** Nap nhan vien va xac dinh quan he voi nguoi dang xem. */
async function nap_boi_canh(
  nd: NguoiXem,
  nhan_vien_id: string,
): Promise<{ nv: NhanVienGon; bc: BoiCanh }> {
  const nv = await truy_van_mot<NhanVienGon>(
    `select nv.id, nv.ma_nv, nv.ho_ten, nv.phong_ban_id,
            (select phong_ban_id from nhan_vien where id = $2) as phong_cua_toi
       from nhan_vien nv
      where nv.id = $1`,
    [nhan_vien_id, nd.nv],
  );
  if (nv === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');

  return {
    nv,
    bc: {
      la_chinh_minh: nd.nv !== null && nd.nv === nv.id,
      // Cung quy uoc voi bang cong: truong phong quan ly nguoi CUNG PHONG BAN.
      la_cap_tren:
        nd.vai_tro === 'truong_phong' &&
        nv.phong_ban_id !== null &&
        nv.phong_ban_id === nv.phong_cua_toi,
    },
  };
}

function bat_buoc_doc(nd: NguoiXem, nhom: NhomHoSo, bc: BoiCanh, ten: string): void {
  if (!doc_duoc(nd, nhom, bc)) {
    throw new LoiKhongQuyen(`Bạn không có quyền xem ${ten} của nhân viên này.`);
  }
}

function bat_buoc_sua(nd: NguoiXem, nhom: NhomHoSo, bc: BoiCanh, ten: string): void {
  if (!sua_duoc(nd, nhom, bc)) {
    throw new LoiKhongQuyen(`Bạn không có quyền thay đổi ${ten} của nhân viên này.`);
  }
}

function nguoi_xem(req: FastifyRequest): NguoiXem {
  const nd = nguoi_dung_hien_tai(req);
  return { vai_tro: nd.vai_tro, nv: nd.nv };
}

/** Doi loi Postgres thanh thong diep nguoi dung hieu duoc. */
function doi_loi_csdl(e: unknown, dac: DacTaNhom): never {
  const ma = (e as { code?: string }).code;
  const rb = (e as { constraint?: string }).constraint ?? '';

  if (ma === '22P02') {
    throw new LoiDauVao('Địa chỉ IP không hợp lệ. Ví dụ đúng: 192.168.1.50.');
  }
  if (ma === '23505' && rb === 'thiet_bi_cap_phat_ip_dang_dung_idx') {
    throw new LoiDauVao(
      'Địa chỉ IP này đang được gán cho một thiết bị khác còn đang dùng. ' +
      'Thu hồi thiết bị cũ trước, hoặc dùng IP khác.',
    );
  }
  if (ma === '23505' && rb === 'quyet_dinh_luong_mot_moc') {
    throw new LoiDauVao('Nhân viên này đã có một mức lương hiệu lực từ đúng ngày đó.');
  }
  if (ma === '23514' && rb === 'hop_dong_khong_xac_dinh_thi_vo_han') {
    throw new LoiDauVao(
      'Hợp đồng không xác định thời hạn thì không được điền ngày hết hạn ' +
      '(BLLĐ 2019 Điều 20). Bỏ trống ngày hết hạn, hoặc đổi sang loại xác định thời hạn.',
    );
  }
  if (ma === '23514') {
    throw new LoiDauVao(`Dữ liệu ${dac.ten} không hợp lệ (${rb || 'sai ràng buộc'}).`);
  }
  throw e as Error;
}

// ==================================================================== tuyen

export async function tuyen_ho_so(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ tong quan ho so
  /**
   * Tom tat ho so mot nguoi: thong tin co ban + so luong tung nhom.
   *
   * Chi dem nhung nhom nguoi goi DUOC XEM. Tra ve so luong cua nhom bi cam cung la ro ri:
   * "nhan vien nay co 3 khieu nai" da la mot thong tin.
   */
  app.get('/nhan-vien/:id/ho-so', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const id = doc_id(req);
    const { nv, bc } = await nap_boi_canh(nd, id);
    const nhom_xem_duoc = cac_nhom_doc_duoc(nd, bc);
    if (nhom_xem_duoc.length === 0) {
      throw new LoiKhongQuyen('Bạn không có quyền xem hồ sơ của nhân viên này.');
    }

    const dem: Record<string, number> = {};
    for (const nhom of nhom_xem_duoc) {
      // `thong_tin` la ban ghi 1-1 va `tai_lieu` tinh theo tien do, ca hai khong nam trong
      // bang dac ta CRUD nen khong co gi de dem — bo qua thay vi no o `dac.bang`.
      const dac = THEO_NHOM.get(nhom);
      if (dac === undefined) continue;
      const d = await truy_van_mot<{ so: number }>(
        `select count(*)::int as so from ${dac.bang} where nhan_vien_id = $1`, [id]);
      dem[nhom] = d?.so ?? 0;
    }

    const chi_tiet = await truy_van_mot<Record<string, unknown>>(
      `select nv.ma_nv, nv.ho_ten, nv.pin_may, nv.email, nv.so_dien_thoai, nv.ngay_vao,
              nv.ngay_nghi_viec, nv.dang_hoat_dong, nv.duoc_cham_cong_dien_thoai,
              nv.chuc_danh, nv.ngay_chinh_thuc,
              pb.ten as phong_ban, cl.ten as ca_lam
         from nhan_vien nv
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ca_lam cl on cl.id = nv.ca_lam_id
        where nv.id = $1`,
      [id],
    );

    // Hop dong dang hieu luc: thu hay dung nhat khi mo ho so ai do.
    const hop_dong_hien_tai = doc_duoc(nd, 'hop_dong', bc)
      ? await truy_van_mot(
        `select id, so_hd, loai, chuc_danh, hieu_luc_tu, hieu_luc_den
           from hop_dong_lao_dong
          where nhan_vien_id = $1 and trang_thai = 'hieu_luc'
          order by hieu_luc_tu desc limit 1`, [id])
      : null;

    const luong_hien_tai = doc_duoc(nd, 'luong', bc)
      ? await truy_van_mot(
        `select luong_co_ban, phu_cap, hinh_thuc, hieu_luc_tu
           from quyet_dinh_luong
          where nhan_vien_id = $1 and hieu_luc_tu <= current_date
          order by hieu_luc_tu desc limit 1`, [id])
      : null;

    // Tien do ho so: thu HCNS nhin dau tien khi mo mot nguoi ra.
    const tien_do_tai_lieu = doc_duoc(nd, 'tai_lieu', bc)
      ? await truy_van_mot<{ can_co: number; da_du: number }>(
        `select count(*) filter (
                  where dm.bat_buoc
                    and (not dm.chi_khi_nghi_viec
                         or nv.dang_hoat_dong = false or nv.ngay_nghi_viec is not null)
                )::int as can_co,
                count(*) filter (
                  where dm.bat_buoc
                    and (not dm.chi_khi_nghi_viec
                         or nv.dang_hoat_dong = false or nv.ngay_nghi_viec is not null)
                    and tl.trang_thai = 'da_len_phan_mem'
                )::int as da_du
           from danh_muc_tai_lieu dm
           cross join nhan_vien nv
           left join tai_lieu_nhan_vien tl
                  on tl.danh_muc_id = dm.id and tl.nhan_vien_id = nv.id
          where dm.dang_dung = true and nv.id = $1`, [id])
      : null;

    return {
      nhan_vien: { id: nv.id, ...chi_tiet },
      tien_do_tai_lieu,
      nhom_xem_duoc,
      nhom_sua_duoc: nhom_xem_duoc.filter((n) => sua_duoc(nd, n, bc)),
      dem,
      hop_dong_hien_tai,
      luong_hien_tai,
    };
  });

  // ------------------------------------------------------------ CRUD tung nhom
  for (const dac of DAC_TA) {
    // --- danh sach ---
    app.get(`/nhan-vien/:id/${dac.duong}`, { preHandler: can_dang_nhap }, async (req) => {
      const nd = nguoi_xem(req);
      const id = doc_id(req);
      const { bc } = await nap_boi_canh(nd, id);
      bat_buoc_doc(nd, dac.nhom, bc, dac.ten);

      const dong = await truy_van(
        `select ${dac.cot} from ${dac.bang} where nhan_vien_id = $1 order by ${dac.sap_xep}`,
        [id],
      );
      const tep = await truy_van(
        `select id, thuoc_id, ten_goc, kieu_mime, kich_thuoc, tao_luc
           from ho_so_tep where nhan_vien_id = $1 and nhom = $2 order by tao_luc desc`,
        [id, dac.nhom],
      );
      return {
        danh_sach: dong, tep,
        sua_duoc: sua_duoc(nd, dac.nhom, bc),
        thay_xoa_tep_duoc: thay_xoa_tep_duoc(nd),
      };
    });

    // --- them moi ---
    app.post(`/nhan-vien/:id/${dac.duong}`, { preHandler: can_dang_nhap }, async (req, res) => {
      const nd = nguoi_xem(req);
      const id = doc_id(req);
      const { bc } = await nap_boi_canh(nd, id);
      bat_buoc_sua(nd, dac.nhom, bc, dac.ten);

      const b = than(req.body);
      const gioi_han = chi_duoc_sua_o(nd, dac.nhom, bc);
      const cot: string[] = ['nhan_vien_id'];
      const gia_tri: unknown[] = [id];

      for (const [ten_cot, doc] of Object.entries(dac.truong)) {
        // Nguoi bi gioi han o chi duoc dat dung nhung o do khi TAO MOI; cac o con lai
        // lay mac dinh cua CSDL. Vd nhan vien tu gui khieu nai thi khong tu dat trang thai.
        if (gioi_han !== null && !gioi_han.includes(ten_cot)) continue;
        const v = doc(b);
        if (v === null && !Object.hasOwn(b, ten_cot)) continue;
        cot.push(ten_cot);
        gia_tri.push(v);
      }
      them_nguoi_thao_tac(dac, cot, gia_tri, nguoi_dung_hien_tai(req).sub);

      const cho = cot.map((_, i) => `$${i + 1}`).join(',');
      let moi: Record<string, unknown> | null;
      try {
        moi = await truy_van_mot(
          `insert into ${dac.bang}(${cot.join(',')}) values (${cho}) returning ${dac.cot}`,
          gia_tri,
        );
      } catch (e) {
        doi_loi_csdl(e, dac);
      }

      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, `ho_so.them.${dac.nhom}`, dac.bang,
        String(moi?.['id'] ?? ''), { nhan_vien_id: id }, req.ip);
      return res.code(201).send(moi);
    });

    // --- sua ---
    app.patch(`/${dac.duong}/:ban_ghi_id`, { preHandler: can_dang_nhap }, async (req) => {
      const nd = nguoi_xem(req);
      const ban_ghi_id = doc_id(req, 'ban_ghi_id');
      const chu = await truy_van_mot<{ nhan_vien_id: string }>(
        `select nhan_vien_id from ${dac.bang} where id = $1`, [ban_ghi_id]);
      if (chu === null) throw new LoiKhongTim(`Không tìm thấy ${dac.ten}.`);

      const { bc } = await nap_boi_canh(nd, chu.nhan_vien_id);
      bat_buoc_sua(nd, dac.nhom, bc, dac.ten);

      const b = than(req.body);
      const gioi_han = chi_duoc_sua_o(nd, dac.nhom, bc);
      const dat: string[] = [];
      const gia_tri: unknown[] = [];

      for (const [ten_cot, doc] of Object.entries(dac.truong)) {
        // PATCH: khong gui khoa nao thi khong doi cot do. Gui null thi xoa gia tri.
        if (!Object.hasOwn(b, ten_cot)) continue;
        if (gioi_han !== null && !gioi_han.includes(ten_cot)) {
          throw new LoiKhongQuyen(`Bạn không được sửa trường "${ten_cot}".`);
        }
        gia_tri.push(doc(b));
        dat.push(`${ten_cot} = $${gia_tri.length}`);
      }
      if (dat.length === 0) throw new LoiDauVao('Không có trường nào để cập nhật.');

      // Moc thoi diem hoan tat, de khong phai suy tu lich su.
      if (dac.nhom === 'cong_viec' && b['trang_thai'] === 'hoan_thanh') {
        dat.push('hoan_thanh_luc = now()');
      }
      if (dac.nhom === 'khieu_nai' && typeof b['trang_thai'] === 'string' &&
          ['da_giai_quyet', 'tu_choi', 'dong'].includes(b['trang_thai'])) {
        gia_tri.push(nguoi_dung_hien_tai(req).sub);
        dat.push('giai_quyet_luc = now()', `nguoi_xu_ly = $${gia_tri.length}`);
      }
      if (dac.nhom === 'bao_cao' && b['trang_thai'] === 'da_xem') {
        gia_tri.push(nguoi_dung_hien_tai(req).sub);
        dat.push('xem_luc = now()', `nguoi_xem = $${gia_tri.length}`);
      }
      if (dac.bang !== 'quyet_dinh_luong') dat.push('cap_nhat_luc = now()');

      gia_tri.push(ban_ghi_id);
      let sau: Record<string, unknown> | null;
      try {
        sau = await truy_van_mot(
          `update ${dac.bang} set ${dat.join(', ')} where id = $${gia_tri.length}
           returning ${dac.cot}`,
          gia_tri,
        );
      } catch (e) {
        doi_loi_csdl(e, dac);
      }

      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, `ho_so.sua.${dac.nhom}`, dac.bang,
        ban_ghi_id, { nhan_vien_id: chu.nhan_vien_id }, req.ip);
      return sau;
    });

    // --- xoa ---
    app.delete(`/${dac.duong}/:ban_ghi_id`, { preHandler: can_dang_nhap }, async (req) => {
      const nd = nguoi_xem(req);
      const ban_ghi_id = doc_id(req, 'ban_ghi_id');
      const chu = await truy_van_mot<{ nhan_vien_id: string }>(
        `select nhan_vien_id from ${dac.bang} where id = $1`, [ban_ghi_id]);
      if (chu === null) throw new LoiKhongTim(`Không tìm thấy ${dac.ten}.`);

      const { bc } = await nap_boi_canh(nd, chu.nhan_vien_id);
      bat_buoc_sua(nd, dac.nhom, bc, dac.ten);
      // Xoa la viec cua nhan su: nguoi tu gui khieu nai / bao cao thi rut lai bang trang
      // thai, khong xoa trang su. Neu xoa duoc thi mot khieu nai "bien mat" khong de lai vet.
      if (chi_duoc_sua_o(nd, dac.nhom, bc) !== null) {
        throw new LoiKhongQuyen('Chỉ nhân sự mới được xóa. Bạn có thể đổi trạng thái thay vì xóa.');
      }

      await thuc_thi(`delete from ${dac.bang} where id = $1`, [ban_ghi_id]);
      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, `ho_so.xoa.${dac.nhom}`, dac.bang,
        ban_ghi_id, { nhan_vien_id: chu.nhan_vien_id }, req.ip);
      return { ok: true };
    });
  }

  // ------------------------------------------------------------ thong tin ca nhan
  /**
   * Thong tin ca nhan: CCCD, ngay sinh, ma so thue, so BHXH, lien he khan cap.
   *
   * Day la du lieu ca nhan theo Nghi dinh 13/2023/ND-CP nen co hai lop:
   *   1. CHE o may chu voi nguoi khong duoc xem day du (che o giao dien la che gia).
   *   2. GHI NHAT KY moi lan ai do doc ban day du cua nguoi khac.
   */
  app.get('/nhan-vien/:id/thong-tin', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const id = doc_id(req);
    const { bc } = await nap_boi_canh(nd, id);
    bat_buoc_doc(nd, 'thong_tin', bc, 'thông tin cá nhân');

    const ho_so = await truy_van_mot<Record<string, unknown>>(
      `select nhan_vien_id, cccd_so, cccd_ngay_cap, cccd_noi_cap, ngay_sinh, gioi_tinh,
              noi_sinh, dan_toc, quoc_tich, tinh_trang_hon_nhan,
              dia_chi_thuong_tru, dia_chi_hien_tai,
              lien_he_khan_ten, lien_he_khan_quan_he, lien_he_khan_sdt,
              ma_so_thue, ngan_hang, so_tai_khoan,
              so_bhxh, so_the_bhyt, co_quan_bhxh, noi_kham_chua_benh,
              kham_suc_khoe_ngay, kham_suc_khoe_noi, kham_suc_khoe_ket_luan, cap_nhat_luc
         from ho_so_ca_nhan where nhan_vien_id = $1`,
      [id],
    );

    const day_du = duoc_xem_day_du(nd, id);
    // Chi ghi nhat ky khi doc ban day du CUA NGUOI KHAC. Tu xem ho so cua chinh minh ma
    // cung ghi thi nhat ky day rac, va cai can truy vet la nguoi ngoai doc du lieu ai.
    if (day_du && !bc.la_chinh_minh && ho_so !== null) {
      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.xem_thong_tin_ca_nhan',
        'ho_so_ca_nhan', id, { day_du: true }, req.ip);
    }

    return {
      ho_so: che_ho_so(ho_so, day_du),
      sua_duoc: sua_duoc(nd, 'thong_tin', bc),
      xem_day_du: day_du,
    };
  });

  /** Tao moi hoac cap nhat thong tin ca nhan. Chi nhan su. */
  app.put('/nhan-vien/:id/thong-tin', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const id = doc_id(req);
    const { bc } = await nap_boi_canh(nd, id);
    bat_buoc_sua(nd, 'thong_tin', bc, 'thông tin cá nhân');

    const b = than(req.body);
    const gia_tri: Record<string, unknown> = {
      cccd_so: chuoi(b, 'cccd_so', { toi_da: 20 }),
      cccd_ngay_cap: ngay(b, 'cccd_ngay_cap'),
      cccd_noi_cap: chuoi(b, 'cccd_noi_cap', { toi_da: 200 }),
      ngay_sinh: ngay(b, 'ngay_sinh'),
      gioi_tinh: trong_tap(b, 'gioi_tinh', ['nam', 'nu', 'khac'] as const),
      noi_sinh: chuoi(b, 'noi_sinh', { toi_da: 200 }),
      dan_toc: chuoi(b, 'dan_toc', { toi_da: 50 }),
      quoc_tich: chuoi(b, 'quoc_tich', { toi_da: 50 }),
      tinh_trang_hon_nhan: trong_tap(b, 'tinh_trang_hon_nhan',
        ['doc_than', 'da_ket_hon', 'khac'] as const),
      dia_chi_thuong_tru: chuoi(b, 'dia_chi_thuong_tru', { toi_da: 300 }),
      dia_chi_hien_tai: chuoi(b, 'dia_chi_hien_tai', { toi_da: 300 }),
      lien_he_khan_ten: chuoi(b, 'lien_he_khan_ten', { toi_da: 150 }),
      lien_he_khan_quan_he: chuoi(b, 'lien_he_khan_quan_he', { toi_da: 50 }),
      lien_he_khan_sdt: chuoi(b, 'lien_he_khan_sdt', { toi_da: 20 }),
      ma_so_thue: chuoi(b, 'ma_so_thue', { toi_da: 20 }),
      ngan_hang: chuoi(b, 'ngan_hang', { toi_da: 150 }),
      so_tai_khoan: chuoi(b, 'so_tai_khoan', { toi_da: 40 }),
      so_bhxh: chuoi(b, 'so_bhxh', { toi_da: 20 }),
      so_the_bhyt: chuoi(b, 'so_the_bhyt', { toi_da: 30 }),
      co_quan_bhxh: chuoi(b, 'co_quan_bhxh', { toi_da: 200 }),
      noi_kham_chua_benh: chuoi(b, 'noi_kham_chua_benh', { toi_da: 200 }),
      kham_suc_khoe_ngay: ngay(b, 'kham_suc_khoe_ngay'),
      kham_suc_khoe_noi: chuoi(b, 'kham_suc_khoe_noi', { toi_da: 200 }),
      kham_suc_khoe_ket_luan: chuoi(b, 'kham_suc_khoe_ket_luan', { toi_da: 500 }),
    };

    const cot = Object.keys(gia_tri);
    const cho = cot.map((_, i) => `$${i + 2}`);
    const cap_nhat = cot.map((c, i) => `${c} = $${i + 2}`).join(', ');

    try {
      await thuc_thi(
        `insert into ho_so_ca_nhan (nhan_vien_id, ${cot.join(',')}, cap_nhat_boi)
         values ($1, ${cho.join(',')}, $${cot.length + 2})
         on conflict (nhan_vien_id) do update
            set ${cap_nhat}, cap_nhat_luc = now(), cap_nhat_boi = $${cot.length + 2}`,
        [id, ...Object.values(gia_tri), nguoi_dung_hien_tai(req).sub],
      );
    } catch (e) {
      const ma = (e as { code?: string }).code;
      const rb = (e as { constraint?: string }).constraint ?? '';
      if (ma === '23505') {
        const cua = rb.includes('cccd') ? 'Số CCCD'
          : rb.includes('mst') ? 'Mã số thuế'
            : rb.includes('bhxh') ? 'Số BHXH' : 'Giá trị này';
        throw new LoiDauVao(`${cua} đã thuộc về một nhân viên khác. Kiểm tra lại giấy tờ.`);
      }
      throw e as Error;
    }

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.sua_thong_tin_ca_nhan',
      'ho_so_ca_nhan', id, null, req.ip);
    return { ok: true };
  });

  // ------------------------------------------------------------ checklist tai lieu
  /**
   * Checklist ho so theo danh muc HCNS: moi tai lieu mot dong, kem trang thai va tien do.
   *
   * Tra ve DU danh muc chu khong chi nhung dong da co, vi cai can nhin thay la nhung thu
   * CON THIEU. Mot danh sach chi hien thu da nop thi luon trong sach.
   */
  app.get('/nhan-vien/:id/tai-lieu', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const id = doc_id(req);
    const { nv, bc } = await nap_boi_canh(nd, id);
    bat_buoc_doc(nd, 'tai_lieu', bc, 'hồ sơ tài liệu');

    const dong = await truy_van<Record<string, unknown>>(
      `select dm.id as danh_muc_id, dm.ma, dm.ten, dm.nhom, dm.mo_ta, dm.bat_buoc,
              dm.chi_khi_nghi_viec, dm.thu_tu,
              tl.id, tl.trang_thai, tl.nguoi_phu_trach, tl.han_hoan_thanh, tl.ghi_chu,
              tl.tep_id, t.ten_goc as tep_ten, t.kich_thuoc as tep_kich_thuoc
         from danh_muc_tai_lieu dm
         left join tai_lieu_nhan_vien tl
                on tl.danh_muc_id = dm.id and tl.nhan_vien_id = $1
         left join ho_so_tep t on t.id = tl.tep_id
        where dm.dang_dung = true
        order by dm.thu_tu, dm.ten`,
      [id],
    );

    // Nguoi da nghi viec thi tai lieu offboarding moi tinh la bat buoc; nguoi dang lam ma
    // tinh ca "Quyet dinh nghi viec" thi thanh tien do khong bao gio day duoc.
    const da_nghi = await truy_van_mot<{ nghi: boolean }>(
      'select (dang_hoat_dong = false or ngay_nghi_viec is not null) as nghi from nhan_vien where id = $1',
      [id],
    );
    const dang_nghi_viec = da_nghi?.nghi === true;

    const can_co = dong.filter((d) =>
      d['bat_buoc'] === true && (d['chi_khi_nghi_viec'] !== true || dang_nghi_viec));
    const da_du = can_co.filter((d) => d['trang_thai'] === 'da_len_phan_mem');

    return {
      danh_sach: dong.map((d) => ({
        ...d,
        // Danh dau ro dong nao dang duoc mien vi nguoi con dang lam.
        tam_mien: d['chi_khi_nghi_viec'] === true && !dang_nghi_viec,
      })),
      dang_nghi_viec,
      tien_do: { can_co: can_co.length, da_du: da_du.length },
      sua_duoc: sua_duoc(nd, 'tai_lieu', bc),
      // Giao dien can biet de KHONG ve nut "Thay tep" / "Go tep" cho nguoi khong bam duoc.
      // Chan o may chu la du de an toan, nhung ve mot cai nut chi de bao 403 la ve mot loi
      // hua khong giu duoc.
      thay_xoa_tep_duoc: thay_xoa_tep_duoc(nd),
      nhan_vien: { ma_nv: nv.ma_nv, ho_ten: nv.ho_ten },
    };
  });

  /** Cap nhat mot dong checklist (theo ma danh muc). Chi nhan su. */
  app.put('/nhan-vien/:id/tai-lieu/:ma', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const id = doc_id(req);
    const ma = String((req.params as Record<string, string>)['ma'] ?? '').trim();
    if (!/^[a-z0-9_]{1,60}$/.test(ma)) throw new LoiDauVao('Mã tài liệu không hợp lệ.');

    const { bc } = await nap_boi_canh(nd, id);
    bat_buoc_sua(nd, 'tai_lieu', bc, 'hồ sơ tài liệu');

    const dm = await truy_van_mot<{ id: string; ten: string }>(
      'select id, ten from danh_muc_tai_lieu where ma = $1', [ma]);
    if (dm === null) throw new LoiKhongTim('Không có tài liệu này trong danh mục.');

    const b = than(req.body);
    const trang_thai = trong_tap(b, 'trang_thai',
      ['thieu', 'da_co_du_lieu', 'da_so_hoa', 'da_len_phan_mem'] as const, { mac_dinh: 'thieu' });
    const tep_id = uuid(b, 'tep_id');

    // Tep phai thuoc dung nhan vien nay — neu khong thi gan duoc tep cua nguoi khac vao
    // ho so minh dang mo, va tu do doc duoc noi dung tep do.
    if (tep_id !== null) {
      const t = await truy_van_mot<{ nhan_vien_id: string }>(
        'select nhan_vien_id from ho_so_tep where id = $1', [tep_id]);
      if (t === null || t.nhan_vien_id !== id) {
        throw new LoiDauVao('Tệp không thuộc hồ sơ của nhân viên này.');
      }
    }

    // O DANG TRONG thi nhan su nap duoc. O DA CO TEP thi thay hay go doi TP nhan su.
    //
    // Kiem o day chu khong chi o duong xoa tep: khong co doan nay thi mot tai khoan nhan su
    // "thay tep" bang cach nap tep moi de len — ban cu tro thanh tep mo coi khong ai thay
    // trong giao dien, va cai o checklist da tro thanh mot ban khac. Ket qua giong het xoa.
    const cu = await truy_van_mot<{ tep_id: string | null }>(
      'select tep_id from tai_lieu_nhan_vien where nhan_vien_id = $1 and danh_muc_id = $2',
      [id, dm.id]);
    const tep_cu = cu?.tep_id ?? null;
    const doi_tep = tep_cu !== null && tep_cu !== tep_id;
    if (doi_tep && !thay_xoa_tep_duoc(nd)) {
      throw new LoiKhongQuyen(LY_DO_KHONG_THAY_XOA_DUOC);
    }

    await thuc_thi(
      `insert into tai_lieu_nhan_vien
         (nhan_vien_id, danh_muc_id, trang_thai, tep_id, nguoi_phu_trach, han_hoan_thanh, ghi_chu)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (nhan_vien_id, danh_muc_id) do update
          set trang_thai = excluded.trang_thai,
              tep_id = excluded.tep_id,
              nguoi_phu_trach = excluded.nguoi_phu_trach,
              han_hoan_thanh = excluded.han_hoan_thanh,
              ghi_chu = excluded.ghi_chu,
              cap_nhat_luc = now()`,
      [id, dm.id, trang_thai, tep_id,
        chuoi(b, 'nguoi_phu_trach', { toi_da: 150 }),
        ngay(b, 'han_hoan_thanh'),
        chuoi(b, 'ghi_chu', { toi_da: 1000 })],
    );

    // Tep cu bi thay the thi don luon — ca dong CSDL lan tep tren dia. Khong don thi no
    // thanh tep mo coi: khong con hien o dong checklist nao, nhung van nam trong kho va van
    // la du lieu ca nhan phai bao ve.
    if (doi_tep && tep_cu !== null) {
      const t = await truy_van_mot<{ ten_luu: string }>(
        'select ten_luu from ho_so_tep where id = $1', [tep_cu]);
      await thuc_thi('delete from ho_so_tep where id = $1', [tep_cu]);
      if (t !== null) await xoa_tep_ho_so(t.ten_luu);
      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.xoa_tep', 'ho_so_tep',
        tep_cu, { nhan_vien_id: id, ly_do: 'thay tệp ở mục tài liệu', ma }, req.ip);
    }

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.sua_tai_lieu', 'tai_lieu_nhan_vien',
      id, { ma, trang_thai, doi_tep }, req.ip);
    return { ok: true };
  });

  /** Danh muc tai lieu dung chung — de nhan su xem va de webapp dung nhan. */
  app.get('/danh-muc-tai-lieu', { preHandler: can_dang_nhap }, async () => truy_van(
    `select id, ma, ten, nhom, mo_ta, bat_buoc, chi_khi_nghi_viec, thu_tu, dang_dung
       from danh_muc_tai_lieu order by thu_tu, ten`));

  // ------------------------------------------------------------ tep dinh kem
  /** Tai mot tep len, gan vao mot nhom (va tuy chon: mot ban ghi cu the). */
  app.post('/nhan-vien/:id/tep', {
    preHandler: can_dang_nhap,
    bodyLimit: cau_hinh.tep_toi_da_byte + 1024 * 1024,
  }, async (req, res) => {
    const nd = nguoi_xem(req);
    const id = doc_id(req);
    const { bc } = await nap_boi_canh(nd, id);

    const truong: Record<string, string> = {};
    let du_lieu: Buffer | null = null;
    let ten_goc = 'tep';
    for await (const phan of req.parts({ limits: { fileSize: cau_hinh.tep_toi_da_byte } })) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'tep') {
          await phan.toBuffer(); // van phai doc het, neu khong request treo
          continue;
        }
        ten_goc = lam_sach_ten(phan.filename ?? 'tep');
        du_lieu = await phan.toBuffer();
      } else if (typeof phan.value === 'string') {
        truong[phan.fieldname] = phan.value;
      }
    }
    if (du_lieu === null) throw new LoiDauVao('Thiếu tệp đính kèm.');

    // `CAC_NHOM` chu KHONG phai `THEO_NHOM.keys()`.
    //
    // DAC_TA chi co 9 nhom — `thong_tin` va `tai_lieu` khong sinh route tu bang dac ta nen
    // khong co o trong do. Doi chieu voi DAC_TA lam ca hai nhom do KHONG tai tep len duoc,
    // va mot trong hai chinh la checklist "Ho so tai lieu 0/7" o dau trang ho so: keo tep
    // vao bat ky dong nao cung nhan 400. Xem di tru 018.
    const nhom = trong_tap(truong, 'nhom', CAC_NHOM, { bat_buoc: true }) as NhomHoSo;
    bat_buoc_sua(nd, nhom, bc, THEO_NHOM.get(nhom)?.ten ?? TEN_NHOM_KHAC[nhom] ?? nhom);

    const thuoc_id = truong['thuoc_id'] === undefined || truong['thuoc_id'] === ''
      ? null
      : uuid_bat_buoc(truong, 'thuoc_id');

    const thang = new Date().toISOString().slice(0, 7);
    const da_luu = await luu_tep_ho_so(du_lieu, ten_goc, thang);

    // Tep da nam tren dia truoc khi co dong CSDL. Ghi that bai thi PHAI xoa no di: khong
    // xoa thi tep mo coi tren dia khong ai biet den, khong ai xoa duoc qua giao dien, va
    // vi la ban scan ho so nhan su nen no la du lieu ca nhan nam ngoai moi so sach.
    let moi: Record<string, unknown> | null;
    try {
      moi = await truy_van_mot(
        `insert into ho_so_tep(nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                               kich_thuoc, tai_len_boi)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         returning id, nhom, thuoc_id, ten_goc, kieu_mime, kich_thuoc, tao_luc`,
        [id, nhom, thuoc_id, ten_goc, da_luu.ten_luu, da_luu.mime, da_luu.kich_thuoc,
          nguoi_dung_hien_tai(req).sub],
      );
    } catch (loi) {
      await xoa_tep_ho_so(da_luu.ten_luu).catch(() => { /* da co loi that o tren */ });
      throw loi;
    }

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.tai_tep_len', 'ho_so_tep',
      String(moi?.['id'] ?? ''), { nhan_vien_id: id, nhom, ten_goc }, req.ip);
    return res.code(201).send(moi);
  });

  /** Tai tep ve. */
  app.get('/ho-so/tep/:tep_id', { preHandler: can_dang_nhap }, async (req, res) => {
    const { t, du_lieu } = await nap_tep_da_kiem(req);

    // LUON tra ve dang tai xuong, khong bao gio mo trong tab.
    //
    // Webapp va tep dinh kem dung CHUNG mot goc (cung ten mien, qua Caddy). Mot tep PDF mo
    // inline chay duoc JavaScript trong ngu canh cua chinh webapp — tuc la XSS voi day du
    // quyen cua nguoi dang dang nhap. Tai ve thi khong.
    return res
      .header('content-type', t.kieu_mime)
      .header('x-content-type-options', 'nosniff')
      .header('content-security-policy', "default-src 'none'; sandbox")
      .header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(t.ten_goc)}`)
      .send(du_lieu);
  });

  /**
   * Xem nhanh: tra tep de trinh duyet VE TRUC TIEP, chi cho anh va PDF.
   *
   * Duong tai xuong (`/ho-so/tep/:id`) van giu `attachment` — day la duong RIENG, co y thuc
   * la dang mo trong khung. An toan nam o hai cho:
   *   - Chi anh va PDF di qua day. HTML, DOCX, XLSX khong bao gio duoc tra inline.
   *   - Header CSP `sandbox` bat trinh duyet dat noi dung vao mot goc rieng, khong phai goc
   *     cua webapp. Mot PDF co nhung JavaScript se khong voi duoc token hay cookie cua
   *     nguoi dang dang nhap. Ben giao dien con long them mot lop iframe `sandbox`.
   */
  app.get('/ho-so/tep/:tep_id/xem', { preHandler: can_dang_nhap }, async (req, res) => {
    const { t, du_lieu } = await nap_tep_da_kiem(req);

    const cho_xem_inline = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!cho_xem_inline.includes(t.kieu_mime)) {
      throw new LoiDauVao('Định dạng này không mở trực tiếp được. Hãy tải về hoặc dùng xem nhanh.');
    }

    return res
      .header('content-type', t.kieu_mime)
      .header('x-content-type-options', 'nosniff')
      .header('content-security-policy', "default-src 'none'; img-src 'self' data:; object-src 'none'; sandbox")
      .header('content-disposition', `inline; filename*=UTF-8''${encodeURIComponent(t.ten_goc)}`)
      .send(du_lieu);
  });

  /**
   * Xem nhanh tep Office: tra ve NOI DUNG DA BOC (van ban / bang), khong tra tep.
   *
   * Trinh duyet khong ve duoc DOCX/XLSX. Boc chu ra o may chu roi tra JSON thi giao dien chi
   * ve chu — khong co duong nao de tep chay duoc thu gi.
   */
  app.get('/ho-so/tep/:tep_id/trich', { preHandler: can_dang_nhap }, async (req) => {
    const { t, du_lieu } = await nap_tep_da_kiem(req);
    const kq = trich_theo_duoi(du_lieu, t.ten_luu);
    if (kq === null) {
      throw new LoiDauVao('Chỉ bóc được nội dung tệp DOCX và XLSX.');
    }
    return { ten_goc: t.ten_goc, ...kq };
  });

  /**
   * Ban truy xuat: toan bo tep dinh kem kem DUONG DAN da luu tren dia.
   *
   * Duong dan hien ra de doi chieu khi sao luu hay khi phuc hoi — CSDL chi giu sieu du lieu,
   * ban goc nam tren dia, va hai ben lech nhau thi phai tra ra duoc cho lech.
   */
  app.get('/ho-so/tep', { preHandler: can_nhan_su }, async (req) => {
    const q = than(req.query);
    const nhan_vien_id = uuid(q, 'nhan_vien_id');
    const nhom = chuoi(q, 'nhom', { toi_da: 30 });
    const { gioi_han, bo_qua } = phan_trang(q, 100, 500);

    const dong = await truy_van(
      `select t.id, t.nhom, t.ten_goc, t.ten_luu, t.kieu_mime, t.kich_thuoc, t.tao_luc,
              t.nhan_vien_id, nv.ma_nv, nv.ho_ten, nd.ten_dang_nhap as tai_len_boi
         from ho_so_tep t
         join nhan_vien nv on nv.id = t.nhan_vien_id
         left join nguoi_dung nd on nd.id = t.tai_len_boi
        where ($1::uuid is null or t.nhan_vien_id = $1)
          and ($2::text is null or t.nhom = $2)
        order by t.tao_luc desc
        limit $3 offset $4`,
      [nhan_vien_id, nhom, gioi_han, bo_qua],
    );

    const tong = await truy_van_mot<{ so: number; byte: string }>(
      `select count(*)::int as so, coalesce(sum(kich_thuoc), 0)::text as byte
         from ho_so_tep
        where ($1::uuid is null or nhan_vien_id = $1)
          and ($2::text is null or nhom = $2)`,
      [nhan_vien_id, nhom],
    );

    return { danh_sach: dong, tong, thu_muc_goc: cau_hinh.thu_muc_ho_so };
  });

  app.delete('/ho-so/tep/:tep_id', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const tep_id = doc_id(req, 'tep_id');
    const t = await truy_van_mot<{ nhan_vien_id: string; nhom: NhomHoSo; ten_luu: string }>(
      'select nhan_vien_id, nhom, ten_luu from ho_so_tep where id = $1', [tep_id]);
    if (t === null) throw new LoiKhongTim('Không tìm thấy tệp.');

    const { bc } = await nap_boi_canh(nd, t.nhan_vien_id);
    const dac = THEO_NHOM.get(t.nhom);
    bat_buoc_sua(nd, t.nhom, bc, dac?.ten ?? TEN_NHOM_KHAC[t.nhom] ?? t.nhom);

    // Xoa mot ban da nap la LAM MAT chung cu, khong phai sua mot o du lieu. Doi mot bac
    // quyen cao hon quyen sua nhom.
    if (!thay_xoa_tep_duoc(nd)) throw new LoiKhongQuyen(LY_DO_KHONG_THAY_XOA_DUOC);

    await thuc_thi('delete from ho_so_tep where id = $1', [tep_id]);
    await xoa_tep_ho_so(t.ten_luu);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.xoa_tep', 'ho_so_tep',
      tep_id, { nhan_vien_id: t.nhan_vien_id }, req.ip);
    return { ok: true };
  });

  // ------------------------------------------------------------ noi dung hop dong
  //
  // Yeu cau: "quet noi dung hop dong chuyen sang text de luu tru".
  //
  // Van ban trich ra la de TIM va DOI CHIEU. Ban co gia tri phap ly luon la tep goc trong
  // ho_so_tep — xem chu thich dau `hop_dong/trich_noi_dung.ts`.

  /** May chu nay trich duoc nhung dinh dang nao. Giao dien doc truoc de bao som. */
  app.get('/ho-so/cong-cu-trich', { preHandler: can_dang_nhap }, async () => ({
    docx: true,
    ...(await cong_cu_trich()),
  }));

  /**
   * Tim hop dong theo NOI DUNG da trich.
   *
   * Chi nhan su. Noi dung hop dong co luong, dieu khoan rieng, dieu kien thoi viec — day
   * la duong tim XUYEN nhan vien nen khong the de quyen theo tung ho so gac cho no.
   */
  app.get('/ho-so/hop-dong/tim', { preHandler: can_nhan_su }, async (req) => {
    const q = than(req.query);
    const tu_khoa = chuoi_bat_buoc(q, 'q', { toi_da: 200 });
    const { gioi_han, bo_qua } = phan_trang(q, 30, 100);

    // `position` thay vi `ilike '%...%'`: khong phai thoat `%` va `_` trong tu khoa nguoi
    // dung nhap — go dau '%' vao o tim khong duoc bien thanh "khop moi hop dong".
    const dong = await truy_van(
      `select hd.id, hd.so_hd, hd.loai, hd.chuc_danh, hd.hieu_luc_tu, hd.hieu_luc_den,
              hd.trang_thai, hd.cach_trich, hd.trich_luc,
              length(hd.noi_dung_text) as so_ky_tu,
              nv.id as nhan_vien_id, nv.ma_nv, nv.ho_ten
         from hop_dong_lao_dong hd
         join nhan_vien nv on nv.id = hd.nhan_vien_id
        where hd.noi_dung_text is not null
          and position(lower($1) in lower(hd.noi_dung_text)) > 0
        order by hd.hieu_luc_tu desc, nv.ma_nv
        limit $2 offset $3`,
      [tu_khoa, gioi_han, bo_qua],
    );

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.tim_noi_dung_hop_dong',
      'hop_dong_lao_dong', '', { tu_khoa, so_ket_qua: dong.length }, req.ip);
    return { danh_sach: dong, tu_khoa };
  });

  /**
   * Hop dong sap het han va DA het han.
   *
   * Day la mat doi dien cua viec nhac han tu dong: thong bao day co the bi tat, bi mat, hay
   * nguoi nhan da nghi viec. Danh sach nay thi luon o day va luon day du.
   */
  app.get('/ho-so/hop-dong/sap-het-han', { preHandler: can_nhan_su }, async (req) => {
    const q = than(req.query);
    const trong_ngay = so_nguyen(q, 'trong_ngay', { min: 0, max: 365 }) ?? 45;
    const ds = await hop_dong_sap_het_han(trong_ngay);

    return {
      trong_ngay,
      danh_sach: ds.map((hd) => ({ ...hd, muc_gap: muc_gap(hd.so_ngay_con) })),
      // Dem rieng so da het han: do la con so nhan su can thay dau tien.
      so_da_het_han: ds.filter((hd) => hd.so_ngay_con < 0).length,
    };
  });

  /** Doc noi dung da trich cua mot hop dong. */
  app.get('/ho-so/hop-dong/:id/noi-dung', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const hd = await nap_hop_dong(doc_id(req));
    const { bc } = await nap_boi_canh(nd, hd.nhan_vien_id);
    bat_buoc_doc(nd, 'hop_dong', bc, 'hợp đồng lao động');

    return {
      hop_dong_id: hd.id,
      so_hd: hd.so_hd,
      noi_dung_text: hd.noi_dung_text,
      cach_trich: hd.cach_trich,
      trich_luc: hd.trich_luc,
      trich_tu_tep_id: hd.trich_tu_tep_id,
      so_ky_tu: hd.noi_dung_text?.length ?? 0,
    };
  });

  /**
   * Trich noi dung mot tep dinh kem vao hop dong.
   *
   * Doi quyen SUA hop dong, khong phai quyen doc: thao tac nay GHI vao ho so.
   *
   * Voi ban scan, OCR chay dong bo va co the mat den mot phut. Chua tach ra viec chay nen
   * vi mot hop dong lao dong chi vai trang; neu sau nay co nhu cau trich ca kho thi day la
   * cho dau tien phai tach.
   */
  app.post('/ho-so/hop-dong/:id/trich-noi-dung', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const hd = await nap_hop_dong(doc_id(req));
    const { bc } = await nap_boi_canh(nd, hd.nhan_vien_id);
    bat_buoc_sua(nd, 'hop_dong', bc, 'hợp đồng lao động');

    const b = than(req.body);
    const tep_id = uuid_bat_buoc(b, 'tep_id');
    const t = await truy_van_mot<{ nhan_vien_id: string; ten_goc: string; ten_luu: string }>(
      'select nhan_vien_id, ten_goc, ten_luu from ho_so_tep where id = $1', [tep_id]);
    if (t === null) throw new LoiKhongTim('Không tìm thấy tệp.');

    // TEP PHAI THUOC CHINH NHAN VIEN NAY. Thieu rang buoc nay thi ai sua duoc mot hop dong
    // se doc duoc noi dung tep cua BAT KY nhan vien nao chi bang cach doan ma tep — noi
    // dung se hien ra ngay tren hop dong ho vua sua.
    if (t.nhan_vien_id !== hd.nhan_vien_id) {
      throw new LoiDauVao('Tệp này không thuộc hồ sơ của nhân viên đó.');
    }

    const du_lieu = await doc_tep_ho_so(t.ten_luu);
    if (du_lieu === null) throw new LoiKhongTim('Tệp không còn trên máy chủ.');

    let kq: KetQuaTrich;
    try {
      kq = await trich_tu_tep(du_lieu, t.ten_luu);
    } catch (loi) {
      if (loi instanceof LoiDinhDang) throw new LoiDauVao(loi.message);
      throw loi;
    }

    // KHONG ghi chuoi rong. Mot o trong im lang se duoc doc la "hop dong nay khong co noi
    // dung", trong khi su that la "may chua doc duoc". Tra canh bao ve cho nguoi dung.
    if (kq.so_ky_tu === 0) return { da_luu: false, ten_tep: t.ten_goc, ...kq };

    await thuc_thi(
      `update hop_dong_lao_dong
          set noi_dung_text = $2, trich_tu_tep_id = $3, cach_trich = $4, trich_luc = now(),
              cap_nhat_luc = now()
        where id = $1`,
      [hd.id, kq.noi_dung_text, tep_id, kq.cach_trich],
    );

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.trich_noi_dung_hop_dong',
      'hop_dong_lao_dong', hd.id,
      { tep_id, ten_tep: t.ten_goc, cach_trich: kq.cach_trich, so_ky_tu: kq.so_ky_tu }, req.ip);

    return { da_luu: true, ten_tep: t.ten_goc, ...kq };
  });

  /** Xoa noi dung da trich. Dung khi OCR ra rac va can trich lai tu tep khac. */
  app.delete('/ho-so/hop-dong/:id/noi-dung', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const hd = await nap_hop_dong(doc_id(req));
    const { bc } = await nap_boi_canh(nd, hd.nhan_vien_id);
    bat_buoc_sua(nd, 'hop_dong', bc, 'hợp đồng lao động');

    await thuc_thi(
      `update hop_dong_lao_dong
          set noi_dung_text = null, trich_tu_tep_id = null, cach_trich = null,
              trich_luc = null, cap_nhat_luc = now()
        where id = $1`, [hd.id]);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.xoa_noi_dung_hop_dong',
      'hop_dong_lao_dong', hd.id, {}, req.ip);
    return { ok: true };
  });
}

// ==================================================================== tien ich

interface HopDongCoNoiDung {
  id: string;
  nhan_vien_id: string;
  so_hd: string | null;
  noi_dung_text: string | null;
  cach_trich: string | null;
  trich_luc: string | null;
  trich_tu_tep_id: string | null;
}

async function nap_hop_dong(id: string): Promise<HopDongCoNoiDung> {
  const hd = await truy_van_mot<HopDongCoNoiDung>(
    `select id, nhan_vien_id, so_hd, noi_dung_text, cach_trich, trich_luc, trich_tu_tep_id
       from hop_dong_lao_dong where id = $1`, [id]);
  if (hd === null) throw new LoiKhongTim('Không tìm thấy hợp đồng.');
  return hd;
}

interface TepDaKiem {
  t: { nhan_vien_id: string; nhom: NhomHoSo; ten_goc: string; ten_luu: string; kieu_mime: string };
  du_lieu: Buffer;
}

/**
 * Nap tep va kiem quyen MOT LAN cho ca ba duong (tai ve, xem, boc noi dung).
 *
 * Quyen cua tep di theo quyen cua NHOM chua no. Viet chung o day de khong co duong nao
 * quen kiem — them mot duong xem moi ma quen thi coi nhu mo cua sau cho ca kho tep.
 */
async function nap_tep_da_kiem(req: FastifyRequest): Promise<TepDaKiem> {
  const nd = nguoi_xem(req);
  const tep_id = doc_id(req, 'tep_id');
  const t = await truy_van_mot<TepDaKiem['t']>(
    'select nhan_vien_id, nhom, ten_goc, ten_luu, kieu_mime from ho_so_tep where id = $1',
    [tep_id],
  );
  if (t === null) throw new LoiKhongTim('Không tìm thấy tệp.');

  const { bc } = await nap_boi_canh(nd, t.nhan_vien_id);
  const dac = THEO_NHOM.get(t.nhom);
  bat_buoc_doc(nd, t.nhom, bc, dac?.ten ?? t.nhom);

  const du_lieu = await doc_tep_ho_so(t.ten_luu);
  if (du_lieu === null) throw new LoiKhongTim('Tệp không còn trên máy chủ.');
  return { t, du_lieu };
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function doc_id(req: FastifyRequest, ten = 'id'): string {
  const v = String((req.params as Record<string, string>)[ten] ?? '');
  if (!RE_UUID.test(v)) throw new LoiDauVao('Mã không hợp lệ.');
  return v;
}

/** Ghi lai ai tao ban ghi, o nhung bang co cot tuong ung. */
function them_nguoi_thao_tac(
  dac: DacTaNhom,
  cot: string[],
  gia_tri: unknown[],
  nguoi_dung_id: string,
): void {
  if (dac.bang === 'quyet_dinh_luong') { cot.push('tao_boi'); gia_tri.push(nguoi_dung_id); }
  if (dac.bang === 'cong_viec') { cot.push('giao_boi'); gia_tri.push(nguoi_dung_id); }
}
