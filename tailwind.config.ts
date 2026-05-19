import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: 'class',
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Couleurs dynamiques basées sur des variables CSS
                background: "rgb(var(--background) / <alpha-value>)",
                surface: "rgb(var(--surface) / <alpha-value>)",
                "surface-highlight": "rgb(var(--surface-highlight) / <alpha-value>)",
                foreground: "rgb(var(--foreground) / <alpha-value>)",

                // Accents principaux (Violet Vibrant)
                primary: {
                    DEFAULT: "#8b5cf6", // Violet 500
                    glow: "rgba(139, 92, 246, 0.5)",
                    dim: "rgba(139, 92, 246, 0.1)",
                },
                accent: {
                    DEFAULT: "#0ea5e9", // Sky 500
                    glow: "rgba(14, 165, 233, 0.5)",
                },

                // Status
                success: "#10b981", // Emerald 500
                danger: "#ef4444", // Red 500
                warning: "#f59e0b", // Amber 500
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-glass": "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                "gradient-glow": "radial-gradient(circle at center, var(--tw-gradient-stops))",
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
                'glow': '0 0 20px rgba(99, 102, 241, 0.15)',
            }
        },
    },
    plugins: [],
};
export default config;
