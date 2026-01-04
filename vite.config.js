import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
export default defineConfig({
    plugins: [
        react(),
        visualizer({
            filename: './dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
        })
    ],
    server: {
        port: 5173,
        host: '127.0.0.1'
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separate vendor chunks for better caching
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
                    'ui-vendor': ['@gravity-ui/uikit', '@gravity-ui/icons', '@gravity-ui/navigation'],
                }
            }
        }
    }
});
