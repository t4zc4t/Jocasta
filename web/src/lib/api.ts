import { useEffect, useState } from "react";

// the local api only exists on your own machine, so the public build skips it
export const API_URL: string | undefined =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : undefined);

export type ApiStatus = "checking" | "online" | "offline" | "none";

export function useApiStatus(everyMs = 15000): {
  status: ApiStatus;
  version?: string;
} {
  const [state, setState] = useState<{ status: ApiStatus; version?: string }>({
    status: API_URL ? "checking" : "none",
  });

  useEffect(() => {
    if (!API_URL) {
      return;
    }

    let stopped = false;

    async function check() {
      try {
        const response = await fetch(`${API_URL}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        const body = (await response.json()) as { version?: string };
        if (!stopped) {
          setState(
            response.ok
              ? { status: "online", version: body.version }
              : { status: "offline" },
          );
        }
      } catch {
        if (!stopped) {
          setState({ status: "offline" });
        }
      }
    }

    check();
    const timer = window.setInterval(check, everyMs);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [everyMs]);

  return state;
}

export type ApiEvent = {
  event_id: string;
  version: number;
  title: string;
  summary: string;
  category: string;
  place: { name: string; lat: number | null; lon: number | null };
  confidence: "unverified" | "low" | "medium" | "high";
  started_at: string;
  recorded_at: string;
};

// pulls events from the local api once it's online, null means "use samples"
export function useApiEvents(status: ApiStatus): ApiEvent[] | null {
  const [events, setEvents] = useState<ApiEvent[] | null>(null);

  useEffect(() => {
    if (status !== "online" || !API_URL) {
      return;
    }

    let stopped = false;
    fetch(`${API_URL}/events`, { signal: AbortSignal.timeout(5000) })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: ApiEvent[] | null) => {
        if (!stopped) {
          setEvents(body && body.length > 0 ? body : null);
        }
      })
      .catch(() => {
        if (!stopped) {
          setEvents(null);
        }
      });

    return () => {
      stopped = true;
    };
  }, [status]);

  // stale events never show once the api goes away
  return status === "online" ? events : null;
}

export type ApiSource = { id: string; name: string; attribution: string };

export function useApiSources(status: ApiStatus): ApiSource[] {
  const [sources, setSources] = useState<ApiSource[]>([]);

  useEffect(() => {
    if (status !== "online" || !API_URL) {
      return;
    }
    let stopped = false;
    fetch(`${API_URL}/sources`, { signal: AbortSignal.timeout(5000) })
      .then((response) => (response.ok ? response.json() : []))
      .then((body: ApiSource[]) => {
        if (!stopped) {
          setSources(body);
        }
      })
      .catch(() => {});
    return () => {
      stopped = true;
    };
  }, [status]);

  return status === "online" ? sources : [];
}
