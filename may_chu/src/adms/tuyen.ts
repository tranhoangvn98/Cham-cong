// Be mat HTTP giao thuc ADMS ma may ZKTeco ket noi toi.
//
// Cau hinh tren may: Menu > Comm > Cloud Server / ADMS
//   Server Mode: ADMS | Server Address: IP may chu | Port: 8080 | bat Realtime.
//
// Bao mat: whitelist theo serial (may chua khai bao -> 401). Nen dat sau reverse proxy.
// Nhieu firmware coi phan hoi khac "OK"/block cau hinh la loi, nen luon tra text/plain.
//
// QUAN TRONG: cai dat duoi dang PLUGIN de parser "text tho" chi ap dung trong pham vi
// /iclock. Neu dang ky parser bat ky ('*') o goc, JSON va multipart cua REST API se hong.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import {
  dinh_dang_lenh,
  doc_ket_qua_lenh,
  doc_thong_tin_may,
  dung_phan_hoi_handshake,
} from './giao_thuc.ts';
import { tiep_nhan_attlog, tiep_nhan_rtlog, tiep_nhan_userinfo } from './tiep_nhan.ts';
import { ip_duoc_phep } from '../tien_ich/dia_chi_ip.ts';

interface DongThietBi {
  id: string;
  serial: string;
}

function tra_text(res: FastifyReply, noi_dung: string, ma = 200): FastifyReply {
  return res.code(ma).type('text/plain; charset=utf-8').send(noi_dung);
}

function lay_serial(req: FastifyRequest): string {
  const q = req.query as Record<string, unknown>;
  // Firmware khac nhau dung 'SN' hoac 'sn'.
  const sn = q['SN'] ?? q['sn'];
  return typeof sn === 'string' ? sn.trim() : '';
}

/** Tra ve thiet bi neu serial da khai bao va dang bat, nguoc lai null. */
async function may_hop_le(serial: string): Promise<DongThietBi | null> {
  if (serial.length === 0 || serial.length > 64) return null;
  return truy_van_mot<DongThietBi>(
    'select id, serial from thiet_bi where serial = $1 and dang_bat = true',
    [serial],
  );
}

async function cham_thiet_bi(
  serial: string,
  firmware: string | null,
  ip: string | null,
): Promise<void> {
  await thuc_thi(
    `update thiet_bi
        set thay_lan_cuoi = now(),
            phien_ban_firmware = coalesce($2, phien_ban_firmware),
            dia_chi_ip = coalesce($3, dia_chi_ip)
      where serial = $1`,
    [serial, firmware, ip],
  );
}

/**
 * Plugin Fastify — dang ky voi prefix '/iclock':
 *   app.register(tuyen_adms, { prefix: '/iclock' })
 */
export async function tuyen_adms(app: FastifyInstance): Promise<void> {
  // ---------------------------------------------------- lop chan theo IP (Task B5)
  //
  // Cong nay chi co MOT lop chan la whitelist theo serial. Du khi may chu dat trong LAN,
  // nhung dat tren VPS thi /iclock phoi ra Internet — serial ma lot ra la bat ky ai cung
  // POST duoc lan quet gia vao bang cong, tuc la vao co so tinh luong.
  //
  // Khong the chan bang tuong lua: cong 8080 con phuc vu /api/* cho dien thoai va may
  // nhan su o moi noi, ma tuong lua khong phan biet duong dan.
  //
  // Chan o day chu khong o tung route: hook cua plugin ap cho MOI route trong /iclock,
  // ke ca route them sau nay.
  if (cau_hinh.iclock_ip_cho_phep.length > 0) {
    app.addHook('onRequest', async (req, res) => {
      if (!ip_duoc_phep(req.ip, cau_hinh.iclock_ip_cho_phep)) {
        req.log.warn({ ip: req.ip, url: req.url }, 'chan /iclock: IP khong trong danh sach');
        // Tra 403 dang text/plain: firmware coi phan hoi khac la loi va se thu lai,
        // nhung khong duoc lam no tuong da gui thanh cong.
        return tra_text(res, 'Forbidden\n', 403);
      }
    });
  }

  // Body cua may la text tho, KHONG phai JSON. Parser nay chi song trong pham vi plugin.
  app.addContentTypeParser(
    ['text/plain', 'application/x-www-form-urlencoded', 'application/octet-stream'],
    { parseAs: 'string', bodyLimit: 4 * 1024 * 1024 },
    (_req, body, xong) => {
      xong(null, body);
    },
  );
  // Nhieu firmware gui Content-Type rong hoac la. Bat het phan con lai ve text.
  app.addContentTypeParser(
    /^.*$/,
    { parseAs: 'string', bodyLimit: 4 * 1024 * 1024 },
    (_req, body, xong) => {
      xong(null, body);
    },
  );

  // -------------------------------------------------- handshake khi may khoi dong
  app.get('/cdata', async (req, res) => {
    const sn = lay_serial(req);
    const may = await may_hop_le(sn);
    if (may === null) {
      req.log.warn({ sn }, 'may chua khai bao goi cdata');
      return tra_text(res, 'Unauthorized\n', 401);
    }
    await cham_thiet_bi(sn, null, req.ip);
    return tra_text(res, dung_phan_hoi_handshake(sn, cau_hinh.device_tz_offset_hours));
  });

  // -------------------------------------------------- may day du lieu len
  app.post('/cdata', async (req, res) => {
    const sn = lay_serial(req);
    const may = await may_hop_le(sn);
    if (may === null) {
      req.log.warn({ sn }, 'may chua khai bao day cdata');
      return tra_text(res, 'Unauthorized\n', 401);
    }

    const q = req.query as Record<string, unknown>;
    const bang = String(q['table'] ?? '').toUpperCase();
    const body = typeof req.body === 'string' ? req.body : '';

    if (bang === 'ATTLOG') {
      const kq = await tiep_nhan_attlog(sn, body);
      req.log.info({ sn, ...kq }, 'nhan ATTLOG');
      if (kq.chua_map_pin.length > 0) {
        req.log.warn({ sn, pin: kq.chua_map_pin }, 'co PIN chua map nhan vien');
      }
      // May doi dang "OK: <so ban ghi>" de biet server da nhan.
      return tra_text(res, `OK: ${kq.da_nhan}\n`);
    }

    // Firmware PUSH kiem soat ra vao day cham cong bang table=rtlog, KHONG phai ATTLOG.
    if (bang === 'RTLOG') {
      const kq = await tiep_nhan_rtlog(sn, body);
      await cham_thiet_bi(sn, null, req.ip);
      if (kq.tong > 0) {
        req.log.info({ sn, ...kq }, 'nhan RTLOG');
        if (kq.chua_map_pin.length > 0) {
          req.log.warn({ sn, pin: kq.chua_map_pin }, 'co PIN chua map nhan vien');
        }
      } else if (body.trim().length > 0) {
        // Than khong rong ma khong doc ra ban ghi nao = dinh dang khac du doan. Ghi
        // nguyen van de con sua, thay vi bo qua roi khong ai biet.
        req.log.warn({ sn, than: body.slice(0, 500) }, 'RTLOG khong doc duoc ban ghi nao');
      }
      return tra_text(res, `OK: ${kq.da_nhan}\n`);
    }

    if (bang === 'OPTIONS' || bang === '') {
      const tt = doc_thong_tin_may(body);
      await cham_thiet_bi(
        sn,
        tt['firmver'] ?? tt['fwversion'] ?? null,
        tt['ipaddress'] ?? req.ip,
      );
      return tra_text(res, 'OK\n');
    }

    // rtstate la nhip tim trang thai may, den vai lan moi giay va khong mang du lieu cham
    // cong — im lang de khong lam ngap log.
    if (bang === 'RTSTATE') {
      await cham_thiet_bi(sn, null, req.ip);
      return tra_text(res, 'OK\n');
    }

    // USERINFO: danh sach user enroll tren may (sau lenh query user, hoac khi enroll/xoa user).
    // Luu de DOI CHIEU voi mapping he thong -> phat hien trung/lech PIN.
    //
    // Ten bang khac nhau theo firmware (USERINFO / USER / USERDATA...), va co firmware day user
    // qua OPERLOG voi dong "USER PIN=...". Nen KHONG chi tin ten bang: bat ca khi THAN co dong
    // dinh danh nguoi dung (PIN=... kem Name=/Card=/Pri=). Chi lam o day, SAU khi ATTLOG/rtlog da
    // duoc xu ly rieng — nen khong nham voi ban ghi cham cong.
    const co_dong_user = /(^|\n)\s*(USER\s+|USERINFO\s+)?PIN=[^\t\n]*\t[^\n]*\b(Name|Card(No)?|Pri(vilege)?)=/i
      .test(body);
    if (bang === 'USERINFO' || bang === 'USER' || bang === 'USERDATA'
        || (co_dong_user && bang !== 'ATTLOG' && bang !== 'RTLOG')) {
      await cham_thiet_bi(sn, null, req.ip);
      const kq = await tiep_nhan_userinfo(sn, body);
      req.log.info({ sn, bang, ...kq }, 'nhan USERINFO');
      return tra_text(res, 'OK\n');
    }

    // Bang khac (OPERLOG khong co user, ATTPHOTO, tabledata...): xac nhan da nhan de may khong
    // gui lai mai. Ghi muc info chu khong phai debug: production chay o muc info, de debug thi
    // mot bang mang du lieu that bi bo qua se khong de lai dau vet nao — dung loi da lam
    // moi lan quet bi vut im lang truoc khi ho tro rtlog.
    await cham_thiet_bi(sn, null, req.ip);
    if (body.trim().length > 0) {
      req.log.info({ sn, bang, dai: body.length }, 'nhan bang chua xu ly, bo qua');
    }
    return tra_text(res, 'OK\n');
  });

  // -------------------------------------------------- ket qua DATA QUERY (dong may acc)
  //
  // May kiem soat ra vao (DeviceType=acc, PUSH 3.x) KHONG day ket qua `DATA QUERY
  // tablename=user,...` vao /cdata nhu dong cham cong (att), ma vao ENDPOINT RIENG
  // POST /iclock/querydata?tablename=user. Than la cac dong `Pin=..⇥CardNo=..⇥Name=..⇥
  // Privilege=..`. Thieu route nay thi ket qua roi vao setNotFoundHandler (404) va
  // danh sach user khong bao gio ve — dung nhu vi sao may kho tra count=0 du lenh chay.
  //
  // Bat ca GET lan POST: mot so firmware hoi endpoint bang GET truoc khi day.
  async function nhan_querydata(req: FastifyRequest, res: FastifyReply): Promise<FastifyReply> {
    const sn = lay_serial(req);
    const may = await may_hop_le(sn);
    if (may === null) {
      req.log.warn({ sn }, 'may chua khai bao goi querydata');
      return tra_text(res, 'Unauthorized\n', 401);
    }
    await cham_thiet_bi(sn, null, req.ip);
    const bang = String((req.query as Record<string, unknown>)['tablename'] ?? '').toLowerCase();
    const body = typeof req.body === 'string' ? req.body : '';
    // Chi bang user moi chua dinh danh nguoi dung. Cac bang khac (transaction, userauthorize,
    // templatev10...) xac nhan da nhan de may khong day lai mai, nhung khong xu ly.
    if ((bang === 'user' || bang === '') && body.trim().length > 0) {
      const kq = await tiep_nhan_userinfo(sn, body);
      req.log.info({ sn, bang, ...kq }, 'nhan querydata user');
    } else if (body.trim().length > 0) {
      req.log.info({ sn, bang, dai: body.length }, 'nhan querydata bang khac, bo qua');
    }
    return tra_text(res, 'OK\n');
  }
  app.post('/querydata', nhan_querydata);
  app.get('/querydata', nhan_querydata);

  // -------------------------------------------------- may hoi lenh can thuc thi
  /**
   * Lay lenh dang cho cho mot may va danh dau da gui.
   *
   * Tach rieng vi co HAI duong may hoi lenh, tuy doi firmware: `GET /getrequest` (PUSH 2.x)
   * va `POST /push` (PUSH 3.x). Cung mot hang doi, cung mot dinh dang tra ve.
   */
  async function lay_lenh_cho_may(req: FastifyRequest, res: FastifyReply): Promise<FastifyReply> {
    const sn = lay_serial(req);
    const may = await may_hop_le(sn);
    if (may === null) return tra_text(res, 'Unauthorized\n', 401);

    await cham_thiet_bi(sn, null, req.ip);

    // Nhan lenh bang mot cau UPDATE nguyen tu: hai lan poll lien tiep khong lay trung lenh.
    const lenh = await truy_van<{ id: number; lenh: string }>(
      `update lenh_thiet_bi
          set gui_luc = now()
        where id in (
          select id from lenh_thiet_bi
           where thiet_bi_serial = $1 and gui_luc is null
           order by id
           limit 20
           for update skip locked
        )
        returning id, lenh`,
      [sn],
    );

    if (lenh.length === 0) return tra_text(res, 'OK\n');

    req.log.info({ sn, so_lenh: lenh.length }, 'gui lenh xuong may');
    return tra_text(res, lenh.map((l) => dinh_dang_lenh(l.id, l.lenh)).join(''));
  }

  app.get('/getrequest', async (req, res) => lay_lenh_cho_may(req, res));

  // -------------------------------------------------- kenh hoi lenh cua PUSH 3.x
  //
  // Firmware doi moi KHONG goi getrequest. No hoi lenh bang POST /iclock/push, than tin
  // nhan rong. May NYU7261300256 goi duong nay 2 lan moi 15 giay; chua co endpoint thi
  // nhan 404 va lam lai ca chu ky cdata -> registry -> push, khong bao gio day ATTLOG.
  //
  // Cung hang doi voi getrequest nen mot lenh chi di xuong dung mot lan, du may dung duong
  // nao. Ghi lai truy van + than tin nhan: neu dinh dang tra ve con chua vua y firmware thi
  // day la du lieu de doi chieu, khoi phai doi them mot vong thu nghiem tai van phong.
  const hoi_lenh_push = async (req: FastifyRequest, res: FastifyReply): Promise<FastifyReply> => {
    req.log.info(
      { truy_van: req.query, than: String(req.body ?? '').slice(0, 300) },
      'may hoi lenh qua /push',
    );
    return lay_lenh_cho_may(req, res);
  };
  app.post('/push', hoi_lenh_push);
  app.get('/push', hoi_lenh_push);

  // -------------------------------------------------- may bao ket qua lenh
  app.post('/devicecmd', async (req, res) => {
    const sn = lay_serial(req);
    const may = await may_hop_le(sn);
    if (may === null) return tra_text(res, 'Unauthorized\n', 401);

    const body = typeof req.body === 'string' ? req.body : '';
    for (const r of doc_ket_qua_lenh(body)) {
      await thuc_thi(
        `update lenh_thiet_bi
            set ma_tra_ve = $2, bao_luc = now()
          where id = $1 and thiet_bi_serial = $3`,
        [r.id, r.ma_tra_ve, sn],
      );
      if (r.ma_tra_ve !== 0) {
        req.log.warn({ sn, id: r.id, lenh: r.lenh, ma: r.ma_tra_ve }, 'may bao lenh that bai');
      }
    }
    await cham_thiet_bi(sn, null, req.ip);
    return tra_text(res, 'OK\n');
  });

  // Mot so firmware goi ping truoc khi lam viec.
  app.get('/ping', async (req, res) => {
    const sn = lay_serial(req);
    if (sn.length > 0) await cham_thiet_bi(sn, null, req.ip);
    return tra_text(res, 'OK\n');
  });

  // -------------------------------------------------- dang ky may (PUSH >= 2.x)
  //
  // Firmware doi moi (SenseFace/SpeedFace, pushver 3.x, DeviceType=acc) mo phien bang
  // POST /iclock/registry TRUOC khi chiu lam viec. Khong tra loi duoc thi may coi nhu dang
  // ky that bai va lam lai tu dau sau moi ErrorDelay giay — vong lap vo tan
  // "GET /cdata -> POST /registry -> cho -> lap lai", khong bao gio sang getrequest hay day
  // ATTLOG. Gap dung tinh huong nay khi dau noi may NYU7261300256 (lap lai moi 15 giay).
  //
  // May chi can mot dong "RegistryCode=<ma>". Dung luon serial lam ma: no on dinh qua cac
  // lan khoi dong lai nen may khong phai dang ky lai, va khong them mot cot CSDL chi de
  // sinh so ngau nhien.
  app.post('/registry', async (req, res) => {
    const sn = lay_serial(req);
    const may = await may_hop_le(sn);
    if (may === null) {
      req.log.warn({ sn }, 'may chua khai bao goi registry');
      return tra_text(res, 'Unauthorized\n', 401);
    }
    // Than tin nhan mang thong tin may (kieu may, firmware...) — ghi lai de con doi chieu.
    const tt = doc_thong_tin_may(typeof req.body === 'string' ? req.body : '');
    await cham_thiet_bi(sn, tt['firmver'] ?? tt['fwversion'] ?? null, req.ip);
    req.log.info({ sn, thong_tin: tt }, 'may dang ky (registry)');
    return tra_text(res, `RegistryCode=${sn}\n`);
  });

  // -------------------------------------------------- endpoint chua ho tro
  //
  // Fastify tra 404 kem body JSON cho duong dan la. Voi may ZKTeco day la loi CAM: may chi
  // thu lai mai, con phia may chu khong co dau vet nao ngoai dong log request tho — dung
  // mot endpoint thieu ma mat nhieu gio moi lan ra.
  //
  // Bat lai o day de ghi RO endpoint nao con thieu, va tra text/plain thay vi JSON.
  app.setNotFoundHandler(async (req, res) => {
    req.log.error(
      {
        url: req.url,
        method: req.method,
        sn: lay_serial(req),
        than: String(req.body ?? '').slice(0, 500),
      },
      'may goi endpoint /iclock chua ho tro — can bo sung',
    );
    return tra_text(res, 'Not Found\n', 404);
  });
}

/** Dua mot lenh vao hang doi cho may. Tra ve id lenh de theo dau ket qua. */
export async function xep_lenh(serial: string, lenh: string): Promise<number> {
  const dong = await truy_van_mot<{ id: number }>(
    'insert into lenh_thiet_bi(thiet_bi_serial, lenh) values ($1, $2) returning id',
    [serial, lenh],
  );
  if (dong === null) throw new Error('Không xếp được lệnh vào hàng đợi.');
  return dong.id;
}
