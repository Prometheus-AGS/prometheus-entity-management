// @ts-check

// API routes and package-chooser pages are generated at prebuild by
// scripts/generate-api-reference.mjs; this file must exist before
// docusaurus.config.js loads.
const generated = require('./api-sidebar.generated.json');

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  guidesSidebar: [
    'guides/quickstart-react',
    {
      type: 'category',
      label: 'Concepts',
      collapsible: false,
      items: [
        'guides/concepts/normalized-entities',
        'guides/concepts/id-only-lists',
        'guides/concepts/queries-as-instructions',
        'guides/concepts/layers-and-dataflow',
        'guides/concepts/graph-patches-lists',
        'guides/concepts/engine-swr-gc-suspense',
        'guides/concepts/views-and-filtering',
        'guides/concepts/crud-and-relations',
        'guides/concepts/realtime-batching',
        'guides/concepts/graphql-and-rest',
        'guides/concepts/sync-and-persistence',
        'guides/concepts/sdl-and-codegen',
        'guides/concepts/devtools',
      ],
    },
    {
      type: 'category',
      label: 'Bindings',
      collapsible: false,
      items: [
        'guides/bindings/react',
        'guides/bindings/svelte',
        'guides/bindings/solid',
        'guides/bindings/alpine',
        'guides/bindings/htmx',
        'guides/bindings/web-components',
        'guides/bindings/flutter',
        'guides/bindings/tauri',
      ],
    },
    {
      type: 'category',
      label: 'Practices',
      collapsible: false,
      items: [
        'guides/practices/recipes',
        'guides/practices/failure-modes',
        'guides/practices/performance',
        'guides/practices/security',
        'guides/practices/package-selection',
      ],
    },
  ],
  productSidebar: [
    {
      type: 'category',
      label: 'Product',
      collapsible: false,
      items: ['product/overview', 'product/architecture'],
    },
  ],
  packagesSidebar: [
    {
      type: 'category',
      label: 'Packages',
      collapsible: false,
      items: ['packages/overview', generated.packageChooserCategory],
    },
  ],
  examplesSidebar: [
    {
      type: 'category',
      label: 'Examples',
      collapsible: false,
      items: ['examples/overview'],
    },
  ],
  apiSidebar: generated.apiSidebar,
};

module.exports = sidebars;
