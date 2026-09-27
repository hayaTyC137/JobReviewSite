import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Бэкенд Spring Boot по умолчанию слушает 8080. Если он не запущен,
// фронтенд автоматически переключится на демо-данные (см. src/api/client.ts).
const backend = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // xfwd передаёт X-Forwarded-* заголовки — по ним Spring строит redirect_uri для входа через Google
      '/api': { target: backend, xfwd: true },
      '/oauth2': { target: backend, xfwd: true },
      '/login/oauth2': { target: backend, xfwd: true },
    },
  },
})
