import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, Loader2, AlertTriangle } from "lucide-react";

// Point to the worker we copied into /public
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MIN_SCALE = 0.6;
const MAX_SCALE = 3.0;
const DEFAULT_SCALE = 1.2;

export default function PDFViewer({ pdfUrl, currentPage, onTotalPages }) {
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadedUrl, setLoadedUrl] = useState(null);

  // ── Load PDF document (only when URL changes) ────────────────
  useEffect(() => {
    if (!pdfUrl || pdfUrl === loadedUrl) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const task = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
        const doc = await task.promise;
        if (cancelled) { doc.destroy(); return; }
        pdfDocRef.current = doc;
        setLoadedUrl(pdfUrl);
        if (onTotalPages) onTotalPages(doc.numPages);
      } catch (e) {
        if (!cancelled) setError(`Failed to load PDF: ${e.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pdfUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render page (when page or scale changes) ─────────────────
  const renderPage = useCallback(async (pageNum, s) => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

    // Cancel any in-flight render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch (_) {}
      renderTaskRef.current = null;
    }

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: s });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d");
      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (e) {
      if (e?.name !== "RenderingCancelledException") {
        setError(`Render error: ${e.message}`);
      }
    }
  }, []);

  useEffect(() => {
    if (loadedUrl && pdfDocRef.current) {
      renderPage(currentPage, scale);
    }
  }, [currentPage, scale, loadedUrl, renderPage]);

  const zoom = (delta) =>
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + delta).toFixed(1))));

  const fitWidth = () => {
    const container = canvasRef.current?.parentElement;
    if (!container || !pdfDocRef.current) return;
    pdfDocRef.current.getPage(currentPage).then((page) => {
      const vp = page.getViewport({ scale: 1 });
      const fit = (container.clientWidth - 32) / vp.width;
      setScale(+fit.toFixed(2));
    });
  };

  return (
    <div
      data-testid="pdf-viewer"
      className="flex flex-col h-full bg-[#525659]"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#3d4043] border-b border-[#2a2d30] flex-shrink-0">
        <span className="text-[11px] text-slate-300 font-mono truncate max-w-[160px]">
          Page {currentPage}
        </span>
        <div className="flex items-center gap-1">
          <button
            data-testid="zoom-out-btn"
            onClick={() => zoom(-0.2)}
            disabled={scale <= MIN_SCALE}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={fitWidth}
            className="px-1.5 py-0.5 text-[11px] font-mono text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Fit width"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            data-testid="zoom-in-btn"
            onClick={() => zoom(0.2)}
            disabled={scale >= MAX_SCALE}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-start justify-center py-4 px-4 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#525659]/80 z-10">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center gap-3 text-white mt-20">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <p className="text-sm text-center max-w-xs">{error}</p>
          </div>
        )}
        {!error && (
          <canvas
            ref={canvasRef}
            data-testid="pdf-canvas"
            className="shadow-2xl"
            style={{ display: loading ? "none" : "block", maxWidth: "100%" }}
          />
        )}
      </div>
    </div>
  );
}
