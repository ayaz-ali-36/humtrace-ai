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
        display: ["DM Sans", "Inter", "system-ui", "sans-serif"],
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["DM Sans", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 16px 40px rgba(31, 41, 55, 0.10)"
      }
    }
  },
  plugins: []
};
