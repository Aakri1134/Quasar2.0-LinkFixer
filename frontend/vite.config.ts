import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// `visualizer({ open: true })` used to run on every build — it writes stats.html and
// tries to launch a browser, which hangs or fails in CI and in Docker builds.
// Opt in with: ANALYZE=1 npm run build
const analyze = process.env.ANALYZE === "1" || process.env.ANALYZE === "true"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(analyze ? [visualizer({ open: true })] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
