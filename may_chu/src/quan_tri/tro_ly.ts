// Tro ly QUAN TRI — chatbot cho nhan su/quan tri o goc nhin Quan tri.
//
// TUONG TU tro ly ca nhan nhung tra loi tu du lieu QUAN TRI (toan cong ty theo quyen):
// tong quan hom nay, di muon/vang/chua quet, don cho duyet, tim nhan vien, may cham cong,
// va cung mot nguon tri thuc noi quy/van ban/thong bao (dung lai ham cua tro ly ca nhan).
// Du lieu tra ve CHI theo quyen cua nguoi hoi (dashboard_cho da phan lop vai tro) — khong
// bao gio lay du roi giao dien an di.
//
// Lich su luu theo NGUOI DUNG (bang tro_ly_qt_hoi_thoai), tach khoi lich su ca nhan — hai
// kenh khong lan vao nhau. AI chi nhan cau hoi + vai luot gan nhat cua chinh nguoi hoi.
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { goi_deepseek } from '../ai/deepseek.ts';
import { dashboard_cho } from '../dashboard/theo_vai_tro.ts';
import {
  gio_dia_phuong, ngay_dia_phuong, ngay_viet, thu_trong_tuan,
} from '../tien_ich/thoi_gian.ts';
import {
  buoi_trong_ngay, chuan, tra_loi_noi_quy, tra_loi_thong_bao, tra_loi_van_ban,
} from '../ca_nhan/tro_ly.ts';

/** Nguoi hoi bot quan tri — lay tu token (khong can nhan_vien_id). */
export interface NguoiHoiQuanTri {
  sub: string;
  vai_tro: string;
  nv: string | null;
  ten: string;
}

export interface TraLoiTroLyQT {
  tra_loi: string;
  y_dinh: string;
  goi_y: string[];
}

export type YDinhQT =
  | 'chao' | 'hoi_tham' | 'tong_quan' | 'di_muon' | 'vang' | 'chua_quet' | 'don_cho'
  | 'nhan_vien' | 'may_cham' | 'noi_quy' | 'van_ban' | 'thong_bao' | 'khong_ro';

const GOI_Y_QT = [
  'Tổng quan hôm nay thế nào?',
  'Hôm nay bao nhiêu người đi muộn?',
  'Ai vắng hôm nay?',
  'Bao nhiêu đơn chờ duyệt?',
  'Máy chấm công có lỗi không?',
];

function co(cau: string, ...tu: string[]): boolean {
  return tu.some((t) => cau.includes(t));
}

/**
 * Nhan dang y dinh quan tri bang tu khoa (khong dau). Thu tu co y: cau hoi noi quy
 * ("di muon bi xu ly the nao") phai thang cau hoi so lieu ("di muon hom nay").
 */
export function nhan_dang_y_dinh_qt(cau_goc: string): YDinhQT {
  const cau = chuan(cau_goc);
  if (cau.trim() === '') return 'chao';
  if (co(cau, 'noi quy', 'vi pham', 'ky luat', 'che tai', 'bi phat', 'xu ly khi', 'sai pham')) return 'noi_quy';
  // Hoi hanh vi + che tai cung la cau hoi noi quy: "di muon bi xu ly the nao" khong phai
  // cau hoi so lieu hom nay.
  if (co(cau, 'xu ly', 'che tai', 'phat', 'quy dinh', 'noi quy', 'giam thuong')
    && co(cau, 'muon', 'tre', 've som', 'vang', 'cham cong', 'quet', 'di lam')) return 'noi_quy';
  if (co(cau, 'van ban', 'chinh sach', 'bieu mau', 'huong dan', 'quy che', 'tai lieu', 'cong van', 'mau don')) return 'van_ban';
  if (co(cau, 'thong bao', 'tin tuc')) return 'thong_bao';
  if (co(cau, 'di muon', 'di tre')) return 'di_muon';
  if (co(cau, 'vang')) return 'vang';
  if (co(cau, 'chua quet', 'chua cham', 'chua bam')) return 'chua_quet';
  if (co(cau, 'cho duyet', 'duyet don', 'don cho')) return 'don_cho';
  if (co(cau, 'may cham', 'thiet bi', 'diem danh', 'offline', 'pin lech')) return 'may_cham';
  if (co(cau, 'nhan vien', 'cong cua', 'phep cua', 'phong ban cua', 'ca cua', 'tim ai', 'ai la')) return 'nhan_vien';
  // Tong quan: tu ro rang, hoac "hom nay" kem cau hoi so lieu — "hom nay troi mua khong"
  // khong duoc bat nham thanh tong quan.
  if (co(cau, 'tong quan', 'tinh hinh', 'tong ket')
    || (co(cau, 'hom nay', 'thoi diem nay') && co(cau, 'the nao', 'ra sao', 'bao nhieu nguoi', 'so lieu'))) return 'tong_quan';
  if (/\bhi\b|\bhey\b/.test(cau) || co(cau, 'chao', 'hello', 'alo', 'a lo')) return 'chao';
  if (co(cau, 'cam on', 'thanks', 'tam biet', 'bye', 'khoe khong', 'an com', 'ban la ai',
    'met', 'stress', 'ap luc', 'chan', 'buon')) return 'hoi_tham';
  return 'khong_ro';
}

// ==================================================================== lich su hoi thoai

const SO_LS_QT_NGU_CANH = 4;
const TUOI_NHAC_QT_MS = 7 * 24 * 60 * 60 * 1000;

async function luu_hoi_thoai_qt(
  sub: string, cau_hoi: string, tra_loi: string, y_dinh: string,
): Promise<void> {
  try {
    await thuc_thi(
      `insert into tro_ly_qt_hoi_thoai (nguoi_dung_id, cau_hoi, tra_loi, y_dinh)
       values ($1,$2,$3,$4)`,
      [sub, cau_hoi, tra_loi, y_dinh],
    );
  } catch (loi) {
    console.error('[tro-ly-qt:lich-su] loi luu: ' + (loi as Error).message);
  }
}

async function lich_su_qt_boi_canh(sub: string): Promise<string> {
  try {
    const ds = await truy_van<{ cau_hoi: string; tra_loi: string }>(
      `select cau_hoi, tra_loi from tro_ly_qt_hoi_thoai
        where nguoi_dung_id = $1 order by tao_luc desc limit $2`,
      [sub, SO_LS_QT_NGU_CANH],
    );
    if (ds.length === 0) return '';
    return ds.reverse().map((d) => `Nguoi hoi: ${d.cau_hoi}\nTro ly: ${d.tra_loi}`).join('\n');
  } catch {
    return '';
  }
}

/** Ten hien thi de nhac lai chu de lan truoc. */
const NHAN_Y_DINH_QT: Partial<Record<YDinhQT, string>> = {
  tong_quan: 'tổng quan hôm nay', di_muon: 'người đi muộn', vang: 'người vắng',
  chua_quet: 'người chưa quẹt', don_cho: 'đơn chờ duyệt', nhan_vien: 'hồ sơ nhân viên',
  may_cham: 'máy chấm công', noi_quy: 'nội quy', van_ban: 'văn bản', thong_bao: 'thông báo',
};

// ==================================================================== LLM

function llm_qt_san_sang(): boolean {
  return cau_hinh.deepseek.khoa !== '';
}

async function tro_chuyen_qt(
  cau_hoi_goc: string, boi_canh: string,
): Promise<{ tra_loi: string; goi_y: string[] } | null> {
  if (!llm_qt_san_sang()) return null;
  try {
    const tho = await goi_deepseek(
      'Ban la tro ly QUAN TRI cua phan he Cham cong, hoi bang tieng Viet. Nguoi dung hoi: '
      + JSON.stringify(cau_hoi_goc)
      + '\n\nCac luot tro chuyen gan nhat cua CUNG nguoi hoi:\n' + (boi_canh === '' ? '(khong co)' : boi_canh)
      + '\n\nBan chi ho tro quan tri nhan su: tong quan hom nay (co mat/di muon/vang/nghi phep/'
      + 'chua quet), ai di muon/vang/chua quet hom nay, don cho duyet, tim nhan vien theo ten, '
      + 'may cham cong, noi quy/che tai, van ban, thong bao. '
      + 'KHONG bịa so lieu, khong hua viec minh khong lam duoc. '
      + 'Tra ve DUY NHAT doi tuong JSON dang {"tra_loi": "...", "goi_y": ["..."]} toi da 3 goi y.',
      { ghi_log: (dong) => console.error(`[tro-ly-qt:llm] ${dong}`) },
    );
    const j: unknown = JSON.parse(tho);
    if (typeof j !== 'object' || j === null || Array.isArray(j)) return null;
    const chu = (j as Record<string, unknown>)['tra_loi'];
    if (typeof chu !== 'string' || chu.trim() === '') return null;
    const goi = (j as Record<string, unknown>)['goi_y'];
    const goi_y = Array.isArray(goi)
      ? goi.filter((g): g is string => typeof g === 'string' && g.trim() !== '').slice(0, 3)
      : [];
    return { tra_loi: chu.trim().slice(0, 1000), goi_y: goi_y.length > 0 ? goi_y : GOI_Y_QT };
  } catch (loi) {
    console.error('[tro-ly-qt:llm] loi, roi ve loi san: ' + (loi as Error).message);
    return null;
  }
}

// ==================================================================== tra loi

async function tra_loi_tong_quan(nd: NguoiHoiQuanTri, hom_nay: string): Promise<TraLoiTroLyQT> {
  const d = await dashboard_cho({ vai_tro: nd.vai_tro, nv: nd.nv }, hom_nay);
  const dong: string[] = [];
  const ct = d.cong_ty;
  if (ct !== null) {
    const t = ct.tinh_hinh;
    dong.push(
      `Hôm nay: có mặt **${t.co_mat}/${t.tong_nhan_vien}**; đi muộn **${t.di_muon}**, `
      + `vắng **${t.vang}**, nghỉ phép **${t.nghi_phep}**, chưa quẹt ra **${t.chua_quet_ra}**.`,
    );
    dong.push(
      `Đơn chờ duyệt: nghỉ phép **${ct.cho_duyet.nghi_phep}**, giải trình **${ct.cho_duyet.giai_trinh}**, `
      + `quét mobile **${ct.cho_duyet.quet_mobile}**.`,
    );
  }
  const ns = d.nhan_su;
  if (ns !== null) {
    dong.push(
      `Việc nhân sự: chưa gán PIN **${ns.chua_gan_pin}**, thiếu email **${ns.thieu_email}**, `
      + `chưa gán phòng ban **${ns.chua_co_phong_ban}**, thiếu tài liệu **${ns.thieu_tai_lieu}**, `
      + `hợp đồng sắp hết hạn **${ns.hop_dong_sap_het_han}** (đã hết **${ns.hop_dong_het_han}**).`,
    );
  }
  const ht = d.he_thong;
  if (ht !== null) {
    const off = ht.thiet_bi.filter((t) => !t.dang_online).length;
    dong.push(`Máy chấm công: **${ht.thiet_bi.length}** máy, offline **${off}**; PIN lệch **${ht.pin_lech}**.`);
  }
  if (dong.length === 0) {
    return {
      tra_loi: 'Bạn chưa có quyền xem dữ liệu quản trị. Liên hệ quản trị viên để được cấp quyền.',
      y_dinh: 'tong_quan', goi_y: GOI_Y_QT,
    };
  }
  return {
    tra_loi: dong.join('\n'),
    y_dinh: 'tong_quan',
    goi_y: ['Hôm nay bao nhiêu người đi muộn?', 'Bao nhiêu đơn chờ duyệt?', 'Máy chấm công có lỗi không?'],
  };
}

async function tra_loi_di_muon(nd: NguoiHoiQuanTri, hom_nay: string): Promise<TraLoiTroLyQT> {
  const d = await dashboard_cho({ vai_tro: nd.vai_tro, nv: nd.nv }, hom_nay);
  const ds = d.cong_ty?.di_muon_hom_nay ?? [];
  if (ds.length === 0) {
    return { tra_loi: 'Hôm nay chưa có ai đi muộn.', y_dinh: 'di_muon', goi_y: GOI_Y_QT };
  }
  const danh_sach = ds.slice(0, 8).map((m) =>
    `• **${m.ho_ten}** (${m.ma_nv}): ${m.phut_muon} phút`).join('\n');
  return {
    tra_loi: `Hôm nay **${ds.length} người** đi muộn:\n${danh_sach}`,
    y_dinh: 'di_muon',
    goi_y: ['Ai vắng hôm nay?', 'Ai chưa quẹt hôm nay?'],
  };
}

async function tra_loi_vang(hom_nay: string): Promise<TraLoiTroLyQT> {
  const ds = await truy_van<{ ho_ten: string; ma_nv: string; phong_ban: string | null }>(
    `select nv.ho_ten, nv.ma_nv, pb.ten as phong_ban
       from bang_cong_ngay bc
       join nhan_vien nv on nv.id = bc.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where bc.ngay = $1 and bc.trang_thai = 'vang'
      order by nv.ho_ten limit 10`,
    [hom_nay],
  );
  if (ds.length === 0) {
    return { tra_loi: 'Hôm nay không có ai vắng.', y_dinh: 'vang', goi_y: GOI_Y_QT };
  }
  const danh_sach = ds.map((d) => `• **${d.ho_ten}** (${d.ma_nv})${d.phong_ban === null ? '' : ` — ${d.phong_ban}`}`).join('\n');
  return {
    tra_loi: `Hôm nay **${ds.length} người** vắng${ds.length === 10 ? ' (liệt kê 10 người đầu)' : ''}:\n${danh_sach}`,
    y_dinh: 'vang',
    goi_y: ['Hôm nay bao nhiêu người đi muộn?', 'Ai chưa quẹt hôm nay?'],
  };
}

async function tra_loi_chua_quet(hom_nay: string): Promise<TraLoiTroLyQT> {
  const ds = await truy_van<{ ho_ten: string; ma_nv: string; trang_thai: string; gio_vao: string | null; gio_ra: string | null }>(
    `select nv.ho_ten, nv.ma_nv, bc.trang_thai, bc.gio_vao::text as gio_vao, bc.gio_ra::text as gio_ra
       from bang_cong_ngay bc
       join nhan_vien nv on nv.id = bc.nhan_vien_id
      where bc.ngay = $1
        and (bc.gio_vao is null or bc.gio_vao = bc.gio_ra)
      order by nv.ho_ten limit 10`,
    [hom_nay],
  );
  if (ds.length === 0) {
    return { tra_loi: 'Hôm nay mọi người đã quẹt đủ vào/ra.', y_dinh: 'chua_quet', goi_y: GOI_Y_QT };
  }
  const danh_sach = ds.map((d) =>
    `• **${d.ho_ten}** (${d.ma_nv}): ${d.gio_vao === null ? 'chưa quẹt vào' : 'chưa quẹt ra'}`).join('\n');
  return {
    tra_loi: `Hôm nay **${ds.length} người** quẹt chưa đủ${ds.length === 10 ? ' (liệt kê 10 người đầu)' : ''}:\n${danh_sach}`,
    y_dinh: 'chua_quet',
    goi_y: ['Hôm nay bao nhiêu người đi muộn?', 'Ai vắng hôm nay?'],
  };
}

async function tra_loi_don_cho(): Promise<TraLoiTroLyQT> {
  const d = await truy_van_mot<{
    nghi_phep: number; giai_trinh: number; quet_mobile: number; don_tu: number; de_xuat: number; khieu_nai_luong: number;
  }>(
    `select
       (select count(*) from don_nghi_phep  where trang_thai = 'cho_duyet')::int as nghi_phep,
       (select count(*) from don_giai_trinh where trang_thai = 'cho_duyet')::int as giai_trinh,
       (select count(*) from lan_quet where trang_thai_duyet = 'cho_duyet')::int as quet_mobile,
       (select count(*) from don_tu where trang_thai in ('cho_duyet','cho_duyet_2'))::int as don_tu,
       (select count(*) from de_xuat where trang_thai = 'cho_duyet')::int as de_xuat,
       (select count(*) from khieu_nai_luong where trang_thai in ('moi','dang_xem'))::int as khieu_nai_luong`,
  );
  const x = d ?? { nghi_phep: 0, giai_trinh: 0, quet_mobile: 0, don_tu: 0, de_xuat: 0, khieu_nai_luong: 0 };
  return {
    tra_loi: 'Đơn chờ duyệt hiện tại:\n'
      + `• Nghỉ phép: **${x.nghi_phep}**\n• Giải trình quên quẹt: **${x.giai_trinh}**\n`
      + `• Đơn tự phục vụ (OT, đổi ca…): **${x.don_tu}**\n• Quét mobile: **${x.quet_mobile}**\n`
      + `• Đề xuất: **${x.de_xuat}**\n• Khiếu nại lương: **${x.khieu_nai_luong}**`,
    y_dinh: 'don_cho',
    goi_y: ['Tổng quan hôm nay thế nào?', 'Hôm nay bao nhiêu người đi muộn?'],
  };
}

async function tra_loi_nhan_vien(cau: string, hom_nay: string): Promise<TraLoiTroLyQT> {
  // Tim theo ten: so khop ho ten (khong dau) hoac cum hai tu cuoi cua ten.
  const ds = await truy_van<{ id: string; ho_ten: string; ma_nv: string }>(
    `select id, ho_ten, ma_nv from nhan_vien where dang_hoat_dong = true order by ho_ten`,
  );
  const khop = ds.filter((n) => {
    const t = chuan(n.ho_ten);
    const phan = t.split(/\s+/).filter((p) => p.length >= 2);
    const cum = phan.slice(-2).join(' ');
    return cau.includes(t) || (cum.length >= 4 && cau.includes(cum));
  });
  if (khop.length === 0) {
    return {
      tra_loi: 'Mình chưa tìm thấy nhân viên nào khớp tên. Bạn thử nói rõ họ tên, ví dụ '
        + '**"Nguyễn Văn An công tháng này thế nào"**.',
      y_dinh: 'nhan_vien', goi_y: GOI_Y_QT,
    };
  }
  if (khop.length > 1) {
    const ten = khop.slice(0, 5).map((n) => `• ${n.ho_ten} (${n.ma_nv})`).join('\n');
    return {
      tra_loi: `Tìm thấy nhiều người khớp tên:\n${ten}\n\nBạn nói rõ thêm họ tên nhé.`,
      y_dinh: 'nhan_vien', goi_y: GOI_Y_QT,
    };
  }
  const nv = khop[0]!;
  const thang = hom_nay.slice(0, 7);
  const t = await truy_van_mot<{
    phong_ban: string | null; ca: string | null; so_cong: string; ngay_di_muon: number;
    phut_muon: number; phep_nam: string; dang_hoat_dong: boolean;
  }>(
    `select pb.ten as phong_ban, cl.ten as ca,
            (select coalesce(sum(so_cong), 0) from bang_cong_ngay
              where nhan_vien_id = nv.id and to_char(ngay, 'YYYY-MM') = $2) as so_cong,
            (select count(*)::int from bang_cong_ngay
              where nhan_vien_id = nv.id and to_char(ngay, 'YYYY-MM') = $2
                and phut_muon > 0) as ngay_di_muon,
            (select coalesce(sum(phut_muon), 0)::int from bang_cong_ngay
              where nhan_vien_id = nv.id and to_char(ngay, 'YYYY-MM') = $2) as phut_muon,
            nv.so_ngay_phep_nam as phep_nam, nv.dang_hoat_dong
       from nhan_vien nv
       left join phong_ban pb on pb.id = nv.phong_ban_id
       left join ca_lam cl on cl.id = nv.ca_lam_id
      where nv.id = $1`,
    [nv.id, thang],
  );
  return {
    tra_loi: `**${nv.ho_ten}** (${nv.ma_nv}):\n`
      + `• Phòng ban: ${t?.phong_ban ?? 'chưa gán'}\n• Ca làm: ${t?.ca ?? 'chưa gán'}\n`
      + `• Công tháng ${thang}: **${t?.so_cong ?? '0'}**\n`
      + `• Đi muộn tháng: **${t?.ngay_di_muon ?? 0} lần** (${t?.phut_muon ?? 0} phút)\n`
      + `• Phép năm: **${t?.phep_nam ?? '0'} ngày**\n• Trạng thái: ${t?.dang_hoat_dong === true ? 'đang làm' : 'đã nghỉ'}`,
    y_dinh: 'nhan_vien',
    goi_y: ['Tổng quan hôm nay thế nào?', 'Hôm nay bao nhiêu người đi muộn?'],
  };
}

async function tra_loi_may_cham(nd: NguoiHoiQuanTri, hom_nay: string): Promise<TraLoiTroLyQT> {
  const d = await dashboard_cho({ vai_tro: nd.vai_tro, nv: nd.nv }, hom_nay);
  const ht = d.he_thong;
  if (ht === null) {
    return {
      tra_loi: 'Bạn chưa có quyền xem trạng thái máy chấm công — phần này chỉ quản trị viên xem được.',
      y_dinh: 'may_cham', goi_y: GOI_Y_QT,
    };
  }
  if (ht.thiet_bi.length === 0) {
    return { tra_loi: 'Hệ thống chưa khai máy chấm công nào.', y_dinh: 'may_cham', goi_y: GOI_Y_QT };
  }
  const danh_sach = ht.thiet_bi.map((m) =>
    `• **${m.ten}**: ${m.dang_online ? 'online' : 'offline'}${m.thay_lan_cuoi === null ? '' : ` (liên lạc cuối ${m.thay_lan_cuoi})`}`,
  ).join('\n');
  return {
    tra_loi: `${danh_sach}\nPIN lệch trong máy: **${ht.pin_lech}**.`,
    y_dinh: 'may_cham',
    goi_y: ['Tổng quan hôm nay thế nào?'],
  };
}

async function tra_loi_chao_qt(nd: NguoiHoiQuanTri): Promise<TraLoiTroLyQT> {
  const buoi = buoi_trong_ngay(Number(gio_dia_phuong(new Date()).slice(0, 2)));
  const dau = buoi === 'sang' ? 'Chào buổi sáng'
    : buoi === 'trua' ? 'Chào buổi trưa'
      : buoi === 'chieu' ? 'Chào buổi chiều' : 'Chào buổi tối';
  const ten = nd.ten.trim() === '' ? 'bạn' : nd.ten.trim().split(/\s+/).pop()!;

  let nhac = '';
  const gan_nhat = await truy_van_mot<{ y_dinh: string; tao_luc: Date }>(
    `select y_dinh, tao_luc from tro_ly_qt_hoi_thoai
      where nguoi_dung_id = $1 order by tao_luc desc limit 1`,
    [nd.sub],
  );
  if (gan_nhat !== null && Date.now() - new Date(gan_nhat.tao_luc).getTime() < TUOI_NHAC_QT_MS) {
    const nhan = NHAN_Y_DINH_QT[gan_nhat.y_dinh as YDinhQT];
    if (nhan !== undefined) nhac = ` Lần trước bạn hỏi về **${nhan}** — cần mình tra tiếp không?`;
  }

  // Giong nguoi that: cau theo thu trong tuan + nho nhac neu dang co don cho duyet.
  const thu = thu_trong_tuan(ngay_dia_phuong(new Date()));
  const theo_thu = thu === 1 ? ' Chúc bạn tuần mới tràn đầy năng lượng!'
    : thu === 5 ? ' Cuối tuần sắp tới, cố lên nhé!'
      : thu === 6 ? ' Chúc bạn cuối tuần vui vẻ!'
        : thu === 0 ? ' Chúc bạn ngày chủ nhật thư giãn!' : '';
  let don = '';
  if (thu >= 1 && thu <= 6) {
    const d = await truy_van_mot<{ so: number }>(
      `select (
         (select count(*) from don_nghi_phep  where trang_thai = 'cho_duyet')
       + (select count(*) from don_giai_trinh where trang_thai = 'cho_duyet')
       + (select count(*) from don_tu where trang_thai in ('cho_duyet','cho_duyet_2'))
       + (select count(*) from de_xuat where trang_thai = 'cho_duyet')
       )::int as so`,
    );
    if (d !== null && d.so > 0) don = ` Hiện đang có **${d.so} đơn** chờ duyệt.`;
  }

  return {
    tra_loi: `${dau}, ${ten}! Mình là **trợ lý quản trị**. Hỏi mình về tổng quan hôm nay, đi `
      + 'muộn, vắng, chưa quẹt, đơn chờ duyệt, nhân viên, máy chấm công hay nội quy nhé.'
      + nhac + theo_thu + don,
    y_dinh: 'chao',
    goi_y: GOI_Y_QT,
  };
}

function tra_loi_hoi_tham_qt(cau: string): TraLoiTroLyQT {
  let loi: string;
  if (co(cau, 'cam on', 'thanks')) {
    loi = 'Không có gì đâu! Cần số liệu gì cứ hỏi mình — tổng quan, đi muộn, vắng, đơn chờ duyệt…';
  } else if (co(cau, 'tam biet', 'bye')) {
    loi = 'Tạm biệt bạn nhé! Khi nào cần báo cáo hay tra cứu cứ quay lại.';
  } else if (co(cau, 'khoe khong')) {
    loi = 'Mình luôn khỏe và sẵn sàng ạ! Bạn cần mình tra số liệu gì hôm nay không?';
  } else if (co(cau, 'an com')) {
    loi = 'Cảm ơn bạn đã hỏi thăm! Mình không ăn uống nhưng luôn sẵn sàng giúp việc — bạn nhớ '
      + 'ăn uống đầy đủ nhé!';
  } else if (co(cau, 'met', 'stress', 'ap luc')) {
    loi = 'Bạn làm việc vất vả rồi. Nhớ nghỉ ngơi, ăn uống đầy đủ nhé! Cần mình tra số liệu gì '
      + 'giúp không?';
  } else if (co(cau, 'chan', 'buon')) {
    loi = 'Đừng buồn nhé, mọi chuyện rồi sẽ ổn thôi. Cần mình tra số liệu gì không?';
  } else {
    loi = 'Mình là **trợ lý quản trị** của phân hệ Chấm công — tra số liệu quản trị giúp bạn: '
      + 'tổng quan hôm nay, đi muộn, vắng, đơn chờ duyệt, nhân viên, máy chấm công.';
  }
  return { tra_loi: loi, y_dinh: 'hoi_tham', goi_y: GOI_Y_QT };
}

/**
 * Tra loi cau hoi quan tri. Du lieu lay tu dashboard_cho nen TU DONG dung theo quyen cua
 * nguoi hoi. Lich su luu theo nguoi dung; cau rong (mo widget) khong luu.
 */
export async function tra_loi_tro_ly_quan_tri(
  nd: NguoiHoiQuanTri, cau_hoi_goc: string,
): Promise<TraLoiTroLyQT> {
  const cau = chuan(cau_hoi_goc.trim());
  const hom_nay = ngay_dia_phuong(new Date());
  const y_dinh = nhan_dang_y_dinh_qt(cau);

  let kq: TraLoiTroLyQT;
  switch (y_dinh) {
    case 'chao': kq = await tra_loi_chao_qt(nd); break;
    case 'hoi_tham': kq = tra_loi_hoi_tham_qt(cau); break;
    case 'tong_quan': kq = await tra_loi_tong_quan(nd, hom_nay); break;
    case 'di_muon': kq = await tra_loi_di_muon(nd, hom_nay); break;
    case 'vang': kq = await tra_loi_vang(hom_nay); break;
    case 'chua_quet': kq = await tra_loi_chua_quet(hom_nay); break;
    case 'don_cho': kq = await tra_loi_don_cho(); break;
    case 'nhan_vien': kq = await tra_loi_nhan_vien(cau, hom_nay); break;
    case 'may_cham': kq = await tra_loi_may_cham(nd, hom_nay); break;
    case 'noi_quy': {
      const r = await tra_loi_noi_quy(cau);
      kq = { tra_loi: r.tra_loi, y_dinh: 'noi_quy', goi_y: r.goi_y };
      break;
    }
    case 'van_ban': {
      const r = await tra_loi_van_ban(cau);
      kq = { tra_loi: r.tra_loi, y_dinh: 'van_ban', goi_y: r.goi_y };
      break;
    }
    case 'thong_bao': {
      const r = await tra_loi_thong_bao(cau);
      kq = { tra_loi: r.tra_loi, y_dinh: 'thong_bao', goi_y: r.goi_y };
      break;
    }
    case 'khong_ro': {
      const llm = await tro_chuyen_qt(cau_hoi_goc, await lich_su_qt_boi_canh(nd.sub));
      if (llm !== null) {
        kq = { tra_loi: llm.tra_loi, y_dinh: 'llm', goi_y: llm.goi_y };
      } else {
        kq = {
          tra_loi: 'Mình chưa hiểu câu hỏi. Bạn thử hỏi về **tổng quan hôm nay, đi muộn, vắng, '
            + 'chưa quẹt, đơn chờ duyệt, nhân viên, máy chấm công, nội quy** nhé.',
          y_dinh: 'khong_ro', goi_y: GOI_Y_QT,
        };
      }
      break;
    }
  }

  if (cau_hoi_goc.trim() !== '') {
    await luu_hoi_thoai_qt(nd.sub, cau_hoi_goc, kq.tra_loi, kq.y_dinh);
  }
  return kq;
}
