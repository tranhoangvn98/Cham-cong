// Tao ho so nhan su moi — MOT luong duy nhat (yeu cau 26/10/2026):
//
//   Route POST /api/nhan-vien (tuyen/danh_muc.ts) — nguoi co quyen nhan su tu them, khong qua
//   buoc "de nghi - duyet". Admin chi nhan thong bao la co nhan su moi.
//
// Tat ca nam trong MOT transaction: sinh ma nhan su (khi nguoi dung khong khai) + insert
// nhan_vien + gan ma PIN + xep lenh cap nhat user xuong may cham cong + ghi cac su kien outbox
// (cong / ERP1 / MS365) + tao tai khoan he thong (nguoi_dung) + viec "Nhap viec" kem checklist
// cho nguoi phu trach nhan su. Neu may chet giua chung thi toan bo cuon lai — khong co trang
// thai "co nguoi, khong co tai khoan" hay "co nguoi, khong co checklist".
import { trong_giao_dich, truy_van_mot } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { bam_mat_khau, LoiMatKhau } from '../bao_mat/mat_khau.ts';
import { LoiDauVao, LoiXungDot } from '../tien_ich/kiem_tra.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { gan_bo_ma_nhan_su, gan_ma, bo_chay_tu } from '../dinh_danh/nghiep_vu.ts';
import { goi_y_pin } from '../dinh_danh/cap_pin.ts';
import { sinh_ma_nhan_su } from '../dinh_danh/ma_nhan_su.ts';
import { day_pin_xuong_may, may_cua_khoi } from './day_pin_may.ts';
import { bao_pin_cho_nhan_vien } from './bao_pin.ts';
import { nguoi_nhan_nhap_viec, tao_viec_nhap_viec_trong } from './nhap_viec.ts';
import { bao_nhan_su_moi } from './bao_nhan_su_moi.ts';
import { bao_tai_khoan_ms365 } from './bao_tai_khoan_ms365.ts';
import {
  kiem_hop_dong_khoi_tao, nhan_hop_dong, ngay_het_han,
  type LoaiHopDongKhoiTao,
} from './hop_dong_khoi_tao.ts';
import { ms365_tao_bat, sinh_mat_khau_khoi_tao } from './ms365.ts';
import { sinh_ten_dang_nhap, vai_tro_theo_vi_tri } from './vi_tri.ts';
import { dong_bo_vi_tri_ho_so, gan_vi_tri_khi_tao_ho_so } from '../to_chuc/ghi.ts';

/** Dau vao tao ho so — da duoc kiem tra dang chuoi/uuid o ben goi. */
export interface DauVaoTaoHoSo {
  /** null hoac chuoi rong = de he thong tu sinh (NV + ma ngan khoi + MMYY + so thu tu). */
  ma_nv: string | null;
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
  /** Cong chuan co dinh RIENG cua nguoi nay (null = theo khoi > tham so > lich). */
  cong_chuan_thang?: number | null;
  tu_cap_pin: boolean;
  thiet_bi_serial: string | null;
  /** cap_ms365 = tai khoan Microsoft duoc TAO MOI trong lan nay. */
  tao_tk_ms365: boolean;
  /**
   * Nguoi nay DA co tai khoan Microsoft 365 kem giay phep (chon tu danh sach Graph): khong tao
   * lai tai khoan, nhung muc checklist MS365 duoc tick san vi khong con viec gi phai lam.
   */
  ms365_da_co?: boolean;
  tao_tk_he_thong: boolean;
  /** Loai hop dong — tao luon `hop_dong_lao_dong` + checklist nhac dung loai can ky. */
  loai_hop_dong?: LoaiHopDongKhoiTao | null;
  /** Ky han hop dong chinh thuc (6 hoac 12 thang); cac loai khac bo qua. */
  thoi_han_thang?: number | null;
  /**
   * Vi tri JD lay tu danh muc "To chuc & trach nhiem". Chon o day = giao luon cac dau viec
   * dinh ky cua vi tri; vi tri dau tien thanh vi tri CHINH. Rong = khong gan.
   */
  vi_tri_ids?: readonly string[];
  /** Ghi de SKU giay phep Microsoft. */
  sku_id_tuy_chon?: string | null;
  /** Ma ben ERP1, neu nguoi tao da biet (ERP1 khong tra ve ma nay trong luc tao ho so). */
  ma_erp1?: string | null;
  /**
   * Tai khoan nguoi LAP HO SO — nguoi nhan thong bao "tai khoan Microsoft + mat khau khoi tao"
   * de ban giao cho nhan vien. null khi tao bang script/MCP (khong co nguoi doc chuong).
   */
  nguoi_tao_id?: string | null;
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
  /** Ma nhan su THAT SU duoc dung — ma he thong sinh khi dau vao de trong. */
  ma_nv: string;
  /** May da duoc xep lenh cap nhat user (rong = khong co may nao de day). */
  may_da_day: string[];
  pin_cap: string | null;
  tai_khoan_ms365: TaiKhoanMs365Tao | null;
  tai_khoan_he_thong: TaiKhoanHeThongTao | null;
  /** Cong viec "Nhap viec" vua sinh (null = da ton tai hoac chua khai nguoi phu trach). */
  viec_id: string | null;
  /** So vi tri To chuc & trach nhiem da gan (0 = khong chon). */
  so_vi_tri_to_chuc: number;
  /** So dau viec se sinh viec dinh ky tu cac vi tri vua gan. */
  so_dau_viec_dinh_ky: number;
  canh_bao: string[];
}

/**
 * Tao ho so nhan su moi: insert + PIN + outbox + tai khoan he thong + viec "Nhap viec".
 *
 * Vong lap 5 lan de chong tranh chap PIN (hai nguoi cung "tu cap" mot luc) — unique index
 * chan nguoi thu hai, ta thu lai so ke tiep. Moi thu trong transaction deu cuon theo neu lan
 * thu do bi chan boi tranh chap PIN.
 */
export async function tao_ho_so_nhan_su(
  v: DauVaoTaoHoSo,
): Promise<KetQuaTaoHoSo> {
  kiem_hop_dong_khoi_tao(v.loai_hop_dong ?? null, v.thoi_han_thang ?? null);
  // Ma nhan su do he thong sinh khi nguoi dung khong khai — ma ghep tu ma ngan cua khoi va
  // thang vao lam, nen thieu khoi thi khong sinh duoc.
  const ma_nv_nhap = (v.ma_nv ?? '').trim();
  if (ma_nv_nhap === '' && v.khoi_id === null) {
    throw new LoiDauVao(
      'Chọn khối trước khi lưu — mã nhân sự được ghép từ mã ngắn của khối và tháng vào làm.');
  }

  // May cham cong: khai khoi la du. `thiet_bi_serial` chi con dung khi nhan su chi dinh may khac
  // voi may mac dinh cua khoi.
  const serial_theo_khoi = v.khoi_id === null ? [] : await may_cua_khoi(v.khoi_id);
  let serial_cap_pin = (v.thiet_bi_serial ?? '').trim();
  if (serial_cap_pin === '' && serial_theo_khoi.length > 0) {
    serial_cap_pin = serial_theo_khoi[0] as string;
  }
  if (v.tu_cap_pin && serial_cap_pin === '') {
    throw new LoiDauVao(
      'Tự cấp PIN cần biết máy chấm công — khối đã chọn chưa gắn máy nào. '
      + 'Gắn máy cho khối ở trang Thiết bị, hoặc chọn máy thủ công.');
  }
  // Day xuong MOI may cua khoi, khong chi may cap PIN: nguoi vao cong nao cung phai co ten tren
  // may do, va khoa chong trung tinh theo tung serial nen khong day trung.
  const serial_day = [...new Set(
    [...serial_theo_khoi, serial_cap_pin].filter((s) => s !== ''),
  )];

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
    // Mac dinh Basic cho moi tai khoan moi (chu cong ty chot 10/2026). Standard chi khi nguoi
    // tao chon dich danh — cong duyet ghi de bang `sku_id_tuy_chon` (REQ-G-01).
    sku_id = v.sku_id_tuy_chon ?? cau_hinh.ms365_tao.sku_basic;
  }

  // Tai khoan he thong (nguoi_dung): mat khau sinh san o day de trong giao dich chi con cau
  // INSERT. Ten dang nhap suy tu ma nhan vien nen phai tinh SAU khi biet ma — xem trong vong lap.
  let mat_khau_ht = '';
  let hash_ht = '';
  const vai_tro_ht = v.tao_tk_he_thong ? vai_tro_theo_vi_tri(v.vi_tri) : '';
  if (v.tao_tk_he_thong) {
    mat_khau_ht = sinh_mat_khau_khoi_tao(12);
    try {
      hash_ht = await bam_mat_khau(mat_khau_ht);
    } catch (loi) {
      if (loi instanceof LoiMatKhau) throw new LoiDauVao(loi.message);
      throw loi;
    }
  }

  /** Gia tri cho cau INSERT, theo dung thu tu cot. Ma NV va PIN doi theo tung lan thu. */
  const dung_ts = (ma_nv: string, pin: string | null): unknown[] => [
    ma_nv, v.ho_ten, pin, v.ma_erp, v.phong_ban_id, v.ca_lam_id, v.ngay_vao,
    v.so_dien_thoai, v.email, v.duoc_cham_cong_dien_thoai, v.noi_lam_viec_id,
    v.che_do_luong, v.khoi_id, v.chuc_danh, v.vi_tri, v.cong_chuan_thang ?? null,
  ];

  let dong: { id: string } | null = null;
  let ma_nv_dung = ma_nv_nhap;
  let ten_dang_nhap = '';
  let may_da_day: string[] = [];
  let pin_cap: string | null = null;
  let viec_id: string | null = null;
  let canh_bao_them: string[] = [];
  let so_vi_tri_to_chuc = 0;
  let so_dau_viec_dinh_ky = 0;
  for (let lan = 0; lan < 5 && dong === null; lan++) {
    // Goi y PIN ngoai transaction: doc tap PIN dang dung la thao tac chi doc, va loi "dai PIN da
    // het" phai bao truoc khi mo transaction.
    const goi_y = v.tu_cap_pin ? await goi_y_pin(serial_cap_pin) : null;
    const pin_gui = goi_y === null ? v.pin_may : goi_y.pin;
    try {
      dong = await ghi_bat_trung(
        () => trong_giao_dich(async (khach) => {
          // Ma NV sinh TRONG transaction: bo dem khoa dong (khoi, thang) den luc COMMIT nen hai
          // nguoi luu cung luc nhan hai so khac nhau; cuon lai thi so cung cuon theo.
          const ma_nv = ma_nv_nhap === ''
            ? await sinh_ma_nhan_su(khach, v.khoi_id as string, v.ngay_vao)
            : ma_nv_nhap;
          ten_dang_nhap = v.tao_tk_he_thong ? sinh_ten_dang_nhap(ma_nv) : '';

          const kq = await khach.query<{ id: string }>(
            `insert into nhan_vien
               (ma_nv, ho_ten, pin_may, ma_erp, phong_ban_id, ca_lam_id, ngay_vao,
                so_dien_thoai, email, duoc_cham_cong_dien_thoai, noi_lam_viec_id, che_do_luong,
                khoi_id, chuc_danh, vi_tri, cong_chuan_thang)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
            dung_ts(ma_nv, pin_gui),
          );
          const moi = kq.rows[0] ?? null;
          if (moi === null) return moi;
          ma_nv_dung = ma_nv;
          if (goi_y !== null) {
            await gan_ma(moi.id, 'may_cham_cong', goi_y.pin, {
              nguon: 'nguoi_khai',
              ghi_chu: `Hệ thống cấp khi tạo hồ sơ cho máy ${goi_y.thiet_bi_ten}`,
            }, bo_chay_tu(khach));
          }
          // Day user + PIN xuong may cham cong: nguoi moi phai co ten tren may ngay tu ca dau.
          // Lenh nam trong CUNG transaction — may offline thi cho san, hong thi cuon ca ho so.
          if (pin_gui !== null && serial_day.length > 0) {
            may_da_day = (await day_pin_xuong_may(
              khach, moi.id, v.ho_ten, pin_gui, serial_day,
            )).da_day;
          }
          // Co cau to chuc: dong bo bac vi tri tu ho so sang bang vi_tri + gan nhan vien.
          await dong_bo_vi_tri_ho_so(khach, moi.id, v.vi_tri);
          // Vi tri JD nguoi lap ho so chon (danh muc To chuc & trach nhiem): gan + sinh dau viec
          // dinh ky NGAY trong transaction nay, de "them nhan su + giao viec" la mot buoc.
          const gan_vt = await gan_vi_tri_khi_tao_ho_so(
            khach, moi.id, v.vi_tri_ids ?? [], v.chuc_danh,
          );
          so_vi_tri_to_chuc = gan_vt.so_vi_tri;
          so_dau_viec_dinh_ky = gan_vt.so_dau_viec;
          // Hop dong lao dong: tao luon trong CUNG transaction khi nguoi lap ho so chon loai.
          // Nho vay tinh luong / thoi viec / nhac het han doc cung mot nguon thay vi chu tu do.
          if (v.loai_hop_dong !== null && v.loai_hop_dong !== undefined) {
            const tu_ngay = v.ngay_vao ?? ngay_dia_phuong(new Date());
            const den_ngay = ngay_het_han(tu_ngay, v.loai_hop_dong, v.thoi_han_thang ?? null);
            let noi_ten: string | null = null;
            if (v.noi_lam_viec_id !== null) {
              const nlv = await khach.query<{ ten: string }>(
                'select ten from noi_lam_viec where id = $1', [v.noi_lam_viec_id]);
              noi_ten = nlv.rows[0]?.ten ?? null;
            }
            const chuc_danh_hd = (v.chuc_danh ?? '').trim() !== ''
              ? v.chuc_danh
              : gan_vt.ten_vi_tri_chinh;
            await khach.query(
              `insert into hop_dong_lao_dong
                 (nhan_vien_id, loai, chuc_danh, noi_lam_viec, hieu_luc_tu, hieu_luc_den,
                  trang_thai, ghi_chu)
               values ($1,$2,$3,$4,$5,$6,'hieu_luc',$7)`,
              [moi.id, v.loai_hop_dong, chuc_danh_hd, noi_ten, tu_ngay, den_ngay,
                'Tạo tự động khi thêm nhân sự'],
            );
          }
          // Cong phan quyen: tu tao ban ghi danh tinh (nhan_su.da_tao da co tu truoc).
          await ghi_su_kien('nhan_su.da_tao', { ma_nv, ho_ten: v.ho_ten }, khach);
          // ERP1: thiet lap tai khoan cho nhan su moi. Kem chuc danh + ten phong ban de
          // ERP1 tu phan quyen theo vi tri (hop dong 2.2b, WEBHOOK-ERP1.md).
          let phong_ban_ten: string | null = null;
          if (v.phong_ban_id !== null) {
            const pb = await khach.query<{ ten: string }>(
              'select ten from phong_ban where id = $1', [v.phong_ban_id]);
            phong_ban_ten = pb.rows[0]?.ten ?? null;
          }
          await ghi_su_kien('erp1.nhan_su.da_tao', {
            ma_nv,
            ma_erp: v.ma_erp,
            email: v.email,
            ho_ten: v.ho_ten,
            so_dien_thoai: v.so_dien_thoai,
            ngay_vao: v.ngay_vao,
            pin_may: pin_gui,
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
              ma_nv, upn, ho_ten: v.ho_ten, mat_khau, sku_id,
            }, khach);
          }
          // Viec "Nhap viec" + checklist cho nguoi phu trach nhan su. Muc nao he thong da tu
          // lam duoc thi tick san. Cung transaction: khong co canh "co nguoi, khong co viec".
          const moi_lan: string[] = [];
          const nguoi_nhan = await nguoi_nhan_nhap_viec();
          if (nguoi_nhan === null) {
            moi_lan.push('Chưa khai NHAP_VIEC_NHAN_SU_ID / workflow nhập việc — chưa giao được việc nhập việc cho nhân sự.');
          } else {
            const han = v.ngay_vao ?? ngay_dia_phuong(new Date());
            viec_id = await tao_viec_nhap_viec_trong(
              khach, nguoi_nhan, { id: moi.id, ho_ten: v.ho_ten, ma_nv }, han,
              v.tao_tk_ms365 || v.ms365_da_co === true,
              nhan_hop_dong(v.loai_hop_dong ?? null, v.thoi_han_thang ?? null),
              cau_hinh.nhap_viec.email_bhxh, pin_gui,
            );
            if (viec_id === null) {
              moi_lan.push('Việc nhập việc đã tồn tại — giữ nguyên bản cũ.');
            }
          }
          canh_bao_them = moi_lan;
          return moi;
        }),
        'Mã nhân viên hoặc PIN máy đã được dùng cho người khác.',
      );
      // PIN THAT SU dung (do he thong cap hoac nguoi khai) — hien lai cho nhan su chep.
      if (dong !== null) pin_cap = pin_gui;
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
    ma_nv: ma_nv_dung,
    pin_may: pin_cap ?? v.pin_may,
    ma_erp: v.ma_erp,
    email: v.email,
    ma_erp1: v.ma_erp1 ?? null,
  }, 'nguoi_khai');
  canh_bao.push(...canh_bao_them);
  // Bao so PIN cho chinh nhan vien: so PIN do he thong cap nen ho khong the biet truoc, va
  // khong biet thi ca dau khong quet duoc. Gui SAU transaction (thong bao khong duoc lam hong
  // viec chinh) nhung phai bao cho nguoi lap ho so biet khi khong gui duoc.
  if (pin_cap !== null) {
    const da_bao = await bao_pin_cho_nhan_vien({
      nhan_vien_id: dong.id, pin: pin_cap, serial_may: may_da_day,
    });
    if (!da_bao) {
      canh_bao.push(`PIN của người này là ${pin_cap} nhưng chưa có tài khoản đăng nhập nên `
        + 'không nhận được thông báo — hãy báo số PIN trực tiếp cho nhân viên.');
    }
  }
  if (v.tao_tk_ms365) {
    if (!ms365_tao_bat()) {
      canh_bao.push('MS365_TAO_TAI_KHOAN_BAT chưa bật — tài khoản Microsoft sẽ được tạo khi máy chủ bật tính năng.');
    } else if (sku_id === '') {
      canh_bao.push('Chưa khai MS365_SKU_BASIC — tài khoản sẽ được cấp giấy phép khi khai đủ SKU.');
    }
    // Nguoi LAP HO SO nhan ten dang nhap + mat khau khoi tao trong chuong cua chinh ho, de
    // ban giao cho nhan vien moi. Nhan vien bat buoc doi mat khau o lan dang nhap dau (payload
    // Graph da dat `forceChangePasswordNextSignIn: true`).
    let da_bao_tk = false;
    try {
      da_bao_tk = await bao_tai_khoan_ms365({
        nguoi_tao_id: v.nguoi_tao_id ?? null,
        ho_ten: v.ho_ten, upn, mat_khau,
      });
    } catch (loi) {
      // Thong bao la phan phu: ho so DA luu xong, khong duoc tra 500 vi chuong loi.
      console.warn(`[bao] khong gui duoc tai khoan Microsoft: ${(loi as Error).message}`);
    }
    if (!da_bao_tk && mat_khau !== '') {
      canh_bao.push('Không xác định được tài khoản người lập hồ sơ nên chưa gửi được tài khoản '
        + 'Microsoft vào chuông — mật khẩu chỉ hiện ở phản hồi này, hãy lưu lại trước khi đóng.');
    }
  }

  // Bao quan tri vien: co nhan su moi. Day la THONG BAO, khong phai yeu cau duyet — ho so da
  // luu xong va khong cho ai bam gi. Gui SAU transaction, khong duoc lam hong phan hoi.
  try {
    await bao_nhan_su_moi({ nhan_vien_id: dong.id, ho_ten: v.ho_ten, ma_nv: ma_nv_dung });
  } catch (loi) {
    console.warn(`[bao] khong gui duoc chuong "co nhan su moi": ${(loi as Error).message}`);
  }

  return {
    id: dong.id,
    ma_nv: ma_nv_dung,
    may_da_day,
    pin_cap,
    tai_khoan_ms365: v.tao_tk_ms365 ? { upn, mat_khau, sku_id } : null,
    tai_khoan_he_thong: v.tao_tk_he_thong
      ? { ten_dang_nhap, mat_khau: mat_khau_ht, vai_tro: vai_tro_ht }
      : null,
    viec_id,
    so_vi_tri_to_chuc,
    so_dau_viec_dinh_ky,
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
