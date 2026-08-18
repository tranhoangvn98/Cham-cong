// Trang Tong quan. Noi dung PHU THUOC VAI TRO cua nguoi dang xem.
//
// Truoc ban nay, moi nguoi dang nhap deu thay cung mot trang: so lieu toan cong ty, va
// danh sach dich danh muoi nguoi di muon hom nay kem so phut. Ke ca mot tai khoan nhan
// vien binh thuong.
//
// May chu la NGUON SU THAT: nhung lop nguoi xem khong duoc phep se KHONG CO trong payload.
// O day chi ve theo nhung gi nhan duoc — khong tu suy quyen tu vai tro, vi suy o hai noi
// thi som muon hai noi lech nhau, va cai lech nguy hiem la ben giao dien "de" hon.
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

interface TinhHinhNgay {
  tong_nhan_vien: number;
  co_mat: number;
  di_muon: number;
  vang: number;
  nghi_phep: number;
  chua_quet_ra: number;
}

interface DiMuon {
  ma_nv: string;
  ho_ten: string;
  phut_muon: number;
  gio_vao: string | null;
}

interface NgayBieuDo {
  ngay: string;
  co_mat: number;
  di_muon: number;
  vang: number;
  phut_ot: number;
}

interface CongCuaToi {
  hom_nay: {
    trang_thai: string;
    gio_vao: string | null;
    gio_ra: string | null;
    phut_muon: number;
    phut_ot: number;
  } | null;
  thang: {
    thang: string;
    so_cong: number;
    ngay_di_muon: number;
    ngay_vang: number;
    phut_ot: number;
    phut_muon: number;
  };
  phep: { quy: number; da_dung: number; con_lai: number; cho_duyet: number };
  don_cua_toi_cho_duyet: number;
}

interface PhongCuaToi {
  phong_ban_id: string;
  ten_phong: string;
  tinh_hinh: TinhHinhNgay;
  di_muon_hom_nay: DiMuon[];
  cho_toi_duyet: number;
}

interface CongTy {
  tinh_hinh: TinhHinhNgay;
  di_muon_hom_nay: DiMuon[];
  cho_duyet: { nghi_phep: number; giai_trinh: number; quet_mobile: number };
  bay_ngay: NgayBieuDo[];
}

interface ViecNhanSu {
  hop_dong_het_han: number;
  hop_dong_sap_het_han: number;
  sap_het_han: {
    nhan_vien_id: string; ma_nv: string; ho_ten: string; so_hd: string | null;
    hieu_luc_den: string; so_ngay_con: number; muc_gap: string;
  }[];
  thieu_email: number;
  chua_gan_pin: number;
  chua_co_phong_ban: number;
  thieu_tai_lieu: number;
}

interface HeThong {
  thiet_bi: ThietBi[];
  erp_da_noi: number;
  erp_da_cau_hinh: boolean;
}

interface Dashboard {
  ngay: string;
  vai_tro: string;
  toi: CongCuaToi | null;
  phong: PhongCuaToi | null;
  cong_ty: CongTy | null;
  nhan_su: ViecNhanSu | null;
  he_thong: HeThong | null;
}

const TEN_TRANG_THAI: Record<string, string> = {
  co_mat: 'Có mặt',
  vang: 'Vắng',
  nghi_phep: 'Nghỉ phép',
  ngay_le: 'Ngày lễ',
  nghi_tuan: 'Nghỉ tuần',
};

export function TrangDashboard(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<Dashboard>('/api/dashboard');

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            {thu_cua_ngay(du_lieu.ngay)}, {ngay_viet(du_lieu.ngay)}
          </p>
        </div>
      </div>

      {/* Khong lop nao => tai khoan chua duoc gan ho so va chua co quyen gi. Noi ro thay vi
          de mot trang trong — trang trong lam nguoi ta tuong he thong hong. */}
      {du_lieu.toi === null && du_lieu.phong === null && du_lieu.cong_ty === null && (
        <Trong
          tieu_de="Tài khoản chưa nối với hồ sơ nhân viên"
          mo_ta="Nhờ nhân sự gán tài khoản này vào hồ sơ của bạn thì công của bạn mới hiện ra ở đây."
        />
      )}

      {du_lieu.toi !== null && <KhoiCuaToi toi={du_lieu.toi} />}
      {du_lieu.nhan_su !== null && <KhoiNhanSu ns={du_lieu.nhan_su} />}
      {du_lieu.phong !== null && <KhoiPhong phong={du_lieu.phong} />}
      {du_lieu.cong_ty !== null && <KhoiCongTy ct={du_lieu.cong_ty} />}
      {du_lieu.he_thong !== null && <KhoiHeThong ht={du_lieu.he_thong} />}
    </>
  );
}

// ==================================================================== của tôi

function KhoiCuaToi({ toi }: { toi: CongCuaToi }): ReactNode {
  const h = toi.hom_nay;
  return (
    <div className="the">
      <h2>Của tôi</h2>

      <div className="luoi luoi-4">
        <OSo
          nhan="Hôm nay"
          gia_tri={h === null ? '—' : TEN_TRANG_THAI[h.trang_thai] ?? h.trang_thai}
          phu={h === null
            ? 'chưa có dữ liệu chấm công'
            : `${gio_ngan(h.gio_vao)} → ${h.gio_ra === h.gio_vao ? 'chưa quẹt ra' : gio_ngan(h.gio_ra)}`}
          mau={h === null ? undefined
            : h.trang_thai === 'vang' ? 'xau'
              : h.phut_muon > 0 ? 'canh_bao' : 'tot'}
        />
        <OSo
          nhan={`Công tháng ${toi.thang.thang.slice(5)}`}
          gia_tri={toi.thang.so_cong}
          phu={`${String(toi.thang.ngay_di_muon)} ngày muộn · ${String(toi.thang.ngay_vang)} ngày vắng`}
        />
        <OSo
          nhan="Phép năm còn lại"
          gia_tri={toi.phep.con_lai}
          phu={`đã dùng ${String(toi.phep.da_dung)}/${String(toi.phep.quy)} ngày`}
          mau={toi.phep.con_lai <= 0 ? 'canh_bao' : undefined}
        />
        <OSo
          nhan="OT tháng này"
          gia_tri={phut_thanh_chu(toi.thang.phut_ot)}
          phu={toi.thang.phut_muon > 0
            ? `đi muộn tổng ${phut_thanh_chu(toi.thang.phut_muon)}`
            : 'không đi muộn ngày nào'}
        />
      </div>

      {(toi.don_cua_toi_cho_duyet > 0 || toi.phep.cho_duyet > 0) && (
        <p className="mo-ta" style={{ marginTop: 12 }}>
          Bạn có <strong>{toi.don_cua_toi_cho_duyet}</strong> đơn đang chờ duyệt
          {toi.phep.cho_duyet > 0 && (
            <> (trong đó <strong>{toi.phep.cho_duyet}</strong> ngày phép chưa trừ vào quỹ)</>
          )}.
        </p>
      )}
    </div>
  );
}

// ==================================================================== phòng của tôi

function KhoiPhong({ phong }: { phong: PhongCuaToi }): ReactNode {
  return (
    <>
      <div className="the">
        <h2>Phòng {phong.ten_phong} — hôm nay</h2>
        <ONgay t={phong.tinh_hinh} />
        {phong.cho_toi_duyet > 0 && (
          <div className="hang-nut" style={{ marginTop: 12 }}>
            <LienKet den="/duyet-don" lop="nut nut-chinh">
              {phong.cho_toi_duyet} đơn đang chờ bạn duyệt
            </LienKet>
          </div>
        )}
      </div>

      <BangDiMuon
        ds={phong.di_muon_hom_nay}
        tieu_de={`Đi muộn hôm nay — phòng ${phong.ten_phong}`}
        khi_trong="Cả phòng đúng giờ hôm nay."
      />
    </>
  );
}

// ==================================================================== toàn công ty

function KhoiCongTy({ ct }: { ct: CongTy }): ReactNode {
  const tong_cho_duyet =
    ct.cho_duyet.nghi_phep + ct.cho_duyet.giai_trinh + ct.cho_duyet.quet_mobile;

  // Truc y cua bieu do lay theo so nhan vien lon nhat trong 7 ngay.
  const cao_nhat = Math.max(1, ...ct.bay_ngay.map((d) => Number(d.co_mat) + Number(d.vang)));

  return (
    <>
      <div className="the">
        <h2>Toàn công ty — hôm nay</h2>
        <ONgay t={ct.tinh_hinh} />
      </div>

      {tong_cho_duyet > 0 && (
        <div className="the">
          <h2>Đang chờ duyệt</h2>
          <div className="hang-nut">
            {ct.cho_duyet.nghi_phep > 0 && (
              <LienKet den="/duyet-don" lop="nut">
                {ct.cho_duyet.nghi_phep} đơn nghỉ phép
              </LienKet>
            )}
            {ct.cho_duyet.giai_trinh > 0 && (
              <LienKet den="/duyet-don" lop="nut">
                {ct.cho_duyet.giai_trinh} đơn giải trình
              </LienKet>
            )}
            {ct.cho_duyet.quet_mobile > 0 && (
              <LienKet den="/duyet-don" lop="nut">
                {ct.cho_duyet.quet_mobile} lần chấm công điện thoại
              </LienKet>
            )}
          </div>
        </div>
      )}

      <div className="the">
        <h2>7 ngày gần nhất</h2>
        {ct.bay_ngay.length === 0 ? (
          <Trong tieu_de="Chưa có dữ liệu" mo_ta="Bảng công sẽ xuất hiện khi máy đẩy log về." />
        ) : (
          <>
            <div className="bieu-do">
              {ct.bay_ngay.map((d) => {
                const co_mat = Number(d.co_mat);
                const muon = Number(d.di_muon);
                const vang = Number(d.vang);
                // Cot 'co mat' tach rieng phan di muon de thay ngay ty le muon.
                const dung_gio = Math.max(0, co_mat - muon);
                const ty = (n: number): string => `${(n / cao_nhat) * 100}%`;
                return (
                  <div className="cot-ngay" key={d.ngay} title={
                    `${ngay_viet(d.ngay)}: ${String(co_mat)} có mặt (${String(muon)} muộn), `
                    + `${String(vang)} vắng, OT ${phut_thanh_chu(Number(d.phut_ot))}`
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

      <BangDiMuon
        ds={ct.di_muon_hom_nay}
        tieu_de="Đi muộn hôm nay"
        khi_trong="Cả công ty đúng giờ hôm nay."
      />
    </>
  );
}

// ==================================================================== việc của nhân sự

function KhoiNhanSu({ ns }: { ns: ViecNhanSu }): ReactNode {
  // Nhung con so nay deu la HO SO CHUA XONG, khong phai so lieu de ngam. Moi cai deu co
  // mot nguoi that dang bi anh huong — nen dat truoc bao cao cham cong.
  const co_viec = ns.hop_dong_het_han > 0 || ns.chua_gan_pin > 0
    || ns.thieu_email > 0 || ns.thieu_tai_lieu > 0 || ns.chua_co_phong_ban > 0
    || ns.hop_dong_sap_het_han > 0;

  return (
    <div className="the">
      <h2>Việc của nhân sự</h2>

      {!co_viec ? (
        <Trong tieu_de="Không có việc nào tồn" mo_ta="Hồ sơ đầy đủ, hợp đồng còn hạn." />
      ) : (
        <div className="luoi luoi-4">
          {ns.hop_dong_het_han > 0 && (
            <OSo
              nhan="Hợp đồng ĐÃ hết hạn"
              gia_tri={ns.hop_dong_het_han}
              phu="quá 30 ngày là tự thành không xác định thời hạn"
              mau="xau"
            />
          )}
          {ns.hop_dong_sap_het_han > 0 && (
            <OSo
              nhan="Hợp đồng sắp hết hạn"
              gia_tri={ns.hop_dong_sap_het_han}
              phu="trong 45 ngày tới"
              mau="canh_bao"
            />
          )}
          {ns.chua_gan_pin > 0 && (
            <OSo
              nhan="Chưa gán PIN máy"
              gia_tri={ns.chua_gan_pin}
              phu="những người này KHÔNG chấm công được"
              mau="xau"
            />
          )}
          {ns.thieu_email > 0 && (
            <OSo
              nhan="Chưa có email"
              gia_tri={ns.thieu_email}
              phu="không đăng nhập Microsoft được"
              mau="canh_bao"
            />
          )}
          {ns.chua_co_phong_ban > 0 && (
            <OSo
              nhan="Chưa có phòng ban"
              gia_tri={ns.chua_co_phong_ban}
              phu="không ai duyệt đơn cho họ"
              mau="canh_bao"
            />
          )}
          {ns.thieu_tai_lieu > 0 && (
            <OSo
              nhan="Hồ sơ thiếu giấy tờ"
              gia_tri={ns.thieu_tai_lieu}
              phu="người còn thiếu tài liệu bắt buộc"
              mau="canh_bao"
            />
          )}
        </div>
      )}

      {ns.sap_het_han.length > 0 && (
        <>
          <h3>Hợp đồng cần xử lý</h3>
          <div className="vo-bang">
            <table className="bang-gon">
              <thead>
                <tr><th>Nhân viên</th><th>Số HĐ</th><th>Hết hạn</th><th>Còn lại</th></tr>
              </thead>
              <tbody>
                {ns.sap_het_han.map((h) => (
                  <tr key={`${h.nhan_vien_id}-${h.hieu_luc_den}`}>
                    <td>
                      <LienKet den={`/nhan-vien/${h.nhan_vien_id}`}>
                        <strong>{h.ma_nv}</strong> — {h.ho_ten}
                      </LienKet>
                    </td>
                    <td className="so">{h.so_hd ?? '—'}</td>
                    <td className="khong-ngat so">{ngay_viet(h.hieu_luc_den)}</td>
                    <td className="khong-ngat">
                      <span className={h.so_ngay_con < 0 || h.muc_gap === 'rat_gap' ? 'nhan-xau'
                        : h.muc_gap === 'gap' ? 'nhan-canh-bao' : 'nhan-mo'}>
                        {h.so_ngay_con < 0
                          ? `quá hạn ${String(-h.so_ngay_con)} ngày`
                          : h.so_ngay_con === 0 ? 'hết hạn hôm nay'
                            : `còn ${String(h.so_ngay_con)} ngày`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hang-nut">
            <LienKet den="/hop-dong" lop="nut">Xem tất cả hợp đồng</LienKet>
          </div>
        </>
      )}
    </div>
  );
}

// ==================================================================== hệ thống

function KhoiHeThong({ ht }: { ht: HeThong }): ReactNode {
  const may_offline = ht.thiet_bi.filter((m) => !m.dang_online);

  return (
    <>
      {ht.thiet_bi.length === 0 && (
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

      <div className="the">
        <h2>Hệ thống</h2>
        {ht.thiet_bi.length === 0 ? (
          <Trong tieu_de="Chưa có máy nào" />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr><th>Máy</th><th>Trạng thái</th><th>Tín hiệu cuối</th></tr>
              </thead>
              <tbody>
                {ht.thiet_bi.map((m) => (
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
        <p className="mo-ta">
          {ht.erp_da_cau_hinh
            ? <>Đồng bộ ERP đang bật — <strong>{ht.erp_da_noi}</strong> nhân viên đã nối với ERP.</>
            : <>Chưa cấu hình đồng bộ ERP.</>}
        </p>
      </div>
    </>
  );
}

// ==================================================================== dùng chung

function ONgay({ t }: { t: TinhHinhNgay }): ReactNode {
  return (
    <div className="luoi luoi-4">
      <OSo nhan="Tổng nhân viên" gia_tri={t.tong_nhan_vien} />
      <OSo nhan="Có mặt" gia_tri={t.co_mat} mau="tot" />
      <OSo nhan="Đi muộn" gia_tri={t.di_muon} mau={Number(t.di_muon) > 0 ? 'canh_bao' : undefined} />
      <OSo nhan="Vắng" gia_tri={t.vang} mau={Number(t.vang) > 0 ? 'xau' : undefined} />
      <OSo nhan="Nghỉ phép" gia_tri={t.nghi_phep} mau="lanh" />
      <OSo nhan="Chưa quẹt ra" gia_tri={t.chua_quet_ra} phu="Còn trong giờ hoặc quên quẹt" />
    </div>
  );
}

function BangDiMuon(
  { ds, tieu_de, khi_trong }: { ds: DiMuon[]; tieu_de: string; khi_trong: string },
): ReactNode {
  return (
    <div className="the the-mong">
      <div style={{ padding: '16px 16px 0' }}>
        <h2>{tieu_de}</h2>
      </div>
      {ds.length === 0 ? (
        <Trong tieu_de="Không có ai đi muộn" mo_ta={khi_trong} />
      ) : (
        <div className="vo-bang">
          <table>
            <thead>
              <tr>
                <th>Mã NV</th><th>Họ tên</th><th>Giờ vào</th>
                <th className="canh-phai">Muộn</th>
              </tr>
            </thead>
            <tbody>
              {ds.map((n) => (
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
  );
}
