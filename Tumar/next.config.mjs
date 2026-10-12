/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // The shop is one static page; the admin panel lives inside it.
      beforeFiles: [
        { source: '/', destination: '/tumar.html' },
        { source: '/admin', destination: '/tumar.html' },
      ],
    };
  },
};
export default nextConfig;
