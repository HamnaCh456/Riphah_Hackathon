import type { Config } from "tailwindcss";

// Colours, type and radii are defined in app/globals.css.
export default {
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--color-page)",
        surface: "var(--color-surface)",
        tint: "var(--color-tint)",
        navy: "var(--color-navy)",
        "navy-raised": "var(--color-navy-raised)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        brand: "var(--color-brand)",
        "brand-dark": "var(--color-brand-dark)",
        teal: "var(--color-teal)",
        "teal-soft": "var(--color-teal-soft)",
        gold: "var(--color-gold)",
        "gold-bright": "var(--color-gold-bright)",
        highlight: "var(--color-highlight)",
        danger: "var(--color-danger)",
        "danger-soft": "var(--color-danger-soft)",
        hairline: "var(--hairline)",
        "hairline-soft": "var(--hairline-soft)",
        "hairline-strong": "var(--hairline-strong)",
        wash: "var(--wash)",
      },
      fontFamily: {
        matter: ["var(--font-matter)", "ui-sans-serif", "system-ui"],
        // One family across the app. Older components still ask for this name.
        arial: ["var(--font-matter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "Consolas"],
      },
      borderRadius: {
        small: "var(--radius-small)",
        card: "var(--radius-card)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
