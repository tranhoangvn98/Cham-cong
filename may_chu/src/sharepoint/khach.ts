// Tang goi Microsoft Graph de day tep ho so len thu vien HCNS tren SharePoint.
//
// DIEU QUAN TRONG NHAT CUA TEP NAY KHONG PHAI LA "DAY DUOC TEP LEN". Dich la mot thu vien
// dang dung that, co nguoi dang xep tay ho so vao do. Nen moi ham ghi va ham xoa o day deu
// goi hang rao trong `anh_xa.ts` TRUOC khi noi voi Graph, va hang rao nam BEN TRONG client
// chu khong phai o tang goi: mot cho goi quen kiem la mot cho co the xoa tep cua nguoi khac.
//
// Ba rang buoc cua Graph ma bo test giu lai vi rat de quen:
//
//   1. Graph KHONG tu tao thu muc cha. `PUT /root:/a/b/c.pdf:/content` khi `a/b` chua co thi
//      tra 404 chu khong tao `a/b`. Nen `tai_len` tu goi `bao_dam_thu_muc` — mot cho, khong
//      de tang goi phai nho.
//   2. Tao thu muc PHAI dung `conflictBehavior: 'fail'`. Dung `'replace'` tren mot thu muc la
//      XOA SACH noi dung ben trong no. Thu muc `02 HỢP ĐỒNG & THỎA THUẬN` cua HCNS dang co
//      du lieu that.
//   3. Tai tep lon theo tung khuc thi moi khuc (tru khuc cuoi) phai la BOI SO CUA 320 KiB.
//      Graph tu choi kich thuoc khac, va thong bao loi cua no khong noi ro dieu do.
//
// Xac thuc la luong client_credentials (app-only), quyen `Sites.Selected` — nghia la app chi
// ghi duoc vao dung nhung site da duoc cap ten dich danh, khong phai moi site cua to chuc.
import { cau_hinh } from '../cau_hinh.ts';
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';
import {
  cac_cap_can_tao, duong_dan_an_toan_de_ghi, thu_muc_an_toan_de_tao,
} from './anh_xa.ts';

/** Bo cuoc thay vi treo mai. Tai tep lon dung han rieng o duoi. */
const HET_GIO_MS = 60_000;
const HET_GIO_TAI_MS = 5 * 60 * 1000;

/** Duoi nguong nay thi PUT mot lan; tren thi phai mo phien tai nhieu khuc. */
export const NGUONG_TEP_LON = 4 * 1024 * 1024;

/**
 * Kich thuoc mot khuc khi tai tep lon.
 *
 * PHAI la boi so cua 320 KiB — Graph tu choi kich thuoc khac voi mot thong bao khong he noi
 * ra dieu do. 320 KiB x 10 = 3,2 MB, du lon de khong chia qua nhieu luot.
 */
export const KHUC_TAI = 320 * 1024 * 10;

/** Xin token som hon han thuc su mot chut, de khong dung token vua het o giua mot luot day. */
const LE_AN_TOAN_MS = 5 * 60 * 1000;

/** Graph chan cho 429/503: cho theo `Retry-After`, va khong qua so lan nay. */
const SO_LAN_THU = 3;
const CHO_TOI_DA_MS = 60_000;

export class LoiSharePoint extends Error {
  ma_http: number;
  /** Thong diep dua ra man hinh duoc — khong chua token, khong chua secret. */
  thong_diep_cong_khai: string;

  constructor(thong_diep: string, ma_http = 502) {
    super(thong_diep);
    this.name = 'LoiSharePoint';
    this.ma_http = ma_http;
    this.thong_diep_cong_khai = thong_diep;
  }
}

// ---------------------------------------------------------------- cau hinh

export function bat_sharepoint(): boolean {
  const s = cau_hinh.sharepoint;
  return s.site_id !== '' && s.client_id !== '' && s.client_secret !== '' && s.tenant_id !== '';
}

function bat_buoc_bat(): void {
  if (!bat_sharepoint()) {
    throw new LoiDauVao(
      'Chưa cấu hình đồng bộ SharePoint. Khai SHAREPOINT_SITE_ID, SHAREPOINT_CLIENT_ID, '
      + 'SHAREPOINT_CLIENT_SECRET (và SHAREPOINT_TENANT_ID nếu khác MS_TENANT_ID) trong .env '
      + 'rồi chạy lại `docker compose up -d`.',
    );
  }
  if (cau_hinh.moi_truong === 'production'
    && !goc_an_toan(cau_hinh.sharepoint.goc_graph, cau_hinh.sharepoint.goc_token)) {
    throw new LoiSharePoint(
      'SHAREPOINT_GOC_GRAPH / SHAREPOINT_GOC_TOKEN đang trỏ ra ngoài Microsoft. Hai biến này '
      + 'chỉ để bộ kiểm dựng máy chủ Graph giả; trên máy thật phải bỏ trống để dùng giá trị '
      + 'mặc định. Trỏ sai là nộp client secret cho máy chủ khác.',
      500,
    );
  }
}

/**
 * Hai goc nay co phai cua Microsoft khong?
 *
 * Tach thanh ham thuan de kiem duoc. Kiem theo TEN MAY chu khong theo `startsWith` tren ca
 * chuoi: `https://graph.microsoft.com.ke-tan-cong.vn` bat dau dung bang tien to that.
 */
export function goc_an_toan(goc_graph: string, goc_token: string): boolean {
  const may_hop_le = (goc: string, ten_may: string): boolean => {
    let u: URL;
    try {
      u = new URL(goc);
    } catch {
      return false;
    }
    return u.protocol === 'https:' && u.hostname.toLowerCase() === ten_may;
  };
  return may_hop_le(goc_graph, 'graph.microsoft.com')
    && may_hop_le(goc_token, 'login.microsoftonline.com');
}

// ---------------------------------------------------------------- token

let token: string | null = null;
let token_het_luc = 0;
/** Chan xin token song song: nhieu luot day cung luc chi mo MOT yeu cau token. */
let dang_xin: Promise<string> | null = null;

/** Xoa token dang giu. Goi khi Graph tra 401 de lan sau xin lai. */
export function quen_token(): void {
  token = null;
  token_het_luc = 0;
  dang_xin = null;
}

async function xin_token_moi(): Promise<string> {
  const s = cau_hinh.sharepoint;
  const than = new URLSearchParams({
    client_id: s.client_id,
    client_secret: s.client_secret,
    scope: `${s.goc_graph.replace(/\/v1\.0$/, '')}/.default`,
    grant_type: 'client_credentials',
  });

  const res = await fetch(`${s.goc_token}/${s.tenant_id}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: than.toString(),
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  const kq = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    // Chi lay ma loi, KHONG lay `error_description`: Microsoft nhet ca client_id va chi tiet
    // cau hinh vao do, va thong diep nay se di vao log va len man hinh.
    throw new LoiSharePoint(
      `Microsoft từ chối cấp token cho ứng dụng đồng bộ (${String(kq['error'] ?? res.status)}). `
      + 'Kiểm tra SHAREPOINT_CLIENT_ID / SHAREPOINT_CLIENT_SECRET — client secret của Entra '
      + 'có hạn và hết hạn thì lỗi đúng như thế này.',
      502,
    );
  }

  const t = kq['access_token'];
  if (typeof t !== 'string' || t === '') {
    throw new LoiSharePoint('Microsoft trả về phản hồi token không có access_token.', 502);
  }
  const song_giay = Number(kq['expires_in'] ?? 3600);
  const song_ms = Number.isFinite(song_giay) && song_giay > 0 ? song_giay * 1000 : 3_600_000;

  // Le an toan KHONG BAO GIO vuot qua nua doi token. Ban dau cho la mot san "toi thieu 60
  // giay" o day, nhung the nghia la mot token bao con song 60 giay van duoc dem lai dung 60
  // giay — tuc la dung no den qua han. Han thuc te cua Entra la 3600+ giay nen duong nay
  // khong chay hang ngay; no chay dung vao ngay Entra doi cach cap han.
  const le = Math.min(LE_AN_TOAN_MS, Math.floor(song_ms / 2));
  token = t;
  token_het_luc = Date.now() + Math.max(0, song_ms - le);
  return t;
}

async function lay_token(): Promise<string> {
  bat_buoc_bat();
  if (token !== null && token_het_luc > Date.now()) return token;
  if (dang_xin !== null) return dang_xin;

  dang_xin = xin_token_moi().finally(() => { dang_xin = null; });
  return dang_xin;
}

// ---------------------------------------------------------------- goi Graph

/**
 * Ma hoa mot duong dan cho Graph.
 *
 * Ma hoa TUNG DOAN roi noi lai bang `/`: `encodeURIComponent` tren ca chuoi se bien dau `/`
 * thanh `%2F` va Graph doc thanh mot ten tep co dau gach cheo trong do.
 *
 * Doan nay quan trong that su vi ten thu muc cua HCNS co `&`, `(`, `)`, `–`, dau cach va chu
 * co dau. Dau `#` la cho de mat nhat: khong ma hoa thi moi thu sau no bi coi la fragment va
 * Graph nhan mot duong dan bi cat ngan — tep se ghi sai cho chu khong bao loi.
 */
export function ma_hoa_duong_dan(duong_dan: string): string {
  return duong_dan.split('/').map((d) => encodeURIComponent(d)).join('/');
}

interface TuyChonGoi {
  method?: string;
  than?: unknown;
  /** Cho phep ma HTTP nay di qua ma khong nem loi (vi du 409 khi thu muc da co). */
  cho_phep?: number[];
  het_gio_ms?: number;
}

interface KetQuaGoi {
  ma: number;
  than: Record<string, unknown>;
}

function cho_bao_lau(res: Response, lan: number): number {
  const h = res.headers.get('retry-after');
  const giay = h === null ? NaN : Number(h);
  if (Number.isFinite(giay) && giay > 0) return Math.min(giay * 1000, CHO_TOI_DA_MS);
  return Math.min(2000 * 2 ** lan, CHO_TOI_DA_MS);
}

async function goi_graph(duong_dan_api: string, tc: TuyChonGoi = {}): Promise<KetQuaGoi> {
  const cho_phep = tc.cho_phep ?? [];

  for (let lan = 0; ; lan++) {
    const tk = await lay_token();
    const res = await fetch(`${cau_hinh.sharepoint.goc_graph}${duong_dan_api}`, {
      method: tc.method ?? 'GET',
      headers: {
        authorization: `Bearer ${tk}`,
        accept: 'application/json',
        ...(tc.than === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: tc.than === undefined ? undefined : JSON.stringify(tc.than),
      signal: AbortSignal.timeout(tc.het_gio_ms ?? HET_GIO_MS),
    });

    if (res.status === 401) {
      // Token co the vua bi xoay hoac vua het han. Quen roi thu lai DUNG MOT LAN — thu mai
      // voi credential sai la duong toi bi Entra khoa tai khoan.
      quen_token();
      if (lan === 0) continue;
      throw new LoiSharePoint(
        'Microsoft từ chối token của ứng dụng đồng bộ (401). Client secret có thể đã hết hạn.',
        502,
      );
    }

    if ((res.status === 429 || res.status >= 500) && lan < SO_LAN_THU) {
      await new Promise((ok) => setTimeout(ok, cho_bao_lau(res, lan)));
      continue;
    }

    const than = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (res.ok || cho_phep.includes(res.status)) return { ma: res.status, than };

    throw loi_tu_graph(res.status, than, duong_dan_api);
  }
}

/** Doi ma loi cua Graph thanh thong diep noi duoc PHAI LAM GI. */
function loi_tu_graph(
  ma: number, than: Record<string, unknown>, duong_dan_api: string,
): LoiSharePoint {
  const goi = than['error'];
  const chi_tiet = goi !== null && typeof goi === 'object'
    ? String((goi as { message?: unknown }).message ?? '')
    : '';

  if (ma === 403) {
    // Day la trang thai rat de gap va rat de doan sai thanh "sai secret". `Sites.Selected`
    // khong cho quyen gi cho tOi khi co mot ban ghi permission tren dung site do.
    return new LoiSharePoint(
      'SharePoint từ chối (403). Quyền Sites.Selected chưa được cấp trên site HCNS, hoặc chỉ '
      + 'được cấp mức "read". Cần một bản ghi permission với roles=["write"] trên site — xem '
      + 'tai_lieu/sharepoint.md.',
      403,
    );
  }
  if (ma === 404) {
    return new LoiSharePoint(
      `SharePoint không có đường dẫn này (404): ${duong_dan_api}. Nếu là thư mục thì tên phải `
      + 'khớp từng ký tự với thư mục thật — kể cả dấu gạch ngang dài "–".',
      404,
    );
  }
  if (ma === 507 || /quota/i.test(chi_tiet)) {
    return new LoiSharePoint('Thư viện SharePoint đã hết dung lượng.', 507);
  }
  return new LoiSharePoint(
    `SharePoint trả mã ${String(ma)}${chi_tiet === '' ? '' : `: ${chi_tiet}`}`,
    502,
  );
}

// ---------------------------------------------------------------- thu vien (drive)

let drive_id: string | null = null;

/** Chi de kiem thu: quen drive dang giu. */
export function quen_drive(): void {
  drive_id = null;
}

/**
 * Id cua thu vien tai lieu can ghi vao.
 *
 * Uu tien gia tri khai san trong `.env` (mot lan goi it hon moi lan khoi dong, va khong phu
 * thuoc vao ten thu vien co bi doi hay khong). Khong khai thi tra ten theo `SHAREPOINT_THU_VIEN`.
 */
export async function lay_drive_id(): Promise<string> {
  if (drive_id !== null) return drive_id;
  bat_buoc_bat();

  const s = cau_hinh.sharepoint;
  if (s.drive_id !== '') {
    drive_id = s.drive_id;
    return drive_id;
  }

  const kq = await goi_graph(
    `/sites/${encodeURIComponent(s.site_id)}/drives?$select=id,name,webUrl`,
  );
  const ds = (kq.than['value'] ?? []) as { id?: string; name?: string; webUrl?: string }[];
  const muon = s.thu_vien.toLowerCase();
  const thay = ds.find((d) => (d.name ?? '').toLowerCase() === muon)
    ?? ds.find((d) => (d.webUrl ?? '').toLowerCase().endsWith(`/${muon}`));

  if (thay?.id === undefined || thay.id === '') {
    const co = ds.map((d) => d.name ?? '?').join(', ');
    throw new LoiSharePoint(
      `Site không có thư viện tên "${s.thu_vien}". Các thư viện đang có: ${co || '(không có)'}. `
      + 'Khai SHAREPOINT_THU_VIEN cho đúng, hoặc khai thẳng SHAREPOINT_DRIVE_ID.',
      404,
    );
  }
  drive_id = thay.id;
  return drive_id;
}

// ---------------------------------------------------------------- doc thu muc

export interface MucCon {
  ten: string;
  la_thu_muc: boolean;
}

/** Chan mot vong lap phan trang khong bao gio ket thuc. 50 trang x 200 = 10.000 muc. */
const TRANG_TOI_DA = 50;

/**
 * Liet ke muc con cua mot thu muc. Tra `null` khi thu muc do khong ton tai (404).
 *
 * CHI DOC — khong tao, khong ghi, khong xoa. Nen o day KHONG co hang rao `duong_dan_an_toan_*`:
 * hang rao do ton tai de bao ve tep cua nguoi khac khoi bi ghi de va xoa, con doc thi khong
 * lam gi duoc ai. Doi lai, ham nay duoc dung dung vao viec doi chieu ten thu muc, ma cai can
 * doi chieu chinh la nhung thu muc NGOAI bang `NHANH` — mot hang rao o day se chan dung viec
 * do.
 *
 * Quyen can thiet chi la `Sites.Selected` muc read tren site — khong can FullControl.
 */
export async function liet_ke(duong_dan: string): Promise<MucCon[] | null> {
  const d = await lay_drive_id();
  const goc = cau_hinh.sharepoint.goc_graph;

  let api = duong_dan === ''
    ? `/drives/${d}/root/children?$select=name,folder&$top=200`
    : `/drives/${d}/root:/${ma_hoa_duong_dan(duong_dan)}:/children?$select=name,folder&$top=200`;

  const ra: MucCon[] = [];
  for (let trang = 0; trang < TRANG_TOI_DA; trang++) {
    const kq = await goi_graph(api, { cho_phep: [404] });
    if (kq.ma === 404) return null;

    for (const m of (kq.than['value'] ?? []) as { name?: string; folder?: unknown }[]) {
      ra.push({ ten: String(m.name ?? ''), la_thu_muc: m.folder !== undefined });
    }

    const tiep = kq.than['@odata.nextLink'];
    if (typeof tiep !== 'string' || tiep === '') return ra;

    // `nextLink` DEN TU PHAN HOI, tuc la mot URL do phia ben kia viet ra. Di theo no ma khong
    // kiem la gui Bearer token cua ung dung den bat ky may nao URL do tro tOi. Chi di theo khi
    // no van nam trong dung goc Graph dang dung.
    if (!tiep.startsWith(`${goc}/`)) {
      throw new LoiSharePoint(
        'Graph tra ve nextLink tro ra ngoai goc đang dùng — không đi theo.', 502,
      );
    }
    api = tiep.slice(goc.length);
  }
  throw new LoiSharePoint(
    `Thư mục "${duong_dan}" có quá nhiều mục con (hơn ${String(TRANG_TOI_DA * 200)}).`, 502,
  );
}

// ---------------------------------------------------------------- tao thu muc

/** Cac cap thu muc da biet la co — khoi goi lai Graph cho moi tep cua cung mot nguoi. */
const da_co = new Set<string>();

/** Chi de kiem thu: quen cac cap thu muc da biet. */
export function quen_thu_muc_da_co(): void {
  da_co.clear();
}

/**
 * Bao dam duong dan thu muc ton tai, tao cac cap con thieu tu tren xuong.
 *
 * `conflictBehavior: 'fail'` va coi 409 la THANH CONG. Day khong phai mot cach viet cho gon:
 * `'replace'` tren mot thu muc se xoa sach noi dung ben trong, va cac nhanh cua HCNS dang co
 * du lieu that. Tao that bai vi "da co" chinh la ket qua ta muon.
 */
export async function bao_dam_thu_muc(duong_dan: string): Promise<void> {
  if (!thu_muc_an_toan_de_tao(duong_dan)) {
    throw new LoiSharePoint(
      `Từ chối tạo thư mục ngoài phạm vi đã khai: ${duong_dan}`, 400,
    );
  }
  if (da_co.has(duong_dan)) return;

  const d = await lay_drive_id();

  for (const cap of cac_cap_can_tao(duong_dan)) {
    if (da_co.has(cap)) continue;

    const vt = cap.lastIndexOf('/');
    const cha = vt < 0 ? '' : cap.slice(0, vt);
    const ten = vt < 0 ? cap : cap.slice(vt + 1);

    const duong_dan_api = cha === ''
      ? `/drives/${d}/root/children`
      : `/drives/${d}/root:/${ma_hoa_duong_dan(cha)}:/children`;

    await goi_graph(duong_dan_api, {
      method: 'POST',
      than: { name: ten, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' },
      cho_phep: [409],
    });
    da_co.add(cap);
  }
}

// ---------------------------------------------------------------- tai len

export interface KetQuaTaiLen {
  /** Id cua tep tren SharePoint — luu lai de lan sau xoa theo id, khong phai theo ten. */
  id: string;
  /** Duong dan da ghi, dung nhu da yeu cau. */
  duong_dan: string;
  so_byte: number;
  /** Da phai mo phien tai nhieu khuc hay khong — huu ich khi doc log. */
  nhieu_khuc: boolean;
}

/**
 * Day mot tep len SharePoint, ghi de ban cu neu da co.
 *
 * `conflictBehavior: 'replace'` o day thi DUNG, khac han truong hop thu muc: day la dong bo
 * mot chieu, ban tren SharePoint la ban sao, va ban tren may chu la ban goc.
 */
export async function tai_len(
  duong_dan: string, du_lieu: Buffer, kieu_mime = 'application/octet-stream',
): Promise<KetQuaTaiLen> {
  if (!duong_dan_an_toan_de_ghi(duong_dan)) {
    throw new LoiSharePoint(`Từ chối ghi ra ngoài phạm vi đã khai: ${duong_dan}`, 400);
  }

  const vt = duong_dan.lastIndexOf('/');
  await bao_dam_thu_muc(duong_dan.slice(0, vt));

  return du_lieu.length > NGUONG_TEP_LON
    ? tai_nhieu_khuc(duong_dan, du_lieu)
    : tai_mot_lan(duong_dan, du_lieu, kieu_mime);
}

async function tai_mot_lan(
  duong_dan: string, du_lieu: Buffer, kieu_mime: string,
): Promise<KetQuaTaiLen> {
  const d = await lay_drive_id();
  const tk = await lay_token();

  const res = await fetch(
    `${cau_hinh.sharepoint.goc_graph}/drives/${d}/root:/${ma_hoa_duong_dan(duong_dan)}:/content`
    + '?@microsoft.graph.conflictBehavior=replace',
    {
      method: 'PUT',
      headers: { authorization: `Bearer ${tk}`, 'content-type': kieu_mime },
      body: new Uint8Array(du_lieu),
      signal: AbortSignal.timeout(HET_GIO_TAI_MS),
    },
  );

  const than = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw loi_tu_graph(res.status, than, duong_dan);

  return {
    id: String(than['id'] ?? ''),
    duong_dan,
    so_byte: du_lieu.length,
    nhieu_khuc: false,
  };
}

/**
 * Tai tep lon qua phien nhieu khuc.
 *
 * Moi khuc tru khuc cuoi PHAI la boi so cua 320 KiB. Neu khong, Graph tra loi mot thong bao
 * chung chung khong he nhac den rang buoc do — nen doan nay co bai kiem rieng.
 */
async function tai_nhieu_khuc(duong_dan: string, du_lieu: Buffer): Promise<KetQuaTaiLen> {
  const d = await lay_drive_id();

  const mo = await goi_graph(
    `/drives/${d}/root:/${ma_hoa_duong_dan(duong_dan)}:/createUploadSession`,
    {
      method: 'POST',
      than: { item: { '@microsoft.graph.conflictBehavior': 'replace' } },
    },
  );
  const url_tai = String(mo.than['uploadUrl'] ?? '');
  if (url_tai === '') {
    throw new LoiSharePoint('SharePoint không trả về uploadUrl cho phiên tải tệp lớn.', 502);
  }

  const tong = du_lieu.length;
  let cuoi_cung: Record<string, unknown> = {};

  for (let dau = 0; dau < tong; dau += KHUC_TAI) {
    const het = Math.min(dau + KHUC_TAI, tong);
    const khuc = du_lieu.subarray(dau, het);

    // uploadUrl da chua chu ky uy quyen san — KHONG gui kem Bearer token, va cung khong nen:
    // do la mot URL tam thoi cua Microsoft, gui token vao do la ro ri khong can thiet.
    const res = await fetch(url_tai, {
      method: 'PUT',
      headers: {
        'content-length': String(khuc.length),
        'content-range': `bytes ${String(dau)}-${String(het - 1)}/${String(tong)}`,
      },
      body: new Uint8Array(khuc),
      signal: AbortSignal.timeout(HET_GIO_TAI_MS),
    });

    if (!res.ok) {
      // Huy phien de khong de lai rac tren SharePoint. That bai o day thi bo qua — loi that
      // la loi tai len, khong phai loi huy.
      await fetch(url_tai, { method: 'DELETE' }).catch(() => undefined);
      const than = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw loi_tu_graph(res.status, than, duong_dan);
    }
    cuoi_cung = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  }

  // Khuc cuoi tra ve chinh driveItem. Khong co id thi coi nhu that bai — im lang o day nghia
  // la ta tuong da day xong ma khong co gi tren SharePoint.
  const goi = cuoi_cung['id'] ?? (cuoi_cung['item'] as { id?: unknown } | undefined)?.id;
  const id = String(goi ?? '');
  if (id === '') {
    throw new LoiSharePoint(
      'Đã gửi hết các khúc nhưng SharePoint không trả về tệp hoàn chỉnh.', 502,
    );
  }
  return { id, duong_dan, so_byte: tong, nhieu_khuc: true };
}

// ---------------------------------------------------------------- xoa

/**
 * Xoa mot tep tren SharePoint. Tra false neu tep khong co (da xoa tu truoc — coi la xong).
 *
 * HAI HANG RAO, va ca hai deu can:
 *   1. Duong dan phai nam trong pham vi da khai.
 *   2. Doi tuong o duong dan do phai la MOT TEP. Neu la thu muc thi tu choi — mot loi tinh
 *      duong dan co the tro vao thu muc nhan vien, va `DELETE` mot thu muc tren SharePoint
 *      keo theo toan bo tep ben trong, ke ca tep do nguoi khac dat vao.
 *
 * Xoa vao thung rac cua site (giu 93 ngay), khong phai xoa vinh vien — do la hanh vi mac
 * dinh cua Graph va o day no la dieu ta muon.
 */
export async function xoa(duong_dan: string): Promise<boolean> {
  if (!duong_dan_an_toan_de_ghi(duong_dan)) {
    throw new LoiSharePoint(`Từ chối xóa ngoài phạm vi đã khai: ${duong_dan}`, 400);
  }

  const d = await lay_drive_id();
  const dd = `/drives/${d}/root:/${ma_hoa_duong_dan(duong_dan)}`;

  const xem = await goi_graph(`${dd}?$select=id,name,folder,file`, { cho_phep: [404] });
  if (xem.ma === 404) return false;

  if (xem.than['folder'] !== undefined) {
    throw new LoiSharePoint(
      `Từ chối xóa: "${duong_dan}" là một thư mục, không phải tệp. Xóa thư mục trên SharePoint `
      + 'kéo theo mọi tệp bên trong, kể cả tệp do người khác đặt vào.',
      400,
    );
  }

  await goi_graph(dd, { method: 'DELETE', cho_phep: [404] });
  return true;
}

// ---------------------------------------------------------------- kiem tra ket noi

export interface KetQuaThu {
  ok: boolean;
  thong_diep: string;
  drive_id?: string;
  ten_thu_vien?: string;
}

/**
 * Thu ket noi mot lan, khong ghi gi. Dung cho trang quan tri va cho `/health`.
 *
 * KHONG nem loi: cho quan tri xem duoc "sai o dau" ngay tren man hinh la muc dich cua ham
 * nay, con nem loi thi thong tin do nam trong log ma khong ai mo.
 */
export async function thu_ket_noi(): Promise<KetQuaThu> {
  if (!bat_sharepoint()) {
    return { ok: false, thong_diep: 'Chưa cấu hình (thiếu SHAREPOINT_* trong .env).' };
  }
  try {
    const d = await lay_drive_id();
    const kq = await goi_graph(`/drives/${d}/root?$select=id,name,webUrl`);
    return {
      ok: true,
      thong_diep: 'Kết nối được và đọc được gốc thư viện.',
      drive_id: d,
      ten_thu_vien: String(kq.than['name'] ?? ''),
    };
  } catch (loi) {
    const l = loi as { thong_diep_cong_khai?: string; message?: string };
    return { ok: false, thong_diep: l.thong_diep_cong_khai ?? l.message ?? 'Lỗi không rõ.' };
  }
}
