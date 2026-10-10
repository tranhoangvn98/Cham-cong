// Trang GOP Y DU THAO (ca nhan) — mo tu link trong email moi lay y kien:
//
//   {goc_web}/gop-y-du-thao?van_ban_id=<id>
//
// Chi hien du thao khi no DANG lay y kien va nguoi dang nhap TRONG pham vi van ban; con lai
// may chu tra 404 ("Không tìm thấy"). Chua dang nhap thi app tu chuyen sang man dang nhap —
// dung yeu cau "dang nhap vao he thong va tai khoan co trong he thong".
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { goi, tai_blob, tai_tep, tai_tep_blob } from '../api.ts';
import {
  AnhCoToken, DangTai, HopLoi, HopThoai, HopTot, ThreadKhieuNai, dung_hanh_dong, dung_nap,
  ngay_gio,
  type TinNhanKN,
} from '../thanh_phan.tsx';
import { dung_chuoi } from '../chuoi/chi_muc.tsx';

interface YKCuaToi {
  id: string;
  ma: string | null;
  tieu_de: string;
  noi_dung: string;
  trang_thai: string;
  tao_luc: string;
  tra_loi: TinNhanKN[];
  anh: { id: string; ten: string }[];
}

interface DuThao {
  id: string;
  ma: string;
  loai: string;
  trich_yeu: string;
  noi_dung: string;
  han_lay_y_kien: string | null;
  tep_kem: { id: string; ten_goc: string; kich_thuoc: number }[];
  y_kien_cua_toi: YKCuaToi[];
}

const NHAN_LOAI: Record<string, string> = {
  thong_bao: 'Thông báo', quyet_dinh: 'Quyết định', cong_van: 'Công văn',
};

const NHAN_TT: Record<string, string> = {
  moi: 'Chờ phản hồi', dang_xem: 'Đã tiếp nhận', da_dong: 'Đã hoàn tất',
};

export function TrangGopYDuThao(): ReactNode {
  // Router bo qua chuoi truy van — doc truc tiep tu URL mot lan luc mount.
  const van_ban_id = useMemo(
    () => new URLSearchParams(window.location.search).get('van_ban_id') ?? '', []);
  const chi = dung_nap<DuThao>(
    van_ban_id === '' ? '' : `/api/toi/van-ban-du-thao/${van_ban_id}`, [van_ban_id]);
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const [y_kien, dat_y_kien] = useState('');

  // Popup XEM NHANH tep dinh kem: docx render bang docx-preview, pdf nhung iframe san
  // sandbox (giong ho so), con lai chi hien thong bao + nut tai ve.
  const [tep_mo, dat_tep_mo] = useState<{ id: string; ten: string } | null>(null);
  const [url_pdf, dat_url_pdf] = useState<string | null>(null);
  const [dang_docx, dat_dang_docx] = useState(false);
  const [loi_xem, dat_loi_xem] = useState<string | null>(null);
  const o_docx = useRef<HTMLDivElement | null>(null);
  // Id cua tep DANG mo — dung trong ham bat dong bo (state trong closure luon cu).
  const tep_mo_ref = useRef<string | null>(null);

  const duoi_tep = (ten: string): string => (ten.split('.').pop() ?? '').toLowerCase();

  const dong_xem = (): void => {
    tep_mo_ref.current = null;
    if (url_pdf !== null) URL.revokeObjectURL(url_pdf);
    dat_url_pdf(null);
    dat_tep_mo(null);
    dat_loi_xem(null);
    if (o_docx.current !== null) o_docx.current.innerHTML = '';
  };

  const mo_xem_nhanh = (t: { id: string; ten_goc: string }): void => {
    const duoi = duoi_tep(t.ten_goc);
    dat_tep_mo({ id: t.id, ten: t.ten_goc });
    tep_mo_ref.current = t.id;
    dat_loi_xem(null);
    dat_url_pdf(null);
    if (duoi === 'docx') {
      dat_dang_docx(true);
      void (async () => {
        try {
          const blob = await tai_tep_blob(
            `/api/toi/van-ban-du-thao/${van_ban_id}/tep-kem/${t.id}`);
          const { renderAsync } = await import('docx-preview');
          if (o_docx.current === null) return;
          o_docx.current.innerHTML = '';
          await renderAsync(blob, o_docx.current);
          // Co trang docx cho VUA khung de khong phai cuon ngang (giong ban thao van ban AI).
          const khung = o_docx.current;
          const trang = khung.querySelector<HTMLElement>('section.docx');
          if (trang !== null) {
            const rong = khung.clientWidth - 48;
            if (rong > 0) {
              trang.style.width = `${rong}px`;
              trang.style.minWidth = `${rong}px`;
            }
          }
        } catch (loi) {
          dat_loi_xem(loi instanceof Error ? loi.message : tra('vai_khong_mo_docx'));
        } finally {
          dat_dang_docx(false);
        }
      })();
    } else if (duoi === 'pdf') {
      void (async () => {
        try {
          const b = await tai_blob(`/api/toi/van-ban-du-thao/${van_ban_id}/tep-kem/${t.id}`);
          if (tep_mo_ref.current === t.id) dat_url_pdf(b.url);
          else URL.revokeObjectURL(b.url);
        } catch {
          dat_loi_xem(tra('vai_khong_mo_docx'));
        }
      })();
    }
  };

  const gui = (): void => {
    void hd.chay(
      () => goi('/api/toi/y-kien-du-thao', { method: 'POST', body: { nhap_ai_id: van_ban_id, noi_dung: y_kien } }),
      'Đã gửi ý kiến. Phòng Nhân sự sẽ tiếp nhận và phản hồi.',
    ).then((ok) => { if (ok) { dat_y_kien(''); chi.nap_lai(); } });
  };

  if (van_ban_id === '') {
    return <HopLoi loi="Thiếu mã văn bản dự thảo trong đường dẫn — hãy mở lại từ email mời." />;
  }
  if (chi.dang_tai) return <DangTai />;
  const d = chi.du_lieu;
  if (chi.loi !== null || d === null) {
    return <HopLoi loi={chi.loi ?? 'Không tìm thấy dự thảo đang lấy ý kiến. Có thể văn bản đã ' +
      'kết thúc lấy ý kiến, hoặc tài khoản của bạn nằm ngoài phạm vi văn bản.'} />;
  }

  return (
    <>
      <div className="dau-trang">
        <h1>Góp ý dự thảo văn bản</h1>
        <p className="mo-ta">
          {NHAN_LOAI[d.loai] ?? d.loai} · {d.ma}
          {d.han_lay_y_kien !== null && <> · Hạn góp ý: {ngay_gio(d.han_lay_y_kien)}</>}.
          Đọc nội dung dưới đây và gửi ý kiến của bạn. Mỗi ý kiến là một cuộc trao đổi riêng,
          Phòng Nhân sự sẽ phản hồi trực tiếp.
        </p>
      </div>

      <div className="the">
        <div className="canhan-muc-dau"><h3>{d.trich_yeu}</h3></div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{d.noi_dung}</div>
      </div>

      {d.tep_kem.length > 0 && (
        <div className="the" style={{ marginTop: 12 }}>
          <div className="canhan-muc-dau"><h3>Tệp đính kèm ({d.tep_kem.length})</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.tep_kem.map((t) => (
              <div key={t.id} className="hang-nut" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <button className="nut-phang nut-nho tep-ten-nut"
                  title={tra('ht_xem_tep')}
                  onClick={() => mo_xem_nhanh(t)}>
                  {t.ten_goc}
                </button>
                <span className="mo-ta">{Math.max(1, Math.round(t.kich_thuoc / 1024))} KB</span>
                <button className="nut-phang nut-nho"
                  onClick={() => { void tai_tep(`/api/toi/van-ban-du-thao/${d.id}/tep-kem/${t.id}`, t.ten_goc); }}>
                  {tra('ht_tai_tep')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <HopTot chu={hd.tot} />

      <div className="the" style={{ marginTop: 12 }}>
        <div className="canhan-muc-dau"><h3>Gửi ý kiến của bạn</h3></div>
        <textarea value={y_kien} onChange={(e) => dat_y_kien(e.target.value)} rows={4}
          placeholder="Nêu ý kiến, băn khoăn hoặc đề xuất chỉnh sửa…" />
        <div className="hang-nut" style={{ marginTop: 8 }}>
          <button disabled={hd.dang_chay || y_kien.trim().length < 1} onClick={gui}>
            {hd.dang_chay ? 'Đang gửi…' : 'Gửi ý kiến'}
          </button>
        </div>
      </div>

      {d.y_kien_cua_toi.length === 0 ? (
        <p className="mo-ta" style={{ marginTop: 12 }}>Bạn chưa gửi ý kiến nào cho dự thảo này.</p>
      ) : (
        <div className="the" style={{ marginTop: 12 }}>
          <div className="canhan-muc-dau"><h3>Ý kiến của bạn ({d.y_kien_cua_toi.length})</h3></div>
          {d.y_kien_cua_toi.map((y) => (
            <div key={y.id} style={{ marginBottom: 16 }}>
              <div className="canhan-muc-dau">
                <h4>{y.tieu_de} <span className="mo-ta">{ngay_gio(y.tao_luc)} · {NHAN_TT[y.trang_thai] ?? y.trang_thai}</span></h4>
              </div>
              <ThreadKhieuNai noi_dung={y.noi_dung} tao_luc={y.tao_luc} tra_loi={y.tra_loi} />
              {y.anh.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '4px 0 8px' }}>
                  {y.anh.map((a) => (
                    <AnhCoToken key={a.id} duong_dan={`/api/ho-thu-y-kien/anh/${a.id}`}
                      alt={a.ten} cao={120} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tep_mo !== null && (
        <HopThoai tieu_de={tep_mo.ten} khi_dong={dong_xem} rong>
          {loi_xem !== null && <HopLoi loi={loi_xem} />}
          <div className="hang-nut" style={{ marginBottom: 8, justifyContent: 'flex-start', gap: 10 }}>
            <button className="nut"
              onClick={() => { void tai_tep(`/api/toi/van-ban-du-thao/${van_ban_id}/tep-kem/${tep_mo.id}`, tep_mo.ten); }}>
              {tra('ht_tai_tep')}
            </button>
            {dang_docx && <span className="mo-ta">{tra('vai_dang_mo')}</span>}
          </div>
          {duoi_tep(tep_mo.ten) === 'docx' && <div className="o-xem-docx" ref={o_docx} />}
          {duoi_tep(tep_mo.ten) === 'pdf' && (url_pdf !== null
            ? <iframe src={url_pdf} title={tep_mo.ten} className="khung-pdf" />
            : <DangTai />)}
          {duoi_tep(tep_mo.ten) !== 'docx' && duoi_tep(tep_mo.ten) !== 'pdf' && (
            <p className="mo-ta">{tra('ht_tep_khong_xem_nhanh')}</p>
          )}
        </HopThoai>
      )}
    </>
  );
}
