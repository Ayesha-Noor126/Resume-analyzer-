import { useState } from "react";
import { evaluateCV } from "../api";

export default function UploadForm({ onResult, onLoading }) {
  const [cvFile, setCvFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [jdMode, setJdMode] = useState("text");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!cvFile) return setError("Please upload your CV.");
    if (jdMode === "file" && !jdFile) return setError("Please upload a JD file.");
    if (jdMode === "text" && !jdText.trim()) return setError("Please enter the job description.");

    onLoading(true);
    try {
      const result = await evaluateCV(
        cvFile,
        jdMode === "file" ? jdFile : null,
        jdMode === "text" ? jdText : null
      );
      onResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      onLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          CV / Resume <span className="text-gray-400 font-normal">(PDF or DOCX)</span>
        </label>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setCvFile(e.target.files[0])}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                     file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700
                     file:font-medium hover:file:bg-indigo-100 cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Job Description
        </label>
        <div className="flex gap-2 mb-3">
          {["text", "file"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setJdMode(m)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${jdMode === m
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {m === "text" ? "Paste Text" : "Upload File"}
            </button>
          ))}
        </div>

        {jdMode === "text" ? (
          <textarea
            rows={6}
            placeholder="Paste the job description here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        ) : (
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setJdFile(e.target.files[0])}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700
                       file:font-medium hover:file:bg-indigo-100 cursor-pointer"
          />
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                   py-3 rounded-xl transition-colors"
      >
        Analyze CV
      </button>
    </form>
  );
}