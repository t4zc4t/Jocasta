import { useEffect, useState } from "react";

// mafia is the dark default, agency the light one
export type Theme = "mafia" | "agency";

const KEY = "jocasta-theme";

function saved(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (value === "mafia" || value === "agency") return value;
  } catch {
    // storage can be blocked, the default is fine
  }
  return "mafia";
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(saved);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // not worth failing over
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === "mafia" ? "agency" : "mafia"))];
}
