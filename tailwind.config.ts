import type { Config } from "tailwindcss";

/**
 * RestaurantOS — Design System
 * Fuente de verdad: export de Claude Design "Restaurante CashFlow AI".
 * Los valores aquí son los EXACTOS extraídos del diseño (no de Smarter Investment).
 * Si Claude Code encuentra tokens previos en el repo, ESTOS los reemplazan.
 */
const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Cuerpo
        sans: ["'DM Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        // Títulos / cifras
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // --- Fondos / superficies (navy) ---
        base: "#070c1a",          // fondo principal de la app
        surface: "#0c1426",       // tarjetas / paneles
        "surface-2": "#0a1020",   // paneles más hundidos
        elevated: "#1b2742",      // chips, avatares, elementos elevados

        // --- Marca (azul) ---
        brand: {
          DEFAULT: "#3d8bff",     // azul principal
          deep: "#1f5fe0",        // gradiente / hover
          deeper: "#1746b0",      // sombras de marca
          soft: "#9cc4ff",        // textos/íconos sobre fondo oscuro
          tint: "#eaf2ff",        // resaltes muy claros
        },
        cyan: "#00d4ff",          // acento secundario (glow / barras)
        ink: "#051634",           // stroke oscuro sobre azul (logo/íconos)

        // --- Texto ---
        text: {
          DEFAULT: "#e8edf2",     // texto principal
          muted: "#9fb0c0",       // secundario
          dim: "#7c8896",         // terciario
          faint: "#5f6b7a",       // labels / metadatos
        },

        // --- Semánticos ---
        danger: { DEFAULT: "#ff4d6d", soft: "#ff8095" },   // gastos / alertas
        gold: { DEFAULT: "#ffb84d", soft: "#ffd9a3" },     // warning / Rey Salomón
        violet: "#a855f7",                                 // categorías / acento
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
        // glow neón azul (botones de marca, KPIs activos)
        glow: "0 6px 22px rgba(61,139,255,0.45), inset 0 1px 1px rgba(255,255,255,0.45)",
        "glow-sm": "0 0 12px rgba(61,139,255,0.6)",
        card: "0 8px 30px rgba(0,0,0,0.35)",
      },
      backdropBlur: {
        glass: "20px",
      },
      backgroundImage: {
        // halo de fondo del shell de la app
        "app-halo":
          "radial-gradient(1200px 600px at 80% -10%, rgba(61,139,255,0.10), transparent 60%), radial-gradient(900px 500px at -5% 110%, rgba(0,212,255,0.06), transparent 55%)",
        // gradiente de paneles glass
        "glass-panel":
          "linear-gradient(180deg, rgba(20,32,60,0.55), rgba(9,14,30,0.55))",
        // gradiente de marca (botones / logo)
        "brand-grad": "linear-gradient(150deg, #3d8bff, #1f5fe0)",
        // barra de progreso / acentos
        "brand-cyan": "linear-gradient(90deg, #3d8bff, #00d4ff)",
      },
    },
  },
  plugins: [],
};

export default config;
