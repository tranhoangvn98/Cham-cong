// Anh xa nguoi dung ERP -> nhan vien, va noi voi Microsoft 365.
//
// KHOA NOI BA HE THONG LA EMAIL. Dang nhap Microsoft o day khop nguoi theo
// `lower(nhan_vien.email)`, nen chi can email dung la M365 tu nhan ra nguoi — khong phai
// khai bao gi them.
//
// BON QUY TAC AN TOAN, deu vi day la du lieu NGUOI THAT:
//
//   1. Ban ghi KHONG CO EMAIL thi bo qua. Khong noi duoc voi M365, va gan nhu chac chan
//      la tai khoan he thong chu khong phai nguoi.
//   2. KHONG BAO GIO xoa hay tu tat nhan vien vi ho vang mat trong ket qua. Tai lieu ERP
//      muc 4.3 noi ro API khong bao ban ghi bi xoa; suy "khong thay = da nghi viec" la
//      cach chac chan nhat de mot ngay ERP loi giua chung thi ca cong ty bi tat.
//   3. KHONG ghi de PIN may, ca lam, phong ban, ngay vao. Do la du lieu do nhan su o day
//      quan ly; ERP khong biet va khong duoc phep dam vao.
//   4. Co che do CHAY THU: xem truoc se tao/sua ai truoc khi ghi that.
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { lay_nguoi_dung, type NguoiDungErp } from './khach.ts';
import { sap_xep_kho } from '../ho_so/sap_xep_tep.ts';
import { la_so_dien_thoai } from '../tien_ich/kiem_tra.ts';
import { bo_chay_tu, gan_ma_am_tham } from '../dinh_danh/nghiep_vu.ts';

export type HanhDong = 'tao_moi' | 'cap_nhat' | 'khong_doi' | 'bo_qua';

export interface DongKetQua {
  erp_user_id: number | null;
  email: string | null;
  ho_ten: string | null;
  hanh_dong: HanhDong;
  ly_do?: string;
  /** Nhung truong thuc su doi — de nguoi doc biet dong bo dong vao cai gi. */
  thay_doi?: string[];
  /** Du lieu ERP co van de nhung khong chan viec dong bo. Vi du ten nguoi trong o dien thoai. */
  canh_bao?: string;
}

export interface KetQuaDongBo {
  so_doc: number;
  so_tao_moi: number;
  so_cap_nhat: number;
  so_bo_qua: number;
  chi_tiet: DongKetQua[];
}

/** Chuan hoa email: bo khoang trang, ha chu thuong. Chuoi rong -> null. */
export function chuan_email(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return s === '' ? null : s;
}

/** Chuan hoa chuoi rong ve null — tai lieu ERP muc 4.4. */
export function chuan_chuoi(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s === '' ? null : s;
}

/**
 * So dien thoai tu ERP, hoac null neu gia tri do KHONG PHAI so dien thoai.
 *
 * ERP cu tra ho ten trong `phoneNumber` voi mot so nguoi (thay o `ERP4`: "Trần Hoàng Anh Vinh").
 * Nhan lay tat la de ten nguoi chay vao cot `so_dien_thoai` roi hien tren ho so — va vi lan dong
 * bo sau lai so "gia tri ERP" voi "gia tri trong CSDL" nen no con bao `cap_nhat` mai mai.
 *
 * Tra `null` thi cau `update` da co `coalesce($4, so_dien_thoai)`, nghia la GIU nguyen so dang
 * co chu khong xoa mat.
 */
export function chuan_dien_thoai(v: unknown): string | null {
  const s = chuan_chuoi(v);
  if (s === null) return null;
  return la_so_dien_thoai(s) ? s : null;
}

/**
 * Sinh ma nhan vien khi tao moi.
 *
 * ERP khong co truong ma nhan vien — chi co userId va username. Dung `ERP<userId>` de ma
 * on dinh qua cac lan dong bo va truy nguoc duoc ve ban ghi goc.
 */
export function ma_nv_tu_erp(u: NguoiDungErp): string {
  return `ERP${u.userId ?? 0}`;
}

/** Ban ghi ERP nay co dung de tao nhan vien khong? Tra ly do khi khong. */
export function ly_do_bo_qua(u: NguoiDungErp): string | null {
  if (typeof u.userId !== 'number' || u.userId <= 0) return 'Thiếu userId';
  if (chuan_email(u.email) === null) {
    return 'Không có email — không nối được với Microsoft 365';
  }
  if (chuan_chuoi(u.name) === null) return 'Thiếu họ tên';
  return null;
}

interface NhanVienHienCo {
  id: string;
  ma_nv: string;
  ho_ten: string;
  email: string | null;
  so_dien_thoai: string | null;
  erp_user_id: number | null;
  dang_hoat_dong: boolean;
}

/**
 * So sanh mot ban ghi ERP voi nhan vien dang co, tra ve danh sach truong CAN doi.
 *
 * Chi so sanh nhung truong ERP LA NGUON: ho ten, email, dien thoai. Khong dung toi PIN
 * may, ca lam, phong ban — nhan su o day quan ly nhung thu do.
 */
export function truong_can_doi(u: NguoiDungErp, nv: NhanVienHienCo): string[] {
  const doi: string[] = [];
  const ten = chuan_chuoi(u.name);
  const email = chuan_email(u.email);
  // PHAI dung chinh bo loc ma cau ghi dung. Neu o day nhan mot gia tri ma cau ghi lai bo, thi
  // moi lan dong bo se bao `cap_nhat` cho nguoi do, sua khong duoc gi, va bao mai mai.
  const dt = chuan_dien_thoai(u.phoneNumber);

  if (ten !== null && ten !== nv.ho_ten) doi.push('ho_ten');
  if (email !== null && email !== chuan_email(nv.email)) doi.push('email');
  if (dt !== null && dt !== nv.so_dien_thoai) doi.push('so_dien_thoai');
  if (u.userId !== undefined && u.userId !== nv.erp_user_id) doi.push('erp_user_id');
  return doi;
}

/**
 * Dong bo nguoi dung ERP sang bang nhan_vien.
 *
 * `che_do = 'thu'` doc ERP va tinh ra se lam gi, NHUNG KHONG GHI GI. Dung de xem truoc
 * truoc khi cho chay that — dong bo nay tao va sua nguoi hang loat.
 */
export async function dong_bo_nhan_vien(
  che_do: 'thu' | 'that',
  chi_dang_lam = true,
): Promise<KetQuaDongBo> {
  const ds = await lay_nguoi_dung(chi_dang_lam);

  const kq: KetQuaDongBo = {
    so_doc: ds.length, so_tao_moi: 0, so_cap_nhat: 0, so_bo_qua: 0, chi_tiet: [],
  };

  // Doc san toan bo nhan vien mot lan: vai tram nguoi thi mot truy van nhanh hon vai tram.
  const hien_co = await truy_van<NhanVienHienCo>(
    `select id, ma_nv, ho_ten, email, so_dien_thoai, erp_user_id, dang_hoat_dong
       from nhan_vien`,
  );
  const theo_erp = new Map<number, NhanVienHienCo>();
  const theo_email = new Map<string, NhanVienHienCo>();
  for (const nv of hien_co) {
    if (nv.erp_user_id !== null) theo_erp.set(nv.erp_user_id, nv);
    const e = chuan_email(nv.email);
    if (e !== null) theo_email.set(e, nv);
  }

  // Chan hai ban ghi ERP cung email lam doi tuong thu hai ghi de len ban ghi thu nhat.
  const email_da_gap = new Set<string>();

  const viec: { u: NguoiDungErp; nv: NhanVienHienCo | null; doi: string[] }[] = [];

  for (const u of ds) {
    const bo = ly_do_bo_qua(u);
    if (bo !== null) {
      kq.so_bo_qua++;
      kq.chi_tiet.push({
        erp_user_id: u.userId ?? null, email: chuan_email(u.email),
        ho_ten: chuan_chuoi(u.name), hanh_dong: 'bo_qua', ly_do: bo,
      });
      continue;
    }

    const email = chuan_email(u.email)!;
    if (email_da_gap.has(email)) {
      kq.so_bo_qua++;
      kq.chi_tiet.push({
        erp_user_id: u.userId ?? null, email, ho_ten: chuan_chuoi(u.name),
        hanh_dong: 'bo_qua', ly_do: 'Trùng email với một bản ghi ERP khác trong cùng lượt',
      });
      continue;
    }
    email_da_gap.add(email);

    // Uu tien khop theo erp_user_id (chac chan), roi moi den email.
    const theo_ma = theo_erp.get(u.userId!);
    const theo_mail = theo_email.get(email);
    const nv = theo_ma ?? theo_mail ?? null;

    // Khop duoc theo email NHUNG nguoi do da mang mot erp_user_id KHAC: day la xung dot
    // that, khong phai chuyen may tu quyet duoc. Ghi de se lam ban ghi cu doi chu, va
    // nguoi cu mat duong truy nguoc ve ERP. Bo qua va bao de nguoi that xu ly.
    if (theo_ma === undefined && theo_mail !== undefined
        && theo_mail.erp_user_id !== null && theo_mail.erp_user_id !== u.userId) {
      kq.so_bo_qua++;
      kq.chi_tiet.push({
        erp_user_id: u.userId!, email, ho_ten: chuan_chuoi(u.name), hanh_dong: 'bo_qua',
        ly_do: `Email này đã thuộc về nhân viên đang nối với ERP #${theo_mail.erp_user_id}`,
      });
      continue;
    }

    // Gia tri ERP cho la "so dien thoai" nhung khong phai so: bao ra de nhan su sua BEN ERP.
    // Bao o CA BA nhanh duoi day, ke ca `khong_doi` — nguoi bi anh huong thuong nam o do, vi
    // moi thu khac da khop tu lan dong bo truoc.
    const dt_tho = chuan_chuoi(u.phoneNumber);
    const canh_bao = dt_tho !== null && chuan_dien_thoai(u.phoneNumber) === null
      ? `ERP trả "${dt_tho}" trong trường số điện thoại — không phải số, đã bỏ qua ô này`
      : undefined;

    if (nv === null) {
      kq.so_tao_moi++;
      kq.chi_tiet.push({
        erp_user_id: u.userId!, email, ho_ten: chuan_chuoi(u.name), hanh_dong: 'tao_moi',
        canh_bao,
      });
      viec.push({ u, nv: null, doi: [] });
      continue;
    }

    const doi = truong_can_doi(u, nv);
    if (doi.length === 0) {
      kq.chi_tiet.push({
        erp_user_id: u.userId!, email, ho_ten: nv.ho_ten, hanh_dong: 'khong_doi', canh_bao,
      });
      continue;
    }
    kq.so_cap_nhat++;
    kq.chi_tiet.push({
      erp_user_id: u.userId!, email, ho_ten: chuan_chuoi(u.name),
      hanh_dong: 'cap_nhat', thay_doi: doi, canh_bao,
    });
    viec.push({ u, nv, doi });
  }

  if (che_do === 'thu') return kq;

  // Canh bao sinh ra trong luc GHI (vi du ma ERP dang thuoc nguoi khac) — gom lai theo
  // `erp_user_id` roi nhap vao bao cao sau, vi bao cao duoc dung o pha TINH truoc do.
  const canh_bao_khi_ghi = new Map<number, string[]>();

  await trong_giao_dich(async (khach) => {
    const bo = bo_chay_tu(khach);

    for (const v of viec) {
      const ten = chuan_chuoi(v.u.name)!;
      const email = chuan_email(v.u.email)!;
      const dt = chuan_dien_thoai(v.u.phoneNumber);
      let nhan_vien_id = v.nv?.id ?? null;

      if (v.nv === null) {
        const ma_nv = ma_nv_tu_erp(v.u);
        // `returning id` de con gan ma dinh danh. `on conflict do nothing` thi khong tra dong
        // nao, nen phai doc lai theo `ma_nv` — truong hop do xay ra khi mot ho so da mang dung
        // ma `ERP<userId>` nhung chua noi voi ERP.
        const moi = (await khach.query(
          `insert into nhan_vien
             (ma_nv, ho_ten, email, so_dien_thoai, erp_user_id, erp_username, erp_dong_bo_luc)
           values ($1,$2,$3,$4,$5,$6, now())
           on conflict (ma_nv) do nothing
           returning id`,
          [ma_nv, ten, email, dt, v.u.userId, chuan_chuoi(v.u.username)],
        )).rows[0];
        if (moi !== undefined) {
          nhan_vien_id = String(moi['id']);
        } else {
          const co = (await khach.query(
            'select id from nhan_vien where ma_nv = $1', [ma_nv])).rows[0];
          nhan_vien_id = co === undefined ? null : String(co['id']);
        }
      } else {
        // `coalesce` o so_dien_thoai: ERP de trong thi giu so dang co, khong xoa mat.
        await khach.query(
          `update nhan_vien set
             ho_ten = $2, email = $3,
             so_dien_thoai = coalesce($4, so_dien_thoai),
             erp_user_id = $5, erp_username = coalesce($6, erp_username),
             erp_dong_bo_luc = now(), cap_nhat_luc = now()
           where id = $1`,
          [v.nv.id, ten, email, dt, v.u.userId, chuan_chuoi(v.u.username)],
        );
      }

      if (nhan_vien_id === null) continue;

      // Ghi ma dinh danh. `am_tham` vi ca lo nam trong MOT giao dich: nem loi vi mot ma trung
      // cua mot nguoi la rollback ca luot dong bo cua ca cong ty.
      //
      // Va no KHONG tu lay ma cua nguoi khac — `gan_ma` tu choi truong hop do. Dung la cho
      // sinh ra cap trung `ERP147`/`HR-01`: mot lan chay tu dong am tham doi chu mot ma.
      const cb: string[] = [];
      for (const [he_thong, gia_tri] of [
        ['erp_cu', String(v.u.userId)],
        ['erp_cu_tai_khoan', chuan_chuoi(v.u.username) ?? ''],
        ['microsoft_email', email],
      ] as const) {
        if (gia_tri === '') continue;
        const loi = await gan_ma_am_tham(nhan_vien_id, he_thong, gia_tri, 'dong_bo_erp', bo);
        if (loi !== null) cb.push(loi);
      }
      if (cb.length > 0 && v.u.userId !== undefined) canh_bao_khi_ghi.set(v.u.userId, cb);
    }
  });

  // Nhap canh bao khi ghi vao bao cao, giu nguyen canh bao da co cua pha tinh.
  for (const d of kq.chi_tiet) {
    if (d.erp_user_id === null) continue;
    const cb = canh_bao_khi_ghi.get(d.erp_user_id);
    if (cb === undefined) continue;
    d.canh_bao = [d.canh_bao, ...cb].filter((x) => x !== undefined).join(' • ');
  }

  // Dong bo ERP GHI LAI HO TEN cho hang chuc nguoi mot lan, va ten thu muc kho tep mang ho
  // ten. Quet MOT LAN sau ca lo thay vi goi tung nguoi: goi tung nguoi la mot truy van
  // toan bang cho moi nhan vien.
  //
  // Khong nem loi neu quet hong — dong bo nguoi dung da xong va da dung; ten thu muc lech
  // thi lan quet dinh ky hang ngay se sua, va trong luc lech moi tep van doc duoc.
  try {
    const sx = await sap_xep_kho('that');
    if (sx.so_doi_cho > 0) {
      console.log(`[erp] da doi cho ${String(sx.so_doi_cho)} tep theo ho ten moi`);
    }
  } catch (loi) {
    console.warn(`[erp] khong sap xep duoc kho tep sau dong bo: ${(loi as Error).message}`);
  }

  return kq;
}
