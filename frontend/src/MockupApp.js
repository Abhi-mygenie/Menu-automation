import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  X,
  HelpCircle,
  Ban,
  Plus,
  Search,
  Filter,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from "lucide-react";

// ─── REAL DATA FROM AI ARCHIVE ───────────────────────────────────────────────
const DOCUMENTS = [
  { id: "MENU-v0.1.0-0007", file: "Ghatkesar family dhaba.pdf", pages: 13, rows: 126, notes: 0, warnings: ["empty_page","ocr_unreadable"], status: "not_started" },
  { id: "MENU-v0.1.0-0013", file: "Akula Organics.pdf", pages: 4, rows: 74, notes: 7, warnings: [], status: "not_started" },
  { id: "MENU-v0.1.0-0023", file: "sona chadi.pdf", pages: 1, rows: 42, notes: 0, warnings: ["mixed_language_detected","ocr_unreadable"], status: "not_started" },
  { id: "MENU-v0.1.0-0024", file: "south indian dishes.pdf", pages: 3, rows: 93, notes: 5, warnings: [], status: "not_started" },
  { id: "MENU-v0.1.0-0025", file: "spicy.pdf", pages: 2, rows: 77, notes: 5, warnings: [], status: "not_started" },
];

const SAMPLE_ROWS_PAGE1 = [
  { row_no: 1, item_name: "Idli (2 pcs)", category: "Organic Tiffin's", rate: 60, confidence: "high", issue_status: "clean", raw_text: "Idli (2 pcs) .......... ₹60" },
  { row_no: 2, item_name: "Idli (1 pc)", category: "Organic Tiffin's", rate: 35, confidence: "high", issue_status: "clean", raw_text: "Idli (1 pc) .......... ₹35" },
  { row_no: 3, item_name: "Ghee Podi Idli (2 Pcs)", category: "Organic Tiffin's", rate: 80, confidence: "high", issue_status: "clean", raw_text: "Ghee Podi Idli (2 Pcs) .......... ₹80" },
  { row_no: 4, item_name: "Ghee Sambar Idli (2 pcs)", category: "Organic Tiffin's", rate: 80, confidence: "high", issue_status: "clean", raw_text: "Ghee Sambar Idli (2 pcs) .......... ₹80" },
  { row_no: 5, item_name: "Vada (2 pcs)", category: "Organic Tiffin's", rate: 80, confidence: "high", issue_status: "clean", raw_text: "Vada (2 pcs) .......... ₹80" },
  { row_no: 6, item_name: "Vada (1 pc)", category: "Organic Tiffin's", rate: 45, confidence: "high", issue_status: "clean", raw_text: "Vada (1 pc) .......... ₹45" },
  { row_no: 7, item_name: "Sambaar Vada (2 Pcs)", category: "Organic Tiffin's", rate: 90, confidence: "high", issue_status: "clean", raw_text: "Sambaar Vada (2 Pcs) .......... ₹90" },
  { row_no: 8, item_name: "Sambaar Vada (1 Pc)", category: "Organic Tiffin's", rate: 50, confidence: "high", issue_status: "clean", raw_text: "Sambaar Vada (1 Pc) .......... ₹50" },
];

const SAMPLE_ROWS_PAGE2 = [
  { row_no: 1, item_name: "Millet Health Booster Drink (With Milk)", category: "Healthy Treats", rate: null, confidence: "high", issue_status: "review_required", raw_text: "Millet Health Booster Drink (With Milk)" },
  { row_no: 2, item_name: "Millet Health Booster Drink (With Curd)", category: "Healthy Treats", rate: null, confidence: "high", issue_status: "review_required", raw_text: "Millet Health Booster Drink (With Curd)" },
  { row_no: 3, item_name: "Fermented Rice (Chaddi Annam)", category: "Healthy Treats", rate: null, confidence: "high", issue_status: "review_required", raw_text: "Fermented Rice (Chaddi Annam)" },
  { row_no: 4, item_name: "Quick Lunch (5 Varieties of Rice)", category: "Lunch", rate: 179, confidence: "high", issue_status: "clean", raw_text: "Quick Lunch (5 Varieties of Rice) ₹179" },
  { row_no: 5, item_name: "Akula's Special Homely Lunch", category: "Lunch", rate: 199, confidence: "high", issue_status: "clean", raw_text: "Akula's Special Homely Lunch ₹199" },
  { row_no: 6, item_name: "Kulhad Tea", category: "Beverages", rate: 25, confidence: "high", issue_status: "clean", raw_text: "Kulhad Tea ₹25" },
];

const SAMPLE_NOTES = [
  { page: 1, text: "Fresh food takes time! Please allow at least 15 minutes.", type: "general_note", confidence: "high" },
  { page: 1, text: "Takeaway packing charges ₹10/- per item.", type: "packaging_note", confidence: "high" },
  { page: 2, text: "Five Traditional Rice Varieties — Quick, Pure & Satisfying!", type: "general_note", confidence: "high" },
  { page: 2, text: "Wholesome, homemade-style meal prepared with love.", type: "general_note", confidence: "high" },
  { page: 2, text: "Takeaway packing charges ₹20/- per meal.", type: "packaging_note", confidence: "high" },
  { page: 3, text: "Fresh food takes time! Please allow at least 15 minutes.", type: "general_note", confidence: "high" },
  { page: 3, text: "Takeaway packing charges ₹10/- per item.", type: "packaging_note", confidence: "high" },
];

// ─── STYLE CONSTANTS ─────────────────────────────────────────────────────────
const BLUE = "#002FA7";
const GREEN = "#10B981";
const RED = "#E63946";
const AMBER = "#FFB703";

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

const ConfBadge = ({ level }) => {
  const colors = { high: "bg-emerald-100 text-emerald-800 border-emerald-200", medium: "bg-amber-100 text-amber-800 border-amber-200", low: "bg-red-100 text-red-800 border-red-200" };
  return <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium border ${colors[level] || colors.low}`}>{level.toUpperCase()}</span>;
};

const StatusBadge = ({ status }) => {
  const map = { clean: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Clean" }, review_required: { bg: "bg-red-50 text-red-700 border-red-200", label: "Review" }, category_inferred: { bg: "bg-violet-50 text-violet-700 border-violet-200", label: "Cat. Inferred" }, flagged_only_phase1: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Flagged" } };
  const s = map[status] || map.clean;
  return <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium border ${s.bg}`}>{s.label}</span>;
};

const DocStatusBadge = ({ status }) => {
  const map = { not_started: "bg-slate-100 text-slate-600 border-slate-200", in_progress: `bg-blue-50 text-[${BLUE}] border-blue-200`, complete: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  const labels = { not_started: "NOT STARTED", in_progress: "IN PROGRESS", complete: "COMPLETE" };
  return <span className={`inline-flex px-3 py-1 text-xs font-semibold tracking-wide border ${map[status]}`}>{labels[status]}</span>;
};

// ─── S1: LANDING ─────────────────────────────────────────────────────────────
const LandingScreen = ({ onSelect }) => (
  <div className="min-h-screen bg-white" data-testid="mockup-landing">
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Menu Review</h1>
          <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>AI-extracted menu items — review, correct, approve</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Review Progress</div>
            <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>0 / 5</div>
          </div>
        </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCUMENTS.map((doc) => (
          <div key={doc.id} className="border border-slate-200 bg-white hover:border-slate-400 transition-colors cursor-pointer group" onClick={() => onSelect(doc)} data-testid={`mockup-doc-card-${doc.id}`}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <DocStatusBadge status={doc.status} />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1 group-hover:text-[#002FA7] transition-colors" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{doc.file}</h3>
              <p className="text-xs text-slate-400 mb-4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{doc.id}</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div><div className="text-[10px] text-slate-400 uppercase tracking-wider">Pages</div><div className="text-lg font-bold text-slate-800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{doc.pages}</div></div>
                <div><div className="text-[10px] text-slate-400 uppercase tracking-wider">Rows</div><div className="text-lg font-bold text-slate-800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{doc.rows}</div></div>
                <div><div className="text-[10px] text-slate-400 uppercase tracking-wider">Notes</div><div className="text-lg font-bold text-slate-800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{doc.notes}</div></div>
              </div>

              {doc.warnings.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.warnings.map((w) => <span key={w} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="h-3 w-3" />{w}</span>)}
                </div>
              )}

              <div className="mb-3">
                <div className="w-full h-1.5 bg-slate-100"><div className="h-full bg-slate-300" style={{ width: "0%" }} /></div>
                <div className="text-[10px] text-slate-400 mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>0 / {doc.rows} rows reviewed</div>
              </div>

              <button className="w-full py-2 text-xs font-semibold text-white tracking-wide" style={{ backgroundColor: BLUE }} data-testid={`mockup-start-review-${doc.id}`}>
                START REVIEW
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── S2: WORKSPACE ───────────────────────────────────────────────────────────
const WorkspaceScreen = ({ doc, onBack, onComplete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("rows");
  const [editingRow, setEditingRow] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rowActions, setRowActions] = useState({});
  const [showComplete, setShowComplete] = useState(false);

  const rows = currentPage === 1 ? SAMPLE_ROWS_PAGE1 : currentPage === 2 ? SAMPLE_ROWS_PAGE2 : SAMPLE_ROWS_PAGE1.slice(0, 4);
  const approved = Object.values(rowActions).filter(a => a === "approved").length;
  const edited = Object.values(rowActions).filter(a => a === "edited").length;
  const deleted = Object.values(rowActions).filter(a => a === "deleted").length;
  const reviewed = approved + edited + deleted;

  const handleAction = (pageRowKey, action) => { setRowActions(prev => ({ ...prev, [pageRowKey]: action })); setEditingRow(null); };

  if (showComplete) return <CompleteScreen doc={doc} approved={approved} edited={edited} deleted={deleted} onBack={onBack} />;

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="mockup-workspace">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-1 hover:bg-slate-100 transition-colors" data-testid="mockup-back-btn"><ArrowLeft className="h-4 w-4 text-slate-600" /></button>
            <div>
              <h2 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>{doc.file}</h2>
              <div className="flex items-center gap-3 text-[11px] text-slate-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <span>Page {currentPage} of {doc.pages}</span>
                <span>{doc.rows} rows</span>
                <span>{doc.notes} notes</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <span className="text-emerald-600">{approved} approved</span>
              <span className="text-blue-600">{edited} edited</span>
              <span className="text-red-500">{deleted} deleted</span>
              <span className="text-slate-400">{doc.rows - reviewed} remaining</span>
            </div>
            <button onClick={() => setShowComplete(true)} className="px-4 py-2 text-xs font-semibold text-white" style={{ backgroundColor: BLUE }} data-testid="mockup-complete-btn">COMPLETE & EXPORT</button>
          </div>
        </div>
        <div className="px-6 pb-2"><div className="w-full h-1 bg-slate-100"><div className="h-full transition-all" style={{ width: `${(reviewed / doc.rows) * 100}%`, backgroundColor: BLUE }} /></div></div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT: PDF Viewer */}
        <div className="w-[45%] border-r border-slate-200 flex flex-col bg-slate-50">
          <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="p-1.5 border border-slate-200 hover:bg-slate-50" data-testid="mockup-zoom-out"><ZoomOut className="h-3.5 w-3.5 text-slate-600" /></button>
              <button className="p-1.5 border border-slate-200 hover:bg-slate-50" data-testid="mockup-zoom-in"><ZoomIn className="h-3.5 w-3.5 text-slate-600" /></button>
              <button className="p-1.5 border border-slate-200 hover:bg-slate-50" data-testid="mockup-fit-width"><Maximize2 className="h-3.5 w-3.5 text-slate-600" /></button>
            </div>
            <span className="text-[11px] text-slate-500 font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>PDF Viewer (pdf.js)</span>
          </div>

          {/* PDF placeholder */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm p-8 text-center">
              <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>{doc.file}</p>
              <p className="text-xs text-slate-400 mt-1">Page {currentPage} of {doc.pages}</p>
              <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                In production: pdf.js renders the actual PDF page here.<br />
                Reviewer sees the real menu image/text side-by-side with extracted rows.
              </p>
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-center gap-3" data-testid="mockup-page-nav">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-30" data-testid="mockup-prev-page"><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex items-center gap-2 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <span className="text-slate-400">Page</span>
              <input type="number" value={currentPage} onChange={(e) => setCurrentPage(Math.min(doc.pages, Math.max(1, parseInt(e.target.value) || 1)))} className="w-10 text-center border border-slate-200 py-1 text-xs" />
              <span className="text-slate-400">of {doc.pages}</span>
            </div>
            <button onClick={() => setCurrentPage(Math.min(doc.pages, currentPage + 1))} disabled={currentPage === doc.pages} className="p-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-30" data-testid="mockup-next-page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        {/* RIGHT: Data Table */}
        <div className="w-[55%] flex flex-col">
          {/* Tabs */}
          <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 flex items-center gap-0">
            {[{ key: "rows", label: `Rows (${rows.length})` }, { key: "notes", label: `Menu Notes (${SAMPLE_NOTES.filter(n => n.page === currentPage).length})` }, { key: "progress", label: "Progress" }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-3 text-xs font-semibold tracking-wide transition-colors border-b-2 ${activeTab === tab.key ? "border-[#002FA7] text-[#002FA7]" : "border-transparent text-slate-400 hover:text-slate-600"}`} data-testid={`mockup-tab-${tab.key}`}>{tab.label}</button>
            ))}
          </div>

          {activeTab === "rows" && (
            <>
              {/* Toolbar */}
              <div className="flex-shrink-0 px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><input placeholder="Search items..." className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 bg-white w-48" data-testid="mockup-search" /></div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 bg-white hover:bg-slate-50"><Filter className="h-3 w-3" />Filter</button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 bg-white hover:bg-slate-50" data-testid="mockup-add-row"><Plus className="h-3 w-3" />Add Row</button>
                  <button className="px-4 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: GREEN }} data-testid="mockup-approve-all-clean">Approve All Clean</button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="w-8 px-3 py-2.5 text-left"><input type="checkbox" className="h-3.5 w-3.5" /></th>
                      <th className="w-8 px-2 py-2.5 text-left text-[10px] text-slate-400 uppercase tracking-wider">#</th>
                      <th className="px-3 py-2.5 text-left text-[10px] text-slate-400 uppercase tracking-wider">Item Name</th>
                      <th className="px-3 py-2.5 text-left text-[10px] text-slate-400 uppercase tracking-wider">Category</th>
                      <th className="w-20 px-3 py-2.5 text-right text-[10px] text-slate-400 uppercase tracking-wider">Rate</th>
                      <th className="w-16 px-3 py-2.5 text-center text-[10px] text-slate-400 uppercase tracking-wider">Conf</th>
                      <th className="w-20 px-3 py-2.5 text-center text-[10px] text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="w-36 px-3 py-2.5 text-center text-[10px] text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const key = `${currentPage}-${row.row_no}`;
                      const action = rowActions[key];
                      const isEditing = editingRow === key;
                      const borderColor = row.issue_status === "review_required" ? RED : row.confidence === "low" ? RED : row.confidence === "medium" ? AMBER : GREEN;
                      const rowBg = action === "approved" ? "bg-emerald-50/50" : action === "deleted" ? "bg-red-50/30 line-through opacity-50" : action === "edited" ? "bg-blue-50/30" : "";

                      return isEditing ? (
                        <tr key={key} className="bg-blue-50 border-b border-slate-100" data-testid={`mockup-row-edit-${key}`}>
                          <td className="px-3 py-2" colSpan={2} />
                          <td className="px-2 py-2"><input defaultValue={row.item_name} className="w-full border border-blue-300 px-2 py-1 text-xs bg-white" /></td>
                          <td className="px-2 py-2"><input defaultValue={row.category} className="w-full border border-blue-300 px-2 py-1 text-xs bg-white" /></td>
                          <td className="px-2 py-2"><input type="number" defaultValue={row.rate || ""} className="w-full border border-blue-300 px-2 py-1 text-xs text-right bg-white" /></td>
                          <td colSpan={2} className="px-2 py-2"><div className="text-[10px] text-slate-400 truncate" title={row.raw_text}>raw: {row.raw_text}</div></td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => handleAction(key, "edited")} className="px-3 py-1 text-[10px] font-semibold text-white mr-1" style={{ backgroundColor: BLUE }}>Save</button>
                            <button onClick={() => setEditingRow(null)} className="px-3 py-1 text-[10px] font-semibold text-slate-600 border border-slate-200">Cancel</button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={key} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${rowBg}`} data-testid={`mockup-row-${key}`}>
                          <td className="px-3 py-2"><input type="checkbox" className="h-3.5 w-3.5" /></td>
                          <td className="px-2 py-2 text-slate-400" style={{ fontFamily: "'IBM Plex Mono', monospace", borderLeft: `3px solid ${borderColor}` }}>{row.row_no}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{row.item_name}</td>
                          <td className="px-3 py-2 text-slate-500">{row.category}</td>
                          <td className="px-3 py-2 text-right text-slate-800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.rate != null ? `₹${row.rate}` : <span className="text-red-500">—</span>}</td>
                          <td className="px-3 py-2 text-center"><ConfBadge level={row.confidence} /></td>
                          <td className="px-3 py-2 text-center"><StatusBadge status={row.issue_status} /></td>
                          <td className="px-3 py-2">
                            {action ? (
                              <span className={`text-[10px] font-bold uppercase tracking-wide ${action === "approved" ? "text-emerald-600" : action === "edited" ? "text-blue-600" : action === "deleted" ? "text-red-500" : "text-slate-400"}`}>{action}</span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleAction(key, "approved")} className="p-1 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors" title="Approve" data-testid={`mockup-approve-${key}`}><Check className="h-3.5 w-3.5 text-emerald-600" /></button>
                                <button onClick={() => setEditingRow(key)} className="p-1 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors" title="Edit" data-testid={`mockup-edit-${key}`}><Pencil className="h-3.5 w-3.5 text-blue-600" /></button>
                                <button onClick={() => handleAction(key, "deleted")} className="p-1 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors" title="Delete" data-testid={`mockup-delete-${key}`}><X className="h-3.5 w-3.5 text-red-500" /></button>
                                <button onClick={() => handleAction(key, "unclear")} className="p-1 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors" title="Unclear" data-testid={`mockup-unclear-${key}`}><HelpCircle className="h-3.5 w-3.5 text-slate-400" /></button>
                                <button onClick={() => handleAction(key, "out_of_scope")} className="p-1 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors" title="Out of Scope" data-testid={`mockup-oos-${key}`}><Ban className="h-3.5 w-3.5 text-slate-400" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "notes" && (
            <div className="flex-1 overflow-auto p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Menu Notes — Page {currentPage}</h3>
              {SAMPLE_NOTES.filter(n => n.page === currentPage).map((note, i) => (
                <div key={i} className="border border-slate-200 bg-white p-4 mb-3" data-testid={`mockup-note-${i}`}>
                  <p className="text-sm text-slate-800 font-medium mb-2">"{note.text}"</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 border border-slate-200 bg-slate-50 text-slate-600 font-medium">{note.type}</span>
                      <ConfBadge level={note.confidence} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="px-3 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: GREEN }}>Approve</button>
                      <button className="px-3 py-1 text-[10px] font-semibold text-red-600 border border-red-200 hover:bg-red-50">Delete</button>
                      <button className="px-3 py-1 text-[10px] font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50">Out of Scope</button>
                    </div>
                  </div>
                </div>
              ))}
              {SAMPLE_NOTES.filter(n => n.page === currentPage).length === 0 && <p className="text-sm text-slate-400 text-center py-8">No menu notes on this page.</p>}
            </div>
          )}

          {activeTab === "progress" && (
            <div className="flex-1 overflow-auto p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-6" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Review Progress — {doc.file}</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[{ label: "Approved", count: approved, color: GREEN }, { label: "Edited", count: edited, color: BLUE }, { label: "Deleted", count: deleted, color: RED }].map(s => (
                  <div key={s.label} className="border border-slate-200 p-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{s.label}</div>
                    <div className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: s.color }}>{s.count}</div>
                  </div>
                ))}
              </div>
              <div className="border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Overall</span>
                  <span className="text-xs font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{reviewed} / {doc.rows}</span>
                </div>
                <div className="w-full h-2 bg-slate-100"><div className="h-full transition-all" style={{ width: `${(reviewed / doc.rows) * 100}%`, backgroundColor: BLUE }} /></div>
                <div className="text-xs text-slate-400 mt-2">{doc.rows - reviewed} rows remaining</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Missing Row Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" data-testid="mockup-add-modal">
          <div className="bg-white border border-slate-200 w-[480px] shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Add Missing Item</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-slate-500">This item exists on the PDF but was not extracted by AI.</p>
              <div><label className="text-[10px] text-slate-400 uppercase tracking-wider font-medium block mb-1">Item Name *</label><input className="w-full border border-slate-200 px-3 py-2 text-xs" placeholder="e.g., Masala Dosa" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-slate-400 uppercase tracking-wider font-medium block mb-1">Rate</label><input type="number" className="w-full border border-slate-200 px-3 py-2 text-xs" placeholder="₹" /></div>
                <div><label className="text-[10px] text-slate-400 uppercase tracking-wider font-medium block mb-1">Category</label><input className="w-full border border-slate-200 px-3 py-2 text-xs" placeholder="Select or type..." /></div>
              </div>
              <div><label className="text-[10px] text-slate-400 uppercase tracking-wider font-medium block mb-1">Page Number</label><input type="number" defaultValue={currentPage} className="w-24 border border-slate-200 px-3 py-2 text-xs" /></div>
              <div><label className="text-[10px] text-slate-400 uppercase tracking-wider font-medium block mb-1">Notes</label><textarea className="w-full border border-slate-200 px-3 py-2 text-xs h-16" placeholder="Optional notes..." /></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold text-white" style={{ backgroundColor: BLUE }}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── S8: COMPLETE ────────────────────────────────────────────────────────────
const CompleteScreen = ({ doc, approved, edited, deleted, onBack }) => (
  <div className="min-h-screen bg-white flex items-center justify-center" data-testid="mockup-complete">
    <div className="border border-slate-200 w-[520px]">
      <div className="p-8 text-center border-b border-slate-100">
        <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: GREEN }} />
        <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Review Complete</h2>
        <p className="text-sm text-slate-500">{doc.file}</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 mb-6" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {[{ label: "Total rows", val: doc.rows }, { label: "Approved", val: approved, color: GREEN }, { label: "Edited", val: edited, color: BLUE }, { label: "Deleted", val: deleted, color: RED }, { label: "Menu notes", val: `${doc.notes} reviewed` }].map(s => (
            <div key={s.label} className="py-2 border-b border-slate-100 flex justify-between text-xs">
              <span className="text-slate-500">{s.label}</span>
              <span className="font-semibold" style={{ color: s.color || "#0F172A" }}>{s.val}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6"><Clock className="h-3.5 w-3.5" /><span>Completed at: {new Date().toISOString().slice(0, 19)}Z</span></div>
        <div className="flex gap-2">
          <button className="flex-1 py-3 text-xs font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: BLUE }} data-testid="mockup-export-btn"><Download className="h-4 w-4" />Export Corrected JSON</button>
          <button onClick={onBack} className="px-6 py-3 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50" data-testid="mockup-back-landing">Back to Landing</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── MAIN MOCKUP APP ─────────────────────────────────────────────────────────
const MockupApp = () => {
  const [screen, setScreen] = useState("landing");
  const [selectedDoc, setSelectedDoc] = useState(null);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,500,700,400&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {screen === "landing" && (
        <LandingScreen onSelect={(doc) => { setSelectedDoc(doc); setScreen("workspace"); }} />
      )}
      {screen === "workspace" && selectedDoc && (
        <WorkspaceScreen doc={selectedDoc} onBack={() => setScreen("landing")} onComplete={() => setScreen("complete")} />
      )}
    </div>
  );
};

export default MockupApp;
