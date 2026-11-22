import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { loadEventDetail, type EventDetail } from "../lib/api";

type Props = {
  eventId: string;
  onClose: () => void;
};

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; detail: EventDetail };

function day(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

const RELATION: Record<string, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  mentions: "Mentions",
};

function independence(value: boolean | null) {
  if (value === true) return "independent";
  if (value === false) return "not independent";
  return "independence not checked";
}

export default function EventPanel({ eventId, onClose }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let stopped = false;
    loadEventDetail(eventId)
      .then((detail) => {
        if (!stopped) setState({ kind: "ready", detail });
      })
      .catch(() => {
        if (!stopped) setState({ kind: "error" });
      });
    return () => {
      stopped = true;
    };
  }, [eventId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const latest =
    state.kind === "ready" ? state.detail.history.at(-1) : undefined;

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside
        className="event-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Event details"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="icon-btn panel-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={16} />
        </button>

        {state.kind === "loading" && <p className="panel-note">Loading…</p>}
        {state.kind === "error" && (
          <p className="panel-note">Couldn't load this event from the API.</p>
        )}

        {latest && state.kind === "ready" && (
          <>
            <span className="panel-kicker">
              {latest.category} · {latest.confidence}
            </span>
            <h2>{latest.title}</h2>
            <p className="panel-meta">
              {latest.place.name} · {day(latest.started_at)}
              {latest.ended_at && day(latest.ended_at) !== day(latest.started_at)
                ? ` to ${day(latest.ended_at)}`
                : ""}
            </p>
            {latest.summary && <p>{latest.summary}</p>}

            <h3>Evidence</h3>
            {state.detail.evidence.length === 0 && (
              <p className="panel-note">No evidence linked yet.</p>
            )}
            <ul className="panel-list">
              {state.detail.evidence.map(({ link, claim }) => (
                <li key={link.id}>
                  <span className={`rel rel-${link.relation}`}>
                    {RELATION[link.relation] ?? link.relation}
                  </span>
                  <span className="panel-small">
                    {claim ? claim.source_id : "unknown source"} ·{" "}
                    {independence(link.independent)}
                  </span>
                  <p>{claim ? claim.text : "Claim couldn't be loaded."}</p>
                  {claim && (
                    <span className="panel-small">
                      Captured {day(claim.retrieved_at)}
                      {claim.published_at &&
                        `, published ${day(claim.published_at)}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <h3>History</h3>
            <ol className="panel-list">
              {state.detail.history.map((v) => (
                <li key={v.record_id}>
                  <span className="rel">v{v.version}</span>
                  <span className="panel-small">
                    {day(v.recorded_at)} · {v.recorded_by}
                  </span>
                  <p>{v.change_note ?? "First record of this event."}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </aside>
    </div>
  );
}
