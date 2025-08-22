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
    optimizeCss: true,
    optimizeServerReact: false
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  webpack: (config, { dev, isServer }) => {
    // Optimize webpack for all builds
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 20
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30
            }
          },
        },
        usedExports: true,
        sideEffects: false
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
  // Mobile performance optimizations
  output: 'export',
  distDir: 'out',
  assetPrefix: './',
  compiler: {
    removeConsole: {
      exclude: ['error']
    }
  }
}

export default nextConfig