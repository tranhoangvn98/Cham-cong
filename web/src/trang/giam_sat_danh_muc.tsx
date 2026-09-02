// Danh muc canh bao, danh muc loi va dieu kien phat hien.
//
// NUT "CHAY THU" LA HANG MUC BAT BUOC, khong phai tien ich.
//
// Nguoi dat nguong phai thay TRUOC khi bat: quy tac nay se bat bao nhieu ban ghi trong du
// lieu that. Khong co no thi nguoi ta bat mot nguong doan mo, sinh ra hang nghin canh bao
// rac, va sau hai tuan khong ai mo trang nay nua — module chet khong phai vi sai ky thuat
// ma vi mat long tin.
//
// Vi vay moi dieu kien deu TAT khi tao, va nut Chay thu dat ngay canh cong tac Bat.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, XuongDanhSach, dung_hanh_dong, dung_nap, dung_xac_nhan,
} from '../thanh_phan.tsx';

type Tab = 'canh_bao' | 'loi' | 'dieu_kien';

interface MoTaThamSo {
  ten: string;
  nhan: string;
  kieu: 'so' | 'tien' | 'gio';
  mac_dinh: number;
  goi_y?: string;
}

interface PhepDo {
  ma: string;
  ten: string;
  mo_ta: string;
  nhom: string;
  nguon: string[];
  don_vi: string;
  tham_so: MoTaThamSo[];
  dung_anh_chup: boolean;
  chua_trien_khai: string | null;
}

interface LoaiCanhBao {
  id: string;
  ma: string;
  ten: string;
  nhom: string;
  mo_ta: string | null;
  muc_do_mac_dinh: string;
  sla_xu_ly_gio: number;
  vai_tro_xu_ly: string | null;
  huong_dan_xu_ly: string | null;
  dang_bat: boolean;
  so_loai_loi: number;
}

interface LoaiLoi {
  id: string;
  ma: string;
  ten: string;
  loai_canh_bao_id: string;
  canh_bao_ten: string;
  nhom: string;
  mo_ta: string | null;
  muc_do: string;
  bo_phan_chiu_trach_nhiem: string | null;
  hau_qua: string | null;
  huong_khac_phuc: string | null;
  can_cu: string | null;
  dang_bat: boolean;
  so_dieu_kien: number;
  so_dieu_kien_bat: number;
  so_canh_bao_moi: number;
}

interface DieuKien {
  id: string;
  loai_loi_id: string;
  loai_loi_ma: string;
  loai_loi_ten: string;
  phep_do: string;
  tham_so: Record<string, number>;
  toan_tu: string;
  nguong: string;
  dang_bat: boolean;
  ghi_chu: string | null;
}

interface KetQuaThu {
  so_ban_ghi_doc: number;
  so_se_canh_bao: number;
  bo_qua: string[];
  mau: {
    thuc_the: string; khoa: string; tieu_de: string; gia_tri: number;
    so_tien: number | null;
    dieu_kien_khop: { phep_do: string; toan_tu: string; nguong: number; gia_tri: number }[];
  }[];
}

const TEN_NHOM: Record<string, string> = {
  sla: 'Chậm tiến độ', trung_lap: 'Trùng lặp', don_hang: 'Đơn hàng',
  giao_dich: 'Giao dịch', chi_phi_cong_no: 'Chi phí & công nợ',
  cheo_cham_cong: 'Chéo chấm công',
};

const TEN_MUC_DO: Record<string, string> = {
  thap: 'Thấp', trung: 'Trung bình', cao: 'Cao', nghiem_trong: 'Nghiêm trọng',
};

export function TrangGiamSatDanhMuc(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('loi');
  return (
    <>
      <div className="thanh-tab">
        <button
          type="button" className={tab === 'canh_bao' ? 'tab tab-dang-mo' : 'tab'}
          onClick={() => dat_tab('canh_bao')}
        >
          Danh mục cảnh báo
        </button>
        <button
          type="button" className={tab === 'loi' ? 'tab tab-dang-mo' : 'tab'}
          onClick={() => dat_tab('loi')}
        >
          Danh mục lỗi
        </button>
        <button
          type="button" className={tab === 'dieu_kien' ? 'tab tab-dang-mo' : 'tab'}
          onClick={() => dat_tab('dieu_kien')}
        >
          Điều kiện phát hiện
        </button>
      </div>

      {tab === 'canh_bao' && <TabCanhBao />}
      {tab === 'loi' && <TabLoi />}
      {tab === 'dieu_kien' && <TabDieuKien />}
    </>
  );
}

// ================================================================ tab danh muc canh bao

function TabCanhBao(): ReactNode {
  const ds = dung_nap<LoaiCanhBao[]>('/api/giam-sat/loai-canh-bao');
  const hd = dung_hanh_dong();

  async function bat_tat(c: LoaiCanhBao): Promise<void> {
    await hd.chay(async () => {
      await goi(`/api/giam-sat/loai-canh-bao/${c.id}`, {
        method: 'PATCH', body: { dang_bat: !c.dang_bat },
      });
      ds.nap_lai();
    });
  }

  return (
    <>
      <p className="goi-y">
        Mỗi nhóm gom các loại lỗi cùng bản chất nghiệp vụ, và quy định thời hạn xử lý cùng
        bộ phận chịu trách nhiệm. Tắt một nhóm là tắt toàn bộ loại lỗi trong nhóm đó.
      </p>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {ds.loi !== null && <HopLoi loi={ds.loi} />}
      {ds.dang_tai && <XuongDanhSach />}
      {ds.du_lieu !== null && (
        <div className="the the-mong">
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Mã</th><th>Tên nhóm</th><th>Loại lỗi</th>
                  <th>Mức mặc định</th><th>Hạn xử lý</th><th>Bộ phận</th><th>Bật</th>
                </tr>
              </thead>
              <tbody>
                {ds.du_lieu.map((c) => (
                  <tr key={c.id}>
                    <td className="chu-nho">{c.ma}</td>
                    <td>
                      {c.ten}
                      {c.mo_ta !== null && <div className="goi-y">{c.mo_ta}</div>}
                    </td>
                    <td className="canh-phai">{c.so_loai_loi}</td>
                    <td>{TEN_MUC_DO[c.muc_do_mac_dinh] ?? c.muc_do_mac_dinh}</td>
                    <td>{c.sla_xu_ly_gio} giờ</td>
                    <td className="chu-nho">{c.vai_tro_xu_ly ?? ''}</td>
                    <td>
                      <button
                        type="button" className="nut-nho" disabled={hd.dang_chay}
                        onClick={() => { void bat_tat(c); }}
                      >
                        {c.dang_bat ? 'Đang bật' : 'Đang tắt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ================================================================ tab danh muc loi

function TabLoi(): ReactNode {
  const [nhom, dat_nhom] = useState('');
  const ds = dung_nap<LoaiLoi[]>(
    `/api/giam-sat/loai-loi${nhom === '' ? '' : `?nhom=${nhom}`}`, [nhom]);
  const hd = dung_hanh_dong();
  const [xem, dat_xem] = useState<LoaiLoi | null>(null);

  async function bat_tat(l: LoaiLoi): Promise<void> {
    await hd.chay(async () => {
      await goi(`/api/giam-sat/loai-loi/${l.id}`, {
        method: 'PATCH', body: { dang_bat: !l.dang_bat },
      });
      ds.nap_lai();
    });
  }

  return (
    <>
      <p className="goi-y">
        Mỗi loại lỗi là một tình huống cụ thể cần phát hiện. Loại lỗi chỉ thực sự chạy khi
        nhóm của nó đang bật, bản thân nó đang bật, và có ít nhất một điều kiện đang bật.
      </p>
      <div className="bo-loc">
        <select className="o-nhap" value={nhom} onChange={(e) => dat_nhom(e.target.value)}>
          <option value="">Mọi nhóm</option>
          {Object.entries(TEN_NHOM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {ds.loi !== null && <HopLoi loi={ds.loi} />}
      {ds.dang_tai && <XuongDanhSach />}
      {ds.du_lieu !== null && (
        <div className="the the-mong">
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Mã</th><th>Tên lỗi</th><th>Nhóm</th><th>Mức độ</th>
                  <th>Điều kiện</th><th>Dấu hiệu mới</th><th>Bật</th>
                </tr>
              </thead>
              <tbody>
                {ds.du_lieu.map((l) => (
                  <tr
                    key={l.id}
                    className="hang-bam"
                    tabIndex={0}
                    role="button"
                    aria-label={`Xem chi tiết loại lỗi ${l.ten}`}
                    onClick={() => dat_xem(l)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      dat_xem(l);
                    }}
                  >
                    <td className="chu-nho">{l.ma}</td>
                    <td>{l.ten}</td>
                    <td className="chu-nho">{TEN_NHOM[l.nhom] ?? l.nhom}</td>
                    <td>{TEN_MUC_DO[l.muc_do] ?? l.muc_do}</td>
                    <td className="canh-phai">
                      {l.so_dieu_kien_bat}/{l.so_dieu_kien}
                      {l.so_dieu_kien_bat === 0 && (
                        <span className="chu-mo"> (chưa chạy)</span>
                      )}
                    </td>
                    <td className="canh-phai">{l.so_canh_bao_moi}</td>
                    <td>
                      <button
                        type="button" className="nut-nho" disabled={hd.dang_chay}
                        onClick={(e) => { e.stopPropagation(); void bat_tat(l); }}
                      >
                        {l.dang_bat ? 'Đang bật' : 'Đang tắt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {xem !== null && (
        <HopThoai tieu_de={xem.ten} khi_dong={() => dat_xem(null)} rong>
          <table className="bang-gon">
            <tbody>
              <tr><td>Mã</td><td>{xem.ma}</td></tr>
              <tr><td>Nhóm</td><td>{xem.canh_bao_ten}</td></tr>
              <tr><td>Mức độ</td><td>{TEN_MUC_DO[xem.muc_do] ?? xem.muc_do}</td></tr>
              {xem.mo_ta !== null && <tr><td>Mô tả</td><td>{xem.mo_ta}</td></tr>}
              {xem.bo_phan_chiu_trach_nhiem !== null && (
                <tr><td>Bộ phận</td><td>{xem.bo_phan_chiu_trach_nhiem}</td></tr>
              )}
              {xem.hau_qua !== null && <tr><td>Hậu quả</td><td>{xem.hau_qua}</td></tr>}
              {xem.huong_khac_phuc !== null && (
                <tr><td>Hướng khắc phục</td><td>{xem.huong_khac_phuc}</td></tr>
              )}
              {xem.can_cu !== null && <tr><td>Căn cứ</td><td>{xem.can_cu}</td></tr>}
            </tbody>
          </table>
        </HopThoai>
      )}
    </>
  );
}

// ================================================================ tab dieu kien

function TabDieuKien(): ReactNode {
  const ds = dung_nap<DieuKien[]>('/api/giam-sat/dieu-kien');
  const pd = dung_nap<PhepDo[]>('/api/giam-sat/phep-do');
  const hd = dung_hanh_dong();
  const xn = dung_xac_nhan();
  const [thu, dat_thu] = useState<DieuKien | null>(null);

  const theo_ma = new Map((pd.du_lieu ?? []).map((p) => [p.ma, p]));

  async function bat_tat(d: DieuKien): Promise<void> {
    const p = theo_ma.get(d.phep_do);
    if (!d.dang_bat) {
      const ok = await xn.hoi({
        tieu_de: 'Bật điều kiện này?',
        mo_ta: 'Từ vòng quét tới, mọi bản ghi vượt ngưỡng sẽ sinh ra một dấu hiệu cần kiểm '
          + 'tra. Nếu chưa chạy thử, hãy bấm Chạy thử trước để biết nó sẽ bắt bao nhiêu.',
        chu_dong_y: 'Bật',
      });
      if (!ok) return;
    }
    if (p?.chua_trien_khai != null && !d.dang_bat) {
      // Van cho bat de nguoi dung thay trang thai that, nhung phai biet no khong chay.
      await xn.hoi({
        tieu_de: 'Phép đo này chưa triển khai',
        mo_ta: p.chua_trien_khai,
        chu_dong_y: 'Đã hiểu',
      });
    }
    await hd.chay(async () => {
      await goi(`/api/giam-sat/dieu-kien/${d.id}`, {
        method: 'PATCH', body: { dang_bat: !d.dang_bat },
      });
      ds.nap_lai();
    });
  }

  return (
    <>
      <p className="goi-y">
        Mỗi dòng là một phép đo trên dữ liệu ERP 1 kèm một ngưỡng. Nhiều điều kiện của cùng
        một loại lỗi được nối bằng VÀ. Ngưỡng cài sẵn chỉ là gợi ý — phải đối chiếu quy chế
        nội bộ đã ban hành rồi mới bật.
      </p>
      {xn.hop_thoai}
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {ds.loi !== null && <HopLoi loi={ds.loi} />}
      {ds.dang_tai && <XuongDanhSach />}
      {ds.du_lieu !== null && ds.du_lieu.length === 0 && (
        <Trong tieu_de="Chưa có điều kiện nào." />
      )}
      {ds.du_lieu !== null && ds.du_lieu.length > 0 && (
        <div className="the the-mong">
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Loại lỗi</th><th>Phép đo</th><th>Điều kiện</th>
                  <th>Tham số</th><th>Trạng thái</th><th />
                </tr>
              </thead>
              <tbody>
                {ds.du_lieu.map((d) => {
                  const p = theo_ma.get(d.phep_do);
                  return (
                    <tr key={d.id}>
                      <td className="chu-nho">{d.loai_loi_ma}</td>
                      <td>
                        {p?.ten ?? d.phep_do}
                        {p?.chua_trien_khai != null && (
                          <div className="nhan-xau">Chưa triển khai</div>
                        )}
                        {p !== undefined && <div className="goi-y">{p.mo_ta}</div>}
                      </td>
                      <td className="so">
                        {d.toan_tu} {Number(d.nguong).toLocaleString('vi-VN')}
                        {p !== undefined && <span className="chu-mo"> {p.don_vi}</span>}
                      </td>
                      <td className="chu-nho">
                        {Object.entries(d.tham_so).length === 0
                          ? '—'
                          : Object.entries(d.tham_so).map(([k, v]) => (
                            <div key={k}>
                              {p?.tham_so.find((t) => t.ten === k)?.nhan ?? k}:{' '}
                              {v.toLocaleString('vi-VN')}
                            </div>
                          ))}
                      </td>
                      <td>
                        <span className={d.dang_bat ? 'nhan-tot' : 'nhan-mo'}>
                          {d.dang_bat ? 'Đang bật' : 'Đang tắt'}
                        </span>
                      </td>
                      <td>
                        <div className="hang-nut">
                          <button
                            type="button" className="nut-nho"
                            onClick={() => dat_thu(d)}
                          >
                            Chạy thử
                          </button>
                          <button
                            type="button" className="nut-nho" disabled={hd.dang_chay}
                            onClick={() => { void bat_tat(d); }}
                          >
                            {d.dang_bat ? 'Tắt' : 'Bật'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {thu !== null && <HopThoaiChayThu dieu_kien={thu} khi_dong={() => dat_thu(null)} />}
    </>
  );
}

function HopThoaiChayThu(
  { dieu_kien, khi_dong }: { dieu_kien: DieuKien; khi_dong: () => void },
): ReactNode {
  const hd = dung_hanh_dong();
  const [kq, dat_kq] = useState<KetQuaThu | null>(null);
  const [da_chay, dat_da_chay] = useState(false);

  async function chay(): Promise<void> {
    await hd.chay(async () => {
      const r = await goi<KetQuaThu>('/api/giam-sat/thu-quy-tac', {
        method: 'POST', body: { loai_loi_id: dieu_kien.loai_loi_id },
      });
      dat_kq(r);
      dat_da_chay(true);
    });
  }

  return (
    <HopThoai tieu_de={`Chạy thử: ${dieu_kien.loai_loi_ten}`} khi_dong={khi_dong} rong>
      <p className="goi-y">
        Chạy thử đọc dữ liệu ERP 1 và đếm xem loại lỗi này sẽ sinh ra bao nhiêu dấu hiệu,
        nhưng <strong>không ghi gì cả</strong>. Nó chạy cả những điều kiện đang tắt — vì mục
        đích là xem trước khi bật.
      </p>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {!da_chay && (
        <div className="hang-nut">
          <button
            type="button" className="nut-chinh" disabled={hd.dang_chay}
            onClick={() => { void chay(); }}
          >
            {hd.dang_chay ? 'Đang chạy…' : 'Chạy thử ngay'}
          </button>
        </div>
      )}
      {hd.dang_chay && <DangTai chu="Đang đọc dữ liệu ERP 1…" />}

      {kq !== null && (
        <>
          <table className="bang-gon">
            <tbody>
              <tr><td>Số bản ghi đã đọc</td><td className="so">{kq.so_ban_ghi_doc}</td></tr>
              <tr>
                <td>Sẽ sinh dấu hiệu</td>
                <td className="so">{kq.so_se_canh_bao}</td>
              </tr>
            </tbody>
          </table>

          {kq.bo_qua.length > 0 && (
            <div className="hop-loi">
              {kq.bo_qua.map((b) => <div key={b}>{b}</div>)}
            </div>
          )}

          {kq.so_se_canh_bao > 200 && (
            <div className="hop-loi">
              Ngưỡng này bắt {kq.so_se_canh_bao} bản ghi. Số lượng lớn như vậy thường có
              nghĩa ngưỡng đặt quá rộng — hãy siết lại trước khi bật, nếu không danh sách
              cảnh báo sẽ ngập và không ai đọc nữa.
            </div>
          )}

          {kq.mau.length === 0
            ? <Trong tieu_de="Không có bản ghi nào vượt ngưỡng." />
            : (
              <>
                <h4>Mẫu {kq.mau.length} bản ghi đầu</h4>
                <div className="vo-bang">
                  <table>
                    <thead>
                      <tr>
                        <th>Đối tượng</th><th>Dấu hiệu</th>
                        <th className="canh-phai">Giá trị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kq.mau.map((m) => (
                        <tr key={`${m.thuc_the}-${m.khoa}`}>
                          <td className="chu-nho">{m.thuc_the} · {m.khoa}</td>
                          <td>{m.tieu_de}</td>
                          <td className="canh-phai so">{m.gia_tri}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
        </>
      )}
    </HopThoai>
  );
}
