import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Dev mode: forward API calls to Spring Boot so the browser sees one origin.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
