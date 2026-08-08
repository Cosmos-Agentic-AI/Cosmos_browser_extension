/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        cosmos: {
          bg: "#0b0d12",
          surface: "#12141c",
          border: "#232637",
          accent: "#7c5cff",
          accentMuted: "#5b46b8",
          text: "#e6e7ee",
          textMuted: "#8a8da3",
          danger: "#ef4444",
          success: "#22c55e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
