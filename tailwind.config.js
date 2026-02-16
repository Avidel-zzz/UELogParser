/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'log-error': '#ef4444',
        'log-warning': '#f97316',
        'log-display': '#e5e7eb',
        'log-verbose': '#9ca3af',
      }
    },
  },
  plugins: [],
}
