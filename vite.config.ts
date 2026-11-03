/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/cadence/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
