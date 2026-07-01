import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import ActionButtons from "@/components/review/ActionButtons";
import InlineEditor   from "@/components/review/InlineEditor";
import TableToolbar   from "@/components/review/TableToolbar";

// ── Confidence left-border colour ────────────────────────────────
const CONF_COLOR = { high: "#10B981", medium: "#FFB703", low: "#E63946" };

// ── Action badge ─────────────────────────────────────────────────
const ACTION_BADGE = {
  approve:              { label: "APPROVED",   cls: "text-emerald-700 bg-emerald-50" },
  edit:                 { label: "EDITED",     cls: "text-blue-700 bg-blue-50" },
  delete_hallucination: { label: "DELETED",    cls: "text-red-700 bg-red-50" },
  unclear:              { label: "UNCLEAR",    cls: "text-amber-700 bg-amber-50" },
  out_of_scope:         { label: "OUT SCOPE",  cls: "text-slate-600 bg-slate-100" },
  add_missing:          { label: "ADDED",      cls: "text-purple-700 bg-purple-50" },
};

// ── Row background tint ──────────────────────────────────────────
const ROW_BG = {
  approve:              "bg-emerald-50/40",
  edit:                 "bg-blue-50/40",
  delete_hallucination: "bg-red-50/30 opacity-60",
  unclear:              "bg-amber-50/40",
  out_of_scope:         "bg-slate-50",
};

// ── Single row ───────────────────────────────────────────────────
function ReviewRow({ row, pageNumber, correction, isEditing, categories, onAction, onStartEdit, onSaveEdit, onCancelEdit }) {
  const action  = correction?.action;
  const badge   = action ? ACTION_BADGE[action] : null;
  const bgCls   = action ? (ROW_BG[action] || "") : "hover:bg-slate-50/70";

  // Effective display values (show corrected if edited)
  const displayName     = action === "edit" && correction?.corrected_item_name     ? correction.corrected_item_name     : row.item_name;
  const displayCategory = action === "edit" && correction?.corrected_category      ? correction.corrected_category      : row.category;
  const displayRate     = action === "edit" && correction?.corrected_rate != null  ? correction.corrected_rate          : row.rate;

  const handleAction = (a) => {
    if (a === "edit") { onStartEdit(); return; }
    onAction(a);
  };

  if (isEditing) {
    return (
      <tr data-testid={`row-${pageNumber}-${row.row_no}`}>
        <td colSpan={6} className="p-0">
          <InlineEditor
            row={row}
            pageNumber={pageNumber}
            existingCorrection={correction?.action === "edit" ? correction : null}
            categories={categories}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr
      data-testid={`row-${pageNumber}-${row.row_no}`}
      className={`border-b border-slate-100 transition-colors ${bgCls}`}
    >
      {/* # */}
      <td className="px-3 py-2 font-mono text-[11px] text-slate-400 w-8">{row.row_no}</td>

      {/* Item name */}
      <td className="px-3 py-2 max-w-0">
        <div className="flex flex-col gap-0.5">
          <span
            className={`text-xs font-medium leading-tight ${action === "delete_hallucination" ? "line-through text-slate-400" : "text-slate-800"}`}
            style={{ borderLeft: `2px solid ${CONF_COLOR[row.confidence] || "#E63946"}`, paddingLeft: 6 }}
          >
            {displayName}
            {row.variant_warning  && <span className="ml-1 text-[10px] text-amber-500" title="Variant warning">V</span>}
            {row.addon_warning    && <span className="ml-1 text-[10px] text-amber-500" title="Addon warning">A</span>}
          </span>
          {action === "edit" && correction?.reviewer_notes && (
            <span className="text-[10px] text-slate-400 italic pl-1.5">{correction.reviewer_notes}</span>
          )}
        </div>
      </td>

      {/* Category */}
      <td className="px-3 py-2 text-xs text-slate-500 hidden md:table-cell max-w-[90px]">
        <span className="block truncate" title={displayCategory}>{displayCategory || "—"}</span>
      </td>

      {/* Rate */}
      <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-slate-700 w-16">
        {displayRate != null ? `₹${displayRate}` : "—"}
      </td>

      {/* Confidence */}
      <td className="px-3 py-2 text-center w-16">
        <span className={`inline-flex px-1.5 py-px text-[10px] font-semibold border ${
          row.confidence === "high"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
          row.confidence === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                        "bg-red-50 text-red-700 border-red-200"
        }`}>
          {(row.confidence || "?").toUpperCase()}
        </span>
      </td>

      {/* Actions */}
      <td className="px-2 py-1.5 w-40">
        <div className="flex items-center justify-between gap-2">
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-px ${badge.cls} flex-shrink-0`}>
              {badge.label}
            </span>
          )}
          <ActionButtons
            currentAction={action}
            onAction={handleAction}
          />
        </div>
      </td>
    </tr>
  );
}

// ── ReviewTable ───────────────────────────────────────────────────
export default function ReviewTable({
  pages = [],
  currentPage,
  corrections = {},
  editingRowKey,
  setEditingRowKey,
  onSaveCorrection,
  approveAllClean,
  approveLoading,
  onAddRow,
}) {
  const [searchTerm,   setSearchTerm]   = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterConf,   setFilterConf]   = useState("all");

  // Rows for current page
  const pageData    = pages.find(p => p.page_number === currentPage);
  const currentRows = useMemo(() => pageData?.rows || [], [pageData]);

  // Categories across whole doc (for InlineEditor datalist)
  const categories = useMemo(() =>
    [...new Set(pages.flatMap(p => p.rows.map(r => r.category)).filter(Boolean))].sort()
  , [pages]);

  // Clean rows eligible for Approve All Clean (across ALL pages)
  const cleanCount = useMemo(() =>
    pages.reduce((sum, page) => sum + page.rows.filter(row => {
      const key = `${page.page_number}-${row.row_no}`;
      return (
        row.confidence === "high" &&
        row.issue_status === "clean" &&
        !row.variant_warning &&
        !row.addon_warning &&
        !row.tax_note_warning &&
        !corrections[key]
      );
    }).length, 0)
  , [pages, corrections]);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    let rows = currentRows;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      rows = rows.filter(r => r.item_name?.toLowerCase().includes(t));
    }
    if (filterAction !== "all") {
      rows = rows.filter(r => {
        const key = `${currentPage}-${r.row_no}`;
        const action = corrections[key]?.action;
        return filterAction === "pending" ? !action : action === filterAction;
      });
    }
    if (filterConf !== "all") {
      if (filterConf === "high")   rows = rows.filter(r => r.confidence === "high");
      if (filterConf === "review") rows = rows.filter(r => r.confidence !== "high");
    }
    return rows;
  }, [currentRows, searchTerm, filterAction, filterConf, corrections, currentPage]);

  const handleAction = (row, action) => {
    onSaveCorrection(row, currentPage, action);
    if (editingRowKey === `${currentPage}-${row.row_no}`) setEditingRowKey(null);
  };

  const handleSaveEdit = (row, correctedFields) => {
    onSaveCorrection(row, currentPage, "edit", correctedFields);
  };

  return (
    <div
      data-testid="review-table"
      className="flex flex-col h-full"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <TableToolbar
        rows={currentRows}
        corrections={corrections}
        currentPage={currentPage}
        searchTerm={searchTerm}      setSearchTerm={setSearchTerm}
        filterAction={filterAction}  setFilterAction={setFilterAction}
        filterConf={filterConf}      setFilterConf={setFilterConf}
        onApproveAllClean={approveAllClean}
        approveLoading={approveLoading}
        cleanCount={cleanCount}
        onAddRow={onAddRow}
      />

      <div className="flex-1 overflow-auto">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
            <AlertTriangle className="h-5 w-5" />
            {currentRows.length === 0 ? "No rows extracted from this page" : "No rows match current filters"}
          </div>
        ) : (
          <table className="w-full text-xs border-collapse min-w-[520px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-white border-b-2 border-slate-200">
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-widest w-8">#</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-widest">ITEM NAME</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-widest hidden md:table-cell">CATEGORY</th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-widest w-16">RATE</th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-widest w-16">CONF</th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-widest w-40">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const key = `${currentPage}-${row.row_no}`;
                return (
                  <ReviewRow
                    key={key}
                    row={row}
                    pageNumber={currentPage}
                    correction={corrections[key]}
                    isEditing={editingRowKey === key}
                    categories={categories}
                    onAction={(action) => handleAction(row, action)}
                    onStartEdit={() => setEditingRowKey(key)}
                    onSaveEdit={(fields) => handleSaveEdit(row, fields)}
                    onCancelEdit={() => setEditingRowKey(null)}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
