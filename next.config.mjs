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
    formats: ['image/webp', 'image/avif']
  },
  // This is important for Capacitor to work with Next.js
  trailingSlash: true,
  // Skip API routes in static export
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Disable server-side features when running in Capacitor
  experimental: {
    // optimizeCss: true, // Disabled due to critters module issue
    optimizeServerReact: false
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  webpack: (config, { dev, isServer }) => {
    // Simplified webpack config to avoid build issues
    return config
  },
  // Add better error handling - simplified config
  // onDemandEntries: {
  //   // Period (in ms) where the server will keep pages in the buffer
  //   maxInactiveAge: 25 * 1000,
  //   // Number of pages that should be kept simultaneously without being disposed
  //   pagesBufferLength: 2,
  // },
  // Mobile performance optimizations - disable static export for dynamic app
  // output: 'export',
  // distDir: 'out', 
  // assetPrefix: './',
  compiler: {
    removeConsole: {
      exclude: ['error']
    }
  }
}

export default nextConfig