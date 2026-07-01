import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const inputCls = "w-full px-2.5 py-1.5 text-xs border border-slate-200 focus:border-[#002FA7] focus:outline-none bg-white text-slate-800";
const labelCls = "block text-[10px] font-semibold text-slate-400 tracking-widest mb-1";

export default function AddMissingRowModal({ open, onClose, onSaved, currentPage, totalPages, categories }) {
  const [itemName,      setItemName]      = useState("");
  const [rate,          setRate]          = useState("");
  const [category,      setCategory]      = useState("");
  const [pageNumber,    setPageNumber]    = useState(currentPage);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [saving,        setSaving]        = useState(false);

  const reset = () => {
    setItemName(""); setRate(""); setCategory("");
    setPageNumber(currentPage); setReviewerNotes(""); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!itemName.trim()) return;
    setSaving(true);
    try {
      await onSaved({
        item_name:      itemName.trim(),
        rate:           rate !== "" ? +rate : null,
        category:       category.trim() || null,
        page_number:    +pageNumber,
        reviewer_notes: reviewerNotes.trim() || null,
      });
      reset();
      onClose();
    } catch (_) {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent
        data-testid="add-row-modal"
        className="max-w-md"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif", borderRadius: 0 }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-sm font-bold text-slate-900"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Add Missing Row
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Use this for items visible in the PDF that AI did not extract.
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Item name */}
          <div>
            <label className={labelCls}>ITEM NAME <span className="text-red-500">*</span></label>
            <input
              data-testid="add-row-item-name"
              type="text"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="e.g. Masala Dosa"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Rate + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>RATE (₹)</label>
              <input
                data-testid="add-row-rate"
                type="number" min={0} step={0.5}
                value={rate} onChange={e => setRate(e.target.value)}
                placeholder="e.g. 120"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>CATEGORY</label>
              <input
                data-testid="add-row-category"
                type="text" list="add-row-cats"
                value={category} onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Breakfast"
                className={inputCls}
              />
              <datalist id="add-row-cats">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* Page + Reviewer notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>PAGE</label>
              <select
                data-testid="add-row-page"
                value={pageNumber}
                onChange={e => setPageNumber(e.target.value)}
                className={inputCls}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <option key={p} value={p}>Page {p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>REVIEWER NOTES</label>
              <input
                data-testid="add-row-notes"
                type="text" value={reviewerNotes}
                onChange={e => setReviewerNotes(e.target.value)}
                placeholder="optional"
                className={inputCls}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
            This row will appear in the export as <span className="font-mono">is_manual_add: true</span> with <span className="font-mono">source: "manual"</span>.
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            data-testid="add-row-submit-btn"
            onClick={handleSubmit}
            disabled={!itemName.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#002FA7] text-white hover:bg-[#0026a0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {saving ? "Adding…" : "Add Row"}
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
