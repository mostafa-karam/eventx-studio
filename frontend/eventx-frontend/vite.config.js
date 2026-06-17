import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Put EventForm in its own chunk
          if (
            id.endsWith('EventForm.jsx') ||
            id.includes('/src/components/admin/EventForm.jsx') ||
            id.includes('\\src\\components\\admin\\EventForm.jsx')
          ) {
            return 'event-form'
          }
          // Keep vendor libraries together
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
