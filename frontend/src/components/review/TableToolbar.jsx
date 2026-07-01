import { Search, Zap, X, Plus } from "lucide-react";

const FILTER_OPTIONS = [
  { value: "all",          label: "All rows" },
  { value: "pending",      label: "Not reviewed" },
  { value: "approve",      label: "Approved" },
  { value: "edit",         label: "Edited" },
  { value: "delete_hallucination", label: "Deleted" },
  { value: "unclear",      label: "Unclear" },
  { value: "out_of_scope", label: "Out of scope" },
];

const CONF_OPTIONS = [
  { value: "all",    label: "All confidence" },
  { value: "high",   label: "High only" },
  { value: "review", label: "Needs review (med/low)" },
];

export default function TableToolbar({
  rows = [],
  corrections = {},
  currentPage,
  searchTerm, setSearchTerm,
  filterAction, setFilterAction,
  filterConf, setFilterConf,
  onApproveAllClean,
  approveLoading = false,
  cleanCount = 0,
  onAddRow,
}) {
  const reviewed   = rows.filter(r => corrections[`${currentPage}-${r.row_no}`]).length;
  const total      = rows.length;

  const selectCls = "text-xs border border-slate-200 bg-white text-slate-700 px-2 py-1 focus:outline-none focus:border-[#002FA7]";

  return (
    <div
      data-testid="table-toolbar"
      className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0 flex-wrap"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        <input
          data-testid="toolbar-search"
          type="text"
          placeholder="Search item…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-6 pr-6 py-1 text-xs border border-slate-200 bg-white focus:outline-none focus:border-[#002FA7] w-36"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filters */}
      <select
        data-testid="toolbar-filter-action"
        value={filterAction}
        onChange={e => setFilterAction(e.target.value)}
        className={selectCls}
      >
        {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <select
        data-testid="toolbar-filter-conf"
        value={filterConf}
        onChange={e => setFilterConf(e.target.value)}
        className={selectCls}
      >
        {CONF_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Row count */}
      <span className="text-[11px] font-mono text-slate-400 hidden sm:block flex-shrink-0">
        {reviewed}/{total} reviewed
      </span>

      {/* Add Row */}
      {onAddRow && (
        <button
          data-testid="add-row-btn"
          onClick={onAddRow}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          <Plus className="h-3 w-3" /> Add Row
        </button>
      )}

      {/* Approve All Clean */}
      {cleanCount > 0 && (
        <button
          data-testid="approve-all-clean-btn"
          onClick={onApproveAllClean}
          disabled={approveLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          <Zap className="h-3 w-3" />
          {approveLoading ? "Approving…" : `Approve ${cleanCount} clean`}
        </button>
      )}
    </div>
  );
}
