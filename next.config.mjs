/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16.2+ blocks cross-origin dev assets unless the host is allowed.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
