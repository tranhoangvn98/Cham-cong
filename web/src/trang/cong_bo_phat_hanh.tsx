// Trang CONG BO PHAT HANH (quan tri) — moi dot phat hanh, AI tong hop cac muc moi cua
// CHANGELOG thanh BAN NHAP thong bao; admin sua roi Cong bo -> thong bao toan cong ty bat
// popup + gui email. Popup khi dang nhap hien tu dong.
//
// CHANGELOG la nguon su that; AI chi lam giong noi — khi thieu khoa AI, may chu tu dung ban
// deterministic (danh sach phiên bản gọn).
import { useState, type ReactNode } from 'react';
import { goi, la_admin } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';

interface DongPhatHanh {
  id: string;
  tu_phien_ban: string;
  den_phien_ban: string;
  tieu_de: string | null;
  noi_dung: string | null;
  trang_thai: 'nhap' | 'da_cong_bo';
  thong_bao_id: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
}

interface PhienBanDS {
  cac_phien_ban: string[];
  de_xuat: { tu: string; den: string };
}

const NHAN_TT: Record<string, { ten: string; lop: string }> = {
  nhap: { ten: 'Bản nháp', lop: 'nhan-canh-bao' },
  da_cong_bo: { ten: 'Đã công bố', lop: 'nhan-tot' },
};

export function TrangCongBoPhatHanh(): ReactNode {
  const ds = dung_nap<DongPhatHanh[]>('/api/phat-hanh');
  const pb = dung_nap<PhienBanDS>('/api/phat-hanh/phien-ban');
  const hd = dung_hanh_dong();
  const [soan, dat_soan] = useState(false);
  const [mo, dat_mo] = useState<string | null>(null);

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Mỗi đợt phát hành phần mềm, hệ thống gom các mục mới trong CHANGELOG rồi nhờ AI soạn
          dự thảo thông báo. Nhân sự sửa lại, sau đó Giám đốc (admin) bấm <strong>Công bố</strong> —
          thông báo gửi email toàn công ty và hiện popup khi mọi người đăng nhập.
        </p>
      </div>

      <div className="hang-nut">
        <button disabled={pb.dang_tai} onClick={() => dat_soan(true)}>Tạo dự thảo phát hành</button>
      </div>

      {ds.dang_tai ? <DangTai /> : ds.loi !== null ? <HopLoi loi={ds.loi} />
        : ds.du_lieu === null || ds.du_lieu.length === 0 ? (
          <Trong tieu_de="Chưa có đợt công bố nào"
            mo_ta="Bấm “Tạo dự thảo phát hành” để AI tổng hợp tính năng mới từ CHANGELOG." />
        ) : (
          <table className="bang-gon" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Phiên bản</th><th>Tiêu đề</th><th>Trạng thái</th><th>Cập nhật</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ds.du_lieu.map((d) => (
                <tr key={d.id}>
                  <td className="khong-ngat">
                    {d.tu_phien_ban === d.den_phien_ban
                      ? d.den_phien_ban
                      : `${d.tu_phien_ban} – ${d.den_phien_ban}`}
                  </td>
                  <td style={{ maxWidth: 420 }}>{d.tieu_de ?? '—'}</td>
                  <td className="khong-ngat">
                    <span className={`nhan ${NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}`}>
                      {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
                    </span>
                  </td>
                  <td className="khong-ngat mo-ma">{ngay_gio(d.cap_nhat_luc)}</td>
                  <td className="canh-phai">
                    <button className="nut nut-nho" onClick={() => dat_mo(d.id)}>Xem</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {soan && pb.du_lieu !== null && (
        <HopThoaiSoan
          pb={pb.du_lieu}
          khi_dong={() => dat_soan(false)}
          khi_xong={(id) => { dat_soan(false); dat_mo(id); ds.nap_lai(); pb.nap_lai(); }}
        />
      )}
      {mo !== null && (
        <HopThoaiChiTiet id={mo} khi_dong={() => dat_mo(null)} khi_xong={ds.nap_lai} />
      )}
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
    </>
  );
}

function HopThoaiSoan(
  { pb, khi_dong, khi_xong }:
  { pb: PhienBanDS; khi_dong: () => void; khi_xong: (id: string) => void },
): ReactNode {
  const hd = dung_hanh_dong();
  const [tu, dat_tu] = useState(pb.de_xuat.tu);
  const [den, dat_den] = useState(pb.de_xuat.den);

  const tao = (): void => {
    void hd.chay_lay(
      () => goi<{ id: string }>('/api/phat-hanh/soan',
        { method: 'POST', body: { tu_phien_ban: tu, den_phien_ban: den } }),
      'Đã soạn dự thảo. Xem và chỉnh sửa trước khi công bố.',
    ).then((kq) => { if (kq !== null) khi_xong(kq.id); });
  };

  const tuy_chon = (): TuyChonChon[] => pb.cac_phien_ban.map((v) => ({ ma: v, nhan: v }));

  return (
    <HopThoai tieu_de="Tạo dự thảo thông báo phát hành" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Chọn khoảng phiên bản muốn công bố. Để trống "Từ" nghĩa là gom mọi mục từ đầu CHANGELOG
        tới phiên bản đã chọn. Đề xuất sẵn là những phiên bản chưa từng công bố.
      </p>
      <div className="bo-loc" style={{ display: 'block' }}>
        <div className="o-nhap">
          <label htmlFor="tu">Từ phiên bản (đã công bố gần nhất)</label>
          <Chon gia_tri={tu} dat_gia_tri={dat_tu} cac_tuy_chon={tuy_chon()}
            rong="Từ đầu" nhan="Chọn phiên bản bắt đầu" />
        </div>
        <div className="o-nhap">
          <label htmlFor="den">Đến phiên bản (mới nhất)</label>
          <Chon gia_tri={den} dat_gia_tri={dat_den} cac_tuy_chon={tuy_chon()}
            nhan="Chọn phiên bản kết thúc" />
        </div>
      </div>
      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button disabled={hd.dang_chay || den === ''} onClick={tao}>
          {hd.dang_chay ? 'AI đang tổng hợp…' : 'Soạn dự thảo'}
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

function HopThoaiChiTiet(
  { id, khi_dong, khi_xong }: { id: string; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const chi = dung_nap<DongPhatHanh>(`/api/phat-hanh/${id}`, [id]);
  const hd = dung_hanh_dong();
  const [tieu_de, dat_tieu_de] = useState('');
  const [noi_dung, dat_noi_dung] = useState('');
  const [da_nap, dat_da_nap] = useState(false);

  const d = chi.du_lieu;
  // Nap gia tri vao o soan khi du lieu ve (mot lan) — khong ghi de khi dang sua.
  if (d !== null && !da_nap) {
    dat_da_nap(true);
    dat_tieu_de(d.tieu_de ?? '');
    dat_noi_dung(d.noi_dung ?? '');
  }

  if (chi.dang_tai) {
    return <HopThoai tieu_de="Công bố phát hành" khi_dong={khi_dong}><DangTai /></HopThoai>;
  }
  if (chi.loi !== null || d === null) {
    return <HopThoai tieu_de="Công bố phát hành" khi_dong={khi_dong}>
      <HopLoi loi={chi.loi ?? 'Không tải được chi tiết.'} />
    </HopThoai>;
  }

  const luu = (): void => {
    void hd.chay(
      () => goi(`/api/phat-hanh/${d.id}`, { method: 'PATCH', body: { tieu_de, noi_dung } }),
      'Đã lưu dự thảo.',
    ).then((ok) => { if (ok) { chi.nap_lai(); khi_xong(); } });
  };
  const cong_bo = (): void => {
    void hd.chay(
      () => goi(`/api/phat-hanh/${d.id}/cong-bo`, { method: 'POST' }),
      'Đã công bố. Email đã gửi toàn công ty và popup sẽ hiện khi đăng nhập.',
    ).then((ok) => { if (ok) { chi.nap_lai(); khi_xong(); khi_dong(); } });
  };

  const la_ad = la_admin();
  const xong = d.trang_thai === 'da_cong_bo';

  return (
    <HopThoai tieu_de={`Công bố phát hành ${d.den_phien_ban}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Khoảng phiên bản</div>
          <div className="o-so-gia-tri" style={{ fontSize: 15 }}>
            {d.tu_phien_ban === d.den_phien_ban
              ? d.den_phien_ban
              : `${d.tu_phien_ban} – ${d.den_phien_ban}`}
          </div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Trạng thái</div>
          <div className="o-so-gia-tri" style={{ fontSize: 15 }}>
            <span className={`nhan ${NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}`}>
              {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
            </span>
          </div>
        </div>
      </div>

      {xong ? (
        <>
          <h3>{d.tieu_de}</h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>{d.noi_dung}</div>
          <div className="hop-thong-bao hop-tot">
            Đã công bố — thông báo gửi email toàn công ty và hiện popup khi đăng nhập.
          </div>
        </>
      ) : (
        <>
          <label htmlFor="tieu_de">Tiêu đề thông báo</label>
          <input id="tieu_de" value={tieu_de} onChange={(e) => dat_tieu_de(e.target.value)} />
          <label htmlFor="noi_dung">Nội dung</label>
          <textarea id="noi_dung" rows={10} value={noi_dung}
            onChange={(e) => dat_noi_dung(e.target.value)} />
          <div className="hang-nut" style={{ marginTop: 12 }}>
            <button className="nut-phang" disabled={hd.dang_chay} onClick={() => { void luu(); }}>
              Lưu dự thảo
            </button>
            {la_ad && (
              <button disabled={hd.dang_chay || tieu_de.trim().length < 3
                || noi_dung.trim().length < 1}
                onClick={() => { void cong_bo(); }}>
                Công bố (email + popup)
              </button>
            )}
          </div>
          {!la_ad && (
            <p className="mo-ta" style={{ marginTop: 8 }}>
              Chỉ Giám đốc (admin) được bấm Công bố — gửi tới toàn công ty.
            </p>
          )}
        </>
      )}
    </HopThoai>
  );
}
