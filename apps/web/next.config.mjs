/** @type {import('next').NextConfig} */
const nextConfig = {
  // Plain HTML/CSS/JS output in ./out, served from S3 + CloudFront. No server to run or pay for.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
