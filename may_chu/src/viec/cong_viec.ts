// Nghiep vu cong viec: tao, nop, duyet, huy, tick hanh dong con.
//
// Bang cong_viec dung chung voi ho so nhan su. Dong nao do module nay quan ly
// (nguon != 'ho_so') chi doi trang thai qua cac ham o day — khong duoc sua tu do
// qua route ho so.
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { moc_thoi_gian, ngay_dia_phuong, gio_dia_phuong, ngay_viet } from '../tien_ich/thoi_gian.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien, tai_khoan_nguoi_duyet } from '../su_kien/thong_bao_day.ts';
import { LoiKhongQuyen, LoiKhongTim, LoiXungDot } from '../tien_ich/kiem_tra.ts';
import type { NguoiXem } from './quyen.ts';

export const TT_VIEC = ['moi', 'dang_lam', 'cho_duyet', 'hoan_thanh', 'khong_hoan_thanh', 'huy'] as const;

/** Dong cong viec tra ve cho giao dien. */
export interface DongViec {
  id: string;
  nhan_vien_id: string;
  ho_ten: string | null;
  ma_nv: string | null;
  ten_phong_ban: string | null;
  tieu_de: string;
  mo_ta: string | null;
  giao_boi: string | null;
  ten_nguoi_giao: string | null;
  han: string | null;
  han_gio: string;
  han_moc: string | null;
  bat_dau: string | null;
  uu_tien: string;
  nguon: string;
  trang_thai: string;
  ket_qua: string | null;
  phan_hoi: string | null;
  ly_do_huy: string | null;
  nop_luc: string | null;
  hoan_thanh_luc: string | null;
  nhom_id: string | null;
  ten_nhom: string | null;
  mau_dinh_ky_id: string | null;
  tao_luc: string;
  so_hanh_dong: number;
  so_hanh_dong_xong: number;
}

const COT_VIEC = `
  v.id, v.nhan_vien_id, v.tieu_de, v.mo_ta, v.giao_boi,
  to_char(v.han, 'YYYY-MM-DD') as han,
  to_char(v.han_gio, 'HH24:MI') as han_gio,
  v.han_moc, v.bat_dau, v.uu_tien, v.nguon, v.trang_thai,
  v.ket_qua, v.phan_hoi, v.ly_do_huy, v.nop_luc, v.hoan_thanh_luc,
  v.nhom_id, v.mau_dinh_ky_id, v.tao_luc,
  nv.ho_ten, nv.ma_nv, pb.ten as ten_phong_ban,
  nd.ten as ten_nguoi_giao, cn.ten as ten_nhom,
  (select count(*) from cong_viec_hanh_dong hd where hd.cong_viec_id = v.id)::int as so_hanh_dong,
  (select count(*) from cong_viec_hanh_dong hd where hd.cong_viec_id = v.id and hd.xong)::int as so_hanh_dong_xong`;

const TU_VIEC = `
  from cong_viec v
  left join nhan_vien nv on nv.id = v.nhan_vien_id
  left join phong_ban pb on pb.id = nv.phong_ban_id
  left join nguoi_dung nd on nd.id = v.giao_boi
  left join cong_viec_nhom cn on cn.id = v.nhom_id`;

/** Dau vao tao viec (da kiem tra o route). */
export interface DauVaoTao {
  nhan_vien_id: string;
  tieu_de: string;
  mo_ta: string | null;
  han: string;
  han_gio: string;
  bat_dau: string | null;
  uu_tien: string;
  nhom_id: string | null;
  hanh_dong: string[];
}

function han_moc_cua(han: string, han_gio: string): string {
  return moc_thoi_gian(han, han_gio).toISOString();
}

/** Thong bao cho mot nhom nguoi dung (chuong bao web + push app). */
function bao_viec(
  nguoi_dung_ids: string[],
  tieu_de: string,
  noi_dung: string,
  loai: string,
  viec_id: string,
): void {
  const duy_nhat = [...new Set(nguoi_dung_ids)].filter((x) => x !== '');
  if (duy_nhat.length === 0) return;
  gui_ngam({
    nguoi_dung_ids: duy_nhat,
    tieu_de,
    noi_dung,
    du_lieu: { man: 'cong-viec', loai, viec_id },
  });
}

/** Ghep danh sach tai khoan nguoi nhan: nguoi nhan + nguoi giao + nguoi duyet. */
export async function nguoi_lien_quan(
  nhan_vien_id: string, giao_boi: string | null,
): Promise<string[]> {
  const nguoi_nhan = await tai_khoan_cua_nhan_vien(nhan_vien_id);
  const nguoi_duyet = await tai_khoan_nguoi_duyet(nhan_vien_id);
  return [...nguoi_nhan, ...nguoi_duyet, ...(giao_boi === null ? [] : [giao_boi])];
}

/**
 * Tao viec moi. Nguon do route suy truoc (quyen.ts) — ham nay chi ghi du lieu va bao.
 *
 * `khoa_chong_trung` danh rieng cho workflow/dinh ky: hai lan chay trung cung mot khoa
 * thi lan sau bo qua (tra null) — dung `on conflict do nothing`, khong phai kiem truoc.
 */
export async function tao_viec(
  dau_vao: DauVaoTao,
  nguon: string,
  nguoi_giao_id: string | null,
  khoa_chong_trung: string | null = null,
): Promise<DongViec | null> {
  const han_moc = han_moc_cua(dau_vao.han, dau_vao.han_gio);
  const moi = await trong_giao_dich(async (khach) => {
    const d = await khach.query<{ id: string }>(
      khoa_chong_trung === null
        ? `insert into cong_viec
             (nhan_vien_id, tieu_de, mo_ta, giao_boi, han, han_gio, han_moc, bat_dau,
              uu_tien, nguon, nhom_id)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`
        : `insert into cong_viec
             (nhan_vien_id, tieu_de, mo_ta, giao_boi, han, han_gio, han_moc, bat_dau,
              uu_tien, nguon, nhom_id, khoa_chong_trung)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           on conflict (khoa_chong_trung) do nothing returning id`,
      [dau_vao.nhan_vien_id, dau_vao.tieu_de, dau_vao.mo_ta, nguoi_giao_id,
        dau_vao.han, dau_vao.han_gio, han_moc,
        dau_vao.bat_dau === null ? null : moc_thoi_gian(dau_vao.bat_dau, '00:00'),
        dau_vao.uu_tien, nguon, dau_vao.nhom_id, khoa_chong_trung].slice(0, khoa_chong_trung === null ? 11 : 12),
    );
    const id = d.rows[0]?.id;
    if (id === undefined) return null;
    for (const [i, ten] of dau_vao.hanh_dong.entries()) {
      await khach.query(
        'insert into cong_viec_hanh_dong(cong_viec_id, ten, thu_tu) values ($1,$2,$3)',
        [id, ten, i],
      );
    }
    return id;
  });
  if (moi === null) return null;

  const dong = await truy_van_mot<DongViec>(
    `select ${COT_VIEC} ${TU_VIEC} where v.id = $1`, [moi],
  );
  if (dong === null) throw new Error('Khong doc duoc viec vua tao');

  const ids = await nguoi_lien_quan(dau_vao.nhan_vien_id, nguoi_giao_id);
  bao_viec(ids, 'Bạn được giao việc mới',
    `«${dau_vao.tieu_de}» — hạn ${ngay_viet(dau_vao.han)} lúc ${dau_vao.han_gio.slice(0, 5)}.`,
    'giao', moi);
  return dong;
}

/** Doc mot viec theo id — kem kiem tra pham vi o route. */
export async function viec_theo_id(id: string): Promise<DongViec | null> {
  return truy_van_mot<DongViec>(`select ${COT_VIEC} ${TU_VIEC} where v.id = $1`, [id]);
}

/** Bat dau lam viec: moi -> dang_lam. Chi nguoi nhan duoc. */
export async function bat_dau_viec(id: string, nd: NguoiXem): Promise<void> {
  const kq = await thuc_thi(
    `update cong_viec set trang_thai = 'dang_lam', cap_nhat_luc = now()
      where id = $1 and trang_thai = 'moi' and nhan_vien_id = $2`,
    [id, nd.nv],
  );
  if (kq === 0) {
    const v = await viec_theo_id(id);
    if (v === null) throw new LoiKhongTim('Không tìm thấy công việc.');
    if (v.nhan_vien_id !== nd.nv) throw new LoiKhongQuyen('Chỉ người nhận việc mới được bắt đầu.');
    throw new LoiXungDot('Công việc không còn ở trạng thái mới.');
  }
}

/** Nop ket qua: moi/dang_lam -> cho_duyet. Chi nguoi nhan duoc. */
export async function nop_ket_qua(id: string, ket_qua: string, nd: NguoiXem): Promise<void> {
  const kq = await thuc_thi(
    `update cong_viec set trang_thai = 'cho_duyet', ket_qua = $3, nop_luc = now(),
            cap_nhat_luc = now()
      where id = $1 and nhan_vien_id = $2 and trang_thai in ('moi','dang_lam')`,
    [id, nd.nv, ket_qua],
  );
  if (kq === 0) {
    const v = await viec_theo_id(id);
    if (v === null) throw new LoiKhongTim('Không tìm thấy công việc.');
    if (v.nhan_vien_id !== nd.nv) throw new LoiKhongQuyen('Chỉ người nhận việc mới được nộp kết quả.');
    throw new LoiXungDot('Công việc đã được nộp hoặc đã kết thúc.');
  }

  const v = await viec_theo_id(id);
  if (v === null) return;
  bao_viec(v.giao_boi === null ? [] : [v.giao_boi],
    'Có kết quả công việc chờ duyệt',
    `${v.ho_ten ?? 'Nhân viên'} nộp kết quả việc «${v.tieu_de}».`, 'nop', id);
}

/** Duyet ket qua: cho_duyet -> hoan_thanh / dang_lam (tu choi kem phan hoi). */
export async function duyet_viec(
  id: string, chap_nhan: boolean, phan_hoi: string | null, nd: NguoiXem,
): Promise<void> {
  const v = await viec_theo_id(id);
  if (v === null) throw new LoiKhongTim('Không tìm thấy công việc.');
  if (v.trang_thai !== 'cho_duyet') {
    throw new LoiXungDot('Công việc không ở trạng thái chờ duyệt.');
  }
  // nguoi_giao duyet viec minh giao; nhan su/admin duyet moi viec.
  if (v.giao_boi !== nd.sub && !(nd.vai_tro === 'admin' || nd.vai_tro === 'nhan_su'
      || nd.vai_tro === 'truong_phong_nhan_su')) {
    throw new LoiKhongQuyen('Chỉ người giao việc mới được xác nhận kết quả.');
  }

  await thuc_thi(
    chap_nhan
      ? `update cong_viec set trang_thai = 'hoan_thanh', hoan_thanh_luc = now(),
            duyet_boi = $2, phan_hoi = $3, cap_nhat_luc = now()
          where id = $1`
      : `update cong_viec set trang_thai = 'dang_lam', phan_hoi = $3, cap_nhat_luc = now()
          where id = $1`,
    [id, nd.sub, phan_hoi],
  );

  const ids = await tai_khoan_cua_nhan_vien(v.nhan_vien_id);
  bao_viec(ids,
    chap_nhan ? 'Công việc đã hoàn thành' : 'Kết quả công việc cần làm lại',
    chap_nhan
      ? `Việc «${v.tieu_de}» đã được xác nhận hoàn thành.`
      : `Việc «${v.tieu_de}» cần làm lại${phan_hoi === null || phan_hoi.trim() === '' ? '.' : `: ${phan_hoi}`}`,
    chap_nhan ? 'duyet' : 'tu_choi', id);
}

/** Huy viec: chi nguoi giao (hoac nhan su/admin), kem ly do. */
export async function huy_viec(id: string, ly_do: string, nd: NguoiXem): Promise<void> {
  const v = await viec_theo_id(id);
  if (v === null) throw new LoiKhongTim('Không tìm thấy công việc.');
  if (v.trang_thai === 'hoan_thanh' || v.trang_thai === 'khong_hoan_thanh') {
    throw new LoiXungDot('Công việc đã kết thúc, không thể hủy.');
  }
  if (v.giao_boi !== nd.sub && !(nd.vai_tro === 'admin' || nd.vai_tro === 'nhan_su'
      || nd.vai_tro === 'truong_phong_nhan_su')) {
    throw new LoiKhongQuyen('Chỉ người giao việc mới được hủy.');
  }
  await thuc_thi(
    `update cong_viec set trang_thai = 'huy', ly_do_huy = $2, cap_nhat_luc = now()
      where id = $1`,
    [id, ly_do],
  );
  const ids = await tai_khoan_cua_nhan_vien(v.nhan_vien_id);
  bao_viec(ids, 'Công việc đã bị hủy', `Việc «${v.tieu_de}» đã bị hủy: ${ly_do}.`, 'huy', id);
}

/** Tick / bo tick mot hanh dong con. Chi nguoi nhan duoc. */
export async function doi_hanh_dong(viec_id: string, hanh_dong_id: string, xong: boolean, nd: NguoiXem): Promise<void> {
  const v = await viec_theo_id(viec_id);
  if (v === null) throw new LoiKhongTim('Không tìm thấy công việc.');
  if (v.nhan_vien_id !== nd.nv) throw new LoiKhongQuyen('Chỉ người nhận việc mới cập nhật hành động.');

  const kq = await thuc_thi(
    `update cong_viec_hanh_dong set xong = $3, xong_luc = case when $3 then now() else null end
      where id = $2 and cong_viec_id = $1`,
    [viec_id, hanh_dong_id, xong],
  );
  if (kq === 0) throw new LoiKhongTim('Không tìm thấy hành động.');
}

/** Danh sach hanh dong con cua mot viec. */
export async function hanh_dong_cua_viec(viec_id: string): Promise<{
  id: string; ten: string; xong: boolean; xong_luc: string | null; thu_tu: number;
}[]> {
  return truy_van(
    `select id, ten, xong, xong_luc, thu_tu from cong_viec_hanh_dong
      where cong_viec_id = $1 order by thu_tu, tao_luc`,
    [viec_id],
  );
}

/** Thoi diem hien tai theo mui gio may, dinh dang 'YYYY-MM-DD HH:MM'. */
export function bay_gio_may(): string {
  const d = new Date();
  return `${ngay_dia_phuong(d)} ${gio_dia_phuong(d)}`;
}
