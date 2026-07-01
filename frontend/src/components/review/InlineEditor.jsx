import { useState } from "react";
import { X, Save, AlertTriangle } from "lucide-react";

export default function InlineEditor({ row, pageNumber, existingCorrection, categories, onSave, onCancel }) {
  const [itemName,      setItemName]      = useState(existingCorrection?.corrected_item_name      ?? row.item_name   ?? "");
  const [rate,          setRate]          = useState(existingCorrection?.corrected_rate           ?? row.rate        ?? "");
  const [category,      setCategory]      = useState(existingCorrection?.corrected_category       ?? row.category    ?? "");
  const [reviewerNotes, setReviewerNotes] = useState(existingCorrection?.reviewer_notes           ?? "");

  const catListId = `cats-pg${pageNumber}-row${row.row_no}`;

  const handleSave = () => {
    if (!itemName.trim()) return;
    onSave({
      corrected_item_name:    itemName.trim()  !== row.item_name  ? itemName.trim()  : null,
      corrected_rate:         rate !== ""       && +rate           !== row.rate       ? +rate          : null,
      corrected_category:     category.trim()  !== row.category   ? category.trim()  : null,
      reviewer_notes:         reviewerNotes.trim() || null,
    });
  };

  const Field = ({ label, original, children }) => (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-semibold text-slate-400 tracking-widest">{label}</label>
      {children}
      {original != null && original !== "" && (
        <span className="text-[10px] text-slate-400 italic truncate" title={String(original)}>
          AI: {String(original)}
        </span>
      )}
    </div>
  );

  const inputCls = "w-full px-2 py-1 text-xs border border-slate-200 focus:border-[#002FA7] focus:outline-none bg-white text-slate-800";

  return (
    <div
      data-testid={`inline-editor-${pageNumber}-${row.row_no}`}
      className="bg-blue-50/60 border-t border-b border-blue-200 px-3 py-3 space-y-3"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Fields grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="ITEM NAME" original={row.item_name}>
            <input
              data-testid="editor-item-name"
              type="text"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </Field>
        </div>
        <Field label="RATE (₹)" original={row.rate}>
          <input
            data-testid="editor-rate"
            type="number"
            min={0}
            step={0.5}
            value={rate}
            onChange={e => setRate(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="CATEGORY" original={row.category}>
          <input
            data-testid="editor-category"
            type="text"
            list={catListId}
            value={category}
            onChange={e => setCategory(e.target.value)}
            className={inputCls}
          />
          <datalist id={catListId}>
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="REVIEWER NOTES" original={null}>
          <input
            data-testid="editor-reviewer-notes"
            type="text"
            value={reviewerNotes}
            onChange={e => setReviewerNotes(e.target.value)}
            placeholder="optional note…"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Provenance */}
      {row.raw_text && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 bg-slate-100 border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 tracking-wide flex-shrink-0 mt-0.5">RAW OCR:</span>
          <span className="text-[10px] text-slate-500 font-mono leading-tight break-all">{row.raw_text}</span>
        </div>
      )}

      {/* Warnings */}
      {(row.variant_warning || row.addon_warning || row.tax_note_warning) && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          {[row.variant_warning && "variant", row.addon_warning && "addon", row.tax_note_warning && "tax"].filter(Boolean).join(", ")} warning(s)
        </div>
      )}

      {/* Save / Cancel */}
      <div className="flex items-center gap-2 pt-1">
        <button
          data-testid="editor-save-btn"
          onClick={handleSave}
          disabled={!itemName.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#002FA7] text-white hover:bg-[#0026a0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-3 w-3" /> Save Edit
        </button>
        <button
          data-testid="editor-cancel-btn"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
      </div>
    </div>
  );
}
