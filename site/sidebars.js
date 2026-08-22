// @ts-check

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
      items: ['packages/overview'],
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
};

module.exports = sidebars;
