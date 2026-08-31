// Ma dinh danh cua mot nguoi o cac he thong khac: PIN may cham cong, ERP cu, Microsoft.
//
// VI SAO CO TRANG NAY: cac ma nay truoc day nam rai rac trong nhung o nho tren form ho so
// (`pin_may`, `ma_erp`, `email`), va khong cho nao tra loi duoc hai cau hoi hay phai hoi nhat:
// "nguoi nay co nhung ma gi o dau" va "ma nay dang la cua ai".
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, HopTot, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

export interface DongMa {
  id: string;
  he_thong: string;
  ma: string;
  hieu_luc_tu: string;
  hieu_luc_den: string | null;
  nguon: string;
  ghi_chu: string | null;
}

export interface NhomMa {
  nhom: string;
  he_thong: string;
  ten_he_thong: string;
  nhieu_ma: boolean;
  on_dinh: boolean;
  cac_ma: DongMa[];
}

const TEN_NGUON: Record<string, string> = {
  di_tru: 'chuyển từ cột cũ',
  nguoi_khai: 'nhân sự khai',
  dong_bo_erp: 'đồng bộ ERP',
  dang_nhap_microsoft: 'đăng nhập Microsoft',
  gop_ho_so: 'gộp hồ sơ',
  nhap_csv: 'nhập CSV',
};

/** Bang ma dinh danh cua mot nguoi. Dat trong tab Thong tin chung cua ho so. */
export function TheMaDinhDanh(
  { nhan_vien_id, sua_duoc }: { nhan_vien_id: string; sua_duoc: boolean },
): ReactNode {
  const [ca_lich_su, dat_ca_lich_su] = useState(false);
  const [dang_them, dat_dang_them] = useState<string | null>(null);
  const [dang_cap_pin, dat_dang_cap_pin] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NhomMa[]>(
    `/api/nhan-vien/${nhan_vien_id}/ma-dinh-danh?ca_lich_su=${ca_lich_su ? '1' : '0'}`,
    [nhan_vien_id, ca_lich_su],
  );
  const hd = dung_hanh_dong();

  const thu_hoi = (m: DongMa) => async (): Promise<void> => {
    await hd.chay(
      () => goi(`/api/ma-dinh-danh/${m.id}`, { method: 'DELETE' }),
      'Đã đóng mã lại. Mã cũ vẫn tra cứu được trong lịch sử.',
    );
    nap_lai();
  };

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;

  // Nhom theo `nhom` de cac he thong cung nguon nam canh nhau.
  const cac_nhom = [...new Set((du_lieu ?? []).map((n) => n.nhom))];

  return (
    <div className="the">
      <h3>Mã ở các hệ thống</h3>
      <p className="mo-ta">
        Một người đi qua nhiều hệ thống và mỗi hệ thống gọi họ bằng một mã khác. Một mã{' '}
        <strong>đang hiệu lực</strong> chỉ thuộc một người — cơ sở dữ liệu bảo đảm điều đó.
      </p>

      <HopTotHoacLoi hd={hd} />

      <div className="hang-nut">
        <label className="o-nhap-ngang">
          <input
            type="checkbox"
            checked={ca_lich_su}
            onChange={(e) => dat_ca_lich_su(e.target.checked)}
          />
          Hiện cả mã đã đóng
        </label>
      </div>

      {cac_nhom.map((nh) => (
        <div key={nh} style={{ marginTop: 12 }}>
          <h4 style={{ margin: '0 0 6px' }}>{nh}</h4>
          <div className="vo-bang">
            <table className="bang-gon">
              <tbody>
                {(du_lieu ?? []).filter((n) => n.nhom === nh).map((n) => (
                  <tr key={n.he_thong}>
                    <td style={{ color: 'var(--chu-nhat)', width: '38%' }}>
                      {n.ten_he_thong}
                      {n.on_dinh && <span className="nhan" title="Mã không đổi, tin được để khớp người"> ổn định</span>}
                    </td>
                    <td>
                      {n.cac_ma.length === 0
                        ? <span style={{ color: 'var(--chu-nhat)' }}>—</span>
                        : n.cac_ma.map((m) => (
                          <div key={m.id} style={{ marginBottom: 4 }}>
                            <code>{m.ma}</code>{' '}
                            {m.hieu_luc_den === null
                              ? <span className="nhan-tot">đang dùng</span>
                              : <span className="nhan">đã đóng {ngay_gio(m.hieu_luc_den)}</span>}
                            <span style={{ color: 'var(--chu-nhat)' }}>
                              {' '}({TEN_NGUON[m.nguon] ?? m.nguon})
                            </span>
                            {m.ghi_chu !== null && (
                              <div className="mo-ta" style={{ marginLeft: 4 }}>{m.ghi_chu}</div>
                            )}
                            {sua_duoc && m.hieu_luc_den === null && (
                              <button
                                type="button"
                                className="nut-nho"
                                disabled={hd.dang_chay}
                                onClick={thu_hoi(m)}
                              >
                                Đóng mã
                              </button>
                            )}
                          </div>
                        ))}
                    </td>
                    <td style={{ width: 90 }}>
                      {sua_duoc && n.he_thong === 'may_cham_cong' && (
                        <button type="button" className="nut-nho nut-chinh"
                          onClick={() => dat_dang_cap_pin(true)}
                          title="Hệ thống chọn một PIN còn trống trong dải của máy">
                          Cấp PIN
                        </button>
                      )}
                      {sua_duoc && (n.nhieu_ma || n.cac_ma.every((m) => m.hieu_luc_den !== null)) && (
                        <button type="button" className="nut-nho" onClick={() => dat_dang_them(n.he_thong)}>
                          + Thêm
                        </button>
                      )}
                      {sua_duoc && !n.nhieu_ma && n.cac_ma.some((m) => m.hieu_luc_den === null) && (
                        <button type="button" className="nut-nho" onClick={() => dat_dang_them(n.he_thong)}>
                          Đổi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {dang_cap_pin && (
        <HopThoaiCapPin
          nhan_vien_id={nhan_vien_id}
          khi_dong={() => dat_dang_cap_pin(false)}
          khi_xong={() => { dat_dang_cap_pin(false); nap_lai(); }}
        />
      )}

      {dang_them !== null && (
        <HopThoaiGanMa
          nhan_vien_id={nhan_vien_id}
          he_thong={dang_them}
          ten_he_thong={(du_lieu ?? []).find((n) => n.he_thong === dang_them)?.ten_he_thong ?? dang_them}
          khi_dong={() => dat_dang_them(null)}
          khi_xong={() => { dat_dang_them(null); nap_lai(); }}
        />
      )}
    </div>
  );
}

function HopTotHoacLoi({ hd }: { hd: ReturnType<typeof dung_hanh_dong> }): ReactNode {
  return (
    <>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
    </>
  );
}

/**
 * Hop thoai gan mot ma.
 *
 * Co MOT o dac biet: "thu hoi tu nguoi khac". Mac dinh TAT, va no chi hien sau khi may chu tu
 * choi lan dau kem ten nguoi dang giu ma — de viec chuyen danh tinh giua hai con nguoi luon la
 * mot hanh dong co y, khong phai mot o tick nguoi ta quet qua.
 */
function HopThoaiGanMa(
  { nhan_vien_id, he_thong, ten_he_thong, khi_dong, khi_xong }: {
    nhan_vien_id: string;
    he_thong: string;
    ten_he_thong: string;
    khi_dong: () => void;
    khi_xong: () => void;
  },
): ReactNode {
  const [ma, dat_ma] = useState('');
  const [ghi_chu, dat_ghi_chu] = useState('');
  const [cho_thu_hoi, dat_cho_thu_hoi] = useState(false);
  const [thu_hoi, dat_thu_hoi] = useState(false);
  const [loi, dat_loi] = useState<unknown>(null);
  const [dang_gui, dat_dang_gui] = useState(false);

  const gui = async (): Promise<void> => {
    dat_dang_gui(true);
    dat_loi(null);
    try {
      await goi(`/api/nhan-vien/${nhan_vien_id}/ma-dinh-danh`, {
        method: 'POST',
        body: {
          he_thong,
          ma,
          ghi_chu: ghi_chu === '' ? null : ghi_chu,
          thu_hoi_cua_nguoi_khac: thu_hoi,
        },
      });
      khi_xong();
    } catch (e) {
      // May chu tu choi vi ma dang thuoc nguoi khac -> MO o xac nhan thay vi chi bao loi. Nguoi
      // dung thay ten nguoi dang giu ma TRUOC khi quyet dinh thu hoi.
      const thong_diep = e instanceof Error ? e.message : String(e);
      if (/đang thuộc/.test(thong_diep)) dat_cho_thu_hoi(true);
      dat_loi(e);
    } finally {
      dat_dang_gui(false);
    }
  };

  return (
    <HopThoai tieu_de={`Gán ${ten_he_thong}`} khi_dong={khi_dong}>
      <HopLoi loi={loi} />
      <label className="o-nhap">
        <span>{ten_he_thong}</span>
        <input value={ma} onChange={(e) => dat_ma(e.target.value)} autoFocus />
      </label>
      <label className="o-nhap">
        <span>Ghi chú</span>
        <input value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)} />
      </label>

      {cho_thu_hoi && (
        <div className="goi-y">
          <label className="o-nhap-ngang">
            <input
              type="checkbox"
              checked={thu_hoi}
              onChange={(e) => dat_thu_hoi(e.target.checked)}
            />
            Thu hồi mã này từ người đang giữ
          </label>
          <p className="mo-ta">
            Mã của người kia sẽ được <strong>đóng lại</strong>, không bị xóa — lịch sử vẫn tra
            cứu được. Dùng khi một PIN máy được cấp lại cho người mới.
          </p>
        </div>
      )}

      <div className="hang-nut">
        <button
          type="button"
          className="nut-chinh"
          disabled={ma.trim() === '' || dang_gui}
          onClick={gui}
        >
          Lưu
        </button>
        <button type="button" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

/**
 * Cap PIN may cham cong: HE THONG CHON SO, nguoi phu trach cai len may.
 *
 * Chieu di la he-thong -> may. Nguoc lai — nguoi khai may tu nghi so roi go lai vao phan mem —
 * la duong chac chan den cham cong sai ten khi co nhieu may: PIN la danh tinh, va he thong tra
 * PIN ra nguoi tren pham vi toan cong ty chu khong loc theo may.
 */
function HopThoaiCapPin(
  { nhan_vien_id, khi_dong, khi_xong }: {
    nhan_vien_id: string; khi_dong: () => void; khi_xong: () => void;
  },
): ReactNode {
  const [serial, dat_serial] = useState('');
  const [da_cap, dat_da_cap] = useState<CapPin | null>(null);
  const hd = dung_hanh_dong();
  const { du_lieu: may } = dung_nap<ThietBiGon[]>('/api/thiet-bi');
  // De nghi truoc khi bam: nguoi dung thay so TRUOC khi quyet dinh, vi cap xong la phai ra may
  // cai dung so do.
  const { du_lieu: goi_y, loi: loi_goi_y } = dung_nap<CapPin>(
    serial === '' ? null : `/api/thiet-bi/${encodeURIComponent(serial)}/pin-goi-y`, [serial]);

  const cap = async (): Promise<void> => {
    const kq = await hd.chay_lay<CapPin>(() => goi(`/api/nhan-vien/${nhan_vien_id}/cap-pin`, {
      method: 'POST', body: { thiet_bi_serial: serial },
    }));
    if (kq !== null) dat_da_cap(kq);
  };

  const dang_bat = (may ?? []).filter((m) => m.dang_bat);

  return (
    <HopThoai tieu_de="Cấp PIN máy chấm công" khi_dong={khi_dong}>
      {da_cap === null ? (
        <>
          <HopLoi loi={hd.loi} />
          <p className="mo-ta">
            Hệ thống chọn một PIN <strong>còn trống</strong> trong dải của máy bạn chọn. Sau đó
            bạn cài đúng số đó lên máy — không tự nghĩ số.
          </p>
          <label className="o-nhap">
            <span>Máy chấm công *</span>
            <select value={serial} onChange={(e) => dat_serial(e.target.value)}>
              <option value="">— Chọn máy —</option>
              {dang_bat.map((m) => (
                <option key={m.serial} value={m.serial}>
                  {m.ten}{m.pin_tu === null ? '' : ` (dải ${m.pin_tu}–${m.pin_den ?? ''})`}
                </option>
              ))}
            </select>
          </label>

          <HopLoi loi={loi_goi_y} />
          {goi_y !== null && (
            <div className="goi-y">
              PIN sẽ cấp: <strong style={{ fontSize: 18 }}>{goi_y.pin}</strong>
              {' '}— dải {goi_y.dai.tu}–{goi_y.dai.den}, còn trống{' '}
              {goi_y.con_trong > 1000 ? 'trên 1000' : goi_y.con_trong} số.
            </div>
          )}

          <div className="hang-nut">
            <button type="button" className="nut-chinh"
              disabled={serial === '' || goi_y === null || hd.dang_chay} onClick={cap}>
              Cấp PIN này
            </button>
            <button type="button" onClick={khi_dong}>Hủy</button>
          </div>
        </>
      ) : (
        <>
          <HopTot chu={`Đã cấp PIN ${da_cap.pin} cho máy ${da_cap.thiet_bi_ten}.`} />
          <div className="goi-y">
            <p><strong>Việc còn lại, làm tại máy:</strong></p>
            <ol style={{ margin: '4px 0 0 18px' }}>
              <li>Tạo user trên máy với <strong>User ID = {da_cap.pin}</strong> — hoặc bấm
                <em> Nạp NV</em> ở trang Thiết bị để hệ thống tạo sẵn.</li>
              <li>Nhân viên <strong>đăng ký khuôn mặt / vân tay trực tiếp tại máy</strong> —
                sinh trắc học không nạp từ xa được.</li>
            </ol>
          </div>
          <div className="hang-nut">
            <button type="button" className="nut-chinh" onClick={khi_xong}>Xong</button>
          </div>
        </>
      )}
    </HopThoai>
  );
}

interface ThietBiGon {
  serial: string;
  ten: string;
  dang_bat: boolean;
  pin_tu: number | null;
  pin_den: number | null;
}

interface CapPin {
  pin: string;
  thiet_bi_ten: string;
  dai: { tu: number; den: number };
  con_trong: number;
}

// ==================================================================== trang He thong

/** Trang "Mã định danh" trong nhóm Hệ thống: tra cứu theo mã + đối soát. */
export function TrangMaDinhDanh(): ReactNode {
  return (
    <>
      <h1>Mã định danh</h1>
      <p className="mo-ta">
        Dữ liệu nhân sự vào hệ thống này từ nhiều nguồn, và mỗi nguồn gọi cùng một người bằng một
        mã khác: mã nội bộ, PIN máy chấm công, userId ERP cũ, danh tính Microsoft. Bảng mã định
        danh giữ tất cả, và <strong>một mã đang hiệu lực chỉ thuộc một người</strong>.
      </p>
      <div className="luoi luoi-2">
        <TheTraCuuMa />
        <TheDoiSoatMa />
      </div>
    </>
  );
}

// ==================================================================== tra cuu + doi soat

interface KetQuaTim {
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  dang_hoat_dong: boolean;
  ten_he_thong: string;
  ma: string;
  hieu_luc_den: string | null;
}

/** Tra cuu nguoi theo MOT MA BAT KY. Dat trong trang He thong. */
export function TheTraCuuMa(): ReactNode {
  const [go, dat_go] = useState('');
  const [q, dat_q] = useState('');
  const { du_lieu, dang_tai } = dung_nap<KetQuaTim[]>(
    q === '' ? null : `/api/ma-dinh-danh/tim?q=${encodeURIComponent(q)}`, [q]);

  return (
    <div className="the">
      <h3>Tra cứu theo mã</h3>
      <p className="mo-ta">
        Gõ một mã bất kỳ — PIN máy chấm công, mã nhân viên cũ, userId ERP, email. Tìm cả{' '}
        <strong>mã đã đóng</strong>, nên một bảng công in tháng trước hay một công văn cũ vẫn
        tra ra được người.
      </p>
      <div className="hang-nut">
        <input
          value={go}
          placeholder="Ví dụ: 7, ERP147, vinh@…"
          onChange={(e) => dat_go(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') dat_q(go.trim()); }}
        />
        <button type="button" className="nut-chinh" onClick={() => dat_q(go.trim())}>Tìm</button>
      </div>

      {dang_tai && <DangTai />}
      {q !== '' && !dang_tai && (du_lieu ?? []).length === 0 && (
        <Trong tieu_de="Không tìm thấy" mo_ta={`Không hệ thống nào có mã "${q}".`} />
      )}
      {(du_lieu ?? []).length > 0 && (
        <div className="vo-bang">
          <table className="bang-gon">
            <thead>
              <tr><th>Mã</th><th>Ở hệ thống</th><th>Nhân viên</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {(du_lieu ?? []).map((d, i) => (
                <tr key={`${d.nhan_vien_id}-${i}`}>
                  <td><code>{d.ma}</code></td>
                  <td>{d.ten_he_thong}</td>
                  <td>{d.ma_nv} — {d.ho_ten}</td>
                  <td>
                    {d.hieu_luc_den === null
                      ? <span className="nhan-tot">đang dùng</span>
                      : <span className="nhan">đã đóng</span>}
                    {!d.dang_hoat_dong && <span className="nhan"> đã nghỉ</span>}
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

interface DongLech {
  ma_nv: string;
  ho_ten: string;
  ten_he_thong: string;
  cot_cu: string | null;
  bang_moi: string | null;
  ly_do: string;
}

/**
 * Doi soat bang dinh danh voi cac cot cu tren `nhan_vien`.
 *
 * Giai doan nay CA HAI cung ton tai: cot cu van la duong doc cua may cham cong va dang nhap
 * Microsoft, bang moi la nguon su that dang duoc dung dan. Khi bao cao nay sach thi moi go cot
 * cu duoc — go som hon la doan.
 */
export function TheDoiSoatMa(): ReactNode {
  const [mo, dat_mo] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<{ so_lech: number; chi_tiet: DongLech[] }>(
    mo ? '/api/ma-dinh-danh/doi-soat' : null, [mo]);

  return (
    <div className="the">
      <h3>Đối soát mã định danh</h3>
      <p className="mo-ta">
        So bảng mã định danh với các cột cũ trên hồ sơ nhân viên, <strong>hai chiều</strong>.
        Sạch thì mới bỏ được các cột cũ.
      </p>
      {!mo ? (
        <div className="hang-nut">
          <button type="button" onClick={() => dat_mo(true)}>Chạy đối soát</button>
        </div>
      ) : (
        <>
          <div className="hang-nut">
            <button type="button" disabled={dang_tai} onClick={nap_lai}>Chạy lại</button>
          </div>
          {dang_tai && <DangTai />}
          {loi !== null && <HopLoi loi={loi} />}
          {du_lieu !== null && du_lieu.so_lech === 0 && (
            <HopTot chu="Không lệch dòng nào." />
          )}
          {du_lieu !== null && du_lieu.so_lech > 0 && (
            <>
              <HopLoi loi={new Error(`Lệch ${String(du_lieu.so_lech)} dòng.`)} />
              <div className="vo-bang">
                <table className="bang-gon">
                  <thead>
                    <tr>
                      <th>Nhân viên</th><th>Hệ thống</th><th>Cột cũ</th>
                      <th>Bảng định danh</th><th>Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {du_lieu.chi_tiet.slice(0, 200).map((d, i) => (
                      <tr key={`${d.ma_nv}-${i}`}>
                        <td>{d.ma_nv} — {d.ho_ten}</td>
                        <td>{d.ten_he_thong}</td>
                        <td><code>{d.cot_cu ?? '—'}</code></td>
                        <td><code>{d.bang_moi ?? '—'}</code></td>
                        <td className="mo-ta">{d.ly_do}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
