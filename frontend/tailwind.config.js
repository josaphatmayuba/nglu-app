/** @type {import('tailwindcss').Config} */
module.exports = {
  important: true,
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        Popins: ["'Poppins'", "sans-serif"],
      },
      colors: {
        primary: "#4F46E5",
        headerBg: "#f7f7fe",
        sideNavBg: "#0d0d1c",
        tableBg: "white",
        tableHeaderBg: "#f1f5f9",
        cardBg: "#f7f7fe",

        // E-commerce colors
        ePrimary: "#4F46E5",
      },
      container: {
        center: true,
        padding: "1rem",
      },
      screens: {
        xxs: "375px",
        xs: "425px",
        sm: "576px",

        md: "769px",

        lg: "992px",

        xl: "1200px",

        "2xl": "1400px",
        "3xl": "1900px",
      },
      fontSize: {
        xxs: ".35rem",
      },
    },
  },
  plugins: [],
};
