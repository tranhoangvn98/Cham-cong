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
import { can_dang_nhap, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import {
  cac_nhom_doc_duoc, chi_duoc_sua_o, doc_duoc, sua_duoc,
  type BoiCanh, type NhomHoSo, type NguoiXem,
} from '../bao_mat/quyen_ho_so.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { doc_tep_ho_so, lam_sach_ten, luu_tep_ho_so, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { cau_hinh } from '../cau_hinh.ts';
import {
  chuoi, chuoi_bat_buoc, ngay, ngay_bat_buoc, so_thuc, than, trong_tap, uuid, uuid_bat_buoc,
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
];

const THEO_NHOM = new Map(DAC_TA.map((d) => [d.nhom, d]));

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
      const dac = THEO_NHOM.get(nhom) as DacTaNhom;
      const d = await truy_van_mot<{ so: number }>(
        `select count(*)::int as so from ${dac.bang} where nhan_vien_id = $1`, [id]);
      dem[nhom] = d?.so ?? 0;
    }

    const chi_tiet = await truy_van_mot<Record<string, unknown>>(
      `select nv.ma_nv, nv.ho_ten, nv.pin_may, nv.email, nv.so_dien_thoai, nv.ngay_vao,
              nv.ngay_nghi_viec, nv.dang_hoat_dong, nv.duoc_cham_cong_dien_thoai,
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

    return {
      nhan_vien: { id: nv.id, ...chi_tiet },
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
      return { danh_sach: dong, tep, sua_duoc: sua_duoc(nd, dac.nhom, bc) };
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

    const nhom = trong_tap(truong, 'nhom', [...THEO_NHOM.keys()], { bat_buoc: true }) as NhomHoSo;
    const dac = THEO_NHOM.get(nhom) as DacTaNhom;
    bat_buoc_sua(nd, nhom, bc, dac.ten);

    const thuoc_id = truong['thuoc_id'] === undefined || truong['thuoc_id'] === ''
      ? null
      : uuid_bat_buoc(truong, 'thuoc_id');

    const thang = new Date().toISOString().slice(0, 7);
    const da_luu = await luu_tep_ho_so(du_lieu, ten_goc, thang);

    const moi = await truy_van_mot(
      `insert into ho_so_tep(nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                             kich_thuoc, tai_len_boi)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning id, nhom, thuoc_id, ten_goc, kieu_mime, kich_thuoc, tao_luc`,
      [id, nhom, thuoc_id, ten_goc, da_luu.ten_luu, da_luu.mime, da_luu.kich_thuoc,
        nguoi_dung_hien_tai(req).sub],
    );

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.tai_tep_len', 'ho_so_tep',
      String(moi?.['id'] ?? ''), { nhan_vien_id: id, nhom, ten_goc }, req.ip);
    return res.code(201).send(moi);
  });

  /** Tai tep ve. */
  app.get('/ho-so/tep/:tep_id', { preHandler: can_dang_nhap }, async (req, res) => {
    const nd = nguoi_xem(req);
    const tep_id = doc_id(req, 'tep_id');
    const t = await truy_van_mot<{
      nhan_vien_id: string; nhom: NhomHoSo; ten_goc: string; ten_luu: string; kieu_mime: string;
    }>(
      'select nhan_vien_id, nhom, ten_goc, ten_luu, kieu_mime from ho_so_tep where id = $1',
      [tep_id],
    );
    if (t === null) throw new LoiKhongTim('Không tìm thấy tệp.');

    const { bc } = await nap_boi_canh(nd, t.nhan_vien_id);
    const dac = THEO_NHOM.get(t.nhom);
    bat_buoc_doc(nd, t.nhom, bc, dac?.ten ?? t.nhom);

    const du_lieu = await doc_tep_ho_so(t.ten_luu);
    if (du_lieu === null) throw new LoiKhongTim('Tệp không còn trên máy chủ.');

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

  app.delete('/ho-so/tep/:tep_id', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_xem(req);
    const tep_id = doc_id(req, 'tep_id');
    const t = await truy_van_mot<{ nhan_vien_id: string; nhom: NhomHoSo; ten_luu: string }>(
      'select nhan_vien_id, nhom, ten_luu from ho_so_tep where id = $1', [tep_id]);
    if (t === null) throw new LoiKhongTim('Không tìm thấy tệp.');

    const { bc } = await nap_boi_canh(nd, t.nhan_vien_id);
    const dac = THEO_NHOM.get(t.nhom);
    bat_buoc_sua(nd, t.nhom, bc, dac?.ten ?? t.nhom);

    await thuc_thi('delete from ho_so_tep where id = $1', [tep_id]);
    await xoa_tep_ho_so(t.ten_luu);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'ho_so.xoa_tep', 'ho_so_tep',
      tep_id, { nhan_vien_id: t.nhan_vien_id }, req.ip);
    return { ok: true };
  });
}

// ==================================================================== tien ich

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
