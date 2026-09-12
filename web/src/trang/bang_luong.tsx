// Bang luong: tinh tu cham cong, sua tay phan thuong/tru, gui duyet, admin chot.
//
// Hai dieu trang nay phai noi that ro, vi day la tien that cua nguoi that:
//   1. Tham so phap ly (BHXH, giam tru gia canh) do CON NGUOI khai, khong phai chan ly.
//      He thong gieo san mot bo mac dinh — ke toan PHAI doi chieu truoc khi tra luong.
//   2. Trang thai ky quyet dinh sua duoc hay khong. Da gui duyet la khoa, de nguoi duyet
//      khong bi doi so lieu duoi chan.
import { useEffect, useState, type ReactNode } from 'react';
import { goi, tai_tep } from '../api.ts';
import { la_admin } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
  XuongDanhSach,
} from '../thanh_phan.tsx';

interface BanChot {
  id: string;
  loai: 'bang_cong' | 'bang_luong';
  ky: string;
  ten_goc: string;
  kich_thuoc: number;
  so_dong: number;
  duyet_luc: string;
  duyet_boi: string | null;
}

interface KyLuong {
  id: string;
  thang: string;
  ten: string | null;
  trang_thai: 'nhap' | 'cho_duyet' | 'da_duyet' | 'da_tra' | 'huy';
  so_phieu: number;
  tong_thuc_linh: string;
  gui_duyet_luc: string | null;
  duyet_luc: string | null;
  tra_luc: string | null;
  ghi_chu_duyet: string | null;
}

/** Mot dong trong danh muc khoan (phu cap / khoan tru). */
interface KhoanDanhMuc {
  ma: string;
  ten: string;
  loai: 'thu_nhap' | 'tru';
  cach_tinh: 'nhap_tay' | 'so_luong_x_don_gia' | 'nua_ngay_luong';
  don_gia: string | null;
  chiu_thue: boolean;
  thu_tu: number;
  dang_dung: boolean;
  canh_bao: string | null;
  ghi_chu: string | null;
}

/** Mot khoan da gan vao mot phieu. */
interface KhoanPhieu {
  khoan_ma: string;
  ten: string;
  loai: 'thu_nhap' | 'tru';
  cach_tinh: KhoanDanhMuc['cach_tinh'];
  chiu_thue: boolean;
  canh_bao: string | null;
  so_luong: string | null;
  don_gia: string | null;
  thanh_tien: string;
  ghi_chu: string | null;
  /** true = máy sinh từ chính sách phụ cấp; false = người gõ tay cho riêng kỳ này. */
  tu_chinh_sach: boolean;
}

interface Phieu {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  khoi_id: string | null;
  khoi: string | null;
  loai_hop_dong: string | null;
  luong_co_ban: string;
  phu_cap: string;
  luong_dong_bh: string;
  luong_ngay: string;
  so_ngay_cong_chuan: string;
  so_ngay_cong_thuc: string;
  luong_theo_cong: string;
  tien_ot: string;
  thuong: string;
  phu_cap_khac: string;
  khoan_thu_nhap: string;
  khoan_tru: string;
  thu_nhap_mien_thue: string;
  tong_thu_nhap: string;
  bhxh_nld: string;
  bhyt_nld: string;
  bhtn_nld: string;
  so_nguoi_phu_thuoc: number;
  thu_nhap_tinh_thue: string;
  thue_tncn: string;
  tru_khac: string;
  ly_do_tru_khac: string | null;
  tong_tru: string;
  thuc_linh: string;
  thuc_linh_lam_tron: string;
  ghi_chu: string | null;
  /** Admin ép công thực = công chuẩn để trả đủ lương tháng. */
  ep_du_cong: boolean;
  /** Admin miễn phạt đi muộn tự động cho phiếu này. */
  mien_phat: boolean;
  /** Admin miễn thuế TNCN cho phiếu này (thuế = 0). */
  mien_thue: boolean;
  /** Admin miễn BHXH/BHYT/BHTN cho phiếu này (căn cứ đóng = 0) — KHÔNG phát sinh BHXH nào. */
  mien_bh: boolean;
  /** Lương NET: công ty gánh BHXH của NLĐ (vẫn đóng đủ), không trừ vào thực lĩnh. */
  luong_net: boolean;
  khoan: KhoanPhieu[];
}

const NHAN_HOP_DONG: Record<string, string> = {
  thu_viec: 'Thử việc',
  xac_dinh: 'Xác định',
  khong_xac_dinh: 'Không XĐ',
  thoi_vu: 'Thời vụ',
  cong_tac_vien: 'CTV',
  hoc_viec: 'Học việc',
};

const NHAN_TRANG_THAI: Record<KyLuong['trang_thai'], string> = {
  nhap: 'Nháp',
  cho_duyet: 'Chờ duyệt',
  da_duyet: 'Đã duyệt',
  da_tra: 'Đã trả',
  huy: 'Hủy',
};

const MAU_TRANG_THAI: Record<KyLuong['trang_thai'], string> = {
  nhap: 'nhan-mo',
  cho_duyet: 'nhan-canh-bao',
  da_duyet: 'nhan-tot',
  da_tra: 'nhan-tot',
  huy: 'nhan-xau',
};

/** Dinh dang tien Viet: cham phan nhom nghin, khong hien so le. */
function tien(v: unknown): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

export function TrangBangLuong(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<KyLuong[]>('/api/ky-luong');
  const [mo_ky, dat_mo_ky] = useState<string | null>(null);
  const [dang_tao, dat_dang_tao] = useState(false);
  const hd = dung_hanh_dong();

  if (dang_tai) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Bảng lương tính từ dữ liệu chấm công. Mỗi tháng một kỳ.
          </p>
        </div>
        <div className="hang-nut">
          <button onClick={() => dat_dang_tao(true)} disabled={hd.dang_chay}>Tạo kỳ lương</button>
        </div>
      </div>

      <KhoiBanChot />

      <div className="hop-luu-y">
        <strong>Trước khi trả lương thật:</strong> kế toán phải đối chiếu lại mức lương cơ sở,
        lương tối thiểu vùng, giảm trừ gia cảnh và biểu thuế trong mục{' '}
        <em>Cài đặt → Tham số lương</em>. Hệ thống gieo sẵn mức áp dụng từ 01/7/2024; các mức
        này thay đổi theo năm và phần mềm không tự biết.
      </div>

      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      {ds.length === 0 ? (
        <Trong
          tieu_de="Chưa có kỳ lương nào"
          hanh_dong={<button onClick={() => dat_dang_tao(true)}>Tạo kỳ lương đầu tiên</button>}
        />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tháng</th>
              <th>Trạng thái</th>
              <th className="canh-phai">Số phiếu</th>
              <th className="canh-phai">Tổng thực lĩnh</th>
              <th>Gửi duyệt</th>
              <th>Duyệt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ds.map((k) => (
              <tr key={k.id}>
                <td><strong>{k.thang}</strong></td>
                <td><span className={MAU_TRANG_THAI[k.trang_thai]}>
                  {NHAN_TRANG_THAI[k.trang_thai]}
                </span></td>
                <td className="canh-phai">{k.so_phieu}</td>
                <td className="canh-phai">{tien(k.tong_thuc_linh)} đ</td>
                <td>{k.gui_duyet_luc === null ? '—' : ngay_gio(k.gui_duyet_luc)}</td>
                <td>{k.duyet_luc === null ? '—' : ngay_gio(k.duyet_luc)}</td>
                <td className="canh-phai">
                  <button className="nut-phang" onClick={() => dat_mo_ky(k.id)}>Xem</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dang_tao && (
        <HopThoaiTaoKy
          khi_dong={() => dat_dang_tao(false)}
          khi_xong={() => { dat_dang_tao(false); nap_lai(); }}
        />
      )}
      {mo_ky !== null && (
        <HopThoaiChiTiet
          ky_id={mo_ky}
          khi_dong={() => dat_mo_ky(null)}
          khi_doi={nap_lai}
        />
      )}
    </>
  );
}

function HopThoaiTaoKy(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const bay_gio = new Date();
  const mac_dinh = `${bay_gio.getFullYear()}-${String(bay_gio.getMonth() + 1).padStart(2, '0')}`;
  const [thang, dat_thang] = useState(mac_dinh);
  const hd = dung_hanh_dong();

  return (
    <HopThoai tieu_de="Tạo kỳ lương" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <label htmlFor="thang">Tháng</label>
      <input id="thang" type="month" value={thang} onChange={(e) => dat_thang(e.target.value)} />
      <p className="mo-ta">
        Tạo xong hãy bấm <strong>Tính lương</strong> để sinh phiếu từ dữ liệu chấm công của tháng.
      </p>
      <div className="hang-nut">
        <button
          disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => goi('/api/ky-luong', { method: 'POST', body: { thang } }),
            'Đã tạo kỳ lương.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Tạo
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

function HopThoaiChiTiet(
  { ky_id, khi_dong, khi_doi }: { ky_id: string; khi_dong: () => void; khi_doi: () => void },
): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } =
    dung_nap<KyLuong & { phieu: Phieu[] }>(`/api/ky-luong/${ky_id}`);
  const [sua, dat_sua] = useState<Phieu | null>(null);
  const [khoan, dat_khoan] = useState<Phieu | null>(null);
  const [xem_tru, dat_xem_tru] = useState<Phieu | null>(null);
  const [xem_pc, dat_xem_pc] = useState<Phieu | null>(null);
  const [xem_cong, dat_xem_cong] = useState<Phieu | null>(null);
  const [thuong_kpi, dat_thuong_kpi] = useState(false);
  const [tab, dat_tab] = useState<'vnd' | 'cny'>('vnd');
  const hd = dung_hanh_dong();

  if (dang_tai) return <KhungToanMan tieu_de="Kỳ lương" khi_dong={khi_dong}><DangTai /></KhungToanMan>;
  if (loi !== null || du_lieu === null) {
    return <KhungToanMan tieu_de="Kỳ lương" khi_dong={khi_dong}><HopLoi loi={loi} /></KhungToanMan>;
  }

  const k = du_lieu;
  const sua_duoc = k.trang_thai === 'nhap';

  const chay = (duong_dan: string, thong_bao: string) => () => {
    void hd.chay(() => goi(duong_dan, { method: 'POST' }), thong_bao)
      .then(() => { nap_lai(); khi_doi(); });
  };

  return (
    <KhungToanMan tieu_de={`Bảng lương tháng ${k.thang}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="thanh-tab">
        <button className={`tab ${tab === 'vnd' ? 'tab-dang-mo' : ''}`}
          onClick={() => dat_tab('vnd')}>Lương Việt Nam (VND)</button>
        <button className={`tab ${tab === 'cny' ? 'tab-dang-mo' : ''}`}
          onClick={() => dat_tab('cny')}>Lương Trung Quốc (CNY)</button>
      </div>

      {tab === 'cny' && (
        <BangCny ky={k} sua_duoc={sua_duoc} khi_doi={() => { nap_lai(); khi_doi(); }} />
      )}

      {tab === 'vnd' && (<>
      <div className="hang-nut">
        <span className={MAU_TRANG_THAI[k.trang_thai]}>
          {NHAN_TRANG_THAI[k.trang_thai]}
        </span>
        {sua_duoc && (
          <button
            disabled={hd.dang_chay}
            onClick={chay(`/api/ky-luong/${k.id}/tinh`, 'Đã tính lại toàn bộ phiếu lương.')}
          >
            Tính lương
          </button>
        )}
        {sua_duoc && k.phieu.length > 0 && (
          <button
            disabled={hd.dang_chay}
            onClick={chay(`/api/ky-luong/${k.id}/gui-duyet`, 'Đã gửi duyệt. Phiếu đã khóa sửa.')}
          >
            Gửi duyệt
          </button>
        )}
        {k.trang_thai === 'cho_duyet' && (
          <button
            className="nut-phang" disabled={hd.dang_chay}
            onClick={chay(`/api/ky-luong/${k.id}/thu-hoi`, 'Đã thu hồi về nháp.')}
          >
            Thu hồi
          </button>
        )}
        {la_admin() && k.phieu.length > 0
          && (k.trang_thai === 'nhap' || k.trang_thai === 'cho_duyet') && (
          <button
            className="nut-phang" disabled={hd.dang_chay}
            onClick={chay(`/api/ky-luong/${k.id}/gui-phieu`,
              'Đã gửi email phiếu lương để nhân viên xác nhận. '
              + 'Nhân viên có thể khiếu nại lương nếu có sai sót để hệ thống chỉnh sửa.')}
            title="Gửi phiếu lương cho từng người xác nhận trước khi duyệt. Nhân viên có quyền khiếu nại lương."
          >
            Gửi email xác nhận
          </button>
        )}
        {sua_duoc && la_admin() && k.phieu.length > 0 && (
          <button
            className="nut-phang" disabled={hd.dang_chay}
            onClick={() => dat_thuong_kpi(true)}
            title="Nhập nhanh thưởng KPI cho nhiều người theo khối/phòng, kèm chứng từ duyệt"
          >
            Nhập nhanh thưởng KPI
          </button>
        )}
        {k.trang_thai === 'cho_duyet' && la_admin() && (
          <>
            <button
              disabled={hd.dang_chay}
              onClick={() => void hd.chay(
                () => goi(`/api/ky-luong/${k.id}/quyet`,
                  { method: 'POST', body: { quyet_dinh: 'da_duyet' } }),
                'Đã duyệt kỳ lương.',
              ).then(() => { nap_lai(); khi_doi(); })}
            >
              Duyệt
            </button>
            <button
              className="nut-phang" disabled={hd.dang_chay}
              onClick={() => void hd.chay(
                () => goi(`/api/ky-luong/${k.id}/quyet`,
                  { method: 'POST', body: { quyet_dinh: 'tra_lai' } }),
                'Đã trả lại cho nhân sự sửa.',
              ).then(() => { nap_lai(); khi_doi(); })}
            >
              Trả lại
            </button>
          </>
        )}
        {k.trang_thai === 'da_duyet' && la_admin() && (
          <>
            <button
              disabled={hd.dang_chay}
              onClick={chay(`/api/ky-luong/${k.id}/da-tra`, 'Đã đánh dấu đã trả lương.')}
            >
              Đánh dấu đã trả
            </button>
            <button
              className="nut-phang" disabled={hd.dang_chay}
              onClick={() => {
                if (!window.confirm(
                  'Thu hồi duyệt sẽ mở lại kỳ lương về "nháp" để sửa/bổ sung '
                  + '(giữ nguyên công 31/8 làm bù và các ngày chỉnh tay). Tiếp tục?')) return;
                void hd.chay(
                  () => goi(`/api/ky-luong/${k.id}/thu-hoi-duyet`, { method: 'POST' }),
                  'Đã thu hồi duyệt. Kỳ mở lại để sửa — nhớ Tính lại rồi Gửi duyệt / Duyệt lại.',
                ).then(() => { nap_lai(); khi_doi(); });
              }}
            >
              Thu hồi duyệt
            </button>
          </>
        )}
        {(k.trang_thai === 'da_duyet' || k.trang_thai === 'da_tra') && la_admin() && (
          <button
            className="nut-phang" disabled={hd.dang_chay}
            onClick={chay(`/api/ky-luong/${k.id}/gui-phieu`, 'Đã gửi lại email phiếu lương.')}
          >
            Gửi lại phiếu
          </button>
        )}
        <button
          className="nut-phang" disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => tai_tep(`/api/ky-luong/${k.id}/xuat-xlsx`, `bang_luong_${k.thang}.xlsx`),
          )}
        >
          Xuất Excel
        </button>
        <button
          className="nut-phang" disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => tai_tep(`/api/ky-luong/${k.id}/xuat-csv`, `bang_luong_${k.thang}.csv`),
          )}
        >
          Xuất CSV
        </button>
      </div>

      {k.phieu.length === 0 ? (
        <Trong tieu_de="Chưa có phiếu nào" mo_ta={String.raw`Bấm "Tính lương" để sinh phiếu từ dữ liệu chấm công của tháng.`} />
      ) : (
        <div className="vo-bang">
          <table className="bang-gon bang-neo-cot-dau">
            <thead>
              <tr>
                <th>Mã NV</th><th>Họ tên</th><th>Loại HĐ</th>
                <th className="canh-phai">Lương cơ bản</th>
                <th className="canh-phai">Công</th>
                <th className="canh-phai">Lương theo công</th>
                <th className="canh-phai">OT</th>
                <th className="canh-phai">Thưởng</th>
                <th className="canh-phai">Phụ cấp</th>
                <th className="canh-phai">Tổng thu nhập</th>
                <th className="canh-phai">Lương đóng BH</th>
                <th className="canh-phai">BHXH+YT+TN</th>
                <th className="canh-phai">Thuế TNCN</th>
                <th className="canh-phai">Khoản trừ</th>
                <th className="canh-phai">Thực lĩnh</th>
                {sua_duoc && <th />}
              </tr>
            </thead>
            <tbody>
              {k.phieu.map((p) => {
                const bh = Number(p.bhxh_nld) + Number(p.bhyt_nld) + Number(p.bhtn_nld);
                // Cot "Khoan tru" gop ca `tru_khac` cu lan cac khoan moi — nguoi doc bang can
                // MOT con so tru, khong phai hai cho phai tu cong.
                const tru = Number(p.khoan_tru) + Number(p.tru_khac);
                const lam_tron = Number(p.thuc_linh_lam_tron);
                const goc = Number(p.thuc_linh);
                return (
                  <tr key={p.id}>
                    <td>{p.ma_nv}</td>
                    <td>{p.ho_ten}</td>
                    <td>
                      {p.loai_hop_dong === null
                        ? <span className="mo-ta">—</span>
                        : NHAN_HOP_DONG[p.loai_hop_dong] ?? p.loai_hop_dong}
                    </td>
                    <td className="canh-phai">{tien(p.luong_co_ban)}</td>
                    <td className="canh-phai">
                      <button className="nut-lien-ket" onClick={() => dat_xem_cong(p)}
                        title="Xem chi tiết công từng ngày — ngày nào bị trừ, lý do gì">
                        {Number(p.so_ngay_cong_thuc)}/{Number(p.so_ngay_cong_chuan)}
                      </button>
                      {p.ep_du_cong && <div className="nhan-canh-bao" title="Được tính đủ ngày công (miễn chấm công)">đủ công</div>}
                      {p.mien_phat && <div className="nhan-canh-bao" title="Được miễn phạt đi muộn/về sớm">miễn phạt</div>}
                      {p.mien_thue && <div className="nhan-canh-bao" title="Miễn thuế TNCN cho phiếu này">miễn thuế</div>}
                      {p.mien_bh && <div className="nhan-canh-bao" title="Miễn BHXH/BHYT/BHTN cho phiếu này (không phát sinh BHXH)">miễn BH</div>}
                      {p.luong_net && <div className="nhan-canh-bao" title="Lương NET: công ty gánh BHXH của NLĐ (vẫn đóng đủ), không trừ vào thực lĩnh">lương net</div>}
                    </td>
                    <td className="canh-phai">{tien(p.luong_theo_cong)}</td>
                    <td className="canh-phai">{tien(p.tien_ot)}</td>
                    <td className="canh-phai">{tien(p.thuong)}</td>
                    <td className="canh-phai">
                      {Number(p.khoan_thu_nhap) + Number(p.phu_cap_khac) > 0 ? (
                        <button className="nut-lien-ket" onClick={() => dat_xem_pc(p)}
                          title="Xem chi tiết phụ cấp">
                          {tien(Number(p.khoan_thu_nhap) + Number(p.phu_cap_khac))}
                        </button>
                      ) : tien(Number(p.khoan_thu_nhap) + Number(p.phu_cap_khac))}
                    </td>
                    <td className="canh-phai">{tien(p.tong_thu_nhap)}</td>
                    <td className="canh-phai">
                      {tien(p.luong_dong_bh)}
                      {Number(p.luong_dong_bh) !== Number(p.luong_co_ban) + Number(p.phu_cap)
                        && <div className="mo-ta">khai riêng</div>}
                    </td>
                    <td className="canh-phai">{tien(bh)}</td>
                    <td className="canh-phai">{tien(p.thue_tncn)}</td>
                    <td className="canh-phai">
                      {tru > 0 ? (
                        <button className="nut-lien-ket" onClick={() => dat_xem_tru(p)}
                          title="Xem chi tiết các khoản trừ">
                          {tien(tru)}
                        </button>
                      ) : tien(tru)}
                    </td>
                    <td className="canh-phai">
                      <strong>{tien(lam_tron)}</strong>
                      {lam_tron !== goc && (
                        <div className="mo-ta">gốc {tien(goc)}</div>
                      )}
                    </td>
                    {sua_duoc && (
                      <td className="canh-phai">
                        <button className="nut-phang" onClick={() => dat_khoan(p)}>Khoản</button>
                        <button className="nut-phang" onClick={() => dat_sua(p)}>Sửa</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="hang-tong">
                <td colSpan={3}><strong>Tổng cộng ({k.phieu.length} người)</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.luong_co_ban), 0))}</strong></td>
                <td className="canh-phai mo-ta">—</td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.luong_theo_cong), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.tien_ot), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.thuong), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.khoan_thu_nhap) + Number(p.phu_cap_khac), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.tong_thu_nhap), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.luong_dong_bh), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.bhxh_nld) + Number(p.bhyt_nld) + Number(p.bhtn_nld), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.thue_tncn), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.khoan_tru) + Number(p.tru_khac), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(k.phieu.reduce((a, p) => a + Number(p.thuc_linh_lam_tron), 0))}</strong></td>
                {sua_duoc && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      </>)}

      {sua !== null && (
        <HopThoaiSuaPhieu
          phieu={sua}
          khi_dong={() => dat_sua(null)}
          khi_xong={() => { dat_sua(null); nap_lai(); khi_doi(); }}
        />
      )}
      {khoan !== null && (
        <HopThoaiKhoan
          phieu={khoan}
          khi_dong={() => dat_khoan(null)}
          khi_xong={() => { dat_khoan(null); nap_lai(); khi_doi(); }}
        />
      )}
      {xem_tru !== null && (
        <HopThoaiKeKhoanTru phieu={xem_tru} khi_dong={() => dat_xem_tru(null)} />
      )}
      {xem_pc !== null && (
        <HopThoaiKePhuCap phieu={xem_pc} khi_dong={() => dat_xem_pc(null)} />
      )}
      {thuong_kpi && (
        <HopThoaiThuongKpi
          ky_id={k.id} phieu={k.phieu}
          khi_dong={() => dat_thuong_kpi(false)}
          khi_xong={() => { dat_thuong_kpi(false); nap_lai(); khi_doi(); }}
        />
      )}
      {xem_cong !== null && (
        <HopThoaiCong ky_thang={k.thang} phieu={xem_cong} khi_dong={() => dat_xem_cong(null)} />
      )}
    </KhungToanMan>
  );
}

const NHAN_TT_NGAY: Record<string, string> = {
  vang: 'Vắng', co_mat: 'Có mặt', nghi_phep: 'Nghỉ phép', nghi_khong_luong: 'Nghỉ không lương',
  ngay_le: 'Ngày lễ', nghi_tuan: 'Nghỉ tuần', cong_tac: 'Công tác', lam_bu: 'Làm bù',
};
// Cột "Phép / lý do": vắng = KHÔNG phép (đơn nghỉ duyệt sẽ đổi trạng thái sang nghỉ phép/không lương).
const PHEP_NGAY: Record<string, ReactNode> = {
  vang: <span className="nhan-canh-bao" title="Vắng không có đơn duyệt">Không phép</span>,
  nghi_phep: 'Có phép (phép năm)',
  nghi_khong_luong: 'Nghỉ không lương',
  cong_tac: 'Công tác',
  ngay_le: 'Nghỉ lễ',
  lam_bu: 'Nghỉ bù',
};
const THU_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
interface NgayCong {
  ngay: string; trang_thai: string; gio_vao: string | null; gio_ra: string | null;
  phut_muon: number | null; phut_ve_som: number | null; phut_ot: number | null;
  so_cong: string; co_dieu_chinh: boolean; ghi_chu: string | null;
}

/**
 * Chi tiet CONG tung ngay cua mot nguoi trong ky: ngay nao bi tru, ly do gi. Doc lai bang cham
 * cong that (`/bang-cong`) chu khong tu con so tong tren phieu.
 */
function HopThoaiCong(
  { ky_thang, phieu, khi_dong }: { ky_thang: string; phieu: Phieu; khi_dong: () => void },
): ReactNode {
  const [nam, thang] = ky_thang.split('-').map(Number);
  const so_ngay = new Date(nam!, thang!, 0).getDate();
  const tu = `${ky_thang}-01`;
  const den = `${ky_thang}-${String(so_ngay).padStart(2, '0')}`;
  const { du_lieu, dang_tai, loi } = dung_nap<NgayCong[]>(
    `/api/bang-cong?nhan_vien_id=${phieu.nhan_vien_id}&tu=${tu}&den=${den}`);
  // Quy phep nam cua nguoi nay (da dung / quy / con lai) — de theo doi ngay tren bang cong.
  const quy = dung_nap<{ dong: { id: string; quy: number; da_dung: number; con_lai: number }[] }>(
    `/api/nghi-phep?nam=${nam}`);
  const phep = (quy.du_lieu?.dong ?? []).find((x) => x.id === phieu.nhan_vien_id) ?? null;

  const gio = (s: string | null): string => (s === null ? '' : ngay_gio(s).slice(-5));
  const ds = du_lieu ?? [];
  const bi_tru = ds.filter((d) =>
    d.trang_thai === 'vang' || d.trang_thai === 'nghi_khong_luong'
    || (d.trang_thai === 'co_mat' && Number(d.so_cong) < 1));

  return (
    <HopThoai tieu_de={`Chi tiết công — ${phieu.ho_ten} (${ky_thang})`} khi_dong={khi_dong} toan_man>
      {loi !== null && <HopLoi loi={loi} />}
      {dang_tai ? <DangTai /> : (
        <>
          <div className="goi-y" style={{ marginBottom: '0.5rem' }}>
            Thực tế <strong>{Number(phieu.so_ngay_cong_thuc)}</strong> / chuẩn{' '}
            <strong>{Number(phieu.so_ngay_cong_chuan)}</strong> công ·{' '}
            <strong>{bi_tru.length}</strong> ngày bị trừ / thiếu công (bôi đậm bên dưới).
            {phieu.ep_du_cong && ' — Phiếu đang được "tính đủ công".'}
            {phep !== null && (
              <> · <strong>Phép năm:</strong> đã dùng <strong>{Number(phep.da_dung)}</strong>{' '}
                / quỹ <strong>{Number(phep.quy)}</strong> (còn{' '}
                <strong>{Number(phep.con_lai)}</strong>)</>
            )}
          </div>
          <div className="vo-bang" style={{ maxHeight: '72vh', overflow: 'auto' }}>
            <table className="bang-gon">
              <thead><tr>
                <th>Ngày</th><th>Thứ</th><th>Trạng thái</th><th>Phép / lý do</th>
                <th className="canh-phai">Công</th><th>Vào–Ra</th><th>Đi muộn / Về sớm</th>
                <th>Ghi chú</th>
              </tr></thead>
              <tbody>
                {ds.map((d) => {
                  const thu = THU_VN[new Date(`${d.ngay}T00:00:00Z`).getUTCDay()];
                  const tru = d.trang_thai === 'vang' || d.trang_thai === 'nghi_khong_luong'
                    || (d.trang_thai === 'co_mat' && Number(d.so_cong) < 1);
                  const muon = Number(d.phut_muon ?? 0);
                  const ve_som = Number(d.phut_ve_som ?? 0);
                  return (
                    <tr key={d.ngay} style={tru ? { fontWeight: 600 } : undefined}>
                      <td>{d.ngay.slice(8, 10)}/{d.ngay.slice(5, 7)}</td>
                      <td>{thu}</td>
                      <td>{NHAN_TT_NGAY[d.trang_thai] ?? d.trang_thai}
                        {d.co_dieu_chinh && <span className="nhan-canh-bao" title="Có điều chỉnh tay / giải trình">sửa tay</span>}
                      </td>
                      <td>{PHEP_NGAY[d.trang_thai] ?? ''}</td>
                      <td className="canh-phai">{Number(d.so_cong)}</td>
                      <td>{gio(d.gio_vao)}{d.gio_ra !== null ? `–${gio(d.gio_ra)}` : ''}</td>
                      <td>
                        {muon > 0 && <span>muộn {muon}′ </span>}
                        {ve_som > 0 && <span>về sớm {ve_som}′</span>}
                      </td>
                      <td className="mo-ta">{d.ghi_chu ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="goi-y" style={{ marginTop: '0.5rem' }}>
            Ghi chú: đi muộn / phạt tiền được tính ở bảng lương (cột "Khoản trừ"), không phải ở
            số công. Số công chỉ phản ánh ngày làm thực tế (nửa ngày, vắng, nghỉ không lương…).
          </div>
        </>
      )}
    </HopThoai>
  );
}

/**
 * YC 02 phan B (GD1) — NHAP NHANH THUONG KPI: chon loai khoan, loc theo khoi/phong, dien so tien
 * cho tung nguoi, kem CHUNG TU duyet, gui mot lan cho ca ky.
 */
const LOAI_THUONG_KPI: readonly { ma: string; ten: string }[] = [
  { ma: 'thuong_kpi_ca_nhan', ten: 'Thưởng KPI cá nhân' },
  { ma: 'thuong_kpi_phong', ten: 'Thưởng KPI phòng/khối' },
  { ma: 'hoa_hong_cskh', ten: 'Hoa hồng CSKH' },
  { ma: 'pc_doanh_so', ten: 'Doanh số rep ADS' },
  { ma: 'pc_kpi', ten: 'Thưởng KPI (chung, cũ)' },
];
function HopThoaiThuongKpi(
  { ky_id, phieu, khi_dong, khi_xong }:
  { ky_id: string; phieu: Phieu[]; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [khoan_ma, dat_khoan_ma] = useState(LOAI_THUONG_KPI[0]!.ma);
  const [loc_khoi, dat_loc_khoi] = useState('');
  const [loc_phong, dat_loc_phong] = useState('');
  const [chung_tu, dat_chung_tu] = useState('');
  const [ap_chung, dat_ap_chung] = useState('');
  const [so_tien, dat_so_tien] = useState<Record<string, string>>({});
  const hd = dung_hanh_dong();

  const cac_khoi = [...new Set(phieu.map((p) => p.khoi).filter((x): x is string => x !== null))].sort();
  const cac_phong = [...new Set(phieu.map((p) => p.phong_ban).filter((x): x is string => x !== null))].sort();
  const loc = phieu.filter((p) =>
    (loc_khoi === '' || p.khoi === loc_khoi) && (loc_phong === '' || p.phong_ban === loc_phong));

  const dat_mot = (id: string, v: string): void => dat_so_tien((cu) => ({ ...cu, [id]: v }));
  const ap_chung_cho_loc = (): void => {
    const v = ap_chung.trim();
    if (v === '') return;
    dat_so_tien((cu) => {
      const moi = { ...cu };
      for (const p of loc) moi[p.nhan_vien_id] = v;
      return moi;
    });
  };

  const gui = async (): Promise<void> => {
    const dong = Object.entries(so_tien)
      .filter(([, v]) => v.trim() !== '')
      .map(([nhan_vien_id, v]) => ({ nhan_vien_id, so_tien: Number(v) }))
      .filter((d) => Number.isFinite(d.so_tien)); // gui ca 0 de GO khoan neu sua nham
    if (dong.length === 0) return;
    const ok = await hd.chay(() => goi(`/api/ky-luong/${ky_id}/thuong-kpi-hang-loat`, {
      method: 'POST', body: { khoan_ma, chung_tu_mo_ta: chung_tu.trim(), dong },
    }), 'Đã áp thưởng KPI và tính lại kỳ.');
    if (ok) khi_xong();
  };

  const du_chung_tu = chung_tu.trim().length >= 3;
  const so_da_nhap = loc.filter((p) => (so_tien[p.nhan_vien_id] ?? '').trim() !== '').length;
  const co_nhap = Object.values(so_tien).some((v) => v.trim() !== '');

  return (
    <HopThoai tieu_de="Nhập nhanh thưởng KPI" khi_dong={khi_dong}>
      <HopLoi loi={hd.loi} />
      <div className="luoi luoi-2">
        <div className="o-nhap">
          <label htmlFor="tk-khoan">Loại thưởng</label>
          <select id="tk-khoan" value={khoan_ma} onChange={(e) => dat_khoan_ma(e.target.value)}>
            {LOAI_THUONG_KPI.map((l) => <option key={l.ma} value={l.ma}>{l.ten}</option>)}
          </select>
        </div>
        <div className="o-nhap">
          <label htmlFor="tk-ct">Chứng từ duyệt *</label>
          <input id="tk-ct" value={chung_tu} onChange={(e) => dat_chung_tu(e.target.value)}
            placeholder="Số/ngày quyết định duyệt thưởng" />
        </div>
      </div>
      <div className="luoi luoi-2">
        <div className="o-nhap">
          <label htmlFor="tk-khoi">Lọc theo khối</label>
          <select id="tk-khoi" value={loc_khoi} onChange={(e) => dat_loc_khoi(e.target.value)}>
            <option value="">— Tất cả —</option>
            {cac_khoi.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="o-nhap">
          <label htmlFor="tk-phong">Lọc theo phòng ban</label>
          <select id="tk-phong" value={loc_phong} onChange={(e) => dat_loc_phong(e.target.value)}>
            <option value="">— Tất cả —</option>
            {cac_phong.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>
      <div className="hang-nut" style={{ alignItems: 'flex-end' }}>
        <div className="o-nhap" style={{ flex: 1 }}>
          <label htmlFor="tk-chung">Áp chung một mức cho danh sách đang lọc (đ)</label>
          <input id="tk-chung" type="number" min="0" value={ap_chung}
            onChange={(e) => dat_ap_chung(e.target.value)} placeholder="Ví dụ 500000" />
        </div>
        <button type="button" onClick={ap_chung_cho_loc}>Điền hết</button>
      </div>

      <div className="goi-y" style={{ margin: '0.5rem 0' }}>
        {loc.length} người đang lọc · đã nhập tiền cho {so_da_nhap} người. Để trống = không đổi;
        nhập <strong>0</strong> = gỡ khoản này khỏi phiếu.
      </div>

      <div className="vo-bang" style={{ maxHeight: '40vh', overflow: 'auto' }}>
        <table className="bang-gon">
          <thead><tr><th>Mã NV</th><th>Họ tên</th><th>Phòng</th><th>Khối</th>
            <th className="canh-phai">Thưởng (đ)</th></tr></thead>
          <tbody>
            {loc.map((p) => (
              <tr key={p.id}>
                <td>{p.ma_nv}</td><td>{p.ho_ten}</td>
                <td>{p.phong_ban ?? '—'}</td><td>{p.khoi ?? '—'}</td>
                <td className="canh-phai">
                  <input type="number" min="0" style={{ width: '9rem' }}
                    value={so_tien[p.nhan_vien_id] ?? ''}
                    onChange={(e) => dat_mot(p.nhan_vien_id, e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hang-nut" style={{ marginTop: '0.75rem' }}>
        <button className="nut-chinh" disabled={hd.dang_chay || !du_chung_tu || !co_nhap}
          onClick={() => void gui()}>
          {hd.dang_chay ? 'Đang áp…' : 'Áp thưởng & tính lại'}
        </button>
        <button type="button" onClick={khi_dong}>Hủy</button>
        {!du_chung_tu && <span className="mo-ta">Cần nhập chứng từ duyệt (≥ 3 ký tự).</span>}
      </div>
    </HopThoai>
  );
}

/**
 * Khung TOAN MAN HINH (khong phai popup): bang luong chi tiet nhieu cot can ca man de doc. Phu kin
 * viewport, nen sang, co thanh dau dinh (tieu de + Quay lai). Esc = quay lai. Khac hop thoai o cho
 * KHONG co nen mo phia sau va dung het chieu rong — bang 15 cot khong bi bo hep.
 */
function KhungToanMan(
  { tieu_de, khi_dong, children }: { tieu_de: string; khi_dong: () => void; children: ReactNode },
): ReactNode {
  useEffect(() => {
    const f = (e: KeyboardEvent): void => { if (e.key === 'Escape') khi_dong(); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [khi_dong]);
  return (
    <div className="khung-toan-man" role="region" aria-label={tieu_de}>
      <div className="dau-toan-man">
        <h2 style={{ margin: 0 }}>{tieu_de}</h2>
        <button className="nut-phang" onClick={khi_dong}>← Quay lại</button>
      </div>
      {children}
    </div>
  );
}

/**
 * Sua cac khoan phu cap / khoan tru cua MOT phieu.
 *
 * Man hinh nay thay 15 cot cua bang tinh Excel cu. Bon dieu no phai noi ro:
 *   1. Khoan tinh theo cong thuc thi KHONG go tien — go so lan / so ngay, may nhan.
 *   2. Khoan mien thue duoc danh dau, vi de sai o do la tinh sai thue ca cong ty.
 *   3. Khoan co rui ro phap ly mang canh bao ngay canh o nhap, khong giau trong tai lieu.
 *   4. Khoan den TU CHINH SACH duoc danh dau rieng, va CHI sua khi nguoi dung bam "Ghi de".
 *
 * Diem 4 la ly do `dong` chi gieo tu cac dong GO TAY: neu gieo ca dong chinh sach thi mo hop
 * thoai roi bam Luu — khong sua gi — cung bien het chung thanh dong go tay, va tu do chinh
 * sach khong con dieu khien duoc phieu nay nua. Mot cu bam khong nen lam duoc chuyen do.
 */
function HopThoaiKhoan(
  { phieu, khi_dong, khi_xong }:
  { phieu: Phieu; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<KhoanDanhMuc[]>('/api/khoan-luong');
  const [dong, dat_dong] = useState<Record<string, { so_luong: string; so_tien: string }>>(
    Object.fromEntries(phieu.khoan.filter((k) => !k.tu_chinh_sach).map((k) => [k.khoan_ma, {
      so_luong: k.so_luong === null ? '' : String(Number(k.so_luong)),
      so_tien: String(Number(k.thanh_tien)),
    }])),
  );
  const hd = dung_hanh_dong();

  /** Dong dang do chinh sach dieu khien (va chua bi ghi de trong phien nay). */
  const theo_chinh_sach = new Map(
    phieu.khoan.filter((k) => k.tu_chinh_sach).map((k) => [k.khoan_ma, k]),
  );

  if (dang_tai) {
    return <HopThoai tieu_de="Các khoản" khi_dong={khi_dong}><DangTai /></HopThoai>;
  }
  if (loi !== null) {
    return <HopThoai tieu_de="Các khoản" khi_dong={khi_dong}><HopLoi loi={loi} /></HopThoai>;
  }

  // Khoan da tat trong danh muc nhung DANG co tren phieu van phai hien ra — neu khong,
  // luu lai mot cai la xoa mat no ma khong ai thay.
  const dm = du_lieu ?? [];
  const con_thieu = phieu.khoan
    .filter((k) => !dm.some((d) => d.ma === k.khoan_ma))
    .map((k): KhoanDanhMuc => ({
      ma: k.khoan_ma, ten: `${k.ten} (đã ngừng dùng)`, loai: k.loai, cach_tinh: k.cach_tinh,
      don_gia: k.don_gia, chiu_thue: k.chiu_thue, thu_tu: 9999, dang_dung: false,
      canh_bao: k.canh_bao, ghi_chu: null,
    }));
  const tat_ca = [...dm, ...con_thieu];

  const dat = (ma: string, khoa: 'so_luong' | 'so_tien', v: string): void => {
    dat_dong((truoc) => ({
      ...truoc,
      [ma]: { so_luong: '', so_tien: '', ...truoc[ma], [khoa]: v },
    }));
  };
  const bo = (ma: string): void => {
    dat_dong((truoc) => {
      const sau = { ...truoc };
      delete sau[ma];
      return sau;
    });
  };

  const nhom = (loai: 'thu_nhap' | 'tru'): KhoanDanhMuc[] => tat_ca.filter((d) => d.loai === loai);

  const o_nhap = (d: KhoanDanhMuc): ReactNode => {
    const co = dong[d.ma];
    if (co === undefined) {
      const cs = theo_chinh_sach.get(d.ma);
      if (cs !== undefined) {
        // Ghi de = dua khoan nay vao danh sach go tay, gieo san bang con so chinh sach dang
        // cho — de nguoi dung sua tu do chu khong phai go lai tu dau.
        return (
          <>
            <strong>{tien(cs.thanh_tien)} đ</strong>
            <button
              className="nut-nho"
              onClick={() => dat_dong((truoc) => ({
                ...truoc,
                [d.ma]: {
                  so_luong: cs.so_luong === null ? '' : String(Number(cs.so_luong)),
                  so_tien: String(Number(cs.thanh_tien)),
                },
              }))}
            >
              Ghi đè
            </button>
          </>
        );
      }
      return (
        <button className="nut-nho" onClick={() => dat(d.ma, 'so_luong', '')}>Thêm</button>
      );
    }
    return (
      <>
        {d.cach_tinh === 'nhap_tay' ? (
          <input
            type="number" min="0" inputMode="numeric" value={co.so_tien}
            aria-label={`Số tiền ${d.ten}`}
            onChange={(e) => dat(d.ma, 'so_tien', e.target.value)}
          />
        ) : (
          <input
            type="number" min="0" step="0.5" inputMode="decimal" value={co.so_luong}
            aria-label={`Số lượng ${d.ten}`}
            onChange={(e) => dat(d.ma, 'so_luong', e.target.value)}
          />
        )}
        <button className="nut-phang" onClick={() => bo(d.ma)}>Bỏ</button>
      </>
    );
  };

  const bang = (loai: 'thu_nhap' | 'tru', tieu_de: string): ReactNode => {
    const ds = nhom(loai);
    if (ds.length === 0) return null;
    return (
      <>
        <h4>{tieu_de}</h4>
        <table className="bang-gon">
          <tbody>
            {ds.map((d) => (
              <tr key={d.ma}>
                <td>
                  {d.ten}
                  {!d.chiu_thue && <span className="nhan-tot"> miễn thuế</span>}
                  {theo_chinh_sach.has(d.ma) && dong[d.ma] === undefined && (
                    <span className="nhan-mo"> theo chính sách</span>
                  )}
                  {theo_chinh_sach.has(d.ma) && dong[d.ma] !== undefined && (
                    <span className="nhan-canh-bao"> đã ghi đè cho kỳ này</span>
                  )}
                  {d.cach_tinh === 'so_luong_x_don_gia' && (
                    <div className="mo-ta">
                      Nhập SỐ LƯỢNG — đơn giá {tien(d.don_gia)} đ, máy nhân ra tiền.
                    </div>
                  )}
                  {d.cach_tinh === 'nua_ngay_luong' && (
                    <div className="mo-ta">
                      Nhập SỐ LẦN — mỗi lần bằng nửa lương một ngày của chính người này
                      ({tien(Number(phieu.luong_ngay) / 2)} đ).
                    </div>
                  )}
                  {d.canh_bao !== null && d.canh_bao !== '' && (
                    <div className="hop-luu-y">{d.canh_bao}</div>
                  )}
                </td>
                <td className="canh-phai">{o_nhap(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  return (
    <HopThoai tieu_de={`Các khoản — ${phieu.ho_ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Lương một ngày của người này: <strong>{tien(phieu.luong_ngay)} đ</strong>{' '}
        ({tien(phieu.luong_co_ban)} ÷ {Number(phieu.so_ngay_cong_chuan)} công chuẩn).
        Lưu xong hệ thống tính lại cả kỳ để tổng khớp với từng dòng.
      </p>
      {theo_chinh_sach.size > 0 && (
        <p className="mo-ta">
          Khoản gắn nhãn <span className="nhan-mo">theo chính sách</span> do{' '}
          <em>Phụ cấp</em> điều khiển và tự tính lại mỗi kỳ. Bấm <strong>Ghi đè</strong> nếu
          riêng kỳ này khác — muốn trả lại theo chính sách thì bấm <strong>Bỏ</strong>.
        </p>
      )}

      {bang('thu_nhap', 'Phụ cấp / thu nhập thêm')}
      {bang('tru', 'Các khoản trừ')}

      <div className="hang-nut">
        <button
          disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => goi(`/api/phieu-luong/${phieu.id}/khoan`, {
              method: 'PUT',
              body: {
                khoan: Object.entries(dong).map(([ma, v]) => ({
                  ma,
                  so_luong: v.so_luong === '' ? null : Number(v.so_luong),
                  so_tien: Number(v.so_tien) || 0,
                })),
              },
            }),
            'Đã lưu các khoản và tính lại kỳ lương.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Lưu
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

/**
 * Bang KE cac khoan tru cua mot phieu (chi doc): tung dong khoan loai `tru` tu chinh sach /
 * go tay, cong voi "Tru khac" (tam ung, doan phi...) neu co. Mo tu cot Khoan tru — de nguoi
 * xem biet con so tong gom nhung gi, khong phai mo man Sua.
 */
function HopThoaiKeKhoanTru(
  { phieu, khi_dong }: { phieu: Phieu; khi_dong: () => void },
): ReactNode {
  const cac_tru = phieu.khoan.filter((k) => k.loai === 'tru');
  const tru_khac = Number(phieu.tru_khac);
  const tong = cac_tru.reduce((a, k) => a + Number(k.thanh_tien), 0) + tru_khac;

  return (
    <HopThoai tieu_de={`Các khoản trừ — ${phieu.ho_ten}`} khi_dong={khi_dong}>
      {cac_tru.length === 0 && tru_khac === 0 ? (
        <p className="mo-ta">Phiếu này không có khoản trừ nào.</p>
      ) : (
        <table className="bang-gon">
          <tbody>
            {cac_tru.map((k) => (
              <tr key={k.khoan_ma}>
                <td>
                  {k.ten}
                  {k.tu_chinh_sach && <span className="nhan-mo"> theo chính sách</span>}
                  {k.ghi_chu !== null && k.ghi_chu !== '' && (
                    <div className="mo-ta">{k.ghi_chu}</div>
                  )}
                </td>
                <td className="canh-phai">{tien(k.thanh_tien)} đ</td>
              </tr>
            ))}
            {tru_khac > 0 && (
              <tr>
                <td>
                  Trừ khác
                  {phieu.ly_do_tru_khac !== null && phieu.ly_do_tru_khac !== '' && (
                    <div className="mo-ta">{phieu.ly_do_tru_khac}</div>
                  )}
                </td>
                <td className="canh-phai">{tien(tru_khac)} đ</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="hang-tong">
              <td><strong>Tổng khoản trừ</strong></td>
              <td className="canh-phai"><strong>{tien(tong)} đ</strong></td>
            </tr>
          </tfoot>
        </table>
      )}
      <p className="mo-ta">
        BHXH/YT/TN và thuế TNCN là các khoản trừ pháp lý riêng, xem ở cột tương ứng.
      </p>
      <div className="hang-nut">
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}

/**
 * Bang KE cac khoan PHU CAP / thu nhap them cua mot phieu (chi doc): tung dong khoan loai
 * `thu_nhap` tu chinh sach / go tay, cong voi "Phu cap khac" neu co. Mo tu cot Phu cap.
 */
function HopThoaiKePhuCap(
  { phieu, khi_dong }: { phieu: Phieu; khi_dong: () => void },
): ReactNode {
  const cac_pc = phieu.khoan.filter((k) => k.loai === 'thu_nhap');
  const pc_khac = Number(phieu.phu_cap_khac);
  const tong = cac_pc.reduce((a, k) => a + Number(k.thanh_tien), 0) + pc_khac;

  return (
    <HopThoai tieu_de={`Chi tiết phụ cấp — ${phieu.ho_ten}`} khi_dong={khi_dong}>
      {cac_pc.length === 0 && pc_khac === 0 ? (
        <p className="mo-ta">Phiếu này không có phụ cấp nào.</p>
      ) : (
        <table className="bang-gon">
          <tbody>
            {cac_pc.map((k) => (
              <tr key={k.khoan_ma}>
                <td>
                  {k.ten}
                  {k.tu_chinh_sach && <span className="nhan-mo"> theo chính sách</span>}
                  {k.so_luong !== null && k.don_gia !== null && (
                    <div className="mo-ta">{Number(k.so_luong)} × {tien(k.don_gia)} đ</div>
                  )}
                  {k.ghi_chu !== null && k.ghi_chu !== '' && (
                    <div className="mo-ta">{k.ghi_chu}</div>
                  )}
                </td>
                <td className="canh-phai">{tien(k.thanh_tien)} đ</td>
              </tr>
            ))}
            {pc_khac > 0 && (
              <tr>
                <td>Phụ cấp khác</td>
                <td className="canh-phai">{tien(pc_khac)} đ</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="hang-tong">
              <td><strong>Tổng phụ cấp</strong></td>
              <td className="canh-phai"><strong>{tien(tong)} đ</strong></td>
            </tr>
          </tfoot>
        </table>
      )}
      <p className="mo-ta">
        Phụ cấp theo chính sách tự tính lại mỗi kỳ theo chấm công; muốn sửa bấm nút <strong>Khoản</strong>.
      </p>
      <div className="hang-nut">
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}

function HopThoaiSuaPhieu(
  { phieu, khi_dong, khi_xong }:
  { phieu: Phieu; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [luong_co_ban, dat_luong_co_ban] = useState(String(Number(phieu.luong_co_ban)));
  const [phu_cap, dat_phu_cap] = useState(String(Number(phieu.phu_cap)));
  const [thuong, dat_thuong] = useState(String(Number(phieu.thuong)));
  const [phu_cap_khac, dat_phu_cap_khac] = useState(String(Number(phieu.phu_cap_khac)));
  const [tru_khac, dat_tru_khac] = useState(String(Number(phieu.tru_khac)));
  const [ly_do, dat_ly_do] = useState(phieu.ly_do_tru_khac ?? '');
  const [ghi_chu, dat_ghi_chu] = useState(phieu.ghi_chu ?? '');
  const [ep_du_cong, dat_ep_du_cong] = useState(phieu.ep_du_cong);
  const [mien_phat, dat_mien_phat] = useState(phieu.mien_phat);
  const [mien_thue, dat_mien_thue] = useState(phieu.mien_thue);
  const [mien_bh, dat_mien_bh] = useState(phieu.mien_bh);
  const [luong_net, dat_luong_net] = useState(phieu.luong_net);
  // Luong dong BH: trong = dong theo luong that. Chi hien so khi da khai muc rieng.
  const bh_khai_ban_dau = Number(phieu.luong_dong_bh) !== Number(phieu.luong_co_ban) + Number(phieu.phu_cap)
    ? String(Number(phieu.luong_dong_bh)) : '';
  const [luong_dong_bh, dat_luong_dong_bh] = useState(bh_khai_ban_dau);
  // YC-1: doi muc luong phai kem chung tu duyet.
  const [chung_tu, dat_chung_tu] = useState('');
  const admin = la_admin();
  const hd = dung_hanh_dong();

  const luong_doi = Number(luong_co_ban) !== Number(phieu.luong_co_ban)
    || Number(phu_cap) !== Number(phieu.phu_cap)
    || luong_dong_bh !== bh_khai_ban_dau;

  return (
    <HopThoai tieu_de={`Sửa phiếu — ${phieu.ho_ten}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <h3 style={{ margin: '0 0 0.5rem' }}>Lương cứng (áp từ tháng này trở đi)</h3>
      <label htmlFor="lcb">Lương cơ bản — P1 (đ)</label>
      <input id="lcb" type="number" min="0" value={luong_co_ban}
        onChange={(e) => dat_luong_co_ban(e.target.value)} />
      <label htmlFor="p2">Phụ cấp cố định — P2 (đ)</label>
      <input id="p2" type="number" min="0" value={phu_cap}
        onChange={(e) => dat_phu_cap(e.target.value)} />
      <label htmlFor="ldbh">Lương đóng BHXH (đ) — để trống nếu đóng theo lương thật</label>
      <input id="ldbh" type="number" min="0" value={luong_dong_bh}
        placeholder="theo lương thật (P1 + P2)"
        onChange={(e) => dat_luong_dong_bh(e.target.value)} />
      <p className="mo-ta" style={{ margin: '0 0 0.5rem' }}>
        Mức khai đóng BHXH/BHYT/BHTN — thường thấp hơn lương thật. Bỏ trống = đóng trên lương cứng
        (P1 + P2). BHXH/YT/TN sẽ tính trên mức này (vẫn áp trần theo luật).
      </p>
      <p className="mo-ta">
        Lương cứng = P1 + P2 (theo mẫu bảng lương công ty). Lưu vào <strong>quyết định lương</strong>
        {' '}hiệu lực từ đầu tháng của kỳ — các tháng sau vẫn giữ mức này cho tới khi có quyết định mới.
        Thử việc tự tính 85% theo tỷ lệ trong Tham số lương.
      </p>

      {luong_doi && (
        <label className="truong" style={{ marginTop: 8 }}>
          <span style={{ color: '#b00000' }}>Chứng từ duyệt mức lương (bắt buộc khi đổi lương) *</span>
          <input value={chung_tu} onChange={(e) => dat_chung_tu(e.target.value)}
            placeholder="VD: QĐ nâng lương số 12/2026 ngày 01/08 / biên bản thỏa thuận…" />
        </label>
      )}

      <h3 style={{ margin: '1rem 0 0.5rem' }}>Điều chỉnh riêng kỳ này</h3>
      <p className="mo-ta">
        Lương theo công, bảo hiểm và thuế đều suy ra từ chấm công và tham số pháp lý.
      </p>

      {(admin || phieu.ep_du_cong) && (
        <div className="hop-luu-y" style={{ margin: '0 0 0.75rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox" checked={ep_du_cong} disabled={!admin}
              onChange={(e) => dat_ep_du_cong(e.target.checked)}
            />
            <span>
              <strong>Tính đủ công</strong> — coi công thực = công chuẩn để trả đủ lương tháng,
              bất kể chấm công thực tế. <strong>Chỉ admin</strong> được tích. Phụ cấp theo công
              vẫn tính theo chấm công thật.
            </span>
          </label>
        </div>
      )}

      {(admin || phieu.mien_phat) && (
        <div className="hop-luu-y" style={{ margin: '0 0 0.75rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox" checked={mien_phat} disabled={!admin}
              onChange={(e) => dat_mien_phat(e.target.checked)}
            />
            <span>
              <strong>Miễn phạt</strong> — bỏ các khoản phạt đi muộn tự động (50k / nửa ngày công)
              cho phiếu này. <strong>Chỉ admin</strong> được tích. Không ảnh hưởng khoản trừ gõ tay
              hay kỷ luật.
            </span>
          </label>
        </div>
      )}

      {(admin || phieu.mien_thue) && (
        <div className="hop-luu-y" style={{ margin: '0 0 0.75rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox" checked={mien_thue} disabled={!admin}
              onChange={(e) => dat_mien_thue(e.target.checked)}
            />
            <span>
              <strong>Miễn thuế TNCN</strong> — không trừ thuế thu nhập cá nhân cho phiếu này
              (thuế = 0). <strong>Chỉ admin</strong> được tích.
            </span>
          </label>
        </div>
      )}

      {(admin || phieu.mien_bh) && (
        <div className="hop-luu-y" style={{ margin: '0 0 0.75rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox" checked={mien_bh} disabled={!admin}
              onChange={(e) => dat_mien_bh(e.target.checked)}
            />
            <span>
              <strong>Miễn BHXH/BHYT/BHTN</strong> — KHÔNG phát sinh bảo hiểm bắt buộc cho phiếu này
              (căn cứ đóng = 0, công ty cũng không đóng). <strong>Chỉ admin</strong> được tích.
            </span>
          </label>
        </div>
      )}

      {(admin || phieu.luong_net) && (
        <div className="hop-luu-y" style={{ margin: '0 0 0.75rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox" checked={luong_net} disabled={!admin}
              onChange={(e) => dat_luong_net(e.target.checked)}
            />
            <span>
              <strong>Lương NET</strong> — công ty gánh BHXH của người lao động: <strong>không trừ</strong>
              {' '}phần BH của NLĐ khỏi thực lĩnh, nhưng BHXH <strong>vẫn tính &amp; đóng đủ</strong> và
              vẫn được giữ trong giảm trừ khi tính thuế TNCN. Khác "Miễn BHXH". <strong>Chỉ admin</strong>
              {' '}được tích.
            </span>
          </label>
        </div>
      )}

      <label htmlFor="thuong">Thưởng (đ)</label>
      <input id="thuong" type="number" min="0" value={thuong}
        onChange={(e) => dat_thuong(e.target.value)} />

      <label htmlFor="pck">Phụ cấp khác (đ)</label>
      <input id="pck" type="number" min="0" value={phu_cap_khac}
        onChange={(e) => dat_phu_cap_khac(e.target.value)} />

      <label htmlFor="tru">Trừ khác (đ)</label>
      <input id="tru" type="number" min="0" value={tru_khac}
        onChange={(e) => dat_tru_khac(e.target.value)} />
      <p className="mo-ta">
        Dùng cho tạm ứng, đoàn phí… <strong>Không dùng để phạt tiền.</strong> Bộ luật Lao động
        2019 Điều 127 cấm phạt tiền và cấm trừ lương thay cho kỷ luật lao động.
      </p>

      <label htmlFor="lydo">Lý do trừ khác</label>
      <input id="lydo" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)} />

      <label htmlFor="gc">Ghi chú</label>
      <input id="gc" value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)} />

      <div className="hang-nut">
        <button
          disabled={hd.dang_chay || (luong_doi && chung_tu.trim().length < 3)}
          onClick={() => void hd.chay(
            async () => {
              // Luu luong cung TRUOC (tao quyet dinh luong + tinh lai), roi luu dieu chinh rieng
              // ky (tinh_ky_luong giu lai thuong/tru_khac nen thu tu nay dung).
              if (luong_doi) {
                await goi(`/api/phieu-luong/${phieu.id}/luong-cung`, {
                  method: 'PUT',
                  body: {
                    luong_co_ban: Number(luong_co_ban) || 0,
                    phu_cap: Number(phu_cap) || 0,
                    // Trong = 0 = dong theo luong that; co so = khai muc rieng.
                    luong_dong_bh: luong_dong_bh === '' ? 0 : Number(luong_dong_bh) || 0,
                    chung_tu_mo_ta: chung_tu,
                  },
                });
              }
              return goi(`/api/phieu-luong/${phieu.id}`, {
                method: 'PATCH',
                body: {
                  thuong: Number(thuong) || 0,
                  phu_cap_khac: Number(phu_cap_khac) || 0,
                  tru_khac: Number(tru_khac) || 0,
                  ly_do_tru_khac: ly_do,
                  ghi_chu,
                  // Chi gui khi la admin — server cung chan, nhung khong gui thi nhan su thuong
                  // sua thuong/tru ma khong vo tinh dong vao hai co nay.
                  ...(admin ? { ep_du_cong, mien_phat, mien_thue, mien_bh, luong_net } : {}),
                },
              });
            },
            'Đã lưu và tính lại kỳ lương.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Lưu
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

// ============================================================ khoi luong Trung Quoc (CNY)

interface PhieuCny {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  luong_co_ban: string;
  phu_cap: string;
  so_ngay_cong_chuan: string;
  so_ngay_cong_thuc: string;
  luong_theo_cong: string;
  thuong: string;
  phu_cap_khac: string;
  tru_khac: string;
  ly_do_tru_khac: string | null;
  tong_thu_nhap: string;
  thuc_linh: string;
  ghi_chu: string | null;
}

/**
 * Tab luong Trung Quoc (CNY): nhom che_do_luong = 'tq'. Tinh theo cong y het VND nhung tien CNY
 * va KHONG BHXH/thue. Dung chung ky luong (thang).
 */
function BangCny(
  { ky, sua_duoc, khi_doi }:
  { ky: { id: string; thang: string }; sua_duoc: boolean; khi_doi: () => void },
): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } =
    dung_nap<{ phieu: PhieuCny[] }>(`/api/ky-luong/${ky.id}/cny`);
  const [sua, dat_sua] = useState<PhieuCny | null>(null);
  const hd = dung_hanh_dong();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const phieu = du_lieu?.phieu ?? [];

  return (
    <>
      <div className="hop-luu-y">
        Nhóm nhận lương <strong>CNY</strong> (chế độ lương Trung Quốc) — tính theo công như bảng
        VND nhưng <strong>không khấu trừ BHXH/thuế</strong>. Gán chế độ lương ở mục Nhân sự.
      </div>
      <div className="hang-nut">
        {sua_duoc && (
          <button
            disabled={hd.dang_chay}
            onClick={() => void hd.chay(
              () => goi(`/api/ky-luong/${ky.id}/tinh-cny`, { method: 'POST' }),
              'Đã tính lại lương CNY.',
            ).then((ok) => { if (ok !== null) { nap_lai(); khi_doi(); } })}
          >
            Tính lương CNY
          </button>
        )}
        <button className="nut-phang" disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => tai_tep(`/api/ky-luong/${ky.id}/xuat-xlsx-cny`, `luong_cny_${ky.thang}.xlsx`))}>
          Xuất Excel
        </button>
        <button className="nut-phang" disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => tai_tep(`/api/ky-luong/${ky.id}/xuat-csv-cny`, `luong_cny_${ky.thang}.csv`))}>
          Xuất CSV
        </button>
      </div>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      {phieu.length === 0 ? (
        <Trong
          tieu_de="Chưa có phiếu lương CNY"
          mo_ta={String.raw`Bấm "Tính lương CNY" để sinh phiếu cho nhân sự chế độ lương Trung Quốc.`}
        />
      ) : (
        <div className="vo-bang">
          <table className="bang-gon bang-neo-cot-dau">
            <thead>
              <tr>
                <th>Mã NV</th><th>Họ tên</th><th>Phòng ban</th>
                <th className="canh-phai">Lương cơ bản</th>
                <th className="canh-phai">Phụ cấp</th>
                <th className="canh-phai">Công</th>
                <th className="canh-phai">Lương theo công</th>
                <th className="canh-phai">Thưởng</th>
                <th className="canh-phai">Phụ cấp khác</th>
                <th className="canh-phai">Trừ khác</th>
                <th className="canh-phai">Thực lĩnh</th>
                {sua_duoc && <th />}
              </tr>
            </thead>
            <tbody>
              {phieu.map((p) => (
                <tr key={p.id}>
                  <td>{p.ma_nv}</td>
                  <td>{p.ho_ten}</td>
                  <td>{p.phong_ban ?? <span className="mo-ta">—</span>}</td>
                  <td className="canh-phai">{tien(p.luong_co_ban)}</td>
                  <td className="canh-phai">{tien(p.phu_cap)}</td>
                  <td className="canh-phai">
                    {Number(p.so_ngay_cong_thuc)}/{Number(p.so_ngay_cong_chuan)}
                  </td>
                  <td className="canh-phai">{tien(p.luong_theo_cong)}</td>
                  <td className="canh-phai">{tien(p.thuong)}</td>
                  <td className="canh-phai">{tien(p.phu_cap_khac)}</td>
                  <td className="canh-phai">{tien(p.tru_khac)}</td>
                  <td className="canh-phai"><strong>{tien(p.thuc_linh)}</strong> ¥</td>
                  {sua_duoc && (
                    <td className="canh-phai">
                      <button className="nut-phang" onClick={() => dat_sua(p)}>Sửa</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="hang-tong">
                <td colSpan={3}><strong>Tổng cộng ({phieu.length} người)</strong></td>
                <td className="canh-phai"><strong>{tien(phieu.reduce((a, p) => a + Number(p.luong_co_ban), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(phieu.reduce((a, p) => a + Number(p.phu_cap), 0))}</strong></td>
                <td className="canh-phai mo-ta">—</td>
                <td className="canh-phai"><strong>{tien(phieu.reduce((a, p) => a + Number(p.luong_theo_cong), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(phieu.reduce((a, p) => a + Number(p.thuong), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(phieu.reduce((a, p) => a + Number(p.phu_cap_khac), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(phieu.reduce((a, p) => a + Number(p.tru_khac), 0))}</strong></td>
                <td className="canh-phai"><strong>{tien(phieu.reduce((a, p) => a + Number(p.thuc_linh), 0))} ¥</strong></td>
                {sua_duoc && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {sua !== null && (
        <HopThoaiSuaPhieuCny
          phieu={sua}
          khi_dong={() => dat_sua(null)}
          khi_xong={() => { dat_sua(null); nap_lai(); khi_doi(); }}
        />
      )}
    </>
  );
}

function HopThoaiSuaPhieuCny(
  { phieu, khi_dong, khi_xong }:
  { phieu: PhieuCny; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [luong_co_ban, dat_luong_co_ban] = useState(String(Number(phieu.luong_co_ban)));
  const [phu_cap, dat_phu_cap] = useState(String(Number(phieu.phu_cap)));
  const [thuong, dat_thuong] = useState(String(Number(phieu.thuong)));
  const [phu_cap_khac, dat_phu_cap_khac] = useState(String(Number(phieu.phu_cap_khac)));
  const [tru_khac, dat_tru_khac] = useState(String(Number(phieu.tru_khac)));
  const [ly_do, dat_ly_do] = useState(phieu.ly_do_tru_khac ?? '');
  const [ghi_chu, dat_ghi_chu] = useState(phieu.ghi_chu ?? '');
  const hd = dung_hanh_dong();

  return (
    <HopThoai tieu_de={`Sửa phiếu CNY — ${phieu.ho_ten}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <h3 style={{ margin: '0 0 0.5rem' }}>Lương cứng CNY (áp từ tháng này trở đi)</h3>
      <label htmlFor="cny-lcb">Lương cơ bản (¥)</label>
      <input id="cny-lcb" type="number" min="0" value={luong_co_ban}
        onChange={(e) => dat_luong_co_ban(e.target.value)} />
      <label htmlFor="cny-pc">Phụ cấp cố định (¥)</label>
      <input id="cny-pc" type="number" min="0" value={phu_cap}
        onChange={(e) => dat_phu_cap(e.target.value)} />
      <p className="mo-ta">
        Lưu vào <strong>quyết định lương CNY</strong> hiệu lực từ đầu tháng của kỳ — các tháng
        sau vẫn giữ mức này cho tới khi có quyết định mới. Không áp BHXH/thuế Việt Nam.
      </p>

      <h3 style={{ margin: '1rem 0 0.5rem' }}>Điều chỉnh riêng kỳ này (¥)</h3>
      <label htmlFor="cny-thuong">Thưởng (¥)</label>
      <input id="cny-thuong" type="number" min="0" value={thuong}
        onChange={(e) => dat_thuong(e.target.value)} />
      <label htmlFor="cny-pck">Phụ cấp khác (¥)</label>
      <input id="cny-pck" type="number" min="0" value={phu_cap_khac}
        onChange={(e) => dat_phu_cap_khac(e.target.value)} />
      <label htmlFor="cny-tru">Trừ khác (¥)</label>
      <input id="cny-tru" type="number" min="0" value={tru_khac}
        onChange={(e) => dat_tru_khac(e.target.value)} />
      <label htmlFor="cny-lydo">Lý do trừ khác</label>
      <input id="cny-lydo" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)} />
      <label htmlFor="cny-gc">Ghi chú</label>
      <input id="cny-gc" value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)} />

      <div className="hang-nut">
        <button
          disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => goi(`/api/phieu-luong-cny/${phieu.id}`, {
              method: 'PATCH',
              body: {
                luong_co_ban: Number(luong_co_ban) || 0,
                phu_cap: Number(phu_cap) || 0,
                thuong: Number(thuong) || 0,
                phu_cap_khac: Number(phu_cap_khac) || 0,
                tru_khac: Number(tru_khac) || 0,
                ly_do_tru_khac: ly_do,
                ghi_chu,
              },
            }),
            'Đã lưu và tính lại lương CNY.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Lưu
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}


/**
 * Ban chot da duyet: bang cham cong thang va bang luong thang.
 *
 * Duyet ky luong sinh ra CA HAI, va do la co y: nguoi duyet bang luong dang duyet ca bang cong
 * ma bang luong duoc tinh tu do. Tach ra hai lan duyet rieng nghia la co the ton tai mot bang
 * luong da duyet dua tren mot bang cong chua duyet.
 *
 * Ban goc phap ly KHONG phai tep XLSX — no la du lieu trong CSDL cong voi "ai duyet, luc nao".
 * Tep chi la ban ket xuat, va man hinh nay noi ro dieu do.
 */
function KhoiBanChot(): ReactNode {
  const { du_lieu, dang_tai, loi } =
    dung_nap<{ danh_sach: BanChot[] }>('/api/ban-chot');
  const [dang_tai_tep, dat_dang_tai_tep] = useState('');

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu?.danh_sach ?? [];
  if (ds.length === 0) return null;

  const tai = (b: BanChot) => (): void => {
    dat_dang_tai_tep(b.id);
    void tai_tep(`/api/ban-chot/${b.id}/tai`, b.ten_goc)
      .finally(() => dat_dang_tai_tep(''));
  };

  return (
    <div className="the">
      <h3>Bản chốt đã duyệt</h3>
      <p className="mo-ta">
        Sinh ra lúc kỳ lương được duyệt, và đẩy lên thư viện HCNS trên SharePoint —{' '}
        <code>04.1 Thang bảng lương &amp; Bảng lương</code> cho bảng lương,{' '}
        <code>05.1 Bảng chấm công tháng</code> cho bảng chấm công.{' '}
        <strong>Bản gốc pháp lý là dữ liệu trong hệ thống</strong> cùng với thông tin ai duyệt
        lúc nào; tệp XLSX chỉ là bản kết xuất, sinh lại được.
      </p>
      <div className="vo-bang">
        <table className="bang-gon">
          <thead>
            <tr><th>Kỳ</th><th>Loại</th><th>Số dòng</th><th>Duyệt lúc</th><th>Duyệt bởi</th><th /></tr>
          </thead>
          <tbody>
            {ds.map((b) => (
              <tr key={b.id}>
                <td><strong>{b.ky}</strong></td>
                <td>{b.loai === 'bang_cong' ? 'Bảng chấm công' : 'Bảng lương'}</td>
                <td>
                  {b.so_dong === 0
                    ? <span className="nhan-xau">0 — cần người xem</span>
                    : b.so_dong}
                </td>
                <td>{ngay_gio(b.duyet_luc)}</td>
                <td>{b.duyet_boi ?? <span className="mo-ta">—</span>}</td>
                <td>
                  <button
                    className="nut-nho"
                    disabled={dang_tai_tep === b.id}
                    onClick={tai(b)}
                  >
                    Tải về
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
