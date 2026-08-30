import type {Config} from '@docusaurus/types';
import type {Options, ThemeConfig} from '@docusaurus/preset-classic';
import {themes as prismThemes} from 'prism-react-renderer';

const config: Config = {
  title: 'Prometheus Entity Management',
  tagline: 'One entity graph. Every framework. Realtime everywhere.',
  favicon: 'img/prometheus-entity-mark.svg',
  headTags: [
    {
      tagName: 'style',
      attributes: {},
      innerHTML: `
        @font-face { font-family: 'Inter Variable'; font-style: normal; font-display: swap; font-weight: 100 900; src: url('/prometheus-entity-management/fonts/inter-latin-wght-normal.woff2') format('woff2-variations'); }
        @font-face { font-family: 'Space Grotesk Variable'; font-style: normal; font-display: swap; font-weight: 300 700; src: url('/prometheus-entity-management/fonts/space-grotesk-latin-wght-normal.woff2') format('woff2-variations'); }
        @font-face { font-family: 'JetBrains Mono Variable'; font-style: normal; font-display: swap; font-weight: 100 800; src: url('/prometheus-entity-management/fonts/jetbrains-mono-latin-wght-normal.woff2') format('woff2-variations'); }
      `,
    },
  ],
  url: 'https://prometheus-ags.github.io',
  baseUrl: '/prometheus-entity-management/',
  organizationName: 'Prometheus-AGS',
  projectName: 'prometheus-entity-management',
  future: {
    faster: {
      swcJsLoader: true,
      swcJsMinimizer: true,
      swcHtmlMinimizer: true,
      lightningCssMinimizer: false,
      mdxCrossCompilerCache: true,
      rspackBundler: true,
      rspackPersistentCache: true,
      ssgWorkerThreads: false,
      gitEagerVcs: true,
    },
  },
  trailingSlash: true,
  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    hooks: {onBrokenMarkdownLinks: 'throw'},
  },
  themes: [
    '@docusaurus/theme-mermaid',
  ],
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/Prometheus-AGS/prometheus-entity-management/edit/main/website/',
          lastVersion: 'current',
          versions: {
            current: {label: '3.x', path: '3.x', banner: 'unreleased'},
          },
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
        sitemap: {changefreq: 'weekly', priority: 0.5},
      } satisfies Options,
    ],
  ],
  themeConfig: {
    image: 'img/prometheus-entity-social-card.svg',
    metadata: [
      {
        name: 'description',
        content:
          'A normalized, globally reactive entity graph for React, Flutter, realtime, offline, web, desktop, and mobile applications.',
      },
      {name: 'theme-color', content: '#E04E28'},
    ],
    colorMode: {defaultMode: 'light', respectPrefersColorScheme: true},
    announcementBar: {
      id: 'v3_stable',
      content:
        '<strong>3.1.0 stable</strong> — all twelve npm packages are public on npm at 3.1.0, including the optional React DevTools inspector. Flutter 3.0.5 is public on pub.dev with its official DevTools companion.',
      backgroundColor: '#0B0F14',
      textColor: '#FFFFFF',
      isCloseable: false,
    },
    navbar: {
      title: 'Prometheus Entity Management',
      logo: {
        alt: 'Prometheus Entity Management entity graph mark',
        src: 'img/prometheus-entity-mark.svg',
        srcDark: 'img/prometheus-entity-mark-dark.svg',
        width: 34,
        height: 34,
      },
      items: [
        {to: '/docs/3.x/start-here/', label: 'Start Here', position: 'left'},
        {to: '/docs/3.x/concepts/', label: 'Concepts', position: 'left'},
        {to: '/docs/3.x/frameworks/', label: 'Frameworks', position: 'left'},
        {to: '/docs/3.x/integrations/', label: 'Integrations', position: 'left'},
        {to: '/docs/3.x/examples/', label: 'Examples', position: 'left'},
        {to: '/docs/3.x/packages/', label: 'Packages & API', position: 'left'},
        {to: '/docs/3.x/evidence/', label: 'Evidence', position: 'left'},
        {to: '/docs/3.x/operations/', label: 'Migration & Operations', position: 'left'},
        {type: 'docsVersionDropdown', position: 'right'},
        {to: '/search/', label: 'Search', position: 'right'},
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
          title: 'Learn',
          items: [
            {label: 'Start Here', to: '/docs/3.x/start-here/'},
            {label: 'Concepts', to: '/docs/3.x/concepts/'},
            {label: 'Examples', to: '/docs/3.x/examples/'},
          ],
        },
        {
          title: 'Build',
          items: [
            {label: 'Frameworks', to: '/docs/3.x/frameworks/'},
            {label: 'Integrations', to: '/docs/3.x/integrations/'},
            {label: 'Packages & API', to: '/docs/3.x/packages/'},
          ],
        },
        {
          title: 'Operate',
          items: [
            {label: 'Evidence', to: '/docs/3.x/evidence/'},
            {label: 'Migration & Operations', to: '/docs/3.x/operations/'},
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
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'dart', 'graphql', 'rust', 'toml'],
    },
  } satisfies ThemeConfig,
};

export default config;
