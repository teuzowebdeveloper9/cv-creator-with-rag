import os
import re
import base64
import html as html_lib
from urllib.parse import quote, unquote, urlparse
from weasyprint import HTML

from .blob_storage import is_safe_blob_key
from .cv_markdown import sanitize_cv_markdown


class PDFGenerator:
    _PROFILE_PHOTO_PREFIX = "/api/profile/photo/file/"
    _ALLOWED_LINK_SCHEMES = {"http", "https", "mailto", "tel"}
    _DATA_IMAGE_PATTERN = re.compile(
        r"^data:image/(?P<type>png|jpe?g|webp);base64,(?P<data>[A-Za-z0-9+/=\s]+)$",
        re.IGNORECASE,
    )
    _MAX_DATA_URL_LENGTH = 2_000_000

    @staticmethod
    def generate(md_content: str, photo_url: str = None) -> bytes:
        clean_md = sanitize_cv_markdown(md_content)
        html = PDFGenerator._markdown_to_html(clean_md, photo_url)
        pdf = HTML(string=html, base_url=PDFGenerator._asset_base_url()).write_pdf()
        return pdf

    @staticmethod
    def _asset_base_url() -> str:
        return os.getenv("PDF_ASSET_BASE_URL", "http://localhost:8000")

    @staticmethod
    def _markdown_to_html(content: str, photo_url: str = None) -> str:
        lines = content.splitlines()
        name, role, contact_lines, body_start = PDFGenerator._parse_header(lines)
        header_html = PDFGenerator._build_header_html(name, role, contact_lines, photo_url)
        body_html = PDFGenerator._parse_body(lines[body_start:])

        return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page {{ size: A4; margin: 0; }}
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
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .profile-photo-wrap span {{
    display: none;
    color: #4a5568;
    font-size: 22px;
    font-weight: 800;
  }}
  .profile-photo-wrap.photo-missing span {{ display: block; }}
  .profile-photo {{
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
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
</style>
</head>
<body>
  <div class="page">
    {header_html}
    {body_html}
  </div>
</body>
</html>"""

    @staticmethod
    def _parse_header(lines: list[str]) -> tuple[str, str, list[str], int]:
        name = ""
        role = ""
        contact_lines = []
        i = 0

        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue

            h1 = re.match(r"^#\s+(.+)$", line)
            if h1:
                name = PDFGenerator._strip_md(h1.group(1))
                i += 1
                continue

            h2 = re.match(r"^##\s+(.+)$", line)
            if h2:
                break

            if not name:
                i += 1
                continue

            if not role and not line.startswith("-") and not line.startswith("*"):
                role = PDFGenerator._strip_md(line)
            else:
                contact_lines.append(line)
            i += 1

        return name, role, contact_lines, i

    @staticmethod
    def _strip_md(text: str) -> str:
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
        text = re.sub(r"(\*\*|__)(.*?)\1", r"\2", text)
        text = re.sub(r"(\*|_)(.*?)\1", r"\2", text)
        return text.strip()

    @staticmethod
    def _build_header_html(name: str, role: str, contact_lines: list[str], photo_url: str = None) -> str:
        initials = PDFGenerator._get_initials(name)
        safe_name = PDFGenerator._escape_text(name)
        safe_name_attr = PDFGenerator._escape_attr(name)
        safe_role = PDFGenerator._escape_text(role)
        safe_initials = PDFGenerator._escape_text(initials)
        safe_photo_src = PDFGenerator._safe_photo_src(photo_url)

        if safe_photo_src:
            photo_html = f"""<div class="profile-photo-wrap">
      <img class="profile-photo" src="{PDFGenerator._escape_attr(safe_photo_src)}" alt="{safe_name_attr}" />
      <span>{safe_initials}</span>
    </div>"""
        else:
            photo_html = f"""<div class="profile-photo-wrap photo-missing">
      <span>{safe_initials}</span>
    </div>"""

        contact_html = ""
        if contact_lines:
            items = "".join(f"<span>{PDFGenerator._md_to_html_inline(l)}</span>" for l in contact_lines)
            contact_html = f'<div class="contact">{items}</div>'

        role_html = f'<div class="role">{safe_role}</div>' if role else ""

        return f"""<header>
  <div class="header-main">
    {photo_html}
    <div class="profile-copy">
      <div class="name">{safe_name}</div>
      {role_html}
      {contact_html}
    </div>
  </div>
</header>"""

    @staticmethod
    def _get_initials(name: str) -> str:
        words = [w for w in name.split() if w]
        if not words:
            return "CV"
        if len(words) == 1:
            return words[0][:2].upper()
        return f"{words[0][0]}{words[-1][0]}".upper()

    @staticmethod
    def _parse_body(lines: list[str]) -> str:
        sections = []
        current_section = None
        in_experience = False
        experience_items = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            h2 = re.match(r"^##\s+(.+)$", stripped)
            if h2:
                if current_section:
                    sections.append(PDFGenerator._render_section(current_section))
                    current_section = None
                if experience_items:
                    sections.append(PDFGenerator._render_experience(experience_items))
                    experience_items = []
                in_experience = False

                title = h2.group(1).strip()
                current_section = {"title": title, "content": []}
                if "experi" in title.lower():
                    in_experience = True
                continue

            if in_experience:
                PDFGenerator._parse_experience_line(stripped, experience_items, current_section)
            elif current_section is not None:
                current_section["content"].append(stripped)

        if current_section:
            sections.append(PDFGenerator._render_section(current_section))
        if experience_items:
            sections.append(PDFGenerator._render_experience(experience_items))

        return "\n".join(sections)

    @staticmethod
    def _parse_experience_line(line: str, experience_items: list, current_section: dict):
        if line.startswith("- ") or line.startswith("* "):
            text = PDFGenerator._md_to_html_inline(line[2:])
            if experience_items:
                experience_items[-1]["content"].append(f"<li>{text}</li>")
            elif current_section is not None:
                current_section["content"].append(line)
            return

        date_match = re.match(r"^(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s+\d{4}", line)
        if date_match:
            if experience_items:
                experience_items[-1]["meta"] = line
            return

        text = PDFGenerator._md_to_html_inline(line)
        if experience_items:
            experience_items[-1]["content"].append(f"<p>{text}</p>")
        elif current_section is not None:
            current_section["content"].append(line)

    @staticmethod
    def _render_section(section: dict) -> str:
        title = PDFGenerator._escape_text(PDFGenerator._strip_md(section["title"]))
        content_lines = section["content"]
        if not content_lines:
            return ""

        body_html = PDFGenerator._render_content(content_lines)
        return f"""<section class="section">
  <h2>{title}</h2>
  {body_html}
</section>"""

    @staticmethod
    def _render_experience(items: list[dict]) -> str:
        if not items:
            return ""

        exp_html = ""
        for item in items:
            title = PDFGenerator._md_to_html_inline(item["title"])
            meta = PDFGenerator._escape_text(item.get("meta", ""))
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
                    pills = "".join(f'<span class="pill">{PDFGenerator._md_to_html_inline(p)}</span>' for p in pill_items)
                    html_parts.append(f'<div class="pill-list">{pills}</div>')
                    pill_items = []
                    in_pill_list = False
                sub_title = PDFGenerator._md_to_html_inline(line[4:])
                html_parts.append(f'<div class="sub">{sub_title}</div>')
                continue

            if line.startswith("- ") or line.startswith("* "):
                if sub_title:
                    pill_items.append(line[2:])
                    in_pill_list = True
                else:
                    item_text = PDFGenerator._md_to_html_inline(line[2:])
                    html_parts.append(f"<li>{item_text}</li>")
                continue

            if in_pill_list and pill_items:
                pills = "".join(f'<span class="pill">{PDFGenerator._md_to_html_inline(p)}</span>' for p in pill_items)
                html_parts.append(f'<div class="pill-list">{pills}</div>')
                pill_items = []
                in_pill_list = False

            text = PDFGenerator._md_to_html_inline(line)
            html_parts.append(f"<p>{text}</p>")

        if in_pill_list and pill_items:
            pills = "".join(f'<span class="pill">{PDFGenerator._md_to_html_inline(p)}</span>' for p in pill_items)
            html_parts.append(f'<div class="pill-list">{pills}</div>')

        return "\n".join(html_parts)

    @staticmethod
    def _md_to_html_inline(text: str) -> str:
        parts = []
        cursor = 0
        link_pattern = re.compile(r"\[([^\]\n]+)\]\(([^)\s]+)\)")
        for match in link_pattern.finditer(text):
            parts.append(PDFGenerator._format_inline_text(text[cursor:match.start()]))
            label = PDFGenerator._format_inline_text(match.group(1))
            href = PDFGenerator._safe_link_href(match.group(2))
            if href:
                parts.append(
                    f'<a href="{PDFGenerator._escape_attr(href)}" target="_blank" rel="noopener noreferrer">{label}</a>'
                )
            else:
                parts.append(label)
            cursor = match.end()

        parts.append(PDFGenerator._format_inline_text(text[cursor:]))
        return "".join(parts)

    @staticmethod
    def _format_inline_text(text: str) -> str:
        escaped = PDFGenerator._escape_text(text)
        escaped = re.sub(r"`(.+?)`", r"<code>\1</code>", escaped)
        escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
        escaped = re.sub(r"__(.+?)__", r"<strong>\1</strong>", escaped)
        escaped = re.sub(r"\*(.+?)\*", r"<em>\1</em>", escaped)
        escaped = re.sub(r"_(.+?)_", r"<em>\1</em>", escaped)
        return escaped

    @staticmethod
    def _safe_link_href(url: str) -> str | None:
        candidate = (url or "").strip()
        if not candidate or len(candidate) > 2048:
            return None
        if any(ord(char) < 32 for char in candidate):
            return None

        parsed = urlparse(candidate)
        if not parsed.scheme:
            return None
        if parsed.scheme.lower() not in PDFGenerator._ALLOWED_LINK_SCHEMES:
            return None
        return candidate

    @staticmethod
    def _safe_photo_src(photo_url: str | None) -> str | None:
        candidate = (photo_url or "").strip()
        if not candidate:
            return None
        if any(ord(char) < 32 for char in candidate):
            return None

        data_url = PDFGenerator._safe_data_image_url(candidate)
        if data_url:
            return data_url

        key = None
        if candidate.startswith(PDFGenerator._PROFILE_PHOTO_PREFIX):
            key = unquote(candidate[len(PDFGenerator._PROFILE_PHOTO_PREFIX):])
        elif not urlparse(candidate).scheme and not candidate.startswith("/"):
            key = unquote(candidate)

        if key and is_safe_blob_key(key):
            return f"{PDFGenerator._PROFILE_PHOTO_PREFIX}{quote(key, safe='')}"
        return None

    @staticmethod
    def _safe_data_image_url(candidate: str) -> str | None:
        if len(candidate) > PDFGenerator._MAX_DATA_URL_LENGTH:
            return None

        match = PDFGenerator._DATA_IMAGE_PATTERN.fullmatch(candidate)
        if not match:
            return None

        encoded = re.sub(r"\s+", "", match.group("data"))
        try:
            base64.b64decode(encoded, validate=True)
        except Exception:
            return None

        image_type = match.group("type").lower()
        if image_type == "jpg":
            image_type = "jpeg"
        return f"data:image/{image_type};base64,{encoded}"

    @staticmethod
    def _escape_text(text: object) -> str:
        return html_lib.escape(str(text or ""), quote=False)

    @staticmethod
    def _escape_attr(text: object) -> str:
        return html_lib.escape(str(text or ""), quote=True)
