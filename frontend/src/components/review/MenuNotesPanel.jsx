import { AlertTriangle } from "lucide-react";
import MenuNoteCard from "@/components/review/MenuNoteCard";

export default function MenuNotesPanel({ pages, noteCorrections, onSaveNoteCorrection }) {
  const allNotes = pages.flatMap(p =>
    (p.menu_notes || []).map(n => ({ ...n, page_number: p.page_number }))
  );

  const taxCount      = allNotes.filter(n => n.tax_note_warning).length;
  const reviewedCount = Object.keys(noteCorrections).length;

  if (allNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        No menu notes in this document
      </div>
    );
  }

  return (
    <div
      data-testid="menu-notes-panel"
      className="flex flex-col h-full"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-slate-500 tracking-widest">
            {allNotes.length} NOTES
          </span>
          {taxCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {taxCount} REQUIRE MANUAL REVIEW
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {reviewedCount}/{allNotes.length} reviewed
        </span>
      </div>

      {/* Note cards */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {allNotes.map((note) => {
          const key = `${note.page_number}-${note.note_index}`;
          return (
            <MenuNoteCard
              key={key}
              note={note}
              noteKey={key}
              correction={noteCorrections[key]}
              onSaveNoteCorrection={onSaveNoteCorrection}
            />
          );
        })}
      </div>
    </div>
  );
}
