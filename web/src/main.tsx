import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// fonts are bundled so nothing loads from google
import "@fontsource-variable/dm-sans/index.css";
import "@fontsource/shippori-mincho/500.css";
import "@fontsource/shippori-mincho/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Jocasta could not start because the HTML element "#root" was not found.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);