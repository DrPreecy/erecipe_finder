// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static output: every page is rendered to plain HTML at build time.
// The finder is one small React "island" that hydrates in the browser.
export default defineConfig({
  output: "static",
  integrations: [react()],
});
