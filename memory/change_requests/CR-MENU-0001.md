# CR-MENU-0001: Pre-Export Correction Diff View

| Field | Value |
|---|---|
| **CR ID** | CR-MENU-0001 |
| **Title** | Pre-Export Correction Diff View |
| **Phase** | Review Tool — Post Phase E (enhancement to existing Export Modal) |
| **Gate required** | N/A (enhancement to already-shipped RT-G3 feature; no new gate needed) |
| **Priority** | P1 |
| **Status** | OPEN — PENDING OWNER DECISIONS (see Section 8) |
| **Assigned to** | E1 (implementation agent) |
| **Created** | 2026-07-01 |
| **Requested by** | Owner (Abhi) — verbal request during review session |
| **Informal pre-doc** | `/app/memory/control/RT_G3_FEATURE_EXPORT_DIFF_VIEW.md` (preliminary, superseded by this CR) |

---

## 1. Problem Statement

When a reviewer clicks **Complete & Export**, the current Export Modal shows only **aggregate counts**
(reviewed: 54, approved: 51, edited: 1, deleted: 1, unclear: 1). There is no way to see *which
specific items* were changed, what was changed from, or what was changed to.

The reviewer needs a **line-by-line correction summary** — color-coded by action — so they can do
a final visual sanity check before the corrected JSON is exported and eventually pushed to POS.

> *"During the export, do I see the corrected UI with any color marker just to identify once more
> quickly before getting into the POS?"* — Owner, 2026-07-01

---

## 2. Proposed Solution

Add a **"CORRECTIONS TO REVIEW"** section inside the Export Modal confirm-state, between the
existing REVIEW SUMMARY counts block and the Export button.

- Rendered only when there are non-approve corrections (edits, deletes, unclear, add_missing).
- If all rows were approved: shows a green "All N rows approved — nothing to inspect" message.
- Each row in the section shows: page badge, row number, action badge (color-coded), original
  item name, corrected item name (for edits), and rate.
- Section is scrollable (max-height constrained) so the modal does not bloat.

---

## 3. Discovery Findings

### 3.1 Existing endpoint inventory

| Endpoint | Relevance |
|---|---|
| `GET /api/menu-review/documents/{id}` | Returns all pages with rows; each row includes a `correction` object (full doc from MongoDB including `original_*` and `corrected_*` fields) |
| `POST /api/menu-review/corrections` | Saves a correction; MongoDB document stores both `original_item_name/rate/category` and `corrected_*` fields |
| `POST /api/menu-review/note-corrections` | Saves note correction; stored in same collection with `correction_type: "note"` |
| `GET /api/menu-review/documents/{id}/export` | Downloads final JSON; deletes `delete_hallucination` rows, applies `edit` field overrides |
| `GET /api/menu-review/documents/{id}/corrections` | **DOES NOT EXIST** — no GET corrections endpoint |

### 3.2 Frontend state at Export trigger time

In `ReviewWorkspace.jsx`, when the Export modal opens, the following state objects are available
in scope:

```
corrections: {
  "1-2": {
    action: "edit",
    corrected_item_name: "Plain Dosa",
    corrected_rate: null,           // only name changed
    corrected_category: null,
    original_item_name: "Idli (1 pc)",   // present IF loaded from API
    original_rate: 35,
    original_category: "Organic Tiffin's"
  },
  "3-2": { action: "delete_hallucination", original_item_name: "Stuffed Mirchi Bajji (4 pcs)", ... },
  "3-3": { action: "unclear", original_item_name: "Brinjal Bajji (4 Pcs)", ... },
  ...
}

noteCorrections: {
  "1-0": { action: "approve" },
  "1-1": { action: "edit", corrected_note_text: "..." }
}

docData.pages: [
  { page_number: 1, rows: [ { row_no: 2, item_name: "Idli (1 pc)", rate: 35, ... } ] }
]
```

### 3.3 Critical data gap: optimistic vs. API-loaded corrections

When a correction is **freshly saved** (optimistic update in `saveCorrection`), the state is:
```js
setCorrections(c => ({ ...c, [key]: { action, ...correctedFields } }));
```
`correctedFields` contains only `corrected_*` values — the `original_*` fields are **not stored**
in the optimistic update.

When corrections are **loaded from the backend** (on page mount via `fetchDoc`), the full MongoDB
document is returned, which DOES include `original_item_name`, `original_rate`, `original_category`.

**Resolution**: `docData.pages` always contains the original AI values (the AI archive is immutable).
The diff view must join: `corrections[key].corrected_*` + `pages[page].rows[row_no].item_name` for
originals. This guarantees correctness regardless of whether corrections were just saved or loaded.

### 3.4 add_missing rows — no page/row lookup possible

`add_missing` corrections have `row_no: null` and are stored with `is_manual_add: true`. They
cannot be looked up in `docData.pages`. The diff view must handle these as a special case:
show only corrected fields (name, rate, category) with an "ADDED" badge.

### 3.5 Note corrections in the export

`note_corrections` ARE applied during export (`GET /export`): deleted notes are dropped, edited
notes have their text replaced. The corrections data is in `noteCorrections` state in
ReviewWorkspace. Whether to include note corrections in the diff view is an **open decision**
(see Section 8, Q1).

---

## 4. Full Dependency Map

```
CR-MENU-0001
│
├── READS (no change)
│   ├── ReviewWorkspace.jsx state: corrections {}
│   ├── ReviewWorkspace.jsx state: noteCorrections {}
│   ├── ReviewWorkspace.jsx state: docData.pages[]
│   └── ReviewWorkspace.jsx state: progress {}
│
├── FILE CHANGES
│   ├── frontend/src/components/review/ExportModal.jsx    ← MAIN CHANGE
│   │     Add: buildDiffItems() pure function
│   │     Add: DiffItemRow sub-component
│   │     Add: CorrectionsDiffSection sub-component
│   │     Modify: function signature — add `pages`, `corrections`, `noteCorrections` props
│   │     Modify: confirm-state JSX — insert CorrectionsDiffSection
│   │
│   └── frontend/src/pages/review/ReviewWorkspace.jsx     ← MINOR CHANGE
│         Modify: <ExportModal> JSX call — add 3 new props
│
├── FILES NOT CHANGED
│   ├── backend/server.py          (no new endpoints)
│   ├── ReviewTable.jsx            (untouched)
│   ├── ActionButtons.jsx          (untouched)
│   ├── MenuNotesPanel.jsx         (untouched)
│   ├── AddMissingRowModal.jsx     (untouched)
│   ├── PDFViewer.jsx              (untouched)
│   ├── ReviewLanding.jsx          (untouched)
│   └── App.js                    (untouched)
│
├── NO NEW DEPENDENCIES
│   (all icons already from lucide-react; all colors already in Tailwind config)
│
└── DOWNSTREAM (not changed, just consumes the same export)
    └── GET /export endpoint — unchanged behaviour; JSON format unchanged
```

---

## 5. Data Model for Diff View (client-side only)

```typescript
type DiffItem = {
  page: number;
  rowNo: number | null;           // null for add_missing rows
  action: "edit" | "delete_hallucination" | "unclear" | "add_missing" | "out_of_scope";
  originalName: string | null;    // from correction.original_item_name OR pages lookup
  correctedName: string | null;   // from correction.corrected_item_name
  originalRate: number | null;
  correctedRate: number | null;
  originalCategory: string | null;
  correctedCategory: string | null;
  reviewerNotes: string | null;
}
```

**buildDiffItems(pages, corrections) algorithm:**
1. Build `pageRowMap`: `{ "pageNo-rowNo": { item_name, rate, category } }` from `pages`
2. Iterate `Object.entries(corrections)`:
   - Skip `action === "approve"` entries
   - Lookup original from `pageRowMap[key]` (always present except for `add_missing`)
   - Fall back to `correction.original_item_name` if pageRowMap lookup fails
   - Construct DiffItem
3. Sort by `page ASC`, then `rowNo ASC` (nulls last)

---

## 6. UI Specification

### Color scheme (consistent with existing ReviewTable ACTION_BADGE)

| Action | Background | Text | Badge label | Icon |
|---|---|---|---|---|
| `edit` | `bg-blue-50` border `border-blue-100` | `text-blue-700` | EDITED | `Pencil` |
| `delete_hallucination` | `bg-red-50` border `border-red-100` | `text-red-600` | DELETED | `Trash2` |
| `unclear` | `bg-amber-50` border `border-amber-100` | `text-amber-700` | UNCLEAR | `AlertTriangle` |
| `add_missing` | `bg-purple-50` border `border-purple-100` | `text-purple-700` | ADDED | `Plus` |
| `out_of_scope` | `bg-slate-50` border `border-slate-100` | `text-slate-600` | OUT OF SCOPE | `MinusCircle` |

### Layout (within confirm-state only)

```
┌─────────────────────────────────────────────────────────┐
│ CORRECTIONS TO REVIEW  [3]                              │  ← 10px header + count badge
├─────────────────────────────────────────────────────────┤
│ P1·R2  [EDITED]  Idli (1 pc) → Plain Dosa  ₹35         │  ← blue row
│ P3·R2  [DELETED] Stuffed Mirchi Bajji ₹110             │  ← red row, strikethrough
│ P3·R3  [UNCLEAR] Brinjal Bajji ₹110                    │  ← amber row
└─────────────────────────────────────────────────────────┘
   max-h-48 overflow-y-auto
```

For EDITED rows — show original in grey strikethrough, arrow, then corrected in bold:
```
Idli (1 pc)  →  Plain Dosa
```
If only name changed, rate shows as original (no arrow).
If rate also changed: `₹35 → ₹50`

### Zero non-approve corrections state
```
✓  All 122 reviewed rows were approved — nothing to inspect
```
(emerald text, CheckCircle2 icon)

---

## 7. Acceptance Criteria

| # | Criterion |
|---|---|
| AC-1 | Opening Export Modal on **Akula Organics** shows 3 non-approve rows (1 EDITED, 1 DELETED, 1 UNCLEAR) in correct colors |
| AC-2 | EDITED row shows: `Idli (1 pc) → Plain Dosa` with original name in grey strikethrough |
| AC-3 | DELETED row shows item name with red badge; name is struck through |
| AC-4 | UNCLEAR row shows item name with amber badge and AlertTriangle icon |
| AC-5 | Opening Export Modal on **Ghatkesar** shows the "All N rows approved" green state (no diff list) |
| AC-6 | Export button still works and downloads correct JSON — no regression in export logic |
| AC-7 | Modal height does not exceed viewport; diff section is scrollable when > 4 items |
| AC-8 | `add_missing` rows appear with purple ADDED badge, showing corrected name/rate/category |

---

## 8. Open Decisions — Owner Input Required Before Implementation

The following 4 design questions affect scope and must be decided before coding starts:

### Q1: Include note corrections in the diff view?

The export applies note corrections (deletes dropped notes, applies text edits to note text).
Currently, `noteCorrections` state is available in ReviewWorkspace.

- **Option A (include)** — Show a second section "NOTE CORRECTIONS [N]" below the row corrections list, listing approved/edited/deleted note actions.
- **Option B (exclude)** — Diff view covers row corrections only. Notes are handled in the Notes tab during review and do not appear here.

*Recommended: Option B — keeps the modal focused. Notes are secondary to POS items.*

---

### Q2: Click-to-navigate from a diff item back to that page/row?

Should a reviewer be able to click an item in the diff list and have it:
- Close the Export Modal
- Jump the PDF viewer and row table to that specific page

This would allow last-minute edits from within the export flow.

- **Option A (yes, navigable)** — Each diff row has a small "Go to row" icon button. Clicking it closes modal and calls `handlePageChange(item.page)`.
- **Option B (no, read-only)** — Diff view is informational only. If reviewer wants to change something, they cancel the modal manually and navigate themselves.

*Recommended: Option B for this CR. Navigation can be a follow-on CR if needed.*

---

### Q3: Should UNCLEAR rows carry a special "POS Warning" callout?

UNCLEAR rows ARE included in the exported JSON with `review_action: "unclear"`. They go to POS
as-is with the original AI values. The reviewer may not realise this.

- **Option A (yes, warn)** — Add a small notice below the UNCLEAR row(s): *"These items will be exported with original AI values. Verify before POS push."*
- **Option B (no extra warning)** — The amber UNCLEAR badge is sufficient; no additional text.

*Impact: If yes, affects diff section layout slightly.*

---

### Q4: Should "pending" (unreviewed) rows be mentioned?

For Akula Organics, 20 rows were not reviewed. In the current Export Modal, this is shown as:
*"20 rows are still unreviewed — included as `review_action: pending`"* (existing amber warning banner).

Should the diff view also list those 20 rows, or is the existing banner sufficient?

- **Option A (list them)** — Show a separate collapsible "UNREVIEWED ROWS [20]" section. This could be overwhelming for a large menu.
- **Option B (existing banner is sufficient)** — Keep the existing amber "20 rows unreviewed" warning. Diff shows only corrections, not pending items.

*Recommended: Option B — listing all 20 unreviewed rows adds noise, not value.*

---

## 9. Effort Estimate (post-decision)

| Scope | Lines | Time |
|---|---|---|
| `ExportModal.jsx` main changes | ~90 lines | 25 min |
| `ReviewWorkspace.jsx` prop wiring | ~3 lines | 2 min |
| Smoke test (Akula + Ghatkesar) | — | 10 min |
| **Total** | ~93 lines | **~40 min** |

If Q2 (navigation) is included: add ~20 lines + 10 min.
If Q1 (notes) is included: add ~30 lines + 10 min.

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `corrections` state is optimistic — missing `original_*` fields | LOW | UI shows "—" instead of original name | Use `pages` lookup as primary source for originals |
| `add_missing` rows have `row_no: null` — no page lookup | CERTAIN | N/A | Handled explicitly: show corrected fields only, ADDED badge |
| Modal height overflow on large correction sets | LOW | Poor UX | `max-h-48 overflow-y-auto` cap enforced |
| Export button regression | LOW | Blocking | Export logic untouched; only confirm-state JSX adds new section |
| `out_of_scope` action exists but has no test data | LOW | Untested path | Code handles it; no AC required until test data available |
