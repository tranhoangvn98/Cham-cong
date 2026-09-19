// Cai dat NGAY LAM BU (Nhan su/Admin): mot ngay duoc nghi (vd 31/8) van nam trong cong chuan,
// nhan vien kiem cong bang cac BUOI LAM BU (vd chieu thu Bay 22/8, 29/8). Cong ngay nghi =
// tong 0,5 moi buoi da lam (co mat / phep co luong duyet). Bam "Tinh lai" de ap dung cho moi
// nguoi (tinh lai cong khoang bao trum ngay nghi + cac buoi).
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import { DangTai, HopLoi, HopTot, Trong, dung_hanh_dong, dung_nap, ngay_gio } from '../thanh_phan.tsx';

interface Buoi { ngay: string; buoi: 'sang' | 'chieu' }
interface NgayLamBu {
  id: string;
  ngay_nghi: string;
  ghi_chu: string | null;
  tao_luc: string;
  buoi: Buoi[];
}

const ten_buoi = (b: string): string => (b === 'sang' ? 'Sáng' : 'Chiều');
const ngay_vn = (s: string): string => { const [n, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${n}`; };

export function TrangLamBu(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NgayLamBu[]>('/api/lam-bu');
  return (
    <div>
      <div className="dau-trang">
        <h1>Ngày làm bù</h1>
        <p className="mo-ta">
          Ngày được nghỉ (vẫn nằm trong công chuẩn) — nhân viên <strong>kiếm công</strong> bằng cách
          đi làm các <strong>buổi làm bù</strong>. Công ngày nghỉ = tổng 0,5 mỗi buổi đã làm (có mặt,
          hoặc nghỉ phép có lương được duyệt trùng buổi). Nghỉ không lương/vắng = 0.
        </p>
      </div>

      <FormLamBu khi_xong={nap_lai} />

      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : (du_lieu ?? []).length === 0
          ? <Trong tieu_de="Chưa có ngày làm bù" mo_ta="Thêm một ngày nghỉ bù ở trên." />
          : (
            <div className="the">
              <table className="bang-gon">
                <thead><tr>
                  <th>Ngày được nghỉ</th><th>Các buổi làm bù</th><th>Ghi chú</th><th></th>
                </tr></thead>
                <tbody>
                  {(du_lieu ?? []).map((r) => <DongLamBu key={r.id} r={r} khi_doi={nap_lai} />)}
                </tbody>
              </table>
            </div>
          )}
    </div>
  );
}

function DongLamBu({ r, khi_doi }: { r: NgayLamBu; khi_doi: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const tinh_lai = async (): Promise<void> => {
    await hd.chay(() => goi(`/api/lam-bu/${r.id}/tinh-lai`, { method: 'POST', body: {} }),
      'Đã tính lại công cho ngày làm bù.');
  };
  const xoa = async (): Promise<void> => {
    if (!window.confirm('Xoá ngày làm bù này? (nên tính lại công sau khi xoá)')) return;
    const ok = await hd.chay(() => goi(`/api/lam-bu/${r.id}`, { method: 'DELETE' }), 'Đã xoá.');
    if (ok) khi_doi();
  };
  return (
    <tr>
      <td><strong>{ngay_vn(r.ngay_nghi)}</strong><div className="mo-ta">{ngay_gio(r.tao_luc)}</div></td>
      <td>{r.buoi.map((b, i) => (
        <span key={i} className="nhan nhan-mo" style={{ marginRight: 4 }}>{ngay_vn(b.ngay)} · {ten_buoi(b.buoi)}</span>
      ))}</td>
      <td>{r.ghi_chu ?? '—'}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <HopLoi loi={hd.loi} /><HopTot chu={hd.tot} />
        <button className="nut-nho" onClick={() => { void tinh_lai(); }} disabled={hd.dang_chay}>
          {hd.dang_chay ? '…' : 'Tính lại'}
        </button>{' '}
        <button className="nut-nho nut-phang" onClick={() => { void xoa(); }} disabled={hd.dang_chay}>Xoá</button>
      </td>
    </tr>
  );
}

function FormLamBu({ khi_xong }: { khi_xong: () => void }): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [ngay_nghi, dat_ngay_nghi] = useState('');
  const [ghi_chu, dat_ghi_chu] = useState('');
  const [buoi, dat_buoi] = useState<Buoi[]>([{ ngay: '', buoi: 'chieu' }]);
  const hd = dung_hanh_dong();

  const sua_buoi = (i: number, moi: Partial<Buoi>): void =>
    dat_buoi((cu) => cu.map((b, j) => (j === i ? { ...b, ...moi } : b)));

  const gui = async (): Promise<void> => {
    const buoi_hop_le = buoi.filter((b) => b.ngay !== '');
    if (buoi_hop_le.length === 0) { return; }
    const ok = await hd.chay(
      () => goi('/api/lam-bu', { method: 'POST', body: { ngay_nghi, ghi_chu, buoi: buoi_hop_le } }),
      'Đã lưu ngày làm bù. Bấm "Tính lại" để áp dụng.',
    );
    if (ok) {
      dat_ngay_nghi(''); dat_ghi_chu(''); dat_buoi([{ ngay: '', buoi: 'chieu' }]);
      dat_mo(false); khi_xong();
    }
  };

  if (!mo) {
    return <div className="tb-dang-thanh"><button onClick={() => dat_mo(true)}>+ Thêm ngày làm bù</button></div>;
  }
  return (
    <div className="the">
      <h3 style={{ marginTop: 0 }}>Thêm ngày làm bù</h3>
      <HopLoi loi={hd.loi} /><HopTot chu={hd.tot} />
      <div className="tb-dang-hang">
        <label className="truong"><span>Ngày được nghỉ</span>
          <input type="date" value={ngay_nghi} onChange={(e) => dat_ngay_nghi(e.target.value)} /></label>
        <label className="truong"><span>Ghi chú</span>
          <input value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)}
            placeholder="VD: nghỉ 31/8, làm bù chiều T7 22/8 + 29/8" /></label>
      </div>

      <div style={{ marginTop: 8 }}>
        <div className="mo-ta" style={{ marginBottom: 4 }}>Các buổi làm bù (đi làm buổi này để kiếm công cho ngày nghỉ):</div>
        {buoi.map((b, i) => (
          <div key={i} className="tb-dang-hang" style={{ alignItems: 'end', marginBottom: 6 }}>
            <label className="truong"><span>Ngày làm bù</span>
              <input type="date" value={b.ngay} onChange={(e) => sua_buoi(i, { ngay: e.target.value })} /></label>
            <label className="truong"><span>Buổi</span>
              <select value={b.buoi} onChange={(e) => sua_buoi(i, { buoi: e.target.value as 'sang' | 'chieu' })}>
                <option value="chieu">Chiều</option>
                <option value="sang">Sáng</option>
              </select></label>
            {buoi.length > 1 && (
              <button className="nut-nho nut-phang" onClick={() => dat_buoi((cu) => cu.filter((_, j) => j !== i))}>Bỏ</button>
            )}
          </div>
        ))}
        <button className="nut-nho nut-phang" onClick={() => dat_buoi((cu) => [...cu, { ngay: '', buoi: 'chieu' }])}>
          + Thêm buổi
        </button>
      </div>

      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button onClick={() => { void gui(); }}
          disabled={hd.dang_chay || ngay_nghi === '' || buoi.every((b) => b.ngay === '')}>
          {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button className="nut-phang" onClick={() => dat_mo(false)}>Hủy</button>
      </div>
    </div>
  );
}
