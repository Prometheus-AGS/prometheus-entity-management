// @ts-check

// API routes and package-chooser pages are generated at prebuild by
// scripts/generate-api-reference.mjs; this file must exist before
// docusaurus.config.js loads.
const generated = require('./api-sidebar.generated.json');

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
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
