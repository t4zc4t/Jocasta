import {
  Activity,
  Building2,
  Check,
  Database,
  FileSearch,
  Globe,
  Plane,
  Radio,
  Ship,
  type LucideIcon,
} from "lucide-react";

// Demo records only. Nothing here is real data.

export type LayerId = "events" | "aviation" | "maritime" | "sites";

export type SignalStatus = "REVIEW" | "CONFLICT" | "TRACEABLE" | "UPDATED";

export type Signal = {
  id: string;
  category: string;
  title: string;
  summary: string;
  status: SignalStatus;
  time: string;
  icon: LucideIcon;
  accent: string;
};

export type MapLayer = {
  id: LayerId;
  label: string;
  icon: LucideIcon;
  color: string;
  mapLayerId: string;
};

export type SampleRecord = {
  kind: LayerId;
  label: string;
  coordinates: [number, number];
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  change: string;
  direction: "up" | "down" | "neutral";
  icon: LucideIcon;
  color: string;
};

export const SIGNALS: Signal[] = [
  {
    id: "SIG-DEMO-001",
    category: "EVENT REPORT",
    title: "Synthetic event cluster A",
    summary:
      "Example records are grouped for testing source lineage and corroboration.",
    status: "REVIEW",
    time: "12m",
    icon: Radio,
    accent: "amber",
  },
  {
    id: "SIG-DEMO-002",
    category: "SOURCE CONFLICT",
    title: "Conflicting sample claims",
    summary:
      "Two fictional reports disagree on the timing of an illustrative event.",
    status: "CONFLICT",
    time: "26m",
    icon: FileSearch,
    accent: "red",
  },
  {
    id: "SIG-DEMO-003",
    category: "DATA MOVEMENT",
    title: "Regional baseline deviation",
    summary:
      "A synthetic aggregate differs from its example historical baseline.",
    status: "REVIEW",
    time: "41m",
    icon: Activity,
    accent: "blue",
  },
  {
    id: "SIG-DEMO-004",
    category: "SOURCE UPDATE",
    title: "Reference record revised",
    summary:
      "An example source record has a new version available for inspection.",
    status: "UPDATED",
    time: "1h",
    icon: Database,
    accent: "violet",
  },
  {
    id: "SIG-DEMO-005",
    category: "EVIDENCE TRACE",
    title: "Duplicate reporting identified",
    summary:
      "A demonstration source chain links derivative reports to one origin.",
    status: "TRACEABLE",
    time: "2h",
    icon: Check,
    accent: "green",
  },
];

export const LAYERS: MapLayer[] = [
  {
    id: "events",
    label: "Events",
    icon: Radio,
    color: "#E7AE67",
    mapLayerId: "demo-events",
  },
  {
    id: "aviation",
    label: "Air",
    icon: Plane,
    color: "#72C8F5",
    mapLayerId: "demo-aviation",
  },
  {
    id: "maritime",
    label: "Sea",
    icon: Ship,
    color: "#67D5C2",
    mapLayerId: "demo-maritime",
  },
  {
    id: "sites",
    label: "Sites",
    icon: Building2,
    color: "#B7A0FF",
    mapLayerId: "demo-sites",
  },
];

export const SAMPLE_RECORDS: SampleRecord[] = [
  { kind: "events", label: "Synthetic event cluster A", coordinates: [-31, 25] },
  {
    kind: "aviation",
    label: "Synthetic aviation aggregate B",
    coordinates: [37, 14],
  },
  {
    kind: "maritime",
    label: "Synthetic maritime pattern C",
    coordinates: [112, -12],
  },
  {
    kind: "sites",
    label: "Synthetic public-site record D",
    coordinates: [71, 48],
  },
];

export const SOURCE_CANDIDATES = [
  {
    name: "GDELT",
    description: "News and event discovery",
    status: "NOT CONNECTED",
    icon: Radio,
  },
  {
    name: "UCDP",
    description: "Historical conflict research",
    status: "NOT CONNECTED",
    icon: Database,
  },
  {
    name: "Aviation data",
    description: "Access and licence review pending",
    status: "PLANNED",
    icon: Plane,
  },
  {
    name: "Maritime data",
    description: "Access and licence review pending",
    status: "PLANNED",
    icon: Ship,
  },
];

export function needsReview(signal: Signal) {
  return signal.status === "REVIEW" || signal.status === "CONFLICT";
}

export function pad(count: number) {
  return String(count).padStart(2, "0");
}

const reviewCount = SIGNALS.filter(needsReview).length;
const conflictCount = SIGNALS.filter((s) => s.status === "CONFLICT").length;
const connectedCount = SOURCE_CANDIDATES.filter(
  (s) => s.status === "CONNECTED",
).length;

// every number here is counted from the records above
export const METRICS: Metric[] = [
  {
    label: "Sample signals",
    value: pad(SIGNALS.length),
    detail: "Synthetic records",
    change: "Demo",
    direction: "neutral",
    icon: Database,
    color: "blue",
  },
  {
    label: "Signals to review",
    value: pad(reviewCount),
    detail: "Review or conflict",
    change: `${conflictCount} conflict${conflictCount === 1 ? "" : "s"}`,
    direction: "neutral",
    icon: Radio,
    color: "amber",
  },
  {
    label: "Map records",
    value: pad(SAMPLE_RECORDS.length),
    detail: "Synthetic points",
    change: `${LAYERS.length} layers`,
    direction: "neutral",
    icon: Globe,
    color: "violet",
  },
  {
    label: "Sources connected",
    value: `${connectedCount}/${SOURCE_CANDIDATES.length}`,
    detail: "Connectors planned",
    change: "Not live",
    direction: "neutral",
    icon: Activity,
    color: "green",
  },
];
