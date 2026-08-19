// KPI: danh muc chi so va ket qua tung ky.
//
// Nguyen tac cua trang nay: nguoi bi cham diem phai KIEM TRA duoc con diem cua minh. Vi
// vay bang chi tiet hien ca GIA TRI THO lan cach quy ra diem, khong chi hien mot con so.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

type Tab = 'ky' | 'danh_muc';

interface ChiSo {
  id: string;
  ma: string;
  ten: string;
  mo_ta: string | null;
  nhom: string;
  nguon: string;
  chi_so: string | null;
  chieu: 'cao_tot' | 'thap_tot';
  don_vi: string | null;
  muc_toi_thieu: string;
  muc_muc_tieu: string;
  diem_toi_da: string;
  trong_so: string;
  dang_bat: boolean;
  ten_phong_ban: string | null;
}

interface Ky {
  id: string;
  thang: string;
  trang_thai: 'nhap' | 'da_chot';
  so_nguoi: number;
  diem_tb: string | null;
  tinh_luc: string | null;
  chot_luc: string | null;
}

interface DongTongHop {
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  tong_diem: string;
  xep_loai: string | null;
}

interface KetQua {
  id: string;
  ma: string;
  ten: string;
  don_vi: string | null;
  chieu: 'cao_tot' | 'thap_tot';
  gia_tri: string | null;
  diem: string;
  diem_sua_tay: string | null;
  ly_do_sua: string | null;
  muc_toi_thieu: string;
  muc_muc_tieu: string;
  diem_toi_da: string;
  trong_so: string;
}

const NHAN_NGUON: Record<string, string> = {
  cham_cong: 'Chấm công',
  vi_pham: 'Vi phạm',
  cong_viec: 'Công việc',
  bao_cao: 'Báo cáo',
  nhap_tay: 'Nhập tay',
};

function so(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mau_diem(diem: number): string {
  if (diem >= 75) return 'nhan-tot';
  if (diem >= 60) return 'nhan-canh-bao';
  return 'nhan-xau';
}

export function TrangKpi(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('ky');
  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Chấm điểm tự động từ chấm công, vi phạm, công việc và báo cáo.
            Điểm KPI <strong>không tự nhân vào lương</strong>.
          </p>
        </div>
      </div>

      <div className="thanh-tab">
        <button className={tab === 'ky' ? 'dang-chon' : ''}
          onClick={() => dat_tab('ky')}>Kỳ đánh giá</button>
        <button className={tab === 'danh_muc' ? 'dang-chon' : ''}
          onClick={() => dat_tab('danh_muc')}>Danh mục chỉ số</button>
      </div>

      {tab === 'ky' ? <TabKy /> : <TabDanhMuc />}
    </>
  );
}

// ================================================================ ky danh gia
function TabKy(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<Ky[]>('/api/ky-kpi');
  const [mo, dat_mo] = useState<string | null>(null);
  const [tao, dat_tao] = useState(false);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  return (
    <>
      <div className="hang-nut">
        <button onClick={() => dat_tao(true)}>Tạo kỳ đánh giá</button>
      </div>

      {ds.length === 0 ? (
        <Trong tieu_de="Chưa có kỳ đánh giá nào"
          hanh_dong={<button onClick={() => dat_tao(true)}>Tạo kỳ đầu tiên</button>} />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tháng</th><th>Trạng thái</th>
              <th className="canh-phai">Số người</th><th className="canh-phai">Điểm TB</th>
              <th>Tính lúc</th><th />
            </tr>
          </thead>
          <tbody>
            {ds.map((k) => (
              <tr key={k.id}>
                <td><strong>{k.thang}</strong></td>
                <td>
                  <span className={k.trang_thai === 'da_chot' ? 'nhan-tot' : 'nhan-mo'}>
                    {k.trang_thai === 'da_chot' ? 'Đã chốt' : 'Nháp'}
                  </span>
                </td>
                <td className="canh-phai">{k.so_nguoi}</td>
                <td className="canh-phai">{k.diem_tb === null ? '—' : so(k.diem_tb)}</td>
                <td>{k.tinh_luc === null ? '—' : ngay_gio(k.tinh_luc)}</td>
                <td className="canh-phai">
                  <button className="nut-phang" onClick={() => dat_mo(k.id)}>Xem</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tao && <HopThoaiTaoKy khi_dong={() => dat_tao(false)}
        khi_xong={() => { dat_tao(false); nap_lai(); }} />}
      {mo !== null && <HopThoaiKy ky_id={mo} khi_dong={() => dat_mo(null)} khi_doi={nap_lai} />}
    </>
  );
}

function HopThoaiTaoKy(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const d = new Date();
  const [thang, dat_thang] = useState(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
  );
  const hd = dung_hanh_dong();
  return (
    <HopThoai tieu_de="Tạo kỳ đánh giá KPI" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <label htmlFor="th">Tháng</label>
      <input id="th" type="month" value={thang} onChange={(e) => dat_thang(e.target.value)} />
      <p className="mo-ta">Tạo xong bấm <strong>Tính điểm</strong> để chấm từ dữ liệu thật.</p>
      <div className="hang-nut">
        <button disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => goi('/api/ky-kpi', { method: 'POST', body: { thang } }), 'Đã tạo kỳ.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}>Tạo</button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

function HopThoaiKy(
  { ky_id, khi_dong, khi_doi }: { ky_id: string; khi_dong: () => void; khi_doi: () => void },
): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } =
    dung_nap<Ky & { ds: DongTongHop[] }>(`/api/ky-kpi/${ky_id}`);
  const [chi_tiet, dat_chi_tiet] = useState<DongTongHop | null>(null);
  const hd = dung_hanh_dong();

  if (dang_tai) return <HopThoai tieu_de="Kỳ KPI" khi_dong={khi_dong}><DangTai /></HopThoai>;
  if (loi !== null || du_lieu === null) {
    return <HopThoai tieu_de="Kỳ KPI" khi_dong={khi_dong}><HopLoi loi={loi} /></HopThoai>;
  }
  const k = du_lieu;
  const chot = k.trang_thai === 'da_chot';

  const chay = (duong: string, tb: string, body?: unknown) => () => {
    void hd.chay(
      () => goi(duong, { method: 'POST', ...(body === undefined ? {} : { body }) }), tb,
    ).then(() => { nap_lai(); khi_doi(); });
  };

  return (
    <HopThoai tieu_de={`KPI tháng ${k.thang}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="hang-nut">
        <span className={chot ? 'nhan-tot' : 'nhan-mo'}>{chot ? 'Đã chốt' : 'Nháp'}</span>
        {!chot && (
          <button disabled={hd.dang_chay}
            onClick={chay(`/api/ky-kpi/${k.id}/tinh`, 'Đã tính lại điểm.')}>Tính điểm</button>
        )}
        {!chot && k.ds.length > 0 && (
          <button disabled={hd.dang_chay}
            onClick={chay(`/api/ky-kpi/${k.id}/chot`, 'Đã chốt kỳ. Nhân viên xem được điểm.')}>
            Chốt kỳ
          </button>
        )}
        {chot && (
          <button className="nut-phang" disabled={hd.dang_chay}
            onClick={chay(`/api/ky-kpi/${k.id}/chot`, 'Đã mở chốt.', { mo: true })}>
            Mở chốt
          </button>
        )}
      </div>

      {!chot && (
        <p className="mo-ta">
          Nhân viên <strong>chưa xem được</strong> khi kỳ còn ở trạng thái nháp — điểm đang
          tính có thể còn đổi.
        </p>
      )}

      {k.ds.length === 0 ? (
        <Trong tieu_de="Chưa có kết quả" mo_ta="Bấm Tính điểm để chấm từ dữ liệu thật." />
      ) : (
        <div className="vo-bang">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Nhân viên</th><th>Phòng ban</th>
                <th className="canh-phai">Tổng điểm</th><th>Xếp loại</th><th />
              </tr>
            </thead>
            <tbody>
              {k.ds.map((d, i) => (
                <tr key={d.nhan_vien_id}>
                  <td>{i + 1}</td>
                  <td>{d.ma_nv} — {d.ho_ten}</td>
                  <td>{d.phong_ban ?? '—'}</td>
                  <td className="canh-phai">
                    <span className={mau_diem(so(d.tong_diem))}>{so(d.tong_diem)}</span>
                  </td>
                  <td>{d.xep_loai ?? '—'}</td>
                  <td className="canh-phai">
                    <button className="nut-phang" onClick={() => dat_chi_tiet(d)}>Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chi_tiet !== null && (
        <HopThoaiChiTiet ky_id={k.id} nguoi={chi_tiet} khoa={chot}
          khi_dong={() => dat_chi_tiet(null)}
          khi_xong={() => { dat_chi_tiet(null); nap_lai(); khi_doi(); }} />
      )}
    </HopThoai>
  );
}

/**
 * Chi tiet tung chi so cua mot nguoi.
 *
 * Hien CA gia tri tho lan cach quy ra diem. Nguoi bi cham phai doi chieu duoc voi du lieu
 * goc cua minh, chu khong chi thay mot con diem tu tren troi roi xuong.
 */
function HopThoaiChiTiet(
  { ky_id, nguoi, khoa, khi_dong, khi_xong }: {
    ky_id: string; nguoi: DongTongHop; khoa: boolean;
    khi_dong: () => void; khi_xong: () => void;
  },
): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } =
    dung_nap<KetQua[]>(`/api/ky-kpi/${ky_id}/nhan-vien/${nguoi.nhan_vien_id}`);
  const [sua, dat_sua] = useState<KetQua | null>(null);

  if (dang_tai) return <HopThoai tieu_de={nguoi.ho_ten} khi_dong={khi_dong}><DangTai /></HopThoai>;
  if (loi !== null) {
    return <HopThoai tieu_de={nguoi.ho_ten} khi_dong={khi_dong}><HopLoi loi={loi} /></HopThoai>;
  }
  const ds = du_lieu ?? [];

  return (
    <HopThoai tieu_de={`KPI — ${nguoi.ho_ten}`} khi_dong={khi_dong} rong>
      <p className="mo-ta">
        Tổng {so(nguoi.tong_diem)} điểm{nguoi.xep_loai !== null && ` — ${nguoi.xep_loai}`}.
        Tổng là trung bình có trọng số của các chỉ số chấm được.
      </p>
      <div className="vo-bang">
        <table>
          <thead>
            <tr>
              <th>Chỉ số</th>
              <th className="canh-phai">Giá trị thực</th>
              <th>Thang chấm</th>
              <th className="canh-phai">Điểm</th>
              <th className="canh-phai">Trọng số</th>
              {!khoa && <th />}
            </tr>
          </thead>
          <tbody>
            {ds.map((r) => (
              <tr key={r.id}>
                <td>{r.ten}</td>
                <td className="canh-phai">
                  {r.gia_tri === null ? '—' : `${so(r.gia_tri)}${r.don_vi ?? ''}`}
                </td>
                <td className="mo-ta">
                  {so(r.muc_toi_thieu)}{r.don_vi ?? ''} = 0đ →{' '}
                  {so(r.muc_muc_tieu)}{r.don_vi ?? ''} = {so(r.diem_toi_da)}đ
                </td>
                <td className="canh-phai">
                  <strong>{so(r.diem)}</strong>
                  {r.diem_sua_tay !== null && <div className="mo-ta">sửa tay</div>}
                </td>
                <td className="canh-phai">{so(r.trong_so)}</td>
                {!khoa && (
                  <td className="canh-phai">
                    <button className="nut-phang" onClick={() => dat_sua(r)}>Sửa</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ds.some((r) => r.ly_do_sua !== null) && (
        <>
          <h3>Điểm đã sửa tay</h3>
          {ds.filter((r) => r.ly_do_sua !== null).map((r) => (
            <p key={r.id} className="mo-ta">
              <strong>{r.ten}:</strong> {so(r.diem_sua_tay)} điểm — {r.ly_do_sua}
            </p>
          ))}
        </>
      )}

      {sua !== null && (
        <HopThoaiSuaDiem kq={sua} khi_dong={() => dat_sua(null)}
          khi_xong={() => { dat_sua(null); nap_lai(); khi_xong(); }} />
      )}
    </HopThoai>
  );
}

function HopThoaiSuaDiem(
  { kq, khi_dong, khi_xong }: { kq: KetQua; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [diem, dat_diem] = useState(String(so(kq.diem)));
  const [ly_do, dat_ly_do] = useState(kq.ly_do_sua ?? '');
  const hd = dung_hanh_dong();

  return (
    <HopThoai tieu_de={`Sửa điểm — ${kq.ten}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Máy chấm {so(kq.diem)} điểm từ giá trị {kq.gia_tri === null ? '(không có dữ liệu)' : so(kq.gia_tri)}.
        Sửa tay sẽ được giữ lại kể cả khi tính lại kỳ.
      </p>
      <label htmlFor="d">Điểm</label>
      <input id="d" type="number" step="any" min="0" max={so(kq.diem_toi_da)}
        value={diem} onChange={(e) => dat_diem(e.target.value)} />
      <label htmlFor="ld">Lý do sửa</label>
      <input id="ld" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)} />
      <p className="mo-ta">
        Bắt buộc nêu lý do — người bị chấm điểm có quyền biết vì sao điểm bị đổi.
      </p>
      <div className="hang-nut">
        <button disabled={hd.dang_chay || ly_do.trim() === ''}
          onClick={() => void hd.chay(
            () => goi(`/api/ket-qua-kpi/${kq.id}`, {
              method: 'PATCH',
              body: { diem_sua_tay: Number(diem), ly_do_sua: ly_do },
            }),
            'Đã lưu và tính lại tổng điểm.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}>Lưu</button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

// ================================================================ danh muc chi so
function TabDanhMuc(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<ChiSo[]>('/api/danh-muc-kpi');
  const hd = dung_hanh_dong();
  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  const bat_tat = (c: ChiSo) => () => {
    void hd.chay(
      () => goi(`/api/danh-muc-kpi/${c.id}`, { method: 'PATCH', body: { dang_bat: !c.dang_bat } }),
    ).then(nap_lai);
  };

  return (
    <>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="hop-luu-y">
        Chỉ số <strong>Công việc</strong> và <strong>Báo cáo</strong> để sẵn nhưng đang tắt —
        chúng chỉ đúng nếu nhân viên thực sự dùng hai mục đó trong hồ sơ. Bật khi chưa dùng
        sẽ chấm 0 oan cho cả công ty.
      </div>
      <div className="vo-bang">
        <table>
          <thead>
            <tr>
              <th>Mã</th><th>Chỉ số</th><th>Nguồn</th><th>Chiều</th>
              <th>Thang chấm</th><th className="canh-phai">Trọng số</th><th />
            </tr>
          </thead>
          <tbody>
            {ds.map((c) => (
              <tr key={c.id} style={c.dang_bat ? undefined : { opacity: 0.55 }}>
                <td><code>{c.ma}</code></td>
                <td>{c.ten}<div className="mo-ta">{c.mo_ta}</div></td>
                <td>{NHAN_NGUON[c.nguon] ?? c.nguon}</td>
                <td>{c.chieu === 'cao_tot' ? 'Càng cao càng tốt' : 'Càng thấp càng tốt'}</td>
                <td className="mo-ta">
                  {so(c.muc_toi_thieu)}{c.don_vi ?? ''} = 0đ →{' '}
                  {so(c.muc_muc_tieu)}{c.don_vi ?? ''} = {so(c.diem_toi_da)}đ
                </td>
                <td className="canh-phai">{so(c.trong_so)}</td>
                <td className="canh-phai">
                  <button className="nut-phang" disabled={hd.dang_chay} onClick={bat_tat(c)}>
                    {c.dang_bat ? 'Tắt' : 'Bật'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
