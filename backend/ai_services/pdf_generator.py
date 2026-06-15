import os
import re
import base64
from weasyprint import HTML

from .cv_markdown import sanitize_cv_markdown


class PDFGenerator:
    @staticmethod
    def generate(md_content: str, photo_url: str = None) -> bytes:
        clean_md = sanitize_cv_markdown(md_content)
        html = PDFGenerator._markdown_to_html(clean_md, photo_url)
        pdf = HTML(string=html).write_pdf()
        return pdf

    @staticmethod
    def _markdown_to_html(content: str, photo_url: str = None) -> str:
        lines = content.splitlines()
        body_html = PDFGenerator._parse_markdown_to_html(lines)
        photo_html = PDFGenerator._get_photo_html(photo_url)

        return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page {{ size: A4; margin: 0; }}
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap");
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif;
    color: #222;
    background: #f5f7fb;
    line-height: 1.5;
  }}
  .page {{
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 18mm 20mm 18mm;
    margin: 10mm auto;
    background: #fff;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    display: flex;
    flex-direction: column;
    gap: 18px;
    position: relative;
  }}
  header {{
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 12px;
  }}
  .header-main {{
    display: flex;
    align-items: center;
    gap: 16px;
  }}
  .profile-photo-wrap {{
    width: 104px;
    height: 104px;
    flex: 0 0 104px;
    overflow: hidden;
    border-radius: 50%;
    border: 3px solid #fff;
    background: #ead8ce;
    box-shadow: 0 0 0 1px #e2e8f0, 0 8px 22px rgba(15,23,42,0.16);
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .profile-photo-wrap span {{
    display: none;
    color: #4a5568;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }}
  .profile-photo-wrap.photo-missing span {{ display: block; }}
  .profile-photo {{
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    object-position: center center;
    background: #ead8ce;
  }}
  .profile-copy {{ flex: 1; min-width: 0; }}
  .name {{ font-size: 26px; letter-spacing: 0.5px; font-weight: 800; }}
  .role {{ font-size: 14px; color: #4a5568; margin-top: 4px; }}
  .contact {{
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 10px;
    font-size: 12px;
    color: #4a5568;
  }}
  .contact a {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #4a5568;
    text-decoration: none;
    font-weight: 600;
  }}
  .contact a:hover {{ color: #0f172a; }}
  .contact svg {{
    width: 14px;
    height: 14px;
    fill: currentColor;
  }}
  h2 {{
    font-size: 13px;
    letter-spacing: 0.6px;
    color: #0f172a;
    margin: 0 0 8px;
    text-transform: uppercase;
  }}
  p, li {{ font-size: 12px; line-height: 1.5; margin: 0; }}
  .section {{ display: flex; flex-direction: column; gap: 6px; }}
  .pill-list {{ display: flex; flex-wrap: wrap; gap: 6px; }}
  .pill {{
    border: 1px solid #e2e8f0;
    padding: 4px 8px;
    border-radius: 6px;
    background: #f8fafc;
    font-size: 11px;
    color: #0b1220;
    white-space: nowrap;
  }}
  .sub {{
    font-weight: 700;
    margin-bottom: 2px;
    font-size: 12px;
    color: #0d1b2a;
  }}
  .experience {{
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }}
  .exp-item {{
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    background: #fcfdff;
  }}
  .exp-header {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }}
  .exp-title {{ font-weight: 700; font-size: 12.5px; }}
  .exp-meta {{ font-size: 11px; color: #4a5568; }}
  ul {{ padding-left: 16px; margin: 0; display: grid; gap: 4px; }}
  .two-col {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }}
  .note {{ font-size: 11px; color: #4a5568; }}
  a {{ color: #0f3460; text-decoration: none; }}
  @media print {{
    body {{ background: #fff; margin: 0; }}
    .page {{ margin: 0; box-shadow: none; page-break-after: always; }}
    .page:last-of-type {{ page-break-after: auto; }}
  }}
</style>
</head>
<body>
  <div class="page">
    {photo_html}
    {body_html}
  </div>
</body>
</html>"""

    @staticmethod
    def _get_photo_html(photo_url: str) -> str:
        if not photo_url:
            return """<header>
  <div class="header-main">
    <div class="profile-photo-wrap photo-missing">
      <span>CV</span>
    </div>
    <div class="profile-copy" id="header-copy"></div>
  </div>
</header>"""

        full_url = photo_url
        if photo_url.startswith('/'):
            full_url = f"http://localhost:8000{photo_url}"

        return f"""<header>
  <div class="header-main">
    <div class="profile-photo-wrap">
      <img class="profile-photo" src="{full_url}" alt="Foto" onerror="this.parentElement.classList.add('photo-missing'); this.remove();" />
      <span>CV</span>
    </div>
    <div class="profile-copy" id="header-copy"></div>
  </div>
</header>"""

    @staticmethod
    def _parse_markdown_to_html(lines: list[str]) -> str:
        html_parts = []
        in_header = True
        header_html = []
        current_section = []
        sections = []
        in_pill_list = False
        in_experience = False
        experience_items = []

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            if not line:
                i += 1
                continue

            h1_match = re.match(r"^#\s+(.+)$", line)
            if h1_match and in_header:
                name = PDFGenerator._md_to_html_inline(h1_match.group(1))
                header_html.append(f'<div class="name">{name}</div>')
                i += 1
                continue

            h2_match = re.match(r"^##\s+(.+)$", line)
            if h2_match:
                if in_header and header_html:
                    header_content = "\n".join(header_html)
                    html_parts.insert(0, f"""<header>
  <div class="header-main">
    <div class="profile-photo-wrap{' photo-missing' if not any('profile-photo' in h for h in [header_content]) else ''}">
      <span>CV</span>
    </div>
    <div class="profile-copy">
      {header_content}
    </div>
  </div>
</header>""")
                    in_header = False

                if current_section:
                    sections.append(PDFGenerator._render_section(current_section))
                    current_section = []
                if experience_items:
                    sections.append(PDFGenerator._render_experience(experience_items))
                    experience_items = []
                in_pill_list = False
                in_experience = False

                title = h2_match.group(1).strip()
                current_section = {"title": title, "content": []}

                if "experi" in title.lower():
                    in_experience = True

                i += 1
                continue

            if current_section is not None:
                if in_experience:
                    exp_title_match = re.match(r"^(.+?)\s*[-–]\s*(.+)$", line)
                    date_match = re.match(r"^(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s+\d{4}", line)

                    if line.startswith("- ") or line.startswith("* "):
                        text = PDFGenerator._md_to_html_inline(line[2:])
                        if experience_items:
                            experience_items[-1]["content"].append(f"<li>{text}</li>")
                    elif exp_title_match and not date_match:
                        if experience_items:
                            sections.append(PDFGenerator._render_experience(experience_items))
                            experience_items = []
                        experience_items.append({
                            "title": line,
                            "meta": "",
                            "content": []
                        })
                    elif date_match:
                        if experience_items:
                            experience_items[-1]["meta"] = line
                    else:
                        text = PDFGenerator._md_to_html_inline(line)
                        if experience_items:
                            experience_items[-1]["content"].append(f"<p>{text}</p>")
                        else:
                            current_section["content"].append(line)
                else:
                    current_section["content"].append(line)

            i += 1

        if current_section:
            sections.append(PDFGenerator._render_section(current_section))
        if experience_items:
            sections.append(PDFGenerator._render_experience(experience_items))

        return "\n".join(sections)

    @staticmethod
    def _render_section(section: dict) -> str:
        title = section["title"]
        content_lines = section["content"]

        if not content_lines:
            return ""

        title_html = f'<h2>{title}</h2>'
        body_html = PDFGenerator._render_content(content_lines)

        return f"""<section class="section">
  {title_html}
  {body_html}
</section>"""

    @staticmethod
    def _render_experience(items: list[dict]) -> str:
        if not items:
            return ""

        exp_html = ""
        for item in items:
            title = PDFGenerator._md_to_html_inline(item["title"])
            meta = item.get("meta", "")
            content = "\n".join(item["content"])

            exp_html += f"""<div class="exp-item">
  <div class="exp-header">
    <div class="exp-title">{title}</div>
    <div class="exp-meta">{meta}</div>
  </div>
  {content}
</div>"""

        return f"""<section class="section">
  <h2>Experiência Profissional</h2>
  <div class="experience">
    {exp_html}
  </div>
</section>"""

    @staticmethod
    def _render_content(lines: list[str]) -> str:
        html_parts = []
        pill_items = []
        in_pill_list = False
        sub_title = None

        for line in lines:
            if not line.strip():
                continue

            if line.startswith("## ") or line.startswith("# "):
                continue

            if line.startswith("### "):
                if in_pill_list and pill_items:
                    pills_html = "".join(f'<span class="pill">{PDFGenerator._md_to_html_inline(p)}</span>' for p in pill_items)
                    html_parts.append(f'<div class="pill-list">{pills_html}</div>')
                    pill_items = []
                    in_pill_list = False

                sub_title = PDFGenerator._md_to_html_inline(line[4:])
                html_parts.append(f'<div class="sub">{sub_title}</div>')
                continue

            if line.startswith("- ") or line.startswith("* "):
                item_text = PDFGenerator._md_to_html_inline(line[2:])
                if sub_title:
                    pill_items.append(item_text)
                    in_pill_list = True
                else:
                    html_parts.append(f"<li>{item_text}</li>")
                continue

            if in_pill_list and pill_items:
                pills_html = "".join(f'<span class="pill">{PDFGenerator._md_to_html_inline(p)}</span>' for p in pill_items)
                html_parts.append(f'<div class="pill-list">{pills_html}</div>')
                pill_items = []
                in_pill_list = False

            text = PDFGenerator._md_to_html_inline(line)
            html_parts.append(f"<p>{text}</p>")

        if in_pill_list and pill_items:
            pills_html = "".join(f'<span class="pill">{PDFGenerator._md_to_html_inline(p)}</span>' for p in pill_items)
            html_parts.append(f'<div class="pill-list">{pills_html}</div>')

        return "\n".join(html_parts)

    @staticmethod
    def _md_to_html_inline(text: str) -> str:
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" target="_blank">\1</a>', text)
        text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
        text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
        text = re.sub(r"__(.+?)__", r"<strong>\1</strong>", text)
        text = re.sub(r"_(.+?)_", r"<em>\1</em>", text)
        text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
        return text
