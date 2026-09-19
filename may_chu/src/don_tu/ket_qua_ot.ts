// Nghiep vu KET QUA OT: sau khi don lam them qua du hai cap duyet, nhan vien nop ket qua
// bang anh; tbks/admin duyet ket qua; luc do OT moi duoc tinh vao bang cong.
//
// Bang `ket_qua_ot` quan he 1-1 voi don (unique don_tu_id) vi don lam them chi co MOT ngay.
// Tep anh nam trong kho ho so nhan su (nhom `ot_ket_qua`, thuoc_id = ket_qua_ot.id) — tang
// route lo viec tep, module nay chi lo vong doi cua ban ghi.
//
// Module khong import Fastify, kiem duoc bang CSDL that nhu `nghiep_vu.ts`.
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiKhongTim } from '../tien_ich/kiem_tra.ts';

export interface DongKetQuaOt {
  id: string;
  don_tu_id: string;
  trang_thai: string;
  ghi_chu: string | null;
  ghi_chu_duyet: string | null;
  tao_luc: string;
  quyet_luc: string | null;
  nguoi_duyet: string | null;
  // Thong tin don kem theo, de nguoi duyet khong phai goi them mot route.
  nhan_vien_id: string;
  tu_ngay: string;
  gio_bat_dau: string | null;
  gio_ket_thuc: string | null;
  ly_do: string | null;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
}

const CHON = `
  k.id, k.don_tu_id, k.trang_thai, k.ghi_chu, k.ghi_chu_duyet,
  to_char(k.tao_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as tao_luc,
  to_char(k.quyet_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as quyet_luc,
  nd.ten_dang_nhap as nguoi_duyet,
  d.nhan_vien_id, to_char(d.tu_ngay, 'YYYY-MM-DD') as tu_ngay,
  d.gio_bat_dau::text as gio_bat_dau, d.gio_ket_thuc::text as gio_ket_thuc,
  d.ly_do, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
`;

const TU_BANG = `
  from ket_qua_ot k
  join don_tu d on d.id = k.don_tu_id
  join nhan_vien nv on nv.id = d.nhan_vien_id
  left join phong_ban pb on pb.id = nv.phong_ban_id
  left join nguoi_dung nd on nd.id = k.nguoi_duyet_id
`;

/**
 * Nhan vien nop (hoac nop lai) ket qua OT cua don cua MINH.
 *
 * Don phai `da_duyet` (da qua du hai cap). Nop lai sau khi bi tu choi thi ban ghi quay ve
 * `cho_duyet` — anh cu van nam trong ho so nhu bang chung qua trinh, anh moi duoc them vao.
 */
export async function nop_ket_qua(
  don_tu_id: string, nhan_vien_id: string, ghi_chu: string | null,
): Promise<{ id: string }> {
  const d = await truy_van_mot<{ nhan_vien_id: string; trang_thai: string }>(
    `select nhan_vien_id, trang_thai
       from don_tu where id = $1 and loai = 'lam_them'`,
    [don_tu_id],
  );
  if (d === null || d.nhan_vien_id !== nhan_vien_id) {
    throw new LoiKhongTim('Không tìm thấy đơn làm thêm giờ của bạn.');
  }
  if (d.trang_thai !== 'da_duyet') {
    throw new LoiDauVao('Đơn chưa được duyệt xong, chưa thể nộp kết quả OT.');
  }

  const kq = await truy_van_mot<{ id: string; trang_thai: string }>(
    `insert into ket_qua_ot(don_tu_id, ghi_chu)
     values ($1, $2)
     on conflict (don_tu_id) do update
       set trang_thai = 'cho_duyet', ghi_chu = excluded.ghi_chu,
           ghi_chu_duyet = null, quyet_luc = null, nguoi_duyet_id = null
     returning id, trang_thai`,
    [don_tu_id, ghi_chu],
  );
  return { id: String(kq?.id ?? '') };
}

/**
 * tbks/admin quyet ket qua. Tra ve nhan vien + ngay de tinh lai bang cong khi DA DUYET.
 */
export async function quyet_ket_qua(
  id: string, quyet: 'da_duyet' | 'tu_choi', nguoi_duyet_id: string, ghi_chu: string | null,
): Promise<{ nhan_vien_id: string; tu_ngay: string } | null> {
  const d = await truy_van_mot<{ trang_thai: string; nhan_vien_id: string; tu_ngay: string }>(
    `select k.trang_thai, d.nhan_vien_id, to_char(d.tu_ngay, 'YYYY-MM-DD') as tu_ngay
       from ket_qua_ot k
       join don_tu d on d.id = k.don_tu_id
      where k.id = $1`,
    [id],
  );
  if (d === null) throw new LoiKhongTim('Không tìm thấy kết quả OT.');
  if (d.trang_thai !== 'cho_duyet') {
    throw new LoiDauVao(`Kết quả đã ở trạng thái "${d.trang_thai}", không thể quyết lại.`);
  }

  await thuc_thi(
    `update ket_qua_ot
        set trang_thai = $2, nguoi_duyet_id = $3, ghi_chu_duyet = $4, quyet_luc = now()
      where id = $1 and trang_thai = 'cho_duyet'`,
    [id, quyet, nguoi_duyet_id, ghi_chu],
  );

  return quyet === 'da_duyet' ? { nhan_vien_id: d.nhan_vien_id, tu_ngay: d.tu_ngay } : null;
}

/** Ket qua cua mot don — cho nhan vien xem tren don cua minh. */
export async function ket_qua_cua_don(don_tu_id: string): Promise<DongKetQuaOt | null> {
  return truy_van_mot<DongKetQuaOt>(`select ${CHON} ${TU_BANG} where k.don_tu_id = $1`,
    [don_tu_id]);
}

/** Danh sach ket qua cho tbks/admin duyet. Khong pham vi phong. */
export async function ket_qua_cho_tbks(trang_thai: string): Promise<DongKetQuaOt[]> {
  return truy_van<DongKetQuaOt>(
    `select ${CHON} ${TU_BANG} where k.trang_thai = $1
      order by case when k.trang_thai = 'cho_duyet' then 0 else 1 end, k.tao_luc desc
      limit 300`,
    [trang_thai],
  );
}

/** So ket qua dang cho duyet — cho o dem tren giao dien cua tbks/admin. */
export async function dem_ket_qua_cho_duyet(): Promise<number> {
  const d = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from ket_qua_ot where trang_thai = 'cho_duyet'`);
  return d?.so ?? 0;
}
