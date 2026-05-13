import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Heebo", "system-ui", "sans-serif"],
      },
      colors: {
        warm: {
          50:  "#fdf8f0",
          100: "#faefd8",
          200: "#f5dba8",
          300: "#eec470",
          400: "#e8a840",
          500: "#d4881e",
          600: "#b86c14",
          700: "#955210",
          800: "#6e3c0e",
          900: "#4a280a",
        },
      },
      boxShadow: {
        card: "0 2px 12px 0 rgba(120,70,20,0.08)",
        "card-hover": "0 4px 20px 0 rgba(120,70,20,0.14)",
      },
    },
  },
  plugins: [],
} satisfies Config;
