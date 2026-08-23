// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/**
 * Remap prism-react-renderer token colors for WCAG contrast.
 * Prism themes apply colors as inline styles, so token overrides must happen
 * on the theme object itself, not in CSS.
 * @param {import('prism-react-renderer').PrismTheme} theme
 * @param {Record<string, string>} colorMap lowercase-hex → replacement
 */
function accessiblePrismTheme(theme, colorMap) {
  return {
    ...theme,
    styles: theme.styles.map((entry) => {
      const color = entry.style?.color?.toLowerCase();
      if (!color || !colorMap[color]) return entry;
      return { ...entry, style: { ...entry.style, color: colorMap[color] } };
    }),
  };
}

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
            sidebarId: 'guidesSidebar',
            position: 'left',
            label: 'Guides',
          },
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
            sidebarId: 'operationsSidebar',
            position: 'left',
            label: 'Operations',
          },
          {
            type: 'docSidebar',
            sidebarId: 'apiSidebar',
            position: 'left',
            label: 'API',
          },
          {
            // Release-aware labeling: the deployed docs line (3.x) shown in
            // the navbar; the Pages workflow sets DOCS_VERSION_LABEL.
            to: '/docs/operations/release-notes',
            label: `v${process.env.DOCS_VERSION_LABEL || '3.0'} docs`,
            position: 'right',
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
        // Accessible token remaps: the axe color-contrast gate
        // (scripts/verify-docs-pages-quality.mjs) measures every probe route
        // in both themes. Stock github-theme #e3116c (≈4.3:1), #d73a49
        // (≈4.3:1), and #36acaa (≈2.6:1), and dracula's #6272a4 comment
        // (≈3.0:1), fail WCAG 4.5:1 on their code backgrounds.
        theme: accessiblePrismTheme(require('prism-react-renderer').themes.github, {
          '#e3116c': '#0a3069', // strings → GitHub accessible navy (12.0:1)
          '#d73a49': '#cf222e', // functions → GitHub accessible red (5.0:1)
          '#36acaa': '#0b7f7d', // booleans → accessible teal (4.5:1)
          '#999988': '#57606a', // comments → GitHub fg-muted (6.0:1)
          '#00a4db': '#0550ae', // attr-names/keywords → GitHub accent fg (7.1:1)
        }),
        darkTheme: accessiblePrismTheme(require('prism-react-renderer').themes.dracula, {
          // Dracula declares comments in rgb() notation, not hex.
          'rgb(98, 114, 164)': '#93a1c9', // comments → brighter blue-grey (5.6:1)
        }),
        additionalLanguages: ['rust', 'toml', 'bash', 'dart', 'diff'],
      },
      mermaid: {
        theme: { light: 'neutral', dark: 'dark' },
      },
    }),
};

module.exports = config;
