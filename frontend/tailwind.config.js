/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        card: '#161B28',
        primary: '#6366F1',
        secondary: '#A855F7',
        accent: '#06B6D4',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8'
      }
    },
  },
  plugins: [],
}
