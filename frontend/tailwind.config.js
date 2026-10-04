/** @type {import('tailwindcss').Config} */
// Anh xa token cua DESIGN_SYSTEM.md (src/styles/tokens.css) sang class Tailwind - cung bo ten voi
// App Khieu nai de 2 he dung chung 1 ngon ngu thiet ke (chi khac gam brand).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--brand-50)", 100: "var(--brand-100)", 200: "var(--brand-200)", 300: "var(--brand-300)",
          400: "var(--brand-400)", 500: "var(--brand-500)", 600: "var(--brand-600)", 700: "var(--brand-700)",
          800: "var(--brand-800)", 900: "var(--brand-900)",
        },
        ink: "var(--ink)",
        "ink-body": "var(--ink-body)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        link: "var(--link)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        accent: "var(--accent)",
        "accent-dark": "var(--accent-dark)",
        "accent-soft": "var(--accent-soft)",
        "accent-ink": "var(--accent-ink)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "field-bg": "var(--field-bg)",
        "field-border": "var(--field-border)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.04)",
        pop: "0 4px 16px rgba(15, 23, 42, 0.08)",
        brand: "0 2px 8px rgba(21, 128, 63, 0.25)",
      },
      backgroundImage: {
        sidebar: "var(--sidebar-gradient)",
        hero: "linear-gradient(120deg, var(--brand-700) 0%, var(--brand-600) 50%, #1e9c5c 100%)",
      },
    },
  },
  plugins: [],
};
