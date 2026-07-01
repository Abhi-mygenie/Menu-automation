# RT-G3 Phase B — Landing Page Complete

**Date:** 2026-07-01
**Status:** COMPLETE

## What was built

### New files
- `/app/frontend/src/pages/review/ReviewLanding.jsx` — main landing page at `/review`
- `/app/frontend/src/components/review/PDFCard.jsx` — per-document card component

### Modified files
- `App.js` — added `/review` route + "Review Tool" Klein Blue button in home header
- `index.css` — loaded Cabinet Grotesk + IBM Plex Sans + IBM Plex Mono from CDN

## What the page shows
- Breadcrumb: HOME / Menu Review Tool
- Summary stat pills: complete, in-progress, not-started, rows reviewed, notes to review
- Overall progress bar (all 5 documents combined, Klein Blue)
- 5 PDF cards in a responsive 3-col grid
- Each card: filename, dataset_id, warning badges (OCR LOW CONFIDENCE, EMPTY PAGES, MIXED LANGUAGE, NO SOURCE GROUNDING), status badge, pages/rows/notes stats, per-row progress bar, action breakdown pills (approved/edited/deleted/unclear), CTA button
- Footer: dataset version / status / reviewer metadata

## Data verified in screenshot
- 0/5 complete · 1 in progress (Akula) · 4 not started
- 4/412 rows reviewed (1%) from Phase A test data
- Akula shows: 1 approved · 1 edited · 1 deleted · 1 unclear
- sona chadi shows all 3 warning badges correctly
- Ghatkesar shows EMPTY PAGES + OCR LOW CONFIDENCE

## Next: Phase C
Build ReviewWorkspace shell + pdfjs-dist PDF viewer + page navigation.
Route: `/review/:datasetId`
