import fitz  # PyMuPDF
from docx import Document
import re

# ── Text extraction ──────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)

def extract_text_from_docx(file_bytes: bytes) -> str:
    import io
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs)

def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return extract_text_from_docx(file_bytes)
    else:
        return file_bytes.decode("utf-8", errors="ignore")

# ── Sliding window chunker ───────────────────────────────────────

def chunk_text(text: str, chunk_size: int = 150, overlap: int = 30) -> list[str]:
    """
    Sliding window chunker. Produces overlapping chunks so no sentence
    gets cut off at a boundary.
    """
    words = text.split()
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks

# ── Section detection ────────────────────────────────────────────

SECTION_PATTERNS = {
    "skills":     r"(skills|technical skills|core competencies|technologies|tools)",
    "experience": r"(experience|work history|employment|professional background|internship)",
    "education":  r"(education|academic|qualifications|degree|university|college|cgpa|gpa)",
    "projects":   r"(projects|portfolio|personal projects|notable work|key projects)",
}

def detect_sections(text: str) -> dict[str, str]:
    lines = text.split("\n")
    sections = {k: [] for k in SECTION_PATTERNS}
    sections["summary"] = []
    current = "summary"

    for line in lines:
        stripped = line.strip()
        matched = False
        for section, pattern in SECTION_PATTERNS.items():
            if re.search(pattern, stripped, re.IGNORECASE) and len(stripped) < 60:
                current = section
                matched = True
                break
        if not matched:
            sections[current].append(stripped)

    return {k: " ".join(v).strip() for k, v in sections.items() if " ".join(v).strip()}

