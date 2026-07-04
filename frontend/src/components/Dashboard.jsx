import ExportButton from "./ExportButton";

export default function Dashboard({ result, onReset }) {
  const sections = result.section_scores || {};
  const ragas = result.ragas || null;

  const sectionColors = {
    skills:     "bg-violet-500",
    experience: "bg-blue-500",
    projects:   "bg-emerald-500",
    education:  "bg-amber-500",
  };

  return (
    <div className="space-y-6">
      {/* Export + Reset buttons */}
      <div className="flex justify-between items-center">
        <ExportButton result={result} />
        <button
          onClick={onReset}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Analyze Another
        </button>
      </div>

      {/* Everything below gets captured for PDF */}
      <div id="report-content" className="space-y-6 bg-white p-2">

        {/* Overall Score */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full
                          bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <div>
              <div className="text-4xl font-black text-white">{result.overall_score}%</div>
              <div className="text-xs text-indigo-100 font-medium">ATS Match</div>
            </div>
          </div>
          <p className="mt-3 text-gray-500 text-sm">
            {result.overall_score >= 75
              ? "Strong match — worth applying!"
              : result.overall_score >= 50
              ? "Moderate match — some gaps to address."
              : "Low match — significant improvements needed."}
          </p>
        </div>

        {/* Section Scores */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Section Breakdown
          </h2>
          <div className="space-y-3">
            {Object.entries(sections).map(([key, score]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700 capitalize">{key}</span>
                  <span className="text-gray-500">{score}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sectionColors[key] || "bg-indigo-500"}`}
                    style={{ width: `${score}%`, transition: "width 0.8s ease" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Evaluation */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-2">
            AI Evaluation
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            {result.evaluation_paragraph}
          </p>
        </div>

        {/* Strengths + Missing Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-3">
              Strengths
            </h2>
            <ul className="space-y-2">
              {(result.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-emerald-500 mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-3">
              Missing Skills
            </h2>
            <ul className="space-y-2">
              {(result.missing_skills || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5">✗</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recommendations
          </h2>
          <ol className="space-y-3">
            {(result.recommendations || []).map((r, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100
                                 text-indigo-600 font-bold text-xs flex items-center
                                 justify-center">{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
        </div>

        {/* RAGAS Evaluation Quality Panel */}
        {ragas && !ragas.error && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
              RAG Evaluation Quality (RAGAS)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Faithfulness",      value: ragas.faithfulness,      color: "text-violet-600" },
                { label: "Answer Relevancy",  value: ragas.answer_relevancy,  color: "text-blue-600"   },
                { label: "Context Precision", value: ragas.context_precision, color: "text-emerald-600"},
                { label: "RAGAS Score",       value: ragas.ragas_score,       color: "text-indigo-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-100">
                  <div className={`text-2xl font-black ${color}`}>
                    {(value * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              RAGAS measures how faithfully the AI report reflects your CV, how relevant the analysis is to the JD, and how precisely it uses the provided context.
            </p>
          </div>
        )}

        {ragas?.error && (
          <p className="text-xs text-gray-400 text-center">
            RAGAS evaluation unavailable: {ragas.error}
          </p>
        )}

      </div>{/* end report-content */}
    </div>
  );
}