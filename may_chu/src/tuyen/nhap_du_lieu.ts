// Nhap hang loat tu tep: danh sach nhan vien, va lich su cham cong cu.
//
// Ca hai duong deu co CHE DO XEM TRUOC: kiem tra toan bo tep, bao tung dong se ra sao,
// nhung khong ghi gi. Nhap mu vao du lieu luong la duong nhanh nhat den mot bang cong sai
// ma khong ai biet sai tu dau.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { tiep_nhan_attlog } from '../adms/tiep_nhan.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { sap_xep_kho } from '../ho_so/sap_xep_tep.ts';
import { chuan_hoa_tieu_de, doi_chieu_cot, tach_csv, type DongCsv } from '../tien_ich/csv.ts';
import { chuoi, chuoi_bat_buoc, luan_ly, than, LoiDauVao } from '../tien_ich/kiem_tra.ts';
import { gan_ma_am_tham } from '../dinh_danh/nghiep_vu.ts';

/** Tran so dong mot lan nhap — de mot tep nham khong khoa CSDL hang phut. */
const TOI_DA_DONG = 5000;

interface KetQuaDong {
  dong: number;
  ma_nv: string;
  ho_ten: string;
  /** tao | cap_nhat | loi */
  viec: 'tao' | 'cap_nhat' | 'loi';
  loi: string | null;
}

const COT_NHAN_VIEN: Record<string, string[]> = {
  ma_nv: ['ma_nv', 'ma nv', 'ma nhan vien', 'manv', 'employee id', 'id'],
  ho_ten: ['ho_ten', 'ho ten', 'ho va ten', 'ten', 'full name', 'name'],
  pin_may: ['pin_may', 'pin may', 'pin', 'user id', 'userid', 'so the'],
  email: ['email', 'thu dien tu', 'mail'],
  so_dien_thoai: ['so_dien_thoai', 'so dien thoai', 'dien thoai', 'phone', 'sdt'],
  phong_ban: ['phong_ban', 'phong ban', 'bo phan', 'department'],
  ca_lam: ['ca_lam', 'ca lam', 'ca lam viec', 'ca', 'shift'],
  ngay_vao: ['ngay_vao', 'ngay vao', 'ngay vao lam', 'start date'],
  cham_cong_dien_thoai: ['cham_cong_dien_thoai', 'cham cong dien thoai', 'dien thoai gps'],
};

export async function tuyen_nhap_du_lieu(app: FastifyInstance): Promise<void> {
  // ============================================================ nhan vien
  /**
   * Nhap danh sach nhan vien tu CSV.
   *
   * Doi chieu theo `ma_nv`: da co thi cap nhat, chua co thi tao. Khong bao gio xoa ai —
   * nguoi nghi viec phai xu ly bang chuc nang "cho nghi viec" de giu lai bang cong cu.
   */
  app.post('/nhap/nhan-vien', {
    preHandler: can_nhan_su,
    // Mac dinh toan may chu la 4MB — du cho danh sach nhan vien, khai lai cho ro rang.
    bodyLimit: 6 * 1024 * 1024,
  }, async (req) => {
    const b = than(req.body);
    const noi_dung = chuoi_bat_buoc(b, 'noi_dung', { toi_da: 4_000_000 });
    const xem_truoc = luan_ly(b, 'xem_truoc', true) as boolean;
    // Tao phong ban / ca lam chua co. Mac dinh TAT: mot loi chinh ta trong tep se de lai
    // mot phong ban rac ma khong ai de y.
    const tao_thieu = luan_ly(b, 'tao_thieu', false) as boolean;

    const dong = tach_csv(noi_dung);
    if (dong.length < 2) throw new LoiDauVao('Tệp phải có dòng tiêu đề và ít nhất một dòng dữ liệu.');
    if (dong.length - 1 > TOI_DA_DONG) {
      throw new LoiDauVao(`Tối đa ${TOI_DA_DONG} dòng mỗi lần nhập. Tệp đang có ${dong.length - 1}.`);
    }

    const cot = doi_chieu_cot(dong[0] as DongCsv, COT_NHAN_VIEN);
    if (cot['ma_nv'] === -1 || cot['ho_ten'] === -1) {
      throw new LoiDauVao(
        'Tệp phải có cột "Mã NV" và "Họ tên". Đang thấy: ' + (dong[0] ?? []).join(', '),
      );
    }

    // Nap san danh muc de khong truy van tung dong.
    const pb = new Map((await truy_van<{ id: string; ten: string }>('select id, ten from phong_ban'))
      .map((x) => [chuan_hoa_tieu_de(x.ten), x.id]));
    const ca = new Map((await truy_van<{ id: string; ten: string }>(
      'select id, ten from ca_lam where dang_hoat_dong = true'))
      .map((x) => [chuan_hoa_tieu_de(x.ten), x.id]));
    // Kem `ho_ten` cu: can no de biet dong nay co THAT SU doi ten khong. Mot tep nhap lai
    // nguyen si — chuyen thuong xay ra khi nhan su sua vai o roi xuat lai ca danh sach — se
    // sinh mot su kien `doi_ten` cho MOI dong neu khong so, va cong nhan ca nghin dong khong
    // noi len dieu gi.
    const da_co = new Map((await truy_van<{ id: string; ma_nv: string; ho_ten: string }>(
      'select id, ma_nv, ho_ten from nhan_vien'))
      .map((x) => [x.ma_nv.toLowerCase(), { id: x.id, ho_ten: x.ho_ten }]));
    const pin_da_dung = new Map((await truy_van<{ id: string; pin_may: string }>(
      'select id, pin_may from nhan_vien where pin_may is not null'))
      .map((x) => [x.pin_may, x.id]));

    const ket_qua: KetQuaDong[] = [];
    const ma_trong_tep = new Set<string>();
    const pin_trong_tep = new Map<string, number>();

    for (let i = 1; i < dong.length; i++) {
      const d = dong[i] as DongCsv;
      const lay = (k: string): string => (cot[k] === -1 ? '' : (d[cot[k] as number] ?? '').trim());

      const ma_nv = lay('ma_nv');
      const ho_ten = lay('ho_ten');
      const so_dong = i + 1;
      const bao_loi = (loi: string): void => {
        ket_qua.push({ dong: so_dong, ma_nv, ho_ten, viec: 'loi', loi });
      };

      if (ma_nv === '' || ho_ten === '') { bao_loi('Thiếu mã nhân viên hoặc họ tên.'); continue; }
      if (ma_trong_tep.has(ma_nv.toLowerCase())) { bao_loi('Mã nhân viên bị lặp trong chính tệp này.'); continue; }
      ma_trong_tep.add(ma_nv.toLowerCase());

      const pin = lay('pin_may');
      if (pin !== '' && !/^[0-9]{1,20}$/.test(pin)) {
        bao_loi('PIN máy chỉ được gồm chữ số.'); continue;
      }
      const hien_co = da_co.get(ma_nv.toLowerCase()) ?? null;
      const id_hien_co = hien_co?.id ?? null;
      if (pin !== '') {
        const dong_truoc = pin_trong_tep.get(pin);
        if (dong_truoc !== undefined) {
          bao_loi(`PIN ${pin} trùng với dòng ${dong_truoc} trong tệp.`); continue;
        }
        pin_trong_tep.set(pin, so_dong);
        const chu_pin = pin_da_dung.get(pin);
        if (chu_pin !== undefined && chu_pin !== id_hien_co) {
          bao_loi(`PIN ${pin} đang thuộc về một nhân viên khác trong hệ thống.`); continue;
        }
      }

      const ten_pb = lay('phong_ban');
      const ten_ca = lay('ca_lam');
      if (ten_pb !== '' && !pb.has(chuan_hoa_tieu_de(ten_pb)) && !tao_thieu) {
        bao_loi(`Phòng ban "${ten_pb}" chưa có. Tạo trước, hoặc bật "tạo mục còn thiếu".`); continue;
      }
      if (ten_ca !== '' && !ca.has(chuan_hoa_tieu_de(ten_ca)) && !tao_thieu) {
        bao_loi(`Ca làm "${ten_ca}" chưa có — ca phải khai bằng tay để đúng giờ giấc.`); continue;
      }

      const ngay_vao = doc_ngay(lay('ngay_vao'));
      if (lay('ngay_vao') !== '' && ngay_vao === null) {
        bao_loi('Ngày vào không đọc được. Dùng dạng dd/mm/yyyy hoặc yyyy-mm-dd.'); continue;
      }

      ket_qua.push({
        dong: so_dong, ma_nv, ho_ten,
        viec: id_hien_co === null ? 'tao' : 'cap_nhat',
        loi: null,
      });

      if (xem_truoc) continue;

      // --- Ghi that ---
      let phong_ban_id: string | null = null;
      if (ten_pb !== '') {
        const khoa = chuan_hoa_tieu_de(ten_pb);
        let id = pb.get(khoa) ?? null;
        if (id === null) {
          const moi = await truy_van_mot<{ id: string }>(
            'insert into phong_ban(ten) values ($1) returning id', [ten_pb]);
          id = moi?.id ?? null;
          if (id !== null) pb.set(khoa, id);
        }
        phong_ban_id = id;
      }
      const ca_lam_id = ten_ca === '' ? null : (ca.get(chuan_hoa_tieu_de(ten_ca)) ?? null);

      const ts = [
        ma_nv, ho_ten, pin === '' ? null : pin,
        phong_ban_id, ca_lam_id, ngay_vao,
        rong_thanh_null(lay('so_dien_thoai')), rong_thanh_null(lay('email')),
        doc_luan_ly(lay('cham_cong_dien_thoai')),
      ];

      if (id_hien_co === null) {
        // Dong nhan vien VA su kien bao cong trong CUNG mot transaction: tach ra thi mot lan
        // may chet giua hai cau se de lai mot nhan vien ma cong khong bao gio biet toi.
        const moi = await trong_giao_dich(async (khach) => {
          const kq = await khach.query<{ id: string }>(
            `insert into nhan_vien
               (ma_nv, ho_ten, pin_may, phong_ban_id, ca_lam_id, ngay_vao,
                so_dien_thoai, email, duoc_cham_cong_dien_thoai)
             -- Cot NOT NULL co mac dinh false: o de trong trong tep phai thanh false,
             -- khong duoc de null xuong CSDL.
             values ($1,$2,$3,$4,$5,$6,$7,$8, coalesce($9, false)) returning id`, ts);
          await ghi_su_kien('nhan_su.da_tao', { ma_nv, ho_ten }, khach);
          return kq.rows[0] ?? null;
        });
        if (moi !== null) {
          da_co.set(ma_nv.toLowerCase(), { id: moi.id, ho_ten });
          if (pin !== '') pin_da_dung.set(pin, moi.id);
          await ghi_ma_dinh_danh_nhap(moi.id, ma_nv, pin, lay('email'));
        }
      } else {
        // coalesce: o de trong trong tep = KHONG doi, khong phai xoa. Nhan su thuong xuat
        // mot phan cot roi sua, de trong khong co nghia la "xoa gia tri cu".
        // Bo ma_nv khoi danh sach tham so: cau update khong dung toi no (doi chieu bang id),
        // ma tham so thua khien Postgres khong suy duoc kieu -> loi luc chuan bi cau lenh.
        await trong_giao_dich(async (khach) => {
          await khach.query(
            `update nhan_vien
                set ho_ten = $1,
                    pin_may = coalesce($2, pin_may),
                    phong_ban_id = coalesce($3, phong_ban_id),
                    ca_lam_id = coalesce($4, ca_lam_id),
                    ngay_vao = coalesce($5, ngay_vao),
                    so_dien_thoai = coalesce($6, so_dien_thoai),
                    email = coalesce($7, email),
                    duoc_cham_cong_dien_thoai = coalesce($8, duoc_cham_cong_dien_thoai),
                    cap_nhat_luc = now()
              where id = $9`,
            [...ts.slice(1), id_hien_co]);
          // CHI khi ten that su doi. Nhap lai nguyen si mot tep 900 dong khong duoc sinh ra
          // 900 su kien doi ten.
          if (hien_co !== null && hien_co.ho_ten !== ho_ten) {
            await ghi_su_kien('nhan_su.doi_ten', { ma_nv, ho_ten }, khach);
          }
        });
        da_co.set(ma_nv.toLowerCase(), { id: id_hien_co, ho_ten });
        if (pin !== '') pin_da_dung.set(pin, id_hien_co);
        await ghi_ma_dinh_danh_nhap(id_hien_co, ma_nv, pin, lay('email'));
      }
    }

    const tom_tat = {
      tong: ket_qua.length,
      se_tao: ket_qua.filter((k) => k.viec === 'tao').length,
      se_cap_nhat: ket_qua.filter((k) => k.viec === 'cap_nhat').length,
      loi: ket_qua.filter((k) => k.viec === 'loi').length,
    };

    if (!xem_truoc) {
      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'nhap_nhan_vien', 'nhan_vien',
        null, tom_tat, req.ip);
    }

    return { xem_truoc, ...tom_tat, dong: ket_qua };
  });

  // ============================================================ lich su cham cong
  /**
   * Nhap lich su cham cong tu tep may xuat ra (USB) hoac tu ERP cu.
   *
   * Dung lai duong tiep nhan cua may that: cung bo chong trung, cung cach map PIP -> nhan
   * vien, cung buoc tinh lai bang cong. Nho vay nhap file va may day truc tiep khong the
   * cho ra hai ket qua khac nhau.
   */
  app.post('/nhap/lan-quet', {
    preHandler: can_nhan_su,
    // Lich su vai nam cua ca cong ty co the vai chuc MB — nang tran RIENG cho tuyen nay
    // thay vi nang toan cuc, de cac tuyen khac giu nguyen be mat nho.
    bodyLimit: 24 * 1024 * 1024,
  }, async (req) => {
    const b = than(req.body);
    const noi_dung = chuoi_bat_buoc(b, 'noi_dung', { toi_da: 20_000_000 });
    const serial = chuoi(b, 'serial', { toi_da: 64 }) ?? 'NHAP-TU-TEP';
    const xem_truoc = luan_ly(b, 'xem_truoc', true) as boolean;

    const attlog = chuyen_sang_attlog(noi_dung);
    if (attlog.ban_ghi === 0) {
      throw new LoiDauVao(
        'Không đọc được bản ghi nào. Cần cột PIN và cột thời điểm — xem mẫu ở nút "Tải tệp mẫu".',
      );
    }

    if (xem_truoc) {
      // Bao TRUOC nhung PIN chua ai nhan. Biet sau khi nhap thi van sua duoc, nhung phai
      // nho quay lai "Gan lai"; biet truoc thi khai PIN xong roi nhap mot lan la xong.
      const co_chu = await truy_van<{ pin_may: string }>(
        `select pin_may from nhan_vien
          where pin_may = any($1::text[]) and dang_hoat_dong = true`,
        [attlog.pin],
      );
      const da_map = new Set(co_chu.map((x) => x.pin_may));

      return {
        xem_truoc: true,
        ban_ghi: attlog.ban_ghi,
        dong_bo_qua: attlog.dong_bo_qua,
        som_nhat: attlog.som_nhat,
        muon_nhat: attlog.muon_nhat,
        pin: attlog.pin.slice(0, 50),
        so_pin: attlog.pin.length,
        chua_map_pin: attlog.pin.filter((p) => !da_map.has(p)),
      };
    }

    const kq = await tiep_nhan_attlog(serial, attlog.van_ban);
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'nhap_lan_quet', 'lan_quet',
      null, { serial, ...kq }, req.ip);
    // Nhap CSV doi ho ten hang loat, va ten thu muc kho tep mang ho ten. Quet mot lan sau
    // ca lo. Khong nem loi: du lieu nhan vien da nhap xong va dung.
    try {
      const sx = await sap_xep_kho('that');
      if (sx.so_doi_cho > 0) {
        req.log.info(`[nhap] da doi cho ${String(sx.so_doi_cho)} tep theo ho ten moi`);
      }
    } catch (loi) {
      req.log.warn(`[nhap] khong sap xep duoc kho tep: ${(loi as Error).message}`);
    }

    return { xem_truoc: false, ...kq };
  });
}

// ---------------------------------------------------------------- tien ich

function rong_thanh_null(s: string): string | null {
  return s === '' ? null : s;
}

/** 'x', 'co', 'yes', '1', 'true' -> true. Rong -> null (khong doi). */
function doc_luan_ly(s: string): boolean | null {
  const v = s.trim().toLowerCase();
  if (v === '') return null;
  return ['1', 'x', 'co', 'có', 'yes', 'y', 'true', 'bat', 'bật'].includes(v);
}

/**
 * Doc ngay theo cac dang nhan su hay dung.
 *
 * Uu tien dd/mm/yyyy (thong le Viet Nam) truoc mm/dd/yyyy — doan sai o day lam lech ngay
 * vao lam cua nua so nhan vien ma khong bao loi.
 */
function doc_ngay(s: string): string | null {
  const v = s.trim();
  if (v === '') return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (iso !== null) return chuan(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const vn = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (vn !== null) return chuan(Number(vn[3]), Number(vn[2]), Number(vn[1]));

  return null;

  function chuan(y: number, m: number, d: number): string | null {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
}

const COT_QUET: Record<string, string[]> = {
  pin: ['pin', 'pin_may', 'pin may', 'user id', 'userid', 'ma nv', 'ma_nv', 'manv', 'so the', 'employee id'],
  thoi_diem: ['thoi_diem', 'thoi diem', 'thoi gian', 'ngay gio', 'datetime', 'date time', 'time', 'checktime'],
  ngay: ['ngay', 'date'],
  gio: ['gio', 'time only', 'checktime only'],
  trang_thai: ['trang_thai', 'trang thai', 'status', 'loai', 'in out', 'inout'],
  xac_thuc: ['xac_thuc', 'xac thuc', 'verify', 'verifycode', 'cach xac thuc'],
};

interface KetQuaChuyen {
  van_ban: string;
  ban_ghi: number;
  dong_bo_qua: number;
  som_nhat: string | null;
  muon_nhat: string | null;
  pin: string[];
}

/**
 * Chuyen noi dung tep bat ky ve dang ATTLOG (PIN <TAB> thoi diem <TAB> trang thai ...).
 *
 * Hai dang duoc ho tro:
 *   1. Chinh ATTLOG cua may (tach bang TAB, khong co tieu de) — giu nguyen.
 *   2. CSV/TSV co dong tieu de — doi chieu ten cot, ho tro ca truong hop ngay va gio nam
 *      o HAI cot rieng (rat pho bien khi xuat tu Excel).
 */
function chuyen_sang_attlog(noi_dung: string): KetQuaChuyen {
  const dong = tach_csv(noi_dung);
  if (dong.length === 0) return { van_ban: '', ban_ghi: 0, dong_bo_qua: 0, som_nhat: null, muon_nhat: null, pin: [] };

  const cot = doi_chieu_cot(dong[0] as DongCsv, COT_QUET);
  const co_tieu_de = cot['pin'] !== -1 && (cot['thoi_diem'] !== -1 || cot['ngay'] !== -1);

  // Khong co tieu de nhan dang duoc -> coi la ATTLOG tho, dua thang cho bo doc cua may.
  if (!co_tieu_de) return thong_ke(noi_dung, 0);

  const ra: string[] = [];
  let bo_qua = 0;
  for (let i = 1; i < dong.length; i++) {
    const d = dong[i] as DongCsv;
    const lay = (k: string): string => (cot[k] === -1 ? '' : (d[cot[k] as number] ?? '').trim());

    const pin = lay('pin');
    let moc = lay('thoi_diem');
    if (moc === '' && lay('ngay') !== '') moc = `${lay('ngay')} ${lay('gio')}`.trim();
    if (pin === '' || moc === '') { bo_qua++; continue; }

    const chuan = chuan_hoa_moc(moc);
    if (chuan === null) { bo_qua++; continue; }

    ra.push([pin, chuan, so_hoac(lay('trang_thai'), 0), so_hoac(lay('xac_thuc'), 9)].join('\t'));
  }
  return thong_ke(ra.join('\n'), bo_qua);
}

function thong_ke(van_ban: string, dong_bo_qua: number): KetQuaChuyen {
  const pin = new Set<string>();
  let som: string | null = null;
  let muon: string | null = null;
  let ban_ghi = 0;

  for (const raw of van_ban.split('\n')) {
    const dong = raw.replace(/\r$/, '').trim();
    if (dong === '') continue;
    const f = dong.includes('\t') ? dong.split('\t') : dong.split(/\s{2,}/);
    const p = (f[0] ?? '').trim();
    const m = chuan_hoa_moc((f[1] ?? '').trim());
    if (p === '' || m === null) continue;
    ban_ghi++;
    pin.add(p);
    if (som === null || m < som) som = m;
    if (muon === null || m > muon) muon = m;
  }
  return { van_ban, ban_ghi, dong_bo_qua, som_nhat: som, muon_nhat: muon, pin: [...pin] };
}

/** Dua moc thoi gian ve 'YYYY-MM-DD HH:MM:SS'. Tra null neu khong doc duoc. */
function chuan_hoa_moc(s: string): string | null {
  const v = s.trim().replace('T', ' ');
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})[ ]+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(v);
  if (m !== null) return ghep(m[1], m[2], m[3], m[4], m[5], m[6]);

  // dd/mm/yyyy — thong le Viet Nam.
  const vn = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})[ ]+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(v);
  if (vn !== null) return ghep(vn[3], vn[2], vn[1], vn[4], vn[5], vn[6]);

  return null;

  function ghep(y?: string, mo?: string, d?: string, h?: string, p?: string, gi?: string): string | null {
    const so = (x: string | undefined, r: number): string => String(Number(x ?? 0)).padStart(r, '0');
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
    if (Number(h) > 23 || Number(p) > 59) return null;
    return `${y}-${so(mo, 2)}-${so(d, 2)} ${so(h, 2)}:${so(p, 2)}:${so(gi ?? '0', 2)}`;
  }
}

function so_hoac(s: string, mac_dinh: number): string {
  const n = Number(s);
  return String(Number.isInteger(n) && n >= 0 ? n : mac_dinh);
}

/**
 * Ghi ma dinh danh cho mot dong vua nhap tu tep.
 *
 * VI SAO PHAI CO: duong nhap CSV ghi THANG vao `nhan_vien.pin_may`. Neu no khong ghi vao bang
 * ma dinh danh thi hai ben lech ngay sau mot lan nhap — bang noi PIN 5 la cua nguoi cu, cot noi
 * la cua nguoi moi, va bo tiep nhan ADMS (uu tien bang) se ghi cong cho NGUOI CU. Dung cai lo ma
 * bang ma dinh danh sinh ra de vá.
 *
 * `am_tham`: mot ma trung cua mot nguoi khong duoc lam hong ca lan nhap vai nghin dong. Cot da
 * ghi xong roi; cho lech con lai hien tren bao cao doi soat.
 */
async function ghi_ma_dinh_danh_nhap(
  nhan_vien_id: string, ma_nv: string, pin: string, email: string,
): Promise<void> {
  for (const [he_thong, gia_tri] of [
    ['noi_bo', ma_nv], ['may_cham_cong', pin], ['microsoft_email', email],
  ] as const) {
    if (gia_tri.trim() === '') continue;
    const cb = await gan_ma_am_tham(nhan_vien_id, he_thong, gia_tri, 'nhap_csv');
    if (cb !== null) console.warn(`[nhap] ${ma_nv}: ${cb}`);
  }
}
