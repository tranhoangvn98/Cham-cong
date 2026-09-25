// Trang GOP Y DU THAO (ca nhan) — mo tu link trong email moi lay y kien:
//
//   {goc_web}/gop-y-du-thao?van_ban_id=<id>
//
// Chi hien du thao khi no DANG lay y kien va nguoi dang nhap TRONG pham vi van ban; con lai
// may chu tra 404 ("Không tìm thấy"). Chua dang nhap thi app tu chuyen sang man dang nhap —
// dung yeu cau "dang nhap vao he thong va tai khoan co trong he thong".
import { useMemo, useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, ThreadKhieuNai, dung_hanh_dong, dung_nap, ngay_gio,
  type TinNhanKN,
} from '../thanh_phan.tsx';

interface YKCuaToi {
  id: string;
  ma: string | null;
  tieu_de: string;
  noi_dung: string;
  trang_thai: string;
  tao_luc: string;
  tra_loi: TinNhanKN[];
}

interface DuThao {
  id: string;
  ma: string;
  loai: string;
  trich_yeu: string;
  noi_dung: string;
  y_kien_cua_toi: YKCuaToi[];
}

const NHAN_LOAI: Record<string, string> = {
  thong_bao: 'Thông báo', quyet_dinh: 'Quyết định', cong_van: 'Công văn',
};

const NHAN_TT: Record<string, string> = {
  moi: 'Chờ phản hồi', dang_xem: 'Đang xử lý', da_dong: 'Đã hoàn tất',
};

export function TrangGopYDuThao(): ReactNode {
  // Router bo qua chuoi truy van — doc truc tiep tu URL mot lan luc mount.
  const van_ban_id = useMemo(
    () => new URLSearchParams(window.location.search).get('van_ban_id') ?? '', []);
  const chi = dung_nap<DuThao>(
    van_ban_id === '' ? '' : `/api/toi/van-ban-du-thao/${van_ban_id}`, [van_ban_id]);
  const hd = dung_hanh_dong();
  const [y_kien, dat_y_kien] = useState('');

  const gui = (): void => {
    void hd.chay(
      () => goi('/api/toi/y-kien-du-thao', { method: 'POST', body: { nhap_ai_id: van_ban_id, noi_dung: y_kien } }),
      'Đã gửi ý kiến. Phòng Nhân sự sẽ tiếp nhận và phản hồi.',
    ).then((ok) => { if (ok) { dat_y_kien(''); chi.nap_lai(); } });
  };

  if (van_ban_id === '') {
    return <HopLoi loi="Thiếu mã văn bản dự thảo trong đường dẫn — hãy mở lại từ email mời." />;
  }
  if (chi.dang_tai) return <DangTai />;
  const d = chi.du_lieu;
  if (chi.loi !== null || d === null) {
    return <HopLoi loi={chi.loi ?? 'Không tìm thấy dự thảo đang lấy ý kiến. Có thể văn bản đã ' +
      'kết thúc lấy ý kiến, hoặc tài khoản của bạn nằm ngoài phạm vi văn bản.'} />;
  }

  return (
    <>
      <div className="dau-trang">
        <h1>Góp ý dự thảo văn bản</h1>
        <p className="mo-ta">
          {NHAN_LOAI[d.loai] ?? d.loai} · {d.ma}. Đọc nội dung dưới đây và gửi ý kiến của bạn.
          Mỗi ý kiến là một cuộc trao đổi riêng, Phòng Nhân sự sẽ phản hồi trực tiếp.
        </p>
      </div>

      <div className="the">
        <div className="canhan-muc-dau"><h3>{d.trich_yeu}</h3></div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{d.noi_dung}</div>
      </div>

      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <HopTot chu={hd.tot} />

      <div className="the" style={{ marginTop: 12 }}>
        <div className="canhan-muc-dau"><h3>Gửi ý kiến của bạn</h3></div>
        <textarea value={y_kien} onChange={(e) => dat_y_kien(e.target.value)} rows={4}
          placeholder="Nêu ý kiến, băn khoăn hoặc đề xuất chỉnh sửa…" />
        <div className="hang-nut" style={{ marginTop: 8 }}>
          <button disabled={hd.dang_chay || y_kien.trim().length < 1} onClick={gui}>
            {hd.dang_chay ? 'Đang gửi…' : 'Gửi ý kiến'}
          </button>
        </div>
      </div>

      {d.y_kien_cua_toi.length === 0 ? (
        <p className="mo-ta" style={{ marginTop: 12 }}>Bạn chưa gửi ý kiến nào cho dự thảo này.</p>
      ) : (
        <div className="the" style={{ marginTop: 12 }}>
          <div className="canhan-muc-dau"><h3>Ý kiến của bạn ({d.y_kien_cua_toi.length})</h3></div>
          {d.y_kien_cua_toi.map((y) => (
            <div key={y.id} style={{ marginBottom: 16 }}>
              <div className="canhan-muc-dau">
                <h4>{y.tieu_de} <span className="mo-ta">{ngay_gio(y.tao_luc)} · {NHAN_TT[y.trang_thai] ?? y.trang_thai}</span></h4>
              </div>
              <ThreadKhieuNai noi_dung={y.noi_dung} tao_luc={y.tao_luc} tra_loi={y.tra_loi} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
