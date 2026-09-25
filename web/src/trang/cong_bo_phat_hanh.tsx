// Trang CONG BO PHAT HANH (quan tri) — moi dot phat hanh, AI tong hop cac muc moi cua
// CHANGELOG thanh van xuoi roi DUNG THANH VAN BAN CONG TY theo luong NĐ30 (giong het chuc
// nang soan van ban cong ty: worker dung docx + gate). Nhan su xem truoc / sua van xuoi /
// trinh ky ngay trong trinh soan van ban; admin CONG BO = ban hanh cap so voi popup + gui
// email. Van ban xuat hien o tab "Van ban ban hanh" cua trang Van ban cong ty.
//
// CHANGELOG la nguon su that; AI chi lam giong noi — thieu khoa AI thi may chu tu dung ban
// deterministic (danh sach phiên bản gọn).
import { useState, type ReactNode } from 'react';
import { goi, la_admin } from '../api.ts';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';
import { ChiTiet as ChiTietVanBan, NHAN_TRANG_THAI_VB } from './thong_bao_ai.tsx';

interface DongPhatHanh {
  id: string;
  tu_phien_ban: string;
  den_phien_ban: string;
  tieu_de: string | null;
  noi_dung: string | null;
  trang_thai: 'nhap' | 'da_cong_bo';
  thong_bao_id: string | null;
  nhap_ai_id: string | null;
  ma_van_ban: string | null;
  tt_van_ban: string | null;
  so_ky_hieu: string | null;
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
  const [xem, dat_xem] = useState<string | null>(null);
  const la_ad = la_admin();

  const cong_bo = (id: string): void => {
    void hd.chay(
      () => goi(`/api/phat-hanh/${id}/cong-bo`, { method: 'POST' }),
      'Đã công bố — văn bản đã cấp số, gửi email toàn công ty và hiện popup khi đăng nhập.',
    ).then((ok) => { if (ok) ds.nap_lai(); });
  };

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Mỗi đợt phát hành phần mềm, hệ thống gom các mục mới trong CHANGELOG rồi nhờ AI soạn
          thành <strong>văn bản công ty đúng thể thức NĐ30</strong> (có số ký hiệu, đính kèm
          DOCX). Nhân sự soạn lại ngay trong trình soạn văn bản (xem trước, sửa, trình ký);
          sau đó Giám đốc (admin) bấm <strong>Công bố</strong> — văn bản được lưu vào Văn bản
          công ty, gửi email toàn công ty và hiện popup khi mọi người đăng nhập.
        </p>
      </div>

      <div className="hang-nut">
        <button disabled={pb.dang_tai} onClick={() => dat_soan(true)}>Tạo dự thảo phát hành</button>
      </div>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      {ds.dang_tai ? <DangTai /> : ds.loi !== null ? <HopLoi loi={ds.loi} />
        : ds.du_lieu === null || ds.du_lieu.length === 0 ? (
          <Trong tieu_de="Chưa có đợt công bố nào"
            mo_ta="Bấm “Tạo dự thảo phát hành” để AI tổng hợp tính năng mới từ CHANGELOG." />
        ) : (
          <table className="bang-gon" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Phiên bản</th><th>Tiêu đề</th><th>Văn bản</th><th>Trạng thái</th>
                <th>Số ký hiệu</th><th>Cập nhật</th><th></th>
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
                  <td style={{ maxWidth: 340 }}>{d.tieu_de ?? '—'}</td>
                  <td className="khong-ngat">
                    {d.ma_van_ban !== null ? (
                      <>
                        {d.ma_van_ban}
                        {d.tt_van_ban !== null && (
                          <span className="mo-ma">
                            {' '}· {NHAN_TRANG_THAI_VB[d.tt_van_ban] ?? d.tt_van_ban}
                          </span>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  <td className="khong-ngat">
                    <span className={`nhan ${NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}`}>
                      {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
                    </span>
                  </td>
                  <td className="mo-ma">{d.so_ky_hieu ?? '—'}</td>
                  <td className="khong-ngat mo-ma">{ngay_gio(d.cap_nhat_luc)}</td>
                  <td className="canh-phai" style={{ whiteSpace: 'nowrap' }}>
                    {d.trang_thai === 'da_cong_bo' ? (
                      <LienKet den="/van-ban/ban-hanh">Xem ở Văn bản công ty</LienKet>
                    ) : d.nhap_ai_id !== null ? (
                      <>
                        <button className="nut nut-nho"
                          onClick={() => dat_xem(d.nhap_ai_id)}>Soạn văn bản</button>
                        {la_ad && d.tt_van_ban !== null
                          && ['cho_duyet', 'cho_ky'].includes(d.tt_van_ban) && (
                            <button className="nut nut-nho" disabled={hd.dang_chay}
                              style={{ marginLeft: 6 }}
                              onClick={() => cong_bo(d.id)}>Công bố</button>
                          )}
                        {d.tt_van_ban === 'dang_soan' && (
                          <span className="mo-ta"> đang soạn…</span>
                        )}
                      </>
                    ) : (
                      <span className="mo-ta">—</span>
                    )}
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
          khi_xong={(nhap_ai_id) => { dat_soan(false); dat_xem(nhap_ai_id); ds.nap_lai(); }}
        />
      )}
      {xem !== null && (
        <ChiTietVanBan id={xem}
          khi_dong={() => { dat_xem(null); ds.nap_lai(); }}
          khi_xong={ds.nap_lai} />
      )}
    </>
  );
}

function HopThoaiSoan(
  { pb, khi_dong, khi_xong }:
  { pb: PhienBanDS; khi_dong: () => void; khi_xong: (nhap_ai_id: string) => void },
): ReactNode {
  const hd = dung_hanh_dong();
  const [tu, dat_tu] = useState(pb.de_xuat.tu);
  const [den, dat_den] = useState(pb.de_xuat.den);

  const tao = (): void => {
    void hd.chay_lay(
      () => goi<{ nhap_ai_id: string }>('/api/phat-hanh/soan',
        { method: 'POST', body: { tu_phien_ban: tu, den_phien_ban: den } }),
      'Đã soạn xong. Văn bản đang được dựng — chỉnh sửa ngay trong trình soạn.',
    ).then((kq) => { if (kq !== null && kq.nhap_ai_id !== '') khi_xong(kq.nhap_ai_id); });
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
