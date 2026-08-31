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

  /**
   * Cong SSO noi bo (`teams.tranhoangvietnam.com/cong`).
   *
   * De TRONG `CONG_SSO_GOC` = tat han: he thong dung duong dang nhap rieng nhu truoc. Khai vao
   * = chap nhan them token do cong phat hanh. Xem tai_lieu/CONG-SSO.md.
   *
   * `iss` phai khop DUNG TUNG KY TU voi truong `iss` trong token — day la ranh gioi giua "token
   * cua cong nay" va "token cua mot cong khac". Vi vay no lay thang tu `CONG_SSO_GOC`, khong
   * chuan hoa gi ngoai viec bo dau `/` cuoi.
   *
   * `ma_module` la khoa doc trong `token.quyen`. Doc khoa cua phan he khac la vuot ranh gioi,
   * nen o day chi co MOT gia tri va no khong phai danh sach.
   */
  cong_sso: (() => {
    const goc = chu('CONG_SSO_GOC', '').replace(/\/+$/, '');
    let goc_dang_nhap = chu('CONG_SSO_GOC_DANG_NHAP', '');
    if (goc_dang_nhap === '' && goc !== '') {
      try {
        goc_dang_nhap = new URL(goc).origin + '/';
      } catch {
        throw new Error(`CONG_SSO_GOC khong phai URL hop le: ${goc}`);
      }
    }
    return {
      iss: goc,
      jwks_url: chu('CONG_SSO_JWKS', goc === '' ? '' : `${goc}/.well-known/jwks.json`),
      /** `aud` la CHUOI, khong phai mang — so sanh `===`. */
      aud: chu('CONG_SSO_AUD', 'cong-noi-bo'),
      ma_module: chu('CONG_SSO_MA_MODULE', 'chamcong'),
      /** Tien to duong dan cua phan he tren cong — dung de dung `?quay_lai=`. */
      tien_to: `/${chu('CONG_SSO_TIEN_TO', 'chamcong').replace(/^\/+|\/+$/g, '')}`,
      /** Man dang nhap cua cong. Mac dinh la goc ten mien cua cong. */
      goc_dang_nhap,
      /**
       * 1 = BO duong dang nhap rieng cua cham cong: khong con cho nao nhan mat khau, chua co
       * token thi chuyen huong sang cong.
       *
       * MAC DINH TAT, va do la co y. Bat cai nay la dong cua dang nhap duy nhat dang dung
       * duoc; neu cong chua phat duoc token dung duoc thi CA CONG TY khong vao duoc he thong.
       * Bat sau khi da dang nhap thu thanh cong qua cong mot lan.
       *
       * Chi co hieu luc khi da khai `CONG_SSO_GOC` — xem `bo_dang_nhap_rieng()`. Bo cua cu ma
       * khong co cua moi la khong con cua nao.
       */
      bo_dang_nhap_rieng: chu('CONG_SSO_BO_DANG_NHAP_RIENG', '0') === '1',
    };
  })(),

  /**
   * He thong ERP cu (Tran Hoang Viet Nam).
   *
   * `webhook_*` la chieu DI: outbox cua ta POST su kien sang ERP.
   * `url` + `api_key` la chieu VE: ta keo nguoi dung tu ERP sang. Xac thuc bang header
   * `X-Api-Key`, KHONG phai Bearer. De TRONG `url` = tat han viec dong bo.
   *
   * Tai lieu tich hop noi ro: khoa production phai xin rieng, dat trong bien moi truong,
   * KHONG hard-code vao ma nguon hay commit len git.
   */
  erp: {
    webhook_url: chu('ERP_WEBHOOK_URL', ''),
    webhook_secret: chu('ERP_WEBHOOK_SECRET', ''),
    url: chu('ERP_API_URL', '').replace(/\/+$/, ''),
    api_key: chu('ERP_API_KEY', ''),
  },

  /** Bat migration tu dong khi khoi dong (tien cho Docker 1 diem). */
  /**
   * Trang tai lieu API o /api/v1/tai-lieu.
   *
   * Mac dinh BAT: trang do chi bay ra HOP DONG (ten duong dan, tham so, y nghia), khong bay
   * ra du lieu — muon goi that van phai co khoa API. Dua duong dan cho ben tich hop la ho tu
   * doc duoc, khong phai gui file qua lai. Dat 0 neu khong muon lo ca hop dong ra ngoai.
   */
  api_tai_lieu_cong_khai: chu('API_TAI_LIEU_CONG_KHAI', '1') === '1',

  /**
   * Dia chi CONG KHAI cua API, ghi vao `servers` cua spec OpenAPI.
   *
   * Bat buoc phai khai bang tay: may chu chay sau reverse proxy va KHONG the tu suy ra. Ben
   * ngoai goi https://ten-mien/chamcong/api/v1/... nhung ben trong container chi thay
   * /api/v1/... — tien to /chamcong do Caddy them, may chu khong he biet.
   *
   * De trong thi spec khong co `servers`, va bo sinh ma se mac dinh ve http://localhost —
   * client sinh ra khong goi duoc gi cho toi khi nguoi ta tu sua tay.
   *
   * VD: API_GOC_CONG_KHAI=https://teams.tranhoangvietnam.com/chamcong
   */
  api_goc_cong_khai: chu('API_GOC_CONG_KHAI', '').replace(/\/+$/, ''),

  tu_dong_di_tru: chu('TU_DONG_DI_TRU', la_production ? '0' : '1') === '1',

  /**
   * Thong bao day toi app dien thoai (don moi, don duoc duyet).
   *
   * Dat 0 de tat han — huu ich khi may chu khong ra duoc Internet, hoac khi khoi phuc du
   * lieu cu: tinh lai bang cong hang loat ma con bat thi nhan vien nhan mot loat thong bao
   * ve nhung don da xu ly tu lau.
   */
  thong_bao_day_bat: chu('THONG_BAO_DAY', '1') === '1',

  /**
   * Dich vu day thong bao cua Expo. Chi doi khi tu chay may chu day rieng — de nguyen thi
   * dung dich vu cong cong cua Expo, khong can dang ky hay khoa gi.
   */
  expo_push_url: chu('EXPO_PUSH_URL', 'https://exp.host/--/api/v2/push/send'),

  /** Kich thuoc anh selfie toi da (byte). */
  anh_toi_da_byte: so('ANH_TOI_DA_BYTE', 3 * 1024 * 1024),

  /**
   * Hop dong dien tu vContract (Viettel). De TRONG `VCONTRACT_URL` = tat han tinh nang.
   *
   * `cp_code` va `cp_account_code` do Viettel cap khi mo ket noi. `cp_account_code` nhan
   * 'VCONTRACT' (co chung thuc) hoac 'SCONTRACT' (khong chung thuc) — khai sai thi login
   * duoc nhung lap hop dong se vao nham phien ban.
   */
  vcontract: {
    url: chu('VCONTRACT_URL', '').replace(/\/+$/, ''),
    username: chu('VCONTRACT_USERNAME', ''),
    mat_khau: chu('VCONTRACT_PASSWORD', ''),
    cp_code: chu('VCONTRACT_CP_CODE', ''),
    cp_account_code: chu('VCONTRACT_CP_ACCOUNT_CODE', 'VCONTRACT'),
    /**
     * Token vContract phai gui trong header Authorization khi goi callback ve ta. Khong
     * dat = tu choi moi callback: duong /vcontract/* nam ngoai lop dang nhap, de trong
     * nghia la bat ky ai cung doi duoc trang thai hop dong lao dong.
     */
    token_callback: chu('VCONTRACT_TOKEN_CALLBACK', ''),
  },

  /**
   * Dong bo kho tep ho so sang thu vien HCNS tren SharePoint. MOT CHIEU, xoa lan theo.
   *
   * Dung MOT APP RIENG (`cham-cong-sharepoint-sync`), khong dung lai app dang nhap:
   *   - App dang nhap chi can `openid profile email`, khong can quyen nao tren SharePoint.
   *     Gan quyen ghi tep vao no la mo rong be mat cua chinh lop dang nhap.
   *   - Quyen dung o day la `Sites.Selected`, va no CHI co hieu luc tren nhung site da duoc
   *     cap ten dich danh — hep hon `Sites.ReadWrite.All` rat nhieu.
   *
   * `goc_graph` va `goc_token` de doi duoc VI BO KIEM CAN mot may chu Graph gia tai cho:
   * phien lam viec dung de xay khong ket noi duoc SharePoint that. Vi chinh dieu do lam
   * chung thanh mot duong nga tren may that (tro sang may cua ke khac la nop ca client
   * secret), `goc_an_toan()` trong sharepoint/khach.ts tu choi moi goc la khi NODE_ENV=production.
   */
  sharepoint: {
    site_id: chu('SHAREPOINT_SITE_ID', ''),
    /** Biet san thi khoi mot luot goi Graph moi lan khoi dong. */
    drive_id: chu('SHAREPOINT_DRIVE_ID', ''),
    /** Ten thu vien tai lieu, dung khi khong khai `drive_id`. */
    thu_vien: chu('SHAREPOINT_THU_VIEN', 'HCNS'),
    tenant_id: chu('SHAREPOINT_TENANT_ID', chu('MS_TENANT_ID', '')),
    client_id: chu('SHAREPOINT_CLIENT_ID', ''),
    client_secret: chu('SHAREPOINT_CLIENT_SECRET', ''),
    goc_graph: chu('SHAREPOINT_GOC_GRAPH', 'https://graph.microsoft.com/v1.0').replace(/\/+$/, ''),
    goc_token: chu('SHAREPOINT_GOC_TOKEN', 'https://login.microsoftonline.com').replace(/\/+$/, ''),
    /**
     * Day thuc su len SharePoint. TAT mac dinh, va do la co y: cau hinh xong thi van chi
     * ghi nhan viec can day vao bang, de ban xem bang do truoc roi moi bat.
     */
    bat_day: chu('SHAREPOINT_BAT_DAY', '0') === '1',
  },

  /**
   * Gui email qua Microsoft Graph (sendMail, app-only). He thong khong co SMTP; day la duong
   * gui mail duy nhat. Tan dung app SharePoint neu khong khai rieng — NHUNG app do phai duoc
   * cap them quyen ung dung `Mail.Send` va phai khai `MS_MAIL_NGUOI_GUI` (hop thu gui). Thieu
   * mot trong ba khoa hoac nguoi_gui thi coi nhu TAT: nhac nho roi ve thong bao day trong app.
   */
  mail: {
    tenant_id: chu('MS_MAIL_TENANT_ID', chu('SHAREPOINT_TENANT_ID', chu('MS_TENANT_ID', ''))),
    client_id: chu('MS_MAIL_CLIENT_ID', chu('SHAREPOINT_CLIENT_ID', '')),
    client_secret: chu('MS_MAIL_CLIENT_SECRET', chu('SHAREPOINT_CLIENT_SECRET', '')),
    /** Hop thu gui (userPrincipalName / email), vd hr@tranhoangvietnam.com. Trong = tat email. */
    nguoi_gui: chu('MS_MAIL_NGUOI_GUI', ''),
    goc_graph: chu('SHAREPOINT_GOC_GRAPH', 'https://graph.microsoft.com/v1.0').replace(/\/+$/, ''),
    goc_token: chu('SHAREPOINT_GOC_TOKEN', 'https://login.microsoftonline.com').replace(/\/+$/, ''),
  },

  /** Quy tac xu ly canh bao ra/vao van phong. */
  ra_vao: {
    /** Cung mot loi >= nguong lan trong thang thi CHUYEN KY LUAT thay vi chi nhac nho. */
    nguong_ky_luat: Math.max(1, Math.round(so('RA_VAO_NGUONG_KY_LUAT', 3))),
  },

  /** Xu ly ky luat tu dong. */
  ky_luat: {
    /**
     * Khoan GIAM THUONG cua mot ho so >= nguong (dong) thi phai co nguoi duyet moi ap; duoi
     * nguong he thong tu ap. Chu cong ty chot 2.000.000d. Dat 0 = MOI khoan giam thuong deu
     * phai duyet (khong con duong tu ap).
     */
    nguong_duyet: Math.max(0, Math.round(so('KY_LUAT_NGUONG_DUYET', 2_000_000))),
  },

  /**
   * Chu ky cua vong lich, phut. Cang nho thi tep moi nap len cang som co tren SharePoint.
   *
   * Mac dinh 5. Truoc day la 15 va do la mot con so thua huong, khong phai mot quyet dinh: moi
   * viec trong vong lich deu khoa "mot lan mot ngay" nen chu ky chi quyet dinh do TRE, khong
   * quyet dinh khoi luong. Rieng viec dong bo SharePoint chay MOI VONG, va khi khong con viec
   * thi no ket thuc sau mot cau SQL co chi muc — khong mot luot goi Graph nao.
   *
   * Chan trong [1, 60]: go 0 hay so am thi `setInterval` ban lien tuc, con so qua lon thi viec
   * cuoi ngay co the truot han ca ngay.
   */
  lich_chu_ky_phut: Math.min(60, Math.max(1, Math.round(so('LICH_CHU_KY_PHUT', 5)))),

  /** Noi luu tep dinh kem ho so nhan su (hop dong scan, bien ban...). */
  thu_muc_ho_so: resolve(process.cwd(), chu('THU_MUC_HO_SO', './du_lieu/ho_so')),

  /** Kich thuoc mot tep dinh kem toi da (byte). Hop dong scan nhieu trang thi nang len. */
  tep_toi_da_byte: so('TEP_TOI_DA_BYTE', 15 * 1024 * 1024),
} as const;

/** Offset may cham cong duoi dang milli-giay — dung khi doi gio dia phuong <-> UTC. */
export const OFFSET_MAY_MS = cau_hinh.device_tz_offset_hours * 3600 * 1000;
