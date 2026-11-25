import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Backend address for the dev proxy. Override if 8080 is taken, e.g. BACKEND_URL=http://localhost:8090
const backend = process.env.BACKEND_URL || 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Dev mode: forward API calls to Spring Boot so the browser sees one origin.
    proxy: {
      '/api': backend,
    },
  },
})
