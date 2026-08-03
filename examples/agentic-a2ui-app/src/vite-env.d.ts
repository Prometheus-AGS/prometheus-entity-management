/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EXTERNAL_A2A_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
