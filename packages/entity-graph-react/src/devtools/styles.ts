/** Base Shadow DOM contract. Workspace styling is extended by the complete UI task. */
export const ENTITY_GRAPH_DEVTOOLS_STYLES = `
:host {
  all: initial;
  color-scheme: dark;
  position: fixed;
  z-index: 2147483000;
  inset: auto 20px 20px auto;
  box-sizing: border-box;
  font-family: var(--pem-devtools-font-body, ui-sans-serif, system-ui, sans-serif);
  color: var(--pem-devtools-color-text, #e8e6df);
}

*, *::before, *::after {
  box-sizing: border-box;
}

button, input, select, textarea {
  font: inherit;
}

.pem-devtools-loading {
  min-width: 224px;
  border: 1px solid var(--pem-devtools-color-border, #344047);
  border-radius: var(--pem-devtools-radius-panel, 6px);
  padding: 12px 16px;
  background: var(--pem-devtools-color-shell, #111416);
  color: var(--pem-devtools-color-text, #e8e6df);
  box-shadow: 0 16px 48px rgb(0 0 0 / 36%);
  font-size: 13px;
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
`;
