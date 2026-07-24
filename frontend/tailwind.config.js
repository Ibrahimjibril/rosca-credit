/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          950: "#151832",
          900: "#1B1F3B",
          800: "#242A52",
        },
        gold: {
          400: "#F0B860",
          500: "#E8A33D",
          600: "#C97F1E",
        },
        teal: {
          800: "#0F3D3E",
          700: "#155A5B",
        },
        sand: "#F5EFE0",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-worksans)", "sans-serif"],
        mono: ["var(--font-plexmono)", "monospace"],
      },
    },
  },
  plugins: [],
};
