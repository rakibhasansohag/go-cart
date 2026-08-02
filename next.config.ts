/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,
	// MJML discovers its component/config modules dynamically at runtime. Keep it
	// in Node's module system so the Server Action compiler does not rewrite those
	// lookups into the synthetic `(action-browser)` filesystem namespace.
	serverExternalPackages: ['mjml'],
	typescript: {
		ignoreBuildErrors: true,
	},
	experimental: {
		optimizePackageImports: [
			'lucide-react',
			'recharts',
			'framer-motion',
			'date-fns',
			'@radix-ui/react-avatar',
			'@radix-ui/react-dialog',
			'@radix-ui/react-dropdown-menu',
			'@radix-ui/react-select',
			'@radix-ui/react-popover',
			'@radix-ui/react-tabs',
		],
	},
	env: {
		NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
			process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'res.cloudinary.com',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'img.clerk.com',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'picsum.photos',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'image.pollinations.ai',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'pollinations.ai',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'images.unsplash.com',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'source.unsplash.com',
				port: '',
				pathname: '/**',
			},
		],
	},
};

module.exports = nextConfig;
