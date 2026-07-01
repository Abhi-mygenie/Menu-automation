import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PageNavigation({ currentPage, totalPages, onPageChange }) {
  const [inputVal, setInputVal] = useState("");
  const [editing, setEditing] = useState(false);

  const go = (n) => {
    const p = Math.min(Math.max(1, n), totalPages);
    if (p !== currentPage) onPageChange(p);
  };

  const handleInputCommit = () => {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n)) go(n);
    setEditing(false);
    setInputVal("");
  };

  return (
    <div
      data-testid="page-navigation"
      className="flex items-center justify-between px-4 py-2 bg-[#3d4043] border-t border-[#2a2d30] flex-shrink-0"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <button
        data-testid="page-prev-btn"
        onClick={() => go(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </button>

      <div className="flex items-center gap-2">
        {editing ? (
          <input
            autoFocus
            data-testid="page-input"
            type="number"
            min={1}
            max={totalPages}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={handleInputCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleInputCommit();
              if (e.key === "Escape") { setEditing(false); setInputVal(""); }
            }}
            className="w-12 text-center text-xs bg-[#525659] text-white border border-slate-500 focus:outline-none focus:border-[#002FA7] rounded py-0.5"
          />
        ) : (
          <button
            data-testid="page-display"
            onClick={() => { setEditing(true); setInputVal(String(currentPage)); }}
            className="text-xs text-slate-200 hover:text-white hover:underline"
            title="Click to jump to page"
          >
            {currentPage}
          </button>
        )}
        <span className="text-xs text-slate-400">/ {totalPages}</span>
      </div>

      <button
        data-testid="page-next-btn"
        onClick={() => go(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
