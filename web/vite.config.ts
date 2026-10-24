import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // relative paths so it works under /Jocasta/ on github pages
  base: "./",
  plugins: [react()],
  build: {
    rolldownOptions: {
      onwarn(warning, warn) {
        // lucide ships "use client" for server components, not relevant here
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.id?.includes("lucide-react")
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
});
