# MyGenie POS — Production-Grade AI Menu Import System — Review UI Specification

**Document version:** 2.0 (production-grade revision)
**Status:** Draft — pending Approval Gate 5
**Target framework:** React (Next.js) within existing POS frontend, TypeScript, TanStack Table, shadcn/ui, Zustand for local UI state, React Query for server state.
**Positioning:** The review UI is the **primary safety control** in the production system. It is the place where the human reviewer verifies every AI-extracted row against its source, approves, and gates the sync. Its quality is as important as backend correctness.

---

## 1. Goals of the Review UI

- Make manual review **faster than typing the menu from scratch**.
- Surface AI uncertainty (confidence + warnings) **without overwhelming** the user.
- Allow **fast inline edits** with single-key shortcuts.
- Never hide rows. Low-confidence rows are highlighted, **never auto-removed**.
- Provide explicit, auditable approval steps before sync.

---

## 2. Information Architecture / Routes

| Route | Purpose |
|---|---|
| `/menu-import` | Landing — list of imports, primary CTA "Upload menu" |
| `/menu-import/upload` | Upload modal/page (drag-drop + file picker) |
| `/menu-import/{id}` | Import detail — status, progress, navigation tabs |
| `/menu-import/{id}/review` | Main review table (default tab) |
| `/menu-import/{id}/notes` | Detected menu notes panel (tab) |
| `/menu-import/{id}/modifiers` | Modifier groups review (tab, P1) |
| `/menu-import/{id}/audit` | Audit log + sync result (tab, owner+admin) |
| `/menu-import/{id}/preview` | "Sync preview" — what will be created in POS |

---

## 3. Layouts

### 3.1 Landing — `/menu-import`

```
┌────────────────────────────────────────────────────────────────┐
│ Header: Restaurant name • Cuisine • [+ Upload menu]            │
├────────────────────────────────────────────────────────────────┤
│ Filters: [Status v] [Date v] [Search]                          │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Imports table                                            │   │
│ │  Date | File | Pages | Rows | Status | Synced | Actions  │   │
│ └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

Each row: **Status badge** color-coded:
- gray `uploaded` / `preprocessing` / `extracting`
- amber `review_required` / `sync_partial`
- green `synced_to_menu`
- red `failed`

**Actions per import**: Open • Re-upload (force) • Export CSV • Delete (only when not synced).

### 3.2 Import detail — `/menu-import/{id}`

Header strip:

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Back   Import #1024 • menu.pdf • 5 pages • Status: Review needed │
│                                                                    │
│ Progress: ████████░░░░  87 rows extracted • 53 ready to approve    │
│                                                                    │
│ Tabs: [ Review (87) ] [ Menu Notes (4) ] [ Modifiers (1) ]         │
│        [ Sync Preview ] [ Audit ]                                  │
│                                                                    │
│ Right rail buttons: [Approve all clean] [Sync approved (53)]       │
└────────────────────────────────────────────────────────────────────┘
```

Status auto-polls every 4s while non-terminal.

### 3.3 Review tab — main table layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Toolbar:  [Search items…] [Filter: status v] [Confidence v] [Warning v]     │
│           [Bulk: Approve ▼] [Reject ▼] [Export CSV]                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☐  No  Item Name           Cat       Sub      Rate  Type  PT   Conf  Warn  │
│ ☐  1   Paneer Butter Mas.  Indian M. Paneer   240   veg   fix   91%  —     │
│ ☐  2   Veg Pizza ▸ 3 var   Pizza     —        —     veg   var   88%  ⚠     │
│ ☐  3   Burger              Burgers   —        120   veg   fix   84%  ⚠     │
│ ☐  4   Cheese              ?         ?        20    veg   fix   42%  ⛔    │
│ …                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

  Right side panel (slides in on row click): Variants · Add-ons · Warnings · Actions
```

---

## 4. Main Table — Columns

| Column | UI | Editable | Notes |
|---|---|---|---|
| `☐` Checkbox | bulk select | n/a | sticky |
| `No.` | row index | — | calc on client |
| `Item Name` | text + inline edit | ✓ | shows `corrected_item_name` if set, with original in tooltip |
| `Category` | combobox (existing categories + free-text) | ✓ | autocomplete from POS Menu API |
| `Subcategory` | combobox | ✓ | depends on category |
| `Rate` | number with currency prefix | ✓ | shows variant indicator if variant_based |
| `Food Type` | enum chip (V/NV/E/?) | ✓ | dropdown |
| `Pricing Type` | enum chip | ✓ | dropdown |
| `Unit` | text (e.g., `/kg`, `/pc`) | ✓ | autocomplete |
| `Variant` | indicator chip "▸ 3 var" | click → side panel | — |
| `Add-on` | indicator chip "+ 2 add" | click → side panel | — |
| `Description` | truncated text | inline modal edit | — |
| `Confidence` | percentage + colored dot | — | green ≥85, yellow 60–84, red <60 |
| `Warnings` | warning chips (count + tooltip) | click → opens warnings list | — |
| `Status` | status chip | — | review_required / approved / rejected / etc. |
| `Actions` | "⋯" menu | n/a | row actions (see §6) |

**Sticky behavior:** first 3 columns + Actions column sticky on horizontal scroll.

---

## 5. Confidence + Warning Visualization

### 5.1 Confidence
- High confidence (`>= 0.85`): subtle green left border.
- Medium (`0.60–0.84`): amber left border + warning icon.
- Low (`< 0.60`): red left border + bold "Needs review" tag, bold weight on item_name.

The colored border is **never the only indicator** — a small icon + textual label ("High", "Medium", "Low") is also shown for accessibility (WCAG 2.1 AA).

### 5.2 Warnings
- Warning chip count next to row, e.g., `⚠ 2`.
- Tooltip on hover lists each warning with friendly explanation:
  - `price_uncertain` → "We weren't sure of the price. Check it before approving."
  - `multi_column_confusion` → "This item appears in a multi-column area. Verify category."
  - `addon_without_parent_item` → "This looks like an add-on but we couldn't link it to an item."
  - `combo_detected` → "This may be a combo. Consider using 'Mark as Combo'."
- Clicking the chip opens the **Warnings panel** (right rail) with action buttons.

### 5.3 Blocking warnings
Rows containing any of:
`price_uncertain`, `missing_price`, `addon_without_parent_item`, `multi_column_confusion`
are **excluded from "Approve all clean"** automatically. Approving them individually is allowed but requires confirmation: "This row has unresolved warnings. Approve anyway?"

---

## 6. Row Actions (per row "⋯" menu)

| Action | Behavior |
|---|---|
| Edit row | Switches row to inline edit mode (Item, Category, Rate, etc.) |
| Approve row | `POST /rows/{id}/approve` |
| Reject row | `POST /rows/{id}/reject` (with reason modal) |
| Delete row | Soft delete (`DELETE` + status `rejected`) |
| Add row | Opens "Add new item" modal — for items missed by AI |
| Merge into… | Opens picker → `POST /rows/{id}/merge` |
| Split into variants | Opens variant builder → `POST /rows/{id}/split-variant` |
| Convert to variant of… | Opens picker → `POST /rows/{id}/convert` |
| Convert to add-on of… | Opens picker → `POST /rows/{id}/convert` |
| Mark as combo | `POST /rows/{id}/convert?to=combo` |
| Mark as menu note | `POST /rows/{id}/convert?to=menu_note` (with note_type) |

Keyboard shortcuts (when a row is focused):
- `E` edit • `A` approve • `R` reject • `M` merge • `V` split-variant • `Esc` cancel.

---

## 7. Bulk / Batch Actions (toolbar)

| Action | Endpoint | Confirmation |
|---|---|---|
| Approve all clean rows | `POST /{id}/approve-all` | summary modal: "This will approve N rows where confidence ≥ 85% with no blocking warnings. Continue?" |
| Approve selected | `POST /{id}/approve-selected` | inline toast |
| Reject selected | `POST /{id}/reject-selected` | confirmation modal with optional reason |
| Sync approved rows | `POST /{id}/sync` | sync preview modal (see §10) |
| Export review CSV | `GET /{id}/export` | direct download |

---

## 8. Side Panels

The review screen is a 2-column layout: **table left**, **detail panel right**. The detail panel switches based on the focused row or selected chip.

### 8.1 Variant panel
```
┌─────────────────────────────┐
│ Variants — Veg Pizza        │
├─────────────────────────────┤
│ Group: [Size       v]       │
│ ─────────────────────────── │
│ Small   [120.00] ★ default  │
│ Medium  [180.00] [edit]     │
│ Large   [250.00] [edit]     │
│ + Add variant               │
└─────────────────────────────┘
```
- Inline edit name / price.
- ★ Set default.
- Reorder via drag handle.
- Approve/Reject per variant.

### 8.2 Add-on panel
```
┌─────────────────────────────┐
│ Add-ons — Burger            │
├─────────────────────────────┤
│ Group: [Extras    v]        │
│ ─────────────────────────── │
│ Cheese        20.00 [edit]  │
│ Extra Patty   60.00 [edit]  │
│ + Add add-on                │
└─────────────────────────────┘
```

### 8.3 Menu Notes panel (tab + per-row)
```
┌─────────────────────────────────────────────┐
│ Detected Menu Notes (4)                     │
├─────────────────────────────────────────────┤
│ "GST extra"          [tax_note]      ▾      │
│   Map to: ( ) Tax setting (•) Ignore        │
│ "Jain option"        [availability_note] ▾  │
│   Map to: ( ) Item description (•) Ignore   │
│ "Half plate avail."  [availability_note]    │
│   Map to: ( ) Add-on (•) Ignore             │
└─────────────────────────────────────────────┘
```
- Note type editable.
- Mapping options: convert-to-addon / convert-to-modifier / convert-to-tax-setting / convert-to-description / ignore.
- Tax notes are **never** auto-applied; choosing "Tax setting" only records intent and adds an explanatory toast: "Apply tax in POS settings."

### 8.4 Warnings panel
```
┌─────────────────────────────────────────────┐
│ Warnings — Cheese (row #4)                  │
├─────────────────────────────────────────────┤
│ ⛔ addon_without_parent_item                │
│    Suggestion: Convert to add-on of:        │
│    [ Search for parent item… ]              │
│                                             │
│ ⚠ possible_spelling_issue                   │
│    'Chees' → 'Cheese' (apply suggestion)    │
└─────────────────────────────────────────────┘
```

### 8.5 Modifier Groups panel (P1)
List of detected modifier groups with options. User can:
- Edit group name / type.
- Set min/max select + required.
- Approve / reject the entire group.
- Link group to one or more parent items.

---

## 9. Edit Affordances

- Inline edit on click into a cell. `Enter` to save, `Esc` to cancel. PATCH on save with `If-Match`.
- Optimistic UI: cell updates immediately; rolls back if `409 VERSION_CONFLICT` (toast: "Someone else updated this row. Refreshing.").
- "Undo last edit" button in toolbar (session-scoped, last 20 edits).
- All edits are saved per-field. No unsaved global state across tabs.

---

## 10. Sync Preview Modal

Triggered by **Sync approved rows** button.

```
┌──────────────────────────────────────────────────────────────┐
│ Sync preview                                                 │
├──────────────────────────────────────────────────────────────┤
│ • 53 items will be created in POS Menu                       │
│ • 2 categories will be created: "Indian Main", "Pizza"        │
│ • 12 variants will be added                                   │
│ • 5 add-ons will be added                                     │
│ • 4 menu notes will NOT be auto-applied (informational only)  │
│                                                              │
│ Run validation: ✓ all approved rows valid                    │
│                                                              │
│ Idempotency: this action is safe to retry.                   │
│                                                              │
│             [ Cancel ]   [ Confirm sync ]                    │
└──────────────────────────────────────────────────────────────┘
```

Backed by `POST /{id}/sync?dry_run=true`.

---

## 11. Sync Result Screen

After confirm, the user sees a live progress view:

```
Synced 47 / 53 rows…  ▓▓▓▓▓▓▓▓░░  88%
```

When done:
- All success → green banner "Menu synced to POS." + link to POS menu.
- Partial success → amber banner "47 synced, 6 failed." + table of failed rows with `Retry` button + view error tooltip.

---

## 12. Empty / Error States

| State | UI |
|---|---|
| No imports yet | Big upload CTA + sample tip "Try uploading a single-page menu first." |
| Import processing | Animated progress + "We're reading your menu (~1 min)" |
| All pages failed | "We couldn't read this menu. Try a clearer photo or PDF." with re-upload CTA. |
| All rows rejected | Banner "No rows to sync. Approve at least one row first." |
| POS Menu API down | Friendly retry message + automatic retry timer; admin support link. |

---

## 13. Accessibility (WCAG 2.1 AA)

- Color contrast ≥ 4.5:1 for text. **No dark text on dark bg, no light text on light bg.**
- All interactive elements have:
  - Visible focus rings.
  - `aria-label` for icon-only buttons.
  - Keyboard reachable (no `tabindex="-1"` on actionables).
- Status communicated by **icon + label**, not color alone.
- Live regions (`aria-live="polite"`) for status changes.
- Tables use `<table>` with proper `<th scope>`.

---

## 14. Test IDs (`data-testid`)

Every interactive element gets a test ID. Naming uses kebab-case + functional intent.

Examples:
- `data-testid="menu-import-upload-button"`
- `data-testid="menu-import-row-{id}"`
- `data-testid="menu-import-row-{id}-approve-button"`
- `data-testid="menu-import-row-{id}-confidence-chip"`
- `data-testid="menu-import-bulk-approve-clean-button"`
- `data-testid="menu-import-sync-button"`
- `data-testid="menu-import-variant-{id}-edit-button"`
- `data-testid="menu-import-warning-chip-{warning_code}"`
- `data-testid="menu-import-notes-panel"`
- `data-testid="menu-import-status-badge"`

The implementation contract: **every** button, link, input, status badge, panel, modal, and row has a `data-testid`. No exceptions.

---

## 15. Responsive Behavior

- Desktop ≥ 1280px: 2-column layout (table + detail panel).
- 1024–1279: detail panel collapses into a slide-in drawer.
- Tablet ≤ 1023: table virtualized, side panel becomes full-screen modal on row tap.
- Phone: Upload + status flow available; review table is scrollable but not the recommended environment. A banner suggests "Review on a larger screen for fastest editing."

---

## 16. Loading + Performance Budgets

- Initial table render of 200 rows: **< 1.5s** on a 4G connection.
- Inline edit save: **< 300ms** (server PATCH p95).
- Side panel open: **< 100ms** (data prefetched on row hover).
- Status polling: 4s intervals when non-terminal; stop on terminal.
- React Query: stale-while-revalidate for `/rows`, manual invalidation on PATCH.

---

## 17. Visual / Design System

- Use existing POS design tokens (colors, typography, spacing) as the base.
- This module adds **status semantic colors**: success (green), warning (amber), danger (red), info (blue) — used consistently across confidence, warnings, status chips.
- Typography: avoid generic Inter/Roboto-only stacks; pair POS body font with a slightly distinctive monospace for prices and IDs (e.g., `IBM Plex Mono` or `JetBrains Mono`) — to be confirmed with design.
- No emoji-as-icon; use Lucide / Phosphor / FontAwesome icons consistently.
- Empty states have approachable illustrations; **not** stock "AI sparkle" art.

---

## 18. Open UI Questions

Tracked in `MENU_IMPORT_MVP_OPEN_QUESTIONS.md`. Highlights:
- Should bulk select persist across pagination?
- Should "Approve all clean" be enabled by default or hidden behind a feature flag for first 50 imports?
- Mobile review viability for solo restaurant owners (Phase 3).
- Whether category combobox should auto-create new categories or require explicit confirm.
- Whether to show the original file image side-by-side with the row (see §19 — decided: yes).

---

## 19. Source Provenance Pane (production-grade, Phase 1)

**The single most important safety feature of the review UI.**

- A right-side pane shows the exact cropped region of the source page for the focused row (backed by `GET /rows/{row_id}/source-crop`).
- Keyboard shortcut `S` toggles the pane.
- The pane includes: page image crop, page number, row index, raw_text (OCR-read text from the source), and a "View full page" link to open the original page image in a modal.
- If the row is manual (`source=manual`) or has no `source_bbox`, the pane shows "Manual entry — no source."
- The pane is visible by default in Phase 1 because it is the user's primary defense against AI hallucinations.

---

## 20. Reviewed Flag + Filter (production-grade, Phase 1)

Independent of approve/reject — lets users triage rows they've looked at.

- Each row has a "Reviewed" checkbox in the Actions column.
- Clicking calls `POST /rows/{row_id}/mark-reviewed`.
- Filters: `All | Reviewed | Unreviewed | Approved | Rejected | Needs-review`.
- Default filter on first entry: `Needs-review` (confidence < 0.85 OR has blocking warning).
- "Approve all clean" considers both confidence threshold AND the absence of blocking warnings; `reviewed` flag is orthogonal.

---

## 21. Auto-applied Learning vs Suggestion — Visual Language

To keep the user in control and not mislead them:

- **Auto-applied** (learning rule fired, value already changed by the system before review):
  - Badge: 🔵 `Learned` (neutral blue chip).
  - Tooltip: "This was auto-corrected based on your previous corrections. Click to undo."
  - Clicking "undo" reverts the field and deactivates the rule for this restaurant.
- **Suggestion** (learning rule proposes a change but hasn't applied it):
  - Badge: 💡 `Suggested` (subtle amber).
  - Tooltip: "We noticed a pattern from previous corrections. Apply this suggestion?"
  - Two actions: Apply / Dismiss.

Rules never silently override the current user's edits — once the user edits a field in the current session, neither `Learned` nor `Suggested` will touch it.

---

## 22. Duplicate Preview Modal (production-grade, Phase 2+)

Triggered before Sync (Phase 2+). Shown only when dedup-preview returns any matches.

```
┌──────────────────────────────────────────────────────────────┐
│ Possible duplicates in your live POS menu                    │
├──────────────────────────────────────────────────────────────┤
│ Row 1 — Paneer Butter Masala                                  │
│   Existing POS item: Paneer Butter Masala (₹240, 99% match)  │
│   [ ] Skip (recommended)   [ ] Update existing   [ ] Create │
│                                                              │
│ Row 2 — Veg Pizza                                             │
│   No matches.                                                 │
│                                                              │
│ Row 3 — Burger                                                │
│   Existing POS item: Veg Burger (₹120, 93% match)            │
│   [ ] Skip   [ ] Update existing   [•] Create new            │
│                                                              │
│   [ Cancel ]   [ Apply resolutions & continue ]              │
└──────────────────────────────────────────────────────────────┘
```

- User's choice per row is PATCHed onto `menu_import_rows.dedup_resolution` before sync enqueues.
- Sync honors `skip`, `update_existing`, `create_new`.

---

## 23. Safety Guardrails in the UI (production-grade)

- "Approve all clean" default threshold = **0.85** + no blocking warnings + all children approved. Never lower without explicit admin override.
- Bulk approve of > 100 rows requires a second click confirmation: "You are about to approve 147 rows. Continue?"
- Sync button is **disabled** until:
  - At least one row is approved.
  - Dedup preview has been run (Phase 2+).
- **Force-approve** (ignoring a blocking warning) is available only to `ops_admin`/`platform_admin` roles and writes an explicit audit entry.
- **Reset / clear all approvals** is deliberately **not** exposed in Phase 1 — no one-click button to undo a day of review. Done only via support endpoint.
