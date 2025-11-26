import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cassette: {
          orange: "#ffa500",
          dark: "#1a1a1a",
          darker: "#0a0a0a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
