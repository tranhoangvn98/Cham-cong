// Tong hop QUAN LY NGAY PHEP tung nhan vien trong mot nam.
//
// Quy phep nam tinh theo Luat Lao dong (Dieu 113): chia theo so thang lam trong nam. Bang hien
// muc phep nam (HR dat), so thang lam, quy theo luat, so da nghi (da duyet), so dang cho duyet,
// va con lai — de Nhan su/Truong phong quan ly phep cua tung nguoi.
import { useState, type ReactNode } from 'react';
import { DangTai, HopLoi, Trong, dung_nap } from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';

interface Dong {
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

export function TrangQuanLyPhep(): ReactNode {
  const nam_nay = new Date().getFullYear();
  const [nam, dat_nam] = useState(nam_nay);
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
    </>
  );
}
