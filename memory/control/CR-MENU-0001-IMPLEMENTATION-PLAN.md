# CR-MENU-0001: Implementation Plan
**Pre-Export Correction Diff View**  
**Date:** 2026-07-01  
**Status:** APPROVED FOR IMPLEMENTATION — awaiting code-start green light  
**Decisions locked:** Q1=B, Q2=B, Q3=A, Q4=B  
**Plan revision:** v2 — gaps from v1 closed (add_missing state gap fixed; complete final file added)

---

## 0. Scope Recap (decisions baked in)

| Decision | Answer | Effect on plan |
|---|---|---|
| Q1 — notes in diff? | **B (No)** | `noteCorrections` not passed; note rows excluded |
| Q2 — click-to-navigate? | **B (No)** | Diff is read-only; no modal-close + page-jump logic |
| Q3 — UNCLEAR POS warning? | **A (Yes)** | Each UNCLEAR row gets a one-line amber warning text |
| Q4 — pending rows in diff? | **B (No)** | Existing amber banner handles it; diff is corrections-only |

---

## 1. Files Changed

```
frontend/src/components/review/ExportModal.jsx   ← MAIN CHANGE  (~145 new lines)
frontend/src/pages/review/ReviewWorkspace.jsx    ← 3 changes: 2 new props + handleAddRow fix
```

No other files touched. Backend unchanged.

---

## 2. Gap Fixed: add_missing Rows Were Invisible to Diff

### The problem (found during v1 plan review)
`handleAddRow` in ReviewWorkspace only calls the API and `fetchProgress()`.
It never updates the `corrections` state. So `add_missing` rows never appear
in the `corrections` map that is passed to ExportModal. The diff view would
silently skip them even though they ARE included in the exported JSON.

### The fix
After the API call succeeds in `handleAddRow`, push the new row into `corrections`
using a **synthetic key** `"${page_number}-am-${Date.now()}"`.

Why this key works with `buildDiffItems`:
- `pageRowMap` lookup returns `undefined` (no matching AI row — correct for new additions)
- Page parsed via `parseInt(key.split("-")[0], 10)` = correct page number
- `rowNo` falls back to `null` — displays as `P2·new` in the diff
- No collision with real `"pageNo-rowNo"` keys (real keys use digits only after `-`)

### The exact change to `handleAddRow` (ReviewWorkspace.jsx lines 548–561)

**Current:**
```js
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
  fetchProgress();
}, [datasetId, fetchProgress]);
```

**New:**
```js
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
  // Push into corrections state so the diff view can show it
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
```

---

## 3. Complete Data Flow (corrected)

```
ReviewWorkspace (parent)
├── corrections state: { "pageNo-rowNo": correctionObj, ..., "pageNo-am-timestamp": addMissingObj }
│     Populated three ways:
│       A) On mount via fetchDoc() → from backend, includes original_* fields
│       B) Optimistic save (saveCorrection) → { action, corrected_* } — NO original_* fields
│       C) handleAddRow (NEW FIX) → { action:"add_missing", corrected_* } — synthetic key
│
├── docData.pages: [ { page_number, rows: [{ row_no, item_name, rate, category }] } ]
│     ALWAYS has original AI values. add_missing rows are NOT in pages (correct).
│
│     ← pages + corrections passed as props to ExportModal →
│
ExportModal (child)
├── buildDiffItems(pages, corrections)
│     Filter: skip action === "approve"
│     For real rows: orig = pageRowMap[key]; use orig for originals
│     For add_missing: orig = undefined; use corr.corrected_* only
│     Sort: page ASC → rowNo ASC (nulls/am keys last per page)
│     Returns: DiffItem[]
│
└── Renders: CorrectionsDiffSection(diffItems)
```

---

## 4. All Changes to ReviewWorkspace.jsx

Three changes, all in the same file:

### Change A — handleAddRow (lines 548–561): add synthetic key push (shown in Section 2)

### Change B — ExportModal props (lines 721–729 approx): add 2 new props
```jsx
{/* BEFORE */}
<ExportModal
  open={showExport}
  onClose={() => setShowExport(false)}
  datasetId={datasetId}
  progress={progress}
  displayName={displayName}
  onGoHome={() => navigate("/review")}
/>

{/* AFTER */}
<ExportModal
  open={showExport}
  onClose={() => setShowExport(false)}
  datasetId={datasetId}
  progress={progress}
  displayName={displayName}
  onGoHome={() => navigate("/review")}
  pages={docData?.pages || []}
  corrections={corrections}
/>
```

### Change C — handleAddRow dependency array: add `setCorrections`
The `setCorrections` setter is stable (React guarantees this), so the ESLint
dep array does not technically require it — but adding it is safe:
```js
}, [datasetId, fetchProgress]);   // unchanged — setCorrections is stable, no need to add
```
No change needed to dependency array.

---

## 5. Complete Final ExportModal.jsx

This is the **complete file** exactly as it will look after all changes.
No further assembly needed — this is the source of truth for implementation.

```jsx
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

    const orig  = pageRowMap[key];  // undefined for add_missing (synthetic key)
    const pageNo = orig?.page ?? parseInt(key.split("-")[0], 10);

    items.push({
      page:              pageNo,
      rowNo:             orig?.row_no ?? null,
      action:            corr.action,
      // Originals: prefer immutable pages data; fall back to stored correction fields
      originalName:      orig?.item_name  ?? corr.original_item_name  ?? null,
      originalRate:      orig?.rate       ?? corr.original_rate       ?? null,
      originalCategory:  orig?.category   ?? corr.original_category   ?? null,
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

// ── Single diff row ──────────────────────────────────────────────────────
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
const CorrectionsDiffSection = ({ diffItems }) => {
  if (diffItems.length === 0) {
    return (
      <div
        data-testid="export-diff-all-approved"
        className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        <p className="text-xs text-emerald-700">
          All reviewed rows were approved — nothing to inspect
        </p>
      </div>
    );
  }

  return (
    <div data-testid="export-corrections-diff">
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
  pages = [], corrections = {},
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
            {/* Unreviewed rows warning (existing — Q4=B, unchanged) */}
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

            {/* Review summary counts (existing — unchanged) */}
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

            {/* ── NEW: Corrections diff section ── */}
            <CorrectionsDiffSection diffItems={diffItems} />

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
```

---

## 6. Exact Diff Summary (what changed vs. original file)

| Location | Original | New |
|---|---|---|
| Line 1 — React import | `import { useState } from "react"` | `import { useState, useMemo } from "react"` |
| Line 3 — lucide import | 5 icons | 9 icons (+ Pencil, Trash2, Plus, MinusCircle) |
| After line 8 | nothing | `ACTION_CONFIG` constant (~25 lines) |
| After ACTION_CONFIG | nothing | `buildDiffItems()` function (~35 lines) |
| After buildDiffItems | nothing | `DiffItemRow` component (~50 lines) |
| After DiffItemRow | nothing | `CorrectionsDiffSection` component (~20 lines) |
| Line 10 — function signature | 6 props | 8 props (+ `pages = []`, `corrections = {}`) |
| After `reviewed` line | nothing | `diffItems` useMemo (~4 lines) |
| After REVIEW SUMMARY block | nothing | `<CorrectionsDiffSection diffItems={diffItems} />` (1 line) |

**Nothing else in the file changes.** The exporting state and done state are identical.

---

## 7. Exact Diff Summary — ReviewWorkspace.jsx

| Location | Original | New |
|---|---|---|
| `handleAddRow` body (line ~559) | `fetchProgress()` as last line | Add `setCorrections(...)` call before `fetchProgress()` |
| `<ExportModal ...>` props (line ~721) | 6 props | 8 props (+ `pages`, `corrections`) |

**No other lines in ReviewWorkspace.jsx change.**

---

## 8. Implementation Sequence (ordered, no ambiguity)

| Step | File | Exact action |
|---|---|---|
| 1 | `ExportModal.jsx` | Replace React import line: add `useMemo` |
| 2 | `ExportModal.jsx` | Replace lucide import line: add 4 new icons |
| 3 | `ExportModal.jsx` | Insert `ACTION_CONFIG` constant after `const API = ...` line |
| 4 | `ExportModal.jsx` | Insert `buildDiffItems()` after `ACTION_CONFIG` |
| 5 | `ExportModal.jsx` | Insert `DiffItemRow` after `buildDiffItems` |
| 6 | `ExportModal.jsx` | Insert `CorrectionsDiffSection` after `DiffItemRow` |
| 7 | `ExportModal.jsx` | Update function signature: add `pages = [], corrections = {}` |
| 8 | `ExportModal.jsx` | Add `diffItems` useMemo inside function body (after `reviewed` line) |
| 9 | `ExportModal.jsx` | Insert `<CorrectionsDiffSection diffItems={diffItems} />` in confirm-state (after REVIEW SUMMARY `</div>`, before `{warning && ...}`) |
| 10 | `ReviewWorkspace.jsx` | Update `handleAddRow`: add `setCorrections` call |
| 11 | `ReviewWorkspace.jsx` | Add `pages` and `corrections` props to `<ExportModal>` |

**Alternatively: steps 1–9 can be done as a single `create_file` replacing ExportModal.jsx entirely with the complete final file from Section 5. Steps 10–11 are `search_replace` on ReviewWorkspace.jsx.**

---

## 9. Visual Wireframe

### State A — Zero non-approve corrections (Ghatkesar)
```
┌────────────────────────────────────────────────────┐
│ Complete & Export                                  │
│ Ghatkesar family dhaba                             │
├────────────────────────────────────────────────────┤
│ REVIEW SUMMARY                                     │
│ Total rows         126                             │
│ Reviewed           122  (blue)                     │
│ Approved           122  (green)                    │
│ Edited               0                             │
│ Deleted              0                             │
│ Unclear              0                             │
│ Remaining            4  (amber)                    │
│ Notes reviewed     0/0                             │
├────────────────────────────────────────────────────┤
│ ✓  All reviewed rows were approved — nothing       │
│    to inspect                            [green]   │
├────────────────────────────────────────────────────┤
│ [Export Corrected JSON]  [Cancel]                  │
└────────────────────────────────────────────────────┘
```

### State B — Has corrections (Akula Organics)
```
┌────────────────────────────────────────────────────┐
│ Complete & Export                                  │
│ Akula Organics                                     │
├────────────────────────────────────────────────────┤
│ ⚠  20 rows still unreviewed...         [amber]    │
├────────────────────────────────────────────────────┤
│ REVIEW SUMMARY                                     │
│ Total rows          74                             │
│ Reviewed            54  (blue)                     │
│ Approved            51  (green)                    │
│ Edited               1  (blue)                     │
│ Deleted              1  (red)                      │
│ Unclear              1  (amber)                    │
│ Remaining           20  (amber)                    │
│ Notes reviewed      2/7                            │
├────────────────────────────────────────────────────┤
│ CORRECTIONS TO REVIEW  [3]                         │
│ ╠══════════════════════════════════════════════╣   │
│ ║ ✏ [EDITED]  P1·R2  ~~Idli (1 pc)~~ → Plain  ║   │ ← blue left border
│ ║             Dosa  ₹35                        ║   │
│ ╠══════════════════════════════════════════════╣   │
│ ║ 🗑 [DELETED] P3·R2  ~~Stuffed Mirchi Bajji~~ ║   │ ← red left border
│ ║             ₹110                             ║   │
│ ╠══════════════════════════════════════════════╣   │
│ ║ ⚠ [UNCLEAR] P3·R3  Brinjal Bajji  ₹110      ║   │ ← amber left border
│ ║   ⚠ Will be exported with original AI        ║   │
│ ║     values — verify before POS push          ║   │
│ ╚══════════════════════════════════════════════╝   │
├────────────────────────────────────────────────────┤
│ [Export Anyway]  [Cancel]                          │
└────────────────────────────────────────────────────┘
```

---

## 10. data-testid Map

| Component | Element | testid value |
|---|---|---|
| `ExportModal` | Modal root | `export-modal` (existing) |
| `ExportModal` | Export button | `export-confirm-btn` (existing) |
| `ExportModal` | Go home button | `export-go-home-btn` (existing) |
| `ExportModal` | Stay button | `export-stay-btn` (existing) |
| `CorrectionsDiffSection` | Outer container (has corrections) | `export-corrections-diff` |
| `CorrectionsDiffSection` | All-approved state | `export-diff-all-approved` |
| `DiffItemRow` | Each diff row | `export-diff-item-{page}-{rowNo\|"new"}` |
| `DiffItemRow` | UNCLEAR warning text | `export-diff-unclear-warning` |

---

## 11. Test Plan (8 tests)

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| T1 | Akula — diff renders | Open Akula Organics → Complete & Export | `export-corrections-diff` visible; 3 items shown |
| T2 | EDITED row | Inspect T1 diff | `export-diff-item-1-2` shows "~~Idli (1 pc)~~ → Plain Dosa", ₹35 |
| T3 | DELETED row | Inspect T1 diff | `export-diff-item-3-2` shows strikethrough "Stuffed Mirchi Bajji", ₹110 |
| T4 | UNCLEAR row + POS warning | Inspect T1 diff | `export-diff-item-3-3` shows amber badge; `export-diff-unclear-warning` visible |
| T5 | Ghatkesar — all approved | Open Ghatkesar → Complete & Export | `export-diff-all-approved` visible; no `export-corrections-diff` |
| T6 | Export regression — Akula | Click Export Anyway on Akula | JSON downloads; content unchanged |
| T7 | Export regression — Ghatkesar | Click Export Corrected JSON on Ghatkesar | JSON downloads; content unchanged |
| T8 | Modal scroll | If diff > 4 items | Diff section scrolls; modal height stays within viewport |

---

## 12. Edge Cases (all handled in final file)

| Case | Handled by |
|---|---|
| Optimistic save — no `original_*` fields | `pageRowMap` primary lookup in `buildDiffItems` |
| `add_missing` — no page row lookup | Synthetic key, `orig = undefined`, shows `corrected_*` only, `P2·new` label |
| `add_missing` — was never in corrections state | `handleAddRow` fix: pushes synthetic key into `corrections` after API save |
| Edit — only name changed, rate same | `displayRate` shows original rate without arrow |
| Edit — both name and rate changed | `displayRate` shows `₹35 → ₹50` in blue with strikethrough |
| `correctedName` null on an edit | Falls back to `originalName` in `renderName` |
| `out_of_scope` action | `ACTION_CONFIG` entry exists; renders correctly |
| Very long item name | `flex-1 min-w-0` on name container; truncates gracefully |
| Empty corrections on fresh doc | `buildDiffItems` returns `[]`; green all-approved state shown |
| Multiple add_missing on same page | Each gets unique `Date.now()` suffix key; all appear |

---

## 13. Out of Scope (deferred CRs)

| Feature | Why deferred | Future CR |
|---|---|---|
| Note corrections in diff | Q1=B — notes handled in Notes tab | CR-MENU-0002 |
| Click-to-navigate from diff | Q2=B — read-only at this scale | Future CR when needed |
| Pending rows in diff | Q4=B — existing banner sufficient | N/A |
| `out_of_scope` smoke test | No test data available | N/A |

---

## 14. Definition of Done

- [ ] ExportModal.jsx replaced with complete final file from Section 5
- [ ] ReviewWorkspace.jsx — `handleAddRow` updated (Section 2)
- [ ] ReviewWorkspace.jsx — `<ExportModal>` gets 2 new props (Section 4 Change B)
- [ ] T1–T8 passing
- [ ] No console errors or React warnings
- [ ] Export JSON download unchanged (regression check)


---

## 0. Scope Recap (decisions baked in)

| Decision | Answer | Effect on plan |
|---|---|---|
| Q1 — notes in diff? | **B (No)** | `noteCorrections` not passed; note rows excluded |
| Q2 — click-to-navigate? | **B (No)** | Diff is read-only; no modal-close + page-jump logic |
| Q3 — UNCLEAR POS warning? | **A (Yes)** | Each UNCLEAR row gets a one-line amber warning text |
| Q4 — pending rows in diff? | **B (No)** | Existing amber banner handles it; diff is corrections-only |

---

## 1. Files Changed

```
frontend/src/components/review/ExportModal.jsx   ← MAIN CHANGE  (~90 new lines)
frontend/src/pages/review/ReviewWorkspace.jsx    ← MINOR CHANGE (~2 new prop lines)
```

No other files touched. Backend unchanged.

---

## 2. Complete Data Flow

```
ReviewWorkspace (parent)
├── corrections state: { "pageNo-rowNo": correctionObj, ... }
│     Populated two ways:
│       A) On mount via fetchDoc() → from backend, includes original_* fields
│       B) Optimistic save → only { action, corrected_* } — NO original_* fields
│
├── docData.pages: [ { page_number, rows: [{ row_no, item_name, rate, category }] } ]
│     ALWAYS has original values (AI archive is immutable)
│
│     ← these two are passed as props →
│
ExportModal (child)
├── buildDiffItems(pages, corrections)
│     Strategy: use pages for originals (handles both A and B above)
│     Filter: skip action === "approve"
│     Join: corrections[key].corrected_* + pageRowMap[key].item_name/rate/category
│     Special: add_missing has row_no=null → no pageRowMap hit → show corrected_* only
│     Sort: page ASC → rowNo ASC (nulls last)
│     Returns: DiffItem[]
│
└── Renders: CorrectionsDiffSection(diffItems)
```

---

## 3. New Props Added to ExportModal

Current signature:
```js
export default function ExportModal({ open, onClose, datasetId, progress, displayName, onGoHome })
```

New signature:
```js
export default function ExportModal({ open, onClose, datasetId, progress, displayName, onGoHome,
                                       pages, corrections })
```

Default values (safe fallback if parent passes nothing):
```js
pages = [], corrections = {}
```

---

## 4. New Import Line (ExportModal.jsx)

Current:
```js
import { Download, CheckCircle2, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
```

New (add `useMemo` to React import + 3 new icons):
```js
import { useState, useMemo } from "react";
import { Download, CheckCircle2, AlertTriangle, Loader2, ArrowLeft,
         Pencil, Trash2, Plus, MinusCircle } from "lucide-react";
```

All 4 new icons confirmed present in lucide-react@0.516.0.

---

## 5. New Constant: ACTION_CONFIG

Place above `ExportModal` function, alongside the existing `StatRow` component.

```js
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
```

---

## 6. New Pure Function: buildDiffItems

Place above `ExportModal` function (no hooks — pure function).

```js
function buildDiffItems(pages, corrections) {
  // Step 1: build O(1) lookup map from immutable AI page data
  const pageRowMap = {};
  pages.forEach(p => {
    p.rows.forEach(r => {
      pageRowMap[`${p.page_number}-${r.row_no}`] = {
        page: p.page_number,
        row_no: r.row_no,
        item_name: r.item_name,
        rate: r.rate,
        category: r.category,
      };
    });
  });

  // Step 2: collect non-approve corrections
  const items = [];
  Object.entries(corrections).forEach(([key, corr]) => {
    if (!corr || corr.action === "approve") return;

    const orig = pageRowMap[key];               // null for add_missing rows
    const pageNo = orig?.page ?? parseInt(key.split("-")[0], 10);

    items.push({
      page:              pageNo,
      rowNo:             orig?.row_no ?? null,
      action:            corr.action,
      // originals: prefer immutable pages data; fall back to stored correction fields
      originalName:      orig?.item_name     ?? corr.original_item_name     ?? null,
      originalRate:      orig?.rate          ?? corr.original_rate          ?? null,
      originalCategory:  orig?.category      ?? corr.original_category      ?? null,
      // corrected values (only meaningful for "edit" and "add_missing")
      correctedName:     corr.corrected_item_name ?? null,
      correctedRate:     corr.corrected_rate      ?? null,
      correctedCategory: corr.corrected_category  ?? null,
      reviewerNotes:     corr.reviewer_notes      ?? null,
    });
  });

  // Step 3: sort page ASC → rowNo ASC, add_missing (null rowNo) sorts last per page
  items.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.rowNo === null && b.rowNo === null) return 0;
    if (a.rowNo === null) return 1;
    if (b.rowNo === null) return -1;
    return a.rowNo - b.rowNo;
  });

  return items;
}
```

---

## 7. New Sub-component: DiffItemRow

Place below `buildDiffItems`, above `ExportModal`.

```jsx
const DiffItemRow = ({ item }) => {
  const cfg = ACTION_CONFIG[item.action] || ACTION_CONFIG.out_of_scope;
  const { Icon } = cfg;

  // Decide what name text to render
  const renderName = () => {
    if (item.action === "edit") {
      return (
        <span className="text-xs leading-tight">
          <span className="line-through text-slate-400 mr-1">{item.originalName}</span>
          <span className="text-slate-400 mr-1">→</span>
          <span className="font-semibold text-slate-800">{item.correctedName || item.originalName}</span>
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

  // Decide what rate to show
  const displayRate = (() => {
    if (item.action === "edit" && item.correctedRate != null && item.correctedRate !== item.originalRate) {
      return (
        <span className="text-[11px] font-mono">
          <span className="line-through text-slate-400">₹{item.originalRate}</span>
          <span className="text-slate-400 mx-0.5">→</span>
          <span className="text-blue-600 font-semibold">₹{item.correctedRate}</span>
        </span>
      );
    }
    const rate = item.correctedRate ?? item.originalRate;
    return rate != null
      ? <span className="text-[11px] font-mono text-slate-500">₹{rate}</span>
      : null;
  })();

  return (
    <div className={`flex items-start gap-2 px-3 py-2 border-l-2 ${cfg.bg} ${cfg.border}`}>
      <Icon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${cfg.badge.split(" ")[0]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action badge */}
          <span className={`text-[10px] font-bold px-1.5 py-px flex-shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
          {/* Page + Row reference */}
          <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
            P{item.page}{item.rowNo != null ? `·R${item.rowNo}` : "·new"}
          </span>
          {/* Item name (action-specific rendering) */}
          <div className="flex-1 min-w-0">{renderName()}</div>
          {/* Rate */}
          <div className="flex-shrink-0">{displayRate}</div>
        </div>
        {/* Q3: UNCLEAR POS warning */}
        {item.action === "unclear" && (
          <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1 pl-0">
            <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
            Will be exported with original AI values — verify before POS push
          </p>
        )}
        {/* Reviewer notes (if present on edited row) */}
        {item.reviewerNotes && (
          <p className="text-[10px] text-slate-400 italic mt-0.5">{item.reviewerNotes}</p>
        )}
      </div>
    </div>
  );
};
```

---

## 8. New Sub-component: CorrectionsDiffSection

Place directly below `DiffItemRow`, above `ExportModal`.

```jsx
const CorrectionsDiffSection = ({ diffItems }) => {
  if (diffItems.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        <p className="text-xs text-emerald-700">
          All reviewed rows were approved — nothing to inspect
        </p>
      </div>
    );
  }

  return (
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
  );
};
```

---

## 9. Changes Inside ExportModal Function Body

### 9.1 — useMemo for diffItems
Add inside `ExportModal` function body, after the existing `remaining/total/reviewed` lines:
```js
const diffItems = useMemo(
  () => buildDiffItems(pages, corrections),
  [pages, corrections]
);
```

### 9.2 — Confirm state JSX: insert CorrectionsDiffSection
Current confirm-state layout:
```
[unreviewed warning banner]
[REVIEW SUMMARY StatRow block]
[warning text if exists]
[Export + Cancel buttons]
```

New layout:
```
[unreviewed warning banner]       ← unchanged
[REVIEW SUMMARY StatRow block]    ← unchanged
[CorrectionsDiffSection]          ← NEW — inserted here
[warning text if exists]          ← unchanged
[Export + Cancel buttons]         ← unchanged
```

Exact insertion: after the closing `</div>` of the `border border-slate-100 p-3 space-y-0` block
and before `{warning && ...}`.

---

## 10. Change in ReviewWorkspace.jsx

Locate the `<ExportModal ...>` JSX block (lines 721–729 approx). Add 2 new props:

Current:
```jsx
<ExportModal
  open={showExport}
  onClose={() => setShowExport(false)}
  datasetId={datasetId}
  progress={progress}
  displayName={displayName}
  onGoHome={() => navigate("/review")}
/>
```

New:
```jsx
<ExportModal
  open={showExport}
  onClose={() => setShowExport(false)}
  datasetId={datasetId}
  progress={progress}
  displayName={displayName}
  onGoHome={() => navigate("/review")}
  pages={docData?.pages || []}
  corrections={corrections}
/>
```

---

## 11. Visual Wireframe

### State A — Zero non-approve corrections (Ghatkesar)
```
┌────────────────────────────────────────────────────┐
│ Complete & Export                                  │
│ Ghatkesar family dhaba                             │
├────────────────────────────────────────────────────┤
│ REVIEW SUMMARY                                     │
│ Total rows         126                             │
│ Reviewed           122  (blue)                     │
│ Approved           122  (green)                    │
│ Edited               0  (blue)                     │
│ Deleted              0  (red)                      │
│ Unclear              0  (amber)                    │
│ Remaining            4  (amber)                    │
│ Notes reviewed     0/0                             │
├────────────────────────────────────────────────────┤
│ ✓  All reviewed rows were approved — nothing       │
│    to inspect                                      │
├────────────────────────────────────────────────────┤
│ [Export Corrected JSON]  [Cancel]                  │
└────────────────────────────────────────────────────┘
```

### State B — Has corrections (Akula Organics)
```
┌────────────────────────────────────────────────────┐
│ Complete & Export                                  │
│ Akula Organics                                     │
├────────────────────────────────────────────────────┤
│ (amber banner: "20 rows unreviewed...")            │
├────────────────────────────────────────────────────┤
│ REVIEW SUMMARY                                     │
│ Total rows          74                             │
│ Reviewed            54  (blue)                     │
│ Approved            51  (green)                    │
│ Edited               1  (blue)                     │
│ Deleted              1  (red)                      │
│ Unclear              1  (amber)                    │
│ Remaining           20  (amber)                    │
│ Notes reviewed      2/7                            │
├────────────────────────────────────────────────────┤
│ CORRECTIONS TO REVIEW  [3]                         │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ [EDITED] P1·R2  Idli (1 pc) → Plain Dosa  ₹35    │  ← blue left border
│ [DELETED] P3·R2  ~~Stuffed Mirchi Bajji~~  ₹110   │  ← red left border
│ [UNCLEAR] P3·R3  Brinjal Bajji  ₹110              │  ← amber left border
│   ⚠ Will be exported with original AI values —    │
│     verify before POS push                        │
├────────────────────────────────────────────────────┤
│ [Export Anyway]  [Cancel]                          │
└────────────────────────────────────────────────────┘
```

---

## 12. Implementation Sequence (ordered steps)

| Step | File | Action | Lines added/changed |
|---|---|---|---|
| 1 | `ExportModal.jsx` | Add `useMemo` to React import | 1 line changed |
| 2 | `ExportModal.jsx` | Add `Pencil, Trash2, Plus, MinusCircle` to lucide import | 1 line changed |
| 3 | `ExportModal.jsx` | Add `ACTION_CONFIG` constant (above component) | ~30 lines |
| 4 | `ExportModal.jsx` | Add `buildDiffItems()` pure function (above component) | ~35 lines |
| 5 | `ExportModal.jsx` | Add `DiffItemRow` sub-component (above component) | ~50 lines |
| 6 | `ExportModal.jsx` | Add `CorrectionsDiffSection` sub-component (above component) | ~20 lines |
| 7 | `ExportModal.jsx` | Update function signature — add `pages = [], corrections = {}` | 1 line changed |
| 8 | `ExportModal.jsx` | Add `diffItems` useMemo inside function body | 4 lines |
| 9 | `ExportModal.jsx` | Insert `<CorrectionsDiffSection diffItems={diffItems} />` in confirm-state JSX | 1 line |
| 10 | `ReviewWorkspace.jsx` | Add `pages={docData?.pages \|\| []}` and `corrections={corrections}` to `<ExportModal>` | 2 lines |

**Total new lines: ~145 across both files**  
**Lines changed (existing): ~5**

---

## 13. data-testid Attributes to Add

| Element | testid |
|---|---|
| Corrections diff section container | `export-corrections-diff` |
| "All approved" green state | `export-diff-all-approved` |
| Individual diff item row | `export-diff-item-${item.page}-${item.rowNo ?? "new"}` |
| UNCLEAR POS warning text | `export-diff-unclear-warning` |

---

## 14. Test Plan

### Manual smoke tests (post-implementation)

| Test | Steps | Expected |
|---|---|---|
| T1 — Akula with corrections | Open Akula Organics → Complete & Export | Diff shows 3 rows: EDITED (blue), DELETED (red), UNCLEAR (amber) |
| T2 — EDITED row details | Inspect EDITED row in diff | Shows "Idli (1 pc)" strikethrough → "Plain Dosa"; rate ₹35 (unchanged) |
| T3 — DELETED row details | Inspect DELETED row | "Stuffed Mirchi Bajji (4 pcs)" in red strikethrough; ₹110 |
| T4 — UNCLEAR POS warning | Inspect UNCLEAR row | Amber badge + "Will be exported with original AI values — verify before POS push" |
| T5 — Ghatkesar (all approved) | Open Ghatkesar → Complete & Export | Green "All reviewed rows were approved" state; no diff list |
| T6 — Export regression | Complete export on Akula | JSON downloads correctly; no change in file content |
| T7 — Export regression | Complete export on Ghatkesar | JSON downloads correctly; no change in file content |
| T8 — Modal height | If diff has 6+ items | Section scrolls internally; modal does not overflow |

### Regression check
- `GET /api/menu-review/documents/{id}/export` endpoint — untouched, same output
- ReviewTable, ActionButtons, PDFViewer — untouched, no side effects

---

## 15. Known Edge Cases (handled)

| Case | How handled |
|---|---|
| Optimistic save — correction has no `original_*` fields | `buildDiffItems` uses `pageRowMap` (from pages) as primary source; always accurate |
| `add_missing` row (rowNo = null, not in pageRowMap) | Falls through to `corr.corrected_*` values only; page parsed from key string; badge shows "P2·new" |
| Edit where only name changed (rate null) | `displayRate` shows original rate without arrow |
| Edit where both name AND rate changed | `displayRate` shows `₹35 → ₹50` in blue |
| Empty `corrections` object (fresh doc, no actions yet) | `buildDiffItems` returns `[]`; `CorrectionsDiffSection` shows green all-approved state |
| `out_of_scope` action (no test data yet) | `ACTION_CONFIG` entry exists; handled correctly; not covered by smoke test |
| Very long item name | `min-w-0` on flex container truncates gracefully |
| `correctedName` is null on an edit (edge case) | Falls back to `originalName` in render |

---

## 16. Out of Scope (explicitly deferred)

- Note corrections in diff view (Q1=B) → **tracked as CR-MENU-0002** (`/app/memory/change_requests/CR-MENU-0002.md`)
- Click-to-navigate from diff item (Q2=B) → separate CR when needed
- Pending/unreviewed rows in diff (Q4=B)
- `out_of_scope` test coverage (no test data available)

---

## 17. Definition of Done

- [ ] `ExportModal.jsx` — all 10 implementation steps complete
- [ ] `ReviewWorkspace.jsx` — 2 prop lines added
- [ ] T1–T8 manual smoke tests passing
- [ ] No console errors
- [ ] No regression in export JSON download
