// Tro ly du lieu ca nhan — chatbot tra loi tu CHINH du lieu cua nguoi hoi.
//
// Vi sao khong goi thang mot LLM ngoai (mac dinh): du lieu cham cong/luong la du lieu ca nhan
// (NĐ 13/2023). Gui ra dich vu ngoai la mot quyet dinh phai co y thuc — nen o day tra loi bang
// truy van CO SAN, khong loi ra ngoai, khong ton phi. Cho LLM da chua san (`hoi_llm`): khi cong
// ty cau hinh khoa API va bat co, cac cau KHONG khop y dinh nao se chuyen sang LLM.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { bo_dau } from '../tien_ich/ten_tep.ts';
import { khoang_thang, ngay_dia_phuong, ngay_viet } from '../tien_ich/thoi_gian.ts';

export interface TraLoiTroLy {
  tra_loi: string;
  /** Nhan y dinh da nhan dang (de giao dien lam noi bat). */
  y_dinh: string;
  /** Goi y cau hoi tiep theo. */
  goi_y: string[];
}

const GOI_Y = [
  'Tôi còn bao nhiêu ngày phép?',
  'Công tháng này của tôi thế nào?',
  'Tháng này tôi đi muộn mấy lần?',
  'Sắp tới có nghỉ lễ gì không?',
  'Ca làm việc của tôi là gì?',
  'Tôi có đơn nào đang chờ duyệt không?',
];

/** Bo dau + thuong hoa de so khop tu khoa khong phu thuoc dau tieng Viet. */
function chuan(s: string): string {
  return bo_dau(s).toLowerCase();
}

function co(cau: string, ...tu: string[]): boolean {
  return tu.some((t) => cau.includes(t));
}

/**
 * Tra loi mot cau hoi cua nhan vien tu du lieu cua chinh ho.
 *
 * Nhan dang y dinh bang tu khoa (khong dau) — du cho cac cau thuong gap. Cau khong khop y dinh
 * nao: thu LLM (neu bat), khong thi tra ve loi moi kem goi y.
 */
export async function tra_loi_tro_ly(nv_id: string, cau_hoi_goc: string): Promise<TraLoiTroLy> {
  const cau = chuan(cau_hoi_goc.trim());

  if (cau === '') {
    return {
      tra_loi: 'Chào bạn! Mình là trợ lý dữ liệu. Bạn hỏi về phép, công, lương, đi muộn, '
        + 'nghỉ lễ hay ca làm việc — mình tra ngay từ dữ liệu của bạn.',
      y_dinh: 'chao',
      goi_y: GOI_Y,
    };
  }

  // ---- PHEP ----
  if (co(cau, 'phep', 'nghi phep', 'ngay nghi', 'con bao nhieu ngay')) {
    const p = await truy_van_mot<{ quota: number; da_dung: number }>(
      `select nv.so_ngay_phep_nam::float as quota,
              coalesce((select sum(case when d.nua_ngay then 0.5
                                        else (d.den_ngay - d.tu_ngay + 1) end)
                          from don_nghi_phep d
                         where d.nhan_vien_id = nv.id and d.loai = 'phep_nam'
                           and d.trang_thai = 'da_duyet'
                           and extract(year from d.tu_ngay) = extract(year from current_date)
              ), 0)::float as da_dung
         from nhan_vien nv where nv.id = $1`,
      [nv_id],
    );
    const quota = p?.quota ?? 0;
    const da_dung = p?.da_dung ?? 0;
    const con = Math.max(0, quota - da_dung);
    return {
      tra_loi: `Năm nay bạn có **${quota} ngày phép**, đã dùng **${da_dung}**, `
        + `còn lại **${con} ngày**.`,
      y_dinh: 'phep',
      goi_y: ['Tôi muốn xin nghỉ phép', 'Công tháng này của tôi thế nào?'],
    };
  }

  // ---- DI MUON ----
  if (co(cau, 'muon', 've som', 'tre')) {
    const thang = ngay_dia_phuong(new Date()).slice(0, 7);
    const { tu, den } = khoang_thang(thang);
    const m = await truy_van_mot<{ so_lan_muon: number; tong_phut: number }>(
      `select count(*) filter (where phut_muon > 0)::int as so_lan_muon,
              coalesce(sum(phut_muon),0)::int as tong_phut
         from bang_cong_ngay where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3`,
      [nv_id, tu, den],
    );
    return {
      tra_loi: `Tháng này bạn đi muộn **${m?.so_lan_muon ?? 0} lần**, `
        + `tổng **${m?.tong_phut ?? 0} phút**.`,
      y_dinh: 'di_muon',
      goi_y: ['Công tháng này của tôi thế nào?', 'Tôi muốn giải trình quên chấm công'],
    };
  }

  // ---- CONG THANG ----
  if (co(cau, 'cong', 'cham cong', 'thang nay', 'di lam', 'ngay cong')) {
    const thang = ngay_dia_phuong(new Date()).slice(0, 7);
    const { tu, den } = khoang_thang(thang);
    const c = await truy_van_mot<{ tong_cong: number; co_mat: number; vang: number; phep: number }>(
      `select coalesce(sum(so_cong),0)::float as tong_cong,
              count(*) filter (where trang_thai='co_mat')::int as co_mat,
              count(*) filter (where trang_thai='vang')::int as vang,
              count(*) filter (where trang_thai='nghi_phep')::int as phep
         from bang_cong_ngay where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3`,
      [nv_id, tu, den],
    );
    return {
      tra_loi: `Tháng ${thang}: **${c?.tong_cong ?? 0} công**, có mặt ${c?.co_mat ?? 0} ngày, `
        + `nghỉ phép ${c?.phep ?? 0}, vắng ${c?.vang ?? 0}.`,
      y_dinh: 'cong_thang',
      goi_y: ['Tháng này tôi đi muộn mấy lần?', 'Tôi còn bao nhiêu ngày phép?'],
    };
  }

  // ---- NGHI LE ----
  if (co(cau, 'le', 'nghi le', 'ngay le', 'sap toi', 'tet')) {
    const hom_nay = ngay_dia_phuong(new Date());
    const ds = await truy_van<{ ngay: string; ten: string }>(
      'select ngay, ten from ngay_le where ngay >= $1 order by ngay limit 3', [hom_nay],
    );
    if (ds.length === 0) {
      return { tra_loi: 'Sắp tới chưa có ngày lễ nào trong lịch.', y_dinh: 'nghi_le', goi_y: GOI_Y };
    }
    const danh_sach = ds.map((l) => `• ${ngay_viet(l.ngay)}: ${l.ten}`).join('\n');
    return {
      tra_loi: `Các ngày lễ sắp tới:\n${danh_sach}`,
      y_dinh: 'nghi_le',
      goi_y: ['Tôi còn bao nhiêu ngày phép?'],
    };
  }

  // ---- CA LAM ----
  if (co(cau, 'ca lam', 'gio lam', 'gio vao', 'gio ra', 'ca cua toi', 'lam viec luc')) {
    const ca = await truy_van_mot<{ ten: string; gio_vao: string; gio_ra: string }>(
      `select cl.ten, cl.gio_vao::text as gio_vao, cl.gio_ra::text as gio_ra
         from nhan_vien nv left join ca_lam cl on cl.id = nv.ca_lam_id where nv.id = $1`,
      [nv_id],
    );
    if (ca === null || ca.ten === null) {
      return {
        tra_loi: 'Hồ sơ của bạn chưa gán ca làm việc. Liên hệ nhân sự để được xếp ca.',
        y_dinh: 'ca_lam', goi_y: GOI_Y,
      };
    }
    return {
      tra_loi: `Ca của bạn: **${ca.ten}**, giờ vào ${ca.gio_vao?.slice(0, 5)}, `
        + `giờ ra ${ca.gio_ra?.slice(0, 5)}.`,
      y_dinh: 'ca_lam', goi_y: ['Tháng này tôi đi muộn mấy lần?'],
    };
  }

  // ---- DON CHO DUYET ----
  if (co(cau, 'don', 'cho duyet', 'dang cho', 'xin nghi', 'giai trinh')) {
    const d = await truy_van_mot<{ so: number }>(
      `select count(*)::int as so from (
         select trang_thai from don_nghi_phep where nhan_vien_id=$1
         union all select trang_thai from don_giai_trinh where nhan_vien_id=$1
         union all select trang_thai from don_tu where nhan_vien_id=$1
       ) t where trang_thai='cho_duyet'`,
      [nv_id],
    );
    const so = d?.so ?? 0;
    return {
      tra_loi: so === 0 ? 'Bạn không có đơn nào đang chờ duyệt.'
        : `Bạn đang có **${so} đơn** chờ duyệt. Xem ở tab "Đơn của tôi".`,
      y_dinh: 'don_cho', goi_y: ['Tôi muốn xin nghỉ phép'],
    };
  }

  // ---- LUONG (huong dan, khong lo so lieu nhay cam qua chatbot) ----
  if (co(cau, 'luong', 'thu nhap', 'phieu luong')) {
    return {
      tra_loi: 'Phiếu lương chi tiết bạn xem ở tab **Lương** để bảo mật. Mình có thể giúp về '
        + 'công, phép, đi muộn — những thứ ảnh hưởng tới lương.',
      y_dinh: 'luong', goi_y: ['Công tháng này của tôi thế nào?', 'Tháng này tôi đi muộn mấy lần?'],
    };
  }

  // ---- KHONG KHOP: thu LLM (neu bat), khong thi loi moi ----
  const llm = await hoi_llm(nv_id, cau_hoi_goc);
  if (llm !== null) return { tra_loi: llm, y_dinh: 'llm', goi_y: GOI_Y };

  return {
    tra_loi: 'Mình chưa hiểu câu hỏi. Bạn thử hỏi về **phép, công, đi muộn, nghỉ lễ, ca làm '
      + 'việc** hoặc **đơn chờ duyệt** nhé.',
    y_dinh: 'khong_ro',
    goi_y: GOI_Y,
  };
}

/**
 * Cho cam LLM (Azure OpenAI / Claude) — CHUA bat. Tra null = khong dung LLM, tro ly chi tra loi
 * tu du lieu. Khi cong ty cau hinh khoa API, noi ham nay vao dich vu that: prompt chi duoc gui
 * du lieu TOI THIEU va da an danh, khong gui thang du lieu ca nhan tho ra ngoai.
 */
async function hoi_llm(_nv_id: string, _cau_hoi: string): Promise<string | null> {
  return null;
}
