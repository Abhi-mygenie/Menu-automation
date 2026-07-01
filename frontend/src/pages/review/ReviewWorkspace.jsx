import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, FileText, Loader2, AlertTriangle, CheckCircle2, Download,
} from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import PDFViewer    from "@/components/review/PDFViewer";
import PageNavigation from "@/components/review/PageNavigation";
import ReviewTable    from "@/components/review/ReviewTable";
import MenuNotesPanel from "@/components/review/MenuNotesPanel";
import AddMissingRowModal from "@/components/review/AddMissingRowModal";
import ExportModal    from "@/components/review/ExportModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PDF_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/menu-review/documents`;

// ── Tiny confidence badge ──────────────────────────────────────────
const ConfidenceBadge = ({ level }) => {
  const cfg = {
    high: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex px-1.5 py-px text-[10px] font-semibold border ${cfg[level] || cfg.low}`}>
      {(level || "?").toUpperCase()}
    </span>
  );
};

// ── Row placeholder (Phase D will replace this with full ReviewTable) ──
const RowsPlaceholder = ({ pages, currentPage }) => {
  const page = pages.find((p) => p.page_number === currentPage);
  if (!page) return null;
  const rows = page.rows || [];
  const notes = page.menu_notes || [];

  return (
    <div className="flex-1 overflow-auto" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2">
          <AlertTriangle className="h-5 w-5" />
          No rows extracted from this page
        </div>
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <th className="text-left px-3 py-2 font-semibold text-slate-500 tracking-wide w-8">#</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 tracking-wide">ITEM</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 tracking-wide w-24">CATEGORY</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500 tracking-wide w-16">RATE</th>
              <th className="text-center px-3 py-2 font-semibold text-slate-500 tracking-wide w-20">CONF.</th>
              <th className="text-center px-3 py-2 font-semibold text-slate-500 tracking-wide w-24">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.row_no}
                data-testid={`row-${currentPage}-${row.row_no}`}
                className={`hover:bg-slate-50 transition-colors ${
                  row.correction?.action === "approve" ? "bg-emerald-50/40" :
                  row.correction?.action === "edit" ? "bg-blue-50/40" :
                  row.correction?.action === "delete_hallucination" ? "bg-red-50/40 opacity-50" :
                  row.correction?.action === "unclear" ? "bg-amber-50/40" : ""
                }`}
              >
                <td className="px-3 py-2 font-mono text-slate-400">{row.row_no}</td>
                <td className="px-3 py-2">
                  <div
                    className="font-medium text-slate-800 leading-tight"
                    style={{
                      borderLeft: `2px solid ${
                        row.confidence === "high" ? "#10B981" :
                        row.confidence === "medium" ? "#FFB703" : "#E63946"
                      }`,
                      paddingLeft: "6px",
                    }}
                  >
                    {row.item_name}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-500 truncate max-w-[90px]" title={row.category}>
                  {row.category || "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-700 font-semibold">
                  {row.rate != null ? `₹${row.rate}` : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  <ConfidenceBadge level={row.confidence} />
                </td>
                <td className="px-3 py-2 text-center">
                  {row.correction ? (
                    <span className={`inline-flex px-1.5 py-px text-[10px] font-bold tracking-wide ${
                      row.correction.action === "approve" ? "text-emerald-700 bg-emerald-50" :
                      row.correction.action === "edit" ? "text-blue-700 bg-blue-50" :
                      row.correction.action === "delete_hallucination" ? "text-red-700 bg-red-50" :
                      row.correction.action === "unclear" ? "text-amber-700 bg-amber-50" :
                      "text-slate-600 bg-slate-50"
                    }`}>
                      {row.correction.action.replace("_", " ").toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-[10px]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Notes footer on this page */}
      {notes.length > 0 && (
        <div className="border-t border-slate-200 mt-2 px-3 py-2">
          <p className="text-[10px] font-semibold text-slate-400 tracking-widest mb-2">
            MENU NOTES ON THIS PAGE ({notes.length})
          </p>
          <div className="space-y-1.5">
            {notes.map((n) => (
              <div
                key={n.note_index}
                className={`flex items-start gap-2 p-2 border text-xs ${
                  n.tax_note_warning
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                {n.tax_note_warning && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 leading-snug">{n.note_text}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">
                    {n.note_type} · {n.confidence}
                    {n.tax_note_warning && (
                      <span className="ml-1 text-amber-600 font-semibold"> · TAX WARNING</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Right panel tabs shell ──────────────────────────────────────────
const TabShell = ({ docData, currentPage, progress, corrections, editingRowKey, setEditingRowKey, onSaveCorrection, approveAllClean, approveLoading, noteCorrections, onSaveNoteCorrection, onOpenAddRow }) => {
  const [active, setActive] = useState("rows");
  const pages    = docData?.pages || [];
  const pageData = pages.find((p) => p.page_number === currentPage);
  const rowCount  = pageData?.rows?.length || 0;
  const noteCount = docData?.total_notes || 0;

  const tabs = [
    { id: "rows",     label: `Rows (${rowCount} on pg ${currentPage})` },
    { id: "notes",    label: `Menu Notes (${noteCount})` },
    { id: "progress", label: "Progress" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Tab bar */}
      <div className="flex items-center border-b border-slate-200 bg-white flex-shrink-0 px-3 gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              active === t.id
                ? "border-[#002FA7] text-[#002FA7]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "rows" && (
        <ReviewTable
          pages={pages}
          currentPage={currentPage}
          corrections={corrections}
          editingRowKey={editingRowKey}
          setEditingRowKey={setEditingRowKey}
          onSaveCorrection={onSaveCorrection}
          approveAllClean={approveAllClean}
          approveLoading={approveLoading}
          onAddRow={onOpenAddRow}
        />
      )}
      {active === "notes" && (
        <MenuNotesPanel
          pages={pages}
          noteCorrections={noteCorrections}
          onSaveNoteCorrection={onSaveNoteCorrection}
        />
      )}
      {active === "progress" && (
        <ProgressPlaceholder progress={progress} />
      )}
    </div>
  );
};

const NotesPlaceholder = ({ pages }) => {
  const allNotes = pages.flatMap((p) =>
    (p.menu_notes || []).map((n) => ({ ...n, page_number: p.page_number }))
  );
  if (allNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        No menu notes in this document
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-auto p-3 space-y-2">
      <p className="text-[11px] font-semibold text-slate-400 tracking-widest mb-3">
        ALL MENU NOTES — {allNotes.length} TOTAL
        <span className="ml-2 text-amber-600">
          ({allNotes.filter((n) => n.tax_note_warning).length} TAX WARNINGS — require manual review)
        </span>
      </p>
      {allNotes.map((n, i) => (
        <div
          key={i}
          data-testid={`note-card-pg${n.page_number}-${n.note_index}`}
          className={`p-3 border text-xs ${
            n.tax_note_warning
              ? "border-amber-200 bg-amber-50"
              : "border-slate-100 bg-slate-50"
          }`}
        >
          <div className="flex items-start gap-2">
            {n.tax_note_warning && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-slate-800 leading-snug">{n.note_text}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                  Page {n.page_number} · {n.note_type} · {n.confidence}
                </span>
                {n.tax_note_warning && (
                  <span className="text-[10px] font-bold text-amber-600">
                    CANNOT AUTO-APPROVE
                  </span>
                )}
                {n.correction && (
                  <span className={`text-[10px] font-bold ${
                    n.correction.action === "approve" ? "text-emerald-600" : "text-slate-500"
                  }`}>
                    {n.correction.action.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProgressPlaceholder = ({ progress }) => {
  if (!progress) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        <Loader2 className="animate-spin h-4 w-4 mr-2" /> Loading progress…
      </div>
    );
  }
  const pct = progress.progress_pct || 0;
  const bars = [
    { label: "Approved", count: progress.rows_approved, color: "#10B981" },
    { label: "Edited", count: progress.rows_edited, color: "#002FA7" },
    { label: "Deleted", count: progress.rows_deleted, color: "#E63946" },
    { label: "Unclear", count: progress.rows_unclear, color: "#FFB703" },
    { label: "Out of scope", count: progress.rows_out_of_scope, color: "#94a3b8" },
    { label: "Remaining", count: progress.rows_remaining, color: "#e2e8f0" },
  ];
  return (
    <div className="flex-1 overflow-auto p-4 space-y-5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Overall */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs font-semibold text-slate-600">Overall Progress</span>
          <span className="text-xs font-mono font-bold text-slate-800">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100">
          <div className="h-2 bg-[#002FA7] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {progress.rows_reviewed} of {progress.total_rows} rows reviewed ·{" "}
          {progress.rows_remaining} remaining
        </p>
      </div>
      {/* Breakdown */}
      <div className="space-y-2">
        {bars.map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-24 text-xs text-slate-500 flex-shrink-0">{label}</div>
            <div className="flex-1 h-1.5 bg-slate-100">
              <div
                className="h-1.5 transition-all duration-500"
                style={{
                  width: `${progress.total_rows > 0 ? (count / progress.total_rows) * 100 : 0}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="text-xs font-mono font-semibold text-slate-700 w-6 text-right">
              {count}
            </div>
          </div>
        ))}
      </div>
      {/* Per-page table */}
      {progress.per_page?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 tracking-widest mb-2">PER PAGE</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-1 text-slate-400 font-semibold">Page</th>
                <th className="text-right py-1 text-slate-400 font-semibold">Total</th>
                <th className="text-right py-1 text-slate-400 font-semibold">Reviewed</th>
                <th className="text-right py-1 text-slate-400 font-semibold">Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {progress.per_page.map((pp) => (
                <tr key={pp.page_number}>
                  <td className="py-1 font-mono text-slate-600">Pg {pp.page_number}</td>
                  <td className="py-1 text-right font-mono text-slate-600">{pp.total}</td>
                  <td className="py-1 text-right font-mono text-slate-600">{pp.reviewed}</td>
                  <td className="py-1 text-right">
                    {pp.complete ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                    ) : (
                      <span className="text-slate-300 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Notes */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-[11px] font-semibold text-slate-400 tracking-widest mb-2">NOTES</p>
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Total notes</span><span className="font-mono">{progress.total_notes}</span>
          </div>
          <div className="flex justify-between">
            <span>Reviewed</span><span className="font-mono">{progress.notes_reviewed}</span>
          </div>
          <div className="flex justify-between">
            <span>Remaining</span><span className="font-mono">{progress.notes_remaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ReviewWorkspace — main export
// ═══════════════════════════════════════════════════════════════════

export default function ReviewWorkspace() {
  const { datasetId } = useParams();
  const navigate = useNavigate();

  const [docData, setDocData]       = useState(null);
  const [progress, setProgress]     = useState(null);
  const [corrections, setCorrections]       = useState({});
  const [noteCorrections, setNoteCorrections] = useState({});
  const [editingRowKey, setEditingRowKey]   = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [showExport,  setShowExport]        = useState(false);
  const [showAddRow,  setShowAddRow]        = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const correctionsRef     = useRef(corrections);
  const noteCorrectionsRef = useRef(noteCorrections);

  const pdfUrl = `${PDF_BASE}/${datasetId}/pdf`;

  // keep ref in sync for revert closures
  useEffect(() => { correctionsRef.current = corrections; }, [corrections]);
  useEffect(() => { noteCorrectionsRef.current = noteCorrections; }, [noteCorrections]);

  // ── Load document data ──────────────────────────────────────────
  const fetchProgress = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/menu-review/documents/${datasetId}/progress`);
      setProgress(res.data);
    } catch (_) {}
  }, [datasetId]);

  const fetchDoc = useCallback(async () => {
    try {
      const [docRes, progRes] = await Promise.all([
        axios.get(`${API}/menu-review/documents/${datasetId}`),
        axios.get(`${API}/menu-review/documents/${datasetId}/progress`),
      ]);
      setDocData(docRes.data);
      setProgress(progRes.data);
      setTotalPages(docRes.data.total_pages);
      setCurrentPage(docRes.data.current_page || 1);

      // Initialise corrections map from API response
      const corrMap = {};
      docRes.data.pages.forEach(page => {
        page.rows.forEach(row => {
          if (row.correction) corrMap[`${page.page_number}-${row.row_no}`] = row.correction;
        });
      });
      setCorrections(corrMap);

      // Initialise note corrections map
      const noteMap = {};
      docRes.data.pages.forEach(page => {
        (page.menu_notes || []).forEach(note => {
          if (note.correction) noteMap[`${page.page_number}-${note.note_index}`] = note.correction;
        });
      });
      setNoteCorrections(noteMap);
    } catch (e) {
      setError(e.message || "Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  useEffect(() => {
    const init = async () => {
      try {
        await axios.post(`${API}/menu-review/documents/${datasetId}/start`);
      } catch (_) { /* already started — that's fine */ }
      await fetchDoc();
    };
    init();
  }, [datasetId, fetchDoc]);

  // ── Save a row correction (optimistic) ─────────────────────────
  const saveCorrection = useCallback(async (row, pageNumber, action, correctedFields = {}) => {
    const key  = `${pageNumber}-${row.row_no}`;
    const prev = correctionsRef.current[key];
    setCorrections(c => ({ ...c, [key]: { action, ...correctedFields } }));
    if (action !== "edit") setEditingRowKey(null);
    try {
      await axios.post(`${API}/menu-review/corrections`, {
        dataset_id: datasetId, row_no: row.row_no, page_number: pageNumber, action,
        original_item_name: row.item_name, original_rate: row.rate,
        original_category: row.category, original_issue_status: row.issue_status,
        original_raw_text: row.raw_text,
        ...correctedFields,
      });
      fetchProgress();
    } catch (e) {
      setCorrections(c => ({ ...c, [key]: prev }));
      console.error("Correction save failed:", e.message);
    }
  }, [datasetId, fetchProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Approve All Clean (batch, all pages) ────────────────────────
  const approveAllClean = useCallback(async () => {
    if (!docData) return;
    const snap = correctionsRef.current;
    const cleanRows = [];
    docData.pages.forEach(page => {
      page.rows.forEach(row => {
        const key = `${page.page_number}-${row.row_no}`;
        if (row.confidence === "high" && row.issue_status === "clean" &&
            !row.variant_warning && !row.addon_warning && !row.tax_note_warning && !snap[key])
          cleanRows.push({ row, pageNumber: page.page_number, key });
      });
    });
    if (!cleanRows.length) return;
    setApproveLoading(true);
    setCorrections(c => {
      const next = { ...c };
      cleanRows.forEach(({ key }) => { next[key] = { action: "approve" }; });
      return next;
    });
    try {
      await Promise.all(cleanRows.map(({ row, pageNumber }) =>
        axios.post(`${API}/menu-review/corrections`, {
          dataset_id: datasetId, row_no: row.row_no, page_number: pageNumber, action: "approve",
          original_item_name: row.item_name, original_rate: row.rate,
          original_category: row.category, original_issue_status: row.issue_status,
          original_raw_text: row.raw_text,
        })
      ));
      fetchProgress();
    } catch (e) {
      setCorrections(c => {
        const next = { ...c };
        cleanRows.forEach(({ key }) => { next[key] = snap[key]; });
        return next;
      });
    } finally { setApproveLoading(false); }
  }, [datasetId, docData, fetchProgress]);

  // ── Save a note correction (optimistic) ────────────────────────
  const saveNoteCorrection = useCallback(async (note, action, correctedText) => {
    const key  = `${note.page_number}-${note.note_index}`;
    const prev = noteCorrectionsRef.current[key];
    const payload = { action, ...(correctedText != null ? { corrected_note_text: correctedText } : {}) };
    setNoteCorrections(c => ({ ...c, [key]: payload }));
    try {
      await axios.post(`${API}/menu-review/note-corrections`, {
        dataset_id:         datasetId,
        note_index:         note.note_index,
        note_page:          note.page_number,
        action,
        original_note_text: note.note_text,
        original_note_type: note.note_type,
        corrected_note_text: correctedText ?? null,
      });
      fetchProgress();
    } catch (e) {
      setNoteCorrections(c => ({ ...c, [key]: prev }));
      console.error("Note correction failed:", e.message);
    }
  }, [datasetId, fetchProgress]);

  // ── Add missing row ─────────────────────────────────────────────
  const handleAddRow = useCallback(async ({ item_name, rate, category, page_number, reviewer_notes }) => {
    await axios.post(`${API}/menu-review/corrections`, {
      dataset_id:           datasetId,
      row_no:               null,
      page_number,
      action:               "add_missing",
      is_manual_add:        true,
      corrected_item_name:  item_name,
      corrected_rate:       rate,
      corrected_category:   category,
      reviewer_notes,
    });
    // Push into corrections state so the export diff view can show it (CR-MENU-0001)
    const syntheticKey = `${page_number}-am-${Date.now()}`;
    setCorrections(c => ({
      ...c,
      [syntheticKey]: {
        action:               "add_missing",
        corrected_item_name:  item_name,
        corrected_rate:       rate,
        corrected_category:   category,
        reviewer_notes:       reviewer_notes ?? null,
      },
    }));
    fetchProgress();
  }, [datasetId, fetchProgress]);

  // ── Page change: update backend + local state ───────────────────
  const handlePageChange = async (p) => {
    setCurrentPage(p);
    try {
      await axios.patch(`${API}/menu-review/documents/${datasetId}/page?page=${p}`);
    } catch (_) {}
  };

  const reviewedCount = Object.keys(corrections).length;
  const totalRows     = docData?.total_rows || 0;
  const pct = totalRows > 0 ? Math.round(reviewedCount / totalRows * 100) : (progress?.progress_pct || 0);
  const displayName = docData?.source_file?.replace(/\.pdf$/i, "") || datasetId;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600 text-sm">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="font-semibold">{error}</p>
          <button onClick={() => navigate("/review")} className="text-[#002FA7] text-xs hover:underline">
            ← Back to Review Landing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="review-workspace"
      className="flex flex-col h-screen bg-white"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <header
        data-testid="workspace-header"
        className="flex items-center gap-4 px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0 z-10"
      >
        <button
          data-testid="workspace-back-btn"
          onClick={() => navigate("/review")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          BACK
        </button>

        <span className="text-slate-200 font-light text-base">/</span>

        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span
            data-testid="workspace-doc-title"
            className="text-sm font-bold text-slate-900 truncate"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            {displayName}
          </span>
          <span className="hidden sm:block text-[11px] font-mono text-slate-400 ml-1">
            {datasetId}
          </span>
        </div>

        {/* Inline progress + export button */}
        {!loading && (
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <div className="hidden sm:block w-32 h-1.5 bg-slate-100">
              <div
                data-testid="workspace-progress-bar"
                className="h-1.5 transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct === 100 ? "#10B981" : "#002FA7",
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500">
              {reviewedCount}/{totalRows}
            </span>
            {pct === 100 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            <button
              data-testid="complete-export-btn"
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#002FA7] text-white hover:bg-[#0026a0] transition-colors ml-2"
            >
              <Download className="h-3.5 w-3.5" />
              Complete &amp; Export
            </button>
          </div>
        )}
      </header>

      {/* ── Loading overlay ──────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Loading document…</span>
        </div>
      )}

      {/* ── Split workspace ──────────────────────────────────────── */}
      {!loading && (
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full"
            data-testid="split-panel-group"
          >
            {/* LEFT: PDF Viewer */}
            <ResizablePanel defaultSize={44} minSize={25} maxSize={65}>
              <div className="flex flex-col h-full">
                <PDFViewer
                  pdfUrl={pdfUrl}
                  currentPage={currentPage}
                  onTotalPages={(n) => setTotalPages(n)}
                />
                <PageNavigation
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* RIGHT: Rows / Notes / Progress tabs */}
            <ResizablePanel defaultSize={56} minSize={30}>
              <TabShell
                docData={docData}
                currentPage={currentPage}
                progress={progress}
                corrections={corrections}
                editingRowKey={editingRowKey}
                setEditingRowKey={setEditingRowKey}
                onSaveCorrection={saveCorrection}
                approveAllClean={approveAllClean}
                approveLoading={approveLoading}
                noteCorrections={noteCorrections}
                onSaveNoteCorrection={saveNoteCorrection}
                onOpenAddRow={() => setShowAddRow(true)}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────── */}
      {docData && (
        <>
          <AddMissingRowModal
            open={showAddRow}
            onClose={() => setShowAddRow(false)}
            onSaved={handleAddRow}
            currentPage={currentPage}
            totalPages={totalPages}
            categories={[...new Set(docData.pages.flatMap(p => p.rows.map(r => r.category)).filter(Boolean))].sort()}
          />
          <ExportModal
            open={showExport}
            onClose={() => setShowExport(false)}
            datasetId={datasetId}
            progress={progress}
            displayName={displayName}
            onGoHome={() => navigate("/review")}
            pages={docData?.pages || []}
            corrections={corrections}
            noteCorrections={noteCorrections}
          />
        </>
      )}
    </div>
  );
}
