/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/assistant': ['./prompts/**/*'],
  },
}

export default nextConfig
