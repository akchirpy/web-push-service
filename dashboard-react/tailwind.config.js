/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chirpy: {
          primary: '#FF6B35',
          secondary: '#F7931E',
          dark: '#2D3748',
        }
      }
    },
  },
  plugins: [],
}
