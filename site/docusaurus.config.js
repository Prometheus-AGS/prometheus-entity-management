// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Prometheus Entity Management',
  tagline:
    'A normalized, globally reactive entity graph for every framework — one certified source of truth',
  favicon: 'img/favicon.ico',

  // Parameterized for GitHub Pages (donor pattern: prometheus-skill-pack site):
  // defaults target the project Pages URL; a custom domain later is env + CNAME only.
  url: process.env.SITE_URL || 'https://prometheus-ags.github.io',
  baseUrl: process.env.BASE_URL || '/prometheus-entity-management/',

  organizationName: 'Prometheus-AGS',
  projectName: 'prometheus-entity-management',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexPages: true,
        indexBlog: false,
        docsRouteBasePath: ['docs'],
      },
    ],
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Canonical edit links: readers land on the exact source file in this repo.
          editUrl:
            'https://github.com/Prometheus-AGS/prometheus-entity-management/edit/main/site/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Social card for Open Graph / Twitter previews.
      image: 'img/social-card.png',
      metadata: [
        {
          name: 'description',
          content:
            'Prometheus Entity Management 3.0 — a normalized, globally reactive entity graph store with certified bindings for React, Svelte, Solid, Alpine, HTMX, Web Components, Flutter, and Tauri.',
        },
        { property: 'og:type', content: 'website' },
        {
          property: 'og:title',
          content: 'Prometheus Entity Management',
        },
        {
          property: 'og:description',
          content:
            'One normalized entity graph. Every framework. Certified from a single source of truth.',
        },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Prometheus Entity Management',
        logo: {
          alt: 'Prometheus Entity Management home',
          src: 'img/prometheus-mark.svg',
          srcDark: 'img/prometheus-mark-dark.svg',
          width: 32,
          height: 32,
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'productSidebar',
            position: 'left',
            label: 'Product',
          },
          {
            type: 'docSidebar',
            sidebarId: 'packagesSidebar',
            position: 'left',
            label: 'Packages',
          },
          {
            type: 'docSidebar',
            sidebarId: 'examplesSidebar',
            position: 'left',
            label: 'Examples',
          },
          {
            type: 'docSidebar',
            sidebarId: 'apiSidebar',
            position: 'left',
            label: 'API',
          },
          {
            href: 'https://github.com/Prometheus-AGS/prometheus-entity-management',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Product',
            items: [
              { label: 'Overview', to: '/docs/product/overview' },
              { label: 'Architecture', to: '/docs/product/architecture' },
            ],
          },
          {
            title: 'Packages',
            items: [
              { label: 'Package selection', to: '/docs/packages/overview' },
            ],
          },
          {
            title: 'Examples',
            items: [
              { label: 'Examples gallery', to: '/docs/examples/overview' },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/Prometheus-AGS/prometheus-entity-management',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Prometheus AGS. MIT License.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
        additionalLanguages: ['rust', 'toml', 'bash', 'dart', 'diff'],
      },
      mermaid: {
        theme: { light: 'neutral', dark: 'dark' },
      },
    }),
};

module.exports = config;
