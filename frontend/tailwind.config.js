/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0f172a",
          primary: "#0284c7",
          primaryDark: "#0369a1",
          primaryLight: "#38bdf8",
          amber: "#f59e0b",
          amberDark: "#d97706",
          slate: "#334155",
          light: "#f8fafc",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
