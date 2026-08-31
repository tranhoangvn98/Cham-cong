// Bang luong: tinh tu cham cong, sua tay phan thuong/tru, gui duyet, admin chot.
//
// Hai dieu trang nay phai noi that ro, vi day la tien that cua nguoi that:
//   1. Tham so phap ly (BHXH, giam tru gia canh) do CON NGUOI khai, khong phai chan ly.
//      He thong gieo san mot bo mac dinh — ke toan PHAI doi chieu truoc khi tra luong.
//   2. Trang thai ky quyet dinh sua duoc hay khong. Da gui duyet la khoa, de nguoi duyet
//      khong bi doi so lieu duoi chan.
import { useState, type ReactNode } from 'react';
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
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  loai_hop_dong: string | null;
  luong_co_ban: string;
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
  const hd = dung_hanh_dong();

  if (dang_tai) return <HopThoai tieu_de="Kỳ lương" khi_dong={khi_dong}><DangTai /></HopThoai>;
  if (loi !== null || du_lieu === null) {
    return <HopThoai tieu_de="Kỳ lương" khi_dong={khi_dong}><HopLoi loi={loi} /></HopThoai>;
  }

  const k = du_lieu;
  const sua_duoc = k.trang_thai === 'nhap';

  const chay = (duong_dan: string, thong_bao: string) => () => {
    void hd.chay(() => goi(duong_dan, { method: 'POST' }), thong_bao)
      .then(() => { nap_lai(); khi_doi(); });
  };

  return (
    <HopThoai tieu_de={`Bảng lương tháng ${k.thang}`} khi_dong={khi_dong} toan_man>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

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
        {sua_duoc && k.so_phieu > 0 && (
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
          <button
            disabled={hd.dang_chay}
            onClick={chay(`/api/ky-luong/${k.id}/da-tra`, 'Đã đánh dấu đã trả lương.')}
          >
            Đánh dấu đã trả
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
                <th className="canh-phai">Công</th>
                <th className="canh-phai">Lương theo công</th>
                <th className="canh-phai">OT</th>
                <th className="canh-phai">Thưởng</th>
                <th className="canh-phai">Phụ cấp</th>
                <th className="canh-phai">Tổng thu nhập</th>
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
                    <td className="canh-phai">
                      {Number(p.so_ngay_cong_thuc)}/{Number(p.so_ngay_cong_chuan)}
                    </td>
                    <td className="canh-phai">{tien(p.luong_theo_cong)}</td>
                    <td className="canh-phai">{tien(p.tien_ot)}</td>
                    <td className="canh-phai">{tien(p.thuong)}</td>
                    <td className="canh-phai">
                      {tien(Number(p.khoan_thu_nhap) + Number(p.phu_cap_khac))}
                    </td>
                    <td className="canh-phai">{tien(p.tong_thu_nhap)}</td>
                    <td className="canh-phai">{tien(bh)}</td>
                    <td className="canh-phai">{tien(p.thue_tncn)}</td>
                    <td className="canh-phai">{tien(tru)}</td>
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
          </table>
        </div>
      )}

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
    </HopThoai>
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

function HopThoaiSuaPhieu(
  { phieu, khi_dong, khi_xong }:
  { phieu: Phieu; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [thuong, dat_thuong] = useState(String(Number(phieu.thuong)));
  const [phu_cap_khac, dat_phu_cap_khac] = useState(String(Number(phieu.phu_cap_khac)));
  const [tru_khac, dat_tru_khac] = useState(String(Number(phieu.tru_khac)));
  const [ly_do, dat_ly_do] = useState(phieu.ly_do_tru_khac ?? '');
  const [ghi_chu, dat_ghi_chu] = useState(phieu.ghi_chu ?? '');
  const hd = dung_hanh_dong();

  return (
    <HopThoai tieu_de={`Sửa phiếu — ${phieu.ho_ten}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Chỉ sửa được thưởng, phụ cấp khác và trừ khác. Lương theo công, bảo hiểm và thuế đều
        suy ra từ chấm công và tham số pháp lý — sửa tay thì số liệu không còn đối chiếu được
        với gì nữa.
      </p>

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
          disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => goi(`/api/phieu-luong/${phieu.id}`, {
              method: 'PATCH',
              body: {
                thuong: Number(thuong) || 0,
                phu_cap_khac: Number(phu_cap_khac) || 0,
                tru_khac: Number(tru_khac) || 0,
                ly_do_tru_khac: ly_do,
                ghi_chu,
              },
            }),
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
