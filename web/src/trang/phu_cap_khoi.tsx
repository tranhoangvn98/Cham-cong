// Chinh sach phu cap THEO KHOI.
//
// Phu cap mac dinh cua ca mot khoi (vd ca khoi Kho Ha Noi huong an trua) — khai mot lan cho khoi
// thay vi tung nguoi. Ky luong gop khoi + ca nhan: phu cap CA NHAN de len khoi theo tung khoan;
// muon MIEN cho mot nguoi thi mo dong ca nhan so tien/so luong = 0. HD thoi vu / cong tac vien
// KHONG huong phu cap khoi (he thong tu chan).
//
// Cung mo hinh hieu luc tu-den nhu ca nhan: khong sua tai cho — dong dong cu, mo dong moi.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, XuongDanhSach,
} from '../thanh_phan.tsx';
import {
  tien, ngay, hom_nay, mo_ta_muc, type KhoanDanhMuc,
} from './phu_cap.tsx';

interface Khoi {
  id: string;
  ma: string;
  ten: string;
  dang_bat: boolean;
}

interface ChinhSachKhoi {
  id: string;
  khoi_id: string;
  khoi_ma: string;
  khoi_ten: string;
  khoan_ma: string;
  khoan_ten: string;
  loai: 'thu_nhap' | 'tru';
  cach_tinh: KhoanDanhMuc['cach_tinh'];
  chiu_thue: boolean;
  canh_bao: string | null;
  nguon_so_luong: 'co_dinh' | 'theo_cong';
  so_luong: string | null;
  so_tien: string | null;
  don_gia: string | null;
  don_gia_danh_muc: string | null;
  hieu_luc_tu: string;
  hieu_luc_den: string | null;
  ly_do: string | null;
}

export function TrangPhuCapKhoi(): ReactNode {
  const [xem_lich_su, dat_xem_lich_su] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<ChinhSachKhoi[]>(
    `/api/chinh-sach-phu-cap-khoi?con_hieu_luc=${xem_lich_su ? 'false' : 'true'}`,
  );
  const [gan, dat_gan] = useState(false);
  const [dong, dat_dong] = useState<ChinhSachKhoi | null>(null);
  const hd = dung_hanh_dong();

  if (dang_tai) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  const theo_khoi = new Map<string, ChinhSachKhoi[]>();
  for (const cs of ds) {
    const co = theo_khoi.get(cs.khoi_id);
    if (co === undefined) theo_khoi.set(cs.khoi_id, [cs]); else co.push(cs);
  }

  const xoa = (cs: ChinhSachKhoi) => (): void => {
    void hd.chay(
      () => goi(`/api/chinh-sach-phu-cap-khoi/${cs.id}`, { method: 'DELETE' }),
      'Đã xóa chính sách khối vừa khai.',
    ).then(() => nap_lai());
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Phụ cấp mặc định của cả một khối. Khai một lần cho khối — mọi người trong khối tự hưởng.
            Phụ cấp cá nhân (tab bên) sẽ đè lên mức của khối theo từng khoản.
          </p>
        </div>
        <div className="hang-nut">
          <button onClick={() => dat_gan(true)} disabled={hd.dang_chay}>Gán phụ cấp khối</button>
          <button className="nut-phang" onClick={() => dat_xem_lich_su(!xem_lich_su)}>
            {xem_lich_su ? 'Chỉ xem đang hiệu lực' : 'Xem cả lịch sử'}
          </button>
        </div>
      </div>

      <div className="hop-luu-y">
        <strong>Hợp đồng thời vụ / cộng tác viên KHÔNG hưởng phụ cấp khối</strong> — hệ thống tự
        loại. Muốn <em>miễn</em> một phụ cấp khối cho riêng một người: sang tab <strong>Cá
        nhân</strong> gán khoản đó cho người đó với số tiền/số lượng = 0.
        <br />
        Không sửa tại chỗ: đổi mức thì gán lại với ngày hiệu lực mới. Chính sách chỉ vào phiếu khi
        bấm <strong>Tính lương</strong> ở kỳ đó.
      </div>

      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      {ds.length === 0 ? (
        <Trong
          tieu_de={xem_lich_su ? 'Chưa có chính sách khối nào' : 'Chưa có chính sách khối đang hiệu lực'}
          mo_ta="Gán phụ cấp cho một hoặc nhiều khối để mọi người trong khối tự hưởng."
          hanh_dong={<button onClick={() => dat_gan(true)}>Gán phụ cấp khối</button>}
        />
      ) : (
        <div className="vo-bang">
          <table className="bang-gon">
            <thead>
              <tr>
                <th>Khối</th>
                <th>Khoản</th>
                <th>Mức</th>
                <th>Hiệu lực</th>
                <th>Lý do</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...theo_khoi.values()].map((nhom) => nhom.map((cs, i) => (
                <tr key={cs.id} className={cs.hieu_luc_den === null ? undefined : 'mo-ta'}>
                  <td>
                    {i === 0 ? (
                      <>
                        <strong>{cs.khoi_ten}</strong>
                        <div className="mo-ta">{cs.khoi_ma}</div>
                      </>
                    ) : <span className="mo-ta">↳</span>}
                  </td>
                  <td>
                    {cs.khoan_ten}
                    {cs.loai === 'tru' && <span className="nhan-xau"> trừ</span>}
                    {!cs.chiu_thue && <span className="nhan-tot"> miễn thuế</span>}
                    {cs.canh_bao !== null && cs.canh_bao !== '' && (
                      <div className="hop-luu-y">{cs.canh_bao}</div>
                    )}
                  </td>
                  <td>{mo_ta_muc(cs)}</td>
                  <td className="khong-ngat">
                    {ngay(cs.hieu_luc_tu)} → {cs.hieu_luc_den === null
                      ? <span className="nhan-tot">nay</span>
                      : ngay(cs.hieu_luc_den)}
                  </td>
                  <td>{cs.ly_do ?? <span className="mo-ta">—</span>}</td>
                  <td className="canh-phai">
                    {cs.hieu_luc_den === null && (
                      <>
                        <button className="nut-nho" disabled={hd.dang_chay}
                          onClick={() => dat_dong(cs)}>Đóng</button>
                        <button className="nut-phang" disabled={hd.dang_chay} onClick={xoa(cs)}>
                          Xóa
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}

      {gan && (
        <HopThoaiGanKhoi khi_dong={() => dat_gan(false)}
          khi_xong={() => { dat_gan(false); nap_lai(); }} />
      )}
      {dong !== null && (
        <HopThoaiDongKhoi cs={dong} khi_dong={() => dat_dong(null)}
          khi_xong={() => { dat_dong(null); nap_lai(); }} />
      )}
    </>
  );
}

function HopThoaiGanKhoi(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const dm = dung_nap<KhoanDanhMuc[]>('/api/khoan-luong');
  const kh = dung_nap<Khoi[]>('/api/khoi');
  const [khoan_ma, dat_khoan_ma] = useState('');
  const [chon, dat_chon] = useState<Set<string>>(new Set());
  const [f, dat_f] = useState({
    nguon_so_luong: 'co_dinh', so_luong: '1', so_tien: '', don_gia: '',
    hieu_luc_tu: hom_nay(), ly_do: '',
  });
  const hd = dung_hanh_dong();
  const dat = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    dat_f({ ...f, [k]: e.target.value });

  if (dm.dang_tai || kh.dang_tai) {
    return <HopThoai tieu_de="Gán phụ cấp khối" khi_dong={khi_dong}><DangTai /></HopThoai>;
  }
  if (dm.loi !== null || kh.loi !== null) {
    return (
      <HopThoai tieu_de="Gán phụ cấp khối" khi_dong={khi_dong}>
        <HopLoi loi={dm.loi ?? kh.loi} />
      </HopThoai>
    );
  }

  const danh_muc = dm.du_lieu ?? [];
  const k = danh_muc.find((x) => x.ma === khoan_ma) ?? null;
  const go_tien = k !== null && k.cach_tinh === 'nhap_tay';
  const cac_khoi = (kh.du_lieu ?? []).filter((x) => x.dang_bat);

  const bat_tat = (id: string): void => {
    dat_chon((truoc) => {
      const sau = new Set(truoc);
      if (sau.has(id)) sau.delete(id); else sau.add(id);
      return sau;
    });
  };

  const du_dieu_kien = khoan_ma !== '' && chon.size > 0 && f.hieu_luc_tu !== ''
    && (go_tien ? Number(f.so_tien) > 0 : (f.nguon_so_luong === 'theo_cong' || Number(f.so_luong) > 0));

  return (
    <HopThoai tieu_de="Gán phụ cấp khối" khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <label htmlFor="pck-khoan">Khoản</label>
      <select id="pck-khoan" value={khoan_ma} onChange={(e) => dat_khoan_ma(e.target.value)}>
        <option value="">— chọn khoản —</option>
        {danh_muc.map((x) => (
          <option key={x.ma} value={x.ma}>{x.loai === 'tru' ? '− ' : '+ '}{x.ten}</option>
        ))}
      </select>

      {k !== null && (
        <>
          {!k.chiu_thue && (
            <p className="mo-ta"><span className="nhan-tot">Miễn thuế</span> — khoản này không
              làm tăng thu nhập tính thuế TNCN.</p>
          )}
          {k.canh_bao !== null && k.canh_bao !== '' && (
            <div className="hop-luu-y">{k.canh_bao}</div>
          )}

          {go_tien ? (
            <>
              <label htmlFor="pck-tien">Số tiền mỗi tháng (đ)</label>
              <input id="pck-tien" type="number" min="0" step="any"
                value={f.so_tien} onChange={dat('so_tien')} />
            </>
          ) : (
            <>
              <label htmlFor="pck-nguon">Số lượng lấy từ</label>
              <select id="pck-nguon" value={f.nguon_so_luong} onChange={dat('nguon_so_luong')}>
                <option value="co_dinh">Số cố định mỗi tháng</option>
                <option value="theo_cong">Số ngày công thực tế của kỳ</option>
              </select>
              {f.nguon_so_luong === 'co_dinh' ? (
                <>
                  <label htmlFor="pck-sl">Số lượng mỗi tháng</label>
                  <input id="pck-sl" type="number" min="0" step="0.5"
                    value={f.so_luong} onChange={dat('so_luong')} />
                </>
              ) : (
                <p className="mo-ta">
                  Mỗi kỳ hệ thống lấy đúng số ngày công thực tế của từng người trong khối.
                </p>
              )}
              <label htmlFor="pck-dg">Đơn giá riêng (đ) — để trống thì lấy đơn giá danh mục</label>
              <input id="pck-dg" type="number" min="0" step="any"
                value={f.don_gia} onChange={dat('don_gia')}
                placeholder={k.don_gia === null ? '' : tien(k.don_gia)} />
            </>
          )}
        </>
      )}

      <label htmlFor="pck-tu">Hiệu lực từ ngày</label>
      <input id="pck-tu" type="date" value={f.hieu_luc_tu} onChange={dat('hieu_luc_tu')} />

      <label htmlFor="pck-lydo">Lý do / căn cứ</label>
      <input id="pck-lydo" value={f.ly_do} onChange={dat('ly_do')}
        placeholder="VD: Cả khối Kho Hà Nội hưởng ăn trưa từ 01/8" />

      <h3>Áp dụng cho ({chon.size} khối)</h3>
      <div className="vo-bang">
        <table className="bang-gon">
          <tbody>
            {cac_khoi.map((x) => (
              <tr key={x.id}>
                <td style={{ width: 32 }}>
                  <input type="checkbox" checked={chon.has(x.id)}
                    aria-label={`Chọn ${x.ten}`} onChange={() => bat_tat(x.id)} />
                </td>
                <td>{x.ten}</td>
                <td className="mo-ta">{x.ma}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hang-nut">
        <button
          disabled={hd.dang_chay || !du_dieu_kien}
          onClick={() => void hd.chay(
            () => goi('/api/chinh-sach-phu-cap-khoi/hang-loat', {
              method: 'POST',
              body: {
                khoi_ids: [...chon],
                khoan_ma,
                nguon_so_luong: f.nguon_so_luong,
                so_luong: f.so_luong === '' ? null : Number(f.so_luong),
                so_tien: f.so_tien === '' ? null : Number(f.so_tien),
                don_gia: f.don_gia === '' ? null : Number(f.don_gia),
                hieu_luc_tu: f.hieu_luc_tu,
                ly_do: f.ly_do,
              },
            }),
            `Đã gán cho ${chon.size} khối. Bấm "Tính lương" ở kỳ liên quan để áp dụng.`,
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Gán cho {chon.size} khối
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

function HopThoaiDongKhoi(
  { cs, khi_dong, khi_xong }: { cs: ChinhSachKhoi; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [den, dat_den] = useState(hom_nay());
  const hd = dung_hanh_dong();

  return (
    <HopThoai tieu_de={`Đóng chính sách khối — ${cs.khoi_ten}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        <strong>{cs.khoan_ten}</strong>, hiệu lực từ {ngay(cs.hieu_luc_tu)}.
      </p>
      <label htmlFor="pck-den">Hưởng đến hết ngày</label>
      <input id="pck-den" type="date" value={den} onChange={(e) => dat_den(e.target.value)} />
      <p className="mo-ta">Đóng không phải là xóa — dòng này ở lại làm lịch sử.</p>
      <div className="hang-nut">
        <button
          disabled={hd.dang_chay || den === ''}
          onClick={() => void hd.chay(
            () => goi(`/api/chinh-sach-phu-cap-khoi/${cs.id}/dong`, {
              method: 'POST', body: { hieu_luc_den: den },
            }),
            'Đã đóng chính sách khối.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Đóng
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}
