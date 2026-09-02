// Giam sat gian lan: danh sach canh bao tu du lieu ERP 1 va vong doi xu ly.
//
// MOT NGUYEN TAC CHI PHOI TOAN BO CHU TREN TRANG NAY:
//
// Canh bao la DAU HIEU CAN KIEM TRA, khong phai ket luan. Giao dien khong duoc dung tu ngu
// buoc toi ("vi pham", "gian lan", "sai pham") cho mot ban ghi may sinh ra. Nguoi doc trang
// nay co quyen ket luan; may thi khong.
//
// Ly do khong chi la ngon tu: mot he thong noi "phat hien gian lan" se duoc doc nhu mot ban
// an, va nguoi bi neu ten khong con co hoi giai thich truoc khi cai nhin da hinh thanh.
import { useState, type ReactNode } from 'react';
import { goi, tai_tep } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, OSo, Trong, XuongDanhSach,
  dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

interface CanhBao {
  id: string;
  tieu_de: string;
  muc_do: 'thap' | 'trung' | 'cao' | 'nghiem_trong';
  trang_thai: string;
  nguon_ma: string;
  thuc_the: string;
  thuc_the_khoa: string;
  gia_tri: string | null;
  nguong: string | null;
  so_tien: string | null;
  erp_user_id: number | null;
  phat_hien_luc: string;
  xu_ly_luc: string | null;
  loai_loi_ma: string;
  loai_loi_ten: string;
  nhom: string;
  nhom_ten: string;
  sla_xu_ly_gio: number;
  nhan_vien_ten: string | null;
  qua_han: boolean;
}

interface ChiTiet extends CanhBao {
  mo_ta: string | null;
  bang_chung: Record<string, unknown>;
  ket_luan: string | null;
  loai_loi_mo_ta: string | null;
  hau_qua: string | null;
  huong_khac_phuc: string | null;
  bo_phan_chiu_trach_nhiem: string | null;
  can_cu: string | null;
  huong_dan_xu_ly: string | null;
  ma_nv: string | null;
  nhat_ky: {
    id: number; hanh_dong: string; trang_thai_truoc: string | null;
    trang_thai_sau: string | null; ghi_chu: string | null; luc: string;
    ten_dang_nhap: string | null;
  }[];
}

interface TongQuan {
  moi: number;
  dang_kiem_tra: number;
  qua_han: number;
  nghiem_trong: number;
  tong_tien: number;
  theo_nhom: { nhom: string; ten: string; moi: number; tong: number }[];
  quet_lan_cuoi: string | null;
  so_lan_quet_hong_24h: number;
  dang_bat: boolean;
}

const TEN_MUC_DO: Record<string, string> = {
  thap: 'Thấp', trung: 'Trung bình', cao: 'Cao', nghiem_trong: 'Nghiêm trọng',
};

const TEN_TRANG_THAI: Record<string, string> = {
  moi: 'Mới', dang_kiem_tra: 'Đang kiểm tra', xac_nhan: 'Đã xác nhận',
  bo_qua: 'Bỏ qua', da_xu_ly: 'Đã xử lý',
};

const TEN_NHOM: Record<string, string> = {
  sla: 'Chậm tiến độ', trung_lap: 'Trùng lặp', don_hang: 'Đơn hàng',
  giao_dich: 'Giao dịch', chi_phi_cong_no: 'Chi phí & công nợ',
  cheo_cham_cong: 'Chéo chấm công',
};

/** Muc do -> class nhan san co trong kieu.css. Khong dat class moi. */
function lop_muc_do(m: string): string {
  return m === 'nghiem_trong' || m === 'cao' ? 'nhan-xau'
    : m === 'trung' ? 'nhan-cot' : 'nhan-mo';
}

function lop_trang_thai(t: string): string {
  return t === 'moi' ? 'nhan-cot'
    : t === 'xac_nhan' ? 'nhan-xau'
      : t === 'da_xu_ly' ? 'nhan-tot' : 'nhan-mo';
}

function tien(v: string | null): string {
  if (v === null) return '';
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? `${n.toLocaleString('vi-VN')} đ` : '';
}

/** Hien mot khoi bang chung dang bang, khong bat nguoi doc tu giai ma JSON. */
function BangChung({ du_lieu }: { du_lieu: Record<string, unknown> }): ReactNode {
  const dong = Object.entries(du_lieu);
  if (dong.length === 0) return <p className="goi-y">Không có dữ liệu kèm theo.</p>;
  return (
    <table className="bang-gon">
      <tbody>
        {dong.map(([k, v]) => (
          <tr key={k}>
            <td>{k.replace(/_/g, ' ')}</td>
            <td>
              {typeof v === 'object' && v !== null
                ? <pre className="xem-van-ban">{JSON.stringify(v, null, 2)}</pre>
                : String(v ?? '')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TrangGiamSat(): ReactNode {
  const [nhom, dat_nhom] = useState('');
  const [muc_do, dat_muc_do] = useState('');
  const [trang_thai, dat_trang_thai] = useState('moi');
  const [tu_ngay, dat_tu_ngay] = useState('');
  const [den_ngay, dat_den_ngay] = useState('');
  const [dang_mo, dat_dang_mo] = useState<string | null>(null);
  const hd_xuat = dung_hanh_dong();

  const tham_so = new URLSearchParams();
  if (nhom !== '') tham_so.set('nhom', nhom);
  if (muc_do !== '') tham_so.set('muc_do', muc_do);
  if (trang_thai !== '') tham_so.set('trang_thai', trang_thai);
  if (tu_ngay !== '') tham_so.set('tu_ngay', tu_ngay);
  if (den_ngay !== '') tham_so.set('den_ngay', den_ngay);

  const tq = dung_nap<TongQuan>('/api/giam-sat/tong-quan');
  const ds = dung_nap<CanhBao[]>(`/api/giam-sat/canh-bao?${tham_so.toString()}`,
    [nhom, muc_do, trang_thai, tu_ngay, den_ngay]);

  return (
    <>
      <div className="dau-trang">
        <div className="hang-nut">
          {/*
            Tai qua `tai_tep` chu KHONG dat thang vao `href`: the <a> khong mang duoc header
            Authorization, nen mot lien ket thuong se nhan 401. Da co tien le o cac trang xuat
            CSV khac cua he thong.
          */}
          <button
            type="button" className="nut-light" disabled={hd_xuat.dang_chay}
            onClick={() => {
              void hd_xuat.chay(() => tai_tep(
                `/api/giam-sat/canh-bao.csv?${tham_so.toString()}`,
                `canh-bao-giam-sat-${new Date().toISOString().slice(0, 10)}.csv`,
              ));
            }}
          >
            Xuất CSV
          </button>
        </div>
      </div>

      {hd_xuat.loi !== null && <HopLoi loi={hd_xuat.loi} />}

      {tq.loi !== null && <HopLoi loi={tq.loi} />}

      {tq.du_lieu !== null && tq.du_lieu.dang_bat === false && (
        <div className="hop-loi">
          Module giám sát chưa được cấu hình kết nối tới ERP 1 nên chưa quét được gì.
          Quản trị viên vào Cài đặt → Nguồn ERP để cấu hình.
        </div>
      )}

      {tq.du_lieu !== null && tq.du_lieu.so_lan_quet_hong_24h > 0 && (
        <div className="hop-loi">
          Có {tq.du_lieu.so_lan_quet_hong_24h} lần quét thất bại trong 24 giờ qua.
          Danh sách dưới đây có thể thiếu — xem Cài đặt → Nguồn ERP để biết lý do.
        </div>
      )}

      {tq.du_lieu !== null && (
        <div className="hang-bam">
          <OSo nhan="Dấu hiệu mới" gia_tri={tq.du_lieu.moi} />
          <OSo nhan="Đang kiểm tra" gia_tri={tq.du_lieu.dang_kiem_tra} />
          <OSo
            nhan="Quá hạn xử lý" gia_tri={tq.du_lieu.qua_han}
            mau={tq.du_lieu.qua_han > 0 ? 'xau' : undefined}
          />
          <OSo
            nhan="Mức nghiêm trọng" gia_tri={tq.du_lieu.nghiem_trong}
            mau={tq.du_lieu.nghiem_trong > 0 ? 'xau' : undefined}
            phu={tq.du_lieu.tong_tien > 0
              ? `${tq.du_lieu.tong_tien.toLocaleString('vi-VN')} đ liên quan`
              : undefined}
          />
        </div>
      )}

      <div className="bo-loc">
        <select
          className="o-nhap" value={trang_thai}
          onChange={(e) => dat_trang_thai(e.target.value)}
        >
          <option value="">Mọi trạng thái</option>
          {Object.entries(TEN_TRANG_THAI).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="o-nhap" value={nhom} onChange={(e) => dat_nhom(e.target.value)}>
          <option value="">Mọi nhóm</option>
          {Object.entries(TEN_NHOM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="o-nhap" value={muc_do} onChange={(e) => dat_muc_do(e.target.value)}>
          <option value="">Mọi mức độ</option>
          {Object.entries(TEN_MUC_DO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input
          className="o-nhap" type="date" value={tu_ngay}
          onChange={(e) => dat_tu_ngay(e.target.value)} aria-label="Từ ngày"
        />
        <input
          className="o-nhap" type="date" value={den_ngay}
          onChange={(e) => dat_den_ngay(e.target.value)} aria-label="Đến ngày"
        />
      </div>

      {ds.loi !== null && <HopLoi loi={ds.loi} />}
      {ds.dang_tai && <XuongDanhSach />}

      {ds.du_lieu !== null && ds.du_lieu.length === 0 && (
        <Trong
          tieu_de="Không có dấu hiệu nào khớp bộ lọc."
          mo_ta="Điều kiện phát hiện được cài sẵn nhưng TẮT hết. Vào Danh mục, bấm Chạy thử để xem một điều kiện sẽ bắt bao nhiêu bản ghi, rồi mới bật."
        />
      )}

      {ds.du_lieu !== null && ds.du_lieu.length > 0 && (
        <div className="the the-mong">
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Phát hiện</th>
                  <th>Dấu hiệu</th>
                  <th>Nhóm</th>
                  <th>Mức độ</th>
                  <th className="canh-phai">Giá trị</th>
                  <th className="canh-phai">Số tiền</th>
                  <th>Liên quan</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {ds.du_lieu.map((c) => (
                  // Ca hang mo chi tiet, nen phai la mot dich den cua ban phim — nguoi khong
                  // dung chuot khong the bi loai khoi mot man hinh kiem soat noi bo.
                  <tr
                    key={c.id}
                    className="hang-bam"
                    tabIndex={0}
                    role="button"
                    aria-label={`Xem chi tiết: ${c.tieu_de}`}
                    onClick={() => dat_dang_mo(c.id)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      dat_dang_mo(c.id);
                    }}
                  >
                    <td className="chu-nho">
                      {ngay_gio(c.phat_hien_luc)}
                      {c.qua_han && <> · <span className="nhan-xau">quá hạn</span></>}
                    </td>
                    <td>{c.tieu_de}</td>
                    <td className="chu-nho">{TEN_NHOM[c.nhom] ?? c.nhom}</td>
                    <td><span className={lop_muc_do(c.muc_do)}>{TEN_MUC_DO[c.muc_do]}</span></td>
                    <td className="canh-phai">{c.gia_tri ?? ''}</td>
                    <td className="canh-phai">{tien(c.so_tien)}</td>
                    <td className="chu-nho">
                      {c.nhan_vien_ten ?? (c.erp_user_id === null ? '' : `ERP #${c.erp_user_id}`)}
                    </td>
                    <td>
                      <span className={lop_trang_thai(c.trang_thai)}>
                        {TEN_TRANG_THAI[c.trang_thai] ?? c.trang_thai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dang_mo !== null && (
        <HopThoaiChiTiet
          id={dang_mo}
          khi_dong={(co_doi) => {
            dat_dang_mo(null);
            if (co_doi) { ds.nap_lai(); tq.nap_lai(); }
          }}
        />
      )}
    </>
  );
}

function HopThoaiChiTiet(
  { id, khi_dong }: { id: string; khi_dong: (co_doi: boolean) => void },
): ReactNode {
  const ct = dung_nap<ChiTiet>(`/api/giam-sat/canh-bao/${id}`, [id]);
  const hd = dung_hanh_dong();
  const [ket_luan, dat_ket_luan] = useState('');
  const [da_doi, dat_da_doi] = useState(false);

  async function doi(trang_thai: string): Promise<void> {
    await hd.chay(async () => {
      await goi(`/api/giam-sat/canh-bao/${id}/xu-ly`, {
        method: 'POST', body: { trang_thai, ket_luan: ket_luan === '' ? null : ket_luan },
      });
      dat_da_doi(true);
      ct.nap_lai();
    });
  }

  return (
    <HopThoai tieu_de="Chi tiết dấu hiệu" khi_dong={() => khi_dong(da_doi)} rong>
      {ct.dang_tai && <DangTai />}
      {ct.loi !== null && <HopLoi loi={ct.loi} />}
      {ct.du_lieu !== null && (
        <>
          <h3>{ct.du_lieu.tieu_de}</h3>
          <table className="bang-gon">
            <tbody>
              <tr>
                <td>Loại lỗi</td>
                <td>{ct.du_lieu.loai_loi_ten} <span className="chu-mo">({ct.du_lieu.loai_loi_ma})</span></td>
              </tr>
              <tr><td>Nhóm</td><td>{ct.du_lieu.nhom_ten}</td></tr>
              <tr>
                <td>Mức độ</td>
                <td>
                  <span className={lop_muc_do(ct.du_lieu.muc_do)}>
                    {TEN_MUC_DO[ct.du_lieu.muc_do]}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Đối tượng</td>
                <td>{ct.du_lieu.nguon_ma} · {ct.du_lieu.thuc_the} · {ct.du_lieu.thuc_the_khoa}</td>
              </tr>
              <tr>
                <td>Giá trị đo / ngưỡng</td>
                <td>{ct.du_lieu.gia_tri ?? ''} / {ct.du_lieu.nguong ?? ''}</td>
              </tr>
              {ct.du_lieu.so_tien !== null && (
                <tr><td>Số tiền</td><td>{tien(ct.du_lieu.so_tien)}</td></tr>
              )}
              <tr>
                <td>Người liên quan</td>
                <td>
                  {ct.du_lieu.nhan_vien_ten ?? '—'}
                  {ct.du_lieu.erp_user_id !== null && (
                    <span className="chu-mo"> · ERP #{ct.du_lieu.erp_user_id}</span>
                  )}
                </td>
              </tr>
              <tr><td>Phát hiện lúc</td><td>{ngay_gio(ct.du_lieu.phat_hien_luc)}</td></tr>
            </tbody>
          </table>

          {ct.du_lieu.huong_dan_xu_ly !== null && (
            <>
              <h4>Hướng xử lý</h4>
              <p className="goi-y">{ct.du_lieu.huong_dan_xu_ly}</p>
            </>
          )}
          {ct.du_lieu.huong_khac_phuc !== null && (
            <p className="goi-y">{ct.du_lieu.huong_khac_phuc}</p>
          )}
          {ct.du_lieu.can_cu !== null && (
            <p className="goi-y">Căn cứ: {ct.du_lieu.can_cu}</p>
          )}

          <h4>Bằng chứng</h4>
          <BangChung du_lieu={ct.du_lieu.bang_chung} />

          {ct.du_lieu.nhat_ky.length > 0 && (
            <>
              <h4>Nhật ký xử lý</h4>
              <table className="bang-gon">
                <tbody>
                  {ct.du_lieu.nhat_ky.map((n) => (
                    <tr key={n.id}>
                      <td>{ngay_gio(n.luc)}</td>
                      <td>
                        {n.ten_dang_nhap ?? '—'}:{' '}
                        {TEN_TRANG_THAI[n.trang_thai_truoc ?? ''] ?? n.trang_thai_truoc}
                        {' → '}
                        {TEN_TRANG_THAI[n.trang_thai_sau ?? ''] ?? n.trang_thai_sau}
                        {n.ghi_chu !== null && <> — {n.ghi_chu}</>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h4>Kết luận của bạn</h4>
          <p className="goi-y">
            Đây là dấu hiệu do máy phát hiện, không phải kết luận. Hãy đối chiếu chứng từ gốc
            và hỏi người liên quan trước khi xác nhận.
          </p>
          <textarea
            className="o-nhap" rows={3} value={ket_luan}
            placeholder="Ghi lại điều bạn đã đối chiếu và kết luận…"
            onChange={(e) => dat_ket_luan(e.target.value)}
          />
          {hd.loi !== null && <HopLoi loi={hd.loi} />}
          <div className="hang-nut">
            <button
              type="button" className="nut-light" disabled={hd.dang_chay}
              onClick={() => { void doi('dang_kiem_tra'); }}
            >
              Đang kiểm tra
            </button>
            <button
              type="button" className="nut-light" disabled={hd.dang_chay}
              onClick={() => { void doi('bo_qua'); }}
            >
              Bỏ qua
            </button>
            <button
              type="button" className="nut-chinh" disabled={hd.dang_chay}
              onClick={() => { void doi('xac_nhan'); }}
            >
              Xác nhận có vấn đề
            </button>
            <button
              type="button" className="nut-chinh" disabled={hd.dang_chay}
              onClick={() => { void doi('da_xu_ly'); }}
            >
              Đã xử lý xong
            </button>
          </div>
        </>
      )}
    </HopThoai>
  );
}
