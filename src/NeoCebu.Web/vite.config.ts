import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5197',
        changeOrigin: true,
      },
      '/chatHub': {
        target: 'http://127.0.0.1:5197',
        ws: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5197',
        changeOrigin: true,
      }
    }
  }
})
