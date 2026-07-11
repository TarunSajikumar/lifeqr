/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.html",
    "./frontend/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6818f4",
        secondary: "#5c4dbe",
        emergency: "#dc2626",
      }
    },
  },
  plugins: [],
}
