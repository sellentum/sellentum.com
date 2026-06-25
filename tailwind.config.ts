import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        canvas: "#f6f7f3",
        lime: "#d9ff61",
        moss: "#45624f",
        peach: "#ffbd8a",
      },
      boxShadow: {
        soft: "0 24px 70px rgba(25, 42, 31, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
