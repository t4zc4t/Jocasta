import { Radio, RefreshCw } from "lucide-react";
import type { ApiEvent } from "../lib/api";
import type { SampleRecord, Signal, SignalStatus } from "./sample";

function age(iso: string) {
  const minutes = Math.max(0, (Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function statusOf(event: ApiEvent): SignalStatus {
  if (event.version > 1) return "UPDATED";
  if (event.confidence === "medium" || event.confidence === "high") {
    return "TRACEABLE";
  }
  return "REVIEW";
}

export function toSignal(event: ApiEvent): Signal {
  const revised = event.version > 1;
  return {
    id: `EVT-${event.event_id.slice(0, 8).toUpperCase()}`,
    category: `${event.category.toUpperCase()} · ${event.place.name.toUpperCase()}`,
    title: event.title,
    summary: event.summary || "No summary yet.",
    status: statusOf(event),
    time: age(event.recorded_at),
    icon: revised ? RefreshCw : Radio,
    accent: revised ? "violet" : "amber",
  };
}

// every api event goes on the events layer, other layers stay sample only
export function toRecords(events: ApiEvent[]): SampleRecord[] {
  return events
    .filter((e) => e.place.lat !== null && e.place.lon !== null)
    .map((e) => ({
      kind: "events",
      label: e.title,
      coordinates: [e.place.lon as number, e.place.lat as number],
    }));
}
