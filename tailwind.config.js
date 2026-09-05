/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blanquiverde: {
          verde: '#1B5E3A',
          blanco: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};
