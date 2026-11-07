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
