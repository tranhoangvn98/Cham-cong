// Quan ly co cau to chuc – vi tri – trach nhiem (JD phan tang 3 cap + RACI + PDCA).
//
// 5 tab:
//   Co cau & bao phu: cay Nhom TN -> TN chi tiet -> dau viec, den bao da co nguoi
//                     thuc hien / dang sinh viec chua + danh sach lo hong.
//   Vi tri & JD:     danh muc vi tri, chi tiet dau viec, SUA RACI + step, tao moi,
//                     SAO CHEP tu dau viec da co, bat/tat sinh viec.
//   Nhan vien:       gan vi tri (kiem nhiem) cho nhan vien.
//   Do luong:        nhan su co lam tron trach nhiem khong (ti le hoan thanh ky).
//   Ma bao cao:      danh muc 208 ma BC.
import { useState, type ReactNode } from 'react';
import { goi, la_nhan_su } from '../api.ts';
import { DangTai, HopLoi, HopThoai, Trong, dung_nap } from '../thanh_phan.tsx';

// ---------------------------------------------------------------- kieu du lieu
interface DongViTri {
  id: string;
  ma: string;
  ten: string;
  cap_bac: string;
  pham_vi: string;
  phong_ban_id: string | null;
  ten_phong_ban: string | null;
  mo_ta: string | null;
  dang_hoat_dong: boolean;
  so_dau_viec: number;
  so_nguoi_gui: number;
}

interface DongRaci { vai_tro: 'R' | 'A' | 'C' | 'I'; kieu_nguoi: string }
interface DongBuoc { id: string; ten: string; mo_ta: string | null; thu_tu: number }

interface DongDauViec {
  id: string;
  vi_tri_id: string;
  ten_vi_tri: string | null;
  ten: string;
  mo_ta: string | null;
  nhom_id: string;
  ten_nhom: string | null;
  tn_chi_tiet_id: string | null;
  ten_tn: string | null;
  phong_ban_id: string | null;
  ten_phong_ban: string | null;
  input: string | null;
  output: string | null;
  kpi: string | null;
  co_bc: boolean;
  ma_bc: string | null;
  trang_thai_ma_bc: 'de_xuat' | 'chuan' | null;
  tan_suat: string;
  tan_suat_tho: string | null;
  sla: string | null;
  phan_cap_xu_ly: string | null;
  muc_do_quan_trong: 'cao' | 'rat_cao' | 'trung_binh';
  ghi_chu: string | null;
  dang_bat: boolean;
  raci: DongRaci[];
  buoc: DongBuoc[];
}

interface DongNhom { id: string; ma: string; ten: string; so_task: number }
interface DongTn {
  id: string; nhom_id: string; ma: string | null; ten: string;
  nguoi_quan_tri_vi_tri_id: string | null; ten_nguoi_quan_tri: string | null; so_task: number;
}
interface DongBaoPhuTn {
  id: string; nhom_id: string; ma: string | null; ten: string; ten_nguoi_quan_tri: string | null;
  so_task: number; so_task_co_nguoi: number; so_task_dang_chay: number; so_task_tat: number;
}
interface DongDoLuong {
  nhan_vien_id: string; ho_ten: string | null; ma_nv: string | null; ten_phong_ban: string | null;
  so_vi_tri: number; so_dau_viec: number; so_viec: number; so_xong: number;
  so_cho_duyet: number; so_qua_han: number;
}
interface NhanVienGon {
  id: string; ma_nv: string; ho_ten: string; phong_ban: string | null; dang_hoat_dong: boolean;
}

const NHAN_CAP_BAC: Record<string, string> = {
  cap_cao: 'Cấp cao', truong_phong: 'Trưởng phòng', truong_nhom: 'Trưởng nhóm',
  chuyen_vien: 'Chuyên viên', nhan_vien: 'Nhân viên',
};
const NHAN_TAN_SUAT: Record<string, string> = {
  hang_ngay: 'Hằng ngày', hang_tuan: 'Hằng tuần', hai_tuan: '2 tuần',
  hang_thang: 'Hằng tháng', hang_quy: 'Hằng quý', hang_nam: 'Hằng năm',
  '6_thang': '6 tháng', phat_sinh: 'Phát sinh', lien_tuc: 'Liên tục',
};
const NHAN_RA_CI: Record<string, string> = {
  ceo: 'CEO', tp: 'Trưởng phòng', tn: 'Trưởng nhóm / quản trị TN',
  nv_cv: 'NV/CV thực thi', tbks: 'Trưởng Ban KS',
};
const NHAN_MUC_DO: Record<string, string> = {
  cao: 'Cao', rat_cao: 'Rất cao', trung_binh: 'Trung bình',
};

// ---------------------------------------------------------------- trang chinh
type Tab = 'co_cau' | 'vi_tri' | 'nhan_vien' | 'do_luong' | 'ma_bc';

export function TrangToChuc(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('co_cau');
  const la_ns = la_nhan_su();
  return (
    <div className="cv-trang">
      <div className="cv-tab-hang">
        {([
          ['co_cau', 'Cơ cấu & bao phủ'],
          ['vi_tri', 'Vị trí & JD'],
          ['nhan_vien', 'Nhân viên'],
          ['do_luong', 'Đo lường trách nhiệm'],
          ['ma_bc', 'Mã báo cáo'],
        ] as [Tab, string][]).map(([ma, ten]) => (
          <button
            key={ma}
            className={tab === ma ? 'cv-tab cv-tab-chon' : 'cv-tab'}
            onClick={() => dat_tab(ma)}
          >
            {ten}
          </button>
        ))}
        {la_ns && <span className="cv-tab-phu">Bạn có quyền thêm / sửa danh mục</span>}
      </div>
      {tab === 'co_cau' && <ManCoCau />}
      {tab === 'vi_tri' && <ManViTri />}
      {tab === 'nhan_vien' && <ManNhanVien />}
      {tab === 'do_luong' && <ManDoLuong />}
      {tab === 'ma_bc' && <ManMaBc />}
    </div>
  );
}

// ================================================================ CO CAU & BAO PHU
function ManCoCau(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<{ theo_tn: DongBaoPhuTn[]; lo_hong: { id: string; ten: string; ten_vi_tri: string | null; ten_nhom: string | null; ten_tn: string | null }[] }>(
    '/api/to-chuc/bao-phu', [],
  );
  const dm = dung_nap<{ nhom: DongNhom[]; tn: DongTn[] }>('/api/to-chuc/nhom', []);
  if (dang_tai || dm.dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const theo_tn = du_lieu?.theo_tn ?? [];
  const lo_hong = du_lieu?.lo_hong ?? [];
  const nhom = dm.du_lieu?.nhom ?? [];

  return (
    <div className="cv-trang">
      {lo_hong.length > 0 && (
        <div className="the">
          <h3>Lỗ hổng bao phủ — đầu việc chưa có người thực hiện ({lo_hong.length})</h3>
          <table>
            <thead>
              <tr><th>Đầu việc</th><th>Vị trí thực thi</th><th>Nhóm trách nhiệm</th><th>Trách nhiệm chi tiết</th></tr>
            </thead>
            <tbody>
              {lo_hong.map((d) => (
                <tr key={d.id}>
                  <td>{d.ten}</td>
                  <td className="khong-ngat">{d.ten_vi_tri ?? '—'}</td>
                  <td className="khong-ngat">{d.ten_nhom ?? '—'}</td>
                  <td>{d.ten_tn ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {nhom.map((n) => {
        const ds = theo_tn.filter((t) => t.nhom_id === n.id);
        if (ds.length === 0) return null;
        return (
          <div className="the" key={n.id}>
            <h3>{n.ma}. {n.ten} <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>{n.so_task} task</span></h3>
            <table>
              <thead>
                <tr>
                  <th>Trách nhiệm chi tiết</th>
                  <th>Người quản trị</th>
                  <th>Task</th>
                  <th>Có người thực hiện</th>
                  <th>Đang sinh việc</th>
                </tr>
              </thead>
              <tbody>
                {ds.map((t) => (
                  <tr key={t.id}>
                    <td>{t.ten}</td>
                    <td className="khong-ngat">{t.ten_nguoi_quan_tri ?? '—'}</td>
                    <td className="so">{t.so_task}</td>
                    <td>
                      {t.so_task_co_nguoi >= t.so_task && t.so_task > 0 ? (
                        <span className="nhan nhan-tot">Đủ {t.so_task_co_nguoi}/{t.so_task}</span>
                      ) : (
                        <span className="nhan nhan-xau">Thiếu {t.so_task - t.so_task_co_nguoi}</span>
                      )}
                    </td>
                    <td>
                      {t.so_task_dang_chay > 0
                        ? <span className="nhan nhan-tot">{t.so_task_dang_chay} chạy</span>
                        : <span className="nhan nhan-mo">Chưa</span>}
                      {t.so_task_tat > 0 && <span className="nhan nhan-canh-bao" style={{ marginLeft: 4 }}>{t.so_task_tat} tắt</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ================================================================ VI TRI & JD
function ManViTri(): ReactNode {
  const la_ns = la_nhan_su();
  const ds = dung_nap<DongViTri[]>('/api/to-chuc/vi-tri', []);
  const [chon, dat_chon] = useState<string>('');
  const [mo_tao_vt, dat_mo_tao_vt] = useState(false);
  const [mo_tao_dv, dat_mo_tao_dv] = useState(false);
  const chi_tiet = dung_nap<{
    id: string; ma: string; ten: string; cap_bac: string; pham_vi: string;
    ten_phong_ban: string | null; mo_ta: string | null; dang_hoat_dong: boolean;
    dau_viec: DongDauViec[];
    nguoi_giu: { nhan_vien_id: string; ho_ten: string; ma_nv: string; ten_phong_ban: string | null }[];
    mau_dinh_ky: { id: string; ho_ten: string; quy_tac: string; dang_bat: boolean }[];
  }>(chon === '' ? null : `/api/to-chuc/vi-tri/${chon}`, [chon]);

  if (ds.dang_tai) return <DangTai />;
  if (ds.loi !== null) return <HopLoi loi={ds.loi} />;
  const ds_vt = (ds.du_lieu ?? []).filter((v) => v.dang_hoat_dong || v.id === chon);

  return (
    <div className="cv-trang">
      <div className="the">
        <div className="o-nhap-ngang">
          <label>Vị trí:</label>
          <select value={chon} onChange={(e) => dat_chon(e.target.value)}>
            <option value="">— chọn vị trí —</option>
            {ds_vt.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten} · {NHAN_CAP_BAC[v.cap_bac]} · {v.ten_phong_ban ?? 'Toàn công ty'} ({v.so_dau_viec} task, {v.so_nguoi_gui} người)
              </option>
            ))}
          </select>
          {la_ns && <button className="nut-chinh" onClick={() => dat_mo_tao_vt(true)}>Thêm vị trí mới</button>}
        </div>
      </div>

      {chon !== '' && chi_tiet.dang_tai && <DangTai />}
      {chon !== '' && chi_tiet.loi !== null && <HopLoi loi={chi_tiet.loi} />}
      {chon !== '' && chi_tiet.du_lieu !== null && (
        <div className="cv-trang">
          <div className="the">
            <h3>{chi_tiet.du_lieu.ten} <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>{NHAN_CAP_BAC[chi_tiet.du_lieu.cap_bac]}</span></h3>
            {chi_tiet.du_lieu.mo_ta !== null && <p className="mo-ta">{chi_tiet.du_lieu.mo_ta}</p>}
            <p className="mo-ta">
              {chi_tiet.du_lieu.nguoi_giu.length === 0
                ? 'Chưa có người giữ vị trí này.'
                : `Người giữ: ${chi_tiet.du_lieu.nguoi_giu.map((n) => n.ho_ten).join(', ')}`}
            </p>
          </div>
          {chi_tiet.du_lieu.dau_viec.map((dv) => (
            <TheDauViec key={dv.id} dv={dv} la_ns={la_ns} nap_lai={chi_tiet.nap_lai} />
          ))}
          {la_ns && (
            <div className="the">
              <button className="nut-chinh" onClick={() => dat_mo_tao_dv(true)}>
                Thêm đầu việc cho vị trí này
              </button>
              <span className="cv-tab-phu" style={{ marginLeft: 10 }}>
                Bám vào trách nhiệm chi tiết có sẵn, hoặc sao chép từ đầu việc đã có (kèm RACI + checklist).
              </span>
            </div>
          )}
        </div>
      )}

      {mo_tao_vt && <HopTaoViTri dong={() => { dat_mo_tao_vt(false); ds.nap_lai(); }} />}
      {mo_tao_dv && chon !== '' && (
        <HopTaoDauViec
          vi_tri_id={chon}
          dong={() => { dat_mo_tao_dv(false); chi_tiet.nap_lai(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the dau viec
function TheDauViec({ dv, la_ns, nap_lai }: {
  dv: DongDauViec; la_ns: boolean; nap_lai: () => void;
}): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [loi, dat_loi] = useState<string | null>(null);
  const [raci, dat_raci] = useState<DongRaci[]>(dv.raci);

  const doi_bat = async (dang_bat: boolean): Promise<void> => {
    try {
      await goi(`/api/to-chuc/dau-viec/${dv.id}/bat-tat`, { method: 'POST', body: { dang_bat } });
      nap_lai();
    } catch (e) { dat_loi((e as Error).message); }
  };

  const luu_raci = async (): Promise<void> => {
    try {
      await goi(`/api/to-chuc/dau-viec/${dv.id}/raci`, { method: 'PUT', body: { raci } });
      dat_loi(null);
      nap_lai();
    } catch (e) { dat_loi((e as Error).message); }
  };

  const doi_raci = (vai_tro: DongRaci['vai_tro'], kieu_nguoi: string, co: boolean): void => {
    const con_lai = raci.filter((r) => !(r.vai_tro === vai_tro && r.kieu_nguoi === kieu_nguoi));
    dat_raci(co ? [...con_lai, { vai_tro, kieu_nguoi }] : con_lai);
  };

  return (
    <div className="the">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <strong>{dv.ten}</strong>{' '}
          <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>{NHAN_TAN_SUAT[dv.tan_suat] ?? dv.tan_suat}</span>
          {dv.co_bc && dv.ma_bc !== null && (
            <span className="nhan nhan-lanh" style={{ marginLeft: 6 }}>{dv.ma_bc}</span>
          )}
          {dv.trang_thai_ma_bc === 'de_xuat' && <span className="nhan nhan-canh-bao" style={{ marginLeft: 6 }}>mã BC đề xuất</span>}
          {!dv.dang_bat && <span className="nhan nhan-xau" style={{ marginLeft: 6 }}>đã tắt sinh việc</span>}
        </div>
        <div>
          {la_ns && (
            <button className="nut-nho" onClick={() => dat_mo(!mo)}>{mo ? 'Thu gọn' : 'Chi tiết / sửa'}</button>
          )}
          {la_ns && (
            <button className="nut-nho" style={{ marginLeft: 6 }} onClick={() => void doi_bat(!dv.dang_bat)}>
              {dv.dang_bat ? 'Tắt sinh việc' : 'Bật sinh việc'}
            </button>
          )}
        </div>
      </div>
      {mo && (
        <div className="cv-trang" style={{ marginTop: 10 }}>
          <table className="bang-gon">
            <tbody>
              <tr><td>Nhóm trách nhiệm</td><td>{dv.ten_nhom ?? '—'} → {dv.ten_tn ?? '(chưa gán)'}</td></tr>
              <tr><td>Tần suất gốc</td><td>{dv.tan_suat_tho ?? '—'} · SLA: {dv.sla ?? '—'} · Mức độ: {NHAN_MUC_DO[dv.muc_do_quan_trong]}</td></tr>
              <tr><td>Đầu vào</td><td>{dv.input ?? '—'}</td></tr>
              <tr><td>Đầu ra</td><td>{dv.output ?? '—'}</td></tr>
              <tr><td>KPI đo lường</td><td>{dv.kpi ?? '—'}</td></tr>
              {dv.phan_cap_xu_ly !== null && <tr><td>Ngưỡng phân cấp</td><td>{dv.phan_cap_xu_ly}</td></tr>}
              {dv.buoc.length > 0 && (
                <tr>
                  <td>Step</td>
                  <td>
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                      {dv.buoc.map((b) => <li key={b.id}>{b.ten}</li>)}
                    </ol>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {la_ns && (
            <div>
              <h4>RACI (bạn tự điền — ai thực hiện, ai duyệt, ai tham vấn, ai nhận thông báo)</h4>
              <table className="bang-gon">
                <tbody>
                  {(Object.keys(NHAN_RA_CI) as string[]).map((kieu) => (
                    <tr key={kieu}>
                      <td>{NHAN_RA_CI[kieu]}</td>
                      <td>
                        {(['R', 'A', 'C', 'I'] as const).map((vt) => (
                          <label key={vt} style={{ marginRight: 12, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={raci.some((r) => r.vai_tro === vt && r.kieu_nguoi === kieu)}
                              onChange={(e) => doi_raci(vt, kieu, e.target.checked)}
                            />
                            {vt}
                          </label>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="nut-chinh" onClick={() => void luu_raci()}>Lưu RACI</button>
              {loi !== null && <p className="mo-ta" style={{ color: 'var(--xau)', marginTop: 6 }}>{loi}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- hop tao dau viec
// Hai che do: nhap moi (bam vao TN chi tiet co san) hoac SAO CHEP tu dau viec da co.
function HopTaoDauViec({ vi_tri_id, dong }: { vi_tri_id: string; dong: () => void }): ReactNode {
  const [che_do, dat_che_do] = useState<'moi' | 'chep'>('moi');
  const dm = dung_nap<{ nhom: DongNhom[]; tn: DongTn[] }>('/api/to-chuc/nhom', []);
  const [ten, dat_ten] = useState('');
  const [tn_id, dat_tn] = useState('');
  const [tan_suat, dat_ts] = useState('hang_ngay');
  const [ma_bc, dat_ma_bc] = useState('');
  const [kpi, dat_kpi] = useState('');
  const [sla, dat_sla] = useState('');
  const [mo_ta, dat_mo_ta] = useState('');
  const [muc_do, dat_md] = useState<'cao' | 'rat_cao' | 'trung_binh'>('cao');
  const [nguon_chep, dat_nguon_chep] = useState('');
  const [loi, dat_loi] = useState<string | null>(null);
  const ds_dv = dung_nap<DongDauViec[]>(che_do === 'chep' ? '/api/to-chuc/vi-tri/' + vi_tri_id : null, [che_do]);

  const tn_theo_nhom = (dm.du_lieu?.tn ?? []);

  const tao = async (): Promise<void> => {
    try {
      if (che_do === 'moi') {
        const tn = tn_theo_nhom.find((t) => t.id === tn_id);
        await goi('/api/to-chuc/dau-viec', {
          method: 'POST',
          body: {
            vi_tri_id, ten, mo_ta: mo_ta === '' ? null : mo_ta,
            nhom_id: tn?.nhom_id ?? '', tn_chi_tiet_id: tn_id === '' ? null : tn_id,
            phong_ban_id: null, input: null, output: null,
            kpi: kpi === '' ? null : kpi,
            co_bc: ma_bc !== '', ma_bc: ma_bc === '' ? null : ma_bc,
            trang_thai_ma_bc: ma_bc === '' ? null : 'de_xuat',
            tan_suat, tan_suat_tho: null,
            sla: sla === '' ? null : sla, phan_cap_xu_ly: null, muc_do_quan_trong: muc_do,
            ghi_chu: null, raci: [], buoc: [],
          },
        });
      } else {
        await goi(`/api/to-chuc/dau-viec/${nguon_chep}/sao-chep`, {
          method: 'POST',
          body: { vi_tri_id, tn_chi_tiet_id: tn_id === '' ? null : tn_id, ten: ten === '' ? null : ten },
        });
      }
      dong();
    } catch (e) { dat_loi((e as Error).message); }
  };

  return (
    <HopThoai tieu_de="Thêm đầu việc" khi_dong={dong}>
      <div className="o-nhap-ngang">
        <label>
          <input type="radio" checked={che_do === 'moi'} onChange={() => dat_che_do('moi')} /> Nhập mới
        </label>
        <label>
          <input type="radio" checked={che_do === 'chep'} onChange={() => dat_che_do('chep')} /> Sao chép từ đầu việc đã có
        </label>
      </div>
      {che_do === 'chep' && (
        <label className="o-nhap">
          <span>Đầu việc mẫu (của vị trí đang xem — để đổi vị trí mẫu thì chọn vị trí khác trước)</span>
          <select value={nguon_chep} onChange={(e) => dat_nguon_chep(e.target.value)}>
            <option value="">— chọn đầu việc mẫu —</option>
            {(ds_dv.du_lieu ?? []).map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
          </select>
        </label>
      )}
      <label className="o-nhap">
        <span>Tên đầu việc {che_do === 'chep' && '(để trống = tên mẫu + "sao chép")'}</span>
        <input value={ten} onChange={(e) => dat_ten(e.target.value)} />
      </label>
      <label className="o-nhap">
        <span>Trách nhiệm chi tiết (bám vào khối có sẵn)</span>
        <select value={tn_id} onChange={(e) => dat_tn(e.target.value)}>
          <option value="">— chưa gán —</option>
          {(dm.du_lieu?.nhom ?? []).map((n) => (
            <optgroup key={n.id} label={n.ten}>
              {tn_theo_nhom.filter((t) => t.nhom_id === n.id).map((t) => (
                <option key={t.id} value={t.id}>{t.ten}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {che_do === 'moi' && (
        <>
          <label className="o-nhap">
            <span>Tần suất (để sinh việc tự động)</span>
            <select value={tan_suat} onChange={(e) => dat_ts(e.target.value)}>
              {Object.entries(NHAN_TAN_SUAT).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select>
          </label>
          <label className="o-nhap">
            <span>Mã báo cáo (để trống nếu không có)</span>
            <input value={ma_bc} onChange={(e) => dat_ma_bc(e.target.value)} placeholder="VD: CPTP-QUY-CSGKM" />
          </label>
          <label className="o-nhap">
            <span>KPI đo lường</span>
            <input value={kpi} onChange={(e) => dat_kpi(e.target.value)} />
          </label>
          <label className="o-nhap">
            <span>SLA hoàn thành</span>
            <input value={sla} onChange={(e) => dat_sla(e.target.value)} />
          </label>
          <label className="o-nhap">
            <span>Mức độ quan trọng</span>
            <select value={muc_do} onChange={(e) => dat_md(e.target.value as 'cao' | 'rat_cao' | 'trung_binh')}>
              <option value="cao">Cao</option>
              <option value="rat_cao">Rất cao</option>
              <option value="trung_binh">Trung bình</option>
            </select>
          </label>
          <label className="o-nhap">
            <span>Mô tả</span>
            <textarea value={mo_ta} onChange={(e) => dat_mo_ta(e.target.value)} rows={2} />
          </label>
        </>
      )}
      {loi !== null && <p className="mo-ta" style={{ color: 'var(--xau)' }}>{loi}</p>}
      <button className="nut-chinh" onClick={() => void tao()} disabled={che_do === 'moi' ? ten.trim() === '' : nguon_chep === ''}>
        {che_do === 'moi' ? 'Tạo đầu việc' : 'Sao chép'}
      </button>
    </HopThoai>
  );
}

// ---------------------------------------------------------------- hop tao vi tri
function HopTaoViTri({ dong }: { dong: () => void }): ReactNode {
  const [ten, dat_ten] = useState('');
  const [ma, dat_ma] = useState('');
  const [cap_bac, dat_cb] = useState('nhan_vien');
  const [pham_vi, dat_pv] = useState('cu_the');
  const [loi, dat_loi] = useState<string | null>(null);
  const phong = dung_nap<{ id: string; ten: string }[]>('/api/phong-ban', []);
  const [phong_id, dat_phong] = useState('');

  const tao = async (): Promise<void> => {
    try {
      await goi('/api/to-chuc/vi-tri', {
        method: 'POST',
        body: {
          ten, ma: ma.trim() === '' ? ten.replace(/\s+/g, '-').toUpperCase() : ma,
          cap_bac, pham_vi, phong_ban_id: phong_id === '' ? null : phong_id, mo_ta: null,
        },
      });
      dong();
    } catch (e) { dat_loi((e as Error).message); }
  };

  return (
    <HopThoai tieu_de="Thêm vị trí mới" khi_dong={dong}>
      <label className="o-nhap">
        <span>Tên vị trí</span>
        <input value={ten} onChange={(e) => dat_ten(e.target.value)} placeholder="VD: Chuyên viên Vận hành" />
      </label>
      <label className="o-nhap">
        <span>Mã (ngắn, duy nhất — để trống sẽ tự sinh)</span>
        <input value={ma} onChange={(e) => dat_ma(e.target.value)} />
      </label>
      <label className="o-nhap">
        <span>Cấp bậc</span>
        <select value={cap_bac} onChange={(e) => dat_cb(e.target.value)}>
          {Object.entries(NHAN_CAP_BAC).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
      </label>
      <label className="o-nhap">
        <span>Phạm vi áp dụng</span>
        <select value={pham_vi} onChange={(e) => dat_pv(e.target.value)}>
          <option value="cu_the">Một phòng cụ thể</option>
          <option value="moi_phong">Mỗi phòng</option>
          <option value="toan_cong_ty">Toàn công ty</option>
        </select>
      </label>
      {pham_vi === 'cu_the' && (
        <label className="o-nhap">
          <span>Phòng ban</span>
          <select value={phong_id} onChange={(e) => dat_phong(e.target.value)}>
            <option value="">— chọn phòng —</option>
            {(phong.du_lieu ?? []).map((p) => <option key={p.id} value={p.id}>{p.ten}</option>)}
          </select>
        </label>
      )}
      {loi !== null && <p className="mo-ta" style={{ color: 'var(--xau)' }}>{loi}</p>}
      <button className="nut-chinh" onClick={() => void tao()} disabled={ten.trim() === ''}>
        Tạo vị trí
      </button>
    </HopThoai>
  );
}

// ================================================================ NHAN VIEN
function ManNhanVien(): ReactNode {
  const la_ns = la_nhan_su();
  const ds_nv = dung_nap<NhanVienGon[]>(la_ns ? '/api/nhan-vien' : null, []);
  const ds_vt = dung_nap<DongViTri[]>(la_ns ? '/api/to-chuc/vi-tri' : null, []);
  const [chon, dat_chon] = useState('');
  const [vi_tri_them, dat_vt_them] = useState('');
  const [loi, dat_loi] = useState<string | null>(null);

  const vi_tri = dung_nap<{ vi_tri_id: string; ten: string; cap_bac: string; la_chinh: boolean }[]>(
    la_ns && chon !== '' ? `/api/to-chuc/nhan-vien/${chon}/vi-tri` : null, [chon],
  );

  if (!la_ns) {
    return <Trong tieu_de="Chỉ nhân sự mới xem và gán vị trí. Nhân viên xem trách nhiệm của mình ở trang Công việc → tab Trách nhiệm của tôi." />;
  }

  const gan = async (): Promise<void> => {
    if (chon === '' || vi_tri_them === '') return;
    try {
      await goi(`/api/to-chuc/nhan-vien/${chon}/vi-tri`, {
        method: 'POST', body: { vi_tri_id: vi_tri_them, la_chinh: (vi_tri.du_lieu ?? []).length === 0 },
      });
      dat_loi(null);
      vi_tri.nap_lai();
    } catch (e) { dat_loi((e as Error).message); }
  };

  const bo = async (vi_tri_id: string): Promise<void> => {
    try {
      await goi(`/api/to-chuc/nhan-vien/${chon}/vi-tri/${vi_tri_id}`, { method: 'DELETE' });
      vi_tri.nap_lai();
    } catch (e) { dat_loi((e as Error).message); }
  };

  const dat_chinh = async (vi_tri_id: string): Promise<void> => {
    try {
      await goi(`/api/to-chuc/nhan-vien/${chon}/vi-tri`, {
        method: 'POST', body: { vi_tri_id, la_chinh: true },
      });
      vi_tri.nap_lai();
    } catch (e) { dat_loi((e as Error).message); }
  };

  if (ds_nv.dang_tai) return <DangTai />;
  return (
    <div className="cv-trang">
      <div className="the">
        <div className="o-nhap-ngang">
          <label>Nhân viên:</label>
          <select value={chon} onChange={(e) => dat_chon(e.target.value)}>
            <option value="">— chọn nhân viên —</option>
            {(ds_nv.du_lieu ?? []).filter((n) => n.dang_hoat_dong).map((n) => (
              <option key={n.id} value={n.id}>{n.ma_nv} · {n.ho_ten} · {n.phong_ban ?? '—'}</option>
            ))}
          </select>
        </div>
      </div>
      {chon !== '' && (
        <div className="cv-trang">
          <div className="the">
            <h3>Vị trí đang giữ (kiêm nhiệm)</h3>
            <table>
              <thead>
                <tr><th>Vị trí</th><th>Cấp bậc</th><th>Chính</th><th></th></tr>
              </thead>
              <tbody>
                {(vi_tri.du_lieu ?? []).map((v) => (
                  <tr key={v.vi_tri_id}>
                    <td>{v.ten}</td>
                    <td className="khong-ngat">{NHAN_CAP_BAC[v.cap_bac]}</td>
                    <td>
                      {v.la_chinh
                        ? <span className="nhan nhan-tot">Chính</span>
                        : <button className="nut-nho" onClick={() => void dat_chinh(v.vi_tri_id)}>Đặt làm chính</button>}
                    </td>
                    <td><button className="nut-nho nut-nguy" onClick={() => void bo(v.vi_tri_id)}>Gỡ</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="o-nhap-ngang" style={{ marginTop: 10 }}>
              <label>Gán thêm vị trí:</label>
              <select value={vi_tri_them} onChange={(e) => dat_vt_them(e.target.value)}>
                <option value="">— chọn vị trí —</option>
                {(ds_vt.du_lieu ?? []).filter((v) => v.dang_hoat_dong).map((v) => (
                  <option key={v.id} value={v.id}>{v.ten} · {v.ten_phong_ban ?? 'Toàn công ty'}</option>
                ))}
              </select>
              <button className="nut-chinh" onClick={() => void gan()} disabled={vi_tri_them === ''}>Gán</button>
            </div>
            {loi !== null && <p className="mo-ta" style={{ color: 'var(--xau)' }}>{loi}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================ DO LUONG
function ManDoLuong(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<DongDoLuong[]>('/api/to-chuc/do-luong', []);
  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];
  return (
    <div className="the">
      <h3>Nhân sự có làm tròn trách nhiệm không (kỳ hiện tại)</h3>
      <table>
        <thead>
          <tr>
            <th>Nhân viên</th><th>Phòng</th><th>Số vị trí</th><th>Đầu việc JD</th>
            <th>Việc trong kỳ</th><th>Xong</th><th>Chờ duyệt</th><th>Quá hạn</th>
          </tr>
        </thead>
        <tbody>
          {ds.map((d) => (
            <tr key={d.nhan_vien_id}>
              <td className="khong-ngat">{d.ho_ten ?? '—'}</td>
              <td className="khong-ngat">{d.ten_phong_ban ?? '—'}</td>
              <td className="so">{d.so_vi_tri}</td>
              <td className="so">{d.so_dau_viec}</td>
              <td className="so">{d.so_viec}</td>
              <td><span className="nhan nhan-tot">{d.so_xong}</span></td>
              <td><span className="nhan nhan-canh-bao">{d.so_cho_duyet}</span></td>
              <td><span className="nhan nhan-xau">{d.so_qua_han}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {ds.length === 0 && <Trong tieu_de="Chưa nhân viên nào được gán vị trí. Vào tab Nhân viên để gán." />}
    </div>
  );
}

// ================================================================ MA BAO CAO
function ManMaBc(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<{ id: string; ma: string; ten: string | null; trang_thai: string; so_dau_viec: number; so_da_nop: number; nop_gan_nhat: string | null }[]>(
    '/api/to-chuc/ma-bc', [],
  );
  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];
  return (
    <div className="the">
      <h3>Danh mục mã báo cáo ({ds.length})</h3>
      <p className="mo-ta">Sinh tự động từ các đầu việc có báo cáo trong JD — đối chiếu nộp báo cáo theo mã trong 30 ngày gần nhất.</p>
      <table>
        <thead>
          <tr><th>Mã BC</th><th>Trạng thái</th><th>Số đầu việc</th><th>Đã nộp (30 ngày)</th><th>Nộp gần nhất</th></tr>
        </thead>
        <tbody>
          {ds.map((d) => (
            <tr key={d.id}>
              <td className="khong-ngat">{d.ma}</td>
              <td>{d.trang_thai === 'chuan' ? <span className="nhan nhan-tot">Chuẩn</span> : <span className="nhan nhan-canh-bao">Đề xuất</span>}</td>
              <td className="so">{d.so_dau_viec}</td>
              <td className="so">
                {d.so_da_nop > 0
                  ? <span className="nhan nhan-tot">{d.so_da_nop}</span>
                  : <span className="nhan nhan-mo">0</span>}
              </td>
              <td className="khong-ngat so">{d.nop_gan_nhat ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
