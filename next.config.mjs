/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // This is important for Capacitor to work with Next.js
  trailingSlash: true,
  // Skip API routes in static export
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Disable server-side features when running in Capacitor
  experimental: {
    // runtime: 'edge', // Removed edge runtime
  },
  webpack: (config, { dev, isServer }) => {
    // Optimize webpack for development
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      }
    }
    
    return config
  },
  // Add better error handling
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
}

export default nextConfig