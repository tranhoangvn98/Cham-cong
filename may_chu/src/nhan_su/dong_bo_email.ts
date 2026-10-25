// Cap nhat danh sach EMAIL nhan su — chay hang ngay.
//
// VI SAO CAN LUONG RIENG: moi luong gui thu trong he thong (nhac bo sung ho so, thong bao,
// phieu luong, nhac ky luat...) deu bo qua nguoi khong co `nhan_vien.email`. Khong ai bao loi:
// ho chi don gian KHONG NHAN DUOC GI. Mot nguoi moi vao lam ma thieu email thi ca thang khong
// nhan duoc thong bao nao, va khong ai biet cho den khi co viec gap.
//
// Nguon bu email, theo thu tu CHAC CHAN:
//   1. `nguoi_dung.email_microsoft` — UPN that do Microsoft cap cho chinh nguoi do.
//   2. `nguoi_dung.ten_dang_nhap` khi no dung la mot dia chi email.
// KHONG doan tu ten, khong ghep theo ho ten: gui nham mot cai email ve ho so ca nhan cho nguoi
// khac con te hon la khong gui.
import { truy_van, thuc_thi } from '../csdl/ket_noi.ts';
import { gui_ngam } from '../su_kien/thong_bao_day.ts';
import { chuan_ngon_ngu, tra_chuoi, type NgonNgu } from '../chuoi/chi_muc.ts';

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Chuoi nay co dung dang mot dia chi email khong. */
export function la_email(x: string | null): boolean {
  return x !== null && RE_EMAIL.test(x.trim());
}

/**
 * Chon email de dien vao ho so. Ham THUAN, tra null khi khong co nguon nao dung.
 * Uu tien UPN Microsoft; ten dang nhap chi dung khi no that su la email.
 */
export function chon_email(
  email_microsoft: string | null,
  ten_dang_nhap: string | null,
): string | null {
  if (la_email(email_microsoft)) return (email_microsoft as string).trim();
  if (la_email(ten_dang_nhap)) return (ten_dang_nhap as string).trim();
  return null;
}

export interface KetQuaDongBoEmail {
  so_thieu: number;
  so_bu: number;
  con_thieu: { ma_nv: string; ho_ten: string }[];
}

/**
 * Mot vong cap nhat: dien email con trong tu nguon chac chan, roi bao HR danh sach van thieu.
 *
 * Cau update co dieu kien `email trong` — de khong ghi de dia chi ma nhan su vua sua tay trong
 * luc job dang chay. Chay lai nhieu lan trong ngay khong sinh tac dung phu.
 */
export async function cap_nhat_email_nhan_su(): Promise<KetQuaDongBoEmail> {
  const ds = await truy_van<{
    id: string; ma_nv: string; ho_ten: string;
    email_microsoft: string | null; ten_dang_nhap: string | null;
  }>(
    `select nv.id, nv.ma_nv, nv.ho_ten, nd.email_microsoft, nd.ten_dang_nhap
       from nhan_vien nv
       left join nguoi_dung nd on nd.nhan_vien_id = nv.id
      where nv.dang_hoat_dong = true
        and (nv.email is null or btrim(nv.email) = '')
      order by nv.ma_nv`,
  );

  const con_thieu: { ma_nv: string; ho_ten: string }[] = [];
  let so_bu = 0;
  for (const d of ds) {
    const email = chon_email(d.email_microsoft, d.ten_dang_nhap);
    if (email === null) {
      con_thieu.push({ ma_nv: d.ma_nv, ho_ten: d.ho_ten });
      continue;
    }
    await thuc_thi(
      `update nhan_vien set email = $2, cap_nhat_luc = now()
        where id = $1 and (email is null or btrim(email) = '')`,
      [d.id, email],
    );
    so_bu += 1;
  }

  if (con_thieu.length > 0) await bao_hr_thieu_email(con_thieu);

  return { so_thieu: ds.length, so_bu, con_thieu };
}

/**
 * Bao HR danh sach nhan su dang lam ma chua co email.
 *
 * Chi gui khi CO nguoi thieu: mot cai chuong "hom nay khong thieu ai" moi ngay la cach chac
 * chan nhat de nguoi ta bo qua chuong that su quan trong.
 */
async function bao_hr_thieu_email(ds: { ma_nv: string; ho_ten: string }[]): Promise<void> {
  const tai_khoan = await truy_van<{ id: string; ngon_ngu: string | null }>(
    `select id, ngon_ngu from nguoi_dung
      where dang_hoat_dong = true and vai_tro in ('admin', 'nhan_su')`,
  );
  if (tai_khoan.length === 0) return;

  const danh_sach = ds.map((d) => `${d.ma_nv} ${d.ho_ten}`).slice(0, 20).join(', ')
    + (ds.length > 20 ? ` (+${String(ds.length - 20)})` : '');

  // Chia theo ngon ngu nguoi nhan — cung quy tac voi moi email he thong khac.
  const theo_ngon_ngu: Record<NgonNgu, string[]> = { vi: [], zh: [] };
  for (const t of tai_khoan) theo_ngon_ngu[chuan_ngon_ngu(t.ngon_ngu)].push(t.id);

  for (const nn of ['vi', 'zh'] as const) {
    const ids = theo_ngon_ngu[nn];
    if (ids.length === 0) continue;
    gui_ngam({
      nguoi_dung_ids: ids,
      tieu_de: tra_chuoi(nn, 'ns_thieu_email_tieu_de'),
      noi_dung: tra_chuoi(nn, 'ns_thieu_email_noi_dung', { so: ds.length, danh_sach }),
      du_lieu: { man: 'nhan-vien' },
    });
  }
}
