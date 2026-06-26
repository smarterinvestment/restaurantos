import type { Config } from "tailwindcss";

/**
 * RestaurantOS — Design System
 * Brand/cyan colors reference CSS custom properties so both themes (blue + pink)
 * resolve correctly at runtime via data-theme attribute on <html>.
 */
const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // --- Fondos / superficies ---
        base: "#070c1a",
        surface: "#0c1426",
        "surface-2": "#0a1020",
        elevated: "#1b2742",

        // --- Marca (resuelve vía CSS vars — soporta temas azul/rosado) ---
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          deep: "var(--brand-deep)",
          deeper: "var(--brand-deeper)",
          soft: "#9cc4ff",
          tint: "#eaf2ff",
        },
        cyan: "rgb(var(--brand-cyan-rgb) / <alpha-value>)",
        ink: "#051634",

        // --- Texto ---
        text: {
          DEFAULT: "#e8edf2",
          muted: "#9fb0c0",
          dim: "#7c8896",
          faint: "#5f6b7a",
        },

        // --- Semánticos ---
        danger: { DEFAULT: "#ff4d6d", soft: "#ff8095" },
        gold: { DEFAULT: "#ffb84d", soft: "#ffd9a3" },
        violet: "#a855f7",
      },
      borderRadius: {
        sm: "6px",
        md: "9px",
        lg: "12px",
        xl: "14px",
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        glow: "0 6px 22px rgb(var(--brand-rgb) / 0.45), inset 0 1px 1px rgba(255,255,255,0.45)",
        "glow-sm": "0 0 12px rgb(var(--brand-rgb) / 0.6)",
        card: "0 8px 30px rgba(0,0,0,0.35)",
      },
      backdropBlur: {
        glass: "20px",
      },
      backgroundImage: {
        "app-halo":
          "radial-gradient(1200px 600px at 80% -10%, rgb(var(--brand-rgb) / 0.10), transparent 60%), radial-gradient(900px 500px at -5% 110%, rgb(var(--brand-cyan-rgb) / 0.06), transparent 55%)",
        "glass-panel":
          "linear-gradient(180deg, rgba(20,32,60,0.55), rgba(9,14,30,0.55))",
        "brand-grad": "linear-gradient(150deg, var(--brand), var(--brand-deep))",
        "brand-cyan": "linear-gradient(90deg, var(--brand), var(--brand-cyan))",
      },
    },
  },
  plugins: [],
};

export default config;
