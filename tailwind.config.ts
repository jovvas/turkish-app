import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#d62828", dark: "#a61c1c" },
        nazar: { DEFAULT: "#1565b8", light: "#3a8fdb" },
        paper: "#faf4ea",
        sand: "#f1e6d4",
        ink: "#2b2118",
      },
      fontFamily: {
        display: ["Georgia", "ui-serif", "serif"],
      },
      boxShadow: {
        card: "0 2px 10px -2px rgba(80, 55, 30, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
