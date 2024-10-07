/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./apps/desktop-app/src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			backgroundImage: {
				waves: "url('images/waves.svg')",
			},
			textColor: {
				euiText: "#343741",
				euiTitle: "#1a1c21",
				euiSubduedText: "#646a77",
				euiLink: "#006bb8",
				euiPrimaryText: "#006bb8",
				euiAccentText: "#ba3d76",
				euiSuccessText: "#007871",
				euiWarningText: "#83650a",
				euiDangerText: "#bd271e",
			},
			colors: {
				euiBackground: "#f7f8fc",
				euiPrimary: "#07C",
				euiAccent: "#F04E98",
				euiSuccess: "#00BFB3",
				euiWarning: "#FEC514",
				euiDanger: "#BD271E",
			},
		},
	},
	plugins: [],
};
