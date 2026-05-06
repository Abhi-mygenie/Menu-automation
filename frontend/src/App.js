import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import {
  CheckCircle2,
  Database,
  GitBranch,
  Server,
  Boxes,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatusPill = ({ ok, label }) => (
  <span
    data-testid={`status-pill-${label.toLowerCase().replace(/\s+/g, "-")}`}
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-wide ${
      ok
        ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
        : "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
    }`}
  >
    {ok ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : (
      <AlertCircle className="h-3.5 w-3.5" />
    )}
    {label}
  </span>
);

const Card = ({ icon: Icon, title, children, testid }) => (
  <div
    data-testid={testid}
    className="group relative rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:border-stone-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
  >
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-stone-900">
        {title}
      </h3>
    </div>
    <div className="text-sm leading-relaxed text-stone-600">{children}</div>
  </div>
);

const Home = () => {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [h, s] = await Promise.all([
          axios.get(`${API}/health`),
          axios.get(`${API}/datasets/stats`),
        ]);
        if (!mounted) return;
        setHealth(h.data);
        setStats(s.data);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to reach backend");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const apiOk = !!health && health.status === "ok";
  const mongoOk = !!health && health.mongo === "ok";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Top bar */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-900 text-white">
              <Boxes className="h-4 w-4" />
            </div>
            <div className="font-mono text-sm font-semibold tracking-tight">
              menu-automation
              <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-stone-600">
                7-may
              </span>
            </div>
          </div>
          <a
            data-testid="repo-link"
            href="https://github.com/Abhi-mygenie/Menu-automation"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100"
          >
            <GitBranch className="h-3.5 w-3.5" />
            GitHub
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Environment provisioned · branch <code className="font-mono">7-may</code>
        </div>
        <h1
          data-testid="hero-title"
          className="font-mono text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl lg:text-6xl"
        >
          Menu Automation
          <span className="block text-stone-400">setup &amp; handover</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-600">
          React 19 · FastAPI · MongoDB. Cloned from the upstream repo, dependencies
          installed, services running under supervisor, and Docker artifacts prepared
          for production handover.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <StatusPill ok={apiOk} label={apiOk ? "API Online" : "API Offline"} />
          <StatusPill ok={mongoOk} label={mongoOk ? "MongoDB Connected" : "MongoDB Down"} />
          <StatusPill ok={!!stats?.exists} label={stats?.exists ? "Datasets Ready" : "Datasets Missing"} />
        </div>
      </section>

      {/* Status grid */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          <Card icon={Server} title="Backend" testid="card-backend">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">service</span>
                <span>{health?.service || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">status</span>
                <span className={apiOk ? "text-emerald-700" : "text-amber-700"}>
                  {health?.status || "unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">port</span>
                <span>8001</span>
              </div>
            </div>
          </Card>

          <Card icon={Database} title="MongoDB" testid="card-mongodb">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">connection</span>
                <span className={mongoOk ? "text-emerald-700" : "text-amber-700"}>
                  {health?.mongo || "unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">driver</span>
                <span>motor 3.3.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">port</span>
                <span>27017</span>
              </div>
            </div>
          </Card>

          <Card icon={FileText} title="Datasets" testid="card-datasets">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">total menus</span>
                <span className="font-semibold">
                  {loading ? <Loader2 className="inline h-3 w-3 animate-spin" /> : stats?.total_files ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">batches</span>
                <span>{stats?.batches?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">format</span>
                <span>PDF</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Dataset breakdown */}
        {stats?.batches?.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white" data-testid="dataset-breakdown">
            <div className="border-b border-stone-200 bg-stone-50 px-6 py-3">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Dataset breakdown · {stats.root}
              </h3>
            </div>
            <div className="divide-y divide-stone-100">
              {stats.batches.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between px-6 py-3 font-mono text-sm hover:bg-stone-50"
                >
                  <span className="text-stone-700">{b.name}</span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                    {b.file_count} files
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            data-testid="error-banner"
            className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">Backend unreachable</div>
              <div className="mt-1 font-mono text-xs">{error}</div>
            </div>
          </div>
        )}

        {/* Quickstart */}
        <div className="mt-12 rounded-2xl border border-stone-900 bg-stone-900 p-6 text-stone-100" data-testid="quickstart-card">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Quickstart
          </h3>
          <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-stone-200">
{`# Local dev (services already running under supervisor)
sudo supervisorctl status

# Production build
cd frontend && yarn build

# Docker (production)
docker-compose up --build -d

# See DEPLOYMENT.md for full handover docs`}
          </pre>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 font-mono text-xs text-stone-500 sm:flex-row sm:items-center">
          <span>menu-automation · v0.1.0 · branch 7-may</span>
          <span>React 19 · FastAPI · MongoDB · Docker</span>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
