// Phieu luong CUA TOI: nhan vien tu xem phieu luong hang thang da duyet/da tra, xem TUNG khoan.
//
// Mot bang luong khong giai thich duoc la mot don khieu nai — nen o day hien tung khoan thu
// nhap va tung khoan tru, khong gop thanh mot con so "phu cap".
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

interface KhoanPhieu {
  khoan_ma: string;
  ten: string;
  loai: 'thu_nhap' | 'tru';
  so_luong: string | null;
  don_gia: string | null;
  thanh_tien: string;
  ghi_chu: string | null;
  chiu_thue: boolean;
}

interface Phieu {
  id: string;
  thang: string;
  trang_thai_ky: string;
  luong_co_ban: string;
  phu_cap: string;
  so_ngay_cong_chuan: string;
  so_ngay_cong_thuc: string;
  luong_ngay: string;
  luong_theo_cong: string;
  phut_ot: string;
  tien_ot: string;
  thuong: string;
  phu_cap_khac: string;
  tong_thu_nhap: string;
  muc_dong_bh: string;
  so_nguoi_phu_thuoc: string;
  giam_tru_tong: string;
  thu_nhap_tinh_thue: string;
  bhxh_nld: string;
  bhyt_nld: string;
  bhtn_nld: string;
  thue_tncn: string;
  tru_khac: string;
  tong_tru: string;
  thuc_linh: string;
  thuc_linh_lam_tron: string;
  loai_hop_dong: string | null;
  ep_du_cong: boolean;
  mien_phat: boolean;
  khoan: KhoanPhieu[];
}

interface KhieuNai {
  id: string;
  ma: string | null;
  noi_dung: string;
  trang_thai: string;
  phan_hoi: string | null;
  tao_luc: string;
  thang: string;
}

const NHAN_TT_KN: Record<string, { ten: string; lop: string }> = {
  moi: { ten: 'Mới', lop: 'nhan-xau' },
  dang_xem: { ten: 'Đang xem xét', lop: 'nhan-canh-bao' },
  chap_nhan: { ten: 'Đã chấp nhận', lop: 'nhan-tot' },
  tu_choi: { ten: 'Đã từ chối', lop: 'nhan-mo' },
};

const dinh_dang = new Intl.NumberFormat('vi-VN');
const tien = (v: unknown): string => dinh_dang.format(Math.round(Number(v) || 0));
const thang_viet = (t: string): string => {
  const [n, m] = t.split('-');
  return `Tháng ${m}/${n}`;
};
const TRANG_THAI: Record<string, string> = { da_duyet: 'Đã duyệt', da_tra: 'Đã trả' };
const LOAI_HD: Record<string, string> = {
  thu_viec: 'Thử việc', xac_dinh: 'Xác định thời hạn', khong_xac_dinh: 'Không xác định thời hạn',
  thoi_vu: 'Thời vụ', cong_tac_vien: 'Cộng tác viên', hoc_viec: 'Học việc',
};

export function TrangPhieuLuongToi({ thang_loc }: { thang_loc?: string } = {}): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<Phieu[]>('/api/toi/phieu-luong');
  const kn = dung_nap<KhieuNai[]>('/api/toi/khieu-nai-luong');
  const [chon, dat_chon] = useState(0);
  const [mo_kn, dat_mo_kn] = useState(false);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  // `thang_loc` (khi nhung trong màn Lương cá nhân): chỉ hiện phiếu của tháng đó, ẩn ô chọn kỳ.
  const ds = thang_loc != null
    ? (du_lieu ?? []).filter((x) => x.thang === thang_loc)
    : (du_lieu ?? []);
  if (ds.length === 0) {
    return (
      <Trong tieu_de="Chưa có phiếu lương"
        mo_ta="Phiếu lương hiện sau khi kế toán chốt và duyệt kỳ lương của tháng." />
    );
  }

  const p = ds[Math.min(chon, ds.length - 1)]!;
  const thu_nhap = p.khoan.filter((k) => k.loai === 'thu_nhap');
  const khau_tru = p.khoan.filter((k) => k.loai === 'tru');
  // Cac khoan PHAT (di muon / nua ngay do di muon) — de hien ro "chi tiet phat" cho nguoi bi phat,
  // hoac ghi "da mien phat" khi admin da mien va khong co dong phat nao.
  const co_khoan_phat = khau_tru.some(
    (k) => k.khoan_ma === 'tru_di_muon' || k.khoan_ma === 'tru_nua_ngay',
  );

  return (
    <>
      {thang_loc == null && (
        <div className="dau-trang">
          <div>
            <p className="mo-ta">Phiếu lương hàng tháng của bạn — xem chi tiết từng khoản.</p>
          </div>
          <button className="nut-phang" onClick={() => window.print()}>In phiếu</button>
        </div>
      )}

      {thang_loc == null && (
        <div className="bo-loc">
          <div className="o-nhap">
            <label htmlFor="ky">Kỳ lương</label>
            <select id="ky" value={chon} onChange={(e) => dat_chon(Number(e.target.value))}>
              {ds.map((x, i) => (
                <option key={x.id} value={i}>
                  {thang_viet(x.thang)} — {TRANG_THAI[x.trang_thai_ky] ?? x.trang_thai_ky}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="the phieu-luong">
        <div className="phieu-dau">
          <div>
            <h2>{thang_viet(p.thang)}</h2>
            <span className="nhan nhan-tot">{TRANG_THAI[p.trang_thai_ky] ?? p.trang_thai_ky}</span>
            {p.loai_hop_dong !== null && (
              <span className="nhan nhan-mo"> {LOAI_HD[p.loai_hop_dong] ?? p.loai_hop_dong}</span>
            )}
            {p.ep_du_cong && (
              <span className="nhan nhan-canh-bao" title="Được tính đủ ngày công (miễn chấm công)">
                {' '}Đủ công
              </span>
            )}
            {p.mien_phat && (
              <span className="nhan nhan-canh-bao" title="Được miễn phạt đi muộn/về sớm">
                {' '}Miễn phạt
              </span>
            )}
          </div>
          <div className="phieu-thuc-linh">
            <span className="mo-ta">Thực nhận</span>
            <strong>{tien(p.thuc_linh_lam_tron)} đ</strong>
          </div>
        </div>

        <div className="phieu-cong">
          <span>Công chuẩn: <strong>{p.so_ngay_cong_chuan}</strong></span>
          <span>Công thực tế: <strong>{p.so_ngay_cong_thuc}</strong></span>
          <span>Lương cơ bản: <strong>{tien(p.luong_co_ban)} đ</strong></span>
          <span>Lương/ngày công: <strong>{tien(p.luong_ngay)} đ</strong></span>
        </div>

        <h3>Thu nhập</h3>
        <div className="vo-bang">
          <table>
            <tbody>
              <tr>
                <td>Lương theo công</td>
                <td className="phai">{tien(p.luong_theo_cong)}</td>
              </tr>
              {Number(p.tien_ot) > 0 && (
                <tr>
                  <td>Làm thêm giờ (OT){Number(p.phut_ot) > 0 &&
                    <span className="mo-ta"> {Math.floor(Number(p.phut_ot) / 60)}h{Number(p.phut_ot) % 60 > 0 ? String(Number(p.phut_ot) % 60).padStart(2, '0') : ''}</span>}</td>
                  <td className="phai">{tien(p.tien_ot)}</td>
                </tr>
              )}
              {thu_nhap.map((k) => (
                <tr key={k.khoan_ma}>
                  <td>{k.ten}{k.chiu_thue ? '' : ' (miễn thuế)'}
                    {k.so_luong !== null && Number(k.so_luong) > 0 &&
                      <span className="mo-ta"> × {k.so_luong}</span>}</td>
                  <td className="phai">{tien(k.thanh_tien)}</td>
                </tr>
              ))}
              {Number(p.thuong) > 0 && (
                <tr><td>Thưởng</td><td className="phai">{tien(p.thuong)}</td></tr>
              )}
              {Number(p.phu_cap_khac) > 0 && (
                <tr><td>Phụ cấp khác</td><td className="phai">{tien(p.phu_cap_khac)}</td></tr>
              )}
              <tr className="hang-tong">
                <td><strong>Tổng thu nhập</strong></td>
                <td className="phai"><strong>{tien(p.tong_thu_nhap)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Khấu trừ</h3>
        <div className="vo-bang">
          <table>
            <tbody>
              <tr><td>BHXH (8%)</td><td className="phai">{tien(p.bhxh_nld)}</td></tr>
              <tr><td>BHYT (1,5%)</td><td className="phai">{tien(p.bhyt_nld)}</td></tr>
              <tr><td>BHTN (1%)</td><td className="phai">{tien(p.bhtn_nld)}</td></tr>
              {Number(p.thue_tncn) > 0 && (
                <tr><td>Thuế TNCN</td><td className="phai">{tien(p.thue_tncn)}</td></tr>
              )}
              {khau_tru.map((k) => (
                <tr key={k.khoan_ma}>
                  <td>{k.ten}
                    {k.so_luong !== null && Number(k.so_luong) > 0 &&
                      <span className="mo-ta"> × {k.so_luong}</span>}</td>
                  <td className="phai">{tien(k.thanh_tien)}</td>
                </tr>
              ))}
              {Number(p.tru_khac) > 0 && (
                <tr><td>Trừ khác</td><td className="phai">{tien(p.tru_khac)}</td></tr>
              )}
              {p.mien_phat && !co_khoan_phat && (
                <tr><td className="mo-ta" colSpan={2}>Đã miễn phạt đi muộn/về sớm kỳ này (không trừ).</td></tr>
              )}
              <tr className="hang-tong">
                <td><strong>Tổng khấu trừ</strong></td>
                <td className="phai"><strong>{tien(p.tong_tru)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="phieu-ket">
          <span>Thực nhận (làm tròn)</span>
          <strong>{tien(p.thuc_linh_lam_tron)} đ</strong>
        </div>

        <div className="hop-thong-bao" style={{ marginTop: 12, fontSize: 13 }}>
          <strong>Chi tiết thuế &amp; bảo hiểm</strong>
          <div className="mo-ta" style={{ marginTop: 4 }}>
            Mức lương đóng BHXH: <strong>{tien(p.muc_dong_bh)} đ</strong> · Giảm trừ gia cảnh:
            bản thân + <strong>{p.so_nguoi_phu_thuoc}</strong> người phụ thuộc
            (tổng {tien(p.giam_tru_tong)} đ) · Thu nhập tính thuế: {tien(p.thu_nhap_tinh_thue)} đ
          </div>
        </div>
      </div>

      <div
        className="phieu-ket-nut"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          border: '1.5px solid #DC2626', background: '#FEF2F2',
          borderRadius: 8, padding: '12px 14px', marginTop: 12,
        }}
      >
        <span style={{ color: '#B91C1C', fontSize: 13, flex: '1 1 220px' }}>
          Thấy sai số liệu? Gửi <strong>khiếu nại</strong> để Phòng Nhân sự tiếp nhận và chỉnh sửa.
        </span>
        <button
          className="nut-phang"
          style={{ borderColor: '#DC2626', color: '#fff', background: '#DC2626', fontWeight: 600 }}
          onClick={() => dat_mo_kn(true)}
        >
          Khiếu nại phiếu lương này
        </button>
      </div>

      {(() => {
        const cua_ky = (kn.du_lieu ?? []).filter((x) => x.thang === p.thang);
        if (cua_ky.length === 0) return null;
        return (
          <div className="the the-mong">
            <h3 style={{ marginTop: 0 }}>Khiếu nại của bạn về kỳ này</h3>
            {cua_ky.map((x) => (
              <div key={x.id} className="hop-thong-bao" style={{ marginBottom: 8 }}>
                <div>
                  <span className={`nhan ${NHAN_TT_KN[x.trang_thai]?.lop ?? 'nhan-mo'}`}>
                    {NHAN_TT_KN[x.trang_thai]?.ten ?? x.trang_thai}
                  </span>
                  <span className="mo-ma"> {x.ma ?? ''} · {ngay_gio(x.tao_luc)}</span>
                </div>
                <div style={{ marginTop: 4 }}>{x.noi_dung}</div>
                {x.phan_hoi !== null && (
                  <div className="hop-tot" style={{ marginTop: 6 }}>
                    <strong>Phản hồi:</strong> {x.phan_hoi}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {thang_loc == null && (
        <div className="hop-thong-bao hop-luu-y">
          Phiếu lương chỉ hiện khi kỳ đã được duyệt/trả. Nếu thấy sai, bấm
          <strong> Khiếu nại phiếu lương này</strong> để gửi Phòng Nhân sự, hoặc gửi giải trình ở mục
          <strong> Đơn của tôi</strong> — mỗi khoản đều ghi rõ để đối chiếu.
        </div>
      )}

      {mo_kn && (
        <HopThoaiKhieuNaiLuong
          phieu_id={p.id} thang={thang_viet(p.thang)}
          khi_dong={() => dat_mo_kn(false)}
          khi_xong={() => { dat_mo_kn(false); kn.nap_lai(); }}
        />
      )}
    </>
  );
}

function HopThoaiKhieuNaiLuong(
  { phieu_id, thang, khi_dong, khi_xong }:
  { phieu_id: string; thang: string; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [noi_dung, dat_noi_dung] = useState('');
  const hd = dung_hanh_dong();

  const gui = (): void => {
    void hd.chay(
      () => goi('/api/toi/khieu-nai-luong', { method: 'POST', body: { phieu_luong_id: phieu_id, noi_dung } }),
      'Đã gửi khiếu nại.',
    ).then((ok) => { if (ok) khi_xong(); });
  };

  return (
    <HopThoai tieu_de={`Khiếu nại phiếu lương ${thang}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Mô tả rõ khoản bạn cho là chưa đúng (công, thưởng, phụ cấp, khấu trừ…) để Phòng Nhân sự
        đối chiếu và phản hồi.
      </p>
      <label htmlFor="knnd">Nội dung khiếu nại</label>
      <textarea id="knnd" value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)}
        placeholder="Ví dụ: Công thực tế tháng này là 24 nhưng phiếu ghi 22…" rows={4} />
      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button className="nut-lanh" disabled={hd.dang_chay || noi_dung.trim().length < 5} onClick={gui}>
          Gửi khiếu nại
        </button>
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}
