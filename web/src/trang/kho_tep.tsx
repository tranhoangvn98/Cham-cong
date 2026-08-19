// Bang truy xuat tep dinh kem: tep nao dang nam o dau tren dia.
//
// CSDL chi giu sieu du lieu, ban goc nam tren dia. Hai ben lech nhau — sao luu thieu, phuc
// hoi nham thu muc, ai do xoa tay — thi phai tra ra duoc cho lech, va muon tra thi truoc het
// phai NHIN THAY duong dan da luu. Man hinh nay de lam viec do.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoaiXemTep, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';

interface DongTep {
  id: string;
  nhom: string;
  ten_goc: string;
  /**
   * Duong dan tuong doi tren dia, dang
   * `<MA_NV>_<Ho-ten>/<nhom>/<ngay>_<nhom>_<ten-goc>_<hex>.<duoi>`.
   *
   * Tep tai len truoc ban 1.25.0 con o dang cu `YYYY-MM/<uuid>.<duoi>` cho tới khi chạy
   * sắp xếp.
   */
  ten_luu: string;
  kieu_mime: string;
  kich_thuoc: number;
  tao_luc: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  tai_len_boi: string | null;
}

interface TinhTrangSapXep {
  tong: number;
  /** Tep dang nam sai thu muc so voi ma nhan vien / ho ten hien tai. */
  lech: number;
  /** Tep con o cay cu `YYYY-MM/<uuid>.<duoi>`. */
  cay_cu: number;
  /** Duong dan trong CSDL khong hop le — du lieu hong, phai co nguoi xem. */
  duong_dan_xau: number;
}

interface KetQuaSapXep {
  so_xet: number;
  so_doi_cho: number;
  so_dung_cho: number;
  so_mat_tep: number;
  so_duong_dan_xau: number;
  che_do: 'thu' | 'that';
  cat_bot: boolean;
  chi_tiet: {
    id: string; ma_nv: string; ho_ten: string; ten_goc: string;
    tu: string; den: string; ket_qua: string;
  }[];
}

interface DongSharePoint {
  tep_id: string;
  duong_dan_muon: string | null;
  duong_dan_da_day: string | null;
  ket_qua: 'chua_lam' | 'xong' | 'loi' | 'bo_qua';
  ly_do: string | null;
  so_lan_thu: number;
  so_byte: string | null;
  lam_luc: string | null;
  ma_nv: string | null;
  ho_ten: string | null;
  nhom: string | null;
  ten_goc: string | null;
}

interface TinhHinhSharePoint {
  bat_day: boolean;
  da_cau_hinh: boolean;
  tong: number;
  da_day: number;
  con_viec: number;
  loi: number;
  bo_qua: number;
  bo_lai: number;
  loc: string;
  danh_sach: DongSharePoint[];
  ket_noi: { ok: boolean; thong_diep: string; ten_thu_vien?: string };
}

interface KetQuaDongBo {
  ghi_nhan: { so_xet: number; so_doi: number; so_bo_qua: number };
  quet: { so_con_viec: number; so_day: number; so_xoa: number; so_loi: number; chi_dem: boolean } | null;
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

      <KhoiSapXep />

      <KhoiSharePoint />

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

/**
 * Sap xep kho tep vao dung cay thu muc.
 *
 * Cay thu muc mang MA NHAN VIEN va HO TEN, ma hai thu do doi duoc — dong bo ERP ghi lai ho
 * ten moi lan chay. Thu muc duoc doi ngay tai cho khi sua ho so, va co mot lan quet moi ngay
 * lam luoi hung. Man hinh nay de nhin thay tinh trang va de chay tay khi can.
 *
 * KHOA DOC VAN LA `ten_luu` TRONG CSDL. Lech thu muc KHONG lam mat duong doc tep — no chi
 * lam ten thu muc khong khop voi ho so. Vi the o day khong co canh bao do; chi la mot con so.
 */
function KhoiSapXep(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<TinhTrangSapXep>('/api/ho-so/sap-xep-tep');
  const [kq, dat_kq] = useState<KetQuaSapXep | null>(null);
  const hd = dung_hanh_dong();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const tt = du_lieu ?? { tong: 0, lech: 0, cay_cu: 0, duong_dan_xau: 0 };
  const co_viec = tt.lech > 0 || tt.duong_dan_xau > 0;

  const chay = (che_do: 'thu' | 'that') => (): void => {
    if (che_do === 'that' && !window.confirm(
      `Đổi chỗ ${String(tt.lech)} tệp trên đĩa máy chủ?\n\n`
      + 'Chỉ di chuyển TRONG kho hồ sơ — không xóa, không ghi đè, và đường dẫn trong cơ sở '
      + 'dữ liệu được cập nhật cùng lúc nên mọi tệp vẫn mở được.')) return;

    void hd.chay_lay<KetQuaSapXep>(
      () => goi<KetQuaSapXep>('/api/ho-so/sap-xep-tep', { method: 'POST', body: { che_do } }),
      che_do === 'thu' ? 'Đã chạy thử — chưa đổi gì.' : 'Đã sắp xếp.',
    ).then((r) => {
      if (r !== null) dat_kq(r);
      nap_lai();
    });
  };

  return (
    <div className="the">
      <h3>Cây thư mục</h3>
      <p className="mo-ta">
        Tệp lưu theo <code>&lt;MÃ_NV&gt;_&lt;Họ-tên&gt;/&lt;nhóm&gt;/&lt;ngày&gt;_&lt;nhóm&gt;_&lt;tên-gốc&gt;_&lt;mã&gt;.&lt;đuôi&gt;</code>{' '}
        — mở thư mục bằng WinSCP hay sau khi bung một bản sao lưu là đọc được ngay đây là hồ
        sơ của ai, loại gì, từ bao giờ.
      </p>

      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="luoi luoi-4">
        <div className="o-so">
          <div className="o-so-nhan">Tệp trong kho</div>
          <div className="o-so-gia-tri">{tt.tong}</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Chưa đúng chỗ</div>
          <div className="o-so-gia-tri" style={tt.lech > 0 ? { color: 'var(--canh-bao)' } : undefined}>
            {tt.lech}
          </div>
          <div className="o-so-phu">
            {tt.cay_cu > 0 ? `${String(tt.cay_cu)} tệp còn ở cây cũ` : 'sai thư mục so với hồ sơ'}
          </div>
        </div>
        {tt.duong_dan_xau > 0 && (
          <div className="o-so">
            <div className="o-so-nhan">Đường dẫn xấu</div>
            <div className="o-so-gia-tri" style={{ color: 'var(--xau)' }}>{tt.duong_dan_xau}</div>
            <div className="o-so-phu">dữ liệu hỏng — cần người xem</div>
          </div>
        )}
      </div>

      {!co_viec ? (
        <p className="mo-ta">Mọi tệp đã đúng chỗ.</p>
      ) : (
        <>
          <div className="hang-nut">
            <button disabled={hd.dang_chay} onClick={chay('thu')}>Chạy thử</button>
            <button className="nut-chinh" disabled={hd.dang_chay} onClick={chay('that')}>
              Sắp xếp thật
            </button>
          </div>
          <p className="mo-ta">
            <strong>Lệch thư mục không làm mất đường đọc tệp</strong> — cơ sở dữ liệu vẫn giữ
            đúng đường dẫn hiện tại, nên mọi tệp vẫn mở được bình thường. Sắp xếp chỉ để tên
            thư mục khớp lại với hồ sơ.
          </p>
        </>
      )}

      {kq !== null && (
        <>
          <h4>
            {kq.che_do === 'thu' ? 'Chạy thử' : 'Đã sắp xếp'} — xét {kq.so_xet} tệp,{' '}
            {kq.che_do === 'thu' ? 'sẽ đổi' : 'đã đổi'} {kq.so_doi_cho}
            {kq.so_mat_tep > 0 && <>, <span className="nhan-xau">{kq.so_mat_tep} mất tệp</span></>}
          </h4>
          {kq.so_mat_tep > 0 && (
            <div className="hop-luu-y">
              <strong>{kq.so_mat_tep} tệp có dòng trong cơ sở dữ liệu nhưng không còn trên
              đĩa.</strong> Thường là do phục hồi sao lưu thiếu volume <code>ho_so</code>.
            </div>
          )}
          <div className="vo-bang">
            <table className="bang-gon">
              <thead>
                <tr><th>Nhân viên</th><th>Tệp</th><th>Từ → đến</th><th>Kết quả</th></tr>
              </thead>
              <tbody>
                {kq.chi_tiet.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.ma_nv}</strong> — {c.ho_ten}</td>
                    <td>{c.ten_goc}</td>
                    <td className="mo-ta" style={{ wordBreak: 'break-all' }}>
                      {c.tu}<br />→ {c.den === '' ? '—' : c.den}
                    </td>
                    <td>
                      <span className={
                        c.ket_qua === 'mat_tep' || c.ket_qua === 'duong_dan_xau'
                          ? 'nhan-xau' : 'nhan-tot'
                      }>
                        {c.ket_qua}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {kq.cat_bot && <p className="mo-ta">Hiển thị 200 dòng đầu.</p>}
        </>
      )}
    </div>
  );
}

/**
 * Dong bo kho tep sang thu vien HCNS tren SharePoint.
 *
 * MOT CHIEU: may chu la ban goc, SharePoint la ban sao, va xoa ben nay thi xoa lan sang ben do.
 *
 * Man hinh nay co MOT viec quan trong hon ca viec bat dong bo: cho xem TRUOC duong dan se ghi
 * ra, khi dong bo con dang tat. Dich la thu vien HCNS dang dung that, co nguoi dang xep tay
 * ho so vao do — nen thu tu dung la xem bang truoc, thay duong dan dung, roi moi bat.
 */
function KhoiSharePoint(): ReactNode {
  const [loc, dat_loc] = useState<'con_viec' | 'loi' | 'bo_qua' | 'tat_ca'>('con_viec');
  const { du_lieu, dang_tai, loi, nap_lai } =
    dung_nap<TinhHinhSharePoint>(`/api/ho-so/sharepoint?loc=${loc}`);
  const [kq, dat_kq] = useState<KetQuaDongBo | null>(null);
  const hd = dung_hanh_dong();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const chay = (chi_ghi_nhan: boolean) => (): void => {
    if (!chi_ghi_nhan && du_lieu.bat_day && !window.confirm(
      `Đẩy ${String(du_lieu.con_viec)} tệp lên thư viện HCNS trên SharePoint?\n\n`
      + 'Một chiều: bản trên SharePoint bị ghi đè theo bản trên máy chủ, và tệp đã gỡ ở đây '
      + 'sẽ bị xóa ở đó (vào thùng rác của site, giữ 93 ngày).\n\n'
      + 'Ứng dụng chỉ ghi vào các nhánh đã khai và chỉ trong thư mục của từng nhân viên — '
      + 'không chạm vào tệp do người khác xếp tay.')) return;

    void hd.chay_lay<KetQuaDongBo>(
      () => goi<KetQuaDongBo>('/api/ho-so/sharepoint', { method: 'POST', body: { chi_ghi_nhan } }),
      chi_ghi_nhan ? 'Đã tính lại đường dẫn — chưa đẩy gì.' : 'Đã chạy đồng bộ.',
    ).then((r) => {
      if (r !== null) dat_kq(r);
      nap_lai();
    });
  };

  return (
    <div className="the">
      <h3>Đồng bộ SharePoint — thư viện HCNS</h3>
      <p className="mo-ta">
        Tệp trên SharePoint mang <strong>quy ước tên của HCNS</strong>, khác quy ước trên đĩa
        và cố ý khác: tên trên đĩa phải đi qua tar/scp/rsync nên bỏ dấu, còn quy ước của HCNS
        viết cho người đọc —{' '}
        <code>[LOẠI] SỐ [MÃ] - [TÊN CÓ DẤU] - DD-MM-YYYY</code> trong thư mục{' '}
        <code>[Mã NV]-[Họ tên]</code>. Ngày dùng gạch nối theo đúng đặc tả, để iOS không hiểu
        nhầm đuôi tệp.
      </p>

      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      {!du_lieu.da_cau_hinh && (
        <div className="hop-luu-y">
          <strong>Chưa cấu hình.</strong> Khai <code>SHAREPOINT_SITE_ID</code>,{' '}
          <code>SHAREPOINT_CLIENT_ID</code>, <code>SHAREPOINT_CLIENT_SECRET</code> trong{' '}
          <code>.env</code>. Bảng dưới vẫn tính được đường dẫn sẽ ghi ra, nên xem trước được
          ngay bây giờ.
        </div>
      )}
      {du_lieu.da_cau_hinh && !du_lieu.ket_noi.ok && (
        <div className="hop-luu-y">
          <strong>Chưa kết nối được:</strong> {du_lieu.ket_noi.thong_diep}
        </div>
      )}
      {du_lieu.da_cau_hinh && !du_lieu.bat_day && (
        <div className="hop-luu-y">
          <strong>Đang ở chế độ chỉ đếm.</strong> Đặt <code>SHAREPOINT_BAT_DAY=1</code> trong{' '}
          <code>.env</code> để đẩy thật. Xem bảng dưới thấy đường dẫn đúng rồi hãy bật.
        </div>
      )}

      <div className="luoi luoi-4">
        <div className="o-so">
          <div className="o-so-nhan">Đang có trên SharePoint</div>
          <div className="o-so-gia-tri">{du_lieu.da_day}</div>
          <div className="o-so-phu">trong {du_lieu.tong} tệp đã xét</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Còn phải làm</div>
          <div
            className="o-so-gia-tri"
            style={du_lieu.con_viec > 0 ? { color: 'var(--canh-bao)' } : undefined}
          >
            {du_lieu.con_viec}
          </div>
          <div className="o-so-phu">đẩy mới, đổi chỗ hoặc xóa theo</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Lỗi</div>
          <div className="o-so-gia-tri" style={du_lieu.loi > 0 ? { color: 'var(--xau)' } : undefined}>
            {du_lieu.loi}
          </div>
          <div className="o-so-phu">
            {du_lieu.bo_lai > 0 ? `${String(du_lieu.bo_lai)} đã hết lượt thử` : 'lần làm gần nhất'}
          </div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Không đồng bộ</div>
          <div className="o-so-gia-tri">{du_lieu.bo_qua}</div>
          <div className="o-so-phu">nhóm không có nhánh trong đặc tả</div>
        </div>
      </div>

      <div className="hang-nut">
        <button disabled={hd.dang_chay} onClick={chay(true)}>Tính lại đường dẫn</button>
        <button
          className="nut-chinh"
          disabled={hd.dang_chay || !du_lieu.bat_day || du_lieu.con_viec === 0}
          onClick={chay(false)}
        >
          Đồng bộ ngay
        </button>
      </div>

      {du_lieu.bo_lai > 0 && (
        <p className="mo-ta">
          {du_lieu.bo_lai} tệp đã hết lượt thử nên vòng quét hằng ngày bỏ lại — sửa nguyên nhân
          ở cột <em>Lý do</em> rồi bấm{' '}
          <button
            className="nut-nho nut-phang"
            disabled={hd.dang_chay}
            onClick={() => {
              void hd.chay(
                () => goi('/api/ho-so/sharepoint/thu-lai', { method: 'POST' }),
                'Đã mở lại các dòng lỗi.',
              ).then(() => { nap_lai(); });
            }}
          >
            cho thử lại
          </button>.
        </p>
      )}

      <div className="hang-nut">
        {(['con_viec', 'loi', 'bo_qua', 'tat_ca'] as const).map((l) => (
          <button
            key={l}
            className={loc === l ? 'nut-chinh' : undefined}
            onClick={() => dat_loc(l)}
          >
            {{ con_viec: 'Còn phải làm', loi: 'Lỗi', bo_qua: 'Không đồng bộ', tat_ca: 'Tất cả' }[l]}
          </button>
        ))}
      </div>

      {du_lieu.danh_sach.length === 0 ? (
        <Trong tieu_de="Không có dòng nào trong mục này." />
      ) : (
        <div className="vo-bang">
          <table className="bang-gon">
            <thead>
              <tr>
                <th>Nhân viên</th><th>Tệp</th><th>Đường dẫn trên SharePoint</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {du_lieu.danh_sach.map((d) => (
                <tr key={d.tep_id}>
                  <td>
                    {d.ma_nv === null
                      ? <span className="mo-ta">— đã gỡ —</span>
                      : <><strong>{d.ma_nv}</strong> — {d.ho_ten}</>}
                  </td>
                  <td>
                    {d.ten_goc ?? <span className="mo-ta">—</span>}
                    {d.nhom !== null && <><br /><span className="mo-ta">{d.nhom}</span></>}
                  </td>
                  <td className="mo-ta" style={{ wordBreak: 'break-all' }}>
                    {d.duong_dan_muon ?? <em>không đồng bộ / phải xóa</em>}
                    {d.duong_dan_da_day !== null && d.duong_dan_da_day !== d.duong_dan_muon && (
                      <><br />đang ở: {d.duong_dan_da_day}</>
                    )}
                  </td>
                  <td>
                    <span className={
                      d.ket_qua === 'loi' ? 'nhan-xau'
                        : d.ket_qua === 'xong' ? 'nhan-tot' : undefined
                    }>
                      {{
                        chua_lam: 'chờ', xong: 'xong', loi: 'lỗi', bo_qua: 'không đồng bộ',
                      }[d.ket_qua]}
                    </span>
                    {d.so_lan_thu > 0 && <> ({d.so_lan_thu} lần)</>}
                    {d.ly_do !== null && (
                      <><br /><span className="mo-ta">{d.ly_do}</span></>
                    )}
                    {d.lam_luc !== null && (
                      <><br /><span className="mo-ta">{ngay_gio(d.lam_luc)}</span></>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kq !== null && (
        <p className="mo-ta">
          Xét {kq.ghi_nhan.so_xet} tệp, cập nhật {kq.ghi_nhan.so_doi} dòng
          {kq.quet !== null && (
            <>
              ; đẩy {kq.quet.so_day}, xóa {kq.quet.so_xoa}
              {kq.quet.so_loi > 0 && <>, lỗi {kq.quet.so_loi}</>}
              {kq.quet.chi_dem && ' (chỉ đếm — chưa bật SHAREPOINT_BAT_DAY)'}
            </>
          )}.
        </p>
      )}
    </div>
  );
}
