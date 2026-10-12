/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/ayaulym', destination: '/ayaulym.html' },
      { source: '/love', destination: '/ayaulym.html' },
      { source: '/tumar', destination: '/tumar.html' },
      { source: '/tumar/admin', destination: '/tumar.html' },
    ];
  },
};
export default nextConfig;
