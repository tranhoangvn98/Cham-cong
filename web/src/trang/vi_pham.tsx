// Vi pham noi quy lao dong: danh muc, quy tac tu phat hien, ban ghi.
//
// Trang nay phai noi ro ba ranh gioi phap ly, khong giau trong ma nguon:
//   - He thong KHONG phat tien, KHONG tru luong (BLLD 2019 Dieu 127).
//   - May phat hien chi la ghi nhan; nguoi lao dong duoc giai trinh (Dieu 122).
//   - Ky luat phai co bien ban cuoc hop (Dieu 122), va chi bon hinh thuc (Dieu 124).
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

type Tab = 'ban_ghi' | 'danh_muc' | 'quy_tac';

interface LoaiViPham {
  id: string;
  ma: string;
  ten: string;
  mo_ta: string | null;
  nhom: string;
  muc_do: 'nhe' | 'trung' | 'nang';
  ky_luat_de_xuat: string | null;
  diem_tru_kpi: string;
  dang_bat: boolean;
  so_quy_tac: number;
}

interface QuyTac {
  id: string;
  loai_vi_pham_id: string;
  ma_loai: string;
  ten_loai: string;
  ten: string;
  chi_so: string;
  toan_tu: string;
  nguong: string;
  dang_bat: boolean;
  ghi_chu: string | null;
}

interface BanGhi {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  ten_loai: string;
  muc_do: 'nhe' | 'trung' | 'nang';
  nguon: 'nguoi' | 'he_thong';
  ngay: string;
  mo_ta: string | null;
  trang_thai: string;
  giai_trinh: string | null;
  ky_luat: string | null;
  ghi_chu: string | null;
}

const NHAN_MUC_DO: Record<string, string> = { nhe: 'Nhẹ', trung: 'Trung bình', nang: 'Nặng' };
const MAU_MUC_DO: Record<string, string> = {
  nhe: 'nhan-mo', trung: 'nhan-canh-bao', nang: 'nhan-xau',
};

const NHAN_TRANG_THAI: Record<string, string> = {
  moi: 'Mới ghi nhận',
  cho_giai_trinh: 'Đã giải trình, chờ xét',
  da_xac_nhan: 'Đã xác nhận',
  bac_bo: 'Đã bãi bỏ',
  da_xu_ly: 'Đã xử lý',
};

const NHAN_KY_LUAT: Record<string, string> = {
  nhac_nho: 'Nhắc nhở',
  khien_trach: 'Khiển trách',
  keo_dai_nang_luong: 'Kéo dài thời hạn nâng lương',
  cach_chuc: 'Cách chức',
  sa_thai: 'Sa thải',
};

const NHAN_CHI_SO: Record<string, string> = {
  so_lan_di_muon: 'Số lần đi muộn',
  tong_phut_muon: 'Tổng phút đi muộn',
  so_lan_ve_som: 'Số lần về sớm',
  tong_phut_ve_som: 'Tổng phút về sớm',
  so_ngay_vang: 'Số ngày vắng',
  so_ngay_thieu_gio: 'Số ngày thiếu giờ',
  so_lan_quen_quet: 'Số lần quên quẹt (đơn giải trình)',
};

function ngay_v(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m === null ? v : `${m[3]}/${m[2]}/${m[1]}`;
}

export function TrangViPham(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('ban_ghi');
  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Ghi nhận vi phạm nội quy lao động. Hệ thống <strong>không phạt tiền và không trừ
            lương</strong> — Bộ luật Lao động 2019 Điều 127 cấm cả hai.
          </p>
        </div>
      </div>

      <div className="thanh-tab">
        <button className={tab === 'ban_ghi' ? 'dang-chon' : ''}
          onClick={() => dat_tab('ban_ghi')}>Bản ghi</button>
        <button className={tab === 'danh_muc' ? 'dang-chon' : ''}
          onClick={() => dat_tab('danh_muc')}>Danh mục lỗi</button>
        <button className={tab === 'quy_tac' ? 'dang-chon' : ''}
          onClick={() => dat_tab('quy_tac')}>Quy tắc tự phát hiện</button>
      </div>

      {tab === 'ban_ghi' && <TabBanGhi />}
      {tab === 'danh_muc' && <TabDanhMuc />}
      {tab === 'quy_tac' && <TabQuyTac />}
    </>
  );
}

// ================================================================ ban ghi
function TabBanGhi(): ReactNode {
  const [loc, dat_loc] = useState('');
  const duong = `/api/vi-pham${loc === '' ? '' : `?trang_thai=${loc}`}`;
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<BanGhi[]>(duong, [loc]);
  const [xem, dat_xem] = useState<BanGhi | null>(null);
  const [quet, dat_quet] = useState(false);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  return (
    <>
      <div className="hang-nut">
        <select value={loc} onChange={(e) => dat_loc(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(NHAN_TRANG_THAI).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={() => dat_quet(true)}>Quét tự động</button>
      </div>

      {ds.length === 0 ? (
        <Trong tieu_de="Chưa có vi phạm nào được ghi nhận" />
      ) : (
        <div className="vo-bang">
          <table>
            <thead>
              <tr>
                <th>Ngày</th><th>Nhân viên</th><th>Lỗi</th><th>Mức độ</th>
                <th>Nguồn</th><th>Trạng thái</th><th />
              </tr>
            </thead>
            <tbody>
              {ds.map((v) => (
                <tr key={v.id}>
                  <td>{ngay_v(v.ngay)}</td>
                  <td>{v.ma_nv} — {v.ho_ten}</td>
                  <td>{v.ten_loai}</td>
                  <td><span className={MAU_MUC_DO[v.muc_do]}>{NHAN_MUC_DO[v.muc_do]}</span></td>
                  <td>{v.nguon === 'he_thong' ? 'Hệ thống' : 'Quản lý ghi'}</td>
                  <td>
                    {NHAN_TRANG_THAI[v.trang_thai] ?? v.trang_thai}
                    {v.ky_luat !== null && <> — {NHAN_KY_LUAT[v.ky_luat]}</>}
                  </td>
                  <td className="canh-phai">
                    <button className="nut-phang" onClick={() => dat_xem(v)}>Xem</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {quet && <HopThoaiQuet khi_dong={() => dat_quet(false)}
        khi_xong={() => { dat_quet(false); nap_lai(); }} />}
      {xem !== null && <HopThoaiQuyet vp={xem} khi_dong={() => dat_xem(null)}
        khi_xong={() => { dat_xem(null); nap_lai(); }} />}
    </>
  );
}

function HopThoaiQuet(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const d = new Date();
  const [thang, dat_thang] = useState(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
  );
  const hd = dung_hanh_dong();

  return (
    <HopThoai tieu_de="Quét vi phạm tự động" khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Đối chiếu dữ liệu chấm công của tháng với các quy tắc <strong>đang bật</strong>.
        Vi phạm tìm ra chỉ được ghi ở trạng thái <em>Mới ghi nhận</em> — chưa ai xác nhận và
        người lao động chưa được giải trình.
      </p>
      <label htmlFor="th">Tháng</label>
      <input id="th" type="month" value={thang} onChange={(e) => dat_thang(e.target.value)} />
      <div className="hang-nut">
        <button
          disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => goi('/api/vi-pham/quet', { method: 'POST', body: { thang } }),
            'Đã quét xong.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Quét
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

function HopThoaiQuyet(
  { vp, khi_dong, khi_xong }: { vp: BanGhi; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [quyet, dat_quyet] = useState('da_xac_nhan');
  const [ky_luat, dat_ky_luat] = useState('');
  const [ghi_chu, dat_ghi_chu] = useState('');
  const hd = dung_hanh_dong();
  const xong = vp.trang_thai === 'da_xu_ly';
  // Nhac nho khong phai ky luat chinh thuc nen khong doi bien ban.
  const can_bien_ban = ky_luat !== '' && ky_luat !== 'nhac_nho';

  return (
    <HopThoai tieu_de={`Vi phạm — ${vp.ho_ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Ngày</div>
          <div className="o-so-gia-tri">{ngay_v(vp.ngay)}</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Lỗi</div>
          <div className="o-so-gia-tri">{vp.ten_loai}</div>
          <div className="o-so-phu">{NHAN_MUC_DO[vp.muc_do]}</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Nguồn</div>
          <div className="o-so-gia-tri">
            {vp.nguon === 'he_thong' ? 'Hệ thống phát hiện' : 'Quản lý ghi'}
          </div>
        </div>
      </div>

      {vp.mo_ta !== null && <p className="mo-ta"><strong>Nội dung:</strong> {vp.mo_ta}</p>}

      <h3>Giải trình của người lao động</h3>
      {vp.giai_trinh === null ? (
        <p className="mo-ta">
          Chưa có. Bộ luật Lao động 2019 Điều 122 cho người lao động quyền tự bào chữa —
          nên đợi giải trình trước khi kết luận.
        </p>
      ) : (
        <blockquote>{vp.giai_trinh}</blockquote>
      )}

      {xong ? (
        <p className="mo-ta">
          Đã xử lý xong{vp.ky_luat !== null && `: ${NHAN_KY_LUAT[vp.ky_luat]}`}.
          {vp.ghi_chu !== null && ` ${vp.ghi_chu}`}
        </p>
      ) : (
        <>
          <h3>Quyết định</h3>
          <label htmlFor="qd">Kết luận</label>
          <select id="qd" value={quyet} onChange={(e) => dat_quyet(e.target.value)}>
            <option value="da_xac_nhan">Xác nhận có vi phạm</option>
            <option value="bac_bo">Bãi bỏ — không có vi phạm</option>
            <option value="da_xu_ly">Đã xử lý xong</option>
          </select>

          <label htmlFor="kl">Hình thức kỷ luật</label>
          <select id="kl" value={ky_luat} onChange={(e) => dat_ky_luat(e.target.value)}>
            <option value="">Không áp dụng</option>
            {Object.entries(NHAN_KY_LUAT).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <p className="mo-ta">
            Bộ luật Lao động 2019 Điều 124 chỉ có bốn hình thức kỷ luật. <em>Nhắc nhở</em>
            {' '}không phải kỷ luật chính thức. <strong>Không có hình thức phạt tiền.</strong>
          </p>

          {can_bien_ban && (
            <div className="hop-luu-y">
              Áp dụng kỷ luật <strong>bắt buộc phải có biên bản cuộc họp xử lý kỷ luật</strong>
              {' '}(Điều 122). Hãy lập biên bản trong hồ sơ nhân sự của người này trước, rồi
              quay lại đây — hệ thống sẽ từ chối nếu thiếu.
            </div>
          )}

          <label htmlFor="gc">Ghi chú</label>
          <input id="gc" value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)} />

          <div className="hang-nut">
            <button
              disabled={hd.dang_chay}
              onClick={() => void hd.chay(
                () => goi(`/api/vi-pham/${vp.id}/quyet`, {
                  method: 'POST',
                  body: {
                    quyet_dinh: quyet,
                    ...(ky_luat === '' ? {} : { ky_luat }),
                    ghi_chu,
                  },
                }),
                'Đã lưu quyết định.',
              ).then((ok) => { if (ok !== null) khi_xong(); })}
            >
              Lưu
            </button>
            <button className="nut-phang" onClick={khi_dong}>Đóng</button>
          </div>
        </>
      )}
    </HopThoai>
  );
}

// ================================================================ danh muc
function TabDanhMuc(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<LoaiViPham[]>('/api/loai-vi-pham');
  const hd = dung_hanh_dong();
  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  const bat_tat = (l: LoaiViPham) => () => {
    void hd.chay(
      () => goi(`/api/loai-vi-pham/${l.id}`, {
        method: 'PATCH', body: { dang_bat: !l.dang_bat },
      }),
    ).then(nap_lai);
  };

  return (
    <>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Điểm trừ KPI <strong>chỉ ảnh hưởng điểm đánh giá</strong>, không phải tiền.
      </p>
      <div className="vo-bang">
        <table>
          <thead>
            <tr>
              <th>Mã</th><th>Tên lỗi</th><th>Mức độ</th>
              <th>Đề xuất xử lý</th><th className="canh-phai">Điểm trừ KPI</th>
              <th className="canh-phai">Quy tắc</th><th />
            </tr>
          </thead>
          <tbody>
            {ds.map((l) => (
              <tr key={l.id} style={l.dang_bat ? undefined : { opacity: 0.55 }}>
                <td><code>{l.ma}</code></td>
                <td>{l.ten}<div className="mo-ta">{l.mo_ta}</div></td>
                <td><span className={MAU_MUC_DO[l.muc_do]}>{NHAN_MUC_DO[l.muc_do]}</span></td>
                <td>{l.ky_luat_de_xuat === null ? '—' : NHAN_KY_LUAT[l.ky_luat_de_xuat]}</td>
                <td className="canh-phai">{Number(l.diem_tru_kpi)}</td>
                <td className="canh-phai">{l.so_quy_tac}</td>
                <td className="canh-phai">
                  <button className="nut-phang" disabled={hd.dang_chay} onClick={bat_tat(l)}>
                    {l.dang_bat ? 'Tắt' : 'Bật'}
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

// ================================================================ quy tac
function TabQuyTac(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<QuyTac[]>('/api/quy-tac-vi-pham');
  const hd = dung_hanh_dong();
  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  const bat_tat = (q: QuyTac) => () => {
    void hd.chay(
      () => goi(`/api/quy-tac-vi-pham/${q.id}`, {
        method: 'PATCH', body: { dang_bat: !q.dang_bat },
      }),
      q.dang_bat ? 'Đã tắt quy tắc.' : 'Đã bật quy tắc.',
    ).then(nap_lai);
  };

  return (
    <>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <div className="hop-luu-y">
        <strong>Ngưỡng phải khớp nội quy lao động đã đăng ký của công ty.</strong> Hệ thống
        gieo sẵn vài ngưỡng gợi ý nhưng <em>tắt hết</em> — bật bằng một con số chưa ai duyệt
        nghĩa là kết tội người thật bằng tiêu chí không có căn cứ.
      </div>
      <div className="vo-bang">
        <table>
          <thead>
            <tr>
              <th>Quy tắc</th><th>Thuộc lỗi</th><th>Điều kiện</th><th>Trạng thái</th><th />
            </tr>
          </thead>
          <tbody>
            {ds.map((q) => (
              <tr key={q.id}>
                <td>{q.ten}<div className="mo-ta">{q.ghi_chu}</div></td>
                <td>{q.ten_loai}</td>
                <td>
                  {NHAN_CHI_SO[q.chi_so] ?? q.chi_so} {q.toan_tu} {Number(q.nguong)}
                </td>
                <td>
                  <span className={q.dang_bat ? 'nhan-tot' : 'nhan-mo'}>
                    {q.dang_bat ? 'Đang bật' : 'Đang tắt'}
                  </span>
                </td>
                <td className="canh-phai">
                  <button className="nut-phang" disabled={hd.dang_chay} onClick={bat_tat(q)}>
                    {q.dang_bat ? 'Tắt' : 'Bật'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mo-ta">Cập nhật lần cuối {ngay_gio(new Date().toISOString())}</p>
    </>
  );
}
