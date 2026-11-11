import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  FileSearch,
  Filter,
  Globe,
  Layers,
  MapPin,
  Activity,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  LAYERS,
  SAMPLE_RECORDS,
  SIGNALS,
  buildMetrics,
  needsReview,
  pad,
  withConnected,
  type LayerId,
  type Metric,
  type Signal,
} from "./data/sample";
import { toRecords, toSignal } from "./data/fromApi";
import {
  useApiEvents,
  useApiSources,
  useApiStatus,
  type ApiStatus,
} from "./lib/api";
import { useTheme } from "./lib/theme";

// maplibre is most of the bundle, so load it in its own chunk
const WorldMap = lazy(() => import("./components/WorldMap"));

type ViewId = "overview" | "evidence" | "atlas" | "movement" | "research";

const VIEWS: {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  title: string;
  lede: string;
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Globe,
    title: "Global overview",
    lede: "What has been reported, where, and the evidence behind each record.",
  },
  {
    id: "evidence",
    label: "Evidence",
    icon: FileSearch,
    title: "Evidence graph",
    lede: "Claims, the sources they came from, and whether anyone independent agrees.",
  },
  {
    id: "atlas",
    label: "Atlas",
    icon: MapPin,
    title: "Strategic atlas",
    lede: "Documented, permanent places only. Planned, not built yet.",
  },
  {
    id: "movement",
    label: "Movement",
    icon: Activity,
    title: "Movement watch",
    lede: "Aviation and maritime trends at aggregate level. Planned, not built yet.",
  },
  {
    id: "research",
    label: "Research",
    icon: Target,
    title: "Research lab",
    lede: "Baselines, replays and experiments, once the evidence core is solid.",
  },
];

const API_LABEL: Record<ApiStatus, string> = {
  checking: "Checking",
  online: "API online",
  offline: "API offline",
  none: "Static build",
};

const ALL_LAYERS: Record<LayerId, boolean> = {
  events: true,
  aviation: true,
  maritime: true,
  sites: true,
};

function MapLoading() {
  return (
    <>
      <div className="map-canvas" />
      <div className="map-status">
        <span className="dot" />
        Loading map
      </div>
    </>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <article className="card metric">
      <div className="metric-head">
        <Icon size={15} strokeWidth={1.7} />
        <span>{metric.change}</span>
      </div>
      <div className="metric-value">{metric.value}</div>
      <div className="metric-label">{metric.label}</div>
      <div className="metric-detail">{metric.detail}</div>
    </article>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  return (
    <article className={`signal status-${signal.status.toLowerCase()}`}>
      <div className="signal-top">
        <span className="signal-category">{signal.category}</span>
        <span className="signal-time">{signal.time} ago</span>
      </div>
      <h3>{signal.title}</h3>
      <p>{signal.summary}</p>
      <span className="signal-status">{signal.status}</span>
    </article>
  );
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [view, setView] = useState<ViewId>("overview");
  const [query, setQuery] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [layers, setLayers] = useState(ALL_LAYERS);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const notesRef = useRef<HTMLDivElement | null>(null);

  const api = useApiStatus();
  const apiEvents = useApiEvents(api.status);
  const apiSources = useApiSources(api.status);
  const live = apiEvents !== null;

  const signals = useMemo(
    () => (apiEvents ? apiEvents.map(toSignal) : SIGNALS),
    [apiEvents],
  );
  const records = useMemo(
    () => (apiEvents ? toRecords(apiEvents) : SAMPLE_RECORDS),
    [apiEvents],
  );
  const sources = useMemo(
    () => withConnected(apiSources.map((s) => s.id)),
    [apiSources],
  );
  const metrics = useMemo(
    () => buildMetrics(signals, records, live, sources),
    [signals, records, live, sources],
  );
  const attribution = apiSources
    .filter((s) => s.id !== "jocasta-demo")
    .map((s) => s.name)
    .join(", ");

  const current = VIEWS.find((v) => v.id === view) ?? VIEWS[0];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return signals.filter((s) => {
      const matches =
        !q ||
        `${s.title} ${s.summary} ${s.category} ${s.id}`
          .toLowerCase()
          .includes(q);
      return matches && (!onlyReview || needsReview(s));
    });
  }, [signals, query, onlyReview]);

  // "/" jumps to search
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // close notes on Escape or a click outside
  useEffect(() => {
    if (!showNotes) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setShowNotes(false);
    }
    function onDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (notesRef.current?.contains(target) || target?.closest("[data-notes]")) {
        return;
      }
      setShowNotes(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [showNotes]);

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <div className="moon" aria-hidden="true">
            <span className="moon-halo" />
            <span className="moon-disc" />
          </div>
          <div>
            <div className="brand-name">Jocasta</div>
            <div className="brand-sub">Evidence before inference</div>
          </div>
        </div>

        <div className="masthead-tools">
          <label className="search">
            <Search size={15} />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search records"
              aria-label="Search records"
            />
            <kbd>/</kbd>
          </label>

          <span className={`api-pill api-${api.status}`} title="Local evidence API">
            <span className="dot" />
            {API_LABEL[api.status]}
            {api.version && <span className="api-version">v{api.version}</span>}
          </span>

          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === "mafia" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "mafia" ? "Agency (light)" : "Mafia (dark)"}
          >
            {theme === "mafia" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            className={`icon-btn ${showNotes ? "is-on" : ""}`}
            onClick={() => setShowNotes((v) => !v)}
            aria-label="Toggle notes"
            aria-expanded={showNotes}
            data-notes
          >
            <Bell size={16} />
          </button>

          {showNotes && (
            <div className="notes" ref={notesRef}>
              <div className="notes-head">
                <span>Workspace notes</span>
                <button type="button" onClick={() => setShowNotes(false)} aria-label="Close notes">
                  <X size={14} />
                </button>
              </div>
              <p>
                {live
                  ? "Records are coming from your local evidence API."
                  : "No local API found, so you're looking at sample records."}
              </p>
              <p>Nothing here is a live feed or official intelligence.</p>
            </div>
          )}
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              type="button"
              className={`tab ${view === v.id ? "is-on" : ""}`}
              onClick={() => setView(v.id)}
              aria-current={view === v.id ? "page" : undefined}
            >
              <Icon size={15} strokeWidth={1.7} />
              {v.label}
              {v.id === "evidence" && <span className="tab-count">{pad(signals.length)}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`notice ${live ? "is-live" : ""}`}>
        <strong>{live ? "Local data" : "Demonstration"}</strong>
        <span>
          {live
            ? `Records come from your local evidence API${attribution ? `, using ${attribution}` : ""}. Historical data, not a live feed.`
            : "Every record and marker here is a synthetic placeholder. No live feeds are connected."}
        </span>
      </div>

      <main className="content">
        <section className="intro">
          <h1>{current.title}</h1>
          <p>{current.lede}</p>
          <div className="seal" aria-hidden="true">
            証
          </div>
        </section>

        <section className="metrics" aria-label="Counts">
          {metrics.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </section>

        <section className="grid">
          <article className="card map-card">
            <div className="card-head">
              <div>
                <h2>Map</h2>
                <p>{live ? "Newest records from the local API" : "Sample records"}</p>
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setLayers(ALL_LAYERS)}
                title="Show every layer"
              >
                <Layers size={14} />
                All layers
              </button>
            </div>

            <div className="map-shell">
              <Suspense fallback={<MapLoading />}>
                <WorldMap activeLayers={layers} records={records} />
              </Suspense>
              <span className="map-count">
                {pad(records.length)} {live ? "local records" : "sample records"}
              </span>
              <div className="legend">
                {LAYERS.map((layer) => {
                  const on = layers[layer.id];
                  const Icon = layer.icon;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      className={`legend-item ${on ? "is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => setLayers((c) => ({ ...c, [layer.id]: !c[layer.id] }))}
                    >
                      <span className="swatch" style={{ background: layer.color }} />
                      <Icon size={13} />
                      {layer.label}
                      {on && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="fine-print">
              <ShieldCheck size={13} />
              {live
                ? "Historical records, positions rounded to about 11 km. No live or operational positions."
                : "Synthetic coordinates only. Nothing real is shown."}{" "}
              Borders are not drawn, and place names imply no position on disputed
              territory.
            </p>
          </article>

          <article className="card feed-card">
            <div className="card-head">
              <div>
                <h2>Signals</h2>
                <p>
                  {visible.length} of {signals.length}
                  {query && ` matching "${query}"`}
                </p>
              </div>
              <button
                type="button"
                className={`ghost-btn ${onlyReview ? "is-on" : ""}`}
                onClick={() => setOnlyReview((v) => !v)}
                aria-pressed={onlyReview}
              >
                <Filter size={14} />
                {onlyReview ? "Needs review" : "All"}
              </button>
            </div>

            <div className="feed">
              {visible.map((s) => (
                <SignalRow key={s.id} signal={s} />
              ))}
              {visible.length === 0 && (
                <div className="empty">
                  <p>Nothing matches.</p>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setQuery("");
                      setOnlyReview(false);
                    }}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="grid grid-even">
          <article className="card">
            <div className="card-head">
              <div>
                <h2>Sources</h2>
                <p>Only used within their licence and terms</p>
              </div>
            </div>
            <ul className="sources">
              {sources.map((source) => {
                const Icon = source.icon;
                return (
                  <li key={source.name} className={`source s-${source.status.replace(" ", "-").toLowerCase()}`}>
                    <Icon size={15} strokeWidth={1.7} />
                    <div>
                      <strong>{source.name}</strong>
                      <span>{source.description}</span>
                    </div>
                    <em>{source.status}</em>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="card">
            <div className="card-head">
              <div>
                <h2>Method</h2>
                <p>The order every record goes through</p>
              </div>
            </div>
            <ol className="method">
              <li>
                <strong>Observe</strong>
                <span>Capture a timestamped record from a registered source.</span>
              </li>
              <li>
                <strong>Corroborate</strong>
                <span>Trace it to its origin and check for independent agreement.</span>
              </li>
              <li>
                <strong>Assess</strong>
                <span>Record a judgement with its uncertainty, never overwrite the past.</span>
              </li>
            </ol>
            <a className="more" href="https://github.com/t4zc4t/Jocasta/blob/main/docs/ROADMAP.md">
              Read the roadmap <ArrowUpRight size={13} />
            </a>
          </article>
        </section>
      </main>

      <footer className="footer">
        <span>Jocasta · open source research, not official intelligence</span>
        <span>v0.1.0</span>
      </footer>
    </div>
  );
}
