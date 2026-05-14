import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Secular One", "sans-serif"],
        sans: ["Rubik", "system-ui", "sans-serif"],
      },
      colors: {
        cream:      "#fdf4e3",
        parchment:  "#f5e8d0",
        chocolate: {
          DEFAULT: "#2a1400",
          light:   "#3d1f06",
          muted:   "#6b3d1a",
        },
        caramel: {
          50:  "#fdf8f0",
          100: "#fdf4e3",
          200: "#f5e8d0",
          300: "#e8c89a",
          400: "#d4a853",
          500: "#c8762a",
          600: "#a85e1e",
          700: "#8b4a0f",
          800: "#6e3808",
          900: "#2a1400",
        },
        gold:       "#d4a853",
        pistachio: {
          DEFAULT: "#7a8c5e",
          light:   "#a8b88a",
          pale:    "#eef3e6",
        },
      },
      boxShadow: {
        card:        "0 2px 16px rgba(42,20,0,0.09), 0 1px 4px rgba(42,20,0,0.05)",
        "card-hover":"0 8px 32px rgba(42,20,0,0.14), 0 2px 8px rgba(42,20,0,0.07)",
        button:      "0 4px 14px rgba(200,118,42,0.40)",
        "button-lg": "0 6px 24px rgba(42,20,0,0.28)",
      },
      keyframes: {
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "bounce-in": {
          "0%":   { opacity: "0", transform: "scale(0.5)" },
          "60%":  { transform: "scale(1.1)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "slide-up":  "slide-up 0.45s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in":   "fade-in 0.3s ease-out forwards",
        "scale-in":  "scale-in 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
        shimmer:     "shimmer 1.4s linear infinite",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
