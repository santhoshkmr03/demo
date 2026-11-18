"""Automated PDF Screening Report Generator for Handwriting-Based Dyslexia Screening.

⚠️ SCREENING TOOL ONLY: This report is strictly an experimental screening assessment,
NOT a diagnostic instrument. It provides risk estimations based on handwriting
patterns and must NEVER replace formal clinical diagnosis by qualified specialists.
"""

from __future__ import annotations

import io
import sys
from datetime import datetime
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from typing import Any, Dict, Optional, Union

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


class ReportNumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic footer page numbers and headers."""

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
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Footer rule
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(40, 35, 612 - 40, 35)

        # Footer text
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(40, 22, "CONFIDENTIAL SCREENING ASSESSMENT — NOT A MEDICAL DIAGNOSIS")
        self.drawRightString(612 - 40, 22, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def generate_screening_pdf(
    result: Dict[str, Any],
    original_image: Union[str, Path, Image.Image, np.ndarray],
    student_id: str = "Anonymous Student",
    examiner_name: str = "Educational Specialist",
    output_path: Optional[Union[str, Path]] = None,
) -> bytes:
    """Generate a clean, standardized 1-page clinical screening report PDF."""
    pdf_buffer = io.BytesIO()
    doc_target = str(output_path) if output_path else pdf_buffer

    doc = SimpleDocTemplate(
        doc_target,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=45,
    )

    styles = getSampleStyleSheet()

    # Color definitions
    c_primary = colors.HexColor("#1E3A8A")
    c_secondary = colors.HexColor("#0D9488")
    c_dark = colors.HexColor("#1E293B")
    c_amber_bg = colors.HexColor("#FEF3C7")
    c_amber_border = colors.HexColor("#F59E0B")
    c_amber_text = colors.HexColor("#92400E")
    c_red_bg = colors.HexColor("#FEE2E2")
    c_red_text = colors.HexColor("#B91C1C")
    c_green_bg = colors.HexColor("#DCFCE7")
    c_green_text = colors.HexColor("#15803D")
    c_purple_bg = colors.HexColor("#F3E8FF")
    c_purple_text = colors.HexColor("#7E22CE")

    # Typography
    t_title = ParagraphStyle(
        "RTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=c_primary,
    )
    t_subtitle = ParagraphStyle(
        "RSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=c_secondary,
    )
    t_body = ParagraphStyle(
        "RBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=c_dark,
    )
    t_body_bold = ParagraphStyle(
        "RBodyBold",
        parent=t_body,
        fontName="Helvetica-Bold",
    )
    t_disclaimer = ParagraphStyle(
        "RDisclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10.5,
        textColor=c_amber_text,
    )

    story = []

    # 1. Header & Title Block
    story.append(Paragraph("Handwriting-Based Dyslexia & Dysgraphia Screening Summary", t_title))
    story.append(Paragraph("AI-Assisted Multi-Branch Neuromotor Pattern Assessment Report", t_subtitle))
    story.append(Spacer(1, 6))

    # 2. Mandatory Disclaimer Box
    disclaimer_html = (
        "<b>⚠️ CLINICAL SCREENING DISCLAIMER:</b> This report is strictly an experimental screening aid, "
        "NOT a formal diagnostic evaluation. It estimates dyslexia/dysgraphia motor risk patterns from handwriting "
        "and must NEVER replace clinical assessments by qualified educational psychologists, neurologists, or pediatricians."
    )
    disc_table = Table([[Paragraph(disclaimer_html, t_disclaimer)]], colWidths=[540])
    disc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), c_amber_bg),
        ("BOX", (0, 0), (-1, -1), 1, c_amber_border),
        ("PADDING", (0, 0), (-1, -1), 4.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(disc_table)
    story.append(Spacer(1, 6))

    # 3. Assessment Metadata Table
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    meta_data = [
        [
            Paragraph(f"<b>Student ID:</b> {student_id}", t_body),
            Paragraph(f"<b>Date:</b> {now_str}", t_body),
            Paragraph(f"<b>Examiner:</b> {examiner_name}", t_body),
        ],
        [
            Paragraph(f"<b>Analysis Mode:</b> {result.get('input_type', 'Page').title()} Assessment", t_body),
            Paragraph(f"<b>Neural Backbone:</b> {result.get('backbone', 'ConvNeXt-Tiny')}", t_body),
            Paragraph(f"<b>Ensemble Size:</b> {result.get('models_in_ensemble', 5)} Fold Models", t_body),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[180, 180, 180])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # 4. Screening Score & Classification Card
    risk_pct = result.get("risk_percentage", 50.0)
    is_elevated = result.get("risk_category") == "Elevated Risk" or risk_pct >= 50.0
    band = result.get("uncertainty_band", {"std": 0.02, "low": 0.48, "high": 0.52})

    bg_color = c_red_bg if is_elevated else c_green_bg
    text_color = c_red_text if is_elevated else c_green_text
    badge_label = "ELEVATED NEUROMOTOR RISK SIGNAL" if is_elevated else "TYPICAL HANDWRITING PATTERN"

    t_score = ParagraphStyle("RScore", parent=t_body_bold, fontSize=16, leading=20, textColor=text_color, alignment=1)

    score_card = [
        [
            Paragraph(f"<b>Screening Risk</b><br/><font size=18>{risk_pct:.1f}%</font><br/><font size=7.5>Spread: ±{band.get('std',0)*100:.1f}%</font>", t_score),
            Paragraph(
                f"<b>STATUS: {badge_label}</b><br/>"
                f"<b>Uncertainty Spread:</b> [{band.get('low',0)*100:.1f}%, {band.get('high',0)*100:.1f}%] (±{band.get('std',0)*100:.1f}%)<br/>"
                f"<font size=8>{'Handwriting motor patterns exhibit irregular baseline drift, stroke tremors, or character reversals. Follow-up specialist evaluation advised.' if is_elevated else 'Stroke formations and pen pressure continuity match typical handwriting motor development.'}</font>",
                t_body
            ),
        ]
    ]
    score_table = Table(score_card, colWidths=[130, 410])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("BOX", (0, 0), (-1, -1), 1, text_color),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 8))

    # 5. Visual Salience / Attention Evidence
    story.append(Paragraph("Visual Evidence: Handwriting Sample & Attention Salience Map", t_body_bold))
    story.append(Spacer(1, 3))

    # Convert original and overlay to temporary in-memory PNGs
    if isinstance(original_image, (str, Path)):
        orig_pil = Image.open(original_image).convert("RGB")
    elif isinstance(original_image, np.ndarray):
        orig_pil = Image.fromarray(original_image).convert("RGB")
    else:
        orig_pil = original_image.convert("RGB")

    # Resize to uniform display size (e.g. 240x240)
    display_w, display_h = 240, 240
    orig_resized = orig_pil.resize((display_w, display_h), Image.LANCZOS)
    orig_buf = io.BytesIO()
    orig_resized.save(orig_buf, format="PNG")
    orig_buf.seek(0)
    rl_orig = RLImage(orig_buf, width=2.6 * inch, height=2.6 * inch)

    # Attention overlay
    if "attention_overlay" in result and result["attention_overlay"] is not None:
        overlay_pil = Image.fromarray(result["attention_overlay"].astype(np.uint8))
        overlay_resized = overlay_pil.resize((display_w, display_h), Image.LANCZOS)
        over_buf = io.BytesIO()
        overlay_resized.save(over_buf, format="PNG")
        over_buf.seek(0)
        rl_over = RLImage(over_buf, width=2.6 * inch, height=2.6 * inch)
    else:
        rl_over = rl_orig

    evidence_table = Table(
        [
            [Paragraph("<b>Submitted Handwriting Sample</b>", t_body), Paragraph("<b>Attention Salience Heatmap Overlay</b>", t_body)],
            [rl_orig, rl_over],
            [
                Paragraph("Original unadjusted student handwriting input.", t_body),
                Paragraph("Warmer yellow/red regions highlight areas with highest motor anomaly weight.", t_body),
            ]
        ],
        colWidths=[270, 270],
    )
    evidence_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(evidence_table)
    story.append(Spacer(1, 8))

    # 6. Clinical & Educational Interpretation Notes
    notes_html = (
        "<b>Clinical & Educational Interpretation Notes:</b><br/>"
        "• <b>Spatial Organization:</b> Irregular baseline drift, excessive inter-word gaps, and margin compression often reflect fine-motor coordination difficulties.<br/>"
        "• <b>Stroke Dynamics:</b> Abrupt pen lifts, tremors at stroke terminations, and variable pen pressure correlate with handwriting dysfluency.<br/>"
        "• <b>Screening Next Steps:</b> If the risk score is elevated (> 50%), this summary should be shared with the school's Special Educational Needs Coordinator (SENCo) or a licensed learning specialist for formal psychometric evaluation."
    )
    story.append(Paragraph(notes_html, t_body))
    story.append(Spacer(1, 8))

    # 7. Signature & Professional Sign-off
    sign_data = [
        [
            Paragraph("<b>Examiner Signature:</b> ___________________________", t_body),
            Paragraph("<b>Institutional Stamp:</b> ___________________________", t_body),
        ]
    ]
    sign_table = Table(sign_data, colWidths=[270, 270])
    sign_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(sign_table)

    doc.build(story, canvasmaker=ReportNumberedCanvas)

    if output_path:
        print(f"✅ Generated screening PDF report: {Path(output_path).resolve()}")
        with open(output_path, "rb") as f:
            return f.read()
    else:
        pdf_buffer.seek(0)
        return pdf_buffer.getvalue()


if __name__ == "__main__":
    from src.data_loaders import load_manifest
    from src.screening_engine import DyslexiaScreeningEngine

    print("Testing generate_screening_pdf standalone...")
    engine = DyslexiaScreeningEngine(backbone="convnext_tiny")
    df = load_manifest()
    sample_p = str(Path(df[df["dataset"] == "D2"].iloc[0]["path"]))
    res = engine.screen(sample_p)

    out_file = Path("outputs/reports/Sample_Student_Screening_Report.pdf")
    generate_screening_pdf(res, sample_p, student_id="STU-2026-0891", output_path=out_file)
    print("Report generation test passed!")
