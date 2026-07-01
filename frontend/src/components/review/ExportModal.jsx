import { useState, useMemo } from "react";
import axios from "axios";
import {
  Download, CheckCircle2, AlertTriangle, Loader2, ArrowLeft,
  Pencil, Trash2, Plus, MinusCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Action config — maps correction action → visual style ────────────────
const ACTION_CONFIG = {
  edit: {
    label:  "EDITED",
    bg:     "bg-blue-50",
    border: "border-l-blue-400",
    badge:  "text-blue-700 bg-blue-100",
    Icon:   Pencil,
  },
  delete_hallucination: {
    label:  "DELETED",
    bg:     "bg-red-50",
    border: "border-l-red-400",
    badge:  "text-red-700 bg-red-100",
    Icon:   Trash2,
  },
  unclear: {
    label:  "UNCLEAR",
    bg:     "bg-amber-50",
    border: "border-l-amber-400",
    badge:  "text-amber-700 bg-amber-100",
    Icon:   AlertTriangle,
  },
  add_missing: {
    label:  "ADDED",
    bg:     "bg-purple-50",
    border: "border-l-purple-400",
    badge:  "text-purple-700 bg-purple-100",
    Icon:   Plus,
  },
  out_of_scope: {
    label:  "OUT OF SCOPE",
    bg:     "bg-slate-50",
    border: "border-l-slate-300",
    badge:  "text-slate-600 bg-slate-100",
    Icon:   MinusCircle,
  },
};

// ── Pure function: build sorted diff item list from corrections + pages ──
function buildDiffItems(pages, corrections) {
  // Build O(1) lookup from immutable AI page data (always has originals)
  const pageRowMap = {};
  pages.forEach(p => {
    p.rows.forEach(r => {
      pageRowMap[`${p.page_number}-${r.row_no}`] = {
        page:      p.page_number,
        row_no:    r.row_no,
        item_name: r.item_name,
        rate:      r.rate,
        category:  r.category,
      };
    });
  });

  const items = [];
  Object.entries(corrections).forEach(([key, corr]) => {
    if (!corr || corr.action === "approve") return;

    const orig   = pageRowMap[key]; // undefined for add_missing (synthetic key)
    const pageNo = orig?.page ?? parseInt(key.split("-")[0], 10);

    items.push({
      page:              pageNo,
      rowNo:             orig?.row_no ?? null,
      action:            corr.action,
      // Originals: prefer immutable pages data; fall back to stored correction fields
      originalName:      orig?.item_name ?? corr.original_item_name  ?? null,
      originalRate:      orig?.rate      ?? corr.original_rate        ?? null,
      originalCategory:  orig?.category  ?? corr.original_category    ?? null,
      // Corrected values (meaningful for "edit" and "add_missing")
      correctedName:     corr.corrected_item_name ?? null,
      correctedRate:     corr.corrected_rate      ?? null,
      correctedCategory: corr.corrected_category  ?? null,
      reviewerNotes:     corr.reviewer_notes      ?? null,
    });
  });

  // Sort: page ASC, rowNo ASC, nulls (add_missing) last within each page
  items.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.rowNo === null && b.rowNo === null) return 0;
    if (a.rowNo === null) return 1;
    if (b.rowNo === null) return -1;
    return a.rowNo - b.rowNo;
  });

  return items;
}

// ── Note action config ───────────────────────────────────────────────────
const NOTE_ACTION_CONFIG = {
  edit:   { label: "NOTE EDITED",  bg: "bg-blue-50",  border: "border-l-blue-400", badge: "text-blue-700 bg-blue-100", Icon: Pencil },
  delete: { label: "NOTE DELETED", bg: "bg-red-50",   border: "border-l-red-400",  badge: "text-red-700 bg-red-100",   Icon: Trash2 },
};

// ── Pure function: build sorted note diff item list ──────────────────────
function buildNoteDiffItems(pages, noteCorrections) {
  const noteMap = {};
  pages.forEach(p => {
    (p.menu_notes || []).forEach((n, idx) => {
      noteMap[`${p.page_number}-${idx}`] = {
        page:      p.page_number,
        noteIndex: idx,
        note_text: n.note_text,
        note_type: n.note_type,
      };
    });
  });

  const items = [];
  Object.entries(noteCorrections).forEach(([key, corr]) => {
    if (!corr || corr.action === "approve") return;
    const orig = noteMap[key];
    const [pageStr] = key.split("-");
    items.push({
      page:          orig?.page      ?? parseInt(pageStr, 10),
      noteIndex:     orig?.noteIndex ?? null,
      action:        corr.action,
      originalText:  orig?.note_text ?? corr.original_note_text  ?? null,
      correctedText: corr.corrected_note_text ?? null,
      noteType:      orig?.note_type ?? null,
    });
  });

  items.sort((a, b) => a.page - b.page || (a.noteIndex ?? 0) - (b.noteIndex ?? 0));
  return items;
}

// ── Single note diff row ─────────────────────────────────────────────────
const NoteDiffItemRow = ({ item }) => {
  const cfg = NOTE_ACTION_CONFIG[item.action] || NOTE_ACTION_CONFIG.edit;
  const { Icon } = cfg;
  return (
    <div
      data-testid={`export-note-diff-item-${item.page}-${item.noteIndex ?? "?"}`}
      className={`flex items-start gap-2 px-3 py-2 border-l-2 ${cfg.bg} ${cfg.border}`}
    >
      <Icon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${cfg.badge.split(" ")[0]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-px flex-shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
            P{item.page}·N{item.noteIndex ?? "?"}
          </span>
        </div>
        {item.action === "edit" ? (
          <p className="text-xs text-slate-600 leading-snug">
            <span className="line-through text-slate-400">{item.originalText}</span>
            <span className="mx-1 text-slate-400">→</span>
            <span className="font-medium text-slate-800">{item.correctedText}</span>
          </p>
        ) : (
          <p className="text-xs line-through text-red-400 opacity-70 leading-snug">
            {item.originalText}
          </p>
        )}
      </div>
    </div>
  );
};


const DiffItemRow = ({ item }) => {
  const cfg = ACTION_CONFIG[item.action] || ACTION_CONFIG.out_of_scope;
  const { Icon } = cfg;

  const renderName = () => {
    if (item.action === "edit") {
      return (
        <span className="text-xs leading-tight">
          <span className="line-through text-slate-400 mr-1">{item.originalName}</span>
          <span className="text-slate-400 mr-1">→</span>
          <span className="font-semibold text-slate-800">
            {item.correctedName || item.originalName}
          </span>
        </span>
      );
    }
    if (item.action === "delete_hallucination") {
      return (
        <span className="text-xs line-through text-red-400 opacity-70 leading-tight">
          {item.originalName}
        </span>
      );
    }
    if (item.action === "add_missing") {
      return (
        <span className="text-xs font-semibold text-purple-700 leading-tight">
          {item.correctedName}
        </span>
      );
    }
    // unclear, out_of_scope
    return (
      <span className="text-xs text-slate-700 leading-tight">
        {item.originalName ?? item.correctedName}
      </span>
    );
  };

  const displayRate = (() => {
    if (
      item.action === "edit" &&
      item.correctedRate != null &&
      item.correctedRate !== item.originalRate
    ) {
      return (
        <span className="text-[11px] font-mono flex-shrink-0">
          <span className="line-through text-slate-400">₹{item.originalRate}</span>
          <span className="text-slate-400 mx-0.5">→</span>
          <span className="text-blue-600 font-semibold">₹{item.correctedRate}</span>
        </span>
      );
    }
    const rate = item.correctedRate ?? item.originalRate;
    return rate != null
      ? <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">₹{rate}</span>
      : null;
  })();

  return (
    <div
      data-testid={`export-diff-item-${item.page}-${item.rowNo ?? "new"}`}
      className={`flex items-start gap-2 px-3 py-2 border-l-2 ${cfg.bg} ${cfg.border}`}
    >
      <Icon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${cfg.badge.split(" ")[0]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-px flex-shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
            P{item.page}{item.rowNo != null ? `·R${item.rowNo}` : "·new"}
          </span>
          <div className="flex-1 min-w-0">{renderName()}</div>
          {displayRate}
        </div>
        {/* Q3: UNCLEAR POS warning */}
        {item.action === "unclear" && (
          <p
            data-testid="export-diff-unclear-warning"
            className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1"
          >
            <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
            Will be exported with original AI values — verify before POS push
          </p>
        )}
        {item.reviewerNotes && (
          <p className="text-[10px] text-slate-400 italic mt-0.5">{item.reviewerNotes}</p>
        )}
      </div>
    </div>
  );
};

// ── Corrections diff section ─────────────────────────────────────────────
const CorrectionsDiffSection = ({ diffItems, noteDiffItems = [] }) => {
  const hasRowCorrections  = diffItems.length > 0;
  const hasNoteCorrections = noteDiffItems.length > 0;
  const totalCorrections   = diffItems.length + noteDiffItems.length;

  if (totalCorrections === 0) {
    return (
      <div
        data-testid="export-diff-all-approved"
        className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        <p className="text-xs text-emerald-700">
          All reviewed rows and notes were approved — nothing to inspect
        </p>
      </div>
    );
  }

  return (
    <div data-testid="export-corrections-diff" className="space-y-2">
      {hasRowCorrections && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 tracking-widest mb-1.5 flex items-center gap-2">
            CORRECTIONS TO REVIEW
            <span className="px-1.5 py-px bg-slate-100 text-slate-600 font-bold">
              {diffItems.length}
            </span>
          </p>
          <div className="border border-slate-100 max-h-48 overflow-y-auto divide-y divide-slate-100">
            {diffItems.map((item, i) => (
              <DiffItemRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}
      {hasNoteCorrections && (
        <div data-testid="export-note-corrections-diff">
          <p className="text-[10px] font-semibold text-slate-400 tracking-widest mb-1.5 flex items-center gap-2">
            NOTE CORRECTIONS
            <span className="px-1.5 py-px bg-slate-100 text-slate-600 font-bold">
              {noteDiffItems.length}
            </span>
          </p>
          <div className="border border-slate-100 max-h-32 overflow-y-auto divide-y divide-slate-100">
            {noteDiffItems.map((item, i) => (
              <NoteDiffItemRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── StatRow helper ───────────────────────────────────────────────────────
const StatRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
    <span className="text-xs text-slate-600">{label}</span>
    <span className={`text-xs font-bold font-mono ${color || "text-slate-800"}`}>{value}</span>
  </div>
);

// ── ExportModal ──────────────────────────────────────────────────────────
export default function ExportModal({
  open, onClose, datasetId, progress, displayName, onGoHome,
  pages = [], corrections = {}, noteCorrections = {},
}) {
  const [state,   setState]   = useState("confirm"); // confirm | exporting | done
  const [warning, setWarning] = useState(null);

  const remaining = progress?.rows_remaining ?? 0;
  const total     = progress?.total_rows ?? 0;
  const reviewed  = progress?.rows_reviewed ?? 0;

  const diffItems = useMemo(
    () => buildDiffItems(pages, corrections),
    [pages, corrections]
  );

  const noteDiffItems = useMemo(
    () => buildNoteDiffItems(pages, noteCorrections),
    [pages, noteCorrections]
  );

  const triggerDownload = async () => {
    setState("exporting");
    setWarning(null);
    try {
      // Mark complete
      const completeRes = await axios.post(`${API}/menu-review/documents/${datasetId}/complete`);
      if (completeRes.data.warning) setWarning(completeRes.data.warning);

      // Download export
      const exportRes = await axios.get(
        `${API}/menu-review/documents/${datasetId}/export`,
        { responseType: "blob" }
      );
      const url  = window.URL.createObjectURL(new Blob([exportRes.data], { type: "application/json" }));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `${datasetId}_corrected.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setState("done");
    } catch (e) {
      setWarning(`Export failed: ${e.message}`);
      setState("confirm");
    }
  };

  const handleClose = () => { setState("confirm"); setWarning(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent
        data-testid="export-modal"
        className="max-w-md"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif", borderRadius: 0 }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-sm font-bold text-slate-900"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            {state === "done" ? "Export Complete" : "Complete & Export"}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">{displayName}</p>
        </DialogHeader>

        {/* ── Confirm state ── */}
        {state === "confirm" && (
          <div className="mt-2 space-y-3">
            {/* Unreviewed rows warning */}
            {remaining > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{remaining} rows</strong> are still unreviewed.
                  You can export anyway — unreviewed rows are included as{" "}
                  <span className="font-mono">review_action: "pending"</span>.
                </span>
              </div>
            )}

            {/* Review summary counts */}
            <div className="border border-slate-100 p-3 space-y-0">
              <p className="text-[10px] font-semibold text-slate-400 tracking-widest mb-2">
                REVIEW SUMMARY
              </p>
              <StatRow label="Total rows"     value={total} />
              <StatRow label="Reviewed"       value={reviewed}                        color="text-[#002FA7]" />
              <StatRow label="Approved"       value={progress?.rows_approved ?? 0}    color="text-emerald-600" />
              <StatRow label="Edited"         value={progress?.rows_edited ?? 0}      color="text-blue-600" />
              <StatRow label="Deleted"        value={progress?.rows_deleted ?? 0}     color="text-red-600" />
              <StatRow label="Unclear"        value={progress?.rows_unclear ?? 0}     color="text-amber-600" />
              <StatRow label="Remaining"      value={remaining}                       color={remaining > 0 ? "text-amber-600" : "text-slate-800"} />
              <StatRow label="Notes reviewed" value={`${progress?.notes_reviewed ?? 0}/${progress?.total_notes ?? 0}`} />
            </div>

            {/* CR-MENU-0001/0002: Corrections + note corrections diff section */}
            <CorrectionsDiffSection diffItems={diffItems} noteDiffItems={noteDiffItems} />

            {warning && (
              <p className="text-xs text-red-600 font-semibold">{warning}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                data-testid="export-confirm-btn"
                onClick={triggerDownload}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#002FA7] text-white hover:bg-[#0026a0] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                {remaining > 0 ? "Export Anyway" : "Export Corrected JSON"}
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Exporting state ── */}
        {state === "exporting" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 className="h-8 w-8 text-[#002FA7] animate-spin" />
            <p className="text-sm text-slate-600">Generating corrected JSON…</p>
          </div>
        )}

        {/* ── Done state ── */}
        {state === "done" && (
          <div className="mt-2 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">Download started</p>
                <p className="text-[11px] text-emerald-700 mt-0.5 font-mono">
                  {datasetId}_corrected.json
                </p>
              </div>
            </div>
            {warning === "UNCLEAR_ROWS_REMAIN" && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Export includes rows marked as unclear — review these separately.
              </p>
            )}
            <div className="flex gap-2">
              <button
                data-testid="export-go-home-btn"
                onClick={() => { handleClose(); onGoHome(); }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#002FA7] text-white hover:bg-[#0026a0] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Landing
              </button>
              <button
                data-testid="export-stay-btn"
                onClick={handleClose}
                className="px-4 py-2 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Stay on this document
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
