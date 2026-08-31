// Thong bao (BGD/HR) cho nhan vien: doc, xac nhan da doc, va giai trinh khi thong bao yeu cau.
// Dong con giai trinh no do (noti do) cho toi khi nhap xong — noi vao muc Khieu nai & giai trinh.
import { useState, type ReactNode } from 'react';
import {
  DangTai, HopLoi, HopTot, HopThoai, Trong, dung_hanh_dong, dung_nap, khoa_tinh, ngay_gio,
} from '../thanh_phan.tsx';
import { goi, la_nhan_su } from '../api.ts';

interface ThongBao {
  id: string;
  ma: string;
  tieu_de: string;
  noi_dung: string;
  muc_do: 'thuong' | 'quan_trong' | 'khan';
  can_giai_trinh: boolean;
  tao_luc: string;
  het_han: string | null;
  doc_luc: string | null;
  giai_trinh: string | null;
  giai_trinh_luc: string | null;
  ma_giai_trinh: string | null;
  da_doc: boolean;
  da_giai_trinh: boolean;
}

const NHAN_MUC_DO: Record<ThongBao['muc_do'], string> = {
  thuong: 'Thường', quan_trong: 'Quan trọng', khan: 'Khẩn',
};

function MotThongBao(
  { tb, khi_xong, khi_xem_doc }:
  { tb: ThongBao; khi_xong: () => void; khi_xem_doc?: () => void },
): ReactNode {
  const [gt, dat_gt] = useState('');
  const hd = dung_hanh_dong();
  // Con no khi: thong bao bat giai trinh nhung chua giai trinh.
  const con_no = tb.can_giai_trinh && !tb.da_giai_trinh;

  const xac_nhan = async (kem_gt: boolean): Promise<void> => {
    const ok = await hd.chay(
      () => goi(`/api/toi/thong-bao/${tb.id}/xac-nhan`, {
        method: 'POST', body: kem_gt ? { giai_trinh: gt } : {},
      }),
      kem_gt ? 'Đã gửi giải trình.' : 'Đã xác nhận đã đọc.',
    );
    if (ok) khi_xong();
  };

  return (
    <div className={con_no ? 'the tb-the tb-no' : 'the tb-the'}>
      <div className="tb-dau">
        <div>
          <span className={`nhan-muc nhan-muc-${tb.muc_do}`}>{NHAN_MUC_DO[tb.muc_do]}</span>
          {con_no && <span className="nhan-muc nhan-muc-no">Cần giải trình</span>}
          <span className="tb-ma">{tb.ma}</span>
        </div>
        <span className="mo-ta">{ngay_gio(tb.tao_luc)}</span>
      </div>
      <h2 className="tb-tieu-de">{tb.tieu_de}</h2>
      <p className="tb-noi-dung">{tb.noi_dung}</p>

      {khi_xem_doc !== undefined && (
        <button className="nut-nho nut-phang" onClick={khi_xem_doc}>Xem ai đã đọc</button>
      )}
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      {tb.da_giai_trinh ? (
        <div className="hop-thong-bao hop-tot">
          Đã giải trình {tb.ma_giai_trinh !== null ? `(${tb.ma_giai_trinh})` : ''}
          {tb.giai_trinh_luc !== null ? ` · ${ngay_gio(tb.giai_trinh_luc)}` : ''}: {tb.giai_trinh}
        </div>
      ) : tb.can_giai_trinh ? (
        <div className="tb-gt">
          <label className="truong">
            <span>Giải trình của bạn (bắt buộc)</span>
            <textarea rows={3} value={gt} onChange={(e) => dat_gt(e.target.value)}
              placeholder="Nhập giải trình / cam kết…" />
          </label>
          <button onClick={() => { void xac_nhan(true); }}
            disabled={hd.dang_chay || gt.trim().length < 5}>
            {hd.dang_chay ? 'Đang gửi…' : 'Gửi giải trình'}
          </button>
        </div>
      ) : tb.da_doc ? (
        <div className="mo-ta">✓ Đã đọc {tb.doc_luc !== null ? ngay_gio(tb.doc_luc) : ''}</div>
      ) : (
        <button onClick={() => { void xac_nhan(false); }} disabled={hd.dang_chay}>
          {hd.dang_chay ? 'Đang lưu…' : 'Đã đọc & hiểu'}
        </button>
      )}
    </div>
  );
}

interface DaDoc {
  ma_nv: string; ho_ten: string; phong_ban: string | null;
  doc_luc: string; giai_trinh: string | null; giai_trinh_luc: string | null; ma_giai_trinh: string | null;
}

/** HR: form dang thong bao moi. */
function DangThongBao({ khi_xong }: { khi_xong: () => void }): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [tieu_de, dat_tieu_de] = useState('');
  const [noi_dung, dat_noi_dung] = useState('');
  const [muc_do, dat_muc_do] = useState('thuong');
  const [can_gt, dat_can_gt] = useState(false);
  const hd = dung_hanh_dong();

  const gui = async (): Promise<void> => {
    const ok = await hd.chay(
      () => goi('/api/thong-bao', {
        method: 'POST',
        body: { tieu_de, noi_dung, muc_do, can_giai_trinh: can_gt, pham_vi: 'toan_cong_ty' },
      }),
      'Đã đăng thông báo.',
    );
    if (ok) {
      dat_tieu_de(''); dat_noi_dung(''); dat_muc_do('thuong'); dat_can_gt(false);
      dat_mo(false); khi_xong();
    }
  };

  if (!mo) {
    return (
      <div className="tb-dang-thanh">
        <button onClick={() => dat_mo(true)}>+ Đăng thông báo</button>
      </div>
    );
  }
  return (
    <div className="the tb-dang">
      <div className="canhan-muc-dau"><h2>Đăng thông báo mới</h2></div>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      <label className="truong"><span>Tiêu đề</span>
        <input value={tieu_de} onChange={(e) => dat_tieu_de(e.target.value)} /></label>
      <label className="truong"><span>Nội dung</span>
        <textarea rows={4} value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)} /></label>
      <div className="tb-dang-hang">
        <label className="truong"><span>Mức độ</span>
          <select value={muc_do} onChange={(e) => dat_muc_do(e.target.value)}>
            <option value="thuong">Thường</option>
            <option value="quan_trong">Quan trọng</option>
            <option value="khan">Khẩn</option>
          </select>
        </label>
        <label className="truong-hang">
          <input type="checkbox" checked={can_gt} onChange={(e) => dat_can_gt(e.target.checked)} />
          <span>Bắt buộc giải trình</span>
        </label>
      </div>
      <div className="hang-nut">
        <button onClick={() => { void gui(); }}
          disabled={hd.dang_chay || tieu_de.trim().length < 3 || noi_dung.trim().length < 3}>
          {hd.dang_chay ? 'Đang đăng…' : 'Đăng'}
        </button>
        <button className="nut-phang" onClick={() => dat_mo(false)}>Hủy</button>
      </div>
    </div>
  );
}

/** HR: xem ai da doc mot thong bao. */
function AiDaDoc({ tb, khi_dong }: { tb: ThongBao; khi_dong: () => void }): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<DaDoc[]>(`/api/thong-bao/${tb.id}/da-doc`);
  return (
    <HopThoai tieu_de={`Đã đọc — ${tb.tieu_de}`} khi_dong={khi_dong} rong>
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} /> : (du_lieu ?? []).length === 0
        ? <Trong tieu_de="Chưa ai xác nhận đọc" />
        : (
          <table className="bang-gon">
            <thead><tr><th>Nhân viên</th><th>Phòng</th><th>Đọc lúc</th><th>Giải trình</th></tr></thead>
            <tbody>
              {(du_lieu ?? []).map((d, i) => (
                <tr key={khoa_tinh(d.ma_nv, i)}>
                  <td>{d.ho_ten} <span className="mo-ta">({d.ma_nv})</span></td>
                  <td>{d.phong_ban ?? '—'}</td>
                  <td>{ngay_gio(d.doc_luc)}</td>
                  <td>{d.giai_trinh !== null
                    ? <span>{d.ma_giai_trinh !== null ? `${d.ma_giai_trinh}: ` : ''}{d.giai_trinh}</span>
                    : <span className="mo-ta">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </HopThoai>
  );
}

export function TrangThongBaoCaNhan(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<ThongBao[]>('/api/toi/thong-bao');
  const [xem_doc, dat_xem_doc] = useState<ThongBao | null>(null);
  const hr = la_nhan_su();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  return (
    <div className="canhan">
      <div className="canhan-hero">
        <div className="canhan-hero-chao">Thông báo công ty</div>
        <div className="canhan-hero-phu">Thông báo từ Ban giám đốc và nhân sự.</div>
      </div>
      {hr && <DangThongBao khi_xong={nap_lai} />}
      {xem_doc !== null && <AiDaDoc tb={xem_doc} khi_dong={() => dat_xem_doc(null)} />}
      {ds.length === 0
        ? <Trong tieu_de="Chưa có thông báo" mo_ta="Khi công ty đăng thông báo, nó sẽ hiện ở đây." />
        : (
          <div className="tb-danh-sach">
            {ds.map((tb, i) => (
              <MotThongBao key={khoa_tinh(tb.id, i)} tb={tb} khi_xong={nap_lai}
                khi_xem_doc={hr ? () => dat_xem_doc(tb) : undefined} />
            ))}
          </div>
        )}
    </div>
  );
}
