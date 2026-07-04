import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

_model = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        # Downloads once, ~90MB; fast CPU inference
        _model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _model

def embed_texts(texts: list[str]) -> np.ndarray:
    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    return embeddings.astype("float32")

def build_faiss_index(embeddings: np.ndarray) -> faiss.IndexFlatIP:
    """Inner product on normalized vectors = cosine similarity."""
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    return index

def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Both vectors must already be L2-normalized."""
    return float(np.dot(vec_a, vec_b))