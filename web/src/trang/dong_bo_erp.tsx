// Dong bo nguoi dung tu he thong ERP cu sang day, va noi voi Microsoft 365.
//
// Trang nay lam MOT viec quan trong ve mat thao tac: bat nguoi dung CHAY THU truoc. Dong
// bo tao va sua nhan vien hang loat — khong nen la thao tac lo tay mot cai la xong.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

interface Luot {
  id: string;
  thuc_the: string;
  che_do: 'thu' | 'that';
  so_doc: number;
  so_tao_moi: number;
  so_cap_nhat: number;
  so_bo_qua: number;
  so_loi: number;
  thong_diep: string | null;
  thanh_cong: boolean;
  bat_dau_luc: string;
  mili_giay: number | null;
}

interface TrangThai {
  da_cau_hinh: boolean;
  so_da_noi: number;
  lich_su: Luot[];
}

interface DongKetQua {
  erp_user_id: number | null;
  email: string | null;
  ho_ten: string | null;
  hanh_dong: 'tao_moi' | 'cap_nhat' | 'khong_doi' | 'bo_qua';
  ly_do?: string;
  thay_doi?: string[];
  /** Du lieu ERP co van de nhung khong chan dong bo — vi du ten nguoi trong o dien thoai. */
  canh_bao?: string;
}

interface KetQua {
  so_doc: number;
  so_tao_moi: number;
  so_cap_nhat: number;
  so_bo_qua: number;
  che_do: 'thu' | 'that';
  chi_tiet: DongKetQua[];
}

interface ThieuEmail {
  id: string;
  ma_nv: string;
  ho_ten: string;
  erp_user_id: number | null;
  so_dien_thoai: string | null;
}

const NHAN_HANH_DONG: Record<DongKetQua['hanh_dong'], string> = {
  tao_moi: 'Tạo mới',
  cap_nhat: 'Cập nhật',
  khong_doi: 'Không đổi',
  bo_qua: 'Bỏ qua',
};

const MAU_HANH_DONG: Record<DongKetQua['hanh_dong'], string> = {
  tao_moi: 'nhan-tot',
  cap_nhat: 'nhan-canh-bao',
  khong_doi: 'nhan-mo',
  bo_qua: 'nhan-xau',
};

const NHAN_TRUONG: Record<string, string> = {
  ho_ten: 'Họ tên',
  email: 'Email',
  so_dien_thoai: 'Điện thoại',
  erp_user_id: 'Mã ERP',
};

export function TrangDongBoErp(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<TrangThai>('/api/dong-bo-erp');
  const [kq, dat_kq] = useState<KetQua | null>(null);
  const [xem_thieu, dat_xem_thieu] = useState(false);
  const hd = dung_hanh_dong();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const tt = du_lieu ?? { da_cau_hinh: false, so_da_noi: 0, lich_su: [] };

  // `chay_lay` chu khong phai `chay`: ta CAN ket qua de ve bang. `chay` tra ve boolean, va
  // ep `true` thanh KetQua se lam trang trang khi doc `kq.chi_tiet`.
  const chay = (che_do: 'thu' | 'that') => () => {
    void hd.chay_lay<KetQua>(
      () => goi<KetQua>('/api/dong-bo-erp/nhan-vien', { method: 'POST', body: { che_do } }),
      che_do === 'thu' ? 'Đã chạy thử — chưa ghi gì.' : 'Đã đồng bộ.',
    ).then((r) => {
      if (r !== null) dat_kq(r);
      nap_lai();
    });
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Kéo danh sách người dùng từ hệ thống ERP cũ sang đây.
          </p>
        </div>
      </div>

      <div className="hop-luu-y">
        <strong>Email là khóa nối ba hệ thống.</strong> Đăng nhập Microsoft 365 tìm người
        theo <code>email</code> của nhân viên, nên đồng bộ đúng email là nhân viên đăng nhập
        được bằng tài khoản công ty ngay — không phải khai báo gì thêm. Bản ghi ERP{' '}
        <em>không có email</em> sẽ bị bỏ qua vì không nối được với M365.
      </div>

      {!tt.da_cau_hinh ? (
        <Trong
          tieu_de="Chưa cấu hình kết nối ERP"
          mo_ta="Khai ERP_API_URL và ERP_API_KEY trong .env rồi chạy lại docker compose up -d."
        />
      ) : (
        <>
          {hd.loi !== null && <HopLoi loi={hd.loi} />}

          <div className="ho-so-chi-so">
            <div className="o-so">
              <div className="o-so-nhan">Đã nối với ERP</div>
              <div className="o-so-gia-tri">{tt.so_da_noi}</div>
              <div className="o-so-phu">nhân viên</div>
            </div>
          </div>

          <div className="hang-nut">
            <button disabled={hd.dang_chay} onClick={chay('thu')}>Chạy thử</button>
            <button className="nut-phang" disabled={hd.dang_chay} onClick={chay('that')}>
              Đồng bộ thật
            </button>
            <button className="nut-phang" onClick={() => dat_xem_thieu(true)}>
              Ai chưa có email?
            </button>
          </div>
          <p className="mo-ta">
            <strong>Chạy thử</strong> đọc ERP và cho biết sẽ tạo/sửa ai, nhưng{' '}
            <em>không ghi gì</em>. Xem kỹ rồi mới bấm Đồng bộ thật.
          </p>

          {kq !== null && <BangKetQua kq={kq} />}

          <h3>Các lượt đã chạy</h3>
          {tt.lich_su.length === 0 ? (
            <Trong tieu_de="Chưa chạy lượt nào" />
          ) : (
            <div className="vo-bang">
              <table>
                <thead>
                  <tr>
                    <th>Lúc</th><th>Chế độ</th>
                    <th className="canh-phai">Đọc</th>
                    <th className="canh-phai">Tạo mới</th>
                    <th className="canh-phai">Cập nhật</th>
                    <th className="canh-phai">Bỏ qua</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {tt.lich_su.map((l) => (
                    <tr key={l.id}>
                      <td>{ngay_gio(l.bat_dau_luc)}</td>
                      <td>{l.che_do === 'thu' ? 'Chạy thử' : 'Thật'}</td>
                      <td className="canh-phai">{l.so_doc}</td>
                      <td className="canh-phai">{l.so_tao_moi}</td>
                      <td className="canh-phai">{l.so_cap_nhat}</td>
                      <td className="canh-phai">{l.so_bo_qua}</td>
                      <td>
                        {l.thanh_cong
                          ? <span className="nhan-tot">Xong</span>
                          : <span className="nhan-xau">Lỗi</span>}
                        {l.thong_diep !== null && <div className="mo-ta">{l.thong_diep}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {xem_thieu && <HopThoaiThieuEmail khi_dong={() => dat_xem_thieu(false)} />}
    </>
  );
}

function BangKetQua({ kq }: { kq: KetQua }): ReactNode {
  const [chi_hien, dat_chi_hien] = useState<DongKetQua['hanh_dong'] | ''>('');
  // `?? []` chu khong phai tin vao kieu: hong o day la TRANG TRANG giua luc nhan su vua bam
  // "Đồng bộ thật" va dang can biet no lam gi.
  const chi_tiet = kq.chi_tiet ?? [];
  const ds = chi_hien === '' ? chi_tiet : chi_tiet.filter((d) => d.hanh_dong === chi_hien);

  return (
    <div className="the">
      <h3>
        Kết quả {kq.che_do === 'thu' ? 'chạy thử' : 'đồng bộ'} — đọc {kq.so_doc} bản ghi
      </h3>
      {kq.che_do === 'thu' && (
        <p className="mo-ta">
          Đây là <strong>bản xem trước</strong>. Chưa có gì được ghi vào hệ thống.
        </p>
      )}

      <div className="hang-nut">
        <select value={chi_hien} onChange={(e) => dat_chi_hien(e.target.value as never)}>
          <option value="">Tất cả ({chi_tiet.length})</option>
          <option value="tao_moi">Tạo mới ({kq.so_tao_moi})</option>
          <option value="cap_nhat">Cập nhật ({kq.so_cap_nhat})</option>
          <option value="bo_qua">Bỏ qua ({kq.so_bo_qua})</option>
          <option value="khong_doi">Không đổi</option>
        </select>
      </div>

      <div className="vo-bang">
        <table className="bang-gon">
          <thead>
            <tr>
              <th>Mã ERP</th><th>Họ tên</th><th>Email</th><th>Việc</th><th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {ds.slice(0, 300).map((d, i) => (
              <tr key={`${String(d.erp_user_id)}-${i}`}>
                <td>{d.erp_user_id ?? '—'}</td>
                <td>{d.ho_ten ?? '—'}</td>
                <td>{d.email ?? <span className="nhan-xau">không có</span>}</td>
                <td>
                  <span className={MAU_HANH_DONG[d.hanh_dong]}>
                    {NHAN_HANH_DONG[d.hanh_dong]}
                  </span>
                </td>
                <td className="mo-ta">
                  {d.ly_do ?? (d.thay_doi ?? []).map((t) => NHAN_TRUONG[t] ?? t).join(', ')}
                  {d.canh_bao !== undefined && (
                    <div><span className="nhan-xau">⚠ {d.canh_bao}</span></div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ds.length > 300 && (
        <p className="mo-ta">Hiển thị 300 dòng đầu trong {ds.length} dòng.</p>
      )}
    </div>
  );
}

function HopThoaiThieuEmail({ khi_dong }: { khi_dong: () => void }): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<ThieuEmail[]>('/api/dong-bo-erp/thieu-email');

  return (
    <HopThoai tieu_de="Nhân viên chưa có email" khi_dong={khi_dong} rong>
      <p className="mo-ta">
        Những người này <strong>không đăng nhập bằng tài khoản Microsoft được</strong>, vì
        hệ thống tìm người theo email. Đây là thứ dễ bỏ sót nhất — không có gì báo lỗi cho
        tới khi chính họ thử đăng nhập.
      </p>
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} /> : (
        (du_lieu ?? []).length === 0
          ? <Trong tieu_de="Mọi nhân viên đang làm việc đều đã có email" />
          : (
            <table>
              <thead>
                <tr><th>Mã NV</th><th>Họ tên</th><th>Điện thoại</th><th>Mã ERP</th></tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((n) => (
                  <tr key={n.id}>
                    <td>{n.ma_nv}</td><td>{n.ho_ten}</td>
                    <td>{n.so_dien_thoai ?? '—'}</td>
                    <td>{n.erp_user_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      )}
    </HopThoai>
  );
}
