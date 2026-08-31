// Trang NHAN VIEN tu phuc vu: xin nghi phep cac loai, giai trinh cham cong (quen quet), va giai
// trinh vi pham cua minh. Dung cac endpoint /api/toi/* (cung API app dien thoai dung).
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, hom_nay,
} from '../thanh_phan.tsx';

const TEN_NGHI: Record<string, string> = {
  phep_nam: 'Nghỉ phép năm', khong_luong: 'Nghỉ không lương', om: 'Nghỉ ốm',
  thai_san: 'Nghỉ thai sản', ket_hon: 'Nghỉ kết hôn', hieu: 'Nghỉ việc hiếu',
};
const NHAN_TT: Record<string, { ten: string; lop: string }> = {
  cho_duyet: { ten: 'Chờ duyệt', lop: 'nhan-canh-bao' },
  da_duyet: { ten: 'Đã duyệt', lop: 'nhan-tot' },
  tu_choi: { ten: 'Từ chối', lop: 'nhan-xau' },
  da_huy: { ten: 'Đã hủy', lop: 'nhan-mo' },
  // vi pham
  moi: { ten: 'Mới', lop: 'nhan-mo' },
  cho_giai_trinh: { ten: 'Chờ giải trình', lop: 'nhan-canh-bao' },
  da_xac_nhan: { ten: 'Đã xác nhận', lop: 'nhan-xau' },
  bac_bo: { ten: 'Đã bãi bỏ', lop: 'nhan-tot' },
  da_xu_ly: { ten: 'Đã xử lý', lop: 'nhan-mo' },
  // ky luat
  da_nhac: { ten: 'Đã nhắc nhở', lop: 'nhan-canh-bao' },
  da_ap_dung: { ten: 'Đã áp dụng', lop: 'nhan-xau' },
  mien: { ten: 'Miễn kỷ luật', lop: 'nhan-lanh' },
  // khieu nai
  dang_xem: { ten: 'Đang xem xét', lop: 'nhan-canh-bao' },
  chap_nhan: { ten: 'Đã chấp nhận', lop: 'nhan-tot' },
};
function Nhan({ tt }: { tt: string }): ReactNode {
  return <span className={NHAN_TT[tt]?.lop ?? 'nhan-mo'}>{NHAN_TT[tt]?.ten ?? tt}</span>;
}
function ngay_v(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m === null ? v : `${m[3]}/${m[2]}/${m[1]}`;
}

type Tab = 'nghi' | 'khac' | 'de_xuat' | 'cham_cong' | 'vi_pham' | 'ky_luat';

/** Loai don tu tu phuc vu (tang ca, cong tac, thoi viec) — dung /api/toi/don. Bo qua doi ca
 *  (can chon ca lam viec, chua co danh muc ca cho nhan vien). */
const LOAI_DON_KHAC: readonly { ma: string; ten: string; khoang: boolean; gio: boolean }[] = [
  { ma: 'lam_them', ten: 'Tăng ca / làm thêm giờ', khoang: false, gio: true },
  { ma: 'cong_tac', ten: 'Đi công tác', khoang: true, gio: false },
  { ma: 'thoi_viec', ten: 'Xin thôi việc', khoang: false, gio: false },
];
const TEN_DON_KHAC: Record<string, string> = Object.fromEntries(
  LOAI_DON_KHAC.map((l) => [l.ma, l.ten]),
);

export function TrangDonCuaToi(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('nghi');
  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Tự nộp đơn xin nghỉ phép, giải trình chấm công, giải trình vi phạm và khiếu nại kỷ luật.
          Đơn gửi tới quản lý / nhân sự duyệt; bạn theo dõi trạng thái ngay tại đây.
        </p>
      </div>
      <div className="hang-tab">
        <button className={tab === 'nghi' ? 'dang-chon' : undefined} onClick={() => dat_tab('nghi')}>Nghỉ phép</button>
        <button className={tab === 'khac' ? 'dang-chon' : undefined} onClick={() => dat_tab('khac')}>Tăng ca / công tác</button>
        <button className={tab === 'de_xuat' ? 'dang-chon' : undefined} onClick={() => dat_tab('de_xuat')}>Đề xuất &amp; kiến nghị</button>
        <button className={tab === 'cham_cong' ? 'dang-chon' : undefined} onClick={() => dat_tab('cham_cong')}>Giải trình chấm công</button>
        <button className={tab === 'vi_pham' ? 'dang-chon' : undefined} onClick={() => dat_tab('vi_pham')}>Vi phạm của tôi</button>
        <button className={tab === 'ky_luat' ? 'dang-chon' : undefined} onClick={() => dat_tab('ky_luat')}>Kỷ luật &amp; khiếu nại</button>
      </div>
      {tab === 'nghi' ? <TabNghiPhep /> : tab === 'khac' ? <TabDonKhac />
        : tab === 'de_xuat' ? <TabDeXuat />
        : tab === 'cham_cong' ? <TabGiaiTrinh />
        : tab === 'vi_pham' ? <TabViPham /> : <TabKyLuatToi />}
    </>
  );
}

// ============================================================ nghỉ phép
interface DonNghi {
  id: string; loai: string; tu_ngay: string; den_ngay: string; nua_ngay: boolean;
  ly_do: string | null; trang_thai: string; ghi_chu_duyet: string | null;
}
function TabNghiPhep(): ReactNode {
  const [mo, dat_mo] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<DonNghi[]>('/api/toi/nghi-phep');
  const hd = dung_hanh_dong();

  const huy = (id: string): void => {
    void hd.chay(() => goi(`/api/toi/nghi-phep/${id}/huy`, { method: 'POST', body: {} }),
      'Đã hủy đơn.').then((ok) => { if (ok) nap_lai(); });
  };

  return (
    <>
      <div className="hang-nut" style={{ marginBottom: 12 }}>
        <button className="nut-chinh" onClick={() => dat_mo(true)}>+ Tạo đơn nghỉ phép</button>
      </div>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : (du_lieu ?? []).length === 0 ? <Trong tieu_de="Chưa có đơn nghỉ phép" mo_ta="Bấm “Tạo đơn nghỉ phép” để gửi." />
        : (
          <div className="the the-mong"><div className="vo-bang"><table>
            <thead><tr><th>Loại</th><th>Từ</th><th>Đến</th><th>Lý do</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {(du_lieu ?? []).map((d) => (
                <tr key={d.id}>
                  <td className="khong-ngat">{TEN_NGHI[d.loai] ?? d.loai}{d.nua_ngay ? ' (½ ngày)' : ''}</td>
                  <td className="khong-ngat so">{ngay_v(d.tu_ngay)}</td>
                  <td className="khong-ngat so">{ngay_v(d.den_ngay)}</td>
                  <td>{d.ly_do ?? '—'}{d.ghi_chu_duyet !== null && d.ghi_chu_duyet !== '' && <div className="mo-ta">Duyệt: {d.ghi_chu_duyet}</div>}</td>
                  <td className="khong-ngat"><Nhan tt={d.trang_thai} /></td>
                  <td className="canh-phai">
                    {(d.trang_thai === 'cho_duyet' || d.trang_thai === 'da_duyet') && (
                      <button className="nut-nho nut-phang" disabled={hd.dang_chay} onClick={() => huy(d.id)}>Hủy</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
        )}
      {mo && <FormNghiPhep khi_dong={() => dat_mo(false)} khi_xong={() => { dat_mo(false); nap_lai(); }} />}
    </>
  );
}

function FormNghiPhep({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [loai, dat_loai] = useState('phep_nam');
  const [tu, dat_tu] = useState(hom_nay());
  const [den, dat_den] = useState(hom_nay());
  const [nua, dat_nua] = useState(false);
  const [ly_do, dat_ly_do] = useState('');
  const hd = dung_hanh_dong();
  return (
    <HopThoai tieu_de="Tạo đơn nghỉ phép" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <label htmlFor="np-loai">Loại nghỉ</label>
      <select id="np-loai" value={loai} onChange={(e) => dat_loai(e.target.value)}>
        {Object.entries(TEN_NGHI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <div className="luoi luoi-2">
        <div className="o-nhap"><label htmlFor="np-tu">Từ ngày</label>
          <input id="np-tu" type="date" value={tu} onChange={(e) => { dat_tu(e.target.value); if (nua) dat_den(e.target.value); }} /></div>
        <div className="o-nhap"><label htmlFor="np-den">Đến ngày</label>
          <input id="np-den" type="date" value={den} disabled={nua} onChange={(e) => dat_den(e.target.value)} /></div>
      </div>
      <div className="o-nhap-ngang">
        <input id="np-nua" type="checkbox" checked={nua}
          onChange={(e) => { dat_nua(e.target.checked); if (e.target.checked) dat_den(tu); }} />
        <label htmlFor="np-nua">Nghỉ nửa ngày (chỉ áp dụng cho một ngày)</label>
      </div>
      <label htmlFor="np-ld">Lý do</label>
      <input id="np-ld" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)} placeholder="vd: việc gia đình" />
      <div className="hang-nut">
        <button className="nut-chinh" disabled={hd.dang_chay}
          onClick={() => void hd.chay(() => goi('/api/toi/nghi-phep', {
            method: 'POST', body: { loai, tu_ngay: tu, den_ngay: nua ? tu : den, nua_ngay: nua, ly_do },
          }), 'Đã gửi đơn nghỉ phép.').then((ok) => { if (ok) khi_xong(); })}>
          {hd.dang_chay ? 'Đang gửi…' : 'Gửi đơn'}
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

// ============================================================ đơn khác (tăng ca / công tác / thôi việc)
interface DonKhac {
  id: string; loai: string; tu_ngay: string; den_ngay: string | null;
  gio_bat_dau: string | null; gio_ket_thuc: string | null; noi_den: string | null;
  ly_do: string | null; trang_thai: string;
}

function TabDonKhac(): ReactNode {
  const [mo, dat_mo] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<{ danh_sach: DonKhac[] }>('/api/toi/don');
  const hd = dung_hanh_dong();
  const ds = du_lieu?.danh_sach ?? [];
  const huy = (id: string): void => {
    void hd.chay(() => goi(`/api/toi/don/${id}/huy`, { method: 'POST', body: {} }),
      'Đã hủy đơn.').then((ok) => { if (ok) nap_lai(); });
  };
  return (
    <>
      <div className="dau-trang">
        <div className="hang-nut">
          <button className="nut-chinh" onClick={() => dat_mo(true)}>+ Tạo đơn</button>
        </div>
      </div>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : ds.length === 0 ? <Trong tieu_de="Chưa có đơn" mo_ta="Bấm “Tạo đơn” để xin tăng ca, công tác hoặc thôi việc." />
        : (
          <div className="the the-mong"><div className="vo-bang"><table>
            <thead><tr><th>Loại</th><th>Thời gian</th><th>Lý do</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {ds.map((d) => (
                <tr key={d.id}>
                  <td className="khong-ngat">{TEN_DON_KHAC[d.loai] ?? d.loai}</td>
                  <td className="khong-ngat">
                    {ngay_v(d.tu_ngay)}{d.den_ngay !== null && d.den_ngay !== d.tu_ngay ? ` → ${ngay_v(d.den_ngay)}` : ''}
                    {d.gio_bat_dau !== null ? ` (${d.gio_bat_dau.slice(0, 5)}–${(d.gio_ket_thuc ?? '').slice(0, 5)})` : ''}
                    {d.noi_den !== null ? ` · ${d.noi_den}` : ''}
                  </td>
                  <td>{d.ly_do ?? '—'}</td>
                  <td><Nhan tt={d.trang_thai} /></td>
                  <td>{d.trang_thai === 'cho_duyet'
                    ? <button className="nut-nho nut-phang" onClick={() => huy(d.id)}>Hủy</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
        )}
      {mo && <FormDonKhac khi_dong={() => dat_mo(false)} khi_xong={() => { dat_mo(false); nap_lai(); }} />}
    </>
  );
}

function FormDonKhac({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [loai, dat_loai] = useState('lam_them');
  const [tu, dat_tu] = useState(hom_nay());
  const [den, dat_den] = useState(hom_nay());
  const [gio_bd, dat_gio_bd] = useState('18:00');
  const [gio_kt, dat_gio_kt] = useState('20:00');
  const [noi_den, dat_noi_den] = useState('');
  const [ly_do, dat_ly_do] = useState('');
  const hd = dung_hanh_dong();
  const spec = LOAI_DON_KHAC.find((l) => l.ma === loai) ?? LOAI_DON_KHAC[0]!;
  const nhan_ngay = loai === 'thoi_viec' ? 'Ngày làm việc cuối' : 'Từ ngày';

  return (
    <HopThoai tieu_de="Tạo đơn" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <label htmlFor="dk-loai">Loại đơn</label>
      <select id="dk-loai" value={loai} onChange={(e) => dat_loai(e.target.value)}>
        {LOAI_DON_KHAC.map((l) => <option key={l.ma} value={l.ma}>{l.ten}</option>)}
      </select>
      <div className="luoi luoi-2">
        <div className="o-nhap"><label htmlFor="dk-tu">{nhan_ngay}</label>
          <input id="dk-tu" type="date" value={tu} onChange={(e) => dat_tu(e.target.value)} /></div>
        {spec.khoang && (
          <div className="o-nhap"><label htmlFor="dk-den">Đến ngày</label>
            <input id="dk-den" type="date" value={den} onChange={(e) => dat_den(e.target.value)} /></div>
        )}
      </div>
      {spec.gio && (
        <div className="luoi luoi-2">
          <div className="o-nhap"><label htmlFor="dk-bd">Giờ bắt đầu</label>
            <input id="dk-bd" type="time" value={gio_bd} onChange={(e) => dat_gio_bd(e.target.value)} /></div>
          <div className="o-nhap"><label htmlFor="dk-kt">Giờ kết thúc</label>
            <input id="dk-kt" type="time" value={gio_kt} onChange={(e) => dat_gio_kt(e.target.value)} /></div>
        </div>
      )}
      {loai === 'cong_tac' && (
        <>
          <label htmlFor="dk-noi">Nơi đến</label>
          <input id="dk-noi" value={noi_den} onChange={(e) => dat_noi_den(e.target.value)}
            placeholder="vd: Chi nhánh Hà Nội" />
        </>
      )}
      <label htmlFor="dk-ld">Lý do</label>
      <input id="dk-ld" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)}
        placeholder={loai === 'thoi_viec' ? 'Lý do xin thôi việc' : 'vd: hoàn thành đơn hàng gấp'} />
      <div className="hang-nut">
        <button className="nut-chinh" disabled={hd.dang_chay}
          onClick={() => void hd.chay(() => goi('/api/toi/don', {
            method: 'POST',
            body: {
              loai,
              tu_ngay: tu,
              den_ngay: spec.khoang ? den : null,
              gio_bat_dau: spec.gio ? gio_bd : null,
              gio_ket_thuc: spec.gio ? gio_kt : null,
              noi_den: loai === 'cong_tac' ? noi_den : null,
              ly_do,
            },
          }), 'Đã gửi đơn.').then((ok) => { if (ok) khi_xong(); })}>
          {hd.dang_chay ? 'Đang gửi…' : 'Gửi đơn'}
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

// ============================================================ đề xuất & kiến nghị
interface LoaiDeXuat { id: string; ten: string; mo_ta: string | null; can_so_luong: boolean }
interface DeXuat {
  id: string; ma: string | null; tieu_de: string; noi_dung: string; so_luong: number | null;
  trang_thai: string; ghi_chu_duyet: string | null; tao_luc: string; ten_loai: string;
}

function TabDeXuat(): ReactNode {
  const [mo, dat_mo] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<DeXuat[]>('/api/toi/de-xuat');
  const hd = dung_hanh_dong();
  const ds = du_lieu ?? [];
  const huy = (id: string): void => {
    void hd.chay(() => goi(`/api/toi/de-xuat/${id}/huy`, { method: 'POST', body: {} }),
      'Đã hủy đề xuất.').then((ok) => { if (ok) nap_lai(); });
  };
  return (
    <>
      <div className="dau-trang">
        <div className="hang-nut"><button className="nut-chinh" onClick={() => dat_mo(true)}>+ Tạo đề xuất</button></div>
      </div>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : ds.length === 0 ? <Trong tieu_de="Chưa có đề xuất" mo_ta="Bấm “Tạo đề xuất” để xin cấp thiết bị, kiến nghị, mua sắm…" />
        : (
          <div className="the the-mong"><div className="vo-bang"><table>
            <thead><tr><th>Mã</th><th>Loại</th><th>Tiêu đề</th><th>Trạng thái</th><th>Phản hồi</th><th /></tr></thead>
            <tbody>
              {ds.map((d) => (
                <tr key={d.id}>
                  <td className="khong-ngat">{d.ma ?? '—'}</td>
                  <td className="khong-ngat">{d.ten_loai}</td>
                  <td>{d.tieu_de}{d.so_luong !== null ? ` (SL: ${d.so_luong})` : ''}</td>
                  <td><Nhan tt={d.trang_thai} /></td>
                  <td>{d.ghi_chu_duyet ?? '—'}</td>
                  <td>{d.trang_thai === 'cho_duyet'
                    ? <button className="nut-nho nut-phang" onClick={() => huy(d.id)}>Hủy</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
        )}
      {mo && <FormDeXuat khi_dong={() => dat_mo(false)} khi_xong={() => { dat_mo(false); nap_lai(); }} />}
    </>
  );
}

function FormDeXuat({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const { du_lieu: loai } = dung_nap<LoaiDeXuat[]>('/api/toi/de-xuat/loai');
  const ds_loai = loai ?? [];
  const [loai_id, dat_loai_id] = useState('');
  const [tieu_de, dat_tieu_de] = useState('');
  const [noi_dung, dat_noi_dung] = useState('');
  const [so_luong, dat_so_luong] = useState('1');
  const hd = dung_hanh_dong();
  const chon = ds_loai.find((l) => l.id === loai_id) ?? ds_loai[0];
  const id_thuc = loai_id !== '' ? loai_id : chon?.id ?? '';

  return (
    <HopThoai tieu_de="Tạo đề xuất" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <label htmlFor="dx-loai">Loại đề xuất</label>
      <select id="dx-loai" value={id_thuc} onChange={(e) => dat_loai_id(e.target.value)}>
        {ds_loai.map((l) => <option key={l.id} value={l.id}>{l.ten}</option>)}
      </select>
      <label htmlFor="dx-td">Tiêu đề</label>
      <input id="dx-td" value={tieu_de} onChange={(e) => dat_tieu_de(e.target.value)}
        placeholder="vd: Xin cấp laptop cho nhân viên mới" />
      {chon?.can_so_luong === true && (
        <div className="o-nhap"><label htmlFor="dx-sl">Số lượng</label>
          <input id="dx-sl" type="number" min={1} value={so_luong}
            onChange={(e) => dat_so_luong(e.target.value)} /></div>
      )}
      <label htmlFor="dx-nd">Nội dung chi tiết</label>
      <textarea id="dx-nd" rows={4} value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)}
        placeholder="Mô tả rõ nhu cầu, lý do…" />
      <div className="hang-nut">
        <button className="nut-chinh" disabled={hd.dang_chay || tieu_de.trim().length < 3 || id_thuc === ''}
          onClick={() => void hd.chay(() => goi('/api/toi/de-xuat', {
            method: 'POST',
            body: {
              loai_de_xuat_id: id_thuc, tieu_de, noi_dung,
              so_luong: chon?.can_so_luong === true ? Number(so_luong) || 1 : null,
            },
          }), 'Đã gửi đề xuất.').then((ok) => { if (ok) khi_xong(); })}>
          {hd.dang_chay ? 'Đang gửi…' : 'Gửi đề xuất'}
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

// ============================================================ giải trình chấm công
interface DonGiaiTrinh {
  id: string; ngay: string; gio_vao_de_xuat: string | null; gio_ra_de_xuat: string | null;
  ly_do: string; trang_thai: string; ghi_chu_duyet: string | null;
}
function TabGiaiTrinh(): ReactNode {
  const [mo, dat_mo] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<DonGiaiTrinh[]>('/api/toi/giai-trinh');
  return (
    <>
      <div className="hang-nut" style={{ marginBottom: 12 }}>
        <button className="nut-chinh" onClick={() => dat_mo(true)}>+ Giải trình chấm công</button>
      </div>
      <p className="mo-ta" style={{ marginBottom: 12 }}>
        Dùng khi quên quẹt thẻ vào/ra: đề xuất giờ đúng để nhân sự đối chiếu và chấp nhận.
      </p>
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : (du_lieu ?? []).length === 0 ? <Trong tieu_de="Chưa có giải trình nào" mo_ta="Bấm “Giải trình chấm công” để gửi." />
        : (
          <div className="the the-mong"><div className="vo-bang"><table>
            <thead><tr><th>Ngày</th><th>Giờ vào đề xuất</th><th>Giờ ra đề xuất</th><th>Lý do</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {(du_lieu ?? []).map((d) => (
                <tr key={d.id}>
                  <td className="khong-ngat so">{ngay_v(d.ngay)}</td>
                  <td className="so">{d.gio_vao_de_xuat ?? '—'}</td>
                  <td className="so">{d.gio_ra_de_xuat ?? '—'}</td>
                  <td>{d.ly_do}{d.ghi_chu_duyet !== null && d.ghi_chu_duyet !== '' && <div className="mo-ta">Duyệt: {d.ghi_chu_duyet}</div>}</td>
                  <td className="khong-ngat"><Nhan tt={d.trang_thai} /></td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
        )}
      {mo && <FormGiaiTrinh khi_dong={() => dat_mo(false)} khi_xong={() => { dat_mo(false); nap_lai(); }} />}
    </>
  );
}

function FormGiaiTrinh({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [ngay, dat_ngay] = useState(hom_nay());
  const [gio_vao, dat_gio_vao] = useState('');
  const [gio_ra, dat_gio_ra] = useState('');
  const [ly_do, dat_ly_do] = useState('');
  const hd = dung_hanh_dong();
  return (
    <HopThoai tieu_de="Giải trình chấm công" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="o-nhap"><label htmlFor="gt-ngay">Ngày</label>
        <input id="gt-ngay" type="date" value={ngay} max={hom_nay()} onChange={(e) => dat_ngay(e.target.value)} /></div>
      <div className="luoi luoi-2">
        <div className="o-nhap"><label htmlFor="gt-vao">Giờ vào đề xuất</label>
          <input id="gt-vao" type="time" value={gio_vao} onChange={(e) => dat_gio_vao(e.target.value)} /></div>
        <div className="o-nhap"><label htmlFor="gt-ra">Giờ ra đề xuất</label>
          <input id="gt-ra" type="time" value={gio_ra} onChange={(e) => dat_gio_ra(e.target.value)} /></div>
      </div>
      <p className="mo-ta">Điền ít nhất một trong hai giờ (giờ bạn thực sự vào/ra nhưng quên quẹt).</p>
      <label htmlFor="gt-ld">Lý do</label>
      <input id="gt-ld" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)} placeholder="vd: quẹt không nhận, đi gặp khách" />
      <div className="hang-nut">
        <button className="nut-chinh" disabled={hd.dang_chay || ly_do.trim().length < 5 || (gio_vao === '' && gio_ra === '')}
          onClick={() => void hd.chay(() => goi('/api/toi/giai-trinh', {
            method: 'POST', body: { ngay, gio_vao_de_xuat: gio_vao || null, gio_ra_de_xuat: gio_ra || null, ly_do },
          }), 'Đã gửi giải trình.').then((ok) => { if (ok) khi_xong(); })}>
          {hd.dang_chay ? 'Đang gửi…' : 'Gửi giải trình'}
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

// ============================================================ vi phạm của tôi
interface ViPhamToi {
  id: string; ngay: string; mo_ta: string | null; trang_thai: string;
  giai_trinh: string | null; ky_luat: string | null; ten_loai: string; muc_do: string;
}
function TabViPham(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<ViPhamToi[]>('/api/toi/vi-pham');
  const [dang, dat_dang] = useState<ViPhamToi | null>(null);
  return (
    <>
      <p className="mo-ta" style={{ marginBottom: 12 }}>
        Vi phạm nội quy ghi nhận với bạn. Bộ luật Lao động 2019 Điều 122 cho bạn quyền
        <strong> tự bào chữa</strong> — hãy gửi giải trình trước khi có kết luận.
      </p>
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : (du_lieu ?? []).length === 0 ? <Trong tieu_de="Không có vi phạm" mo_ta="Bạn chưa có vi phạm nào được ghi nhận." />
        : (
          <div className="the the-mong"><div className="vo-bang"><table>
            <thead><tr><th>Ngày</th><th>Loại</th><th>Nội dung</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {(du_lieu ?? []).map((v) => (
                <tr key={v.id}>
                  <td className="khong-ngat so">{ngay_v(v.ngay)}</td>
                  <td className="khong-ngat">{v.ten_loai}</td>
                  <td>{v.mo_ta ?? '—'}{v.giai_trinh !== null && v.giai_trinh !== '' && <div className="mo-ta">Giải trình: {v.giai_trinh}</div>}</td>
                  <td className="khong-ngat"><Nhan tt={v.trang_thai} /></td>
                  <td className="canh-phai">
                    {v.trang_thai !== 'da_xu_ly' && v.trang_thai !== 'bac_bo' && (
                      <button className="nut-nho" onClick={() => dat_dang(v)}>
                        {v.giai_trinh === null || v.giai_trinh === '' ? 'Giải trình' : 'Sửa giải trình'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
        )}
      {dang !== null && <FormGiaiTrinhViPham vp={dang} khi_dong={() => dat_dang(null)} khi_xong={() => { dat_dang(null); nap_lai(); }} />}
    </>
  );
}

// ============================================================ kỷ luật & khiếu nại của tôi
const TEN_MUC_DO: Record<string, string> = {
  nhe: 'Nhẹ', trung: 'Trung bình', nang: 'Nặng', rat_nang: 'Rất nặng',
};
function tien_kl(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '0';
}

interface KyLuatToi {
  id: string; ma: string | null; ky: string; muc_do: string; so_vi_pham: number;
  tong_tien: string; hinh_thuc: string; trang_thai: string; ly_do_mien: string | null;
  so_khieu_nai: number;
}
interface KhieuNaiToi {
  id: string; ma: string | null; loai: string; noi_dung: string; trang_thai: string;
  phan_hoi: string | null; tao_luc: string; ma_ky_luat: string | null; ky_ky_luat: string | null;
}

/** Trang thai ho so ma nguoi lao dong con co the khieu nai. */
const KHIEU_NAI_DUOC = new Set(['cho_duyet', 'da_ap_dung', 'da_nhac']);

function TabKyLuatToi(): ReactNode {
  const kl = dung_nap<KyLuatToi[]>('/api/toi/ky-luat');
  const kn = dung_nap<KhieuNaiToi[]>('/api/toi/khieu-nai');
  const [dang, dat_dang] = useState<KyLuatToi | null>(null);

  const nap_lai = (): void => { kl.nap_lai(); kn.nap_lai(); };

  return (
    <>
      <p className="mo-ta" style={{ marginBottom: 12 }}>
        Hồ sơ kỷ luật (giảm thưởng P3) ghi nhận với bạn. Nếu không đồng ý, bạn có quyền
        <strong> khiếu nại</strong> (Bộ luật Lao động 2019, Điều 131). Mỗi khiếu nại có mã để theo dõi.
      </p>

      <h3>Hồ sơ kỷ luật của tôi</h3>
      {kl.dang_tai ? <DangTai /> : kl.loi !== null ? <HopLoi loi={kl.loi} />
        : (kl.du_lieu ?? []).length === 0
          ? <Trong tieu_de="Không có hồ sơ kỷ luật" mo_ta="Bạn chưa có hồ sơ kỷ luật nào." />
          : (
            <div className="the the-mong"><div className="vo-bang"><table>
              <thead><tr>
                <th>Mã</th><th>Kỳ</th><th>Mức độ</th><th className="canh-phai">Giảm thưởng</th>
                <th>Trạng thái</th><th></th>
              </tr></thead>
              <tbody>
                {(kl.du_lieu ?? []).map((d) => (
                  <tr key={d.id}>
                    <td className="so mo-ma">{d.ma ?? '—'}</td>
                    <td className="khong-ngat so">{d.ky}</td>
                    <td className="khong-ngat">{TEN_MUC_DO[d.muc_do] ?? d.muc_do}</td>
                    <td className="canh-phai so">{tien_kl(d.tong_tien)}đ</td>
                    <td className="khong-ngat">
                      <Nhan tt={d.trang_thai} />
                      {d.so_khieu_nai > 0 && <span className="nhan-khieu-nai"> ● đã khiếu nại</span>}
                    </td>
                    <td className="canh-phai">
                      {KHIEU_NAI_DUOC.has(d.trang_thai) && d.so_khieu_nai === 0 && (
                        <button className="nut-nho" onClick={() => dat_dang(d)}>Khiếu nại</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div></div>
          )}

      <h3 style={{ marginTop: 20 }}>Khiếu nại đã gửi</h3>
      {kn.dang_tai ? <DangTai /> : kn.loi !== null ? <HopLoi loi={kn.loi} />
        : (kn.du_lieu ?? []).length === 0
          ? <Trong tieu_de="Chưa có khiếu nại" mo_ta="Khiếu nại bạn gửi sẽ hiện ở đây kèm phản hồi." />
          : (
            <div className="the the-mong"><div className="vo-bang"><table>
              <thead><tr>
                <th>Mã</th><th>Về</th><th>Nội dung</th><th>Trạng thái</th>
              </tr></thead>
              <tbody>
                {(kn.du_lieu ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="so mo-ma">{c.ma ?? '—'}</td>
                    <td className="khong-ngat mo-ma">
                      {c.ma_ky_luat !== null ? `${c.ma_ky_luat} · kỳ ${c.ky_ky_luat ?? ''}` : '—'}
                    </td>
                    <td>{c.noi_dung}
                      {c.phan_hoi !== null && c.phan_hoi !== ''
                        && <div className="mo-ta">Phản hồi: {c.phan_hoi}</div>}
                    </td>
                    <td className="khong-ngat"><Nhan tt={c.trang_thai} /></td>
                  </tr>
                ))}
              </tbody>
            </table></div></div>
          )}

      {dang !== null && (
        <FormKhieuNai d={dang} khi_dong={() => dat_dang(null)}
          khi_xong={() => { dat_dang(null); nap_lai(); }} />
      )}
    </>
  );
}

function FormKhieuNai(
  { d, khi_dong, khi_xong }: { d: KyLuatToi; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [nd, dat_nd] = useState('');
  const hd = dung_hanh_dong();
  return (
    <HopThoai tieu_de={`Khiếu nại kỷ luật ${d.ma ?? ''}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="ho-so-chi-so">
        <div className="o-so"><div className="o-so-nhan">Kỳ</div><div className="o-so-gia-tri">{d.ky}</div></div>
        <div className="o-so"><div className="o-so-nhan">Giảm thưởng</div>
          <div className="o-so-gia-tri so">{tien_kl(d.tong_tien)}đ</div></div>
      </div>
      <p className="mo-ta">
        Trình bày rõ lý do bạn không đồng ý với quyết định này. Nhân sự / Admin sẽ xem xét và phản hồi.
      </p>
      <label htmlFor="kn-nd">Nội dung khiếu nại</label>
      <textarea id="kn-nd" value={nd} onChange={(e) => dat_nd(e.target.value)} rows={4}
        placeholder="vd: tôi đã có đơn giải trình được duyệt cho ngày này…" />
      <div className="hang-nut">
        <button className="nut-chinh" disabled={hd.dang_chay || nd.trim().length < 5}
          onClick={() => void hd.chay(() => goi('/api/toi/khieu-nai', {
            method: 'POST', body: { ho_so_ky_luat_id: d.id, loai: 'khieu_nai', noi_dung: nd },
          }), 'Đã gửi khiếu nại.').then((ok) => { if (ok) khi_xong(); })}>
          {hd.dang_chay ? 'Đang gửi…' : 'Gửi khiếu nại'}
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

function FormGiaiTrinhViPham(
  { vp, khi_dong, khi_xong }: { vp: ViPhamToi; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [gt, dat_gt] = useState(vp.giai_trinh ?? '');
  const hd = dung_hanh_dong();
  return (
    <HopThoai tieu_de="Giải trình vi phạm" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="ho-so-chi-so">
        <div className="o-so"><div className="o-so-nhan">Ngày</div><div className="o-so-gia-tri">{ngay_v(vp.ngay)}</div></div>
        <div className="o-so"><div className="o-so-nhan">Loại</div><div className="o-so-gia-tri" style={{ fontSize: 15 }}>{vp.ten_loai}</div></div>
      </div>
      {vp.mo_ta !== null && vp.mo_ta !== '' && <p className="mo-ta"><strong>Nội dung:</strong> {vp.mo_ta}</p>}
      <label htmlFor="vp-gt">Giải trình của bạn</label>
      <textarea id="vp-gt" value={gt} onChange={(e) => dat_gt(e.target.value)} rows={4}
        placeholder="Trình bày lý do, kèm bằng chứng nếu có…" />
      <div className="hang-nut">
        <button className="nut-chinh" disabled={hd.dang_chay || gt.trim().length < 5}
          onClick={() => void hd.chay(() => goi(`/api/toi/vi-pham/${vp.id}/giai-trinh`, {
            method: 'POST', body: { giai_trinh: gt },
          }), 'Đã gửi giải trình.').then((ok) => { if (ok) khi_xong(); })}>
          {hd.dang_chay ? 'Đang gửi…' : 'Gửi giải trình'}
        </button>
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}
