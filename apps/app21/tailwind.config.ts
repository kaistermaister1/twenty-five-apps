import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "#2563eb",
        secondary: "#16a34a",
        muted: "#f1f5f9",
        card: "#ffffff",
      },
    },
  },
  plugins: [],
} satisfies Config;


