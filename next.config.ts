import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 외부 이미지 도메인 허용 (네이버 증시 썸네일 등)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.naver.com' },
      { protocol: 'https', hostname: '**.naver.net' },
      { protocol: 'https', hostname: 'ssl.pstatic.net' },
    ],
  },
  // ★ 핵심: /api/* 요청을 원본 server.js(포트 3000)로 프록시
  async rewrites() {
    return [
      {
        // stock.js가 BACKEND_API_BASE = '' 일 때 /api/... 로 요청
        // → 원본 my-data server.js(포트 3000)로 전달
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
      {
        source: '/proxy/naver/:path*',
        destination: 'https://m.stock.naver.com/:path*',
      },
    ];
  },
  // 응답 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;

