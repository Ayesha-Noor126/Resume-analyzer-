import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
_client = None

def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client

def generate_report(cv_sections: dict, jd_text: str, scores: dict) -> dict:
    client = get_client()

    # cv_sections is {"skills": "text...", "experience": "text..."} — plain strings
    cv_text_combined = "\n\n".join(
        f"[{k.upper()}]\n{v}"
        for k, v in cv_sections.items()
        if v and isinstance(v, str) and v.strip()
    )

    # scores["sections"] is {"skills": {"score": 80, "weight": 0.35, "content": "..."}}
    section_summary = "\n".join(
        f"- {k.title()}: {v['score']}%"
        for k, v in scores["sections"].items()
    )

    prompt = f"""You are an expert ATS resume analyzer and career coach.

CANDIDATE CV (extracted sections):
{cv_text_combined}

JOB DESCRIPTION:
{jd_text[:3000]}

SECTION SCORES:
{section_summary}
Overall Match: {scores['overall']}%

Analyze the CV against the job description and return ONLY valid JSON (no markdown, no explanation) in this exact format:
{{
  "overall_score": {scores['overall']},
  "section_scores": {{
    "skills": 0,
    "experience": 0,
    "projects": 0,
    "education": 0
  }},
  "missing_skills": ["skill1", "skill2", "skill3"],
  "strengths": ["strength1", "strength2", "strength3"],
  "evaluation_paragraph": "A 3-4 sentence evaluation that directly references specific requirements from the job description and how the candidate meets or falls short of each one.",
  "recommendations": [
    "Actionable suggestion 1",
    "Actionable suggestion 2",
    "Actionable suggestion 3",
    "Actionable suggestion 4",
    "Actionable suggestion 5"
  ]
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1000,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if model wraps in ```json ... ```
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                raw = part
                break

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: return scores with error message
        return {
            "overall_score": scores["overall"],
            "section_scores": {k: v["score"] for k, v in scores["sections"].items()},
            "missing_skills": ["Could not parse LLM response"],
            "strengths": ["Analysis completed but report generation failed"],
            "evaluation_paragraph": f"Raw LLM response: {raw[:300]}",
            "recommendations": ["Check your GROQ_API_KEY and try again"]
        }