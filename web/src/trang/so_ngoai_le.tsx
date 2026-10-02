// SO NGOAI LE CHAM CONG (Nhan su/Admin): so ghi cac ngay dac biet (bao, su kien bat kha khang...).
// He thong ap dung ngay: bo qua luat "di muon / ve som qua 30 phut mat nua ngay cong" va/hoac
// nguoi khong quet may duoc tinh 1 cong, khong bi tru phep. Luu xong la tu dong tinh lai cong
// dung ngay do.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, HopTot, Trong, dung_hanh_dong, dung_nap, dung_xac_nhan, ngay_gio,
} from '../thanh_phan.tsx';
import { Chon } from '../chon.tsx';
import { hom_nay } from './phu_cap.tsx';

interface NhanVienGon {
  id: string; ma_nv: string; ho_ten: string; phong_ban: string | null; dang_hoat_dong: boolean;
}

interface MucNgoaiLe {
  id: string;
  ngay: string;
  loai: 'tat_ca' | 'nhan_vien';
  ghi_chu: string;
  mien_di_muon: boolean;
  mien_ve_som: boolean;
  mien_vang: boolean;
  tao_luc: string;
  nhan_vien: { id: string; ma_nv: string; ho_ten: string }[];
}

const ngay_vn = (s: string): string => {
  const [n, m, d] = (s ?? '').slice(0, 10).split('-');
  return `${d}/${m}/${n}`;
};

/** Dau / cuoi thang dang chon — de loc so theo thang (khong tai ca nam). */
function khoang_thang(thang: string): { tu: string; den: string } {
  const [nam, thg] = thang.split('-').map(Number);
  const den_ngay = new Date(Date.UTC(nam ?? 2026, thg ?? 1, 0)).getUTCDate();
  return {
    tu: `${nam}-${String(thg).padStart(2, '0')}-01`,
    den: `${nam}-${String(thg).padStart(2, '0')}-${String(den_ngay).padStart(2, '0')}`,
  };
}

export function TrangSoNgoaiLe(): ReactNode {
  const [thang, dat_thang] = useState(hom_nay().slice(0, 7));
  const { tu, den } = khoang_thang(thang);
  const { du_lieu, dang_tai, loi, nap_lai } =
    dung_nap<MucNgoaiLe[]>(`/api/so-ngoai-le?tu=${tu}&den=${den}`, [tu, den]);
  const [mo, dat_mo] = useState<MucNgoaiLe | null>(null);

  return (
    <div>
      <div className="dau-trang">
        <h1>Sổ ngoại lệ chấm công</h1>
        <p className="mo-ta">
          Ghi các ngày đặc biệt (bão, sự kiện bất khả kháng...). Trong ngày ngoại lệ, hệ thống{' '}
          <strong>không trừ nửa ngày công khi đi muộn / về sớm quá 30 phút</strong>; nếu bật{' '}
          <strong>miễn vắng</strong> thì người không quẹt máy được tính 1 công và <strong>không bị trừ phép</strong>.
          Lưu xong hệ thống tự tính lại công của ngày đó.
        </p>
      </div>

      <div className="tb-dang-thanh" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="truong" style={{ margin: 0 }}>
          <span>Tháng</span>
          <input type="month" value={thang}
            onChange={(e) => { dat_thang(e.target.value); }} />
        </label>
        <button className="nut" onClick={() => dat_mo(rong_moi())}>+ Thêm ngoại lệ</button>
      </div>

      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : (du_lieu ?? []).length === 0
          ? <Trong tieu_de="Chưa có ngoại lệ nào" mo_ta="Thêm một mục ngoại lệ ở trên." />
          : (
            <div className="the">
              <table className="bang-gon">
                <thead><tr>
                  <th>Ngày</th><th>Phạm vi</th><th>Được miễn</th><th>Lý do</th><th></th>
                </tr></thead>
                <tbody>
                  {(du_lieu ?? []).map((r) => <DongNgoaiLe key={r.id} r={r}
                    khi_sua={() => dat_mo({ ...r })} khi_doi={nap_lai} />)}
                </tbody>
              </table>
            </div>
          )}

      {mo !== null && (
        <HopThoaiMuc cu={mo} khi_dong={() => dat_mo(null)} khi_xong={() => { dat_mo(null); nap_lai(); }} />
      )}
    </div>
  );
}

/** Mau mot muc moi (mac dinh nhu muc 17/9). */
function rong_moi(): MucNgoaiLe {
  return {
    id: '', ngay: hom_nay(), loai: 'tat_ca', ghi_chu: '',
    mien_di_muon: true, mien_ve_som: true, mien_vang: false,
    tao_luc: '', nhan_vien: [],
  };
}

function DongNgoaiLe(
  { r, khi_sua, khi_doi }: { r: MucNgoaiLe; khi_sua: () => void; khi_doi: () => void },
): ReactNode {
  const hd = dung_hanh_dong();
  const xn = dung_xac_nhan();
  const xoa = async (): Promise<void> => {
    const dong_y = await xn.hoi({
      tieu_de: 'Xoá ngoại lệ',
      mo_ta: `Xoá ngoại lệ ngày ${ngay_vn(r.ngay)}? Công của ngày đó sẽ được tính lại theo luật thường.`,
      nguy_hiem: true,
    });
    if (!dong_y) return;
    const ok = await hd.chay(() => goi(`/api/so-ngoai-le/${r.id}`, { method: 'DELETE' }),
      'Đã xoá và tính lại công của ngày đó.');
    if (ok) khi_doi();
  };
  const mien: string[] = [];
  if (r.mien_di_muon) mien.push('Đi muộn');
  if (r.mien_ve_som) mien.push('Về sớm');
  if (r.mien_vang) mien.push('Vắng hưởng lương');
  return (
    <tr>
      <td><strong>{ngay_vn(r.ngay)}</strong><div className="mo-ta">{ngay_gio(r.tao_luc)}</div></td>
      <td>
        {r.loai === 'tat_ca'
          ? <span className="nhan nhan-mo">Toàn công ty</span>
          : <span className="nhan nhan-lanh">{r.nhan_vien.length} người</span>}
        {r.loai === 'nhan_vien' && (
          <div className="mo-ta" style={{ maxWidth: 320 }}>
            {r.nhan_vien.map((x) => x.ho_ten).join(', ') || '—'}
          </div>
        )}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        {mien.map((m) => <span key={m} className="nhan nhan-tot" style={{ marginRight: 4 }}>{m}</span>)}
      </td>
      <td>{r.ghi_chu}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <HopLoi loi={hd.loi} /><HopTot chu={hd.tot} />
        <button className="nut-nho" onClick={khi_sua}>Sửa</button>{' '}
        <button className="nut-nho nut-phang" onClick={() => { void xoa(); }} disabled={hd.dang_chay}>Xoá</button>
        {xn.hop_thoai}
      </td>
    </tr>
  );
}

function HopThoaiMuc(
  { cu, khi_dong, khi_xong }: { cu: MucNgoaiLe; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const nv = dung_nap<NhanVienGon[]>('/api/nhan-vien');
  const [ngay, dat_ngay] = useState(cu.ngay);
  const [ghi_chu, dat_ghi_chu] = useState(cu.ghi_chu);
  const [loai, dat_loai] = useState<'tat_ca' | 'nhan_vien'>(cu.loai);
  const [mien_di_muon, dat_mien_di_muon] = useState(cu.mien_di_muon);
  const [mien_ve_som, dat_mien_ve_som] = useState(cu.mien_ve_som);
  const [mien_vang, dat_mien_vang] = useState(cu.mien_vang);
  const [chon, dat_chon] = useState<Set<string>>(new Set(cu.nhan_vien.map((x) => x.id)));
  const [tim, dat_tim] = useState('');
  const hd = dung_hanh_dong();
  const la_moi = cu.id === '';

  const nguoi = (nv.du_lieu ?? []).filter((x) => x.dang_hoat_dong);
  const loc = tim.trim().toLowerCase();
  const hien = loc === ''
    ? nguoi
    : nguoi.filter((x) =>
      x.ho_ten.toLowerCase().includes(loc)
      || x.ma_nv.toLowerCase().includes(loc)
      || (x.phong_ban ?? '').toLowerCase().includes(loc));

  const bat_tat = (id: string): void => {
    dat_chon((truoc) => {
      const sau = new Set(truoc);
      if (sau.has(id)) sau.delete(id); else sau.add(id);
      return sau;
    });
  };

  const gui = async (): Promise<void> => {
    if (ngay === '') return;
    if (ghi_chu.trim() === '') return;
    if (loai === 'nhan_vien' && chon.size === 0) return;
    const than_muc = {
      ngay, ghi_chu, loai,
      mien_di_muon, mien_ve_som, mien_vang,
      nhan_vien_ids: [...chon],
    };
    const ok = la_moi
      ? await hd.chay(() => goi('/api/so-ngoai-le', { method: 'POST', body: than_muc }),
        'Đã lưu ngoại lệ và tính lại công của ngày đó.')
      : await hd.chay(() => goi(`/api/so-ngoai-le/${cu.id}`, { method: 'PATCH', body: than_muc }),
        'Đã sửa ngoại lệ và tính lại công của ngày đó.');
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={la_moi ? 'Thêm ngoại lệ' : `Sửa ngoại lệ ngày ${ngay_vn(cu.ngay)}`}
      khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <label className="truong"><span>Ngày</span>
        <input type="date" value={ngay} onChange={(e) => dat_ngay(e.target.value)} /></label>

      <label className="truong"><span>Lý do ngoại lệ (bắt buộc)</span>
        <textarea rows={3} value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)}
          placeholder="VD: Bão tại Hà Nội — toàn công ty không tính đi muộn/về sớm; người vắng không bị trừ phép." /></label>

      <Chon gia_tri={loai} dat_gia_tri={(ma) => dat_loai(ma as 'tat_ca' | 'nhan_vien')}
        cac_tuy_chon={[
          { ma: 'tat_ca', nhan: 'Toàn công ty' },
          { ma: 'nhan_vien', nhan: 'Chỉ một số nhân viên' },
        ]}
        nhan="Phạm vi áp dụng" />

      <div className="tb-dang-hang" style={{ marginTop: 10 }}>
        <label>
          <input type="checkbox" checked={mien_di_muon}
            onChange={(e) => dat_mien_di_muon(e.target.checked)} /> Miễn lỗi đi muộn
        </label>
        <label>
          <input type="checkbox" checked={mien_ve_som}
            onChange={(e) => dat_mien_ve_som(e.target.checked)} /> Miễn lỗi về sớm
        </label>
        <label>
          <input type="checkbox" checked={mien_vang}
            onChange={(e) => dat_mien_vang(e.target.checked)} /> Miễn vắng (tính 1 công, không trừ phép)
        </label>
      </div>

      {loai === 'nhan_vien' && (
        <div style={{ marginTop: 12 }}>
          <label className="truong"><span>Tìm nhân viên</span>
            <input value={tim} onChange={(e) => dat_tim(e.target.value)}
              placeholder="Tên, mã nhân viên hoặc phòng ban..." /></label>
          <div className="hang-nut">
            <button type="button" className="nut-nho"
              onClick={() => dat_chon(new Set(hien.map((x) => x.id)))}>
              Chọn {hien.length} người đang lọc
            </button>
            <button type="button" className="nut-phang" onClick={() => dat_chon(new Set())}>Bỏ chọn hết</button>
          </div>
          <div className="vo-bang" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table className="bang-gon">
              <tbody>
                {hien.map((x) => (
                  <tr key={x.id}>
                    <td style={{ width: 32 }}>
                      <input type="checkbox" checked={chon.has(x.id)}
                        aria-label={`Chọn ${x.ho_ten}`}
                        onChange={() => bat_tat(x.id)} />
                    </td>
                    <td>{x.ho_ten}</td>
                    <td className="mo-ta">{x.ma_nv}</td>
                    <td className="mo-ta">{x.phong_ban ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mo-ta" style={{ marginTop: 12 }}>
        Lưu xong hệ thống <strong>tự tính lại công của ngày này</strong> cho toàn công ty.
      </p>

      <div className="tb-dang-hang" style={{ marginTop: 8 }}>
        <button className="nut" onClick={() => { void gui(); }} disabled={hd.dang_chay}>
          {hd.dang_chay ? '…' : la_moi ? 'Lưu ngoại lệ' : 'Lưu thay đổi'}
        </button>
        <button className="nut nut-phang" onClick={khi_dong} disabled={hd.dang_chay}>Đóng</button>
      </div>
    </HopThoai>
  );
}
