/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {
      // Project color tokens used by both the login screen and the admin shell.
      colors: {
        ink: "#0f172a",
        panel: "#f8fafc",
        line: "#dbe4f0",
        accent: "#0f766e",
        primary: "#0d9488",
        "background-light": "#f8f6f6",
        "background-dark": "#0f172a",
        "navy-sidebar": "#0f172a",
        "accent-teal": "#0d9488",
        danger: "#b91c1c",
        warning: "#b45309"
      },
      boxShadow: {
        panel: "0 18px 40px rgba(15, 23, 42, 0.08)",
        subtle: "0 10px 30px rgba(15, 23, 42, 0.06)"
      },
      fontFamily: {
        // Keep typography aligned with the imported Google font in index.html.
        sans: ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
