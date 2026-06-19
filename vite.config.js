import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png', 'robots.txt'],
            manifest: {
                name: 'Notka — Музыка объединяет',
                short_name: 'Notka',
                description: 'Социальный скробблинг музыки. Делись тем, что слушаешь, находи единомышленников.',
                lang: 'ru',
                theme_color: '#FF7700',
                background_color: '#221D22',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                categories: ['music', 'social', 'lifestyle'],
                icons: [
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    {
                        src: 'pwa-maskable-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                // Precache the built app shell; SPA fallback to index.html.
                navigateFallback: '/index.html',
                // Don't hijack OAuth callback or Firebase auth handler navigations.
                navigateFallbackDenylist: [/^\/__\/auth/, /^\/callback/],
                globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
                runtimeCaching: [
                    {
                        // Spotify cover art / avatars — immutable, cache-first.
                        urlPattern: /^https:\/\/[a-z-]+\.scdn\.co\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'spotify-images',
                            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Firebase Storage user avatars.
                        urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'firebase-storage',
                            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
            devOptions: {
                // Keep SW off during `vite dev` to avoid stale-cache surprises while developing.
                enabled: false,
            },
        }),
    ],
    server: {
        port: 5173,
        host: '127.0.0.1',
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
});
