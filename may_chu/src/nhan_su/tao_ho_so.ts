// Tao ho so nhan su moi — khối nghiep vu DUNG CHUNG cho hai cong:
//
//   1. Route thu cong POST /api/nhan-vien (tuyen/danh_muc.ts).
//   2. Cong duyet de nghi them nhan su (nhan_su/de_nghi.ts, chay_khoi_tao_nhan_su).
//
// Tat ca nam trong MOT transaction: insert nhan_vien + gan ma PIN + ghi cac su kien outbox
// (cong / ERP1 / MS365) + tao tai khoan he thong (nguoi_dung). Neu may chet giua chung thi
// toan bo cuon lai — khong co trang thai "co nguoi, khong co tai khoan".
//
// Cong duyet con can them cac buoc rieng (cap nhat de nghi, sinh viec nhap viec, xep lenh
// may cua) — chung chay TRONG CUNG transaction qua tham so `them`.
import type { PoolClient } from 'pg';
import { trong_giao_dich, truy_van_mot } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { bam_mat_khau, LoiMatKhau } from '../bao_mat/mat_khau.ts';
import { LoiDauVao, LoiXungDot } from '../tien_ich/kiem_tra.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { gan_bo_ma_nhan_su, gan_ma, bo_chay_tu } from '../dinh_danh/nghiep_vu.ts';
import { goi_y_pin } from '../dinh_danh/cap_pin.ts';
import { la_truong_phong, ms365_tao_bat, sinh_mat_khau_khoi_tao } from './ms365.ts';
import { sinh_ten_dang_nhap, vai_tro_theo_vi_tri } from './vi_tri.ts';

/** Dau vao tao ho so — da duoc kiem tra dang chuoi/uuid o ben goi. */
export interface DauVaoTaoHoSo {
  ma_nv: string;
  ho_ten: string;
  pin_may: string | null;
  ma_erp: string | null;
  phong_ban_id: string | null;
  ca_lam_id: string | null;
  ngay_vao: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  duoc_cham_cong_dien_thoai: boolean;
  noi_lam_viec_id: string | null;
  che_do_luong: string;
  khoi_id: string | null;
  chuc_danh: string | null;
  vi_tri: string | null;
  tu_cap_pin: boolean;
  thiet_bi_serial: string | null;
  tao_tk_ms365: boolean;
  tao_tk_he_thong: boolean;
  /** Ghi de SKU giay phep Microsoft (cong duyet cho Admin sua truoc khi chay). */
  sku_id_tuy_chon?: string | null;
}

export interface TaiKhoanMs365Tao {
  upn: string;
  mat_khau: string;
  sku_id: string;
}

export interface TaiKhoanHeThongTao {
  ten_dang_nhap: string;
  mat_khau: string;
  vai_tro: string;
}

export interface KetQuaTaoHoSo {
  id: string;
  pin_cap: string | null;
  tai_khoan_ms365: TaiKhoanMs365Tao | null;
  tai_khoan_he_thong: TaiKhoanHeThongTao | null;
  canh_bao: string[];
}

/**
 * Viec chay them TRONG CUNG transaction, sau khi nhan_vien da duoc insert. Tra ve cac
 * canh bao de gop vao phan hoi. Nem loi thi toan bo transaction cuon lai.
 */
export type ThemCungGiaoDich = (
  khach: PoolClient,
  nhan_vien_id: string,
  pin_cap: string | null,
) => Promise<string[]>;

/**
 * Tao ho so nhan su moi: insert + PIN + outbox + tai khoan he thong.
 *
 * Vong lap 5 lan de chong tranh chap PIN (hai nguoi cung "tu cap" mot luc) — unique index
 * chan nguoi thu hai, ta thu lai so ke tiep. `them` chay o moi lan thu va cuon theo neu
 * lan thu do bi chan boi tranh chap PIN.
 */
export async function tao_ho_so_nhan_su(
  v: DauVaoTaoHoSo,
  them: ThemCungGiaoDich | null = null,
): Promise<KetQuaTaoHoSo> {
  if (v.tu_cap_pin && (v.thiet_bi_serial === null || v.thiet_bi_serial === '')) {
    throw new LoiDauVao('Tự cấp PIN cần chọn máy chấm công.');
  }

  // Tao tai khoan Microsoft: email chinh la UPN, bat buoc va khong duoc trung nguoi khac
  // dang lam viec (trung thi Graph tra 409 va mot nguoi se bi cap nham giay phep).
  let upn = '';
  let mat_khau = '';
  let sku_id = '';
  if (v.tao_tk_ms365) {
    const email = (v.email ?? '').trim();
    if (!email.includes('@')) {
      throw new LoiDauVao('Tạo tài khoản Microsoft cần email công ty hợp lệ (email chính là tên đăng nhập).');
    }
    upn = email.toLowerCase();
    const trung = await truy_van_mot<{ ho_ten: string }>(
      'select ho_ten from nhan_vien where lower(email) = lower($1) limit 1', [upn]);
    if (trung !== null) {
      throw new LoiXungDot(
        `Email ${upn} đã thuộc ${trung.ho_ten} — không thể tạo tài khoản Microsoft trùng.`);
    }
    mat_khau = sinh_mat_khau_khoi_tao();
    // Giay phep theo chuc danh: truong phong dung Standard, con lai dung Basic.
    // Cong duyet co the ghi de bang `sku_id_tuy_chon` (REQ-G-01).
    sku_id = v.sku_id_tuy_chon ?? (la_truong_phong(v.chuc_danh)
      ? cau_hinh.ms365_tao.sku_standard
      : cau_hinh.ms365_tao.sku_basic);
  }

  // Tai khoan he thong (nguoi_dung): ten dang nhap goi y tu ma nhan vien, mat khau sinh
  // san, vai tro suy tu vi tri. Tinh het o day de trong giao dich chi con cau INSERT.
  let ten_dang_nhap = '';
  let mat_khau_ht = '';
  let hash_ht = '';
  const vai_tro_ht = v.tao_tk_he_thong ? vai_tro_theo_vi_tri(v.vi_tri) : '';
  if (v.tao_tk_he_thong) {
    ten_dang_nhap = sinh_ten_dang_nhap(v.ma_nv);
    mat_khau_ht = sinh_mat_khau_khoi_tao(12);
    try {
      hash_ht = await bam_mat_khau(mat_khau_ht);
    } catch (loi) {
      if (loi instanceof LoiMatKhau) throw new LoiDauVao(loi.message);
      throw loi;
    }
  }

  const ts = [
    v.ma_nv, v.ho_ten, v.pin_may, v.ma_erp, v.phong_ban_id, v.ca_lam_id, v.ngay_vao,
    v.so_dien_thoai, v.email, v.duoc_cham_cong_dien_thoai, v.noi_lam_viec_id,
    v.che_do_luong, v.khoi_id, v.chuc_danh, v.vi_tri,
  ];

  let dong: { id: string } | null = null;
  let pin_cap: string | null = null;
  let canh_bao_them: string[] = [];
  for (let lan = 0; lan < 5 && dong === null; lan++) {
    const goi_y = v.tu_cap_pin ? await goi_y_pin(v.thiet_bi_serial as string) : null;
    const ts_gui = goi_y === null ? ts : ts.map((x, i) => (i === 2 ? goi_y.pin : x));
    try {
      dong = await ghi_bat_trung(
        () => trong_giao_dich(async (khach) => {
          const kq = await khach.query<{ id: string }>(
            `insert into nhan_vien
               (ma_nv, ho_ten, pin_may, ma_erp, phong_ban_id, ca_lam_id, ngay_vao,
                so_dien_thoai, email, duoc_cham_cong_dien_thoai, noi_lam_viec_id, che_do_luong,
                khoi_id, chuc_danh, vi_tri)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
            ts_gui,
          );
          const moi = kq.rows[0] ?? null;
          if (moi === null) return moi;
          if (goi_y !== null) {
            await gan_ma(moi.id, 'may_cham_cong', goi_y.pin, {
              nguon: 'nguoi_khai',
              ghi_chu: `Hệ thống cấp khi tạo hồ sơ cho máy ${goi_y.thiet_bi_ten}`,
            }, bo_chay_tu(khach));
          }
          // Cong phan quyen: tu tao ban ghi danh tinh (nhan_su.da_tao da co tu truoc).
          await ghi_su_kien('nhan_su.da_tao', { ma_nv: v.ma_nv, ho_ten: v.ho_ten }, khach);
          // ERP1: thiet lap tai khoan cho nhan su moi. Kem chuc danh + ten phong ban de
          // ERP1 tu phan quyen theo vi tri (hop dong 2.2b, WEBHOOK-ERP1.md).
          let phong_ban_ten: string | null = null;
          if (v.phong_ban_id !== null) {
            const pb = await khach.query<{ ten: string }>(
              'select ten from phong_ban where id = $1', [v.phong_ban_id]);
            phong_ban_ten = pb.rows[0]?.ten ?? null;
          }
          await ghi_su_kien('erp1.nhan_su.da_tao', {
            ma_nv: v.ma_nv,
            ma_erp: v.ma_erp,
            email: v.email,
            ho_ten: v.ho_ten,
            so_dien_thoai: v.so_dien_thoai,
            ngay_vao: v.ngay_vao,
            pin_may: goi_y?.pin ?? v.pin_may,
            chuc_danh: v.chuc_danh,
            phong_ban: phong_ban_ten,
          }, khach);
          // Tai khoan he thong (nguoi_dung): tu tao khi chon, vai tro theo vi tri.
          if (v.tao_tk_he_thong) {
            await khach.query(
              `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, nhan_vien_id, email_microsoft)
               values ($1,$2,$3,$4,$5)`,
              [ten_dang_nhap, hash_ht, vai_tro_ht, moi.id, v.email ?? null],
            );
          }
          // Microsoft Graph: tao tai khoan + cap giay phep (tien trinh nen day di).
          if (v.tao_tk_ms365) {
            await ghi_su_kien('ms365.tao_tai_khoan', {
              ma_nv: v.ma_nv, upn, ho_ten: v.ho_ten, mat_khau, sku_id,
            }, khach);
          }
          if (them !== null) {
            canh_bao_them = await them(khach, moi.id, goi_y?.pin ?? v.pin_may ?? null);
          }
          return moi;
        }),
        'Mã nhân viên hoặc PIN máy đã được dùng cho người khác.',
      );
      if (dong !== null) pin_cap = goi_y?.pin ?? null;
    } catch (loi) {
      // Tranh chap PIN: nguoi khac vua lay dung so vua goi y — thu lai voi so ke tiep.
      const k = loi as { code?: string; constraint?: string };
      const tranh_pin = goi_y !== null
        && k.code === '23505'
        && (k.constraint ?? '').includes('ma_dinh_danh');
      if (!tranh_pin) throw loi;
    }
  }
  if (dong === null) {
    throw new LoiXungDot(
      'Không cấp được PIN sau 5 lần thử — có người khác đang tạo cùng lúc. Hãy thử lại.');
  }

  // Ma dinh danh noi bo / ERP / email (ngoai transaction, an toan khi trung thi bao).
  const canh_bao = await gan_bo_ma_nhan_su(dong.id, {
    ma_nv: v.ma_nv,
    pin_may: pin_cap ?? v.pin_may,
    ma_erp: v.ma_erp,
    email: v.email,
  }, 'nguoi_khai');
  canh_bao.push(...canh_bao_them);
  if (v.tao_tk_ms365) {
    if (!ms365_tao_bat()) {
      canh_bao.push('MS365_TAO_TAI_KHOAN_BAT chưa bật — tài khoản Microsoft sẽ được tạo khi máy chủ bật tính năng.');
    } else if (sku_id === '') {
      canh_bao.push('Chưa khai SKU Microsoft cho chức danh này — tài khoản sẽ được cấp giấy phép khi khai đủ SKU.');
    }
  }

  return {
    id: dong.id,
    pin_cap,
    tai_khoan_ms365: v.tao_tk_ms365 ? { upn, mat_khau, sku_id } : null,
    tai_khoan_he_thong: v.tao_tk_he_thong
      ? { ten_dang_nhap, mat_khau: mat_khau_ht, vai_tro: vai_tro_ht }
      : null,
    canh_bao,
  };
}

/**
 * Doi loi trung khoa cua Postgres thanh thong diep nguoi dung hieu duoc.
 *
 * Nhan dang theo TEN RANG BUOC: bang `nguoi_dung` co nhieu khoa duy nhat, va bao "email
 * Microsoft da duoc dung" khi that ra ten dang nhap trung thi nguoi dung sua mai khong ra.
 */
async function ghi_bat_trung<T>(ham: () => Promise<T>, thong_diep: string): Promise<T> {
  try {
    return await ham();
  } catch (loi) {
    if ((loi as { code?: string }).code !== '23505') throw loi;
    const rb = (loi as { constraint?: string }).constraint ?? '';
    if (rb.includes('nhan_vien_id')) {
      throw new LoiXungDot('Nhân viên này đã có một tài khoản khác. Mỗi nhân viên chỉ một tài khoản.');
    }
    if (rb.includes('ten_dang_nhap')) {
      throw new LoiXungDot('Tên đăng nhập này đã tồn tại.');
    }
    if (rb.includes('khoa_chong_trung')) {
      throw new LoiXungDot('Đã xử lý bước này rồi — không làm trùng.');
    }
    throw new LoiXungDot(thong_diep);
  }
}
