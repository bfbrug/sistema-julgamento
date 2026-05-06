/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output para build otimizado no Docker (Railway)
  output: 'standalone',
  eslint: {
    dirs: ['src'],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3000'
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      // Desenvolvimento local
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      // Produção no Railway (permite qualquer hostname .railway.app)
      {
        protocol: 'https',
        hostname: '**.railway.app',
        pathname: '/uploads/**',
      },
      // Domínio personalizado (se vier a ser usado)
      {
        protocol: 'https',
        hostname: '**.up.railway.app',
        pathname: '/uploads/**',
      },
    ],
  },
}

export default nextConfig
