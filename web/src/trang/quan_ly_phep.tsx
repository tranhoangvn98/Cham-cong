// Tong hop QUAN LY NGAY PHEP tung nhan vien trong mot nam.
//
// Quy phep nam tinh theo Luat Lao dong (Dieu 113): chia theo so thang lam trong nam. Bang hien
// muc phep nam (HR dat), so thang lam, quy theo luat, so da nghi (da duyet), so dang cho duyet,
// va con lai — de Nhan su/Truong phong quan ly phep cua tung nguoi.
import { useState, type ReactNode } from 'react';
import { DangTai, HopLoi, HopThoai, Trong, dung_nap } from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';

interface Dong {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  ngay_vao: string | null;
  so_ngay_phep_nam: number;
  so_thang: number;
  quy: number;
  da_dung: number;
  cho_duyet: number;
  con_lai: number;
}

interface KetQua {
  nam: number;
  dong: Dong[];
}

const so = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const TEN_TT_PHEP: Record<string, string> = {
  cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối', da_huy: 'Đã hủy',
};

interface LanPhep {
  id: string; tu_ngay: string; den_ngay: string; nua_ngay: boolean;
  trang_thai: string; ly_do: string | null; so_ngay: number;
}
interface ChiTietPhepData { nam: number; ma_nv: string; ho_ten: string; cac_lan: LanPhep[]; }

/** Modal "Chi tiet" — lich su tru phep nam cua MOT nguoi trong nam. */
function ChiTietPhep(
  { nhan_vien_id, ho_ten, nam, khi_dong }:
  { nhan_vien_id: string; ho_ten: string; nam: number; khi_dong: () => void },
): ReactNode {
  const ds = dung_nap<ChiTietPhepData>(
    `/api/duyet/nghi-phep/chi-tiet?nhan_vien_id=${nhan_vien_id}&nam=${nam}`,
  );
  const cac_lan = ds.du_lieu?.cac_lan ?? [];
  return (
    <HopThoai tieu_de={`Lịch sử trừ phép — ${ho_ten} (${nam})`} khi_dong={khi_dong} rong>
      {ds.dang_tai ? <DangTai /> : ds.loi !== null ? <HopLoi loi={ds.loi} />
        : cac_lan.length === 0 ? (
          <Trong tieu_de="Chưa dùng phép năm"
            mo_ta={`Trong năm ${String(nam)} người này chưa có đơn phép năm nào.`} />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Từ ngày</th><th>Đến ngày</th>
                  <th className="canh-phai">Số ngày</th><th>Trạng thái</th><th>Lý do</th>
                </tr>
              </thead>
              <tbody>
                {cac_lan.map((x) => (
                  <tr key={x.id}>
                    <td className="khong-ngat mo-ma">{x.tu_ngay}</td>
                    <td className="khong-ngat mo-ma">{x.den_ngay}</td>
                    <td className="canh-phai">{so(x.so_ngay)}{x.nua_ngay ? ' (½)' : ''}</td>
                    <td className="khong-ngat">{TEN_TT_PHEP[x.trang_thai] ?? x.trang_thai}</td>
                    <td>{x.ly_do ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </HopThoai>
  );
}

export function TrangQuanLyPhep(): ReactNode {
  const nam_nay = new Date().getFullYear();
  const [nam, dat_nam] = useState(nam_nay);
  const [chi_tiet, dat_chi_tiet] = useState<Dong | null>(null);
  const ds = dung_nap<KetQua>(`/api/duyet/nghi-phep/tong-hop?nam=${nam}`, [nam]);

  const cac_nam: number[] = [];
  for (let n = nam_nay + 1; n >= nam_nay - 3; n--) cac_nam.push(n);

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Tổng hợp ngày phép năm của từng nhân viên. Quỹ phép tính theo Luật Lao động (Điều 113):
          <strong> chia theo số tháng làm trong năm</strong>. <em>Còn lại</em> = quỹ − đã nghỉ
          (đơn phép năm đã duyệt); <em>chờ duyệt</em> chưa trừ vào còn lại.
        </p>
      </div>

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="nam">Năm</label>
          <select id="nam" value={nam} onChange={(e) => dat_nam(Number(e.target.value))}>
            {cac_nam.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {ds.dang_tai ? <DangTai /> : ds.loi !== null ? <HopLoi loi={ds.loi} />
        : ds.du_lieu === null || ds.du_lieu.dong.length === 0 ? (
          <Trong tieu_de="Chưa có dữ liệu phép"
            mo_ta="Không có nhân viên đang hoạt động nào trong phạm vi của bạn." />
        ) : (
          <div className="the the-mong">
            <div className="vo-bang">
              <table className="bang-neo-cot-dau">
                <thead>
                  <tr>
                    <th>Mã NV</th><th>Họ tên</th><th>Phòng ban</th><th>Ngày vào</th>
                    <th className="canh-phai">Mức phép/năm</th>
                    <th className="canh-phai">Tháng làm</th>
                    <th className="canh-phai">Quỹ (theo luật)</th>
                    <th className="canh-phai">Đã nghỉ</th>
                    <th className="canh-phai">Chờ duyệt</th>
                    <th className="canh-phai">Còn lại</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ds.du_lieu.dong.map((d) => (
                    <tr key={d.ma_nv}>
                      <td className="so mo-ma">{d.ma_nv}</td>
                      <td className="khong-ngat">{d.ho_ten}</td>
                      <td>{d.phong_ban ?? '—'}</td>
                      <td className="khong-ngat mo-ma">{d.ngay_vao ?? '—'}</td>
                      <td className="canh-phai">{so(d.so_ngay_phep_nam)}</td>
                      <td className="canh-phai">{d.so_thang}</td>
                      <td className="canh-phai">{so(d.quy)}</td>
                      <td className="canh-phai">{so(d.da_dung)}</td>
                      <td className="canh-phai">{d.cho_duyet > 0 ? so(d.cho_duyet) : '—'}</td>
                      <td className="canh-phai">
                        <strong className={d.con_lai < 0 ? 'chu-xau' : undefined}>
                          {so(d.con_lai)}
                        </strong>
                      </td>
                      <td className="canh-phai">
                        <button className="nut-phang" onClick={() => dat_chi_tiet(d)}>Chi tiết</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mo-ta" style={{ marginTop: 8 }}>
              <LienKet den="/duyet-don">Sang trang duyệt đơn →</LienKet>
            </p>
          </div>
        )}

      {chi_tiet !== null && (
        <ChiTietPhep
          nhan_vien_id={chi_tiet.id} ho_ten={chi_tiet.ho_ten} nam={nam}
          khi_dong={() => dat_chi_tiet(null)}
        />
      )}
    </>
  );
}
