/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Ensure Tailwind scans the HTML file
    "./src/**/*.{js,jsx,ts,tsx}", // Scan all JavaScript and TypeScript files in the src directory
  ],
  theme: {
    extend: {}, // You can add custom theme configurations here
  },
  plugins: [], // Add Tailwind plugins here if needed
};
