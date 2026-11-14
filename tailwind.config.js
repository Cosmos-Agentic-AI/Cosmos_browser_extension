/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}", "./popup/*.html", "./sidepanel/*.html", "./onboarding/*.html"],
  theme: {
    extend: {
      colors: {
        cosmos: {
          bg: "var(--cosmos-bg)",
          surface: "var(--cosmos-surface)",
          border: "var(--cosmos-border)",
          accent: "var(--cosmos-accent)",
          accentMuted: "var(--cosmos-accent-muted)",
          text: "var(--cosmos-text)",
          textMuted: "var(--cosmos-text-muted)",
          danger: "var(--cosmos-danger)",
          success: "var(--cosmos-success)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
