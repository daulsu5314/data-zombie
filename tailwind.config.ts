import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      animation: {
        "pop-in": "popIn 0.4s ease-out",
        "pop-out": "popOut 0.25s ease-in forwards",
        "pop-text": "popText 0.6s ease-out forwards",
      },
      keyframes: {
        popIn: {
          "0%":   { transform: "scale(0.3)", opacity: "0" },
          "60%":  { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        popOut: {
          to: { transform: "scale(0.3) rotate(15deg)", opacity: "0" },
        },
        popText: {
          "0%":   { transform: "translateY(0) scale(1)",   opacity: "1" },
          "100%": { transform: "translateY(-30px) scale(1.5)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
