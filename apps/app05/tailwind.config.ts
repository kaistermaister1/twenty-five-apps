import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7ff",
          100: "#e6efff",
          200: "#c0d9ff",
          300: "#99c3ff",
          400: "#4d97ff",
          500: "#006bff",
          600: "#005fe6",
          700: "#0040a0",
          800: "#00307a",
          900: "#001a40",
        },
      },
    },
  },
  plugins: [],
};

export default config;


