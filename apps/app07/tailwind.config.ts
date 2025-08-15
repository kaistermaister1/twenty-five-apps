import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx}",
		"./components/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				brand: {
					50: "#fff7f7",
					100: "#ffeaea",
					200: "#ffc9c9",
					300: "#ffa8a8",
					400: "#ff6b6b",
					500: "#fa5252",
					600: "#e03131",
					700: "#c92a2a",
					800: "#a51111",
					900: "#870d0d",
				},
			},
			fontFamily: {
				hand: ["var(--font-hand)", "ui-rounded", "system-ui"],
			},
		},
	},
	plugins: [],
};

export default config;


