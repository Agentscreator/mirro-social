/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Keep unoptimized for now to avoid build issues
    formats: ['image/webp', 'image/avif']
  },
  // This is important for Capacitor to work with Next.js
  trailingSlash: true,
  // Skip API routes in static export
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Performance optimizations
  experimental: {
    // optimizeCss: true, // Disabled due to critters module issue
  },
  compress: true,
  poweredByHeader: false,
  
  webpack: (config, { dev, isServer }) => {
    // Simplified webpack config to avoid build issues
    return config
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig