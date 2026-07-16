import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// מאזין על 0.0.0.0 כדי שאפשר יהיה לפתוח את המשחק גם מהטאבלט
// דרך כתובת ה-IP של המחשב באותה רשת Wi-Fi.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
