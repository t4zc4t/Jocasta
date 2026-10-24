import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Database,
  FileSearch,
  Filter,
  Globe,
  Layers,
  MapPin,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";
import {
  LAYERS,
  METRICS,
  SAMPLE_RECORDS,
  SIGNALS,
  SOURCE_CANDIDATES,
  needsReview,
  pad,
  type LayerId,
  type Metric,
  type Signal,
} from "./data/sample";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

type ViewId = "overview" | "evidence" | "atlas" | "movement" | "research";

type NavigationItem = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
};

const NAVIGATION: NavigationItem[] = [
  { id: "overview", label: "Global overview", icon: Globe },
  { id: "evidence", label: "Evidence graph", icon: FileSearch },
  { id: "atlas", label: "Strategic atlas", icon: MapPin },
  { id: "movement", label: "Movement watch", icon: Activity },
  { id: "research", label: "Research lab", icon: Target },
];

const VIEW_COPY: Record<
  ViewId,
  {
    title: string;
    description: string;
    mapTitle: string;
    feedTitle: string;
  }
> = {
  overview: {
    title: "Global overview",
    description:
      "A global picture of reported developments, with the evidence trail kept in view.",
    mapTitle: "Global activity map",
    feedTitle: "Priority signals",
  },
  evidence: {
    title: "Evidence graph",
    description:
      "Inspect claims, source relationships, corroboration, and contradictions.",
    mapTitle: "Evidence geography",
    feedTitle: "Evidence queue",
  },
  atlas: {
    title: "Strategic atlas",
    description:
      "Explore the planned registry of documented installations and strategic infrastructure.",
    mapTitle: "Strategic geography",
    feedTitle: "Registry updates",
  },
  movement: {
    title: "Movement watch",
    description:
      "Explore regional aviation and maritime trends using permitted public data.",
    mapTitle: "Regional movement view",
    feedTitle: "Movement signals",
  },
  research: {
    title: "Research lab",
    description:
      "Investigate historical patterns and prepare reproducible experiments.",
    mapTitle: "Research context",
    feedTitle: "Research observations",
  },
};

function addDemoMapLayers(map: MapLibreMap) {
  map.addSource("jocasta-demo-records", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: SAMPLE_RECORDS.map((record) => ({
        type: "Feature" as const,
        properties: { kind: record.kind, label: record.label },
        geometry: { type: "Point" as const, coordinates: record.coordinates },
      })),
    },
  });

  for (const layer of LAYERS) {
    map.addLayer({
      id: layer.mapLayerId,
      type: "circle",
      source: "jocasta-demo-records",
      filter: ["==", ["get", "kind"], layer.id],
      paint: {
        "circle-radius": 6,
        "circle-color": layer.color,
        "circle-opacity": 0.92,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#111923",
      },
    });

    map.on("mouseenter", layer.mapLayerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", layer.mapLayerId, () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", layer.mapLayerId, (event) => {
      const feature = event.features?.[0];
      const rawLabel = feature?.properties?.label;
      const label =
        typeof rawLabel === "string" ? rawLabel : "Synthetic sample record";

      const content = document.createElement("div");
      content.className = "jocasta-popup";

      const heading = document.createElement("strong");
      heading.textContent = label;

      const detail = document.createElement("p");
      detail.textContent =
        "Synthetic demonstration data. This is not a real-world event or live intelligence.";

      content.append(heading, detail);

      new Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "260px",
      })
        .setLngLat(event.lngLat)
        .setDOMContent(content)
        .addTo(map);
    });
  }
}

function MetricCard({
  metric,
}: {
  metric: Metric;
}) {
  const Icon = metric.icon;
  const TrendIcon =
    metric.direction === "down"
      ? ArrowDownRight
      : metric.direction === "up"
        ? ArrowUpRight
        : null;

  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className={`metric-icon metric-icon-${metric.color}`}>
          <Icon size={17} strokeWidth={1.8} />
        </span>
        {TrendIcon ? (
          <span className={`metric-change metric-change-${metric.direction}`}>
            <TrendIcon size={13} />
            {metric.change}
          </span>
        ) : (
          <span className="metric-tag">{metric.change}</span>
        )}
      </div>

      <div className="metric-value">{metric.value}</div>
      <div className="metric-label">{metric.label}</div>
      <div className="metric-detail">{metric.detail}</div>
    </article>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const Icon = signal.icon;

  return (
    <article className="signal-row">
      <span className={`signal-icon signal-icon-${signal.accent}`}>
        <Icon size={16} strokeWidth={1.8} />
      </span>

      <div className="signal-copy">
        <div className="signal-category">{signal.category}</div>
        <h3>{signal.title}</h3>
        <p>{signal.summary}</p>

        <div className="signal-meta">
          <span className={`signal-status status-${signal.status.toLowerCase()}`}>
            <span className="status-dot" />
            {signal.status}
          </span>
          <span className="signal-time">
            <Clock size={12} />
            {signal.time} ago
          </span>
        </div>
      </div>

      <ArrowRight className="signal-arrow" size={15} />
    </article>
  );
}

function App() {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [query, setQuery] = useState("");
  const [onlyNeedsReview, setOnlyNeedsReview] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Record<LayerId, boolean>>({
    events: true,
    aviation: true,
    maritime: true,
    sites: true,
  });
  const [mapStatus, setMapStatus] = useState("CONNECTING");
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const view = VIEW_COPY[activeView];

  const visibleSignals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return SIGNALS.filter((signal) => {
      const matchesQuery =
        !normalizedQuery ||
        `${signal.title} ${signal.summary} ${signal.category} ${signal.id}`
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesReview = !onlyNeedsReview || needsReview(signal);

      return matchesQuery && matchesReview;
    });
  }, [query, onlyNeedsReview]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    setWorkerUrl(mapWorkerUrl);

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [12, 19],
      zoom: 1.25,
      minZoom: 1,
      maxZoom: 7,
      attributionControl: false,
    });

    mapRef.current = map;

    let styleLoaded = false;

    map.addControl(
      new NavigationControl({
        showCompass: true,
        visualizePitch: true,
      }),
      "top-right",
    );
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");

    map.once("load", () => {
      styleLoaded = true;
      addDemoMapLayers(map);
      setMapStatus("BASEMAP READY");
      setMapReady(true);
    });

    map.on("error", () => {
      if (!styleLoaded) {
        setMapStatus("MAP SERVICE UNAVAILABLE");
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady || !map.isStyleLoaded()) {
      return;
    }

    for (const layer of LAYERS) {
      if (map.getLayer(layer.mapLayerId)) {
        map.setLayoutProperty(
          layer.mapLayerId,
          "visibility",
          activeLayers[layer.id] ? "visible" : "none",
        );
      }
    }
  }, [activeLayers, mapReady]);

  function toggleLayer(layerId: LayerId) {
    setActiveLayers((current) => ({
      ...current,
      [layerId]: !current[layerId],
    }));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-symbol">
            <div className="brand-symbol-core" />
            <span className="brand-symbol-orbit brand-symbol-orbit-one" />
            <span className="brand-symbol-orbit brand-symbol-orbit-two" />
          </div>

          <div className="brand-copy">
            <div className="brand-name">J O C A S T A</div>
            <div className="brand-subtitle">INTELLIGENCE SYSTEMS</div>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="primary-navigation" aria-label="Main navigation">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? "nav-item-active" : ""}`}
                onClick={() => setActiveView(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.id === "evidence" && (
                  <span className="nav-count">{pad(SIGNALS.length)}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <div className="workspace-label">SYSTEM</div>

          <button
            type="button"
            className="nav-item"
            onClick={() => setShowNotifications((current) => !current)}
          >
            <Bell size={18} strokeWidth={1.8} />
            <span>Notifications</span>
            <span className="nav-indicator" />
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => setActiveView("research")}
          >
            <Settings2 size={18} strokeWidth={1.8} />
            <span>System settings</span>
          </button>
        </div>

        <div className="sidebar-spacer" />

        <div className="local-node-card">
          <div className="local-node-heading">
            <span className="local-node-indicator" />
            <span>LOCAL NODE</span>
            <ShieldCheck size={15} />
          </div>
          <div className="local-node-address">127.0.0.1 · PRIVATE</div>
          <div className="local-node-description">
            Local development environment
          </div>
        </div>

        <div className="sidebar-footer">
          <span>JOC</span>
          <span>VERSION 0.1.0</span>
          <span className="sidebar-footer-dot" />
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-context">
            <div className="breadcrumb">
              <span>JOC / WORKSPACE</span>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-current">
                {activeView.toUpperCase()}
              </span>
            </div>

            <div className="topbar-subtitle">
              GLOBAL STRATEGIC INTELLIGENCE
            </div>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sample evidence..."
                aria-label="Search sample evidence"
              />
              <kbd>/</kbd>
            </label>

            <button
              type="button"
              className={`icon-button notification-button ${
                showNotifications ? "icon-button-active" : ""
              }`}
              aria-label="Toggle notifications"
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications((current) => !current)}
            >
              <Bell size={18} />
              <span className="notification-dot" />
            </button>

            <button
              type="button"
              className="profile-button"
              onClick={() => setActiveView("research")}
              aria-label="Open research workspace"
            >
              <span className="profile-avatar">J</span>
              <span className="profile-label">LOCAL</span>
              <ChevronDown size={14} />
            </button>

            {showNotifications && (
              <div className="notification-popover">
                <div className="popover-heading">
                  <span>Workspace status</span>
                  <button
                    type="button"
                    className="popover-close"
                    onClick={() => setShowNotifications(false)}
                    aria-label="Close notifications"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="popover-item">
                  <CircleAlert size={16} />
                  <div>
                    <strong>Demonstration mode</strong>
                    <p>No live intelligence feeds are connected.</p>
                  </div>
                </div>
                <div className="popover-item">
                  <Database size={16} />
                  <div>
                    <strong>Local application</strong>
                    <p>Evidence connectors are still planned.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="demo-banner">
          <span className="demo-banner-icon">
            <CircleAlert size={15} />
          </span>
          <span>
            <strong>DEMONSTRATION MODE</strong>
            <span className="demo-banner-divider">/</span>
            All event records and map markers are synthetic placeholders. No
            live intelligence feeds are connected.
          </span>
          <span className="demo-banner-label">NOT LIVE DATA</span>
        </div>

        <div className="dashboard-content">
          <section className="page-heading">
            <div>
              <div className="section-eyebrow">
                <span className="eyebrow-line" />
                SITUATIONAL AWARENESS
              </div>
              <h1>{view.title}</h1>
              <p>{view.description}</p>
            </div>

            <div className="heading-status">
              <span className="heading-status-dot" />
              <span>LOCAL WORKSPACE</span>
              <span className="heading-status-divider" />
              <span>PREVIEW BUILD</span>
            </div>
          </section>

          <section className="metrics-grid" aria-label="Sample metrics">
            {METRICS.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </section>

          <section className="main-grid">
            <article className="panel map-panel">
              <div className="panel-heading map-panel-heading">
                <div>
                  <div className="panel-kicker">
                    <span className="live-indicator live-indicator-demo" />
                    GLOBAL VIEW / SYNTHETIC LAYERS
                  </div>
                  <h2>{view.mapTitle}</h2>
                  <p>Explore the basemap and toggle illustrative records.</p>
                </div>

                <button
                  type="button"
                  className="panel-tool-button"
                  onClick={() =>
                    setActiveLayers({
                      events: true,
                      aviation: true,
                      maritime: true,
                      sites: true,
                    })
                  }
                  title="Show all demonstration layers"
                >
                  <Layers size={15} />
                  <span>Layers</span>
                </button>
              </div>

              <div className="map-shell">
                <div
                  ref={mapContainerRef}
                  className="map-canvas"
                  aria-label="Interactive world map with synthetic sample markers"
                />

                <div className="map-top-overlay">
                  <span className="map-mode-chip">
                    <Globe size={13} />
                    WORLD / 2D
                  </span>
                  <span className="map-record-count">
                    <span className="map-record-dot" />
                    {pad(SAMPLE_RECORDS.length)} SAMPLE RECORDS
                  </span>
                </div>

                <div className="map-legend">
                  {LAYERS.map((layer) => {
                    const Icon = layer.icon;
                    const enabled = activeLayers[layer.id];

                    return (
                      <button
                        key={layer.id}
                        type="button"
                        className={`map-layer-toggle ${
                          enabled ? "map-layer-toggle-active" : ""
                        }`}
                        aria-pressed={enabled}
                        onClick={() => toggleLayer(layer.id)}
                      >
                        <span
                          className="map-legend-dot"
                          style={{ backgroundColor: layer.color }}
                        />
                        <Icon size={13} />
                        <span>{layer.label}</span>
                        {enabled && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>

                <div className="map-status">
                  <span
                    className={`map-status-dot ${
                      mapReady ? "map-status-dot-ready" : ""
                    }`}
                  />
                  {mapStatus}
                </div>
              </div>

              <div className="map-footer">
                <div className="map-footer-note">
                  <ShieldCheck size={15} />
                  <span>
                    Synthetic coordinates only. No real events, installations,
                    or operational positions are represented.
                  </span>
                </div>
                <span className="map-footer-coordinate">GLOBAL / DEMO</span>
              </div>
            </article>

            <article className="panel signals-panel">
              <div className="panel-heading signals-panel-heading">
                <div>
                  <div className="panel-kicker">
                    <span className="signal-heading-dot" />
                    EVIDENCE MONITOR
                  </div>
                  <h2>{view.feedTitle}</h2>
                  <p>Illustrative records for interface testing.</p>
                </div>

                <button
                  type="button"
                  className={`panel-tool-button filter-tool ${
                    onlyNeedsReview ? "panel-tool-button-active" : ""
                  }`}
                  onClick={() => setOnlyNeedsReview((current) => !current)}
                  aria-pressed={onlyNeedsReview}
                  title="Toggle review-needed filter"
                >
                  {onlyNeedsReview ? <Filter size={15} /> : <SlidersHorizontal size={15} />}
                  <span>{onlyNeedsReview ? "Review only" : "Filter"}</span>
                </button>
              </div>

              {query && (
                <div className="search-result-note">
                  <Search size={13} />
                  <span>
                    {visibleSignals.length} match
                    {visibleSignals.length === 1 ? "" : "es"} for "{query}"
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="signal-list">
                {visibleSignals.map((signal) => (
                  <SignalRow key={signal.id} signal={signal} />
                ))}

                {visibleSignals.length === 0 && (
                  <div className="empty-state">
                    <Search size={20} />
                    <strong>No matching sample records</strong>
                    <p>Try another search term or clear the review filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setOnlyNeedsReview(false);
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>

              <div className="signals-footer">
                <span>{visibleSignals.length} SAMPLE RECORDS</span>
                <span>ALL FICTIONAL</span>
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel source-panel">
              <div className="panel-heading compact-panel-heading">
                <div>
                  <div className="panel-kicker">INGESTION PIPELINE</div>
                  <h2>Source connectors</h2>
                  <p>Candidate integrations, not active data feeds.</p>
                </div>
                <span className="small-heading-tag">PLANNED</span>
              </div>

              <div className="source-list">
                {SOURCE_CANDIDATES.map((source) => {
                  const Icon = source.icon;

                  return (
                    <div key={source.name} className="source-row">
                      <span className="source-icon">
                        <Icon size={16} />
                      </span>
                      <div className="source-copy">
                        <strong>{source.name}</strong>
                        <span>{source.description}</span>
                      </div>
                      <span className="source-status">
                        <span className="source-status-dot" />
                        {source.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="panel research-panel">
              <div className="panel-heading compact-panel-heading">
                <div>
                  <div className="panel-kicker">RESEARCH DIRECTION</div>
                  <h2>Evidence before inference</h2>
                  <p>The planned workflow for every meaningful signal.</p>
                </div>
                <Sparkles size={18} className="research-heading-icon" />
              </div>

              <div className="research-steps">
                <div className="research-step">
                  <span className="research-step-number">01</span>
                  <div>
                    <strong>Observe</strong>
                    <p>Capture a timestamped source record.</p>
                  </div>
                  <Database size={16} />
                </div>
                <div className="research-step">
                  <span className="research-step-number">02</span>
                  <div>
                    <strong>Corroborate</strong>
                    <p>Trace origins and inspect contradictions.</p>
                  </div>
                  <FileSearch size={16} />
                </div>
                <div className="research-step">
                  <span className="research-step-number">03</span>
                  <div>
                    <strong>Evaluate</strong>
                    <p>Record an assessment with uncertainty.</p>
                  </div>
                  <ShieldCheck size={16} />
                </div>
              </div>

              <div className="research-note">
                <Zap size={15} />
                <span>
                  Forecasting is intentionally deferred until the evidence
                  pipeline, source integrations, replay, and tests are ready.
                </span>
              </div>
            </article>
          </section>

          <footer className="dashboard-footer">
            <div>
              <span className="footer-brand-mark">J</span>
              <span>JOCASTA RESEARCH WORKSTATION</span>
              <span className="footer-divider">/</span>
              <span>LOCAL DEVELOPMENT</span>
            </div>
            <div>
              <span>NO LIVE INTELLIGENCE</span>
              <span className="footer-divider">/</span>
              <span>VERSION 0.1.0</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;