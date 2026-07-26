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
          950: "#151832", // fixed dark, used for text on gold buttons in both themes
          900: "rgb(var(--c-indigo-900) / <alpha-value>)",
          800: "rgb(var(--c-indigo-800) / <alpha-value>)",
        },
        gold: {
          400: "rgb(var(--c-gold-400) / <alpha-value>)",
          500: "rgb(var(--c-gold-500) / <alpha-value>)",
          600: "rgb(var(--c-gold-600) / <alpha-value>)",
        },
        teal: {
          800: "rgb(var(--c-teal-800) / <alpha-value>)",
          700: "rgb(var(--c-teal-700) / <alpha-value>)",
        },
        sand: "rgb(var(--c-sand) / <alpha-value>)",
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
