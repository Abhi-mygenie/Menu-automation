import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Clock, Circle, RefreshCw, ArrowLeft } from "lucide-react";
import PDFCard from "@/components/review/PDFCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Summary stat ──────────────────────────────────────────────────
const StatPill = ({ value, label, icon: Icon, color }) => (
  <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 bg-white" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
    <Icon className={`h-4 w-4 ${color}`} />
    <div>
      <p className="text-lg font-semibold text-slate-900 font-mono leading-none">{value}</p>
      <p className="text-[10px] tracking-widest text-slate-500 font-semibold mt-0.5">{label}</p>
    </div>
  </div>
);

export default function ReviewLanding() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/menu-review/documents`);
      setDocs(res.data);
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  // ── Derived stats ──────────────────────────────────────────────
  const totalRows = docs.reduce((s, d) => s + d.total_rows, 0);
  const totalReviewed = docs.reduce((s, d) => s + d.rows_reviewed, 0);
  const totalNotes = docs.reduce((s, d) => s + d.total_notes, 0);
  const complete = docs.filter((d) => d.status === "complete").length;
  const inProgress = docs.filter((d) => d.status === "in_progress").length;
  const notStarted = docs.filter((d) => d.status === "not_started").length;

  // ── Skeleton ───────────────────────────────────────────────────
  const Skeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 w-48 bg-slate-100 mb-6" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-52 bg-slate-100 border border-slate-200" />
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              data-testid="back-to-home"
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              HOME
            </button>
            <span className="text-slate-200 text-lg font-light">/</span>
            <span
              className="text-sm font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Menu Review Tool
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-slate-400 font-mono">
              Smoke Set · v0.1.0-PROPOSED
            </span>
            <button
              data-testid="refresh-btn"
              onClick={fetchDocs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Page body ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Page title */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-slate-900"
            data-testid="landing-title"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            AI Extraction Review
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review, correct and approve AI-extracted menu data before it goes to POS.
          </p>
        </div>

        {/* ── Summary stats bar ──────────────────────────────────── */}
        {!loading && docs.length > 0 && (
          <div
            data-testid="summary-stats"
            className="flex flex-wrap gap-3 mb-8"
          >
            <StatPill value={`${complete}/${docs.length}`} label="COMPLETE" icon={CheckCircle2} color="text-emerald-500" />
            <StatPill value={inProgress} label="IN PROGRESS" icon={Clock} color="text-amber-500" />
            <StatPill value={notStarted} label="NOT STARTED" icon={Circle} color="text-slate-400" />
            <StatPill
              value={`${totalReviewed}/${totalRows}`}
              label="ROWS REVIEWED"
              icon={RefreshCw}
              color="text-[#002FA7]"
            />
            <StatPill value={totalNotes} label="NOTES TO REVIEW" icon={Circle} color="text-slate-500" />
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────── */}
        {error && (
          <div
            data-testid="error-banner"
            className="flex items-center gap-3 p-4 mb-6 border border-red-200 bg-red-50 text-red-700 text-sm"
          >
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* ── Loading / Cards ────────────────────────────────────── */}
        {loading ? (
          <Skeleton />
        ) : (
          <>
            {/* Overall progress bar */}
            {totalRows > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 tracking-widest">
                    OVERALL REVIEW PROGRESS
                  </span>
                  <span className="text-xs font-semibold font-mono text-slate-700">
                    {totalRows > 0 ? Math.round(totalReviewed / totalRows * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200">
                  <div
                    data-testid="overall-progress-bar"
                    className="h-2 transition-all duration-700"
                    style={{
                      width: `${totalRows > 0 ? Math.round(totalReviewed / totalRows * 100) : 0}%`,
                      backgroundColor: "#002FA7",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-400">
                    {totalReviewed} of {totalRows} rows across {docs.length} documents
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {totalRows - totalReviewed} remaining
                  </span>
                </div>
              </div>
            )}

            {/* Document grid */}
            <div
              data-testid="document-grid"
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {docs.map((doc) => (
                <PDFCard
                  key={doc.dataset_id}
                  doc={doc}
                  onRefresh={fetchDocs}
                />
              ))}
            </div>

            {/* Dataset notice */}
            <div className="mt-8 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-400 font-mono">
                Dataset: <span className="text-slate-600">v0.1.0-PROPOSED</span> ·
                Status: <span className="text-amber-600 font-semibold">NOT FROZEN</span> ·
                Reviewer: <span className="text-slate-600">Sunil</span> ·
                Tool: Review Tool v1
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
