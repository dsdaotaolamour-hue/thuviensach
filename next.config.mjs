export default {
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  outputFileTracingIncludes: {'/*':['./index.html','./assets/**/*']},
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' }
    ] }];
  }
};
