/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}", "./popup/*.html", "./sidepanel/*.html", "./onboarding/*.html"],
  theme: {
    extend: {
      colors: {
        cosmos: {
          bg:          "var(--cosmos-bg)",
          surface:     "var(--cosmos-surface)",
          surface2:    "var(--cosmos-surface-2)",
          surface3:    "var(--cosmos-surface-3)",
          border:      "var(--cosmos-border)",
          borderSoft:  "var(--cosmos-border-soft)",
          accent:      "var(--cosmos-accent)",
          accentMuted: "var(--cosmos-accent-muted)",
          accentDim:   "var(--cosmos-accent-dim)",
          text:        "var(--cosmos-text)",
          textMuted:   "var(--cosmos-text-muted)",
          textSubtle:  "var(--cosmos-text-subtle)",
          danger:      "var(--cosmos-danger)",
          dangerDim:   "var(--cosmos-danger-dim)",
          success:     "var(--cosmos-success)",
          successDim:  "var(--cosmos-success-dim)",
          warning:     "var(--cosmos-warning)",
          warningDim:  "var(--cosmos-warning-dim)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
        xs:    ["11px", { lineHeight: "16px" }],
        sm:    ["12px", { lineHeight: "18px" }],
        base:  ["13px", { lineHeight: "20px" }],
        md:    ["14px", { lineHeight: "21px" }],
        lg:    ["15px", { lineHeight: "22px" }],
      },
      spacing: {
        "4.5": "18px",
        "13":  "52px",
        "15":  "60px",
        "18":  "72px",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        sm:   "var(--shadow-sm)",
        md:   "var(--shadow-md)",
        lg:   "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
        "inset-border": "inset 0 0 0 1px var(--cosmos-border-soft)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
