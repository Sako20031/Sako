/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/ayaulym', destination: '/ayaulym.html' },
      { source: '/love', destination: '/ayaulym.html' },
      { source: '/quest', destination: '/quest.html' },
    ];
  },
};
export default nextConfig;
