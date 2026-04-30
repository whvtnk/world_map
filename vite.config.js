import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/world_map/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'globe': ['globe.gl'],
          'topojson': ['topojson-client'],
          'react-vendor': ['react', 'react-dom'],
        }
      }
    }
  }
})
