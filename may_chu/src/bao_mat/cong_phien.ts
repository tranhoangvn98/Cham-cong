// Moc mot token cua cong SSO sang mot tai khoan trong CSDL cua cham cong.
//
// `cong_sso.ts` tra loi "token nay that khong, va nguoi nay co vai tro gi". Tep nay tra loi
// cau ke tiep: "nguoi do la ban ghi nao ben ta". Hai cau hoi khac nhau nen tach hai tep —
// tep kia thuan mat ma va khong biet CSDL ton tai.
//
// BA LUAT CUNG, va ca ba deu de vi pham khi sua ve sau:
//
//   1. VAI TRO LAY TU TOKEN, khong lay tu cot `nguoi_dung.vai_tro`. Cot do chi de HIEN THI
//      tren trang Tai khoan. Cong la nguon su that ve phan quyen; doc cot trong CSDL nghia la
//      thu hoi quyen ben cong khong con tac dung, va do la dieu te nhat co the lam voi mot he
//      SSO. Cot van duoc cap nhat theo token de trang Tai khoan khong noi doi, nhung khong
//      mot quyet dinh phan quyen nao doc no.
//   2. KHONG cache qua `exp` cua token. Cai duoc cache o day la ANH XA DANH TINH (sub -> ban
//      ghi nao), khong phai quyet dinh phan quyen — quyet dinh phan quyen tinh lai tu token o
//      moi request. TTL ngan de mot lan vo hieu hoa tai khoan ben ta co hieu luc trong vong
//      mot phut.
//   3. Vai tro doi hoi ho so nhan vien ma tai khoan chua noi ho so thi TU CHOI voi thong bao
//      rieng, khong im lang cho qua voi `nv = null`. Mot nguoi vai tro `nhan_vien` ma khong co
//      ho so thi moi duong `/api/toi/*` deu tra ve rong — trong nhu he thong mat du lieu.
import { truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import type { NoiDungToken, VaiTro } from './jwt.ts';
import { vai_tro_tu_quyen, type NoiDungCong } from './cong_sso.ts';
import { bam_mat_khau } from './mat_khau.ts';
import { sinh_chuoi_ngau_nhien } from './microsoft.ts';

/** Vai tro KHONG doi hoi ho so nhan vien (xem rang buoc `nguoi_dung_phai_gan_nhan_vien`). */
const KHONG_CAN_HO_SO: readonly VaiTro[] = ['admin', 'nhan_su'];

/**
 * Ket qua moc token sang tai khoan.
 *
 * `chua_cap_quyen` va `chua_noi_ho_so` deu la "da dang nhap that, nhung chua vao duoc" — hai
 * trang thai nay PHAI ra 403 kem loi giai thich, KHONG ra 401. 401 lam giao dien day nguoi
 * dung vao vong lap dang nhap: ho dang nhap lai, thanh cong, va lai bi day ra.
 */
export type KetQuaPhienCong =
  | { loai: 'ok'; nguoi_dung: NoiDungToken }
  | { loai: 'chua_cap_quyen' }
  | { loai: 'chua_noi_ho_so'; email: string | null }
  | { loai: 'vo_hieu_hoa' };

interface DongToiThieu {
  id: string;
  nhan_vien_id: string | null;
  dang_hoat_dong: boolean;
  vai_tro: string;
  ho_ten: string | null;
  ten_dang_nhap: string;
}

const CAU_CHON = `select nd.id, nd.nhan_vien_id, nd.dang_hoat_dong, nd.vai_tro,
                         nd.ten_dang_nhap, nv.ho_ten
                    from nguoi_dung nd
                    left join nhan_vien nv on nv.id = nd.nhan_vien_id`;

// ---------------------------------------------------------------- bo nho dem danh tinh

const DEM_MS = 60 * 1000;
const DEM_TOI_DA = 5000;
const dem = new Map<string, { luc: number; dong: DongToiThieu }>();

/** Chi de kiem thu, va de duong go khi doi anh xa bang tay tren may that. */
export function xoa_dem_phien_cong(): void {
  dem.clear();
}

function lay_dem(sub: string): DongToiThieu | null {
  const o = dem.get(sub);
  if (o === undefined) return null;
  if (Date.now() - o.luc > DEM_MS) {
    dem.delete(sub);
    return null;
  }
  return o.dong;
}

function dat_dem(sub: string, dong: DongToiThieu): void {
  // Chan phinh bo nho neu ai do ban token voi hang van `sub` khac nhau. Xoa het cho don gian:
  // day la bo dem tang toc, mat no chi lam cham mot nhip.
  if (dem.size >= DEM_TOI_DA) dem.clear();
  dem.set(sub, { luc: Date.now(), dong });
}

// ---------------------------------------------------------------- tim / tao tai khoan

/**
 * Tim tai khoan cham cong ung voi mot tai khoan cong.
 *
 * Thu tu: `cong_sub` da ghi nho -> email da gan o tai khoan -> email cua ho so nhan vien ->
 * tao moi. Khop duoc bang email thi ghi `cong_sub` lai ngay, de lan sau khong phai doan.
 */
async function tim_hoac_tao(nd: NoiDungCong): Promise<DongToiThieu | null> {
  const theo_sub = await truy_van_mot<DongToiThieu>(
    `${CAU_CHON} where nd.cong_sub = $1`, [nd.sub]);
  if (theo_sub !== null) return theo_sub;

  const email = nd.email;
  if (email !== null) {
    const theo_email = await truy_van_mot<DongToiThieu>(
      `${CAU_CHON} where lower(nd.email_microsoft) = lower($1) or lower(nd.ten_dang_nhap) = lower($1)`,
      [email]);
    if (theo_email !== null) {
      await ghi_nho_sub(theo_email.id, nd.sub);
      // Tai khoan da co nhung chua noi ho so: thu noi theo email. Rat hay gap — nguoi ta dang
      // nhap lan dau truoc khi nhan su kip khai ho so.
      if (theo_email.nhan_vien_id === null) {
        const nv = await truy_van_mot<{ id: string; ho_ten: string }>(
          'select id, ho_ten from nhan_vien where lower(email) = lower($1) and dang_hoat_dong = true',
          [email]);
        if (nv !== null) {
          await thuc_thi('update nguoi_dung set nhan_vien_id = $2 where id = $1',
            [theo_email.id, nv.id]);
          return { ...theo_email, nhan_vien_id: nv.id, ho_ten: nv.ho_ten };
        }
      }
      return theo_email;
    }

    const theo_nhan_vien = await truy_van_mot<DongToiThieu>(
      `${CAU_CHON} where lower(nv.email) = lower($1) and nv.dang_hoat_dong = true`, [email]);
    if (theo_nhan_vien !== null) {
      await ghi_nho_sub(theo_nhan_vien.id, nd.sub);
      return theo_nhan_vien;
    }
  }

  return tao_moi(nd);
}

async function ghi_nho_sub(id: string, sub: string): Promise<void> {
  // `where cong_sub is null` de khong doi anh xa cua mot tai khoan da noi voi tai khoan cong
  // khac — do se la mot vu chiem tai khoan im lang.
  await thuc_thi('update nguoi_dung set cong_sub = $2 where id = $1 and cong_sub is null',
    [id, sub]);
}

/**
 * Tao ban ghi cho mot nguoi dang nhap qua cong lan dau.
 *
 * Vai tro luu la `cho_duyet`, KE CA khi token da co vai tro. Do la co y: cot nay chi de hien
 * thi, va rang buoc `nguoi_dung_phai_gan_nhan_vien` khong cho luu `nhan_vien` khi chua noi ho
 * so. `dong_bo_vai_tro` se nang no len ngay sau khi ho so duoc noi.
 *
 * Mat khau la bam cua mot chuoi ngau nhien: tai khoan nay khong dang nhap bang mat khau, va
 * khong ai — ke ca quan tri — biet chuoi do de dung duong mat khau.
 */
async function tao_moi(nd: NoiDungCong): Promise<DongToiThieu | null> {
  const nv = nd.email === null ? null : await truy_van_mot<{ id: string; ho_ten: string }>(
    'select id, ho_ten from nhan_vien where lower(email) = lower($1) and dang_hoat_dong = true',
    [nd.email]);

  const ten_dang_nhap = nd.email ?? `cong:${nd.sub}`;
  const moi = await truy_van_mot<{ id: string }>(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, nhan_vien_id,
                            email_microsoft, cong_sub, phai_doi_mat_khau)
     values ($1, $2, 'cho_duyet', $3, $4, $5, false)
     on conflict (ten_dang_nhap) do nothing
     returning id`,
    [ten_dang_nhap, await bam_mat_khau(sinh_chuoi_ngau_nhien(32)), nv?.id ?? null,
      nd.email, nd.sub],
  );
  // `do nothing` cham: hai request cua cung mot nguoi den cung luc. Doc lai ban ghi kia.
  if (moi === null) {
    return truy_van_mot<DongToiThieu>(`${CAU_CHON} where nd.cong_sub = $1`, [nd.sub]);
  }
  return {
    id: moi.id,
    nhan_vien_id: nv?.id ?? null,
    dang_hoat_dong: true,
    vai_tro: 'cho_duyet',
    ten_dang_nhap,
    ho_ten: nv?.ho_ten ?? nd.ten,
  };
}

/**
 * Giu cot `vai_tro` khop voi vai tro trong token — CHI de trang Tai khoan khong noi doi.
 *
 * Khong mot quyet dinh phan quyen nao doc cot nay o duong dang nhap qua cong. Neu ban dinh
 * doi dieu do: doc cot nghia la thu hoi quyen ben cong khong con tac dung.
 *
 * Nuot loi: mot lan ghi that bai khong duoc lam nguoi dung khong vao duoc he thong.
 */
async function dong_bo_vai_tro(dong: DongToiThieu, vai_tro: VaiTro): Promise<void> {
  if (dong.vai_tro === vai_tro) return;
  if (!KHONG_CAN_HO_SO.includes(vai_tro) && dong.nhan_vien_id === null) return; // rang buoc CSDL
  try {
    await thuc_thi('update nguoi_dung set vai_tro = $2 where id = $1', [dong.id, vai_tro]);
    dong.vai_tro = vai_tro;
  } catch (loi) {
    console.error(`[cong-sso] khong dong bo duoc vai tro cho ${dong.id}: ${(loi as Error).message}`);
  }
}

// ---------------------------------------------------------------- cua chinh

/**
 * Doi mot token cong DA XAC MINH thanh `NoiDungToken` — dung kieu ma moi route dang dung.
 *
 * Nho vay ca he thong khong phai biet nguoi dung den tu dau: `req.nguoi_dung.sub` van la id
 * trong CSDL cua ta, `nv` van la ho so nhan vien, `vai_tro` van la mot trong nam vai tro cu.
 * Chi mot cho biet su khac biet, la day.
 */
export async function phien_tu_token_cong(nd: NoiDungCong): Promise<KetQuaPhienCong> {
  // Vai tro tinh TRUOC khi cham CSDL: khong co quyen thi khong can tao tai khoan, va cung
  // khong can mot luot truy van. Mang quyen rong va thieu han khoa deu vao day.
  const vai_tro = vai_tro_tu_quyen(nd.quyen);
  if (vai_tro === null) return { loai: 'chua_cap_quyen' };

  let dong = lay_dem(nd.sub);
  if (dong === null) {
    dong = await tim_hoac_tao(nd);
    if (dong === null) return { loai: 'chua_cap_quyen' };
    dat_dem(nd.sub, dong);
  }

  if (!dong.dang_hoat_dong) return { loai: 'vo_hieu_hoa' };
  if (!KHONG_CAN_HO_SO.includes(vai_tro) && dong.nhan_vien_id === null) {
    return { loai: 'chua_noi_ho_so', email: nd.email };
  }

  // DUNG XONG ket qua TRUOC khi dong bo cot `vai_tro`. Thu tu nay khong phai tuy y, va no la
  // thu duy nhat lam bai kiem "vai tro lay tu token" co gia tri:
  //
  // `dong_bo_vai_tro` ghi cot trong CSDL cho khop token, nen SAU khi no chay thi doc tu token
  // va doc tu ban ghi ra CUNG MOT gia tri — mot ban sua thanh `vai_tro: dong.vai_tro` se chay
  // dung y het va khong bai kiem nao thay. Dung ket qua truoc thi hai duong do khac nhau that,
  // va bo kiem bat duoc. (Da thu dot bien: dao thu tu nay lai thi bai kiem xanh du ma doc CSDL.)
  const ket_qua: KetQuaPhienCong = {
    loai: 'ok',
    nguoi_dung: {
      sub: dong.id,
      vai_tro,                                   // TU TOKEN, khong tu CSDL
      nv: dong.nhan_vien_id,
      ten: dong.ho_ten ?? nd.ten ?? dong.ten_dang_nhap,
      loai: 'tc',
      jti: nd.jti ?? `cong:${nd.sub}`,
      iat: Math.floor(Date.now() / 1000),
      exp: nd.exp,
    },
  };

  await dong_bo_vai_tro(dong, vai_tro);
  return ket_qua;
}
