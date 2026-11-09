// Xac dinh NGUOI DUYET don lam them, va khi nao don phai chuyen len Giam doc.
//
// VI SAO CO MODULE NAY: don OT di qua hai cap, nhung nguoi duyet cap 1 la TRUONG BO PHAN cua
// chinh nguoi lap don. Khi nguoi lap don CUNG LA truong bo phan, khong ai duyet duoc cap 1:
// `chan_tu_duyet` chan chinh ho, con admin/tbks bi cam duyet cap 1 de giu su tach bach hai cap.
// Don nam im vinh vien. Quy tac moi: truong hop do chuyen sang buoc `cho_giam_doc`.
//
// Phan dau tep la ham THUAN (khong CSDL) de kiem bang du lieu mau; phan sau doc CSDL.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';

/** Trang thai MOI cua mot don OT ngay sau khi nhan vien nop. */
export type TrangThaiDauOt = 'cho_duyet' | 'cho_duyet_2' | 'cho_giam_doc';

/** Bac ho so duoc coi la Giam doc (danh muc 7 bac trong `nhan_su/vi_tri.ts`). */
export const VI_TRI_GIAM_DOC: readonly string[] = ['tong_giam_doc', 'giam_doc'];

/** Bac ho so nay co phai Giam doc khong. */
export function la_bac_giam_doc(vi_tri: string | null): boolean {
  return vi_tri !== null && VI_TRI_GIAM_DOC.includes(vi_tri);
}

/**
 * Trang thai dau tien cua mot don OT.
 *
 *   phong chua gan truong phong      -> `cho_duyet_2` (khong co ai duyet cap 1)
 *   nguoi lap CHINH LA truong phong  -> `cho_giam_doc` (khong the tu duyet cap 1)
 *   con lai                          -> `cho_duyet`
 *
 * Nguoi lap da la Giam doc thi `tao_don` ha ve `cho_duyet_2` (xem `la_nhan_vien_giam_doc`):
 * chinh Giam doc cung khong duoc tu duyet buoc Giam doc.
 */
export function trang_thai_dau_cua_ot(
  truong_phong_id: string | null, nhan_vien_id: string,
): TrangThaiDauOt {
  if (truong_phong_id === null) return 'cho_duyet_2';
  if (truong_phong_id === nhan_vien_id) return 'cho_giam_doc';
  return 'cho_duyet';
}

// ---------------------------------------------------------------- doc CSDL

/** Truong phong cua phong ban chinh cua mot nhan vien. Null khi phong chua gan. */
export async function truong_phong_cua(nhan_vien_id: string): Promise<string | null> {
  const d = await truy_van_mot<{ truong_phong_id: string | null }>(
    `select pb.truong_phong_id
       from nhan_vien nv
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where nv.id = $1`,
    [nhan_vien_id],
  );
  return d?.truong_phong_id ?? null;
}

/**
 * Nhan vien dang hoat dong giu vai tro Giam doc.
 *
 * Hai nguon, hop lai chu khong chon mot: bac ho so (`nhan_vien.vi_tri`) la o HR nhap khi tao
 * ho so, con vi tri to chuc (`vi_tri.cap_bac='cap_cao'`) la duong khai bao o so do to chuc.
 * Ho so cu thuong chi co mot trong hai. Khong tim thay ai thi tra mang rong — ben goi fallback
 * sang tai khoan admin de don khong bi treo.
 */
export async function nhan_vien_giam_doc(): Promise<string[]> {
  const dong = await truy_van<{ id: string }>(
    `select nv.id
       from nhan_vien nv
      where nv.dang_hoat_dong and nv.vi_tri = any($1::text[])
     union
     select distinct nvv.nhan_vien_id as id
       from nhan_vien_vi_tri nvv
       join vi_tri vt on vt.id = nvv.vi_tri_id and vt.dang_hoat_dong and vt.cap_bac = 'cap_cao'
       join nhan_vien nv on nv.id = nvv.nhan_vien_id and nv.dang_hoat_dong
      where nvv.ket_thuc is null or nvv.ket_thuc >= current_date`,
    [VI_TRI_GIAM_DOC],
  );
  return dong.map((d) => d.id);
}

/** Mot nhan vien co phai Giam doc khong. */
export async function la_nhan_vien_giam_doc(nhan_vien_id: string): Promise<boolean> {
  return (await nhan_vien_giam_doc()).includes(nhan_vien_id);
}

/** Tai khoan dang hoat dong cua Giam doc — de gui thong bao buoc duyet moi. */
async function tai_khoan_cua_giam_doc(nhan_vien_ids: readonly string[]): Promise<string[]> {
  if (nhan_vien_ids.length === 0) return [];
  const dong = await truy_van<{ id: string }>(
    `select id from nguoi_dung
      where dang_hoat_dong and nhan_vien_id = any($1::uuid[])`,
    [nhan_vien_ids],
  );
  return dong.map((d) => d.id);
}

/** Tai khoan admin dang hoat dong — duong lui khi chua khai duoc Giam doc nao. */
async function tai_khoan_admin(): Promise<string[]> {
  const dong = await truy_van<{ id: string }>(
    `select id from nguoi_dung where dang_hoat_dong and vai_tro = 'admin'`,
  );
  return dong.map((d) => d.id);
}

/** Tai khoan nhan buoc duyet Giam doc: cua Giam doc, khong co thi admin. */
export async function tai_khoan_giam_doc(): Promise<string[]> {
  const ds = await tai_khoan_cua_giam_doc(await nhan_vien_giam_doc());
  if (ds.length > 0) return ds;
  return tai_khoan_admin();
}

/**
 * Nguoi dang thao tac co duoc duyet buoc `cho_giam_doc` khong.
 *
 * Admin chi duoc duyet thay khi KHONG co tai khoan Giam doc nao dang hoat dong — neu khai du
 * ho so Giam doc ma van de admin duyet thay thi quy tac "Giam doc duyet" thanh hinh thuc.
 */
export async function la_giam_doc(
  nd: { vai_tro: string; nv: string | null },
): Promise<boolean> {
  const ds = await nhan_vien_giam_doc();
  if (nd.nv !== null && ds.includes(nd.nv)) return true;
  if (nd.vai_tro !== 'admin') return false;
  return (await tai_khoan_cua_giam_doc(ds)).length === 0;
}
