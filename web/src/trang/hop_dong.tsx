// Quan ly hop dong: han hop dong, va tim theo noi dung da trich.
//
// Hai viec o day tra loi hai cau hoi khac nhau cua nhan su:
//
//   "Thang nay phai ky lai hop dong cho ai?"  -> tab Sap het han
//   "Hop dong nao co dieu khoan nay?"          -> tab Tim trong noi dung
//
// Tab dau la mat DOI DIEN cua viec nhac han tu dong. Thong bao day co the bi tat, dien
// thoai co the mat, nguoi nhan co the da nghi viec — nhung danh sach nay thi luon day du,
// va no la thu duy nhat khong phu thuoc vao viec ai co bam vao thong bao hay khong.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, OSo, Trong, dung_nap, ngay_gio, ngay_viet,
} from '../thanh_phan.tsx';

type Tab = 'sap_het_han' | 'tim';

interface HopDongSapHan {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  so_hd: string | null;
  loai: string | null;
  chuc_danh: string | null;
  hieu_luc_den: string;
  so_ngay_con: number;
  da_nhac_han: number[];
  muc_gap: 'som' | 'gap' | 'rat_gap' | 'da_het_han';
}

interface KetQuaSapHan {
  trong_ngay: number;
  danh_sach: HopDongSapHan[];
  so_da_het_han: number;
}

interface DongTim {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  so_hd: string | null;
  loai: string | null;
  chuc_danh: string | null;
  hieu_luc_tu: string;
  hieu_luc_den: string | null;
  trang_thai: string;
  cach_trich: string | null;
  trich_luc: string | null;
  so_ky_tu: number;
}

const TEN_LOAI: Record<string, string> = {
  thu_viec: 'Thử việc',
  xac_dinh: 'Xác định thời hạn',
  khong_xac_dinh: 'Không xác định thời hạn',
  thoi_vu: 'Thời vụ',
  cong_tac_vien: 'Cộng tác viên',
  hoc_viec: 'Học việc',
};

export const TEN_CACH_TRICH: Record<string, string> = {
  docx: 'Đọc từ .docx',
  pdf_text: 'Đọc lớp chữ PDF',
  ocr: 'OCR bản scan',
  nhap_tay: 'Nhập tay',
};

const MAU_GAP: Record<HopDongSapHan['muc_gap'], string> = {
  som: 'nhan-mo',
  gap: 'nhan-canh-bao',
  rat_gap: 'nhan-xau',
  da_het_han: 'nhan-xau',
};

/** So ngay con lai, viet cho nguoi doc. So am doc la "da qua han". */
function doc_so_ngay(n: number): string {
  if (n < 0) return `quá hạn ${String(-n)} ngày`;
  if (n === 0) return 'hết hạn hôm nay';
  return `còn ${String(n)} ngày`;
}

export function TrangHopDong(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('sap_het_han');

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Hạn hợp đồng và nội dung hợp đồng đã trích sang văn bản.
          </p>
        </div>
      </div>

      <div className="hang-nut">
        <button
          className={tab === 'sap_het_han' ? 'nut-chinh' : 'nut-phang'}
          onClick={() => dat_tab('sap_het_han')}
        >
          Sắp hết hạn
        </button>
        <button
          className={tab === 'tim' ? 'nut-chinh' : 'nut-phang'}
          onClick={() => dat_tab('tim')}
        >
          Tìm trong nội dung
        </button>
      </div>

      {tab === 'sap_het_han' ? <TabSapHetHan /> : <TabTim />}
    </>
  );
}

// ==================================================================== sap het han

function TabSapHetHan(): ReactNode {
  const [trong_ngay, dat_trong_ngay] = useState(45);
  const { du_lieu, dang_tai, loi } = dung_nap<KetQuaSapHan>(
    `/api/ho-so/hop-dong/sap-het-han?trong_ngay=${String(trong_ngay)}`, [trong_ngay]);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const kq = du_lieu ?? { trong_ngay, danh_sach: [], so_da_het_han: 0 };

  return (
    <>
      <div className="hop-luu-y">
        <strong>Điều 45 BLLĐ 2019:</strong> phải thông báo <em>bằng văn bản</em> cho người
        lao động, <strong>chậm nhất 15 ngày</strong> trước ngày hợp đồng xác định thời hạn
        hết hạn. Thông báo đẩy trên điện thoại <em>không phải</em> văn bản theo điều này —
        nó chỉ để nhân sự không bỏ sót hạn.
        <br />
        <strong>Điều 20.2:</strong> hợp đồng đã hết hạn mà người lao động vẫn làm việc, quá{' '}
        <strong>30 ngày</strong> không ký hợp đồng mới thì hợp đồng đó{' '}
        <em>trở thành không xác định thời hạn</em>.
      </div>

      <div className="ho-so-chi-so">
        <OSo
          nhan="Đã hết hạn"
          gia_tri={String(kq.so_da_het_han)}
          phu="cần xử lý ngay"
          mau={kq.so_da_het_han > 0 ? 'xau' : undefined}
        />
        <OSo
          nhan="Trong khoảng đang xem"
          gia_tri={String(kq.danh_sach.length)}
          phu="hợp đồng"
        />
      </div>

      <div className="hang-nut">
        <label>
          Trong{' '}
          <select
            value={trong_ngay}
            onChange={(e) => dat_trong_ngay(Number(e.target.value))}
          >
            <option value={15}>15 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={45}>45 ngày</option>
            <option value={90}>90 ngày</option>
          </select>
        </label>
      </div>
      <p className="mo-ta">
        Hợp đồng <strong>đã hết hạn</strong> luôn hiện, không phụ thuộc khoảng đang xem —
        một hợp đồng hết hạn ba tháng trước mà chưa ai xử lý là thứ cần thấy nhất, và nó
        không còn "sắp" nữa nên mọi bộ lọc theo số ngày còn lại đều sẽ làm nó biến mất.
      </p>

      {kq.danh_sach.length === 0 ? (
        <Trong
          tieu_de="Không có hợp đồng nào sắp hết hạn"
          mo_ta="Hợp đồng không xác định thời hạn không có ngày hết hạn nên không xuất hiện ở đây."
        />
      ) : (
        <div className="vo-bang">
          <table>
            <thead>
              <tr>
                <th>Nhân viên</th><th>Số HĐ</th><th>Loại</th><th>Chức danh</th>
                <th>Hết hạn</th><th>Còn lại</th><th>Đã nhắc</th>
              </tr>
            </thead>
            <tbody>
              {kq.danh_sach.map((hd) => (
                <tr key={hd.id}>
                  <td>
                    <a href={`/nhan-vien/${hd.nhan_vien_id}`}>
                      <strong>{hd.ma_nv}</strong> — {hd.ho_ten}
                    </a>
                  </td>
                  <td className="so">{hd.so_hd ?? '—'}</td>
                  <td>{hd.loai === null ? '—' : TEN_LOAI[hd.loai] ?? hd.loai}</td>
                  <td>{hd.chuc_danh ?? '—'}</td>
                  <td className="khong-ngat so">{ngay_viet(hd.hieu_luc_den)}</td>
                  <td className="khong-ngat">
                    <span className={MAU_GAP[hd.muc_gap]}>{doc_so_ngay(hd.so_ngay_con)}</span>
                  </td>
                  <td className="mo-ta khong-ngat">
                    {hd.da_nhac_han.length === 0
                      ? 'chưa nhắc'
                      : `mốc ${[...hd.da_nhac_han].sort((a, b) => b - a).join(', ')} ngày`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ==================================================================== tim noi dung

function TabTim(): ReactNode {
  const [go, dat_go] = useState('');
  const [tu_khoa, dat_tu_khoa] = useState('');
  const [ds, dat_ds] = useState<DongTim[] | null>(null);
  const [dang_tim, dat_dang_tim] = useState(false);
  const [loi, dat_loi] = useState<unknown>(null);

  const tim = (): void => {
    const q = go.trim();
    if (q === '') return;
    dat_dang_tim(true);
    dat_loi(null);
    goi<{ danh_sach: DongTim[] }>(`/api/ho-so/hop-dong/tim?q=${encodeURIComponent(q)}`)
      .then((r) => { dat_ds(r.danh_sach); dat_tu_khoa(q); })
      .catch((e: unknown) => { dat_loi(e); })
      .finally(() => { dat_dang_tim(false); });
  };

  return (
    <>
      <div className="hop-luu-y">
        Chỉ tìm được trong những hợp đồng <strong>đã trích nội dung</strong>. Trích ở{' '}
        <em>hồ sơ từng nhân viên → mục Hợp đồng → nút "Nội dung"</em>.
        <br />
        Văn bản trích ra là để <strong>tìm và đối chiếu</strong>. Bản có giá trị pháp lý
        luôn là tệp gốc trong hồ sơ — nhất là với bản OCR, vì OCR đọc sai chữ và số được.
      </div>

      <div className="hang-nut">
        <input
          type="search"
          value={go}
          placeholder="ví dụ: thời gian thử việc, bảo mật thông tin…"
          onChange={(e) => dat_go(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') tim(); }}
          style={{ minWidth: 320 }}
        />
        <button className="nut-chinh" disabled={dang_tim || go.trim() === ''} onClick={tim}>
          Tìm
        </button>
      </div>

      {loi !== null && <HopLoi loi={loi} />}
      {dang_tim && <DangTai />}

      {ds !== null && !dang_tim && (
        ds.length === 0 ? (
          <Trong
            tieu_de={`Không có hợp đồng nào chứa "${tu_khoa}"`}
            mo_ta="Có thể chưa hợp đồng nào được trích nội dung, hoặc từ khóa không xuất hiện."
          />
        ) : (
          <>
            <p className="mo-ta">
              {ds.length} hợp đồng chứa <strong>{tu_khoa}</strong>
            </p>
            <div className="vo-bang">
              <table>
                <thead>
                  <tr>
                    <th>Nhân viên</th><th>Số HĐ</th><th>Loại</th><th>Hiệu lực</th>
                    <th>Cách trích</th><th className="canh-phai">Số ký tự</th>
                  </tr>
                </thead>
                <tbody>
                  {ds.map((hd) => (
                    <tr key={hd.id}>
                      <td>
                        <a href={`/nhan-vien/${hd.nhan_vien_id}`}>
                          <strong>{hd.ma_nv}</strong> — {hd.ho_ten}
                        </a>
                      </td>
                      <td className="so">{hd.so_hd ?? '—'}</td>
                      <td>{hd.loai === null ? '—' : TEN_LOAI[hd.loai] ?? hd.loai}</td>
                      <td className="khong-ngat">
                        {ngay_viet(hd.hieu_luc_tu)} →{' '}
                        {hd.hieu_luc_den === null ? 'vô thời hạn' : ngay_viet(hd.hieu_luc_den)}
                      </td>
                      <td>
                        <NhanCachTrich cach={hd.cach_trich} />
                        {hd.trich_luc !== null && (
                          <div className="mo-ta">{ngay_gio(hd.trich_luc)}</div>
                        )}
                      </td>
                      <td className="canh-phai so">{hd.so_ky_tu.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </>
  );
}

/**
 * Nhan cach trich. OCR duoc danh dau KHAC hai cach kia, khong phai de cho dep.
 *
 * 'docx' va 'pdf_text' la chu GOC — chinh xac tuyet doi. 'ocr' la may DOAN tu anh: mot
 * hop dong ghi 12.500.000 co the doc ra 12.500.00O. Ai doc so nay phai biet no den tu dau.
 */
export function NhanCachTrich({ cach }: { cach: string | null }): ReactNode {
  if (cach === null) return <span className="mo-ta">chưa trích</span>;
  const ten = TEN_CACH_TRICH[cach] ?? cach;
  return (
    <span className={cach === 'ocr' ? 'nhan-canh-bao' : 'nhan-tot'}>{ten}</span>
  );
}
