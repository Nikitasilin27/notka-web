import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'ui-vendor': ['@gravity-ui/uikit', '@gravity-ui/icons', '@gravity-ui/navigation'],
        },
      },
    },
    // Increase warning limit for now
    chunkSizeWarningLimit: 600,
  },
})
