import re
from dataclasses import dataclass, field

from fpdf import FPDF

from .cv_markdown import sanitize_cv_markdown


@dataclass
class ResumeSection:
    title: str
    items: list[tuple[str, str]] = field(default_factory=list)


class PDFGenerator:
    NAVY = (19, 34, 56)
    BLUE = (31, 58, 95)
    ACCENT = (47, 143, 131)
    TEXT = (52, 64, 84)
    LINE = (218, 228, 240)

    @staticmethod
    def generate(md_content: str) -> bytes:
        clean_md = sanitize_cv_markdown(md_content)
        resume = PDFGenerator._parse_resume(clean_md)

        pdf = FPDF(format="A4", unit="mm")
        pdf.set_title(PDFGenerator._plain_text(resume["name"]))
        pdf.set_author("RAG CV Creator")
        pdf.set_margins(left=17, top=15, right=17)
        pdf.set_auto_page_break(auto=True, margin=17)
        pdf.add_page()

        PDFGenerator._draw_header(pdf, resume["name"], resume["intro"])
        PDFGenerator._render_sections(pdf, resume["sections"])

        return bytes(pdf.output())

    @staticmethod
    def _parse_resume(content: str) -> dict[str, object]:
        name = "Curriculo"
        intro: list[str] = []
        sections: list[ResumeSection] = []
        current_section: ResumeSection | None = None

        for raw_line in content.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            heading = re.match(r"^(#{1,6})\s+(.+)$", line)
            if heading:
                level = len(heading.group(1))
                title = PDFGenerator._plain_text(heading.group(2))
                if level == 1 and name == "Curriculo":
                    name = title
                    continue

                if level <= 2 or current_section is None:
                    current_section = ResumeSection(title=title)
                    sections.append(current_section)
                else:
                    current_section.items.append(("subheading", title))
                continue

            bullet = re.match(r"^[-*+]\s+(.+)$", line)
            ordered = re.match(r"^\d+[\.)]\s+(.+)$", line)
            if bullet or ordered:
                item = bullet.group(1) if bullet else ordered.group(1)
                if current_section is None:
                    current_section = ResumeSection(title="Destaques")
                    sections.append(current_section)
                current_section.items.append(("bullet", item))
                continue

            if current_section is None:
                intro.append(line)
            else:
                current_section.items.append(("paragraph", line))

        return {"name": name, "intro": intro, "sections": sections}

    @staticmethod
    def _draw_header(pdf: FPDF, name: str, intro: list[str]) -> None:
        page_width = pdf.w
        pdf.set_fill_color(*PDFGenerator.NAVY)
        pdf.rect(0, 0, page_width, 49, "F")

        pdf.set_fill_color(*PDFGenerator.BLUE)
        pdf.rect(0, 39, page_width, 10, "F")
        pdf.set_fill_color(*PDFGenerator.ACCENT)
        pdf.rect(0, 47, page_width, 2.2, "F")

        monogram = PDFGenerator._initials(name)
        pdf.set_fill_color(255, 255, 255)
        pdf.set_draw_color(120, 210, 198)
        pdf.set_line_width(0.45)
        pdf.ellipse(174, 13, 17, 17, "DF")
        pdf.set_xy(174, 18.2)
        pdf.set_font("helvetica", "B", 8.5)
        pdf.set_text_color(*PDFGenerator.NAVY)
        pdf.cell(17, 5, monogram, align="C")

        pdf.set_xy(17, 12.5)
        pdf.set_font("helvetica", "B", 22)
        pdf.set_text_color(255, 255, 255)
        pdf.multi_cell(145, 8.2, PDFGenerator._plain_text(name))

        intro_text = PDFGenerator._plain_text(" ".join(intro))
        if intro_text:
            pdf.set_x(17)
            pdf.set_font("helvetica", "", 9.6)
            pdf.set_text_color(221, 228, 238)
            pdf.multi_cell(151, 5.3, intro_text)

        pdf.set_y(58)

    @staticmethod
    def _render_sections(pdf: FPDF, sections: list[ResumeSection]) -> None:
        if not sections:
            return

        for index, section in enumerate(sections):
            if index > 0:
                pdf.ln(2.5)
            PDFGenerator._write_section_title(pdf, section.title)
            for kind, text in section.items:
                if kind == "bullet":
                    PDFGenerator._write_bullet(pdf, PDFGenerator._plain_text(text))
                elif kind == "subheading":
                    PDFGenerator._write_subheading(pdf, PDFGenerator._plain_text(text))
                else:
                    PDFGenerator._write_paragraph(pdf, PDFGenerator._plain_text(text))

    @staticmethod
    def _write_section_title(pdf: FPDF, title: str) -> None:
        if not title:
            return
        PDFGenerator._ensure_space(pdf, 15)

        y = pdf.get_y()
        left = pdf.l_margin
        right = pdf.w - pdf.r_margin

        pdf.set_fill_color(*PDFGenerator.ACCENT)
        pdf.rect(left, y + 1, 2, 6.2, "F")

        pdf.set_xy(left + 5, y)
        pdf.set_font("helvetica", "B", 9.4)
        pdf.set_text_color(*PDFGenerator.BLUE)
        pdf.cell(0, 6, PDFGenerator._plain_text(title).upper())

        pdf.set_draw_color(*PDFGenerator.LINE)
        pdf.set_line_width(0.25)
        pdf.line(left + 5, y + 7.6, right, y + 7.6)
        pdf.ln(10)

    @staticmethod
    def _write_subheading(pdf: FPDF, text: str) -> None:
        if not text:
            return
        PDFGenerator._ensure_space(pdf, 9)

        pdf.set_font("helvetica", "B", 10.4)
        pdf.set_text_color(*PDFGenerator.NAVY)
        pdf.multi_cell(0, 5.4, text)
        pdf.ln(0.7)

    @staticmethod
    def _write_paragraph(pdf: FPDF, text: str) -> None:
        if not text:
            return
        PDFGenerator._ensure_space(pdf, 9)

        pdf.set_font("helvetica", "", 10.1)
        pdf.set_text_color(*PDFGenerator.TEXT)
        pdf.multi_cell(0, 5.6, text)
        pdf.ln(1.1)

    @staticmethod
    def _write_bullet(pdf: FPDF, text: str) -> None:
        if not text:
            return
        PDFGenerator._ensure_space(pdf, 8)

        left = pdf.l_margin
        y = pdf.get_y()
        pdf.set_fill_color(*PDFGenerator.ACCENT)
        pdf.ellipse(left + 1.2, y + 2.1, 1.7, 1.7, "F")

        pdf.set_xy(left + 6, y)
        pdf.set_font("helvetica", "", 9.9)
        pdf.set_text_color(*PDFGenerator.TEXT)
        pdf.multi_cell(0, 5.35, text)
        pdf.ln(0.6)

    @staticmethod
    def _ensure_space(pdf: FPDF, needed_height: float) -> None:
        if pdf.get_y() + needed_height > pdf.h - pdf.b_margin:
            pdf.add_page()
            pdf.set_y(pdf.t_margin)

    @staticmethod
    def _plain_text(text: str) -> str:
        text = PDFGenerator._normalize_symbols(text)
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
        text = re.sub(r"(\*\*|__)(.*?)\1", r"\2", text)
        text = re.sub(r"(\*|_)(.*?)\1", r"\2", text)
        text = re.sub(r"`([^`]*)`", r"\1", text)
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text.encode("latin-1", "ignore").decode("latin-1")

    @staticmethod
    def _normalize_symbols(text: str) -> str:
        replacements = {
            "\u00a0": " ",
            "\u2013": "-",
            "\u2014": "-",
            "\u2018": "'",
            "\u2019": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2022": "-",
            "\u2026": "...",
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        return text

    @staticmethod
    def _initials(name: str) -> str:
        words = [word for word in re.split(r"\s+", PDFGenerator._plain_text(name)) if word]
        if not words:
            return "CV"
        if len(words) == 1:
            return words[0][:2].upper()
        return f"{words[0][0]}{words[-1][0]}".upper()
