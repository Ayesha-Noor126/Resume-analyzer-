from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from modules.extractor import extract_text, detect_sections
from modules.scorer import score_sections, get_matched_and_missing
from modules.report import generate_report
from modules.evaluator import run_ragas_evaluation

app = FastAPI(title="AI CV Evaluator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "ok"}

@app.post("/evaluate")
async def evaluate(
    cv_file: UploadFile = File(...),
    jd_file: UploadFile = File(None),
    jd_text: str = Form(None),
):
    # ── 1. Extract CV text ──────────────────────────────────────
    cv_bytes = await cv_file.read()
    cv_raw = extract_text(cv_bytes, cv_file.filename)
    if not cv_raw.strip():
        raise HTTPException(400, "Could not extract text from CV.")

    # ── 2. Get JD text ──────────────────────────────────────────
    if jd_file and jd_file.filename:
        jd_bytes = await jd_file.read()
        jd_raw = extract_text(jd_bytes, jd_file.filename)
    elif jd_text:
        jd_raw = jd_text
    else:
        raise HTTPException(400, "Provide either a JD file or JD text.")

    if not jd_raw.strip():
        raise HTTPException(400, "Could not extract text from Job Description.")

    # ── 3. Detect CV sections ───────────────────────────────────
    cv_sections = detect_sections(cv_raw)

# ── 4. Score sections semantically ─────────────────────────
    scores = score_sections(cv_sections, jd_raw)

    # ── 5. Keyword gap analysis ─────────────────────────────────
    keyword_analysis = get_matched_and_missing(cv_raw, jd_raw)

    # Apply keyword penalty to overall score
    from modules.scorer import apply_keyword_penalty
    scores["overall"] = apply_keyword_penalty(
        scores["overall"],
        keyword_analysis["matched"],
        keyword_analysis["missing"]
    )

    # ── 6. Generate LLM report ──────────────────────────────────
    report = generate_report(cv_sections, jd_raw, scores)

    # Override missing_skills with actual keyword gaps if available
    if keyword_analysis["missing"]:
        report["missing_skills"] = keyword_analysis["missing"][:8]

    # Add matched keywords to report
    report["matched_keywords"] = keyword_analysis["matched"]

    # ── 7. RAGAS evaluation ─────────────────────────────────────
    try:
        ragas_scores = run_ragas_evaluation(cv_raw, jd_raw, report)
        report["ragas"] = ragas_scores
    except Exception as e:
        print(f"RAGAS failed: {e}")
        report["ragas"] = {"error": str(e)}

    return report