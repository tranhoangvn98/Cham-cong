// Bang truy xuat tep dinh kem: tep nao dang nam o dau tren dia.
//
// CSDL chi giu sieu du lieu, ban goc nam tren dia. Hai ben lech nhau — sao luu thieu, phuc
// hoi nham thu muc, ai do xoa tay — thi phai tra ra duoc cho lech, va muon tra thi truoc het
// phai NHIN THAY duong dan da luu. Man hinh nay de lam viec do.
import { useState, type ReactNode } from 'react';
import {
  DangTai, HopLoi, HopThoaiXemTep, Trong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';

interface DongTep {
  id: string;
  nhom: string;
  ten_goc: string;
  /** Duong dan tuong doi tren dia, dang 'YYYY-MM/<uuid>.<duoi>'. */
  ten_luu: string;
  kieu_mime: string;
  kich_thuoc: number;
  tao_luc: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  tai_len_boi: string | null;
}

interface KetQuaKho {
  danh_sach: DongTep[];
  tong: { so: number; byte: string };
  /** Thu muc goc tren may chu — phan dung truoc `ten_luu`. */
  thu_muc_goc: string;
}

const TEN_NHOM_TEP: Record<string, string> = {
  hop_dong: 'Hợp đồng',
  bien_ban: 'Biên bản',
  luong: 'Lương',
  cong_viec: 'Công việc',
  bao_cao: 'Báo cáo',
  khieu_nai: 'Khiếu nại',
  thiet_bi: 'Thiết bị',
  tai_lieu: 'Hồ sơ tài liệu',
  khac: 'Khác',
};

function co_gon(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

export function TrangKhoTep(): ReactNode {
  const [nhom, dat_nhom] = useState('');
  const [dang_xem, dat_dang_xem] = useState<DongTep | null>(null);

  const duong = `/api/ho-so/tep?gioi_han=200${nhom === '' ? '' : `&nhom=${nhom}`}`;
  const { du_lieu, dang_tai, loi } = dung_nap<KetQuaKho>(duong, [nhom]);

  const ds = du_lieu?.danh_sach ?? [];

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Mỗi tệp lưu thành một file trên đĩa máy chủ; cơ sở dữ liệu chỉ giữ đường dẫn và
            thông tin đi kèm. Bảng này để đối chiếu hai bên khi sao lưu hoặc phục hồi.
          </p>
        </div>
      </div>

      {du_lieu !== null && (
        <div className="luoi luoi-4" style={{ marginBottom: 16 }}>
          <div className="o-so">
            <div className="o-so-nhan">Số tệp</div>
            <div className="o-so-gia-tri">{du_lieu.tong.so}</div>
          </div>
          <div className="o-so">
            <div className="o-so-nhan">Tổng dung lượng</div>
            <div className="o-so-gia-tri">{co_gon(Number(du_lieu.tong.byte))}</div>
          </div>
          <div className="o-so" style={{ gridColumn: 'span 2' }}>
            <div className="o-so-nhan">Thư mục gốc trên máy chủ</div>
            <div className="so" style={{ fontSize: 13, marginTop: 4, wordBreak: 'break-all' }}>
              {du_lieu.thu_muc_goc}
            </div>
            <div className="o-so-phu">
              Trong Docker đây là volume <strong>ho_so</strong> — mất volume là mất bản gốc.
            </div>
          </div>
        </div>
      )}

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="ln">Nhóm hồ sơ</label>
          <select id="ln" value={nhom} onChange={(e) => dat_nhom(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(TEN_NHOM_TEP).map(([ma, ten]) => (
              <option key={ma} value={ma}>{ten}</option>
            ))}
          </select>
        </div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : ds.length === 0 ? (
          <Trong
            tieu_de="Chưa có tệp nào"
            mo_ta="Tệp đính kèm trong hồ sơ nhân sự sẽ hiện ở đây."
          />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Tệp</th>
                  <th>Nhân viên</th>
                  <th>Nhóm</th>
                  <th>Đường dẫn đã lưu</th>
                  <th className="canh-phai">Dung lượng</th>
                  <th>Tải lên</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ds.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.ten_goc}</strong></td>
                    <td>
                      <LienKet den={`/nhan-vien/${t.nhan_vien_id}`}>{t.ho_ten}</LienKet>
                      <div className="o-so-phu">{t.ma_nv}</div>
                    </td>
                    <td>{TEN_NHOM_TEP[t.nhom] ?? t.nhom}</td>
                    <td className="so" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                      {t.ten_luu}
                    </td>
                    <td className="canh-phai so">{co_gon(t.kich_thuoc)}</td>
                    <td style={{ fontSize: 12 }}>
                      <div className="khong-ngat">{ngay_gio(t.tao_luc)}</div>
                      <div className="o-so-phu">{t.tai_len_boi ?? '—'}</div>
                    </td>
                    <td>
                      <button className="nut-nho nut-phang" onClick={() => dat_dang_xem(t)}>
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dang_xem !== null && (
        <HopThoaiXemTep
          tep_id={dang_xem.id}
          ten_goc={dang_xem.ten_goc}
          khi_dong={() => dat_dang_xem(null)}
        />
      )}
    </>
  );
}
