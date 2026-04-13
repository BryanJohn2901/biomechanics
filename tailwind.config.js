/** Config espelha o tema do CDN em index.html — usado apenas no build (CSS purgado). */
module.exports = {
  content: ["./index.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#080811",
          surface: "#141427",
          primary: "#EF482D",
          primaryHover: "#FF8815",
          accent: "#0CC143",
          success: "#0CC143",
          darkgray: "#05050A",
          textPrimary: "#FFFFFF",
          textSecondary: "#D0D5DD",
          textMuted: "#667085",
          border: "rgba(255, 255, 255, 0.05)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        oswald: ["Oswald", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
