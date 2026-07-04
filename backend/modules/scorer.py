import re
import numpy as np
from .embedder import embed_texts, cosine_similarity
from .extractor import chunk_text

SECTION_WEIGHTS = {
    "skills":     0.30,
    "experience": 0.28,
    "projects":   0.20,
    "education":  0.12,
    "summary":    0.10,
}

def extract_jd_keywords(jd_text: str) -> list[str]:
    """Extract likely skill/tool keywords from JD text."""
    # Match capitalized tools, acronyms
    words = re.findall(r'\b[A-Z][a-zA-Z0-9]+\b|\b[A-Z]{2,}\b', jd_text)
    # Also grab bullet point items
    bullets = re.findall(r'[*•\-]\s*(\w[\w\s/]+)', jd_text)
    keywords = list(set(words + [b.strip() for b in bullets]))
    # Filter noise
    stopwords = {"The", "We", "Our", "You", "This", "Your", "And", "For",
                 "Are", "Has", "Have", "Will", "With", "Must", "Also", "Job"}
    return [k for k in keywords if len(k) > 2 and k not in stopwords]

def get_matched_and_missing(cv_text: str, jd_text: str) -> dict:
    """Compare JD keywords against full CV text."""
    keywords = extract_jd_keywords(jd_text)
    cv_lower = cv_text.lower()
    matched = [k for k in keywords if k.lower() in cv_lower]
    missing = [k for k in keywords if k.lower() not in cv_lower]
    return {"matched": matched, "missing": missing}

def score_sections(cv_sections: dict[str, str], jd_text: str) -> dict:
    """
    For each CV section, chunk with sliding window, embed each chunk,
    take best (max) cosine similarity against JD embedding.
    Normalizes raw cosine (0.2–0.8 range) to 0–100 scale.
    """
    results = {}
    jd_embedding = embed_texts([jd_text])[0]

    for section, weight in SECTION_WEIGHTS.items():
        content = cv_sections.get(section, "").strip()
        if not content:
            results[section] = {"score": 0, "weight": weight, "content": ""}
            continue

        chunks = chunk_text(content, chunk_size=150, overlap=30)
        if not chunks:
            results[section] = {"score": 0, "weight": weight, "content": content}
            continue

        chunk_embeddings = embed_texts(chunks)
        similarities = [cosine_similarity(ce, jd_embedding) for ce in chunk_embeddings]
        best_sim = max(similarities)

        # Rescale 0.2–0.8 cosine range → 0–100
        normalized = (best_sim - 0.25) / (0.75 - 0.25)
        score = round(min(max(normalized * 100, 0), 100), 1)

        results[section] = {"score": score, "weight": weight, "content": content}

    overall = sum(v["score"] * v["weight"] for v in results.values())
    return {"sections": results, "overall": round(overall, 1)}






def apply_keyword_penalty(base_score: float, matched: list, missing: list) -> float:
    """
    Penalize the overall score based on how many JD keywords are missing.
    Missing more than 30% of keywords applies a proportional penalty.
    """
    total = len(matched) + len(missing)
    if total == 0:
        return base_score

    missing_ratio = len(missing) / total

    if missing_ratio <= 0.2:
        # Less than 20% missing — no penalty
        penalty = 0
    elif missing_ratio <= 0.4:
        # 20–40% missing — mild penalty (up to 8 points)
        penalty = (missing_ratio - 0.2) * 40
    else:
        # More than 40% missing — stronger penalty (up to 15 points)
        penalty = 8 + (missing_ratio - 0.4) * 35

    return round(max(base_score - penalty, 0), 1)