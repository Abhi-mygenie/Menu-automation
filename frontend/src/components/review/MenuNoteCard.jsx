import { useState } from "react";
import { Check, Pencil, Trash2, MinusCircle, AlertTriangle, Save, X } from "lucide-react";

const NOTE_ACTIONS = [
  { id: "approve",     icon: Check,       label: "Approve",      active: "bg-emerald-500 text-white border-emerald-500", hover: "hover:border-emerald-400 hover:text-emerald-600" },
  { id: "edit",        icon: Pencil,       label: "Edit text",    active: "bg-[#002FA7] text-white border-[#002FA7]",     hover: "hover:border-[#002FA7] hover:text-[#002FA7]" },
  { id: "delete",      icon: Trash2,       label: "Delete",       active: "bg-[#E63946] text-white border-[#E63946]",     hover: "hover:border-[#E63946] hover:text-[#E63946]" },
  { id: "out_of_scope",icon: MinusCircle,  label: "Out of scope", active: "bg-slate-400 text-white border-slate-400",     hover: "hover:border-slate-400 hover:text-slate-500" },
];

const NOTE_TYPE_LABEL = {
  tax_note: "TAX NOTE", service_charge_note: "SERVICE CHARGE", packaging_note: "PACKAGING",
  addon_note: "ADDON", availability_note: "AVAILABILITY", general_note: "GENERAL",
};

const ACTION_BADGE = {
  approve:      { label: "APPROVED",    cls: "text-emerald-700 bg-emerald-50" },
  edit:         { label: "EDITED",      cls: "text-blue-700 bg-blue-50" },
  delete:       { label: "DELETED",     cls: "text-red-700 bg-red-50" },
  out_of_scope: { label: "OUT SCOPE",   cls: "text-slate-600 bg-slate-100" },
};

export default function MenuNoteCard({ note, noteKey, correction, onSaveNoteCorrection }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText,  setEditText]  = useState(correction?.corrected_note_text ?? note.note_text ?? "");

  const action = correction?.action;
  const badge  = action ? ACTION_BADGE[action] : null;
  const isDeleted = action === "delete";

  const handleAction = (a) => {
    if (a === "edit") { setIsEditing(true); return; }
    onSaveNoteCorrection(note, a, null);
  };

  const handleSave = () => {
    onSaveNoteCorrection(note, "edit", editText.trim());
    setIsEditing(false);
  };

  const displayText = action === "edit" && correction?.corrected_note_text
    ? correction.corrected_note_text
    : note.note_text;

  return (
    <div
      data-testid={`note-card-${noteKey}`}
      className={`border text-xs transition-all ${
        note.tax_note_warning
          ? "border-amber-200 bg-amber-50"
          : isDeleted ? "border-slate-100 bg-slate-50 opacity-50"
          : "border-slate-100 bg-white hover:border-slate-200"
      }`}
    >
      {/* Main row */}
      <div className="flex items-start gap-2 p-3">
        {note.tax_note_warning && (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-slate-800 leading-snug ${isDeleted ? "line-through" : ""}`}>
            {displayText}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide font-mono">
              Pg {note.page_number} · {NOTE_TYPE_LABEL[note.note_type] || note.note_type} · {note.confidence}
            </span>
            {note.tax_note_warning && (
              <span className="text-[10px] font-bold text-amber-600">MANUAL REVIEW REQUIRED</span>
            )}
            {badge && (
              <span className={`text-[10px] font-bold px-1.5 py-px ${badge.cls}`}>{badge.label}</span>
            )}
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {NOTE_ACTIONS.map(({ id, icon: Icon, label, active, hover }) => (
            <button
              key={id}
              data-testid={`note-action-${id}-${noteKey}`}
              title={label}
              onClick={() => handleAction(id)}
              className={`flex items-center justify-center h-6 w-6 border transition-all duration-100 ${
                action === id
                  ? `${active} scale-105`
                  : `border-slate-200 text-slate-400 bg-white ${hover}`
              }`}
            >
              <Icon className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>

      {/* Inline text editor */}
      {isEditing && (
        <div className="px-3 pb-3 border-t border-blue-100 pt-2 space-y-2">
          <textarea
            data-testid={`note-editor-${noteKey}`}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={2}
            autoFocus
            className="w-full text-xs px-2 py-1.5 border border-slate-200 focus:border-[#002FA7] focus:outline-none resize-none"
          />
          <div className="text-[10px] text-slate-400 italic">Original: {note.note_text}</div>
          <div className="flex gap-2">
            <button
              data-testid={`note-save-${noteKey}`}
              onClick={handleSave}
              disabled={!editText.trim()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#002FA7] text-white hover:bg-[#0026a0] disabled:opacity-40"
            >
              <Save className="h-3 w-3" /> Save
            </button>
            <button
              onClick={() => { setIsEditing(false); setEditText(correction?.corrected_note_text ?? note.note_text); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
