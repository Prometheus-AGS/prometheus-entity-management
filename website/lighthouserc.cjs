const baseUrl = process.env.DOCS_BASE_URL;

if (!baseUrl) throw new Error('DOCS_BASE_URL is required for deployed Lighthouse certification');

const route = (pathname) => new URL(pathname, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href;

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: [
        route('./'),
        route('docs/3.x/frameworks/react-vite/'),
        route('docs/3.x/integrations/flint-realtime-fabric/'),
      ],
    },
    assert: {
      aggregationMethod: 'median',
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.95}],
        'categories:seo': ['error', {minScore: 0.95}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-results',
    },
  },
};
