import axios from "axios";

const BASE = "http://localhost:8000";

export async function evaluateCV(cvFile, jdFile, jdText) {
  const form = new FormData();
  form.append("cv_file", cvFile);
  if (jdFile) form.append("jd_file", jdFile);
  if (jdText) form.append("jd_text", jdText);

  const res = await axios.post(`${BASE}/evaluate`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}