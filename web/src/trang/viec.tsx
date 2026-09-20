// Quan ly cong viec — giao dien QUAN TRI (admin / nhan su / truong phong):
// giao viec, duyet ket qua, chien dich, dinh ky, workflow he thong.
// Hai giao dien chinh: Danh sach (checklist) va Gantt (tu dung bang CSS grid).
// Giao dien CA NHAN nam o trang/viec_toi.tsx (tab trong Khu vuc cua toi).
import { useState, type ReactNode } from 'react';
import { goi, la_nguoi_duyet, la_nhan_su, nguoi_dung_hien_tai } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap,
  hom_nay, ngay_gio, ngay_viet,
} from '../thanh_phan.tsx';

// ---------------------------------------------------------------- kieu du lieu
export interface DongViec {
  id: string;
  nhan_vien_id: string;
  ho_ten: string | null;
  ma_nv: string | null;
  ten_phong_ban: string | null;
  tieu_de: string;
  mo_ta: string | null;
  giao_boi: string | null;
  ten_nguoi_giao: string | null;
  han: string | null;
  han_gio: string;
  han_moc: string | null;
  bat_dau: string | null;
  uu_tien: string;
  nguon: string;
  trang_thai: string;
  ket_qua: string | null;
  phan_hoi: string | null;
  ly_do_huy: string | null;
  nop_luc: string | null;
  hoan_thanh_luc: string | null;
  nhom_id: string | null;
  ten_nhom: string | null;
  mau_dinh_ky_id: string | null;
  tao_luc: string;
  so_hanh_dong: number;
  so_hanh_dong_xong: number;
}

interface HanhDong {
  id: string;
  ten: string;
  xong: boolean;
  xong_luc: string | null;
  thu_tu: number;
}

interface MauDinhKy {
  id: string;
  ten: string;
  mo_ta: string | null;
  nhan_vien_id: string;
  ho_ten: string | null;
  nguon: string;
  quy_tac: string;
  cac_thu: number[];
  ngay_trong_thang: number[];
  so_ngay: number | null;
  gio_han: string;
  bat_dau: string;
  ket_thuc: string | null;
  uu_tien: string;
  dang_bat: boolean;
  ten_nguoi_giao: string | null;
}

interface WorkflowCF {
  ma: string;
  ten: string;
  mo_ta: string;
  kieu_duoc_chon: string[];
  dang_bat: boolean;
  nguoi_nhan_kieu: string;
  nhan_vien_id: string | null;
  ho_ten: string | null;
  han_sau_gio: number;
  uu_tien: string;
  ghi_chu: string | null;
}

interface NhanVienGon {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  dang_hoat_dong: boolean;
}

// ---------------------------------------------------------------- nhan / mau
const NHAN_TT: Record<string, string> = {
  moi: 'Mới', dang_lam: 'Đang làm', cho_duyet: 'Chờ duyệt',
  hoan_thanh: 'Hoàn thành', khong_hoan_thanh: 'Không hoàn thành', huy: 'Đã hủy',
};
const MAU_TT: Record<string, string> = {
  moi: 'nhan-mo', dang_lam: 'nhan-canh-bao', cho_duyet: 'nhan-canh-bao',
  hoan_thanh: 'nhan-tot', khong_hoan_thanh: 'nhan-xau', huy: 'nhan-xau',
};
const NHAN_NGUON: Record<string, string> = {
  giam_doc: 'Giám đốc giao', he_thong: 'Hệ thống', truong_phong: 'Trưởng phòng giao',
  lien_phong: 'Liên phòng ban', tu_tao: 'Tự tạo', ho_so: 'Hồ sơ',
};
const LOP_NGUON: Record<string, string> = {
  giam_doc: 'cv-nguon-giam-doc', he_thong: 'cv-nguon-he-thong',
  truong_phong: 'cv-nguon-truong-phong', lien_phong: 'cv-nguon-lien-phong',
  tu_tao: 'cv-nguon-tu-tao', ho_so: 'cv-nguon-ho-so',
};
const NHAN_UU_TIEN: Record<string, string> = {
  khan: 'Khẩn', cao: 'Cao', thuong: 'Thường', thap: 'Thấp',
};
const NHAN_QUY_TAC: Record<string, string> = {
  hang_ngay: 'Hằng ngày', hang_tuan: 'Hằng tuần',
  hang_thang: 'Hằng tháng', khoang_ngay: 'Mỗi N ngày',
};
const TT_LOC = ['moi', 'dang_lam', 'cho_duyet', 'hoan_thanh', 'khong_hoan_thanh', 'huy'] as const;

/** 'dd/mm/yyyy' -> 'YYYY-MM-DD'; tra null khi rong, loi khi sai dang. */
function viet_sang_iso(viet: string): { ok: true; iso: string | null } | { ok: false; loi: string } {
  const s = viet.trim();
  if (s === '') return { ok: true, iso: null };
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m === null) return { ok: false, loi: 'Ngày phải viết dạng dd/mm/yyyy (ví dụ 20/09/2026).' };
  const dd = Number(m[1]);
  const tt = Number(m[2]);
  const nn = Number(m[3]);
  if (dd < 1 || dd > 31 || tt < 1 || tt > 12 || nn < 2000 || nn > 2100) {
    return { ok: false, loi: 'Ngày không hợp lệ.' };
  }
  return { ok: true, iso: `${m[3]}-${m[2]}-${m[1]}` };
}

/** Danh sach ngay tu..den — dung cho cot cua gantt. */
function danh_sach_ngay(tu: string, den: string): string[] {
  const kq: string[] = [];
  let d = new Date(`${tu}T00:00:00Z`);
  const cuoi = new Date(`${den}T00:00:00Z`);
  let dem = 0;
  while (d.getTime() <= cuoi.getTime() && dem < 400) {
    kq.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 86_400_000);
    dem++;
  }
  return kq;
}

// ---------------------------------------------------------------- trang chinh
type TabViec = 'danh_sach' | 'gantt' | 'dinh_ky' | 'workflow';

export function TrangViec(): ReactNode {
  const [tab, dat_tab] = useState<TabViec>('danh_sach');
  const nd = nguoi_dung_hien_tai();
  const la_qly = la_nguoi_duyet();
  const la_ns = la_nhan_su();

  const cac_tab: { ma: TabViec; ten: string }[] = [
    { ma: 'danh_sach', ten: 'Danh sách' },
    { ma: 'gantt', ten: 'Gantt' },
  ];
  if (la_qly) cac_tab.push({ ma: 'dinh_ky', ten: 'Định kỳ' });
  if (la_ns) cac_tab.push({ ma: 'workflow', ten: 'Workflow hệ thống' });

  return (
    <div className="cv-trang">
      <div className="cv-tab-hang">
        {cac_tab.map((t) => (
          <button
            key={t.ma}
            className={tab === t.ma ? 'cv-tab cv-tab-chon' : 'cv-tab'}
            onClick={() => dat_tab(t.ma)}
          >
            {t.ten}
          </button>
        ))}
        {nd !== null && (
          <span className="cv-tab-phu">
            {la_qly ? 'Giao việc, duyệt kết quả và theo dõi toàn đội' : 'Công việc của bạn'}
          </span>
        )}
      </div>

      {tab === 'danh_sach' && <ManDanhSach la_qly={la_qly} />}
      {tab === 'gantt' && <ManGantt />}
      {tab === 'dinh_ky' && la_qly && <ManDinhKy />}
      {tab === 'workflow' && la_ns && <ManWorkflow />}
    </div>
  );
}

// ================================================================ DANH SACH (checklist)
function ManDanhSach({ la_qly }: { la_qly: boolean }): ReactNode {
  const [trang_thai, dat_trang_thai] = useState<'' | typeof TT_LOC[number]>('');
  const [nhan_vien_id, dat_nhan_vien_id] = useState('');
  const [tim, dat_tim] = useState('');
  const [mo_tao, dat_mo_tao] = useState(false);
  const [mo_chi_tiet, dat_mo_chi_tiet] = useState<string | null>(null);

  const truy_van = `/api/viec/toi${trang_thai === '' ? '' : `?trang_thai=${trang_thai}`}`;
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<{ danh_sach: DongViec[]; tong: number }>(
    truy_van, [trang_thai],
  );
  const nv = dung_nap<NhanVienGon[]>(la_qly ? '/api/nhan-vien' : null, []);

  const tat_ca = du_lieu?.danh_sach ?? [];
  const loc = nhan_vien_id === '' ? tat_ca : tat_ca.filter((v) => v.nhan_vien_id === nhan_vien_id);
  const tim_sach = tim.trim().toLowerCase();
  const ds = tim_sach === ''
    ? loc
    : loc.filter((v) => v.tieu_de.toLowerCase().includes(tim_sach)
        || (v.ho_ten ?? '').toLowerCase().includes(tim_sach));

  return (
    <div>
      <div className="cv-hang-loc">
        <select value={trang_thai} onChange={(e) => dat_trang_thai(e.target.value as typeof TT_LOC[number] | '')}>
          <option value="">Mọi trạng thái</option>
          {TT_LOC.map((t) => <option key={t} value={t}>{NHAN_TT[t]}</option>)}
        </select>
        {la_qly && (
          <select value={nhan_vien_id} onChange={(e) => dat_nhan_vien_id(e.target.value)}>
            <option value="">Mọi nhân viên</option>
            {(nv.du_lieu ?? []).map((x) => (
              <option key={x.id} value={x.id}>{x.ho_ten} ({x.ma_nv})</option>
            ))}
          </select>
        )}
        <input
          value={tim} placeholder="Tìm theo tên việc hoặc người nhận"
          onChange={(e) => dat_tim(e.target.value)}
        />
        <button className="nut nut-chinh" onClick={() => dat_mo_tao(true)}>Giao việc</button>
      </div>

      {dang_tai ? <XuongBang /> : loi !== null ? <HopLoi loi={loi} /> : ds.length === 0 ? (
        <Trong tieu_de="Không có công việc nào" mo_ta="Bấm “Giao việc” để tạo việc mới." />
      ) : (
        <table className="cv-bang">
          <thead>
            <tr>
              <th className="cv-cot-tich" />
              <th>Công việc</th>
              <th>Người nhận</th>
              <th>Nguồn</th>
              <th>Hạn</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((v) => (
              <tr key={v.id}>
                <td className="cv-cot-tich">
                  <input
                    type="checkbox" checked={v.trang_thai === 'hoan_thanh'} readOnly
                    aria-label="hoàn thành"
                  />
                </td>
                <td>
                  <button className="cv-mo" onClick={() => dat_mo_chi_tiet(v.id)}>
                    {v.tieu_de}
                  </button>
                  {v.ten_nhom !== null && <span className="cv-nhom-ten">{v.ten_nhom}</span>}
                  {v.so_hanh_dong > 0 && (
                    <span className="cv-hanh-dong-dem">
                      {v.so_hanh_dong_xong}/{v.so_hanh_dong} bước
                    </span>
                  )}
                </td>
                <td>{v.ho_ten ?? '—'}</td>
                <td><span className={`cv-nguon ${LOP_NGUON[v.nguon] ?? ''}`}>
                  {NHAN_NGUON[v.nguon] ?? v.nguon}
                </span></td>
                <td>{v.han === null ? '—' : `${ngay_viet(v.han)} ${v.han_gio}`}</td>
                <td>{NHAN_UU_TIEN[v.uu_tien] ?? v.uu_tien}</td>
                <td><span className={`nhan ${MAU_TT[v.trang_thai] ?? 'nhan-mo'}`}>
                  {NHAN_TT[v.trang_thai] ?? v.trang_thai}
                </span></td>
                <td>
                  <button className="cv-mo" onClick={() => dat_mo_chi_tiet(v.id)}>Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mo_tao && (
        <HopThoai tieu_de="Giao công việc mới" khi_dong={() => dat_mo_tao(false)} rong>
          <FormTaoViec la_qly={la_qly} khi_xong={() => { dat_mo_tao(false); nap_lai(); }} />
        </HopThoai>
      )}
      {mo_chi_tiet !== null && (
        <HopThoaiChiTiet id={mo_chi_tiet} khi_dong={() => { dat_mo_chi_tiet(null); nap_lai(); }} />
      )}
    </div>
  );
}

function XuongBang(): ReactNode {
  return <div className="cv-xuong"><DangTai /></div>;
}

// ---------------------------------------------------------------- form giao viec
function FormTaoViec({ la_qly, khi_xong }: { la_qly: boolean; khi_xong: () => void }): ReactNode {
  const nd = nguoi_dung_hien_tai();
  const hd = dung_hanh_dong();
  const [f, dat] = useState({
    nhan_vien_id: '', tieu_de: '', mo_ta: '', han: '', han_gio: '18:00',
    bat_dau: '', uu_tien: 'thuong', hanh_dong: '',
  });
  const nv = dung_nap<NhanVienGon[]>(la_qly ? '/api/nhan-vien' : null, []);
  const doi = (k: string) => (e: { target: { value: string } }): void =>
    dat({ ...f, [k]: e.target.value });

  const gui = async (): Promise<void> => {
    const han = viet_sang_iso(f.han);
    if (!han.ok) throw new Error(han.loi);
    const bat_dau = viet_sang_iso(f.bat_dau);
    if (!bat_dau.ok) throw new Error(bat_dau.loi);
    const hanh_dong = f.hanh_dong.split('\n').map((x) => x.trim()).filter((x) => x !== '');
    await goi('/api/viec', {
      method: 'POST',
      body: {
        nhan_vien_id: la_qly ? f.nhan_vien_id : (nd?.nhan_vien_id ?? ''),
        tieu_de: f.tieu_de, mo_ta: f.mo_ta === '' ? null : f.mo_ta,
        han: han.iso, han_gio: f.han_gio,
        bat_dau: bat_dau.iso, uu_tien: f.uu_tien, hanh_dong,
      },
    });
    khi_xong();
  };

  return (
    <div className="cv-form">
      {la_qly ? (
        <label>
          Người nhận (bắt buộc)
          <select value={f.nhan_vien_id} onChange={doi('nhan_vien_id')}>
            <option value="">— chọn nhân viên —</option>
            {(nv.du_lieu ?? []).filter((x) => x.dang_hoat_dong).map((x) => (
              <option key={x.id} value={x.id}>{x.ho_ten} ({x.ma_nv})</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="cv-ghi-chu">Bạn đang tạo việc cho chính mình.</div>
      )}
      <label>
        Tiêu đề (bắt buộc)
        <input value={f.tieu_de} onChange={doi('tieu_de')} placeholder="vd: Lập báo cáo tuần" />
      </label>
      <label>
        Mô tả
        <textarea value={f.mo_ta} onChange={doi('mo_ta')} rows={3} />
      </label>
      <div className="cv-hai-cot">
        <label>
          Hạn (dd/mm/yyyy)
          <input value={f.han} onChange={doi('han')} placeholder="20/09/2026" />
        </label>
        <label>
          Giờ hạn
          <input type="time" value={f.han_gio} onChange={doi('han_gio')} />
        </label>
      </div>
      <div className="cv-hai-cot">
        <label>
          Bắt đầu (để trống = hôm nay)
          <input value={f.bat_dau} onChange={doi('bat_dau')} placeholder="dd/mm/yyyy" />
        </label>
        <label>
          Ưu tiên
          <select value={f.uu_tien} onChange={doi('uu_tien')}>
            <option value="thuong">Thường</option>
            <option value="thap">Thấp</option>
            <option value="cao">Cao</option>
            <option value="khan">Khẩn</option>
          </select>
        </label>
      </div>
      <label>
        Checklist (mỗi dòng một việc con, tùy chọn)
        <textarea value={f.hanh_dong} onChange={doi('hanh_dong')} rows={3}
          placeholder={'Bước 1\nBước 2'} />
      </label>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="cv-nut-hang">
        <button className="nut nut-chinh" onClick={() => void hd.chay(gui, 'Đã giao việc')}>Lưu</button>
        <button className="nut" onClick={khi_xong}>Đóng</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- hop thoai chi tiet
export function HopThoaiChiTiet({ id, khi_dong }: { id: string; khi_dong: () => void }): ReactNode {
  const nd = nguoi_dung_hien_tai();
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<{ viec: DongViec; hanh_dong: HanhDong[] }>(
    `/api/viec/${id}`, [id],
  );
  const hd = dung_hanh_dong();
  const [ket_qua, dat_ket_qua] = useState('');
  const [phan_hoi, dat_phan_hoi] = useState('');
  const [ly_do_huy, dat_ly_do_huy] = useState('');

  if (dang_tai || du_lieu === null) {
    return (
      <HopThoai tieu_de="Chi tiết công việc" khi_dong={khi_dong} rong>
        {loi !== null ? <HopLoi loi={loi} /> : <DangTai />}
      </HopThoai>
    );
  }
  const v = du_lieu.viec;
  const hanh_dong = du_lieu.hanh_dong;
  const la_nhan = nd !== null && v.nhan_vien_id === nd.nhan_vien_id;
  const la_giao = nd !== null && (v.giao_boi === nd.id || la_nhan_su());
  const da_qua_han = v.han_moc !== null && v.han_moc < new Date().toISOString()
    && (v.trang_thai === 'moi' || v.trang_thai === 'dang_lam');

  const doi_hd = async (hid: string, xong: boolean): Promise<void> => {
    await goi(`/api/viec/${v.id}/hanh-dong/${hid}`, { method: 'PATCH', body: { xong } });
    nap_lai();
  };

  return (
    <HopThoai tieu_de="Chi tiết công việc" khi_dong={khi_dong} rong>
      <div className="cv-chi-tiet">
        <div className="cv-tua">{v.tieu_de}</div>
        <div className="cv-thong-tin">
          <span className={`cv-nguon ${LOP_NGUON[v.nguon] ?? ''}`}>{NHAN_NGUON[v.nguon] ?? v.nguon}</span>
          <span className={`nhan ${MAU_TT[v.trang_thai] ?? 'nhan-mo'}`}>
            {NHAN_TT[v.trang_thai] ?? v.trang_thai}
          </span>
          {da_qua_han && <span className="nhan nhan-xau">Đã quá hạn</span>}
          <span>{NHAN_UU_TIEN[v.uu_tien] ?? v.uu_tien}</span>
        </div>
        <div className="cv-dong">
          <b>Người nhận:</b> {v.ho_ten ?? '—'} · <b>Người giao:</b> {v.ten_nguoi_giao ?? '—'}
        </div>
        <div className="cv-dong">
          <b>Hạn:</b> {v.han === null ? '—' : `${ngay_viet(v.han)} lúc ${v.han_gio}`}
          {v.bat_dau !== null && <> · <b>Bắt đầu:</b> {ngay_gio(v.bat_dau)}</>}
          {v.ten_nhom !== null && <> · <b>Nhóm:</b> {v.ten_nhom}</>}
        </div>
        {v.mo_ta !== null && <div className="cv-mo-ta">{v.mo_ta}</div>}

        {hanh_dong.length > 0 && (
          <div className="cv-hanh-dong-khoi">
            <div className="cv-muc">Checklist ({hanh_dong.filter((h) => h.xong).length}/{hanh_dong.length})</div>
            {hanh_dong.map((h) => (
              <label key={h.id} className="cv-hanh-dong">
                <input
                  type="checkbox" checked={h.xong} disabled={!la_nhan}
                  onChange={(e) => void hd.chay(() => doi_hd(h.id, e.target.checked), 'Đã cập nhật')}
                />
                <span className={h.xong ? 'cv-hanh-dong-xong' : ''}>{h.ten}</span>
              </label>
            ))}
          </div>
        )}

        {v.ket_qua !== null && (
          <div className="cv-ket-qua"><b>Kết quả đã nộp:</b> {v.ket_qua}</div>
        )}
        {v.phan_hoi !== null && (
          <div className="cv-phan-hoi"><b>Phản hồi người giao:</b> {v.phan_hoi}</div>
        )}
        {v.ly_do_huy !== null && (
          <div className="cv-phan-hoi"><b>Lý do hủy:</b> {v.ly_do_huy}</div>
        )}
        {v.hoan_thanh_luc !== null && (
          <div className="cv-dong"><b>Hoàn thành lúc:</b> {ngay_gio(v.hoan_thanh_luc)}</div>
        )}

        {la_nhan && v.trang_thai === 'moi' && (
          <button className="nut nut-chinh" onClick={() => void hd.chay(
            () => goi(`/api/viec/${v.id}/trang-thai`, { method: 'PATCH', body: { trang_thai: 'dang_lam' } }),
            'Đã bắt đầu',
          ).then(() => nap_lai())}>Bắt đầu làm</button>
        )}

        {la_nhan && (v.trang_thai === 'moi' || v.trang_thai === 'dang_lam') && (
          <div className="cv-o-ket-qua">
            <label>
              Kết quả thực hiện
              <textarea value={ket_qua} onChange={(e) => dat_ket_qua(e.target.value)} rows={3}
                placeholder="Nêu rõ việc đã làm để người giao xác nhận" />
            </label>
            <button className="nut nut-chinh" onClick={() => void hd.chay(
              () => goi(`/api/viec/${v.id}/nop`, { method: 'PATCH', body: { ket_qua } }),
              'Đã nộp kết quả',
            ).then(() => { dat_ket_qua(''); nap_lai(); })}>Nộp kết quả</button>
          </div>
        )}

        {la_giao && v.trang_thai === 'cho_duyet' && (
          <div className="cv-o-ket-qua">
            <label>
              Phản hồi (bắt buộc khi từ chối)
              <textarea value={phan_hoi} onChange={(e) => dat_phan_hoi(e.target.value)} rows={2} />
            </label>
            <div className="cv-nut-hang">
              <button className="nut nut-chinh" onClick={() => void hd.chay(
                () => goi(`/api/viec/${v.id}/duyet`,
                  { method: 'PATCH', body: { chap_nhan: true, phan_hoi } }),
                'Đã xác nhận hoàn thành',
              ).then(() => nap_lai())}>Xác nhận hoàn thành</button>
              <button className="nut" onClick={() => void hd.chay(
                () => goi(`/api/viec/${v.id}/duyet`,
                  { method: 'PATCH', body: { chap_nhan: false, phan_hoi } }),
                'Đã yêu cầu làm lại',
              ).then(() => nap_lai())}>Yêu cầu làm lại</button>
            </div>
          </div>
        )}

        {la_giao && (v.trang_thai === 'moi' || v.trang_thai === 'dang_lam'
          || v.trang_thai === 'cho_duyet') && (
          <div className="cv-o-ket-qua">
            <label>
              Lý do hủy việc
              <input value={ly_do_huy} onChange={(e) => dat_ly_do_huy(e.target.value)} />
            </label>
            <button className="nut" onClick={() => void hd.chay(
              () => goi(`/api/viec/${v.id}/huy`, { method: 'PATCH', body: { ly_do: ly_do_huy } }),
              'Đã hủy công việc',
            ).then(() => nap_lai())}>Hủy công việc</button>
          </div>
        )}

        {hd.loi !== null && <HopLoi loi={hd.loi} />}
        <div className="cv-dong cv-mo">Tạo lúc {ngay_gio(v.tao_luc)}</div>
      </div>
    </HopThoai>
  );
}

// ================================================================ GANTT
export function ManGantt(): ReactNode {
  const [nghin, dat_nghin] = useState(14);
  const hom_nay_str = hom_nay();
  const tu = new Date(new Date(`${hom_nay_str}T00:00:00Z`).getTime() - (nghin - 1) * 86_400_000)
    .toISOString().slice(0, 10);
  const den = new Date(new Date(`${hom_nay_str}T00:00:00Z`).getTime() + nghin * 86_400_000)
    .toISOString().slice(0, 10);
  const { du_lieu, dang_tai, loi } = dung_nap<DongViec[]>(
    `/api/viec/gantt?tu=${tu}&den=${den}`, [nghin],
  );
  const ngay = danh_sach_ngay(tu, den);

  return (
    <div>
      <div className="cv-hang-loc">
        <label className="cv-ghi-chu">Cửa sổ xem:</label>
        <select value={nghin} onChange={(e) => dat_nghin(Number(e.target.value))}>
          <option value={7}>±7 ngày</option>
          <option value={14}>±14 ngày</option>
          <option value={30}>±30 ngày</option>
        </select>
        <span className="cv-gantt-chu-thich">
          <span className="cv-nguon cv-nguon-giam-doc">Giám đốc</span>
          <span className="cv-nguon cv-nguon-he-thong">Hệ thống</span>
          <span className="cv-nguon cv-nguon-truong-phong">Trưởng phòng</span>
          <span className="cv-nguon cv-nguon-lien-phong">Liên phòng</span>
          <span className="cv-nguon cv-nguon-tu-tao">Tự tạo</span>
        </span>
      </div>
      {dang_tai ? <XuongBang /> : loi !== null ? <HopLoi loi={loi} /> : (
        <div className="cv-gantt">
          <div
            className="cv-gantt-dau"
            style={{ gridTemplateColumns: `220px repeat(${ngay.length}, minmax(26px, 1fr))` }}
          >
            <div className="cv-gantt-ten-cot" />
            {ngay.map((n) => (
              <div key={n} className={n === hom_nay_str ? 'cv-gantt-ngay cv-gantt-hom-nay' : 'cv-gantt-ngay'}>
                {n.slice(8)}
              </div>
            ))}
          </div>
          <div className="cv-gantt-than">
            {(du_lieu ?? []).map((v) => {
              const bat = (v.bat_dau ?? v.tao_luc ?? '').slice(0, 10);
              const han = (v.han ?? v.tao_luc ?? '').slice(0, 10);
              let i0 = ngay.indexOf(bat);
              let i1 = ngay.indexOf(han);
              if (i0 < 0) i0 = 0;
              if (i1 < 0) i1 = ngay.length - 1;
              if (i1 < i0) i1 = i0;
              return (
                <div
                  key={v.id} className="cv-gantt-hang"
                  style={{ gridTemplateColumns: `220px repeat(${ngay.length}, minmax(26px, 1fr))` }}
                >
                  <div className="cv-gantt-ten" title={v.tieu_de}>
                    <b>{v.ho_ten ?? '—'}</b> · {v.tieu_de}
                    <span className={`nhan ${MAU_TT[v.trang_thai] ?? 'nhan-mo'}`}>
                      {NHAN_TT[v.trang_thai] ?? v.trang_thai}
                    </span>
                  </div>
                  <div className="cv-gantt-o">
                    <div
                      className={`cv-gantt-thanh ${LOP_NGUON[v.nguon] ?? ''}`}
                      style={{ gridColumn: `${i0 + 1} / span ${i1 - i0 + 1}` }}
                      title={`${v.tieu_de} — hạn ${v.han === null ? '—' : ngay_viet(v.han)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================ DINH KY
function ManDinhKy(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<MauDinhKy[]>('/api/viec/mau-dinh-ky', []);
  const hd = dung_hanh_dong();
  const [mo_tao, dat_mo_tao] = useState(false);

  const doi_bat = async (m: MauDinhKy, dang_bat: boolean): Promise<void> => {
    await goi(`/api/viec/mau-dinh-ky/${m.id}`, { method: 'PATCH', body: { dang_bat } });
    nap_lai();
  };

  return (
    <div>
      <div className="cv-hang-loc">
        <button className="nut nut-chinh" onClick={() => dat_mo_tao(true)}>Tạo việc định kỳ</button>
      </div>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {dang_tai ? <XuongBang /> : loi !== null ? <HopLoi loi={loi} /> : (du_lieu ?? []).length === 0 ? (
        <Trong tieu_de="Chưa có việc định kỳ nào"
          mo_ta="Việc lặp lại hằng ngày / hằng tuần / hằng tháng sẽ tự sinh theo lịch vào ban đêm." />
      ) : (
        <table className="cv-bang">
          <thead>
            <tr>
              <th>Tên mẫu</th><th>Người nhận</th><th>Quy tắc</th><th>Giờ hạn</th>
              <th>Đến ngày</th><th>Bật</th>
            </tr>
          </thead>
          <tbody>
            {(du_lieu ?? []).map((m) => (
              <tr key={m.id}>
                <td>{m.ten}</td>
                <td>{m.ho_ten ?? '—'}</td>
                <td>{NHAN_QUY_TAC[m.quy_tac] ?? m.quy_tac}</td>
                <td>{m.gio_han}</td>
                <td>{m.ket_thuc === null ? 'Mãi mãi' : ngay_viet(m.ket_thuc)}</td>
                <td>
                  <input type="checkbox" checked={m.dang_bat}
                    onChange={(e) => void hd.chay(() => doi_bat(m, e.target.checked), 'Đã cập nhật')} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {mo_tao && (
        <HopThoai tieu_de="Tạo việc định kỳ" khi_dong={() => dat_mo_tao(false)} rong>
          <FormMauDinhKy khi_xong={() => { dat_mo_tao(false); nap_lai(); }} />
        </HopThoai>
      )}
    </div>
  );
}

function FormMauDinhKy({ khi_xong }: { khi_xong: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const nv = dung_nap<NhanVienGon[]>('/api/nhan-vien', []);
  const [f, dat] = useState({
    nhan_vien_id: '', ten: '', mo_ta: '', quy_tac: 'hang_tuan',
    cac_thu: '1,2,3,4,5', ngay_trong_thang: '1', so_ngay: '7',
    gio_han: '18:00', bat_dau: '', ket_thuc: '', uu_tien: 'thuong',
  });
  const doi = (k: string) => (e: { target: { value: string } }): void =>
    dat({ ...f, [k]: e.target.value });

  const gui = async (): Promise<void> => {
    const bat_dau = viet_sang_iso(f.bat_dau);
    if (!bat_dau.ok) throw new Error(bat_dau.loi);
    const ket_thuc = viet_sang_iso(f.ket_thuc);
    if (!ket_thuc.ok) throw new Error(ket_thuc.loi);
    const so = (s: string): number[] =>
      s.split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n));
    await goi('/api/viec/mau-dinh-ky', {
      method: 'POST',
      body: {
        ten: f.ten, mo_ta: f.mo_ta === '' ? null : f.mo_ta,
        nhan_vien_id: f.nhan_vien_id, quy_tac: f.quy_tac,
        cac_thu: f.quy_tac === 'hang_tuan' ? so(f.cac_thu) : [],
        ngay_trong_thang: f.quy_tac === 'hang_thang' ? so(f.ngay_trong_thang) : [],
        so_ngay: f.quy_tac === 'khoang_ngay' ? Number(f.so_ngay) : null,
        gio_han: f.gio_han, bat_dau: bat_dau.iso, ket_thuc: ket_thuc.iso,
        uu_tien: f.uu_tien,
      },
    });
    khi_xong();
  };

  return (
    <div className="cv-form">
      <label>
        Người nhận (bắt buộc)
        <select value={f.nhan_vien_id} onChange={doi('nhan_vien_id')}>
          <option value="">— chọn nhân viên —</option>
          {(nv.du_lieu ?? []).filter((x) => x.dang_hoat_dong).map((x) => (
            <option key={x.id} value={x.id}>{x.ho_ten} ({x.ma_nv})</option>
          ))}
        </select>
      </label>
      <label>
        Tên mẫu (bắt buộc)
        <input value={f.ten} onChange={doi('ten')} placeholder="vd: Báo cáo tồn kho mỗi sáng" />
      </label>
      <label>
        Mô tả
        <textarea value={f.mo_ta} onChange={doi('mo_ta')} rows={2} />
      </label>
      <div className="cv-hai-cot">
        <label>
          Lặp lại
          <select value={f.quy_tac} onChange={doi('quy_tac')}>
            <option value="hang_ngay">Hằng ngày</option>
            <option value="hang_tuan">Hằng tuần</option>
            <option value="hang_thang">Hằng tháng</option>
            <option value="khoang_ngay">Mỗi N ngày</option>
          </select>
        </label>
        <label>
          Giờ hạn
          <input type="time" value={f.gio_han} onChange={doi('gio_han')} />
        </label>
      </div>
      {f.quy_tac === 'hang_tuan' && (
        <label>
          Các thứ (0=CN, 1=T2 … 6=T7, cách nhau dấu phẩy)
          <input value={f.cac_thu} onChange={doi('cac_thu')} />
        </label>
      )}
      {f.quy_tac === 'hang_thang' && (
        <label>
          Các ngày trong tháng (cách nhau dấu phẩy; 31 = cuối tháng)
          <input value={f.ngay_trong_thang} onChange={doi('ngay_trong_thang')} />
        </label>
      )}
      {f.quy_tac === 'khoang_ngay' && (
        <label>
          Số ngày giữa hai lần
          <input value={f.so_ngay} onChange={doi('so_ngay')} />
        </label>
      )}
      <div className="cv-hai-cot">
        <label>
          Bắt đầu (dd/mm/yyyy)
          <input value={f.bat_dau} onChange={doi('bat_dau')} placeholder="20/09/2026" />
        </label>
        <label>
          Kết thúc (để trống = mãi mãi)
          <input value={f.ket_thuc} onChange={doi('ket_thuc')} placeholder="dd/mm/yyyy" />
        </label>
      </div>
      <label>
        Ưu tiên
        <select value={f.uu_tien} onChange={doi('uu_tien')}>
          <option value="thuong">Thường</option>
          <option value="thap">Thấp</option>
          <option value="cao">Cao</option>
          <option value="khan">Khẩn</option>
        </select>
      </label>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="cv-nut-hang">
        <button className="nut nut-chinh" onClick={() => void hd.chay(gui, 'Đã tạo mẫu định kỳ')}>Lưu</button>
        <button className="nut" onClick={khi_xong}>Đóng</button>
      </div>
    </div>
  );
}

// ================================================================ WORKFLOW HE THONG
function ManWorkflow(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<WorkflowCF[]>('/api/viec/workflow', []);
  return (
    <div>
      <div className="cv-ghi-chu cv-chu-y">
        Hệ thống tự giao việc khi sự kiện xảy ra. Mỗi sự kiện chọn người nhận và hạn (tính từ
        lúc xảy ra), có thể tắt hẳn.
      </div>
      {dang_tai ? <XuongBang /> : loi !== null ? <HopLoi loi={loi} /> : (
        (du_lieu ?? []).map((w) => <DongWorkflow key={w.ma} w={w} nap_lai={nap_lai} />)
      )}
    </div>
  );
}

function DongWorkflow({ w, nap_lai }: { w: WorkflowCF; nap_lai: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const nv = dung_nap<NhanVienGon[]>('/api/nhan-vien', []);
  const [f, dat] = useState({
    dang_bat: w.dang_bat, nguoi_nhan_kieu: w.nguoi_nhan_kieu,
    nhan_vien_id: w.nhan_vien_id ?? '', han_sau_gio: String(w.han_sau_gio),
    uu_tien: w.uu_tien,
  });
  const doi = (k: string) => (e: { target: { value: string } }): void =>
    dat({ ...f, [k]: e.target.value });

  const luu = async (): Promise<void> => {
    await goi(`/api/viec/workflow/${w.ma}`, {
      method: 'PATCH',
      body: {
        dang_bat: f.dang_bat,
        nguoi_nhan_kieu: f.nguoi_nhan_kieu,
        nhan_vien_id: f.nguoi_nhan_kieu === 'co_dinh' ? f.nhan_vien_id : null,
        han_sau_gio: Number(f.han_sau_gio),
        uu_tien: f.uu_tien,
      },
    });
    nap_lai();
  };

  return (
    <div className="cv-workflow">
      <div className="cv-workflow-ten">{w.ten}</div>
      <div className="cv-mo-ta">{w.mo_ta}</div>
      <div className="cv-hang-loc">
        <label>
          <input type="checkbox" checked={f.dang_bat}
            onChange={(e) => dat({ ...f, dang_bat: e.target.checked })} /> Bật
        </label>
        <select value={f.nguoi_nhan_kieu} onChange={doi('nguoi_nhan_kieu')}>
          {w.kieu_duoc_chon.includes('co_dinh') && <option value="co_dinh">Người cố định</option>}
          {w.kieu_duoc_chon.includes('truong_phong_lien_quan') && (
            <option value="truong_phong_lien_quan">Trưởng phòng liên quan</option>
          )}
        </select>
        {f.nguoi_nhan_kieu === 'co_dinh' && (
          <select value={f.nhan_vien_id} onChange={doi('nhan_vien_id')}>
            <option value="">— chọn người phụ trách —</option>
            {(nv.du_lieu ?? []).filter((x) => x.dang_hoat_dong).map((x) => (
              <option key={x.id} value={x.id}>{x.ho_ten} ({x.ma_nv})</option>
            ))}
          </select>
        )}
        <label>
          Hạn sau (giờ)
          <input type="number" min={0} step={0.5} value={f.han_sau_gio} onChange={doi('han_sau_gio')} />
        </label>
        <select value={f.uu_tien} onChange={doi('uu_tien')}>
          <option value="thuong">Thường</option>
          <option value="thap">Thấp</option>
          <option value="cao">Cao</option>
          <option value="khan">Khẩn</option>
        </select>
        <button className="nut nut-chinh" onClick={() => void hd.chay(luu, 'Đã lưu cấu hình')}>Lưu</button>
      </div>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
    </div>
  );
}
