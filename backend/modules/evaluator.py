import os
import numpy as np
from dotenv import load_dotenv
from groq import Groq
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

_embedder = None
_groq_client = None

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    return _embedder

def get_groq():
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _groq_client

def cosine(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))

def compute_faithfulness(cv_text: str, evaluation_paragraph: str) -> float:
    prompt = f"""You are evaluating whether an AI-generated resume evaluation is grounded in the actual CV.

CV TEXT:
{cv_text[:2000]}

AI EVALUATION:
{evaluation_paragraph}

Instructions:
- Extract each distinct factual claim from the AI evaluation
- A claim is SUPPORTED if the CV text directly states it or strongly implies it
- A claim is UNSUPPORTED only if the CV clearly contradicts it or it is completely invented
- Be generous: reasonable inferences count as SUPPORTED

Format each line exactly as:
Claim: <claim text> | SUPPORTED
or
Claim: <claim text> | UNSUPPORTED

Output only the claims, no other text."""

    try:
        response = get_groq().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=500,
        )
        lines = response.choices[0].message.content.strip().split("\n")
        total, supported = 0, 0
        for line in lines:
            if "|" in line:
                total += 1
                verdict = line.split("|")[-1].strip().upper()
                if "SUPPORTED" in verdict and "UNSUPPORTED" not in verdict:
                    supported += 1
        return round(supported / total, 3) if total > 0 else 0.5
    except Exception as e:
        print(f"Faithfulness error: {e}")
        return 0.5

def compute_answer_relevancy(jd_text: str, evaluation_paragraph: str) -> float:
    try:
        embedder = get_embedder()
        vecs = embedder.embed_documents([jd_text[:1000], evaluation_paragraph])
        return round(max(cosine(vecs[0], vecs[1]), 0.0), 3)
    except Exception as e:
        print(f"Answer relevancy error: {e}")
        return 0.0

def compute_context_precision(cv_text: str, jd_text: str, evaluation_paragraph: str) -> float:
    try:
        embedder = get_embedder()
        words = cv_text.split()
        chunk_size, overlap = 150, 30
        step = chunk_size - overlap
        chunks = [
            " ".join(words[i:i + chunk_size])
            for i in range(0, len(words), step)
            if " ".join(words[i:i + chunk_size]).strip()
        ]
        if not chunks:
            return 0.0

        # Score chunks against JD directly
        jd_vec = embedder.embed_documents([jd_text[:800]])[0]
        chunk_vecs = embedder.embed_documents(chunks)

        similarities = [cosine(cv, jd_vec) for cv in chunk_vecs]

        # Top-k precision: only top 40% of chunks considered "retrieved"
        k = max(1, int(len(similarities) * 0.4))
        top_k_indices = sorted(
            range(len(similarities)),
            key=lambda i: similarities[i],
            reverse=True
        )[:k]
        top_k_sims = [similarities[i] for i in top_k_indices]

        # Precision = fraction of top-k that are genuinely relevant
        relevant_threshold = 0.4
        precise = sum(1 for s in top_k_sims if s >= relevant_threshold)

        return round(precise / k, 3)
    except Exception as e:
        print(f"Context precision error: {e}")
        return 0.0

def run_ragas_evaluation(cv_text: str, jd_text: str, generated_report: dict) -> dict:
    evaluation_paragraph = generated_report.get("evaluation_paragraph", "")

    faithfulness      = compute_faithfulness(cv_text, evaluation_paragraph)
    answer_relevancy  = compute_answer_relevancy(jd_text, evaluation_paragraph)
    context_precision = compute_context_precision(cv_text, jd_text, evaluation_paragraph)
    ragas_score       = round((faithfulness + answer_relevancy + context_precision) / 3, 3)

    return {
        "faithfulness":      faithfulness,
        "answer_relevancy":  answer_relevancy,
        "context_precision": context_precision,
        "ragas_score":       ragas_score,
    }