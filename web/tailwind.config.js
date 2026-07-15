/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./data/**/*.js", "./lib/**/*.js"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        deep: "var(--surface-deep)",
        surface: "var(--surface)",
        elevated: "var(--surface-elevated)",
        high: "var(--surface-high)",
        primary: "var(--text-primary)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        warning: "var(--warning)",
        danger: "var(--danger)"
      },
      fontFamily: {
        display: ["Syne", "Inter", "system-ui", "sans-serif"],
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"]
      },
      boxShadow: {
        soft: "0 16px 40px rgba(0, 0, 0, 0.18)"
      }
    }
  },
  plugins: []
};
