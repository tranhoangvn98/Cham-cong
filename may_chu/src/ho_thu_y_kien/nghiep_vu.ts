// Ho thu y kien — nghiep vu chung cua hai duong:
//   - gop y chung (gop_y / phan_anh / yeu_cau / thac_mac) cua nhan vien;
//   - y kien cho ban du thao van ban AI (loai 'du_thao', gan nhap_ai_id).
//
// Hoi thoai hai chieu (bang ho_thu_y_kien_tra_loi) cho den khi nhan su DONG ho thu.
// Email va chuong bao do lop tuyen goi (fire-and-forget), module nay chi nghiep vu CSDL.
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { LoiKhongTim, LoiXungDot } from '../tien_ich/kiem_tra.ts';
import { noi_dung_hien_thi } from '../ai/ghep_spec.ts';
import type { SpecVanBan } from '../ai/kieu.ts';

/** Cac loai gop y chung (khong gan van ban). 'du_thao' la y kien cho ban du thao van ban AI. */
export const CAC_LOAI_GOP_Y = ['gop_y', 'phan_anh', 'yeu_cau', 'thac_mac'] as const;
export type LoaiHoThu = 'du_thao' | (typeof CAC_LOAI_GOP_Y)[number];
export const CAC_LOAI_HO_THU: readonly string[] = ['du_thao', ...CAC_LOAI_GOP_Y];

export const NHAN_LOAI_HO_THU: Record<LoaiHoThu, string> = {
  du_thao: 'Ý kiến dự thảo',
  gop_y: 'Góp ý',
  phan_anh: 'Phản ánh',
  yeu_cau: 'Yêu cầu',
  thac_mac: 'Thắc mắc',
};

export const CAC_TRANG_THAI_HO_THU = ['moi', 'dang_xem', 'da_dong'] as const;
export type TrangThaiHoThu = (typeof CAC_TRANG_THAI_HO_THU)[number];

export const NHAN_TRANG_THAI_HO_THU: Record<TrangThaiHoThu, string> = {
  moi: 'Chờ xử lý',
  dang_xem: 'Đang xử lý',
  da_dong: 'Đã hoàn tất',
};

export interface DongTraLoi {
  vai: string;
  nguoi_dung_id: string | null;
  noi_dung: string;
  tao_luc: string;
}

export interface DongHoThu {
  id: string;
  ma: string;
  loai: LoaiHoThu;
  nhan_vien_id: string | null;
  nhap_ai_id: string | null;
  tieu_de: string;
  noi_dung: string;
  trang_thai: TrangThaiHoThu;
  nguoi_xu_ly: string | null;
  dong_luc: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
  tra_loi: DongTraLoi[];
}

const COT = `select h.id, h.ma, h.loai, h.nhan_vien_id, h.nhap_ai_id, h.tieu_de, h.noi_dung,
       h.trang_thai, h.nguoi_xu_ly, h.dong_luc, h.tao_luc, h.cap_nhat_luc,
       coalesce((select json_agg(json_build_object('vai', r.vai, 'nguoi_dung_id', r.nguoi_dung_id,
                                                  'noi_dung', r.noi_dung, 'tao_luc', r.tao_luc)
                                 order by r.tao_luc)
                   from ho_thu_y_kien_tra_loi r
                  where r.ho_thu_id = h.id), '[]') as tra_loi
  from ho_thu_y_kien h`;

/** Doc mot ho thu kem thread. Khong tim thay thi nem LoiKhongTim. */
export async function doc_ho_thu(ho_thu_id: string): Promise<DongHoThu> {
  const d = await truy_van_mot<DongHoThu>(`${COT} where h.id = $1`, [ho_thu_id]);
  if (d === null) throw new LoiKhongTim('Không tìm thấy hòm thư ý kiến.');
  return d;
}

/** Danh sach ho thu cua MOT nhan vien (moi nhat truoc), kem thread. */
export async function ho_thu_cua_nhan_vien(nhan_vien_id: string): Promise<DongHoThu[]> {
  return truy_van<DongHoThu>(
    `${COT} where h.nhan_vien_id = $1 order by h.tao_luc desc limit 200`, [nhan_vien_id],
  );
}

/** Tao ho thu moi. `nhap_ai_id` chi khac null khi loai='du_thao'. */
export async function tao_ho_thu(o: {
  loai: LoaiHoThu;
  nhan_vien_id: string;
  nhap_ai_id: string | null;
  tieu_de: string;
  noi_dung: string;
}): Promise<{ id: string; ma: string }> {
  const d = await truy_van_mot<{ id: string; ma: string }>(
    `insert into ho_thu_y_kien (loai, nhan_vien_id, nhap_ai_id, tieu_de, noi_dung)
     values ($1,$2,$3,$4,$5) returning id, ma`,
    [o.loai, o.nhan_vien_id, o.nhap_ai_id, o.tieu_de, o.noi_dung],
  );
  if (d === null) throw new LoiXungDot('Không tạo được hòm thư ý kiến.');
  return d;
}

/**
 * Tra loi vao ho thu (hai vai). Vai 'nhan_su' tra loi mot ho thu 'moi' thi tu chuyen sang
 * 'dang_xem' trong CUNG transaction. Ho thu da dong thi nem LoiXungDot.
 */
export async function tra_loi_ho_thu(
  ho_thu_id: string, vai: 'nhan_vien' | 'nhan_su', nguoi_dung_id: string, noi_dung: string,
): Promise<DongHoThu> {
  const hien = await truy_van_mot<{ trang_thai: string }>(
    'select trang_thai from ho_thu_y_kien where id = $1', [ho_thu_id],
  );
  if (hien === null) throw new LoiKhongTim('Không tìm thấy hòm thư ý kiến.');
  if (hien.trang_thai === 'da_dong') {
    throw new LoiXungDot('Hòm thư đã hoàn tất, không trả lời thêm được.');
  }
  await trong_giao_dich(async (khach) => {
    await khach.query(
      `insert into ho_thu_y_kien_tra_loi (ho_thu_id, vai, nguoi_dung_id, noi_dung)
       values ($1,$2,$3,$4)`,
      [ho_thu_id, vai, nguoi_dung_id, noi_dung],
    );
    if (vai === 'nhan_su' && hien.trang_thai === 'moi') {
      await khach.query(
        `update ho_thu_y_kien set trang_thai = 'dang_xem', nguoi_xu_ly = $2, cap_nhat_luc = now()
          where id = $1`,
        [ho_thu_id, nguoi_dung_id],
      );
    }
  });
  return doc_ho_thu(ho_thu_id);
}

/** Nhan su dong ho thu — het hoi thoai. Chi dong duoc ho thu chua dong. */
export async function dong_ho_thu(ho_thu_id: string, nguoi_dung_id: string): Promise<DongHoThu> {
  const hien = await truy_van_mot<{ trang_thai: string }>(
    'select trang_thai from ho_thu_y_kien where id = $1', [ho_thu_id],
  );
  if (hien === null) throw new LoiKhongTim('Không tìm thấy hòm thư ý kiến.');
  if (hien.trang_thai === 'da_dong') {
    throw new LoiXungDot('Hòm thư đã được đóng rồi.');
  }
  await thuc_thi(
    `update ho_thu_y_kien
        set trang_thai = 'da_dong', nguoi_xu_ly = coalesce(nguoi_xu_ly, $2),
            dong_luc = now(), cap_nhat_luc = now()
      where id = $1`,
    [ho_thu_id, nguoi_dung_id],
  );
  return doc_ho_thu(ho_thu_id);
}

/**
 * Bao popup cho Nhan su / Admin khi co y kien moi: tao mot thong bao ca_nhan bat popup cho
 * TUNG tai khoan quan tri ho thu (can_nhan_su) co gan ho so nhan vien. Khong gui email, khong
 * gui chuong (chuong bao da co duong rieng o route). Dung co che popup san co cua thong bao
 * (popup=true + xac nhan da doc) nen Nhan su dang nhap se thay ngay, khong bo sot phan anh.
 *
 * Khong nem loi — thong bao popup la phan phu, y kien da luu roi.
 */
export async function bao_y_kien_moi(ho_thu_id: string): Promise<void> {
  try {
    const h = await truy_van_mot<{ loai: string; tieu_de: string }>(
      'select loai, tieu_de from ho_thu_y_kien where id = $1', [ho_thu_id],
    );
    if (h === null) return;
    const quan_tri = await truy_van<{ nhan_vien_id: string }>(
      `select nhan_vien_id from nguoi_dung
        where dang_hoat_dong = true and nhan_vien_id is not null
          and vai_tro in ('admin', 'nhan_su', 'truong_phong_nhan_su')`,
    );
    if (quan_tri.length === 0) return;
    const noi_dung = `${NHAN_LOAI_HO_THU[h.loai as LoaiHoThu] ?? h.loai}: ${h.tieu_de}`;
    for (const nd of quan_tri) {
      await thuc_thi(
        `insert into thong_bao (tieu_de, noi_dung, muc_do, can_giai_trinh, pham_vi,
                                nhan_vien_id, popup, gui_email)
         values ('Có ý kiến mới trong Hòm thư', $1, 'thuong', false, 'ca_nhan', $2, true, false)`,
        [noi_dung, nd.nhan_vien_id],
      );
    }
  } catch (loi) {
    console.warn(`[ho_thu] khong tao duoc popup bao y kien moi: ${(loi as Error).message}`);
  }
}

/** Nhan vien co nam trong pham vi nhan cua ban du thao khong. Khong tim thay du thao -> null. */
export async function trong_pham_vi_du_thao(
  nhan_vien_id: string, nhap_ai_id: string,
): Promise<boolean | null> {
  const d = await truy_van_mot<{ ok: boolean }>(
    `select (d.pham_vi = 'toan_cong_ty'
             or (d.pham_vi = 'phong_ban' and nv.phong_ban_id = d.phong_ban_id)
             or (d.pham_vi = 'ca_nhan' and d.nhan_vien_id = nv.id)) as ok
       from thong_bao_nhap_ai d
       join nhan_vien nv on nv.id = $2 and nv.dang_hoat_dong = true
      where d.id = $1`,
    [nhap_ai_id, nhan_vien_id],
  );
  return d?.ok ?? null;
}

/**
 * Tom tat ban du thao de trang gop y hien thi: trich yeu + noi dung van xuoi.
 * Chi tra khi du thao dang o trang thai 'dang_lay_y_kien' va nhan vien TRONG pham vi
 * (dung cho route /toi — ngoai pham vi phai tra 404, khong lo su ton tai).
 */
export async function du_thao_cho_gop_y(
  nhap_ai_id: string, nhan_vien_id: string,
): Promise<{ id: string; ma: string; loai: string; trich_yeu: string; noi_dung: string } | null> {
  const d = await truy_van_mot<{ id: string; ma: string; loai: string; spec_json: unknown }>(
    `select id, ma, loai, spec_json from thong_bao_nhap_ai
      where id = $1 and trang_thai = 'dang_lay_y_kien'`,
    [nhap_ai_id],
  );
  if (d === null) return null;
  const trong = await trong_pham_vi_du_thao(nhan_vien_id, nhap_ai_id);
  if (trong !== true) return null;
  const spec = d.spec_json as SpecVanBan | null;
  return {
    id: d.id,
    ma: d.ma,
    loai: d.loai,
    trich_yeu: spec?.trich_yeu ?? '',
    noi_dung: spec === null ? '' : noi_dung_hien_thi(spec),
  };
}
