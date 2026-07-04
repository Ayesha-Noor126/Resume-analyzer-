import jsPDF from "jspdf";

export default function ExportButton({ result }) {
  function handleExport() {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      const lineHeight = 6;
      const sectionGap = 8;

      // ── helpers ────────────────────────────────────────────
      function checkPage(needed = 10) {
        if (y + needed > 270) { doc.addPage(); y = 20; }
      }

      function addHeading(text, size = 13) {
        checkPage(12);
        doc.setFontSize(size);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(text, margin, y);
        y += lineHeight + 1;
        // underline
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      }

      function addText(text, size = 10, color = [80, 80, 80]) {
        checkPage(lineHeight);
        doc.setFontSize(size);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach(line => {
          checkPage(lineHeight);
          doc.text(line, margin, y);
          y += lineHeight;
        });
      }

      function addBullet(text, size = 10, color = [80, 80, 80]) {
        checkPage(lineHeight);
        doc.setFontSize(size);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, maxWidth - 6);
        doc.text("•", margin, y);
        lines.forEach((line, i) => {
          checkPage(lineHeight);
          doc.text(line, margin + 5, y);
          y += lineHeight;
        });
      }

      function addScoreBar(label, score) {
        checkPage(12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(`${label}`, margin, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(99, 102, 241);
        doc.text(`${score}%`, pageWidth - margin - 10, y);

        y += 4;
        // background bar
        doc.setFillColor(230, 230, 240);
        doc.roundedRect(margin, y, maxWidth, 3, 1, 1, "F");
        // filled bar
        doc.setFillColor(99, 102, 241);
        const filled = (score / 100) * maxWidth;
        doc.roundedRect(margin, y, filled, 3, 1, 1, "F");
        y += 8;
      }

      // ── Title ───────────────────────────────────────────────
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("CV Evaluation Report", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric"
      })}`, margin, y);
      y += sectionGap + 4;

      // ── Overall Score ───────────────────────────────────────
      doc.setFillColor(238, 238, 255);
      doc.roundedRect(margin, y, maxWidth, 18, 3, 3, "F");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(`Overall ATS Match: ${result.overall_score}%`, margin + 5, y + 7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 180);
      const matchLabel = result.overall_score >= 75
        ? "Strong match — worth applying!"
        : result.overall_score >= 50
        ? "Moderate match — some gaps to address."
        : "Low match — significant improvements needed.";
      doc.text(matchLabel, margin + 5, y + 13);
      y += 24;

      // ── Section Scores ──────────────────────────────────────
      addHeading("Section Breakdown");
      const sections = result.section_scores || {};
      Object.entries(sections).forEach(([key, score]) => {
        addScoreBar(key.charAt(0).toUpperCase() + key.slice(1), score);
      });
      y += sectionGap;

      // ── AI Evaluation ───────────────────────────────────────
      addHeading("AI Evaluation");
      addText(result.evaluation_paragraph || "N/A");
      y += sectionGap;

      // ── Strengths ───────────────────────────────────────────
      addHeading("Strengths");
      (result.strengths || []).forEach(s => addBullet(s, 10, [34, 130, 100]));
      y += sectionGap;

      // ── Missing Skills ──────────────────────────────────────
      addHeading("Missing Skills");
      (result.missing_skills || []).forEach(s => addBullet(s, 10, [180, 60, 60]));
      y += sectionGap;

      // ── Matched Keywords ────────────────────────────────────
      if (result.matched_keywords?.length) {
        addHeading("Matched Keywords");
        const kwText = result.matched_keywords.join("  ·  ");
        addText(kwText, 9, [100, 100, 100]);
        y += sectionGap;
      }

      // ── Recommendations ─────────────────────────────────────
      addHeading("Recommendations");
      (result.recommendations || []).forEach((r, i) => {
        addBullet(`${i + 1}. ${r}`);
      });
      y += sectionGap;

      // ── RAGAS ───────────────────────────────────────────────
      if (result.ragas && !result.ragas.error) {
        addHeading("RAG Evaluation Quality (RAGAS)");
        const ragas = result.ragas;
        [
          ["Faithfulness",      ragas.faithfulness],
          ["Answer Relevancy",  ragas.answer_relevancy],
          ["Context Precision", ragas.context_precision],
          ["RAGAS Score",       ragas.ragas_score],
        ].forEach(([label, value]) => {
          addScoreBar(label, Math.round((value || 0) * 100));
        });
      }

      // ── Footer ──────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text(
          `AI CV Evaluator  ·  Page ${i} of ${totalPages}`,
          pageWidth / 2,
          285,
          { align: "center" }
        );
      }

      doc.save(`CV_Evaluation_${Date.now()}.pdf`);

    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed: " + err.message);
    }
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                 text-white font-semibold py-2.5 px-5 rounded-xl transition-colors text-sm"
    >
      ⬇ Export PDF
    </button>
  );
}