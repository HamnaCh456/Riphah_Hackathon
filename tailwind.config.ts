import type { Config } from "tailwindcss";

// Colours, type and radii come from DESIGN.md section 3, defined in app/globals.css.
export default {
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "var(--color-liquid-abyss)",
        deep: "var(--color-liquid-deep)",
        kelp: "var(--color-liquid-kelp)",
        platinum: "var(--color-platinum)",
        mist: "var(--color-liquid-mist)",
        silver: "var(--color-silver-mist)",
        lavender: "var(--color-lavender-phosphor)",
        coral: "var(--color-coral)",
        hairline: "var(--hairline)",
        "hairline-soft": "var(--hairline-soft)",
        "hairline-strong": "var(--hairline-strong)",
        wash: "var(--wash)",
      },
      fontFamily: {
        matter: ["var(--font-matter)", "ui-sans-serif", "system-ui"],
        arial: ["Arial", "Helvetica", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "Consolas"],
      },
      borderRadius: {
        small: "var(--radius-small)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
