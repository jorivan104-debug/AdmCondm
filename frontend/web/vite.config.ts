import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Detectar si estamos en GitHub Pages
  const isGitHubPages = process.env.GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true'
  
  return {
    plugins: [react()],
    base: isGitHubPages ? '/AdmCondm/' : '/',
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    },
  }
})

