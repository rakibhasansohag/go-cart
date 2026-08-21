/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${
    isDevelopment ? "'unsafe-eval' " : ""
  }https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://js.puter.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.protect.clerk.com https://upload-widget.cloudinary.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://img.clerk.com https://i.pravatar.cc https://picsum.photos https://fastly.picsum.photos https://image.pollinations.ai https://pollinations.ai https://images.unsplash.com https://source.unsplash.com https://purecatamphetamine.github.io",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://*.clerk.accounts.dev https://*.clerk.com https://*.protect.clerk.com https://api.cloudinary.com https://ipinfo.io https://image.pollinations.ai wss://go-cart-websocket-server.onrender.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://*.clerk.accounts.dev https://*.clerk.com https://*.protect.clerk.com https://challenges.cloudflare.com https://upload-widget.cloudinary.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig = {
  reactStrictMode: false,
  // Keep the isolated E2E server independent from a developer's normal
  // `.next` process, which prevents Windows build-lock collisions.
  distDir: process.env.E2E_TEST_MODE === "true" ? ".next-e2e" : ".next",
  allowedDevOrigins: ["localhost:3100", "127.0.0.1:3100"],
  // MJML discovers its component/config modules dynamically at runtime. Keep it
  // in Node's module system so the Server Action compiler does not rewrite those
  // lookups into the synthetic `(action-browser)` filesystem namespace.
  serverExternalPackages: ["mjml"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "date-fns",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
      "@radix-ui/react-tabs",
    ],
  },
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // Keep payment and identity-provider popups functional while
          // preventing unrelated windows from sharing this browsing context.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), geolocation=(), microphone=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image.pollinations.ai",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pollinations.ai",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
