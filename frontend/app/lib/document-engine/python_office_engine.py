"""
TATTVA AI - Native Python Office Generation & Validation Engine
Generates genuine Microsoft Office (.pptx, .docx) files using python-pptx and python-docx.
Validates file structure, slide counts, paragraph counts, and package integrity.
Conceptualized & Engineered by kotapati Gowtham Chowdary
"""

import sys
import json
import base64
import io
import os

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN
    from pptx.enum.shapes import MSO_SHAPE
    HAS_PPTX = True
except ImportError:
    HAS_PPTX = False

try:
    from docx import Document
    from docx.shared import Inches as DocxInches, Pt as DocxPt, RGBColor as DocxRGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.oxml import OxmlElement, parse_xml
    from docx.oxml.ns import nsdecls, qn
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

import csv

try:
    import openpyxl
    from openpyxl import Workbook
    from openpyxl.styles import Font as XlsxFont, PatternFill as XlsxPatternFill, Alignment as XlsxAlignment, Border as XlsxBorder, Side as XlsxSide
    from openpyxl.utils import get_column_letter
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

try:
    import reportlab
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return RGBColor(*(int(hex_str[i:i+2], 16) for i in (0, 2, 4)))


def hex_to_docx_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return DocxRGBColor(*(int(hex_str[i:i+2], 16) for i in (0, 2, 4)))


def set_cell_background(cell, hex_color):
    """Set background color of a docx table cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color.lstrip("#")}"/>')
    tc_pr.append(shd)


def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set internal padding for a docx cell in twentieths of a point (dxa)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tc_pr.append(tc_mar)


def generate_pptx(payload):
    if not HAS_PPTX:
        raise RuntimeError("python-pptx is not installed")

    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]  # Blank slide layout

    title = payload.get("title", "TATTVA AI Presentation")
    subtitle = payload.get("subtitle", "Comprehensive Analysis & Strategic Overview")
    author = payload.get("author", "TATTVA AI Intelligence Suite")
    organization = payload.get("organization", "TATTVA AI")
    raw_slides = payload.get("slides", [])
    content_slides = raw_slides
    if len(content_slides) > 0:
        first_title = content_slides[0].get("title", "").strip().lower()
        first_cat = content_slides[0].get("category", "").strip().upper()
        if first_cat == "EXECUTIVE BRIEF" or first_title == title.strip().lower():
            content_slides = content_slides[1:]

    # 1. Slide 1: Executive Title Slide
    slide1 = prs.slides.add_slide(blank_layout)

    # Accent Top Stripe
    stripe = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.15))
    stripe.fill.solid()
    stripe.fill.fore_color.rgb = hex_to_rgb("2563EB")
    stripe.line.fill.background()

    # Kicker Badge
    badge_box = slide1.shapes.add_textbox(Inches(1.2), Inches(1.8), Inches(10.9), Inches(0.4))
    tf_badge = badge_box.text_frame
    tf_badge.word_wrap = True
    p_badge = tf_badge.paragraphs[0]
    p_badge.text = "EXECUTIVE BRIEF • TATTVA AI INTELLIGENCE SUITE"
    p_badge.font.size = Pt(11)
    p_badge.font.bold = True
    p_badge.font.color.rgb = hex_to_rgb("2563EB")

    # Title Box
    title_box = slide1.shapes.add_textbox(Inches(1.2), Inches(2.3), Inches(10.9), Inches(2.2))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = title
    p_title.font.size = Pt(40)
    p_title.font.bold = True
    p_title.font.color.rgb = hex_to_rgb("0F172A")

    # Subtitle Box
    sub_box = slide1.shapes.add_textbox(Inches(1.2), Inches(4.5), Inches(10.9), Inches(1.2))
    tf_sub = sub_box.text_frame
    tf_sub.word_wrap = True
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = subtitle
    p_sub.font.size = Pt(18)
    p_sub.font.color.rgb = hex_to_rgb("475569")

    # Author / Metadata Footer
    meta_box = slide1.shapes.add_textbox(Inches(1.2), Inches(6.3), Inches(10.9), Inches(0.5))
    tf_meta = meta_box.text_frame
    p_meta = tf_meta.paragraphs[0]
    p_meta.text = f"Prepared by {author} • {organization}"
    p_meta.font.size = Pt(11)
    p_meta.font.color.rgb = hex_to_rgb("94A3B8")

    # 2. Content Slides
    total_slides = len(content_slides) + 1
    for idx, s_data in enumerate(content_slides, 2):
        slide = prs.slides.add_slide(blank_layout)

        # Subtle top accent bar
        top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.08))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = hex_to_rgb("3B82F6")
        top_bar.line.fill.background()

        # Category Kicker
        cat_text = s_data.get("category", f"SECTION 0{idx-1}")
        cat_box = slide.shapes.add_textbox(Inches(0.9), Inches(0.6), Inches(11.5), Inches(0.35))
        tf_cat = cat_box.text_frame
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = cat_text.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = hex_to_rgb("2563EB")

        # Slide Title
        slide_title = s_data.get("title", f"Key Insights {idx-1}")
        st_box = slide.shapes.add_textbox(Inches(0.9), Inches(0.95), Inches(11.5), Inches(0.9))
        tf_st = st_box.text_frame
        tf_st.word_wrap = True
        p_st = tf_st.paragraphs[0]
        p_st.text = slide_title
        p_st.font.size = Pt(26)
        p_st.font.bold = True
        p_st.font.color.rgb = hex_to_rgb("0F172A")

        # Bullets
        bullets = s_data.get("bullets", [])
        if not bullets and s_data.get("content"):
            bullets = [s_data.get("content")]

        if bullets:
            bullets_box = slide.shapes.add_textbox(Inches(0.9), Inches(2.0), Inches(11.5), Inches(4.2))
            tf_b = bullets_box.text_frame
            tf_b.word_wrap = True

            for b_idx, bullet in enumerate(bullets):
                p_b = tf_b.paragraphs[0] if b_idx == 0 else tf_b.add_paragraph()
                p_b.text = f"•  {bullet}"
                p_b.font.size = Pt(16)
                p_b.font.color.rgb = hex_to_rgb("334155")
                p_b.space_before = Pt(10)
                p_b.space_after = Pt(6)

        # Footer
        footer_box = slide.shapes.add_textbox(Inches(0.9), Inches(6.7), Inches(11.5), Inches(0.4))
        tf_f = footer_box.text_frame
        p_f = tf_f.paragraphs[0]
        p_f.text = f"TATTVA AI • Slide {idx} of {total_slides}"
        p_f.alignment = PP_ALIGN.RIGHT
        p_f.font.size = Pt(9)
        p_f.font.color.rgb = hex_to_rgb("94A3B8")

    # Save to memory buffer
    buf = io.BytesIO()
    prs.save(buf)
    buf.seek(0)
    data = buf.read()

    # Reopen and validate integrity
    reopened = Presentation(io.BytesIO(data))
    slide_count = len(reopened.slides)

    return {
        "success": True,
        "format": "pptx",
        "slideCount": slide_count,
        "sizeBytes": len(data),
        "base64": base64.b64encode(data).decode("ascii")
    }


def generate_docx(payload):
    if not HAS_DOCX:
        raise RuntimeError("python-docx is not installed")

    doc = Document()

    # Margins: 1 inch all around
    sections = doc.sections
    for section in sections:
        section.top_margin = DocxInches(1.0)
        section.bottom_margin = DocxInches(1.0)
        section.left_margin = DocxInches(1.0)
        section.right_margin = DocxInches(1.0)

    title = payload.get("title", "TATTVA AI Document")
    subtitle = payload.get("subtitle", "")
    content_sections = payload.get("sections", [])
    references = payload.get("references", [])

    # Document Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run_title = p_title.add_run(title)
    run_title.font.name = "Calibri"
    run_title.font.size = DocxPt(26)
    run_title.font.bold = True
    run_title.font.color.rgb = hex_to_docx_rgb("0F172A")
    p_title.paragraph_format.space_after = DocxPt(4)

    # Subtitle
    if subtitle:
        p_sub = doc.add_paragraph()
        run_sub = p_sub.add_run(subtitle)
        run_sub.font.name = "Calibri"
        run_sub.font.size = DocxPt(13)
        run_sub.font.italic = True
        run_sub.font.color.rgb = hex_to_docx_rgb("475569")
        p_sub.paragraph_format.space_after = DocxPt(14)

    # Decorative Horizontal Line
    p_hr = doc.add_paragraph()
    p_hr_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="2563EB"/></w:pBdr>')
    p_hr._p.get_or_add_pPr().append(p_hr_border)
    p_hr.paragraph_format.space_after = DocxPt(18)

    # Sections
    for sec in content_sections:
        heading = sec.get("heading", "")
        if heading:
            p_h1 = doc.add_paragraph()
            run_h1 = p_h1.add_run(heading)
            run_h1.font.name = "Calibri"
            run_h1.font.size = DocxPt(16)
            run_h1.font.bold = True
            run_h1.font.color.rgb = hex_to_docx_rgb("1E3A8A")
            p_h1.paragraph_format.space_before = DocxPt(14)
            p_h1.paragraph_format.space_after = DocxPt(4)

        subheading = sec.get("subheading", "")
        if subheading:
            p_h2 = doc.add_paragraph()
            run_h2 = p_h2.add_run(subheading)
            run_h2.font.name = "Calibri"
            run_h2.font.size = DocxPt(12)
            run_h2.font.bold = True
            run_h2.font.color.rgb = hex_to_docx_rgb("475569")
            p_h2.paragraph_format.space_after = DocxPt(6)

        # Callout highlight block
        callout = sec.get("callout", "")
        if callout:
            tbl_callout = doc.add_table(rows=1, cols=1)
            tbl_callout.alignment = WD_TABLE_ALIGNMENT.CENTER
            cell = tbl_callout.cell(0, 0)
            set_cell_background(cell, "EFF6FF")
            set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

            # Left blue bar
            tc_bdr = parse_xml(f'''
                <w:tcBorders {nsdecls("w")}>
                    <w:left w:val="single" w:sz="24" w:space="0" w:color="2563EB"/>
                    <w:top w:val="none"/>
                    <w:right w:val="none"/>
                    <w:bottom w:val="none"/>
                </w:tcBorders>
            ''')
            cell._tc.get_or_add_tcPr().append(tc_bdr)

            p_cell = cell.paragraphs[0]
            r_callout = p_cell.add_run(f"★ Key Insight: {callout}")
            r_callout.font.name = "Calibri"
            r_callout.font.size = DocxPt(10.5)
            r_callout.font.italic = True
            r_callout.font.color.rgb = hex_to_docx_rgb("1E40AF")
            doc.add_paragraph().paragraph_format.space_after = DocxPt(6)

        # Body Content
        content = sec.get("content", "")
        if content:
            paragraphs = content.split("\n\n")
            for para_text in paragraphs:
                if para_text.strip():
                    p_body = doc.add_paragraph()
                    r_body = p_body.add_run(para_text.strip())
                    r_body.font.name = "Calibri"
                    r_body.font.size = DocxPt(11)
                    r_body.font.color.rgb = hex_to_docx_rgb("334155")
                    p_body.paragraph_format.line_spacing = 1.15
                    p_body.paragraph_format.space_after = DocxPt(6)

        # Bullet Points
        bullets = sec.get("bullets", [])
        for b_text in bullets:
            p_b = doc.add_paragraph(style='List Bullet')
            r_b = p_b.add_run(b_text)
            r_b.font.name = "Calibri"
            r_b.font.size = DocxPt(11)
            r_b.font.color.rgb = hex_to_docx_rgb("334155")
            p_b.paragraph_format.space_after = DocxPt(3)

        # Structured Table
        table_data = sec.get("table", [])
        if table_data and len(table_data) > 1:
            num_rows = len(table_data)
            num_cols = len(table_data[0])
            tbl = doc.add_table(rows=num_rows, cols=num_cols)
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

            for r_idx, row in enumerate(table_data):
                is_header = (r_idx == 0)
                for c_idx, val in enumerate(row):
                    if c_idx < num_cols:
                        cell = tbl.cell(r_idx, c_idx)
                        p_c = cell.paragraphs[0]
                        r_c = p_c.add_run(str(val))
                        r_c.font.name = "Calibri"

                        if is_header:
                            set_cell_background(cell, "0F172A")
                            r_c.font.bold = True
                            r_c.font.size = DocxPt(10)
                            r_c.font.color.rgb = hex_to_docx_rgb("FFFFFF")
                        else:
                            bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
                            set_cell_background(cell, bg)
                            r_c.font.size = DocxPt(10)
                            r_c.font.color.rgb = hex_to_docx_rgb("1E293B")

                        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)

            doc.add_paragraph().paragraph_format.space_after = DocxPt(10)

    # References Section
    if references:
        p_ref_h = doc.add_paragraph()
        r_ref_h = p_ref_h.add_run("References & Source Bibliography")
        r_ref_h.font.name = "Calibri"
        r_ref_h.font.size = DocxPt(13)
        r_ref_h.font.bold = True
        r_ref_h.font.color.rgb = hex_to_docx_rgb("0F172A")
        p_ref_h.paragraph_format.space_before = DocxPt(14)
        p_ref_h.paragraph_format.space_after = DocxPt(4)

        for ref_idx, ref in enumerate(references, 1):
            p_ref = doc.add_paragraph()
            r_ref_num = p_ref.add_run(f"[{ref_idx}] ")
            r_ref_num.font.bold = True
            r_ref_num.font.size = DocxPt(10)
            r_ref_num.font.color.rgb = hex_to_docx_rgb("2563EB")
            r_ref = p_ref.add_run(ref)
            r_ref.font.size = DocxPt(10)
            r_ref.font.color.rgb = hex_to_docx_rgb("64748B")
            p_ref.paragraph_format.space_after = DocxPt(3)

    # Save to memory buffer
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    data = buf.read()

    # Reopen and validate integrity
    reopened = Document(io.BytesIO(data))
    para_count = len(reopened.paragraphs)

    return {
        "success": True,
        "format": "docx",
        "paragraphCount": para_count,
        "sizeBytes": len(data),
        "base64": base64.b64encode(data).decode("ascii")
    }


def validate_pptx(payload):
    if not HAS_PPTX:
        return {"valid": False, "error": "python-pptx not available"}
    try:
        raw_b64 = payload.get("base64", "")
        data = base64.b64decode(raw_b64)
        prs = Presentation(io.BytesIO(data))
        return {
            "valid": True,
            "slideCount": len(prs.slides),
            "sizeBytes": len(data)
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


def validate_docx(payload):
    if not HAS_DOCX:
        return {"valid": False, "error": "python-docx not available"}
    try:
        raw_b64 = payload.get("base64", "")
        data = base64.b64decode(raw_b64)
        doc = Document(io.BytesIO(data))
        return {
            "valid": True,
            "paragraphCount": len(doc.paragraphs),
            "sizeBytes": len(data)
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


def generate_xlsx(payload):
    if not HAS_OPENPYXL:
        raise RuntimeError("openpyxl is not installed")

    wb = Workbook()
    default_sheet = wb.active

    title = payload.get("title", "TATTVA AI Spreadsheet")
    raw_sheets = payload.get("sheets", [])
    raw_data = payload.get("data", [])

    if not raw_sheets and raw_data:
        raw_sheets = [{"title": "Data", "rows": raw_data}]
    elif not raw_sheets:
        raw_sheets = [{"title": "Sheet1", "rows": [["Item", "Details", "Status"], ["Document", title, "Active"]]}]

    header_font = XlsxFont(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = XlsxPatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_align = XlsxAlignment(horizontal="left", vertical="center", wrap_text=True)

    data_font = XlsxFont(name="Calibri", size=11, color="1E293B")
    alt_fill = XlsxPatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    regular_fill = XlsxPatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    data_align = XlsxAlignment(horizontal="left", vertical="center")

    thin_border = XlsxBorder(
        left=XlsxSide(style='thin', color='E2E8F0'),
        right=XlsxSide(style='thin', color='E2E8F0'),
        top=XlsxSide(style='thin', color='E2E8F0'),
        bottom=XlsxSide(style='thin', color='E2E8F0')
    )

    total_rows = 0
    for s_idx, s_info in enumerate(raw_sheets):
        sheet_title = s_info.get("title", f"Sheet{s_idx + 1}")
        safe_title = "".join(c for c in sheet_title if c not in r":\/?*[]")[:30].strip() or f"Sheet{s_idx+1}"

        if s_idx == 0:
            ws = default_sheet
            ws.title = safe_title
        else:
            ws = wb.create_sheet(title=safe_title)

        ws.views.sheetView[0].showGridLines = True
        ws.freeze_panes = "A2"

        rows = s_info.get("rows", [])
        total_rows += len(rows)
        for r_idx, row in enumerate(rows, 1):
            for c_idx, val in enumerate(row, 1):
                cell = ws.cell(row=r_idx, column=c_idx)

                if val is not None:
                    if isinstance(val, (int, float)):
                        cell.value = val
                    elif isinstance(val, str) and val.startswith("="):
                        cell.value = val
                    elif isinstance(val, str) and val.replace(".", "", 1).replace("-", "", 1).isdigit() and not val.startswith("0") and len(val) < 15:
                        try:
                            cell.value = float(val) if "." in val else int(val)
                        except ValueError:
                            cell.value = val
                    else:
                        cell.value = str(val)
                else:
                    cell.value = ""

                cell.border = thin_border

                if r_idx == 1:
                    cell.font = header_font
                    cell.fill = header_fill
                    cell.alignment = header_align
                    ws.row_dimensions[r_idx].height = 28
                else:
                    cell.font = data_font
                    cell.fill = alt_fill if r_idx % 2 == 0 else regular_fill
                    cell.alignment = data_align
                    ws.row_dimensions[r_idx].height = 20

        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or "")
                max_len = max(max_len, len(val_str))
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    data = buf.read()

    reopened = openpyxl.load_workbook(io.BytesIO(data), read_only=True)
    sheet_count = len(reopened.sheetnames)

    return {
        "success": True,
        "format": "xlsx",
        "sheetCount": sheet_count,
        "rowCount": total_rows,
        "sizeBytes": len(data),
        "base64": base64.b64encode(data).decode("ascii")
    }


def validate_xlsx(payload):
    if not HAS_OPENPYXL:
        return {"valid": False, "error": "openpyxl not available"}
    try:
        raw_b64 = payload.get("base64", "")
        data = base64.b64decode(raw_b64)
        wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True)
        return {
            "valid": True,
            "sheetCount": len(wb.sheetnames),
            "sheets": wb.sheetnames,
            "sizeBytes": len(data)
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        if self._pageNumber > 1:
            self.drawString(54, 750, "TATTVA AI Intelligence Suite • Authoritative Document")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 744, 612 - 54, 744)

        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, footer_text)
        self.drawString(54, 36, "Verified Standards Compliance • TATTVA AI Document Engine")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 46, 612 - 54, 46)

        self.restoreState()


def generate_pdf(payload):
    if not HAS_REPORTLAB:
        raise RuntimeError("reportlab is not installed")

    title = payload.get("title", "TATTVA AI Document")
    subtitle = payload.get("subtitle", "")
    sections = payload.get("sections", [])
    references = payload.get("references", [])

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6
    )
    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#475569'),
        spaceAfter=12
    )
    h1_style = ParagraphStyle(
        'DocH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#334155'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=8
    )
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )
    callout_style = ParagraphStyle(
        'DocCallout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1E40AF'),
        spaceBefore=4,
        spaceAfter=4
    )

    story = []
    story.append(Paragraph(title, title_style))
    if subtitle:
        story.append(Paragraph(subtitle, sub_style))

    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563EB"), spaceBefore=2, spaceAfter=14))

    for sec in sections:
        heading = sec.get("heading")
        if heading:
            story.append(Paragraph(heading, h1_style))

        subheading = sec.get("subheading")
        if subheading:
            story.append(Paragraph(subheading, h2_style))

        callout = sec.get("callout")
        if callout:
            p_callout = Paragraph(f"<b>Key Insight:</b> {callout}", callout_style)
            tbl_callout = Table([[p_callout]], colWidths=[612 - 108])
            tbl_callout.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')),
                ('LINEBEFORE', (0, 0), (0, -1), 3, colors.HexColor('#2563EB')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(tbl_callout)
            story.append(Spacer(1, 8))

        content = sec.get("content")
        if content:
            for para in content.split("\n\n"):
                if para.strip():
                    story.append(Paragraph(para.strip(), body_style))

        bullets = sec.get("bullets", [])
        for b in bullets:
            story.append(Paragraph(f"•  {b}", bullet_style))

        table_data = sec.get("table", [])
        if table_data and len(table_data) > 1:
            num_cols = len(table_data[0])
            col_width = (612 - 108) / max(num_cols, 1)
            formatted_table = []
            for r_idx, row in enumerate(table_data):
                formatted_row = []
                for val in row:
                    cell_text = str(val if val is not None else "")
                    cell_p = Paragraph(cell_text, ParagraphStyle(
                        f'TableCell_{r_idx}',
                        parent=styles['Normal'],
                        fontName='Helvetica-Bold' if r_idx == 0 else 'Helvetica',
                        fontSize=9,
                        leading=11,
                        textColor=colors.white if r_idx == 0 else colors.HexColor('#1E293B')
                    ))
                    formatted_row.append(cell_p)
                formatted_table.append(formatted_row)

            t = Table(formatted_table, colWidths=[col_width] * num_cols)
            t_style = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ]
            for r in range(1, len(formatted_table)):
                bg = colors.HexColor('#F8FAFC') if r % 2 == 1 else colors.white
                t_style.append(('BACKGROUND', (0, r), (-1, r), bg))

            t.setStyle(TableStyle(t_style))
            story.append(t)
            story.append(Spacer(1, 10))

    if references:
        story.append(Paragraph("References & Authoritative Literature", h1_style))
        for r_idx, ref in enumerate(references, 1):
            story.append(Paragraph(f"[{r_idx}] {ref}", ParagraphStyle(
                'RefText',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=8.5,
                leading=12,
                textColor=colors.HexColor('#64748B'),
                leftIndent=14,
                firstLineIndent=-10,
                spaceAfter=3
            )))

    doc.build(story, canvasmaker=NumberedCanvas)
    data = buf.getvalue()

    return {
        "success": True,
        "format": "pdf",
        "sizeBytes": len(data),
        "base64": base64.b64encode(data).decode("ascii")
    }


def validate_pdf(payload):
    try:
        raw_b64 = payload.get("base64", "")
        data = base64.b64decode(raw_b64)
        if not data.startswith(b"%PDF-"):
            return {"valid": False, "error": "Missing %PDF- header"}
        if b"%%EOF" not in data:
            return {"valid": False, "error": "Missing %%EOF trailer"}
        page_count = max(1, data.count(b"/Type /Page") - data.count(b"/Type /Pages"))
        return {
            "valid": True,
            "pageCount": page_count,
            "sizeBytes": len(data)
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


def validate_csv(payload):
    try:
        raw_b64 = payload.get("base64", "")
        data = base64.b64decode(raw_b64)
        text = data.decode("utf-8-sig")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            return {"valid": False, "error": "CSV file contains no rows"}
        return {
            "valid": True,
            "rowCount": len(rows),
            "columnCount": len(rows[0]),
            "sizeBytes": len(data)
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"success": False, "error": "No input provided on stdin"}))
            return

        req = json.loads(input_data)
        action = req.get("action")
        payload = req.get("payload", {})

        if action == "generate_pptx":
            res = generate_pptx(payload)
        elif action == "generate_docx":
            res = generate_docx(payload)
        elif action == "generate_xlsx":
            res = generate_xlsx(payload)
        elif action == "generate_pdf":
            res = generate_pdf(payload)
        elif action == "validate_pptx":
            res = validate_pptx(payload)
        elif action == "validate_docx":
            res = validate_docx(payload)
        elif action == "validate_xlsx":
            res = validate_xlsx(payload)
        elif action == "validate_pdf":
            res = validate_pdf(payload)
        elif action == "validate_csv":
            res = validate_csv(payload)
        else:
            res = {"success": False, "error": f"Unknown action: {action}"}

        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))


if __name__ == "__main__":
    main()

