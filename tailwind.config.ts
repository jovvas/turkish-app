import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#d62828", // Turkish red
          dark: "#a61c1c",
        },
        nazar: {
          DEFAULT: "#1565b8", // evil-eye blue accent
          light: "#3a8fdb",
        },
        paper: "#faf4ea", // warm cream background
        sand: "#f1e6d4", // soft card / divider tone
        ink: "#2b2118", // warm near-black text
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
