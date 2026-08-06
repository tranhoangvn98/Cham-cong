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
import { tiep_nhan_attlog } from './tiep_nhan.ts';

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

    if (bang === 'OPTIONS' || bang === '') {
      const tt = doc_thong_tin_may(body);
      await cham_thiet_bi(
        sn,
        tt['firmver'] ?? tt['fwversion'] ?? null,
        tt['ipaddress'] ?? req.ip,
      );
      return tra_text(res, 'OK\n');
    }

    // OPERLOG / ATTPHOTO / bang khac: xac nhan da nhan de may khong gui lai mai.
    await cham_thiet_bi(sn, null, req.ip);
    req.log.debug({ sn, bang, dai: body.length }, 'nhan bang khac, bo qua');
    return tra_text(res, 'OK\n');
  });

  // -------------------------------------------------- may hoi lenh can thuc thi
  app.get('/getrequest', async (req, res) => {
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
  });

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
