// Nap cau hinh tu bien moi truong. Doc mot lan khi khoi dong, fail-fast neu thieu bi mat.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { doc_danh_sach_ip } from './tien_ich/dia_chi_ip.ts';

/** Doc file .env don gian (KEY=VALUE, bo qua dong trong va dong #). Khong ghi de bien da co. */
function nap_env(duong_dan: string): void {
  let noi_dung: string;
  try {
    noi_dung = readFileSync(duong_dan, 'utf8');
  } catch {
    return; // khong co .env — chay bang bien moi truong that (Docker/systemd)
  }
  for (const dong of noi_dung.split('\n')) {
    const line = dong.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const vt = line.indexOf('=');
    if (vt <= 0) continue;
    const khoa = line.slice(0, vt).trim();
    if (process.env[khoa] !== undefined) continue;
    let gia_tri = line.slice(vt + 1).trim();
    // Bo comment cuoi dong khi gia tri khong nam trong dau nhay
    if (!gia_tri.startsWith('"') && !gia_tri.startsWith("'")) {
      const cmt = gia_tri.indexOf(' #');
      if (cmt >= 0) gia_tri = gia_tri.slice(0, cmt).trim();
    } else {
      gia_tri = gia_tri.slice(1, -1);
    }
    process.env[khoa] = gia_tri;
  }
}

nap_env(resolve(process.cwd(), '.env'));
nap_env(resolve(process.cwd(), '../.env'));

function bat_buoc(khoa: string): string {
  const v = process.env[khoa];
  if (v === undefined || v.trim() === '') {
    throw new Error(`Thieu bien moi truong bat buoc: ${khoa}. Xem .env.example.`);
  }
  return v.trim();
}

function so(khoa: string, mac_dinh: number): number {
  const v = process.env[khoa];
  if (v === undefined || v.trim() === '') return mac_dinh;
  const n = Number(v.trim());
  if (!Number.isFinite(n)) throw new Error(`Bien ${khoa} phai la so, dang nhan: ${v}`);
  return n;
}

function chu(khoa: string, mac_dinh: string): string {
  const v = process.env[khoa];
  return v === undefined || v.trim() === '' ? mac_dinh : v.trim();
}

const moi_truong = chu('NODE_ENV', 'development');
const la_production = moi_truong === 'production';

// JWT_SECRET la khoa ky token — yeu la mat toan bo he thong.
const jwt_secret = bat_buoc('JWT_SECRET');
if (la_production) {
  if (jwt_secret.length < 32) {
    throw new Error('JWT_SECRET qua ngan (<32 ky tu). Sinh khoa: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
  }
  if (jwt_secret.includes('doi_thanh_chuoi')) {
    throw new Error('JWT_SECRET dang la gia tri mau trong .env.example. Phai doi truoc khi len production.');
  }
}

export const cau_hinh = {
  moi_truong,
  la_production,
  cong: so('PORT', 8080),
  database_url: bat_buoc('DATABASE_URL'),

  jwt: {
    secret: jwt_secret,
    /** Thoi song token truy cap (giay). Ngan de giam thiet hai neu bi lo. */
    access_ttl: so('JWT_ACCESS_TTL', 900),
    /** Thoi song token lam moi (giay). App dien thoai dung de khong phai dang nhap lai. */
    refresh_ttl: so('JWT_REFRESH_TTL', 30 * 24 * 3600),
  },

  /**
   * May ZKTeco gui gio DIA PHUONG khong kem offset. Ta gan offset nay de dung
   * moc thoi gian tuyet doi. Doi so nay neu may dat o mui gio khac.
   */
  device_tz_offset_hours: so('DEVICE_TZ_OFFSET_HOURS', 7),

  thu_muc_anh: resolve(process.cwd(), chu('THU_MUC_ANH', './du_lieu/anh_cham_cong')),
  geofence_ban_kinh_m: so('GEOFENCE_BAN_KINH_M', 200),
  may_offline_sau_giay: so('MAY_OFFLINE_SAU_GIAY', 180),

  cors_origin: chu('CORS_ORIGIN', '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0),

  /**
   * Danh sach IP/CIDR duoc phep goi /iclock/* (cong may cham cong).
   *
   * RONG = cho phep tat ca — dung khi may chu dat trong LAN. Dat tren VPS thi PHAI dien,
   * vi cong 8080 con phuc vu /api/* cho dien thoai va may nhan su o moi noi, nen khong
   * the chan bang tuong lua (tuong lua khong phan biet duong dan).
   *
   * VD: ICLOCK_IP_CHO_PHEP=203.0.113.45,192.168.1.0/24
   */
  iclock_ip_cho_phep: doc_danh_sach_ip(chu('ICLOCK_IP_CHO_PHEP', '')),

  /**
   * Danh sach IP/CIDR cua reverse proxy DUOC PHEP dat X-Forwarded-For.
   *
   * RONG = khong tin header chuyen tiep cua bat ky ai; dia chi that cua socket moi la
   * dia chi client. Day la mac dinh an toan.
   *
   * Vi sao phai co: X-Forwarded-For do CLIENT gui len, ai cung dat gia tri tuy y duoc.
   * Tin no vo dieu kien nghia la ICLOCK_IP_CHO_PHEP bi vo hieu hoan toan — chi can gui
   * kem "X-Forwarded-For: <ip van phong>" la qua duoc danh sach trang.
   *
   * Dat sau Caddy/Nginx thi dien dai mang cua proxy (mang Docker: 172.16.0.0/12),
   * TUYET DOI khong dien 0.0.0.0/0.
   */
  proxy_tin_cay: doc_danh_sach_ip(chu('PROXY_TIN_CAY', ''), 'PROXY_TIN_CAY'),

  /**
   * Dang nhap bang tai khoan Microsoft (Entra ID), chuan OpenID Connect.
   *
   * Chi bat khi khai DU ca bon gia tri — thieu mot cai la tinh nang tat han, khong chay
   * nua vach nua voi. Cach dang ky ung dung ben Entra: tai_lieu/DANG-NHAP-MICROSOFT.md
   *
   * `tu_dong_tao` MAC DINH TAT: bat len nghia la BAT KY ai trong to chuc dang nhap duoc
   * cung tu co tai khoan trong he thong cham cong. De tat thi nhan su phai khai email
   * cho tung nguoi truoc — nguoi chua khai bi tu choi.
   */
  microsoft: {
    tenant_id: chu('MS_TENANT_ID', ''),
    client_id: chu('MS_CLIENT_ID', ''),
    client_secret: chu('MS_CLIENT_SECRET', ''),
    /** Phai khop TUNG KY TU voi Redirect URI khai ben Entra. */
    redirect_uri: chu('MS_REDIRECT_URI', ''),
    /**
     * Ten mien email duoc phep tu tao tai khoan, phan tach bang dau phay.
     *
     * RONG = chi nguoi da duoc nhan su khai truoc moi dang nhap duoc.
     *
     * Co gia tri = ai co email thuoc ten mien do deu XAC THUC duoc, va he thong tu tao cho
     * ho mot tai khoan o trang thai `cho_duyet`: dang nhap duoc nhung CHUA vao duoc he
     * thong, cho toi khi admin phan vai tro. Nguoi ngoai ten mien van bi tu choi.
     */
    ten_mien_cho_phep: chu('MS_TEN_MIEN_CHO_PHEP', '')
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
      .filter((s) => s.length > 0),
    /**
     * 1 = tai khoan tu tao duoc cap luon vai tro `nhan_vien`, khong qua buoc duyet.
     * 0 (mac dinh) = vao trang thai `cho_duyet`, admin phai phan quyen.
     */
    tu_dong_tao: chu('MS_TU_DONG_TAO', '0') === '1',
    /** Duong dan webapp de quay ve sau khi dang nhap xong. */
    goc_webapp: chu('MS_GOC_WEBAPP', ''),
  },

  erp: {
    webhook_url: chu('ERP_WEBHOOK_URL', ''),
    webhook_secret: chu('ERP_WEBHOOK_SECRET', ''),
  },

  /** Bat migration tu dong khi khoi dong (tien cho Docker 1 diem). */
  tu_dong_di_tru: chu('TU_DONG_DI_TRU', la_production ? '0' : '1') === '1',

  /** Kich thuoc anh selfie toi da (byte). */
  anh_toi_da_byte: so('ANH_TOI_DA_BYTE', 3 * 1024 * 1024),

  /** Noi luu tep dinh kem ho so nhan su (hop dong scan, bien ban...). */
  thu_muc_ho_so: resolve(process.cwd(), chu('THU_MUC_HO_SO', './du_lieu/ho_so')),

  /** Kich thuoc mot tep dinh kem toi da (byte). Hop dong scan nhieu trang thi nang len. */
  tep_toi_da_byte: so('TEP_TOI_DA_BYTE', 15 * 1024 * 1024),
} as const;

/** Offset may cham cong duoi dang milli-giay — dung khi doi gio dia phuong <-> UTC. */
export const OFFSET_MAY_MS = cau_hinh.device_tz_offset_hours * 3600 * 1000;
