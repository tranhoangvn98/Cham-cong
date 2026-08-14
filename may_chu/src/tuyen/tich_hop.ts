// API tich hop /api/v1/* — danh cho HE THONG NGOAI, khong phai cho webapp.
//
// Ba khac biet co y so voi /api/* dang co, va deu la vi ben goi la MAY chu khong phai
// nguoi ngoi truoc man hinh:
//
//  1. Xac thuc bang KHOA API + pham vi quyen, khong phai JWT 15 phut.
//  2. Duong dan co SO PHIEN BAN (/v1). Doi hinh dang phan hoi cua /api/* thi chi phai sua
//     webapp cua minh; doi cua /api/v1/* thi ERP ben kia hong ma minh khong biet. Co /v1
//     nghia la khi can doi, ta them /v2 va cho hai ban song song mot thoi gian.
//  3. Hinh dang phan hoi CO DINH: { du_lieu, phan_trang } cho danh sach, { loi: { ma,
//     thong_diep } } cho loi. `ma` la thu client doi chieu bang code — doi chu tieng Viet
//     trong `thong_diep` khong duoc lam hong ben nao.
//
// Dinh danh doi ngoai la `ma_nv`, KHONG phai `id` (uuid noi bo). ERP va he thong nhan su
// khac deu biet ma nhan vien; uuid cua ta thi khong ai biet, va lo doi CSDL la ho hong het.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import swagger from '@fastify/swagger';
import swagger_ui from '@fastify/swagger-ui';
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { can_khoa_api, ghi_lan_goi } from '../bao_mat/khoa_api.ts';
import {
  LoiKhongTim, chuoi, chuoi_bat_buoc, khoang_ngay, ngay, phan_trang, than,
} from '../tien_ich/kiem_tra.ts';

interface PhanTrang {
  gioi_han: number;
  bo_qua: number;
  tong: number;
}

function goi_ra<T>(du_lieu: T[], pt: PhanTrang): { du_lieu: T[]; phan_trang: PhanTrang } {
  return { du_lieu, phan_trang: pt };
}

/** Ma nhan vien tu duong dan. */
function lay_ma_nv(req: FastifyRequest): string {
  const p = req.params as Record<string, unknown>;
  const ma = String(p['ma_nv'] ?? '').trim();
  if (ma === '' || ma.length > 64) throw new LoiKhongTim('Không tìm thấy nhân viên.');
  return ma;
}

async function nhan_vien_theo_ma(ma_nv: string): Promise<{ id: string; ma_nv: string }> {
  const nv = await truy_van_mot<{ id: string; ma_nv: string }>(
    'select id, ma_nv from nhan_vien where lower(ma_nv) = lower($1)', [ma_nv],
  );
  if (nv === null) throw new LoiKhongTim(`Không tìm thấy nhân viên có mã "${ma_nv}".`);
  return nv;
}

// ==================================================================== chan tai lieu troi
//
// Tai lieu viet tay LUON troi khoi thuc te: them duong dan roi quen cap nhat spec la
// chuyen chac chan xay ra, va luc do Swagger con te hon khong co gi vi no noi doi mot cach
// tu tin.
//
// Chan bang cach lat nguoc van de: mot route trong /api/v1 KHONG co mo ta thi may chu
// KHONG KHOI DONG. Khong phai test co the quen chay — la dieu kien de he thong song.
export interface RouteCanKiem {
  method: string | string[];
  url: string;
  schema?: { summary?: unknown; tags?: unknown; security?: unknown; hide?: unknown };
}

export function loi_thieu_mo_ta(route: RouteCanKiem): string | null {
  const sc = route.schema;
  if (sc?.hide === true) return null;
  const thieu: string[] = [];
  if (typeof sc?.summary !== 'string' || sc.summary.trim() === '') thieu.push('summary');
  if (!Array.isArray(sc?.tags) || sc.tags.length === 0) thieu.push('tags');
  if (!Array.isArray(sc?.security) || sc.security.length === 0) thieu.push('security');
  if (thieu.length === 0) return null;
  const pt = Array.isArray(route.method) ? route.method.join('/') : route.method;
  return `Tuyến ${pt} ${route.url} thiếu ${thieu.join(', ')} trong schema. `
    + 'Mọi đường dẫn trong /api/v1 phải có mô tả OpenAPI — dùng hàm mo_ta(). '
    + 'Không muốn đưa vào tài liệu thì khai schema: { hide: true }.';
}

// ==================================================================== mo ta OpenAPI
//
// Schema o day dung de SINH TAI LIEU, khong dung de kiem tra dau vao — bo kiem tra tay
// (chuoi/so_nguyen/khoang_ngay...) tra loi tieng Viet ro hon nhieu so voi loi mac dinh cua
// Fastify. Vi vay moi tham so khai `type: 'string'` va `additionalProperties: true`: dung
// voi thuc te (tham so truy van qua HTTP von la chuoi) va khong bao gio tu choi request.
//
// Doi lai, tai lieu duoc SINH TU CHINH ROUTE. Them mot duong dan ma quen mo ta thi test
// `openapi.test.ts` bat do — day la cach duy nhat de tai lieu khong troi khoi thuc te.

type MoTaTruyVan = Record<string, string>;

function truy_van_schema(mo_ta: MoTaTruyVan): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: true,
    properties: Object.fromEntries(
      Object.entries(mo_ta).map(([k, v]) => [k, { type: 'string', description: v }]),
    ),
  };
}

const PHAN_TRANG_CHUNG: MoTaTruyVan = {
  gioi_han: 'Số bản ghi tối đa một lần gọi.',
  bo_qua: 'Bỏ qua bao nhiêu bản ghi đầu — dùng để phân trang.',
};

const KHOANG_NGAY_CHUNG: MoTaTruyVan = {
  tu: 'Ngày bắt đầu, dạng YYYY-MM-DD. Bắt buộc.',
  den: 'Ngày kết thúc, dạng YYYY-MM-DD. Bắt buộc.',
};

/** Phan hoi chi khai `description`: khong khai `type` de Fastify KHONG cat bot truong. */
function phan_hoi(mo_ta_200: string): Record<string, unknown> {
  return {
    200: { description: mo_ta_200 },
    401: { description: 'Thiếu khóa API, khóa sai, đã tắt hoặc hết hạn.' },
    403: { description: 'Khóa hợp lệ nhưng thiếu phạm vi, hoặc gọi từ IP ngoài danh sách.' },
  };
}

function mo_ta(
  tag: string,
  summary: string,
  description: string,
  pham_vi: string[],
  tuy: { querystring?: MoTaTruyVan; params?: Record<string, string>; body?: string } = {},
): Record<string, unknown> {
  const sc: Record<string, unknown> = {
    tags: [tag],
    summary,
    // Ghi thang pham vi can vao mo ta: nguoi doc tai lieu biet ngay phai cap quyen gi khi
    // tao khoa, khong phai do bang cach goi thu roi nhan 403.
    description: `${description}\n\n**Phạm vi cần:** ${pham_vi.length === 0 ? '(chỉ cần khóa hợp lệ)' : pham_vi.map((x) => `\`${x}\``).join(', ')}`,
    security: [{ khoaApi: [] }],
    response: phan_hoi('Thành công.'),
  };
  if (tuy.querystring !== undefined) sc['querystring'] = truy_van_schema(tuy.querystring);
  if (tuy.params !== undefined) {
    sc['params'] = {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(tuy.params).map(([k, v]) => [k, { type: 'string', description: v }]),
      ),
    };
  }
  if (tuy.body !== undefined) {
    sc['body'] = { type: 'object', additionalProperties: true, description: tuy.body };
  }
  return sc;
}

/**
 * Plugin Fastify — dang ky voi prefix '/api/v1'.
 */
export async function tuyen_tich_hop(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ OpenAPI + Swagger UI
  //
  // Dang ky BEN TRONG plugin nay nen chi quet cac route cua /api/v1. 97 endpoint noi bo
  // cua webapp co y KHONG duoc dua vao: chung doi theo giao dien, khong co cam ket tuong
  // thich, tai lieu hoa chung chi tao ra mot dong phai bao tri ma khong ai doc.
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Chấm công — API tích hợp',
        version: 'v1',
        description:
          'Cổng cho **hệ thống ngoài** gọi vào: ERP/kế toán, phần mềm nhân sự khác, cổng '
          + 'thông tin nội bộ.\n\n'
          + 'Xác thực bằng **khóa API** (`Authorization: Bearer ck_...`), lấy ở Webapp → '
          + 'Hệ thống → Khóa API. Mỗi bên tích hợp một khóa riêng với phạm vi tối thiểu.\n\n'
          + '**Cam kết tương thích:** trong `v1` chỉ *thêm* trường và đường dẫn. Muốn xóa '
          + 'trường hay đổi kiểu dữ liệu thì mở `v2` và chạy song song. Client nên **bỏ qua '
          + 'trường lạ** thay vì báo lỗi.',
      },
      components: {
        securitySchemes: {
          khoaApi: {
            type: 'http',
            scheme: 'bearer',
            description: 'Khóa API dạng `ck_...`. Client cũ không đặt được header '
              + '`Authorization` thì dùng `X-API-Key`.',
          },
        },
      },
      tags: [
        { name: 'Khóa', description: 'Kiểm tra khóa' },
        { name: 'Nhân viên', description: 'Đọc và đồng bộ hồ sơ nhân viên' },
        { name: 'Bảng công', description: 'Số liệu chấm công đã tính — đầu vào của tính lương' },
        { name: 'Lần quẹt', description: 'Log thô từ máy chấm công' },
        { name: 'Nghỉ phép', description: 'Đơn nghỉ đã duyệt' },
        { name: 'Sự kiện', description: 'Dòng sự kiện để đồng bộ tăng dần' },
      ],
    },
  });

  // Trang xem tai lieu. CONG KHAI co chu dich: no chi bay ra HOP DONG, khong bay ra du
  // lieu — muon goi that van phai co khoa. Dua duong dan nay cho ben tich hop la ho tu doc
  // duoc, khong phai gui file qua lai. Tat bang API_TAI_LIEU_CONG_KHAI=0 neu khong muon.
  if (cau_hinh.api_tai_lieu_cong_khai) {
    await app.register(swagger_ui, {
      routePrefix: '/tai-lieu',
      uiConfig: { docExpansion: 'list', deepLinking: true, tryItOutEnabled: true },
      staticCSP: true,
    });
  }

  // Ghi nhat ky MOI lan goi trong pham vi /api/v1, ke ca lan bi tu choi 401/403. Ben tich
  // hop bao "hom qua khong lay duoc du lieu" thi phai tra ra duoc ho co goi that khong.
  app.addHook('onRequest', async (req) => {
    (req as { _bat_dau?: number })._bat_dau = Date.now();
  });
  app.addHook('onResponse', async (req, res) => {
    const bd = (req as { _bat_dau?: number })._bat_dau ?? Date.now();
    await ghi_lan_goi(
      req.khoa_api?.id ?? null, req.url, req.method, res.statusCode, req.ip, Date.now() - bd,
    );
  });

  // Rao chan: dang ky truoc moi route khac de bat duoc tat ca.
  app.addHook('onRoute', (route) => {
    // Route noi bo cua swagger-ui (/tai-lieu/*) khong phai hop dong cua ta, bo qua.
    if (route.url.includes('/tai-lieu')) return;
    const loi = loi_thieu_mo_ta(route as unknown as RouteCanKiem);
    if (loi !== null) throw new Error(loi);
  });

  // Spec tho, KHONG can khoa API. Day la thu ben tich hop dua vao bo sinh client (openapi-
  // generator, Postman, NSwag...) — bat dang nhap o day nghia la ho phai chep tay file spec
  // qua email, dung y nghia cua viec cong bo hop dong.
  //
  // Khai `hide: true` de chinh no khong xuat hien trong tai lieu cua chinh no.
  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());

  // ------------------------------------------------------------ danh tinh khoa
  //
  // Ben tich hop goi dau tien de biet khoa cua ho con song va co nhung pham vi nao. Khong
  // co duong nay thi cach duy nhat de kiem tra la goi bua mot endpoint that.
  app.get('/toi', {
    schema: mo_ta('Khóa', 'Thông tin khóa đang dùng',
      'Trả về tên khóa và danh sách phạm vi. Gọi đường này để kiểm tra khóa còn sống trước khi chạy lô đồng bộ.',
      []),
    preHandler: can_khoa_api(),
  }, async (req) => ({
    du_lieu: {
      ten: req.khoa_api?.ten ?? null,
      pham_vi: req.khoa_api?.pham_vi ?? [],
      may_chu_luc: new Date().toISOString(),
    },
  }));

  // ------------------------------------------------------------ nhan vien
  app.get('/nhan-vien', {
    schema: mo_ta('Nhân viên', 'Danh sách nhân viên',
      'Mặc định **chỉ trả người đang làm**. Hệ thống lương lấy nhầm người đã nghỉ là tính lương cho người không còn làm việc.',
      ['nhan_vien:doc'],
      { querystring: { ...PHAN_TRANG_CHUNG,
        tim: 'Tìm theo mã nhân viên hoặc họ tên.',
        gom_da_nghi: 'Đặt `true` để lấy cả người đã nghỉ việc.' } }),
    preHandler: can_khoa_api('nhan_vien:doc'),
  }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { gioi_han, bo_qua } = phan_trang(q, 100, 500);
    const tim = chuoi(q, 'tim', { toi_da: 100 });
    // Mac dinh CHI tra nguoi dang lam. He thong luong lay nham ca nguoi da nghi thi tinh
    // luong cho nguoi khong con lam viec.
    const gom_da_nghi = String(q['gom_da_nghi'] ?? '') === 'true';

    const dieu_kien: string[] = [];
    const tham_so: unknown[] = [];
    if (!gom_da_nghi) dieu_kien.push('nv.dang_hoat_dong = true');
    if (tim !== null) {
      tham_so.push(`%${tim}%`);
      dieu_kien.push(`(nv.ma_nv ilike $${tham_so.length} or nv.ho_ten ilike $${tham_so.length})`);
    }
    const where = dieu_kien.length > 0 ? `where ${dieu_kien.join(' and ')}` : '';

    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from nhan_vien nv ${where}`, tham_so,
    );
    const dong = await truy_van(
      `select nv.ma_nv, nv.ho_ten, nv.email, nv.so_dien_thoai, nv.pin_may, nv.chuc_danh,
              nv.ngay_vao, nv.ngay_nghi_viec, nv.dang_hoat_dong, nv.ma_erp,
              pb.ten as phong_ban, cl.ten as ca_lam
         from nhan_vien nv
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ca_lam cl on cl.id = nv.ca_lam_id
         ${where}
        order by nv.ma_nv
        limit $${tham_so.length + 1} offset $${tham_so.length + 2}`,
      [...tham_so, gioi_han, bo_qua],
    );
    return goi_ra(dong, { gioi_han, bo_qua, tong: dem?.tong ?? 0 });
  });

  app.get('/nhan-vien/:ma_nv', {
    schema: mo_ta('Nhân viên', 'Chi tiết một nhân viên',
      'Định danh là **mã nhân viên**, không phải UUID nội bộ.',
      ['nhan_vien:doc'], { params: { ma_nv: 'Mã nhân viên, không phân biệt hoa thường.' } }),
    preHandler: can_khoa_api('nhan_vien:doc'),
  }, async (req) => {
    const nv = await nhan_vien_theo_ma(lay_ma_nv(req));
    const dong = await truy_van_mot(
      `select nv.ma_nv, nv.ho_ten, nv.email, nv.so_dien_thoai, nv.pin_may, nv.chuc_danh,
              nv.ngay_vao, nv.ngay_chinh_thuc, nv.ngay_nghi_viec, nv.dang_hoat_dong,
              nv.ma_erp, pb.ten as phong_ban, cl.ten as ca_lam
         from nhan_vien nv
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ca_lam cl on cl.id = nv.ca_lam_id
        where nv.id = $1`,
      [nv.id],
    );
    return { du_lieu: dong };
  });

  // ------------------------------------------------------------ bang cong
  //
  // Duong quan trong nhat: he thong luong lay o day. Tra ve theo NGAY chu khong phai da
  // tong hop san — ben kia co quy tac tinh luong rieng, dua so lieu tho de ho tu cong.
  app.get('/bang-cong', {
    schema: mo_ta('Bảng công', 'Bảng công theo từng ngày',
      'Đường hệ thống lương dùng nhiều nhất. Mặc định **chỉ trả ngày đã chốt** — ngày chưa chốt còn đổi (nhân sự sửa tay, đơn nghỉ duyệt muộn), lấy về tính lương là tính xong rồi số liệu đổi. Khoảng ngày tối đa 400 ngày.',
      ['bang_cong:doc'],
      { querystring: { ...KHOANG_NGAY_CHUNG, ...PHAN_TRANG_CHUNG,
        ma_nv: 'Lọc theo một nhân viên. Bỏ trống là lấy tất cả.',
        gom_chua_chot: 'Đặt `true` để lấy cả ngày chưa chốt.' } }),
    preHandler: can_khoa_api('bang_cong:doc'),
  }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 400);
    const { gioi_han, bo_qua } = phan_trang(q, 200, 1000);
    const ma_nv = chuoi(q, 'ma_nv', { toi_da: 64 });
    // Mac dinh CHI tra ngay da chot. Bang cong chua chot con doi khi nhan su sua tay hoac
    // co don nghi duyet sau — ben luong lay ban chua chot thi tinh xong roi so lieu doi.
    const gom_chua_chot = String(q['gom_chua_chot'] ?? '') === 'true';

    const dk = ['bc.ngay between $1 and $2'];
    const ts: unknown[] = [tu, den];
    if (!gom_chua_chot) dk.push('bc.da_chot = true');
    if (ma_nv !== null) {
      ts.push(ma_nv);
      dk.push(`lower(nv.ma_nv) = lower($${ts.length})`);
    }
    const where = `where ${dk.join(' and ')}`;

    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id ${where}`, ts,
    );
    const dong = await truy_van(
      `select nv.ma_nv, nv.ho_ten, nv.ma_erp, bc.ngay, bc.trang_thai,
              bc.gio_vao, bc.gio_ra, bc.phut_lam, bc.phut_muon, bc.phut_ve_som,
              bc.phut_ot, bc.so_cong, bc.co_dieu_chinh, bc.da_chot, bc.ghi_chu
         from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id
         ${where}
        order by bc.ngay, nv.ma_nv
        limit $${ts.length + 1} offset $${ts.length + 2}`,
      [...ts, gioi_han, bo_qua],
    );
    return goi_ra(dong, { gioi_han, bo_qua, tong: dem?.tong ?? 0 });
  });

  /** Tong hop theo thang cho mot ky luong — tien cho ERP khong muon tu cong. */
  app.get('/bang-cong/tong-hop', {
    schema: mo_ta('Bảng công', 'Tổng hợp theo tháng',
      'Cộng sẵn theo tháng cho một kỳ lương: số ngày công, tổng phút làm, tăng ca, đi muộn, về sớm.',
      ['bang_cong:doc'],
      { querystring: { thang: 'Tháng dạng `YYYY-MM`. Bắt buộc.',
        gom_chua_chot: 'Đặt `true` để tính cả ngày chưa chốt.' } }),
    preHandler: can_khoa_api('bang_cong:doc'),
  }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const thang = chuoi_bat_buoc(q, 'thang', { toi_da: 7 });
    if (!/^\d{4}-\d{2}$/.test(thang)) {
      throw new LoiKhongTim('Tham số "thang" phải có dạng YYYY-MM.');
    }
    const gom_chua_chot = String(q['gom_chua_chot'] ?? '') === 'true';
    const dong = await truy_van(
      `select nv.ma_nv, nv.ho_ten, nv.ma_erp,
              count(*) filter (where bc.trang_thai = 'co_mat')::int as ngay_co_mat,
              count(*) filter (where bc.trang_thai = 'nghi_phep')::int as ngay_nghi_phep,
              count(*) filter (where bc.trang_thai = 'vang')::int as ngay_vang,
              coalesce(sum(bc.so_cong), 0) as tong_cong,
              coalesce(sum(bc.phut_lam), 0)::int as tong_phut_lam,
              coalesce(sum(bc.phut_ot), 0)::int as tong_phut_ot,
              coalesce(sum(bc.phut_muon), 0)::int as tong_phut_muon,
              coalesce(sum(bc.phut_ve_som), 0)::int as tong_phut_ve_som,
              bool_and(bc.da_chot) as da_chot_het
         from bang_cong_ngay bc
         join nhan_vien nv on nv.id = bc.nhan_vien_id
        where to_char(bc.ngay, 'YYYY-MM') = $1
          and ($2::bool or bc.da_chot = true)
        group by nv.ma_nv, nv.ho_ten, nv.ma_erp
        order by nv.ma_nv`,
      [thang, gom_chua_chot],
    );
    return { du_lieu: dong, thang };
  });

  // ------------------------------------------------------------ lan quet tho
  app.get('/lan-quet', {
    schema: mo_ta('Lần quẹt', 'Log quẹt thô từ máy',
      'Dữ liệu gốc chưa qua bộ tính công. Khoảng ngày tối đa **92 ngày** một lần gọi vì dữ liệu này rất dày.',
      ['lan_quet:doc'],
      { querystring: { ...KHOANG_NGAY_CHUNG, ...PHAN_TRANG_CHUNG,
        ma_nv: 'Lọc theo một nhân viên.' } }),
    preHandler: can_khoa_api('lan_quet:doc'),
  }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 92);
    const { gioi_han, bo_qua } = phan_trang(q, 200, 1000);
    const ma_nv = chuoi(q, 'ma_nv', { toi_da: 64 });

    const dk = ['lq.thoi_diem >= $1::date', 'lq.thoi_diem < ($2::date + 1)'];
    const ts: unknown[] = [tu, den];
    if (ma_nv !== null) {
      ts.push(ma_nv);
      dk.push(`lower(nv.ma_nv) = lower($${ts.length})`);
    }
    const where = `where ${dk.join(' and ')}`;

    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from lan_quet lq
         left join nhan_vien nv on nv.id = lq.nhan_vien_id ${where}`, ts,
    );
    const dong = await truy_van(
      `select lq.thoi_diem, lq.pin_may, nv.ma_nv, nv.ho_ten, lq.nguon,
              lq.thiet_bi_serial, lq.trang_thai, lq.xac_thuc
         from lan_quet lq
         left join nhan_vien nv on nv.id = lq.nhan_vien_id
         ${where}
        order by lq.thoi_diem desc
        limit $${ts.length + 1} offset $${ts.length + 2}`,
      [...ts, gioi_han, bo_qua],
    );
    return goi_ra(dong, { gioi_han, bo_qua, tong: dem?.tong ?? 0 });
  });

  // ------------------------------------------------------------ nghi phep da duyet
  app.get('/nghi-phep', {
    schema: mo_ta('Nghỉ phép', 'Đơn nghỉ đã duyệt',
      'Chỉ trả đơn ở trạng thái `da_duyet`. Đơn chờ duyệt chưa phải sự thật, không nên đưa vào tính lương.',
      ['nghi_phep:doc'],
      { querystring: { ...KHOANG_NGAY_CHUNG, ...PHAN_TRANG_CHUNG } }),
    preHandler: can_khoa_api('nghi_phep:doc'),
  }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { tu, den } = khoang_ngay(q, 400);
    const { gioi_han, bo_qua } = phan_trang(q, 200, 1000);

    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from don_nghi_phep d
         join nhan_vien nv on nv.id = d.nhan_vien_id
        where d.trang_thai = 'da_duyet' and d.tu_ngay <= $2 and d.den_ngay >= $1`,
      [tu, den],
    );
    const dong = await truy_van(
      `select nv.ma_nv, nv.ho_ten, nv.ma_erp, d.loai, d.tu_ngay, d.den_ngay,
              d.nua_ngay, d.ly_do, d.quyet_luc as duyet_luc
         from don_nghi_phep d
         join nhan_vien nv on nv.id = d.nhan_vien_id
        where d.trang_thai = 'da_duyet' and d.tu_ngay <= $2 and d.den_ngay >= $1
        order by d.tu_ngay, nv.ma_nv
        limit $3 offset $4`,
      [tu, den, gioi_han, bo_qua],
    );
    return goi_ra(dong, { gioi_han, bo_qua, tong: dem?.tong ?? 0 });
  });

  // ------------------------------------------------------------ nguon su kien (pull)
  //
  // Ben tich hop khong nhan webhook duoc (nam sau tuong lua, hoac khong muon mo cong vao)
  // thi hoi o day: dua `tu_id` cua lan truoc, nhan cac su kien moi hon. Con so `tu_id` do
  // ho tu luu — ta khong giu con tro cho tung ben, nen nhieu ben doc chung mot dong su
  // kien ma khong dam nhau.
  app.get('/su-kien', {
    schema: mo_ta('Sự kiện', 'Kéo dòng sự kiện về',
      'Dùng khi bên tích hợp không nhận webhook được. Tự lưu `id_cuoi` rồi lần sau truyền vào `tu_id`. Hệ thống **không giữ con trỏ cho từng bên**, nên nhiều hệ thống cùng đọc mà không đạp nhau. Hết dữ liệu thì `id_cuoi` là `null` — giữ nguyên con trỏ cũ, đừng nhảy về 0.',
      ['su_kien:doc'],
      { querystring: { tu_id: 'Chỉ lấy sự kiện có id lớn hơn số này. Lần đầu truyền `0`.',
        loai: 'Lọc theo loại, ví dụ `bang_cong.da_chot`.',
        gioi_han: 'Số sự kiện tối đa một lần gọi.' } }),
    preHandler: can_khoa_api('su_kien:doc'),
  }, async (req) => {
    const q = req.query as Record<string, unknown>;
    const { gioi_han } = phan_trang(q, 100, 500);
    const tu_id = Number.parseInt(String(q['tu_id'] ?? '0'), 10);
    if (!Number.isInteger(tu_id) || tu_id < 0) {
      throw new LoiKhongTim('Tham số "tu_id" phải là số nguyên không âm.');
    }
    const loai = chuoi(q, 'loai', { toi_da: 64 });

    const dong = await truy_van<{ id: string }>(
      `select id, loai_su_kien, du_lieu, tao_luc
         from hop_thu_di
        where id > $1 and ($2::text is null or loai_su_kien = $2)
        order by id
        limit $3`,
      [tu_id, loai, gioi_han],
    );
    // `id_cuoi` de ben kia luu lai cho lan hoi sau. Tra ve null khi het du lieu de ho biet
    // giu nguyen con tro cu chu khong nhay ve 0.
    return {
      du_lieu: dong,
      id_cuoi: dong.length > 0 ? dong[dong.length - 1]!.id : null,
      con_nua: dong.length === gioi_han,
    };
  });

  // ------------------------------------------------------------ ghi: dong bo nhan vien
  //
  // Cho he thong nhan su khac day nguoi sang. Dung UPSERT theo ma_nv: goi lai cung mot ban
  // ghi khong tao them nguoi moi, nen ben kia chay lai lo dong bo thoai mai.
  //
  // KHONG cho xoa qua API: xoa nhan vien keo theo lan quet va bang cong. Muon cho nghi thi
  // dat `dang_hoat_dong = false` — du lieu cham cong cu van con de doi chieu ve sau.
  app.put('/nhan-vien/:ma_nv', {
    schema: mo_ta('Nhân viên', 'Tạo hoặc cập nhật nhân viên',
      'Upsert theo mã nhân viên: chưa có thì tạo (bắt buộc `ho_ten`), có rồi thì cập nhật. Gọi lại cùng bản ghi không tạo thêm người mới.\n\n**Trường không gửi thì giữ nguyên**, không bị xóa trắng — gửi thiếu mà mất `pin_may` là mất chấm công của người đó.\n\nKhông có đường xóa: cho nghỉ việc thì đặt `dang_hoat_dong: false`.',
      ['nhan_vien:ghi'],
      { params: { ma_nv: 'Mã nhân viên.' },
        body: 'Các trường: ho_ten, email, so_dien_thoai, chuc_danh, pin_may, ma_erp, ngay_vao, ngay_nghi_viec, dang_hoat_dong.' }),
    preHandler: can_khoa_api('nhan_vien:ghi'),
  }, async (req) => {
    const ma_nv = lay_ma_nv(req);
    const b = than(req.body);

    const ho_ten = chuoi(b, 'ho_ten', { toi_da: 200 });
    const email = chuoi(b, 'email', { toi_da: 200 });
    const so_dien_thoai = chuoi(b, 'so_dien_thoai', { toi_da: 30 });
    const chuc_danh = chuoi(b, 'chuc_danh', { toi_da: 200 });
    const pin_may = chuoi(b, 'pin_may', { toi_da: 32 });
    const ma_erp = chuoi(b, 'ma_erp', { toi_da: 64 });
    const ngay_vao = ngay(b, 'ngay_vao');
    const ngay_nghi_viec = ngay(b, 'ngay_nghi_viec');
    const dang_hoat_dong = b['dang_hoat_dong'];

    const co = await truy_van_mot<{ id: string }>(
      'select id from nhan_vien where lower(ma_nv) = lower($1)', [ma_nv],
    );

    if (co === null) {
      if (ho_ten === null) {
        throw new LoiKhongTim('Tạo nhân viên mới cần "ho_ten".');
      }
      const moi = await truy_van_mot<{ ma_nv: string }>(
        `insert into nhan_vien
           (ma_nv, ho_ten, email, so_dien_thoai, chuc_danh, pin_may, ma_erp, ngay_vao)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning ma_nv`,
        [ma_nv, ho_ten, email, so_dien_thoai, chuc_danh, pin_may, ma_erp, ngay_vao],
      );
      return { du_lieu: moi, da_tao: true };
    }

    // coalesce: truong khong gui thi GIU NGUYEN, khong xoa trang. He thong nhan su ben kia
    // thuong chi biet mot phan thong tin — gui thieu ma bi xoa mat PIN may la mat cham cong.
    const sua = await truy_van_mot<{ ma_nv: string }>(
      `update nhan_vien set
         ho_ten = coalesce($2, ho_ten),
         email = coalesce($3, email),
         so_dien_thoai = coalesce($4, so_dien_thoai),
         chuc_danh = coalesce($5, chuc_danh),
         pin_may = coalesce($6, pin_may),
         ma_erp = coalesce($7, ma_erp),
         ngay_vao = coalesce($8, ngay_vao),
         ngay_nghi_viec = coalesce($9, ngay_nghi_viec),
         dang_hoat_dong = coalesce($10, dang_hoat_dong)
       where id = $1 returning ma_nv`,
      [co.id, ho_ten, email, so_dien_thoai, chuc_danh, pin_may, ma_erp, ngay_vao,
        ngay_nghi_viec, typeof dang_hoat_dong === 'boolean' ? dang_hoat_dong : null],
    );
    return { du_lieu: sua, da_tao: false };
  });

  // Duong dan la trong /api/v1 cung phai tra JSON dung hinh dang, khong phai trang 404 la.
  app.setNotFoundHandler(async (_req: FastifyRequest, res: FastifyReply) => {
    await res.code(404).send({
      loi: { ma: 'khong_co_duong_dan', thong_diep: 'Đường dẫn không tồn tại trong API v1.' },
    });
  });
}
