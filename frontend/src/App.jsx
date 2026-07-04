import { useState } from "react";
import UploadForm from "./components/UploadForm";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50
                    flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-indigo-600 text-white text-xs font-bold
                          px-3 py-1 rounded-full tracking-widest mb-3">
            AI POWERED
          </div>
          <h1 className="text-3xl font-black text-gray-900">CV Evaluator</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Upload your CV and a job description — get an instant ATS analysis.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-8">
          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-200
                              border-t-indigo-600 rounded-full mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Analyzing your CV…</p>
            </div>
          )}

          {!loading && !result && (
            <UploadForm onResult={setResult} onLoading={setLoading} />
          )}

          {!loading && result && (
            <Dashboard result={result} onReset={() => setResult(null)} />
          )}
        </div>
      </div>
    </div>
  );
}