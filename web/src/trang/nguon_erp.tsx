// Cau hinh nguon du lieu ERP 1 cho module giam sat.
//
// TRANG NAY KHONG BAO GIO HIEN MAT KHAU, va cung khong co o nhap mat khau. Thong tin dang
// nhap nam trong bien moi truong (`ERP1_*` trong .env) — man hinh chi chon DATABASE nao ung
// voi ma nguon nao.
//
// VI SAO PHAI DO TIM thay vi go ten database: ten trong ma nguon ERP 1 la ten moi truong UAT
// (`cms_uat`, `xnk_debt_uat`...), chua chac la ten production. Doan sai thi phep do im lang
// tra 0 dong — kieu hong te nhat, vi no nhin y het "khong co canh bao nao".
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, Trong, XuongDanhSach, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

interface Nguon {
  id: string;
  ma: string;
  ten: string;
  ten_database: string | null;
  mo_ta: string | null;
  dang_bat: boolean;
  kiem_tra_luc: string | null;
  kiem_tra_ok: boolean | null;
  kiem_tra_thong_diep: string | null;
}

interface DsNguon {
  dang_bat: boolean;
  nguon: Nguon[];
  ma_hop_le: { ma: string; ten: string }[];
}

interface DatabaseTimDuoc {
  ten: string;
  kich_thuoc: string | null;
  ket_noi_duoc: boolean;
}

interface BangDoiChieu {
  nguon: string;
  bang: string;
  tinh_trang: 'ok' | 'thieu_bang' | 'thieu_cot' | 'khong_doc_duoc' | 'nguon_chua_cau_hinh';
  cot_thieu: string[];
  thong_diep: string | null;
  phep_do: string[];
  dang_dung: boolean;
}

const TEN_TINH_TRANG: Record<BangDoiChieu['tinh_trang'], string> = {
  ok: 'Khớp',
  thieu_cot: 'Thiếu cột',
  thieu_bang: 'Thiếu bảng',
  khong_doc_duoc: 'Không đọc được',
  nguon_chua_cau_hinh: 'Chưa cấu hình',
};

export function TrangNguonErp(): ReactNode {
  const ds = dung_nap<DsNguon>('/api/giam-sat/nguon');
  const hd = dung_hanh_dong();
  const [tim_duoc, dat_tim_duoc] = useState<DatabaseTimDuoc[] | null>(null);
  const [doi_chieu, dat_doi_chieu] = useState<{
    bang: BangDoiChieu[]; so_khop: number; so_bang: number; co_van_de_chan: boolean;
  } | null>(null);

  async function do_tim(): Promise<void> {
    await hd.chay(async () => {
      const r = await goi<{ database: DatabaseTimDuoc[] }>(
        '/api/giam-sat/nguon/do-tim', { method: 'POST' });
      dat_tim_duoc(r.database);
    });
  }

  async function chon(n: Nguon, ten_database: string): Promise<void> {
    await hd.chay(async () => {
      await goi(`/api/giam-sat/nguon/${n.id}`, {
        method: 'POST',
        body: { ten_database, dang_bat: ten_database !== '' },
      });
      ds.nap_lai();
    });
  }

  async function kiem_tra(n: Nguon): Promise<void> {
    await hd.chay(async () => {
      await goi(`/api/giam-sat/nguon/${n.id}/kiem-tra`, { method: 'POST' });
      ds.nap_lai();
    });
  }

  async function chay_doi_chieu(): Promise<void> {
    await hd.chay(async () => {
      const r = await goi<{
        bang: BangDoiChieu[]; so_khop: number; so_bang: number; co_van_de_chan: boolean;
      }>('/api/giam-sat/doi-chieu-schema');
      dat_doi_chieu(r);
    });
  }

  return (
    <>
      <p className="goi-y">
        Module giám sát đọc dữ liệu ERP 1 ở chế độ <strong>chỉ đọc</strong> và không bao giờ
        ghi sang đó. Thông tin đăng nhập nằm trong biến môi trường <code>ERP1_*</code> của
        máy chủ, không lưu trong cơ sở dữ liệu và không hiển thị ở đây.
      </p>

      {ds.loi !== null && <HopLoi loi={ds.loi} />}
      {ds.dang_tai && <XuongDanhSach />}

      {ds.du_lieu !== null && !ds.du_lieu.dang_bat && (
        <div className="hop-loi">
          Chưa khai <code>ERP1_HOST</code>, <code>ERP1_USER</code> và
          {' '}<code>ERP1_PASSWORD</code> trong tệp <code>.env</code> của máy chủ.
          Khai xong phải khởi động lại máy chủ thì thay đổi mới có hiệu lực.
        </div>
      )}

      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      {ds.du_lieu !== null && ds.du_lieu.dang_bat && (
        <div className="dau-trang">
          <div className="hang-nut">
            <button
              type="button" className="nut-chinh" disabled={hd.dang_chay}
              onClick={() => { void do_tim(); }}
            >
              Dò tìm database
            </button>
            <button
              type="button" className="nut-light" disabled={hd.dang_chay}
              onClick={() => { void chay_doi_chieu(); }}
            >
              Đối chiếu schema
            </button>
          </div>
        </div>
      )}

      {hd.dang_chay && <DangTai chu="Đang hỏi máy chủ ERP 1…" />}

      {tim_duoc !== null && (
        <div className="the">
          <h3>Database tìm thấy trên máy chủ ERP 1</h3>
          {tim_duoc.length === 0
            ? <Trong tieu_de="Tài khoản này không thấy database nào." />
            : (
              <table className="bang-gon">
                <tbody>
                  {tim_duoc.map((d) => (
                    <tr key={d.ten}>
                      <td>{d.ten}</td>
                      <td>{d.kich_thuoc ?? ''}</td>
                      <td>
                        {d.ket_noi_duoc
                          ? <span className="nhan-tot">kết nối được</span>
                          : <span className="nhan-mo">không có quyền</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          <p className="goi-y">
            Chọn database tương ứng cho từng nguồn ở bảng dưới.
          </p>
        </div>
      )}

      {ds.du_lieu !== null && (
        <div className="the the-mong">
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Mã nguồn</th><th>Nội dung</th><th>Database</th>
                  <th>Kiểm tra gần nhất</th><th />
                </tr>
              </thead>
              <tbody>
                {ds.du_lieu.nguon.map((n) => (
                  <tr key={n.id}>
                    <td className="chu-nho">{n.ma}</td>
                    <td>
                      {n.ten}
                      {n.mo_ta !== null && <div className="goi-y">{n.mo_ta}</div>}
                    </td>
                    <td>
                      {tim_duoc === null
                        ? (n.ten_database ?? <span className="chu-mo">chưa chọn</span>)
                        : (
                          <select
                            className="o-nhap" value={n.ten_database ?? ''}
                            disabled={hd.dang_chay}
                            onChange={(e) => { void chon(n, e.target.value); }}
                          >
                            <option value="">— chưa chọn —</option>
                            {tim_duoc.filter((d) => d.ket_noi_duoc).map((d) => (
                              <option key={d.ten} value={d.ten}>{d.ten}</option>
                            ))}
                          </select>
                        )}
                    </td>
                    <td className="chu-nho">
                      {n.kiem_tra_luc === null
                        ? <span className="chu-mo">chưa kiểm tra</span>
                        : (
                          <>
                            <span className={n.kiem_tra_ok === true ? 'nhan-tot' : 'nhan-xau'}>
                              {n.kiem_tra_ok === true ? 'OK' : 'Lỗi'}
                            </span>
                            {' '}{ngay_gio(n.kiem_tra_luc)}
                            {n.kiem_tra_thong_diep !== null && (
                              <div className="goi-y">{n.kiem_tra_thong_diep}</div>
                            )}
                          </>
                        )}
                    </td>
                    <td>
                      <button
                        type="button" className="nut-nho" disabled={hd.dang_chay}
                        onClick={() => { void kiem_tra(n); }}
                      >
                        Kiểm tra
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {doi_chieu !== null && (
        <div className="the">
          <h3>Đối chiếu schema ERP 1</h3>
          <p className="goi-y">
            Câu lệnh của phép đo viết theo schema suy ra từ mã nguồn ERP 1. Nếu bảng hoặc cột
            bên đó đã đổi, truy vấn sẽ trả 0 dòng mà <strong>không báo lỗi</strong> — nhìn y
            hệt “không có cảnh báo nào”. Bảng dưới đây biến sự im lặng đó thành báo cáo đọc
            được.
          </p>

          {doi_chieu.co_van_de_chan
            ? (
              <div className="hop-loi">
                Có phép đo <strong>đang bật</strong> trỏ tới bảng hoặc cột không tồn tại.
                Phép đo đó hiện không bắt được gì. Hãy sửa hoặc tắt điều kiện tương ứng.
              </div>
            )
            : <HopTot chu={`${doi_chieu.so_khop}/${doi_chieu.so_bang} bảng khớp. Không phép đo đang bật nào bị ảnh hưởng.`} />}

          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Nguồn</th><th>Bảng</th><th>Tình trạng</th>
                  <th>Cột thiếu</th><th>Đang dùng</th>
                </tr>
              </thead>
              <tbody>
                {doi_chieu.bang.map((b) => (
                  <tr key={`${b.nguon}-${b.bang}`}>
                    <td className="chu-nho">{b.nguon}</td>
                    <td className="chu-nho">{b.bang}</td>
                    <td>
                      <span className={b.tinh_trang === 'ok' ? 'nhan-tot'
                        : b.dang_dung ? 'nhan-xau' : 'nhan-mo'}
                      >
                        {TEN_TINH_TRANG[b.tinh_trang]}
                      </span>
                      {b.thong_diep !== null && <div className="goi-y">{b.thong_diep}</div>}
                    </td>
                    <td className="chu-nho">{b.cot_thieu.join(', ')}</td>
                    <td>
                      {b.dang_dung
                        ? <span className="nhan-cot">có phép đo đang bật</span>
                        : <span className="chu-mo">không</span>}
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
