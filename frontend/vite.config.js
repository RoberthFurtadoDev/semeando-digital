import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' }
  },
  // modo "demo": um único bundle, para publicar como página estática
  build: mode === 'demo' ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {}
}))
