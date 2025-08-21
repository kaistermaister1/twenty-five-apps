/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		optimizePackageImports: ["react", "react-dom", "framer-motion", "lucide-react"],
	},
	reactStrictMode: true,
};

export default nextConfig;


