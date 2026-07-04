/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#667085",
        line: "#D9DEE8",
        panel: "#FFFFFF",
        canvas: "#F6F8FB",
        brand: "#146B5D",
        accent: "#C7663B",
        info: "#2F6FED"
      },
      boxShadow: {
        soft: "0 12px 28px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};
