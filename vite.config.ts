import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',  // Use relative paths for Tauri webview compatibility
  clearScreen: false,  // Prevent Vite from clearing Tauri console output
})
