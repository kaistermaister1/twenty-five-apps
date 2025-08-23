import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0b0c",
        foreground: "#f5f5f5",
        primary: "#1DB954",
      },
    },
  },
  plugins: [],
} satisfies Config;


