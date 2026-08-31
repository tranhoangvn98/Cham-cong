// Trang Tong quan. Noi dung PHU THUOC VAI TRO cua nguoi dang xem.
//
// Truoc ban nay, moi nguoi dang nhap deu thay cung mot trang: so lieu toan cong ty, va
// danh sach dich danh muoi nguoi di muon hom nay kem so phut. Ke ca mot tai khoan nhan
// vien binh thuong.
//
// May chu la NGUON SU THAT: nhung lop nguoi xem khong duoc phep se KHONG CO trong payload.
// O day chi ve theo nhung gi nhan duoc — khong tu suy quyen tu vai tro, vi suy o hai noi
// thi som muon hai noi lech nhau, va cai lech nguy hiem la ben giao dien "de" hon.
import { useState, type ReactNode } from 'react';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  DangTai, HopLoi, HopThoai, NhanNgay, OSo, Trong, dung_nap, gio_ngan, ngay_gio, ngay_viet,
  phut_thanh_chu, thu_cua_ngay,
  XuongDanhSach,
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
  /** So user trong máy bị lệch mapping (PIN thuộc người khác) hoặc chưa gán. */
  pin_lech: number;
}

interface DiemNongNguoi {
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  so_canh_bao: number;
  chua_xu_ly: number;
}

interface RaVaoHR {
  dang_trong: number;
  ve_som: number;
  tong_phut_ra_ngoai: number;
  so_nguoi_ra_ngoai: number;
  canh_bao_hom_nay: number;
  thang: string;
  canh_bao_thang: number;
  chua_xu_ly_thang: number;
  canh_bao_theo_loai: { ma_loi: string; so: number }[];
  top_nguoi: DiemNongNguoi[];
}

interface Dashboard {
  ngay: string;
  vai_tro: string;
  toi: CongCuaToi | null;
  phong: PhongCuaToi | null;
  cong_ty: CongTy | null;
  ra_vao: RaVaoHR | null;
  nhan_su: ViecNhanSu | null;
  he_thong: HeThong | null;
}

// Ten hien thi + muc do nghiem trong cua tung ma loi ra/vao. Xem may_chu/src/cong/ra_vao.ts.
const MA_LOI: Record<string, { ten: string; nang: boolean }> = {
  QUEN_QUET_RA:       { ten: 'Quên quẹt ra',        nang: true },
  CHI_MOT_LAN_QUET:   { ten: 'Chỉ 1 lần quẹt',      nang: true },
  QUEN_QUET_VAO:      { ten: 'Quên quẹt vào',       nang: false },
  VAO_KHI_DANG_TRONG: { ten: 'Vào khi đang trong',  nang: false },
  RA_KHI_DANG_NGOAI:  { ten: 'Ra khi đang ngoài',   nang: false },
};
const ten_loi = (ma: string): string => MA_LOI[ma]?.ten ?? ma;

const TEN_TRANG_THAI: Record<string, string> = {
  co_mat: 'Có mặt',
  vang: 'Vắng',
  nghi_phep: 'Nghỉ phép',
  ngay_le: 'Ngày lễ',
  nghi_tuan: 'Nghỉ tuần',
};

// ==================================================================== drill-down o so
type LoaiDs = 'tong' | 'co_mat' | 'di_muon' | 'vang' | 'nghi_phep' | 'chua_quet_ra';
const TEN_LOAI_DS: Record<LoaiDs, string> = {
  tong: 'Toàn bộ nhân viên', co_mat: 'Có mặt', di_muon: 'Đi muộn',
  vang: 'Vắng', nghi_phep: 'Nghỉ phép', chua_quet_ra: 'Chưa quẹt ra',
};
interface DongDs {
  nhan_vien_id: string; ma_nv: string; ho_ten: string; phong_ban: string | null;
  trang_thai: string | null; gio_vao: string | null; gio_ra: string | null; phut_muon: number;
}

/** O so bam duoc: bam ra danh sach nhan vien thuoc nhom do (mot ngay). */
function OSoBam(
  { nhan, gia_tri, phu, mau, loai, ngay }: {
    nhan: string; gia_tri: ReactNode; phu?: string;
    mau?: 'tot' | 'xau' | 'canh_bao' | 'lanh'; loai: LoaiDs; ngay: string;
  },
): ReactNode {
  const [mo, dat_mo] = useState(false);
  return (
    <>
      <OSo nhan={nhan} gia_tri={gia_tri} phu={phu} mau={mau} khi_bam={() => dat_mo(true)} />
      {mo && <HopThoaiDanhSach loai={loai} ngay={ngay} khi_dong={() => dat_mo(false)} />}
    </>
  );
}

function HopThoaiDanhSach(
  { loai, ngay, khi_dong }: { loai: LoaiDs; ngay: string; khi_dong: () => void },
): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<DongDs[]>(
    `/api/dashboard/danh-sach?loai=${loai}&ngay=${ngay}`, [loai, ngay]);
  const ds = du_lieu ?? [];

  return (
    <HopThoai tieu_de={`${TEN_LOAI_DS[loai]} — ${ngay_viet(ngay)}`} khi_dong={khi_dong} rong>
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : ds.length === 0 ? <Trong tieu_de="Không có ai trong nhóm này" />
          : (
            <>
              <p className="mo-ta" style={{ marginBottom: 10 }}>
                <strong>{ds.length}</strong> người. Bấm tên để mở hồ sơ.
              </p>
              <div className="vo-bang">
                <table className="bang-gon">
                  <thead>
                    <tr>
                      <th>Mã NV</th><th>Họ tên</th><th>Phòng ban</th><th>Trạng thái</th>
                      <th>Giờ vào</th><th>Giờ ra</th><th className="canh-phai">Muộn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ds.map((d) => (
                      <tr key={d.nhan_vien_id}>
                        <td className="so">{d.ma_nv}</td>
                        <td><LienKet den={`/nhan-vien/${d.nhan_vien_id}`}>{d.ho_ten}</LienKet></td>
                        <td>{d.phong_ban ?? '—'}</td>
                        <td className="khong-ngat">
                          {d.trang_thai === null
                            ? <span className="nhan-mo">chưa có công</span>
                            : <NhanNgay trang_thai={d.trang_thai} />}
                        </td>
                        <td className="so">{gio_ngan(d.gio_vao)}</td>
                        <td className="so">
                          {d.gio_ra === null || d.gio_ra === d.gio_vao ? '—' : gio_ngan(d.gio_ra)}
                        </td>
                        <td className="canh-phai so"
                          style={d.phut_muon > 0 ? { color: 'var(--canh-bao)', fontWeight: 600 } : undefined}>
                          {d.phut_muon > 0 ? phut_thanh_chu(d.phut_muon) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}

export function TrangDashboard(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<Dashboard>('/api/dashboard');

  if (dang_tai) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const dau_trang = (
    <div className="dau-trang">
      <div>
        <p className="mo-ta">
          {thu_cua_ngay(du_lieu.ngay)}, {ngay_viet(du_lieu.ngay)}
        </p>
      </div>
    </div>
  );

  // Khong lop nao => tai khoan chua duoc gan ho so va chua co quyen gi. Noi ro thay vi de mot
  // trang trong — trang trong lam nguoi ta tuong he thong hong.
  if (du_lieu.toi === null && du_lieu.phong === null && du_lieu.cong_ty === null) {
    return (
      <>
        {dau_trang}
        <Trong
          tieu_de="Tài khoản chưa nối với hồ sơ nhân viên"
          mo_ta="Nhờ nhân sự gán tài khoản này vào hồ sơ của bạn thì công của bạn mới hiện ra ở đây."
        />
      </>
    );
  }

  // Goc nhin NHAN SU: bo cuc bang dieu khien nhieu cot, lay tinh hinh ra/vao lam trong tam.
  // `bang-dieu-khien` cung noi rong vung noi dung de dung het man hinh 2K (xem kieu.css).
  if (du_lieu.cong_ty !== null) {
    return (
      <>
        {dau_trang}
        <div className="bang-dieu-khien">
          <TongQuanNgay ct={du_lieu.cong_ty} rv={du_lieu.ra_vao} ngay={du_lieu.ngay} />

          {du_lieu.ra_vao !== null && <DiemNongRaVao rv={du_lieu.ra_vao} />}

          <div className="luoi luoi-2">
            <BangDiMuon
              ds={du_lieu.cong_ty.di_muon_hom_nay}
              tieu_de="Đi muộn hôm nay"
              khi_trong="Cả công ty đúng giờ hôm nay."
            />
            <BieuDoBayNgay ct={du_lieu.cong_ty} />
          </div>

          <ChoDuyet ct={du_lieu.cong_ty} />

          {du_lieu.nhan_su !== null && <KhoiNhanSu ns={du_lieu.nhan_su} />}
          {du_lieu.he_thong !== null && <KhoiHeThong ht={du_lieu.he_thong} />}
          {du_lieu.toi !== null && <KhoiCuaToi toi={du_lieu.toi} />}
        </div>
      </>
    );
  }

  // Goc nhin nhan vien / truong phong: don gian, xep doc.
  return (
    <>
      {dau_trang}
      {du_lieu.toi !== null && <KhoiCuaToi toi={du_lieu.toi} />}
      {du_lieu.phong !== null && <KhoiPhong phong={du_lieu.phong} ngay={du_lieu.ngay} />}
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

function KhoiPhong({ phong, ngay }: { phong: PhongCuaToi; ngay: string }): ReactNode {
  return (
    <>
      <div className="the">
        <h2>Phòng {phong.ten_phong} — hôm nay</h2>
        <ONgay t={phong.tinh_hinh} ngay={ngay} />
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

// ==================================================================== toàn công ty (HR)

// Tong quan mot ngay: gop tinh hinh cham cong voi so lieu ra/vao van phong. Day la hang dau
// tien nhan su nhin thay, nen dat truoc het.
function TongQuanNgay(
  { ct, rv, ngay }: { ct: CongTy; rv: RaVaoHR | null; ngay: string },
): ReactNode {
  const t = ct.tinh_hinh;
  return (
    <div className="the">
      <h2>Toàn công ty — hôm nay</h2>
      <div className="luoi luoi-4">
        <OSoBam nhan="Tổng nhân viên" gia_tri={t.tong_nhan_vien} loai="tong" ngay={ngay} />
        {rv !== null && (
          <OSo nhan="Đang trong văn phòng" gia_tri={rv.dang_trong} mau="lanh"
            phu="chưa quẹt ra tính tới lúc này" />
        )}
        <OSoBam nhan="Có mặt" gia_tri={t.co_mat} mau="tot" loai="co_mat" ngay={ngay} />
        <OSoBam nhan="Đi muộn" gia_tri={t.di_muon}
          mau={Number(t.di_muon) > 0 ? 'canh_bao' : undefined} loai="di_muon" ngay={ngay} />
        {rv !== null && (
          <OSo nhan="Về sớm" gia_tri={rv.ve_som}
            mau={rv.ve_som > 0 ? 'canh_bao' : undefined} />
        )}
        <OSoBam nhan="Vắng" gia_tri={t.vang} mau={Number(t.vang) > 0 ? 'xau' : undefined}
          loai="vang" ngay={ngay} />
        <OSoBam nhan="Nghỉ phép" gia_tri={t.nghi_phep} mau="lanh" loai="nghi_phep" ngay={ngay} />
        {rv !== null && (
          <OSo nhan="Ra ngoài giờ làm" gia_tri={rv.so_nguoi_ra_ngoai}
            phu={rv.tong_phut_ra_ngoai > 0
              ? `tổng ${phut_thanh_chu(rv.tong_phut_ra_ngoai)}`
              : 'không ai ra ngoài'} />
        )}
        <OSoBam nhan="Chưa quẹt ra" gia_tri={t.chua_quet_ra} phu="còn trong giờ hoặc quên quẹt"
          loai="chua_quet_ra" ngay={ngay} />
      </div>
    </div>
  );
}

function BieuDoBayNgay({ ct }: { ct: CongTy }): ReactNode {
  const [hover, dat_hover] = useState<string | null>(null);
  // Truc y cua bieu do lay theo so nhan vien lon nhat trong 7 ngay.
  const cao_nhat = Math.max(1, ...ct.bay_ngay.map((d) => Number(d.co_mat) + Number(d.vang)));
  return (
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
                <div className="cot-ngay" key={d.ngay}
                  tabIndex={0}
                  onMouseEnter={() => dat_hover(d.ngay)}
                  onMouseLeave={() => dat_hover((cu) => (cu === d.ngay ? null : cu))}
                  onFocus={() => dat_hover(d.ngay)}
                  onBlur={() => dat_hover((cu) => (cu === d.ngay ? null : cu))}
                >
                  {hover === d.ngay && (
                    <div className="bieu-do-mach" role="tooltip">
                      <div className="bieu-do-mach-ngay">{ngay_viet(d.ngay)}</div>
                      <div><i className="o-mau" style={{ background: 'var(--chinh)' }} />
                        Đúng giờ: <strong>{dung_gio}</strong></div>
                      <div><i className="o-mau" style={{ background: 'var(--canh-bao)' }} />
                        Đi muộn: <strong>{muon}</strong></div>
                      <div><i className="o-mau" style={{ background: 'var(--xau)' }} />
                        Vắng: <strong>{vang}</strong></div>
                      <div className="bieu-do-mach-phu">OT {phut_thanh_chu(Number(d.phut_ot))}</div>
                    </div>
                  )}
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
  );
}

function ChoDuyet({ ct }: { ct: CongTy }): ReactNode {
  const tong = ct.cho_duyet.nghi_phep + ct.cho_duyet.giai_trinh + ct.cho_duyet.quet_mobile;
  return (
    <div className="the">
      <h2>Đang chờ duyệt</h2>
      {tong === 0 ? (
        <Trong tieu_de="Không có đơn nào chờ" mo_ta="Mọi đơn đã được xử lý." />
      ) : (
        <div className="hang-nut">
          {ct.cho_duyet.nghi_phep > 0 && (
            <LienKet den="/duyet-don" lop="nut">{ct.cho_duyet.nghi_phep} đơn nghỉ phép</LienKet>
          )}
          {ct.cho_duyet.giai_trinh > 0 && (
            <LienKet den="/duyet-don" lop="nut">{ct.cho_duyet.giai_trinh} đơn giải trình</LienKet>
          )}
          {ct.cho_duyet.quet_mobile > 0 && (
            <LienKet den="/duyet-don" lop="nut">
              {ct.cho_duyet.quet_mobile} lần chấm công điện thoại
            </LienKet>
          )}
        </div>
      )}
    </div>
  );
}

// ==================================================================== điểm nóng ra/vào

// TONG QUAN thoi: dashboard chi de biet "co diem nong nao can xu ly". Danh sach chi tiet + o
// giai trinh/xu ly nam o tab rieng /ra-vao.
function DiemNongRaVao({ rv }: { rv: RaVaoHR }): ReactNode {
  return (
    <div className="the">
      <div className="dau-khoi">
        <h2>Điểm nóng ra/vào — tháng {rv.thang.slice(5)}</h2>
        <LienKet den="/ra-vao" lop="nut nut-nho">Mở tab xử lý →</LienKet>
      </div>

      <div className="luoi luoi-4">
        <OSo nhan="Cảnh báo trong tháng" gia_tri={rv.canh_bao_thang}
          mau={rv.canh_bao_thang > 0 ? 'canh_bao' : undefined} />
        <OSo nhan="Chưa xử lý" gia_tri={rv.chua_xu_ly_thang}
          phu="cần HR nhắc nhở / kỷ luật"
          mau={rv.chua_xu_ly_thang > 0 ? 'xau' : 'tot'} />
        <OSo nhan="Cảnh báo hôm nay" gia_tri={rv.canh_bao_hom_nay}
          mau={rv.canh_bao_hom_nay > 0 ? 'canh_bao' : undefined} />
        <OSo nhan="Theo loại"
          gia_tri={rv.canh_bao_theo_loai.length === 0 ? '—' : rv.canh_bao_theo_loai[0]!.so}
          phu={rv.canh_bao_theo_loai.length === 0 ? 'không có'
            : `${ten_loi(rv.canh_bao_theo_loai[0]!.ma_loi)} nhiều nhất`} />
      </div>

      {rv.top_nguoi.length === 0 ? (
        <Trong tieu_de="Không có điểm nóng" mo_ta="Tháng này chưa ai bị cảnh báo ra/vào." />
      ) : (
        <>
          <h3>Người bị cảnh báo nhiều nhất tháng</h3>
          <div className="vo-bang">
            <table className="bang-gon">
              <thead>
                <tr>
                  <th>Mã NV</th><th>Họ tên</th><th>Phòng ban</th>
                  <th className="canh-phai">Cảnh báo</th><th className="canh-phai">Chưa xử lý</th>
                </tr>
              </thead>
              <tbody>
                {rv.top_nguoi.map((n) => (
                  <tr key={n.nhan_vien_id}>
                    <td className="so">{n.ma_nv}</td>
                    <td><LienKet den={`/nhan-vien/${n.nhan_vien_id}`}>{n.ho_ten}</LienKet></td>
                    <td>{n.phong_ban ?? '—'}</td>
                    <td className="canh-phai so">{n.so_canh_bao}</td>
                    <td className="canh-phai so">
                      {n.chua_xu_ly > 0
                        ? <span className="nhan-xau">{n.chua_xu_ly}</span>
                        : <span className="nhan-tot">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
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
      {ht.pin_lech > 0 && (
        <div className="hop-thong-bao hop-loi">
          <strong>⚠ {ht.pin_lech} PIN trong máy bị lệch / trùng người.</strong> Có người được enroll
          trên máy dưới PIN đang thuộc nhân viên khác trong hệ thống — lượt quẹt sẽ bị gán nhầm.
          Vào <LienKet den="/cai-dat/thiet-bi">Máy chấm công</LienKet> → “Đối chiếu user máy” để xử lý.
        </div>
      )}

      {ht.thiet_bi.length === 0 && (
        <div className="hop-thong-bao hop-luu-y">
          Chưa khai báo máy chấm công nào. Vào <LienKet den="/cai-dat/thiet-bi">Máy chấm công</LienKet> để
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

function ONgay({ t, ngay }: { t: TinhHinhNgay; ngay: string }): ReactNode {
  return (
    <div className="luoi luoi-4">
      <OSoBam nhan="Tổng nhân viên" gia_tri={t.tong_nhan_vien} loai="tong" ngay={ngay} />
      <OSoBam nhan="Có mặt" gia_tri={t.co_mat} mau="tot" loai="co_mat" ngay={ngay} />
      <OSoBam nhan="Đi muộn" gia_tri={t.di_muon} mau={Number(t.di_muon) > 0 ? 'canh_bao' : undefined}
        loai="di_muon" ngay={ngay} />
      <OSoBam nhan="Vắng" gia_tri={t.vang} mau={Number(t.vang) > 0 ? 'xau' : undefined}
        loai="vang" ngay={ngay} />
      <OSoBam nhan="Nghỉ phép" gia_tri={t.nghi_phep} mau="lanh" loai="nghi_phep" ngay={ngay} />
      <OSoBam nhan="Chưa quẹt ra" gia_tri={t.chua_quet_ra} phu="Còn trong giờ hoặc quên quẹt"
        loai="chua_quet_ra" ngay={ngay} />
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
