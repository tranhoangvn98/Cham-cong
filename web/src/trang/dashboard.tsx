import type { ReactNode } from 'react';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  DangTai, HopLoi, OSo, Trong, dung_nap, gio_ngan, ngay_gio, ngay_viet,
  phut_thanh_chu, thu_cua_ngay,
} from '../thanh_phan.tsx';

interface ThietBi {
  ten: string;
  serial: string;
  dang_online: boolean;
  thay_lan_cuoi: string | null;
}

interface Dashboard {
  ngay: string;
  tong_quan: {
    tong_nhan_vien: number;
    co_mat: number;
    di_muon: number;
    vang: number;
    nghi_phep: number;
    chua_quet_ra: number;
  };
  thiet_bi: ThietBi[];
  cho_duyet: { nghi_phep: number; giai_trinh: number; quet_mobile: number };
  bay_ngay: { ngay: string; co_mat: number; di_muon: number; vang: number; phut_ot: number }[];
  di_muon_hom_nay: { ho_ten: string; ma_nv: string; phut_muon: number; gio_vao: string | null }[];
}

export function TrangDashboard(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<Dashboard>('/api/dashboard');

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const t = du_lieu.tong_quan;
  const may_offline = du_lieu.thiet_bi.filter((m) => !m.dang_online);
  const tong_cho_duyet =
    du_lieu.cho_duyet.nghi_phep + du_lieu.cho_duyet.giai_trinh + du_lieu.cho_duyet.quet_mobile;

  // Truc y cua bieu do lay theo so nhan vien lon nhat trong 7 ngay.
  const cao_nhat = Math.max(
    1,
    ...du_lieu.bay_ngay.map((d) => Number(d.co_mat) + Number(d.vang)),
  );

  return (
    <>
      <div className="dau-trang">
        <div>
          <h1>Tổng quan hôm nay</h1>
          <p className="mo-ta">
            {thu_cua_ngay(du_lieu.ngay)}, {ngay_viet(du_lieu.ngay)}
          </p>
        </div>
      </div>

      {du_lieu.thiet_bi.length === 0 && (
        <div className="hop-thong-bao hop-luu-y">
          Chưa khai báo máy chấm công nào. Vào <LienKet den="/thiet-bi">Máy chấm công</LienKet> để
          khai báo serial máy — máy chưa khai báo sẽ bị hệ thống từ chối.
        </div>
      )}

      {may_offline.length > 0 && (
        <div className="hop-thong-bao hop-loi">
          <strong>{may_offline.length} máy đang mất kết nối:</strong>{' '}
          {may_offline.map((m) => m.ten).join(', ')}. Dữ liệu chấm công sẽ không về cho tới khi máy
          kết nối lại (máy vẫn lưu nội bộ và đẩy bù sau).
        </div>
      )}

      <div className="luoi luoi-4" style={{ marginBottom: 16 }}>
        <OSo nhan="Tổng nhân viên" gia_tri={t.tong_nhan_vien} />
        <OSo nhan="Có mặt" gia_tri={t.co_mat} mau="tot" />
        <OSo nhan="Đi muộn" gia_tri={t.di_muon} mau={Number(t.di_muon) > 0 ? 'canh_bao' : undefined} />
        <OSo nhan="Vắng" gia_tri={t.vang} mau={Number(t.vang) > 0 ? 'xau' : undefined} />
        <OSo nhan="Nghỉ phép" gia_tri={t.nghi_phep} mau="lanh" />
        <OSo
          nhan="Chưa quẹt ra"
          gia_tri={t.chua_quet_ra}
          phu="Còn trong giờ hoặc quên quẹt"
        />
      </div>

      {tong_cho_duyet > 0 && (
        <div className="the">
          <h2>Đang chờ bạn duyệt</h2>
          <div className="hang-nut">
            {du_lieu.cho_duyet.nghi_phep > 0 && (
              <LienKet den="/duyet-don" lop="nut">
                {du_lieu.cho_duyet.nghi_phep} đơn nghỉ phép
              </LienKet>
            )}
            {du_lieu.cho_duyet.giai_trinh > 0 && (
              <LienKet den="/duyet-don" lop="nut">
                {du_lieu.cho_duyet.giai_trinh} đơn giải trình
              </LienKet>
            )}
            {du_lieu.cho_duyet.quet_mobile > 0 && (
              <LienKet den="/duyet-don" lop="nut">
                {du_lieu.cho_duyet.quet_mobile} lần chấm công điện thoại
              </LienKet>
            )}
          </div>
        </div>
      )}

      <div className="luoi luoi-2">
        <div className="the">
          <h2>7 ngày gần nhất</h2>
          {du_lieu.bay_ngay.length === 0 ? (
            <Trong tieu_de="Chưa có dữ liệu" mo_ta="Bảng công sẽ xuất hiện khi máy đẩy log về." />
          ) : (
            <>
              <div className="bieu-do">
                {du_lieu.bay_ngay.map((d) => {
                  const co_mat = Number(d.co_mat);
                  const muon = Number(d.di_muon);
                  const vang = Number(d.vang);
                  // Cot 'co mat' tach rieng phan di muon de thay ngay ty le muon.
                  const dung_gio = Math.max(0, co_mat - muon);
                  const ty = (n: number): string => `${(n / cao_nhat) * 100}%`;
                  return (
                    <div className="cot-ngay" key={d.ngay} title={
                      `${ngay_viet(d.ngay)}: ${co_mat} có mặt (${muon} muộn), ${vang} vắng, `
                      + `OT ${phut_thanh_chu(Number(d.phut_ot))}`
                    }>
                      <div className="cot-chong">
                        {vang > 0 && <div className="cot cot-vang" style={{ height: ty(vang) }} />}
                        {muon > 0 && <div className="cot cot-muon" style={{ height: ty(muon) }} />}
                        {dung_gio > 0 && (
                          <div className="cot cot-co-mat" style={{ height: ty(dung_gio) }} />
                        )}
                      </div>
                      <div className="nhan-cot">{thu_cua_ngay(d.ngay)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="chu-giai">
                <span><i className="o-mau" style={{ background: 'var(--chinh)' }} /> Đúng giờ</span>
                <span><i className="o-mau" style={{ background: 'var(--canh-bao)' }} /> Đi muộn</span>
                <span><i className="o-mau" style={{ background: 'var(--xau)' }} /> Vắng</span>
              </div>
            </>
          )}
        </div>

        <div className="the">
          <h2>Máy chấm công</h2>
          {du_lieu.thiet_bi.length === 0 ? (
            <Trong tieu_de="Chưa có máy nào" />
          ) : (
            <div className="vo-bang">
              <table>
                <thead>
                  <tr>
                    <th>Máy</th>
                    <th>Trạng thái</th>
                    <th>Tín hiệu cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {du_lieu.thiet_bi.map((m) => (
                    <tr key={m.serial}>
                      <td>
                        {m.ten}
                        <div className="o-so-phu">{m.serial}</div>
                      </td>
                      <td className="khong-ngat">
                        <i className={`diem ${m.dang_online ? 'diem-tot' : 'diem-xau'}`} />
                        {m.dang_online ? 'Kết nối' : 'Mất kết nối'}
                      </td>
                      <td className="khong-ngat">{ngay_gio(m.thay_lan_cuoi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="the the-mong">
        <div style={{ padding: '16px 16px 0' }}>
          <h2>Đi muộn hôm nay</h2>
        </div>
        {du_lieu.di_muon_hom_nay.length === 0 ? (
          <Trong tieu_de="Không có ai đi muộn" mo_ta="Cả công ty đúng giờ hôm nay." />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Giờ vào</th>
                  <th className="canh-phai">Muộn</th>
                </tr>
              </thead>
              <tbody>
                {du_lieu.di_muon_hom_nay.map((n) => (
                  <tr key={n.ma_nv}>
                    <td className="so">{n.ma_nv}</td>
                    <td>{n.ho_ten}</td>
                    <td className="so">{gio_ngan(n.gio_vao)}</td>
                    <td className="canh-phai so" style={{ color: 'var(--canh-bao)', fontWeight: 600 }}>
                      {phut_thanh_chu(Number(n.phut_muon))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
