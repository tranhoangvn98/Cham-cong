// Tro ly o CHE DO huong dan thoi viec (REQ-NV-03): doc checklist cua chinh nguoi dung,
// goi y muc ke tiep, cho tick muc don gian va mo trang huong dan. Khong goi LLM — moi cau
// deu tu du lieu that.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { quy_trinh_theo_id } from './quy_trinh.ts';
import { so_muc_bat_buoc_chua } from './tinh_toan.ts';
import { ngay_viet } from '../tien_ich/thoi_gian.ts';

/** Tra loi cung khuon TraLoiTroLy — giao dien widget dung chung mot khuon. */
export interface TraLoiHuongDanThoiViec {
  tra_loi: string;
  y_dinh: string;
  goi_y: string[];
  hanh_dong?: {
    loai: string;
    tieu_de: string;
    chi_tiet: string[];
    duong_dan: string;
    phuong_thuc: 'POST';
    du_lieu: Record<string, unknown>;
    nhan: string;
    bo: string;
  };
  mo_de_xuat?: { nhan: string; den: string };
  cham_do?: number;
}

/** Muc tick duoc ngay bang mot nut (khong can bang chung). */
const MUC_TICK_NHANH = new Set(['doc_huong_dan', 'sao_luu_du_lieu', 'xac_nhan_lastday']);

/**
 * Tra loi cho widget tro ly thoi viec. `cau_hoi` rong = mo dau; khong hieu cau hoi thi van
 * tra ve trang thai checklist + goi y — widget nay chi co mot nhiem vu.
 */
export async function tra_loi_huong_dan_thoi_viec(
  nhan_vien_id: string, _cau_hoi: string,
): Promise<TraLoiHuongDanThoiViec | null> {
  const id = await truy_van_mot<{ id: string }>(
    `select id from quy_trinh_thoi_viec
      where nhan_vien_id = $1 and trang_thai in ('dang_thuc_hien','san_sang_chot')
      order by tao_luc desc limit 1`,
    [nhan_vien_id],
  );
  if (id === null) return null;
  const qt = await quy_trinh_theo_id(id.id);
  if (qt === null) return null;

  const con = so_muc_bat_buoc_chua(qt.muc);
  const muc_con = qt.muc.filter((m) => m.bat_buoc
    && (m.trang_thai === 'chua' || m.trang_thai === 'dang')
    && m.loai_tu_dong === 'nhan_vien');
  const tiep = muc_con[0] ?? null;

  let tra_loi: string;
  if (con === 0) {
    tra_loi = 'Bạn đã hoàn tất mọi mục bắt buộc. Quy trình đang chờ Admin duyệt cuối ở '
      + 'Cổng 2 — không cần làm gì thêm.';
  } else {
    tra_loi = `Còn ${String(con)} mục bắt buộc chưa xong.`;
    if (tiep !== null) tra_loi += `\nMục kế tiếp: **${tiep.tieu_de}**.`;
    tra_loi += '\nMở trang hướng dẫn để làm từng mục, đính kèm bằng chứng và ký điện tử.';
  }

  const goi_y = muc_con.slice(0, 3).map((m) => `Làm mục: ${m.tieu_de}`);

  const ra: TraLoiHuongDanThoiViec = {
    tra_loi,
    y_dinh: 'huong_dan_thoi_viec',
    goi_y: goi_y.length > 0 ? goi_y : ['Xem lại danh sách thủ tục thôi việc'],
    cham_do: con,
    mo_de_xuat: {
      nhan: 'Mở hướng dẫn thủ tục thôi việc',
      den: '/thoi-viec/huong-dan',
    },
  };

  // Muc tick nhanh: cho ngay mot nut Xac nhan, khong phai mo trang.
  if (tiep !== null && MUC_TICK_NHANH.has(tiep.ma_muc)) {
    ra.hanh_dong = {
      loai: 'tick_muc_thoi_viec',
      tieu_de: `Xác nhận: ${tiep.tieu_de}`,
      chi_tiet: [
        qt.ngay_lam_viec_cuoi === null ? 'Ngày làm việc cuối: chưa xác nhận'
          : `Ngày làm việc cuối: ${ngay_viet(qt.ngay_lam_viec_cuoi)}`,
      ],
      duong_dan: `/api/toi/thoi-viec/muc/${tiep.id}/tick`,
      phuong_thuc: 'POST',
      du_lieu: { trang_thai: 'xong', ghi_chu: 'Xác nhận qua trợ lý thôi việc' },
      nhan: 'Xác nhận',
      bo: 'Bỏ',
    };
  }
  return ra;
}

/** Dem muc bat buoc con chua — so do tren cham tron noi cua widget. */
export async function cham_do_thoi_viec(nhan_vien_id: string): Promise<number> {
  const d = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so
       from muc_checklist m
       join quy_trinh_thoi_viec qt on qt.id = m.quy_trinh_id
      where qt.nhan_vien_id = $1
        and qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
        and m.bat_buoc and m.trang_thai not in ('xong','bo_qua')`,
    [nhan_vien_id],
  );
  return d?.so ?? 0;
}

/** Quy trinh dang mo cua nhan vien (de widget biet co hien cham do khong). */
export async function co_quy_trinh_dang_mo(nhan_vien_id: string): Promise<boolean> {
  const d = await truy_van_mot<{ co: boolean }>(
    `select true as co from quy_trinh_thoi_viec
      where nhan_vien_id = $1 and trang_thai in ('dang_thuc_hien','san_sang_chot') limit 1`,
    [nhan_vien_id],
  );
  return d !== null;
}

/** Danh sach nguoi dung de admin gan lam nguoi nhan ban giao (gom nguoi quan ly). */
export async function danh_sach_nguoi_nhan_cho(
  quy_trinh_id: string,
): Promise<{ id: string; ten: string; chuc_danh: string | null }[]> {
  return truy_van(
    `select distinct nd.id, coalesce(nv.ho_ten, nd.ten_dang_nhap) as ten, nv.chuc_danh
       from nguoi_dung nd
       left join nhan_vien nv on nv.id = nd.nhan_vien_id
      where nd.dang_hoat_dong = true
        and (nv.dang_hoat_dong = true or nv.id is null)
        and (nd.nhan_vien_id is null
             or nd.nhan_vien_id <> (select nhan_vien_id from quy_trinh_thoi_viec where id = $1))
      order by ten limit 100`,
    [quy_trinh_id],
  );
}
