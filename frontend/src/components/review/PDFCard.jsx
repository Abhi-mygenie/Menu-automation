import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Status config ────────────────────────────────────────────────
const STATUS = {
  not_started: {
    label: "NOT STARTED",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    btn: "Start Review",
    btnStyle: "bg-[#002FA7] text-white hover:bg-[#0026a0]",
  },
  in_progress: {
    label: "IN PROGRESS",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400 animate-pulse",
    btn: "Continue",
    btnStyle: "bg-[#002FA7] text-white hover:bg-[#0026a0]",
  },
  complete: {
    label: "COMPLETE",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    btn: "View",
    btnStyle: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  },
};

const WARN_LABELS = {
  ocr_unreadable: { label: "OCR LOW CONFIDENCE", color: "text-amber-700 bg-amber-50 border-amber-200" },
  empty_page: { label: "EMPTY PAGES", color: "text-slate-600 bg-slate-50 border-slate-200" },
  mixed_language_detected: { label: "MIXED LANGUAGE", color: "text-purple-700 bg-purple-50 border-purple-200" },
  no_source_grounding_page_level: { label: "NO SOURCE GROUNDING", color: "text-red-700 bg-red-50 border-red-200" },
};

export default function PDFCard({ doc, onRefresh }) {
  const navigate = useNavigate();
  const status = STATUS[doc.status] || STATUS.not_started;

  const handleClick = async () => {
    if (doc.status === "not_started") {
      await axios.post(`${API}/menu-review/documents/${doc.dataset_id}/start`);
    }
    navigate(`/review/${doc.dataset_id}`);
  };

  const displayName = doc.source_file.replace(/\.pdf$/i, "");

  return (
    <div
      data-testid={`pdf-card-${doc.dataset_id}`}
      className="flex flex-col bg-white border border-slate-200 hover:border-[#002FA7] hover:shadow-sm transition-all duration-150"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center border border-slate-200 bg-slate-50">
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <h3
              data-testid={`card-title-${doc.dataset_id}`}
              className="text-sm font-semibold text-slate-900 leading-tight truncate"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
              title={doc.source_file}
            >
              {displayName}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400 font-mono">{doc.dataset_id}</p>
          </div>
        </div>

        {/* Status badge */}
        <span
          data-testid={`status-badge-${doc.dataset_id}`}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold tracking-widest border ${status.bg} ${status.text} border-transparent`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* ── Warning badges ── */}
      {doc.doc_warnings?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-3">
          {doc.doc_warnings.map((w) => {
            const cfg = WARN_LABELS[w] || { label: w.toUpperCase(), color: "text-slate-600 bg-slate-50 border-slate-200" };
            return (
              <span
                key={w}
                className={`inline-flex items-center gap-1 px-1.5 py-px text-[10px] font-semibold tracking-wide border ${cfg.color}`}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                {cfg.label}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100">
        {[
          { label: "PAGES", value: doc.pages },
          { label: "ROWS", value: doc.total_rows },
          { label: "NOTES", value: doc.total_notes },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-sm font-semibold text-slate-900 font-mono">{value}</p>
            <p className="text-[10px] tracking-widest text-slate-400 font-semibold">{label}</p>
          </div>
        ))}
        <div className="flex-1" />
        {doc.status === "complete" && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
        {doc.status === "in_progress" && (
          <Clock className="h-4 w-4 text-amber-500" />
        )}
      </div>

      {/* ── Progress bar ── */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-500">
            {doc.rows_reviewed} of {doc.total_rows} rows reviewed
          </span>
          <span
            data-testid={`progress-pct-${doc.dataset_id}`}
            className="text-[11px] font-semibold font-mono text-slate-700"
          >
            {doc.progress_pct}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100">
          <div
            data-testid={`progress-bar-${doc.dataset_id}`}
            className="h-1.5 transition-all duration-500"
            style={{
              width: `${doc.progress_pct}%`,
              backgroundColor:
                doc.status === "complete"
                  ? "#10B981"
                  : doc.progress_pct > 0
                  ? "#002FA7"
                  : "#e2e8f0",
            }}
          />
        </div>
        {/* Action breakdown pills (visible when in progress) */}
        {doc.status === "in_progress" && doc.rows_reviewed > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {doc.rows_approved > 0 && (
              <span className="text-[10px] font-semibold text-emerald-700">
                {doc.rows_approved} approved
              </span>
            )}
            {doc.rows_edited > 0 && (
              <span className="text-[10px] font-semibold text-[#002FA7]">
                {doc.rows_edited} edited
              </span>
            )}
            {doc.rows_deleted > 0 && (
              <span className="text-[10px] font-semibold text-red-600">
                {doc.rows_deleted} deleted
              </span>
            )}
            {doc.rows_unclear > 0 && (
              <span className="text-[10px] font-semibold text-amber-600">
                {doc.rows_unclear} unclear
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── CTA Button ── */}
      <div className="mt-auto px-5 pb-5 pt-2">
        <button
          data-testid={`cta-btn-${doc.dataset_id}`}
          onClick={handleClick}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${status.btnStyle}`}
        >
          {status.btn}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
