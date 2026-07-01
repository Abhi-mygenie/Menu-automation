# CR-MENU-0002: Note Corrections in Pre-Export Diff View

| Field | Value |
|---|---|
| **CR ID** | CR-MENU-0002 |
| **Title** | Note Corrections in Pre-Export Diff View |
| **Phase** | Review Tool — follow-on to CR-MENU-0001 |
| **Gate required** | N/A |
| **Priority** | P2 |
| **Status** | OPEN — PARKED (implement after CR-MENU-0001 ships) |
| **Assigned to** | Unassigned |
| **Created** | 2026-07-01 |
| **Requested by** | Owner (Abhi) — raised during CR-MENU-0001 decision review |
| **Depends on** | CR-MENU-0001 must be complete and merged first |
| **Parent CR** | CR-MENU-0001 — Pre-Export Correction Diff View |

---

## 1. Problem Statement

CR-MENU-0001 (Pre-Export Correction Diff View) was scoped to **row corrections only** (Decision Q1=B).
Note corrections — approved, edited, or deleted menu notes — are applied during export
(`GET /export`) but are not surfaced anywhere in the Export modal's diff view.

A reviewer who edited or deleted a note during the session has no visual confirmation of that
action at the moment of export. This CR closes that gap by adding a second section to the
same "CORRECTIONS TO REVIEW" area.

---

## 2. Proposed Solution

Add a **"NOTE CORRECTIONS [N]"** section below the existing row-corrections list inside
`CorrectionsDiffSection`, visible only when there are non-approve note corrections.

---

## 3. Scope

### 3.1 What is in scope
- Show each non-approve note correction (edited, deleted) in the diff section
- Approved notes are excluded (same principle as row approvals)
- Section appears only when `noteCorrections` has non-approve entries

### 3.2 What is out of scope
- No backend changes
- No changes to the Notes tab or note review flow
- No changes to export logic

---

## 4. Impact Analysis

### Files changed
| File | Change type | Estimated lines |
|---|---|---|
| `frontend/src/components/review/ExportModal.jsx` | MODIFY — add note diff section | ~30 lines |
| `frontend/src/pages/review/ReviewWorkspace.jsx` | MODIFY — pass `noteCorrections` prop | 1 line |

### Files NOT changed
Everything else — backend, other components, routing — untouched.

### Dependency on CR-MENU-0001
CR-MENU-0001 introduces:
- `CorrectionsDiffSection` component
- `buildDiffItems()` function
- `pages` and `corrections` props on `ExportModal`

This CR adds to those foundations. It must not be implemented before CR-MENU-0001 is complete.

---

## 5. Data Available

`noteCorrections` state in `ReviewWorkspace` (already exists):
```js
noteCorrections: {
  "1-0": { action: "approve" },
  "1-1": { action: "edit", corrected_note_text: "No service charge" }
}
```

Key format: `"pageNo-noteIndex"`

`docData.pages[].menu_notes[]` contains original note text for lookup.

Note correction object fields (from MongoDB):
```
correction_type: "note"
note_index: number
note_page: number
action: "approve" | "edit" | "delete"
original_note_text: string
original_note_type: string
corrected_note_text: string | null
```

---

## 6. New Function: buildNoteDiffItems

```js
function buildNoteDiffItems(pages, noteCorrections) {
  // Build lookup: "pageNo-noteIndex" → note object
  const noteMap = {};
  pages.forEach(p => {
    (p.menu_notes || []).forEach((n, idx) => {
      noteMap[`${p.page_number}-${idx}`] = {
        page: p.page_number,
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
      page:              orig?.page ?? parseInt(pageStr, 10),
      noteIndex:         orig?.noteIndex ?? null,
      action:            corr.action,            // "edit" | "delete"
      originalText:      orig?.note_text ?? corr.original_note_text ?? null,
      correctedText:     corr.corrected_note_text ?? null,
      noteType:          orig?.note_type ?? null,
    });
  });

  items.sort((a, b) => a.page - b.page || (a.noteIndex ?? 0) - (b.noteIndex ?? 0));
  return items;
}
```

---

## 7. New Sub-component: NoteDiffItemRow

```jsx
const NOTE_ACTION_CONFIG = {
  edit:   { label: "NOTE EDITED",   bg: "bg-blue-50",  border: "border-l-blue-400",  badge: "text-blue-700 bg-blue-100",  Icon: Pencil },
  delete: { label: "NOTE DELETED",  bg: "bg-red-50",   border: "border-l-red-400",   badge: "text-red-700 bg-red-100",    Icon: Trash2 },
};

const NoteDiffItemRow = ({ item }) => {
  const cfg = NOTE_ACTION_CONFIG[item.action] || NOTE_ACTION_CONFIG.edit;
  const { Icon } = cfg;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 border-l-2 ${cfg.bg} ${cfg.border}`}>
      <Icon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${cfg.badge.split(" ")[0]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-px flex-shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
            P{item.page}·N{item.noteIndex ?? "?"}
          </span>
        </div>
        {item.action === "edit" ? (
          <p className="text-xs text-slate-600 mt-0.5 leading-snug">
            <span className="line-through text-slate-400">{item.originalText}</span>
            <span className="mx-1 text-slate-400">→</span>
            <span className="font-medium text-slate-800">{item.correctedText}</span>
          </p>
        ) : (
          <p className="text-xs line-through text-red-400 opacity-70 mt-0.5 leading-snug">
            {item.originalText}
          </p>
        )}
      </div>
    </div>
  );
};
```

---

## 8. Change to CorrectionsDiffSection

After CR-MENU-0001 ships, `CorrectionsDiffSection` accepts an additional `noteDiffItems` prop
and renders a second block when it has entries:

```jsx
const CorrectionsDiffSection = ({ diffItems, noteDiffItems = [] }) => {
  const hasRowCorrections  = diffItems.length > 0;
  const hasNoteCorrections = noteDiffItems.length > 0;
  const totalCorrections   = diffItems.length + noteDiffItems.length;

  if (totalCorrections === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        <p className="text-xs text-emerald-700">
          All reviewed rows and notes were approved — nothing to inspect
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasRowCorrections && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 tracking-widest mb-1.5 flex items-center gap-2">
            CORRECTIONS TO REVIEW
            <span className="px-1.5 py-px bg-slate-100 text-slate-600 font-bold">{diffItems.length}</span>
          </p>
          <div className="border border-slate-100 max-h-48 overflow-y-auto divide-y divide-slate-100">
            {diffItems.map((item, i) => <DiffItemRow key={i} item={item} />)}
          </div>
        </div>
      )}
      {hasNoteCorrections && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 tracking-widest mb-1.5 flex items-center gap-2">
            NOTE CORRECTIONS
            <span className="px-1.5 py-px bg-slate-100 text-slate-600 font-bold">{noteDiffItems.length}</span>
          </p>
          <div className="border border-slate-100 max-h-32 overflow-y-auto divide-y divide-slate-100">
            {noteDiffItems.map((item, i) => <NoteDiffItemRow key={i} item={item} />)}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 9. Change to ExportModal and ReviewWorkspace

**ExportModal.jsx:**
- Add `noteCorrections = {}` to function signature
- Add `noteDiffItems = useMemo(() => buildNoteDiffItems(pages, noteCorrections), [pages, noteCorrections])`
- Pass `noteDiffItems={noteDiffItems}` to `<CorrectionsDiffSection>`

**ReviewWorkspace.jsx:**
- Add `noteCorrections={noteCorrections}` to `<ExportModal>` props

---

## 10. Visual Wireframe (combined with CR-MENU-0001)

```
CORRECTIONS TO REVIEW  [3]
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
[EDITED]  P1·R2  Idli (1 pc) → Plain Dosa  ₹35
[DELETED] P3·R2  ~~Stuffed Mirchi Bajji~~  ₹110
[UNCLEAR] P3·R3  Brinjal Bajji  ₹110
  ⚠ Will be exported with original AI values

NOTE CORRECTIONS  [1]
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
[NOTE EDITED]  P1·N1  ~~Original note text~~ → Corrected note text
```

---

## 11. Acceptance Criteria

| # | Criterion |
|---|---|
| AC-1 | Export modal shows "NOTE CORRECTIONS [N]" section when non-approve note corrections exist |
| AC-2 | Edited notes show original text (strikethrough) → corrected text |
| AC-3 | Deleted notes show original text in red strikethrough |
| AC-4 | Approved notes do NOT appear in the section |
| AC-5 | When zero note corrections, section is hidden (not an empty block) |
| AC-6 | When zero row AND zero note corrections, green "all approved" message updates to say "rows and notes" |
| AC-7 | No regression in row corrections diff or export download |

---

## 12. Effort Estimate

| Task | Lines | Time |
|---|---|---|
| `buildNoteDiffItems()` function | ~25 lines | 5 min |
| `NoteDiffItemRow` component | ~30 lines | 8 min |
| Update `CorrectionsDiffSection` signature + render | ~15 lines | 5 min |
| `ExportModal` — add prop + useMemo | ~5 lines | 2 min |
| `ReviewWorkspace` — add 1 prop | 1 line | 1 min |
| Smoke test | — | 5 min |
| **Total** | ~76 lines | **~26 min** |

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CR-MENU-0001 not complete | — | Blocks this CR | Hard dependency — do not start before CR-MENU-0001 is merged |
| Note key format mismatch | LOW | Wrong notes shown | Key is `"pageNo-noteIndex"` — consistent with existing noteCorrections state |
| Modal height growth | LOW | Overflow | Note section has its own `max-h-32` cap separate from row section |
