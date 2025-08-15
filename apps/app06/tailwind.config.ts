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
          50: "#f5fbff",
          100: "#e9f6ff",
          200: "#c8e9ff",
          300: "#a6dbff",
          400: "#63c0ff",
          500: "#1aa6ff",
          600: "#1796e6",
          700: "#1065a0",
          800: "#0c4c7a",
          900: "#082c40",
        },
      },
    },
  },
  plugins: [],
};

export default config;


