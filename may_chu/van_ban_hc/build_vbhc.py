#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sinh tep DOCX dung the thuc Nghi dinh 30/2020/ND-CP (doanh nghiep VAN DUNG).

Dung:  python build_vbhc.py <spec.json> <ket_qua.docx>

Day la mot sidecar DOC LAP: nhan duy nhat mot tep spec JSON, tra duy nhat mot tep
DOCX. Khong truy van CSDL, khong goi mang, khong quyet dinh truong nao — moi truong
he thong (so ky hieu, ngay, dia danh, nguoi ky) do ben goi (TypeScript) dien san trong
spec. Noi dung AI soan (noi_dung, trich_yeu, kinh_gui, can_cu, dieu) chi duoc IN LAI.

Ma loi (exit code):
  0  thanh cong
  2  sai tham so dong lenh / spec khong hop le
  1  loi khi dung docx
"""

import json
import re
import sys
import datetime

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.shared import Pt, Cm, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


# ---------------------------------------------------------------- khuon dang co ban

FONT = "Times New Roman"
CO_CHU = 13          # ND30: phong chu 13-14 (noi dung, so ky hieu, dia danh-ngay)
CO_TIEU_DE = 14      # ten loai van ban
CO_QUOC_HIEU = 12    # A-15 bac THAP: quoc hieu 12
CO_TIEU_NGU = 13     # A-15 bac THAP: tieu ngu 13 (lon hon quoc hieu)
CO_NOI_NHAN = 12     # D-24: chu "Nơi nhận" co 12, nghieng, dam
CO_DANH_SACH_NOI_NHAN = 11  # D-25: danh sach noi nhan co 11, dung
CO_SO_TRANG = 13     # so trang (D-33: 13-14)

# ND30: gian dong toi thieu 1.5, canh deu, thut dau dong 1.27cm.
GIAN_DONG = 1.5
THUT_DAU_DONG = Cm(1.27)

MAU_DO = RGBColor(0xE5, 0x39, 0x35)   # cho chu "DỰ THẢO" — mau do dam ND30 cho dau D
DEN = RGBColor(0, 0, 0)


def dong(spec, khoa, mac_dinh=""):
    v = spec.get(khoa)
    if not isinstance(v, str) or not v.strip():
        if not mac_dinh:
            loi(f"spec thieu truong bat buoc: {khoa}")
        return mac_dinh
    return v.strip()


def danh_sach(spec, khoa, bat_buoc=False):
    v = spec.get(khoa)
    if not isinstance(v, list):
        if bat_buoc:
            loi(f"spec thieu truong bat buoc (mang): {khoa}")
        return []
    return [str(x).strip() for x in v if str(x).strip()]


def loi(thong_diep):
    """Thoat voi ma 2 — sai dau vao. Thong diep ve stderr de ben goi doc duoc."""
    print(f"LOI spec: {thong_diep}", file=sys.stderr)
    sys.exit(2)


# ---------------------------------------------------------------- tien ich OOXML

def can_giua(doc, chu, co=CO_CHU, dam=True, nghieng=False, gach_duoi=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(chu)
    r.font.name = FONT
    r.font.size = Pt(co)
    r.font.bold = dam
    r.font.italic = nghieng
    r.font.underline = gach_duoi
    return p


def can_phai(doc, chu, co=CO_CHU, dam=False, nghieng=False, gach_duoi=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(chu)
    r.font.name = FONT
    r.font.size = Pt(co)
    r.font.bold = dam
    r.font.italic = nghieng
    r.font.underline = gach_duoi
    return p


def can_trai(doc, chu, co=CO_CHU, dam=False, nghieng=False, thut=True, gach_duoi=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = GIAN_DONG
    if thut:
        p.paragraph_format.first_line_indent = THUT_DAU_DONG
    r = p.add_run(chu)
    r.font.name = FONT
    r.font.size = Pt(co)
    r.font.bold = dam
    r.font.italic = nghieng
    r.font.underline = gach_duoi
    return p


def ngay_viet(ngay):
    """'2026-07-22' -> 'ngày 22 tháng 07 năm 2026' — theo mau THVN: ngay va
    thang DEU ghi so 0 dang truoc (vd 'tháng 07' trong mau)."""
    try:
        d = datetime.date.fromisoformat(ngay)
    except ValueError:
        loi(f"ngay khong hop le (can YYYY-MM-DD): {ngay}")
    return "ngày %02d tháng %02d năm %d" % (d.day, d.month, d.year)


# ---------------------------------------------------------------- cac khoi van ban

def _them_gach_ngang(p, trai_cm, phai_cm):
    """Them duong ke NAM NGANG net lien vao doan p: chay tu le trai `trai_cm` den
    cach le phai `phai_cm` (B-12..B-14: ke that, khong phai gach duoi chu)."""
    p.paragraph_format.left_indent = Cm(trai_cm)
    p.paragraph_format.right_indent = Cm(phai_cm)
    p.paragraph_format.space_after = Pt(0)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "000000")
    pBdr.append(bottom)
    pPr.append(pBdr)


def _chia_dong_ten(co_quan):
    """Chia ten co quan dai thanh 2 dong CAN BANG nhu mau THVN (vd
    'CÔNG TY TNHH TRẦN' / 'HOÀNG VIỆT NAM'): cat o tu cho hai dong xap xi bang
    nhau, khong cat roi cum phap ly ("CỔ PHẦN", "TNHH MTV")."""
    tu = co_quan.split()
    if len(tu) <= 3:
        return [co_quan]
    cum_khong_cat = {("CỔ", "PHẦN"), ("TNHH", "MTV")}
    tong_chu = sum(len(t) for t in tu)
    diem_tot = 1
    lech_tot = None
    for i in range(1, len(tu)):
        if (tu[i - 1].upper(), tu[i].upper()) in cum_khong_cat:
            continue
        dong1 = sum(len(t) for t in tu[:i]) + (i - 1)
        dong2 = tong_chu - sum(len(t) for t in tu[:i]) + (len(tu) - i - 1)
        lech = abs(dong1 - dong2)
        if lech_tot is None or lech < lech_tot:
            lech_tot = lech
            diem_tot = i
    return [" ".join(tu[:diem_tot]), " ".join(tu[diem_tot:])]


def _dinh_run(r, co=CO_CHU, dam=False, nghieng=False, gach=False, mau=None):
    """Dat font cho mot run."""
    r.font.name = FONT
    r.font.size = Pt(co)
    r.font.bold = dam
    r.font.italic = nghieng
    r.font.underline = gach
    if mau is not None:
        r.font.color.rgb = mau


def _o_phang(cell, canh=WD_ALIGN_PARAGRAPH.LEFT):
    """Doan dau tien cua o, canh le + gian dong don."""
    p = cell.paragraphs[0]
    p.alignment = canh
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.0
    return p


def _them_so_vao_doan(p, spec):
    """Viet 'Số: ...' vao doan p — DỰ THẢO do dam (ban nhap) hoac so ky hieu thuong."""
    _dinh_run(p.add_run("Số: "))
    du_thao = bool(spec.get("du_thao"))
    if du_thao:
        _dinh_run(p.add_run("DỰ THẢO"), dam=True, mau=MAU_DO)
        _dinh_run(p.add_run("  (chưa cấp số)"), co=10, nghieng=True)
    else:
        _dinh_run(p.add_run(spec.get("so_ky_hieu") or ""))


def viet_dau_thu(doc, co_quan, spec):
    """Mau dau thu THVN (bang 2 cot x 4 dong):
    trai: ten co quan 2 dong can bang + duong ke dai bang dong ten + Số;
    phai: quoc hieu + tieu ngu + duong ke HET chieu ngang cot + dia danh/ngay."""
    bang = doc.add_table(rows=4, cols=2)
    bang.autofit = False
    tbl_pr = bang._tbl.tblPr
    layout = tbl_pr.makeelement(qn("w:tblLayout"), {qn("w:type"): "fixed"})
    tbl_pr.append(layout)
    # Le TRONG o nho (0,1 cm) de quoc hieu "CỘNG HÒA..." NAM GON MOT DONG.
    mar = tbl_pr.makeelement(qn("w:tblCellMar"), {})
    for ten_canh in ("left", "right"):
        canh = OxmlElement("w:%s" % ten_canh)
        canh.set(qn("w:w"), "57")
        canh.set(qn("w:type"), "dxa")
        mar.append(canh)
    tbl_pr.append(mar)
    for hang in bang.rows:
        for o in hang.cells:
            o._tc.get_or_add_tcPr().append(
                o._tc.get_or_add_tcPr().makeelement(qn("w:tcBorders"), {})
            )
    bang.columns[0].width = Cm(7.0)
    bang.columns[1].width = Cm(9.5)
    for hang in bang.rows:
        hang.cells[0].width = Cm(7.0)
        hang.cells[1].width = Cm(9.5)

    # --- cot trai: ten co quan 2 dong + ke + Số ---
    cac_dong = _chia_dong_ten(co_quan)
    for i, dong_ten in enumerate(cac_dong):
        p = _o_phang(bang.rows[i].cells[0])
        _dinh_run(p.add_run(dong_ten), dam=True)
    p_ke = _o_phang(bang.rows[2].cells[0])
    # Duong ke dai bang dong ten THU NHAT (mau THVN: "____" duoi ten cong ty).
    _them_gach_ngang(p_ke, 0.2, 7.0 - 0.2 - 5.6)
    p_so = _o_phang(bang.rows[3].cells[0])
    _them_so_vao_doan(p_so, spec)

    # --- cot phai: quoc hieu + tieu ngu + ke het ngang cot + dia danh/ngay ---
    p1 = _o_phang(bang.rows[0].cells[1], WD_ALIGN_PARAGRAPH.RIGHT)
    _dinh_run(p1.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), co=CO_QUOC_HIEU, dam=True)
    p2 = _o_phang(bang.rows[1].cells[1], WD_ALIGN_PARAGRAPH.RIGHT)
    _dinh_run(p2.add_run("Độc lập - Tự do - Hạnh phúc"), co=CO_TIEU_NGU, dam=True)
    p_ke2 = _o_phang(bang.rows[2].cells[1], WD_ALIGN_PARAGRAPH.RIGHT)
    _them_gach_ngang(p_ke2, 0.0, 0.0)  # mau THVN: ke HET chieu ngang cot phai
    p_ngay = _o_phang(bang.rows[3].cells[1], WD_ALIGN_PARAGRAPH.RIGHT)
    _dinh_run(p_ngay.add_run("%s, %s" % (dong(spec, "dia_danh"), ngay_viet(dong(spec, "ngay")))),
              nghieng=True)

    doc.add_paragraph()  # khoang trong giua dai dau thu va tieu de


def viet_ten_loai_trich_yeu(doc, spec):
    loai = dong(spec, "loai")
    ten_loai = dong(spec, "ten_loai", mac_dinh=" ")
    trich_yeu = dong(spec, "trich_yeu")

    if loai == "cong_van":
        # Cong van KHONG in ten loai. B-03: trich yeu cach so ky hieu 6pt;
        # D-09: trich yeu cong van co 12-13, DUNG, KHONG dam.
        p = can_trai(doc, trich_yeu, thut=False)
        p.paragraph_format.space_before = Pt(6)
    else:
        doc.add_paragraph()  # khoang trong giua so ky hieu va ten loai
        can_giua(doc, ten_loai, co=CO_TIEU_DE)
        can_giua(doc, trich_yeu, co=CO_CHU, dam=True)
        # B-14: duong ke duoi trich yeu, dai ~1/3-1/2, dat CAN DOI o giua.
        p_ke = doc.add_paragraph()
        p_ke.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _them_gach_ngang(p_ke, 4.8, 4.8)
    doc.add_paragraph()


def viet_kinh_gui(doc, kinh_gui):
    if not kinh_gui:
        return
    if len(kinh_gui) == 1:
        # I-04: gui MOT noi — "Kính gửi" va ten noi nhan tren cung mot dong.
        can_trai(doc, "Kính gửi: %s" % kinh_gui[0], thut=False)
    else:
        # I-05: gui TU HAI noi tro len — moi noi mot dong, dau dong "-",
        # cuoi dong ";", dong cuoi cung "." (B-09: thang hang duoi dau hai cham).
        can_trai(doc, "Kính gửi:", thut=False)
        for i, n in enumerate(kinh_gui):
            cuoi = "." if i == len(kinh_gui) - 1 else ";"
            p = can_trai(doc, "- %s%s" % (n, cuoi), thut=False)
            p.paragraph_format.left_indent = Cm(0.75)
    doc.add_paragraph()


def viet_quyet_dinh(doc, spec):
    """Khoi QUYẾT ĐỊNH: can cu -> loi dan -> cac Dieu danh so."""
    # ND30: dong "Căn cứ..." SAT LE TRAI, khong thut dau dong. D-11: can cu NGHIENG.
    # H-08: moi can cu xuong dong, cuoi dong ";", dong cuoi cung ".".
    cac_can_cu = danh_sach(spec, "can_cu")
    for i, c in enumerate(cac_can_cu):
        # Go tien to "Căn cứ " neu AI / nguoi soan tu chen san (tranh "Căn cứ Căn cứ ...").
        c = re.sub(r"^Căn cứ\s+", "", c, flags=re.IGNORECASE)
        # Dong "Theo đề nghị..." khong them tien to "Căn cứ" (the thuc dung).
        tien_to = "" if re.match(r"^Theo\s+đề nghị", c, flags=re.IGNORECASE) else "Căn cứ "
        cuoi = "." if i == len(cac_can_cu) - 1 else ";"
        can_trai(doc, "%s%s%s" % (tien_to, c.rstrip(".;"), cuoi), thut=False, nghieng=True)
    doc.add_paragraph()

    # Loi dan do AI viet, bat buoc co "QUYẾT ĐỊNH:" (gate G8 kiem). AI viet hai kieu:
    # (a) "QUYẾT ĐỊNH:" ngay cuoi doan loi dan; (b) "QUYẾT ĐỊNH:" la mot doan rieng.
    # Builder in dong "QUYẾT ĐỊNH:" DUNG MOT LAN, truoc cac Dieu.
    loi_dan = danh_sach(spec, "noi_dung")
    vi_tri_danh_dau = -1
    for i, doan in enumerate(loi_dan):
        if re.fullmatch(r"QUYẾT\s*ĐỊNH\s*:?", doan.strip(), flags=re.IGNORECASE):
            vi_tri_danh_dau = i
            break

    # Phan loi dan TRUOC dong danh dau — in truoc "QUYẾT ĐỊNH:".
    truoc = loi_dan[:vi_tri_danh_dau] if vi_tri_danh_dau >= 0 else loi_dan
    for doan in truoc:
        can_trai(doc, doan)
    cuoi_loi_dan = truoc[-1].rstrip() if truoc else ""
    if not cuoi_loi_dan.endswith("QUYẾT ĐỊNH:"):
        can_giua(doc, "QUYẾT ĐỊNH:", co=CO_CHU)
    doc.add_paragraph()

    for i, dieu in enumerate(danh_sach(spec, "dieu", bat_buoc=True), start=1):
        # "Điều 1. Noi dung dieu" — noi dung co the xuong dong thanh nhieu doan.
        cac_dong = dieu.split("\n")
        # Go tien to "Điều N." neu AI tu chen san (tranh in thanh "Điều 1. Điều 1 ...").
        dau = re.sub(r"^Điều\s+\d+[.:]?\s*", "", cac_dong[0])
        # B-07 / H-05: tu "Điều" LUI DAU DONG 1,27 cm (giong noi dung).
        can_trai(doc, "Điều %d. %s" % (i, dau), dam=True, thut=True)
        for doan in cac_dong[1:]:
            can_trai(doc, doan)

    # Phan loi dan SAU dong danh dau (AI viet them) — in sau cac Dieu.
    sau = loi_dan[vi_tri_danh_dau + 1:] if vi_tri_danh_dau >= 0 else []
    for doan in sau:
        can_trai(doc, doan)
    doc.add_paragraph()

def viet_noi_dung(doc, spec):
    for doan in danh_sach(spec, "noi_dung"):
        for dong in doan.split("\n"):
            can_trai(doc, dong)
    doc.add_paragraph()


def them_so_trang(doc):
    """A-12/A-13: so trang CANH GIUA trong PHAN LE TREN (header); trang 1 khong hien."""
    section = doc.sections[0]
    section.different_first_page_header_footer = True
    h = section.header
    p = h.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.font.name = FONT
    run.font.size = Pt(CO_SO_TRANG)
    fld1 = OxmlElement("w:fldChar")
    fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = "PAGE"
    fld2 = OxmlElement("w:fldChar")
    fld2.set(qn("w:fldCharType"), "end")
    run._r.append(fld1)
    run._r.append(instr)
    run._r.append(fld2)


def viet_noi_nhan_ky_ten(doc, spec):
    noi_nhan = danh_sach(spec, "noi_nhan")
    nguoi_ky = dong(spec, "nguoi_ky")
    chuc_vu = dong(spec, "chuc_vu_nguoi_ky")

    doc.add_paragraph()  # khoang trong truoc khoi noi nhan / ky ten

    # B-11: dong "Nơi nhận" NGAN HANG voi dong chuc vu nguoi ky -> bang 2 o khong vien.
    bang = doc.add_table(rows=1, cols=2)
    bang.autofit = False
    tbl_pr = bang._tbl.tblPr
    layout = tbl_pr.makeelement(qn("w:tblLayout"), {qn("w:type"): "fixed"})
    tbl_pr.append(layout)
    for o in bang.rows[0].cells:
        o._tc.get_or_add_tcPr().append(
            o._tc.get_or_add_tcPr().makeelement(qn("w:tcBorders"), {})
        )
    bang.columns[0].width = Cm(9.5)
    bang.columns[1].width = Cm(6.5)
    for o, rong in zip(bang.rows[0].cells, (Cm(9.5), Cm(6.5))):
        o.width = rong

    # O trai: "Nơi nhận:" (D-24: co 12, nghieng, dam) + danh sach (D-25: co 11, dung).
    o_trai = bang.rows[0].cells[0]
    p = o_trai.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.0
    r = p.add_run("Nơi nhận:")
    r.font.name = FONT
    r.font.size = Pt(CO_NOI_NHAN)
    r.font.italic = True
    r.font.bold = True
    for n in noi_nhan:
        p2 = o_trai.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p2.paragraph_format.space_after = Pt(0)
        p2.paragraph_format.line_spacing = 1.0
        r2 = p2.add_run("- %s" % n)
        r2.font.name = FONT
        r2.font.size = Pt(CO_DANH_SACH_NOI_NHAN)

    # O phai: chuc vu (D-21) + (Ky, ghi ro ho ten) + ho ten (D-22) — LE PHAI.
    o_phai = bang.rows[0].cells[1]
    p1 = o_phai.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p1.paragraph_format.space_after = Pt(0)
    p1.paragraph_format.line_spacing = 1.0
    r1 = p1.add_run(chuc_vu)
    r1.font.name = FONT
    r1.font.size = Pt(CO_CHU)
    r1.font.bold = True
    p2 = o_phai.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p2.paragraph_format.space_after = Pt(0)
    p2.paragraph_format.line_spacing = 1.0
    r2 = p2.add_run("(Ký, ghi rõ họ tên)")
    r2.font.name = FONT
    r2.font.size = Pt(CO_CHU)
    r2.font.italic = True
    p3 = o_phai.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p3.paragraph_format.space_after = Pt(0)
    p3.paragraph_format.line_spacing = 1.0
    r3 = p3.add_run(nguoi_ky)
    r3.font.name = FONT
    r3.font.size = Pt(CO_CHU)
    r3.font.bold = True

    doc.add_paragraph()


# ---------------------------------------------------------------- diem vao

def dung(spec, duong_dan_ra):
    doc = Document()

    # Kho giay A4, le theo ND30 (trai rong cho dong ghim).
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(1.5)  # A-06: le phai 15 mm (THVN chot)

    # Font mac dinh cho toan tai lieu.
    style = doc.styles["Normal"]
    style.font.name = FONT
    style.font.size = Pt(CO_CHU)
    style.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)

    viet_dau_thu(doc, dong(spec, "co_quan_ban_hanh"), spec)
    viet_ten_loai_trich_yeu(doc, spec)

    loai = dong(spec, "loai")
    # ND30: "Kính gửi" CHI co o cong van. Thong bao / quyet dinh ghi nguoi nhan o "Nơi nhận".
    if loai == "cong_van":
        viet_kinh_gui(doc, danh_sach(spec, "kinh_gui"))

    if loai == "quyet_dinh":
        viet_quyet_dinh(doc, spec)
    else:
        viet_noi_dung(doc, spec)

    viet_noi_nhan_ky_ten(doc, spec)
    them_so_trang(doc)

    doc.save(duong_dan_ra)


def main():
    if len(sys.argv) != 3:
        print("Dung: python build_vbhc.py <spec.json> <ket_qua.docx>", file=sys.stderr)
        sys.exit(2)

    duong_dan_spec, duong_dan_ra = sys.argv[1], sys.argv[2]
    try:
        with open(duong_dan_spec, "r", encoding="utf-8") as f:
            spec = json.load(f)
    except OSError as e:
        print(f"LOI doc spec: {e}", file=sys.stderr)
        sys.exit(2)
    except json.JSONDecodeError as e:
        print(f"LOI spec khong phai JSON: {e}", file=sys.stderr)
        sys.exit(2)

    if not isinstance(spec, dict):
        loi("spec phai la mot doi tuong JSON")

    try:
        dung(spec, duong_dan_ra)
    except SystemExit:
        raise
    except Exception as e:  # loi cua python-docx / ghi tep
        print(f"LOI dung docx: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
