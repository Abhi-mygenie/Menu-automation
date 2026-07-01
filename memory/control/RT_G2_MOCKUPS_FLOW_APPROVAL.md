# RT-G2: Review Tool — Mockups + Flow Approval

**Date:** 2026-06-27
**Gate:** RT-G2 (Mockup + Flow Approval)
**Status:** READY FOR OWNER REVIEW
**Previous gate:** RT-G1 (Discovery + Impact Analysis) — APPROVED
**Next gate:** RT-G3 (Deep Planning) — starts only after owner approves these mockups

---

## Design System

| Element | Choice |
|---|---|
| Archetype | Swiss & High-Contrast — function-first, data-heavy |
| Theme | Light (white background, slate borders) |
| Accent | Klein Blue `#002FA7` (primary CTA/focus) |
| Status colors | Green `#10B981` (approve), Red `#E63946` (delete/issue), Amber `#FFB703` (warning) |
| Headings font | Cabinet Grotesk |
| Body/table font | IBM Plex Sans |
| Data/prices font | IBM Plex Mono |
| Corners | Sharp edges (no rounded corners) — enterprise data tool |
| Layout | Technical grid borders, 1px separators |
| PDF viewer | pdf.js page-by-page with zoom controls |
| Split view | react-resizable-panels (already installed) |

---

## Screen Mockups

### S1: Review Landing

**URL:** `/review`

![Review Landing](https://static.prod-images.emergentagent.com/jobs/9e0e83a2-8ede-4275-be60-ae4d42b74f2b/images/f5b82c893aa9f8ad7d13b3ee1aa67ac1307a082b708715c504e75ab79ee83fc8.png)

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  MENU REVIEW                            Review Progress: 0/5  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Ghatkesar family │  │ Akula Organics  │  │ sona chadi   │ │
│  │ dhaba.pdf        │  │ .pdf            │  │ .pdf         │ │
│  │ 13 pages         │  │ 4 pages         │  │ 1 page       │ │
│  │ 126 rows         │  │ 74 rows         │  │ 42 rows      │ │
│  │ ░░░░░░░░░░ 0%    │  │ ░░░░░░░░░░ 0%   │  │ ░░░░░░░░ 0% │ │
│  │ [NOT STARTED]    │  │ [NOT STARTED]   │  │ [NOT STARTED]│ │
│  │                  │  │                 │  │              │ │
│  │ [Start Review →] │  │ [Start Review →]│  │ [Start →]    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                    │
│  │ south indian    │  │ spicy.pdf       │                    │
│  │ dishes.pdf      │  │                 │                    │
│  │ 3 pages         │  │ 2 pages         │                    │
│  │ 93 rows         │  │ 77 rows         │                    │
│  │ ░░░░░░░░░░ 0%   │  │ ░░░░░░░░░░ 0%  │                    │
│  │ [NOT STARTED]   │  │ [NOT STARTED]   │                    │
│  │                 │  │                 │                    │
│  │ [Start Review →]│  │ [Start Review →]│                    │
│  └─────────────────┘  └─────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

**Elements per card:**
- PDF file name
- Page count, row count, menu notes count
- Progress bar (rows reviewed / total)
- Status badge: `NOT STARTED` (grey) | `IN PROGRESS` (blue) | `COMPLETE` (green)
- Special flags: `OCR_LOW_CONFIDENCE` badge for sona chadi
- CTA: "Start Review" or "Continue Review"

---

### S2: Review Workspace (MAIN SCREEN)

**URL:** `/review/:datasetId`

![Review Workspace](https://static.prod-images.emergentagent.com/jobs/9e0e83a2-8ede-4275-be60-ae4d42b74f2b/images/34203f1fdb262abf2f57a06fc3ea27e787c5bd3bb5fd2c2cbe26a0c2406d16a3.png)

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Back   Akula Organics.pdf   Page 1 of 4   74 rows   [Complete & Export]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  Progress: ████████░░░░  45/74 reviewed   32 approved  8 edited  5 deleted  │
├────────────────────────────┬─────────────────────────────────────────────────┤
│                            │  Toolbar: [Search] [Filter: status] [Conf ▼]   │
│   PDF VIEWER               │           [Approve All Clean] [Add Row +]      │
│                            ├─────────────────────────────────────────────────┤
│   ┌──────────────────────┐ │ ☐  #  Item Name        Category   Rate  Conf   │
│   │                      │ │ ── ── ──────────────── ────────── ───── ─────  │
│   │   [Restaurant Menu   │ │ ☐  1  Paneer Tikka     Starters   180   HIGH  │
│   │    PDF Page Content   │ │ ☐  2  Chicken 65       Starters   220   HIGH  │
│   │    rendered via       │ │ ☐  3  Veg Manchurian   Chinese    140   MED   │
│   │    pdf.js]            │ │ ☐  4  Gobi Manchuria   Chinese    130   HIGH  │
│   │                      │ │ ☐  5  Fried Rice        Rice       120   HIGH  │
│   │                      │ │ ☐  6  ???               ?          ??    LOW   │
│   │                      │ │ ☐  7  Dal Tadka         Main       150   HIGH  │
│   └──────────────────────┘ │ ...                                             │
│                            │                                                 │
│  [- Zoom +] [Fit Width]    │  Actions per row: ✓ Approve  ✎ Edit  ✕ Delete  │
│  [◄ Prev] Page 1/4 [Next►] │  ? Unclear  ⊘ Out of Scope                    │
├────────────────────────────┴─────────────────────────────────────────────────┤
│  Tabs: [ Rows (74) ]  [ Menu Notes (7) ]  [ Progress ]                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key interactions:**
- Resizable split: drag the divider between PDF and table
- Click a row → highlights it + scrolls PDF to show the source text (raw_text match)
- Row colors: green left border = high confidence, amber = medium, red = low
- "Approve All Clean" button: auto-approves rows with confidence >= 85% and no blocking warnings
- Page navigation: clicking Next/Prev loads the next PDF page AND filters the table to show only that page's rows

---

### S3: Row Detail / Inline Edit

**Triggered by:** clicking Edit (pencil icon) on any row

![Row Edit and Add Missing](https://static.prod-images.emergentagent.com/jobs/9e0e83a2-8ede-4275-be60-ae4d42b74f2b/images/e555337641df995de99a89f828b0bc8219676eeb16e90167fd95ce9b8a0b688d.png)

**Inline edit mode:**
```
┌──────────────────────────────────────────────────────────────┐
│ ☐  3  [Veg Manchurian      ] [Chinese    ▼] [₹ 140 ] [Save]│
│        AI original: "VEG MANCHURIYAN"                [Cancel]│
│                                                              │
│  Status: [clean ▼]   Notes: [                            ]   │
│  raw_text: "91523 VEG MANCHURIYAN 140 Chinese..."            │
└──────────────────────────────────────────────────────────────┘
```

**Edit fields:**
- `item_name`: text input (pre-filled with AI value)
- `category`: dropdown/combobox
- `rate`: number input
- `issue_status`: dropdown (clean / review_required / category_inferred)
- `reviewer_notes`: text area
- Shows `raw_text` (read-only) so reviewer can see what the AI read from the PDF
- Shows original AI values in small grey text below each field

**Save action:** Creates a correction record in MongoDB with: original value, corrected value, field name, timestamp, reviewer ID.

---

### S4: Add Missing Row

**Triggered by:** "Add Row +" button in toolbar

```
┌──────────────────────────────────────────────────────────────┐
│  ADD MISSING ITEM                                       [X]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  This item exists on the PDF but was not extracted by AI.    │
│                                                              │
│  Item Name *    [                                        ]   │
│  Rate           [₹                                       ]   │
│  Category       [Select or type...                    ▼  ]   │
│  Page Number    [  1  ▼]                                     │
│  Notes          [                                        ]   │
│                                                              │
│                          [ Cancel ]   [ Add Item ]           │
└──────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Page number defaults to the currently viewed page
- Category dropdown shows categories already seen in this document
- Creates a new row with `action: add_missing`, `source: manual`

---

### S5: Page Navigation

**Location:** Bottom of PDF panel (sticky)

```
┌──────────────────────────────────────────────────────────────┐
│  [◄ Prev]   Page [ 3 ] of 13   [Next ►]                     │
│                                                              │
│  Page thumbnails (optional, scrollable):                     │
│  [1] [2] [3*] [4] [5] [6] [7] [8] [9] [10] [11] [12] [13] │
└──────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Clicking a page number loads that page in the PDF viewer
- Table auto-filters to show only rows extracted from that page
- Direct page input: type a number and press Enter
- Keyboard: Left/Right arrow keys when PDF panel is focused

---

### S6: Review Progress

**Location:** Tab in the workspace OR collapsible header stats

![Supporting Screens](https://static.prod-images.emergentagent.com/jobs/9e0e83a2-8ede-4275-be60-ae4d42b74f2b/images/e8cfe8b8775e0b4ae29a60aef2ccd37a64f21cf12377783f3f047a803212190c.png)

```
┌──────────────────────────────────────────────────────────────┐
│  REVIEW PROGRESS — Akula Organics.pdf                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Total Rows:    74                                           │
│  ████████████████████████░░░░░░  61% reviewed                │
│                                                              │
│  ✓ Approved     32   ████████████████░░░░░░░░░░              │
│  ✎ Edited        8   ████░░░░░░░░░░░░░░░░░░░░░              │
│  ✕ Deleted        5   ██░░░░░░░░░░░░░░░░░░░░░░░             │
│  ? Unclear        0                                          │
│  ⊘ Out of Scope  0                                           │
│  ○ Remaining     29   ████████████░░░░░░░░░░░░░              │
│                                                              │
│  Per Page:                                                   │
│  Page 1: 18/18 ████████████████████ COMPLETE                 │
│  Page 2: 15/20 ████████████████░░░░                          │
│  Page 3: 12/18 ████████████░░░░░░░░                          │
│  Page 4: 0/18  ░░░░░░░░░░░░░░░░░░░                          │
│                                                              │
│  Menu Notes: 5/7 reviewed                                    │
└──────────────────────────────────────────────────────────────┘
```

---

### S7: Menu Notes Review

**Location:** "Menu Notes" tab in the workspace

```
┌──────────────────────────────────────────────────────────────┐
│  MENU NOTES — Akula Organics.pdf (7 notes detected)          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Page 1:                                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  "GST 5% extra on all items"                           │  │
│  │  Type: [tax_note]   Confidence: HIGH                   │  │
│  │  [✓ Approve]  [✕ Delete]  [⊘ Out of Scope]            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  "Parcel charges applicable"                           │  │
│  │  Type: [general_note]   Confidence: MEDIUM             │  │
│  │  [✓ Approve]  [✕ Delete]  [⊘ Out of Scope]            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Page 2:                                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  "Jain food available on request"                      │  │
│  │  Type: [availability_note]   Confidence: HIGH          │  │
│  │  [✓ Approve]  [✕ Delete]  [⊘ Out of Scope]            │  │
│  └────────────────────────────────────────────────────────┘  │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

---

### S8: Export / Completion

**Triggered by:** "Complete & Export" button (enabled only when all rows are reviewed)

```
┌──────────────────────────────────────────────────────────────┐
│  ✓ REVIEW COMPLETE                                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Akula Organics.pdf — Review Summary                         │
│                                                              │
│  Total rows:      74                                         │
│  Approved:        58                                         │
│  Edited:          11  (corrections captured)                 │
│  Deleted:          3  (hallucinations removed)               │
│  Added:            2  (missing items added)                  │
│  Menu notes:      7/7 reviewed                               │
│                                                              │
│  Reviewer:        Sunil                                      │
│  Completed at:    2026-06-28T14:30:00Z                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  [ Export Corrected JSON ]      [ Back to Landing ]  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Export produces a JSON file compatible with the dataset     │
│  freeze workflow. All corrections are also saved in MongoDB. │
└──────────────────────────────────────────────────────────────┘
```

---

## User Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────────────────────────────┐
│ Landing  │────►│ Select PDF   │────►│ Review Workspace (S2)          │
│ (S1)     │     │              │     │                                 │
└─────────┘     └──────────────┘     │  PDF (left) + Table (right)    │
                                      │                                 │
                                      │  For each row:                  │
                                      │  ├─ Approve (one click)         │
                                      │  ├─ Edit → Inline Edit (S3)    │
                                      │  ├─ Delete                      │
                                      │  ├─ Unclear                     │
                                      │  └─ Out of Scope                │
                                      │                                 │
                                      │  For missing items:             │
                                      │  └─ Add Row (S4)                │
                                      │                                 │
                                      │  Navigate pages (S5)            │
                                      │  Check progress (S6)            │
                                      │  Review menu notes (S7)         │
                                      │                                 │
                                      │  When all rows reviewed:        │
                                      │  └─ Complete & Export (S8)       │
                                      └─────────────────────────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────────┐
                                      │  Back to Landing                │
                                      │  Next PDF card shows "COMPLETE" │
                                      └─────────────────────────────────┘
```

---

## Mockup Image References

| Screen | Image |
|---|---|
| S1: Review Landing | https://static.prod-images.emergentagent.com/jobs/9e0e83a2-8ede-4275-be60-ae4d42b74f2b/images/f5b82c893aa9f8ad7d13b3ee1aa67ac1307a082b708715c504e75ab79ee83fc8.png |
| S2: Review Workspace | https://static.prod-images.emergentagent.com/jobs/9e0e83a2-8ede-4275-be60-ae4d42b74f2b/images/34203f1fdb262abf2f57a06fc3ea27e787c5bd3bb5fd2c2cbe26a0c2406d16a3.png |
| S3+S4: Row Edit + Add Missing | https://static.prod-images.emergentagent.com/jobs/9e0e83a2-8ede-4275-be60-ae4d42b74f2b/images/e555337641df995de99a89f828b0bc8219676eeb16e90167fd95ce9b8a0b688d.png |
| S5-S8: Supporting Screens | https://static.prod-images.emergentagent.com/jobs/9e0e83a2-8ede-4275-be60-ae4d42b74f2b/images/e8cfe8b8775e0b4ae29a60aef2ccd37a64f21cf12377783f3f047a803212190c.png |

---

## Owner Approval Required

Please review each screen and confirm:

1. **S1 (Landing):** Card layout with 5 PDFs, progress, status — OK?
2. **S2 (Workspace):** Split view PDF left + table right — OK? This is the main screen.
3. **S3 (Inline Edit):** Edit fields show original AI value + correctable fields — OK?
4. **S4 (Add Missing):** Modal form for items AI missed — OK?
5. **S5 (Page Nav):** Prev/Next + page number input + thumbnails — OK?
6. **S6 (Progress):** Per-row and per-page progress stats — OK?
7. **S7 (Menu Notes):** Approve/delete/out-of-scope per note — OK?
8. **S8 (Export):** Summary + export JSON button — OK?
9. **Overall flow:** Landing → Workspace → Review rows → Navigate pages → Complete → Export — OK?
10. **Any screen missing?** Anything you want added, removed, or changed?

After approval, I proceed to RT-G3 (Deep Planning / Implementation Planning).

---

*RT-G2 Mockups + Flow — READY FOR REVIEW. No code written. No implementation started.*
