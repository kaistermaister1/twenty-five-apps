/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		optimizePackageImports: ["react", "react-dom"],
	},
	reactStrictMode: true,
};

export default nextConfig;


