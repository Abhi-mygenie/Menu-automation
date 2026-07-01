# Feature: Pre-Export Correction Diff View
**Registered:** 2026-07-01  
**Requested by:** User — "during export, do I see corrected UI with any color marker just to identify once more quickly before getting into the POS"  
**Status:** PLANNED — no code written yet

---

## 1. Problem Statement

The current Export Modal shows only **count-level stats** (reviewed: 122, edited: 1, deleted: 1…). The user has no way to see *which specific items* were corrected before the JSON is sent to POS. They want a **line-by-line diff view** inside the Export Modal — color-coded by action — so they can do a final sanity check before clicking Export.

---

## 2. Impact Analysis

### Files That Change
| File | Type | Why |
|---|---|---|
| `frontend/src/components/review/ExportModal.jsx` | **MODIFY** | Core change — add diff section inside confirm state |
| `frontend/src/pages/review/ReviewWorkspace.jsx` | **MODIFY (minor)** | Pass 2 new props to `<ExportModal>`: `pages` and `corrections` |

### Files That Do NOT Change
- `backend/server.py` — no new API endpoint needed. All data is already in the parent component's state.
- `ReviewTable.jsx`, `MenuNotesPanel.jsx`, `ActionButtons.jsx` — untouched.
- Any other component — untouched.

### Why No Backend Change?
There is **no GET /corrections endpoint** in the backend (only POST). The corrections are loaded into `ReviewWorkspace` state on mount (via `GET /documents/{id}` which merges corrections into each row). The `corrections` state map already holds all the data we need client-side. Passing it as a prop is the correct approach.

---

## 3. Data Flow

```
ReviewWorkspace.jsx
  ├── docData.pages[]         (rows with original: item_name, rate, category)
  └── corrections {}          (map: "pageNo-rowNo" → { action, corrected_item_name, ... })
         │
         │  passed as new props: pages={docData.pages} corrections={corrections}
         ▼
ExportModal.jsx
  └── buildDiffItems(pages, corrections)
        → filter corrections where action !== "approve"
        → join with pages to get original values
        → return sorted list of DiffItem objects
        → render CORRECTIONS TO REVIEW section
```

---

## 4. Data Structures

### Input — `corrections` map (already exists in ReviewWorkspace state)
```js
{
  "1-2": { action: "edit", corrected_item_name: "Plain Dosa", corrected_rate: null, corrected_category: null },
  "3-2": { action: "delete_hallucination" },
  "3-3": { action: "unclear" },
  // add_missing rows have key format "pageNo-null-uuid" — handled separately
}
```

### Input — `pages` array (already exists from docData)
```js
[
  { page_number: 1, rows: [ { row_no: 2, item_name: "Idli (1 pc)", rate: 35, category: "Organic Tiffin's" }, ... ] },
  ...
]
```

### Computed — `diffItems` (built client-side inside ExportModal)
```js
[
  {
    page: 1, rowNo: 2, action: "edit",
    originalName: "Idli (1 pc)", correctedName: "Plain Dosa",
    originalRate: 35, correctedRate: null,
    originalCategory: "Organic Tiffin's", correctedCategory: null
  },
  {
    page: 3, rowNo: 2, action: "delete_hallucination",
    originalName: "Stuffed Mirchi Bajji (4 pcs)", correctedName: null,
    originalRate: 110, correctedRate: null,
    originalCategory: "Organic Snacks", correctedCategory: null
  },
  {
    page: 3, rowNo: 3, action: "unclear",
    originalName: "Brinjal Bajji (4 Pcs)",
    originalRate: 110, originalCategory: "Organic Snacks"
  },
  // add_missing rows (row_no is null) — no original, only corrected fields
  {
    page: 2, rowNo: null, action: "add_missing",
    correctedName: "...", correctedRate: ..., correctedCategory: "..."
  }
]
```

---

## 5. UI Design

### Section location
Inside `ExportModal.jsx` confirm state, **between** the review summary counts block and the action buttons. Only rendered when `diffItems.length > 0`.

### If zero non-approve corrections
Show a small green pill: `All {N} reviewed rows approved — nothing to inspect`

### If there are corrections: "CORRECTIONS TO REVIEW" section
```
┌─────────────────────────────────────────────────────┐
│ CORRECTIONS TO REVIEW  [3 items]                   │
├─────────────────────────────────────────────────────┤
│ ✏️ EDITED    P1 R2  │ Idli (1 pc) → Plain Dosa  ₹35 │
│ 🗑️ DELETED   P3 R2  │ Stuffed Mirchi Bajji ₹110     │  (strikethrough, dimmed)
│ ⚠️ UNCLEAR   P3 R3  │ Brinjal Bajji ₹110            │  (amber highlight)
└─────────────────────────────────────────────────────┘
```

### Color coding (consistent with ReviewTable styles already in codebase)
| Action | Background | Badge color | Icon |
|---|---|---|---|
| `edit` | `bg-blue-50` | `text-blue-700` | `Pencil` |
| `delete_hallucination` | `bg-red-50` | `text-red-700` | `Trash2` |
| `unclear` | `bg-amber-50` | `text-amber-700` | `AlertTriangle` |
| `add_missing` | `bg-purple-50` | `text-purple-700` | `Plus` |
| `out_of_scope` | `bg-slate-50` | `text-slate-600` | `MinusCircle` |

### For EDITED rows specifically
- Show: `[original name (grey, small)]  →  [corrected name (bold)]`
- If only name changed: rate shows original
- If rate also changed: show `₹original → ₹corrected` in blue

### Max height
Section max-height: `max-h-48 overflow-y-auto` — scrollable if many corrections, doesn't bloat the modal

---

## 6. Step-by-Step Implementation Plan

### Step 1 — Update `ReviewWorkspace.jsx` (2 lines)
In the `<ExportModal ...>` JSX (around line 721-728), add:
```jsx
pages={docData?.pages || []}
corrections={corrections}
```

### Step 2 — Update `ExportModal.jsx` prop signature
Add `pages = []` and `corrections = {}` to the function signature.

### Step 3 — Add `buildDiffItems` pure function at top of file
```js
function buildDiffItems(pages, corrections) {
  const pageRowMap = {};
  pages.forEach(p => {
    p.rows.forEach(r => { pageRowMap[`${p.page_number}-${r.row_no}`] = { ...r, page: p.page_number }; });
  });

  const items = [];
  Object.entries(corrections).forEach(([key, corr]) => {
    if (corr.action === "approve") return;
    const orig = pageRowMap[key] || {};
    items.push({
      page: orig.page || parseInt(key.split("-")[0]),
      rowNo: orig.row_no || null,
      action: corr.action,
      originalName: orig.item_name || null,
      correctedName: corr.corrected_item_name || null,
      originalRate: orig.rate ?? null,
      correctedRate: corr.corrected_rate ?? null,
      originalCategory: orig.category || null,
      correctedCategory: corr.corrected_category || null,
      reviewerNotes: corr.reviewer_notes || null,
    });
  });

  // Sort: by page then rowNo
  items.sort((a, b) => a.page - b.page || (a.rowNo || 0) - (b.rowNo || 0));
  return items;
}
```

### Step 4 — Add `DiffItem` sub-component inside ExportModal file
Small component that renders a single row in the diff list. Accepts a `diffItem` prop and renders color-coded row.

### Step 5 — Add `CorrectionsDiffSection` to the confirm state JSX
After the `StatRow` block, before the action buttons. Renders either the "all approved" green message or the scrollable list.

### Step 6 — Smoke test
Open Akula Organics → click "Complete & Export" → verify the modal shows 3 correction rows (1 edit, 1 delete, 1 unclear) with correct color coding.

---

## 7. Edge Cases & Rules

| Case | Handling |
|---|---|
| `add_missing` row (row_no = null) | No original row to look up — show corrected fields only, purple badge |
| Edit with only name changed | Show rate as original (no → arrow) |
| Edit with rate also changed | Show `₹35 → ₹40` in blue |
| All rows approved (no diff items) | Show green "All rows approved" message instead of empty list |
| No corrections at all (fresh menu) | Same as above |
| Notes corrections | OUT OF SCOPE for this feature — notes panel has its own review flow |

---

## 8. What This Does NOT Change
- Export button behaviour (JSON download) — unchanged
- Backend export logic — unchanged
- ReviewTable, PDFViewer, any other component — unchanged
- The exported JSON format — unchanged

---

## 9. Effort Estimate
- `ExportModal.jsx`: ~80 new lines
- `ReviewWorkspace.jsx`: 2 lines
- Total: ~30 min implementation + 10 min smoke test

---

## 10. Acceptance Criteria
1. Opening Export Modal on Akula Organics shows a "CORRECTIONS TO REVIEW" section with 3 rows (edit, delete, unclear) each with correct colors.
2. Opening Export Modal on Ghatkesar shows the "All N rows approved" green message (no diff items).
3. The Export button still works and downloads the correct JSON — no regression.
4. If 0 non-approve corrections, the section is either hidden or shows the "all approved" state — never shows an empty list.
