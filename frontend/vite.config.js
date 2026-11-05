import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const root = import.meta.dirname

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        about: resolve(root, 'about.html'),
        feature: resolve(root, 'feature.html'),
        blogs: resolve(root, 'blogs.html'),
        contact: resolve(root, 'contact.html'),
        pricing: resolve(root, 'pricing.html'),
      },
    },
  },
})
